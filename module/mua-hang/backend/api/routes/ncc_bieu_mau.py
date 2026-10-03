from datetime import date
from fastapi import APIRouter,Query,Request
from fastapi.responses import Response
from backend.api.middleware import lay_ho_so
from backend.services.ncc_bieu_mau_service import tai

router=APIRouter()


@router.get('/bieu-mau/ncc/{bieu_mau}/tai',summary='Tải biểu mẫu ISO nhà cung cấp')
def tai_bieu_mau(bieu_mau:str,request:Request,
                 dinh_dang:str=Query(default='xlsx',pattern='^(xlsx|pdf)$'),
                 nam:int|None=Query(default=None,ge=2000,le=2100),
                 tu_ngay:date|None=None,den_ngay:date|None=None,
                 id_ncc:str|None=None,id_danh_gia:str|None=None):
    nam=nam or date.today().year
    content,name=tai(bieu_mau,dinh_dang,nam,tu_ngay or date(nam,1,1),
                    den_ngay or date(nam,12,31),id_ncc,id_danh_gia,lay_ho_so(request))
    mime='application/pdf' if dinh_dang=='pdf' else 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    return Response(content,media_type=mime,headers={'Content-Disposition':f'attachment; filename="{name}"'})
