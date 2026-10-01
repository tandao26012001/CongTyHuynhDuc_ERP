from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool
import logging
from time import perf_counter

from backend.api.envelope import that_bai
from backend.config.settings import PHIEN_HEADER
from backend.services import auth_service
from backend.services.errors import LoiNghiepVu

logger = logging.getLogger(__name__)

CONG_KHAI = {
    "/health", "/api/v1/health", "/api/v1/dang-nhap", "/api/v1/dang-ky",
    "/api/v1/dang-ky/nhan-vien",
    "/docs", "/redoc", "/openapi.json",
}


async def chan_quyen(request: Request, call_next):
    duong = request.url.path
    if request.method == "OPTIONS" or duong in CONG_KHAI or not duong.startswith("/api/"):
        return await call_next(request)
    token = request.headers.get(PHIEN_HEADER, "")
    auth_started = perf_counter()
    try:
        # Xác thực có truy vấn PostgreSQL đồng bộ; đưa sang threadpool để một
        # kết nối DB chậm không khóa event loop và làm treo toàn bộ API.
        ho_so = await run_in_threadpool(auth_service.lay_ho_so, token)
    except LoiNghiepVu as exc:
        return JSONResponse(status_code=exc.http, content=that_bai(str(exc), exc.ma_loi))
    finally:
        auth_seconds = perf_counter() - auth_started
        if auth_seconds >= 5:
            logger.warning("Slow API auth: %s %s %.2fs", request.method, duong, auth_seconds)
    request.state.ho_so = ho_so
    request.state.token = token
    handler_started = perf_counter()
    try:
        return await call_next(request)
    finally:
        handler_seconds = perf_counter() - handler_started
        if handler_seconds >= 5:
            logger.warning("Slow API handler: %s %s %.2fs", request.method, duong, handler_seconds)


def lay_ho_so(request: Request) -> dict:
    return request.state.ho_so
