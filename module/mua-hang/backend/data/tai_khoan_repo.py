"""Truy cập dữ liệu tài khoản; không nhận mật khẩu thô."""

from backend.data.db import get_conn


def tao_quan_tri_goc(ma_tai_khoan: str, ma_nhan_vien: str, mat_khau_hash: str) -> None:
    with get_conn() as conn:
        nhan_vien = conn.execute(
            """SELECT ma_nhan_vien, ho_va_ten, ma_bo_phan, trang_thai
               FROM nhan_vien WHERE ma_nhan_vien = %s FOR UPDATE""",
            (ma_nhan_vien,),
        ).fetchone()
        if not nhan_vien:
            raise ValueError("Mã nhân viên không tồn tại trong danh mục mới")
        if nhan_vien["trang_thai"] != "HOAT_DONG":
            raise ValueError("Nhân viên không ở trạng thái HOAT_DONG")

        so_tai_khoan = conn.execute("SELECT count(*) AS n FROM tai_khoan").fetchone()["n"]
        if so_tai_khoan:
            raise ValueError("Hệ thống đã có tài khoản; script bootstrap bị khóa")

        conn.execute(
            """INSERT INTO tai_khoan(
                 ma_tai_khoan, ma_nhan_vien, ho_va_ten, ma_bo_phan,
                 vai_tro, mat_khau_hash, trang_thai, nguoi_tao
               ) VALUES (%s,%s,%s,%s,'QUAN_TRI_KY_THUAT',%s,'HOAT_DONG',%s)""",
            (ma_tai_khoan, ma_nhan_vien, nhan_vien["ho_va_ten"],
             nhan_vien["ma_bo_phan"], mat_khau_hash, ma_nhan_vien),
        )
