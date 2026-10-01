BEGIN;

-- Ghi chu cu khong phai la mot lan xac nhan ky thuat da hoan tat.
ALTER TABLE mua_hang.dat_ngoai_xac_nhan_kt
  ADD COLUMN IF NOT EXISTS la_xac_nhan boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS ix_dat_ngoai_xac_nhan_kt_da_xac_nhan
  ON mua_hang.dat_ngoai_xac_nhan_kt(id_dat_ngoai_dong, thoi_diem DESC)
  WHERE la_xac_nhan;

INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES ('061','Phan biet lich su xac nhan ky thuat ma hang voi ghi chu cu')
ON CONFLICT (version) DO NOTHING;

COMMIT;
