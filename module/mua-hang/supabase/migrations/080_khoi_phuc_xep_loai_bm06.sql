BEGIN;
-- Runtime van chi chap nhan A/B/C. Giu diem cu va cho phep 5 bac BM06 moi.
ALTER TABLE mua_hang.danh_gia_ncc ALTER COLUMN xep_loai TYPE varchar(20);
ALTER TABLE mua_hang.danh_gia_ncc DROP CONSTRAINT IF EXISTS danh_gia_ncc_xep_loai_check;
ALTER TABLE mua_hang.danh_gia_ncc ADD CONSTRAINT danh_gia_ncc_xep_loai_check
 CHECK (xep_loai IS NULL OR xep_loai IN
 ('A','B','C','KHONG_CHON','DU_PHONG','TIEU_CHUAN','CHINH_YEU','CHIEN_LUOC'));
INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES ('080','Khoi phuc nam bac BM06, giu xep loai lich su A/B/C') ON CONFLICT DO NOTHING;
COMMIT;
