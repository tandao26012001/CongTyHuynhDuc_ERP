"""Route NCC co dinh khong duoc bi route chi tiet bat nham."""
from unittest import TestCase
from unittest.mock import patch
from fastapi.testclient import TestClient
from backend.api.app import app
from backend.api.middleware import auth_service
from backend.services import mat_hang_ncc_service, catalog_service


class TestNccRoutes(TestCase):
    def test_route_tinh_va_chi_tiet(self):
        profile = {'vai_tro': 'ADMIN', 'ma_nhan_vien': 'TEST'}
        with patch.object(auth_service, 'lay_ho_so', return_value=profile), \
             patch.object(mat_hang_ncc_service, 'so_theo_doi_bm08', return_value=[]) as bm08, \
             patch.object(mat_hang_ncc_service, 'danh_gia_den_han', return_value=[]) as due, \
             patch.object(catalog_service, 'lay_nha_cung_cap', return_value={'id': 'NCC-TEST'}) as detail:
            client = TestClient(app)
            self.assertEqual(client.get('/api/v1/nha-cung-cap/so-bm08').status_code, 200)
            self.assertEqual(client.get('/api/v1/nha-cung-cap/danh-gia-den-han').status_code, 200)
            detail.assert_not_called()
            bm08.assert_called_once_with(profile)
            due.assert_called_once_with(profile)
            self.assertEqual(client.get('/api/v1/nha-cung-cap/NCC-TEST').status_code, 200)
            detail.assert_called_once_with('NCC-TEST')
