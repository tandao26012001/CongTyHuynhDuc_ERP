from datetime import date
from decimal import Decimal
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Header, Request
from pydantic import BaseModel, Field

from backend.api.envelope import thanh_cong
from backend.api.middleware import lay_ho_so
from backend.services import catalog_service, phan_quyen_service
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
    ma_ncc: str
    ten: str
    mst: str | None = None
    dia_chi: str | None = None
    nguoi_lien_he: str | None = None
    sdt: str | None = None
    sdt_2: str | None = None
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
    sdt_2: str | None = None
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
    return thanh_cong(catalog_service.tao_nha_cung_cap(
        _du_lieu(body, {"xac_nhan_trung"}), ho_so["ma_nhan_vien"],
        ho_so["ma_tai_khoan"], str(khoa), body.xac_nhan_trung,
    ))


@router.get("/nha-cung-cap/{id_ncc}", summary="Chi tiết nhà cung cấp", response_model=PhanHoi)
def lay_ncc(id_ncc: str, request: Request):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "ncc", "xem")
    return thanh_cong(catalog_service.lay_nha_cung_cap(id_ncc))


@router.patch("/nha-cung-cap/{id_ncc}", summary="Sửa nhà cung cấp", response_model=PhanHoi)
def sua_ncc(id_ncc: str, body: SuaNhaCungCapBody, request: Request):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "ncc", "sua")
    ho_so = lay_ho_so(request)
    return thanh_cong(catalog_service.cap_nhat_nha_cung_cap(
        id_ncc, _du_lieu(body, {"phien_ban", "xac_nhan_trung"}, True),
        body.phien_ban, ho_so["ma_nhan_vien"], body.xac_nhan_trung,
    ))
