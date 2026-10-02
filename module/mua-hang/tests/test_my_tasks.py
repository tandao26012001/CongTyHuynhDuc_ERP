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
