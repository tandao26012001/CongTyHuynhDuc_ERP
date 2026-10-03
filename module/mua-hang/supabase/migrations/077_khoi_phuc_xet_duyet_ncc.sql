BEGIN;

-- Khoi phuc phan ho so NCC cua 048 tren DB runtime thieu cot.
-- Khong suy dien NCC chua duyet thanh da duyet.
ALTER TABLE mua_hang.nha_cung_cap
  ADD COLUMN IF NOT EXISTS trang_thai_xet_duyet varchar(20) NOT NULL DEFAULT 'CHUA_DUYET'
    CHECK (trang_thai_xet_duyet IN ('CHUA_DUYET','DE_XUAT','DA_DUYET')),
  ADD COLUMN IF NOT EXISTS nguoi_de_xuat varchar(20),
  ADD COLUMN IF NOT EXISTS ngay_de_xuat timestamptz,
  ADD COLUMN IF NOT EXISTS nguoi_duyet varchar(20),
  ADD COLUMN IF NOT EXISTS ngay_duyet timestamptz,
  ADD COLUMN IF NOT EXISTS xuat_xu text;

-- Chi dong da duoc phe duyet ro rang moi co trang thai DA_DUYET.
UPDATE mua_hang.nha_cung_cap
SET trang_thai_xet_duyet='DA_DUYET'
WHERE da_phe_duyet=true AND trang_thai_xet_duyet='CHUA_DUYET';

INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES ('077','Khoi phuc cot xet duyet ho so NCC, giu thong tin phe duyet cu')
ON CONFLICT (version) DO NOTHING;
COMMIT;
