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


async def xu_ly_loi_du_lieu(_: Request, exc: RequestValidationError) -> JSONResponse:
    loi_thieu = [loi for loi in exc.errors() if loi.get("type") == "missing"]
    if loi_thieu:
        ten_truong = {
            "ten": "Tên nhà cung cấp", "ma_ncc": "Mã nhà cung cấp", "dia_chi": "Địa chỉ",
            "mst": "Mã số thuế", "dvt": "Đơn vị tính", "ma_vat_tu": "Mã vật tư",
            "ten_hang": "Tên hàng", "phien_ban": "Phiên bản dữ liệu",
        }
        cac_truong = []
        for loi in loi_thieu:
            loc = loi.get("loc") or ()
            cot = str(loc[-1]) if loc else "dữ liệu"
            hien_thi = ten_truong.get(cot, cot.replace("_", " "))
            if hien_thi not in cac_truong:
                cac_truong.append(hien_thi)
        thong_bao = "Thiếu trường bắt buộc: " + ", ".join(cac_truong) + "."
        return JSONResponse(status_code=400, content=that_bai(thong_bao, "THIEU_TRUONG_BAT_BUOC"))
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
