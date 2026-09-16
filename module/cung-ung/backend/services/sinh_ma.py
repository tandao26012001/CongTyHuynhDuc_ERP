"""Sinh mã chứng từ nguyên tử theo chuẩn HD-STD-01 (§3.1, §4)."""

import re
from datetime import datetime
from backend.services.lich_lam_viec import now_vn

RE_SO_CUOI = re.compile(r"(\d+)$")


def _dong_bo_khoi_tao(conn, tien_to: str, nam: int) -> None:
    """Đảm bảo số đếm ban đầu không nhỏ hơn mã lớn nhất đã tồn tại trong CSDL."""
    bang_va_cot = {
        "DN": ("de_nghi", "id"),
        "DND": ("de_nghi_dong", "id"),
    }
    if tien_to not in bang_va_cot:
        return

    bang, cot = bang_va_cot[tien_to]
    cur = conn.cursor()
    cur.execute(f"SELECT max({cot}) AS max_id FROM {bang} WHERE {cot} LIKE %s", (f"{tien_to}-{nam}-%",))
    row = cur.fetchone()
    max_id = row["max_id"] if row else None

    so_lon_nhat = 0
    if max_id:
        m = RE_SO_CUOI.search(max_id)
        if m:
            so_lon_nhat = int(m.group(1))

    cur.execute(
        """INSERT INTO bo_dem_chung_tu(tien_to, nam, so_hien_tai)
           VALUES (%s, %s, %s)
           ON CONFLICT (tien_to, nam) DO UPDATE
           SET so_hien_tai = GREATEST(bo_dem_chung_tu.so_hien_tai, EXCLUDED.so_hien_tai)""",
        (tien_to, nam, so_lon_nhat),
    )


def sinh_ma(conn, tien_to: str, nam: int | None = None) -> str:
    """
    Tăng nguyên tử và trả về mã chứng từ dạng:
    DN-2026-000123 hoặc DND-2026-000045
    """
    if nam is None:
        nam = now_vn().year

    _dong_bo_khoi_tao(conn, tien_to, nam)

    cur = conn.cursor()
    cur.execute(
        """INSERT INTO bo_dem_chung_tu(tien_to, nam, so_hien_tai)
           VALUES (%s, %s, 1)
           ON CONFLICT (tien_to, nam) DO UPDATE
           SET so_hien_tai = bo_dem_chung_tu.so_hien_tai + 1
           RETURNING so_hien_tai""",
        (tien_to, nam),
    )
    so_moi = cur.fetchone()["so_hien_tai"]
    return f"{tien_to}-{nam}-{so_moi:06d}"
