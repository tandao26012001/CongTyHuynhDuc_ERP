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


class CapNhatQuyenLoaiTKBody(BaseModel):
    trang: str = Field(min_length=1, max_length=40)
    phien_ban: int = Field(ge=1)
    duoc_xem: bool
    duoc_sua: bool
    duoc_duyet: bool
    duoc_xuat: bool
    pham_vi_xem: str = Field(min_length=1, max_length=20)
    pham_vi_sua: str = Field(min_length=1, max_length=20)
    kieu_sua: str = Field(min_length=1, max_length=20)
    ma_loai_tk_duyet: str | None = Field(default=None, max_length=40)


class CapNhatMaTranQuyenLoaiTKBody(BaseModel):
    items: list[CapNhatQuyenLoaiTKBody] = Field(min_length=1, max_length=100)


@router.get("/tai-khoan", summary="Danh sách tài khoản", response_model=PhanHoi)
def danh_sach(request: Request, trang: int = 1, kich_thuoc: int = 20, q: str = "", trang_thai: str = ""):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "quan_tri", "xem")
    return thanh_cong(phan_quyen_service.danh_sach_tai_khoan(trang, kich_thuoc, q, trang_thai))


@router.get("/vai-tro", summary="Danh sách vai trò và ma trận phân quyền", response_model=PhanHoi)
def danh_sach_vai_tro(request: Request):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "quan_tri", "xem")
    return thanh_cong(phan_quyen_service.danh_sach_vai_tro_va_quyen())


@router.get("/loai-tai-khoan", summary="Danh sách loại tài khoản và bộ phận", response_model=PhanHoi)
def danh_sach_loai_tai_khoan(request: Request):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "quan_tri", "xem")
    return thanh_cong(phan_quyen_service.danh_sach_loai_tai_khoan())


@router.get("/phan-quyen/{ma_loai_tk}/{ma_bo_phan}", summary="Ma trận quyền theo loại tài khoản và bộ phận", response_model=PhanHoi)
def lay_quyen_loai_tk(ma_loai_tk: str, ma_bo_phan: str, request: Request):
    phan_quyen_service.kiem_quyen(lay_ho_so(request), "quan_tri", "xem")
    return thanh_cong(phan_quyen_service.danh_sach_quyen_loai_tk(ma_loai_tk, ma_bo_phan))


@router.patch("/phan-quyen/{ma_loai_tk}/{ma_bo_phan}/{trang}", summary="Cập nhật quyền theo loại tài khoản và bộ phận", response_model=PhanHoi)
def cap_nhat_quyen_loai_tk(ma_loai_tk: str, ma_bo_phan: str, trang: str,
                           body: CapNhatQuyenLoaiTKBody, request: Request):
    ho_so = lay_ho_so(request)
    phan_quyen_service.kiem_quyen(ho_so, "quan_tri", "sua")
    return thanh_cong(phan_quyen_service.cap_nhat_quyen_loai_tk(
        ma_loai_tk, ma_bo_phan, trang, body.phien_ban,
        body.model_dump(exclude={"phien_ban"}), ho_so["ma_nhan_vien"],
    ))



@router.put("/phan-quyen/{ma_loai_tk}/{ma_bo_phan}", summary="Lưu toàn bộ ma trận quyền loại tài khoản và bộ phận", response_model=PhanHoi)
def cap_nhat_ma_tran_quyen_loai_tk(ma_loai_tk: str, ma_bo_phan: str,
                                   body: CapNhatMaTranQuyenLoaiTKBody, request: Request):
    ho_so = lay_ho_so(request)
    phan_quyen_service.kiem_quyen(ho_so, "quan_tri", "sua")
    return thanh_cong(phan_quyen_service.cap_nhat_ma_tran_quyen_loai_tk(
        ma_loai_tk, ma_bo_phan, [item.model_dump() for item in body.items],
        ho_so["ma_nhan_vien"],
    ))

@router.patch("/phan-quyen/{vai_tro}/{trang}", summary="Cập nhật một quyền của vai trò", response_model=PhanHoi)
def cap_nhat_quyen(vai_tro: str, trang: str, body: CapNhatQuyenBody, request: Request):
    ho_so = lay_ho_so(request)
    phan_quyen_service.kiem_quyen(ho_so, "quan_tri", "sua")
    return thanh_cong(phan_quyen_service.cap_nhat_quyen(
        vai_tro, trang, body.phien_ban,
        body.model_dump(exclude={"phien_ban"}), ho_so["ma_nhan_vien"],
    ))


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


@router.patch("/tai-khoan/{ma}", summary="Cập nhật chức vụ và bộ phận tài khoản", response_model=PhanHoi)
def cap_nhat_tai_khoan(ma: str, body: CapNhatTaiKhoanBody, request: Request):
    ho_so = lay_ho_so(request)
    phan_quyen_service.kiem_quyen(ho_so, "quan_tri", "sua")
    return thanh_cong(phan_quyen_service.cap_nhat_thong_tin_tai_khoan(
        ma, body.ma_bo_phan, body.vai_tro, body.phien_ban, ho_so["ma_nhan_vien"],
    ))
