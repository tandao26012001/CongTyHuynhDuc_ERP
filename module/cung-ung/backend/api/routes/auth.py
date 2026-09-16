from typing import Any

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from backend.api.envelope import thanh_cong
from backend.services import auth_service

router = APIRouter()


class PhanHoi(BaseModel):
    ok: bool
    data: Any = None
    error: str | None = None
    ma_loi: str | None = None


class DangKyBody(BaseModel):
    ma_tai_khoan: str = Field(min_length=3, max_length=60)
    ma_nhan_vien: str = Field(min_length=1, max_length=20)
    mat_khau: str = Field(min_length=8, max_length=128)


class DangNhapBody(BaseModel):
    ma_tai_khoan: str
    mat_khau: str = Field(min_length=1, max_length=128)


class DoiMatKhauBody(BaseModel):
    mat_khau_cu: str = Field(min_length=1, max_length=128)
    mat_khau_moi: str = Field(min_length=8, max_length=128)


@router.post("/dang-ky", summary="Đăng ký tài khoản chờ duyệt", response_model=PhanHoi)
def dang_ky(body: DangKyBody):
    return thanh_cong(auth_service.dang_ky(body.ma_tai_khoan, body.ma_nhan_vien, body.mat_khau))


@router.post("/dang-nhap", summary="Đăng nhập và tạo phiên", response_model=PhanHoi)
def dang_nhap(body: DangNhapBody, request: Request):
    ip = request.client.host if request.client else None
    thiet_bi = request.headers.get("user-agent")
    return thanh_cong(auth_service.dang_nhap(body.ma_tai_khoan, body.mat_khau, ip, thiet_bi))


@router.post("/dang-xuat", summary="Đăng xuất và thu hồi phiên", response_model=PhanHoi)
def dang_xuat(request: Request):
    auth_service.dang_xuat(request.state.token)
    return thanh_cong({"da_dang_xuat": True})


@router.get("/toi", summary="Lấy hồ sơ và ma trận quyền của tôi", response_model=PhanHoi)
def toi(request: Request):
    return thanh_cong(auth_service.ho_so_va_quyen(request.state.token))


@router.post("/doi-mat-khau", summary="Đổi mật khẩu", response_model=PhanHoi)
def doi_mat_khau(body: DoiMatKhauBody, request: Request):
    auth_service.doi_mat_khau(request.state.token, body.mat_khau_cu, body.mat_khau_moi)
    return thanh_cong({"da_doi_mat_khau": True, "can_dang_nhap_lai": True})
