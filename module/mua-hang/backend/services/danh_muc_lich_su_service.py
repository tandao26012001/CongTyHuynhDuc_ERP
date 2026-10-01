from backend.data import danh_muc_lich_su_repo
from backend.services.errors import KhongTimThay, ThieuDuLieu


MA_DANH_MUC = {
    "vat-tu": "VAT_TU",
    "don-vi-tinh": "DON_VI_TINH",
    "chung-loai": "CHUNG_LOAI",
    "bo-phan": "BO_PHAN",
    "nhan-vien": "NHAN_VIEN",
    "nha-cung-cap": "NHA_CUNG_CAP",
    "tham-so-he-thong": "THAM_SO_HE_THONG",
    "khach-hang": "KHACH_HANG",
    "muc-dich-su-dung": "MUC_DICH_SU_DUNG",
    "loai-gia-cong": "LOAI_GIA_CONG",
    "cong-doan": "CONG_DOAN",
    "lenh-san-xuat": "LENH_SAN_XUAT",
    "xe": "XE",
    "tai-xe": "TAI_XE",
    "lich-nghi": "LICH_NGHI",
    "vat-lieu-tinh-toan": "VAT_LIEU_TINH_TOAN",
    "mau-son": "MAU_SON_KHACH_HANG",
    "mau-son-khach-hang": "MAU_SON_KHACH_HANG",
    "anh-xa-tien-to": "ANH_XA_TIEN_TO",
    "tieu-chi-cham-bao-gia": "TIEU_CHI_CHAM_BAO_GIA",
    "ly-do-thanh-toan": "LY_DO_THANH_TOAN",
    "hinh-thuc-thanh-toan": "HINH_THUC_THANH_TOAN",
    "ly-do-yeu-cau": "LY_DO_YEU_CAU",
    "kho": "KHO",
    "ton-kho": "TON_KHO",
    "lsx-dong": "LENH_SAN_XUAT_DONG",
}


def danh_sach(ma: str, id_ban_ghi: str, trang: int = 1, kich_thuoc: int = 25) -> dict:
    if ma not in MA_DANH_MUC:
        raise KhongTimThay("Danh mục chưa hỗ trợ tra cứu lịch sử.", "DANH_MUC_CHUA_HO_TRO_LICH_SU")
    if not id_ban_ghi.strip():
        raise ThieuDuLieu("Mã bản ghi không được để trống.")
    trang = max(1, trang)
    kich_thuoc = min(max(kich_thuoc, 1), 100)
    rows, total = danh_muc_lich_su_repo.danh_sach(
        MA_DANH_MUC[ma], id_ban_ghi.strip(), (trang - 1) * kich_thuoc, kich_thuoc,
    )
    return {
        "items": [dict(row) for row in rows],
        "tong": total,
        "trang": trang,
        "kich_thuoc": kich_thuoc,
    }
