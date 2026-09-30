"""Nghiệp vụ Kinh doanh nạp LSX, báo giá và theo dõi đặt ngoài."""

from collections import defaultdict
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
from pathlib import Path
import re
import uuid
from uuid import uuid4

from backend.data import dat_ngoai_repo
from backend.data.db import get_conn
from backend.services import catalog_service
from backend.services import phan_quyen_service
from backend.services.errors import KhongCoQuyen, KhongTimThay, ThieuDuLieu, XungDot
from backend.config.settings import MAX_UPLOAD_BYTES, UPLOAD_DIR


CHUYEN_TRANG_THAI = {
    "NHAP": {"CHO_DUYET", "HUY"},
    "CHO_XAC_NHAN_KY_THUAT": {"DANG_BAO_GIA", "HUY"},
    "DANG_BAO_GIA": {"CHO_XAC_NHAN_KY_THUAT", "HUY"},
    "CHO_DUYET": {"DA_DUYET", "DANG_BAO_GIA", "HUY"},
    "DA_DUYET": {"DANG_BAO_GIA", "DA_DAT", "HUY"},
    "DA_DAT": {"DANG_LAM", "HUY"},
    "DANG_LAM": {"DA_NHAN", "HUY"},
    "DA_NHAN": {"HOAN_THANH", "HUY"},
    "HOAN_THANH": {"HUY"},
    "HUY": set(),
}


def _ma(tien_to: str) -> str:
    return f"{tien_to}-{uuid4().hex[:12].upper()}"

def _pham_vi_phieu(id_phieu: str, ho_so: dict, pham_vi: str) -> bool:
    if pham_vi == "toan_bo":
        return True
    with get_conn() as conn:
        row = conn.execute(
            """SELECT dn.nguoi_lap,EXISTS(
                 SELECT 1 FROM tai_khoan tk
                 WHERE tk.ma_nhan_vien=dn.nguoi_lap AND tk.ma_bo_phan=%s
               ) AS cung_bo_phan
               FROM dat_ngoai dn WHERE dn.id=%s""",
            (ho_so.get("ma_bo_phan"),id_phieu),
        ).fetchone()
    if not row:
        return False
    if pham_vi == "ca_nhan":
        return row["nguoi_lap"] == ho_so.get("ma_nhan_vien")
    return bool(row["cung_bo_phan"])


def _loc_phieu_pham_vi(items: list[dict], ho_so: dict, pham_vi: str) -> list[dict]:
    if pham_vi == "toan_bo" or not items:
        return items
    ids = [row["id"] for row in items]
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT dn.id,dn.nguoi_lap,EXISTS(
                 SELECT 1 FROM tai_khoan tk
                 WHERE tk.ma_nhan_vien=dn.nguoi_lap AND tk.ma_bo_phan=%s
               ) AS cung_bo_phan
               FROM dat_ngoai dn WHERE dn.id=ANY(%s)""",
            (ho_so.get("ma_bo_phan"),ids),
        ).fetchall()
    duoc_xem = {row["id"] for row in rows if
                (row["nguoi_lap"] == ho_so.get("ma_nhan_vien") if pham_vi == "ca_nhan"
                 else row["cung_bo_phan"])}
    return [item for item in items if item["id"] in duoc_xem]

def _kiem_pham_vi_lsx(row: dict, ho_so: dict, pham_vi: str) -> bool:
    if pham_vi == "toan_bo":
        return True
    if pham_vi == "ca_nhan":
        return False
    return row.get("ma_bo_phan") == ho_so.get("ma_bo_phan")

def _ngay_excel(value, ten_cot: str):
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    raw = str(value).replace("\u00a0", " ").strip()
    try:
        serial = Decimal(raw)
        if 20_000 <= serial <= 80_000:
            return date(1899, 12, 30) + timedelta(days=int(serial))
    except InvalidOperation:
        pass
    for dinh_dang in ("%Y-%m-%d", "%Y/%m/%d", "%Y.%m.%d",
                       "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y",
                       "%d/%m/%y", "%d-%m-%y", "%d.%m.%y"):
        try:
            return datetime.strptime(raw[:10], dinh_dang).date()
        except ValueError:
            continue
    raise ValueError(f"{ten_cot} không phải ngày Excel hợp lệ")


def nhap_lsx(rows: list[dict], ho_so: dict) -> dict:
    pham_vi = phan_quyen_service.kiem_quyen(ho_so, "dat_ngoai", "sua")
    if not rows:
        raise ThieuDuLieu("Danh sách LSX không được rỗng.")
    if len(rows) > 500:
        raise ThieuDuLieu("Mỗi lần chỉ được nạp tối đa 500 mã hàng.", "VUOT_GIOI_HAN_NHAP")
    da_gap = set()
    chuan = []
    errors = []
    for stt, row in enumerate(rows, 1):
        try:
            du_lieu = dict(row)
            if not _kiem_pham_vi_lsx(du_lieu, ho_so, pham_vi):
                raise ValueError("Bộ phận của LSX nằm ngoài phạm vi được cấp")
            for cot in ("so_po", "ma_khach_hang", "ten_khach_hang_chup", "ma_bo_phan", "ten_bo_phan_chup",
                        "ki_han_khach_hang", "muc_do_uu_tien", "ngay_nhan_lenh", "so_so",
                        "ngay_so", "trang_thai_don", "ma_cong_doan", "ma_ban_ve", "ghi_chu",
                        "ghi_chu_dong"):
                du_lieu.setdefault(cot, None)
            for cot, gioi_han in (("lenh_san_xuat", 60), ("ma_vach", 40), ("ma_hang", 60),
                                  ("ten_hang", 300), ("dvt", 20)):
                du_lieu[cot] = str(du_lieu.get(cot) or "").strip()
                if not du_lieu[cot]:
                    raise ValueError(f"{cot} là bắt buộc")
                if len(du_lieu[cot]) > gioi_han:
                    raise ValueError(f"{cot} vượt quá {gioi_han} ký tự")
            if du_lieu["ma_vach"] in da_gap:
                raise ValueError(f"mã vạch {du_lieu['ma_vach']} bị trùng trong dữ liệu dán")
            try:
                du_lieu["so_luong"] = Decimal(str(du_lieu.get("so_luong") or ""))
            except (InvalidOperation, ValueError):
                raise ValueError("số lượng không hợp lệ") from None
            if du_lieu["so_luong"] <= 0:
                raise ValueError("số lượng phải lớn hơn 0")
            for cot, gioi_han in (("so_po", 40), ("ma_khach_hang", 40),
                                  ("ten_khach_hang_chup", 300), ("ma_bo_phan", 20),
                                  ("ten_bo_phan_chup", 300),
                                  ("so_so", 60), ("trang_thai_don", 30),
                                  ("ma_cong_doan", 20), ("ma_ban_ve", 60)):
                if du_lieu[cot] is not None:
                    du_lieu[cot] = str(du_lieu[cot]).strip() or None
                    if du_lieu[cot] and len(du_lieu[cot]) > gioi_han:
                        raise ValueError(f"{cot} vượt quá {gioi_han} ký tự")
            for cot in ("ki_han_khach_hang", "ngay_nhan_lenh", "ngay_so"):
                du_lieu[cot] = _ngay_excel(du_lieu[cot], cot)
            if du_lieu["muc_do_uu_tien"] not in (None, ""):
                try:
                    du_lieu["muc_do_uu_tien"] = int(du_lieu["muc_do_uu_tien"])
                except (TypeError, ValueError):
                    raise ValueError("mức độ ưu tiên phải là số từ 1 đến 3") from None
                if du_lieu["muc_do_uu_tien"] not in (1, 2, 3):
                    raise ValueError("mức độ ưu tiên chỉ nhận từ 1 đến 3")
            else:
                du_lieu["muc_do_uu_tien"] = None
            du_lieu["_dong"] = stt
            da_gap.add(du_lieu["ma_vach"])
            chuan.append(du_lieu)
        except ValueError as exc:
            errors.append({
                "dong": stt,
                "ma": str(row.get("ma_vach") or row.get("ma_hang") or ""),
                "loi": str(exc),
            })
    if not chuan:
        return {"so_dong": 0, "so_lsx": 0, "co_loi": len(errors), "errors": errors}
    ket_qua = dat_ngoai_repo.nhap_lsx(chuan)
    if not ket_qua["san_sang"]:
        raise ThieuDuLieu("Cơ sở dữ liệu chưa có bảng Đặt ngoài. Hãy chạy migration 031 và 032.", "CHUA_MIGRATE_DAT_NGOAI")
    errors.extend(ket_qua["errors"])
    dong_loi = {item["dong"] for item in errors}
    thanh_cong = [row for row in chuan if row["_dong"] not in dong_loi]
    return {
        "so_dong": ket_qua["so_dong"],
        "so_lsx": len({row["lenh_san_xuat"] for row in thanh_cong}),
        "co_loi": len(errors),
        "errors": sorted(errors, key=lambda item: item["dong"]),
    }


def danh_sach_lsx(tu_khoa: str, ho_so: dict) -> list[dict]:
    pham_vi = phan_quyen_service.kiem_quyen(ho_so, "dat_ngoai", "xem")
    rows = [row for row in dat_ngoai_repo.danh_sach_lsx(str(tu_khoa or "").strip().lower())
            if _kiem_pham_vi_lsx(row, ho_so, pham_vi)]
    nhom = {}
    for row in rows:
        ma = row["lenh_san_xuat"]
        if ma not in nhom:
            nhom[ma] = {
                "lenh_san_xuat": ma, "so_po": row["so_po"], "ma_khach_hang": row["ma_khach_hang"],
                "ten_khach_hang_chup": row["ten_khach_hang_chup"], "ma_bo_phan": row["ma_bo_phan"],
                "ten_bo_phan_chup": row["ten_bo_phan_chup"],
                "ki_han_khach_hang": row["ki_han_khach_hang"], "muc_do_uu_tien": row["muc_do_uu_tien"],
                "ngay_nhan_lenh": row["ngay_nhan_lenh"], "so_so": row["so_so"], "ngay_so": row["ngay_so"],
                "trang_thai_don": row["trang_thai_don"],
                "ghi_chu": row["ghi_chu"], "dong": [],
            }
        if row["ma_vach"]:
            nhom[ma]["dong"].append({
                "ma_vach": row["ma_vach"], "ma_hang": row["ma_hang"], "ten_hang": row["ten_hang"],
                "so_luong": row["so_luong_po"], "dvt": row["dvt"],
                "ma_cong_doan": row["ma_cong_doan"], "ma_ban_ve": row["ma_ban_ve"],
                "ghi_chu": row["ghi_chu_dong"], "da_lap_bao_gia": row["da_lap_bao_gia"],
            })
    return list(nhom.values())


def tao_bao_gia(ma_vach: list[str], can_xac_nhan: bool, noi_dung: str | None, ghi_chu: str | None, ho_so: dict, *, id_ncc: str | None = None, ky_han: date | None = None, noi_dung_gia_cong: str | None = None, yeu_cau_ky_thuat: str | None = None, yeu_cau_chat_luong: str | None = None) -> dict:
    pham_vi = phan_quyen_service.kiem_quyen(ho_so, "dat_ngoai", "sua")
    ds_ma = list(dict.fromkeys(str(ma).strip() for ma in ma_vach if str(ma).strip()))
    if not ds_ma:
        raise ThieuDuLieu("Hãy chọn ít nhất một mã hàng để báo giá.")
    with get_conn() as conn:
        if not dat_ngoai_repo.san_sang(conn):
            raise ThieuDuLieu("Cơ sở dữ liệu chưa có bảng Đặt ngoài. Hãy chạy migration 031 và 032.", "CHUA_MIGRATE_DAT_NGOAI")
        rows = [dict(row) for row in dat_ngoai_repo.lay_dong_lsx(conn, ds_ma)]
    if len(rows) != len(ds_ma) or any(not _kiem_pham_vi_lsx(row, ho_so, pham_vi) for row in rows):
        raise KhongTimThay("Có mã hàng không còn tồn tại trong LSX.", "KHONG_TIM_THAY_MA_HANG_LSX")
    trung = next((row for row in rows if row["da_lap_bao_gia"]), None)
    if trung:
        raise XungDot(f"Mã hàng {trung['ma_vach']} đã có trong một báo giá đang xử lý.", "MA_HANG_DA_BAO_GIA")
    ncc = None
    if id_ncc:
        ncc = catalog_service.lay_nha_cung_cap(id_ncc)
        if not ncc.get("la_ncc_gia_cong") or ncc.get("trang_thai") != "HOAT_DONG":
            raise ThieuDuLieu("Chỉ chọn nhà cung cấp gia công đang hoạt động.", "NCC_KHONG_HOAT_DONG")
    theo_lsx = defaultdict(list)
    for row in rows:
        theo_lsx[row["lenh_san_xuat"]].append(row)
    trang_thai = "NHAP"
    ds_phieu = []
    for lsx, dong in theo_lsx.items():
        ds_phieu.append({
            "id": _ma("DNG"), "lenh_san_xuat": lsx, "trang_thai": trang_thai,
            "can_xac_nhan_ky_thuat": can_xac_nhan, "noi_dung_ky_thuat": noi_dung,
            "id_ncc": id_ncc, "ten_ncc_chup": ncc.get("ten") if ncc else None,
            "ky_han": ky_han, "ghi_chu": ghi_chu, "f3_yeu_cau_moi": True,
            "dong": [{**item, "id": _ma("DNGD"), "noi_dung_gia_cong": noi_dung_gia_cong,
                      "yeu_cau_ky_thuat": yeu_cau_ky_thuat, "yeu_cau_chat_luong": yeu_cau_chat_luong} for item in dong],
        })
    items = dat_ngoai_repo.tao_dat_ngoai(ds_phieu, ho_so["ma_nhan_vien"])
    return {"so_phieu": len(items), "items": items}


def danh_sach(ho_so: dict) -> list[dict]:
    pham_vi = phan_quyen_service.kiem_quyen(ho_so, "dat_ngoai", "xem")
    return _loc_phieu_pham_vi(
        [dict(row) for row in dat_ngoai_repo.danh_sach_dat_ngoai()], ho_so, pham_vi
    )


def hang_doi_xac_nhan_ky_thuat(ho_so: dict) -> list[dict]:
    pham_vi = phan_quyen_service.kiem_quyen(ho_so, "xac_nhan_kt", "xem")
    items = [dict(row) for row in dat_ngoai_repo.danh_sach_dat_ngoai()
             if row["trang_thai"] == "CHO_XAC_NHAN_KY_THUAT"]
    return _loc_phieu_pham_vi(items, ho_so, pham_vi)


def nha_cung_cap_co_the_chon(ho_so: dict) -> list[dict]:
    phan_quyen_service.kiem_quyen(ho_so, "dat_ngoai", "sua")
    danh_muc = catalog_service.lay_danh_muc("nha-cung-cap", 1, 100)
    return [item for item in danh_muc["items"]
            if item.get("la_ncc_gia_cong") and item.get("trang_thai") == "HOAT_DONG"]


def chon_nha_cung_cap(id_phieu: str, id_ncc: str, phien_ban: int, ho_so: dict) -> dict:
    pham_vi = phan_quyen_service.kiem_quyen(ho_so, "dat_ngoai", "sua")
    if not _pham_vi_phieu(id_phieu, ho_so, pham_vi):
        raise KhongTimThay("Không tìm thấy phiếu đặt ngoài trong phạm vi được cấp.")
    ncc = catalog_service.lay_nha_cung_cap(id_ncc)
    if not ncc.get("la_ncc_gia_cong") or ncc.get("trang_thai") != "HOAT_DONG":
        raise ThieuDuLieu("Chỉ chọn nhà cung cấp gia công đang hoạt động.", "NCC_KHONG_HOAT_DONG")
    row = dat_ngoai_repo.chon_nha_cung_cap(
        id_phieu, phien_ban, id_ncc, ncc.get("ma_ncc"), ncc.get("ten"), ho_so["ma_nhan_vien"],
    )
    if not row:
        raise XungDot("Phiếu không còn ở bước Đang xử lý / Báo giá hoặc vừa được cập nhật. Hãy tải lại.", "PHIEU_VUA_CAP_NHAT")
    return row


def cap_nhat_bao_gia(id_phieu: str, phien_ban: int, du_lieu: dict, ho_so: dict) -> dict:
    pham_vi = phan_quyen_service.kiem_quyen(ho_so, "dat_ngoai", "sua")
    if not _pham_vi_phieu(id_phieu, ho_so, pham_vi):
        raise KhongTimThay("Không tìm thấy phiếu đặt ngoài trong phạm vi được cấp.")
    if not str(du_lieu.get("ten_ncc") or "").strip():
        raise ThieuDuLieu("Nhà cung cấp là bắt buộc.")
    if not du_lieu.get("dong") or any(item.get("don_gia") is None or item["don_gia"] < 0 for item in du_lieu["dong"]):
        raise ThieuDuLieu("Phải nhập đơn giá hợp lệ cho tất cả mã hàng.")
    row = dat_ngoai_repo.cap_nhat_bao_gia(id_phieu, phien_ban, du_lieu, ho_so["ma_nhan_vien"])
    if not row:
        raise XungDot("Không thể lưu báo giá. Hãy tải lại phiếu, kiểm tra trạng thái Đang báo giá, nhà cung cấp và đầy đủ dòng hàng.")
    return row


def chuyen_trang_thai(id_phieu: str, phien_ban: int, trang_thai_moi: str, noi_dung: str | None, ho_so: dict) -> dict:
    trang_thai_moi = str(trang_thai_moi or "").strip().upper()
    with get_conn() as conn:
        if not dat_ngoai_repo.san_sang(conn):
            raise ThieuDuLieu("Cơ sở dữ liệu chưa có bảng Đặt ngoài.", "CHUA_MIGRATE_DAT_NGOAI")
        phieu = dat_ngoai_repo.lay_dat_ngoai(conn, id_phieu)
    if not phieu:
        raise KhongTimThay("Không tìm thấy phiếu đặt ngoài.")
    hien_tai = phieu["trang_thai"]
    la_huy = trang_thai_moi == "HUY"
    if hien_tai == "HUY" or (not la_huy and trang_thai_moi not in CHUYEN_TRANG_THAI.get(hien_tai, set())):
        raise XungDot(f"Không thể chuyển từ {hien_tai} sang {trang_thai_moi}.", "CHUYEN_TRANG_THAI_KHONG_HOP_LE")
    if la_huy:
        pham_vi = phan_quyen_service.kiem_quyen(ho_so, "dat_ngoai", "sua")
    elif trang_thai_moi == "DA_DUYET":
        pham_vi = phan_quyen_service.kiem_quyen(ho_so, "dat_ngoai", "duyet")
    elif hien_tai == "CHO_XAC_NHAN_KY_THUAT" and trang_thai_moi == "DANG_BAO_GIA":
        pham_vi = phan_quyen_service.kiem_quyen(ho_so, "xac_nhan_kt", "sua")
    elif hien_tai == "DA_DUYET" and trang_thai_moi == "DANG_BAO_GIA":
        pham_vi = phan_quyen_service.kiem_quyen(ho_so, "dat_ngoai", "sua")
    else:
        pham_vi = phan_quyen_service.kiem_quyen(ho_so, "dat_ngoai", "sua")
    if not _pham_vi_phieu(id_phieu, ho_so, pham_vi):
        raise KhongTimThay("Không tìm thấy phiếu đặt ngoài trong phạm vi được cấp.")
    if la_huy and not str(noi_dung or "").strip():
        raise ThieuDuLieu("Phải nhập lý do huỷ.", "THIEU_LY_DO_HUY")
    row = dat_ngoai_repo.chuyen_trang_thai(
        id_phieu, phien_ban, trang_thai_moi, noi_dung, ho_so["ma_nhan_vien"]
    )
    if not row:
        raise XungDot("Phiếu vừa được người khác cập nhật. Hãy tải lại.")
    return row



def gui_duyet(id_phieu: str, phien_ban: int, ho_so: dict) -> dict:
    pham_vi=phan_quyen_service.kiem_quyen(ho_so,"dat_ngoai","sua")
    if not _pham_vi_phieu(id_phieu,ho_so,pham_vi): raise KhongTimThay("Không tìm thấy phiếu đặt ngoài trong phạm vi được cấp.")
    row=dat_ngoai_repo.gui_duyet(id_phieu,phien_ban,ho_so["ma_nhan_vien"])
    if row and row.get("thieu_yeu_cau"): raise ThieuDuLieu("Cần nhập đủ nội dung gia công, yêu cầu kỹ thuật và yêu cầu chất lượng cho từng dòng trước khi gửi duyệt.","THIEU_YEU_CAU_DONG")
    if not row: raise XungDot("Phiếu không ở trạng thái Nháp hoặc vừa được cập nhật.")
    return row


def cap_nhat_yeu_cau_dong(id_phieu,id_dong,data,ho_so):
    pham_vi=phan_quyen_service.kiem_quyen(ho_so,"dat_ngoai","sua")
    if not _pham_vi_phieu(id_phieu,ho_so,pham_vi): raise KhongTimThay("Không tìm thấy phiếu đặt ngoài.")
    row=dat_ngoai_repo.cap_nhat_yeu_cau(id_phieu,id_dong,data,ho_so["ma_nhan_vien"])
    if not row: raise XungDot("Chỉ được sửa yêu cầu khi phiếu ở trạng thái Nháp.")
    return dict(row)


def them_xac_nhan_ky_thuat(id_phieu,data,ho_so):
    pham_vi=phan_quyen_service.kiem_quyen(ho_so,"xac_nhan_kt","sua")
    if not _pham_vi_phieu(id_phieu,ho_so,pham_vi): raise KhongTimThay("Không tìm thấy phiếu đặt ngoài.")
    row=dat_ngoai_repo.them_xac_nhan_ky_thuat(id_phieu,data,ho_so["ma_nhan_vien"])
    if not row: raise KhongTimThay("Không tìm thấy mã hàng trong phiếu.")
    return dict(row)


def ghi_dot_giao(id_phieu,data,ho_so):
    pham_vi=phan_quyen_service.kiem_quyen(ho_so,"dat_ngoai","sua")
    if not _pham_vi_phieu(id_phieu,ho_so,pham_vi): raise KhongTimThay("Không tìm thấy phiếu đặt ngoài.")
    row=dat_ngoai_repo.ghi_dot_giao(id_phieu,data,ho_so["ma_nhan_vien"])
    if not row: raise KhongTimThay("Không tìm thấy mã hàng trong phiếu.")
    return dict(row)


def gan_su_co(id_phieu,id_dong,id_su_co,ho_so):
    pham_vi=phan_quyen_service.kiem_quyen(ho_so,"dat_ngoai","sua")
    if not _pham_vi_phieu(id_phieu,ho_so,pham_vi): raise KhongTimThay("Không tìm thấy phiếu đặt ngoài.")
    row=dat_ngoai_repo.gan_su_co(id_phieu,id_dong,id_su_co,ho_so["ma_nhan_vien"])
    if row is None: raise KhongTimThay("Không tìm thấy mã hàng trong phiếu.")
    if row is False: raise KhongTimThay("Không tìm thấy phiếu sự cố.")
    return dict(row)


def doi_ma_dong(id_phieu,id_dong,ma_moi,ly_do,ho_so):
    pham_vi=phan_quyen_service.kiem_quyen(ho_so,"dat_ngoai","sua")
    if not _pham_vi_phieu(id_phieu,ho_so,pham_vi): raise KhongTimThay("Không tìm thấy phiếu đặt ngoài.")
    row=dat_ngoai_repo.doi_ma_dong(id_phieu,id_dong,ma_moi.strip(),ly_do.strip(),ho_so["ma_nhan_vien"])
    if not row: raise KhongTimThay("Không tìm thấy mã hàng trong phiếu.")
    return dict(row)


def them_trao_doi(id_phieu,noi_dung,ho_so):
    noi_dung=(noi_dung or "").strip()
    if not noi_dung: raise ThieuDuLieu("Nội dung trao đổi là bắt buộc.")
    pham_vi=phan_quyen_service.kiem_quyen(ho_so,"dat_ngoai","xem")
    if not _pham_vi_phieu(id_phieu,ho_so,pham_vi): raise KhongTimThay("Không tìm thấy phiếu đặt ngoài.")
    return dict(dat_ngoai_repo.them_trao_doi(id_phieu,noi_dung,ho_so["ma_nhan_vien"]))


def luu_tep(id_phieu,ten_tep,noi_dung,mime,ho_so):
    if not noi_dung or len(noi_dung)>MAX_UPLOAD_BYTES: raise ThieuDuLieu(f"Tệp phải có dung lượng từ 1 đến {MAX_UPLOAD_BYTES//(1024*1024)} MB.","TEP_KHONG_HOP_LE")
    if mime not in {"application/pdf","image/jpeg","image/png","image/webp"}: raise ThieuDuLieu("Chỉ nhận PDF, JPG, PNG hoặc WEBP.","LOAI_TEP_KHONG_HOP_LE")
    pham_vi=phan_quyen_service.kiem_quyen(ho_so,"dat_ngoai","sua")
    if not _pham_vi_phieu(id_phieu,ho_so,pham_vi): raise KhongTimThay("Không tìm thấy phiếu đặt ngoài.")
    safe=re.sub(r"[^A-Za-z0-9._-]","_",Path(ten_tep).name)[:180]
    folder=(Path(UPLOAD_DIR)/"dat_ngoai"/id_phieu).resolve(); folder.mkdir(parents=True,exist_ok=True)
    path=folder/f"{uuid.uuid4().hex}_{safe}"; path.write_bytes(noi_dung)
    try: return dict(dat_ngoai_repo.them_tep(id_phieu,Path(ten_tep).name,str(path),len(noi_dung),mime,ho_so["ma_nhan_vien"]))
    except Exception: path.unlink(missing_ok=True); raise


def tai_tep(id_phieu,id_tep,ho_so):
    pham_vi=phan_quyen_service.kiem_quyen(ho_so,"dat_ngoai","xem")
    if not _pham_vi_phieu(id_phieu,ho_so,pham_vi): raise KhongTimThay("Không tìm thấy phiếu đặt ngoài.")
    tep=dat_ngoai_repo.lay_tep(id_phieu,id_tep)
    if not tep: raise KhongTimThay("Không tìm thấy tệp đính kèm.")
    path=Path(tep["duong_dan"]).resolve(); root=Path(UPLOAD_DIR).resolve()
    if not path.is_relative_to(root): raise KhongCoQuyen("Đường dẫn tệp không hợp lệ.","DUONG_DAN_TEP_KHONG_HOP_LE")
    if not path.is_file(): raise KhongTimThay("Tệp vật lý không còn tồn tại.","TEP_KHONG_TON_TAI")
    return path.read_bytes(),tep["ten_tep"],tep.get("loai_mime") or "application/octet-stream"
