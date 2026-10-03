"""Nguon bieu mau NCC, khong gioi han 500 dong cua man hinh."""
from backend.data.db import get_conn
from backend.services.errors import KhongTimThay


def danh_muc(id_ncc=None):
    with get_conn() as c:
        return [dict(r) for r in c.execute('''SELECT n.*,
          (SELECT string_agg(m.ten_hang, ', ' ORDER BY m.ten_hang)
           FROM mat_hang_ncc m WHERE m.id_ncc=n.id AND m.trang_thai='DA_DUYET') AS san_pham
          FROM nha_cung_cap n WHERE n.da_phe_duyet=true
          AND (%s::text IS NULL OR n.id=%s) ORDER BY n.ten,n.id''',(id_ncc,id_ncc))]


def bang_diem(id):
    with get_conn() as c:
        row=c.execute('''SELECT dg.*,n.ten AS ten_ncc,n.ma_ncc,n.dia_chi,n.mst,
           n.nguoi_lien_he,n.email,n.sdt,n.nganh_nghe,m.ten_hang,m.pham_vi_danh_gia,
           m.nhom_hang_chinh,m.nhom_hang_chi_tiet,m.ma_loai_gia_cong,m.ma_cong_doan,
           nv.ho_va_ten AS ten_nguoi_cham,duyet.ho_va_ten AS ten_nguoi_duyet
          FROM danh_gia_ncc dg JOIN nha_cung_cap n ON n.id=dg.id_ncc
          LEFT JOIN mat_hang_ncc m ON m.id=dg.id_mat_hang_ncc
          LEFT JOIN nhan_vien nv ON nv.ma_nhan_vien=dg.nguoi_danh_gia
          LEFT JOIN nhan_vien duyet ON duyet.ma_nhan_vien=dg.nguoi_duyet
          WHERE dg.id=%s''',(id,)).fetchone()
        if not row: raise KhongTimThay('Không tìm thấy bảng điểm NCC.')
        return dict(row)


def tong_hop(year,id_ncc=None):
    with get_conn() as c:
        return [dict(r) for r in c.execute('''SELECT n.id AS id_ncc,n.ten AS ten_ncc,n.dia_chi,
          m.id AS id_mat_hang_ncc,m.ten_hang,dg.id,dg.xep_loai,dg.diem_tong,
          dg.ngay_danh_gia,dg.ngay_duyet
          FROM danh_gia_ncc dg JOIN nha_cung_cap n ON n.id=dg.id_ncc
          JOIN mat_hang_ncc m ON m.id=dg.id_mat_hang_ncc
          WHERE dg.trang_thai_duyet='DA_DUYET'
          AND extract(year FROM dg.ngay_danh_gia)=%s
          AND (%s::text IS NULL OR n.id=%s)
          ORDER BY n.ten,m.ten_hang,dg.ngay_danh_gia,dg.ngay_duyet,dg.id''',(year,id_ncc,id_ncc))]


def su_co(start,end,id_ncc=None):
    with get_conn() as c:
        return [dict(r) for r in c.execute('''SELECT r.ngay_nhan,n.ten AS ten_ncc,
          d.ten_hang_chup AS ten_hang,v.ma_vat_tu,h.mo_ta,h.huong_xu_ly,h.ket_qua,
          coalesce(nv.ho_va_ten,h.nguoi_giam_sat) AS nguoi_giam_sat
          FROM hang_khong_phu_hop h
          JOIN ket_qua_iqc k ON k.id=h.id_ket_qua_iqc
          JOIN nhan_hang_dong d ON d.id=k.id_nhan_hang_dong
          JOIN nhan_hang r ON r.id=d.id_nhan_hang
          LEFT JOIN nha_cung_cap n ON n.id=coalesce(h.id_ncc,r.id_ncc)
          LEFT JOIN vat_tu v ON v.id=d.id_vat_tu
          LEFT JOIN nhan_vien nv ON nv.ma_nhan_vien=h.nguoi_giam_sat
          WHERE r.ngay_nhan BETWEEN %s AND %s
          AND (%s::text IS NULL OR n.id=%s)
          ORDER BY r.ngay_nhan,h.id''',(start,end,id_ncc,id_ncc))]


def ghi_xuat(form,user,filters):
    import json
    from uuid import uuid4
    with get_conn() as c:
        c.execute('''INSERT INTO ncc_bieu_mau_xuat(id,bieu_mau,nguoi_thuc_hien,bo_loc)
          VALUES (%s,%s,%s,%s::jsonb)''',('BMX-'+uuid4().hex,form,user,json.dumps(filters,default=str)))
