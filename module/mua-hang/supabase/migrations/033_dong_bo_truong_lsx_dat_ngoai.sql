BEGIN;

-- Đồng bộ hợp đồng dữ liệu giữa file GCKC, API Đặt ngoài và PostgreSQL.
-- Tên khách hàng từ Excel là dữ liệu chụp, không được ghi nhầm vào mã khách hàng.
ALTER TABLE mua_hang.lenh_san_xuat
  ADD COLUMN IF NOT EXISTS ma_bo_phan varchar(20),
  ADD COLUMN IF NOT EXISTS ten_khach_hang_chup varchar(300),
  ADD COLUMN IF NOT EXISTS so_so varchar(60),
  ADD COLUMN IF NOT EXISTS ngay_so date;

-- Công đoạn, mã bản vẽ thuộc từng mã hàng chứ không thuộc phần đầu LSX.
ALTER TABLE mua_hang.lsx_dong
  ADD COLUMN IF NOT EXISTS ma_cong_doan varchar(20),
  ADD COLUMN IF NOT EXISTS ma_ban_ve varchar(60),
  ADD COLUMN IF NOT EXISTS ghi_chu text;

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('033', 'Dong bo truong LSX tu file GCKC cho luong Dat ngoai')
ON CONFLICT(version) DO NOTHING;

COMMIT;
