BEGIN;
-- DB runtime co the da ghi nhan 048 nhung chua co cot ma_cha.
-- Khong tu gan nhom con khi chua co danh muc chuan de doi soat.
ALTER TABLE mua_hang.chung_loai
  ADD COLUMN IF NOT EXISTS ma_cha varchar(20)
    REFERENCES mua_hang.chung_loai(ma_chung_loai) ON DELETE RESTRICT;
INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES ('075','Khoi phuc cay chung loai cho danh gia NCC theo nhom')
ON CONFLICT (version) DO NOTHING;
COMMIT;
