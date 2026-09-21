CREATE UNIQUE INDEX uq_tai_khoan_lower_ma
ON mua_hang.tai_khoan(lower(ma_tai_khoan));

INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES('019','Ten dang nhap unique khong phan biet hoa thuong');
