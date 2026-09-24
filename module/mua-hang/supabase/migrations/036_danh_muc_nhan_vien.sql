-- Bổ sung danh mục bộ phận/nhân viên cho các DB rút gọn đã triển khai trước đây.
CREATE OR REPLACE FUNCTION mua_hang.tang_phien_ban()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, mua_hang AS $$
BEGIN
  NEW.ngay_sua := now();
  NEW.phien_ban := OLD.phien_ban + 1;
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS mua_hang.bo_phan (
  ma_bo_phan varchar(10) PRIMARY KEY,
  ten varchar(100) NOT NULL,
  loai varchar(20),
  thu_tu integer,
  trang_thai varchar(20) NOT NULL DEFAULT 'HOAT_DONG'
    CHECK (trang_thai IN ('HOAT_DONG','NGUNG')),
  ngay_tao timestamptz NOT NULL DEFAULT now(),
  nguoi_tao varchar(20) NOT NULL DEFAULT 'SYSTEM',
  ngay_sua timestamptz,
  nguoi_sua varchar(20),
  phien_ban integer NOT NULL DEFAULT 1 CHECK (phien_ban > 0)
);

CREATE TABLE IF NOT EXISTS mua_hang.nhan_vien (
  ma_nhan_vien varchar(20) PRIMARY KEY,
  ho_va_ten varchar(120) NOT NULL,
  ma_bo_phan varchar(10) REFERENCES mua_hang.bo_phan(ma_bo_phan) ON DELETE RESTRICT,
  chuc_vu varchar(80),
  ngay_vao_lam date,
  trang_thai varchar(20) NOT NULL DEFAULT 'HOAT_DONG'
    CHECK (trang_thai IN ('HOAT_DONG','NGHI_VIEC','TAM_NGHI')),
  ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(),
  nguoi_tao varchar(20) NOT NULL DEFAULT 'SYSTEM',
  ngay_sua timestamptz,
  nguoi_sua varchar(20),
  phien_ban integer NOT NULL DEFAULT 1 CHECK (phien_ban > 0)
);

-- DB cũ lưu sẵn bộ phận và nhân viên trong bảng tài khoản chữ hoa.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='mua_hang' AND table_name='tai_khoan' AND column_name='MA_BO_PHAN'
  ) THEN
    INSERT INTO mua_hang.bo_phan(ma_bo_phan, ten, nguoi_tao)
    SELECT DISTINCT left(trim("MA_BO_PHAN"), 10), trim("MA_BO_PHAN"), 'MIGRATION'
    FROM mua_hang.tai_khoan
    WHERE nullif(trim("MA_BO_PHAN"), '') IS NOT NULL
    ON CONFLICT (ma_bo_phan) DO NOTHING;

    INSERT INTO mua_hang.nhan_vien(
      ma_nhan_vien, ho_va_ten, ma_bo_phan, trang_thai, nguoi_tao
    )
    SELECT left(trim("ID"), 20), trim("HO_TEN"), left(trim("MA_BO_PHAN"), 10),
           CASE WHEN "DANG_HOAT_DONG" THEN 'HOAT_DONG' ELSE 'TAM_NGHI' END,
           'MIGRATION'
    FROM mua_hang.tai_khoan
    WHERE nullif(trim("ID"), '') IS NOT NULL
    ON CONFLICT (ma_nhan_vien) DO NOTHING;
  END IF;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['bo_phan','nhan_vien'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'trg_' || t || '_phien_ban' AND NOT tgisinternal
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER trg_%I_phien_ban BEFORE UPDATE ON mua_hang.%I '
        'FOR EACH ROW EXECUTE FUNCTION mua_hang.tang_phien_ban()', t, t
      );
    END IF;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS ix_nhan_vien_bo_phan
  ON mua_hang.nhan_vien(ma_bo_phan, trang_thai);
CREATE INDEX IF NOT EXISTS ix_nhan_vien_ten
  ON mua_hang.nhan_vien(lower(ho_va_ten));

REVOKE ALL ON mua_hang.bo_phan, mua_hang.nhan_vien FROM PUBLIC, anon, authenticated;

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('036', 'Danh muc bo phan va nhan vien cho quan tri va dang ky tai khoan')
ON CONFLICT(version) DO NOTHING;
