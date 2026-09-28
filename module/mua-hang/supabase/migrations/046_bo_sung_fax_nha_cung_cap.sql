-- Một số DB đã chuẩn hóa NCC nhưng chưa có cột fax mà API ghi dữ liệu sử dụng.
-- Chỉ bổ sung cột nullable; không cập nhật hay xóa dữ liệu hiện có.
BEGIN;
ALTER TABLE mua_hang.nha_cung_cap
  ADD COLUMN IF NOT EXISTS fax varchar(40);
COMMIT;
