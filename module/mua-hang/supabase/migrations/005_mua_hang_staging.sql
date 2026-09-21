CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION mua_hang.chuan_hoa_ma(p_gia_tri text, p_do_dai integer DEFAULT 40)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = pg_catalog, extensions AS $$
  SELECT left(trim(both '_' FROM regexp_replace(
    upper(extensions.unaccent(coalesce(p_gia_tri, ''))), '[^A-Z0-9]+', '_', 'g'
  )), p_do_dai)
$$;

CREATE OR REPLACE FUNCTION mua_hang.chuan_hoa_tim_kiem(p_gia_tri text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = pg_catalog, extensions AS $$
  SELECT lower(regexp_replace(trim(extensions.unaccent(coalesce(p_gia_tri, ''))), '\s+', ' ', 'g'))
$$;

CREATE TABLE mua_hang.stg_don_vi_tinh (
  id_cu integer PRIMARY KEY, dvt_de_xuat varchar(20),
  trang_thai varchar(20) NOT NULL, ly_do text
);
CREATE TABLE mua_hang.stg_chung_loai (
  id_cu integer PRIMARY KEY, ma_de_xuat varchar(20),
  trang_thai varchar(20) NOT NULL, ly_do text
);
CREATE TABLE mua_hang.stg_bo_phan (
  id_cu integer PRIMARY KEY, ma_de_xuat varchar(10),
  trang_thai varchar(20) NOT NULL, ly_do text
);
CREATE OR REPLACE FUNCTION mua_hang.kiem_tra_stg_bo_phan()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, mua_hang, public AS $$
DECLARE v_ma text;
BEGIN
  SELECT upper(trim(d.name)) INTO v_ma FROM public.department d WHERE d.id = NEW.id_cu;
  IF v_ma = 'TĐ' THEN
    NEW.ma_de_xuat := 'TDH'; NEW.trang_thai := 'SAN_SANG'; NEW.ly_do := NULL;
  ELSIF v_ma ~ '^[A-Z0-9]{1,10}$' THEN
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
CREATE TABLE mua_hang.stg_nhan_vien (
  id_cu integer PRIMARY KEY, ma_nhan_vien_de_xuat varchar(60), ma_bo_phan_de_xuat varchar(10),
  trang_thai varchar(20) NOT NULL, ly_do text
);

CREATE OR REPLACE FUNCTION mua_hang.kiem_tra_stg_nhan_vien()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, mua_hang AS $$
DECLARE v_ma_bo_phan varchar(10);
BEGIN
  SELECT sb.ma_de_xuat INTO v_ma_bo_phan
  FROM public."user" u
  JOIN public.department d ON upper(trim(d.name)) = upper(trim(u.department))
  JOIN mua_hang.stg_bo_phan sb ON sb.id_cu = d.id AND sb.trang_thai = 'SAN_SANG'
  WHERE u.id = NEW.id_cu;
  NEW.ma_bo_phan_de_xuat := v_ma_bo_phan;
  IF NEW.ma_nhan_vien_de_xuat = 'NV000108_DEL_1789359703' THEN
    NEW.ma_nhan_vien_de_xuat := 'NV000108';
  END IF;
  IF NEW.ma_nhan_vien_de_xuat IS NOT NULL AND length(NEW.ma_nhan_vien_de_xuat) > 20 THEN
    NEW.trang_thai := 'CAN_RA_SOAT';
    NEW.ly_do := 'Mã nhân viên nguồn dài quá 20 ký tự';
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
CREATE TRIGGER trg_kiem_tra_stg_nhan_vien
BEFORE INSERT OR UPDATE ON mua_hang.stg_nhan_vien
FOR EACH ROW EXECUTE FUNCTION mua_hang.kiem_tra_stg_nhan_vien();
CREATE TABLE mua_hang.stg_vat_tu (
  id_cu integer PRIMARY KEY, id_moi varchar(20) NOT NULL UNIQUE,
  ma_vat_tu_de_xuat varchar(40), dvt_de_xuat varchar(20),
  trang_thai varchar(20) NOT NULL, ly_do text
);
CREATE TABLE mua_hang.stg_nha_cung_cap (
  id_cu integer PRIMARY KEY, id_moi varchar(20) NOT NULL UNIQUE, ma_ncc_de_xuat varchar(40),
  trang_thai varchar(20) NOT NULL, ly_do text
);
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
CREATE TRIGGER trg_kiem_tra_stg_nha_cung_cap
BEFORE INSERT OR UPDATE ON mua_hang.stg_nha_cung_cap
FOR EACH ROW EXECUTE FUNCTION mua_hang.kiem_tra_stg_nha_cung_cap();
CREATE TABLE mua_hang.stg_khach_hang (
  id_cu integer PRIMARY KEY, id_moi varchar(20) NOT NULL UNIQUE, ma_kh_de_xuat varchar(40),
  trang_thai varchar(20) NOT NULL, ly_do text
);
CREATE TABLE mua_hang.stg_lenh_san_xuat (
  id_cu varchar PRIMARY KEY, lenh_san_xuat_de_xuat varchar(60),
  trang_thai varchar(20) NOT NULL, ly_do text
);

CREATE TABLE mua_hang.doi_soat_migration (
  dot_chay varchar(40) NOT NULL,
  loai varchar(40) NOT NULL,
  tong_nguon integer NOT NULL,
  san_sang integer NOT NULL,
  can_ra_soat integer NOT NULL,
  loi integer NOT NULL,
  da_chuyen integer NOT NULL DEFAULT 0,
  thoi_diem timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dot_chay, loai)
);
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

CREATE OR REPLACE FUNCTION mua_hang.lam_moi_staging(p_dot_chay varchar DEFAULT NULL)
RETURNS varchar LANGUAGE plpgsql
SET search_path = pg_catalog, mua_hang, public, extensions AS $$
DECLARE
  v_dot varchar(40) := coalesce(p_dot_chay, 'STG-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS'));
BEGIN
  TRUNCATE TABLE
    mua_hang.stg_don_vi_tinh, mua_hang.stg_chung_loai, mua_hang.stg_bo_phan,
    mua_hang.stg_nhan_vien, mua_hang.stg_vat_tu, mua_hang.stg_nha_cung_cap,
    mua_hang.stg_khach_hang, mua_hang.stg_lenh_san_xuat;

  INSERT INTO mua_hang.stg_don_vi_tinh(id_cu, dvt_de_xuat, trang_thai, ly_do)
  SELECT u.id, mua_hang.chuan_hoa_ma(u.code, 20),
    CASE WHEN mua_hang.chuan_hoa_ma(u.code, 20) <> '' THEN 'SAN_SANG' ELSE 'LOI' END,
    CASE WHEN mua_hang.chuan_hoa_ma(u.code, 20) = '' THEN 'Mã đơn vị tính rỗng sau chuẩn hoá' END
  FROM public.unit_of_measure u;

  INSERT INTO mua_hang.stg_chung_loai(id_cu, ma_de_xuat, trang_thai, ly_do)
  SELECT c.id, mua_hang.chuan_hoa_ma(c.code, 20),
    CASE WHEN mua_hang.chuan_hoa_ma(c.code, 20) <> '' THEN 'SAN_SANG' ELSE 'LOI' END,
    CASE WHEN mua_hang.chuan_hoa_ma(c.code, 20) = '' THEN 'Mã chủng loại rỗng sau chuẩn hoá' END
  FROM public.item_category c;

  INSERT INTO mua_hang.stg_bo_phan(id_cu, ma_de_xuat, trang_thai, ly_do)
  SELECT d.id,
    CASE mua_hang.chuan_hoa_ma(d.name, 100)
      WHEN 'BAN_QUAN_TRI' THEN 'DH' WHEN 'KINH_DOANH' THEN 'KD'
      WHEN 'KY_THUAT' THEN 'KT' WHEN 'VAN_HANH' THEN 'VH'
      WHEN 'MUA_HANG' THEN 'MH' WHEN 'GIA_CONG_CHINH_XAC' THEN 'CX'
      WHEN 'KIEM_SOAT_CHAT_LUONG' THEN 'QC' WHEN 'TU_DONG_HOA' THEN 'TD'
      WHEN 'GIA_CONG_VAT_TU' THEN 'VT' WHEN 'SON' THEN 'SO'
      WHEN 'KHO_VAN' THEN 'KV' WHEN 'GIA_CONG_KET_CAU_1' THEN 'KC1'
      WHEN 'GIA_CONG_KET_CAU_2' THEN 'KC2' WHEN 'GIA_CONG_KET_CAU_3' THEN 'KC3'
    END,
    CASE WHEN mua_hang.chuan_hoa_ma(d.name, 100) IN (
      'BAN_QUAN_TRI','KINH_DOANH','KY_THUAT','VAN_HANH','MUA_HANG','GIA_CONG_CHINH_XAC',
      'KIEM_SOAT_CHAT_LUONG','TU_DONG_HOA','GIA_CONG_VAT_TU','SON','KHO_VAN',
      'GIA_CONG_KET_CAU_1','GIA_CONG_KET_CAU_2','GIA_CONG_KET_CAU_3'
    ) THEN 'SAN_SANG' ELSE 'CAN_RA_SOAT' END,
    CASE WHEN mua_hang.chuan_hoa_ma(d.name, 100) NOT IN (
      'BAN_QUAN_TRI','KINH_DOANH','KY_THUAT','VAN_HANH','MUA_HANG','GIA_CONG_CHINH_XAC',
      'KIEM_SOAT_CHAT_LUONG','TU_DONG_HOA','GIA_CONG_VAT_TU','SON','KHO_VAN',
      'GIA_CONG_KET_CAU_1','GIA_CONG_KET_CAU_2','GIA_CONG_KET_CAU_3'
    ) THEN 'Chưa có ánh xạ mã bộ phận được phê duyệt' END
  FROM public.department d;

  INSERT INTO mua_hang.stg_nhan_vien(id_cu, ma_nhan_vien_de_xuat, ma_bo_phan_de_xuat, trang_thai, ly_do)
  SELECT u.id, nullif(trim(u.employee_code), ''), sb.ma_de_xuat,
    CASE
      WHEN nullif(trim(u.employee_code), '') IS NULL THEN 'LOI'
      WHEN sb.trang_thai = 'SAN_SANG' THEN 'SAN_SANG'
      ELSE 'CAN_RA_SOAT'
    END,
    CASE
      WHEN nullif(trim(u.employee_code), '') IS NULL THEN 'Thiếu mã nhân viên'
      WHEN sb.trang_thai IS DISTINCT FROM 'SAN_SANG' THEN 'Bộ phận chưa được ánh xạ'
    END
  FROM public."user" u
  LEFT JOIN public.department d ON mua_hang.chuan_hoa_ma(d.name, 100) = mua_hang.chuan_hoa_ma(u.department, 100)
  LEFT JOIN mua_hang.stg_bo_phan sb ON sb.id_cu = d.id;

  INSERT INTO mua_hang.stg_vat_tu(id_cu, id_moi, ma_vat_tu_de_xuat, dvt_de_xuat, trang_thai, ly_do)
  SELECT i.id, 'VT-' || lpad(i.id::text, 6, '0'),
    CASE WHEN upper(trim(i.sku)) ~ '^(TH-(TP|VP|CT|HC|BH|SX|TDH|NK|VI|LD|TA|BL|LGT|LGC|LGA|LGD)-[0-9]{3}|VT-(NC|LC|TN|TL|PT|PL)-[A-Z0-9]{2,10}(-(ON|VU|CU|CV|HO))?-[0-9]{3}|VT-SX-[0-9]{3,}|TL-(MK|MP|MR|DT|MC)-[A-Z0-9]{2,4}-[0-9]{3})$'
      THEN upper(trim(i.sku)) END,
    su.dvt_de_xuat,
    CASE WHEN su.trang_thai = 'SAN_SANG' AND nullif(trim(i.name), '') IS NOT NULL THEN 'SAN_SANG' ELSE 'LOI' END,
    CASE
      WHEN su.trang_thai IS DISTINCT FROM 'SAN_SANG' THEN 'Không ánh xạ được đơn vị tính'
      WHEN nullif(trim(i.name), '') IS NULL THEN 'Thiếu tên hàng'
      WHEN upper(trim(i.sku)) !~ '^(TH-(TP|VP|CT|HC|BH|SX|TDH|NK|VI|LD|TA|BL|LGT|LGC|LGA|LGD)-[0-9]{3}|VT-(NC|LC|TN|TL|PT|PL)-[A-Z0-9]{2,10}(-(ON|VU|CU|CV|HO))?-[0-9]{3}|VT-SX-[0-9]{3,}|TL-(MK|MP|MR|DT|MC)-[A-Z0-9]{2,4}-[0-9]{3})$'
        THEN 'Mã cũ không đúng regex; sẽ để MA_VAT_TU = NULL ở V1'
    END
  FROM public.item i
  LEFT JOIN mua_hang.stg_don_vi_tinh su ON su.id_cu = i.unit_id;

  INSERT INTO mua_hang.stg_nha_cung_cap(id_cu, id_moi, ma_ncc_de_xuat, trang_thai, ly_do)
  SELECT s.id, 'NCC-' || lpad(s.id::text, 5, '0'), upper(trim(s.code)),
    CASE WHEN nullif(trim(s.code), '') IS NOT NULL AND nullif(trim(s.name), '') IS NOT NULL
      THEN 'SAN_SANG' ELSE 'LOI' END,
    CASE WHEN nullif(trim(s.code), '') IS NULL THEN 'Thiếu mã NCC'
         WHEN nullif(trim(s.name), '') IS NULL THEN 'Thiếu tên NCC' END
  FROM public.supplier s;

  INSERT INTO mua_hang.stg_khach_hang(id_cu, id_moi, ma_kh_de_xuat, trang_thai, ly_do)
  SELECT c.id, 'KH-' || lpad(c.id::text, 5, '0'), 'KHCU-' || lpad(c.id::text, 5, '0'),
    'CAN_RA_SOAT', 'Nguồn cũ không có mã khách hàng; mã KHCU chỉ là mã tạm'
  FROM public.customer c;

  INSERT INTO mua_hang.stg_lenh_san_xuat(id_cu, lenh_san_xuat_de_xuat, trang_thai, ly_do)
  SELECT l.id, trim(l.ma_lenh), 'CAN_RA_SOAT',
    'Nguồn cũ gộp MA_HANG trong bảng đầu và chưa có MA_VACH để tạo LSX_DONG'
  FROM public.lenh_san_xuat l;

  INSERT INTO mua_hang.doi_soat_migration(dot_chay, loai, tong_nguon, san_sang, can_ra_soat, loi)
  SELECT v_dot, x.loai, count(*),
    count(*) FILTER (WHERE x.trang_thai = 'SAN_SANG'),
    count(*) FILTER (WHERE x.trang_thai = 'CAN_RA_SOAT'),
    count(*) FILTER (WHERE x.trang_thai = 'LOI')
  FROM (
    SELECT 'DON_VI_TINH' loai, trang_thai FROM mua_hang.stg_don_vi_tinh UNION ALL
    SELECT 'CHUNG_LOAI', trang_thai FROM mua_hang.stg_chung_loai UNION ALL
    SELECT 'BO_PHAN', trang_thai FROM mua_hang.stg_bo_phan UNION ALL
    SELECT 'NHAN_VIEN', trang_thai FROM mua_hang.stg_nhan_vien UNION ALL
    SELECT 'VAT_TU', trang_thai FROM mua_hang.stg_vat_tu UNION ALL
    SELECT 'NHA_CUNG_CAP', trang_thai FROM mua_hang.stg_nha_cung_cap UNION ALL
    SELECT 'KHACH_HANG', trang_thai FROM mua_hang.stg_khach_hang UNION ALL
    SELECT 'LENH_SAN_XUAT', trang_thai FROM mua_hang.stg_lenh_san_xuat
  ) x GROUP BY x.loai;

  RETURN v_dot;
END;
$$;

REVOKE ALL ON mua_hang.stg_don_vi_tinh, mua_hang.stg_chung_loai, mua_hang.stg_bo_phan,
  mua_hang.stg_nhan_vien, mua_hang.stg_vat_tu, mua_hang.stg_nha_cung_cap,
  mua_hang.stg_khach_hang, mua_hang.stg_lenh_san_xuat, mua_hang.doi_soat_migration
  FROM PUBLIC, anon, authenticated;

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('005', 'Staging, chuan hoa ma va bao cao doi soat du lieu cu');
