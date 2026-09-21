"""Tra cứu nhanh LSX khi quét mã trên màn hình F01."""

from backend.data import de_nghi_repo
from backend.data.db import get_conn
from backend.services.errors import KhongTimThay
from backend.services.phan_quyen_service import kiem_quyen
from backend.services.lich_lam_viec import cong_ngay_lam_viec, now_vn


def quet_lsx(ma: str, ho_so: dict) -> dict:
    kiem_quyen(ho_so, "de_nghi", "xem")
    with get_conn() as conn:
        row = de_nghi_repo.lay_lenh_san_xuat(conn, ma.strip())
    if not row:
        raise KhongTimThay("Không tìm thấy lệnh sản xuất.", "KHONG_TIM_THAY_LSX")
    return dict(row)


def mac_dinh_tao(ho_so: dict) -> dict:
    kiem_quyen(ho_so, "de_nghi", "sua")
    ky_han = cong_ngay_lam_viec(now_vn().date(), 5, ho_so["ma_bo_phan"])
    return {"ky_han_yc": ky_han.isoformat()}
