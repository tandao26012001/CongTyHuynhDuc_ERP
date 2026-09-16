"""Nghiệp vụ Đề nghị vật tư & Gia công ngoài (F01)."""

import re
import uuid
from datetime import date
from decimal import Decimal
from pathlib import Path

from backend.data import de_nghi_repo as repo
from backend.config.settings import MAX_UPLOAD_BYTES, PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX, UPLOAD_DIR
from backend.data.db import get_conn
from backend.services.errors import KhongCoQuyen, KhongTimThay, LoiNghiepVu, ThieuDuLieu, XungDot
from backend.services.lich_lam_viec import (
    cong_ngay_lam_viec,
    kiem_tra_bat_kha_thi,
    lay_tham_so,
    now_vn,
    tinh_ngay_hieu_luc,
)
from backend.services.phan_quyen_service import kiem_quyen
from backend.services.sinh_ma import sinh_ma

VAI_TRO_XEM_GIA = {"QUAN_TRI_KY_THUAT", "QUAN_TRI_NGHIEP_VU", "BAN_LANH_DAO", "TBP_MUA_HANG", "NV_MUA_HANG", "KE_TOAN"}
TRUONG_GIA = {"don_gia", "thanh_tien", "tong_tien"}


def _loc_truong_gia(ban_ghi: dict, ho_so: dict) -> dict:
    ket_qua = dict(ban_ghi)
    if ho_so.get("vai_tro") not in VAI_TRO_XEM_GIA:
        for truong in TRUONG_GIA:
            ket_qua.pop(truong, None)
    return ket_qua


def _kiem_quyen_truy_cap(ho_so: dict, dn: dict, hanh_dong: str = "xem", conn=None) -> None:
    pham_vi = kiem_quyen(ho_so, "de_nghi", hanh_dong, conn)
    if pham_vi == "ca_nhan":
        cot_so_huu = "nguoi_mua_hang" if ho_so.get("vai_tro") == "NV_MUA_HANG" else "nguoi_yeu_cau"
        if dn.get(cot_so_huu) != ho_so["ma_nhan_vien"]:
            raise KhongCoQuyen(f"Bạn không có quyền {hanh_dong} đề nghị này.")
    if pham_vi == "bo_phan" and dn["ma_bo_phan"] != ho_so["ma_bo_phan"]:
        raise KhongCoQuyen(f"Bạn không có quyền {hanh_dong} đề nghị của bộ phận khác.")


def _kiem_quyen_duyet(ho_so: dict, dn: dict, conn=None) -> None:
    pham_vi = kiem_quyen(ho_so, "de_nghi", "duyet", conn)
    if pham_vi == "bo_phan" and dn["ma_bo_phan"] != ho_so["ma_bo_phan"]:
        raise KhongCoQuyen("Bạn chỉ được duyệt đề nghị của bộ phận mình.")
    if pham_vi == "ca_nhan":
        raise KhongCoQuyen("Vai trò của bạn không có quyền duyệt đề nghị.")


def _xu_ly_dong(conn, id_dn: str, stt: int, d: dict, loai_phieu: str, ngay_hieu_luc: date,
                muc_do_uu_tien: int | None, nguoi_tao: str, ma_bo_phan: str) -> dict:
    so_luong = d.get("so_luong")
    if so_luong is None or Decimal(str(so_luong)) <= 0:
        raise LoiNghiepVu("Số lượng phải lớn hơn 0.", "SL_KHONG_HOP_LE")

    ky_han_yc = d.get("ky_han_yc")
    if not ky_han_yc:
        raise ThieuDuLieu("Kỳ hạn yêu cầu là bắt buộc.", "THIEU_KY_HAN")
    if isinstance(ky_han_yc, str):
        ky_han_yc = date.fromisoformat(ky_han_yc)

    ma_cong_doan = d.get("ma_cong_doan")
    if loai_phieu == "GIA_CONG_NGOAI" and not ma_cong_doan:
        raise LoiNghiepVu("Đề nghị gia công ngoài phải chọn công đoạn.", "THIEU_CONG_DOAN")

    id_vt = d.get("id_vat_tu")
    vt = repo.lay_vat_tu(conn, id_vt) if id_vt else None
    ten_hang = vt["ten_hang"] if vt else d.get("ten_hang")
    dvt = vt["dvt"] if vt else d.get("dvt")
    if not ten_hang or not dvt:
        raise ThieuDuLieu("Mỗi dòng bắt buộc có tên hàng và đơn vị tính.")

    phan_loai = vt["phan_loai"] if vt else (d.get("phan_loai") or "THONG_DUNG_SX")
    uu_tien_dong = None
    if loai_phieu == "MUA_HANG":
        lsx = repo.lay_lenh_san_xuat(conn, d.get("lenh_san_xuat")) if d.get("lenh_san_xuat") else None
        uu_tien_dong = lsx.get("muc_do_uu_tien") if lsx else 3
    bat_kha_thi, ngay_du_kien_ve, _ = kiem_tra_bat_kha_thi(
        ngay_hieu_luc, ky_han_yc, uu_tien_dong, loai_phieu, d.get("ma_loai_gia_cong"), ma_bo_phan
    )
    trang_thai_dong = "CHO_CAP_MA" if not vt else "NHAP"
    id_dong = sinh_ma(conn, "DND", ngay_hieu_luc.year)

    dong_data = {
        "id": id_dong, "id_de_nghi": id_dn, "stt_dong": stt, "id_sp_cu": d.get("id_sp_cu"),
        "id_vt_de_nghi": vt["id"] if vt else None, "id_vt_duyet_mua": vt["id"] if vt else None,
        "ten_hang_chup": ten_hang, "dvt_chup": dvt, "phan_loai_chup": phan_loai, "quy_cach": d.get("quy_cach"),
        "ma_chung_loai": vt["ma_chung_loai"] if vt else d.get("ma_chung_loai"),
        "muc_dich_su_dung": d.get("muc_dich_su_dung"), "so_luong": Decimal(str(so_luong)),
        "ky_han_yc": ky_han_yc, "tra_loi_ky_han": d.get("tra_loi_ky_han"), "lenh_san_xuat": d.get("lenh_san_xuat"),
        "ma_vach": d.get("ma_vach"), "ma_cong_doan": ma_cong_doan, "noi_dung_gia_cong": d.get("noi_dung_gia_cong"),
        "muc_do_uu_tien": uu_tien_dong, "ngay_du_kien_ve": ngay_du_kien_ve,
        "ma_loai_gia_cong": d.get("ma_loai_gia_cong"), "yeu_cau_ky_thuat": d.get("yeu_cau_ky_thuat"),
        "bat_kha_thi": bat_kha_thi, "can_xac_nhan_kt": d.get("can_xac_nhan_kt", False),
        "trang_thai_dong": trang_thai_dong, "ghi_chu": d.get("ghi_chu"), "nguoi_tao": nguoi_tao,
    }
    repo.tao_dong(conn, dong_data)
    if not vt:
        repo.tao_yeu_cau_cap_ma(conn, dong_data, nguoi_tao)
    return dong_data


def tao_de_nghi(du_lieu: dict, ho_so: dict, khoa_idempotency: str) -> dict:
    kiem_quyen(ho_so, "de_nghi", "sua")
    loai = du_lieu.get("loai", "MUA_HANG")
    if loai not in ("MUA_HANG", "GIA_CONG_NGOAI"):
        raise ThieuDuLieu("Loại đề nghị không hợp lệ.")

    danh_sach_dong = du_lieu.get("dong", [])
    thoi_diem = now_vn()
    ma_bo_phan = ho_so["ma_bo_phan"]
    nguoi_yeu_cau = ho_so["ma_nhan_vien"]
    ngay_hieu_luc, tre_gio_chot = tinh_ngay_hieu_luc(thoi_diem, loai, ma_bo_phan)

    with get_conn() as conn:
        try:
            da_co = repo.bat_dau_idempotency(
                conn, ho_so["ma_tai_khoan"], khoa_idempotency, "POST:/api/v1/de-nghi"
            )
        except ValueError as exc:
            raise XungDot(str(exc), "KHOA_CHONG_TRUNG_DA_DUNG") from None
        if da_co is not None:
            return da_co
        muc_do_uu_tien = None
        ds_lsx = {d.get("lenh_san_xuat") for d in danh_sach_dong if d.get("lenh_san_xuat")}
        if ds_lsx:
            uu_tien_list = [r["muc_do_uu_tien"] for lsx in ds_lsx
                            if (r := repo.lay_lenh_san_xuat(conn, lsx)) and r.get("muc_do_uu_tien") is not None]
            if uu_tien_list:
                muc_do_uu_tien = min(uu_tien_list)

        id_dn = sinh_ma(conn, "DN", thoi_diem.year)
        dn_data = {
            "id": id_dn, "loai": loai, "so_phieu_cu": du_lieu.get("so_phieu_cu"),
            "ma_bo_phan": ma_bo_phan, "nguoi_yeu_cau": nguoi_yeu_cau, "thoi_diem_gui": None,
            "ngay_hieu_luc": ngay_hieu_luc, "tre_gio_chot": tre_gio_chot, "muc_do_uu_tien": muc_do_uu_tien,
            "tinh_trang_yc": du_lieu.get("tinh_trang_yc", "BINH_THUONG"), "trang_thai": "NHAP",
            "ly_do_tra_lai": None, "can_bld_duyet": False,
            "nguoi_duyet_bp": None, "ngay_duyet_bp": None, "duyet_online": False,
            "ngay_ky_bu": None, "nguoi_mua_hang": None, "ghi_chu": du_lieu.get("ghi_chu"), "nguoi_tao": nguoi_yeu_cau,
        }
        repo.tao_de_nghi(conn, dn_data)
        for i, d in enumerate(danh_sach_dong, 1):
            _xu_ly_dong(conn, id_dn, i, d, loai, ngay_hieu_luc, muc_do_uu_tien, nguoi_yeu_cau, ma_bo_phan)
        repo.ghi_lich_su_trang_thai(conn, id_dn, None, "NHAP", nguoi_yeu_cau, "Tạo mới đề nghị")
        repo.ghi_nhat_ky(conn, id_dn, "TAO", nguoi_yeu_cau)
        ket_qua = dict(repo.lay_de_nghi(conn, id_dn))
        repo.hoan_tat_idempotency(conn, ho_so["ma_tai_khoan"], khoa_idempotency, ket_qua)
        return ket_qua


def sua_de_nghi(id_dn: str, du_lieu: dict, ho_so: dict, phien_ban: int) -> dict:
    kiem_quyen(ho_so, "de_nghi", "sua")
    du_lieu = {k: v for k, v in du_lieu.items() if k != "phien_ban"}
    with get_conn() as conn:
        dn = repo.lay_de_nghi(conn, id_dn, khoa=True)
        if not dn:
            raise KhongTimThay("Không tìm thấy đề nghị.")
        _kiem_quyen_truy_cap(ho_so, dn, "sua", conn)
        if dn["phien_ban"] != phien_ban:
            raise XungDot("Phiếu vừa được người khác cập nhật. Vui lòng tải lại.")

        if dn["trang_thai"] in ("DA_DUYET", "CHO_KY_BU"):
            truong_khong_duoc_sua = set(du_lieu) - {"ghi_chu"}
            if truong_khong_duoc_sua:
                raise LoiNghiepVu(
                    "Phiếu đã duyệt nên chỉ được cập nhật ghi chú. Hãy hủy phiếu và lập lại nếu cần thay đổi thông tin cốt lõi.",
                    "DA_DUYET_KHOA_SUA",
                )
            if "ghi_chu" in du_lieu:
                if not repo.cap_nhat_de_nghi(conn, id_dn, phien_ban, {"ghi_chu": du_lieu["ghi_chu"]}):
                    raise XungDot("Cập nhật thất bại do xung đột phiên bản.")
                repo.ghi_nhat_ky(conn, id_dn, "SUA", ho_so["ma_nhan_vien"], cot="ghi_chu")
            return repo.lay_de_nghi(conn, id_dn)

        if dn["trang_thai"] not in ("NHAP", "TRA_LAI"):
            raise LoiNghiepVu(f"Phiếu ở trạng thái {dn['trang_thai']} không thể chỉnh sửa.", "SAI_TRANG_THAI")

        cap_nhat = {f: du_lieu[f] for f in ("so_phieu_cu", "tinh_trang_yc", "ghi_chu") if f in du_lieu}
        if cap_nhat and not repo.cap_nhat_de_nghi(conn, id_dn, phien_ban, cap_nhat):
            raise XungDot("Cập nhật thất bại do xung đột phiên bản.")

        if "dong" in du_lieu:
            phien_hien_tai = repo.lay_de_nghi(conn, id_dn)["phien_ban"]
            if not cap_nhat and not repo.cham_de_nghi(conn, id_dn, phien_hien_tai, ho_so["ma_nhan_vien"]):
                raise XungDot("Cập nhật thất bại do xung đột phiên bản.")
            repo.xoa_cac_dong(conn, id_dn, ho_so["ma_nhan_vien"])
            for i, d in enumerate(du_lieu["dong"], 1):
                _xu_ly_dong(conn, id_dn, i, d, dn["loai"], dn["ngay_hieu_luc"], dn["muc_do_uu_tien"],
                            ho_so["ma_nhan_vien"], dn["ma_bo_phan"])

        repo.ghi_nhat_ky(conn, id_dn, "SUA", ho_so["ma_nhan_vien"])
        return repo.lay_de_nghi(conn, id_dn)


def gui_duyet(id_dn: str, ho_so: dict, phien_ban: int) -> dict:
    kiem_quyen(ho_so, "de_nghi", "sua")
    with get_conn() as conn:
        dn = repo.lay_de_nghi(conn, id_dn, khoa=True)
        if not dn:
            raise KhongTimThay("Không tìm thấy đề nghị.")
        _kiem_quyen_truy_cap(ho_so, dn, "sua", conn)
        if dn["trang_thai"] == "CHO_DUYET":
            return dn
        if dn["phien_ban"] != phien_ban:
            raise XungDot("Phiếu vừa được người khác cập nhật.")
        if dn["trang_thai"] not in ("NHAP", "TRA_LAI"):
            raise LoiNghiepVu("Phiếu không ở trạng thái nháp hoặc trả lại.", "SAI_TRANG_THAI")
        if repo.dem_dong(conn, id_dn) == 0:
            raise LoiNghiepVu("Phiếu chưa có dòng nào.", "PHIEU_RONG")

        canh_bao = []
        for lsx in repo.lay_cac_lsx(conn, id_dn):
            if repo.lsx_da_co_de_nghi(conn, lsx, tru_id_dn=id_dn) and lay_tham_so("CHE_DO_QT_LSX_DUY_NHAT", "CANH_BAO") == "CHAN":
                raise LoiNghiepVu(f"Lệnh sản xuất {lsx} đã có đề nghị vật tư trước đó.", "TRUNG_LSX")
            if repo.lsx_da_co_de_nghi(conn, lsx, tru_id_dn=id_dn):
                canh_bao.append(f"Lệnh sản xuất {lsx} đã có đề nghị trước đó.")

        cac_dong = repo.lay_cac_dong(conn, id_dn)
        if dn["loai"] == "GIA_CONG_NGOAI":
            for d in cac_dong:
                if not d.get("ma_cong_doan"):
                    raise LoiNghiepVu(
                        f"Dòng {d['stt_dong']} phải có công đoạn.",
                        "THIEU_CONG_DOAN",
                    )

        khong_co_lsx = not repo.lay_cac_lsx(conn, id_dn)
        if khong_co_lsx and not (dn.get("ghi_chu") or "").strip():
            raise LoiNghiepVu("Đề nghị không gắn LSX phải ghi rõ lý do trong ghi chú.", "THIEU_LY_DO_KHONG_LSX")
        if khong_co_lsx:
            canh_bao.append("Đề nghị không gắn LSX cần Ban lãnh đạo duyệt sau Trưởng bộ phận.")

        thoi_diem = now_vn()
        ngay_hl, tre = tinh_ngay_hieu_luc(thoi_diem, dn["loai"], dn["ma_bo_phan"])
        sla = []
        for d in cac_dong:
            uu_tien = d.get("muc_do_uu_tien")
            if dn["loai"] == "MUA_HANG":
                lsx = repo.lay_lenh_san_xuat(conn, d.get("lenh_san_xuat")) if d.get("lenh_san_xuat") else None
                uu_tien = lsx.get("muc_do_uu_tien") if lsx else 3
            bat_kha_thi, ngay_du_kien, _ = kiem_tra_bat_kha_thi(
                ngay_hl, d["ky_han_yc"], uu_tien, dn["loai"], d.get("ma_loai_gia_cong"), dn["ma_bo_phan"])
            sla.append((d["id"], uu_tien, ngay_du_kien, bat_kha_thi))
        repo.cap_nhat_de_nghi(conn, id_dn, phien_ban, {
            "trang_thai": "CHO_DUYET", "thoi_diem_gui": thoi_diem,
            "ngay_hieu_luc": ngay_hl, "tre_gio_chot": tre, "can_bld_duyet": khong_co_lsx,
            "muc_do_uu_tien": min((x[1] for x in sla if x[1] is not None), default=None),
        })
        for id_dong, uu_tien, ngay_du_kien, bat_kha_thi in sla:
            repo.cap_nhat_sla_dong(conn, id_dong, uu_tien, ngay_du_kien, bat_kha_thi)
        repo.ghi_lich_su_trang_thai(conn, id_dn, dn["trang_thai"], "CHO_DUYET", ho_so["ma_nhan_vien"], "Gửi duyệt")
        repo.ghi_nhat_ky(conn, id_dn, "SUA", ho_so["ma_nhan_vien"], cot="trang_thai", gia_tri_cu=dn["trang_thai"], gia_tri_moi="CHO_DUYET")

        for nd in repo.lay_nguoi_duyet_bo_phan(conn, dn["ma_bo_phan"]):
            repo.gui_thong_bao(conn, nd, "CHO_DUYET", f"Đề nghị {id_dn} chờ duyệt",
                               f"Đề nghị {id_dn} của {dn['nguoi_yeu_cau']} đang chờ bạn phê duyệt.", id_dn)
        ket_qua = dict(repo.lay_de_nghi(conn, id_dn))
        ket_qua["canh_bao"] = canh_bao
        return ket_qua


def duyet_de_nghi(id_dn: str, ho_so: dict, duyet_online: bool, ghi_chu: str | None, phien_ban: int, meta: dict | None = None) -> dict:
    with get_conn() as conn:
        dn = repo.lay_de_nghi(conn, id_dn, khoa=True)
        if not dn:
            raise KhongTimThay("Không tìm thấy đề nghị.")
        _kiem_quyen_duyet(ho_so, dn, conn)
        if dn["phien_ban"] != phien_ban:
            raise XungDot("Phiếu vừa được người khác xử lý.")
        if dn["trang_thai"] != "CHO_DUYET":
            raise LoiNghiepVu("Phiếu không ở trạng thái chờ duyệt.", "SAI_TRANG_THAI")

        if dn.get("can_bld_duyet") and not dn.get("nguoi_duyet_bp"):
            if ho_so.get("vai_tro") == "BAN_LANH_DAO":
                raise LoiNghiepVu("Đề nghị phải được Trưởng bộ phận duyệt trước.", "CHO_DUYET_BO_PHAN")
            repo.cap_nhat_de_nghi(conn, id_dn, phien_ban, {
                "nguoi_duyet_bp": ho_so["ma_nhan_vien"], "ngay_duyet_bp": now_vn(),
            })
            repo.ghi_lich_su_trang_thai(
                conn, id_dn, "CHO_DUYET", "CHO_DUYET", ho_so["ma_nhan_vien"],
                ghi_chu or "Trưởng bộ phận đã duyệt, chuyển Ban lãnh đạo",
            )
            for nv in repo.lay_ban_lanh_dao(conn):
                repo.gui_thong_bao(conn, nv, "CHO_DUYET_BLD", f"Đề nghị {id_dn} chờ Ban lãnh đạo duyệt",
                                   "Đề nghị không gắn LSX đã được Trưởng bộ phận duyệt.", id_dn)
            return repo.lay_de_nghi(conn, id_dn)

        if dn.get("can_bld_duyet") and ho_so.get("vai_tro") != "BAN_LANH_DAO":
            raise KhongCoQuyen("Đề nghị không gắn LSX đang chờ Ban lãnh đạo duyệt.")

        trang_thai_moi = "CHO_KY_BU" if duyet_online else "DA_DUYET"
        ngay_ky_bu = cong_ngay_lam_viec(now_vn().date(), 1, dn["ma_bo_phan"]) if duyet_online else None
        cap_nhat = {
            "trang_thai": trang_thai_moi, "nguoi_duyet_bp": ho_so["ma_nhan_vien"],
            "ngay_duyet_bp": now_vn(), "duyet_online": duyet_online, "ngay_ky_bu": ngay_ky_bu,
        }
        if dn.get("can_bld_duyet"):
            cap_nhat.pop("nguoi_duyet_bp")
            cap_nhat.pop("ngay_duyet_bp")
            cap_nhat.update({"nguoi_duyet_bld": ho_so["ma_nhan_vien"], "ngay_duyet_bld": now_vn()})
        repo.cap_nhat_de_nghi(conn, id_dn, phien_ban, cap_nhat)
        repo.ghi_lich_su_trang_thai(conn, id_dn, "CHO_DUYET", trang_thai_moi, ho_so["ma_nhan_vien"], ghi_chu)
        meta = meta or {}
        repo.ghi_nhat_ky(conn, id_dn, "DUYET", ho_so["ma_nhan_vien"], cot="trang_thai", gia_tri_cu="CHO_DUYET",
                         gia_tri_moi=trang_thai_moi, ip=meta.get("ip"), thiet_bi=meta.get("thiet_bi"))
        repo.gui_thong_bao(conn, dn["nguoi_yeu_cau"], "DA_DUYET", f"Đề nghị {id_dn} đã được duyệt",
                           f"Đề nghị {id_dn} đã được phê duyệt ({trang_thai_moi}).", id_dn)
        for nv in repo.lay_nhan_vien_mua_hang(conn):
            repo.gui_thong_bao(conn, nv, "DE_NGHI_MOI", f"Đề nghị mới {id_dn}",
                               f"Đề nghị {id_dn} của bộ phận {dn['ma_bo_phan']} đã được phê duyệt.", id_dn)
        return repo.lay_de_nghi(conn, id_dn)


def ky_bu_de_nghi(id_dn: str, ho_so: dict, phien_ban: int) -> dict:
    with get_conn() as conn:
        dn = repo.lay_de_nghi(conn, id_dn, khoa=True)
        if not dn:
            raise KhongTimThay("Không tìm thấy đề nghị.")
        _kiem_quyen_duyet(ho_so, dn, conn)
        if dn.get("can_bld_duyet") and ho_so.get("vai_tro") != "BAN_LANH_DAO":
            raise KhongCoQuyen("Phiếu này phải được Ban lãnh đạo ký bù.")
        if dn["phien_ban"] != phien_ban:
            raise XungDot("Phiếu vừa được người khác cập nhật.")
        if dn["trang_thai"] != "CHO_KY_BU":
            raise LoiNghiepVu("Phiếu không ở trạng thái chờ ký bù.", "SAI_TRANG_THAI")

        repo.cap_nhat_de_nghi(conn, id_dn, phien_ban, {"trang_thai": "DA_DUYET", "ngay_ky_bu": now_vn().date()})
        repo.ghi_lich_su_trang_thai(conn, id_dn, "CHO_KY_BU", "DA_DUYET", ho_so["ma_nhan_vien"], "Đã ký bù")
        return repo.lay_de_nghi(conn, id_dn)


def tra_lai_de_nghi(id_dn: str, ho_so: dict, ly_do: str, phien_ban: int) -> dict:
    if not ly_do or not ly_do.strip():
        raise ThieuDuLieu("Phải nhập lý do trả lại.", "THIEU_LY_DO")
    with get_conn() as conn:
        dn = repo.lay_de_nghi(conn, id_dn, khoa=True)
        if not dn:
            raise KhongTimThay("Không tìm thấy đề nghị.")
        if dn["trang_thai"] == "DA_DUYET":
            if ho_so.get("vai_tro") not in {"TBP_MUA_HANG", "NV_MUA_HANG", "QUAN_TRI_NGHIEP_VU"}:
                raise KhongCoQuyen("Chỉ bộ phận Mua hàng được trả lại phiếu đã duyệt.")
            _kiem_quyen_truy_cap(ho_so, dn, "sua", conn)
        else:
            _kiem_quyen_duyet(ho_so, dn, conn)
        if dn["phien_ban"] != phien_ban:
            raise XungDot("Phiếu vừa được người khác cập nhật.")
        if dn["trang_thai"] not in ("CHO_DUYET", "DA_DUYET"):
            raise LoiNghiepVu("Phiếu không ở trạng thái có thể trả lại.", "SAI_TRANG_THAI")

        repo.cap_nhat_de_nghi(conn, id_dn, phien_ban, {"trang_thai": "TRA_LAI", "ly_do_tra_lai": ly_do.strip()})
        repo.ghi_lich_su_trang_thai(conn, id_dn, dn["trang_thai"], "TRA_LAI", ho_so["ma_nhan_vien"], ly_do.strip())
        repo.gui_thong_bao(conn, dn["nguoi_yeu_cau"], "TRA_LAI", f"Đề nghị {id_dn} bị trả lại", f"Lý do: {ly_do.strip()}", id_dn)
        return repo.lay_de_nghi(conn, id_dn)


def huy_de_nghi(id_dn: str, ho_so: dict, ly_do: str, phien_ban: int) -> dict:
    if not ly_do or not ly_do.strip():
        raise ThieuDuLieu("Phải nhập lý do hủy đề nghị.", "THIEU_LY_DO")
    with get_conn() as conn:
        dn = repo.lay_de_nghi(conn, id_dn, khoa=True)
        if not dn:
            raise KhongTimThay("Không tìm thấy đề nghị.")
        _kiem_quyen_truy_cap(ho_so, dn, "sua", conn)
        if dn["phien_ban"] != phien_ban:
            raise XungDot("Phiếu vừa được người khác cập nhật.")
        if dn["trang_thai"] == "HUY":
            raise LoiNghiepVu("Phiếu đã bị hủy trước đó.", "DA_HUY")

        ghi_chu_moi = ((dn.get("ghi_chu") or "") + f" [HỦY: {ly_do.strip()}]").strip()
        repo.cap_nhat_de_nghi(conn, id_dn, phien_ban, {"trang_thai": "HUY", "ghi_chu": ghi_chu_moi})
        repo.huy_cac_dong(conn, id_dn, ho_so["ma_nhan_vien"])
        repo.ghi_lich_su_trang_thai(conn, id_dn, dn["trang_thai"], "HUY", ho_so["ma_nhan_vien"], ly_do.strip())
        return repo.lay_de_nghi(conn, id_dn)


def phan_cong_mua_hang(id_dn: str, ho_so: dict, nguoi_mua_hang: str, phien_ban: int) -> dict:
    if ho_so["vai_tro"] not in ("TBP_MUA_HANG", "QUAN_TRI_NGHIEP_VU"):
        raise KhongCoQuyen("Chỉ Trưởng bộ phận Mua hàng mới có quyền phân công.")
    kiem_quyen(ho_so, "de_nghi", "sua")
    with get_conn() as conn:
        dn = repo.lay_de_nghi(conn, id_dn, khoa=True)
        if not dn:
            raise KhongTimThay("Không tìm thấy đề nghị.")
        if dn["phien_ban"] != phien_ban:
            raise XungDot("Phiếu vừa được người khác cập nhật.")
        if dn["trang_thai"] != "DA_DUYET":
            raise LoiNghiepVu("Chỉ phân công sau khi đề nghị đã duyệt.", "SAI_TRANG_THAI")
        if not repo.la_nhan_vien_mua_hang_hoat_dong(conn, nguoi_mua_hang):
            raise ThieuDuLieu(
                "Người được phân công phải là nhân viên Mua hàng đang hoạt động.",
                "NGUOI_MUA_HANG_KHONG_HOP_LE",
            )

        repo.cap_nhat_de_nghi(conn, id_dn, phien_ban, {"nguoi_mua_hang": nguoi_mua_hang})
        repo.ghi_nhat_ky(conn, id_dn, "SUA", ho_so["ma_nhan_vien"], cot="nguoi_mua_hang", gia_tri_moi=nguoi_mua_hang)
        repo.gui_thong_bao(conn, nguoi_mua_hang, "PHAN_CONG", f"Bạn được phân công xử lý đề nghị {id_dn}",
                           f"Đề nghị {id_dn} đã được gán cho bạn phụ trách.", id_dn)
        return repo.lay_de_nghi(conn, id_dn)


def duyet_hang_loat(ids: list[str], ho_so: dict, duyet_online: bool = False) -> dict:
    ket_qua = {"thanh_cong": [], "that_bai": []}
    for id_dn in ids:
        try:
            with get_conn() as conn:
                dn = repo.lay_de_nghi(conn, id_dn)
                if not dn:
                    ket_qua["that_bai"].append({"id": id_dn, "loi": "Không tìm thấy"})
                    continue
                phien_ban = dn["phien_ban"]
            duyet_de_nghi(id_dn, ho_so, duyet_online, "Duyệt hàng loạt", phien_ban)
            ket_qua["thanh_cong"].append(id_dn)
        except LoiNghiepVu as exc:
            ket_qua["that_bai"].append({"id": id_dn, "loi": str(exc), "ma_loi": exc.ma_loi})
    return ket_qua


def lay_chi_tiet(id_dn: str, ho_so: dict) -> dict:
    with get_conn() as conn:
        repo.gui_nhac_ky_bu_den_han(conn)
        dn = repo.lay_de_nghi(conn, id_dn)
        if not dn:
            raise KhongTimThay("Không tìm thấy đề nghị.")
        _kiem_quyen_truy_cap(ho_so, dn, "xem", conn)
        dong = repo.lay_cac_dong(conn, id_dn)
        lich_su = repo.lay_lich_su_trang_thai(conn, id_dn)
        trao_doi = repo.lay_trao_doi(conn, id_dn)
        tep = repo.lay_tep_dinh_kem(conn, id_dn)
        return {
            "de_nghi": _loc_truong_gia(dn, ho_so), "dong": [_loc_truong_gia(d, ho_so) for d in dong],
            "lich_su": [dict(ls) for ls in lich_su], "trao_doi": [dict(x) for x in trao_doi],
            "dinh_kem": [{**{k: v for k, v in dict(x).items() if k != "duong_dan"},
                           "url_tai": f"/api/v1/de-nghi/{id_dn}/dinh-kem/{x['id']}"} for x in tep],
        }


def danh_sach(bo_loc: dict, ho_so: dict, trang: int = 1, kich_thuoc: int = PAGE_SIZE_DEFAULT) -> dict:
    pham_vi = kiem_quyen(ho_so, "de_nghi", "xem")
    kich_thuoc = min(max(kich_thuoc, 1), PAGE_SIZE_MAX)
    trang = max(trang, 1)
    offset = (trang - 1) * kich_thuoc
    with get_conn() as conn:
        repo.gui_nhac_ky_bu_den_han(conn)
        items, tong = repo.danh_sach_de_nghi(conn, bo_loc, pham_vi, ho_so, offset, kich_thuoc)
        thong_ke = repo.thong_ke_de_nghi(conn, bo_loc, pham_vi, ho_so)
        return {
            "items": [dict(i) for i in items], "tong": tong, "trang": trang,
            "kich_thuoc": kich_thuoc, "thong_ke": dict(thong_ke),
        }


def hang_doi_cho_duyet(ho_so: dict, trang: int = 1, kich_thuoc: int = PAGE_SIZE_DEFAULT) -> dict:
    pham_vi = kiem_quyen(ho_so, "de_nghi", "duyet")
    kich_thuoc = min(max(kich_thuoc, 1), PAGE_SIZE_MAX)
    trang = max(trang, 1)
    offset = (trang - 1) * kich_thuoc
    with get_conn() as conn:
        items, tong = repo.hang_doi_cho_duyet(conn, ho_so, pham_vi, offset, kich_thuoc)
        return {"items": [dict(i) for i in items], "tong": tong, "trang": trang, "kich_thuoc": kich_thuoc}


def nhac_ky_bu_den_han() -> int:
    """Điểm gọi cho cron; danh sách/chi tiết cũng gọi lazy để không bỏ sót lời nhắc."""
    with get_conn() as conn:
        return repo.gui_nhac_ky_bu_den_han(conn)


def soi_ky_han_nhanh(du_lieu: dict, ho_so: dict) -> dict:
    loai = du_lieu.get("loai", "MUA_HANG")
    ngay_hieu_luc = du_lieu.get("ngay_hieu_luc")
    if isinstance(ngay_hieu_luc, str):
        ngay_hieu_luc = date.fromisoformat(ngay_hieu_luc)
    elif not ngay_hieu_luc:
        ngay_hieu_luc, _ = tinh_ngay_hieu_luc(now_vn(), loai, ho_so["ma_bo_phan"])

    ky_han_yc = du_lieu.get("ky_han_yc")
    if isinstance(ky_han_yc, str):
        ky_han_yc = date.fromisoformat(ky_han_yc)
    if not ky_han_yc:
        raise ThieuDuLieu("Thiếu kỳ hạn cần kiểm tra.")

    bat_kha_thi, ngay_du_kien, thong_diep = kiem_tra_bat_kha_thi(
        ngay_hieu_luc, ky_han_yc, du_lieu.get("muc_do_uu_tien"),
        loai, du_lieu.get("ma_loai_gia_cong"), ho_so["ma_bo_phan"]
    )
    return {"bat_kha_thi": bat_kha_thi, "ngay_du_kien_ve": ngay_du_kien.isoformat(), "thong_diep": thong_diep}


def them_trao_doi(id_dn: str, noi_dung: str, ho_so: dict) -> dict:
    noi_dung = (noi_dung or "").strip()
    if not noi_dung:
        raise ThieuDuLieu("Nội dung trao đổi là bắt buộc.")
    with get_conn() as conn:
        dn = repo.lay_de_nghi(conn, id_dn)
        if not dn:
            raise KhongTimThay("Không tìm thấy đề nghị.")
        _kiem_quyen_truy_cap(ho_so, dn, "xem", conn)
        return dict(repo.them_trao_doi(conn, id_dn, noi_dung, ho_so["ma_nhan_vien"]))


def luu_dinh_kem(id_dn: str, ten_tep: str, noi_dung: bytes, loai_mime: str | None, ho_so: dict) -> dict:
    if not noi_dung or len(noi_dung) > MAX_UPLOAD_BYTES:
        raise ThieuDuLieu(f"Tệp phải có dung lượng từ 1 đến {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.", "TEP_KHONG_HOP_LE")
    loai_cho_phep = {"application/pdf", "image/jpeg", "image/png", "image/webp"}
    if loai_mime not in loai_cho_phep:
        raise ThieuDuLieu("Chỉ nhận PDF, JPG, PNG hoặc WEBP.", "LOAI_TEP_KHONG_HOP_LE")
    with get_conn() as conn:
        dn = repo.lay_de_nghi(conn, id_dn)
        if not dn:
            raise KhongTimThay("Không tìm thấy đề nghị.")
        _kiem_quyen_truy_cap(ho_so, dn, "sua", conn)
        ten_an_toan = re.sub(r"[^A-Za-z0-9._-]", "_", Path(ten_tep).name)[:180]
        thu_muc = (Path(UPLOAD_DIR) / "de_nghi" / id_dn).resolve()
        thu_muc.mkdir(parents=True, exist_ok=True)
        duong_dan = thu_muc / f"{uuid.uuid4().hex}_{ten_an_toan}"
        duong_dan.write_bytes(noi_dung)
        try:
            return dict(repo.them_tep_dinh_kem(
                conn, id_dn, ten_tep, str(duong_dan), len(noi_dung), loai_mime, ho_so["ma_nhan_vien"]
            ))
        except Exception:
            duong_dan.unlink(missing_ok=True)
            raise
