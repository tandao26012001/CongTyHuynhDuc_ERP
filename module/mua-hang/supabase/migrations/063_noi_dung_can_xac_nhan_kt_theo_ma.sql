BEGIN;

ALTER TABLE mua_hang.dat_ngoai_dong
  ADD COLUMN IF NOT EXISTS noi_dung_can_xac_nhan_kt text;

-- Đưa yêu cầu cấp phiếu cũ xuống từng mã; nếu thiếu thì dùng yêu cầu kỹ thuật của dòng.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM mua_hang.schema_migrations WHERE version='063') THEN
    UPDATE mua_hang.dat_ngoai_dong d
    SET noi_dung_can_xac_nhan_kt=coalesce(
      nullif(trim(p.noi_dung_ky_thuat), ''),
      nullif(trim(d.yeu_cau_ky_thuat), '')
    )
    FROM mua_hang.dat_ngoai p
    WHERE p.id=d.id_dat_ngoai AND d.can_xac_nhan_ky_thuat
      AND d.noi_dung_can_xac_nhan_kt IS NULL;
  END IF;
END $$;

INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES ('063','Noi dung can xac nhan ky thuat rieng theo tung ma dat ngoai')
ON CONFLICT (version) DO NOTHING;

COMMIT;
