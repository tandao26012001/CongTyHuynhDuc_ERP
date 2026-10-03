"""Hoi quy pham vi nhom NCC va bao toan diem cu, khong dung DB that."""
from contextlib import nullcontext
from decimal import Decimal
from unittest import TestCase
from unittest.mock import MagicMock, patch
import sqlite3

from backend.data import danh_gia_mat_hang_repo, mat_hang_ncc_repo
from backend.services.danh_gia_mat_hang_service import tinh_diem
from backend.data.ncc_nhom import dieu_kien_vat_tu


class TestNccNhom(TestCase):
    def test_pham_vi_nhom_chinh_chi_tiet_va_lich_su(self):
        db = sqlite3.connect(':memory:')
        self.addCleanup(db.close)
        db.executescript('''
          CREATE TABLE chung_loai(ma_chung_loai TEXT, ma_cha TEXT);
          INSERT INTO chung_loai VALUES ('A',NULL),('A1','A'),('A11','A1'),('A2','A'),('B',NULL);
          CREATE TABLE vat_tu(ma_vat_tu TEXT, ma_chung_loai TEXT);
          INSERT INTO vat_tu VALUES ('VT1','A1'),('VT2','A11'),('VT3','B'),('VT4','A2');
          CREATE TABLE mat_hang_ncc(id TEXT, pham_vi_danh_gia TEXT, loai TEXT,
            ma_vat_tu TEXT, nhom_hang_chinh TEXT, nhom_hang_chi_tiet TEXT);
          INSERT INTO mat_hang_ncc VALUES
            ('main','NHOM_HANG','HANG_HOA',NULL,'A',NULL),
            ('detail','NHOM_HANG','HANG_HOA',NULL,'A','A1'),
            ('old','MA_VAT_TU','HANG_HOA','VT1','A',NULL),
            ('process','NHOM_HANG','GIA_CONG',NULL,NULL,NULL);
        ''')
        query = f'SELECT v.ma_vat_tu FROM mat_hang_ncc m JOIN vat_tu v ON {dieu_kien_vat_tu()} WHERE m.id=? ORDER BY v.ma_vat_tu'
        self.assertEqual(db.execute(query, ('main',)).fetchall(), [('VT1',), ('VT2',), ('VT4',)])
        self.assertEqual(db.execute(query, ('detail',)).fetchall(), [('VT1',), ('VT2',)])
        self.assertEqual(db.execute(query, ('old',)).fetchall(), [('VT1',)])
        self.assertEqual(db.execute(query, ('process',)).fetchall(), [])

    def test_nguon_nhom_khong_can_ma_vat_tu(self):
        conn = MagicMock()
        conn.execute.return_value.fetchone.side_effect = [
            {'id': 'MHN-1', 'id_ncc': 'NCC-1', 'ma_vat_tu': None},
            {'so_lan_giao': 4, 'so_lan_iqc': 4},
            {'gia_tri_12_thang': Decimal(100)},
        ]
        with patch.object(danh_gia_mat_hang_repo, 'get_conn', return_value=nullcontext(conn)):
            result = danh_gia_mat_hang_repo.nguon_diem('MHN-1')
        self.assertEqual(result['so_lan_giao'], 4)
        for call in conn.execute.call_args_list[1:]:
            sql, params = call.args
            self.assertEqual(params, ('MHN-1',))
            self.assertIn('WITH RECURSIVE nhom', sql)
            self.assertIn("pham_vi_danh_gia='MA_VAT_TU'", sql)
            self.assertIn('nhom_hang_chi_tiet', sql)

    def test_tao_nhom_so_tham_so_sql_khop(self):
        conn = MagicMock()
        conn.execute.return_value.fetchone.return_value = {'id': 'MHN-1'}
        with patch.object(mat_hang_ncc_repo, 'get_conn', return_value=nullcontext(conn)), \
             patch.object(mat_hang_ncc_repo, '_bat_dau_idempotency', return_value=None), \
             patch.object(mat_hang_ncc_repo, '_hoan_tat_idempotency'), \
             patch.object(mat_hang_ncc_repo, 'sinh_ma', return_value='MHN-1'):
            mat_hang_ncc_repo.tao({'id_ncc': 'NCC-1', 'ten_hang': 'Nhom',
                                  'loai': 'HANG_HOA', 'dvt': 'KG',
                                  'trang_thai': 'DE_XUAT'}, 'NV1', 'TK1', 'key')
        sql, params = conn.execute.call_args_list[0].args
        self.assertEqual(sql.count('%s'), len(params))
        self.assertIn("'NHOM_HANG'", sql)

    def test_chua_co_giao_dich_khong_cham_zero(self):
        scores = tinh_diem({'gia_tri_muc_5': 100, 'gia_tri_12_thang': None},
                          dict.fromkeys(('diem_gia_ca', 'diem_tam_voc',
                                         'diem_thanh_toan', 'diem_dich_vu'), 8))
        self.assertIsNone(scores['diem_gia_tri_giao_dich'])
        self.assertIsNone(scores['diem_chat_luong'])
        self.assertEqual(scores['trong_so_du_lieu'], 50)
        self.assertEqual(scores['diem_tong'], Decimal(80))
