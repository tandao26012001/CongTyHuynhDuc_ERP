-- Bổ sung riêng bảng chống gửi trùng cho DB đang dùng danh mục tương thích cũ.
CREATE TABLE IF NOT EXISTS mua_hang.thao_tac_da_xu_ly (
  ma_tai_khoan varchar(60) NOT NULL,
  khoa varchar(64) NOT NULL,
  duong_dan varchar(160) NOT NULL,
  ket_qua jsonb,
  thoi_diem timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ma_tai_khoan,khoa)
);

CREATE INDEX IF NOT EXISTS ix_thao_tac_da_xu_ly_thoi_diem
  ON mua_hang.thao_tac_da_xu_ly(thoi_diem);

REVOKE ALL ON mua_hang.thao_tac_da_xu_ly FROM PUBLIC,anon,authenticated;
