"""Kiểm quyền tập trung và quản trị tài khoản."""

from backend.data import auth_repo
from backend.services.errors import KhongCoQuyen, KhongTimThay, ThieuDuLieu, XungDot


def kiem_quyen(ho_so: dict, trang: str, hanh_dong: str, conn=None) -> str:
    cot = {"xem": "duoc_xem", "sua": "duoc_sua", "duyet": "duoc_duyet", "xuat": "duoc_xuat"}
    if hanh_dong not in cot:
        raise ValueError("Hành động quyền không hợp lệ")
    if str(ho_so.get("vai_tro", "")).strip().lower() == "admin":
        return "toan_bo"
    quyen = next((q for q in auth_repo.lay_quyen(ho_so["vai_tro"], conn) if q["trang"] == trang), None)
    if not quyen or not quyen[cot[hanh_dong]]:
        raise KhongCoQuyen(f"Bạn không có quyền {hanh_dong} ở màn hình này.")
    return quyen["pham_vi"]


def danh_sach_tai_khoan(trang: int, kich_thuoc: int, tu_khoa: str = "", trang_thai: str = "") -> dict:
    kich_thuoc = min(max(kich_thuoc, 1), 100)
    trang = max(trang, 1)
    trang_thai = str(trang_thai or "").strip().upper()
    if trang_thai not in ("", "CHO_DUYET", "HOAT_DONG", "KHOA"):
        raise ThieuDuLieu("Trạng thái tài khoản không hợp lệ")
    rows, total = auth_repo.danh_sach_tai_khoan(
        (trang - 1) * kich_thuoc, kich_thuoc, str(tu_khoa or "").strip(), trang_thai
    )
    return {"items": [dict(r) for r in rows], "tong": total, "trang": trang, "kich_thuoc": kich_thuoc}


def danh_sach_vai_tro_va_quyen() -> dict:
    vai_tro_rows, quyen_rows = auth_repo.danh_sach_vai_tro_va_quyen()
    quyen_theo_vai_tro = {}
    for row in quyen_rows:
        quyen_theo_vai_tro.setdefault(row["vai_tro"], []).append(dict(row))
    return {
        "items": [
            {**dict(row), "quyen": quyen_theo_vai_tro.get(row["ma"], [])}
            for row in vai_tro_rows
        ]
    }


def cap_nhat_quyen(vai_tro: str, trang: str, phien_ban: int, du_lieu: dict, nguoi_sua: str) -> dict:
    if du_lieu["pham_vi"] not in ("toan_bo", "bo_phan", "ca_nhan"):
        raise ThieuDuLieu("Phạm vi quyền không hợp lệ")
    if any(du_lieu[key] for key in ("duoc_sua", "duoc_duyet", "duoc_xuat")):
        du_lieu["duoc_xem"] = True
    if vai_tro == "ADMIN" and trang == "quan_tri" and not (
        du_lieu["duoc_xem"] and du_lieu["duoc_sua"]
    ):
        raise KhongCoQuyen("Không thể tắt quyền quản trị cốt lõi của vai trò ADMIN.", "KHONG_THE_TAT_QUYEN_ADMIN")
    row = auth_repo.cap_nhat_quyen(vai_tro, trang, phien_ban, du_lieu, nguoi_sua)
    if not row:
        raise XungDot("Quyền vừa được cập nhật. Hãy tải lại rồi thực hiện lại.")
    return dict(row)


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
