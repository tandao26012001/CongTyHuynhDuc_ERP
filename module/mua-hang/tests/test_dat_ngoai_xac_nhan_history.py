from unittest import TestCase
from unittest.mock import MagicMock, patch

from backend.data import dat_ngoai_chi_tiet_repo, dat_ngoai_repo
from backend.services import dat_ngoai_chi_tiet_service, dat_ngoai_service
from backend.services.errors import ThieuDuLieu, XungDot


class TestLichSuXacNhanKyThuat(TestCase):
    def setUp(self):
        self.connection = MagicMock()
        manager = MagicMock()
        manager.__enter__.return_value = self.connection
        self.connection_patch = patch.object(dat_ngoai_chi_tiet_service, 'get_conn', return_value=manager)
        self.connection_patch.start()
        self.addCleanup(self.connection_patch.stop)

    def test_lap_phieu_tao_cau_hoi_ky_thuat_ban_dau(self):
        conn = MagicMock()
        conn.execute.return_value.fetchone.return_value = {'id': 'P-1'}
        manager = MagicMock()
        manager.__enter__.return_value = conn
        phieu = {
            'id': 'P-1', 'lenh_san_xuat': 'LSX-1', 'trang_thai': 'CHO_XAC_NHAN_KY_THUAT',
            'can_xac_nhan_ky_thuat': True, 'noi_dung_ky_thuat': None, 'ghi_chu': None,
            'dong': [{
                'id': 'D-1', 'ma_vach': 'V-1', 'ma_hang': 'MH-1', 'ten_hang': 'Mặt hàng',
                'dvt': 'cái', 'so_luong_po': 1, 'noi_dung_gia_cong': 'Gia công',
                'yeu_cau_ky_thuat': 'Theo bản vẽ', 'yeu_cau_chat_luong': 'Đạt',
                'can_xac_nhan_ky_thuat': True,
                'noi_dung_can_xac_nhan_kt': 'Kiểm tra kích thước',
            }],
        }
        with patch.object(dat_ngoai_repo, 'get_conn', return_value=manager), \
             patch.object(dat_ngoai_repo, '_bat_dau_idempotency', return_value=None), \
             patch.object(dat_ngoai_repo, '_hoan_tat_idempotency'):
            dat_ngoai_repo.tao_dat_ngoai([phieu], 'NV-1', 'TK-1', 'KEY-1')
        initial = [call for call in conn.execute.call_args_list
                   if 'INSERT INTO dat_ngoai_yeu_cau_kt' in call.args[0]]
        self.assertEqual(len(initial), 1)
        self.assertEqual(initial[0].args[1][2], 'Kiểm tra kích thước')

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
        self.assertIn('WHERE x.la_xac_nhan', by_code.args[0])
        self.assertIn('FROM dat_ngoai_yeu_cau_kt y', by_code.args[0])
        self.assertIn("WHEN y.la_ban_dau THEN 'YEU_CAU_BAN_DAU'", by_code.args[0])
        self.assertIn('AS id_dong', by_code.args[0])

    def test_co_the_yeu_cau_lai_sau_khi_da_xac_nhan(self):
        ho_so = {'ma_tai_khoan': 'TK-1', 'ma_nhan_vien': 'NV-1'}
        with patch.object(dat_ngoai_chi_tiet_service, 'kiem_quyen', return_value='toan_bo'), \
             patch.object(dat_ngoai_chi_tiet_service, 'lay_ket_qua_idempotency', return_value=None), \
             patch.object(dat_ngoai_chi_tiet_service, '_dong', return_value={
                 'trang_thai_phieu': 'HOAN_THANH', 'can_xac_nhan_ky_thuat': True,
                 'cho_xac_nhan_kt': False,
             }), \
             patch.object(dat_ngoai_chi_tiet_service.dat_ngoai_chi_tiet_repo,
                          'them_yeu_cau_ky_thuat', return_value={'id': 'YC-2'}) as save:
            result = dat_ngoai_chi_tiet_service.them_yeu_cau_ky_thuat(
                'PHIEU-1', 'DONG-1', {'noi_dung': 'Kiểm tra lại kích thước'}, ho_so, 'KEY-2',
            )
        self.assertEqual(result['id'], 'YC-2')
        save.assert_called_once_with('DONG-1', 'Kiểm tra lại kích thước', 'NV-1', 'TK-1', 'KEY-2')

    def test_yeu_cau_moi_o_buoc_bao_gia_xuat_hien_trong_hang_doi(self):
        ho_so = {'ma_tai_khoan': 'TK-1', 'ma_nhan_vien': 'NV-1', 'vai_tro': 'KY_THUAT'}
        rows = [
            {'id': 'P-1', 'trang_thai': 'DANG_BAO_GIA',
             'dong': [{'cho_xac_nhan_kt': True}]},
            {'id': 'P-2', 'trang_thai': 'DANG_BAO_GIA',
             'dong': [{'cho_xac_nhan_kt': False}]},
            {'id': 'P-3', 'trang_thai': 'HOAN_THANH',
             'dong': [{'cho_xac_nhan_kt': True}]},
        ]
        with patch.object(dat_ngoai_service.phan_quyen_service, 'kiem_quyen', return_value='toan_bo'), \
             patch.object(dat_ngoai_service, 'get_conn') as connection, \
             patch.object(dat_ngoai_service.dat_ngoai_repo,
                          'danh_sach_dat_ngoai', return_value=rows):
            connection.return_value.__enter__.return_value.execute.return_value.fetchall.return_value = []
            queue = dat_ngoai_service.hang_doi_xac_nhan_ky_thuat(ho_so)
        self.assertEqual([row['id'] for row in queue], ['P-1', 'P-3'])

    def test_khong_gui_trung_yeu_cau_khi_con_cho_ky_thuat(self):
        ho_so = {'ma_tai_khoan': 'TK-1', 'ma_nhan_vien': 'NV-1'}
        with patch.object(dat_ngoai_chi_tiet_service, 'kiem_quyen', return_value='toan_bo'), \
             patch.object(dat_ngoai_chi_tiet_service, 'lay_ket_qua_idempotency', return_value=None), \
             patch.object(dat_ngoai_chi_tiet_service, '_dong', return_value={
                 'trang_thai_phieu': 'HOAN_THANH', 'cho_xac_nhan_kt': True,
             }), \
             patch.object(dat_ngoai_chi_tiet_service.dat_ngoai_chi_tiet_repo,
                          'them_yeu_cau_ky_thuat') as save:
            with self.assertRaises(XungDot):
                dat_ngoai_chi_tiet_service.them_yeu_cau_ky_thuat(
                    'PHIEU-1', 'DONG-1', {'noi_dung': 'Kiểm tra tiếp'}, ho_so, 'KEY-3',
                )
        save.assert_not_called()

    def test_ky_thuat_xac_nhan_yeu_cau_moi_cho_ma_khong_danh_dau_ban_dau(self):
        ho_so = {'ma_tai_khoan': 'TK-1', 'ma_nhan_vien': 'NV-1', 'vai_tro': 'KY_THUAT'}
        with patch.object(dat_ngoai_chi_tiet_service, 'kiem_quyen', return_value='toan_bo'), \
             patch.object(dat_ngoai_chi_tiet_service, 'lay_ket_qua_idempotency', return_value=None), \
             patch.object(dat_ngoai_chi_tiet_service, '_dong', return_value={
                 'trang_thai_phieu': 'DANG_BAO_GIA', 'can_xac_nhan_ky_thuat': False,
                 'cho_xac_nhan_kt': True,
             }), \
             patch.object(dat_ngoai_chi_tiet_service.dat_ngoai_chi_tiet_repo,
                          'them_xac_nhan', return_value={'id': 'XN-2'}) as save:
            result = dat_ngoai_chi_tiet_service.them_xac_nhan(
                'PHIEU-1', 'DONG-1', {'noi_dung': 'Đã kiểm tra', 'id_yeu_cau': 'YC-1'}, ho_so, 'KEY-3',
            )
        self.assertEqual(result['id'], 'XN-2')
        save.assert_called_once_with('DONG-1', 'Đã kiểm tra', 'NV-1', 'TK-1', 'KEY-3', 'YC-1', self.connection)

    def test_xac_nhan_duoc_gan_voi_yeu_cau_dang_cho(self):
        connection = MagicMock()
        connection.execute.return_value.fetchone.side_effect = [
            {'id': 'DONG-1', 'can_xac_nhan_ky_thuat': False, 'trang_thai': 'HOAN_THANH'},
            None,
            {'id': 'YC-1'},
            {'id': 'XN-1'},
        ]
        manager = MagicMock()
        manager.__enter__.return_value = connection
        with patch.object(dat_ngoai_chi_tiet_repo, 'get_conn', return_value=manager), \
             patch.object(dat_ngoai_chi_tiet_repo, '_bat_dau_idempotency', return_value=None), \
             patch.object(dat_ngoai_chi_tiet_repo, '_hoan_tat_idempotency'), \
             patch.object(dat_ngoai_chi_tiet_repo, 'sinh_ma', return_value='XN-1'):
            dat_ngoai_chi_tiet_repo.them_xac_nhan('DONG-1', 'Đã kiểm tra', 'NV-1', 'TK-1', 'KEY-1', 'YC-1')
        insert = connection.execute.call_args_list[-1]
        self.assertIn('id_yeu_cau', insert.args[0])
        self.assertEqual(insert.args[1][-1], 'YC-1')
        lookup = connection.execute.call_args_list[-2]
        self.assertEqual(lookup.args[1], ('DONG-1', 'YC-1', 'YC-1'))

    def test_xac_nhan_ma_cuoi_tu_dong_chuyen_phieu_sang_bao_gia(self):
        connection = MagicMock()
        connection.execute.return_value.fetchone.side_effect = [
            {'id': 'DONG-1', 'id_dat_ngoai': 'PHIEU-1',
             'can_xac_nhan_ky_thuat': True, 'trang_thai': 'CHO_XAC_NHAN_KY_THUAT'},
            None,
            {'id': 'YC-1'},
            {'id': 'XN-1'},
            {'id': 'PHIEU-1'},
        ]
        manager = MagicMock()
        manager.__enter__.return_value = connection
        with patch.object(dat_ngoai_chi_tiet_repo, 'get_conn', return_value=manager), \
             patch.object(dat_ngoai_chi_tiet_repo, '_bat_dau_idempotency', return_value=None), \
             patch.object(dat_ngoai_chi_tiet_repo, '_hoan_tat_idempotency'), \
             patch.object(dat_ngoai_chi_tiet_repo, 'sinh_ma', return_value='XN-1'):
            dat_ngoai_chi_tiet_repo.them_xac_nhan(
                'DONG-1', 'Đạt', 'NV-1', 'TK-1', 'KEY-1', 'YC-1')

        queries = [call.args[0] for call in connection.execute.call_args_list]
        self.assertIn("UPDATE dat_ngoai_dong d SET trang_thai_dong='DANG_BAO_GIA'", queries[4])
        self.assertIn('AND NOT EXISTS', queries[4])
        self.assertIn("UPDATE dat_ngoai p SET trang_thai='DANG_BAO_GIA'", queries[5])
        self.assertIn('AND NOT EXISTS', queries[5])
        self.assertIn("trang_thai_dong='DANG_BAO_GIA'", queries[6])
        self.assertIn('INSERT INTO dat_ngoai_lich_su', queries[7])

    def test_chua_chuyen_buoc_khi_con_ma_chua_xac_nhan(self):
        connection = MagicMock()
        connection.execute.return_value.fetchone.side_effect = [
            {'id': 'DONG-1', 'id_dat_ngoai': 'PHIEU-1',
             'can_xac_nhan_ky_thuat': True, 'trang_thai': 'CHO_XAC_NHAN_KY_THUAT'},
            None,
            {'id': 'YC-1'},
            {'id': 'XN-1'},
            None,
        ]
        manager = MagicMock()
        manager.__enter__.return_value = connection
        with patch.object(dat_ngoai_chi_tiet_repo, 'get_conn', return_value=manager), \
             patch.object(dat_ngoai_chi_tiet_repo, '_bat_dau_idempotency', return_value=None), \
             patch.object(dat_ngoai_chi_tiet_repo, '_hoan_tat_idempotency'), \
             patch.object(dat_ngoai_chi_tiet_repo, 'sinh_ma', return_value='XN-1'):
            dat_ngoai_chi_tiet_repo.them_xac_nhan(
                'DONG-1', 'Đạt', 'NV-1', 'TK-1', 'KEY-1', 'YC-1')

        queries = [call.args[0] for call in connection.execute.call_args_list]
        self.assertEqual(len(queries), 6)
        self.assertIn("UPDATE dat_ngoai_dong d SET trang_thai_dong='DANG_BAO_GIA'", queries[4])
        self.assertNotIn('INSERT INTO dat_ngoai_lich_su', '\n'.join(queries))

    def test_khong_xac_nhan_chung_khi_co_cau_hoi_dang_cho(self):
        ho_so = {'ma_tai_khoan': 'TK-1', 'ma_nhan_vien': 'NV-1', 'vai_tro': 'KY_THUAT'}
        with patch.object(dat_ngoai_chi_tiet_service, 'kiem_quyen', return_value='toan_bo'), \
             patch.object(dat_ngoai_chi_tiet_service, 'lay_ket_qua_idempotency', return_value=None), \
             patch.object(dat_ngoai_chi_tiet_service, '_dong', return_value={
                 'trang_thai_phieu': 'DANG_BAO_GIA', 'can_xac_nhan_ky_thuat': True,
                 'cho_xac_nhan_kt': True,
             }), \
             patch.object(dat_ngoai_chi_tiet_service.dat_ngoai_chi_tiet_repo, 'them_xac_nhan') as save:
            with self.assertRaises(ThieuDuLieu):
                dat_ngoai_chi_tiet_service.them_xac_nhan(
                    'PHIEU-1', 'DONG-1', {'noi_dung': 'OK'}, ho_so, 'KEY-3',
                )
        save.assert_not_called()

    def test_co_the_xac_nhan_tiep_sau_khi_phieu_da_qua_buoc_ky_thuat(self):
        ho_so = {'ma_tai_khoan': 'TK-1', 'ma_nhan_vien': 'NV-1', 'vai_tro': 'KY_THUAT'}
        with patch.object(dat_ngoai_chi_tiet_service, 'kiem_quyen', return_value='toan_bo') as check_permission, \
             patch.object(dat_ngoai_chi_tiet_service, 'lay_ket_qua_idempotency', return_value=None), \
             patch.object(dat_ngoai_chi_tiet_service, '_dong', return_value={'trang_thai_phieu': 'DANG_BAO_GIA', 'can_xac_nhan_ky_thuat': True}), \
             patch.object(dat_ngoai_chi_tiet_service.dat_ngoai_chi_tiet_repo, 'them_xac_nhan', return_value={'id': 'XN-2'}) as save:
            result = dat_ngoai_chi_tiet_service.them_xac_nhan(
                'PHIEU-1', 'DONG-1', {'noi_dung': 'Đã kiểm tra lại kích thước'}, ho_so, 'KEY-2',
            )

        self.assertEqual(result['id'], 'XN-2')
        check_permission.assert_any_call(ho_so, 'xac_nhan_kt', 'sua', self.connection)
        save.assert_called_once_with('DONG-1', 'Đã kiểm tra lại kích thước', 'NV-1', 'TK-1', 'KEY-2', None, self.connection)

    def test_khong_ghi_xac_nhan_cho_ma_khong_duoc_danh_dau(self):
        ho_so = {'ma_tai_khoan': 'TK-1', 'ma_nhan_vien': 'NV-1', 'vai_tro': 'KY_THUAT'}
        with patch.object(dat_ngoai_chi_tiet_service, 'kiem_quyen', return_value='toan_bo'), \
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
             patch.object(dat_ngoai_service.phan_quyen_service, 'kiem_quyen', return_value='toan_bo'), \
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
        with patch.object(dat_ngoai_service.phan_quyen_service, 'kiem_quyen', return_value='toan_bo'), \
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
        with patch.object(dat_ngoai_service.phan_quyen_service, 'kiem_quyen', return_value='toan_bo'), \
             patch.object(dat_ngoai_service, 'lay_ket_qua_idempotency', return_value=None):
            with self.assertRaises(ThieuDuLieu):
                dat_ngoai_service.tao_bao_gia(
                    ['V1'], [detail], False, None, None, ho_so, 'KEY-1',
                )
