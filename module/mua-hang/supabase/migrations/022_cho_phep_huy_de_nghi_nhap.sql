-- DN-09 cho phep huy ca phieu nhap chua tung gui duyet.
ALTER TABLE mua_hang.de_nghi DROP CONSTRAINT IF EXISTS de_nghi_check;
ALTER TABLE mua_hang.de_nghi
  ADD CONSTRAINT ck_de_nghi_thoi_diem_gui
  CHECK (trang_thai IN ('NHAP', 'HUY') OR thoi_diem_gui IS NOT NULL);

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('022', 'Cho phep huy de nghi nhap chua gui')
ON CONFLICT(version) DO NOTHING;
