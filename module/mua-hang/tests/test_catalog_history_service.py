from unittest import TestCase
from unittest.mock import patch

from backend.services import danh_muc_lich_su_service
from backend.services.errors import KhongTimThay


class TestDanhMucLichSuService(TestCase):
    def test_chuan_hoa_phan_trang_va_danh_muc(self):
        with patch.object(
            danh_muc_lich_su_service.danh_muc_lich_su_repo,
            "danh_sach",
            return_value=([{"id": "LSDM-1"}], 1),
        ) as query:
            result = danh_muc_lich_su_service.danh_sach(
                "don-vi-tinh", " PCS ", trang=0, kich_thuoc=500,
            )

        query.assert_called_once_with("DON_VI_TINH", "PCS", 0, 100)
        self.assertEqual(result["tong"], 1)
        self.assertEqual(result["trang"], 1)
        self.assertEqual(result["kich_thuoc"], 100)

    def test_tu_choi_loai_danh_muc_chua_duoc_ho_tro(self):
        with self.assertRaises(KhongTimThay):
            danh_muc_lich_su_service.danh_sach("khong-ton-tai", "ID-01")

    def test_anh_xa_danh_muc_con_va_chuan_hoa_khoa_ban_ghi(self):
        with patch.object(
            danh_muc_lich_su_service.danh_muc_lich_su_repo,
            "danh_sach",
            return_value=([], 0),
        ) as query:
            danh_muc_lich_su_service.danh_sach("anh-xa-tien-to", " AP-01 ")

        query.assert_called_once_with("ANH_XA_TIEN_TO", "AP-01", 0, 25)


if __name__ == "__main__":
    import unittest

    unittest.main()
