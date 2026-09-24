"""Tạo mệnh đề lọc dùng chung từ danh sách trường được phép.

Tên cột luôn lấy từ cấu hình nội bộ. Giá trị do người dùng gửi lên chỉ được
đưa vào danh sách tham số, không bao giờ được nối trực tiếp vào câu SQL.
"""

from __future__ import annotations

import logging
from typing import Any


logger = logging.getLogger(__name__)


# Các biểu thức SQL ở đây là hằng số của hệ thống, không nhận tên cột từ API.
TRUONG_LOC: dict[str, dict[str, tuple[str, str]]] = {
    "vat_tu": {
        "tu_khoa": (
            "(strpos(lower(coalesce(v.ma_vat_tu, '')), %s) > 0 "
            "OR strpos(v.ten_khong_dau, %s) > 0)",
            "lap_hai",
        ),
        "ma_vat_tu": ("lower(coalesce(v.ma_vat_tu, ''))", "chua"),
        "ten_hang": ("v.ten_khong_dau", "chua"),
        "dvt": ("upper(v.dvt)", "bang"),
        "ma_chung_loai": ("v.ma_chung_loai", "bang"),
        "trang_thai": ("v.trang_thai", "bang"),
    },
}


def tao_menh_de(nguon: str, bo_loc: dict[str, Any]) -> tuple[str, list[Any]]:
    """Trả về phần điều kiện (không có chữ WHERE) và danh sách tham số."""
    cau_hinh = TRUONG_LOC.get(nguon)
    if cau_hinh is None:
        raise ValueError(f"Chưa khai báo bộ lọc cho nguồn {nguon!r}")

    dieu_kien: list[str] = []
    tham_so: list[Any] = []
    for ten, gia_tri in bo_loc.items():
        if gia_tri is None or (isinstance(gia_tri, str) and not gia_tri.strip()):
            continue
        khai_bao = cau_hinh.get(ten)
        if khai_bao is None:
            logger.debug("Bỏ qua trường lọc %s không áp dụng cho %s", ten, nguon)
            continue

        bieu_thuc, phep_so_sanh = khai_bao
        gia_tri_chuan = gia_tri.strip() if isinstance(gia_tri, str) else gia_tri
        if phep_so_sanh == "lap_hai":
            dieu_kien.append(bieu_thuc)
            tham_so.extend((gia_tri_chuan, gia_tri_chuan))
        elif phep_so_sanh == "chua":
            dieu_kien.append(f"strpos({bieu_thuc}, %s) > 0")
            tham_so.append(gia_tri_chuan)
        else:
            dieu_kien.append(f"{bieu_thuc} = %s")
            tham_so.append(gia_tri_chuan)

    return " AND ".join(dieu_kien) if dieu_kien else "TRUE", tham_so
