BEGIN;

-- F4: Chuyen nghiep vu dieu xe sang Kho van. Giu nguyen cac bang lich su.
DELETE FROM mua_hang.phan_quyen WHERE trang = 'dieu_xe';
DELETE FROM mua_hang.tham_so_he_thong WHERE ma = 'GIO_CHOT_DIEU_XE';

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('047', 'Go quyen Dieu xe khoi Mua hang, giu nguyen du lieu lich su')
ON CONFLICT (version) DO NOTHING;

COMMIT;
