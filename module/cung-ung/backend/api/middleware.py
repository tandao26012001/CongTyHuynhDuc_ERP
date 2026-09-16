from fastapi import Request
from fastapi.responses import JSONResponse

from backend.api.envelope import that_bai
from backend.config.settings import PHIEN_HEADER
from backend.services import auth_service
from backend.services.errors import LoiNghiepVu

CONG_KHAI = {
    "/health", "/api/v1/health", "/api/v1/dang-nhap", "/api/v1/dang-ky",
    "/docs", "/redoc", "/openapi.json",
}


async def chan_quyen(request: Request, call_next):
    duong = request.url.path
    if request.method == "OPTIONS" or duong in CONG_KHAI or not duong.startswith("/api/"):
        return await call_next(request)
    token = request.headers.get(PHIEN_HEADER, "")
    try:
        ho_so = auth_service.lay_ho_so(token)
    except LoiNghiepVu as exc:
        return JSONResponse(status_code=exc.http, content=that_bai(str(exc), exc.ma_loi))
    request.state.ho_so = ho_so
    request.state.token = token
    return await call_next(request)


def lay_ho_so(request: Request) -> dict:
    return request.state.ho_so
