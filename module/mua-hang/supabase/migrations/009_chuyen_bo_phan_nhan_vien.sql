DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM mua_hang.stg_bo_phan WHERE trang_thai = 'LOI')
     OR EXISTS (SELECT 1 FROM mua_hang.stg_nhan_vien WHERE trang_thai = 'LOI') THEN
    RAISE EXCEPTION 'Staging bộ phận/nhân viên còn lỗi; dừng migration';
  END IF;
END;
$$;

INSERT INTO mua_hang.bo_phan(ma_bo_phan, ten, loai, thu_tu, trang_thai)
SELECT s.ma_de_xuat, coalesce(nullif(trim(d.description), ''), trim(d.name)), NULL, d.id, 'HOAT_DONG'
FROM mua_hang.stg_bo_phan s
JOIN public.department d ON d.id = s.id_cu
WHERE s.trang_thai = 'SAN_SANG'
ON CONFLICT (ma_bo_phan) DO UPDATE SET ten = EXCLUDED.ten, thu_tu = EXCLUDED.thu_tu;

INSERT INTO mua_hang.nhan_vien(
  ma_nhan_vien, ho_va_ten, ma_bo_phan, chuc_vu, ngay_vao_lam, trang_thai, ghi_chu
)
SELECT s.ma_nhan_vien_de_xuat, coalesce(nullif(trim(u.full_name), ''), trim(u.username)),
  s.ma_bo_phan_de_xuat, u.position_level,
  CASE WHEN u.start_date ~ '^\d{4}-\d{2}-\d{2}$' THEN u.start_date::date END,
  CASE WHEN u.is_active THEN 'HOAT_DONG' ELSE 'NGHI_VIEC' END,
  CASE WHEN u.registration_pending THEN 'Tài khoản nguồn đang chờ duyệt' END
FROM mua_hang.stg_nhan_vien s
JOIN public."user" u ON u.id = s.id_cu
WHERE s.trang_thai = 'SAN_SANG'
ON CONFLICT (ma_nhan_vien) DO NOTHING;

INSERT INTO mua_hang.anh_xa_du_lieu_cu(loai, id_cu, id_moi, bang_nguon, ngay_chuyen, trang_thai)
SELECT 'BO_PHAN', id_cu::text, ma_de_xuat, 'public.department', now(), 'DA_CHUYEN'
FROM mua_hang.stg_bo_phan WHERE trang_thai = 'SAN_SANG'
UNION ALL
SELECT 'NHAN_VIEN', id_cu::text, ma_nhan_vien_de_xuat, 'public.user', now(), 'DA_CHUYEN'
FROM mua_hang.stg_nhan_vien WHERE trang_thai = 'SAN_SANG'
ON CONFLICT (loai, id_cu) DO UPDATE SET
  id_moi = EXCLUDED.id_moi, ngay_chuyen = EXCLUDED.ngay_chuyen,
  trang_thai = EXCLUDED.trang_thai, ghi_chu = NULL;

WITH dot AS (SELECT max(dot_chay) AS id FROM mua_hang.doi_soat_migration)
UPDATE mua_hang.doi_soat_migration d SET da_chuyen = d.san_sang
FROM dot WHERE d.dot_chay = dot.id AND d.loai IN ('BO_PHAN','NHAN_VIEN');

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('009', 'Chuyen bo phan co ma hop le va nhan vien du dieu kien');
