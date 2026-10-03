from contextlib import nullcontext
from unittest import TestCase
from unittest.mock import MagicMock, patch
from backend.data import mat_hang_ncc_edit_repo as repo
from backend.services.errors import XungDot, ThieuDuLieu, KhongCoQuyen
from backend.services import mat_hang_ncc_service as service
from backend.services import f03_service
from backend.services.errors import LoiNghiepVu


class TestNccEdit(TestCase):
    def test_bao_gia_ton_trong_ket_luan_nhom(self):
        for rank, code in [('KHONG_CHON','NCC_KHONG_CHON_MAT_HANG'),
                           ('DU_PHONG','NCC_DU_PHONG_CAN_LY_DO')]:
            with self.subTest(rank=rank):
                conn=MagicMock()
                conn.execute.return_value.fetchone.return_value={'xep_loai':rank}
                with patch.object(f03_service,'_duyet'), \
                     patch.object(f03_service,'get_conn',return_value=nullcontext(conn)), \
                     patch.object(f03_service.repo,'lay_bao_gia',return_value={'phien_ban':1,'id_ncc':'NCC-TEST','mien_tru_2_bao_gia':True}), \
                     patch.object(f03_service.repo,'lay_bao_gia_dong',return_value=[{'id_de_nghi_dong':'DND-TEST'}]), \
                     patch.object(f03_service.repo,'dem_bao_gia_cua_dong',return_value=2):
                    with self.assertRaises(LoiNghiepVu) as result:
                        f03_service.chon_bao_gia('BG-TEST',None,1,{})
                self.assertEqual(result.exception.ma_loi,code)

    def test_chan_phien_ban_cu(self):
        conn=MagicMock()
        conn.execute.return_value.fetchone.return_value={'phien_ban':2}
        with patch.object(repo,'get_conn',return_value=nullcontext(conn)):
            with self.assertRaises(XungDot):repo.sua('MHN-1',1,{},'NV1')
        self.assertEqual(conn.execute.call_count,1)

    def test_khong_doi_pham_vi_da_duyet(self):
        conn=MagicMock()
        conn.execute.return_value.fetchone.return_value={
            'phien_ban':1,'trang_thai':'DA_DUYET','nhom_hang_chinh':'A'}
        with patch.object(repo,'get_conn',return_value=nullcontext(conn)):
            with self.assertRaises(ThieuDuLieu):
                repo.sua('MHN-1',1,{'nhom_hang_chinh':'B'},'NV1')

    def test_sua_va_lich_su_cung_ket_noi(self):
        conn=MagicMock()
        old={'id':'MHN-1','phien_ban':1,'trang_thai':'DA_DUYET','ten_hang':'Old'}
        new={**old,'phien_ban':2,'ten_hang':'New'}
        conn.execute.return_value.fetchone.side_effect=[old,new]
        with patch.object(repo,'get_conn',return_value=nullcontext(conn)),patch.object(repo,'ghi') as audit:
            self.assertEqual(repo.sua('MHN-1',1,{'ten_hang':'New'},'NV1'),new)
        audit.assert_called_once_with(conn,old,new,'SUA','NV1')

    def test_kinh_doanh_khong_duoc_sua(self):
        with patch.object(service,'kiem_quyen'):
            with self.assertRaises(KhongCoQuyen):
                service.sua('MHN-1',{}, {'vai_tro':'NV_KINH_DOANH'})
