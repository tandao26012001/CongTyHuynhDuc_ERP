from datetime import date
from decimal import Decimal
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Header, Request
from pydantic import BaseModel, Field

from backend.api.envelope import thanh_cong
from backend.api.middleware import lay_ho_so
from backend.services import catalog_service, phan_quyen_service, ncc_import_service
from backend.services import danh_muc_lich_su_service
from backend.services.errors import KhongCoQuyen

router = APIRouter()


class PhanHoi(BaseModel):
    ok: bool
    data: Any = None
    error: str | None = None
    ma_loi: str | None = None


class TaoDanhMucBody(BaseModel):
    du_lieu: dict[str, Any]


class SuaDanhMucBody(BaseModel):
    du_lieu: dict[str, Any]
    phien_ban: int = Field(ge=1)


class VatTuBody(BaseModel):
    ma_vat_tu: str
    ten_hang: str
    dvt: str
    ma_chung_loai: str | None = None
    phan_loai: str = "THONG_DUNG_SX"
    kho: str | None = None
    loai_phoi: str | None = None
    id_vt_goc: str | None = None
    quy_cach: str | None = None
    khoi_luong_rieng: Decimal | None = None
    trang_thai: str = "HOAT_DONG"
    ghi_chu: str | None = None
    xac_nhan_trung: bool = False


class SuaVatTuBody(BaseModel):
    phien_ban: int = Field(ge=1)
    ma_vat_tu: str | None = None
    ten_hang: str | None = None
    dvt: str | None = None
    ma_chung_loai: str | None = None
    phan_loai: str | None = None
    kho: str | None = None
    loai_phoi: str | None = None
    id_vt_goc: str | None = None
    quy_cach: str | None = None
    khoi_luong_rieng: Decimal | None = None
    trang_thai: str | None = None
    ghi_chu: str | None = None
    xac_nhan_trung: bool = False


class KiemTraVatTuBody(BaseModel):
    ma_vat_tu: str | None = None
    ten_hang: str
    bo_qua_id: str | None = None


class CapMaVatTuBody(BaseModel):
    ma_quy_tac: str
    ma_vat_lieu: str | None = None
    loai_hinh: str | None = None


class CapMaVatTuHangLoatBody(BaseModel):
    rows: list[CapMaVatTuBody]


class DuKienMaVatTuBody(BaseModel):
    ma_quy_tac: str
    ten_hang: str = ""
    loai_hinh: str | None = None


class DuKienMaVatTuHangLoatBody(BaseModel):
    rows: list[DuKienMaVatTuBody]


class NhaCungCapBody(BaseModel):
    ma_ncc: str | None = None
    ten: str
    mst: str | None = None
    dia_chi: str | None = None
    nguoi_lien_he: str | None = None
    sdt: str | None = None
    fax: str | None = None
    email: str | None = None
    mat_hang: str | None = None
    la_ncc_mua_hang: bool = True
    la_ncc_gia_cong: bool = False
    co_hoa_don: bool | None = None
    cong_no: str | None = None
    tien_mat: str | None = None
    nganh_nghe: str | None = None
    ma_loai_gia_cong: str | None = None
    vung: str | None = None
    so_km: Decimal | None = None
    ky_han_quy_dinh: int | None = None
    da_phe_duyet: bool = False
    ngay_phe_duyet: date | None = None
    dinh_muc_thang: Decimal | None = None
    ghi_chu_dinh_muc: str | None = None
    nhom_hang_chi_tiet: list[str] | None = None
    phan_loai_ncc: str | None = None
    trang_thai: str = "HOAT_DONG"
    ghi_chu: str | None = None
    xac_nhan_trung: bool = False


class SuaNhaCungCapBody(BaseModel):
    phien_ban: int = Field(ge=1)
    ma_ncc: str | None = None
    ten: str | None = None
    mst: str | None = None
    dia_chi: str | None = None
    nguoi_lien_he: str | None = None
    sdt: str | None = None
    fax: str | None = None
    email: str | None = None
    mat_hang: str | None = None
    la_ncc_mua_hang: bool | None = None
    la_ncc_gia_cong: bool | None = None
    co_hoa_don: bool | None = None
    cong_no: str | None = None
    tien_mat: str | None = None
    nganh_nghe: str | None = None
    ma_loai_gia_cong: str | None = None
    vung: str | None = None
    so_km: Decimal | None = None
    ky_han_quy_dinh: int | None = None
    da_phe_duyet: bool | None = None
    ngay_phe_duyet: date | None = None
    dinh_muc_thang: Decimal | None = None
    ghi_chu_dinh_muc: str | None = None
    nhom_hang_chi_tiet: list[str] | None = None
    phan_loai_ncc: str | None = None
    trang_thai: str | None = None
    ghi_chu: str | None = None
    xac_nhan_trung: bool = False


class KiemTraNccBody(BaseModel):
    ma_ncc: str | None = None
    ten: str
    mst: str | None = None
    bo_qua_id: str | None = None


class XemTruocNhapBody(BaseModel):
    loai: str
    rows: list[dict[str, Any]] = Field(min_length=1, max_length=500)


class XacNhanNhapBody(XemTruocNhapBody):
    ma_xac_nhan: str = Field(min_length=64, max_length=64)
    xac_nhan_canh_bao: bool = False


class NhapDonViTinhBody(BaseModel):
    rows: list[dict[str, Any]] = Field(min_length=1, max_length=500)


class NhapQuyTacNhanDienBody(BaseModel):
    rows: list[dict[str, Any]] = Field(min_length=1, max_length=500)


def _du_lieu(model: BaseModel, bo: set[str] | None = None, exclude_unset=False):
    data = model.model_dump(exclude_unset=exclude_unset)
    for key in bo or set():
        data.pop(key, None)
    return data


def _quyen_nhap(request: Request, loai: str):
    trang = "ncc" if loai == "nha-cung-cap" else "danh_muc"
    phan_quyen_service.kiem_quyen(lay_ho_so(request), trang, "sua")


@router.get("/danh-muc", summary="Danh sách loại danh mục", response_model=PhanHoi)
def danh_sach_loai(request: Request):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "danh_muc", "xem")
    return thanh_cong(catalog_service.danh_sach_loai())


@router.post("/danh-muc/nhap-hang-loat/xem-truoc", summary="Kiểm tra trước khi nhập danh mục", response_model=PhanHoi)
def xem_truoc_nhap(body: XemTruocNhapBody, request: Request):
    _quyen_nhap(request, body.loai)
    return thanh_cong(catalog_service.xem_truoc_nhap_hang_loat(body.loai, body.rows))


@router.post("/danh-muc/nhap-hang-loat/xac-nhan", summary="Xác nhận nhập danh mục nguyên khối", response_model=PhanHoi)
def xac_nhan_nhap(
    body: XacNhanNhapBody, request: Request,
    khoa: UUID = Header(alias="X-Idempotency-Key"),
):
    _quyen_nhap(request, body.loai)
    ho_so = lay_ho_so(request)
    return thanh_cong(catalog_service.xac_nhan_nhap_hang_loat(
        body.loai, body.rows, body.ma_xac_nhan, body.xac_nhan_canh_bao,
        ho_so["ma_nhan_vien"], ho_so["ma_tai_khoan"], str(khoa),
    ))


@router.get("/danh-muc/{ma}", summary="Đọc một danh mục", response_model=PhanHoi)
def lay_danh_muc(
    ma: str, request: Request, trang: int = 1, kich_thuoc: int = 20,
    q: str = "", trang_thai: str = "", ma_bo_phan: str = "",
):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "danh_muc", "xem")
    return thanh_cong(catalog_service.lay_danh_muc(
        ma, trang, kich_thuoc,
        {"q": q, "trang_thai": trang_thai, "ma_bo_phan": ma_bo_phan},
    ))


@router.get("/danh-muc/{ma}/{id_ban_ghi}/lich-su", summary="Lịch sử thay đổi một bản ghi danh mục", response_model=PhanHoi)
def lich_su_danh_muc(
    ma: str, id_ban_ghi: str, request: Request,
    trang: int = 1, kich_thuoc: int = 25,
):
    ho_so = lay_ho_so(request)
    phan_quyen_service.kiem_quyen(ho_so, "danh_muc", "xem")
    return thanh_cong(danh_muc_lich_su_service.danh_sach(
        ma, id_ban_ghi, trang, kich_thuoc,
    ))


@router.post("/danh-muc/{ma}", summary="Tạo bản ghi danh mục nền", response_model=PhanHoi)
def tao_danh_muc(
    ma: str, body: TaoDanhMucBody, request: Request,
    khoa: UUID = Header(alias="X-Idempotency-Key"),
):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "danh_muc", "sua")
    ho_so = lay_ho_so(request)
    return thanh_cong(catalog_service.tao_danh_muc(
        ma, body.du_lieu, ho_so["ma_nhan_vien"], ho_so["ma_tai_khoan"], str(khoa)
    ))


@router.patch("/danh-muc/{ma}/{id_ban_ghi}", summary="Sửa bản ghi danh mục nền", response_model=PhanHoi)
def sua_danh_muc(ma: str, id_ban_ghi: str, body: SuaDanhMucBody, request: Request):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "danh_muc", "sua")
    ho_so = lay_ho_so(request)
    return thanh_cong(catalog_service.cap_nhat_danh_muc(
        ma, id_ban_ghi, body.du_lieu, body.phien_ban, ho_so["ma_nhan_vien"]
    ))


@router.get("/vat-tu/tim", summary="Tìm mờ vật tư", response_model=PhanHoi)
def tim_vat_tu(request: Request, q: str, gioi_han: int = 20):
    try:
        phan_quyen_service.kiem_quyen(lay_ho_so(request), "danh_muc", "xem")
    except KhongCoQuyen:
        phan_quyen_service.kiem_quyen(lay_ho_so(request), "de_nghi", "xem")
    return thanh_cong(catalog_service.tim_vat_tu(q, gioi_han))


@router.get("/vat-tu", summary="Danh sách vật tư có bộ lọc và phân trang", response_model=PhanHoi)
def danh_sach_vat_tu(
    request: Request, q: str = "", ma_vat_tu: str = "", ten_hang: str = "",
    dvt: str = "", ma_chung_loai: str = "", trang_thai: str = "",
    trang: int = 1, kich_thuoc: int = 25,
):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "danh_muc", "xem")
    return thanh_cong(catalog_service.danh_sach_vat_tu({
        "tu_khoa": q,
        "ma_vat_tu": ma_vat_tu,
        "ten_hang": ten_hang,
        "dvt": dvt,
        "ma_chung_loai": ma_chung_loai,
        "trang_thai": trang_thai,
    }, trang, kich_thuoc))


@router.get("/lenh-san-xuat", summary="Danh sách lệnh sản xuất chỉ đọc", response_model=PhanHoi)
def danh_sach_lenh_san_xuat(
    request: Request, q: str = "", trang: int = 1, kich_thuoc: int = 25,
):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "danh_muc", "xem")
    return thanh_cong(catalog_service.danh_sach_lenh_san_xuat(q, trang, kich_thuoc))


@router.get("/quy-tac-ma-vat-tu", summary="Danh sách quy tắc cấp mã vật tư", response_model=PhanHoi)
def danh_sach_quy_tac_ma_vat_tu(request: Request):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "danh_muc", "xem")
    return thanh_cong(catalog_service.lay_quy_tac_ma_vat_tu())


@router.get("/quy-tac-nhan-dien", summary="Bảng quy tắc nhận diện tên hàng", response_model=PhanHoi)
def danh_sach_quy_tac_nhan_dien(request: Request):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "danh_muc", "xem")
    return thanh_cong(catalog_service.lay_quy_tac_nhan_dien())


@router.delete("/quy-tac-nhan-dien/{id_quy_tac}", summary="Xoá quy tắc nhận diện", response_model=PhanHoi)
def xoa_quy_tac_nhan_dien(id_quy_tac: str, request: Request):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "danh_muc", "sua")
    return thanh_cong(catalog_service.xoa_quy_tac_nhan_dien(id_quy_tac))


@router.post("/quy-tac-nhan-dien/nhap-hang-loat", summary="Thêm một hoặc nhiều quy tắc nhận diện", response_model=PhanHoi)
def nhap_quy_tac_nhan_dien(body: NhapQuyTacNhanDienBody, request: Request):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "danh_muc", "sua")
    return thanh_cong(catalog_service.nhap_quy_tac_nhan_dien(body.rows))


@router.post("/chung-loai/nhap-hang-loat", summary="Thêm các chủng loại hợp lệ và trả riêng dòng lỗi", response_model=PhanHoi)
def nhap_chung_loai_hang_loat(body: NhapQuyTacNhanDienBody, request: Request):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "danh_muc", "sua")
    ho_so = lay_ho_so(request)
    return thanh_cong(catalog_service.nhap_chung_loai_hang_loat(body.rows, ho_so["ma_nhan_vien"]))


@router.post("/vat-tu/nhap-hang-loat", summary="Thêm từng vật tư hợp lệ và trả riêng dòng lỗi", response_model=PhanHoi)
def nhap_vat_tu_hang_loat_tung_dong(body: NhapQuyTacNhanDienBody, request: Request):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "danh_muc", "sua")
    ho_so = lay_ho_so(request)
    return thanh_cong(catalog_service.nhap_vat_tu_hang_loat_tung_dong(body.rows, ho_so["ma_nhan_vien"]))


@router.post("/vat-tu/cap-ma", summary="Cấp mã vật tư kế tiếp theo quy tắc", response_model=PhanHoi)
def cap_ma_vat_tu(body: CapMaVatTuBody, request: Request):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "danh_muc", "sua")
    return thanh_cong(catalog_service.cap_ma_vat_tu(body.ma_quy_tac, body.ma_vat_lieu, body.loai_hinh))


@router.post("/vat-tu/cap-ma-hang-loat", summary="Cấp mã cho nhiều vật tư", response_model=PhanHoi)
def cap_ma_vat_tu_hang_loat(body: CapMaVatTuHangLoatBody, request: Request):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "danh_muc", "sua")
    return thanh_cong(catalog_service.cap_ma_vat_tu_hang_loat(
        [row.model_dump() for row in body.rows]
    ))


@router.post("/vat-tu/du-kien-ma", summary="Xem mã vật tư dự kiến theo tên hàng", response_model=PhanHoi)
def du_kien_ma_vat_tu(body: DuKienMaVatTuBody, request: Request):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "danh_muc", "xem")
    return thanh_cong(catalog_service.du_kien_ma_vat_tu(body.ma_quy_tac, body.ten_hang, body.loai_hinh))


@router.post("/vat-tu/du-kien-ma-hang-loat", summary="Xem mã dự kiến cho nhiều vật tư", response_model=PhanHoi)
def du_kien_ma_vat_tu_hang_loat(body: DuKienMaVatTuHangLoatBody, request: Request):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "danh_muc", "xem")
    return thanh_cong(catalog_service.du_kien_ma_vat_tu_hang_loat(
        [row.model_dump() for row in body.rows]
    ))


@router.get("/don-vi-tinh", summary="Danh sách đơn vị tính đang sử dụng", response_model=PhanHoi)
def lay_don_vi_tinh(request: Request):
    try:
        phan_quyen_service.kiem_quyen(lay_ho_so(request), "danh_muc", "xem")
    except KhongCoQuyen:
        phan_quyen_service.kiem_quyen(lay_ho_so(request), "de_nghi", "xem")
    return thanh_cong(catalog_service.lay_don_vi_tinh_hoat_dong())


@router.delete("/don-vi-tinh/{dvt}", summary="Xoá đơn vị tính", response_model=PhanHoi)
def xoa_don_vi_tinh(dvt: str, request: Request):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "danh_muc", "sua")
    return thanh_cong(catalog_service.xoa_don_vi_tinh(dvt))


@router.delete("/chung-loai/{ma_chung_loai}", summary="Xoá chủng loại", response_model=PhanHoi)
def xoa_chung_loai(ma_chung_loai: str, request: Request):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "danh_muc", "sua")
    return thanh_cong(catalog_service.xoa_chung_loai(ma_chung_loai))


@router.post("/don-vi-tinh/nhap-hang-loat", summary="Nhập hàng loạt đơn vị tính", response_model=PhanHoi)
def nhap_don_vi_tinh_hang_loat(
    body: NhapDonViTinhBody, request: Request,
    khoa: UUID = Header(alias="X-Idempotency-Key"),
):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "danh_muc", "sua")
    ho_so = lay_ho_so(request)
    return thanh_cong(catalog_service.nhap_don_vi_tinh_hang_loat(
        body.rows, ho_so["ma_nhan_vien"], ho_so["ma_tai_khoan"], str(khoa)
    ))


@router.post("/vat-tu/kiem-tra-trung", summary="Cảnh báo vật tư trùng mã/tên", response_model=PhanHoi)
def kiem_tra_trung_vat_tu(body: KiemTraVatTuBody, request: Request):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "danh_muc", "xem")
    return thanh_cong(catalog_service.kiem_tra_trung_vat_tu(
        _du_lieu(body, {"bo_qua_id"}), body.bo_qua_id
    ))


@router.post("/vat-tu", summary="Tạo vật tư", response_model=PhanHoi)
def tao_vat_tu(
    body: VatTuBody, request: Request,
    khoa: UUID = Header(alias="X-Idempotency-Key"),
):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "danh_muc", "sua")
    ho_so = lay_ho_so(request)
    return thanh_cong(catalog_service.tao_vat_tu(
        _du_lieu(body, {"xac_nhan_trung"}), ho_so["ma_nhan_vien"],
        ho_so["ma_tai_khoan"], str(khoa), body.xac_nhan_trung,
    ))


@router.get("/vat-tu/{id_vat_tu}", summary="Chi tiết vật tư", response_model=PhanHoi)
def lay_vat_tu(id_vat_tu: str, request: Request):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "danh_muc", "xem")
    return thanh_cong(catalog_service.lay_vat_tu(id_vat_tu))


@router.delete("/vat-tu/{id_vat_tu}", summary="Xoá vật tư", response_model=PhanHoi)
def xoa_vat_tu(id_vat_tu: str, request: Request):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "danh_muc", "sua")
    return thanh_cong(catalog_service.xoa_vat_tu(id_vat_tu))


@router.patch("/vat-tu/{id_vat_tu}", summary="Sửa vật tư", response_model=PhanHoi)
def sua_vat_tu(id_vat_tu: str, body: SuaVatTuBody, request: Request):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "danh_muc", "sua")
    ho_so = lay_ho_so(request)
    return thanh_cong(catalog_service.cap_nhat_vat_tu(
        id_vat_tu, _du_lieu(body, {"phien_ban", "xac_nhan_trung"}, True),
        body.phien_ban, ho_so["ma_nhan_vien"], body.xac_nhan_trung,
    ))


@router.get("/nha-cung-cap/tim", summary="Tìm mờ nhà cung cấp", response_model=PhanHoi)
def tim_ncc(request: Request, q: str, gioi_han: int = 20):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "ncc", "xem")
    return thanh_cong(catalog_service.tim_nha_cung_cap(q, gioi_han))


@router.get("/nha-cung-cap", summary="Danh sách nhà cung cấp", response_model=PhanHoi)
def danh_sach_ncc(request: Request, trang: int = 1, kich_thuoc: int = 25):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "ncc", "xem")
    return thanh_cong(catalog_service.danh_sach_nha_cung_cap(trang, kich_thuoc))


@router.post("/nha-cung-cap/kiem-tra-trung", summary="Cảnh báo NCC trùng mã/MST/tên", response_model=PhanHoi)
def kiem_tra_trung_ncc(body: KiemTraNccBody, request: Request):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "ncc", "xem")
    return thanh_cong(catalog_service.kiem_tra_trung_nha_cung_cap(
        _du_lieu(body, {"bo_qua_id"}), body.bo_qua_id
    ))


@router.post("/nha-cung-cap", summary="Tạo nhà cung cấp", response_model=PhanHoi)
def tao_ncc(
    body: NhaCungCapBody, request: Request,
    khoa: UUID = Header(alias="X-Idempotency-Key"),
):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "ncc", "sua")
    ho_so = lay_ho_so(request)
    if ho_so.get("vai_tro") not in ("ADMIN", "TBP_MUA_HANG", "NV_MUA_HANG"):
        raise KhongCoQuyen("Hãy dùng chức năng Đề xuất NCC để Mua hàng xét duyệt.")
    if body.da_phe_duyet and ho_so.get("vai_tro") not in ("ADMIN", "TBP_MUA_HANG"):
        raise KhongCoQuyen("Chỉ Trưởng bộ phận Mua hàng được phê duyệt NCC vào BM03.")
    return thanh_cong(catalog_service.tao_nha_cung_cap(
        _du_lieu(body, {"xac_nhan_trung"}), ho_so["ma_nhan_vien"],
        ho_so["ma_tai_khoan"], str(khoa), body.xac_nhan_trung,
    ))


class NhapNccBody(BaseModel):
    rows: list[dict[str, Any]] = Field(min_length=1, max_length=500)
    xac_nhan_trung: bool = False


@router.post("/nha-cung-cap/nhap-hang-loat", summary="Nhập NCC theo lô, trả lỗi từng dòng", response_model=PhanHoi)
def nhap_ncc(body: NhapNccBody, request: Request, khoa: UUID = Header(alias="X-Idempotency-Key")):
    ho_so = lay_ho_so(request)
    phan_quyen_service.kiem_quyen(ho_so, "ncc", "sua")
    if ho_so.get("vai_tro") not in ("ADMIN", "TBP_MUA_HANG", "NV_MUA_HANG"):
        raise KhongCoQuyen("Chỉ bộ phận Mua hàng được nhập hàng loạt NCC.")
    return thanh_cong(ncc_import_service.nhap(
        body.rows, ho_so["ma_nhan_vien"], ho_so["ma_tai_khoan"], str(khoa), body.xac_nhan_trung,
    ))


@router.get("/nha-cung-cap/{id_ncc}", summary="Chi tiết nhà cung cấp", response_model=PhanHoi)
def lay_ncc(id_ncc: str, request: Request):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "ncc", "xem")
    return thanh_cong(catalog_service.lay_nha_cung_cap(id_ncc))


@router.patch("/nha-cung-cap/{id_ncc}", summary="Sửa nhà cung cấp", response_model=PhanHoi)
def sua_ncc(id_ncc: str, body: SuaNhaCungCapBody, request: Request):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "ncc", "sua")
    ho_so = lay_ho_so(request)
    if ho_so.get("vai_tro") not in ("ADMIN", "TBP_MUA_HANG", "NV_MUA_HANG"):
        raise KhongCoQuyen("Chỉ bộ phận Mua hàng được sửa hồ sơ NCC.")
    if "da_phe_duyet" in body.model_fields_set and ho_so.get("vai_tro") not in ("ADMIN", "TBP_MUA_HANG"):
        raise KhongCoQuyen("Chỉ Trưởng bộ phận Mua hàng được đổi trạng thái phê duyệt BM03.")
    hien_tai = catalog_service.lay_nha_cung_cap(id_ncc)
    if hien_tai.get("trang_thai_xet_duyet") == "DE_XUAT" and (
        body.trang_thai not in (None, "TAM_NGUNG") or body.da_phe_duyet is True
    ):
        raise KhongCoQuyen("Hãy duyệt đề xuất NCC trước khi kích hoạt hoặc đưa vào BM03.")
    return thanh_cong(catalog_service.cap_nhat_nha_cung_cap(
        id_ncc, _du_lieu(body, {"phien_ban", "xac_nhan_trung"}, True),
        body.phien_ban, ho_so["ma_nhan_vien"], body.xac_nhan_trung,
    ))


class MatHangNccBody(BaseModel):
    id_ncc: str | None = None
    ma_vat_tu: str | None = None
    ten_hang: str
    loai: str
    nhom_hang_chinh: str | None = None
    nhom_hang_chi_tiet: str | None = None
    ma_loai_gia_cong: str | None = None
    ma_cong_doan: str | None = None
    dvt: str
    thong_so_ky_thuat: str | None = None
    diem_ky_thuat: Decimal | None = None
    muc_chat_luong: str | None = None
    diem_chat_luong: Decimal | None = None
    nang_luc_thang: Decimal | None = None
    so_ngay_giao_chuan: int | None = None
    trang_thai: str = "DE_XUAT"
    nguoi_de_xuat: str | None = None
    ngay_de_xuat: date | None = None
    ghi_chu: str | None = None


class SuaMatHangNccBody(MatHangNccBody):
    phien_ban: int = Field(ge=1)


class DuyetMatHangNccBody(BaseModel):
    phien_ban: int = Field(ge=1)
    trang_thai: str = "DA_DUYET"


@router.get("/mat-hang-ncc", summary="Danh sách mặt hàng theo nhà cung cấp", response_model=PhanHoi)
def danh_sach_mat_hang_ncc(
    request: Request, id_ncc: str | None = None, q: str = "", loai: str | None = None,
    nhom_hang_chinh: str | None = None, nhom_hang_chi_tiet: str | None = None,
    ma_loai_gia_cong: str | None = None, muc_chat_luong: str | None = None,
    trang_thai: str | None = None, trang: int = 1, kich_thuoc: int = 100,
):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "ncc", "xem")
    return thanh_cong(catalog_service.danh_sach_mat_hang_ncc(
        id_ncc,
        {"q": q, "loai": loai, "nhom_hang_chinh": nhom_hang_chinh,
         "nhom_hang_chi_tiet": nhom_hang_chi_tiet, "ma_loai_gia_cong": ma_loai_gia_cong,
         "muc_chat_luong": muc_chat_luong, "trang_thai": trang_thai},
        trang, kich_thuoc,
    ))


@router.get("/mat-hang-ncc/{id_mat_hang}", summary="Chi tiết mặt hàng của nhà cung cấp", response_model=PhanHoi)
def lay_mat_hang_ncc(id_mat_hang: str, request: Request):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "ncc", "xem")
    return thanh_cong(catalog_service.lay_mat_hang_ncc(id_mat_hang))


@router.post("/nha-cung-cap/{id_ncc}/mat-hang", summary="Thêm mặt hàng cho nhà cung cấp", response_model=PhanHoi)
def tao_mat_hang_ncc(id_ncc: str, body: MatHangNccBody, request: Request):
    ho_so = lay_ho_so(request)
    phan_quyen_service.kiem_quyen(ho_so, "ncc", "sua")
    return thanh_cong(catalog_service.tao_mat_hang_ncc(
        {**_du_lieu(body, set()), "id_ncc": id_ncc, "nguoi_de_xuat": ho_so["ma_nhan_vien"]},
        ho_so["ma_nhan_vien"],
    ))


@router.patch("/mat-hang-ncc/{id_mat_hang}", summary="Sửa mặt hàng của nhà cung cấp", response_model=PhanHoi)
def sua_mat_hang_ncc(id_mat_hang: str, body: SuaMatHangNccBody, request: Request):
    ho_so = lay_ho_so(request)
    phan_quyen_service.kiem_quyen(ho_so, "ncc", "sua")
    return thanh_cong(catalog_service.cap_nhat_mat_hang_ncc(
        id_mat_hang, _du_lieu(body, {"phien_ban"}, True), body.phien_ban, ho_so["ma_nhan_vien"],
    ))


@router.post("/mat-hang-ncc/{id_mat_hang}/duyet", summary="Duyệt mặt hàng nhà cung cấp", response_model=PhanHoi)
def duyet_mat_hang_ncc(id_mat_hang: str, body: DuyetMatHangNccBody, request: Request):
    ho_so = lay_ho_so(request)
    phan_quyen_service.kiem_quyen(ho_so, "ncc", "duyet")
    return thanh_cong(catalog_service.duyet_mat_hang_ncc(
        id_mat_hang, body.phien_ban, ho_so["ma_nhan_vien"], body.trang_thai,
    ))


class TaoDanhGiaNccBody(BaseModel):
    id_mat_hang_ncc: str
    loai: str = "DINH_KY"
    ky_danh_gia: str | None = None
    ngay_danh_gia: date | None = None
    diem_gia_ca: Decimal | None = None
    diem_tam_voc: Decimal | None = None
    diem_thanh_toan: Decimal | None = None
    diem_dich_vu: Decimal | None = None
    ghi_chu: str | None = None


class DuyetDanhGiaNccBody(BaseModel):
    phien_ban: int = Field(ge=1)
    trang_thai: str = "DA_DUYET"


@router.get("/danh-gia-ncc", summary="Danh sách đánh giá NCC theo mặt hàng", response_model=PhanHoi)
def danh_sach_danh_gia_ncc(
    request: Request, id_mat_hang: str | None = None, trang_thai: str | None = None,
    trang: int = 1, kich_thuoc: int = 100,
):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "ncc", "xem")
    return thanh_cong(catalog_service.danh_sach_danh_gia_ncc(id_mat_hang, trang_thai, trang, kich_thuoc))


@router.get("/danh-gia-ncc/den-han", summary="Danh sách mặt hàng đến hạn đánh giá", response_model=PhanHoi)
def danh_sach_mat_hang_ncc_den_han(request: Request, trang: int = 1, kich_thuoc: int = 100):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "ncc", "xem")
    return thanh_cong(catalog_service.danh_sach_mat_hang_ncc_den_han(trang, kich_thuoc))


@router.get("/so-theo-doi-ncc", summary="Sổ theo dõi sự cố chất lượng NCC", response_model=PhanHoi)
def danh_sach_so_theo_doi_ncc(
    request: Request, id_ncc: str | None = None, trang_thai: str | None = None,
    q: str = "", trang: int = 1, kich_thuoc: int = 100,
):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "ncc", "xem")
    return thanh_cong(catalog_service.danh_sach_so_theo_doi_ncc(
        id_ncc, trang_thai, q, trang, kich_thuoc,
    ))


@router.post("/danh-gia-ncc", summary="Tạo bảng đánh giá NCC theo mặt hàng", response_model=PhanHoi)
def tao_danh_gia_ncc(body: TaoDanhGiaNccBody, request: Request):
    ho_so = lay_ho_so(request)
    phan_quyen_service.kiem_quyen(ho_so, "ncc", "sua")
    return thanh_cong(catalog_service.tao_danh_gia_ncc(
        _du_lieu(body), ho_so["ma_nhan_vien"],
    ))


@router.post("/danh-gia-ncc/{id_danh_gia}/duyet", summary="Duyệt bảng đánh giá NCC", response_model=PhanHoi)
def duyet_danh_gia_ncc(id_danh_gia: str, body: DuyetDanhGiaNccBody, request: Request):
    ho_so = lay_ho_so(request)
    phan_quyen_service.kiem_quyen(ho_so, "ncc", "duyet")
    return thanh_cong(catalog_service.duyet_danh_gia_ncc(
        id_danh_gia, body.phien_ban, body.trang_thai, ho_so["ma_nhan_vien"],
    ))


class KiemTraDinhMucNccBody(BaseModel):
    gia_tri_don: Decimal = Field(ge=0)
    ngay_dat: date | None = None


@router.post("/nha-cung-cap/{id_ncc}/kiem-tra-dinh-muc", summary="Kiểm tra định mức đặt hàng tháng NCC", response_model=PhanHoi)
def kiem_tra_dinh_muc_ncc(id_ncc: str, body: KiemTraDinhMucNccBody, request: Request):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "ncc", "xem")
    return thanh_cong(catalog_service.kiem_tra_dinh_muc_ncc(id_ncc, body.gia_tri_don, body.ngay_dat))


@router.post("/de-xuat-mat-hang-ncc", summary="Đề xuất thêm mặt hàng cho NCC", response_model=PhanHoi)
def de_xuat_mat_hang_ncc(body: MatHangNccBody, request: Request):
    ho_so = lay_ho_so(request)
    # Mọi bộ phận được đề xuất, nhưng chỉ người có quyền duyệt NCC mới đưa vào hiệu lực.
    phan_quyen_service.kiem_quyen(ho_so, "ncc", "xem")
    du_lieu = {**_du_lieu(body), "trang_thai": "DE_XUAT", "nguoi_de_xuat": ho_so["ma_nhan_vien"]}
    return thanh_cong(catalog_service.tao_mat_hang_ncc(du_lieu, ho_so["ma_nhan_vien"]))
