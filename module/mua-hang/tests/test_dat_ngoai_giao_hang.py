from contextlib import nullcontext
from datetime import date
from unittest import TestCase
from unittest.mock import MagicMock, patch

from backend.data import dat_ngoai_chi_tiet_repo
from backend.services import dat_ngoai_chi_tiet_service
from backend.services.errors import ThieuDuLieu, XungDot


class TestSuaDotGiaoService(TestCase):
    def setUp(self):
        self.profile = {"ma_nhan_vien": "NV_TEST"}
        self.data = {
            "phien_ban": 2,
            "ngay_du_kien": date(2026, 10, 4),
            "ly_do": "NCC lùi lịch giao",
        }

    def test_requires_reason_for_delivery_date_change(self):
        data = {**self.data, "ly_do": "  "}
        with patch.object(dat_ngoai_chi_tiet_service, "kiem_quyen", return_value="toan_bo"), \
                patch.object(dat_ngoai_chi_tiet_service, "_dong", return_value={"trang_thai_phieu": "DANG_LAM"}), \
                patch.object(dat_ngoai_chi_tiet_service.dat_ngoai_chi_tiet_repo, "sua_ngay_du_kien_dot_giao") as save:
            with self.assertRaises(ThieuDuLieu):
                dat_ngoai_chi_tiet_service.sua_dot_giao("P1", "D1", "G1", data, self.profile)
        save.assert_not_called()

    def test_rejects_changes_after_request_is_closed(self):
        with patch.object(dat_ngoai_chi_tiet_service, "kiem_quyen", return_value="toan_bo"), \
                patch.object(dat_ngoai_chi_tiet_service, "_dong", return_value={"trang_thai_phieu": "HOAN_THANH"}), \
                patch.object(dat_ngoai_chi_tiet_service.dat_ngoai_chi_tiet_repo, "sua_ngay_du_kien_dot_giao") as save:
            with self.assertRaises(XungDot):
                dat_ngoai_chi_tiet_service.sua_dot_giao("P1", "D1", "G1", self.data, self.profile)
        save.assert_not_called()

    def test_saves_trimmed_reason_with_actor(self):
        expected = {"id": "G1", "ngay_du_kien": self.data["ngay_du_kien"]}
        data = {**self.data, "ly_do": "  NCC lùi lịch giao  "}
        with patch.object(dat_ngoai_chi_tiet_service, "kiem_quyen", return_value="toan_bo"), \
                patch.object(dat_ngoai_chi_tiet_service, "_dong", return_value={"trang_thai_phieu": "DANG_LAM"}), \
                patch.object(dat_ngoai_chi_tiet_service.dat_ngoai_chi_tiet_repo,
                             "sua_ngay_du_kien_dot_giao", return_value=expected) as save:
            result = dat_ngoai_chi_tiet_service.sua_dot_giao("P1", "D1", "G1", data, self.profile)
        self.assertEqual(result, expected)
        save.assert_called_once_with("D1", "G1", 2, date(2026, 10, 4), "NCC lùi lịch giao", "NV_TEST")


class TestSuaDotGiaoRepo(TestCase):
    def test_date_change_updates_version_and_appends_history(self):
        old_date = date(2026, 10, 1)
        new_date = date(2026, 10, 4)
        updated = {"id": "G1", "ngay_du_kien": new_date, "phien_ban": 3}
        conn = MagicMock()
        conn.execute.side_effect = [
            MagicMock(fetchone=MagicMock(return_value={"ngay_du_kien": old_date})),
            MagicMock(fetchone=MagicMock(return_value=updated)),
            MagicMock(),
        ]
        with patch.object(dat_ngoai_chi_tiet_repo, "get_conn", return_value=nullcontext(conn)), \
                patch.object(dat_ngoai_chi_tiet_repo, "sinh_ma", return_value="DNGH-2026-000001"):
            result = dat_ngoai_chi_tiet_repo.sua_ngay_du_kien_dot_giao(
                "D1", "G1", 2, new_date, "NCC lùi lịch", "NV_TEST")

        self.assertEqual(result, updated)
        update_call = conn.execute.call_args_list[1]
        self.assertIn("phien_ban=phien_ban+1", update_call.args[0])
        self.assertEqual(update_call.args[1], (new_date, "NV_TEST", "G1", "D1", 2))
        history_call = conn.execute.call_args_list[2]
        self.assertIn("INSERT INTO dat_ngoai_dot_giao_lich_su", history_call.args[0])
        self.assertEqual(history_call.args[1], ("DNGH-2026-000001", "G1", old_date, new_date, "NCC lùi lịch", "NV_TEST"))

    def test_unchanged_date_does_not_append_history(self):
        current_date = date(2026, 10, 1)
        current = {"id": "G1", "ngay_du_kien": current_date, "phien_ban": 2}
        conn = MagicMock()
        conn.execute.side_effect = [
            MagicMock(fetchone=MagicMock(return_value={"ngay_du_kien": current_date})),
            MagicMock(fetchone=MagicMock(return_value=current)),
        ]
        with patch.object(dat_ngoai_chi_tiet_repo, "get_conn", return_value=nullcontext(conn)):
            result = dat_ngoai_chi_tiet_repo.sua_ngay_du_kien_dot_giao(
                "D1", "G1", 2, current_date, "Không đổi", "NV_TEST")
        self.assertEqual(result, current)
        self.assertEqual(conn.execute.call_count, 2)
