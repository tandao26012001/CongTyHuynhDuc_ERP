BEGIN;

-- F1-39: Kinh doanh cung duoc xem danh muc NCC de de xuat va dat ngoai.
UPDATE mua_hang.phan_quyen
SET duoc_xem=true, pham_vi='toan_bo'
WHERE vai_tro='NV_KINH_DOANH' AND trang='ncc';

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('049', 'Cho nhan vien Kinh doanh xem va de xuat NCC')
ON CONFLICT (version) DO NOTHING;

COMMIT;
