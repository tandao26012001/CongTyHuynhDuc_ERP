import logging
import secrets
from typing import Any

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from backend.services.errors import LoiNghiepVu

log = logging.getLogger(__name__)


def thanh_cong(data: Any = None) -> dict:
    return {"ok": True, "data": data, "error": None, "ma_loi": None}


def that_bai(error: str, ma_loi: str) -> dict:
    return {"ok": False, "data": None, "error": error, "ma_loi": ma_loi}


async def xu_ly_loi_nghiep_vu(_: Request, exc: LoiNghiepVu) -> JSONResponse:
    return JSONResponse(status_code=exc.http, content=that_bai(str(exc), exc.ma_loi))


async def xu_ly_loi_du_lieu(_: Request, __: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content=that_bai("Dữ liệu gửi lên thiếu hoặc sai định dạng.", "SAI_DU_LIEU"),
    )


async def xu_ly_loi_he_thong(request: Request, exc: Exception) -> JSONResponse:
    ma = "LOI_HE_THONG_" + secrets.token_hex(3).upper()
    log.exception("%s %s %s", ma, request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content=that_bai(
            f"Hệ thống gặp sự cố ({ma}). Hãy thử lại; nếu vẫn lỗi hãy báo Quản trị kèm mã này.",
            ma,
        ),
    )
