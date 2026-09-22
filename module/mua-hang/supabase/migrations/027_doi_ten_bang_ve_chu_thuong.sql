-- Chuẩn hoá toàn bộ tên bảng trong schema mua_hang về chữ thường.
-- PostgreSQL coi tên có dấu ngoặc kép và khác hoa/thường là các định danh khác nhau,
-- vì vậy phải đổi tên tường minh cho các bảng cũ.
DO $$
DECLARE
  bang record;
  ten_thuong text;
  so_dong_bang_cu bigint;
BEGIN
  FOR bang IN
    SELECT tablename AS ten_cu
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'mua_hang'
      AND tablename <> lower(tablename)
    ORDER BY tablename
  LOOP
    ten_thuong := lower(bang.ten_cu);

    IF to_regclass(format('%I.%I', 'mua_hang', ten_thuong)) IS NULL THEN
      EXECUTE format(
        'ALTER TABLE %I.%I RENAME TO %I',
        'mua_hang', bang.ten_cu, ten_thuong
      );
    ELSE
      -- Chỉ loại bảng trùng tên cũ khi bảng đó hoàn toàn rỗng. Nếu có dữ liệu,
      -- dừng migration để người vận hành đối soát thay vì tự động làm mất dữ liệu.
      EXECUTE format(
        'SELECT count(*) FROM %I.%I',
        'mua_hang', bang.ten_cu
      ) INTO so_dong_bang_cu;

      IF so_dong_bang_cu = 0 THEN
        EXECUTE format('DROP TABLE %I.%I', 'mua_hang', bang.ten_cu);
      ELSE
        RAISE EXCEPTION
          'Không thể đổi bảng %.%: bảng đích %.% đã tồn tại và bảng cũ còn % dòng.',
          'mua_hang', bang.ten_cu, 'mua_hang', ten_thuong, so_dong_bang_cu;
      END IF;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_tables
    WHERE schemaname = 'mua_hang'
      AND tablename <> lower(tablename)
  ) THEN
    RAISE EXCEPTION 'Vẫn còn bảng chưa được chuẩn hoá tên chữ thường trong schema mua_hang.';
  END IF;
END $$;
