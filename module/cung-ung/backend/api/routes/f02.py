from typing import Any
from fastapi import APIRouter, Request
from pydantic import BaseModel, Field
from backend.api.envelope import thanh_cong
from backend.api.middleware import lay_ho_so
from backend.services import f02_service

router = APIRouter()

class PhanHoi(BaseModel):
    ok: bool
    data: Any = None
    error: str | None = None
    ma_loi: str | None = None

class XacNhanIn(BaseModel):
    noi_dung: str = Field(min_length=1)

class KetQuaIn(BaseModel):
    ket_qua: str
    ghi_chu: str | None = None

class DoiVatLieuIn(BaseModel):
    id_dong: str
    id_vt_sang: str | None = None
    ten_sang: str | None = None
    ly_do: str = Field(min_length=1)

class DuyetIn(BaseModel):
    phien_ban: int
    ghi_chu: str | None = None

class HuyIn(BaseModel):
    ly_do: str = Field(min_length=1)

class DuyetHuyIn(BaseModel):
    phien_ban: int
    dong_y: bool
    ly_do: str | None = None

@router.get("/xac-nhan-kt", response_model=PhanHoi)
def hang_doi(request: Request, trang_thai: str | None = None):
    return thanh_cong(f02_service.hang_doi_ky_thuat(lay_ho_so(request), trang_thai))

@router.post("/de-nghi-dong/{id_dong}/yeu-cau-xac-nhan-kt", response_model=PhanHoi)
def yeu_cau_kt(id_dong: str, body: XacNhanIn, request: Request):
    return thanh_cong(f02_service.yeu_cau_xac_nhan_kt(id_dong, body.noi_dung, lay_ho_so(request)))

@router.post("/de-nghi-dong/{id_dong}/xac-nhan-kt", response_model=PhanHoi)
def xac_nhan_kt(id_dong: str, body: KetQuaIn, request: Request):
    return thanh_cong(f02_service.xac_nhan_kt(id_dong, body.ket_qua, body.ghi_chu, lay_ho_so(request)))

@router.post("/doi-vat-lieu", response_model=PhanHoi)
def doi_vat_lieu(body: DoiVatLieuIn, request: Request):
    return thanh_cong(f02_service.tao_doi_vat_lieu(body.id_dong, body.id_vt_sang, body.ten_sang, body.ly_do, lay_ho_so(request)))

@router.post("/doi-vat-lieu/{id_dvl}/duyet", response_model=PhanHoi)
def duyet_doi(id_dvl: str, body: DuyetIn, request: Request):
    return thanh_cong(f02_service.duyet_doi_vat_lieu(id_dvl, True, body.ghi_chu, body.phien_ban, lay_ho_so(request)))

@router.post("/doi-vat-lieu/{id_dvl}/tu-choi", response_model=PhanHoi)
def tu_choi_doi(id_dvl: str, body: DuyetIn, request: Request):
    return thanh_cong(f02_service.duyet_doi_vat_lieu(id_dvl, False, body.ghi_chu, body.phien_ban, lay_ho_so(request)))

@router.get("/de-nghi-dong/{id_dong}/lich-su-doi", response_model=PhanHoi)
def lich_su_doi(id_dong: str, request: Request):
    return thanh_cong(f02_service.lich_su_doi(id_dong, lay_ho_so(request)))

@router.post("/de-nghi-dong/{id_dong}/yeu-cau-huy", response_model=PhanHoi)
def yeu_cau_huy(id_dong: str, body: HuyIn, request: Request):
    return thanh_cong(f02_service.tao_yeu_cau_huy(id_dong, body.ly_do, lay_ho_so(request)))

@router.post("/yeu-cau-huy/{id_yc}/duyet", response_model=PhanHoi)
def duyet_huy(id_yc: str, body: DuyetHuyIn, request: Request):
    return thanh_cong(f02_service.duyet_yeu_cau_huy(id_yc, body.dong_y, body.ly_do, body.phien_ban, lay_ho_so(request)))

@router.get("/yeu-cau-cap-ma", response_model=PhanHoi)
def hang_doi_cap_ma(request: Request):
    return thanh_cong(f02_service.hang_doi_cap_ma(lay_ho_so(request)))
