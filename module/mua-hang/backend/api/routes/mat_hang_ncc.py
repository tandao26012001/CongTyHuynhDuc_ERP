"""API mat hang nha cung cap theo F1."""

from decimal import Decimal
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Header, Request
from pydantic import BaseModel, Field

from backend.api.envelope import thanh_cong
from backend.api.middleware import lay_ho_so
from backend.services import mat_hang_ncc_service, danh_gia_mat_hang_service

router = APIRouter()


class PhanHoi(BaseModel):
    ok: bool
    data: Any = None
    error: str | None = None
    ma_loi: str | None = None


class MatHangIn(BaseModel):
    id_ncc: str = Field(min_length=1, max_length=20)
    ma_vat_tu: str | None = None
    ten_hang: str = Field(min_length=1, max_length=300)
    loai: str = Field(pattern="^(HANG_HOA|GIA_CONG)$")
    nhom_hang_chinh: str | None = None
    nhom_hang_chi_tiet: str | None = None
    ma_loai_gia_cong: str | None = None
    ma_cong_doan: str | None = None
    dvt: str = Field(min_length=1, max_length=20)
    thong_so_ky_thuat: str | None = None
    diem_ky_thuat: Decimal | None = Field(default=None, ge=0, le=10)
    muc_chat_luong: str | None = Field(default=None, pattern="^(ON_DINH|DAO_DONG|HAY_LOI|CHUA_DANH_GIA)$")
    diem_chat_luong: Decimal | None = Field(default=None, ge=0, le=10)
    nang_luc_thang: Decimal | None = Field(default=None, ge=0)
    so_ngay_giao_chuan: int | None = Field(default=None, ge=0)


class DuyetIn(BaseModel):
    phien_ban: int = Field(ge=1)


class MatHangSuaIn(MatHangIn):
    phien_ban: int = Field(ge=1)


@router.patch('/mat-hang-ncc/{id_mat_hang}', summary='Sửa hồ sơ nhóm cung cấp NCC', response_model=PhanHoi)
def sua(id_mat_hang: str, body: MatHangSuaIn, request: Request):
    return thanh_cong(mat_hang_ncc_service.sua(id_mat_hang, body.model_dump(), lay_ho_so(request)))


@router.get('/mat-hang-ncc/{id_mat_hang}/lich-su', summary='Lịch sử nhóm cung cấp NCC', response_model=PhanHoi)
def lich_su(id_mat_hang: str, request: Request):
    return thanh_cong(mat_hang_ncc_service.lich_su(id_mat_hang, lay_ho_so(request)))


class DinhMucIn(BaseModel):
    phien_ban: int = Field(ge=1)
    dinh_muc_thang: int | None = Field(default=None, ge=0)
    ghi_chu_dinh_muc: str | None = None


class DeXuatNccIn(BaseModel):
    ten: str = Field(min_length=1, max_length=300)
    mst: str | None = None
    dia_chi: str | None = None
    nguoi_lien_he: str | None = None
    sdt: str | None = None
    email: str | None = None
    la_ncc_mua_hang: bool = True
    la_ncc_gia_cong: bool = False
    ghi_chu: str | None = None
    xac_nhan_trung: bool = False


class DanhGiaIn(BaseModel):
    diem_gia_ca: Decimal = Field(ge=0, le=10)
    diem_tam_voc: Decimal = Field(ge=0, le=10)
    diem_thanh_toan: Decimal = Field(ge=0, le=10)
    diem_dich_vu: Decimal = Field(ge=0, le=10)
    ghi_chu: str | None = None


@router.get("/mat-hang-ncc/danh-muc", summary="Danh mục chuẩn để phân loại mặt hàng NCC", response_model=PhanHoi)
def danh_muc_phan_loai(request: Request):
    return thanh_cong(mat_hang_ncc_service.danh_muc_phan_loai(lay_ho_so(request)))


@router.get("/mat-hang-ncc", summary="Danh sách mặt hàng theo nhà cung cấp", response_model=PhanHoi)
def danh_sach(request: Request, id_ncc: str | None = None, q: str = "", trang_thai: str | None = None,
              nhom_hang_chinh: str | None = None, nhom_hang_chi_tiet: str | None = None,
              ma_loai_gia_cong: str | None = None, muc_chat_luong: str | None = None):
    filters = dict(nhom_hang_chinh=nhom_hang_chinh, nhom_hang_chi_tiet=nhom_hang_chi_tiet,
                   ma_loai_gia_cong=ma_loai_gia_cong, muc_chat_luong=muc_chat_luong)
    return thanh_cong(mat_hang_ncc_service.danh_sach(id_ncc, q, trang_thai, lay_ho_so(request), filters))


@router.post("/mat-hang-ncc", summary="Khai mặt hàng hoặc đề xuất mặt hàng NCC", response_model=PhanHoi)
def tao(body: MatHangIn, request: Request, khoa: UUID = Header(alias="X-Idempotency-Key")):
    return thanh_cong(mat_hang_ncc_service.tao(body.model_dump(), lay_ho_so(request), str(khoa)))


@router.post("/mat-hang-ncc/{id_mat_hang}/duyet", summary="Duyệt mặt hàng NCC", response_model=PhanHoi)
def duyet(id_mat_hang: str, body: DuyetIn, request: Request):
    return thanh_cong(mat_hang_ncc_service.duyet(id_mat_hang, body.phien_ban, lay_ho_so(request)))


@router.get("/nha-cung-cap/{id_ncc}/dinh-muc", summary="Định mức đặt hàng tháng của NCC", response_model=PhanHoi)
def lay_dinh_muc(id_ncc: str, request: Request):
    return thanh_cong(mat_hang_ncc_service.lay_dinh_muc(id_ncc, lay_ho_so(request)))


@router.patch("/nha-cung-cap/{id_ncc}/dinh-muc", summary="Đặt định mức tháng cho NCC", response_model=PhanHoi)
def dat_dinh_muc(id_ncc: str, body: DinhMucIn, request: Request):
    return thanh_cong(mat_hang_ncc_service.dat_dinh_muc(
        id_ncc, body.phien_ban, body.dinh_muc_thang,
        body.ghi_chu_dinh_muc, lay_ho_so(request),
    ))


@router.post("/nha-cung-cap/de-xuat", summary="Đề xuất nhà cung cấp mới", response_model=PhanHoi)
def de_xuat_ncc(body: DeXuatNccIn, request: Request, khoa: UUID = Header(alias="X-Idempotency-Key")):
    du_lieu = body.model_dump(exclude={"xac_nhan_trung"})
    return thanh_cong(mat_hang_ncc_service.de_xuat_ncc(
        du_lieu, lay_ho_so(request), str(khoa), body.xac_nhan_trung,
    ))


@router.post("/nha-cung-cap/{id_ncc}/duyet-de-xuat", summary="Mua hàng duyệt đề xuất NCC", response_model=PhanHoi)
def duyet_de_xuat_ncc(id_ncc: str, body: DuyetIn, request: Request):
    return thanh_cong(mat_hang_ncc_service.duyet_de_xuat_ncc(
        id_ncc, body.phien_ban, lay_ho_so(request),
    ))


@router.get('/mat-hang-ncc/{id_mat_hang}/nguon-diem', response_model=PhanHoi)
def nguon_diem(id_mat_hang: str, request: Request):
    return thanh_cong(danh_gia_mat_hang_service.xem_nguon(id_mat_hang, lay_ho_so(request)))


@router.get('/mat-hang-ncc/{id_mat_hang}/danh-gia', response_model=PhanHoi)
def danh_sach_danh_gia(id_mat_hang: str, request: Request):
    return thanh_cong(danh_gia_mat_hang_service.danh_sach(id_mat_hang, lay_ho_so(request)))


@router.post('/mat-hang-ncc/{id_mat_hang}/danh-gia', response_model=PhanHoi)
def tao_danh_gia(id_mat_hang: str, body: DanhGiaIn, request: Request,
                 khoa: UUID = Header(alias='X-Idempotency-Key')):
    return thanh_cong(danh_gia_mat_hang_service.tao(
        id_mat_hang, body.model_dump(), lay_ho_so(request), str(khoa)))


@router.post('/danh-gia-ncc/{id_danh_gia}/duyet', response_model=PhanHoi)
def duyet_danh_gia(id_danh_gia: str, body: DuyetIn, request: Request):
    return thanh_cong(danh_gia_mat_hang_service.duyet(
        id_danh_gia, body.phien_ban, lay_ho_so(request)))


@router.get('/nha-cung-cap/danh-gia-den-han', response_model=PhanHoi)
def danh_gia_den_han(request: Request):
    return thanh_cong(mat_hang_ncc_service.danh_gia_den_han(lay_ho_so(request)))


@router.get('/nha-cung-cap/so-bm08', response_model=PhanHoi)
def so_theo_doi_bm08(request: Request):
    return thanh_cong(mat_hang_ncc_service.so_theo_doi_bm08(lay_ho_so(request)))
