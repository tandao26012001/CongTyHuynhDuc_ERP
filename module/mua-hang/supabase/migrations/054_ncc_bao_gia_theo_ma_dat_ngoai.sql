BEGIN;

ALTER TABLE mua_hang.dat_ngoai_dong
  ADD COLUMN IF NOT EXISTS id_ncc varchar(20)
    REFERENCES mua_hang.nha_cung_cap(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS ma_ncc_chup varchar(20),
  ADD COLUMN IF NOT EXISTS ten_ncc_chup varchar(200);

UPDATE mua_hang.dat_ngoai_dong dd
SET id_ncc=n.id,
    ten_ncc_chup=dn.ten_ncc_chup,
    ma_ncc_chup=n.ma_ncc
FROM mua_hang.dat_ngoai dn
LEFT JOIN mua_hang.nha_cung_cap n ON n.id=dn.id_ncc
WHERE dd.id_dat_ngoai=dn.id
  AND dd.id_ncc IS NULL
  AND dn.id_ncc IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_dat_ngoai_dong_ncc
  ON mua_hang.dat_ngoai_dong(id_ncc);

INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES ('054','Chon nha cung cap va ghi bao gia theo tung ma dat ngoai')
ON CONFLICT (version) DO NOTHING;

COMMIT;
