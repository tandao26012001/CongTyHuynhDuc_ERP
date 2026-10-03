from contextlib import nullcontext
from unittest import TestCase
from unittest.mock import MagicMock, patch

from backend.services import dat_ngoai_service as service
from backend.services.errors import KhongCoQuyen, XungDot


class TestThongBaoKyThuat(TestCase):
    def test_new_request_resets_read_without_quote_changes_resetting_it(self):
        conn = MagicMock()
        conn.execute.return_value.fetchall.return_value = []
        item = {'id': 'P-1', 'trang_thai': 'CHO_XAC_NHAN_KY_THUAT', 'dong': [],
                'lich_su': [{'loai': 'YEU_CAU_KY_THUAT', 'thoi_diem': '2026-10-02', 'ma_hang': 'M-1'}]}
        with patch.object(service.phan_quyen_service, 'kiem_quyen', return_value='toan_bo') as permission, \
             patch.object(service.dat_ngoai_repo, 'danh_sach_dat_ngoai', return_value=[item]) as listing, \
             patch.object(service, 'get_conn', return_value=nullcontext(conn)) as connection:
            first = service.hang_doi_xac_nhan_ky_thuat({'ma_nhan_vien': 'NV-1', 'vai_tro': 'KY_THUAT'})[0]
            connection.assert_called_once_with()
            permission.assert_called_with({'ma_nhan_vien': 'NV-1', 'vai_tro': 'KY_THUAT'}, 'xac_nhan_kt', 'xem', conn)
            listing.assert_called_with(conn)
            self.assertFalse(first['thong_bao_da_doc'])
            conn.execute.return_value.fetchall.return_value = [{'id_phieu': 'P-1', 'dau_yeu_cau': first['dau_yeu_cau']}]
            item['lich_su'].append({'loai': 'PHIEU', 'thoi_diem': 'later'})
            self.assertTrue(service.hang_doi_xac_nhan_ky_thuat({'ma_nhan_vien': 'NV-1', 'vai_tro': 'KY_THUAT'})[0]['thong_bao_da_doc'])
            item['lich_su'].append({'loai': 'YEU_CAU_KY_THUAT', 'thoi_diem': 'later', 'ma_hang': 'M-1'})
            self.assertFalse(service.hang_doi_xac_nhan_ky_thuat({'ma_nhan_vien': 'NV-1', 'vai_tro': 'KY_THUAT'})[0]['thong_bao_da_doc'])

    def test_read_marker_belongs_to_current_employee_and_does_not_change_workflow(self):
        conn = MagicMock()
        with patch.object(service, 'hang_doi_xac_nhan_ky_thuat', return_value=[{'id': 'P-1', 'dau_yeu_cau': 'sig'}]), \
             patch.object(service, 'get_conn', return_value=nullcontext(conn)):
            service.doc_thong_bao_ky_thuat('P-1', 'sig', {'ma_nhan_vien': 'NV-1', 'vai_tro': 'KY_THUAT'})
        self.assertEqual(conn.execute.call_args.args[1], ('NV-1', 'P-1', 'sig'))
        self.assertEqual(conn.execute.call_count, 1)
        self.assertIn('INSERT INTO thong_bao_ky_thuat_da_doc', conn.execute.call_args.args[0])

    def test_stale_notification_does_not_mark_new_request_as_read(self):
        with patch.object(service, 'hang_doi_xac_nhan_ky_thuat', return_value=[{'id': 'P-1', 'dau_yeu_cau': 'new'}]), \
             patch.object(service, 'get_conn') as connection:
            with self.assertRaises(XungDot):
                service.doc_thong_bao_ky_thuat('P-1', 'old', {'ma_nhan_vien': 'NV-1', 'vai_tro': 'KY_THUAT'})
            connection.assert_not_called()

    def test_other_roles_cannot_receive_notifications_even_with_view_permission(self):
        for role in ('ADMIN', 'BAN_LANH_DAO', 'NV_KINH_DOANH', 'KE_TOAN', '', None):
            with self.subTest(role=role), \
                 patch.object(service, 'get_conn') as connection, \
                 patch.object(service.phan_quyen_service, 'kiem_quyen'):
                profile = {'ma_nhan_vien': 'NV-1', 'vai_tro': role,
                           'ma_loai_tk': 'KY_THUAT', 'quyen': {'xac_nhan_kt': {'xem': True}}}
                with self.assertRaises(KhongCoQuyen):
                    service.hang_doi_xac_nhan_ky_thuat(profile)
                with self.assertRaises(KhongCoQuyen):
                    service.doc_thong_bao_ky_thuat('P-1', 'sig', profile)
                connection.assert_not_called()

    def test_technical_role_still_requires_view_permission(self):
        with patch.object(service, 'get_conn', return_value=nullcontext(MagicMock())), \
             patch.object(service.phan_quyen_service, 'kiem_quyen', side_effect=KhongCoQuyen('Denied')), \
             patch.object(service.dat_ngoai_repo, 'danh_sach_dat_ngoai') as listing:
            with self.assertRaises(KhongCoQuyen):
                service.hang_doi_xac_nhan_ky_thuat({'ma_nhan_vien': 'NV-1', 'vai_tro': 'KY_THUAT'})
            listing.assert_not_called()
