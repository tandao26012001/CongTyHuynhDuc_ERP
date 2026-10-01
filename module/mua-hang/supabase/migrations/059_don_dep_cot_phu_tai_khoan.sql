BEGIN;

DO $$
BEGIN
  IF to_regclass('mua_hang.tai_khoan') IS NULL THEN
    RAISE EXCEPTION 'Khong tim thay mua_hang.tai_khoan';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='mua_hang' AND table_name='tai_khoan'
      AND column_name='ho_ten'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='mua_hang' AND table_name='tai_khoan'
        AND column_name='ho_va_ten'
    ) THEN
      RAISE EXCEPTION 'Khong co cot chuan ho_va_ten de thay the ho_ten';
    END IF;

    IF EXISTS (
      SELECT 1 FROM mua_hang.tai_khoan
      WHERE nullif(btrim(ho_ten), '') IS NOT NULL
        AND lower(btrim(ho_ten)) IS DISTINCT FROM lower(btrim(ho_va_ten))
    ) THEN
      RAISE EXCEPTION 'Du lieu ho_ten khac ho_va_ten; can doi soat truoc khi xoa cot';
    END IF;

    ALTER TABLE mua_hang.tai_khoan DROP COLUMN ho_ten;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='mua_hang' AND table_name='tai_khoan'
      AND column_name='dang_hoat_dong'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='mua_hang' AND table_name='tai_khoan'
        AND column_name='trang_thai'
    ) THEN
      RAISE EXCEPTION 'Khong co cot chuan trang_thai de thay the dang_hoat_dong';
    END IF;

    IF EXISTS (
      SELECT 1 FROM mua_hang.tai_khoan
      WHERE dang_hoat_dong IS DISTINCT FROM (trang_thai='HOAT_DONG')
    ) THEN
      RAISE EXCEPTION 'Du lieu dang_hoat_dong khong khop trang_thai; can doi soat truoc khi xoa cot';
    END IF;

    ALTER TABLE mua_hang.tai_khoan DROP COLUMN dang_hoat_dong;
  END IF;
END $$;

INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES ('059','Don dep cot ho_ten va dang_hoat_dong phu khoi tai_khoan')
ON CONFLICT (version) DO NOTHING;

COMMIT;
