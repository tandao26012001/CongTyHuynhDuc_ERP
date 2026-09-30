BEGIN;

-- Keep historical conclusions, but allow new technical notes without a coded conclusion.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='mua_hang'
      AND table_name='dat_ngoai_xac_nhan_kt'
      AND column_name='ket_luan'
  ) THEN
    ALTER TABLE mua_hang.dat_ngoai_xac_nhan_kt
      ALTER COLUMN ket_luan DROP NOT NULL;
  END IF;
END $$;

INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES ('056','Cho phep xac nhan ky thuat khong can ma ket luan')
ON CONFLICT (version) DO NOTHING;

COMMIT;
