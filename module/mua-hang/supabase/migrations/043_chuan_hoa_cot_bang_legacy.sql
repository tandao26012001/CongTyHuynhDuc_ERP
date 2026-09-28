-- Chuan hoa cot HOA con lai; tai_khoan da co cot chuan tu migration 038.
-- Cac cot cu trung ten duoc giu voi tien to legacy_ de bao toan PK/FK.
BEGIN;

DO $$
DECLARE
  bang record;
  cot record;
  ten_moi text;
  ten_dich text;
BEGIN
  FOR bang IN
    SELECT * FROM (VALUES
      ('mua_hang'::text, 'danh_muc_loai'::text),
      ('mua_hang'::text, 'de_nghi_dong'::text),
      ('mua_hang'::text, 'nhat_ky'::text),
      ('mua_hang'::text, 'phien'::text),
      ('mua_hang'::text, 'tai_khoan'::text)
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
      ten_dich := ten_moi;

      -- ID legacy trong tai_khoan la ma nhan vien; cac cot legacy trung ten
      -- can duoc bao ton vi co the dang giu khoa/chot rang buoc cu.
      IF bang.table_name = 'tai_khoan' AND cot.column_name = 'ID' THEN
        ten_dich := 'legacy_id';
      ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = bang.schema_name
          AND table_name = bang.table_name
          AND column_name = ten_moi
      ) THEN
        ten_dich := 'legacy_' || ten_moi;
      END IF;

      IF ten_dich <> ten_moi AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = bang.schema_name
          AND table_name = bang.table_name
          AND column_name = ten_dich
      ) THEN
        RAISE EXCEPTION 'Cot dich %.%.% da ton tai; dung migration de doi soat.',
          bang.schema_name, bang.table_name, ten_dich;
      END IF;

      IF ten_dich = ten_moi AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = bang.schema_name
          AND table_name = bang.table_name
          AND column_name = ten_moi
      ) THEN
        RAISE EXCEPTION 'Bang %.% co ca cot % va %. Can doi soat truoc.',
          bang.schema_name, bang.table_name, quote_ident(cot.column_name), quote_ident(ten_moi);
      END IF;

      EXECUTE format('ALTER TABLE %I.%I RENAME COLUMN %I TO %I',
                     bang.schema_name, bang.table_name, cot.column_name, ten_dich);
    END LOOP;
  END LOOP;
END $$;

-- Tai khoan sau migration 038 van co cac cot cu NOT NULL/PK. Trigger dong bo
-- cac cot do de ung dung chi can ghi cac cot chuan chu thuong.
CREATE OR REPLACE FUNCTION mua_hang.dong_bo_tai_khoan_legacy()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, mua_hang AS $$
DECLARE
  du_lieu jsonb := to_jsonb(NEW);
BEGIN
  IF du_lieu ? 'legacy_id' THEN
    du_lieu := du_lieu || jsonb_build_object('legacy_id', du_lieu->'ma_nhan_vien');
  END IF;
  IF du_lieu ? 'legacy_ma_tai_khoan' THEN
    du_lieu := du_lieu || jsonb_build_object('legacy_ma_tai_khoan', du_lieu->'ma_tai_khoan');
  END IF;
  IF du_lieu ? 'legacy_ho_ten' THEN
    du_lieu := du_lieu || jsonb_build_object('legacy_ho_ten', du_lieu->'ho_va_ten');
  END IF;
  IF du_lieu ? 'legacy_ma_bo_phan' THEN
    du_lieu := du_lieu || jsonb_build_object('legacy_ma_bo_phan', du_lieu->'ma_bo_phan');
  END IF;
  IF du_lieu ? 'legacy_vai_tro' THEN
    du_lieu := du_lieu || jsonb_build_object('legacy_vai_tro', du_lieu->'vai_tro');
  END IF;
  IF du_lieu ? 'legacy_mat_khau_hash' THEN
    du_lieu := du_lieu || jsonb_build_object('legacy_mat_khau_hash', du_lieu->'mat_khau_hash');
  END IF;
  IF du_lieu ? 'legacy_dang_hoat_dong' THEN
    du_lieu := du_lieu || jsonb_build_object(
      'legacy_dang_hoat_dong', to_jsonb(NEW.trang_thai = 'HOAT_DONG')
    );
  END IF;
  IF du_lieu ? 'legacy_ngay_tao' THEN
    du_lieu := du_lieu || jsonb_build_object('legacy_ngay_tao', du_lieu->'ngay_tao');
  END IF;
  IF du_lieu ? 'legacy_ngay_sua' THEN
    du_lieu := du_lieu || jsonb_build_object(
      'legacy_ngay_sua', coalesce(
        nullif(du_lieu->'ngay_sua', 'null'::jsonb),
        nullif(du_lieu->'legacy_ngay_sua', 'null'::jsonb),
        to_jsonb(now())
      )
    );
  END IF;
  NEW := jsonb_populate_record(NEW, du_lieu);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dong_bo_tai_khoan_legacy ON mua_hang.tai_khoan;
CREATE TRIGGER trg_dong_bo_tai_khoan_legacy
  BEFORE INSERT OR UPDATE ON mua_hang.tai_khoan
  FOR EACH ROW EXECUTE FUNCTION mua_hang.dong_bo_tai_khoan_legacy();

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('043', 'Chuan hoa cot cac bang legacy ve chu thuong')
ON CONFLICT (version) DO NOTHING;

COMMIT;
