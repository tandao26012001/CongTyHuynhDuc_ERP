CREATE OR REPLACE FUNCTION mua_hang.kiem_tra_stg_nha_cung_cap()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, mua_hang, public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.supplier s WHERE s.id = NEW.id_cu
             AND nullif(trim(s.code), '') IS NOT NULL AND nullif(trim(s.name), '') IS NOT NULL) THEN
    NEW.trang_thai := 'SAN_SANG'; NEW.ly_do := 'MST nguồn được bỏ qua theo xác nhận; MST mới để NULL';
  ELSE
    NEW.trang_thai := 'LOI'; NEW.ly_do := 'Thiếu mã hoặc tên NCC';
  END IF;
  RETURN NEW;
END;
$$;

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('012', 'Xac nhan khong dung tax_code nguon va de MST NCC moi bang NULL');
