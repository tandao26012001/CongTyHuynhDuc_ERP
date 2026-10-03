from contextlib import nullcontext
from unittest import TestCase
from unittest.mock import MagicMock, patch
from backend.services import dat_ngoai_chi_tiet_service as service
from backend.services.dat_ngoai_scope import kiem_scope
from backend.services.errors import KhongCoQuyen


class TestOutsourceScope(TestCase):
    def test_scope_matrix_and_missing_department(self):
        profile = {'ma_nhan_vien': 'A', 'ma_bo_phan': 'KD'}
        for scope, owner, department, allowed in [
            ('toan_bo','B','KT',True), ('ca_nhan','A','KT',True),
            ('ca_nhan','B','KD',False), ('bo_phan','B','KD',True),
            ('bo_phan','A','KT',False), ('bo_phan','A',None,False),
            ('unknown','A','KD',False)]:
            with self.subTest(scope=scope, owner=owner, department=department):
                row = {'nguoi_lap': owner, 'ma_bo_phan': department}
                if allowed:
                    kiem_scope(scope,row,profile)
                else:
                    with self.assertRaises(KhongCoQuyen): kiem_scope(scope,row,profile)
        with self.assertRaises(KhongCoQuyen):
            kiem_scope('bo_phan', {'ma_bo_phan': None}, {})

    def test_outside_scope_blocks_receipt_before_write(self):
        row = {'nguoi_lap': 'B', 'ma_bo_phan': 'KD'}
        with patch.object(service,'kiem_quyen',return_value='ca_nhan'), \
             patch.object(service.dat_ngoai_chi_tiet_repo,'lay_dong',return_value=row), \
             patch.object(service.dat_ngoai_chi_tiet_repo,'nhan_dot_giao') as save:
            with self.assertRaises(KhongCoQuyen):
                service.nhan_dot_giao('P','D','G',1,None,{'ma_nhan_vien':'A'})
            save.assert_not_called()

    def test_replay_cannot_bypass_record_scope(self):
        with patch.object(service,'kiem_quyen',return_value='ca_nhan'), \
             patch.object(service.dat_ngoai_chi_tiet_repo,'lay_dong',return_value={'nguoi_lap':'B'}), \
             patch.object(service,'lay_ket_qua_idempotency',return_value={'secret':'old'}) as replay:
            with self.assertRaises(KhongCoQuyen):
                service.them_dot_giao('P','D',{}, {'ma_nhan_vien':'A','ma_tai_khoan':'TK'},'KEY')
            replay.assert_not_called()

    def test_scoped_detail_does_not_include_other_document_history(self):
        conn = MagicMock()
        row = {'nguoi_lap':'A','ma_hang':'M'}
        with patch.object(service,'get_conn',return_value=nullcontext(conn)), \
             patch.object(service,'kiem_quyen',return_value='ca_nhan'), \
             patch.object(service.dat_ngoai_chi_tiet_repo,'lay_dong',return_value=row), \
             patch.object(service.dat_ngoai_chi_tiet_repo,'danh_sach_xac_nhan',return_value=[]) as history, \
             patch.object(service.dat_ngoai_chi_tiet_repo,'danh_sach_dot_giao',return_value=[]):
            service.chi_tiet('P','D',{'ma_nhan_vien':'A'})
            history.assert_called_once_with('D',None,conn)
