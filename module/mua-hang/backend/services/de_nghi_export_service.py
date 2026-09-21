"""Xuất dữ liệu đề nghị ra CSV UTF-8 BOM."""

import csv
import io

from backend.data import de_nghi_repo as repo
from backend.data.db import get_conn
from backend.services.errors import KhongCoQuyen
from backend.services.phan_quyen_service import kiem_quyen

VAI_TRO_XUAT_FILE = {"QUAN_TRI_KY_THUAT", "QUAN_TRI_NGHIEP_VU", "BAN_LANH_DAO", "TBP_MUA_HANG"}


def xuat_csv(bo_loc: dict, ho_so: dict) -> str:
    if ho_so.get("vai_tro") not in VAI_TRO_XUAT_FILE:
        try:
            kiem_quyen(ho_so, "de_nghi", "xuat")
        except KhongCoQuyen:
            raise KhongCoQuyen("Bạn không có quyền xuất danh sách đề nghị.") from None
    pham_vi = kiem_quyen(ho_so, "de_nghi", "xem")
    with get_conn() as conn:
        items, _ = repo.danh_sach_de_nghi(conn, bo_loc, pham_vi, ho_so, offset=0, limit=5000)
    out = io.StringIO()
    out.write("\ufeff")
    writer = csv.writer(out)
    writer.writerow(["Mã đề nghị", "Loại", "Bộ phận", "Người yêu cầu", "Ngày hiệu lực",
                     "Trạng thái", "Mức ưu tiên", "Trễ giờ chốt", "Số dòng", "Bất khả thi", "Ghi chú"])
    for r in items:
        writer.writerow([
            r["id"], r["loai"], r.get("ten_bo_phan") or r["ma_bo_phan"],
            r.get("ten_nguoi_yeu_cau") or r["nguoi_yeu_cau"],
            r["ngay_hieu_luc"].strftime("%d/%m/%Y") if r.get("ngay_hieu_luc") else "",
            r["trang_thai"], r.get("muc_do_uu_tien") or "", "Có" if r.get("tre_gio_chot") else "Không",
            r.get("so_dong") or 0, "Có" if r.get("co_bat_kha_thi") else "Không", r.get("ghi_chu") or "",
        ])
    return out.getvalue()
