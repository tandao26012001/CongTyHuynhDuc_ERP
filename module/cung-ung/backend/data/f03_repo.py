"""Truy van va ghi du lieu cho luong F03 - bao gia."""

import uuid


def dong_cho_bao_gia(conn):
    return conn.execute(
        """SELECT d.*, dn.ma_bo_phan, dn.nguoi_yeu_cau
           FROM de_nghi_dong d JOIN de_nghi dn ON dn.id=d.id_de_nghi
           WHERE d.da_xoa=false AND d.trang_thai_dong='DA_DUYET'
             AND NOT EXISTS (SELECT 1 FROM ycbg_dong y WHERE y.id_de_nghi_dong=d.id)
           ORDER BY d.ngay_du_kien_ve NULLS LAST,d.ngay_tao"""
    ).fetchall()


def lay_ncc(conn, id_ncc):
    return conn.execute("SELECT * FROM nha_cung_cap WHERE id=%s", (id_ncc,)).fetchone()


def lay_dong(conn, id_dong, khoa=False):
    sql = "SELECT * FROM de_nghi_dong WHERE id=%s AND da_xoa=false"
    if khoa:
        sql += " FOR UPDATE"
    return conn.execute(sql, (id_dong,)).fetchone()


def tao_ycbg(conn, data):
    return conn.execute(
        """INSERT INTO yeu_cau_bao_gia(id,id_ncc,ngay_gui,han_tra_loi,trang_thai,nguoi_tao)
           VALUES(%(id)s,%(id_ncc)s,now()::date,%(han_tra_loi)s,'DA_GUI',%(nguoi_tao)s)
           RETURNING *""", data
    ).fetchone()


def tao_ycbg_dong(conn, data):
    return conn.execute(
        """INSERT INTO ycbg_dong(id,id_ycbg,id_de_nghi_dong,stt_dong,ten_hang_chup,quy_cach,dvt_chup,so_luong,ky_han_yc,nguoi_tao)
           VALUES(%(id)s,%(id_ycbg)s,%(id_de_nghi_dong)s,%(stt_dong)s,%(ten_hang_chup)s,%(quy_cach)s,%(dvt_chup)s,%(so_luong)s,%(ky_han_yc)s,%(nguoi_tao)s)
           RETURNING *""", data
    ).fetchone()


def cap_nhat_dong(conn, id_dong, phien_ban, data):
    sets = [f"{key}=%({key})s" for key in data]
    return conn.execute(
        f"UPDATE de_nghi_dong SET {','.join(sets)},ngay_sua=now(),phien_ban=phien_ban+1 "
        "WHERE id=%(id)s AND phien_ban=%(phien_ban)s AND da_xoa=false RETURNING *",
        {**data, "id": id_dong, "phien_ban": phien_ban},
    ).fetchone()


def danh_sach_ycbg(conn):
    return conn.execute(
        """SELECT y.*,n.ma_ncc,n.ten AS ten_ncc,
                  count(yd.id)::int AS so_dong
           FROM yeu_cau_bao_gia y JOIN nha_cung_cap n ON n.id=y.id_ncc
           LEFT JOIN ycbg_dong yd ON yd.id_ycbg=y.id
           GROUP BY y.id,n.ma_ncc,n.ten ORDER BY y.ngay_tao DESC"""
    ).fetchall()


def lay_ycbg(conn, id_ycbg, khoa=False):
    sql = """SELECT y.*,n.ma_ncc,n.ten AS ten_ncc FROM yeu_cau_bao_gia y
             JOIN nha_cung_cap n ON n.id=y.id_ncc WHERE y.id=%s"""
    if khoa:
        sql += " FOR UPDATE"
    return conn.execute(sql, (id_ycbg,)).fetchone()


def lay_ycbg_dong(conn, id_ycbg):
    return conn.execute("SELECT * FROM ycbg_dong WHERE id_ycbg=%s ORDER BY stt_dong", (id_ycbg,)).fetchall()


def tao_bao_gia(conn, data):
    return conn.execute(
        """INSERT INTO bao_gia(id,id_ycbg,id_ncc,ngay_bao_gia,hieu_luc_den,dieu_kien_thanh_toan,thoi_gian_giao,nguoi_tao)
           VALUES(%(id)s,%(id_ycbg)s,%(id_ncc)s,%(ngay_bao_gia)s,%(hieu_luc_den)s,%(dieu_kien_thanh_toan)s,%(thoi_gian_giao)s,%(nguoi_tao)s)
           RETURNING *""", data
    ).fetchone()


def tao_bao_gia_dong(conn, data):
    return conn.execute(
        """INSERT INTO bao_gia_dong(id,id_bao_gia,id_de_nghi_dong,stt_dong,ten_hang_chup,dvt_chup,so_luong,don_gia_co_so,don_vi_gia,trong_luong,thoi_gian_giao,ghi_chu,nguoi_tao)
           VALUES(%(id)s,%(id_bao_gia)s,%(id_de_nghi_dong)s,%(stt_dong)s,%(ten_hang_chup)s,%(dvt_chup)s,%(so_luong)s,%(don_gia_co_so)s,%(don_vi_gia)s,%(trong_luong)s,%(thoi_gian_giao)s,%(ghi_chu)s,%(nguoi_tao)s)
           RETURNING *""", data
    ).fetchone()


def lay_bao_gia(conn, id_bao_gia, khoa=False):
    sql = "SELECT b.*,n.ma_ncc,n.ten AS ten_ncc FROM bao_gia b JOIN nha_cung_cap n ON n.id=b.id_ncc WHERE b.id=%s"
    if khoa:
        sql += " FOR UPDATE"
    return conn.execute(sql, (id_bao_gia,)).fetchone()


def lay_bao_gia_dong(conn, id_bao_gia):
    return conn.execute("SELECT * FROM bao_gia_dong WHERE id_bao_gia=%s ORDER BY stt_dong", (id_bao_gia,)).fetchall()


def lay_ma_tran(conn, ids_dong):
    return conn.execute(
        """SELECT b.id AS id_bao_gia,b.id_ncc,n.ma_ncc,n.ten AS ten_ncc,b.ngay_bao_gia,
                  b.dieu_kien_thanh_toan,b.thoi_gian_giao,b.duoc_chon,b.mien_tru_2_bao_gia,
                  bd.id_de_nghi_dong,bd.don_gia_co_so,bd.don_vi_gia,bd.trong_luong,
                  bd.so_luong,bd.thoi_gian_giao AS thoi_gian_giao_dong
           FROM bao_gia b JOIN nha_cung_cap n ON n.id=b.id_ncc
           JOIN bao_gia_dong bd ON bd.id_bao_gia=b.id
           WHERE bd.id_de_nghi_dong = ANY(%s) ORDER BY bd.id_de_nghi_dong,b.id""",
        (ids_dong,),
    ).fetchall()


def dem_bao_gia_cua_dong(conn, id_dong):
    return conn.execute("SELECT count(*)::int AS n FROM bao_gia_dong WHERE id_de_nghi_dong=%s", (id_dong,)).fetchone()["n"]


def cap_nhat_bao_gia(conn, id_bao_gia, phien_ban, data):
    sets = [f"{key}=%({key})s" for key in data]
    return conn.execute(
        f"UPDATE bao_gia SET {','.join(sets)},ngay_sua=now(),phien_ban=phien_ban+1 WHERE id=%(id)s AND phien_ban=%(phien_ban)s RETURNING *",
        {**data, "id": id_bao_gia, "phien_ban": phien_ban},
    ).fetchone()


def bo_chon_khac(conn, id_bao_gia, ids_dong):
    conn.execute("UPDATE bao_gia SET duoc_chon=false WHERE id<>%s AND id IN (SELECT DISTINCT id_bao_gia FROM bao_gia_dong WHERE id_de_nghi_dong=ANY(%s))", (id_bao_gia, ids_dong))


def lich_su_gia(conn, id_vat_tu):
    return conn.execute(
        """SELECT b.ngay_bao_gia,b.id AS id_bao_gia,n.id AS id_ncc,n.ma_ncc,n.ten AS ten_ncc,
                  bd.don_gia_co_so,bd.don_vi_gia,bd.trong_luong,b.duoc_chon
           FROM bao_gia_dong bd JOIN bao_gia b ON b.id=bd.id_bao_gia
           JOIN nha_cung_cap n ON n.id=b.id_ncc
           JOIN de_nghi_dong d ON d.id=bd.id_de_nghi_dong
           WHERE d.id_vt_duyet_mua=%s ORDER BY b.ngay_bao_gia DESC NULLS LAST""", (id_vat_tu,)
    ).fetchall()


def tao_id(prefix):
    return f"{prefix}-{uuid.uuid4().hex[:18].upper()}"
