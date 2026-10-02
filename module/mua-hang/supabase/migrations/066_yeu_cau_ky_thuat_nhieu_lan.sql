BEGIN;

CREATE TABLE IF NOT EXISTS mua_hang.dat_ngoai_yeu_cau_kt (
  id varchar(24) PRIMARY KEY,
  id_dat_ngoai_dong varchar(24) NOT NULL REFERENCES mua_hang.dat_ngoai_dong(id) ON DELETE RESTRICT,
  noi_dung text NOT NULL CHECK (length(trim(noi_dung)) > 0),
  nguoi_yeu_cau varchar(20) NOT NULL REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  thoi_diem timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_dat_ngoai_yeu_cau_kt_dong
  ON mua_hang.dat_ngoai_yeu_cau_kt(id_dat_ngoai_dong, thoi_diem DESC);

ALTER TABLE mua_hang.dat_ngoai_xac_nhan_kt
  ADD COLUMN IF NOT EXISTS id_yeu_cau varchar(24)
  REFERENCES mua_hang.dat_ngoai_yeu_cau_kt(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS ux_dat_ngoai_xac_nhan_kt_yeu_cau
  ON mua_hang.dat_ngoai_xac_nhan_kt(id_yeu_cau)
  WHERE id_yeu_cau IS NOT NULL;

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('066', 'Cho phep yeu cau xac nhan ky thuat nhieu lan theo ma dat ngoai')
ON CONFLICT (version) DO NOTHING;

COMMIT;
