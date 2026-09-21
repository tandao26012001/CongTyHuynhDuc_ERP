DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM mua_hang.stg_don_vi_tinh WHERE trang_thai <> 'SAN_SANG'
  ) OR EXISTS (
    SELECT 1 FROM mua_hang.stg_chung_loai WHERE trang_thai <> 'SAN_SANG'
  ) OR EXISTS (
    SELECT 1 FROM mua_hang.stg_vat_tu WHERE trang_thai <> 'SAN_SANG'
  ) THEN
    RAISE EXCEPTION 'Staging còn dòng chưa sẵn sàng; dừng migration danh mục';
  END IF;
END;
$$;

INSERT INTO mua_hang.don_vi_tinh(dvt, ten_dvt, so_le, trang_thai)
SELECT s.dvt_de_xuat, u.name,
  CASE WHEN s.dvt_de_xuat IN ('KG','MET','M','M2','LIT') THEN 4 ELSE 0 END,
  'HOAT_DONG'
FROM mua_hang.stg_don_vi_tinh s
JOIN public.unit_of_measure u ON u.id = s.id_cu
WHERE s.trang_thai = 'SAN_SANG'
ON CONFLICT (dvt) DO UPDATE SET
  ten_dvt = EXCLUDED.ten_dvt,
  so_le = EXCLUDED.so_le;

INSERT INTO mua_hang.chung_loai(ma_chung_loai, ten, thu_tu)
SELECT s.ma_de_xuat, c.name, c.id
FROM mua_hang.stg_chung_loai s
JOIN public.item_category c ON c.id = s.id_cu
WHERE s.trang_thai = 'SAN_SANG'
ON CONFLICT (ma_chung_loai) DO UPDATE SET ten = EXCLUDED.ten, thu_tu = EXCLUDED.thu_tu;

INSERT INTO mua_hang.nha_cung_cap(
  id, ma_ncc, ten, ten_khong_dau, mst, dia_chi, nguoi_lien_he, sdt, email, mat_hang,
  la_ncc_mua_hang, la_ncc_gia_cong, da_phe_duyet, ngay_phe_duyet, phan_loai_ncc,
  trang_thai, ghi_chu, nguoi_tao
)
SELECT s.id_moi, s.ma_ncc_de_xuat, n.name, mua_hang.chuan_hoa_tim_kiem(n.name),
  n.tax_code, n.address, n.contact_person, n.phone, n.email,
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
ON CONFLICT (id) DO NOTHING;

INSERT INTO mua_hang.vat_tu(
  id, ma_vat_tu, ten_hang, ten_khong_dau, dvt, ma_chung_loai,
  kho, loai_phoi, quy_cach, ten_hang_cu, ghi_chu, nguoi_tao
)
SELECT s.id_moi, s.ma_vat_tu_de_xuat, i.name, mua_hang.chuan_hoa_tim_kiem(i.name),
  s.dvt_de_xuat, sc.ma_de_xuat,
  CASE
    WHEN s.ma_vat_tu_de_xuat LIKE 'TH-%' THEN 'TH'
    WHEN s.ma_vat_tu_de_xuat LIKE 'TL-%' THEN 'TL'
    WHEN s.ma_vat_tu_de_xuat LIKE 'VT-%' THEN 'VT'
  END,
  CASE WHEN s.ma_vat_tu_de_xuat ~ '^VT-(NC|LC|TN|TL|PT|PL)-'
    THEN split_part(s.ma_vat_tu_de_xuat, '-', 2) END,
  i.description, i.name,
  CASE WHEN s.ma_vat_tu_de_xuat IS NULL AND nullif(trim(i.sku), '') IS NOT NULL
    THEN 'Mã nguồn chưa đạt regex: ' || left(trim(i.sku), 80) END,
  'MIGRATION'
FROM mua_hang.stg_vat_tu s
JOIN public.item i ON i.id = s.id_cu
LEFT JOIN mua_hang.stg_chung_loai sc ON sc.id_cu = i.category_id AND sc.trang_thai = 'SAN_SANG'
WHERE s.trang_thai = 'SAN_SANG'
ON CONFLICT (id) DO NOTHING;

INSERT INTO mua_hang.anh_xa_du_lieu_cu(loai, id_cu, id_moi, bang_nguon, ngay_chuyen, trang_thai)
SELECT 'DON_VI_TINH', id_cu::text, dvt_de_xuat, 'public.unit_of_measure', now(), 'DA_CHUYEN'
FROM mua_hang.stg_don_vi_tinh WHERE trang_thai = 'SAN_SANG'
UNION ALL
SELECT 'CHUNG_LOAI', id_cu::text, ma_de_xuat, 'public.item_category', now(), 'DA_CHUYEN'
FROM mua_hang.stg_chung_loai WHERE trang_thai = 'SAN_SANG'
UNION ALL
SELECT 'VAT_TU', id_cu::text, id_moi, 'public.item', now(), 'DA_CHUYEN'
FROM mua_hang.stg_vat_tu WHERE trang_thai = 'SAN_SANG'
UNION ALL
SELECT 'NHA_CUNG_CAP', id_cu::text, id_moi, 'public.supplier', now(), 'DA_CHUYEN'
FROM mua_hang.stg_nha_cung_cap WHERE trang_thai = 'SAN_SANG'
ON CONFLICT (loai, id_cu) DO UPDATE SET
  id_moi = EXCLUDED.id_moi, ngay_chuyen = EXCLUDED.ngay_chuyen,
  trang_thai = EXCLUDED.trang_thai, ghi_chu = NULL;

WITH dot AS (SELECT max(dot_chay) AS id FROM mua_hang.doi_soat_migration)
UPDATE mua_hang.doi_soat_migration d
SET da_chuyen = d.san_sang
FROM dot
WHERE d.dot_chay = dot.id
  AND d.loai IN ('DON_VI_TINH','CHUNG_LOAI','VAT_TU','NHA_CUNG_CAP');

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('007', 'Chuyen cac dong danh muc da doi soat: DVT, chung loai, vat tu va NCC hop le');
