from typing import Any

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from backend.api.envelope import thanh_cong
from backend.api.middleware import lay_ho_so
from backend.services import phan_quyen_service

router = APIRouter()


class PhanHoi(BaseModel):
    ok: bool
    data: Any = None
    error: str | None = None
    ma_loi: str | None = None


class DuyetBody(BaseModel):
    vai_tro: str = Field(min_length=1, max_length=40)
    phien_ban: int = Field(ge=1)


class KhoaBody(BaseModel):
    phien_ban: int = Field(ge=1)


@router.get("/tai-khoan", summary="Danh sách tài khoản", response_model=PhanHoi)
def danh_sach(request: Request, trang: int = 1, kich_thuoc: int = 20):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "quan_tri", "xem")
    return thanh_cong(phan_quyen_service.danh_sach_tai_khoan(trang, kich_thuoc))


@router.post("/tai-khoan/{ma}/duyet", summary="Duyệt và gán vai trò", response_model=PhanHoi)
def duyet(ma: str, body: DuyetBody, request: Request):
    ho_so = lay_ho_so(request)
    phan_quyen_service.kiem_quyen(ho_so, "quan_tri", "sua")
    phan_quyen_service.duyet_tai_khoan(ma, body.vai_tro, body.phien_ban, ho_so["ma_nhan_vien"])
    return thanh_cong({"ma_tai_khoan": ma, "trang_thai": "HOAT_DONG"})


@router.post("/tai-khoan/{ma}/khoa", summary="Khóa tài khoản", response_model=PhanHoi)
def khoa(ma: str, body: KhoaBody, request: Request):
    ho_so = lay_ho_so(request)
    phan_quyen_service.kiem_quyen(ho_so, "quan_tri", "sua")
    phan_quyen_service.khoa_tai_khoan(
        ma, body.phien_ban, ho_so["ma_nhan_vien"], ho_so["ma_tai_khoan"]
    )
    return thanh_cong({"ma_tai_khoan": ma, "trang_thai": "KHOA"})
