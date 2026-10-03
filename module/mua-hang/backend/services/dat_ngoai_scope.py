"""Shared record scope for outsourcing APIs."""
from backend.data.db import get_conn
from backend.services.errors import KhongCoQuyen, KhongTimThay


def kiem_scope(scope, row, profile):
    if scope == 'toan_bo':
        return
    if scope == 'ca_nhan' and row.get('nguoi_lap') == profile.get('ma_nhan_vien') and profile.get('ma_nhan_vien'):
        return
    if scope == 'bo_phan' and row.get('ma_bo_phan') == profile.get('ma_bo_phan') and profile.get('ma_bo_phan'):
        return
    raise KhongCoQuyen('Phiếu đặt ngoài nằm ngoài phạm vi được phép của bạn.')


def kiem_phieu(id_phieu, scope, profile, conn=None):
    if conn is None:
        with get_conn() as db:
            return kiem_phieu(id_phieu, scope, profile, db)
    row = conn.execute('''SELECT p.nguoi_lap,nv.ma_bo_phan FROM dat_ngoai p
                          LEFT JOIN nhan_vien nv ON nv.ma_nhan_vien=p.nguoi_lap WHERE p.id=%s''',
                       (id_phieu,)).fetchone()
    if not row:
        raise KhongTimThay('Không tìm thấy phiếu đặt ngoài.')
    kiem_scope(scope, row, profile)
