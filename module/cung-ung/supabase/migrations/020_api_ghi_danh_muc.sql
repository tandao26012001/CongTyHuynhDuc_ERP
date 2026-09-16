-- Ho tro API ghi danh muc: khoa lac quan, audit va idempotency.
ALTER TABLE mua_hang.don_vi_tinh
  ADD COLUMN IF NOT EXISTS ngay_tao timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS nguoi_tao varchar(20) NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN IF NOT EXISTS ngay_sua timestamptz,
  ADD COLUMN IF NOT EXISTS nguoi_sua varchar(20),
  ADD COLUMN IF NOT EXISTS phien_ban integer NOT NULL DEFAULT 1 CHECK (phien_ban > 0);

ALTER TABLE mua_hang.chung_loai
  ADD COLUMN IF NOT EXISTS ngay_tao timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS nguoi_tao varchar(20) NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN IF NOT EXISTS ngay_sua timestamptz,
  ADD COLUMN IF NOT EXISTS nguoi_sua varchar(20),
  ADD COLUMN IF NOT EXISTS phien_ban integer NOT NULL DEFAULT 1 CHECK (phien_ban > 0);

ALTER TABLE mua_hang.bo_phan
  ADD COLUMN IF NOT EXISTS ngay_tao timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS nguoi_tao varchar(20) NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN IF NOT EXISTS ngay_sua timestamptz,
  ADD COLUMN IF NOT EXISTS nguoi_sua varchar(20),
  ADD COLUMN IF NOT EXISTS phien_ban integer NOT NULL DEFAULT 1 CHECK (phien_ban > 0);

ALTER TABLE mua_hang.nhan_vien
  ADD COLUMN IF NOT EXISTS ngay_tao timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS nguoi_tao varchar(20) NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN IF NOT EXISTS ngay_sua timestamptz,
  ADD COLUMN IF NOT EXISTS nguoi_sua varchar(20),
  ADD COLUMN IF NOT EXISTS phien_ban integer NOT NULL DEFAULT 1 CHECK (phien_ban > 0);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['don_vi_tinh','chung_loai','bo_phan','nhan_vien'] LOOP
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

CREATE TABLE IF NOT EXISTS mua_hang.thao_tac_da_xu_ly (
  ma_tai_khoan varchar(60) NOT NULL,
  khoa varchar(64) NOT NULL,
  duong_dan varchar(160) NOT NULL,
  ket_qua jsonb,
  thoi_diem timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ma_tai_khoan, khoa)
);
CREATE INDEX IF NOT EXISTS ix_thao_tac_da_xu_ly_thoi_diem
  ON mua_hang.thao_tac_da_xu_ly(thoi_diem);

REVOKE ALL ON mua_hang.thao_tac_da_xu_ly FROM PUBLIC, anon, authenticated;

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('020', 'API ghi danh muc: phien ban, audit va idempotency')
ON CONFLICT(version) DO NOTHING;
