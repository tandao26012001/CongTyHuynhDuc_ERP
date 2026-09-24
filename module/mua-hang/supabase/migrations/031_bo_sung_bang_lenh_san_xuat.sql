BEGIN;

-- Một số môi trường rút gọn chưa chạy migration nền tảng 001. Tạo bù đúng
-- hai bảng nguồn của Lệnh sản xuất để tab Dữ liệu công ty dùng chung, không
-- phát sinh một bảng danh mục trùng tên hoặc bản sao dữ liệu khác.
CREATE TABLE IF NOT EXISTS mua_hang.lenh_san_xuat (
  lenh_san_xuat varchar(60) PRIMARY KEY,
  so_po varchar(40),
  ma_khach_hang varchar(40),
  ki_han_khach_hang date,
  muc_do_uu_tien smallint CHECK (muc_do_uu_tien IS NULL OR muc_do_uu_tien BETWEEN 1 AND 3),
  ngay_nhan_lenh date,
  trang_thai_don varchar(30),
  ghi_chu text
);

CREATE TABLE IF NOT EXISTS mua_hang.lsx_dong (
  ma_vach varchar(40) PRIMARY KEY,
  lenh_san_xuat varchar(60) NOT NULL
    REFERENCES mua_hang.lenh_san_xuat(lenh_san_xuat) ON DELETE RESTRICT,
  ma_hang varchar(60) NOT NULL,
  ten_hang varchar(300),
  so_luong_po numeric(14,4) CHECK (so_luong_po IS NULL OR so_luong_po > 0),
  dvt varchar(20)
);

CREATE INDEX IF NOT EXISTS ix_lsx_dong_ma_hang
  ON mua_hang.lsx_dong(ma_hang);
CREATE INDEX IF NOT EXISTS ix_lsx_dong_lenh
  ON mua_hang.lsx_dong(lenh_san_xuat);

CREATE TABLE IF NOT EXISTS mua_hang.schema_migrations (
  version varchar(20) PRIMARY KEY,
  mo_ta text NOT NULL,
  ap_dung_luc timestamptz NOT NULL DEFAULT now()
);

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('031', 'Bo sung bang lenh san xuat cho moi truong rut gon')
ON CONFLICT(version) DO NOTHING;

COMMIT;
