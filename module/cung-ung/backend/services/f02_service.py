"""Nghiep vu xac nhan ky thuat, doi vat lieu, huy dong va cap ma (F02)."""

from backend.data.db import get_conn
from backend.data import f02_repo as repo
from backend.data import catalog_repo
from backend.services.errors import KhongCoQuyen, KhongTimThay, LoiNghiepVu, ThieuDuLieu, XungDot
from backend.services.phan_quyen_service import kiem_quyen
from backend.services.sinh_ma import sinh_ma
from backend.services.lich_lam_viec import now_vn


def _yeu_cau(ho_so, hanh_dong="xem"):
    return kiem_quyen(ho_so, "xac_nhan_kt", hanh_dong)


def _check_dong(ho_so, dong, hanh_dong="xem"):
    pham_vi = _yeu_cau(ho_so, hanh_dong)
    if pham_vi == "ca_nhan" and dong["nguoi_yeu_cau"] != ho_so["ma_nhan_vien"]:
        raise KhongCoQuyen("Ban khong co quyen voi dong nay.")
    if pham_vi == "bo_phan" and dong["ma_bo_phan"] != ho_so["ma_bo_phan"]:
        raise KhongCoQuyen("Ban khong co quyen voi bo phan nay.")


def hang_doi_ky_thuat(ho_so, trang_thai=None):
    _yeu_cau(ho_so, "xem")
    with get_conn() as conn:
        return {"items": [dict(r) for r in repo.danh_sach_ky_thuat(conn, trang_thai)]}


def yeu_cau_xac_nhan_kt(id_dong, noi_dung, ho_so):
    if not noi_dung or not noi_dung.strip():
        raise ThieuDuLieu("Noi dung xac nhan ky thuat bat buoc.", "THIEU_NOI_DUNG")
    kiem_quyen(ho_so, "de_nghi", "sua")
    with get_conn() as conn:
        dong = repo.lay_dong(conn, id_dong, True)
        if not dong: raise KhongTimThay("Khong tim thay dong de nghi.")
        _check_dong(ho_so, dong, "sua")
        cap_nhat = repo.cap_nhat_dong(conn, id_dong, dong["phien_ban"], {"can_xac_nhan_kt": True, "trang_thai_dong": "CHO_XAC_NHAN_KT"})
        if not cap_nhat: raise XungDot("Dong vua duoc cap nhat.")
        return dict(cap_nhat)


def xac_nhan_kt(id_dong, ket_qua, ghi_chu, ho_so):
    if ket_qua not in ("DAT", "CAN_DOI_VAT_LIEU", "KHONG_DAT"):
        raise LoiNghiepVu("Ket qua ky thuat khong hop le.", "KET_QUA_KT_KHONG_HOP_LE")
    _yeu_cau(ho_so, "duyet")
    with get_conn() as conn:
        dong = repo.lay_dong(conn, id_dong, True)
        if not dong: raise KhongTimThay("Khong tim thay dong de nghi.")
        if dong["trang_thai_dong"] != "CHO_XAC_NHAN_KT":
            raise LoiNghiepVu("Dong khong o hang doi ky thuat.", "SAI_TRANG_THAI")
        moi = "NHAP" if ket_qua == "DAT" else ("CHO_XAC_NHAN_KT" if ket_qua == "CAN_DOI_VAT_LIEU" else "HUY")
        cap_nhat = repo.cap_nhat_dong(conn, id_dong, dong["phien_ban"], {"trang_thai_dong": moi, "can_xac_nhan_kt": False, "ghi_chu": ghi_chu or dong.get("ghi_chu")})
        if not cap_nhat: raise XungDot("Dong vua duoc cap nhat.")
        return dict(cap_nhat)


def tao_doi_vat_lieu(id_dong, id_vt_sang, ten_sang, ly_do, ho_so):
    if not ly_do or not ly_do.strip(): raise ThieuDuLieu("Ly do doi vat lieu bat buoc.", "THIEU_LY_DO")
    kiem_quyen(ho_so, "de_nghi", "sua")
    with get_conn() as conn:
        dong = repo.lay_dong(conn, id_dong, True)
        if not dong: raise KhongTimThay("Khong tim thay dong de nghi.")
        _check_dong(ho_so, dong, "sua")
        if dong["trang_thai_dong"] in ("HOAN_THANH", "HUY"): raise LoiNghiepVu("Dong da ket thuc.", "DONG_DA_KET_THUC")
        vt = catalog_repo.lay_vat_tu(id_vt_sang) if id_vt_sang else None
        if id_vt_sang and not vt: raise KhongTimThay("Khong tim thay vat tu dich.")
        ten = (vt or {}).get("ten_hang") if vt else ten_sang
        if not ten: raise ThieuDuLieu("Can id_vt_sang hoac ten_sang.", "THIEU_VAT_LIEU_DICH")
        data = {"id": sinh_ma(conn, "DVL"), "id_de_nghi_dong": id_dong, "id_vt_tu": dong.get("id_vt_duyet_mua"), "id_vt_sang": id_vt_sang, "ten_tu": dong["ten_hang_chup"], "ten_sang": ten, "noi_dung_yeu_cau": f"{dong['ten_hang_chup']} -> {ten}", "ly_do": ly_do, "nguoi_yeu_cau": ho_so["ma_nhan_vien"], "nguoi_tao": ho_so["ma_nhan_vien"]}
        result = repo.tao_doi_vat_lieu(conn, data)
        repo.cap_nhat_dong(conn, id_dong, dong["phien_ban"], {"trang_thai_dong": "CHO_XAC_NHAN_KT", "can_xac_nhan_kt": True})
        return dict(result)


def duyet_doi_vat_lieu(id_dvl, dong_y, ghi_chu, phien_ban, ho_so):
    _yeu_cau(ho_so, "duyet")
    with get_conn() as conn:
        dvl = repo.lay_doi_vat_lieu(conn, id_dvl, True)
        if not dvl: raise KhongTimThay("Khong tim thay yeu cau doi vat lieu.")
        if dvl["phien_ban"] != phien_ban: raise XungDot("Yeu cau vua duoc cap nhat.")
        dong = repo.lay_dong(conn, dvl["id_de_nghi_dong"], True)
        if not dong: raise KhongTimThay("Khong tim thay dong.")
        if dong_y:
            vt = catalog_repo.lay_vat_tu(dvl["id_vt_sang"]) if dvl.get("id_vt_sang") else None
            values = {"id_vt_duyet_mua": dvl.get("id_vt_sang"), "ten_hang_chup": dvl["ten_sang"], "dvt_chup": vt["dvt"] if vt else dong["dvt_chup"], "trang_thai_dong": "NHAP", "can_xac_nhan_kt": False}
            repo.cap_nhat_dong(conn, dong["id"], dong["phien_ban"], values)
        result = repo.cap_nhat_doi_vat_lieu(conn, id_dvl, phien_ban, {"trang_thai": "DONG_Y" if dong_y else "TU_CHOI", "nguoi_duyet": ho_so["ma_nhan_vien"], "thoi_diem_duyet": now_vn(), "ly_do": ghi_chu or dvl.get("ly_do")})
        return dict(result)


def tao_yeu_cau_huy(id_dong, ly_do, ho_so):
    if not ly_do or not ly_do.strip(): raise ThieuDuLieu("Ly do huy bat buoc.", "THIEU_LY_DO")
    with get_conn() as conn:
        dong = repo.lay_dong(conn, id_dong, True)
        if not dong: raise KhongTimThay("Khong tim thay dong.")
        _check_dong(ho_so, dong, "sua")
        result = repo.tao_yeu_cau_huy(conn, {"id": sinh_ma(conn, "YCH"), "id_de_nghi_dong": id_dong, "ly_do": ly_do, "nguoi_yeu_cau": ho_so["ma_nhan_vien"], "nguoi_tao": ho_so["ma_nhan_vien"]})
        return dict(result)


def duyet_yeu_cau_huy(id_yc, dong_y, ly_do, phien_ban, ho_so):
    kiem_quyen(ho_so, "xac_nhan_kt", "duyet")
    with get_conn() as conn:
        yc = repo.lay_yeu_cau_huy(conn, id_yc, True)
        if not yc: raise KhongTimThay("Khong tim thay yeu cau huy.")
        if yc["phien_ban"] != phien_ban: raise XungDot("Yeu cau vua duoc cap nhat.")
        if dong_y:
            dong = repo.lay_dong(conn, yc["id_de_nghi_dong"], True)
            repo.cap_nhat_dong(conn, dong["id"], dong["phien_ban"], {"trang_thai_dong": "HUY"})
        result = conn.execute("UPDATE yeu_cau_huy SET trang_thai=%s,nguoi_duyet=%s,thoi_diem_duyet=now(),ngay_sua=now(),phien_ban=phien_ban+1 WHERE id=%s AND phien_ban=%s RETURNING *", ("DONG_Y" if dong_y else "TU_CHOI", ho_so["ma_nhan_vien"], id_yc, phien_ban)).fetchone()
        return dict(result)


def hang_doi_cap_ma(ho_so):
    kiem_quyen(ho_so, "danh_muc", "xem")
    with get_conn() as conn: return {"items": [dict(r) for r in repo.danh_sach_cap_ma(conn)]}


def lich_su_doi(id_dong, ho_so):
    with get_conn() as conn:
        dong = repo.lay_dong(conn, id_dong)
        if not dong: raise KhongTimThay("Khong tim thay dong.")
        _check_dong(ho_so, dong)
        return {"items": [dict(r) for r in repo.lay_lich_su_doi(conn, id_dong)]}
