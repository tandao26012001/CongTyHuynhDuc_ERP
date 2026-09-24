"""API luồng Kinh doanh Đặt ngoài."""

from datetime import date
from decimal import Decimal
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Header, Request
from pydantic import BaseModel, Field

from backend.api.envelope import thanh_cong
from backend.api.middleware import lay_ho_so
from backend.services import dat_ngoai_service

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


class TaoBaoGiaIn(BaseModel):
    ma_vach: list[str] = Field(min_length=1)
    can_xac_nhan_ky_thuat: bool = False
    noi_dung_ky_thuat: str | None = None
    ghi_chu: str | None = None


class GiaDongIn(BaseModel):
    id: str
    don_gia: int = Field(ge=0)
    ghi_chu: str | None = None


class CapNhatBaoGiaIn(BaseModel):
    phien_ban: int = Field(ge=1)
    ten_ncc: str = Field(min_length=1, max_length=200)
    ky_han: date | None = None
    ghi_chu: str | None = None
    dong: list[GiaDongIn] = Field(min_length=1)


class ChuyenTrangThaiIn(BaseModel):
    phien_ban: int = Field(ge=1)
    trang_thai: str
    noi_dung: str | None = None


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
def tao_bao_gia(body: TaoBaoGiaIn, request: Request):
    return thanh_cong(dat_ngoai_service.tao_bao_gia(
        body.ma_vach, body.can_xac_nhan_ky_thuat, body.noi_dung_ky_thuat,
        body.ghi_chu, lay_ho_so(request)
    ))


@router.get('/dat-ngoai', summary='Danh sách phiếu theo luồng đặt ngoài', response_model=PhanHoi)
def danh_sach(request: Request):
    return thanh_cong(dat_ngoai_service.danh_sach(lay_ho_so(request)))


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
