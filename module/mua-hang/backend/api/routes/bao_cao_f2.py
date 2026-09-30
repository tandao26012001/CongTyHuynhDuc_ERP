"""API bay tab bao cao F2."""

from datetime import date
from typing import Any

from fastapi import APIRouter, Query, Request
from fastapi.responses import Response
from pydantic import BaseModel

from backend.api.envelope import thanh_cong
from backend.api.middleware import lay_ho_so
from backend.services import bao_cao_f2_service, bao_cao_f2_export
from backend.services.errors import ThieuDuLieu

router = APIRouter()


class PhanHoi(BaseModel):
    ok: bool
    data: Any = None
    error: str | None = None
    ma_loi: str | None = None


def _range(from_date: date | None, to_date: date | None) -> tuple[date, date]:
    today = date.today()
    return from_date or today.replace(day=1), to_date or today


@router.get('/bao-cao/f2/{tab}', response_model=PhanHoi)
def lay_bao_cao(tab: str, request: Request, tu_ngay: date | None = None,
                den_ngay: date | None = None, id_ncc: str | None = None,
                trang_thai: str | None = None):
    start, end = _range(tu_ngay, den_ngay)
    return thanh_cong(bao_cao_f2_service.lay_bao_cao(
        tab, start, end, id_ncc, trang_thai, lay_ho_so(request)))


@router.get('/bao-cao/f2/{tab}/tai')
def tai_bao_cao(tab: str, request: Request, dinh_dang: str = Query(pattern='^(xlsx|pdf)$'),
                tu_ngay: date | None = None, den_ngay: date | None = None,
                id_ncc: str | None = None, trang_thai: str | None = None):
    start, end = _range(tu_ngay, den_ngay)
    report = bao_cao_f2_service.lay_bao_cao(
        tab, start, end, id_ncc, trang_thai, lay_ho_so(request))
    if report['truncated']:
        raise ThieuDuLieu('Bộ lọc trả quá 2.000 dòng; hãy thu hẹp kỳ trước khi xuất.')
    content = (bao_cao_f2_export.xuat_excel(report) if dinh_dang == 'xlsx'
               else bao_cao_f2_export.xuat_pdf(report))
    mime = ('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            if dinh_dang == 'xlsx' else 'application/pdf')
    name = f'bao-cao-{tab}-{start}-{end}.{dinh_dang}'
    return Response(content, media_type=mime,
                    headers={'Content-Disposition': f'attachment; filename="{name}"'})
