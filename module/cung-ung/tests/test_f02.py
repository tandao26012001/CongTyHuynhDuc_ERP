"""Kiem thu nghiep vu F02 khong can ket noi database."""

from contextlib import nullcontext
from unittest import TestCase
from unittest.mock import patch

from backend.services import f02_service
from backend.services.errors import ThieuDuLieu, LoiNghiepVu


class TestF02Validation(TestCase):
    def test_xac_nhan_kt_tu_choi_ket_qua_khong_hop_le(self):
        with self.assertRaises(LoiNghiepVu) as ctx:
            f02_service.xac_nhan_kt("DND-1", "SAI", None, {"vai_tro": "KY_THUAT"})
        self.assertEqual(ctx.exception.ma_loi, "KET_QUA_KT_KHONG_HOP_LE")

    def test_cap_ma_bat_buoc_idempotency_key(self):
        ho_so = {"vai_tro": "KY_THUAT", "ma_tai_khoan": "kt", "ma_nhan_vien": "NV1"}
        with patch.object(f02_service, "_yeu_cau"):
            with self.assertRaises(ThieuDuLieu) as ctx:
                f02_service.cap_ma_moi("YCM-1", {"ma_vat_tu": "VT-1"}, ho_so, None)
        self.assertEqual(ctx.exception.ma_loi, "THIEU_IDEMPOTENCY_KEY")

    def test_yeu_cau_ky_thuat_luu_trao_doi(self):
        dong = {"id": "DND-1", "id_de_nghi": "DN-1", "phien_ban": 2,
                "nguoi_yeu_cau": "NV1", "ma_bo_phan": "BP1"}
        cap_nhat = {**dong, "can_xac_nhan_kt": True}
        conn = object()
        ho_so = {"ma_nhan_vien": "NV2", "ma_bo_phan": "BP1"}
        with patch.object(f02_service, "kiem_quyen"), \
             patch.object(f02_service, "get_conn", return_value=nullcontext(conn)), \
             patch.object(f02_service.repo, "lay_dong", return_value=dong), \
             patch.object(f02_service.repo, "cap_nhat_dong", return_value=cap_nhat), \
             patch.object(f02_service.tuong_tac, "them_trao_doi") as them_trao_doi:
            result = f02_service.yeu_cau_xac_nhan_kt("DND-1", "  Kiem tra dung sai  ", ho_so)
        self.assertEqual(result["id"], "DND-1")
        them_trao_doi.assert_called_once_with(conn, "DN-1", "Kiem tra dung sai", "NV2")


class TestF02Routes(TestCase):
    def test_cac_endpoint_cap_ma_da_dang_ky(self):
        from backend.api.app import app

        routes = {route.path for route in app.routes}
        self.assertIn("/api/v1/yeu-cau-cap-ma/{id_yc}/goi-y-trung", routes)
        self.assertIn("/api/v1/yeu-cau-cap-ma/{id_yc}/cap", routes)
        self.assertIn("/api/v1/yeu-cau-cap-ma/{id_yc}/gan", routes)
        self.assertIn("/api/v1/yeu-cau-cap-ma/{id_yc}/tu-choi", routes)
