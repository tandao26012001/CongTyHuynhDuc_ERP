BEGIN;
-- Runtime dung trang_thai, trong khi API BM06 doc trang_thai_duyet.
ALTER TABLE mua_hang.danh_gia_ncc
  ADD COLUMN IF NOT EXISTS trang_thai_duyet varchar(20) NOT NULL DEFAULT 'TRUOC_V3'
    CHECK (trang_thai_duyet IN ('TRUOC_V3','CHO_DUYET','DA_DUYET','TU_CHOI')),
  ADD COLUMN IF NOT EXISTS trong_so_du_lieu numeric(5,2)
    CHECK (trong_so_du_lieu BETWEEN 0 AND 100);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='mua_hang' AND table_name='danh_gia_ncc'
               AND column_name='trang_thai') THEN
    UPDATE mua_hang.danh_gia_ncc
    SET trang_thai_duyet=trang_thai
    WHERE id_mat_hang_ncc IS NOT NULL AND trang_thai_duyet='TRUOC_V3'
      AND trang_thai IN ('CHO_DUYET','DA_DUYET','TU_CHOI');
  END IF;
END $$;
ALTER TABLE mua_hang.danh_gia_ncc ALTER COLUMN trang_thai_duyet SET DEFAULT 'CHO_DUYET';

INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES ('078','Khoi phuc cot duyet va trong so danh gia NCC, giu diem cu')
ON CONFLICT (version) DO NOTHING;
COMMIT;
