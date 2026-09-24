BEGIN;

-- Cột H của báo cáo GCKC là nội dung hiển thị "Bộ phận", không bảo đảm là
-- mã danh mục ngắn. Lưu ảnh chụp tên riêng để không ép nhầm vào ma_bo_phan.
ALTER TABLE mua_hang.lenh_san_xuat
  ADD COLUMN IF NOT EXISTS ten_bo_phan_chup varchar(300);

-- Giữ lại dữ liệu đã nhập theo hợp đồng cũ, nếu có.
UPDATE mua_hang.lenh_san_xuat
SET ten_bo_phan_chup = ma_bo_phan
WHERE ten_bo_phan_chup IS NULL
  AND ma_bo_phan IS NOT NULL;

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('034', 'Tach ten bo phan chup va chap nhan ngay Excel khi nap LSX')
ON CONFLICT(version) DO NOTHING;

COMMIT;
