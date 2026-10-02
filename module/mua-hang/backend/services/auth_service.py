"""Xác thực và vòng đời phiên; không phụ thuộc HTTP."""

import secrets
import hashlib
import hmac

import bcrypt

from backend.config.settings import BCRYPT_ROUNDS, PBKDF2_LEGACY_ROUNDS
from backend.data import auth_repo
from backend.services.errors import ChuaDangNhap, KhongCoQuyen, LoiNghiepVu, ThieuDuLieu, XungDot

def _bam(mat_khau: str) -> str:
    return bcrypt.hashpw(
        mat_khau.encode("utf-8"), bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
    ).decode("ascii")


def _kiem_mat_khau(mat_khau: str, gia_tri_bam: str) -> bool:
    if gia_tri_bam.startswith(("$2a$", "$2b$", "$2y$")):
        return bcrypt.checkpw(mat_khau.encode("utf-8"), gia_tri_bam.encode("ascii"))
    parts = gia_tri_bam.split("$")
    if len(parts) == 3 and parts[0] == "pbkdf2_sha256":
        _, salt, expected = parts
        actual = hashlib.pbkdf2_hmac(
            "sha256", mat_khau.encode("utf-8"), salt.encode("utf-8"),
            PBKDF2_LEGACY_ROUNDS,
        ).hex()
        return hmac.compare_digest(actual, expected)
    return False


def tim_nhan_vien_dang_ky(ho_va_ten: str) -> dict:
    ten = " ".join(ho_va_ten.split())
    if len(ten) < 3 or len(ten) > 120:
        raise ThieuDuLieu("Họ và tên phải có từ 3 đến 120 ký tự.")
    ma_kq, row = auth_repo.tim_nhan_vien_dang_ky(ten)
    if ma_kq == "KHONG_HO_TRO":
        raise LoiNghiepVu("Hệ thống hiện chưa mở đăng ký trực tuyến. Hãy liên hệ Quản trị.", ma_kq)
    if ma_kq == "KHONG_TIM_THAY":
        raise LoiNghiepVu("Không tìm thấy nhân viên đang hoạt động có họ tên khớp chính xác.", ma_kq)
    if ma_kq == "TRUNG_HO_TEN":
        raise XungDot("Có nhiều nhân viên trùng họ tên. Hãy liên hệ Quản trị để đăng ký.", ma_kq)
    if ma_kq == "THIEU_BO_PHAN":
        raise LoiNghiepVu("Hồ sơ nhân viên chưa có mã bộ phận. Hãy liên hệ Nhân sự.", ma_kq)
    if ma_kq == "DA_CO_TAI_KHOAN":
        raise XungDot("Nhân viên này đã có tài khoản hoặc đang chờ duyệt.", "TAI_KHOAN_DA_TON_TAI")
    return {"ma_nhan_vien": row["ma_nhan_vien"], "ho_va_ten": row["ho_va_ten"]}


def dang_ky(ho_va_ten: str, mat_khau: str) -> dict:
    ten = " ".join(ho_va_ten.split())
    if len(ten) < 3 or len(ten) > 120:
        raise ThieuDuLieu("Họ và tên phải có từ 3 đến 120 ký tự.")
    if len(mat_khau) < 8 or len(mat_khau) > 128:
        raise ThieuDuLieu("Mật khẩu phải có từ 8 đến 128 ký tự.")
    ma_kq, row = auth_repo.dang_ky(ten, _bam(mat_khau))
    if ma_kq == "KHONG_HO_TRO":
        raise LoiNghiepVu("Hệ thống hiện chưa mở đăng ký trực tuyến. Hãy liên hệ Quản trị.", ma_kq)
    if ma_kq == "KHONG_TIM_THAY":
        raise LoiNghiepVu("Không tìm thấy nhân viên đang hoạt động có họ tên khớp chính xác.", ma_kq)
    if ma_kq == "TRUNG_HO_TEN":
        raise XungDot("Có nhiều nhân viên trùng họ tên. Hãy liên hệ Quản trị để đăng ký.", ma_kq)
    if ma_kq == "THIEU_BO_PHAN":
        raise LoiNghiepVu("Hồ sơ nhân viên chưa có mã bộ phận. Hãy liên hệ Nhân sự.", ma_kq)
    if ma_kq == "DA_TON_TAI":
        raise XungDot("Nhân viên này đã có tài khoản hoặc đang chờ duyệt.", "TAI_KHOAN_DA_TON_TAI")
    return dict(row)


def dang_nhap(ma_tai_khoan: str, mat_khau: str, ip=None, thiet_bi=None) -> dict:
    ma = ma_tai_khoan.strip()
    row = auth_repo.lay_tai_khoan(ma)
    # Cùng một lỗi để không tiết lộ tài khoản nào tồn tại.
    if not row or not _kiem_mat_khau(mat_khau, row["mat_khau_hash"]):
        raise ChuaDangNhap("Tên đăng nhập hoặc mật khẩu không đúng.", "SAI_DANG_NHAP")
    if row["trang_thai"] == "CHO_DUYET":
        raise ChuaDangNhap("Tài khoản đang chờ Quản trị duyệt.", "TAI_KHOAN_CHO_DUYET")
    if row["trang_thai"] != "HOAT_DONG":
        raise ChuaDangNhap("Tài khoản đã bị khóa. Hãy liên hệ Quản trị.", "TAI_KHOAN_BI_KHOA")
    quyen = auth_repo.lay_quyen(row["vai_tro"])
    if str(row["vai_tro"] or "").strip().upper() != "ADMIN" and not any(q["duoc_xem"] for q in quyen):
        raise KhongCoQuyen("Tài khoản chưa được cấp quyền truy cập phân hệ Mua hàng & Gia công ngoài.", "KHONG_CO_QUYEN_PHAN_HE")
    if row["mat_khau_hash"].startswith("pbkdf2_sha256$"):
        auth_repo.cap_nhat_hash_dang_nhap(row["ma_tai_khoan"], _bam(mat_khau))
    token = secrets.token_hex(32)
    auth_repo.tao_phien(row["ma_tai_khoan"], token, ip, thiet_bi)
    return {"token": token, "ho_so": _ho_so_cong_khai(row)}


def _ho_so_cong_khai(row) -> dict:
    return {k: row[k] for k in (
        "ma_tai_khoan", "ma_nhan_vien", "ho_va_ten", "ma_bo_phan",
        "vai_tro", "ma_loai_tk", "trang_thai", "phien_ban"
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
    if not _kiem_mat_khau(mat_khau_cu, row["mat_khau_hash"]):
        raise ChuaDangNhap("Mật khẩu hiện tại không đúng.", "SAI_MAT_KHAU_CU")
    auth_repo.doi_mat_khau(ho_so["ma_tai_khoan"], _bam(mat_khau_moi))
