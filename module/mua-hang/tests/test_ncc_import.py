"""Kiểm thử nhập lô với dữ liệu giả, không kết nối database vận hành."""
from contextlib import nullcontext
from unittest import TestCase
from unittest.mock import MagicMock, patch

from psycopg.errors import UniqueViolation

from backend.services import ncc_import_service as service


class TestNccImport(TestCase):
    def setUp(self):
        self.conn = MagicMock()
        self.conn.transaction.side_effect = lambda: nullcontext()
        self.patches = [
            patch.object(service.repo, "get_conn", return_value=nullcontext(self.conn)),
            patch.object(service.repo, "_bat_dau_idempotency", return_value=None),
            patch.object(service.repo, "_hoan_tat_idempotency"),
            patch.object(service.repo, "tim_trung_ncc_conn", return_value=[]),
            patch.object(service.repo, "_tao_nha_cung_cap", return_value={}),
        ]
        self.connection, self.replay, self.finish, self.duplicates, self.create = [p.start() for p in self.patches]
        for p in self.patches:
            self.addCleanup(p.stop)

    def run_batch(self, rows, confirm=False):
        return service.nhap(rows, "NV_TEST", "user_test", "key-test", confirm)

    def test_mixed_rows_keep_valid_and_warning(self):
        self.duplicates.side_effect = [[], [{"loai_trung": "MST_CHINH_XAC"}],
                                       [{"loai_trung": "TEN_GAN_GIONG", "ten": "NCC mẫu"}]]
        result = self.run_batch([{"ten": "NCC A"}, {"ten": ""},
                                 {"ten": "NCC B"}, {"ten": "NCC C"}])
        self.assertEqual(result["so_dong"], 1)
        self.assertEqual([x["dong"] for x in result["results"]], [1, 2, 3, 4])
        self.assertEqual(result["results"][2]["ma_loi"], "NCC_TRUNG_CHINH_XAC")
        self.assertTrue(result["results"][3]["can_xac_nhan"])
        self.connection.assert_called_once()
        self.create.assert_called_once()

    def test_confirm_warning_does_not_bypass_exact_duplicate(self):
        self.duplicates.side_effect = [[{"loai_trung": "TEN_GAN_GIONG"}],
                                       [{"loai_trung": "MST_CHINH_XAC"}]]
        result = self.run_batch([{"ten": "NCC A"}, {"ten": "NCC B"}], True)
        self.assertEqual(result["so_dong"], 1)
        self.assertFalse(result["results"][1]["da_luu"])

    def test_constraint_error_does_not_stop_following_row(self):
        self.create.side_effect = [UniqueViolation(), {}]
        result = self.run_batch([{"ten": "NCC A"}, {"ten": "NCC B"}])
        self.assertEqual(result["so_dong"], 1)
        self.assertTrue(result["results"][1]["da_luu"])
        self.assertEqual(self.conn.transaction.call_count, 2)

    def test_retry_returns_saved_result_without_inserting(self):
        saved = {"so_dong": 1, "results": [{"dong": 1, "da_luu": True}]}
        self.replay.return_value = saved
        self.assertEqual(self.run_batch([{"ten": "NCC A"}]), saved)
        self.create.assert_not_called()

    def test_unexpected_failure_does_not_cache_partial_success(self):
        self.create.side_effect = RuntimeError("database unavailable")
        with self.assertRaises(RuntimeError):
            self.run_batch([{"ten": "NCC A"}])
        self.finish.assert_not_called()
