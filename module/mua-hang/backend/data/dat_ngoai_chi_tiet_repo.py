"""Chi tiet dong dat ngoai, xac nhan ky thuat va lich giao nhieu dot."""

from contextlib import nullcontext

from backend.data.db import get_conn
from backend.data.catalog_repo import _bat_dau_idempotency, _hoan_tat_idempotency
from backend.services.sinh_ma import sinh_ma


def lay_dong(id_phieu: str, id_dong: str, conn=None) -> dict | None:
    with get_conn() if conn is None else nullcontext(conn) as db:
        row = db.execute(
            """SELECT d.*,p.trang_thai AS trang_thai_phieu,p.nguoi_lap,
                      EXISTS (
                        SELECT 1 FROM dat_ngoai_yeu_cau_kt y
                        WHERE y.id_dat_ngoai_dong=d.id
                          AND NOT EXISTS (SELECT 1 FROM dat_ngoai_xac_nhan_kt x
                                          WHERE x.id_yeu_cau=y.id AND x.la_xac_nhan)
                      ) AS cho_xac_nhan_kt
               FROM dat_ngoai_dong d JOIN dat_ngoai p ON p.id=d.id_dat_ngoai
               WHERE p.id=%s AND d.id=%s""", (id_phieu, id_dong),
        ).fetchone()
        return dict(row) if row else None


def danh_sach_xac_nhan(id_dong: str, ma_hang: str | None, conn=None) -> list[dict]:
    dieu_kien_dong = 'd.ma_hang=%s' if ma_hang else 'd.id=%s'
    gia_tri_dong = ma_hang if ma_hang else id_dong
    with get_conn() if conn is None else nullcontext(conn) as db:
        return [dict(r) for r in db.execute(
            f"""WITH lich_su AS (
                   SELECT 'DONG-' || x.id AS id, x.thoi_diem, x.noi_dung,
                          x.nguoi_xac_nhan, d.id_dat_ngoai AS id_phieu,
                          'MA_HANG' AS loai, x.id_yeu_cau, d.id AS id_dong
                   FROM dat_ngoai_xac_nhan_kt x
                   JOIN dat_ngoai_dong d ON d.id=x.id_dat_ngoai_dong
                   WHERE x.la_xac_nhan
                     AND {dieu_kien_dong}
                   UNION ALL
                   SELECT 'YEU-' || y.id, y.thoi_diem, y.noi_dung,
                          y.nguoi_yeu_cau, d.id_dat_ngoai,
                          CASE WHEN y.la_ban_dau THEN 'YEU_CAU_BAN_DAU' ELSE 'YEU_CAU' END,
                          y.id, d.id
                   FROM dat_ngoai_yeu_cau_kt y
                   JOIN dat_ngoai_dong d ON d.id=y.id_dat_ngoai_dong
                   WHERE {dieu_kien_dong}
                 )
               SELECT h.*, nv.ho_va_ten AS ten_nguoi_xac_nhan
               FROM lich_su h
               LEFT JOIN nhan_vien nv ON nv.ma_nhan_vien=h.nguoi_xac_nhan
               ORDER BY h.thoi_diem DESC,h.id DESC""",
            (gia_tri_dong, gia_tri_dong),
        )]


def them_yeu_cau_ky_thuat(id_dong: str, noi_dung: str, nguoi: str,
                          tai_khoan: str, khoa: str) -> dict:
    with get_conn() as conn:
        path = f'POST:/api/v1/dat-ngoai/dong/{id_dong}/yeu-cau-kt'
        prior = _bat_dau_idempotency(conn, tai_khoan, khoa, path)
        if prior is not None:
            return prior
        line = conn.execute(
            """SELECT d.id,p.trang_thai FROM dat_ngoai_dong d
               JOIN dat_ngoai p ON p.id=d.id_dat_ngoai
               WHERE d.id=%s FOR UPDATE OF p,d""", (id_dong,),
        ).fetchone()
        if not line or line['trang_thai'] == 'HUY':
            raise ValueError('Phiếu đã kết thúc hoặc mã hàng không tồn tại.')
        pending = conn.execute(
            """SELECT 1 FROM dat_ngoai_yeu_cau_kt y
               WHERE y.id_dat_ngoai_dong=%s
                 AND NOT EXISTS (SELECT 1 FROM dat_ngoai_xac_nhan_kt x
                                 WHERE x.id_yeu_cau=y.id AND x.la_xac_nhan)
               LIMIT 1""", (id_dong,),
        ).fetchone()
        if pending:
            raise ValueError('Mã hàng đang có yêu cầu kỹ thuật chờ xác nhận.')
        row = conn.execute(
            """INSERT INTO dat_ngoai_yeu_cau_kt
                 (id,id_dat_ngoai_dong,noi_dung,nguoi_yeu_cau)
               VALUES (%s,%s,%s,%s) RETURNING *""",
            (sinh_ma(conn, 'DNYC'), id_dong, noi_dung, nguoi),
        ).fetchone()
        result = dict(row)
        _hoan_tat_idempotency(conn, tai_khoan, khoa, result)
        return result


def them_xac_nhan(id_dong: str, noi_dung: str, nguoi: str,
                  tai_khoan: str, khoa: str, id_yeu_cau: str | None = None,
                  conn=None) -> dict:
    with get_conn() if conn is None else nullcontext(conn) as conn:
        path = f'POST:/api/v1/dat-ngoai/dong/{id_dong}/xac-nhan-kt'
        prior = _bat_dau_idempotency(conn, tai_khoan, khoa, path)
        if prior is not None:
            return prior
        # Giu chuoi id_lan_truoc theo dung thu tu khi hai nguoi xac nhan
        # cung mot ma hang gan nhu dong thoi.
        line = conn.execute(
            """SELECT d.id,d.id_dat_ngoai,d.can_xac_nhan_ky_thuat,
                      d.trang_thai_dong,p.trang_thai
               FROM dat_ngoai_dong d JOIN dat_ngoai p ON p.id=d.id_dat_ngoai
               WHERE d.id=%s FOR UPDATE OF p,d""",
            (id_dong,),
        ).fetchone()
        previous = conn.execute(
            """SELECT id FROM dat_ngoai_xac_nhan_kt
               WHERE id_dat_ngoai_dong=%s ORDER BY thoi_diem DESC,id DESC LIMIT 1""",
            (id_dong,),
        ).fetchone()
        pending = conn.execute(
            """SELECT y.id FROM dat_ngoai_yeu_cau_kt y
               WHERE y.id_dat_ngoai_dong=%s AND (%s::varchar IS NULL OR y.id=%s)
                 AND NOT EXISTS (SELECT 1 FROM dat_ngoai_xac_nhan_kt x
                                 WHERE x.id_yeu_cau=y.id AND x.la_xac_nhan)
               ORDER BY y.thoi_diem,y.id LIMIT 1""",
            (id_dong, id_yeu_cau, id_yeu_cau),
        ).fetchone()
        if id_yeu_cau and not pending:
            raise ValueError('Yêu cầu kỹ thuật không còn chờ trả lời hoặc không thuộc mã hàng này.')
        if not id_yeu_cau and pending:
            raise ValueError('Hãy trả lời trực tiếp trên yêu cầu kỹ thuật đang chờ.')
        if (not line or line['trang_thai'] == 'HUY'
                or (line['trang_thai'] == 'HOAN_THANH' and not pending)
                or (not line['can_xac_nhan_ky_thuat'] and not pending)):
            raise ValueError('Mã hàng không còn yêu cầu kỹ thuật chờ xác nhận.')
        row = conn.execute(
            """INSERT INTO dat_ngoai_xac_nhan_kt
                 (id,id_dat_ngoai_dong,noi_dung,nguoi_xac_nhan,id_lan_truoc,la_xac_nhan,id_yeu_cau)
               VALUES (%s,%s,%s,%s,%s,true,%s) RETURNING *""",
            (sinh_ma(conn, 'DNKT'), id_dong, noi_dung, nguoi,
             previous['id'] if previous else None, pending['id'] if pending else None),
        ).fetchone()
        result = dict(row)
        if line['trang_thai'] == 'CHO_XAC_NHAN_KY_THUAT':
            conn.execute(
                """UPDATE dat_ngoai_dong d SET trang_thai_dong='DANG_BAO_GIA',
                          ngay_sua=now(),nguoi_sua=%s
                   WHERE d.id=%s AND d.trang_thai_dong='CHO_XAC_NHAN_KY_THUAT'
                     AND NOT EXISTS (
                       SELECT 1 FROM dat_ngoai_yeu_cau_kt y
                       WHERE y.id_dat_ngoai_dong=d.id
                         AND NOT EXISTS (
                           SELECT 1 FROM dat_ngoai_xac_nhan_kt x
                           WHERE x.id_yeu_cau=y.id AND x.la_xac_nhan
                         )
                     )""",
                (nguoi, id_dong),
            )
            # Khóa phiếu đã được giữ ở trên: lần xác nhận cuối cùng chuyển bước
            # trong cùng giao dịch với câu trả lời, kể cả khi nhiều mã được trả lời cùng lúc.
            advanced = conn.execute(
                """UPDATE dat_ngoai p SET trang_thai='DANG_BAO_GIA',
                          nguoi_xac_nhan_ky_thuat=%s,xac_nhan_ky_thuat_luc=now(),
                          ngay_sua=now(),nguoi_sua=%s,phien_ban=phien_ban+1
                   WHERE p.id=%s AND p.trang_thai='CHO_XAC_NHAN_KY_THUAT'
                     AND NOT EXISTS (
                       SELECT 1 FROM dat_ngoai_yeu_cau_kt y
                       JOIN dat_ngoai_dong d ON d.id=y.id_dat_ngoai_dong
                       WHERE d.id_dat_ngoai=p.id
                         AND NOT EXISTS (
                           SELECT 1 FROM dat_ngoai_xac_nhan_kt x
                           WHERE x.id_yeu_cau=y.id AND x.la_xac_nhan
                         )
                     ) RETURNING id""",
                (nguoi, nguoi, line['id_dat_ngoai']),
            ).fetchone()
            if advanced:
                conn.execute(
                    """UPDATE dat_ngoai_dong SET trang_thai_dong='DANG_BAO_GIA',
                              ngay_sua=now(),nguoi_sua=%s WHERE id_dat_ngoai=%s
                         AND trang_thai_dong='CHO_XAC_NHAN_KY_THUAT'""",
                    (nguoi, line['id_dat_ngoai']),
                )
                conn.execute(
                    """INSERT INTO dat_ngoai_lich_su
                         (id_dat_ngoai,trang_thai_cu,trang_thai_moi,noi_dung,nguoi_thuc_hien)
                       VALUES (%s,'CHO_XAC_NHAN_KY_THUAT','DANG_BAO_GIA',%s,%s)""",
                    (line['id_dat_ngoai'], 'Đã xác nhận kỹ thuật tất cả mã hàng.', nguoi),
                )
        _hoan_tat_idempotency(conn, tai_khoan, khoa, result)
        return result


def sua_dong(id_dong: str, phien_ban: int, data: dict, nguoi: str) -> dict | None:
    with get_conn() as conn:
        old = conn.execute(
            'SELECT ngay_ncc_cam_ket FROM dat_ngoai_dong WHERE id=%s FOR UPDATE',
            (id_dong,),
        ).fetchone()
        row = conn.execute(
            """UPDATE dat_ngoai_dong SET noi_dung_gia_cong=%s,yeu_cau_ky_thuat=%s,
                      yeu_cau_chat_luong=%s,ngay_khach_yeu_cau=%s,
                      ngay_ncc_cam_ket=%s,ngay_du_kien_noi_bo=%s,
                      ma_hang_thay_the=%s,id_su_co=%s,ngay_sua=now(),
                      nguoi_sua=%s,phien_ban=phien_ban+1
               WHERE id=%s AND phien_ban=%s RETURNING *""",
            (data['noi_dung_gia_cong'], data['yeu_cau_ky_thuat'],
             data['yeu_cau_chat_luong'], data.get('ngay_khach_yeu_cau'),
             data.get('ngay_ncc_cam_ket'), data.get('ngay_du_kien_noi_bo'),
             data.get('ma_hang_thay_the'), data.get('id_su_co'), nguoi,
             id_dong, phien_ban),
        ).fetchone()
        if row and old and data.get('ngay_ncc_cam_ket') and old['ngay_ncc_cam_ket'] != data['ngay_ncc_cam_ket']:
            conn.execute(
                """INSERT INTO dat_ngoai_lich_su_ky_han
                     (id,id_dat_ngoai_dong,ngay_cu,ngay_moi,ly_do,nguoi_sua)
                   VALUES (%s,%s,%s,%s,%s,%s)""",
                (sinh_ma(conn, 'DNGH'), id_dong, old['ngay_ncc_cam_ket'], data['ngay_ncc_cam_ket'],
                 data.get('ly_do_doi_han') or 'Cập nhật lần đầu', nguoi),
            )
        return dict(row) if row else None


def danh_sach_dot_giao(id_dong: str, conn=None) -> list[dict]:
    with get_conn() if conn is None else nullcontext(conn) as db:
        dots = [dict(r) for r in db.execute(
            "SELECT * FROM dat_ngoai_dot_giao WHERE id_dat_ngoai_dong=%s ORDER BY dot_so",
            (id_dong,),
        )]
        if not dots:
            return dots
        histories = db.execute(
            """SELECT h.*,nv.ho_va_ten AS ten_nguoi_sua
               FROM dat_ngoai_dot_giao_lich_su h
               LEFT JOIN nhan_vien nv ON nv.ma_nhan_vien=h.nguoi_sua
               WHERE h.id_dat_ngoai_dot_giao IN (
                 SELECT id FROM dat_ngoai_dot_giao WHERE id_dat_ngoai_dong=%s
               ) ORDER BY h.thoi_diem,h.id""", (id_dong,),
        ).fetchall()
        by_dot: dict[str, list[dict]] = {}
        for history in histories:
            entry = dict(history)
            by_dot.setdefault(entry['id_dat_ngoai_dot_giao'], []).append(entry)
        for dot in dots:
            dot['lich_su'] = by_dot.get(dot['id'], [])
        return dots


def them_dot_giao(id_dong: str, data: dict, nguoi: str,
                  tai_khoan: str, khoa: str) -> dict:
    with get_conn() as conn:
        path = f'POST:/api/v1/dat-ngoai/dong/{id_dong}/dot-giao'
        prior = _bat_dau_idempotency(conn, tai_khoan, khoa, path)
        if prior is not None:
            return prior
        parent = conn.execute(
            'SELECT so_luong FROM dat_ngoai_dong WHERE id=%s FOR UPDATE', (id_dong,),
        ).fetchone()
        used = conn.execute(
            'SELECT coalesce(sum(so_luong),0) AS total FROM dat_ngoai_dot_giao WHERE id_dat_ngoai_dong=%s',
            (id_dong,),
        ).fetchone()['total']
        if parent is None or used + data['so_luong'] > parent['so_luong']:
            raise ValueError('Tong so luong dot giao vuot so luong dat ngoai')
        row = conn.execute(
            """INSERT INTO dat_ngoai_dot_giao
                 (id,id_dat_ngoai_dong,dot_so,so_luong,ngay_du_kien,ghi_chu,nguoi_tao)
               VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
            (sinh_ma(conn, 'DNGG'), id_dong, data['dot_so'], data['so_luong'],
             data['ngay_du_kien'], data.get('ghi_chu'), nguoi),
        ).fetchone()
        result = dict(row)
        _hoan_tat_idempotency(conn, tai_khoan, khoa, result)
        return result


def nhan_dot_giao(id_dong: str, id_dot: str, phien_ban: int,
                  ngay_thuc_te, nguoi: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            """UPDATE dat_ngoai_dot_giao SET ngay_thuc_te=%s,ngay_sua=now(),
                      nguoi_sua=%s,phien_ban=phien_ban+1
               WHERE id=%s AND id_dat_ngoai_dong=%s AND phien_ban=%s
               RETURNING *""", (ngay_thuc_te, nguoi, id_dot, id_dong, phien_ban),
        ).fetchone()
        return dict(row) if row else None


def sua_ngay_du_kien_dot_giao(id_dong: str, id_dot: str, phien_ban: int,
                              ngay_du_kien, ly_do: str, nguoi: str) -> dict | None:
    with get_conn() as conn:
        current = conn.execute(
            """SELECT ngay_du_kien FROM dat_ngoai_dot_giao
               WHERE id=%s AND id_dat_ngoai_dong=%s FOR UPDATE""",
            (id_dot, id_dong),
        ).fetchone()
        if not current:
            return None
        if current['ngay_du_kien'] == ngay_du_kien:
            return conn.execute(
                """SELECT * FROM dat_ngoai_dot_giao
                   WHERE id=%s AND id_dat_ngoai_dong=%s AND phien_ban=%s""",
                (id_dot, id_dong, phien_ban),
            ).fetchone()
        row = conn.execute(
            """UPDATE dat_ngoai_dot_giao SET ngay_du_kien=%s,ngay_sua=now(),
                      nguoi_sua=%s,phien_ban=phien_ban+1
               WHERE id=%s AND id_dat_ngoai_dong=%s AND phien_ban=%s
               RETURNING *""", (ngay_du_kien, nguoi, id_dot, id_dong, phien_ban),
        ).fetchone()
        if not row:
            return None
        conn.execute(
            """INSERT INTO dat_ngoai_dot_giao_lich_su
                 (id,id_dat_ngoai_dot_giao,ngay_cu,ngay_moi,ly_do,nguoi_sua)
               VALUES (%s,%s,%s,%s,%s,%s)""",
            (sinh_ma(conn, 'DNGH'), id_dot, current['ngay_du_kien'],
             ngay_du_kien, ly_do, nguoi),
        )
        return dict(row)
