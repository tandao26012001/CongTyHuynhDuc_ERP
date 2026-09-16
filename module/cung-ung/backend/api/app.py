from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from backend.api.envelope import (
    xu_ly_loi_du_lieu,
    xu_ly_loi_he_thong,
    xu_ly_loi_nghiep_vu,
)
from backend.api.middleware import chan_quyen
from backend.api.routes.auth import router as auth_router
from backend.api.routes.danh_muc import router as danh_muc_router
from backend.api.routes.de_nghi import router as de_nghi_router
from backend.config.settings import APP_NAME, API_PREFIX
from backend.api.routes.health import router as health_router
from backend.api.routes.quan_tri import router as quan_tri_router
from backend.api.routes.f02 import router as f02_router
from backend.api.routes.f03 import router as f03_router
from backend.services.errors import LoiNghiepVu

app = FastAPI(
    title=APP_NAME,
    version="0.1.0",
    description="He thong Mua hang & Gia cong ngoai — RESTful API (Swagger tai /docs)",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "X-Phien", "X-Idempotency-Key"],
)

app.middleware("http")(chan_quyen)
app.add_exception_handler(LoiNghiepVu, xu_ly_loi_nghiep_vu)
app.add_exception_handler(RequestValidationError, xu_ly_loi_du_lieu)
app.add_exception_handler(Exception, xu_ly_loi_he_thong)

# Health khong can prefix de probe de dang; dong thoi mount duoi /api/v1
app.include_router(health_router, prefix=API_PREFIX, tags=["health"])
app.include_router(f02_router, prefix=API_PREFIX, tags=["F02"])
app.include_router(f03_router, prefix=API_PREFIX, tags=["F03"])
app.include_router(health_router, tags=["health"])
app.include_router(auth_router, prefix=API_PREFIX, tags=["xác thực"])
app.include_router(quan_tri_router, prefix=API_PREFIX, tags=["quản trị"])
app.include_router(danh_muc_router, prefix=API_PREFIX, tags=["danh mục"])
app.include_router(de_nghi_router, prefix=API_PREFIX, tags=["đề nghị"])
