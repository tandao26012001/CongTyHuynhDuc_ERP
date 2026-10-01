from contextlib import nullcontext
from unittest import TestCase
from unittest.mock import MagicMock, patch

from backend.data import auth_repo


class TestDangKyLegacyTaiKhoan(TestCase):
    def test_khong_phu_thuoc_cot_ho_ten_phu(self):
        conn = MagicMock()
        nhan_vien = {
            "ma_nhan_vien": "NV001",
            "ho_va_ten": "Nguyen Van An",
            "ma_bo_phan": "KD",
        }
        tai_khoan = {
            "ma_tai_khoan": "NV001",
            "ma_nhan_vien": "NV001",
            "ho_va_ten": "Nguyen Van An",
            "ma_bo_phan": "KD",
            "trang_thai": "CHO_DUYET",
            "phien_ban": 1,
        }

        def execute(query, params=None):
            cursor = MagicMock()
            if "FROM nhan_vien" in query:
                cursor.fetchall.return_value = [nhan_vien]
            elif query.lstrip().startswith("SELECT 1 FROM tai_khoan"):
                cursor.fetchone.return_value = None
            elif query.lstrip().startswith("INSERT INTO tai_khoan"):
                cursor.fetchone.return_value = tai_khoan
                self.assertIn("ho_va_ten,ma_bo_phan", query)
                self.assertNotIn(",ho_ten", query)
                self.assertEqual(params[2:4], ("Nguyen Van An", "KD"))
            return cursor

        conn.execute.side_effect = execute
        with patch.object(auth_repo, "get_conn", return_value=nullcontext(conn)), \
                patch.object(auth_repo, "_co_mo_hinh_chuan", return_value=True), \
                patch.object(auth_repo, "_co_schema_legacy_tai_khoan", return_value=True):
            result = auth_repo.dang_ky("Nguyen Van An", "bcrypt-hash")

        self.assertEqual(result, ("OK", tai_khoan))


if __name__ == "__main__":
    import unittest

    unittest.main()
