"""Logic tạo tài khoản quản trị gốc một lần."""

import re
import bcrypt

from backend.config.settings import BCRYPT_ROUNDS
from backend.data.tai_khoan_repo import tao_quan_tri_goc as luu_quan_tri_goc

RE_TAI_KHOAN = re.compile(r"^[A-Za-z0-9._-]{3,60}$")


def tao_quan_tri_goc(ma_tai_khoan: str, ma_nhan_vien: str, mat_khau: str) -> None:
    ma_tai_khoan = ma_tai_khoan.strip()
    ma_nhan_vien = ma_nhan_vien.strip()
    if not RE_TAI_KHOAN.fullmatch(ma_tai_khoan):
        raise ValueError("Tên đăng nhập phải dài 3–60 ký tự và chỉ gồm chữ, số, . _ -")
    if not ma_nhan_vien or len(ma_nhan_vien) > 20:
        raise ValueError("Mã nhân viên không hợp lệ")
    if len(mat_khau) < 8:
        raise ValueError("Mật khẩu phải có ít nhất 8 ký tự")

    mat_khau_hash = bcrypt.hashpw(
        mat_khau.encode("utf-8"), bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
    ).decode("ascii")
    luu_quan_tri_goc(ma_tai_khoan, ma_nhan_vien, mat_khau_hash)
