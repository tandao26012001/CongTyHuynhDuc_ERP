BEGIN;
CREATE TABLE IF NOT EXISTS mua_hang.mat_hang_ncc_lich_su (
 id text PRIMARY KEY,
 id_mat_hang_ncc varchar(24) NOT NULL REFERENCES mua_hang.mat_hang_ncc(id),
 hanh_dong text NOT NULL CHECK (hanh_dong IN ('TAO','SUA','DUYET')),
 du_lieu_cu jsonb, du_lieu_moi jsonb NOT NULL,
 nguoi_thuc_hien text NOT NULL,
 thoi_diem timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_mat_hang_ncc_lich_su
 ON mua_hang.mat_hang_ncc_lich_su(id_mat_hang_ncc,thoi_diem DESC);
INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES ('079','Lich su tao sua duyet nhom cung cap NCC') ON CONFLICT DO NOTHING;
COMMIT;
