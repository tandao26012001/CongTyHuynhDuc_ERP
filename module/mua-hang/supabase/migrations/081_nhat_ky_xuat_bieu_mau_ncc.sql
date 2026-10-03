BEGIN;
CREATE TABLE IF NOT EXISTS mua_hang.ncc_bieu_mau_xuat (
 id text PRIMARY KEY,bieu_mau varchar(4) NOT NULL,
 nguoi_thuc_hien text NOT NULL,bo_loc jsonb NOT NULL,
 thoi_diem timestamptz NOT NULL DEFAULT now()
);
INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES ('081','Nhat ky xuat BM03 BM06 BM07 BM08') ON CONFLICT DO NOTHING;
COMMIT;
