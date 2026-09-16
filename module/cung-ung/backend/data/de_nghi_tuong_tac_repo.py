"""SQL phụ trợ F01: lịch sử, thông báo, trao đổi và tệp đính kèm."""

import uuid

from backend.services.lich_lam_viec import now_vn


def ghi_lich_su_trang_thai(conn, id_ban_ghi, tu_trang_thai, sang_trang_thai,
                           nguoi_thuc_hien, ghi_chu=None):
    conn.execute(
        """INSERT INTO lich_su_trang_thai(
             id,bang,id_ban_ghi,tu_trang_thai,sang_trang_thai,nguoi_thuc_hien,thoi_diem,ghi_chu)
           VALUES(%s,'DE_NGHI',%s,%s,%s,%s,%s,%s)""",
        (f"LS-{uuid.uuid4().hex[:18].upper()}", id_ban_ghi, tu_trang_thai, sang_trang_thai,
         nguoi_thuc_hien, now_vn(), ghi_chu),
    )


def ghi_nhat_ky(conn, id_ban_ghi, hanh_dong, nguoi_sua, cot=None, gia_tri_cu=None,
                 gia_tri_moi=None, ip=None, thiet_bi=None):
    conn.execute(
        """INSERT INTO nhat_ky_thay_doi(
             id,bang,id_ban_ghi,cot,gia_tri_cu,gia_tri_moi,nguoi_sua,thoi_diem,ip,thiet_bi,hanh_dong)
           VALUES(%s,'DE_NGHI',%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
        (f"NK-{uuid.uuid4().hex[:18].upper()}", id_ban_ghi, cot, gia_tri_cu, gia_tri_moi,
         nguoi_sua, now_vn(), ip, thiet_bi, hanh_dong),
    )


def gui_thong_bao(conn, nguoi_nhan, loai, tieu_de, noi_dung, id_ban_ghi=None):
    conn.execute(
        """INSERT INTO thong_bao(id,nguoi_nhan,loai,tieu_de,noi_dung,bang,id_ban_ghi,da_doc,thoi_diem)
           VALUES(%s,%s,%s,%s,%s,'DE_NGHI',%s,false,%s)""",
        (f"TB-{uuid.uuid4().hex[:18].upper()}", nguoi_nhan, loai, tieu_de, noi_dung, id_ban_ghi, now_vn()),
    )


def gui_nhac_ky_bu_den_han(conn):
    """Tạo đúng một thông báo cho mỗi phiếu đến hạn ký bù."""
    # Tuần tự hóa tác vụ lazy/cron để hai request đồng thời không tạo hai lời nhắc.
    conn.execute("SELECT pg_advisory_xact_lock(hashtext('F01_NHAC_KY_BU'))")
    rows = conn.execute(
        """SELECT id,coalesce(nguoi_duyet_bld,nguoi_duyet_bp) AS nguoi_ky
           FROM de_nghi dn
           WHERE dn.trang_thai='CHO_KY_BU'
             AND dn.ngay_ky_bu IS NOT NULL
             AND dn.ngay_ky_bu <= CURRENT_DATE
             AND coalesce(dn.nguoi_duyet_bld,dn.nguoi_duyet_bp) IS NOT NULL
             AND NOT EXISTS (
               SELECT 1 FROM thong_bao tb
               WHERE tb.bang='DE_NGHI' AND tb.id_ban_ghi=dn.id
                 AND tb.loai='NHAC_KY_BU'
             )
           FOR UPDATE OF dn"""
    ).fetchall()
    for row in rows:
        gui_thong_bao(
            conn,
            row["nguoi_ky"],
            "NHAC_KY_BU",
            f"Đề nghị {row['id']} đến hạn ký bù",
            f"Đề nghị {row['id']} đã được duyệt online và cần ký bù hôm nay.",
            row["id"],
        )
    return len(rows)


def lay_nguoi_duyet_bo_phan(conn, ma_bo_phan):
    rows = conn.execute(
        """SELECT t.ma_nhan_vien FROM tai_khoan t
           JOIN phan_quyen p ON p.vai_tro=t.vai_tro AND p.trang='de_nghi'
           WHERE t.trang_thai='HOAT_DONG' AND p.duoc_duyet=true
             AND p.pham_vi='bo_phan' AND t.ma_bo_phan=%s""", (ma_bo_phan,)
    ).fetchall()
    return [r["ma_nhan_vien"] for r in rows]


def lay_ban_lanh_dao(conn):
    return [r["ma_nhan_vien"] for r in conn.execute(
        "SELECT ma_nhan_vien FROM tai_khoan WHERE trang_thai='HOAT_DONG' AND vai_tro='BAN_LANH_DAO'"
    ).fetchall()]


def lay_nhan_vien_mua_hang(conn):
    return [r["ma_nhan_vien"] for r in conn.execute(
        """SELECT ma_nhan_vien FROM tai_khoan WHERE trang_thai='HOAT_DONG'
           AND vai_tro IN ('TBP_MUA_HANG','NV_MUA_HANG')"""
    ).fetchall()]


def huy_cac_dong(conn, id_dn, nguoi_sua):
    conn.execute("""UPDATE de_nghi_dong SET trang_thai_dong='HUY',nguoi_sua=%s
                    WHERE id_de_nghi=%s AND da_xoa=false""", (nguoi_sua, id_dn))


def lay_trao_doi(conn, id_dn):
    return conn.execute(
        """SELECT t.*,nv.ho_va_ten AS ten_nguoi_gui FROM trao_doi t
           LEFT JOIN nhan_vien nv ON nv.ma_nhan_vien=t.nguoi_gui
           WHERE t.bang='DE_NGHI' AND t.id_ban_ghi=%s ORDER BY t.thoi_diem""", (id_dn,)
    ).fetchall()


def them_trao_doi(conn, id_dn, noi_dung, nguoi_gui):
    return conn.execute(
        """INSERT INTO trao_doi(id,bang,id_ban_ghi,noi_dung,nguoi_gui)
           VALUES(%s,'DE_NGHI',%s,%s,%s) RETURNING *""",
        (f"TD-{uuid.uuid4().hex[:18].upper()}", id_dn, noi_dung, nguoi_gui),
    ).fetchone()


def lay_tep_dinh_kem(conn, id_dn):
    return conn.execute(
        """SELECT id,ten_tep,duong_dan,kich_thuoc,loai_mime,nguoi_tai_len,thoi_diem
           FROM tep_dinh_kem WHERE bang='DE_NGHI' AND id_ban_ghi=%s ORDER BY thoi_diem""", (id_dn,)
    ).fetchall()


def lay_mot_tep(conn, id_dn, id_tep):
    return conn.execute(
        """SELECT * FROM tep_dinh_kem
           WHERE id=%s AND bang='DE_NGHI' AND id_ban_ghi=%s""", (id_tep, id_dn)
    ).fetchone()


def them_tep_dinh_kem(conn, id_dn, ten_tep, duong_dan, kich_thuoc, loai_mime, nguoi_tai_len):
    return conn.execute(
        """INSERT INTO tep_dinh_kem(
             id,bang,id_ban_ghi,ten_tep,duong_dan,kich_thuoc,loai_mime,nguoi_tai_len)
           VALUES(%s,'DE_NGHI',%s,%s,%s,%s,%s,%s) RETURNING *""",
        (f"TEP-{uuid.uuid4().hex[:17].upper()}", id_dn, ten_tep, duong_dan,
         kich_thuoc, loai_mime, nguoi_tai_len),
    ).fetchone()
