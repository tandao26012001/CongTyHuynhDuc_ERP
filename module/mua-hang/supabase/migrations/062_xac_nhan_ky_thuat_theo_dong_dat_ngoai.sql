BEGIN;

ALTER TABLE mua_hang.dat_ngoai_dong
  ADD COLUMN IF NOT EXISTS can_xac_nhan_ky_thuat boolean NOT NULL DEFAULT false;

-- Chỉ chuyển dữ liệu cũ một lần; không ghi đè lựa chọn từng mã khi triển khai lại.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM mua_hang.schema_migrations WHERE version='062') THEN
    UPDATE mua_hang.dat_ngoai_dong d
    SET can_xac_nhan_ky_thuat=true
    FROM mua_hang.dat_ngoai p
    WHERE p.id=d.id_dat_ngoai AND p.can_xac_nhan_ky_thuat;
  END IF;
END $$;

INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES ('062','Danh dau can xac nhan ky thuat theo tung dong dat ngoai')
ON CONFLICT (version) DO NOTHING;

COMMIT;
