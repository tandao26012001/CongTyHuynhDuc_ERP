CREATE OR REPLACE FUNCTION mua_hang.kiem_tra_stg_bo_phan()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, mua_hang, public AS $$
DECLARE v_ma text;
BEGIN
  SELECT upper(trim(d.name)) INTO v_ma FROM public.department d WHERE d.id = NEW.id_cu;
  IF v_ma ~ '^[A-Z0-9]{1,10}$' THEN
    NEW.ma_de_xuat := v_ma; NEW.trang_thai := 'SAN_SANG'; NEW.ly_do := NULL;
  ELSE
    NEW.ma_de_xuat := NULL; NEW.trang_thai := 'CAN_RA_SOAT';
    NEW.ly_do := 'Mã bộ phận nguồn không đạt định dạng A-Z, 0-9, tối đa 10 ký tự';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_kiem_tra_stg_bo_phan
BEFORE INSERT OR UPDATE ON mua_hang.stg_bo_phan
FOR EACH ROW EXECUTE FUNCTION mua_hang.kiem_tra_stg_bo_phan();

CREATE OR REPLACE FUNCTION mua_hang.kiem_tra_stg_nhan_vien()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, mua_hang, public AS $$
DECLARE v_ma_bo_phan varchar(10);
BEGIN
  SELECT sb.ma_de_xuat INTO v_ma_bo_phan
  FROM public."user" u
  JOIN public.department d ON upper(trim(d.name)) = upper(trim(u.department))
  JOIN mua_hang.stg_bo_phan sb ON sb.id_cu = d.id AND sb.trang_thai = 'SAN_SANG'
  WHERE u.id = NEW.id_cu;
  NEW.ma_bo_phan_de_xuat := v_ma_bo_phan;
  IF NEW.ma_nhan_vien_de_xuat IS NOT NULL AND length(NEW.ma_nhan_vien_de_xuat) > 20 THEN
    NEW.trang_thai := 'CAN_RA_SOAT'; NEW.ly_do := 'Mã nhân viên nguồn dài quá 20 ký tự';
  ELSIF NEW.ma_nhan_vien_de_xuat IS NULL THEN
    NEW.trang_thai := 'LOI'; NEW.ly_do := 'Thiếu mã nhân viên';
  ELSIF v_ma_bo_phan IS NULL THEN
    NEW.trang_thai := 'CAN_RA_SOAT'; NEW.ly_do := 'Bộ phận chưa được ánh xạ';
  ELSE
    NEW.trang_thai := 'SAN_SANG'; NEW.ly_do := NULL;
  END IF;
  RETURN NEW;
END;
$$;

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('008', 'Nhan dien department.name la MA_BO_PHAN va doi chieu nhan vien theo ma');
