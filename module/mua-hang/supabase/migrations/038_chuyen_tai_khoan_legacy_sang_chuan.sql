-- Chuyen cac cot tai_khoan legacy (chu HOA) sang schema auth chuan (chu thuong).
-- Khong thay doi mat khau/hash cu; cac cot legacy duoc giu lai de rollback/doi chieu.
DO $$
DECLARE
    cot text;
BEGIN
    IF to_regclass('mua_hang.tai_khoan') IS NULL THEN
        RAISE EXCEPTION 'Khong tim thay mua_hang.tai_khoan';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='mua_hang' AND table_name='tai_khoan'
          AND column_name='ma_tai_khoan'
    ) THEN
        RETURN;
    END IF;

    FOREACH cot IN ARRAY ARRAY[
        'ID','MA_TAI_KHOAN','HO_TEN','MA_BO_PHAN','VAI_TRO',
        'MAT_KHAU_HASH','DANG_HOAT_DONG'
    ] LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema='mua_hang' AND table_name='tai_khoan'
              AND column_name=cot
        ) THEN
            RAISE EXCEPTION 'Tai khoan legacy thieu cot bat buoc: %', cot;
        END IF;
    END LOOP;

    ALTER TABLE mua_hang.tai_khoan
        ADD COLUMN ma_tai_khoan varchar(60),
        ADD COLUMN ma_nhan_vien varchar(20),
        ADD COLUMN ho_va_ten varchar(120),
        ADD COLUMN ma_bo_phan varchar(10),
        ADD COLUMN vai_tro varchar(40),
        ADD COLUMN mat_khau_hash varchar(120),
        ADD COLUMN trang_thai varchar(20),
        ADD COLUMN lan_dang_nhap_cuoi timestamptz,
        ADD COLUMN ghi_chu text,
        ADD COLUMN ngay_tao timestamptz DEFAULT now(),
        ADD COLUMN nguoi_tao varchar(20) DEFAULT 'MIGRATION',
        ADD COLUMN ngay_sua timestamptz,
        ADD COLUMN nguoi_sua varchar(20),
        ADD COLUMN phien_ban integer NOT NULL DEFAULT 1;

    UPDATE mua_hang.tai_khoan SET
        ma_tai_khoan = "MA_TAI_KHOAN",
        ma_nhan_vien = left(trim("ID"), 20),
        ho_va_ten = "HO_TEN",
        ma_bo_phan = left(trim("MA_BO_PHAN"), 10),
        vai_tro = NULLIF("VAI_TRO", ''),
        mat_khau_hash = "MAT_KHAU_HASH",
        trang_thai = CASE WHEN "DANG_HOAT_DONG" THEN 'HOAT_DONG' ELSE 'KHOA' END;

    IF EXISTS (SELECT 1 FROM mua_hang.tai_khoan WHERE ma_tai_khoan IS NULL OR mat_khau_hash IS NULL) THEN
        RAISE EXCEPTION 'Chuyen doi tai khoan that bai: thieu ma tai khoan hoac hash mat khau';
    END IF;

    ALTER TABLE mua_hang.tai_khoan
        ALTER COLUMN ma_tai_khoan SET NOT NULL,
        ALTER COLUMN ma_nhan_vien SET NOT NULL,
        ALTER COLUMN ho_va_ten SET NOT NULL,
        ALTER COLUMN ma_bo_phan SET NOT NULL,
        ALTER COLUMN mat_khau_hash SET NOT NULL,
        ALTER COLUMN trang_thai SET NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS ux_tai_khoan_ma_tai_khoan_chuan
        ON mua_hang.tai_khoan(ma_tai_khoan);
    CREATE UNIQUE INDEX IF NOT EXISTS ux_tai_khoan_ma_nhan_vien_chuan
        ON mua_hang.tai_khoan(ma_nhan_vien);
END $$;

CREATE TABLE IF NOT EXISTS mua_hang.phien_dang_nhap (
    token varchar(64) PRIMARY KEY,
    ma_tai_khoan varchar(60) NOT NULL,
    tao_luc timestamptz NOT NULL DEFAULT now(),
    het_han timestamptz NOT NULL,
    ip varchar(45),
    thiet_bi text,
    CHECK (het_han > tao_luc)
);
CREATE INDEX IF NOT EXISTS ix_phien_dang_nhap_tai_khoan
    ON mua_hang.phien_dang_nhap(ma_tai_khoan, het_han);

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('038', 'Chuyen tai khoan legacy sang schema dang nhap chuan')
ON CONFLICT (version) DO NOTHING;
