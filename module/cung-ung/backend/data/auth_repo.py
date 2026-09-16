"""SQL cho đăng ký, đăng nhập, phiên và quản trị tài khoản."""

from datetime import datetime, timedelta, timezone

from backend.data.db import get_conn


def lay_tai_khoan(ma_tai_khoan: str):
    with get_conn() as conn:
        return conn.execute(
            "SELECT * FROM tai_khoan WHERE lower(ma_tai_khoan)=lower(%s)",
            (ma_tai_khoan,),
        ).fetchone()


def dang_ky(ma_tai_khoan: str, ma_nhan_vien: str, mat_khau_hash: str):
    with get_conn() as conn:
        nv = conn.execute(
            "SELECT * FROM nhan_vien WHERE ma_nhan_vien=%s FOR UPDATE", (ma_nhan_vien,)
        ).fetchone()
        if not nv:
            return "KHONG_CO_NHAN_VIEN", None
        if nv["trang_thai"] != "HOAT_DONG":
            return "NHAN_VIEN_KHONG_HOAT_DONG", None
        if conn.execute(
            "SELECT 1 FROM tai_khoan WHERE lower(ma_tai_khoan)=lower(%s) OR ma_nhan_vien=%s",
            (ma_tai_khoan, ma_nhan_vien),
        ).fetchone():
            return "DA_TON_TAI", None
        row = conn.execute(
            """INSERT INTO tai_khoan(
                 ma_tai_khoan,ma_nhan_vien,ho_va_ten,ma_bo_phan,vai_tro,
                 mat_khau_hash,trang_thai,nguoi_tao
               ) VALUES(%s,%s,%s,%s,NULL,%s,'CHO_DUYET',%s)
               ON CONFLICT DO NOTHING
               RETURNING ma_tai_khoan,ma_nhan_vien,ho_va_ten,ma_bo_phan,trang_thai,phien_ban""",
            (ma_tai_khoan, ma_nhan_vien, nv["ho_va_ten"], nv["ma_bo_phan"],
             mat_khau_hash, ma_nhan_vien),
        ).fetchone()
        return ("OK", row) if row else ("DA_TON_TAI", None)


def tao_phien(ma_tai_khoan: str, token: str, ip: str | None, thiet_bi: str | None):
    with get_conn() as conn:
        phut = conn.execute(
            "SELECT gia_tri FROM tham_so_he_thong WHERE ma='HD_PHIEN_HET_HAN_PHUT'"
        ).fetchone()
        het_han_phut = int(phut["gia_tri"]) if phut else 480
        now = datetime.now(timezone.utc)
        conn.execute("DELETE FROM phien_dang_nhap WHERE het_han <= now()")
        conn.execute(
            """INSERT INTO phien_dang_nhap(token,ma_tai_khoan,tao_luc,het_han,ip,thiet_bi)
               VALUES(%s,%s,%s,%s,%s,%s)""",
            (token, ma_tai_khoan, now, now + timedelta(minutes=het_han_phut), ip, thiet_bi),
        )
        conn.execute(
            "UPDATE tai_khoan SET lan_dang_nhap_cuoi=now() WHERE ma_tai_khoan=%s",
            (ma_tai_khoan,),
        )


def lay_ho_so_tu_token(token: str):
    with get_conn() as conn:
        return conn.execute(
            """SELECT t.ma_tai_khoan,t.ma_nhan_vien,t.ho_va_ten,t.ma_bo_phan,t.vai_tro,
                      t.trang_thai,t.phien_ban,p.het_han
               FROM phien_dang_nhap p JOIN tai_khoan t ON t.ma_tai_khoan=p.ma_tai_khoan
               WHERE p.token=%s AND p.het_han>now() AND t.trang_thai='HOAT_DONG'""",
            (token,),
        ).fetchone()


def xoa_phien(token: str) -> None:
    with get_conn() as conn:
        conn.execute("DELETE FROM phien_dang_nhap WHERE token=%s", (token,))


def lay_quyen(vai_tro: str, conn=None):
    sql = """SELECT trang,duoc_xem,duoc_sua,duoc_duyet,duoc_xuat,pham_vi
             FROM phan_quyen WHERE vai_tro=%s ORDER BY trang"""
    if conn is not None:
        return conn.execute(sql, (vai_tro,)).fetchall()
    with get_conn() as ket_noi:
        return ket_noi.execute(sql, (vai_tro,)).fetchall()


def doi_mat_khau(ma_tai_khoan: str, mat_khau_hash: str) -> None:
    with get_conn() as conn:
        conn.execute(
            "UPDATE tai_khoan SET mat_khau_hash=%s,nguoi_sua=ma_nhan_vien WHERE ma_tai_khoan=%s",
            (mat_khau_hash, ma_tai_khoan),
        )
        conn.execute("DELETE FROM phien_dang_nhap WHERE ma_tai_khoan=%s", (ma_tai_khoan,))


def danh_sach_tai_khoan(offset: int, limit: int):
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT ma_tai_khoan,ma_nhan_vien,ho_va_ten,ma_bo_phan,vai_tro,
                      trang_thai,lan_dang_nhap_cuoi,phien_ban
               FROM tai_khoan ORDER BY ngay_tao DESC OFFSET %s LIMIT %s""",
            (offset, limit),
        ).fetchall()
        total = conn.execute("SELECT count(*) AS n FROM tai_khoan").fetchone()["n"]
        return rows, total


def cap_nhat_tai_khoan(ma: str, phien_ban: int, nguoi_sua: str, vai_tro=None, khoa=False):
    with get_conn() as conn:
        if khoa:
            row = conn.execute(
                """UPDATE tai_khoan SET trang_thai='KHOA',nguoi_sua=%s
                   WHERE ma_tai_khoan=%s AND phien_ban=%s RETURNING ma_tai_khoan""",
                (nguoi_sua, ma, phien_ban),
            ).fetchone()
            if row:
                conn.execute("DELETE FROM phien_dang_nhap WHERE ma_tai_khoan=%s", (ma,))
            return row
        return conn.execute(
            """UPDATE tai_khoan SET vai_tro=%s,trang_thai='HOAT_DONG',nguoi_sua=%s
               WHERE ma_tai_khoan=%s AND phien_ban=%s RETURNING ma_tai_khoan""",
            (vai_tro, nguoi_sua, ma, phien_ban),
        ).fetchone()


def vai_tro_ton_tai(ma: str) -> bool:
    with get_conn() as conn:
        return conn.execute("SELECT 1 FROM vai_tro WHERE ma=%s", (ma,)).fetchone() is not None
