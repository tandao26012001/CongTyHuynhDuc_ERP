from contextlib import nullcontext
from unittest import TestCase
from unittest.mock import MagicMock, patch

from backend.data import dat_ngoai_repo as repo
from backend.services import dat_ngoai_service
from backend.services.errors import ThieuDuLieu


class TestBaoGiaDatNgoaiRepo(TestCase):
    def call(self, status="DANG_BAO_GIA", ids=None, version=1):
        conn = MagicMock()
        conn.summary_complete = ids is None or set(ids) == {"D1", "D2"}
        conn.execute.side_effect = lambda sql, params=None: self.cursor_for(sql, conn)
        phieu = {"phien_ban": 1, "trang_thai": status, "id_ncc": None}
        payload = {"ghi_chu": "Ghi chú", "dong": [
            {"id": id_dong, "id_ncc": f"NCC_{id_dong}", "ma_ncc": f"M{index}",
             "ten_ncc": f"Nhà cung cấp {index}", "don_gia": 100 + index,
             "ky_han": None, "ghi_chu": None}
            for index, id_dong in enumerate(ids if ids is not None else ["D1", "D2"], 1)
        ]}
        with patch.object(repo, "get_conn", return_value=nullcontext(conn)), \
                patch.object(repo, "lay_dat_ngoai", return_value=phieu):
            result = repo.cap_nhat_bao_gia("TEST", version, payload, "NV_TEST")
        return result, conn

    @staticmethod
    def cursor_for(sql, conn):
        cursor = MagicMock()
        if "SELECT id FROM dat_ngoai_dong" in sql:
            cursor.fetchall.return_value = [{"id": "D1"}, {"id": "D2"}]
        elif "string_agg(DISTINCT ten_ncc_chup" in sql:
            cursor.fetchone.return_value = {"nha_cung_cap": "Nhà cung cấp 1, Nhà cung cấp 2", "ky_han": None,
                                            "da_bao_gia_day_du": conn.summary_complete}
        elif "UPDATE dat_ngoai SET" in sql:
            cursor.fetchone.return_value = {"id": "TEST", "trang_thai": "CHO_DUYET" if conn.summary_complete else "DANG_BAO_GIA"}
        return cursor

    def test_wrong_status_or_version_never_writes(self):
        for args in ({"status": "HUY"}, {"status": "CHO_DUYET"}, {"version": 2}):
            with self.subTest(args=args):
                result, conn = self.call(**args)
                self.assertIsNone(result)
                conn.execute.assert_not_called()

    def test_missing_duplicate_or_foreign_lines_never_write(self):
        for ids in (["D1", "D1"], ["D1", "OTHER"]):
            with self.subTest(ids=ids):
                result, conn = self.call(ids=ids)
                self.assertIsNone(result)
                self.assertEqual(conn.execute.call_count, 1)

    def test_quote_persists_supplier_and_price_per_line(self):
        result, conn = self.call()
        self.assertEqual(result["trang_thai"], "CHO_DUYET")
        updates = [call for call in conn.execute.call_args_list if "UPDATE dat_ngoai_dong" in call.args[0]]
        self.assertEqual(len(updates), 2)
        self.assertEqual(updates[0].args[1][:5], ("NCC_D1", "M1", "Nhà cung cấp 1", 101, None))
        self.assertEqual(updates[1].args[1][:5], ("NCC_D2", "M2", "Nhà cung cấp 2", 102, None))
        header_update = next(call for call in conn.execute.call_args_list if "UPDATE dat_ngoai SET" in call.args[0])
        self.assertIn("id_ncc=NULL", header_update.args[0])

    def test_partial_quote_keeps_parent_in_quote_stage(self):
        result, conn = self.call(ids=["D1"])
        self.assertEqual(result["trang_thai"], "DANG_BAO_GIA")
        header_update = next(call for call in conn.execute.call_args_list if "UPDATE dat_ngoai SET" in call.args[0])
        self.assertIn("trang_thai=%s", header_update.args[0])
        self.assertEqual(header_update.args[1][3], "DANG_BAO_GIA")


class TestBaoGiaDatNgoaiService(TestCase):
    def setUp(self):
        self.profile = {"ma_nhan_vien": "NV_TEST"}
        self.payload = {"ghi_chu": None, "dong": [
            {"id": "D1", "id_ncc": "NCC_1", "don_gia": 100, "ky_han": None},
            {"id": "D2", "id_ncc": "NCC_2", "don_gia": 200, "ky_han": None},
        ]}

    def test_requires_supplier_for_every_line(self):
        payload = {"ghi_chu": None, "dong": [{"id": "D1", "id_ncc": "", "don_gia": 100}]}
        with patch.object(dat_ngoai_service.phan_quyen_service, "kiem_quyen"), \
                patch.object(dat_ngoai_service.dat_ngoai_repo, "cap_nhat_bao_gia") as save:
            with self.assertRaises(ThieuDuLieu):
                dat_ngoai_service.cap_nhat_bao_gia("TEST", 1, payload, self.profile)
        save.assert_not_called()

    def test_validates_and_snapshots_each_selected_supplier(self):
        suppliers = {
            "NCC_1": {"id": "NCC_1", "ma_ncc": "M1", "ten": "Nhà 1", "la_ncc_gia_cong": True, "trang_thai": "HOAT_DONG"},
            "NCC_2": {"id": "NCC_2", "ma_ncc": "M2", "ten": "Nhà 2", "la_ncc_gia_cong": True, "trang_thai": "HOAT_DONG"},
        }
        with patch.object(dat_ngoai_service.phan_quyen_service, "kiem_quyen"), \
                patch.object(dat_ngoai_service.catalog_service, "lay_nha_cung_cap", side_effect=lambda id_ncc: suppliers[id_ncc]), \
                patch.object(dat_ngoai_service.dat_ngoai_repo, "cap_nhat_bao_gia", return_value={"id": "TEST"}) as save:
            dat_ngoai_service.cap_nhat_bao_gia("TEST", 1, self.payload, self.profile)
        rows = save.call_args.args[2]["dong"]
        self.assertEqual([(row["ma_ncc"], row["ten_ncc"]) for row in rows], [("M1", "Nhà 1"), ("M2", "Nhà 2")])

    def test_rejects_inactive_or_non_outsource_supplier(self):
        supplier = {"la_ncc_gia_cong": False, "trang_thai": "HOAT_DONG"}
        with patch.object(dat_ngoai_service.phan_quyen_service, "kiem_quyen"), \
                patch.object(dat_ngoai_service.catalog_service, "lay_nha_cung_cap", return_value=supplier), \
                patch.object(dat_ngoai_service.dat_ngoai_repo, "cap_nhat_bao_gia") as save:
            with self.assertRaises(ThieuDuLieu):
                dat_ngoai_service.cap_nhat_bao_gia("TEST", 1, self.payload, self.profile)
        save.assert_not_called()
