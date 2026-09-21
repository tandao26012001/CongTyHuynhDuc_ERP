"""Kiểm thử backend module F01 — Đề nghị vật tư & Gia công ngoài."""

import unittest
from unittest.mock import patch
from uuid import uuid4
from datetime import date, datetime
from zoneinfo import ZoneInfo

from backend.data.db import get_conn
from backend.data import de_nghi_repo as repo
from backend.services import de_nghi_service
from backend.services.errors import KhongCoQuyen, LoiNghiepVu, ThieuDuLieu, XungDot
from backend.services.lich_lam_viec import (
    VNTZ,
    cong_ngay_lam_viec,
    kiem_tra_bat_kha_thi,
    la_ngay_lam_viec,
    tinh_ngay_hieu_luc,
)


class TestF01DeNghi(unittest.TestCase):
    def test_01_lich_lam_viec_va_gio_chot(self):
        """Kịch bản 1, 2, 3, 4: Giờ chốt và lịch làm việc."""
        # 1. Gửi ĐNVT lúc 13:29 Thứ Hai (14/09/2026 là Thứ 2)
        t1 = datetime(2026, 9, 14, 13, 29, 0, tzinfo=VNTZ)
        ngay_hl1, tre1 = tinh_ngay_hieu_luc(t1, "MUA_HANG")
        self.assertEqual(ngay_hl1, date(2026, 9, 14))
        self.assertFalse(tre1)

        # 2. Gửi ĐNVT lúc 13:31 Thứ Hai
        t2 = datetime(2026, 9, 14, 13, 31, 0, tzinfo=VNTZ)
        ngay_hl2, tre2 = tinh_ngay_hieu_luc(t2, "MUA_HANG")
        self.assertEqual(ngay_hl2, date(2026, 9, 15))  # Thứ Ba
        self.assertTrue(tre2)

        # 3. Gửi ĐNVT Thứ Bảy lúc 14:00 (19/09/2026 là Thứ Bảy)
        t3 = datetime(2026, 9, 19, 14, 0, 0, tzinfo=VNTZ)
        ngay_hl3, tre3 = tinh_ngay_hieu_luc(t3, "MUA_HANG")
        self.assertEqual(ngay_hl3, date(2026, 9, 21))  # Nhảy sang Thứ Hai (21/09), bỏ qua Chủ Nhật (20/09)
        self.assertTrue(tre3)

        # 4. Gửi GCN lúc 14:30 (trước 15:00) vs 15:01 (sau 15:00) Thứ Hai
        t4a = datetime(2026, 9, 14, 14, 30, 0, tzinfo=VNTZ)
        ngay_hl4a, tre4a = tinh_ngay_hieu_luc(t4a, "GIA_CONG_NGOAI")
        self.assertEqual(ngay_hl4a, date(2026, 9, 14))
        self.assertFalse(tre4a)

        t4b = datetime(2026, 9, 14, 15, 1, 0, tzinfo=VNTZ)
        ngay_hl4b, tre4b = tinh_ngay_hieu_luc(t4b, "GIA_CONG_NGOAI")
        self.assertEqual(ngay_hl4b, date(2026, 9, 15))
        self.assertTrue(tre4b)

    def test_02_kiem_tra_bat_kha_thi_dn10(self):
        """Kịch bản 8: Đề nghị bất khả thi khi kỳ hạn trước ngày dự kiến về."""
        ngay_hl = date(2026, 9, 14)  # Thứ Hai
        # Mức ưu tiên 2 -> 5 ngày làm việc: T3(15), T4(16), T5(17), T6(18), T7(19) -> Dự kiến về 19/09
        bkt, ngay_ve, msg = kiem_tra_bat_kha_thi(
            ngay_hieu_luc=ngay_hl,
            ky_han_yc=date(2026, 9, 17),  # Cần hàng 17/09 < dự kiến về 19/09
            muc_do_uu_tien=2,
            loai="MUA_HANG",
        )
        self.assertTrue(bkt)
        self.assertEqual(ngay_ve, date(2026, 9, 19))

        # Kỳ hạn cần hàng xa hơn ngày về (25/09) -> KHÔNG bất khả thi
        bkt_ok, ngay_ve_ok, _ = kiem_tra_bat_kha_thi(
            ngay_hieu_luc=ngay_hl,
            ky_han_yc=date(2026, 9, 25),
            muc_do_uu_tien=2,
            loai="MUA_HANG",
        )
        self.assertFalse(bkt_ok)

    def test_03_gcn_thieu_cong_doan(self):
        """Kịch bản 5: Đề nghị gia công ngoài bắt buộc có công đoạn."""
        ho_so_nv = {
            "ma_tai_khoan": "test_nv",
            "ma_nhan_vien": "NV000001",
            "ma_bo_phan": "BH",
            "vai_tro": "NV_YEU_CAU",
        }
        du_lieu = {
            "loai": "GIA_CONG_NGOAI",
            "dong": [
                {
                    "ten_hang": "Chi tiết trục tiện CNC",
                    "dvt": "CAI",
                    "so_luong": 10,
                    "ky_han_yc": "2026-10-01",
                    "ma_cong_doan": None,  # THIẾU CÔNG ĐOẠN
                }
            ],
        }
        with self.assertRaises(LoiNghiepVu) as ctx:
            de_nghi_service.tao_de_nghi(du_lieu, ho_so_nv, str(uuid4()))
        self.assertEqual(ctx.exception.ma_loi, "THIEU_CONG_DOAN")

    def test_04_vong_doi_de_nghi_mua_hang(self):
        """
        Kiểm thử trọn vẹn luồng Đề nghị:
        Tạo nháp -> Gửi duyệt -> Duyệt online (chờ ký bù) -> Ký bù -> Khóa sửa cốt lõi -> Trả lại -> Hủy.
        """
        ho_so_nv = {
            "ma_tai_khoan": "test_nv",
            "ma_nhan_vien": "NV000001",
            "ma_bo_phan": "BH",
            "vai_tro": "NV_YEU_CAU",
        }
        ho_so_tbp = {
            "ma_tai_khoan": "test_tbp",
            "ma_nhan_vien": "NV000001",
            "ma_bo_phan": "BH",
            "vai_tro": "TBP_YEU_CAU",
        }
        ho_so_bld = {
            "ma_tai_khoan": "admin",
            "ma_nhan_vien": "NV000001",
            "ma_bo_phan": "BH",
            "vai_tro": "BAN_LANH_DAO",
        }

        # 1. Tạo phiếu nháp hợp lệ
        du_lieu = {
            "loai": "MUA_HANG",
            "ghi_chu": "Phiếu test tự động",
            "dong": [
                {
                    "ten_hang": "Thép tấm SS400 10x1500x3000",
                    "dvt": "TAM",
                    "so_luong": 2,
                    "ky_han_yc": "2026-10-15",
                }
            ],
        }
        dn = de_nghi_service.tao_de_nghi(du_lieu, ho_so_nv, str(uuid4()))
        id_dn = dn["id"]
        self.assertTrue(id_dn.startswith("DN-"))
        self.assertEqual(dn["trang_thai"], "NHAP")
        self.assertEqual(dn["ma_bo_phan"], "BH")
        self.assertEqual(dn["nguoi_yeu_cau"], "NV000001")

        # Kiểm tra chi tiết và dòng
        ct = de_nghi_service.lay_chi_tiet(id_dn, ho_so_nv)
        self.assertEqual(len(ct["dong"]), 1)
        dong1 = ct["dong"][0]
        self.assertTrue(dong1["id"].startswith("DND-"))
        self.assertEqual(dong1["ten_hang_chup"], "Thép tấm SS400 10x1500x3000")
        self.assertEqual(dong1["muc_do_uu_tien"], 3)  # Không LSX dùng mức 3 cho chính dòng
        self.assertIsNotNone(dong1["ngay_du_kien_ve"])
        with get_conn() as conn:
            so_yc = conn.execute(
                "SELECT count(*) n FROM yeu_cau_cap_ma WHERE id_de_nghi_dong=%s", (dong1["id"],)
            ).fetchone()["n"]
        self.assertEqual(so_yc, 1)

        # Sửa riêng danh sách dòng vẫn phải tăng PHIEN_BAN để chống ghi đè đồng thời
        dn_sua_dong = de_nghi_service.sua_de_nghi(
            id_dn, {"dong": du_lieu["dong"]}, ho_so_nv, ct["de_nghi"]["phien_ban"]
        )
        self.assertGreater(dn_sua_dong["phien_ban"], ct["de_nghi"]["phien_ban"])
        ct = de_nghi_service.lay_chi_tiet(id_dn, ho_so_nv)

        # 2. Gửi duyệt (Kịch bản 16: Không gửi được phiếu rỗng)
        with get_conn() as conn:
            conn.execute("UPDATE de_nghi_dong SET da_xoa=true WHERE id_de_nghi = %s", (id_dn,))
        with self.assertRaises(LoiNghiepVu) as ctx:
            de_nghi_service.gui_duyet(id_dn, ho_so_nv, ct["de_nghi"]["phien_ban"])
        self.assertEqual(ctx.exception.ma_loi, "PHIEU_RONG")

        # Tạo lại dòng và gửi duyệt thành công
        with get_conn() as conn:
            de_nghi_service._xu_ly_dong(
                conn, id_dn, 1, du_lieu["dong"][0], "MUA_HANG", dn["ngay_hieu_luc"], None, "NV000001", "BH"
            )

        # Lấy lại phiên bản mới nhất
        dn_moi = de_nghi_service.lay_chi_tiet(id_dn, ho_so_nv)["de_nghi"]
        dn_da_gui = de_nghi_service.gui_duyet(id_dn, ho_so_nv, dn_moi["phien_ban"])
        self.assertEqual(dn_da_gui["trang_thai"], "CHO_DUYET")

        # Kịch bản 15: Bấm gửi duyệt lần nữa -> Idempotent thành công
        dn_gui_lai = de_nghi_service.gui_duyet(id_dn, ho_so_nv, dn_da_gui["phien_ban"])
        self.assertEqual(dn_gui_lai["trang_thai"], "CHO_DUYET")

        # 3. Kịch bản 11: Trả lại không nhập lý do -> lỗi THIEU_LY_DO
        with self.assertRaises(ThieuDuLieu) as ctx:
            de_nghi_service.tra_lai_de_nghi(id_dn, ho_so_tbp, "", dn_da_gui["phien_ban"])
        self.assertEqual(ctx.exception.ma_loi, "THIEU_LY_DO")

        # 4. DN-04: Trưởng BP duyệt trước, phiếu không LSX tiếp tục chờ BLD
        dn_duyet_bp = de_nghi_service.duyet_de_nghi(
            id_dn, ho_so_tbp, duyet_online=True, ghi_chu="Duyệt online khi công tác", phien_ban=dn_da_gui["phien_ban"]
        )
        self.assertEqual(dn_duyet_bp["trang_thai"], "CHO_DUYET")
        self.assertIsNotNone(dn_duyet_bp["nguoi_duyet_bp"])

        # Ban lãnh đạo duyệt online -> CHO_KY_BU
        dn_duyet = de_nghi_service.duyet_de_nghi(
            id_dn, ho_so_bld, duyet_online=True, ghi_chu="BLD duyệt online", phien_ban=dn_duyet_bp["phien_ban"]
        )
        self.assertEqual(dn_duyet["trang_thai"], "CHO_KY_BU")
        self.assertTrue(dn_duyet["duyet_online"])
        self.assertIsNotNone(dn_duyet["ngay_ky_bu"])

        # Kịch bản 10: CHO_KY_BU đã được duyệt online nên vẫn được thêm ghi chú.
        dn_duyet = de_nghi_service.sua_de_nghi(
            id_dn, {"ghi_chu": "Bổ sung ghi chú trong lúc chờ ký bù"}, ho_so_nv, dn_duyet["phien_ban"]
        )
        self.assertEqual(dn_duyet["ghi_chu"], "Bổ sung ghi chú trong lúc chờ ký bù")

        # DN-07: đến hạn chỉ tạo đúng một lời nhắc, dù tác vụ được gọi nhiều lần.
        with get_conn() as conn:
            conn.execute("UPDATE de_nghi SET ngay_ky_bu=CURRENT_DATE WHERE id=%s", (id_dn,))
            conn.execute("DELETE FROM thong_bao WHERE bang='DE_NGHI' AND id_ban_ghi=%s AND loai='NHAC_KY_BU'", (id_dn,))
            self.assertEqual(repo.gui_nhac_ky_bu_den_han(conn), 1)
            self.assertEqual(repo.gui_nhac_ky_bu_den_han(conn), 0)
            so_nhac = conn.execute(
                "SELECT count(*) n FROM thong_bao WHERE bang='DE_NGHI' AND id_ban_ghi=%s AND loai='NHAC_KY_BU'",
                (id_dn,),
            ).fetchone()["n"]
        self.assertEqual(so_nhac, 1)
        dn_duyet = de_nghi_service.lay_chi_tiet(id_dn, ho_so_nv)["de_nghi"]

        # 5. Ký bù -> DA_DUYET
        dn_ky_bu = de_nghi_service.ky_bu_de_nghi(id_dn, ho_so_bld, dn_duyet["phien_ban"])
        self.assertEqual(dn_ky_bu["trang_thai"], "DA_DUYET")

        # 6. Kịch bản 9 & 10: Khóa sửa thông tin cốt lõi sau khi DA_DUYET (DN-08)
        # Sửa số lượng -> lỗi DA_DUYET_KHOA_SUA
        with self.assertRaises(LoiNghiepVu) as ctx:
            de_nghi_service.sua_de_nghi(id_dn, {"so_luong": 99}, ho_so_nv, dn_ky_bu["phien_ban"])
        self.assertEqual(ctx.exception.ma_loi, "DA_DUYET_KHOA_SUA")

        # Nhưng sửa ghi chú thì được phép
        dn_sua_gc = de_nghi_service.sua_de_nghi(
            id_dn, {"ghi_chu": "Cập nhật ghi chú sau duyệt"}, ho_so_nv, dn_ky_bu["phien_ban"]
        )
        self.assertEqual(dn_sua_gc["ghi_chu"], "Cập nhật ghi chú sau duyệt")

        # 7. Kịch bản 14: Xung đột phiên bản (Optimistic locking 409)
        with self.assertRaises(XungDot):
            de_nghi_service.sua_de_nghi(
                id_dn, {"ghi_chu": "Thử ghi đè với phiên bản cũ"}, ho_so_nv, phien_ban=dn_ky_bu["phien_ban"]
            )

        # 8. Hủy đề nghị (DN-09)
        dn_moi_nhat = de_nghi_service.lay_chi_tiet(id_dn, ho_so_nv)["de_nghi"]
        dn_huy = de_nghi_service.huy_de_nghi(id_dn, ho_so_nv, "Dự án đã dừng yêu cầu", dn_moi_nhat["phien_ban"])
        self.assertEqual(dn_huy["trang_thai"], "HUY")

        # Các dòng cũng chuyển thành HUY
        ct_sau_huy = de_nghi_service.lay_chi_tiet(id_dn, ho_so_nv)
        self.assertTrue(all(d["trang_thai_dong"] == "HUY" for d in ct_sau_huy["dong"]))

    def test_05_phan_quyen_truy_cap_bo_phan(self):
        """Kịch bản 13: Kiểm tra phân quyền truy cập theo bộ phận/cá nhân."""
        ho_so_bp_a = {
            "ma_tai_khoan": "nv_a",
            "ma_nhan_vien": "NV000001",
            "ma_bo_phan": "BH",
            "vai_tro": "NV_YEU_CAU",
        }
        ho_so_bp_b = {
            "ma_tai_khoan": "nv_b",
            "ma_nhan_vien": "NV000002",
            "ma_bo_phan": "CX",
            "vai_tro": "NV_YEU_CAU",
        }

        # Tạo phiếu bởi người thuộc bộ phận BH
        du_lieu = {
            "loai": "MUA_HANG",
            "dong": [{"ten_hang": "Que hàn đặc biệt", "dvt": "HOP", "so_luong": 1, "ky_han_yc": "2026-10-10"}],
        }
        dn = de_nghi_service.tao_de_nghi(du_lieu, ho_so_bp_a, str(uuid4()))

        # Người thuộc bộ phận khác (và phạm vi ca_nhan/bo_phan) không được xem
        with self.assertRaises(KhongCoQuyen):
            de_nghi_service.lay_chi_tiet(dn["id"], ho_so_bp_b)
        de_nghi_service.huy_de_nghi(dn["id"], ho_so_bp_a, "Dọn dữ liệu kiểm thử", dn["phien_ban"])

    def test_06_pham_vi_nhan_vien_mua_hang_va_an_gia(self):
        """NV Mua hàng chỉ truy cập phiếu được phân công; vai trò thường không thấy giá."""
        ho_so_mua = {
            "ma_tai_khoan": "nv_mua", "ma_nhan_vien": "NV-MUA-01",
            "ma_bo_phan": "MH", "vai_tro": "NV_MUA_HANG",
        }
        with patch("backend.services.de_nghi_service.kiem_quyen", return_value="ca_nhan"):
            de_nghi_service._kiem_quyen_truy_cap(
                ho_so_mua, {"nguoi_yeu_cau": "NV-KHAC", "nguoi_mua_hang": "NV-MUA-01", "ma_bo_phan": "CX"}
            )
            with self.assertRaises(KhongCoQuyen):
                de_nghi_service._kiem_quyen_truy_cap(
                    ho_so_mua, {"nguoi_yeu_cau": "NV-MUA-01", "nguoi_mua_hang": "NV-MUA-02", "ma_bo_phan": "CX"}
                )

        du_lieu_gia = {"id": "DND-TEST", "don_gia": 100, "thanh_tien": 200, "tong_tien": 200}
        da_loc = de_nghi_service._loc_truong_gia(du_lieu_gia, {"vai_tro": "NV_YEU_CAU"})
        self.assertNotIn("don_gia", da_loc)
        self.assertNotIn("thanh_tien", da_loc)
        self.assertIn("don_gia", de_nghi_service._loc_truong_gia(du_lieu_gia, ho_so_mua))


if __name__ == "__main__":
    unittest.main()
