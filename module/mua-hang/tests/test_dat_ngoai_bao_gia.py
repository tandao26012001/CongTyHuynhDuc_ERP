from contextlib import nullcontext
from unittest import TestCase
from unittest.mock import MagicMock, patch

from backend.data import dat_ngoai_repo as repo


class TestBaoGiaDatNgoai(TestCase):
    def call(self, status="DANG_BAO_GIA", ids=None, supplier="NCC_TEST", version=1):
        conn = MagicMock()
        conn.execute.return_value.fetchall.return_value = [{"id": "D1"}, {"id": "D2"}]
        conn.execute.return_value.fetchone.return_value = {"id": "TEST", "trang_thai": "CHO_DUYET"}
        phieu = {"phien_ban": 1, "trang_thai": status, "id_ncc": supplier, "ten_ncc_chup": "NCC mẫu"}
        payload = {"ten_ncc": "Tên gửi từ trình duyệt", "dong": [{"id": id, "don_gia": 100} for id in (ids if ids is not None else ["D1", "D2"])]}
        with patch.object(repo, "get_conn", return_value=nullcontext(conn)), patch.object(repo, "lay_dat_ngoai", return_value=phieu):
            result = repo.cap_nhat_bao_gia("TEST", version, payload, "NV_TEST")
        return result, conn

    def test_wrong_status_supplier_or_version_never_writes(self):
        for args in ({"status": "HUY"}, {"status": "CHO_DUYET"}, {"supplier": None}, {"version": 2}):
            with self.subTest(args=args):
                result, conn = self.call(**args)
                self.assertIsNone(result)
                conn.execute.assert_not_called()

    def test_missing_duplicate_or_foreign_lines_never_write(self):
        for ids in (["D1"], ["D1", "D1"], ["D1", "OTHER"]):
            with self.subTest(ids=ids):
                result, conn = self.call(ids=ids)
                self.assertIsNone(result)
                self.assertEqual(conn.execute.call_count, 1)

    def test_complete_quote_uses_saved_supplier_and_records_history(self):
        result, conn = self.call()
        self.assertEqual(result["trang_thai"], "CHO_DUYET")
        self.assertEqual(conn.execute.call_count, 5)
        self.assertEqual(conn.execute.call_args_list[3].args[1][0], "NCC mẫu")
