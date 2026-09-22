\set ON_ERROR_STOP on
BEGIN;
\ir migrations/001_mua_hang_nen_tang.sql
\ir migrations/002_mua_hang_tai_khoan_de_nghi.sql
\ir migrations/003_mua_hang_giao_dich.sql
\ir migrations/004_mua_hang_he_thong.sql
\ir migrations/005_mua_hang_staging.sql
-- 006 chỉ dùng để nâng cấp DB đã từng chạy bản 005 cũ; không chạy khi cài mới.
\ir migrations/020_api_ghi_danh_muc.sql
\ir migrations/021_hoan_thien_f01_de_nghi.sql
\ir migrations/022_cho_phep_huy_de_nghi_nhap.sql
\ir migrations/023_quy_tac_ma_vat_tu.sql
\ir migrations/024_quy_tac_ten_hang.sql
\ir migrations/025_bo_sung_chung_loai.sql
\ir migrations/026_bo_sung_idempotency.sql
\ir migrations/027_doi_ten_bang_ve_chu_thuong.sql
COMMIT;
