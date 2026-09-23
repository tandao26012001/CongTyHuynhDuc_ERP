-- Tách đơn vị tính khỏi bảng danh mục dùng chung để tránh nhầm lẫn.
CREATE TABLE IF NOT EXISTS mua_hang.don_vi_tinh (
  dvt varchar(20) PRIMARY KEY,
  ten_dvt varchar(60) NOT NULL,
  so_le smallint NOT NULL DEFAULT 0 CHECK (so_le BETWEEN 0 AND 4),
  trang_thai varchar(20) NOT NULL DEFAULT 'HOAT_DONG'
    CHECK (trang_thai IN ('HOAT_DONG', 'NGUNG')),
  ngay_tao timestamptz NOT NULL DEFAULT now(),
  nguoi_tao varchar(20) NOT NULL DEFAULT 'SYSTEM',
  ngay_sua timestamptz,
  nguoi_sua varchar(20),
  phien_ban integer NOT NULL DEFAULT 1 CHECK (phien_ban > 0)
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM mua_hang.danh_muc_dong
    WHERE "MA_LOAI" = 'DVT'
      AND (
        coalesce(("DU_LIEU"->>'so_le')::integer, 0) NOT BETWEEN 0 AND 4
        OR length(trim("MA")) NOT BETWEEN 1 AND 20
        OR length(trim("TEN")) NOT BETWEEN 1 AND 60
      )
  ) THEN
    RAISE EXCEPTION 'Dữ liệu ĐVT cũ không hợp lệ; dừng migration để đối soát.';
  END IF;
END $$;

INSERT INTO mua_hang.don_vi_tinh (
  dvt, ten_dvt, so_le, trang_thai, ngay_tao, nguoi_tao, ngay_sua
)
SELECT
  upper(trim("MA")),
  trim("TEN"),
  coalesce(("DU_LIEU"->>'so_le')::smallint, 0),
  CASE WHEN "TRANG_THAI" = 'DANG_SU_DUNG' THEN 'HOAT_DONG' ELSE 'NGUNG' END,
  "NGAY_TAO",
  coalesce(nullif(trim("DU_LIEU"->>'nguoi_tao'), ''), 'MIGRATION'),
  "NGAY_SUA"
FROM mua_hang.danh_muc_dong
WHERE "MA_LOAI" = 'DVT'
ON CONFLICT (dvt) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM mua_hang.danh_muc_dong d
    WHERE d."MA_LOAI" = 'DVT'
      AND NOT EXISTS (
        SELECT 1 FROM mua_hang.don_vi_tinh u
        WHERE u.dvt = upper(trim(d."MA"))
      )
  ) THEN
    RAISE EXCEPTION 'Chưa chuyển hết ĐVT sang bảng riêng; không xoá dữ liệu cũ.';
  END IF;
END $$;

DELETE FROM mua_hang.danh_muc_dong
WHERE "MA_LOAI" = 'DVT';

CREATE TABLE IF NOT EXISTS mua_hang.schema_migrations (
  version varchar(20) PRIMARY KEY,
  mo_ta text NOT NULL,
  ap_dung_luc timestamptz NOT NULL DEFAULT now()
);

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('029', 'Tach don vi tinh khoi danh_muc_dong thanh bang rieng')
ON CONFLICT(version) DO NOTHING;
