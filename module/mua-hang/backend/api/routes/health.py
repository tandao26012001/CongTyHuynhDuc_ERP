from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class HealthOut(BaseModel):
    ok: bool = True
    data: dict = {"status": "ok"}
    error: str | None = None
    ma_loi: str | None = None


@router.get("/health", summary="Kiem tra song", response_model=HealthOut)
def health():
    return HealthOut()
