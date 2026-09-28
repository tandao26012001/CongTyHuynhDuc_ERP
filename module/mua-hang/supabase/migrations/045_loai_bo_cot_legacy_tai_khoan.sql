-- Chuyen PK/FK khoi cot legacy sang ma_tai_khoan chuan truoc khi xoa cot cu.
-- Chi ap dung cho schema da chay 038, 043 va co dung cac constraint da doi soat.
BEGIN;

DO $$
BEGIN
  IF to_regclass('mua_hang.tai_khoan') IS NULL
     OR to_regclass('mua_hang.phien') IS NULL
     OR to_regclass('mua_hang.de_nghi') IS NULL
     OR to_regclass('mua_hang.nhat_ky') IS NULL THEN
    RAISE EXCEPTION 'Thieu mot bang can chuyen khoa legacy tai_khoan';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='mua_hang' AND table_name='tai_khoan'
      AND column_name='legacy_ma_tai_khoan'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='mua_hang' AND table_name='tai_khoan'
      AND column_name='legacy_id'
  ) THEN
    RAISE EXCEPTION 'Khong tim thay bo cot legacy tai_khoan nhu schema da doi soat';
  END IF;

  IF EXISTS (
    SELECT ma_tai_khoan FROM mua_hang.tai_khoan
    GROUP BY ma_tai_khoan HAVING ma_tai_khoan IS NULL OR count(*) > 1
  ) THEN
    RAISE EXCEPTION 'ma_tai_khoan bi NULL hoac trung; khong the chuyen PRIMARY KEY';
  END IF;

  IF EXISTS (
    SELECT 1 FROM mua_hang.phien p
    LEFT JOIN mua_hang.tai_khoan t ON t.ma_tai_khoan=p.ma_tai_khoan
    WHERE p.ma_tai_khoan IS NOT NULL AND t.ma_tai_khoan IS NULL
  ) OR EXISTS (
    SELECT 1 FROM mua_hang.de_nghi d
    LEFT JOIN mua_hang.tai_khoan t ON t.ma_tai_khoan=d.nguoi_tao
    WHERE d.nguoi_tao IS NOT NULL AND t.ma_tai_khoan IS NULL
  ) OR EXISTS (
    SELECT 1 FROM mua_hang.de_nghi d
    LEFT JOIN mua_hang.tai_khoan t ON t.ma_tai_khoan=d.nguoi_sua
    WHERE d.nguoi_sua IS NOT NULL AND t.ma_tai_khoan IS NULL
  ) OR EXISTS (
    SELECT 1 FROM mua_hang.nhat_ky n
    LEFT JOIN mua_hang.tai_khoan t ON t.ma_tai_khoan=n.nguoi_tao
    WHERE n.nguoi_tao IS NOT NULL AND t.ma_tai_khoan IS NULL
  ) THEN
    RAISE EXCEPTION 'Co FK khong doi chieu duoc voi tai_khoan.ma_tai_khoan';
  END IF;
END $$;

ALTER TABLE mua_hang.phien
  DROP CONSTRAINT IF EXISTS "PHIEN_MA_TAI_KHOAN_fkey";
ALTER TABLE mua_hang.de_nghi
  DROP CONSTRAINT IF EXISTS "DE_NGHI_NGUOI_TAO_fkey",
  DROP CONSTRAINT IF EXISTS "DE_NGHI_NGUOI_SUA_fkey";
ALTER TABLE mua_hang.nhat_ky
  DROP CONSTRAINT IF EXISTS "NHAT_KY_NGUOI_TAO_fkey";

ALTER TABLE mua_hang.tai_khoan
  DROP CONSTRAINT IF EXISTS "TAI_KHOAN_pkey",
  DROP CONSTRAINT IF EXISTS "TAI_KHOAN_MA_TAI_KHOAN_key";

CREATE UNIQUE INDEX IF NOT EXISTS ux_tai_khoan_ma_tai_khoan_chuan
  ON mua_hang.tai_khoan(ma_tai_khoan);
ALTER TABLE mua_hang.tai_khoan
  ADD CONSTRAINT tai_khoan_pkey_chuan
  PRIMARY KEY USING INDEX ux_tai_khoan_ma_tai_khoan_chuan;

ALTER TABLE mua_hang.phien
  ADD CONSTRAINT "PHIEN_MA_TAI_KHOAN_fkey"
  FOREIGN KEY (ma_tai_khoan) REFERENCES mua_hang.tai_khoan(ma_tai_khoan);
ALTER TABLE mua_hang.de_nghi
  ADD CONSTRAINT "DE_NGHI_NGUOI_TAO_fkey"
  FOREIGN KEY (nguoi_tao) REFERENCES mua_hang.tai_khoan(ma_tai_khoan),
  ADD CONSTRAINT "DE_NGHI_NGUOI_SUA_fkey"
  FOREIGN KEY (nguoi_sua) REFERENCES mua_hang.tai_khoan(ma_tai_khoan);
ALTER TABLE mua_hang.nhat_ky
  ADD CONSTRAINT "NHAT_KY_NGUOI_TAO_fkey"
  FOREIGN KEY (nguoi_tao) REFERENCES mua_hang.tai_khoan(ma_tai_khoan);

DROP TRIGGER IF EXISTS trg_dong_bo_tai_khoan_legacy ON mua_hang.tai_khoan;
DROP FUNCTION IF EXISTS mua_hang.dong_bo_tai_khoan_legacy();

ALTER TABLE mua_hang.tai_khoan
  DROP COLUMN legacy_id,
  DROP COLUMN legacy_ma_tai_khoan,
  DROP COLUMN legacy_vai_tro,
  DROP COLUMN legacy_ma_bo_phan,
  DROP COLUMN legacy_mat_khau_hash,
  DROP COLUMN legacy_ngay_tao,
  DROP COLUMN legacy_ngay_sua;

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('045', 'Chuyen PK FK tai_khoan sang schema chuan va xoa cot legacy')
ON CONFLICT (version) DO NOTHING;

COMMIT;
