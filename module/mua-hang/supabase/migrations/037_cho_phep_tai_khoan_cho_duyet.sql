-- Tai khoan tu dang ky chua duoc gan vai tro cho den khi quan tri duyet.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'mua_hang'
          AND table_name = 'tai_khoan'
          AND column_name = 'vai_tro'
    ) THEN
        ALTER TABLE mua_hang.tai_khoan ALTER COLUMN vai_tro DROP NOT NULL;
    END IF;
END $$;

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('037', 'Cho phep tai khoan dang ky cho duyet chua co vai tro')
ON CONFLICT (version) DO NOTHING;
