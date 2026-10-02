from contextlib import nullcontext
from unittest import TestCase
from unittest.mock import MagicMock, patch

from backend.services import tuong_tac_ho_so_service as service
from backend.services.errors import ThieuDuLieu, KhongCoQuyen


class TestTagTraoDoi(TestCase):
    def setUp(self):
        self.conn = MagicMock()
        self.conn.execute.return_value.fetchone.return_value = {'id': 'TD-1'}
        self.profile = {'ma_nhan_vien': 'NV-1', 'ho_va_ten': 'Người gửi'}

    def send(self, ids, eligible):
        with patch.object(service, 'get_conn', return_value=nullcontext(self.conn)), \
             patch.object(service, '_kiem_tra_ho_so', return_value=('DAT_NGOAI', 'dat_ngoai')), \
             patch.object(service, '_co_the_trao_doi', return_value=True), \
             patch.object(service, '_nguoi_co_the_tag', return_value=eligible):
            return service.them_trao_doi('dat-ngoai', 'P-1', 'Kiểm tra giúp tôi', self.profile, ids)

    def test_duplicate_mentions_create_one_notification(self):
        self.send(['NV-2', 'NV-2'], [{'ma_nhan_vien': 'NV-2', 'ho_va_ten': 'Người nhận'}])
        notifications = [c for c in self.conn.execute.call_args_list if 'INSERT INTO thong_bao' in c.args[0]]
        self.assertEqual(len(notifications), 1)
        self.assertEqual(notifications[0].args[1][1], 'NV-2')
        self.assertEqual(notifications[0].args[1][-2:], ('DAT_NGOAI', 'P-1'))

    def test_unavailable_recipient_rejected_before_writes(self):
        with self.assertRaises(ThieuDuLieu):
            self.send(['NV-9'], [])
        self.conn.execute.assert_not_called()

    def test_read_only_user_needs_invitation_to_chat(self):
        self.conn.execute.return_value.fetchone.return_value = None
        with patch.object(service, '_kiem_tra_ho_so', side_effect=KhongCoQuyen('No edit')):
            self.assertFalse(service._co_the_trao_doi(self.conn, 'dat-ngoai', 'P-1', self.profile, 'DAT_NGOAI'))
        self.conn.execute.return_value.fetchone.return_value = {'id': 'TD-1'}
        with patch.object(service, '_kiem_tra_ho_so', side_effect=KhongCoQuyen('No edit')):
            self.assertTrue(service._co_the_trao_doi(self.conn, 'dat-ngoai', 'P-1', self.profile, 'DAT_NGOAI'))

    def test_cannot_mark_another_users_notification_as_read(self):
        self.conn.execute.return_value.fetchone.return_value = {'id': 'TB-1'}
        with patch.object(service, 'get_conn', return_value=nullcontext(self.conn)):
            service.doc_thong_bao('TB-1', self.profile)
        sql, params = self.conn.execute.call_args.args
        self.assertIn('nguoi_nhan=%s', sql)
        self.assertEqual(params, ('TB-1', 'NV-1'))
