"""API trao doi va tep dinh kem cho cac ho so nghiep vu."""

from typing import Any
from urllib.parse import quote

from fastapi import APIRouter, File, Request, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field

from backend.api.envelope import thanh_cong
from backend.api.middleware import lay_ho_so
from backend.services import tuong_tac_ho_so_service

router = APIRouter()


class PhanHoi(BaseModel):
    ok: bool
    data: Any = None
    error: str | None = None
    ma_loi: str | None = None


class TraoDoiIn(BaseModel):
    noi_dung: str = Field(min_length=1, max_length=5000)


@router.get('/ho-so/{loai}/{id_ho_so}/tuong-tac', response_model=PhanHoi)
def danh_sach(loai: str, id_ho_so: str, request: Request):
    return thanh_cong(tuong_tac_ho_so_service.danh_sach(
        loai, id_ho_so, lay_ho_so(request)))


@router.post('/ho-so/{loai}/{id_ho_so}/trao-doi', response_model=PhanHoi)
def them_trao_doi(loai: str, id_ho_so: str, body: TraoDoiIn, request: Request):
    return thanh_cong(tuong_tac_ho_so_service.them_trao_doi(
        loai, id_ho_so, body.noi_dung, lay_ho_so(request)))


@router.post('/ho-so/{loai}/{id_ho_so}/tep', response_model=PhanHoi)
async def them_tep(loai: str, id_ho_so: str, request: Request,
                   tep: UploadFile = File(...)):
    try:
        content = await tep.read(tuong_tac_ho_so_service.MAX_UPLOAD_BYTES + 1)
    finally:
        await tep.close()
    return thanh_cong(tuong_tac_ho_so_service.them_tep(
        loai, id_ho_so, tep.filename or 'tep-dinh-kem', content,
        tep.content_type, lay_ho_so(request)))


@router.get('/ho-so/{loai}/{id_ho_so}/tep/{id_tep}')
def tai_tep(loai: str, id_ho_so: str, id_tep: str, request: Request):
    content, name, mime = tuong_tac_ho_so_service.tai_tep(
        loai, id_ho_so, id_tep, lay_ho_so(request))
    safe_name = ''.join(char for char in name if char.isascii() and char not in '\r\n"\\')
    return Response(content, media_type=mime, headers={
        'Content-Disposition': f'attachment; filename="{safe_name or "tep-dinh-kem"}"; '
                               f"filename*=UTF-8''{quote(name, safe='')}",
    })
