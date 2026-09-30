"""Regression checks for report scope and KPI source rows."""
from contextlib import nullcontext
from datetime import date
from unittest import TestCase
from unittest.mock import patch

from backend.data import bao_cao_f2_repo
from backend.services import bao_cao_f2_service


class TestBaoCaoF2Scope(TestCase):
    def test_personal_scope_is_applied_in_sql_before_rows_return(self):
        captured = {}

        class Connection:
            def execute(self, sql, params):
                captured['sql'] = sql
                captured['params'] = params
                return []

        with patch.object(bao_cao_f2_repo, 'get_conn', return_value=nullcontext(Connection())):
            self.assertEqual(bao_cao_f2_repo.lay_bang_goc(
                'hieu-qua', {'from': date(2026, 1, 1), 'to': date(2026, 1, 31),
                             'ncc': None, 'status': None}, 'ca_nhan', 'NV-1', None), [])
        self.assertIn('_owner=%(ma_nhan_vien)s', captured['sql'])
        self.assertNotIn('LIMIT 2000', captured['sql'])
        self.assertEqual(captured['params']['ma_nhan_vien'], 'NV-1')

    def test_metrics_use_complete_scope_even_when_display_rows_are_capped(self):
        rows = [{'ma_dong': str(index), 'trang_thai': 'DA_DAT_HANG',
                 'tinh_trang_yeu_cau': 'BINH_THUONG', 'bat_kha_thi': False,
                 'so_phieu': f'DN-{index // 2}'} for index in range(2001)]
        session = {'vai_tro': 'TBP_MUA_HANG', 'ma_nhan_vien': 'NV-1',
                   'ma_bo_phan': 'BP-1'}
        with patch.object(bao_cao_f2_service, 'kiem_quyen', return_value='toan_bo'), \
                patch.object(bao_cao_f2_service, 'co_quyen_xem_gia', return_value=False), \
                patch.object(bao_cao_f2_repo, 'lay_bang_goc', return_value=rows):
            report = bao_cao_f2_service.lay_bao_cao(
                'hieu-qua', date(2026, 1, 1), date(2026, 1, 31), None, None, session)
        self.assertTrue(report['truncated'])
        self.assertEqual(len(report['rows']), 2000)
        self.assertEqual(report['metrics'][0]['value'], 2001)
