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
ON CONFLICT (ma_nhan_vien) DO UPDATE SET
  ho_va_ten = EXCLUDED.ho_va_ten, ma_bo_phan = EXCLUDED.ma_bo_phan,
  chuc_vu = EXCLUDED.chuc_vu, trang_thai = EXCLUDED.trang_thai;

INSERT INTO mua_hang.nha_cung_cap(
  id, ma_ncc, ten, ten_khong_dau, mst, dia_chi, nguoi_lien_he, sdt, email, mat_hang,
  la_ncc_mua_hang, la_ncc_gia_cong, da_phe_duyet, ngay_phe_duyet, phan_loai_ncc,
  trang_thai, ghi_chu, nguoi_tao
)
SELECT s.id_moi, s.ma_ncc_de_xuat, n.name, mua_hang.chuan_hoa_tim_kiem(n.name),
  NULL, n.address, n.contact_person, n.phone, n.email,
  coalesce(n.main_products, n.nhom_hang_chinh), true, coalesce(n.la_ncc_gia_cong, false),
  coalesce(n.da_phe_duyet, false), n.ngay_phe_duyet::date,
  CASE WHEN upper(n.xep_loai) IN ('A','B','C') THEN upper(n.xep_loai) END,
  CASE upper(coalesce(n.trang_thai, 'HOAT_DONG'))
    WHEN 'CANH_BAO' THEN 'CANH_BAO' WHEN 'TAM_NGUNG' THEN 'TAM_NGUNG'
    WHEN 'LOAI_BO' THEN 'LOAI_BO' ELSE 'HOAT_DONG' END,
  n.notes, 'MIGRATION'
FROM mua_hang.stg_nha_cung_cap s
JOIN public.supplier n ON n.id = s.id_cu
WHERE s.trang_thai = 'SAN_SANG'
ON CONFLICT (id) DO UPDATE SET
  ma_ncc = EXCLUDED.ma_ncc, ten = EXCLUDED.ten, ten_khong_dau = EXCLUDED.ten_khong_dau,
  mst = NULL, dia_chi = EXCLUDED.dia_chi, nguoi_lien_he = EXCLUDED.nguoi_lien_he,
  sdt = EXCLUDED.sdt, email = EXCLUDED.email, mat_hang = EXCLUDED.mat_hang,
  la_ncc_mua_hang = EXCLUDED.la_ncc_mua_hang,
  la_ncc_gia_cong = EXCLUDED.la_ncc_gia_cong, trang_thai = EXCLUDED.trang_thai;

INSERT INTO mua_hang.anh_xa_du_lieu_cu(loai, id_cu, id_moi, bang_nguon, ngay_chuyen, trang_thai)
SELECT 'BO_PHAN', id_cu::text, ma_de_xuat, 'public.department', now(), 'DA_CHUYEN'
FROM mua_hang.stg_bo_phan WHERE trang_thai = 'SAN_SANG'
UNION ALL
SELECT 'NHAN_VIEN', id_cu::text, ma_nhan_vien_de_xuat, 'public.user', now(), 'DA_CHUYEN'
FROM mua_hang.stg_nhan_vien WHERE trang_thai = 'SAN_SANG'
UNION ALL
SELECT 'NHA_CUNG_CAP', id_cu::text, id_moi, 'public.supplier', now(), 'DA_CHUYEN'
FROM mua_hang.stg_nha_cung_cap WHERE trang_thai = 'SAN_SANG'
ON CONFLICT (loai, id_cu) DO UPDATE SET
  id_moi = EXCLUDED.id_moi, ngay_chuyen = EXCLUDED.ngay_chuyen,
  trang_thai = EXCLUDED.trang_thai, ghi_chu = NULL;

WITH dot AS (SELECT max(dot_chay) AS id FROM mua_hang.doi_soat_migration)
UPDATE mua_hang.doi_soat_migration d SET da_chuyen = d.san_sang
FROM dot WHERE d.dot_chay = dot.id AND d.loai IN ('BO_PHAN','NHAN_VIEN','NHA_CUNG_CAP');

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('013', 'Chuyen du 19 bo phan, 11 nhan vien va 53 NCC voi MST NULL');
