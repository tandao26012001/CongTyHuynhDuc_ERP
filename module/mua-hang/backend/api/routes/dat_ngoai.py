"""API luồng Kinh doanh Đặt ngoài."""

from datetime import date
from decimal import Decimal
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Header, Request
from pydantic import BaseModel, Field

from backend.api.envelope import thanh_cong
from backend.api.middleware import lay_ho_so
from backend.services import dat_ngoai_service, dat_ngoai_chi_tiet_service

router = APIRouter()


class PhanHoi(BaseModel):
    ok: bool
    data: Any = None
    error: str | None = None
    ma_loi: str | None = None


class DongLsxIn(BaseModel):
    lenh_san_xuat: str = Field(min_length=1, max_length=60)
    ma_vach: str = Field(min_length=1, max_length=40)
    ma_hang: str = Field(min_length=1, max_length=60)
    ten_hang: str = Field(min_length=1, max_length=300)
    so_luong: Decimal = Field(gt=0)
    dvt: str = Field(min_length=1, max_length=20)
    so_po: str | None = None
    ma_khach_hang: str | None = None
    ten_khach_hang_chup: str | None = Field(default=None, max_length=300)
    ma_bo_phan: str | None = Field(default=None, max_length=20)
    ten_bo_phan_chup: str | None = Field(default=None, max_length=300)
    ki_han_khach_hang: date | None = None
    ngay_nhan_lenh: date | None = None
    so_so: str | None = Field(default=None, max_length=60)
    ngay_so: date | None = None
    trang_thai_don: str | None = Field(default=None, max_length=30)
    muc_do_uu_tien: int | None = Field(default=None, ge=1, le=3)
    ma_cong_doan: str | None = Field(default=None, max_length=20)
    ma_ban_ve: str | None = Field(default=None, max_length=60)
    ghi_chu: str | None = None
    ghi_chu_dong: str | None = None


class NhapLsxIn(BaseModel):
    rows: list[dict[str, Any]] = Field(min_length=1, max_length=500)


class ChiTietDongIn(BaseModel):
    ma_vach: str = Field(min_length=1, max_length=40)
    can_xac_nhan_ky_thuat: bool | None = None
    noi_dung_can_xac_nhan_kt: str | None = None
    noi_dung_gia_cong: str = Field(min_length=1)
    yeu_cau_ky_thuat: str = Field(min_length=1)
    yeu_cau_chat_luong: str = Field(min_length=1)


class TaoBaoGiaIn(BaseModel):
    ma_vach: list[str] = Field(min_length=1)
    chi_tiet_dong: list[ChiTietDongIn] = Field(min_length=1)
    can_xac_nhan_ky_thuat: bool = False
    noi_dung_ky_thuat: str | None = None
    ghi_chu: str | None = None


class GiaDongIn(BaseModel):
    id: str
    id_ncc: str = Field(min_length=1, max_length=20)
    don_gia: int = Field(ge=0)
    ky_han: date | None = None
    ghi_chu: str | None = None


class CapNhatBaoGiaIn(BaseModel):
    phien_ban: int = Field(ge=1)
    ghi_chu: str | None = None
    dong: list[GiaDongIn] = Field(min_length=1)


class ChuyenTrangThaiIn(BaseModel):
    phien_ban: int = Field(ge=1)
    trang_thai: str
    noi_dung: str | None = None


class SuaDongDatNgoaiIn(BaseModel):
    phien_ban: int = Field(ge=1)
    noi_dung_gia_cong: str = Field(min_length=1)
    yeu_cau_ky_thuat: str = Field(min_length=1)
    yeu_cau_chat_luong: str = Field(min_length=1)
    ngay_khach_yeu_cau: date | None = None
    ngay_ncc_cam_ket: date | None = None
    ngay_du_kien_noi_bo: date | None = None
    ma_hang_thay_the: str | None = Field(default=None, max_length=60)
    id_su_co: str | None = Field(default=None, max_length=24)
    ly_do_doi_han: str | None = None


class XacNhanKtDongIn(BaseModel):
    noi_dung: str = Field(min_length=1)
    id_yeu_cau: str | None = Field(default=None, min_length=1, max_length=24)


class YeuCauKtDongIn(BaseModel):
    noi_dung: str = Field(min_length=1)


class DotGiaoIn(BaseModel):
    dot_so: int = Field(ge=1)
    so_luong: Decimal = Field(gt=0)
    ngay_du_kien: date
    ghi_chu: str | None = None


class NhanDotGiaoIn(BaseModel):
    phien_ban: int = Field(ge=1)
    ngay_thuc_te: date


class SuaDotGiaoIn(BaseModel):
    phien_ban: int = Field(ge=1)
    ngay_du_kien: date
    ly_do: str = Field(min_length=1)


@router.post('/dat-ngoai/nhap-lsx', summary='Kinh doanh nạp LSX và mã hàng từ Excel', response_model=PhanHoi)
def nhap_lsx(
    body: NhapLsxIn, request: Request,
    _: UUID = Header(alias="X-Idempotency-Key"),
):
    return thanh_cong(dat_ngoai_service.nhap_lsx(body.rows, lay_ho_so(request)))


@router.get('/dat-ngoai/lsx', summary='Danh sách LSX và mã hàng để lập báo giá', response_model=PhanHoi)
def danh_sach_lsx(request: Request, q: str = ''):
    return thanh_cong(dat_ngoai_service.danh_sach_lsx(q, lay_ho_so(request)))


@router.post('/dat-ngoai', summary='Lập phiếu báo giá từ các mã hàng đã chọn', response_model=PhanHoi)
def tao_bao_gia(body: TaoBaoGiaIn, request: Request,
                khoa: UUID = Header(alias='X-Idempotency-Key')):
    return thanh_cong(dat_ngoai_service.tao_bao_gia(
        body.ma_vach, [item.model_dump() for item in body.chi_tiet_dong],
        body.can_xac_nhan_ky_thuat, body.noi_dung_ky_thuat,
        body.ghi_chu, lay_ho_so(request), str(khoa)
    ))


@router.get('/dat-ngoai', summary='Danh sách phiếu theo luồng đặt ngoài', response_model=PhanHoi)
def danh_sach(request: Request):
    return thanh_cong(dat_ngoai_service.danh_sach(lay_ho_so(request)))


@router.get('/dat-ngoai/nha-cung-cap', summary='Danh sách nhà cung cấp gia công để chọn theo mã hàng', response_model=PhanHoi)
def danh_sach_nha_cung_cap_dat_ngoai(request: Request):
    return thanh_cong(dat_ngoai_service.nha_cung_cap_co_the_chon(lay_ho_so(request)))


@router.get('/dat-ngoai/hang-doi-ky-thuat', summary='Phiếu đặt ngoài chờ kỹ thuật xác nhận', response_model=PhanHoi)
def hang_doi_ky_thuat(request: Request):
    return thanh_cong(dat_ngoai_service.hang_doi_xac_nhan_ky_thuat(lay_ho_so(request)))


class DocThongBaoKyThuatIn(BaseModel):
    dau_yeu_cau: str = Field(min_length=64, max_length=64)


@router.patch('/dat-ngoai/{id_phieu}/thong-bao/da-doc', response_model=PhanHoi)
def doc_thong_bao_ky_thuat(id_phieu: str, body: DocThongBaoKyThuatIn, request: Request):
    return thanh_cong(dat_ngoai_service.doc_thong_bao_ky_thuat(
        id_phieu, body.dau_yeu_cau, lay_ho_so(request)))


@router.patch('/dat-ngoai/{id_phieu}/bao-gia', summary='Điền báo giá và chuyển chờ duyệt', response_model=PhanHoi)
def cap_nhat_bao_gia(id_phieu: str, body: CapNhatBaoGiaIn, request: Request):
    return thanh_cong(dat_ngoai_service.cap_nhat_bao_gia(
        id_phieu, body.phien_ban, body.model_dump(exclude={'phien_ban'}), lay_ho_so(request)
    ))


@router.post('/dat-ngoai/{id_phieu}/chuyen-trang-thai', summary='Chuyển bước xử lý đặt ngoài', response_model=PhanHoi)
def chuyen_trang_thai(id_phieu: str, body: ChuyenTrangThaiIn, request: Request):
    return thanh_cong(dat_ngoai_service.chuyen_trang_thai(
        id_phieu, body.phien_ban, body.trang_thai, body.noi_dung, lay_ho_so(request)
    ))


@router.get('/dat-ngoai/{id_phieu}/dong/{id_dong}', response_model=PhanHoi)
def chi_tiet_dong(id_phieu: str, id_dong: str, request: Request):
    return thanh_cong(dat_ngoai_chi_tiet_service.chi_tiet(id_phieu, id_dong, lay_ho_so(request)))


@router.patch('/dat-ngoai/{id_phieu}/dong/{id_dong}', response_model=PhanHoi)
def sua_dong(id_phieu: str, id_dong: str, body: SuaDongDatNgoaiIn, request: Request):
    return thanh_cong(dat_ngoai_chi_tiet_service.sua_dong(
        id_phieu, id_dong, body.model_dump(), lay_ho_so(request)))


@router.post('/dat-ngoai/{id_phieu}/dong/{id_dong}/xac-nhan-kt', response_model=PhanHoi)
def them_xac_nhan_kt(id_phieu: str, id_dong: str, body: XacNhanKtDongIn,
                     request: Request, khoa: UUID = Header(alias='X-Idempotency-Key')):
    return thanh_cong(dat_ngoai_chi_tiet_service.them_xac_nhan(
        id_phieu, id_dong, body.model_dump(), lay_ho_so(request), str(khoa)))


@router.post('/dat-ngoai/{id_phieu}/dong/{id_dong}/yeu-cau-kt', response_model=PhanHoi)
def them_yeu_cau_kt(id_phieu: str, id_dong: str, body: YeuCauKtDongIn,
                    request: Request, khoa: UUID = Header(alias='X-Idempotency-Key')):
    return thanh_cong(dat_ngoai_chi_tiet_service.them_yeu_cau_ky_thuat(
        id_phieu, id_dong, body.model_dump(), lay_ho_so(request), str(khoa)))


@router.post('/dat-ngoai/{id_phieu}/dong/{id_dong}/dot-giao', response_model=PhanHoi)
def them_dot_giao(id_phieu: str, id_dong: str, body: DotGiaoIn,
                  request: Request, khoa: UUID = Header(alias='X-Idempotency-Key')):
    return thanh_cong(dat_ngoai_chi_tiet_service.them_dot_giao(
        id_phieu, id_dong, body.model_dump(), lay_ho_so(request), str(khoa)))


@router.patch('/dat-ngoai/{id_phieu}/dong/{id_dong}/dot-giao/{id_dot}', response_model=PhanHoi)
def nhan_dot_giao(id_phieu: str, id_dong: str, id_dot: str,
                  body: NhanDotGiaoIn, request: Request):
    return thanh_cong(dat_ngoai_chi_tiet_service.nhan_dot_giao(
        id_phieu, id_dong, id_dot, body.phien_ban, body.ngay_thuc_te,
        lay_ho_so(request)))


@router.patch('/dat-ngoai/{id_phieu}/dong/{id_dong}/dot-giao/{id_dot}/lich',
              summary='Điều chỉnh ngày dự kiến một đợt giao', response_model=PhanHoi)
def sua_ngay_du_kien_dot_giao(id_phieu: str, id_dong: str, id_dot: str,
                              body: SuaDotGiaoIn, request: Request):
    return thanh_cong(dat_ngoai_chi_tiet_service.sua_dot_giao(
        id_phieu, id_dong, id_dot, body.model_dump(), lay_ho_so(request)))
