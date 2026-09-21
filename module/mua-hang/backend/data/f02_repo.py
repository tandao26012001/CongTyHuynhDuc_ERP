"""Truy cap du lieu cho cac luong F02."""

import uuid
from backend.services.lich_lam_viec import now_vn


def _id(prefix):
    return f"{prefix}-{uuid.uuid4().hex[:18].upper()}"


def lay_dong(conn, id_dong, khoa=False):
    sql = """SELECT d.*, dn.ma_bo_phan, dn.nguoi_yeu_cau, dn.trang_thai AS trang_thai_de_nghi
             FROM de_nghi_dong d JOIN de_nghi dn ON dn.id=d.id_de_nghi
             WHERE d.id=%s AND d.da_xoa=false"""
    if khoa:
        sql += " FOR UPDATE"
    return conn.execute(sql, (id_dong,)).fetchone()


def danh_sach_ky_thuat(conn, trang_thai=None):
    where = ["d.da_xoa=false", "(d.can_xac_nhan_kt=true OR d.trang_thai_dong='CHO_XAC_NHAN_KT')"]
    params = []
    if trang_thai == "CHO_XU_LY":
        where.append("d.trang_thai_dong='CHO_XAC_NHAN_KT'")
    elif trang_thai == "DA_XU_LY":
        where.append("d.trang_thai_dong IN ('DA_DUYET','HUY')")
    return conn.execute(f"""SELECT d.*, dn.id AS id_de_nghi, dn.loai, dn.ma_bo_phan,
             dn.nguoi_yeu_cau FROM de_nghi_dong d JOIN de_nghi dn ON dn.id=d.id_de_nghi
             WHERE {' AND '.join(where)} ORDER BY d.ngay_tao ASC""", tuple(params)).fetchall()


def tao_doi_vat_lieu(conn, data):
    return conn.execute("""INSERT INTO doi_vat_lieu
      (id,id_de_nghi_dong,id_vt_tu,id_vt_sang,ten_tu,ten_sang,noi_dung_yeu_cau,ly_do,nguoi_yeu_cau,nguoi_tao)
      VALUES(%(id)s,%(id_de_nghi_dong)s,%(id_vt_tu)s,%(id_vt_sang)s,%(ten_tu)s,%(ten_sang)s,%(noi_dung_yeu_cau)s,%(ly_do)s,%(nguoi_yeu_cau)s,%(nguoi_tao)s) RETURNING *""", data).fetchone()


def lay_doi_vat_lieu(conn, id_dvl, khoa=False):
    sql = "SELECT * FROM doi_vat_lieu WHERE id=%s"
    if khoa: sql += " FOR UPDATE"
    return conn.execute(sql, (id_dvl,)).fetchone()


def cap_nhat_doi_vat_lieu(conn, id_dvl, phien_ban, data):
    sets = [f"{k}=%({k})s" for k in data]
    params = {**data, "id": id_dvl, "phien_ban": phien_ban}
    return conn.execute(f"UPDATE doi_vat_lieu SET {','.join(sets)},ngay_sua=now(),phien_ban=phien_ban+1 WHERE id=%(id)s AND phien_ban=%(phien_ban)s RETURNING *", params).fetchone()


def tao_yeu_cau_huy(conn, data):
    return conn.execute("""INSERT INTO yeu_cau_huy(id,id_de_nghi_dong,ly_do,nguoi_yeu_cau,nguoi_tao)
      VALUES(%(id)s,%(id_de_nghi_dong)s,%(ly_do)s,%(nguoi_yeu_cau)s,%(nguoi_tao)s) RETURNING *""", data).fetchone()


def lay_yeu_cau_huy(conn, id_yc, khoa=False):
    sql = "SELECT * FROM yeu_cau_huy WHERE id=%s"
    if khoa: sql += " FOR UPDATE"
    return conn.execute(sql, (id_yc,)).fetchone()


def cap_nhat_dong(conn, id_dong, phien_ban, data):
    sets = [f"{k}=%({k})s" for k in data]
    params = {**data, "id": id_dong, "phien_ban": phien_ban}
    return conn.execute(f"UPDATE de_nghi_dong SET {','.join(sets)},ngay_sua=now(),phien_ban=phien_ban+1 WHERE id=%(id)s AND phien_ban=%(phien_ban)s AND da_xoa=false RETURNING *", params).fetchone()


def danh_sach_cap_ma(conn, trang_thai="CHO_CAP"):
    return conn.execute("SELECT * FROM yeu_cau_cap_ma WHERE trang_thai=%s ORDER BY ngay_tao", (trang_thai,)).fetchall()


def lay_cap_ma(conn, id_yc, khoa=False):
    sql = "SELECT * FROM yeu_cau_cap_ma WHERE id=%s"
    if khoa: sql += " FOR UPDATE"
    return conn.execute(sql, (id_yc,)).fetchone()


def cap_nhat_cap_ma(conn, id_yc, phien_ban, data):
    sets = [f"{k}=%({k})s" for k in data]
    return conn.execute(
        f"UPDATE yeu_cau_cap_ma SET {','.join(sets)},ngay_sua=now(),phien_ban=phien_ban+1 "
        "WHERE id=%(id)s AND phien_ban=%(phien_ban)s AND trang_thai='CHO_CAP' RETURNING *",
        {**data, "id": id_yc, "phien_ban": phien_ban},
    ).fetchone()


def lay_lich_su_doi(conn, id_dong):
    return conn.execute("SELECT * FROM doi_vat_lieu WHERE id_de_nghi_dong=%s ORDER BY ngay_tao", (id_dong,)).fetchall()
