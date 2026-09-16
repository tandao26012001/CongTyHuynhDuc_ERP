CREATE OR REPLACE FUNCTION mua_hang.cap_nhat_da_chuyen_doi_soat()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, mua_hang AS $$
BEGIN
  SELECT count(*) INTO NEW.da_chuyen
  FROM mua_hang.anh_xa_du_lieu_cu a
  WHERE a.loai = NEW.loai AND a.trang_thai = 'DA_CHUYEN';
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_cap_nhat_da_chuyen_doi_soat
BEFORE INSERT ON mua_hang.doi_soat_migration
FOR EACH ROW EXECUTE FUNCTION mua_hang.cap_nhat_da_chuyen_doi_soat();

UPDATE mua_hang.doi_soat_migration d
SET da_chuyen = x.so_luong
FROM (
  SELECT loai, count(*)::integer AS so_luong
  FROM mua_hang.anh_xa_du_lieu_cu
  WHERE trang_thai = 'DA_CHUYEN'
  GROUP BY loai
) x
WHERE x.loai = d.loai;

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('010', 'Bao cao doi soat tu dong lay so dong da chuyen tu bang mapping');
