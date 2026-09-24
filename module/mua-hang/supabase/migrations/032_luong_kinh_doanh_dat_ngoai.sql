BEGIN;

-- Hoàn thiện bảng nghiệp vụ có sẵn cho luồng Kinh doanh:
-- nạp LSX -> báo giá/xác nhận KT -> duyệt -> đặt -> làm -> nhận -> hoàn thành.
CREATE TABLE IF NOT EXISTS mua_hang.dat_ngoai (
  id varchar(24) PRIMARY KEY,
  lenh_san_xuat varchar(60) NOT NULL
    REFERENCES mua_hang.lenh_san_xuat(lenh_san_xuat) ON DELETE RESTRICT,
  id_ncc varchar(20),
  nguoi_lap varchar(20) NOT NULL,
  ngay_lap date NOT NULL DEFAULT current_date,
  ky_han date,
  trang_thai varchar(30) NOT NULL DEFAULT 'DANG_BAO_GIA',
  nguoi_duyet varchar(20),
  ngay_duyet timestamptz,
  ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(),
  nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz,
  nguoi_sua varchar(20),
  phien_ban integer NOT NULL DEFAULT 1
);

ALTER TABLE mua_hang.dat_ngoai
  ADD COLUMN IF NOT EXISTS can_xac_nhan_ky_thuat boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS noi_dung_ky_thuat text,
  ADD COLUMN IF NOT EXISTS nguoi_xac_nhan_ky_thuat varchar(20),
  ADD COLUMN IF NOT EXISTS xac_nhan_ky_thuat_luc timestamptz,
  ADD COLUMN IF NOT EXISTS ten_ncc_chup varchar(200),
  ADD COLUMN IF NOT EXISTS ngay_dat timestamptz,
  ADD COLUMN IF NOT EXISTS ngay_nhan timestamptz,
  ADD COLUMN IF NOT EXISTS ngay_hoan_thanh timestamptz,
  ADD COLUMN IF NOT EXISTS ly_do_huy text;

CREATE TABLE IF NOT EXISTS mua_hang.dat_ngoai_dong (
  id varchar(24) PRIMARY KEY,
  id_dat_ngoai varchar(24) NOT NULL
    REFERENCES mua_hang.dat_ngoai(id) ON DELETE RESTRICT,
  stt_dong smallint NOT NULL CHECK (stt_dong > 0),
  ma_vach varchar(40) REFERENCES mua_hang.lsx_dong(ma_vach) ON DELETE RESTRICT,
  ma_hang varchar(60),
  ten_hang_chup varchar(300) NOT NULL,
  dvt_chup varchar(20) NOT NULL,
  so_luong numeric(14,4) NOT NULL CHECK (so_luong > 0),
  don_gia bigint CHECK (don_gia IS NULL OR don_gia >= 0),
  ky_han date,
  ngay_nhan date,
  trang_thai_dong varchar(30) NOT NULL DEFAULT 'DANG_BAO_GIA',
  ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(),
  nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz,
  nguoi_sua varchar(20),
  phien_ban integer NOT NULL DEFAULT 1,
  UNIQUE (id_dat_ngoai, stt_dong)
);

CREATE INDEX IF NOT EXISTS ix_dat_ngoai_trang_thai
  ON mua_hang.dat_ngoai(trang_thai, ngay_tao DESC);
CREATE INDEX IF NOT EXISTS ix_dat_ngoai_lsx
  ON mua_hang.dat_ngoai(lenh_san_xuat);
CREATE INDEX IF NOT EXISTS ix_dat_ngoai_dong_ma_vach
  ON mua_hang.dat_ngoai_dong(ma_vach);

CREATE TABLE IF NOT EXISTS mua_hang.dat_ngoai_lich_su (
  id bigserial PRIMARY KEY,
  id_dat_ngoai varchar(24) NOT NULL
    REFERENCES mua_hang.dat_ngoai(id) ON DELETE RESTRICT,
  trang_thai_cu varchar(30),
  trang_thai_moi varchar(30) NOT NULL,
  noi_dung text,
  nguoi_thuc_hien varchar(20) NOT NULL,
  thoi_diem timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_dat_ngoai_lich_su_phieu
  ON mua_hang.dat_ngoai_lich_su(id_dat_ngoai, thoi_diem DESC);

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('032', 'Luong Kinh doanh nap LSX, bao gia va theo doi dat ngoai')
ON CONFLICT(version) DO NOTHING;

COMMIT;
