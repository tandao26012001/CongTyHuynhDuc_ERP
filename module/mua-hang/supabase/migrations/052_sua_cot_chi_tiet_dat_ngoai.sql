BEGIN;

-- Repair databases where migration 050 was recorded before its F3 columns landed.
ALTER TABLE mua_hang.dat_ngoai_dong
  ADD COLUMN IF NOT EXISTS ngay_khach_yeu_cau date,
  ADD COLUMN IF NOT EXISTS ngay_ncc_cam_ket date,
  ADD COLUMN IF NOT EXISTS ngay_du_kien_noi_bo date,
  ADD COLUMN IF NOT EXISTS id_su_co varchar(24);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attname='id_su_co'
    WHERE c.contype='f'
      AND c.conrelid='mua_hang.dat_ngoai_dong'::regclass
      AND a.attnum=ANY(c.conkey)
  ) THEN
    ALTER TABLE mua_hang.dat_ngoai_dong
      ADD CONSTRAINT fk_dat_ngoai_dong_su_co
      FOREIGN KEY (id_su_co) REFERENCES mua_hang.su_co(id) ON DELETE RESTRICT;
  END IF;
END $$;

INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES ('052','Bo sung cot chi tiet dat ngoai bi thieu tren DB da ghi nhan 050 cu')
ON CONFLICT (version) DO NOTHING;

COMMIT;
