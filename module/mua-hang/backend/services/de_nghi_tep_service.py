"""Đọc tệp F01 sau khi kiểm tra quyền, không lộ đường dẫn máy chủ."""

from pathlib import Path

from backend.config.settings import UPLOAD_DIR
from backend.data import de_nghi_repo
from backend.data.db import get_conn
from backend.services.errors import KhongCoQuyen, KhongTimThay
from backend.services.phan_quyen_service import kiem_quyen


def tai_tep(id_dn: str, id_tep: str, ho_so: dict):
    with get_conn() as conn:
        dn = de_nghi_repo.lay_de_nghi(conn, id_dn)
        if not dn:
            raise KhongTimThay("Không tìm thấy đề nghị.")
        pham_vi = kiem_quyen(ho_so, "de_nghi", "xem", conn)
        if pham_vi == "ca_nhan":
            cot_so_huu = "nguoi_mua_hang" if ho_so.get("vai_tro") == "NV_MUA_HANG" else "nguoi_yeu_cau"
            if dn.get(cot_so_huu) != ho_so["ma_nhan_vien"]:
                raise KhongCoQuyen("Bạn không có quyền xem tệp này.")
        if pham_vi == "bo_phan" and dn["ma_bo_phan"] != ho_so["ma_bo_phan"]:
            raise KhongCoQuyen("Bạn không có quyền xem tệp này.")
        tep = de_nghi_repo.lay_mot_tep(conn, id_dn, id_tep)
    if not tep:
        raise KhongTimThay("Không tìm thấy tệp đính kèm.")
    path = Path(tep["duong_dan"]).resolve()
    root = Path(UPLOAD_DIR).resolve()
    if not path.is_relative_to(root):
        raise KhongCoQuyen("Đường dẫn tệp không hợp lệ.", "DUONG_DAN_TEP_KHONG_HOP_LE")
    if not path.is_file():
        raise KhongTimThay("Tệp vật lý không còn tồn tại.", "TEP_KHONG_TON_TAI")
    return path.read_bytes(), tep["ten_tep"], tep.get("loai_mime") or "application/octet-stream"
