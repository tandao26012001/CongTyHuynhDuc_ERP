"""Focused security checks for shared supplier/outsource attachments."""
from contextlib import nullcontext
from pathlib import Path
from unittest import TestCase
from unittest.mock import patch

from backend.services import tuong_tac_ho_so_service as service
from backend.services.errors import KhongCoQuyen, KhongTimThay, ThieuDuLieu


class TestHoSoTuongTac(TestCase):
    def test_rejects_path_like_record_id(self):
        with self.assertRaises(ThieuDuLieu):
            service._doi_tuong('ncc', '../outside')

    def test_personal_scope_rejects_other_owner(self):
        with self.assertRaises(KhongCoQuyen):
            service._kiem_scope('ca_nhan', {'nguoi_lap': 'NV-OTHER'},
                                {'ma_nhan_vien': 'NV-ME'}, 'nguoi_lap')

    def test_department_scope_rejects_other_department(self):
        with self.assertRaises(KhongCoQuyen):
            service._kiem_scope('bo_phan', {'ma_bo_phan': 'BP-OTHER'},
                                {'ma_bo_phan': 'BP-ME'}, 'nguoi_lap')

    def test_rejects_oversized_upload_before_database_access(self):
        with patch.object(service, 'MAX_UPLOAD_BYTES', 3), \
                patch.object(service, 'get_conn') as get_conn:
            with self.assertRaises(ThieuDuLieu):
                service.them_tep('ncc', 'NCC-00001', 'a.pdf', b'1234',
                                 'application/pdf', {})
        get_conn.assert_not_called()

    def test_rejects_unsupported_mime_before_database_access(self):
        with patch.object(service, 'get_conn') as get_conn:
            with self.assertRaises(ThieuDuLieu):
                service.them_tep('ncc', 'NCC-00001', 'a.svg', b'<svg>',
                                 'image/svg+xml', {})
        get_conn.assert_not_called()

    def test_download_rejects_file_outside_record_folder(self):
        outside = Path('D:/uploads/ncc/NCC-00002/outside.pdf')
        row = {'duong_dan': str(outside), 'ten_tep': 'outside.pdf',
               'loai_mime': 'application/pdf'}
        cursor = type('Cursor', (), {'fetchone': lambda _self: row})()
        conn = type('Conn', (), {'execute': lambda *_args: cursor})()
        with patch.object(service, 'UPLOAD_DIR', 'D:/uploads'), \
                patch.object(service, '_kiem_tra_ho_so', return_value=('NHA_CUNG_CAP', 'ncc')), \
                patch.object(service, 'get_conn', return_value=nullcontext(conn)):
            with self.assertRaises(KhongTimThay):
                service.tai_tep('ncc', 'NCC-00001', 'TEP-1', {})
