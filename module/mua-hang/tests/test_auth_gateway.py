import unittest
from unittest.mock import patch
import hashlib

from fastapi.testclient import TestClient

from backend.api.app import app
from backend.config.settings import PBKDF2_LEGACY_ROUNDS
from backend.services.auth_service import _kiem_mat_khau


class TestAuthGateway(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    @patch("backend.api.routes.auth.auth_service.dang_nhap")
    def test_dang_nhap_cong_khai_tra_token_va_ho_so(self, dang_nhap):
        dang_nhap.return_value = {
            "token": "a" * 64,
            "ho_so": {
                "ma_tai_khoan": "test_user",
                "ma_nhan_vien": "NV_TEST",
                "ho_va_ten": "Người dùng thử",
                "ma_bo_phan": "MH",
                "vai_tro": "NHAN_VIEN_MUA_HANG",
                "trang_thai": "HOAT_DONG",
                "phien_ban": 1,
            },
        }

        response = self.client.post(
            "/api/v1/dang-nhap",
            json={"ma_tai_khoan": "test_user", "mat_khau": "mat-khau-thu"},
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["ok"])
        self.assertEqual(body["data"]["ho_so"]["ma_bo_phan"], "MH")
        self.assertEqual(body["data"]["token"], "a" * 64)

    def test_api_bao_ve_tu_choi_khi_chua_co_phien(self):
        response = self.client.get("/api/v1/toi")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["ma_loi"], "CHUA_DANG_NHAP")

    def test_xac_minh_hash_pbkdf2_cu(self):
        salt = "salt-test"
        digest = hashlib.pbkdf2_hmac(
            "sha256", b"mat-khau-thu", salt.encode(), PBKDF2_LEGACY_ROUNDS
        ).hex()
        self.assertTrue(_kiem_mat_khau("mat-khau-thu", f"pbkdf2_sha256${salt}${digest}"))
        self.assertFalse(_kiem_mat_khau("sai-mat-khau", f"pbkdf2_sha256${salt}${digest}"))


if __name__ == "__main__":
    unittest.main()
