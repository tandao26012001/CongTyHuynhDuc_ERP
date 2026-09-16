"""Kiểm thử tầng HTTP API cho module Đề nghị F01."""

import unittest
from uuid import uuid4
from fastapi.testclient import TestClient
from backend.api.app import app
from backend.data import auth_repo
from backend.data.db import get_conn


class TestApiDeNghi(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        with get_conn() as conn:
            # Tạo tài khoản test_tbp có quyền sửa và duyệt
            conn.execute(
                """
                INSERT INTO tai_khoan(
                    ma_tai_khoan, ma_nhan_vien, ho_va_ten, ma_bo_phan,
                    vai_tro, mat_khau_hash, trang_thai, nguoi_tao
                ) VALUES (
                    'test_tbp_api', 'NV000110', 'Trần Văn TBP', 'BH',
                    'TBP_YEU_CAU', '$2b$12$mockhashmockhashmockha', 'HOAT_DONG', 'SYSTEM'
                ) ON CONFLICT (ma_tai_khoan) DO UPDATE
                SET vai_tro = 'TBP_YEU_CAU', trang_thai = 'HOAT_DONG'
                """
            )

        # Phiên admin (QUAN_TRI_KY_THUAT)
        cls.token_admin = "test_token_f01_admin"
        auth_repo.xoa_phien(cls.token_admin)
        auth_repo.tao_phien("admin", cls.token_admin, "127.0.0.1", "TestClient")

        # Phiên TBP (TBP_YEU_CAU)
        cls.token_tbp = "test_token_f01_tbp"
        auth_repo.xoa_phien(cls.token_tbp)
        auth_repo.tao_phien("test_tbp_api", cls.token_tbp, "127.0.0.1", "TestClient")

    def test_01_chua_dang_nhap_tra_401(self):
        """Gọi API khi không có token trả 401."""
        res = self.client.get("/api/v1/de-nghi")
        self.assertEqual(res.status_code, 401)
        data = res.json()
        self.assertFalse(data["ok"])
        self.assertEqual(data["ma_loi"], "CHUA_DANG_NHAP")

    def test_02_danh_sach_de_nghi(self):
        """Lấy danh sách đề nghị qua API."""
        res = self.client.get("/api/v1/de-nghi", headers={"X-Phien": self.token_admin})
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertTrue(body["ok"])
        data = body["data"]
        self.assertIn("items", data)
        self.assertIn("tong", data)
        self.assertIn("thong_ke", data)

    def test_03_soi_ky_han_nhanh(self):
        """Kiểm tra tiện ích soi kỳ hạn."""
        res = self.client.get(
            "/api/v1/de-nghi/soi-ky-han?ky_han_yc=2026-09-20&loai=MUA_HANG",
            headers={"X-Phien": self.token_admin},
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertTrue(body["ok"])
        self.assertIn("bat_kha_thi", body["data"])
        self.assertIn("ngay_du_kien_ve", body["data"])

    def test_04_tai_xuong_csv(self):
        """Xuất CSV danh sách đề nghị."""
        res = self.client.get("/api/v1/de-nghi/tai-xuong", headers={"X-Phien": self.token_admin})
        self.assertEqual(res.status_code, 200)
        self.assertIn("text/csv", res.headers.get("content-type", ""))
        self.assertIn("attachment; filename=de_nghi.csv", res.headers.get("content-disposition", ""))
        self.assertTrue(res.text.startswith("\ufeffMã đề nghị"))

    def test_05_hang_doi_cho_duyet(self):
        """Lấy hàng đợi chờ duyệt với tài khoản TBP_YEU_CAU."""
        res = self.client.get("/api/v1/de-nghi/cho-duyet", headers={"X-Phien": self.token_tbp})
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertTrue(body["ok"])
        self.assertIn("items", body["data"])

    def test_06_tao_va_lay_chi_tiet_de_nghi(self):
        """Tạo phiếu mới qua POST với tài khoản TBP_YEU_CAU và đọc chi tiết in ấn qua GET /in."""
        payload = {
            "loai": "MUA_HANG",
            "ghi_chu": "Test tạo từ API endpoint",
            "dong": [
                {
                    "ten_hang": "Bu lông lục giác chìm M8x30 inox 304",
                    "dvt": "CON",
                    "so_luong": 50,
                    "ky_han_yc": "2026-10-20",
                }
            ],
        }
        khoa = str(uuid4())
        headers = {"X-Phien": self.token_tbp, "X-Idempotency-Key": khoa}
        res_post = self.client.post("/api/v1/de-nghi", json=payload, headers=headers)
        self.assertEqual(res_post.status_code, 200)
        dn = res_post.json()["data"]
        id_dn = dn["id"]
        self.assertTrue(id_dn.startswith("DN-"))

        # Gửi lại cùng khóa không tạo chứng từ thứ hai
        res_lap = self.client.post("/api/v1/de-nghi", json=payload, headers=headers)
        self.assertEqual(res_lap.status_code, 200)
        self.assertEqual(res_lap.json()["data"]["id"], id_dn)

        res_ct = self.client.get(f"/api/v1/de-nghi/{id_dn}", headers={"X-Phien": self.token_tbp})
        self.assertIn("trao_doi", res_ct.json()["data"])
        self.assertIn("dinh_kem", res_ct.json()["data"])

        # Lấy dữ liệu in
        res_in = self.client.get(f"/api/v1/de-nghi/{id_dn}/in", headers={"X-Phien": self.token_tbp})
        self.assertEqual(res_in.status_code, 200)
        self.assertIn("application/pdf", res_in.headers["content-type"])
        self.assertTrue(res_in.content.startswith(b"%PDF"))

        phien_ban = res_ct.json()["data"]["de_nghi"]["phien_ban"]
        res_huy = self.client.post(
            f"/api/v1/de-nghi/{id_dn}/huy", json={"phien_ban": phien_ban, "ly_do": "Dọn dữ liệu kiểm thử"},
            headers={"X-Phien": self.token_tbp},
        )
        self.assertEqual(res_huy.status_code, 200)


if __name__ == "__main__":
    unittest.main()
