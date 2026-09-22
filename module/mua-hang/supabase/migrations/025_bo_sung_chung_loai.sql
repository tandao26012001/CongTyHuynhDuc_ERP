-- Bảng dữ liệu công ty: Chủng loại vật tư/hàng hoá.
CREATE TABLE IF NOT EXISTS mua_hang.chung_loai (
  ma_chung_loai varchar(20) PRIMARY KEY,
  ten varchar(100) NOT NULL UNIQUE,
  thu_tu integer,
  ngay_tao timestamptz NOT NULL DEFAULT now(),
  nguoi_tao varchar(20) NOT NULL DEFAULT 'HE_THONG',
  ngay_sua timestamptz,
  nguoi_sua varchar(20),
  phien_ban integer NOT NULL DEFAULT 1 CHECK (phien_ban > 0)
);

CREATE INDEX IF NOT EXISTS ix_chung_loai_thu_tu
  ON mua_hang.chung_loai(thu_tu,ma_chung_loai);
