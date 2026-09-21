ALTER TABLE mua_hang.tai_khoan ALTER COLUMN vai_tro DROP NOT NULL;
ALTER TABLE mua_hang.tai_khoan ADD CONSTRAINT ck_tai_khoan_vai_tro_theo_trang_thai
CHECK (
  (trang_thai = 'CHO_DUYET' AND vai_tro IS NULL)
  OR (trang_thai IN ('HOAT_DONG','KHOA') AND vai_tro IS NOT NULL)
);

INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES('018','Cho phep tai khoan CHO_DUYET chua co vai tro; bat buoc vai tro khi kich hoat');
