from backend.data.db import get_conn


def danh_sach(ma_danh_muc: str, id_ban_ghi: str, offset: int, limit: int):
    with get_conn() as conn:
        total = conn.execute(
            """SELECT count(*) AS n FROM nhat_ky_thay_doi
               WHERE ma_danh_muc=%s AND id_ban_ghi=%s""",
            (ma_danh_muc, id_ban_ghi),
        ).fetchone()["n"]
        rows = conn.execute(
            """SELECT id,ma_danh_muc,'danh_muc'::text AS ma_trang,
                      id_ban_ghi,hanh_dong,du_lieu_cu,du_lieu_moi,
                      nguoi_sua AS nguoi_thuc_hien,thoi_diem
               FROM nhat_ky_thay_doi
               WHERE ma_danh_muc=%s AND id_ban_ghi=%s
               ORDER BY thoi_diem DESC,id DESC OFFSET %s LIMIT %s""",
            (ma_danh_muc, id_ban_ghi, offset, limit),
        ).fetchall()
        return rows, total
