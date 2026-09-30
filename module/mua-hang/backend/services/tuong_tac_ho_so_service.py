"""Trao doi va tep dinh kem dung chung cho ho so NCC va phieu Dat ngoai."""

import re
import uuid
from pathlib import Path

from backend.config.settings import MAX_UPLOAD_BYTES, UPLOAD_DIR
from backend.data.db import get_conn
from backend.services.errors import KhongCoQuyen, KhongTimThay, ThieuDuLieu
from backend.services.phan_quyen_service import kiem_quyen

DOI_TUONG = {'ncc': ('NHA_CUNG_CAP', 'ncc'),
             'dat-ngoai': ('DAT_NGOAI', 'dat_ngoai')}
MIME_CHO_PHEP = {'application/pdf', 'image/jpeg', 'image/png', 'image/webp'}
ID_HO_SO_RE = re.compile(r'^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$')


def _doi_tuong(loai: str, id_ho_so: str) -> tuple[str, str]:
    if loai not in DOI_TUONG:
        raise ThieuDuLieu('Loại hồ sơ không hợp lệ.')
    if not ID_HO_SO_RE.fullmatch(id_ho_so):
        raise ThieuDuLieu('Mã hồ sơ không hợp lệ.')
    bang, trang = DOI_TUONG[loai]
    return bang, trang


def _kiem_tra_ho_so(conn, loai: str, id_ho_so: str, ho_so: dict,
                    hanh_dong: str = 'xem') -> tuple[str, str]:
    bang, trang = _doi_tuong(loai, id_ho_so)
    scope = kiem_quyen(ho_so, trang, hanh_dong, conn)
    if loai == 'ncc':
        row = conn.execute(
            """SELECT coalesce(n.nguoi_de_xuat,n.nguoi_tao) AS nguoi_phu_trach,
                      nv.ma_bo_phan
               FROM nha_cung_cap n
               LEFT JOIN nhan_vien nv
                 ON nv.ma_nhan_vien=coalesce(n.nguoi_de_xuat,n.nguoi_tao)
               WHERE n.id=%s""", (id_ho_so,),
        ).fetchone()
        if not row:
            raise KhongTimThay('Không tìm thấy nhà cung cấp.')
        _kiem_scope(scope, row, ho_so, 'nguoi_phu_trach')
    else:
        row = conn.execute(
            """SELECT d.nguoi_lap,nv.ma_bo_phan
               FROM dat_ngoai d
               LEFT JOIN nhan_vien nv ON nv.ma_nhan_vien=d.nguoi_lap
               WHERE d.id=%s""", (id_ho_so,),
        ).fetchone()
        if not row:
            raise KhongTimThay('Không tìm thấy phiếu đặt ngoài.')
        _kiem_scope(scope, row, ho_so, 'nguoi_lap')
    return bang, trang


def _kiem_scope(scope: str, row: dict, ho_so: dict, cot_nguoi: str) -> None:
    if scope == 'ca_nhan' and row[cot_nguoi] != ho_so['ma_nhan_vien']:
        raise KhongCoQuyen('Bạn không có quyền truy cập hồ sơ này.')
    if scope == 'bo_phan' and row.get('ma_bo_phan') != ho_so.get('ma_bo_phan'):
        raise KhongCoQuyen('Hồ sơ không thuộc bộ phận của bạn.')


def danh_sach(loai: str, id_ho_so: str, ho_so: dict) -> dict:
    with get_conn() as conn:
        bang, _ = _kiem_tra_ho_so(conn, loai, id_ho_so, ho_so)
        messages = conn.execute(
            """SELECT t.id,t.noi_dung,t.nguoi_gui,t.thoi_diem,nv.ho_va_ten AS ten_nguoi_gui
               FROM trao_doi t LEFT JOIN nhan_vien nv ON nv.ma_nhan_vien=t.nguoi_gui
               WHERE t.bang=%s AND t.id_ban_ghi=%s ORDER BY t.thoi_diem,t.id""",
            (bang, id_ho_so),
        ).fetchall()
        files = conn.execute(
            """SELECT id,ten_tep,kich_thuoc,loai_mime,nguoi_tai_len,thoi_diem
               FROM tep_dinh_kem WHERE bang=%s AND id_ban_ghi=%s ORDER BY thoi_diem,id""",
            (bang, id_ho_so),
        ).fetchall()
    return {'trao_doi': [dict(row) for row in messages],
            'tep': [dict(row) for row in files]}


def them_trao_doi(loai: str, id_ho_so: str, noi_dung: str, ho_so: dict) -> dict:
    content = str(noi_dung or '').strip()
    if not content or len(content) > 5000:
        raise ThieuDuLieu('Nội dung trao đổi phải từ 1 đến 5.000 ký tự.')
    with get_conn() as conn:
        bang, _ = _kiem_tra_ho_so(conn, loai, id_ho_so, ho_so, 'sua')
        row = conn.execute(
            """INSERT INTO trao_doi(id,bang,id_ban_ghi,noi_dung,nguoi_gui)
               VALUES(%s,%s,%s,%s,%s) RETURNING id,noi_dung,nguoi_gui,thoi_diem""",
            (f'TD-{uuid.uuid4().hex[:18].upper()}', bang, id_ho_so,
             content, ho_so['ma_nhan_vien']),
        ).fetchone()
        return dict(row)


def them_tep(loai: str, id_ho_so: str, ten_tep: str, noi_dung: bytes,
             loai_mime: str | None, ho_so: dict) -> dict:
    if not noi_dung or len(noi_dung) > MAX_UPLOAD_BYTES:
        raise ThieuDuLieu(f'Tệp phải có dung lượng từ 1 đến {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.')
    if loai_mime not in MIME_CHO_PHEP:
        raise ThieuDuLieu('Chỉ nhận PDF, JPG, PNG hoặc WEBP.')
    with get_conn() as conn:
        bang, _ = _kiem_tra_ho_so(conn, loai, id_ho_so, ho_so, 'sua')
        safe_name = re.sub(r'[^A-Za-z0-9._-]', '_', Path(ten_tep).name)[:180]
        root = Path(UPLOAD_DIR).resolve()
        folder = (root / loai / id_ho_so).resolve()
        if not folder.is_relative_to(root):
            raise ThieuDuLieu('Đường dẫn hồ sơ không hợp lệ.')
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / f'{uuid.uuid4().hex}_{safe_name}'
        path.write_bytes(noi_dung)
        try:
            row = conn.execute(
                """INSERT INTO tep_dinh_kem(
                     id,bang,id_ban_ghi,ten_tep,duong_dan,kich_thuoc,loai_mime,nguoi_tai_len)
                   VALUES(%s,%s,%s,%s,%s,%s,%s,%s)
                   RETURNING id,ten_tep,kich_thuoc,loai_mime,nguoi_tai_len,thoi_diem""",
                (f'TEP-{uuid.uuid4().hex[:17].upper()}', bang, id_ho_so,
                 safe_name, str(path), len(noi_dung), loai_mime,
                 ho_so['ma_nhan_vien']),
            ).fetchone()
            return dict(row)
        except Exception:
            path.unlink(missing_ok=True)
            raise


def tai_tep(loai: str, id_ho_so: str, id_tep: str, ho_so: dict):
    with get_conn() as conn:
        bang, _ = _kiem_tra_ho_so(conn, loai, id_ho_so, ho_so)
        row = conn.execute(
            'SELECT * FROM tep_dinh_kem WHERE id=%s AND bang=%s AND id_ban_ghi=%s',
            (id_tep, bang, id_ho_so),
        ).fetchone()
    if not row:
        raise KhongTimThay('Không tìm thấy tệp đính kèm.')
    path = Path(row['duong_dan']).resolve()
    root = (Path(UPLOAD_DIR) / loai / id_ho_so).resolve()
    if not path.is_relative_to(root) or not path.is_file():
        raise KhongTimThay('Tệp vật lý không còn tồn tại hoặc đường dẫn không hợp lệ.')
    return path.read_bytes(), row['ten_tep'], row.get('loai_mime') or 'application/octet-stream'
