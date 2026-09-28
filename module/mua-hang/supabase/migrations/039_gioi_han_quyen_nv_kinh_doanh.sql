-- NV_KINH_DOANH chi duoc truy cap module Dat ngoai theo phan quyen da thong nhat.
UPDATE mua_hang.phan_quyen
SET duoc_xem=false,duoc_sua=false,duoc_duyet=false,duoc_xuat=false,pham_vi='ca_nhan'
WHERE vai_tro='NV_KINH_DOANH';

UPDATE mua_hang.phan_quyen
SET duoc_xem=true,duoc_sua=true,duoc_duyet=false,duoc_xuat=true,pham_vi='ca_nhan'
WHERE vai_tro='NV_KINH_DOANH' AND trang='dat_ngoai';

INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES('039','Gioi han quyen nhan vien kinh doanh trong phan he Dat ngoai')
ON CONFLICT(version) DO NOTHING;
