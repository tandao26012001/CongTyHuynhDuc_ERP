"""Nghiep vu yeu cau va so sanh bao gia (F03)."""

from datetime import date
from decimal import Decimal

from backend.data.db import get_conn
from backend.data import f03_repo as repo
from backend.services.errors import KhongTimThay, LoiNghiepVu, ThieuDuLieu, XungDot
from backend.services.phan_quyen_service import kiem_quyen
from backend.services.sinh_ma import sinh_ma
from backend.services.lich_lam_viec import now_vn


def _xem(ho_so):
    return kiem_quyen(ho_so, "bao_gia", "xem")


def _sua(ho_so):
    return kiem_quyen(ho_so, "bao_gia", "sua")


def _duyet(ho_so):
    return kiem_quyen(ho_so, "bao_gia", "duyet")

def _kiem_pham_vi_dong(conn, id_dong, ho_so, pham_vi):
    if pham_vi == "toan_bo":
        return
    row = conn.execute(
        """SELECT dn.ma_bo_phan,dn.nguoi_yeu_cau FROM de_nghi_dong d
           JOIN de_nghi dn ON dn.id=d.id_de_nghi WHERE d.id=%s AND d.da_xoa=false""",
        (id_dong,),
    ).fetchone()
    if (not row or row["ma_bo_phan"] != ho_so.get("ma_bo_phan")
            or (pham_vi == "ca_nhan" and row["nguoi_yeu_cau"] != ho_so.get("ma_nhan_vien"))):
        raise KhongTimThay("Không tìm thấy dữ liệu trong phạm vi được cấp.")

def _kiem_pham_vi_ycbg(conn, id_ycbg, ho_so, pham_vi):
    rows = repo.lay_ycbg_dong(conn, id_ycbg)
    if not rows:
        raise KhongTimThay("Không tìm thấy dữ liệu trong phạm vi được cấp.")
    for row in rows:
        _kiem_pham_vi_dong(conn, row["id_de_nghi_dong"], ho_so, pham_vi)


def dong_cho_bao_gia(ho_so):
    pham_vi = _xem(ho_so)
    with get_conn() as conn:
        rows = repo.dong_cho_bao_gia(conn)
        items = []
        for row in rows:
            try:
                _kiem_pham_vi_dong(conn, row["id"], ho_so, pham_vi)
                items.append(dict(row))
            except KhongTimThay:
                continue
        return {"items": items}


def tao_yeu_cau_bao_gia(id_ncc, ids_dong, han_tra_loi, ho_so):
    if not ids_dong:
        raise ThieuDuLieu("Phai chon it nhat mot dong bao gia.", "THIEU_DONG_BAO_GIA")
    pham_vi = _sua(ho_so)
    with get_conn() as conn:
        ncc = repo.lay_ncc(conn, id_ncc)
        if not ncc:
            raise KhongTimThay("Khong tim thay nha cung cap.")
        if ncc["trang_thai"] in ("TAM_NGUNG", "LOAI_BO"):
            raise LoiNghiepVu("Nha cung cap dang bi tam ngung/loai bo.", "NCC_KHONG_HOAT_DONG")
        if not ncc["da_phe_duyet"]:
            raise LoiNghiepVu("Nha cung cap chua duoc phe duyet.", "NCC_CHUA_PHE_DUYET")
        ycbg = repo.tao_ycbg(conn, {"id": sinh_ma(conn, "YCBG", now_vn().year), "id_ncc": id_ncc, "han_tra_loi": han_tra_loi, "nguoi_tao": ho_so["ma_nhan_vien"]})
        for stt, id_dong in enumerate(dict.fromkeys(ids_dong), 1):
            dong = repo.lay_dong(conn, id_dong, True)
            if not dong:
                raise KhongTimThay("Khong tim thay dong de nghi.")
            _kiem_pham_vi_dong(conn, id_dong, ho_so, pham_vi)
            if dong["trang_thai_dong"] != "DA_DUYET":
                raise LoiNghiepVu(f"Dong {id_dong} chua duoc duyet.", "DONG_CHUA_DUYET")
            if dong["can_xac_nhan_kt"]:
                raise LoiNghiepVu(f"Dong {id_dong} chua xac nhan ky thuat.", "BG04_CHUA_XAC_NHAN_KT")
            repo.tao_ycbg_dong(conn, {"id": repo.tao_id("YCBGD"), "id_ycbg": ycbg["id"], "id_de_nghi_dong": id_dong, "stt_dong": stt, "ten_hang_chup": dong["ten_hang_chup"], "quy_cach": dong["quy_cach"], "dvt_chup": dong["dvt_chup"], "so_luong": dong["so_luong"], "ky_han_yc": dong["ky_han_yc"], "nguoi_tao": ho_so["ma_nhan_vien"]})
            if not repo.cap_nhat_dong(conn, id_dong, dong["phien_ban"], {"trang_thai_dong": "DANG_BAO_GIA"}):
                raise XungDot("Dong de nghi vua duoc cap nhat.")
        return dict(ycbg)


def danh_sach_ycbg(ho_so):
    pham_vi = _xem(ho_so)
    with get_conn() as conn:
        items = []
        for row in repo.danh_sach_ycbg(conn):
            try:
                _kiem_pham_vi_ycbg(conn, row["id"], ho_so, pham_vi)
                items.append(dict(row))
            except KhongTimThay:
                continue
        return {"items": items}


def chi_tiet_ycbg(id_ycbg, ho_so):
    pham_vi = _xem(ho_so)
    with get_conn() as conn:
        ycbg = repo.lay_ycbg(conn, id_ycbg)
        if not ycbg: raise KhongTimThay("Khong tim thay yeu cau bao gia.")
        _kiem_pham_vi_ycbg(conn, id_ycbg, ho_so, pham_vi)
        return {"yeu_cau": dict(ycbg), "dong": [dict(row) for row in repo.lay_ycbg_dong(conn, id_ycbg)]}


def nhap_bao_gia(du_lieu, ho_so):
    pham_vi = _sua(ho_so)
    dong_du_lieu = du_lieu.get("dong") or []
    if not dong_du_lieu:
        raise ThieuDuLieu("Bao gia phai co it nhat mot dong.", "THIEU_DONG_BAO_GIA")
    with get_conn() as conn:
        ycbg = repo.lay_ycbg(conn, du_lieu["id_ycbg"])
        if not ycbg:
            raise KhongTimThay("Khong tim thay yeu cau bao gia.")
        _kiem_pham_vi_ycbg(conn, ycbg["id"], ho_so, pham_vi)
        if ycbg["trang_thai"] not in ("DA_GUI", "DA_NHAN"):
            raise LoiNghiepVu("Yeu cau bao gia khong o trang thai nhap bao gia.", "SAI_TRANG_THAI")
        if str(du_lieu["id_ncc"]) != str(ycbg["id_ncc"]):
            raise LoiNghiepVu("Nha cung cap khong khop yeu cau bao gia.", "NCC_KHONG_KHOP")
        ycbg_dong = {row["id_de_nghi_dong"]: row for row in repo.lay_ycbg_dong(conn, ycbg["id"])}
        bg = repo.tao_bao_gia(conn, {"id": sinh_ma(conn, "BG", now_vn().year), "id_ycbg": ycbg["id"], "id_ncc": ycbg["id_ncc"], "ngay_bao_gia": du_lieu.get("ngay_bao_gia") or date.today(), "hieu_luc_den": du_lieu.get("hieu_luc_den"), "dieu_kien_thanh_toan": du_lieu.get("dieu_kien_thanh_toan"), "thoi_gian_giao": du_lieu.get("thoi_gian_giao"), "nguoi_tao": ho_so["ma_nhan_vien"]})
        for stt, item in enumerate(dong_du_lieu, 1):
            ref = ycbg_dong.get(item.get("id_de_nghi_dong"))
            if not ref:
                raise LoiNghiepVu("Dong bao gia khong thuoc yeu cau.", "DONG_KHONG_THUOC_YCBG")
            unit = item.get("don_vi_gia", "PCS").upper()
            if unit in {"KG", "MET", "LIT"} and not item.get("trong_luong"):
                raise LoiNghiepVu(f"Dong {stt}: don gia theo {unit} phai co trong luong.", "THIEU_TRONG_LUONG")
            repo.tao_bao_gia_dong(conn, {"id": repo.tao_id("BGD"), "id_bao_gia": bg["id"], "id_de_nghi_dong": ref["id_de_nghi_dong"], "stt_dong": stt, "ten_hang_chup": ref["ten_hang_chup"], "dvt_chup": ref["dvt_chup"], "so_luong": ref["so_luong"], "don_gia_co_so": item["don_gia_co_so"], "don_vi_gia": unit, "trong_luong": item.get("trong_luong"), "thoi_gian_giao": item.get("thoi_gian_giao"), "ghi_chu": item.get("ghi_chu"), "nguoi_tao": ho_so["ma_nhan_vien"]})
        return dict(bg)


def so_sanh(ids_dong, ho_so):
    pham_vi = _xem(ho_so)
    if not ids_dong:
        raise ThieuDuLieu("Phai truyen ids_dong.", "THIEU_DONG_SO_SANH")
    with get_conn() as conn:
        for id_dong in ids_dong:
            _kiem_pham_vi_dong(conn, id_dong, ho_so, pham_vi)
        rows = repo.lay_ma_tran(conn, ids_dong)
    matrix = {id_dong: [] for id_dong in ids_dong}
    for row in rows:
        unit = row["don_vi_gia"]
        base = Decimal(row["don_gia_co_so"])
        quantity = Decimal(row["trong_luong"] if unit != "PCS" else row["so_luong"])
        item = dict(row)
        item["thanh_tien"] = float(base * quantity)
        item["don_gia_co_so"] = float(base)
        item["trong_luong"] = float(row["trong_luong"]) if row["trong_luong"] is not None else None
        matrix[row["id_de_nghi_dong"]].append(item)
    for values in matrix.values():
        if values:
            cheapest = min(v["thanh_tien"] for v in values)
            fastest = min((v["thoi_gian_giao_dong"] for v in values if v["thoi_gian_giao_dong"] is not None), default=None)
            for value in values:
                value["la_re_nhat"] = value["thanh_tien"] == cheapest
                value["la_nhanh_nhat"] = fastest is not None and value["thoi_gian_giao_dong"] == fastest
    return {"items": matrix}


def chon_bao_gia(id_bao_gia, ly_do_chon, phien_ban, ho_so):
    pham_vi = _duyet(ho_so)
    with get_conn() as conn:
        bg = repo.lay_bao_gia(conn, id_bao_gia, True)
        if not bg: raise KhongTimThay("Khong tim thay bao gia.")
        for line in repo.lay_bao_gia_dong(conn, id_bao_gia):
            _kiem_pham_vi_dong(conn, line["id_de_nghi_dong"], ho_so, pham_vi)
        lines = repo.lay_bao_gia_dong(conn, id_bao_gia)
        if bg["phien_ban"] != phien_ban: raise XungDot("Bao gia vua duoc cap nhat.")
        if not lines: raise LoiNghiepVu("Bao gia chua co dong.", "BAO_GIA_RONG")
        for line in lines:
            count = repo.dem_bao_gia_cua_dong(conn, line["id_de_nghi_dong"])
            if count < 2 and not bg["mien_tru_2_bao_gia"]:
                raise LoiNghiepVu(f"Dong {line['id_de_nghi_dong']} chua du 2 bao gia.", "BG01_CHUA_DU_BAO_GIA")
            rating = conn.execute(
                """SELECT dg.xep_loai FROM de_nghi_dong d
                   JOIN vat_tu v ON v.id=coalesce(d.id_vt_duyet_mua,d.id_vt_de_nghi)
                   JOIN mat_hang_ncc m ON m.ma_vat_tu=v.ma_vat_tu AND m.id_ncc=%s
                   JOIN danh_gia_ncc dg ON dg.id_mat_hang_ncc=m.id
                   WHERE d.id=%s AND dg.trang_thai_duyet='DA_DUYET'
                   ORDER BY dg.ngay_danh_gia DESC,dg.ngay_duyet DESC LIMIT 1""",
                (bg['id_ncc'], line['id_de_nghi_dong']),
            ).fetchone()
            if rating and rating['xep_loai'] == 'KHONG_CHON':
                raise LoiNghiepVu('BM06 đã duyệt kết luận Không chọn cho mặt hàng này.',
                                   'NCC_KHONG_CHON_MAT_HANG')
            if rating and rating['xep_loai'] == 'DU_PHONG' and not str(ly_do_chon or '').strip():
                raise ThieuDuLieu('NCC dự phòng: cần ghi lý do vẫn chọn báo giá.',
                                  'NCC_DU_PHONG_CAN_LY_DO')
        cap = conn.execute('SELECT dinh_muc_thang,ten FROM nha_cung_cap WHERE id=%s',
                           (bg['id_ncc'],)).fetchone()
        if cap and cap['dinh_muc_thang'] is not None:
            used = conn.execute(
                """SELECT
                     (SELECT coalesce(sum(d.don_gia_co_so * CASE WHEN d.don_vi_gia='PCS'
                          THEN d.so_luong ELSE d.trong_luong END),0)
                      FROM don_hang o JOIN don_hang_dong d ON d.id_don_hang=o.id
                      WHERE o.id_ncc=%s AND o.ngay_dat>=date_trunc('month',current_date)::date
                        AND o.ngay_dat<(date_trunc('month',current_date)+interval '1 month')::date
                        AND o.ngay_duyet IS NOT NULL AND o.trang_thai<>'HUY')
                    + (SELECT coalesce(sum(d.so_luong*d.don_gia),0)
                       FROM dat_ngoai o JOIN dat_ngoai_dong d ON d.id_dat_ngoai=o.id
                       WHERE d.id_ncc=%s AND o.ngay_dat>=date_trunc('month',current_date)
                         AND o.ngay_dat<date_trunc('month',current_date)+interval '1 month'
                         AND o.trang_thai<>'HUY') AS total""",
                (bg['id_ncc'], bg['id_ncc']),
            ).fetchone()['total']
            proposed = sum((Decimal(str(line['don_gia_co_so'])) *
                            Decimal(str(line['so_luong'] if line['don_vi_gia']=='PCS'
                                        else line['trong_luong'])) for line in lines), Decimal(0))
            if Decimal(used) + proposed > Decimal(cap['dinh_muc_thang']) and not str(ly_do_chon or '').strip():
                raise ThieuDuLieu(
                    f"{cap['ten']} đã đặt {used:,.0f} VND tháng này; báo giá này {proposed:,.0f} VND "
                    f"vượt định mức {cap['dinh_muc_thang']:,.0f} VND. Ghi lý do để tiếp tục.",
                    'NCC_VUOT_DINH_MUC_CAN_LY_DO')
        if not ly_do_chon or not ly_do_chon.strip():
            # So sanh tong gia cac bao gia co cung tap dong.
            alternatives = conn.execute("SELECT b.id FROM bao_gia b JOIN bao_gia_dong bd ON bd.id_bao_gia=b.id WHERE bd.id_de_nghi_dong=ANY(%s) GROUP BY b.id", ([line["id_de_nghi_dong"] for line in lines],)).fetchall()
            totals = {}
            for alt in alternatives:
                total = conn.execute("SELECT coalesce(sum(don_gia_co_so * CASE WHEN don_vi_gia='PCS' THEN so_luong ELSE trong_luong END),0) AS total FROM bao_gia_dong WHERE id_bao_gia=%s", (alt["id"],)).fetchone()["total"]
                totals[alt["id"]] = Decimal(total)
            if totals and Decimal(totals[id_bao_gia]) > min(totals.values()):
                raise ThieuDuLieu("Bao gia khong re nhat, phai nhap ly do.", "THIEU_LY_DO_CHON")
        repo.bo_chon_khac(conn, id_bao_gia, [line["id_de_nghi_dong"] for line in lines])
        result = repo.cap_nhat_bao_gia(conn, id_bao_gia, phien_ban, {"duoc_chon": True, "ly_do_chon": ly_do_chon})
        if not result: raise XungDot("Bao gia vua duoc cap nhat.")
        return dict(result)


def mien_tru_bao_gia(id_bao_gia, ly_do, phien_ban, ho_so):
    if not ly_do or not ly_do.strip(): raise ThieuDuLieu("Ly do mien tru bat buoc.", "THIEU_LY_DO_MIEN_TRU")
    pham_vi = _duyet(ho_so)
    with get_conn() as conn:
        bg = repo.lay_bao_gia(conn, id_bao_gia)
        if not bg: raise KhongTimThay("Khong tim thay bao gia.")
        for line in repo.lay_bao_gia_dong(conn, id_bao_gia):
            _kiem_pham_vi_dong(conn, line["id_de_nghi_dong"], ho_so, pham_vi)
        result = repo.cap_nhat_bao_gia(conn, id_bao_gia, phien_ban, {"mien_tru_2_bao_gia": True, "ly_do_mien_tru": ly_do.strip()})
        if not result: raise XungDot("Bao gia vua duoc cap nhat.")
        return dict(result)


def lich_su_gia(id_vat_tu, ho_so):
    pham_vi = _xem(ho_so)
    with get_conn() as conn:
        items = []
        for row in repo.lich_su_gia(conn, id_vat_tu):
            _kiem_pham_vi_dong(conn, row["id_de_nghi_dong"], ho_so, pham_vi)
            item = dict(row)
            item.pop("id_de_nghi_dong", None)
            items.append(item)
        return {"items": items}
