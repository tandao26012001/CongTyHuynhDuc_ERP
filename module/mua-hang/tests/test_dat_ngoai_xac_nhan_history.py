from unittest import TestCase
from unittest.mock import MagicMock, patch

from backend.data import dat_ngoai_chi_tiet_repo
from backend.services import dat_ngoai_chi_tiet_service, dat_ngoai_service
from backend.services.errors import ThieuDuLieu, XungDot


class TestLichSuXacNhanKyThuat(TestCase):
    def test_truy_van_theo_ma_hang_hoac_id_dong_khong_truyen_null_vo_dinh_kieu(self):
        connection = MagicMock()
        connection.execute.return_value = []
        manager = MagicMock()
        manager.__enter__.return_value = connection

        with patch.object(dat_ngoai_chi_tiet_repo, 'get_conn', return_value=manager):
            dat_ngoai_chi_tiet_repo.danh_sach_xac_nhan('DONG-1', 'HANG-1')
            dat_ngoai_chi_tiet_repo.danh_sach_xac_nhan('DONG-1', None)

        by_code, by_line = connection.execute.call_args_list
        self.assertIn('d.ma_hang=%s', by_code.args[0])
        self.assertEqual(by_code.args[1], ('HANG-1', 'HANG-1'))
        self.assertIn('d.id=%s', by_line.args[0])
        self.assertEqual(by_line.args[1], ('DONG-1', 'DONG-1'))
        self.assertIn("ls.trang_thai_cu='CHO_XAC_NHAN_KY_THUAT'", by_code.args[0])
        self.assertIn("ls.trang_thai_moi='DANG_BAO_GIA'", by_code.args[0])
        self.assertIn('WHERE x.la_xac_nhan', by_code.args[0])

    def test_co_the_xac_nhan_tiep_sau_khi_phieu_da_qua_buoc_ky_thuat(self):
        ho_so = {'ma_tai_khoan': 'TK-1', 'ma_nhan_vien': 'NV-1', 'vai_tro': 'KY_THUAT'}
        with patch.object(dat_ngoai_chi_tiet_service, 'kiem_quyen') as check_permission, \
             patch.object(dat_ngoai_chi_tiet_service, 'lay_ket_qua_idempotency', return_value=None), \
             patch.object(dat_ngoai_chi_tiet_service, '_dong', return_value={'trang_thai_phieu': 'DANG_BAO_GIA', 'can_xac_nhan_ky_thuat': True}), \
             patch.object(dat_ngoai_chi_tiet_service.dat_ngoai_chi_tiet_repo, 'them_xac_nhan', return_value={'id': 'XN-2'}) as save:
            result = dat_ngoai_chi_tiet_service.them_xac_nhan(
                'PHIEU-1', 'DONG-1', {'noi_dung': 'Đã kiểm tra lại kích thước'}, ho_so, 'KEY-2',
            )

        self.assertEqual(result['id'], 'XN-2')
        check_permission.assert_any_call(ho_so, 'xac_nhan_kt', 'sua')
        save.assert_called_once_with('DONG-1', 'Đã kiểm tra lại kích thước', 'NV-1', 'TK-1', 'KEY-2')

    def test_khong_ghi_xac_nhan_cho_ma_khong_duoc_danh_dau(self):
        ho_so = {'ma_tai_khoan': 'TK-1', 'ma_nhan_vien': 'NV-1', 'vai_tro': 'KY_THUAT'}
        with patch.object(dat_ngoai_chi_tiet_service, 'kiem_quyen'), \
             patch.object(dat_ngoai_chi_tiet_service, 'lay_ket_qua_idempotency', return_value=None), \
             patch.object(dat_ngoai_chi_tiet_service, '_dong', return_value={'trang_thai_phieu': 'DANG_BAO_GIA', 'can_xac_nhan_ky_thuat': False}), \
             patch.object(dat_ngoai_chi_tiet_service.dat_ngoai_chi_tiet_repo, 'them_xac_nhan') as save:
            with self.assertRaises(XungDot):
                dat_ngoai_chi_tiet_service.them_xac_nhan(
                    'PHIEU-1', 'DONG-2', {'noi_dung': 'Đạt'}, ho_so, 'KEY-3',
                )
        save.assert_not_called()

    def test_khong_cho_chuyen_bao_gia_khi_con_ma_chua_xac_nhan(self):
        manager = MagicMock()
        manager.__enter__.return_value = MagicMock()
        with patch.object(dat_ngoai_service, 'get_conn', return_value=manager), \
             patch.object(dat_ngoai_service.dat_ngoai_repo, 'san_sang', return_value=True), \
             patch.object(dat_ngoai_service.dat_ngoai_repo, 'lay_dat_ngoai', return_value={'trang_thai': 'CHO_XAC_NHAN_KY_THUAT'}), \
             patch.object(dat_ngoai_service.phan_quyen_service, 'kiem_quyen'), \
             patch.object(dat_ngoai_service.dat_ngoai_repo, 'dong_chua_xac_nhan_ky_thuat', return_value=[{'id': 'DONG-2', 'ma_hang': 'MH-2'}]), \
             patch.object(dat_ngoai_service.dat_ngoai_repo, 'chuyen_trang_thai') as change:
            with self.assertRaises(ThieuDuLieu):
                dat_ngoai_service.chuyen_trang_thai(
                    'PHIEU-1', 1, 'DANG_BAO_GIA', None, {'ma_nhan_vien': 'NV-1'},
                )
        change.assert_not_called()

    def test_lap_phieu_chi_cho_ky_thuat_xac_nhan_ma_duoc_danh_dau(self):
        manager = MagicMock()
        manager.__enter__.return_value = MagicMock()
        rows = [
            {'ma_vach': 'V1', 'lenh_san_xuat': 'LSX-1', 'da_lap_bao_gia': False},
            {'ma_vach': 'V2', 'lenh_san_xuat': 'LSX-1', 'da_lap_bao_gia': False},
        ]
        details = [
            {'ma_vach': barcode, 'noi_dung_gia_cong': 'Gia công',
             'yeu_cau_ky_thuat': 'Theo bản vẽ', 'yeu_cau_chat_luong': 'Đạt',
             'can_xac_nhan_ky_thuat': barcode == 'V1',
             'noi_dung_can_xac_nhan_kt': 'Kiểm tra dung sai trục' if barcode == 'V1' else None}
            for barcode in ('V1', 'V2')
        ]
        ho_so = {'ma_tai_khoan': 'TK-1', 'ma_nhan_vien': 'NV-1'}
        with patch.object(dat_ngoai_service.phan_quyen_service, 'kiem_quyen'), \
             patch.object(dat_ngoai_service, 'lay_ket_qua_idempotency', return_value=None), \
             patch.object(dat_ngoai_service, 'get_conn', return_value=manager), \
             patch.object(dat_ngoai_service.dat_ngoai_repo, 'san_sang', return_value=True), \
             patch.object(dat_ngoai_service.dat_ngoai_repo, 'lay_dong_lsx', return_value=rows), \
             patch.object(dat_ngoai_service.dat_ngoai_repo, 'tao_dat_ngoai', return_value=[{'id': 'PHIEU-1'}]) as create:
            dat_ngoai_service.tao_bao_gia(['V1', 'V2'], details, False, None, None, ho_so, 'KEY-1')

        request = create.call_args.args[0][0]
        self.assertEqual(request['trang_thai'], 'CHO_XAC_NHAN_KY_THUAT')
        self.assertEqual([line['can_xac_nhan_ky_thuat'] for line in request['dong']], [True, False])
        self.assertEqual(request['dong'][0]['noi_dung_can_xac_nhan_kt'], 'Kiểm tra dung sai trục')
        self.assertIsNone(request['dong'][1]['noi_dung_can_xac_nhan_kt'])

    def test_tu_choi_ma_can_xac_nhan_nhung_noi_dung_trong(self):
        ho_so = {'ma_tai_khoan': 'TK-1', 'ma_nhan_vien': 'NV-1'}
        detail = {'ma_vach': 'V1', 'noi_dung_gia_cong': 'Gia công',
                  'yeu_cau_ky_thuat': 'Theo bản vẽ', 'yeu_cau_chat_luong': 'Đạt',
                  'can_xac_nhan_ky_thuat': True, 'noi_dung_can_xac_nhan_kt': '  '}
        with patch.object(dat_ngoai_service.phan_quyen_service, 'kiem_quyen'), \
             patch.object(dat_ngoai_service, 'lay_ket_qua_idempotency', return_value=None):
            with self.assertRaises(ThieuDuLieu):
                dat_ngoai_service.tao_bao_gia(
                    ['V1'], [detail], False, None, None, ho_so, 'KEY-1',
                )
