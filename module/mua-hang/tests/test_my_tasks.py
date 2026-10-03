from contextlib import nullcontext
from unittest import TestCase
from unittest.mock import MagicMock, patch

from backend.services import de_nghi_service as service
from backend.data import de_nghi_repo as repo


class TestMyTasks(TestCase):
    def test_history_uses_current_employee_and_permission_scope(self):
        profile = {'ma_nhan_vien': 'NV-1', 'ma_bo_phan': 'KD'}
        conn = MagicMock()
        with patch.object(service, 'kiem_quyen', return_value='bo_phan') as permission, \
             patch.object(service, 'get_conn', return_value=nullcontext(conn)), \
             patch.object(service.repo, 'danh_sach_de_nghi', return_value=([{'id': 'DN-1'}], 1)) as listing:
            result = service.da_xu_ly(profile, 2, 100)
        permission.assert_called_once_with(profile, 'de_nghi', 'xem')
        listing.assert_called_once_with(conn, {'da_xu_ly_boi': 'NV-1'}, 'bo_phan', profile, 100, 100)
        self.assertEqual(result['tong'], 1)

    def test_history_query_checks_actor_and_department(self):
        conn = MagicMock()
        conn.cursor.return_value.fetchone.return_value = {'n': 0}
        conn.cursor.return_value.fetchall.return_value = []
        repo.danh_sach_de_nghi(conn, {'da_xu_ly_boi': 'NV-1'}, 'bo_phan',
                               {'ma_nhan_vien': 'NV-1', 'ma_bo_phan': 'KD'})
        sql, params = conn.cursor.return_value.execute.call_args.args
        self.assertIn("ls.tu_trang_thai='CHO_DUYET'", sql)
        self.assertIn('ls.nguoi_thuc_hien=%s', sql)
        self.assertIn('dn.ma_bo_phan = %s', sql)
        self.assertEqual(params[:2], ('KD', 'NV-1'))


    def test_purchase_and_outsource_requests_remain_in_history_after_processing(self):
        import sqlite3

        database = sqlite3.connect(":memory:")
        database.row_factory = sqlite3.Row
        database.executescript("""
            CREATE TABLE de_nghi (id TEXT, loai TEXT, trang_thai TEXT, ma_bo_phan TEXT,
                nguoi_yeu_cau TEXT, nguoi_duyet_bp TEXT, nguoi_duyet_bld TEXT,
                ngay_hieu_luc TEXT, ngay_tao TEXT);
            CREATE TABLE bo_phan (ma_bo_phan TEXT, ten TEXT);
            CREATE TABLE nhan_vien (ma_nhan_vien TEXT, ho_va_ten TEXT);
            CREATE TABLE de_nghi_dong (id_de_nghi TEXT, da_xoa BOOL, bat_kha_thi BOOL);
            CREATE TABLE lich_su_trang_thai (bang TEXT, id_ban_ghi TEXT,
                nguoi_thuc_hien TEXT, tu_trang_thai TEXT, sang_trang_thai TEXT);
        """)

        class Connection:
            def cursor(self):
                return self

            def execute(self, query, params):
                self.result = database.execute(query.replace('OFFSET %s LIMIT %s', 'LIMIT %s, %s').replace('%s', '?'), params)

            def fetchone(self):
                return dict(self.result.fetchone())

            def fetchall(self):
                return [dict(row) for row in self.result.fetchall()]

        try:
            for kind in ('MUA_HANG', 'GIA_CONG_NGOAI'):
                for state in ('CHO_DUYET', 'DA_DUYET', 'CHO_KY_BU', 'HOAN_THANH', 'TRA_LAI'):
                    record_id = kind + '-' + state
                    database.execute('INSERT INTO de_nghi VALUES(?,?,?,?,?,?,?,?,?)',
                                     (record_id, kind, state, 'KD', 'AUTHOR',
                                      None if state == 'TRA_LAI' else 'NV-1', None,
                                      '2026-10-03', '2026-10-03'))
                    database.execute('INSERT INTO lich_su_trang_thai VALUES(?,?,?,?,?)',
                                     ('DE_NGHI', record_id, 'NV-1', 'CHO_DUYET', state))
            database.execute('INSERT INTO de_nghi VALUES(?,?,?,?,?,?,?,?,?)',
                             ('OTHER-ACTOR', 'MUA_HANG', 'DA_DUYET', 'KD', 'AUTHOR',
                              'NV-2', None, '2026-10-03', '2026-10-03'))
            database.execute('INSERT INTO de_nghi VALUES(?,?,?,?,?,?,?,?,?)',
                             ('OTHER-DEPARTMENT', 'MUA_HANG', 'DA_DUYET', 'MH', 'AUTHOR',
                              'NV-1', None, '2026-10-03', '2026-10-03'))
            rows, count = repo.danh_sach_de_nghi(Connection(), {'da_xu_ly_boi': 'NV-1'},
                                                'bo_phan', {'ma_nhan_vien': 'NV-1', 'ma_bo_phan': 'KD'})
            self.assertEqual(count, 10)
            self.assertEqual(len(rows), 10)
            self.assertEqual({row['loai'] for row in rows}, {'MUA_HANG', 'GIA_CONG_NGOAI'})
            self.assertNotIn('OTHER-ACTOR', {row['id'] for row in rows})
            self.assertNotIn('OTHER-DEPARTMENT', {row['id'] for row in rows})
        finally:
            database.close()
