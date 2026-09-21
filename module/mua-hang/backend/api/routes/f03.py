from datetime import date
from typing import Any
from fastapi import APIRouter, Query, Request
from pydantic import BaseModel, Field

from backend.api.envelope import thanh_cong
from backend.api.middleware import lay_ho_so
from backend.services import f03_service

router = APIRouter()


class PhanHoi(BaseModel):
    ok: bool
    data: Any = None
    error: str | None = None
    ma_loi: str | None = None


class TaoYCBGIn(BaseModel):
    id_ncc: str
    ids_dong: list[str] = Field(min_length=1)
    han_tra_loi: date | None = None


class BaoGiaDongIn(BaseModel):
    id_de_nghi_dong: str
    don_gia_co_so: int = Field(ge=0)
    don_vi_gia: str = "PCS"
    trong_luong: float | None = Field(default=None, gt=0)
    thoi_gian_giao: int | None = Field(default=None, ge=0)
    ghi_chu: str | None = None


class NhapBaoGiaIn(BaseModel):
    id_ycbg: str
    id_ncc: str
    ngay_bao_gia: date | None = None
    hieu_luc_den: date | None = None
    dieu_kien_thanh_toan: str | None = None
    thoi_gian_giao: int | None = Field(default=None, ge=0)
    dong: list[BaoGiaDongIn] = Field(min_length=1)


class ChonBaoGiaIn(BaseModel):
    phien_ban: int
    ly_do_chon: str | None = None


class MienTruIn(BaseModel):
    phien_ban: int
    ly_do: str = Field(min_length=1)


@router.get("/de-nghi-dong/cho-bao-gia", response_model=PhanHoi)
def cho_bao_gia(request: Request):
    return thanh_cong(f03_service.dong_cho_bao_gia(lay_ho_so(request)))


@router.post("/yeu-cau-bao-gia", response_model=PhanHoi)
def tao_ycbg(body: TaoYCBGIn, request: Request):
    return thanh_cong(f03_service.tao_yeu_cau_bao_gia(body.id_ncc, body.ids_dong, body.han_tra_loi, lay_ho_so(request)))


@router.get("/yeu-cau-bao-gia", response_model=PhanHoi)
def danh_sach_ycbg(request: Request):
    return thanh_cong(f03_service.danh_sach_ycbg(lay_ho_so(request)))


@router.get("/yeu-cau-bao-gia/{id_ycbg}", response_model=PhanHoi)
def chi_tiet_ycbg(id_ycbg: str, request: Request):
    return thanh_cong(f03_service.chi_tiet_ycbg(id_ycbg, lay_ho_so(request)))


@router.post("/bao-gia", response_model=PhanHoi)
def nhap_bao_gia(body: NhapBaoGiaIn, request: Request):
    return thanh_cong(f03_service.nhap_bao_gia(body.model_dump(), lay_ho_so(request)))


@router.get("/bao-gia/so-sanh", response_model=PhanHoi)
def so_sanh(request: Request, ids_dong: list[str] = Query(min_length=1)):
    return thanh_cong(f03_service.so_sanh(ids_dong, lay_ho_so(request)))


@router.post("/bao-gia/{id_bao_gia}/chon", response_model=PhanHoi)
def chon_bao_gia(id_bao_gia: str, body: ChonBaoGiaIn, request: Request):
    return thanh_cong(f03_service.chon_bao_gia(id_bao_gia, body.ly_do_chon, body.phien_ban, lay_ho_so(request)))


@router.post("/bao-gia/{id_bao_gia}/mien-tru", response_model=PhanHoi)
def mien_tru(id_bao_gia: str, body: MienTruIn, request: Request):
    return thanh_cong(f03_service.mien_tru_bao_gia(id_bao_gia, body.ly_do, body.phien_ban, lay_ho_so(request)))


@router.get("/bao-gia/lich-su-gia", response_model=PhanHoi)
def lich_su_gia(id_vat_tu: str, request: Request):
    return thanh_cong(f03_service.lich_su_gia(id_vat_tu, lay_ho_so(request)))
