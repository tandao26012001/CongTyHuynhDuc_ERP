CREATE OR REPLACE FUNCTION mua_hang.kiem_tra_stg_nha_cung_cap()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, mua_hang, public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.supplier s WHERE s.id = NEW.id_cu AND length(s.tax_code) > 20) THEN
    NEW.trang_thai := 'CAN_RA_SOAT';
    NEW.ly_do := 'Cột mã số thuế nguồn dài quá 20 ký tự; không tự cắt hoặc chuyển sai trường';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_kiem_tra_stg_nha_cung_cap
BEFORE INSERT OR UPDATE ON mua_hang.stg_nha_cung_cap
FOR EACH ROW EXECUTE FUNCTION mua_hang.kiem_tra_stg_nha_cung_cap();

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('006B', 'Tach NCC co cot MST nguon vuot 20 ky tu sang dien ra soat');
