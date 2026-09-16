class LoiNghiepVu(Exception):
    http = 422
    ma_loi = "VI_PHAM_NGHIEP_VU"

    def __init__(self, thong_bao: str, ma_loi: str | None = None):
        super().__init__(thong_bao)
        if ma_loi:
            self.ma_loi = ma_loi


class ThieuDuLieu(LoiNghiepVu):
    http = 400
    ma_loi = "THIEU_DU_LIEU"


class ChuaDangNhap(LoiNghiepVu):
    http = 401
    ma_loi = "CHUA_DANG_NHAP"


class KhongCoQuyen(LoiNghiepVu):
    http = 403
    ma_loi = "KHONG_CO_QUYEN"


class KhongTimThay(LoiNghiepVu):
    http = 404
    ma_loi = "KHONG_TIM_THAY"


class XungDot(LoiNghiepVu):
    http = 409
    ma_loi = "XUNG_DOT_PHIEN_BAN"
