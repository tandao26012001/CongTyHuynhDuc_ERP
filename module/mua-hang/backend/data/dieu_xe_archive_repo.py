"""Doc lich su dieu xe de ban giao Kho van; khong ghi du lieu."""

from backend.data.db import get_conn


def lay_lich_su() -> dict[str, list[dict]]:
    with get_conn() as conn:
        required = ('dieu_xe', 'dieu_xe_dong')
        missing = [name for name in required if conn.execute(
            'SELECT to_regclass(%s) IS NULL AS missing', (f'mua_hang.{name}',),
        ).fetchone()['missing']]
        if missing:
            raise RuntimeError('Khong co bang lich su Dieu xe: ' + ', '.join(missing)
                               + '. Can xac minh nguon cu truoc khi ban giao.')
        return {
            "DIEU_XE": [dict(r) for r in conn.execute("SELECT * FROM dieu_xe ORDER BY id")],
            "DIEU_XE_DONG": [dict(r) for r in conn.execute("SELECT * FROM dieu_xe_dong ORDER BY id_dieu_xe,stt_dong")],
            "XE": [dict(r) for r in conn.execute("SELECT * FROM xe ORDER BY ma_xe")],
            "TAI_XE": [dict(r) for r in conn.execute("SELECT * FROM tai_xe ORDER BY ma_nhan_vien")],
        }
