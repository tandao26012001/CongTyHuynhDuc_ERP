CREATE TABLE mua_hang.stg_de_nghi (
  id_cu integer PRIMARY KEY,
  id_moi varchar(24) NOT NULL UNIQUE,
  loai_de_xuat varchar(20),
  trang_thai_de_xuat varchar(30),
  ma_bo_phan varchar(10),
  ma_nhan_vien varchar(20),
  trang_thai varchar(20) NOT NULL,
  ly_do text
);

CREATE TABLE mua_hang.stg_de_nghi_dong (
  id_cu integer PRIMARY KEY,
  id_moi varchar(24) NOT NULL UNIQUE,
  id_de_nghi_moi varchar(24),
  id_vat_tu_moi varchar(20),
  trang_thai varchar(20) NOT NULL,
  ly_do text
);

INSERT INTO mua_hang.stg_de_nghi(
  id_cu, id_moi, loai_de_xuat, trang_thai_de_xuat,
  ma_bo_phan, ma_nhan_vien, trang_thai, ly_do
)
SELECT p.id,
  'DN-' || extract(year FROM p.created_at)::integer || '-' || lpad(p.id::text, 6, '0'),
  CASE mua_hang.chuan_hoa_ma(p.request_type, 30)
    WHEN 'MUA_HANG' THEN 'MUA_HANG'
    WHEN 'GIA_CONG' THEN 'GIA_CONG_NGOAI'
    WHEN 'GIA_CONG_NGOAI' THEN 'GIA_CONG_NGOAI'
  END,
  mua_hang.chuan_hoa_ma(p.status, 30), n.ma_bo_phan, mn.id_moi,
  CASE
    WHEN mua_hang.chuan_hoa_ma(p.status, 30) = 'DANG_MUA' THEN 'CAN_RA_SOAT'
    WHEN mn.id_moi IS NULL OR n.ma_bo_phan IS NULL THEN 'LOI'
    ELSE 'SAN_SANG'
  END,
  CASE
    WHEN mua_hang.chuan_hoa_ma(p.status, 30) = 'DANG_MUA'
      THEN 'Trạng thái DANG_MUA chưa có ánh xạ chính thức trong mô hình mới'
    WHEN mn.id_moi IS NULL THEN 'Không ánh xạ được người yêu cầu'
    WHEN n.ma_bo_phan IS NULL THEN 'Không xác định được bộ phận từ người yêu cầu'
  END
FROM public.purchase_request p
LEFT JOIN mua_hang.anh_xa_du_lieu_cu mn
  ON mn.loai = 'NHAN_VIEN' AND mn.id_cu = p.requester_id::text AND mn.trang_thai = 'DA_CHUYEN'
LEFT JOIN mua_hang.nhan_vien n ON n.ma_nhan_vien = mn.id_moi;

INSERT INTO mua_hang.stg_de_nghi_dong(
  id_cu, id_moi, id_de_nghi_moi, id_vat_tu_moi, trang_thai, ly_do
)
SELECT i.id,
  'DND-' || extract(year FROM p.created_at)::integer || '-' || lpad(i.id::text, 6, '0'),
  sd.id_moi, mv.id_moi,
  CASE WHEN sd.trang_thai = 'SAN_SANG' THEN 'SAN_SANG' ELSE 'CAN_RA_SOAT' END,
  CASE WHEN sd.trang_thai <> 'SAN_SANG' THEN 'Phiếu đầu chưa sẵn sàng'
       WHEN i.item_id IS NULL THEN 'Dòng cũ không có ID vật tư; chỉ giữ snapshot tên hàng' END
FROM public.purchase_request_item i
JOIN public.purchase_request p ON p.id = i.request_id
JOIN mua_hang.stg_de_nghi sd ON sd.id_cu = p.id
LEFT JOIN mua_hang.anh_xa_du_lieu_cu mv
  ON mv.loai = 'VAT_TU' AND mv.id_cu = i.item_id::text AND mv.trang_thai = 'DA_CHUYEN';

INSERT INTO mua_hang.anh_xa_du_lieu_cu(loai, id_cu, id_moi, bang_nguon, trang_thai, ghi_chu)
SELECT 'KHACH_HANG', c.id::text, 'BO_QUA-KH-' || c.id, 'public.customer', 'BO_QUA',
  'Không có MA_KHACH_HANG; xác nhận không di trú'
FROM public.customer c
UNION ALL
SELECT 'LENH_SAN_XUAT', l.id::text, 'BO_QUA-LSX-' || l.id, 'public.lenh_san_xuat', 'BO_QUA',
  'Không có MA_VACH để tạo LSX_DONG; xác nhận không di trú'
FROM public.lenh_san_xuat l
UNION ALL
SELECT 'DAT_NGOAI', o.id::text, 'BO_QUA-DNG-' || o.id, 'public.outside_purchase_request', 'BO_QUA',
  'Phụ thuộc LENH_SAN_XUAT đã được xác nhận không di trú'
FROM public.outside_purchase_request o
UNION ALL
SELECT 'DAT_NGOAI_DONG', i.id::text, 'BO_QUA-DNGD-' || i.id,
  'public.outside_purchase_request_item', 'BO_QUA',
  'Phiếu đầu đặt ngoài không di trú'
FROM public.outside_purchase_request_item i
ON CONFLICT (loai, id_cu) DO UPDATE SET
  id_moi = EXCLUDED.id_moi, trang_thai = 'BO_QUA', ghi_chu = EXCLUDED.ghi_chu;

INSERT INTO mua_hang.doi_soat_migration(
  dot_chay, loai, tong_nguon, san_sang, can_ra_soat, loi, da_chuyen
)
SELECT 'GD-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS'), 'DE_NGHI', count(*),
  count(*) FILTER (WHERE trang_thai='SAN_SANG'),
  count(*) FILTER (WHERE trang_thai='CAN_RA_SOAT'),
  count(*) FILTER (WHERE trang_thai='LOI'), 0
FROM mua_hang.stg_de_nghi;

INSERT INTO mua_hang.doi_soat_migration(
  dot_chay, loai, tong_nguon, san_sang, can_ra_soat, loi, da_chuyen
)
SELECT 'GD-DONG-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISS'), 'DE_NGHI_DONG', count(*),
  count(*) FILTER (WHERE trang_thai='SAN_SANG'),
  count(*) FILTER (WHERE trang_thai='CAN_RA_SOAT'),
  count(*) FILTER (WHERE trang_thai='LOI'), 0
FROM mua_hang.stg_de_nghi_dong;

REVOKE ALL ON mua_hang.stg_de_nghi, mua_hang.stg_de_nghi_dong
FROM PUBLIC, anon, authenticated;

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('014', 'Staging de nghi va danh dau BO_QUA khach hang, LSX, dat ngoai');
