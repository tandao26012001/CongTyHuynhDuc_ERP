CREATE TABLE mua_hang.lich_su_trang_thai (
  id varchar(24) PRIMARY KEY, bang varchar(40) NOT NULL, id_ban_ghi varchar(24) NOT NULL,
  tu_trang_thai varchar(30), sang_trang_thai varchar(30) NOT NULL,
  nguoi_thuc_hien varchar(20) NOT NULL, thoi_diem timestamptz NOT NULL DEFAULT now(), ghi_chu text
);
CREATE INDEX ix_lich_su_trang_thai ON mua_hang.lich_su_trang_thai(bang, id_ban_ghi, thoi_diem DESC);

CREATE TABLE mua_hang.nhat_ky_thay_doi (
  id varchar(24) PRIMARY KEY, bang varchar(40) NOT NULL, id_ban_ghi varchar(24), cot varchar(60),
  gia_tri_cu text, gia_tri_moi text, nguoi_sua varchar(20), thoi_diem timestamptz NOT NULL DEFAULT now(),
  ip varchar(45), thiet_bi text,
  hanh_dong varchar(20) NOT NULL CHECK (hanh_dong IN ('TAO','SUA','DUYET','HUY','XEM','XUAT'))
);
CREATE INDEX ix_nhat_ky_thay_doi ON mua_hang.nhat_ky_thay_doi(bang, id_ban_ghi, thoi_diem DESC);

CREATE TABLE mua_hang.trao_doi (
  id varchar(24) PRIMARY KEY, bang varchar(40) NOT NULL, id_ban_ghi varchar(24) NOT NULL,
  noi_dung text NOT NULL, nguoi_gui varchar(20) NOT NULL,
  thoi_diem timestamptz NOT NULL DEFAULT now(),
  id_tra_loi_cho varchar(24) REFERENCES mua_hang.trao_doi(id) ON DELETE RESTRICT
);
CREATE INDEX ix_trao_doi ON mua_hang.trao_doi(bang, id_ban_ghi, thoi_diem);

CREATE TABLE mua_hang.tep_dinh_kem (
  id varchar(24) PRIMARY KEY, bang varchar(40) NOT NULL, id_ban_ghi varchar(24) NOT NULL,
  ten_tep varchar(300) NOT NULL, duong_dan text NOT NULL,
  kich_thuoc bigint CHECK (kich_thuoc IS NULL OR kich_thuoc >= 0), loai_mime varchar(100),
  nguoi_tai_len varchar(20) NOT NULL, thoi_diem timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_tep_dinh_kem ON mua_hang.tep_dinh_kem(bang, id_ban_ghi);

CREATE TABLE mua_hang.thong_bao (
  id varchar(24) PRIMARY KEY,
  nguoi_nhan varchar(20) NOT NULL REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  loai varchar(40) NOT NULL, tieu_de varchar(300), noi_dung text,
  bang varchar(40), id_ban_ghi varchar(24), da_doc boolean NOT NULL DEFAULT false,
  thoi_diem timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_thong_bao_chua_doc ON mua_hang.thong_bao(nguoi_nhan, da_doc, thoi_diem DESC);

CREATE TABLE mua_hang.su_co (
  id varchar(24) PRIMARY KEY, loai varchar(40) NOT NULL, muc_do varchar(20),
  bang varchar(40), id_ban_ghi varchar(24), mo_ta text NOT NULL,
  nguoi_bao varchar(20), thoi_diem timestamptz NOT NULL DEFAULT now(),
  huong_xu_ly text, nguoi_xu_ly varchar(20), ngay_dong date,
  trang_thai varchar(20) NOT NULL DEFAULT 'MO',
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1
);

CREATE TABLE mua_hang.lich_su_gop_vat_tu (
  id varchar(24) PRIMARY KEY,
  id_vt_nguon varchar(20) NOT NULL REFERENCES mua_hang.vat_tu(id) ON DELETE RESTRICT,
  id_vt_dich varchar(20) NOT NULL REFERENCES mua_hang.vat_tu(id) ON DELETE RESTRICT,
  so_ban_ghi_chuyen integer NOT NULL DEFAULT 0 CHECK (so_ban_ghi_chuyen >= 0),
  nguoi_gop varchar(20) NOT NULL, thoi_diem timestamptz NOT NULL DEFAULT now(), ly_do text,
  CHECK (id_vt_nguon <> id_vt_dich)
);

CREATE TABLE mua_hang.anh_xa_du_lieu_cu (
  loai varchar(40) NOT NULL,
  id_cu text NOT NULL,
  id_moi varchar(60) NOT NULL,
  bang_nguon varchar(80) NOT NULL,
  ngay_chuyen timestamptz,
  trang_thai varchar(20) NOT NULL DEFAULT 'CHO_CHUYEN'
    CHECK (trang_thai IN ('CHO_CHUYEN','DA_CHUYEN','LOI','BO_QUA')),
  ghi_chu text,
  PRIMARY KEY (loai, id_cu),
  UNIQUE (loai, id_moi)
);

CREATE OR REPLACE VIEW mua_hang.v_tinh_trang_ma_hang AS
SELECT
  COALESCE(d.id_vt_duyet_mua, d.id_vt_de_nghi) AS id_vat_tu,
  d.id AS id_de_nghi_dong,
  d.ten_hang_chup,
  d.lenh_san_xuat,
  d.ma_vach,
  CASE
    WHEN nh.so_ngay_som_tre IS NOT NULL AND nh.so_ngay_som_tre >= 0 THEN 'DA_GIAO_DUNG_HAN'
    WHEN nh.co_nhan_hang THEN 'DA_GIAO_TRE'
    WHEN dh.trang_thai = 'DA_DUYET' THEN 'DANG_GIAO'
    WHEN dh.co_don_hang THEN 'DA_DAT_HANG'
    WHEN bg.co_bao_gia THEN 'DANG_BAO_GIA'
    WHEN dn.trang_thai = 'DA_DUYET' THEN 'DA_DUYET_DE_NGHI'
    WHEN dn.trang_thai = 'CHO_XAC_NHAN_KT' THEN 'DANG_XAC_NHAN_KY_THUAT'
    ELSE 'DANG_XAC_NHAN_DE_NGHI'
  END AS tinh_trang,
  d.ky_han_yc, dn.muc_do_uu_tien, dn.ma_bo_phan, dn.nguoi_mua_hang
FROM mua_hang.de_nghi_dong d
JOIN mua_hang.de_nghi dn ON dn.id = d.id_de_nghi
LEFT JOIN LATERAL (
  SELECT true AS co_don_hang, x.trang_thai
  FROM mua_hang.don_hang_dong xd
  JOIN mua_hang.don_hang x ON x.id = xd.id_don_hang
  WHERE xd.id_de_nghi_dong = d.id
  ORDER BY x.ngay_tao DESC, x.id DESC LIMIT 1
) dh ON true
LEFT JOIN LATERAL (
  SELECT true AS co_bao_gia
  FROM mua_hang.bao_gia_dong xb
  JOIN mua_hang.bao_gia x ON x.id = xb.id_bao_gia
  WHERE xb.id_de_nghi_dong = d.id
  ORDER BY x.ngay_tao DESC, x.id DESC LIMIT 1
) bg ON true
LEFT JOIN LATERAL (
  SELECT true AS co_nhan_hang, xn.so_ngay_som_tre
  FROM mua_hang.don_hang_dong xd
  JOIN mua_hang.nhan_hang_dong xn ON xn.id_don_hang_dong = xd.id
  JOIN mua_hang.nhan_hang x ON x.id = xn.id_nhan_hang
  WHERE xd.id_de_nghi_dong = d.id
  ORDER BY x.ngay_tao DESC, x.id DESC LIMIT 1
) nh ON true
WHERE dn.trang_thai <> 'HUY';

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'vat_tu','khach_hang','nha_cung_cap','lich_nghi','tham_so_he_thong','mau_son_khach_hang',
    'tai_khoan','de_nghi','de_nghi_dong','doi_vat_lieu','yeu_cau_huy','yeu_cau_cap_ma',
    'dat_ngoai','dat_ngoai_dong','yeu_cau_bao_gia','ycbg_dong','bao_gia','bao_gia_dong',
    'don_hang','don_hang_dong','cong_viec','nhan_hang','nhan_hang_dong','ket_qua_iqc',
    'hang_khong_phu_hop','yeu_cau_thanh_toan','dot_thanh_toan','ban_giao_chung_tu',
    'bgct_dong','dieu_xe','danh_gia_ncc','su_co'
  ] LOOP
    EXECUTE format('CREATE TRIGGER trg_%I_phien_ban BEFORE UPDATE ON mua_hang.%I '
      'FOR EACH ROW EXECUTE FUNCTION mua_hang.tang_phien_ban()', t, t);
  END LOOP;
END;
$$;

INSERT INTO mua_hang.tham_so_he_thong(ma, gia_tri, kieu, mo_ta, nhom) VALUES
  ('GIO_CHOT_DNVT','13:30','TIME','Giờ chốt đề nghị vật tư','GIO_CHOT'),
  ('GIO_CHOT_GCN','15:00','TIME','Giờ chốt gia công ngoài','GIO_CHOT'),
  ('GIO_CHOT_DIEU_XE','15:45','TIME','Giờ chốt điều xe','GIO_CHOT'),
  ('NGAY_TOI_THIEU_HANG_VE','5','INTEGER','Số ngày làm việc tối thiểu','SLA'),
  ('NGUONG_THONG_DUNG_SX','500000000','INTEGER','Ngưỡng VND trước VAT','PHE_DUYET'),
  ('NGUONG_THONG_DUNG_BTBD','50000000','INTEGER','Ngưỡng VND trước VAT','PHE_DUYET'),
  ('VAT_SUAT','10','NUMERIC','Thuế suất phần trăm','TAI_CHINH'),
  ('SO_BAO_GIA_TOI_THIEU','2','INTEGER','Số báo giá tối thiểu','BAO_GIA'),
  ('CHE_DO_QT_NCC_PHE_DUYET','CANH_BAO','TEXT','CẢNH BÁO hoặc CHẶN','QUY_TAC'),
  ('CHE_DO_QT_MA_VAT_TU','CANH_BAO','TEXT','CẢNH BÁO hoặc CHẶN','QUY_TAC'),
  ('CHE_DO_QT_LSX_DUY_NHAT','CANH_BAO','TEXT','CẢNH BÁO hoặc CHẶN','QUY_TAC'),
  ('CHE_DO_QT_XAC_NHAN_KT','CANH_BAO','TEXT','CẢNH BÁO hoặc CHẶN','QUY_TAC'),
  ('NGUONG_TRUNG_TEN','85','NUMERIC','Ngưỡng phần trăm cảnh báo trùng','DANH_MUC'),
  ('CHU_KY_DANH_GIA_NCC_THANG','12','INTEGER','Chu kỳ đánh giá NCC','NCC');

REVOKE ALL ON ALL TABLES IN SCHEMA mua_hang FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA mua_hang FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA mua_hang FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA mua_hang REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA mua_hang REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA mua_hang REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('004', 'He thong, view tong hop, trigger, seed tham so va khoa quyen');
