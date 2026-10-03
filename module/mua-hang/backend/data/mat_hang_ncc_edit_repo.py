"""Sua ho so NCC co khoa phien ban va lich su trong cung giao dich."""
import json
from uuid import uuid4
from backend.data.db import get_conn
from backend.services.errors import KhongTimThay, XungDot, ThieuDuLieu

FIELDS = ('ten_hang','loai','nhom_hang_chinh','nhom_hang_chi_tiet',
          'ma_loai_gia_cong','ma_cong_doan','dvt','thong_so_ky_thuat',
          'diem_ky_thuat','muc_chat_luong','diem_chat_luong','nang_luc_thang',
          'so_ngay_giao_chuan')
IDENTITY = ('loai','nhom_hang_chinh','nhom_hang_chi_tiet','ma_loai_gia_cong','ma_cong_doan')


def ghi(conn, old, new, action, user):
    conn.execute('''INSERT INTO mat_hang_ncc_lich_su
      (id,id_mat_hang_ncc,hanh_dong,du_lieu_cu,du_lieu_moi,nguoi_thuc_hien)
      VALUES (%s,%s,%s,%s::jsonb,%s::jsonb,%s)''',
      ('MHLS-'+uuid4().hex,new['id'],action,
       json.dumps(old,default=str) if old else None,json.dumps(new,default=str),user))


def lay(id):
    with get_conn() as conn:
        row=conn.execute('SELECT * FROM mat_hang_ncc WHERE id=%s',(id,)).fetchone()
        if not row: raise KhongTimThay('Không tìm thấy mặt hàng NCC.')
        return dict(row)


def sua(id, version, data, user):
    with get_conn() as conn:
        old=conn.execute('SELECT * FROM mat_hang_ncc WHERE id=%s FOR UPDATE',(id,)).fetchone()
        if not old: raise KhongTimThay('Không tìm thấy mặt hàng NCC.')
        if old['phien_ban'] != version: raise XungDot('Mặt hàng vừa thay đổi. Hãy tải lại.')
        if any(old.get(k)!=data.get(k) for k in IDENTITY):
            if old['trang_thai'] == 'DA_DUYET':
                raise ThieuDuLieu('Nhóm đã duyệt có phạm vi cố định. Hãy tạo nhóm mới khi đổi phân loại.')
            scored=conn.execute('SELECT 1 FROM danh_gia_ncc WHERE id_mat_hang_ncc=%s LIMIT 1',(id,)).fetchone()
            if scored: raise ThieuDuLieu('Nhóm đã có bảng điểm. Hãy tạo nhóm mới để giữ đúng phạm vi lịch sử.')
        assignments=','.join(k+'=%s' for k in FIELDS)
        row=conn.execute(f'''UPDATE mat_hang_ncc SET {assignments},
          ngay_sua=now(),nguoi_sua=%s,phien_ban=phien_ban+1
          WHERE id=%s RETURNING *''',tuple(data.get(k) for k in FIELDS)+(user,id)).fetchone()
        ghi(conn,dict(old),dict(row),'SUA',user)
        return dict(row)


def lich_su(id):
    with get_conn() as conn:
        return [dict(r) for r in conn.execute('''SELECT * FROM mat_hang_ncc_lich_su
          WHERE id_mat_hang_ncc=%s ORDER BY thoi_diem DESC,id DESC LIMIT 100''',(id,))]
