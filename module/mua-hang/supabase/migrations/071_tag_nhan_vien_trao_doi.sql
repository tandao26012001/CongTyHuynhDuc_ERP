BEGIN;
ALTER TABLE mua_hang.trao_doi ADD COLUMN IF NOT EXISTS nguoi_duoc_tag jsonb NOT NULL DEFAULT '[]'::jsonb;
CREATE TABLE IF NOT EXISTS mua_hang.thong_bao (
  id varchar(24) PRIMARY KEY,
  nguoi_nhan varchar(20) NOT NULL REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  loai varchar(40) NOT NULL,tieu_de varchar(300),noi_dung text,
  bang varchar(40),id_ban_ghi varchar(24),da_doc boolean NOT NULL DEFAULT false,
  thoi_diem timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_thong_bao_nguoi_nhan ON mua_hang.thong_bao(nguoi_nhan,da_doc,thoi_diem DESC);
INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES ('071','Tag nhan vien trong trao doi va thong bao ca nhan')
ON CONFLICT (version) DO NOTHING;
COMMIT;
