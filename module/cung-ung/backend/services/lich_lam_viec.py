"""Xử lý lịch làm việc, ngày nghỉ, giờ chốt và tính ngày hiệu lực/SLA."""

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from backend.config.settings import TZ
from backend.data.db import fetch_all, fetch_one

VNTZ = ZoneInfo(TZ)


def now_vn() -> datetime:
    """Trả về thời điểm hiện tại theo múi giờ Việt Nam (Asia/Ho_Chi_Minh)."""
    return datetime.now(VNTZ)


def lay_tham_so(ma: str, mac_dinh: str) -> str:
    row = fetch_one("SELECT gia_tri FROM tham_so_he_thong WHERE ma = %s", (ma,))
    return row["gia_tri"] if row and row.get("gia_tri") is not None else mac_dinh


def lay_gio_chot(ma: str, gio_mac_dinh: str) -> time:
    val = lay_tham_so(ma, gio_mac_dinh)
    parts = val.split(":")
    return time(int(parts[0]), int(parts[1]))


def lay_danh_sach_nghi() -> list[dict]:
    return fetch_all(
        "SELECT ngay_bat_dau, ngay_ket_thuc, ma, loai_nghi, ghi_chu FROM lich_nghi"
    )


def la_ngay_lam_viec(d: date, ma_bo_phan: str = "ALL") -> bool:
    """
    Quy tắc ngày làm việc (§1.2 HD-STD-01 & docs/04, docs/12):
    - Làm Thứ Hai - Thứ Bảy. Nghỉ Chủ Nhật.
    - Ngày làm bù đặc biệt (VD: 19/04/2026 là Chủ Nhật làm bù) -> LÀM VIỆC.
    - Ngày nghỉ lễ/Tết trong bảng LICH_NGHI -> NGHỈ.
    """
    # 1. Kiểm tra làm bù (thắng cả luật Chủ Nhật)
    if d == date(2026, 4, 19):
        return True

    cac_ngay_nghi = lay_danh_sach_nghi()
    for n in cac_ngay_nghi:
        if n["ngay_bat_dau"] <= d <= n["ngay_ket_thuc"]:
            loai = (n.get("loai_nghi") or "").upper()
            ghi_chu = (n.get("ghi_chu") or "").upper()
            if loai == "LAM_BU" or "LAM_BU" in ghi_chu or "LÀM BÙ" in ghi_chu:
                return True

    # 2. Nghỉ Chủ Nhật (weekday() == 6 trong Python: 0=Mon..6=Sun)
    if d.weekday() == 6:
        return False

    # 3. Nằm trong khoảng nghỉ lễ/Tết của công ty hoặc bộ phận
    for n in cac_ngay_nghi:
        if n["ngay_bat_dau"] <= d <= n["ngay_ket_thuc"]:
            ma = n.get("ma") or "ALL"
            loai = (n.get("loai_nghi") or "").upper()
            if loai != "LAM_BU" and (ma == "ALL" or ma == ma_bo_phan):
                return False

    return True


def cong_ngay_lam_viec(d: date, so_ngay: int, ma_bo_phan: str = "ALL") -> date:
    """Cộng so_ngay ngày làm việc, bỏ qua ngày nghỉ."""
    if so_ngay < 0:
        raise ValueError("so_ngay phải >= 0")
    hien_tai = d
    da_cong = 0
    while da_cong < so_ngay:
        hien_tai += timedelta(days=1)
        if la_ngay_lam_viec(hien_tai, ma_bo_phan):
            da_cong += 1
    return hien_tai


def tinh_ngay_hieu_luc(
    thoi_diem: datetime | None,
    loai: str,
    ma_bo_phan: str = "ALL",
) -> tuple[date, bool]:
    """
    Áp dụng quy tắc TG-01 (DNVT chốt 13:30), TG-02 (GCN chốt 15:00):
    - Nếu gửi sau giờ chốt -> ngay_hieu_luc = ngày làm việc kế tiếp, tre_gio_chot = True.
    - Nếu gửi vào ngày nghỉ -> ngay_hieu_luc = ngày làm việc kế tiếp.
    - Còn lại: ngay_hieu_luc = ngày gửi, tre_gio_chot = False.
    """
    if thoi_diem is None:
        thoi_diem = now_vn()
    elif thoi_diem.tzinfo is None:
        thoi_diem = thoi_diem.replace(tzinfo=VNTZ)
    else:
        thoi_diem = thoi_diem.astimezone(VNTZ)

    gio_chot_ma = "GIO_CHOT_GCN" if loai == "GIA_CONG_NGOAI" else "GIO_CHOT_DNVT"
    gio_chot_mac_dinh = "15:00" if loai == "GIA_CONG_NGOAI" else "13:30"
    gio_chot = lay_gio_chot(gio_chot_ma, gio_chot_mac_dinh)

    ngay = thoi_diem.date()
    gio_gui = thoi_diem.time()
    tre = gio_gui > gio_chot

    if tre or not la_ngay_lam_viec(ngay, ma_bo_phan):
        ngay = cong_ngay_lam_viec(ngay, 1, ma_bo_phan)

    return ngay, tre


def tinh_so_ngay_xu_ly(muc_do_uu_tien: int | None, loai: str, ma_loai_gia_cong: str | None = None) -> int:
    """
    docs/12 §2:
    - Mức ưu tiên 1: 3 ngày làm việc
    - Mức ưu tiên 2: 5 ngày làm việc
    - Mức ưu tiên 3: 7 ngày làm việc
    - Mặc định: theo NGAY_TOI_THIEU_HANG_VE (5 ngày)
    - Nếu là GIA_CONG_NGOAI và có ma_loai_gia_cong -> lấy so_ngay_chuan
    """
    if loai == "GIA_CONG_NGOAI" and ma_loai_gia_cong:
        row = fetch_one(
            "SELECT so_ngay_chuan FROM loai_gia_cong WHERE ma = %s",
            (ma_loai_gia_cong,),
        )
        if row and row.get("so_ngay_chuan") is not None:
            return int(row["so_ngay_chuan"])

    if muc_do_uu_tien == 1:
        return 3
    if muc_do_uu_tien == 2:
        return 5
    if muc_do_uu_tien == 3:
        return 7

    val = lay_tham_so("NGAY_TOI_THIEU_HANG_VE", "5")
    try:
        return int(val)
    except ValueError:
        return 5


def kiem_tra_bat_kha_thi(
    ngay_hieu_luc: date,
    ky_han_yc: date,
    muc_do_uu_tien: int | None,
    loai: str,
    ma_loai_gia_cong: str | None = None,
    ma_bo_phan: str = "ALL",
) -> tuple[bool, date, str]:
    """
    Quy tắc DN-10:
    Tính ngày dự kiến về = ngay_hieu_luc + số ngày xử lý (theo ngày làm việc).
    Nếu hàng dự kiến về TRỄ hơn kỳ hạn cần hàng (ky_han_yc < ngay_du_kien_ve)
    thì đánh dấu bat_kha_thi = True.
    """
    so_ngay = tinh_so_ngay_xu_ly(muc_do_uu_tien, loai, ma_loai_gia_cong)
    ngay_du_kien_ve = cong_ngay_lam_viec(ngay_hieu_luc, so_ngay, ma_bo_phan)
    bat_kha_thi = ky_han_yc < ngay_du_kien_ve

    if bat_kha_thi:
        thong_diep = (
            f"Hàng dự kiến về {ngay_du_kien_ve.strftime('%d/%m/%Y')}, "
            f"TRỄ so với kỳ hạn cần {ky_han_yc.strftime('%d/%m/%Y')}."
        )
    else:
        thong_diep = ""

    return bat_kha_thi, ngay_du_kien_ve, thong_diep
