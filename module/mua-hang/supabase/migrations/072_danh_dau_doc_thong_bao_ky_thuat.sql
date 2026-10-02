BEGIN;
CREATE TABLE IF NOT EXISTS mua_hang.thong_bao_ky_thuat_da_doc (
  nguoi_nhan varchar(20) NOT NULL REFERENCES mua_hang.nhan_vien(ma_nhan_vien),
  id_phieu varchar(24) NOT NULL REFERENCES mua_hang.dat_ngoai(id) ON DELETE CASCADE,
  dau_yeu_cau varchar(64) NOT NULL,
  thoi_diem timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (nguoi_nhan,id_phieu)
);
INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES ('072','Danh dau da doc thong bao ky thuat theo nhan vien va dot yeu cau')
ON CONFLICT (version) DO NOTHING;
COMMIT;
