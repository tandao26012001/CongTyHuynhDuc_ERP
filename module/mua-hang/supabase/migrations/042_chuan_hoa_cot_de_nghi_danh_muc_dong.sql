-- Chuan hoa ten cot cua de_nghi va danh_muc_dong ve snake_case chu thuong.
-- Neu ton tai ca cot HOA va cot thuong, dung de tranh doi nham khoa/du lieu.
BEGIN;

DO $$
DECLARE
  bang record;
  cot record;
  ten_moi text;
BEGIN
  FOR bang IN
    SELECT * FROM (VALUES
      ('mua_hang'::text, 'de_nghi'::text),
      ('mua_hang'::text, 'danh_muc_dong'::text)
    ) AS t(schema_name, table_name)
  LOOP
    IF to_regclass(format('%I.%I', bang.schema_name, bang.table_name)) IS NULL THEN
      RAISE EXCEPTION 'Khong tim thay bang %.%', bang.schema_name, bang.table_name;
    END IF;

    FOR cot IN
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = bang.schema_name
        AND table_name = bang.table_name
        AND column_name <> lower(column_name)
      ORDER BY ordinal_position
    LOOP
      ten_moi := lower(cot.column_name);
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = bang.schema_name
          AND table_name = bang.table_name
          AND column_name = ten_moi
      ) THEN
        RAISE EXCEPTION
          'Bang %.% co ca cot % va %. Can doi soat cot trung truoc khi chay migration.',
          bang.schema_name, bang.table_name, quote_ident(cot.column_name), quote_ident(ten_moi);
      END IF;

      EXECUTE format('ALTER TABLE %I.%I RENAME COLUMN %I TO %I',
                     bang.schema_name, bang.table_name, cot.column_name, ten_moi);
    END LOOP;
  END LOOP;
END $$;

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('042', 'Chuan hoa cot de_nghi va danh_muc_dong ve snake_case chu thuong')
ON CONFLICT (version) DO NOTHING;

COMMIT;
