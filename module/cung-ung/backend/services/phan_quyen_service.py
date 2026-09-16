"""Kiểm quyền tập trung và quản trị tài khoản."""

from backend.data import auth_repo
from backend.services.errors import KhongCoQuyen, KhongTimThay, XungDot


def kiem_quyen(ho_so: dict, trang: str, hanh_dong: str, conn=None) -> str:
    cot = {"xem": "duoc_xem", "sua": "duoc_sua", "duyet": "duoc_duyet", "xuat": "duoc_xuat"}
    if hanh_dong not in cot:
        raise ValueError("Hành động quyền không hợp lệ")
    quyen = next((q for q in auth_repo.lay_quyen(ho_so["vai_tro"], conn) if q["trang"] == trang), None)
    if not quyen or not quyen[cot[hanh_dong]]:
        raise KhongCoQuyen(f"Bạn không có quyền {hanh_dong} ở màn hình này.")
    return quyen["pham_vi"]


def danh_sach_tai_khoan(trang: int, kich_thuoc: int) -> dict:
    kich_thuoc = min(max(kich_thuoc, 1), 100)
    trang = max(trang, 1)
    rows, total = auth_repo.danh_sach_tai_khoan((trang - 1) * kich_thuoc, kich_thuoc)
    return {"items": [dict(r) for r in rows], "tong": total, "trang": trang, "kich_thuoc": kich_thuoc}


def duyet_tai_khoan(ma: str, vai_tro: str, phien_ban: int, nguoi_duyet: str) -> None:
    if not auth_repo.vai_tro_ton_tai(vai_tro):
        raise KhongTimThay("Vai trò không tồn tại.", "KHONG_TIM_THAY_VAI_TRO")
    if not auth_repo.cap_nhat_tai_khoan(ma, phien_ban, nguoi_duyet, vai_tro=vai_tro):
        _bao_loi_cap_nhat(ma)


def khoa_tai_khoan(ma: str, phien_ban: int, nguoi_khoa: str, tai_khoan_hien_tai: str) -> None:
    if ma.lower() == tai_khoan_hien_tai.lower():
        raise KhongCoQuyen("Không thể tự khóa tài khoản đang đăng nhập.", "KHONG_THE_TU_KHOA")
    if not auth_repo.cap_nhat_tai_khoan(ma, phien_ban, nguoi_khoa, khoa=True):
        _bao_loi_cap_nhat(ma)


def _bao_loi_cap_nhat(ma: str):
    if not auth_repo.lay_tai_khoan(ma):
        raise KhongTimThay("Không tìm thấy tài khoản.")
    raise XungDot("Tài khoản vừa được cập nhật. Hãy tải lại rồi thực hiện lại.")
