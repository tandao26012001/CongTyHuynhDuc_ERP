from datetime import date
from decimal import Decimal
from io import BytesIO
from unittest import TestCase
from unittest.mock import patch
import openpyxl
from backend.services import ncc_bieu_mau_service as service,ncc_bieu_mau_export as export
from backend.services.errors import ThieuDuLieu,KhongCoQuyen


class TestNccBieuMau(TestCase):
    def test_route_tai_tra_file_va_ten(self):
        from fastapi.testclient import TestClient
        from backend.api.app import app
        from backend.api.middleware import auth_service
        from backend.api.routes import ncc_bieu_mau
        with patch.object(auth_service,'lay_ho_so',return_value={'vai_tro':'ADMIN'}),patch.object(ncc_bieu_mau,'tai',return_value=(b'%PDF-test','BM03_test.pdf')):
            result=TestClient(app).get('/api/v1/bieu-mau/ncc/BM03/tai?dinh_dang=pdf')
        self.assertEqual(result.status_code,200)
        self.assertEqual(result.headers['content-type'],'application/pdf')
        self.assertIn('BM03_test.pdf',result.headers['content-disposition'])

    def test_bm03_du_12_cot_va_khong_tao_cong_thuc(self):
        rows=[dict(ma_ncc=f'NCC-{i}',ten='=HYPERLINK("bad")',san_pham='Nhóm thép') for i in range(80)]
        book=export.workbook('BM03',rows,2026)
        loaded=openpyxl.load_workbook(BytesIO(export.excel(book)))
        self.assertEqual(loaded.active['A88'].value,80)
        self.assertEqual(loaded.active['C9'].data_type,'s')
        self.assertEqual(loaded.active['G9'].value,'Nhóm thép')
        self.assertTrue(export.pdf(export.workbook('BM03',rows,2026),'BM03').startswith(b'%PDF'))

    def test_bm06_diem_thieu_va_ba_chu_ky(self):
        row=dict(id='DGN-TEST',diem_gia_ca=Decimal(8),diem_tong=Decimal(80),trong_so_du_lieu=50,xep_loai='CHINH_YEU')
        book=export.workbook('BM06',row,2026);s=book.active
        self.assertIsNone(s['E18'].value)
        self.assertEqual(s['F20'].value,16)
        self.assertEqual(s['F26'].value,80)
        self.assertIn('50%',s['B31'].value)
        self.assertEqual(s['A37'].value,'Giám đốc Vận hành')
        self.assertTrue(export.pdf(book,'BM06').startswith(b'%PDF'))

    def test_bm07_ket_luan_gan_nhat_va_thang_trong(self):
        base=dict(id_ncc='NCC-1',id_mat_hang_ncc='MHN-1',ten_ncc='NCC test',dia_chi='',ten_hang='Nhóm test')
        rows=[{**base,'ngay_danh_gia':date(2026,1,1),'xep_loai':'DU_PHONG'},
              {**base,'ngay_danh_gia':date(2026,1,20),'xep_loai':'CHINH_YEU'}]
        s=export.workbook('BM07',rows,2026).active
        self.assertEqual(s['E7'].value,'Chính yếu')
        self.assertIsNone(s['F7'].value)

    def test_bm08_ket_qua_khac_khong_tu_cho_dat(self):
        rows=[dict(ngay_nhan=date(2026,1,1),ten_hang='Test',ket_qua='KHAC')]
        s=export.workbook('BM08',rows,2026).active
        self.assertIn('Chưa xác định',s['G7'].value)
        self.assertEqual(s['A7'].value,'01/01/2026')

    def test_bm06_chua_duyet_bi_chan(self):
        with patch.object(service,'kiem_quyen'),patch.object(service.repo,'bang_diem',return_value={'trang_thai_duyet':'CHO_DUYET'}),patch.object(service.repo,'ghi_xuat') as audit:
            with self.assertRaises(ThieuDuLieu):
                service.tai('BM06','pdf',2026,date(2026,1,1),date(2026,12,31),None,'DGN-TEST',{})
            audit.assert_not_called()

    def test_khong_quyen_khong_doc_du_lieu(self):
        with patch.object(service,'kiem_quyen',side_effect=KhongCoQuyen('Denied')),patch.object(service.repo,'danh_muc') as read:
            with self.assertRaises(KhongCoQuyen):
                service.tai('BM03','xlsx',2026,date(2026,1,1),date(2026,12,31),None,None,{})
            read.assert_not_called()

    def test_tai_thanh_cong_ghi_nhat_ky(self):
        with patch.object(service,'kiem_quyen'),patch.object(service.repo,'danh_muc',return_value=[]),patch.object(service.repo,'ghi_xuat') as audit:
            content,name=service.tai('BM03','xlsx',2026,date(2026,1,1),date(2026,12,31),None,None,{'ma_nhan_vien':'NV-TEST'})
            self.assertTrue(content.startswith(b'PK'))
            self.assertTrue(name.endswith('.xlsx'))
            audit.assert_called_once()
