"""SQL cho đăng ký, đăng nhập, phiên và quản trị tài khoản."""

from datetime import datetime, timedelta, timezone
import hashlib
import secrets

from backend.data.db import get_conn


def _co_mo_hinh_chuan(conn) -> bool:
    return conn.execute(
        """SELECT EXISTS (
             SELECT 1 FROM information_schema.columns
             WHERE table_schema='mua_hang' AND table_name='tai_khoan'
               AND column_name='ma_tai_khoan'
           ) AS co"""
    ).fetchone()["co"]


def _co_ma_tran_quyen(conn) -> bool:
    return conn.execute(
        "SELECT to_regclass('mua_hang.vai_tro') IS NOT NULL "
        "AND to_regclass('mua_hang.phan_quyen') IS NOT NULL AS co"
    ).fetchone()["co"]


def _bam_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def lay_tai_khoan(ma_tai_khoan: str):
    with get_conn() as conn:
        if not _co_mo_hinh_chuan(conn):
            return conn.execute(
                """SELECT "MA_TAI_KHOAN" AS ma_tai_khoan,
                          "MA_TAI_KHOAN" AS ma_nhan_vien,
                          "HO_TEN" AS ho_va_ten,
                          "MA_BO_PHAN" AS ma_bo_phan,
                          "VAI_TRO" AS vai_tro,
                          "MAT_KHAU_HASH" AS mat_khau_hash,
                          CASE WHEN "DANG_HOAT_DONG" THEN 'HOAT_DONG' ELSE 'KHOA' END AS trang_thai,
                          1 AS phien_ban
                   FROM tai_khoan
                   WHERE lower("MA_TAI_KHOAN")=lower(%s)
                   LIMIT 1""",
                (ma_tai_khoan,),
            ).fetchone()
        return conn.execute(
            """SELECT * FROM tai_khoan
               WHERE lower(ma_tai_khoan)=lower(%s)
                  OR upper(ma_nhan_vien)=upper(%s)
               LIMIT 1""",
            (ma_tai_khoan, ma_tai_khoan),
        ).fetchone()


def dang_ky(ma_tai_khoan: str, ma_nhan_vien: str, mat_khau_hash: str):
    with get_conn() as conn:
        if not _co_mo_hinh_chuan(conn):
            return "KHONG_HO_TRO", None
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
        if not _co_mo_hinh_chuan(conn):
            now = datetime.now(timezone.utc)
            conn.execute('DELETE FROM phien WHERE "NGAY_HET_HAN" <= now()')
            conn.execute(
                """INSERT INTO phien(
                     "ID","TOKEN_HASH","MA_TAI_KHOAN","NGAY_HET_HAN","NGAY_TAO","NGAY_SUA"
                   ) VALUES(%s,%s,%s,%s,%s,%s)""",
                ("PHIEN-" + secrets.token_hex(12).upper(), _bam_token(token), ma_tai_khoan,
                 now + timedelta(minutes=480), now, now),
            )
            return
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
        if not _co_mo_hinh_chuan(conn):
            return conn.execute(
                """SELECT t."MA_TAI_KHOAN" AS ma_tai_khoan,
                          t."MA_TAI_KHOAN" AS ma_nhan_vien,
                          t."HO_TEN" AS ho_va_ten,
                          t."MA_BO_PHAN" AS ma_bo_phan,
                          t."VAI_TRO" AS vai_tro,
                          CASE WHEN t."DANG_HOAT_DONG" THEN 'HOAT_DONG' ELSE 'KHOA' END AS trang_thai,
                          1 AS phien_ban,
                          p."NGAY_HET_HAN" AS het_han
                   FROM phien p
                   JOIN tai_khoan t ON t."MA_TAI_KHOAN"=p."MA_TAI_KHOAN"
                   WHERE p."TOKEN_HASH"=%s
                     AND p."NGAY_HET_HAN">now()
                     AND t."DANG_HOAT_DONG"=true""",
                (_bam_token(token),),
            ).fetchone()
        return conn.execute(
            """SELECT t.ma_tai_khoan,t.ma_nhan_vien,t.ho_va_ten,t.ma_bo_phan,t.vai_tro,
                      t.trang_thai,t.phien_ban,p.het_han
               FROM phien_dang_nhap p JOIN tai_khoan t ON t.ma_tai_khoan=p.ma_tai_khoan
               WHERE p.token=%s AND p.het_han>now() AND t.trang_thai='HOAT_DONG'""",
            (token,),
        ).fetchone()


def xoa_phien(token: str) -> None:
    with get_conn() as conn:
        if not _co_mo_hinh_chuan(conn):
            conn.execute('DELETE FROM phien WHERE "TOKEN_HASH"=%s', (_bam_token(token),))
            return
        conn.execute("DELETE FROM phien_dang_nhap WHERE token=%s", (token,))


def lay_quyen(vai_tro: str, conn=None):
    sql = """SELECT trang,duoc_xem,duoc_sua,duoc_duyet,duoc_xuat,pham_vi
             FROM phan_quyen WHERE vai_tro=%s ORDER BY trang"""
    if conn is not None:
        if not _co_ma_tran_quyen(conn):
            return []
        return conn.execute(sql, (vai_tro,)).fetchall()
    with get_conn() as ket_noi:
        if not _co_ma_tran_quyen(ket_noi):
            return []
        return ket_noi.execute(sql, (vai_tro,)).fetchall()


def doi_mat_khau(ma_tai_khoan: str, mat_khau_hash: str) -> None:
    with get_conn() as conn:
        if not _co_mo_hinh_chuan(conn):
            conn.execute(
                'UPDATE tai_khoan SET "MAT_KHAU_HASH"=%s,"NGAY_SUA"=now() WHERE "MA_TAI_KHOAN"=%s',
                (mat_khau_hash, ma_tai_khoan),
            )
            conn.execute('DELETE FROM phien WHERE "MA_TAI_KHOAN"=%s', (ma_tai_khoan,))
            return
        conn.execute(
            "UPDATE tai_khoan SET mat_khau_hash=%s,nguoi_sua=ma_nhan_vien WHERE ma_tai_khoan=%s",
            (mat_khau_hash, ma_tai_khoan),
        )
        conn.execute("DELETE FROM phien_dang_nhap WHERE ma_tai_khoan=%s", (ma_tai_khoan,))


def cap_nhat_hash_dang_nhap(ma_tai_khoan: str, mat_khau_hash: str) -> None:
    """Nâng hash cũ lên bcrypt sau khi người dùng xác thực thành công."""
    with get_conn() as conn:
        if not _co_mo_hinh_chuan(conn):
            conn.execute(
                'UPDATE tai_khoan SET "MAT_KHAU_HASH"=%s,"NGAY_SUA"=now() WHERE "MA_TAI_KHOAN"=%s',
                (mat_khau_hash, ma_tai_khoan),
            )
            return
        conn.execute(
            "UPDATE tai_khoan SET mat_khau_hash=%s,nguoi_sua=ma_nhan_vien WHERE ma_tai_khoan=%s",
            (mat_khau_hash, ma_tai_khoan),
        )


def danh_sach_tai_khoan(offset: int, limit: int, tu_khoa: str = "", trang_thai: str = ""):
    with get_conn() as conn:
        mau = f"%{tu_khoa.lower()}%"
        if not _co_mo_hinh_chuan(conn):
            dieu_kien = """(%s='' OR lower(concat_ws(' ',"MA_TAI_KHOAN","HO_TEN","MA_BO_PHAN","VAI_TRO")) LIKE %s)
                              AND (%s='' OR CASE WHEN "DANG_HOAT_DONG" THEN 'HOAT_DONG' ELSE 'KHOA' END=%s)"""
            params = (tu_khoa, mau, trang_thai, trang_thai)
            rows = conn.execute(
                f"""SELECT "MA_TAI_KHOAN" AS ma_tai_khoan,
                           "ID" AS ma_nhan_vien,"HO_TEN" AS ho_va_ten,
                           "MA_BO_PHAN" AS ma_bo_phan,"VAI_TRO" AS vai_tro,
                           CASE WHEN "DANG_HOAT_DONG" THEN 'HOAT_DONG' ELSE 'KHOA' END AS trang_thai,
                           NULL::timestamptz AS lan_dang_nhap_cuoi,
                           "NGAY_TAO" AS ngay_tao,1 AS phien_ban
                    FROM tai_khoan WHERE {dieu_kien}
                    ORDER BY "NGAY_TAO" DESC OFFSET %s LIMIT %s""",
                (*params, offset, limit),
            ).fetchall()
            total = conn.execute(
                f"SELECT count(*) AS n FROM tai_khoan WHERE {dieu_kien}", params
            ).fetchone()["n"]
            return rows, total
        rows = conn.execute(
            """SELECT ma_tai_khoan,ma_nhan_vien,ho_va_ten,ma_bo_phan,vai_tro,
                      trang_thai,lan_dang_nhap_cuoi,ngay_tao,phien_ban
               FROM tai_khoan
               WHERE (%s='' OR lower(concat_ws(' ',ma_tai_khoan,ma_nhan_vien,ho_va_ten,ma_bo_phan,vai_tro)) LIKE %s)
                 AND (%s='' OR trang_thai=%s)
               ORDER BY ngay_tao DESC OFFSET %s LIMIT %s""",
            (tu_khoa, mau, trang_thai, trang_thai, offset, limit),
        ).fetchall()
        total = conn.execute(
            """SELECT count(*) AS n FROM tai_khoan
               WHERE (%s='' OR lower(concat_ws(' ',ma_tai_khoan,ma_nhan_vien,ho_va_ten,ma_bo_phan,vai_tro)) LIKE %s)
                 AND (%s='' OR trang_thai=%s)""",
            (tu_khoa, mau, trang_thai, trang_thai),
        ).fetchone()["n"]
        return rows, total


def cap_nhat_tai_khoan(ma: str, phien_ban: int, nguoi_sua: str, vai_tro=None, khoa=False):
    with get_conn() as conn:
        if not _co_mo_hinh_chuan(conn):
            if khoa:
                row = conn.execute(
                    """UPDATE tai_khoan SET "DANG_HOAT_DONG"=false,"NGAY_SUA"=now()
                       WHERE "MA_TAI_KHOAN"=%s RETURNING "MA_TAI_KHOAN" AS ma_tai_khoan""",
                    (ma,),
                ).fetchone()
                if row:
                    conn.execute('DELETE FROM phien WHERE "MA_TAI_KHOAN"=%s', (ma,))
                return row
            return conn.execute(
                """UPDATE tai_khoan SET "VAI_TRO"=%s,"DANG_HOAT_DONG"=true,"NGAY_SUA"=now()
                   WHERE "MA_TAI_KHOAN"=%s RETURNING "MA_TAI_KHOAN" AS ma_tai_khoan""",
                (vai_tro, ma),
            ).fetchone()
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
        if not _co_ma_tran_quyen(conn):
            return ma.upper() == "ADMIN"
        return conn.execute("SELECT 1 FROM vai_tro WHERE ma=%s", (ma,)).fetchone() is not None


def danh_sach_vai_tro_va_quyen():
    with get_conn() as conn:
        if not _co_ma_tran_quyen(conn):
            return [], []
        vai_tro = conn.execute(
            "SELECT ma,ten,thu_tu,mo_ta FROM vai_tro ORDER BY thu_tu NULLS LAST,ma"
        ).fetchall()
        quyen = conn.execute(
            """SELECT vai_tro,trang,duoc_xem,duoc_sua,duoc_duyet,duoc_xuat,
                      pham_vi,phien_ban
               FROM phan_quyen ORDER BY vai_tro,trang"""
        ).fetchall()
        return vai_tro, quyen


def cap_nhat_quyen(vai_tro: str, trang: str, phien_ban: int, du_lieu: dict, nguoi_sua: str):
    with get_conn() as conn:
        return conn.execute(
            """UPDATE phan_quyen SET
                 duoc_xem=%s,duoc_sua=%s,duoc_duyet=%s,duoc_xuat=%s,pham_vi=%s,
                 ngay_sua=now(),nguoi_sua=%s,phien_ban=phien_ban+1
               WHERE vai_tro=%s AND trang=%s AND phien_ban=%s
               RETURNING vai_tro,trang,duoc_xem,duoc_sua,duoc_duyet,duoc_xuat,
                         pham_vi,phien_ban""",
            (du_lieu["duoc_xem"], du_lieu["duoc_sua"], du_lieu["duoc_duyet"],
             du_lieu["duoc_xuat"], du_lieu["pham_vi"], nguoi_sua,
             vai_tro, trang, phien_ban),
        ).fetchone()
