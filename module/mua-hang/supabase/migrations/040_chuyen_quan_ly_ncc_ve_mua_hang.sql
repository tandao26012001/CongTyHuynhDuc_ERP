-- Danh muc NCC do Khoi Mua hang quan ly; Kinh doanh chi duoc chon NCC qua luong Dat ngoai.
UPDATE mua_hang.phan_quyen
SET duoc_sua=false, pham_vi='toan_bo'
WHERE trang='ncc'
  AND duoc_sua=true
  AND vai_tro NOT IN ('QUAN_TRI_NGHIEP_VU','TBP_MUA_HANG','NV_MUA_HANG');

UPDATE mua_hang.phan_quyen
SET duoc_xem=true, duoc_sua=true, pham_vi='toan_bo'
WHERE trang='ncc'
  AND vai_tro IN ('QUAN_TRI_NGHIEP_VU','TBP_MUA_HANG','NV_MUA_HANG');

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('040', 'Chuyen quyen quan ly nha cung cap ve bo phan Mua hang')
ON CONFLICT (version) DO NOTHING;
