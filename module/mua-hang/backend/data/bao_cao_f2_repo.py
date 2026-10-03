"""Bay bang goc bao cao F2, chi doc tu chung tu."""

from backend.data.db import get_conn
from backend.data.ncc_nhom import dieu_kien_vat_tu


QUERIES = {
    'hieu-qua': """SELECT d.id AS ma_dong, p.id AS so_phieu, p.ngay_hieu_luc AS ngay,
        p.ma_bo_phan AS bo_phan, p.nguoi_mua_hang AS nhan_vien,
        v.ma_vat_tu, d.ten_hang_chup AS ten_hang, d.ma_chung_loai AS nhom_hang,
        d.trang_thai_dong AS trang_thai, d.ky_han_yc AS ky_han,
        d.tra_loi_ky_han AS ky_han_doi_ung, d.bat_kha_thi,
        p.tinh_trang_yc AS tinh_trang_yeu_cau,
        (current_date-d.ngay_tao::date)::integer AS so_ngay_cho,
        o.id_ncc,coalesce(p.nguoi_mua_hang,p.nguoi_yeu_cau) AS _owner,
        p.ma_bo_phan AS _department
      FROM de_nghi_dong d JOIN de_nghi p ON p.id=d.id_de_nghi
      LEFT JOIN vat_tu v ON v.id=coalesce(d.id_vt_duyet_mua,d.id_vt_de_nghi)
      LEFT JOIN don_hang_dong od ON od.id_de_nghi_dong=d.id
      LEFT JOIN don_hang o ON o.id=od.id_don_hang
      WHERE p.ngay_hieu_luc BETWEEN %(from)s AND %(to)s
        AND (%(ncc)s IS NULL OR o.id_ncc=%(ncc)s)
        AND (%(status)s IS NULL OR d.trang_thai_dong=%(status)s)
      ORDER BY p.ngay_hieu_luc DESC,d.id LIMIT 2000""",
    'bao-gia': """SELECT yd.id AS ma_dong, y.id AS so_ycbg, y.ngay_gui AS ngay,
        y.id_ncc, n.ten AS nha_cung_cap, yd.ten_hang_chup AS ten_hang,
        yd.so_luong,
        y.han_tra_loi, y.trang_thai,y.nguoi_tao AS _owner,
        nv.ma_bo_phan AS _department,
        b.ngay_bao_gia AS ngay_tra_loi, bd.don_gia_co_so AS don_gia,
        (b.ngay_bao_gia-y.ngay_gui)::integer AS so_ngay_tra_loi
      FROM ycbg_dong yd JOIN yeu_cau_bao_gia y ON y.id=yd.id_ycbg
      LEFT JOIN nhan_vien nv ON nv.ma_nhan_vien=y.nguoi_tao
      LEFT JOIN nha_cung_cap n ON n.id=y.id_ncc
      LEFT JOIN bao_gia b ON b.id_ycbg=y.id AND b.id_ncc=y.id_ncc
      LEFT JOIN bao_gia_dong bd ON bd.id_bao_gia=b.id AND bd.stt_dong=yd.stt_dong
      WHERE y.ngay_gui BETWEEN %(from)s AND %(to)s
        AND (%(ncc)s IS NULL OR y.id_ncc=%(ncc)s)
        AND (%(status)s IS NULL OR y.trang_thai=%(status)s)
      ORDER BY y.ngay_gui DESC,yd.id LIMIT 2000""",
    'dat-hang': """SELECT d.id AS ma_dong, o.id AS so_don, o.ngay_dat AS ngay,
        o.id_ncc,n.ten AS nha_cung_cap,v.ma_vat_tu,
        d.ten_hang_chup AS ten_hang,d.so_luong,d.don_gia_co_so AS don_gia,
        d.don_gia_co_so * CASE WHEN d.don_vi_gia='PCS' THEN d.so_luong
          ELSE d.trong_luong END AS thanh_tien,
        d.ky_han_giao,o.nguoi_kiem_tra AS nhan_vien,o.trang_thai,
        coalesce(o.nguoi_kiem_tra,o.nguoi_tao) AS _owner,
        nv.ma_bo_phan AS _department,
        d.trang_thai_dong AS trang_thai_dong
      FROM don_hang_dong d JOIN don_hang o ON o.id=d.id_don_hang
      JOIN nha_cung_cap n ON n.id=o.id_ncc
      LEFT JOIN nhan_vien nv ON nv.ma_nhan_vien=coalesce(o.nguoi_kiem_tra,o.nguoi_tao)
      LEFT JOIN vat_tu v ON v.id=d.id_vat_tu
      WHERE o.ngay_dat BETWEEN %(from)s AND %(to)s
        AND (%(ncc)s IS NULL OR o.id_ncc=%(ncc)s)
        AND (%(status)s IS NULL OR d.trang_thai_dong=%(status)s)
      ORDER BY o.ngay_dat DESC,d.id LIMIT 2000""",
    'giao-nhan': """SELECT d.id AS ma_dong,h.id AS so_phieu,h.ngay_nhan AS ngay,
        h.id_ncc,n.ten AS nha_cung_cap,v.ma_vat_tu,d.ten_hang_chup AS ten_hang,
        d.so_luong_nhan,d.so_ngay_som_tre AS so_ngay_som_tre,
        h.lan_giao,k.ket_luan AS ket_luan_iqc,k.so_luong_kiem,
        k.so_luong_dat, h.trang_thai,h.nguoi_nhan AS _owner,
        nv.ma_bo_phan AS _department
      FROM nhan_hang_dong d JOIN nhan_hang h ON h.id=d.id_nhan_hang
      LEFT JOIN nha_cung_cap n ON n.id=h.id_ncc
      LEFT JOIN vat_tu v ON v.id=d.id_vat_tu
      LEFT JOIN ket_qua_iqc k ON k.id_nhan_hang_dong=d.id
      LEFT JOIN nhan_vien nv ON nv.ma_nhan_vien=h.nguoi_nhan
      WHERE h.ngay_nhan BETWEEN %(from)s AND %(to)s
        AND (%(ncc)s IS NULL OR h.id_ncc=%(ncc)s)
        AND (%(status)s IS NULL OR h.trang_thai=%(status)s)
      ORDER BY h.ngay_nhan DESC,d.id LIMIT 2000""",
    'thanh-toan': """SELECT coalesce(dt.id,y.id) AS ma_dong,y.id AS so_yeu_cau,
        y.ngay_yeu_cau AS ngay,y.id_ncc,n.ten AS nha_cung_cap,
        y.id_don_hang AS so_don,dt.dot_so,dt.so_tien,dt.ngay_du_kien,
        dt.ngay_thuc_te,coalesce(dt.trang_thai,y.trang_thai) AS trang_thai,
        y.nguoi_de_nghi AS _owner,nv.ma_bo_phan AS _department
      FROM yeu_cau_thanh_toan y
      JOIN nha_cung_cap n ON n.id=y.id_ncc
      LEFT JOIN nhan_vien nv ON nv.ma_nhan_vien=y.nguoi_de_nghi
      LEFT JOIN dot_thanh_toan dt ON dt.id_yctt=y.id
      WHERE y.ngay_yeu_cau BETWEEN %(from)s AND %(to)s
        AND (%(ncc)s IS NULL OR y.id_ncc=%(ncc)s)
        AND (%(status)s IS NULL OR coalesce(dt.trang_thai,y.trang_thai)=%(status)s)
      ORDER BY y.ngay_yeu_cau DESC,y.id LIMIT 2000""",
    'nha-cung-cap': f"""SELECT m.id AS ma_dong,n.id AS id_ncc,n.ma_ncc,
        n.ten AS nha_cung_cap,n.trang_thai,n.da_phe_duyet,
        n.dinh_muc_thang,m.ten_hang,m.nhom_hang_chinh AS nhom_hang,
        m.trang_thai AS trang_thai_mat_hang,
        coalesce(n.nguoi_de_xuat,n.nguoi_tao) AS _owner,
        nv.ma_bo_phan AS _department,
        dg.diem_tong,dg.xep_loai,dg.ngay_danh_gia,
        (SELECT count(*) FROM nhan_hang_dong d JOIN nhan_hang h ON h.id=d.id_nhan_hang
         LEFT JOIN vat_tu v ON v.id=d.id_vat_tu
         WHERE h.id_ncc=n.id AND {dieu_kien_vat_tu()}
           AND h.ngay_nhan BETWEEN %(from)s AND %(to)s)::integer AS so_dong_giao,
        (SELECT count(*) FROM nhan_hang_dong d JOIN nhan_hang h ON h.id=d.id_nhan_hang
         LEFT JOIN vat_tu v ON v.id=d.id_vat_tu
         WHERE h.id_ncc=n.id AND {dieu_kien_vat_tu()}
           AND h.ngay_nhan BETWEEN %(from)s AND %(to)s
           AND d.so_ngay_som_tre>0)::integer AS so_dong_tre
      FROM nha_cung_cap n LEFT JOIN mat_hang_ncc m ON m.id_ncc=n.id
      LEFT JOIN nhan_vien nv ON nv.ma_nhan_vien=coalesce(n.nguoi_de_xuat,n.nguoi_tao)
      LEFT JOIN LATERAL (
        SELECT diem_tong,xep_loai,ngay_danh_gia FROM danh_gia_ncc
        WHERE id_mat_hang_ncc=m.id AND trang_thai_duyet='DA_DUYET'
          AND ngay_danh_gia<=%(to)s
        ORDER BY ngay_danh_gia DESC,ngay_duyet DESC LIMIT 1
      ) dg ON true
      WHERE (%(ncc)s IS NULL OR n.id=%(ncc)s)
        AND (%(status)s IS NULL OR m.trang_thai=%(status)s)
      ORDER BY n.ten,m.ten_hang LIMIT 2000""",
    'dat-ngoai': """SELECT d.id AS ma_dong,p.id AS so_phieu,p.lenh_san_xuat,
        p.ngay_lap AS ngay,d.id_ncc,
        coalesce(d.ten_ncc_chup,CASE WHEN p.id_ncc IS NOT NULL THEN p.ten_ncc_chup END) AS nha_cung_cap,
        d.ma_hang,d.ten_hang_chup AS ten_hang,d.so_luong,
        d.don_gia,d.so_luong*d.don_gia AS chi_phi,
        d.ky_han AS ngay_du_kien,d.ngay_nhan AS ngay_thuc_te,
        d.trang_thai_dong AS trang_thai,p.nguoi_lap AS _owner,
        nv.ma_bo_phan AS _department,
        (SELECT count(*) FROM dat_ngoai_xac_nhan_kt x
         WHERE x.id_dat_ngoai_dong=d.id)::integer AS so_lan_xac_nhan
      FROM dat_ngoai_dong d JOIN dat_ngoai p ON p.id=d.id_dat_ngoai
      LEFT JOIN nhan_vien nv ON nv.ma_nhan_vien=p.nguoi_lap
      WHERE p.ngay_lap BETWEEN %(from)s AND %(to)s
        AND (%(ncc)s IS NULL OR d.id_ncc=%(ncc)s)
        AND (%(status)s IS NULL OR d.trang_thai_dong=%(status)s)
      ORDER BY p.ngay_lap DESC,d.id LIMIT 2000""",
}


def lay_bang_goc(tab: str, filters: dict, pham_vi: str,
                 ma_nhan_vien: str, ma_bo_phan: str | None) -> list[dict]:
    query = QUERIES[tab].replace(' LIMIT 2000', '')
    dieu_kien = []
    params = dict(filters)
    if pham_vi == 'ca_nhan':
        dieu_kien.append('_owner=%(ma_nhan_vien)s')
        params['ma_nhan_vien'] = ma_nhan_vien
    elif pham_vi == 'bo_phan':
        dieu_kien.append('_department=%(ma_bo_phan)s')
        params['ma_bo_phan'] = ma_bo_phan
    sql = f'SELECT * FROM ({query}) AS report_rows'
    if dieu_kien:
        sql += ' WHERE ' + ' AND '.join(dieu_kien)
    with get_conn() as conn:
        return [dict(row) for row in conn.execute(sql, params)]
