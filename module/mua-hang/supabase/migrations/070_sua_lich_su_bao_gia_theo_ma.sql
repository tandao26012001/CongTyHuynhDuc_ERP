BEGIN;

-- Các bản ghi cũ đã dùng trạng thái phiếu cho thao tác báo giá từng mã.
-- Đổi chúng thành chuyển bước của mã để lịch sử không còn hiển thị
-- "Chờ xác nhận kỹ thuật -> Chờ xác nhận kỹ thuật".
UPDATE mua_hang.dat_ngoai_lich_su ls
SET trang_thai_cu='DANG_BAO_GIA',
    trang_thai_moi='CHO_DUYET',
    noi_dung='Đã lưu báo giá cho mã: ' || coalesce((
      SELECT string_agg(d.ma_hang,', ' ORDER BY d.stt_dong)
      FROM mua_hang.dat_ngoai_dong d
      WHERE d.id_dat_ngoai=ls.id_dat_ngoai AND d.don_gia IS NOT NULL
    ),'—') || '. ' || ls.noi_dung
WHERE ls.trang_thai_cu='CHO_XAC_NHAN_KY_THUAT'
  AND ls.trang_thai_moi='CHO_XAC_NHAN_KY_THUAT'
  AND ls.noi_dung LIKE 'Đã lưu báo giá theo mã cho NCC:%';

INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES ('070','Sua lich su bao gia cap phieu thanh chuyen buoc theo ma')
ON CONFLICT (version) DO NOTHING;

COMMIT;
