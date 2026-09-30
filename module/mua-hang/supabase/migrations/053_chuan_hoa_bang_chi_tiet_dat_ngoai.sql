BEGIN;

-- Older databases used alternate names; keep their rows while normalizing to v3.
DO $$
BEGIN
  IF to_regclass('mua_hang.dat_ngoai_xac_nhan_kt') IS NULL
     AND to_regclass('mua_hang.dat_ngoai_xac_nhan_ky_thuat') IS NOT NULL THEN
    ALTER TABLE mua_hang.dat_ngoai_xac_nhan_ky_thuat
      RENAME TO dat_ngoai_xac_nhan_kt;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mua_hang'
             AND table_name='dat_ngoai_dot_giao' AND column_name='lan_giao')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mua_hang'
                     AND table_name='dat_ngoai_dot_giao' AND column_name='dot_so') THEN
    ALTER TABLE mua_hang.dat_ngoai_dot_giao RENAME COLUMN lan_giao TO dot_so;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mua_hang'
             AND table_name='dat_ngoai_dot_giao' AND column_name='so_luong_du_kien')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mua_hang'
                     AND table_name='dat_ngoai_dot_giao' AND column_name='so_luong') THEN
    ALTER TABLE mua_hang.dat_ngoai_dot_giao RENAME COLUMN so_luong_du_kien TO so_luong;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mua_hang'
             AND table_name='dat_ngoai_lich_su_ky_han' AND column_name='ky_han_cu')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mua_hang'
                     AND table_name='dat_ngoai_lich_su_ky_han' AND column_name='ngay_cu') THEN
    ALTER TABLE mua_hang.dat_ngoai_lich_su_ky_han RENAME COLUMN ky_han_cu TO ngay_cu;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mua_hang'
             AND table_name='dat_ngoai_lich_su_ky_han' AND column_name='ky_han_moi')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mua_hang'
                     AND table_name='dat_ngoai_lich_su_ky_han' AND column_name='ngay_moi') THEN
    ALTER TABLE mua_hang.dat_ngoai_lich_su_ky_han RENAME COLUMN ky_han_moi TO ngay_moi;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS mua_hang.dat_ngoai_xac_nhan_kt (
  id varchar(24) PRIMARY KEY,
  id_dat_ngoai_dong varchar(24) NOT NULL
    REFERENCES mua_hang.dat_ngoai_dong(id) ON DELETE RESTRICT,
  noi_dung text NOT NULL,
  ket_luan varchar(20),
  nguoi_xac_nhan varchar(20) NOT NULL
    REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  thoi_diem timestamptz NOT NULL DEFAULT now(),
  id_lan_truoc varchar(24)
);

ALTER TABLE mua_hang.dat_ngoai_xac_nhan_kt
  ADD COLUMN IF NOT EXISTS ket_luan varchar(20),
  ADD COLUMN IF NOT EXISTS id_lan_truoc varchar(24);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='mua_hang'
               AND table_name='dat_ngoai_xac_nhan_kt' AND column_name='ket_qua') THEN
    UPDATE mua_hang.dat_ngoai_xac_nhan_kt
    SET ket_luan=upper(ket_qua)
    WHERE ket_luan IS NULL
      AND upper(ket_qua) IN ('CAN_LAM_RO','DONG_Y','KHONG_DONG_Y');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attname='id_lan_truoc'
    WHERE c.contype='f'
      AND c.conrelid='mua_hang.dat_ngoai_xac_nhan_kt'::regclass
      AND c.confrelid='mua_hang.dat_ngoai_xac_nhan_kt'::regclass
      AND a.attnum=ANY(c.conkey)
  ) THEN
    ALTER TABLE mua_hang.dat_ngoai_xac_nhan_kt
      ADD CONSTRAINT fk_dat_ngoai_xac_nhan_kt_lan_truoc
      FOREIGN KEY (id_lan_truoc)
      REFERENCES mua_hang.dat_ngoai_xac_nhan_kt(id) ON DELETE RESTRICT;
  END IF;
END $$;

ALTER TABLE mua_hang.dat_ngoai_dot_giao
  ADD COLUMN IF NOT EXISTS ngay_sua timestamptz,
  ADD COLUMN IF NOT EXISTS nguoi_sua varchar(20),
  ADD COLUMN IF NOT EXISTS phien_ban integer NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_dat_ngoai_dot_giao_dong_so
  ON mua_hang.dat_ngoai_dot_giao(id_dat_ngoai_dong,dot_so);

ALTER TABLE mua_hang.dat_ngoai_lich_su_ky_han
  ALTER COLUMN id DROP DEFAULT,
  ALTER COLUMN id TYPE varchar(24) USING id::text;

INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES ('053','Chuan hoa ten bang va cot chi tiet dat ngoai tu schema cu')
ON CONFLICT (version) DO NOTHING;

COMMIT;
