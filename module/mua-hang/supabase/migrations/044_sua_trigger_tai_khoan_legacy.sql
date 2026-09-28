-- Bao dam cot legacy_ngay_sua NOT NULL van duoc dong bo khi ngay_sua chuan NULL.
BEGIN;

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

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('044', 'Sua dong bo legacy_ngay_sua cho tai_khoan')
ON CONFLICT (version) DO NOTHING;

COMMIT;
