from typing import Any

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from backend.api.envelope import thanh_cong
from backend.api.middleware import lay_ho_so
from backend.data import auth_repo
from backend.services.errors import KhongCoQuyen
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


class CapNhatTaiKhoanBody(BaseModel):
    ma_bo_phan: str = Field(min_length=1, max_length=10)
    vai_tro: str = Field(min_length=1, max_length=40)
    phien_ban: int = Field(ge=1)


class CapNhatQuyenBody(BaseModel):
    phien_ban: int = Field(ge=1)
    duoc_xem: bool
    duoc_sua: bool
    duoc_duyet: bool
    duoc_xuat: bool
    pham_vi: str = Field(min_length=1, max_length=20)


class CapNhatQuyenLoaiBody(BaseModel):
    phien_ban: int = Field(ge=1)
    duoc_xem: bool
    pham_vi_xem: str
    duoc_sua: bool
    pham_vi_sua: str
    kieu_sua: str
    loai_tai_khoan_duyet: list[str] = Field(default_factory=list)


@router.get("/tai-khoan", summary="Danh sách tài khoản", response_model=PhanHoi)
def danh_sach(request: Request, trang: int = 1, kich_thuoc: int = 20, q: str = "", trang_thai: str = ""):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "quan_tri", "xem")
    return thanh_cong(phan_quyen_service.danh_sach_tai_khoan(trang, kich_thuoc, q, trang_thai))


@router.get("/vai-tro", summary="Danh sách vai trò và ma trận phân quyền", response_model=PhanHoi)
def danh_sach_vai_tro(request: Request):
    ho_so = lay_ho_so(request)
    if ho_so.get("ma_loai_tk") != "QUAN_TRI_HE_THONG":
        raise KhongCoQuyen("Chỉ Quản trị hệ thống được xem Phân quyền.")
    return thanh_cong(phan_quyen_service.danh_sach_vai_tro_va_quyen())


@router.get("/loai-tai-khoan", summary="Bảy loại tài khoản v3", response_model=PhanHoi)
def danh_sach_loai_tai_khoan(request: Request):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "quan_tri", "xem")
    return thanh_cong({"items": [dict(row) for row in auth_repo.danh_sach_loai_tai_khoan()]})


@router.get("/phan-quyen-v3", summary="Ma trận quyền 7 loại tài khoản", response_model=PhanHoi)
def danh_sach_quyen_loai_tk(request: Request):
    ho_so = lay_ho_so(request)
    if ho_so.get("ma_loai_tk") != "QUAN_TRI_HE_THONG":
        raise KhongCoQuyen("Chỉ Quản trị hệ thống được xem Phân quyền.")
    return thanh_cong(phan_quyen_service.danh_sach_quyen_loai_tk())


@router.patch("/phan-quyen-v3/{ma_loai_tk}/{trang}", summary="Sửa quyền loại tài khoản", response_model=PhanHoi)
def cap_nhat_quyen_loai_tk(ma_loai_tk: str, trang: str, body: CapNhatQuyenLoaiBody, request: Request):
    ho_so = lay_ho_so(request)
    if ho_so.get("ma_loai_tk") != "QUAN_TRI_HE_THONG":
        raise KhongCoQuyen("Chỉ Quản trị hệ thống được sửa Phân quyền.")
    return thanh_cong(phan_quyen_service.cap_nhat_quyen_loai_tk(
        ma_loai_tk, trang, body.phien_ban,
        body.model_dump(exclude={"phien_ban"}), ho_so["ma_nhan_vien"],
    ))


@router.patch("/phan-quyen/{vai_tro}/{trang}", summary="Cập nhật một quyền của vai trò", response_model=PhanHoi)
def cap_nhat_quyen(vai_tro: str, trang: str, body: CapNhatQuyenBody, request: Request):
    ho_so = lay_ho_so(request)
    if ho_so.get("ma_loai_tk") != "QUAN_TRI_HE_THONG":
        raise KhongCoQuyen("Chỉ Quản trị hệ thống được sửa Phân quyền.")
    phan_quyen_service.kiem_quyen(ho_so, "quan_tri", "sua")
    return thanh_cong(phan_quyen_service.cap_nhat_quyen(
        vai_tro, trang, body.phien_ban,
        body.model_dump(exclude={"phien_ban"}), ho_so["ma_nhan_vien"],
    ))


@router.post("/tai-khoan/{ma}/duyet", summary="Duyệt và gán vai trò", response_model=PhanHoi)
def duyet(ma: str, body: DuyetBody, request: Request):
    ho_so = lay_ho_so(request)
    phan_quyen_service.kiem_quyen(ho_so, "quan_tri", "sua")
    if ma.lower() == ho_so["ma_tai_khoan"].lower():
        raise KhongCoQuyen("Không thể tự đổi loại tài khoản.", "KHONG_THE_TU_NANG_QUYEN")
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


@router.patch("/tai-khoan/{ma}", summary="Cập nhật chức vụ và bộ phận tài khoản", response_model=PhanHoi)
def cap_nhat_tai_khoan(ma: str, body: CapNhatTaiKhoanBody, request: Request):
    ho_so = lay_ho_so(request)
    phan_quyen_service.kiem_quyen(ho_so, "quan_tri", "sua")
    if ma.lower() == ho_so["ma_tai_khoan"].lower():
        raise KhongCoQuyen("Không thể tự đổi loại tài khoản hoặc bộ phận.", "KHONG_THE_TU_NANG_QUYEN")
    return thanh_cong(phan_quyen_service.cap_nhat_thong_tin_tai_khoan(
        ma, body.ma_bo_phan, body.vai_tro, body.phien_ban, ho_so["ma_nhan_vien"],
    ))
