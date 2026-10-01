"""Chuyển loại tài khoản v3 sang vai trò v2 khi các luồng cũ còn hoạt động."""

from backend.services.errors import ThieuDuLieu


LOAI_TAI_KHOAN = frozenset({
    "QUAN_TRI_HE_THONG", "BAN_LANH_DAO", "TRUONG_BO_PHAN",
    "NHAN_VIEN", "KY_THUAT", "KE_TOAN", "CHI_XEM",
})


def vai_tro_tuong_thich(ma_loai_tk: str, ma_bo_phan: str) -> str:
    """Giữ chốt nghiệp vụ v2 theo bộ phận trong lúc chuyển ma trận v3."""
    if ma_loai_tk not in LOAI_TAI_KHOAN:
        raise ThieuDuLieu("Loại tài khoản không hợp lệ.")
    if ma_loai_tk == "QUAN_TRI_HE_THONG":
        return "ADMIN"
    if ma_loai_tk in {"BAN_LANH_DAO", "KY_THUAT", "KE_TOAN", "CHI_XEM"}:
        return ma_loai_tk
    bo_phan = ma_bo_phan.strip().upper()
    if bo_phan in {"MH", "MUA HÀNG &"}:
        nhom = "MUA_HANG"
    elif bo_phan in {"KV", "QC", "KD"}:
        nhom = {"KV": "KHO_VAN", "QC": "QC", "KD": "KINH_DOANH"}[bo_phan]
    else:
        nhom = "YEU_CAU"
    if ma_loai_tk == "TRUONG_BO_PHAN":
        # TBP_QC chua co dong nao trong phan_quyen v2.
        return "TBP_YEU_CAU" if nhom == "QC" else "TBP_" + nhom
    return "QC" if nhom == "QC" else "NV_" + nhom
