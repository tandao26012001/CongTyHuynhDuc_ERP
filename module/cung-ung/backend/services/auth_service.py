"""Xác thực và vòng đời phiên; không phụ thuộc HTTP."""

import re
import secrets

import bcrypt

from backend.config.settings import BCRYPT_ROUNDS
from backend.data import auth_repo
from backend.services.errors import ChuaDangNhap, LoiNghiepVu, ThieuDuLieu, XungDot

RE_TAI_KHOAN = re.compile(r"^[A-Za-z0-9._-]{3,60}$")


def _kiem_tra_dau_vao(ma_tai_khoan: str, mat_khau: str) -> tuple[str, str]:
    ma = ma_tai_khoan.strip()
    if not RE_TAI_KHOAN.fullmatch(ma):
        raise ThieuDuLieu("Tên đăng nhập phải dài 3–60 ký tự và chỉ gồm chữ, số, . _ -")
    if len(mat_khau) < 8:
        raise ThieuDuLieu("Mật khẩu phải có ít nhất 8 ký tự")
    return ma, mat_khau


def _bam(mat_khau: str) -> str:
    return bcrypt.hashpw(
        mat_khau.encode("utf-8"), bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
    ).decode("ascii")


def dang_ky(ma_tai_khoan: str, ma_nhan_vien: str, mat_khau: str) -> dict:
    ma, mat_khau = _kiem_tra_dau_vao(ma_tai_khoan, mat_khau)
    ma_nv = ma_nhan_vien.strip()
    if not ma_nv or len(ma_nv) > 20:
        raise ThieuDuLieu("Mã nhân viên không hợp lệ")
    ma_kq, row = auth_repo.dang_ky(ma, ma_nv, _bam(mat_khau))
    if ma_kq == "KHONG_CO_NHAN_VIEN":
        raise LoiNghiepVu("Mã nhân viên không có trong danh sách. Hãy liên hệ Nhân sự.", ma_kq)
    if ma_kq == "NHAN_VIEN_KHONG_HOAT_DONG":
        raise LoiNghiepVu("Nhân viên không ở trạng thái hoạt động.", ma_kq)
    if ma_kq == "DA_TON_TAI":
        raise XungDot("Tên đăng nhập hoặc mã nhân viên đã có tài khoản.", "TAI_KHOAN_DA_TON_TAI")
    return dict(row)


def dang_nhap(ma_tai_khoan: str, mat_khau: str, ip=None, thiet_bi=None) -> dict:
    ma = ma_tai_khoan.strip()
    row = auth_repo.lay_tai_khoan(ma)
    # Cùng một lỗi để không tiết lộ tài khoản nào tồn tại.
    if not row or not bcrypt.checkpw(mat_khau.encode("utf-8"), row["mat_khau_hash"].encode("ascii")):
        raise ChuaDangNhap("Tên đăng nhập hoặc mật khẩu không đúng.", "SAI_DANG_NHAP")
    if row["trang_thai"] == "CHO_DUYET":
        raise ChuaDangNhap("Tài khoản đang chờ Quản trị duyệt.", "TAI_KHOAN_CHO_DUYET")
    if row["trang_thai"] != "HOAT_DONG":
        raise ChuaDangNhap("Tài khoản đã bị khóa. Hãy liên hệ Quản trị.", "TAI_KHOAN_BI_KHOA")
    token = secrets.token_hex(32)
    auth_repo.tao_phien(row["ma_tai_khoan"], token, ip, thiet_bi)
    return {"token": token, "ho_so": _ho_so_cong_khai(row)}


def _ho_so_cong_khai(row) -> dict:
    return {k: row[k] for k in (
        "ma_tai_khoan", "ma_nhan_vien", "ho_va_ten", "ma_bo_phan",
        "vai_tro", "trang_thai", "phien_ban"
    ) if k in row}


def lay_ho_so(token: str) -> dict:
    if not token:
        raise ChuaDangNhap("Bạn chưa đăng nhập.")
    row = auth_repo.lay_ho_so_tu_token(token)
    if not row:
        raise ChuaDangNhap("Phiên đã hết. Hãy đăng nhập lại.", "HET_PHIEN")
    return dict(row)


def ho_so_va_quyen(token: str) -> dict:
    ho_so = lay_ho_so(token)
    quyen = {}
    for q in auth_repo.lay_quyen(ho_so["vai_tro"]):
        quyen[q["trang"]] = {
            "xem": q["duoc_xem"], "sua": q["duoc_sua"],
            "duyet": q["duoc_duyet"], "xuat": q["duoc_xuat"],
            "pham_vi": q["pham_vi"],
        }
    data = _ho_so_cong_khai(ho_so)
    data["quyen"] = quyen
    return data


def dang_xuat(token: str) -> None:
    auth_repo.xoa_phien(token)


def doi_mat_khau(token: str, mat_khau_cu: str, mat_khau_moi: str) -> None:
    ho_so = lay_ho_so(token)
    if len(mat_khau_moi) < 8:
        raise ThieuDuLieu("Mật khẩu mới phải có ít nhất 8 ký tự")
    row = auth_repo.lay_tai_khoan(ho_so["ma_tai_khoan"])
    if not bcrypt.checkpw(mat_khau_cu.encode("utf-8"), row["mat_khau_hash"].encode("ascii")):
        raise ChuaDangNhap("Mật khẩu hiện tại không đúng.", "SAI_MAT_KHAU_CU")
    auth_repo.doi_mat_khau(ho_so["ma_tai_khoan"], _bam(mat_khau_moi))
