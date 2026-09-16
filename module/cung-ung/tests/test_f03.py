"""Kiem thu nghiep vu F03."""

from contextlib import nullcontext
from unittest import TestCase
from unittest.mock import patch

from backend.services import f03_service
from backend.services.errors import LoiNghiepVu


class TestF03(TestCase):
    def test_tao_ycbg_chan_ncc_chua_phe_duyet(self):
        conn = object()
        ncc = {"trang_thai": "HOAT_DONG", "da_phe_duyet": False}
        with patch.object(f03_service, "_sua"), \
             patch.object(f03_service, "get_conn", return_value=nullcontext(conn)), \
             patch.object(f03_service.repo, "lay_ncc", return_value=ncc):
            with self.assertRaises(LoiNghiepVu) as ctx:
                f03_service.tao_yeu_cau_bao_gia("NCC-1", ["DND-1"], None, {"ma_nhan_vien": "NV1"})
        self.assertEqual(ctx.exception.ma_loi, "NCC_CHUA_PHE_DUYET")

    def test_nhap_bao_gia_theo_trong_luong_bat_buoc_trong_luong(self):
        conn = object()
        ycbg = {"id": "YCBG-1", "id_ncc": "NCC-1", "trang_thai": "DA_GUI"}
        with patch.object(f03_service, "_sua"), \
             patch.object(f03_service, "get_conn", return_value=nullcontext(conn)), \
             patch.object(f03_service.repo, "lay_ycbg", return_value=ycbg), \
             patch.object(f03_service.repo, "lay_ycbg_dong", return_value=[{"id_de_nghi_dong": "DND-1", "id": "YCBGD-1", "ten_hang_chup": "Thep", "dvt_chup": "KG", "so_luong": 2}] ), \
             patch.object(f03_service.repo, "tao_bao_gia", return_value={"id": "BG-1"}):
            with self.assertRaises(LoiNghiepVu) as ctx:
                f03_service.nhap_bao_gia({"id_ycbg": "YCBG-1", "id_ncc": "NCC-1", "dong": [{"id_de_nghi_dong": "DND-1", "don_gia_co_so": 100, "don_vi_gia": "KG"}]}, {"ma_nhan_vien": "NV1"})
        self.assertEqual(ctx.exception.ma_loi, "THIEU_TRONG_LUONG")

    def test_so_sanh_danh_dau_gia_thap_nhat(self):
        rows = [
            {"id_bao_gia": "BG-1", "id_de_nghi_dong": "DND-1", "don_gia_co_so": 100, "don_vi_gia": "PCS", "so_luong": 2, "trong_luong": None, "thoi_gian_giao_dong": 5},
            {"id_bao_gia": "BG-2", "id_de_nghi_dong": "DND-1", "don_gia_co_so": 80, "don_vi_gia": "PCS", "so_luong": 2, "trong_luong": None, "thoi_gian_giao_dong": 7},
        ]
        with patch.object(f03_service, "_xem"), \
             patch.object(f03_service, "get_conn", return_value=nullcontext(object())), \
             patch.object(f03_service.repo, "lay_ma_tran", return_value=rows):
            result = f03_service.so_sanh(["DND-1"], {"vai_tro": "NV_MUA_HANG"})
        self.assertFalse(result["items"]["DND-1"][0]["la_re_nhat"])
        self.assertTrue(result["items"]["DND-1"][1]["la_re_nhat"])

class TestF03Routes(TestCase):
    def test_routes_da_duoc_mount(self):
        from backend.api.app import app

        paths = {route.path for route in app.routes}
        self.assertIn("/api/v1/yeu-cau-bao-gia", paths)
        self.assertIn("/api/v1/yeu-cau-bao-gia/{id_ycbg}", paths)
        self.assertIn("/api/v1/bao-gia", paths)
        self.assertIn("/api/v1/bao-gia/so-sanh", paths)
        self.assertIn("/api/v1/bao-gia/{id_bao_gia}/chon", paths)
