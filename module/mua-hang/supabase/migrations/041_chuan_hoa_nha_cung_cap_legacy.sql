-- Chuan hoa bang NCC legacy: doi ten cot viet HOA sang snake_case ngay tai cho.
-- Neu ca hai dang ten cung ton tai, gop du lieu va doi cot cu thanh legacy_*.
BEGIN;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

DO $$
DECLARE
  cot_cu text;
  cot_moi text;
  cap_cot text[];
  danh_sach_cot text[][] := ARRAY[
    ['ID','id'], ['MA_NCC','ma_ncc'], ['TEN','ten'], ['TEN_KHONG_DAU','ten_khong_dau'],
    ['MST','mst'], ['DIA_CHI','dia_chi'], ['NGUOI_LIEN_HE','nguoi_lien_he'],
    ['SDT','sdt'], ['SDT_2','sdt_2'], ['FAX','fax'], ['EMAIL','email'],
    ['MAT_HANG','mat_hang'], ['LA_NCC_MUA_HANG','la_ncc_mua_hang'],
    ['LA_NCC_GIA_CONG','la_ncc_gia_cong'], ['CO_HOA_DON','co_hoa_don'],
    ['CONG_NO','cong_no'], ['TIEN_MAT','tien_mat'], ['NGANH_NGHE','nganh_nghe'],
    ['MA_LOAI_GIA_CONG','ma_loai_gia_cong'], ['VUNG','vung'], ['SO_KM','so_km'],
    ['KY_HAN_QUY_DINH','ky_han_quy_dinh'], ['DA_PHE_DUYET','da_phe_duyet'],
    ['NGAY_PHE_DUYET','ngay_phe_duyet'], ['PHAN_LOAI_NCC','phan_loai_ncc'],
    ['TRANG_THAI','trang_thai'], ['GHI_CHU','ghi_chu'], ['NGAY_TAO','ngay_tao'],
    ['NGUOI_TAO','nguoi_tao'], ['NGAY_SUA','ngay_sua'], ['NGUOI_SUA','nguoi_sua'],
    ['PHIEN_BAN','phien_ban']
  ];
BEGIN
  IF to_regclass('mua_hang.nha_cung_cap') IS NULL THEN
    RAISE EXCEPTION 'Khong tim thay mua_hang.nha_cung_cap';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='mua_hang' AND table_name='nha_cung_cap' AND column_name='id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='mua_hang' AND table_name='nha_cung_cap' AND column_name='ID'
    ) OR NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='mua_hang' AND table_name='nha_cung_cap' AND column_name='MA_NCC'
    ) OR NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='mua_hang' AND table_name='nha_cung_cap' AND column_name='TEN'
    ) THEN
      RAISE EXCEPTION 'Bang NCC khong co schema chuan va cung khong khop schema legacy duoc ho tro';
    END IF;
  END IF;

  DROP TRIGGER IF EXISTS trg_dong_bo_ncc_legacy ON mua_hang.nha_cung_cap;

  -- Doi ten cot in hoa ngay tai cho; neu da ton tai ban snake_case thi hop nhat
  -- gia tri va luu cot cu voi tien to legacy_ de tranh cap doi ID/id.
  FOREACH cap_cot SLICE 1 IN ARRAY danh_sach_cot LOOP
    cot_cu := cap_cot[1];
    cot_moi := cap_cot[2];
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='mua_hang' AND table_name='nha_cung_cap' AND column_name=cot_cu
    ) THEN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='mua_hang' AND table_name='nha_cung_cap' AND column_name=cot_moi
      ) THEN
        EXECUTE format('UPDATE mua_hang.nha_cung_cap SET %I=coalesce(%I,%I) WHERE %I IS NOT NULL',
                       cot_moi,cot_moi,cot_cu,cot_cu);
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema='mua_hang' AND table_name='nha_cung_cap'
            AND column_name='legacy_' || cot_moi
        ) THEN
          RAISE EXCEPTION 'Cot legacy_% da ton tai, khong the doi ten an toan', cot_moi;
        END IF;
        EXECUTE format('ALTER TABLE mua_hang.nha_cung_cap RENAME COLUMN %I TO %I',
                       cot_cu,'legacy_' || cot_moi);
      ELSE
        EXECUTE format('ALTER TABLE mua_hang.nha_cung_cap RENAME COLUMN %I TO %I',cot_cu,cot_moi);
      END IF;
    END IF;
  END LOOP;
END $$;

ALTER TABLE mua_hang.nha_cung_cap
  ADD COLUMN IF NOT EXISTS id varchar(20),
  ADD COLUMN IF NOT EXISTS ma_ncc varchar(40),
  ADD COLUMN IF NOT EXISTS ten varchar(300),
  ADD COLUMN IF NOT EXISTS ten_khong_dau varchar(300),
  ADD COLUMN IF NOT EXISTS mst varchar(20),
  ADD COLUMN IF NOT EXISTS dia_chi text,
  ADD COLUMN IF NOT EXISTS nguoi_lien_he varchar(120),
  ADD COLUMN IF NOT EXISTS sdt varchar(40),
  ADD COLUMN IF NOT EXISTS sdt_2 varchar(40),
  ADD COLUMN IF NOT EXISTS fax varchar(40),
  ADD COLUMN IF NOT EXISTS email varchar(120),
  ADD COLUMN IF NOT EXISTS mat_hang text,
  ADD COLUMN IF NOT EXISTS la_ncc_mua_hang boolean,
  ADD COLUMN IF NOT EXISTS la_ncc_gia_cong boolean,
  ADD COLUMN IF NOT EXISTS co_hoa_don boolean,
  ADD COLUMN IF NOT EXISTS cong_no text,
  ADD COLUMN IF NOT EXISTS tien_mat text,
  ADD COLUMN IF NOT EXISTS nganh_nghe varchar(60),
  ADD COLUMN IF NOT EXISTS ma_loai_gia_cong varchar(20),
  ADD COLUMN IF NOT EXISTS vung varchar(60),
  ADD COLUMN IF NOT EXISTS so_km numeric(8,1),
  ADD COLUMN IF NOT EXISTS ky_han_quy_dinh integer,
  ADD COLUMN IF NOT EXISTS da_phe_duyet boolean,
  ADD COLUMN IF NOT EXISTS ngay_phe_duyet date,
  ADD COLUMN IF NOT EXISTS phan_loai_ncc varchar(20),
  ADD COLUMN IF NOT EXISTS trang_thai varchar(20),
  ADD COLUMN IF NOT EXISTS ghi_chu text,
  ADD COLUMN IF NOT EXISTS ngay_tao timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS nguoi_tao varchar(20) DEFAULT 'MIGRATION',
  ADD COLUMN IF NOT EXISTS ngay_sua timestamptz,
  ADD COLUMN IF NOT EXISTS nguoi_sua varchar(20),
  ADD COLUMN IF NOT EXISTS phien_ban integer DEFAULT 1;

DO $$
DECLARE
  cot text;
  cot_cu text;
  cap_cot text[];
  anh_xa text[][] := ARRAY[
    ['mst','MST'], ['dia_chi','DIA_CHI'], ['nguoi_lien_he','NGUOI_LIEN_HE'],
    ['sdt','SDT'], ['sdt_2','SDT_2'], ['fax','FAX'], ['email','EMAIL'],
    ['mat_hang','MAT_HANG'], ['la_ncc_mua_hang','LA_NCC_MUA_HANG'],
    ['la_ncc_gia_cong','LA_NCC_GIA_CONG'], ['co_hoa_don','CO_HOA_DON'],
    ['cong_no','CONG_NO'], ['tien_mat','TIEN_MAT'], ['nganh_nghe','NGANH_NGHE'],
    ['ma_loai_gia_cong','MA_LOAI_GIA_CONG'], ['vung','VUNG'], ['so_km','SO_KM'],
    ['ky_han_quy_dinh','KY_HAN_QUY_DINH'], ['da_phe_duyet','DA_PHE_DUYET'],
    ['ngay_phe_duyet','NGAY_PHE_DUYET'], ['phan_loai_ncc','PHAN_LOAI_NCC'],
    ['ghi_chu','GHI_CHU'], ['ngay_tao','NGAY_TAO'], ['nguoi_tao','NGUOI_TAO'],
    ['ngay_sua','NGAY_SUA'], ['nguoi_sua','NGUOI_SUA'], ['phien_ban','PHIEN_BAN']
  ];
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='mua_hang' AND table_name='nha_cung_cap' AND column_name='ID'
  ) THEN
    UPDATE mua_hang.nha_cung_cap SET
      id = "ID"::text,
      ma_ncc = coalesce(nullif(trim("MA_NCC"::text),''),"ID"::text),
      ten = "TEN"::text;

    UPDATE mua_hang.nha_cung_cap
    SET ten_khong_dau = lower(regexp_replace(
          trim(extensions.unaccent(coalesce(ten::text,''))), '\s+', ' ', 'g'
        )),
        la_ncc_mua_hang = true,
        la_ncc_gia_cong = false,
        da_phe_duyet = false,
        trang_thai = 'HOAT_DONG',
        phien_ban = 1;

    FOREACH cap_cot SLICE 1 IN ARRAY anh_xa LOOP
      cot := cap_cot[1];
      cot_cu := cap_cot[2];
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='mua_hang' AND table_name='nha_cung_cap' AND column_name=cot_cu
      ) THEN
        EXECUTE format('UPDATE mua_hang.nha_cung_cap SET %I = %I WHERE %I IS NULL', cot, cot_cu, cot);
      END IF;
    END LOOP;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='mua_hang' AND table_name='nha_cung_cap' AND column_name='TRANG_THAI'
    ) THEN
      UPDATE mua_hang.nha_cung_cap SET trang_thai = CASE upper(coalesce("TRANG_THAI"::text,''))
        WHEN 'CANH_BAO' THEN 'CANH_BAO'
        WHEN 'TAM_NGUNG' THEN 'TAM_NGUNG'
        WHEN 'LOAI_BO' THEN 'LOAI_BO'
        WHEN 'NGUNG' THEN 'TAM_NGUNG'
        ELSE 'HOAT_DONG' END;
    END IF;

    UPDATE mua_hang.nha_cung_cap SET
      la_ncc_mua_hang = coalesce(la_ncc_mua_hang, true),
      la_ncc_gia_cong = coalesce(la_ncc_gia_cong, false),
      da_phe_duyet = coalesce(da_phe_duyet, false) AND ngay_phe_duyet IS NOT NULL,
      ngay_tao = coalesce(ngay_tao, now()),
      nguoi_tao = coalesce(nullif(nguoi_tao,''), 'MIGRATION'),
      phien_ban = coalesce(phien_ban, 1);
    UPDATE mua_hang.nha_cung_cap
    SET la_ncc_mua_hang=true
    WHERE NOT la_ncc_mua_hang AND NOT la_ncc_gia_cong;
  END IF;
END $$;

UPDATE mua_hang.nha_cung_cap SET
  ten_khong_dau = coalesce(ten_khong_dau, lower(regexp_replace(
    trim(extensions.unaccent(coalesce(ten::text,''))), '\s+', ' ', 'g'
  ))),
  la_ncc_mua_hang = coalesce(la_ncc_mua_hang, true),
  la_ncc_gia_cong = coalesce(la_ncc_gia_cong, false),
  da_phe_duyet = coalesce(da_phe_duyet, false) AND ngay_phe_duyet IS NOT NULL,
  trang_thai = CASE upper(coalesce(trang_thai,''))
    WHEN 'CANH_BAO' THEN 'CANH_BAO'
    WHEN 'TAM_NGUNG' THEN 'TAM_NGUNG'
    WHEN 'LOAI_BO' THEN 'LOAI_BO'
    WHEN 'NGUNG' THEN 'TAM_NGUNG'
    ELSE 'HOAT_DONG' END,
  ngay_tao = coalesce(ngay_tao, now()),
  nguoi_tao = coalesce(nullif(nguoi_tao,''), 'MIGRATION'),
  phien_ban = coalesce(phien_ban, 1);
UPDATE mua_hang.nha_cung_cap SET la_ncc_mua_hang=true
WHERE NOT la_ncc_mua_hang AND NOT la_ncc_gia_cong;

DO $$
BEGIN
  IF EXISTS (
    SELECT ma_ncc FROM mua_hang.nha_cung_cap GROUP BY ma_ncc HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Trung MA_NCC trong du lieu legacy; can xu ly ma trung truoc khi chuan hoa';
  END IF;
END $$;

ALTER TABLE mua_hang.nha_cung_cap
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN ma_ncc SET NOT NULL,
  ALTER COLUMN ten SET NOT NULL,
  ALTER COLUMN ten_khong_dau SET NOT NULL,
  ALTER COLUMN la_ncc_mua_hang SET DEFAULT true,
  ALTER COLUMN la_ncc_mua_hang SET NOT NULL,
  ALTER COLUMN la_ncc_gia_cong SET DEFAULT false,
  ALTER COLUMN la_ncc_gia_cong SET NOT NULL,
  ALTER COLUMN da_phe_duyet SET DEFAULT false,
  ALTER COLUMN da_phe_duyet SET NOT NULL,
  ALTER COLUMN trang_thai SET DEFAULT 'HOAT_DONG',
  ALTER COLUMN trang_thai SET NOT NULL,
  ALTER COLUMN ngay_tao SET DEFAULT now(),
  ALTER COLUMN ngay_tao SET NOT NULL,
  ALTER COLUMN nguoi_tao SET DEFAULT 'MIGRATION',
  ALTER COLUMN nguoi_tao SET NOT NULL,
  ALTER COLUMN phien_ban SET DEFAULT 1,
  ALTER COLUMN phien_ban SET NOT NULL;

ALTER TABLE mua_hang.nha_cung_cap
  ALTER COLUMN mst DROP NOT NULL,
  ALTER COLUMN dia_chi DROP NOT NULL,
  ALTER COLUMN nguoi_lien_he DROP NOT NULL,
  ALTER COLUMN sdt DROP NOT NULL,
  ALTER COLUMN email DROP NOT NULL,
  ALTER COLUMN ghi_chu DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_nha_cung_cap_id_chuan
  ON mua_hang.nha_cung_cap(id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_nha_cung_cap_ma_ncc_chuan
  ON mua_hang.nha_cung_cap(ma_ncc);
CREATE INDEX IF NOT EXISTS ix_nha_cung_cap_ten_khong_dau_chuan
  ON mua_hang.nha_cung_cap USING gin (ten_khong_dau extensions.gin_trgm_ops);

-- Dong bo cac cot uppercase cu de giu khoa chinh/rang buoc NOT NULL legacy
-- trong khi API chuyen sang ghi bo cot snake_case chuan.
CREATE OR REPLACE FUNCTION mua_hang.dong_bo_ncc_legacy()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, mua_hang AS $$
BEGIN
  NEW := jsonb_populate_record(NEW, jsonb_build_object(
    'legacy_id', to_jsonb(NEW.id),
    'legacy_ma_ncc', to_jsonb(NEW.ma_ncc),
    'legacy_ten', to_jsonb(NEW.ten),
    'legacy_dia_chi', to_jsonb(coalesce(NEW.dia_chi,'')),
    'legacy_trang_thai', to_jsonb(NEW.trang_thai),
    'legacy_ngay_tao', to_jsonb(NEW.ngay_tao),
    'legacy_nguoi_tao', to_jsonb(NEW.nguoi_tao),
    'legacy_ngay_sua', to_jsonb(NEW.ngay_sua),
    'legacy_nguoi_sua', to_jsonb(NEW.nguoi_sua),
    'legacy_phien_ban', to_jsonb(NEW.phien_ban)
  ));
  RETURN NEW;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='mua_hang' AND table_name='nha_cung_cap' AND column_name='legacy_id'
  ) THEN
    DROP TRIGGER IF EXISTS trg_dong_bo_ncc_legacy ON mua_hang.nha_cung_cap;
    CREATE TRIGGER trg_dong_bo_ncc_legacy
      BEFORE INSERT OR UPDATE ON mua_hang.nha_cung_cap
      FOR EACH ROW EXECUTE FUNCTION mua_hang.dong_bo_ncc_legacy();
  END IF;
END $$;

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('041', 'Chuan hoa schema NCC legacy, giu lai cac cot cu')
ON CONFLICT (version) DO NOTHING;

COMMIT;
