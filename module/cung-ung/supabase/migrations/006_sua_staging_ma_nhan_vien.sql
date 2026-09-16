ALTER TABLE mua_hang.stg_nhan_vien
  ALTER COLUMN ma_nhan_vien_de_xuat TYPE varchar(60);

CREATE OR REPLACE FUNCTION mua_hang.kiem_tra_stg_nhan_vien()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, mua_hang AS $$
BEGIN
  IF NEW.ma_nhan_vien_de_xuat IS NOT NULL AND length(NEW.ma_nhan_vien_de_xuat) > 20 THEN
    NEW.trang_thai := 'CAN_RA_SOAT';
    NEW.ly_do := 'Mã nhân viên nguồn dài quá 20 ký tự';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_kiem_tra_stg_nhan_vien
BEFORE INSERT OR UPDATE ON mua_hang.stg_nhan_vien
FOR EACH ROW EXECUTE FUNCTION mua_hang.kiem_tra_stg_nhan_vien();

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('006', 'Giu ma nhan vien nguon qua 20 ky tu de ra soat, khong cat ngam');
