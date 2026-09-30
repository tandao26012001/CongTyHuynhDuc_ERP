BEGIN;

-- Remove the unused coded conclusion; confirmation content remains the source of truth.
ALTER TABLE mua_hang.dat_ngoai_xac_nhan_kt
  DROP COLUMN IF EXISTS ket_luan;

INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES ('057','Bo cot ma ket luan khoi xac nhan ky thuat dat ngoai')
ON CONFLICT (version) DO NOTHING;

COMMIT;
