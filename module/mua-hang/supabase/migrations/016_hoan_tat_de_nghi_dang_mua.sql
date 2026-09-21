UPDATE mua_hang.stg_de_nghi s
SET trang_thai_de_xuat='DA_DAT_HANG', trang_thai='SAN_SANG',
    ly_do='Có số PO và ngày giao dự kiến trong nguồn cũ; ánh xạ DANG_MUA thành DA_DAT_HANG'
FROM public.purchase_request p
WHERE p.id=s.id_cu AND mua_hang.chuan_hoa_ma(p.status,30)='DANG_MUA'
  AND nullif(trim(p.po_number),'') IS NOT NULL;

UPDATE mua_hang.stg_de_nghi_dong d
SET trang_thai='SAN_SANG', ly_do=NULL
FROM mua_hang.stg_de_nghi h
WHERE h.id_moi=d.id_de_nghi_moi AND h.trang_thai='SAN_SANG';

INSERT INTO mua_hang.de_nghi(
  id,loai,so_phieu_cu,ma_bo_phan,nguoi_yeu_cau,thoi_diem_gui,ngay_hieu_luc,
  tre_gio_chot,tinh_trang_yc,trang_thai,ly_do_tra_lai,
  nguoi_duyet_bp,ngay_duyet_bp,duyet_online,ngay_ky_bu,nguoi_mua_hang,ghi_chu,
  ngay_tao,nguoi_tao,ngay_sua,phien_ban
)
SELECT s.id_moi,s.loai_de_xuat,p.code,s.ma_bo_phan,s.ma_nhan_vien,
  p.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh',coalesce(p.effective_date,p.created_at::date),
  p.is_late_cutoff,'BINH_THUONG',s.trang_thai_de_xuat,p.rejection_reason,
  md.id_moi,p.approved_at AT TIME ZONE 'Asia/Ho_Chi_Minh',p.is_online_approval,
  p.signed_off_at::date,mb.id_moi,
  concat_ws(E'\n',p.notes,p.purchase_notes,p.reconciliation_notes,
    'PO cũ: '||p.po_number),
  p.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh',s.ma_nhan_vien,
  p.updated_at AT TIME ZONE 'Asia/Ho_Chi_Minh',coalesce(p.version,1)
FROM mua_hang.stg_de_nghi s
JOIN public.purchase_request p ON p.id=s.id_cu
LEFT JOIN mua_hang.anh_xa_du_lieu_cu md
  ON md.loai='NHAN_VIEN' AND md.id_cu=p.approver_id::text AND md.trang_thai='DA_CHUYEN'
LEFT JOIN mua_hang.anh_xa_du_lieu_cu mb
  ON mb.loai='NHAN_VIEN' AND mb.id_cu=p.assigned_buyer_id::text AND mb.trang_thai='DA_CHUYEN'
WHERE s.trang_thai='SAN_SANG'
ON CONFLICT(id) DO NOTHING;

INSERT INTO mua_hang.de_nghi_dong(
  id,id_de_nghi,stt_dong,id_sp_cu,id_vt_de_nghi,id_vt_duyet_mua,
  ten_hang_chup,dvt_chup,phan_loai_chup,quy_cach,so_luong,ky_han_yc,
  tra_loi_ky_han,noi_dung_gia_cong,bat_kha_thi,can_xac_nhan_kt,
  trang_thai_dong,ghi_chu,ngay_tao,nguoi_tao,ngay_sua,phien_ban
)
SELECT s.id_moi,s.id_de_nghi_moi,i.line_number,left(coalesce(i.item_code,i.barcode),30),
  s.id_vat_tu_moi,s.id_vat_tu_moi,i.item_name,mua_hang.chuan_hoa_ma(i.unit,20),
  'THONG_DUNG_SX',i.technical_requirements,round(i.quantity::numeric,4),i.due_date,
  i.expected_delivery_date,i.outsource_description,i.is_infeasible,
  coalesce(mua_hang.chuan_hoa_ma(i.tech_status,30),'') NOT IN ('','DA_XAC_NHAN'),
  CASE WHEN i.is_cancelled THEN 'HUY' ELSE 'NHAP' END,
  concat_ws(E'\n',i.iqc_inspection_notes,i.tech_notes,i.item_notes,
    CASE WHEN nullif(trim(i.production_order),'') IS NOT NULL
      THEN 'LSX cũ không di trú: '||left(trim(i.production_order),80) END),
  i.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh',h.ma_nhan_vien,
  i.updated_at AT TIME ZONE 'Asia/Ho_Chi_Minh',1
FROM mua_hang.stg_de_nghi_dong s
JOIN public.purchase_request_item i ON i.id=s.id_cu
JOIN mua_hang.stg_de_nghi h ON h.id_moi=s.id_de_nghi_moi
WHERE s.trang_thai='SAN_SANG'
ON CONFLICT(id) DO NOTHING;

INSERT INTO mua_hang.anh_xa_du_lieu_cu(loai,id_cu,id_moi,bang_nguon,ngay_chuyen,trang_thai)
SELECT 'DE_NGHI',id_cu::text,id_moi,'public.purchase_request',now(),'DA_CHUYEN'
FROM mua_hang.stg_de_nghi WHERE trang_thai='SAN_SANG'
UNION ALL
SELECT 'DE_NGHI_DONG',id_cu::text,id_moi,'public.purchase_request_item',now(),'DA_CHUYEN'
FROM mua_hang.stg_de_nghi_dong WHERE trang_thai='SAN_SANG'
ON CONFLICT(loai,id_cu) DO UPDATE SET
  id_moi=EXCLUDED.id_moi,ngay_chuyen=EXCLUDED.ngay_chuyen,trang_thai='DA_CHUYEN',ghi_chu=NULL;

UPDATE mua_hang.doi_soat_migration d
SET da_chuyen=(SELECT count(*) FROM mua_hang.anh_xa_du_lieu_cu a
               WHERE a.loai=d.loai AND a.trang_thai='DA_CHUYEN')
WHERE d.loai IN ('DE_NGHI','DE_NGHI_DONG');

INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES('016','Anh xa DANG_MUA co so PO thanh DA_DAT_HANG va hoan tat de nghi');
