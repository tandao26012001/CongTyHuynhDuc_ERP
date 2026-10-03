"""Receipt reconciliation. Call while holding the parent document lock."""


def tong_hop(conn, id_phieu):
    return conn.execute(
        """SELECT d.id,d.so_luong,
                  coalesce(sum(g.so_luong),0) AS da_len_lich,
                  coalesce(sum(g.so_luong) FILTER (WHERE g.ngay_thuc_te IS NOT NULL),0) AS da_nhan,
                  max(g.ngay_thuc_te) AS ngay_nhan
           FROM dat_ngoai_dong d LEFT JOIN dat_ngoai_dot_giao g ON g.id_dat_ngoai_dong=d.id
           WHERE d.id_dat_ngoai=%s GROUP BY d.id,d.so_luong""", (id_phieu,),
    ).fetchall()


def kiem_tra_du(rows):
    if not rows or any(r['so_luong'] <= 0 or r['da_nhan'] != r['so_luong']
                       or r['da_len_lich'] != r['so_luong'] for r in rows):
        raise ValueError('Chưa nhận đủ số lượng từng mã hàng theo các đợt giao.')


def dong_bo(conn, phieu, nguoi):
    rows = tong_hop(conn, phieu['id'])
    for r in rows:
        status = 'DA_NHAN' if r['da_nhan'] == r['so_luong'] else 'DANG_LAM'
        conn.execute(
            """UPDATE dat_ngoai_dong SET trang_thai_dong=%s,ngay_nhan=%s,
                      ngay_sua=now(),nguoi_sua=%s,phien_ban=phien_ban+1 WHERE id=%s""",
            (status, r['ngay_nhan'], nguoi, r['id']),
        )
    complete = bool(rows) and all(r['da_nhan'] == r['so_luong'] for r in rows)
    status = 'DA_NHAN' if complete else 'DANG_LAM'
    conn.execute(
        """UPDATE dat_ngoai SET trang_thai=%s,ngay_nhan=%s,ngay_sua=now(),
                  nguoi_sua=%s,phien_ban=phien_ban+1 WHERE id=%s""",
        (status, max(r['ngay_nhan'] for r in rows if r['ngay_nhan']) if complete else None,
         nguoi, phieu['id']),
    )
    conn.execute(
        """INSERT INTO dat_ngoai_lich_su
           (id_dat_ngoai,trang_thai_cu,trang_thai_moi,noi_dung,nguoi_thuc_hien)
           VALUES(%s,%s,%s,%s,%s)""",
        (phieu['id'], phieu['trang_thai'], status, 'Ghi nhận đợt giao; đối soát lượng nhận từng mã.', nguoi),
    )
