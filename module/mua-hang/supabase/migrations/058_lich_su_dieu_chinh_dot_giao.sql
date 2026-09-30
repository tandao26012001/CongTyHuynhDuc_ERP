BEGIN;

CREATE TABLE IF NOT EXISTS mua_hang.dat_ngoai_dot_giao_lich_su (
  id varchar(24) PRIMARY KEY,
  id_dat_ngoai_dot_giao varchar(24) NOT NULL
    REFERENCES mua_hang.dat_ngoai_dot_giao(id) ON DELETE RESTRICT,
  ngay_cu date NOT NULL,
  ngay_moi date NOT NULL,
  ly_do text NOT NULL CHECK (length(trim(ly_do)) > 0),
  nguoi_sua varchar(20) NOT NULL
    REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  thoi_diem timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_dat_ngoai_dot_giao_lich_su
  ON mua_hang.dat_ngoai_dot_giao_lich_su(id_dat_ngoai_dot_giao,thoi_diem,id);

INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES ('058','Luu lich su dieu chinh ngay du kien theo tung dot giao dat ngoai')
ON CONFLICT (version) DO NOTHING;

COMMIT;
