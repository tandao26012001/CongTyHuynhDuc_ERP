BEGIN;

-- F3: giu du lieu cu, bo sung cac truong bat buoc cho phieu moi o service.
ALTER TABLE mua_hang.dat_ngoai_dong
  ADD COLUMN IF NOT EXISTS noi_dung_gia_cong text,
  ADD COLUMN IF NOT EXISTS yeu_cau_ky_thuat text,
  ADD COLUMN IF NOT EXISTS yeu_cau_chat_luong text,
  ADD COLUMN IF NOT EXISTS ngay_khach_yeu_cau date,
  ADD COLUMN IF NOT EXISTS ngay_ncc_cam_ket date,
  ADD COLUMN IF NOT EXISTS ngay_du_kien_noi_bo date,
  ADD COLUMN IF NOT EXISTS ma_hang_goc varchar(60),
  ADD COLUMN IF NOT EXISTS ma_hang_thay_the varchar(60),
  ADD COLUMN IF NOT EXISTS id_su_co varchar(24) REFERENCES mua_hang.su_co(id) ON DELETE RESTRICT;

UPDATE mua_hang.dat_ngoai_dong
SET ma_hang_goc=ma_hang
WHERE ma_hang_goc IS NULL;

CREATE TABLE IF NOT EXISTS mua_hang.dat_ngoai_xac_nhan_kt (
  id varchar(24) PRIMARY KEY,
  id_dat_ngoai_dong varchar(24) NOT NULL REFERENCES mua_hang.dat_ngoai_dong(id) ON DELETE RESTRICT,
  noi_dung text NOT NULL CHECK (length(trim(noi_dung))>0),
  ket_luan varchar(20) NOT NULL CHECK (ket_luan IN ('CAN_LAM_RO','DONG_Y','KHONG_DONG_Y')),
  nguoi_xac_nhan varchar(20) NOT NULL REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  thoi_diem timestamptz NOT NULL DEFAULT now(),
  id_lan_truoc varchar(24) REFERENCES mua_hang.dat_ngoai_xac_nhan_kt(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS ix_dat_ngoai_xac_nhan_kt_dong
  ON mua_hang.dat_ngoai_xac_nhan_kt(id_dat_ngoai_dong,thoi_diem DESC);

CREATE TABLE IF NOT EXISTS mua_hang.dat_ngoai_dot_giao (
  id varchar(24) PRIMARY KEY,
  id_dat_ngoai_dong varchar(24) NOT NULL REFERENCES mua_hang.dat_ngoai_dong(id) ON DELETE RESTRICT,
  dot_so smallint NOT NULL CHECK (dot_so>0),
  so_luong numeric(14,4) NOT NULL CHECK (so_luong>0),
  ngay_du_kien date NOT NULL,
  ngay_thuc_te date,
  ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1,
  UNIQUE(id_dat_ngoai_dong,dot_so)
);

CREATE TABLE IF NOT EXISTS mua_hang.dat_ngoai_lich_su_ky_han (
  id bigserial PRIMARY KEY,
  id_dat_ngoai_dong varchar(24) NOT NULL REFERENCES mua_hang.dat_ngoai_dong(id) ON DELETE RESTRICT,
  ngay_cu date, ngay_moi date NOT NULL, ly_do text NOT NULL,
  nguoi_sua varchar(20) NOT NULL, thoi_diem timestamptz NOT NULL DEFAULT now()
);

INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES ('050','Chi tiet ky thuat, chat luong, su co va dot giao dat ngoai')
ON CONFLICT(version) DO NOTHING;

COMMIT;
