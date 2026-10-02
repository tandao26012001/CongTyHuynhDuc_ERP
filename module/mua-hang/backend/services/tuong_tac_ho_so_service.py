"""Trao doi va tep dinh kem dung chung cho ho so NCC va phieu Dat ngoai."""

import re
import uuid
import logging
from pathlib import Path
from time import perf_counter
from psycopg.types.json import Jsonb

from backend.config.settings import MAX_UPLOAD_BYTES, UPLOAD_DIR
from backend.data.db import get_conn
from backend.services.errors import KhongCoQuyen, KhongTimThay, ThieuDuLieu
from backend.services.phan_quyen_service import kiem_quyen

DOI_TUONG = {'ncc': ('NHA_CUNG_CAP', 'ncc'),
             'dat-ngoai': ('DAT_NGOAI', 'dat_ngoai')}
MIME_CHO_PHEP = {'application/pdf', 'image/jpeg', 'image/png', 'image/webp'}
ID_HO_SO_RE = re.compile(r'^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$')
logger = logging.getLogger(__name__)


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
    started = perf_counter()
    timings = [started]
    try:
        with get_conn() as conn:
            timings.append(perf_counter())
            bang, _ = _kiem_tra_ho_so(conn, loai, id_ho_so, ho_so)
            timings.append(perf_counter())
            messages = conn.execute(
                """SELECT t.id,t.noi_dung,t.nguoi_gui,t.thoi_diem,t.nguoi_duoc_tag,nv.ho_va_ten AS ten_nguoi_gui
                   FROM trao_doi t LEFT JOIN nhan_vien nv ON nv.ma_nhan_vien=t.nguoi_gui
                   WHERE t.bang=%s AND t.id_ban_ghi=%s ORDER BY t.thoi_diem,t.id""",
                (bang, id_ho_so),
            ).fetchall()
            timings.append(perf_counter())
            files = conn.execute(
                """SELECT id,ten_tep,kich_thuoc,loai_mime,nguoi_tai_len,thoi_diem
                   FROM tep_dinh_kem WHERE bang=%s AND id_ban_ghi=%s ORDER BY thoi_diem,id""",
                (bang, id_ho_so),
            ).fetchall()
            timings.append(perf_counter())
            can_chat = _co_the_trao_doi(conn, loai, id_ho_so, ho_so, bang)
            timings.append(perf_counter())
    finally:
        total = perf_counter() - started
        if total >= 2:
            phases = ('connect', 'scope', 'messages', 'files', 'chat')
            details = ' '.join(f'{phase}={end - begin:.2f}s'
                               for phase, begin, end in zip(phases, timings, timings[1:]))
            logger.warning('Slow dossier interactions: %s/%s total=%.2fs %s close=%.2fs',
                           loai, id_ho_so, total, details, total - (timings[-1] - started))
    return {'trao_doi': [dict(row) for row in messages],
            'tep': [dict(row) for row in files], 'co_the_trao_doi': can_chat}


def _co_the_trao_doi(conn, loai: str, id_ho_so: str, ho_so: dict, bang: str) -> bool:
    try:
        _kiem_tra_ho_so(conn, loai, id_ho_so, ho_so, 'sua')
        return True
    except KhongCoQuyen:
        return bool(conn.execute(
            """SELECT 1 FROM trao_doi WHERE bang=%s AND id_ban_ghi=%s
               AND nguoi_duoc_tag @> %s LIMIT 1""",
            (bang, id_ho_so, Jsonb([{'ma_nhan_vien': ho_so['ma_nhan_vien']}])),
        ).fetchone())


def _nguoi_co_the_tag(conn, loai: str, id_ho_so: str, ho_so: dict) -> list[dict]:
    rows = conn.execute(
        """SELECT DISTINCT nv.ma_nhan_vien,nv.ho_va_ten,nv.ma_bo_phan,
                  bp.ten AS ten_bo_phan,t.vai_tro,t.ma_loai_tk
           FROM nhan_vien nv JOIN tai_khoan t ON t.ma_nhan_vien=nv.ma_nhan_vien
           LEFT JOIN bo_phan bp ON bp.ma_bo_phan=nv.ma_bo_phan
           WHERE nv.trang_thai='HOAT_DONG' AND t.trang_thai='HOAT_DONG'
             AND nv.ma_nhan_vien<>%s
             AND (nv.ma_bo_phan=%s OR (%s='dat-ngoai' AND nv.ma_bo_phan='KD')
                  OR t.vai_tro IN ('KY_THUAT','BAN_LANH_DAO')
                  OR t.ma_loai_tk IN ('KY_THUAT','BAN_LANH_DAO'))
           ORDER BY nv.ho_va_ten,nv.ma_nhan_vien""",
        (ho_so['ma_nhan_vien'], ho_so.get('ma_bo_phan'), loai),
    ).fetchall()
    result = {}
    for row in rows:
        try:
            _kiem_tra_ho_so(conn, loai, id_ho_so, dict(row))
        except (KhongCoQuyen, KhongTimThay):
            continue
        result[row['ma_nhan_vien']] = dict(row)
    return list(result.values())


def nguoi_co_the_tag(loai: str, id_ho_so: str, ho_so: dict) -> list[dict]:
    with get_conn() as conn:
        _kiem_tra_ho_so(conn, loai, id_ho_so, ho_so)
        return _nguoi_co_the_tag(conn, loai, id_ho_so, ho_so)


def them_trao_doi(loai: str, id_ho_so: str, noi_dung: str, ho_so: dict,
                 nguoi_duoc_tag: list[str] | None = None) -> dict:
    content = str(noi_dung or '').strip()
    if not content or len(content) > 5000:
        raise ThieuDuLieu('Nội dung trao đổi phải từ 1 đến 5.000 ký tự.')
    with get_conn() as conn:
        bang, _ = _kiem_tra_ho_so(conn, loai, id_ho_so, ho_so)
        if not _co_the_trao_doi(conn, loai, id_ho_so, ho_so, bang):
            raise KhongCoQuyen('Bạn chưa được mời vào cuộc trao đổi của hồ sơ này.')
        ids = list(dict.fromkeys(nguoi_duoc_tag or []))
        eligible = {r['ma_nhan_vien']: r for r in _nguoi_co_the_tag(conn, loai, id_ho_so, ho_so)} if ids else {}
        if len(ids) > 30 or any(ma not in eligible for ma in ids):
            raise ThieuDuLieu('Người được tag không thuộc danh sách được phép hoặc không có quyền xem hồ sơ.')
        mentions = [{'ma_nhan_vien': ma, 'ho_va_ten': eligible[ma]['ho_va_ten']} for ma in ids]
        row = conn.execute(
            """INSERT INTO trao_doi(id,bang,id_ban_ghi,noi_dung,nguoi_gui,nguoi_duoc_tag)
               VALUES(%s,%s,%s,%s,%s,%s) RETURNING id,noi_dung,nguoi_gui,thoi_diem,nguoi_duoc_tag""",
            (f'TD-{uuid.uuid4().hex[:18].upper()}', bang, id_ho_so,
             content, ho_so['ma_nhan_vien'], Jsonb(mentions)),
        ).fetchone()
        for ma in ids:
            conn.execute(
                """INSERT INTO thong_bao(id,nguoi_nhan,loai,tieu_de,noi_dung,bang,id_ban_ghi,da_doc)
                   VALUES(%s,%s,'TAG_TRAO_DOI',%s,%s,%s,%s,false)""",
                (f'TB-{uuid.uuid4().hex[:18].upper()}', ma,
                 f"{ho_so.get('ho_va_ten') or ho_so['ma_nhan_vien']} đã tag bạn · {id_ho_so}",
                 content, bang, id_ho_so),
            )
        return dict(row)


def thong_bao(ho_so: dict) -> list[dict]:
    with get_conn() as conn:
        return [dict(row) for row in conn.execute(
            """SELECT id,tieu_de,noi_dung,bang,id_ban_ghi,da_doc,thoi_diem FROM thong_bao
               WHERE nguoi_nhan=%s AND loai='TAG_TRAO_DOI'
               ORDER BY thoi_diem DESC,id DESC LIMIT 100""", (ho_so['ma_nhan_vien'],),
        ).fetchall()]


def doc_thong_bao(id_thong_bao: str, ho_so: dict) -> dict:
    with get_conn() as conn:
        row = conn.execute(
            "UPDATE thong_bao SET da_doc=true WHERE id=%s AND nguoi_nhan=%s RETURNING id",
            (id_thong_bao, ho_so['ma_nhan_vien']),
        ).fetchone()
        if not row:
            raise KhongTimThay('Không tìm thấy thông báo của bạn.')
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
