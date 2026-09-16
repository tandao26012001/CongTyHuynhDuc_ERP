"""Nghiệp vụ danh mục, cảnh báo trùng và nhập hàng loạt."""

import hashlib
import json
import re
import unicodedata
from datetime import date
from decimal import Decimal, InvalidOperation

from psycopg.errors import CheckViolation, ForeignKeyViolation, UniqueViolation

from backend.data import catalog_repo
from backend.services.errors import KhongTimThay, LoiNghiepVu, ThieuDuLieu, XungDot

DANH_MUC = {
    "don-vi-tinh": "Đơn vị tính",
    "chung-loai": "Chủng loại",
    "bo-phan": "Bộ phận",
    "nhan-vien": "Nhân viên",
    "nha-cung-cap": "Nhà cung cấp",
}
DANH_MUC_CO_THE_GHI = {"don-vi-tinh", "chung-loai", "bo-phan", "nhan-vien"}
LOAI_NHAP_LO = DANH_MUC_CO_THE_GHI | {"vat-tu", "nha-cung-cap"}

RE_MA_VAT_TU = re.compile(
    r"^(TH-(TP|VP|CT|HC|BH|SX|TDH|NK|VI|LD|TA|BL|LGT|LGC|LGA|LGD)-[0-9]{3}"
    r"|VT-(NC|LC|TN|TL|PT|PL)-[A-Z0-9]{2,10}(-(ON|VU|CU|CV|HO))?-[0-9]{3}"
    r"|VT-SX-[0-9]{3,}|TL-(MK|MP|MR|DT|MC)-[A-Z0-9]{2,4}-[0-9]{3})$"
)
RE_MST = re.compile(r"^[0-9]{10}([0-9]{3})?$")
PHAN_LOAI_VT = {"THONG_DUNG_SX", "THONG_DUNG_BTBD", "CHUYEN_DUNG"}
TRANG_THAI_VT = {"HOAT_DONG", "NGUNG"}
TRANG_THAI_NCC = {"HOAT_DONG", "CANH_BAO", "TAM_NGUNG", "LOAI_BO"}


def _khong_dau(value: str) -> str:
    text = unicodedata.normalize("NFD", value.strip().lower().replace("đ", "d"))
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", text)


def _chuoi(value, ten: str, toi_da: int, bat_buoc: bool = True) -> str | None:
    if value is None:
        if bat_buoc:
            raise ThieuDuLieu(f"{ten} là bắt buộc.")
        return None
    result = re.sub(r"\s+", " ", str(value).strip())
    if not result:
        if bat_buoc:
            raise ThieuDuLieu(f"{ten} là bắt buộc.")
        return None
    if len(result) > toi_da:
        raise ThieuDuLieu(f"{ten} dài quá {toi_da} ký tự.", "SAI_DO_DAI")
    return result


def _ma(value, ten: str, toi_da: int) -> str:
    result = _chuoi(value, ten, toi_da).upper()
    if not re.fullmatch(r"[A-Z0-9][A-Z0-9._-]*", result):
        raise ThieuDuLieu(f"{ten} chỉ được gồm A-Z, 0-9, dấu chấm, gạch dưới hoặc gạch ngang.", "SAI_DINH_DANG_MA")
    return result


def _so_nguyen(value, ten: str, nho_nhat: int | None = None, lon_nhat: int | None = None):
    if value is None or value == "":
        return None
    try:
        result = int(value)
    except (TypeError, ValueError):
        raise ThieuDuLieu(f"{ten} phải là số nguyên.") from None
    if nho_nhat is not None and result < nho_nhat or lon_nhat is not None and result > lon_nhat:
        raise ThieuDuLieu(f"{ten} nằm ngoài phạm vi cho phép.")
    return result


def _so_thap_phan(value, ten: str, nho_nhat: Decimal | None = None):
    if value is None or value == "":
        return None
    try:
        result = Decimal(str(value))
    except InvalidOperation:
        raise ThieuDuLieu(f"{ten} phải là số.") from None
    if nho_nhat is not None and result < nho_nhat:
        raise ThieuDuLieu(f"{ten} nằm ngoài phạm vi cho phép.")
    return result


def _boolean(value, mac_dinh=False):
    if value is None:
        return mac_dinh
    if isinstance(value, bool):
        return value
    if str(value).strip().lower() in {"1", "true", "co", "có", "yes"}:
        return True
    if str(value).strip().lower() in {"0", "false", "khong", "không", "no"}:
        return False
    raise ThieuDuLieu("Giá trị có/không không hợp lệ.")


def _ngay(value, ten: str):
    if value is None or value == "":
        return None
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value))
    except ValueError:
        raise ThieuDuLieu(f"{ten} phải theo định dạng YYYY-MM-DD.") from None


def danh_sach_loai() -> list[dict]:
    return [{"ma": ma, "ten": ten} for ma, ten in DANH_MUC.items()]


def lay_danh_muc(ma: str, trang: int, kich_thuoc: int) -> dict:
    if ma not in DANH_MUC:
        raise KhongTimThay("Danh mục không tồn tại.", "KHONG_TIM_THAY_DANH_MUC")
    trang = max(trang, 1)
    kich_thuoc = min(max(kich_thuoc, 1), 100)
    rows, total = catalog_repo.lay_danh_muc(ma, (trang - 1) * kich_thuoc, kich_thuoc)
    return {
        "ma": ma, "ten": DANH_MUC[ma], "items": [dict(r) for r in rows],
        "tong": total, "trang": trang, "kich_thuoc": kich_thuoc,
    }


def lay_vat_tu(id_vat_tu: str) -> dict:
    row = catalog_repo.lay_vat_tu(id_vat_tu)
    if not row:
        raise KhongTimThay("Không tìm thấy vật tư.", "KHONG_TIM_THAY_VAT_TU")
    return dict(row)


def lay_nha_cung_cap(id_ncc: str) -> dict:
    row = catalog_repo.lay_nha_cung_cap(id_ncc)
    if not row:
        raise KhongTimThay("Không tìm thấy nhà cung cấp.", "KHONG_TIM_THAY_NCC")
    return dict(row)


def tim_vat_tu(tu_khoa: str, gioi_han: int = 20) -> list[dict]:
    q = _khong_dau(tu_khoa)
    if len(q) < 2:
        raise ThieuDuLieu("Hãy nhập ít nhất 2 ký tự để tìm vật tư.", "TU_KHOA_QUA_NGAN")
    return [dict(r) for r in catalog_repo.tim_vat_tu(q, min(max(gioi_han, 1), 50))]


def tim_nha_cung_cap(tu_khoa: str, gioi_han: int = 20) -> list[dict]:
    q = _khong_dau(tu_khoa)
    if len(q) < 2:
        raise ThieuDuLieu("Hãy nhập ít nhất 2 ký tự để tìm nhà cung cấp.", "TU_KHOA_QUA_NGAN")
    return [dict(r) for r in catalog_repo.tim_nha_cung_cap(q, min(max(gioi_han, 1), 50))]


def _chuan_danh_muc(ma: str, du_lieu: dict) -> dict:
    if ma not in DANH_MUC_CO_THE_GHI:
        raise KhongTimThay("Loại danh mục không hỗ trợ ghi.", "DANH_MUC_CHI_DOC")
    if ma == "don-vi-tinh":
        return {
            "dvt": _ma(du_lieu.get("dvt") or du_lieu.get("ma"), "Mã đơn vị tính", 20),
            "ten_dvt": _chuoi(du_lieu.get("ten_dvt") or du_lieu.get("ten"), "Tên đơn vị tính", 60),
            "so_le": _so_nguyen(du_lieu.get("so_le", 0), "Số lẻ", 0, 4),
            "trang_thai": _trang_thai(du_lieu.get("trang_thai", "HOAT_DONG"), {"HOAT_DONG", "NGUNG"}),
        }
    if ma == "chung-loai":
        return {
            "ma_chung_loai": _ma(du_lieu.get("ma_chung_loai") or du_lieu.get("ma"), "Mã chủng loại", 20),
            "ten": _chuoi(du_lieu.get("ten"), "Tên chủng loại", 100),
            "thu_tu": _so_nguyen(du_lieu.get("thu_tu"), "Thứ tự"),
        }
    if ma == "bo-phan":
        return {
            "ma_bo_phan": _ma(du_lieu.get("ma_bo_phan") or du_lieu.get("ma"), "Mã bộ phận", 10),
            "ten": _chuoi(du_lieu.get("ten"), "Tên bộ phận", 100),
            "loai": _chuoi(du_lieu.get("loai"), "Loại bộ phận", 20, False),
            "thu_tu": _so_nguyen(du_lieu.get("thu_tu"), "Thứ tự"),
            "trang_thai": _trang_thai(du_lieu.get("trang_thai", "HOAT_DONG"), {"HOAT_DONG", "NGUNG"}),
        }
    ma_bp = _chuoi(du_lieu.get("ma_bo_phan"), "Mã bộ phận", 10, False)
    if ma_bp and not catalog_repo.gia_tri_ton_tai("bo_phan", ma_bp):
        raise ThieuDuLieu("Mã bộ phận không tồn tại.", "THAM_CHIEU_KHONG_TON_TAI")
    return {
        "ma_nhan_vien": _ma(du_lieu.get("ma_nhan_vien") or du_lieu.get("ma"), "Mã nhân viên", 20),
        "ho_va_ten": _chuoi(du_lieu.get("ho_va_ten") or du_lieu.get("ten"), "Họ và tên", 120),
        "ma_bo_phan": ma_bp,
        "chuc_vu": _chuoi(du_lieu.get("chuc_vu"), "Chức vụ", 80, False),
        "ngay_vao_lam": _ngay(du_lieu.get("ngay_vao_lam"), "Ngày vào làm"),
        "trang_thai": _trang_thai(du_lieu.get("trang_thai", "HOAT_DONG"), {"HOAT_DONG", "NGHI_VIEC", "TAM_NGHI"}),
        "ghi_chu": _chuoi(du_lieu.get("ghi_chu"), "Ghi chú", 2000, False),
    }


def _trang_thai(value, tap_hop: set[str]) -> str:
    result = str(value).strip().upper()
    if result not in tap_hop:
        raise ThieuDuLieu("Trạng thái không hợp lệ.", "SAI_TRANG_THAI")
    return result


def _chuan_vat_tu(du_lieu: dict) -> dict:
    ma = _ma(du_lieu.get("ma_vat_tu"), "Mã vật tư", 40)
    if not RE_MA_VAT_TU.fullmatch(ma):
        raise ThieuDuLieu("Mã vật tư không đúng quy tắc đã đăng ký.", "SAI_MA_VAT_TU")
    ten = _chuoi(du_lieu.get("ten_hang"), "Tên hàng", 300)
    dvt = _ma(du_lieu.get("dvt"), "Đơn vị tính", 20)
    if not catalog_repo.gia_tri_ton_tai("dvt", dvt):
        raise ThieuDuLieu("Đơn vị tính không tồn tại.", "THAM_CHIEU_KHONG_TON_TAI")
    chung_loai = _chuoi(du_lieu.get("ma_chung_loai"), "Mã chủng loại", 20, False)
    if chung_loai and not catalog_repo.gia_tri_ton_tai("chung_loai", chung_loai):
        raise ThieuDuLieu("Chủng loại không tồn tại.", "THAM_CHIEU_KHONG_TON_TAI")
    id_goc = _chuoi(du_lieu.get("id_vt_goc"), "Vật tư gốc", 20, False)
    if id_goc and not catalog_repo.gia_tri_ton_tai("vat_tu", id_goc):
        raise ThieuDuLieu("Vật tư gốc không tồn tại.", "THAM_CHIEU_KHONG_TON_TAI")
    phan_loai = _trang_thai(du_lieu.get("phan_loai", "THONG_DUNG_SX"), PHAN_LOAI_VT)
    loai_phoi = _chuoi(du_lieu.get("loai_phoi"), "Loại phôi", 4, False)
    if loai_phoi:
        loai_phoi = loai_phoi.upper()
        if loai_phoi not in {"NC", "LC", "TN", "TL", "PT", "PL"}:
            raise ThieuDuLieu("Loại phôi không hợp lệ.")
    return {
        "ma_vat_tu": ma, "ten_hang": ten, "ten_khong_dau": _khong_dau(ten), "dvt": dvt,
        "ma_chung_loai": chung_loai, "phan_loai": phan_loai,
        "kho": _chuoi(du_lieu.get("kho"), "Kho", 10, False), "loai_phoi": loai_phoi,
        "id_vt_goc": id_goc, "quy_cach": _chuoi(du_lieu.get("quy_cach"), "Quy cách", 2000, False),
        "khoi_luong_rieng": _so_thap_phan(du_lieu.get("khoi_luong_rieng"), "Khối lượng riêng", Decimal("0.001")),
        "trang_thai": _trang_thai(du_lieu.get("trang_thai", "HOAT_DONG"), TRANG_THAI_VT),
        "ghi_chu": _chuoi(du_lieu.get("ghi_chu"), "Ghi chú", 2000, False),
    }


def _chuan_ncc(du_lieu: dict) -> dict:
    ma = _ma(du_lieu.get("ma_ncc"), "Mã nhà cung cấp", 40)
    ten = _chuoi(du_lieu.get("ten"), "Tên nhà cung cấp", 300)
    mst = _chuoi(du_lieu.get("mst"), "Mã số thuế", 20, False)
    if mst and not RE_MST.fullmatch(mst):
        raise ThieuDuLieu("Mã số thuế chỉ nhận 10 hoặc 13 chữ số.", "SAI_MST")
    mua_hang = _boolean(du_lieu.get("la_ncc_mua_hang"), True)
    gia_cong = _boolean(du_lieu.get("la_ncc_gia_cong"), False)
    if not mua_hang and not gia_cong:
        raise ThieuDuLieu("Nhà cung cấp phải có ít nhất một vai trò.", "THIEU_VAI_TRO_NCC")
    phe_duyet = _boolean(du_lieu.get("da_phe_duyet"), False)
    ngay_phe_duyet = _ngay(du_lieu.get("ngay_phe_duyet"), "Ngày phê duyệt")
    if phe_duyet and not ngay_phe_duyet:
        raise ThieuDuLieu("Nhà cung cấp đã phê duyệt phải có ngày phê duyệt.")
    if not phe_duyet:
        ngay_phe_duyet = None
    loai_gc = _chuoi(du_lieu.get("ma_loai_gia_cong"), "Loại gia công", 20, False)
    if loai_gc and not catalog_repo.gia_tri_ton_tai("loai_gia_cong", loai_gc):
        raise ThieuDuLieu("Loại gia công không tồn tại.", "THAM_CHIEU_KHONG_TON_TAI")
    phan_loai = _chuoi(du_lieu.get("phan_loai_ncc"), "Phân loại NCC", 20, False)
    if phan_loai:
        phan_loai = phan_loai.upper()
        if phan_loai not in {"A", "B", "C"}:
            raise ThieuDuLieu("Phân loại NCC chỉ nhận A, B hoặc C.")
    return {
        "ma_ncc": ma, "ten": ten, "ten_khong_dau": _khong_dau(ten), "mst": mst,
        "dia_chi": _chuoi(du_lieu.get("dia_chi"), "Địa chỉ", 2000, False),
        "nguoi_lien_he": _chuoi(du_lieu.get("nguoi_lien_he"), "Người liên hệ", 120, False),
        "sdt": _chuoi(du_lieu.get("sdt"), "Số điện thoại", 40, False),
        "sdt_2": _chuoi(du_lieu.get("sdt_2"), "Số điện thoại 2", 40, False),
        "fax": _chuoi(du_lieu.get("fax"), "Fax", 40, False),
        "email": _chuoi(du_lieu.get("email"), "Email", 120, False),
        "mat_hang": _chuoi(du_lieu.get("mat_hang"), "Mặt hàng", 2000, False),
        "la_ncc_mua_hang": mua_hang, "la_ncc_gia_cong": gia_cong,
        "co_hoa_don": None if du_lieu.get("co_hoa_don") is None else _boolean(du_lieu.get("co_hoa_don")),
        "cong_no": _chuoi(du_lieu.get("cong_no"), "Công nợ", 2000, False),
        "tien_mat": _chuoi(du_lieu.get("tien_mat"), "Tiền mặt", 2000, False),
        "nganh_nghe": _chuoi(du_lieu.get("nganh_nghe"), "Ngành nghề", 60, False),
        "ma_loai_gia_cong": loai_gc, "vung": _chuoi(du_lieu.get("vung"), "Vùng", 60, False),
        "so_km": _so_thap_phan(du_lieu.get("so_km"), "Số km", Decimal("0")),
        "ky_han_quy_dinh": _so_nguyen(du_lieu.get("ky_han_quy_dinh"), "Kỳ hạn quy định", 0),
        "da_phe_duyet": phe_duyet, "ngay_phe_duyet": ngay_phe_duyet,
        "phan_loai_ncc": phan_loai,
        "trang_thai": _trang_thai(du_lieu.get("trang_thai", "HOAT_DONG"), TRANG_THAI_NCC),
        "ghi_chu": _chuoi(du_lieu.get("ghi_chu"), "Ghi chú", 2000, False),
    }


def kiem_tra_trung_vat_tu(du_lieu: dict, bo_qua_id: str | None = None) -> list[dict]:
    ma = _chuoi(du_lieu.get("ma_vat_tu"), "Mã vật tư", 40, False)
    ten = _chuoi(du_lieu.get("ten_hang"), "Tên hàng", 300)
    return [dict(row) for row in catalog_repo.tim_trung_vat_tu(ma, _khong_dau(ten), bo_qua_id)]


def kiem_tra_trung_nha_cung_cap(du_lieu: dict, bo_qua_id: str | None = None) -> list[dict]:
    ma = _chuoi(du_lieu.get("ma_ncc"), "Mã nhà cung cấp", 40, False)
    ten = _chuoi(du_lieu.get("ten"), "Tên nhà cung cấp", 300)
    mst = _chuoi(du_lieu.get("mst"), "Mã số thuế", 20, False)
    return [dict(row) for row in catalog_repo.tim_trung_nha_cung_cap(ma, _khong_dau(ten), mst, bo_qua_id)]


def _tach_trung(ds: list[dict], loai: str):
    chan = {"MA_CHINH_XAC", "MST_CHINH_XAC"}
    if loai == "vat-tu":
        chan.add("TEN_CHINH_XAC")
    return [x for x in ds if x["loai_trung"] in chan], [x for x in ds if x["loai_trung"] not in chan]


def _loi_csdl(exc):
    if isinstance(exc, UniqueViolation):
        raise XungDot("Mã hoặc tên đã tồn tại. Hãy tải lại dữ liệu.", "DANH_MUC_DA_TON_TAI") from None
    if isinstance(exc, ForeignKeyViolation):
        raise ThieuDuLieu("Danh mục tham chiếu không tồn tại.", "THAM_CHIEU_KHONG_TON_TAI") from None
    if isinstance(exc, CheckViolation):
        raise ThieuDuLieu("Dữ liệu không thỏa quy tắc danh mục.", "SAI_DU_LIEU_DANH_MUC") from None
    raise exc


def _ket_qua_cu(tai_khoan: str, khoa: str, duong_dan: str):
    try:
        return catalog_repo.lay_ket_qua_idempotency(tai_khoan, khoa, duong_dan)
    except ValueError:
        raise XungDot(
            "Khóa X-Idempotency-Key đã được dùng cho yêu cầu khác.",
            "KHOA_IDEMPOTENCY_DA_DUNG",
        ) from None


def tao_danh_muc(ma: str, du_lieu: dict, nguoi_tao: str, tai_khoan: str, khoa: str) -> dict:
    cu = _ket_qua_cu(tai_khoan, khoa, f"POST:/api/v1/danh-muc/{ma}")
    if cu is not None:
        return cu
    chuan = _chuan_danh_muc(ma, du_lieu)
    try:
        return catalog_repo.tao_danh_muc(ma, chuan, nguoi_tao, tai_khoan, khoa)
    except (UniqueViolation, ForeignKeyViolation, CheckViolation) as exc:
        _loi_csdl(exc)


def cap_nhat_danh_muc(ma: str, id_ban_ghi: str, du_lieu: dict, phien_ban: int, nguoi_sua: str) -> dict:
    if ma not in DANH_MUC_CO_THE_GHI:
        raise KhongTimThay("Loại danh mục không hỗ trợ ghi.", "DANH_MUC_CHI_DOC")
    ban_ghi_cu = catalog_repo.lay_ban_ghi_danh_muc(ma, id_ban_ghi)
    if not ban_ghi_cu:
        raise KhongTimThay("Không tìm thấy bản ghi danh mục.")
    du_lieu_day_du = {**dict(ban_ghi_cu), **du_lieu}
    khoa = catalog_repo.DANH_MUC_GHI[ma][1]
    du_lieu_day_du[khoa] = id_ban_ghi
    chuan = _chuan_danh_muc(ma, du_lieu_day_du)
    try:
        row = catalog_repo.cap_nhat_danh_muc(ma, id_ban_ghi, chuan, phien_ban, nguoi_sua)
    except (UniqueViolation, ForeignKeyViolation, CheckViolation) as exc:
        _loi_csdl(exc)
    if not row:
        if not catalog_repo.ton_tai_danh_muc(ma, id_ban_ghi):
            raise KhongTimThay("Không tìm thấy bản ghi danh mục.")
        raise XungDot("Danh mục vừa được người khác cập nhật. Hãy tải lại.")
    return dict(row)


def tao_vat_tu(du_lieu: dict, nguoi_tao: str, tai_khoan: str, khoa: str, xac_nhan_trung=False) -> dict:
    cu = _ket_qua_cu(tai_khoan, khoa, "POST:/api/v1/vat-tu")
    if cu is not None:
        return cu
    chuan = _chuan_vat_tu(du_lieu)
    trung = kiem_tra_trung_vat_tu(chuan)
    chan, canh_bao = _tach_trung(trung, "vat-tu")
    if chan:
        raise XungDot("Mã hoặc tên vật tư đã tồn tại.", "VAT_TU_TRUNG_CHINH_XAC")
    if canh_bao and not xac_nhan_trung:
        return {"da_luu": False, "can_xac_nhan": True, "canh_bao_trung": canh_bao}
    try:
        result = catalog_repo.tao_vat_tu(chuan, nguoi_tao, tai_khoan, khoa)
        result["canh_bao_trung"] = canh_bao
        return result
    except (UniqueViolation, ForeignKeyViolation, CheckViolation) as exc:
        _loi_csdl(exc)


def cap_nhat_vat_tu(id_vat_tu: str, du_lieu: dict, phien_ban: int, nguoi_sua: str, xac_nhan_trung=False) -> dict:
    cu = lay_vat_tu(id_vat_tu)
    if cu["ma_vat_tu"] and du_lieu.get("ma_vat_tu") not in (None, cu["ma_vat_tu"]):
        raise ThieuDuLieu("Mã vật tư là bất biến sau khi được cấp.", "MA_VAT_TU_BAT_BIEN")
    hop = {**cu, **du_lieu, "ma_vat_tu": cu["ma_vat_tu"] or du_lieu.get("ma_vat_tu")}
    chuan = _chuan_vat_tu(hop)
    trung = kiem_tra_trung_vat_tu(chuan, id_vat_tu)
    chan, canh_bao = _tach_trung(trung, "vat-tu")
    if chan:
        raise XungDot("Tên vật tư đã tồn tại.", "VAT_TU_TRUNG_CHINH_XAC")
    if canh_bao and not xac_nhan_trung:
        return {"da_luu": False, "can_xac_nhan": True, "canh_bao_trung": canh_bao}
    if cu["ma_vat_tu"]:
        chuan.pop("ma_vat_tu")
    try:
        row = catalog_repo.cap_nhat_vat_tu(id_vat_tu, chuan, phien_ban, nguoi_sua)
    except (UniqueViolation, ForeignKeyViolation, CheckViolation) as exc:
        _loi_csdl(exc)
    if not row:
        if not catalog_repo.lay_vat_tu(id_vat_tu):
            raise KhongTimThay("Không tìm thấy vật tư.")
        raise XungDot("Vật tư vừa được người khác cập nhật. Hãy tải lại.")
    return {"da_luu": True, "item": dict(row), "canh_bao_trung": canh_bao}


def tao_nha_cung_cap(du_lieu: dict, nguoi_tao: str, tai_khoan: str, khoa: str, xac_nhan_trung=False) -> dict:
    cu = _ket_qua_cu(tai_khoan, khoa, "POST:/api/v1/nha-cung-cap")
    if cu is not None:
        return cu
    chuan = _chuan_ncc(du_lieu)
    trung = kiem_tra_trung_nha_cung_cap(chuan)
    chan, canh_bao = _tach_trung(trung, "nha-cung-cap")
    if chan:
        raise XungDot("Mã hoặc mã số thuế nhà cung cấp đã tồn tại.", "NCC_TRUNG_CHINH_XAC")
    if canh_bao and not xac_nhan_trung:
        return {"da_luu": False, "can_xac_nhan": True, "canh_bao_trung": canh_bao}
    try:
        result = catalog_repo.tao_nha_cung_cap(chuan, nguoi_tao, tai_khoan, khoa)
        result["canh_bao_trung"] = canh_bao
        return result
    except (UniqueViolation, ForeignKeyViolation, CheckViolation) as exc:
        _loi_csdl(exc)


def cap_nhat_nha_cung_cap(id_ncc: str, du_lieu: dict, phien_ban: int, nguoi_sua: str, xac_nhan_trung=False) -> dict:
    cu = lay_nha_cung_cap(id_ncc)
    chuan = _chuan_ncc({**cu, **du_lieu})
    trung = kiem_tra_trung_nha_cung_cap(chuan, id_ncc)
    chan, canh_bao = _tach_trung(trung, "nha-cung-cap")
    if chan:
        raise XungDot("Mã hoặc mã số thuế nhà cung cấp đã tồn tại.", "NCC_TRUNG_CHINH_XAC")
    if canh_bao and not xac_nhan_trung:
        return {"da_luu": False, "can_xac_nhan": True, "canh_bao_trung": canh_bao}
    try:
        row = catalog_repo.cap_nhat_nha_cung_cap(id_ncc, chuan, phien_ban, nguoi_sua)
    except (UniqueViolation, ForeignKeyViolation, CheckViolation) as exc:
        _loi_csdl(exc)
    if not row:
        if not catalog_repo.lay_nha_cung_cap(id_ncc):
            raise KhongTimThay("Không tìm thấy nhà cung cấp.")
        raise XungDot("Nhà cung cấp vừa được người khác cập nhật. Hãy tải lại.")
    return {"da_luu": True, "item": dict(row), "canh_bao_trung": canh_bao}


def _chuan_theo_loai(loai: str, row: dict) -> dict:
    if loai == "vat-tu":
        return _chuan_vat_tu(row)
    if loai == "nha-cung-cap":
        return _chuan_ncc(row)
    return _chuan_danh_muc(loai, row)


def xem_truoc_nhap_hang_loat(loai: str, rows: list[dict]) -> dict:
    if loai not in LOAI_NHAP_LO:
        raise KhongTimThay("Loại danh mục không hỗ trợ nhập hàng loạt.", "LOAI_NHAP_KHONG_HOP_LE")
    if not rows:
        raise ThieuDuLieu("Danh sách nhập không được rỗng.")
    if len(rows) > 500:
        raise ThieuDuLieu("Mỗi lần chỉ được nhập tối đa 500 dòng.", "VUOT_GIOI_HAN_NHAP")
    ket_qua, danh_sach_chuan = [], []
    da_gap = {}
    for stt, row in enumerate(rows, 1):
        loi, canh_bao, chuan = [], [], None
        try:
            chuan = _chuan_theo_loai(loai, row)
            if loai == "vat-tu":
                trung = kiem_tra_trung_vat_tu(chuan)
                chan, canh_bao = _tach_trung(trung, loai)
                if chan:
                    loi.append("Mã hoặc tên vật tư đã tồn tại")
                khoa = (chuan["ma_vat_tu"], chuan["ten_khong_dau"])
            elif loai == "nha-cung-cap":
                trung = kiem_tra_trung_nha_cung_cap(chuan)
                chan, canh_bao = _tach_trung(trung, loai)
                if chan:
                    loi.append("Mã hoặc mã số thuế NCC đã tồn tại")
                khoa = (chuan["ma_ncc"], chuan.get("mst"))
            else:
                khoa_chinh = catalog_repo.DANH_MUC_GHI[loai][1]
                khoa = (chuan[khoa_chinh], chuan["ten"] if loai == "chung-loai" else None)
                if catalog_repo.trung_danh_muc(loai, chuan):
                    loi.append("Mã hoặc tên danh mục đã tồn tại")
            for gia_tri in khoa:
                if gia_tri and (loai, gia_tri) in da_gap:
                    loi.append(f"Trùng với dòng {da_gap[(loai, gia_tri)]} trong tệp nhập")
                elif gia_tri:
                    da_gap[(loai, gia_tri)] = stt
        except LoiNghiepVu as exc:
            loi.append(str(exc))
        if chuan is not None:
            danh_sach_chuan.append(chuan)
        ket_qua.append({"dong": stt, "hop_le": not loi, "loi": loi, "canh_bao_trung": canh_bao})
    payload = {"loai": loai, "rows": danh_sach_chuan}
    ma_xac_nhan = hashlib.sha256(
        json.dumps(payload, ensure_ascii=False, sort_keys=True, default=str, separators=(",", ":")).encode()
    ).hexdigest()
    return {
        "loai": loai, "tong_so": len(rows), "hop_le": sum(1 for x in ket_qua if x["hop_le"]),
        "co_loi": sum(1 for x in ket_qua if x["loi"]),
        "co_canh_bao": sum(1 for x in ket_qua if x["canh_bao_trung"]),
        "chi_tiet": ket_qua, "ma_xac_nhan": ma_xac_nhan, "du_lieu_chuan_hoa": danh_sach_chuan,
    }


def xac_nhan_nhap_hang_loat(
    loai: str, rows: list[dict], ma_xac_nhan: str, xac_nhan_canh_bao: bool,
    nguoi_tao: str, tai_khoan: str, khoa: str,
) -> dict:
    cu = _ket_qua_cu(
        tai_khoan, khoa, "POST:/api/v1/danh-muc/nhap-hang-loat/xac-nhan"
    )
    if cu is not None:
        return cu
    xem_truoc = xem_truoc_nhap_hang_loat(loai, rows)
    if xem_truoc["ma_xac_nhan"] != ma_xac_nhan:
        raise XungDot("Dữ liệu đã thay đổi sau khi xem trước. Hãy xem trước lại.", "DU_LIEU_NHAP_DA_THAY_DOI")
    if xem_truoc["co_loi"]:
        raise ThieuDuLieu("Tệp nhập còn dòng lỗi. Không có dữ liệu nào được ghi.", "NHAP_LO_CON_LOI")
    if xem_truoc["co_canh_bao"] and not xac_nhan_canh_bao:
        raise XungDot("Có cảnh báo trùng gần. Cần xác nhận trước khi nhập.", "CAN_XAC_NHAN_TRUNG")
    try:
        return catalog_repo.nhap_hang_loat(
            loai, xem_truoc["du_lieu_chuan_hoa"], nguoi_tao, tai_khoan, khoa
        )
    except (UniqueViolation, ForeignKeyViolation, CheckViolation) as exc:
        _loi_csdl(exc)
