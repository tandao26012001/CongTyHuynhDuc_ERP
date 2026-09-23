BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS mua_hang.vat_tu (
  id varchar(50) PRIMARY KEY,
  ma_vat_tu varchar(100) NOT NULL UNIQUE,
  ten_hang varchar(300) NOT NULL,
  ten_khong_dau varchar(300) NOT NULL,
  dvt varchar(20) NOT NULL
    REFERENCES mua_hang.don_vi_tinh(dvt) ON DELETE RESTRICT,
  ma_chung_loai varchar(20)
    REFERENCES mua_hang.chung_loai(ma_chung_loai) ON DELETE RESTRICT,
  phan_loai varchar(20) NOT NULL DEFAULT 'THONG_DUNG_SX'
    CHECK (phan_loai IN ('THONG_DUNG_SX','THONG_DUNG_BTBD','CHUYEN_DUNG')),
  kho varchar(10),
  loai_phoi varchar(4)
    CHECK (loai_phoi IS NULL OR loai_phoi IN ('NC','LC','TN','TL','PT','PL')),
  id_vt_goc varchar(50) REFERENCES mua_hang.vat_tu(id) ON DELETE RESTRICT,
  quy_cach text,
  khoi_luong_rieng numeric(12,3)
    CHECK (khoi_luong_rieng IS NULL OR khoi_luong_rieng > 0),
  nguon_so_huu varchar(20) NOT NULL DEFAULT 'KHO_VAN',
  trang_thai varchar(20) NOT NULL DEFAULT 'HOAT_DONG'
    CHECK (trang_thai IN ('HOAT_DONG','NGUNG','DA_GOP')),
  id_gop_ve varchar(50) REFERENCES mua_hang.vat_tu(id) ON DELETE RESTRICT,
  ten_hang_cu text,
  ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(),
  nguoi_tao varchar(50) NOT NULL DEFAULT 'SYSTEM',
  ngay_sua timestamptz,
  nguoi_sua varchar(50),
  phien_ban integer NOT NULL DEFAULT 1 CHECK (phien_ban > 0),
  CHECK (id_vt_goc IS NULL OR id_vt_goc <> id),
  CHECK (id_gop_ve IS NULL OR id_gop_ve <> id),
  CHECK ((trang_thai = 'DA_GOP' AND id_gop_ve IS NOT NULL) OR trang_thai <> 'DA_GOP')
);

CREATE INDEX IF NOT EXISTS ix_vat_tu_ten_trgm
  ON mua_hang.vat_tu USING gin (ten_khong_dau extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS ix_vat_tu_chung_loai
  ON mua_hang.vat_tu(ma_chung_loai);
CREATE INDEX IF NOT EXISTS ix_vat_tu_dvt
  ON mua_hang.vat_tu(dvt);
CREATE INDEX IF NOT EXISTS ix_vat_tu_trang_thai
  ON mua_hang.vat_tu(trang_thai);

CREATE OR REPLACE FUNCTION mua_hang.cap_nhat_vat_tu_truoc_khi_sua()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, mua_hang
AS $$
BEGIN
  NEW.ngay_sua := now();
  NEW.phien_ban := OLD.phien_ban + 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vat_tu_phien_ban ON mua_hang.vat_tu;
CREATE TRIGGER trg_vat_tu_phien_ban
BEFORE UPDATE ON mua_hang.vat_tu
FOR EACH ROW EXECUTE FUNCTION mua_hang.cap_nhat_vat_tu_truoc_khi_sua();

INSERT INTO mua_hang.vat_tu (
  id,ma_vat_tu,ten_hang,ten_khong_dau,dvt,phan_loai,
  quy_cach,trang_thai,ghi_chu,ngay_tao,nguoi_tao,ngay_sua
)
SELECT
  d."ID",
  upper(trim(d."MA")),
  trim(d."TEN"),
  extensions.unaccent(lower(trim(d."TEN"))),
  upper(trim(d."DU_LIEU"->>'don_vi')),
  CASE
    WHEN d."DU_LIEU"->>'phan_loai' IN ('THONG_DUNG_SX','THONG_DUNG_BTBD','CHUYEN_DUNG')
      THEN d."DU_LIEU"->>'phan_loai'
    ELSE 'THONG_DUNG_SX'
  END,
  nullif(trim(d."DU_LIEU"->>'quy_cach'), ''),
  CASE WHEN d."TRANG_THAI"='DANG_SU_DUNG' THEN 'HOAT_DONG' ELSE 'NGUNG' END,
  nullif(trim(d."DU_LIEU"->>'ghi_chu'), ''),
  d."NGAY_TAO",
  coalesce(nullif(trim(d."DU_LIEU"->>'nguoi_tao'), ''), 'MIGRATION'),
  d."NGAY_SUA"
FROM mua_hang.danh_muc_dong d
WHERE d."MA_LOAI"='VT'
ON CONFLICT (ma_vat_tu) DO NOTHING;

DO $$
DECLARE
  so_dong_cu bigint;
  so_dong_moi bigint;
BEGIN
  SELECT count(*) INTO so_dong_cu
  FROM mua_hang.danh_muc_dong WHERE "MA_LOAI"='VT';

  SELECT count(*) INTO so_dong_moi FROM mua_hang.vat_tu;

  IF so_dong_moi < so_dong_cu THEN
    RAISE EXCEPTION
      'Chưa chuyển đủ vật tư sang bảng mới: bảng cũ %, bảng mới %.',
      so_dong_cu, so_dong_moi;
  END IF;
END $$;

DELETE FROM mua_hang.danh_muc_dong WHERE "MA_LOAI"='VT';

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('030', 'Tach vat tu khoi danh_muc_dong thanh bang vat_tu rieng')
ON CONFLICT(version) DO NOTHING;

COMMIT;
