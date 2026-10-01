BEGIN;

-- Ma tran v3 dung song song voi phan_quyen v2 trong giai doan doi soat PQ-11.
CREATE TABLE IF NOT EXISTS mua_hang.phan_quyen_loai_tk (
  ma_loai_tk varchar(40) NOT NULL REFERENCES mua_hang.loai_tai_khoan(ma),
  trang varchar(40) NOT NULL,
  duoc_xem boolean NOT NULL DEFAULT false,
  pham_vi_xem varchar(20) NOT NULL DEFAULT 'ca_nhan'
    CHECK (pham_vi_xem IN ('toan_bo','bo_phan','ca_nhan')),
  duoc_sua boolean NOT NULL DEFAULT false,
  pham_vi_sua varchar(20) NOT NULL DEFAULT 'ca_nhan'
    CHECK (pham_vi_sua IN ('toan_bo','bo_phan','ca_nhan')),
  kieu_sua varchar(16) NOT NULL DEFAULT 'THANG'
    CHECK (kieu_sua IN ('THANG','CAN_DUYET')),
  loai_tai_khoan_duyet varchar(40)[] NOT NULL DEFAULT '{}',
  phien_ban integer NOT NULL DEFAULT 1,
  nguoi_sua varchar(20),
  ngay_sua timestamptz,
  PRIMARY KEY (ma_loai_tk,trang),
  CHECK (duoc_sua=false OR duoc_xem=true),
  CHECK (kieu_sua='THANG' OR (duoc_sua AND cardinality(loai_tai_khoan_duyet)>0))
);

WITH trang(trang,nhom) AS (
  VALUES
    ('home','TRANG_CHU'),
    ('de_nghi','NGHIEP_VU'),('bao_gia','NGHIEP_VU'),
    ('don_hang','NGHIEP_VU'),('giao_nhan','NGHIEP_VU'),
    ('thanh_toan','NGHIEP_VU'),('dat_ngoai','NGHIEP_VU'),
    ('ncc','NCC'),('danh_muc','DANH_MUC'),('quan_tri','PHAN_QUYEN'),
    ('cong_viec','DIEU_HANH'),('tro_chuyen','DIEU_HANH'),
    ('hop_thu','DIEU_HANH'),('su_co','DIEU_HANH'),
    ('tien_ich','DIEU_HANH'),('bao_cao','DIEU_HANH'),
    ('xac_nhan_kt','XAC_NHAN_KT')
), quy_tac AS (
  SELECT l.ma AS ma_loai_tk,t.trang,t.nhom,
    CASE
      WHEN t.nhom='PHAN_QUYEN' THEN l.ma='QUAN_TRI_HE_THONG'
      ELSE true
    END AS duoc_xem,
    CASE WHEN l.ma='CHI_XEM' THEN 'bo_phan' ELSE 'toan_bo' END AS pham_vi_xem,
    CASE
      WHEN l.ma='QUAN_TRI_HE_THONG' THEN true
      WHEN t.nhom IN ('TRANG_CHU','PHAN_QUYEN','XAC_NHAN_KT') THEN false
      WHEN l.ma='BAN_LANH_DAO' THEN t.nhom<>'DANH_MUC'
      WHEN l.ma IN ('TRUONG_BO_PHAN','NHAN_VIEN') THEN true
      WHEN l.ma='KY_THUAT' THEN t.nhom<>'NCC'
      WHEN l.ma='KE_TOAN' THEN t.trang='thanh_toan'
      ELSE false
    END OR (l.ma='KY_THUAT' AND t.nhom='XAC_NHAN_KT') AS duoc_sua,
    CASE
      WHEN l.ma IN ('QUAN_TRI_HE_THONG','BAN_LANH_DAO','KE_TOAN')
        OR (l.ma='KY_THUAT' AND t.nhom='XAC_NHAN_KT') THEN 'toan_bo'
      WHEN t.nhom='DANH_MUC' OR l.ma='TRUONG_BO_PHAN' THEN 'bo_phan'
      ELSE 'ca_nhan'
    END AS pham_vi_sua,
    CASE
      WHEN t.nhom='DANH_MUC' AND l.ma IN ('TRUONG_BO_PHAN','NHAN_VIEN','KY_THUAT')
        OR t.nhom='NCC' AND l.ma IN ('TRUONG_BO_PHAN','NHAN_VIEN')
        THEN 'CAN_DUYET'
      ELSE 'THANG'
    END AS kieu_sua,
    CASE
      WHEN t.nhom='DANH_MUC' AND l.ma='TRUONG_BO_PHAN'
        THEN ARRAY['QUAN_TRI_HE_THONG']::varchar(40)[]
      WHEN t.nhom='DANH_MUC' AND l.ma IN ('NHAN_VIEN','KY_THUAT')
        THEN ARRAY['TRUONG_BO_PHAN']::varchar(40)[]
      WHEN t.nhom='NCC' AND l.ma IN ('TRUONG_BO_PHAN','NHAN_VIEN')
        THEN ARRAY['TRUONG_BO_PHAN']::varchar(40)[]
      ELSE '{}'::varchar(40)[]
    END AS loai_tai_khoan_duyet
  FROM mua_hang.loai_tai_khoan l CROSS JOIN trang t
)
INSERT INTO mua_hang.phan_quyen_loai_tk
  (ma_loai_tk,trang,duoc_xem,pham_vi_xem,duoc_sua,pham_vi_sua,
   kieu_sua,loai_tai_khoan_duyet)
SELECT ma_loai_tk,trang,duoc_xem,pham_vi_xem,duoc_sua,pham_vi_sua,
       kieu_sua,loai_tai_khoan_duyet
FROM quy_tac
ON CONFLICT (ma_loai_tk,trang) DO NOTHING;

DO $$
BEGIN
  IF (SELECT count(*) FROM mua_hang.phan_quyen_loai_tk) <> 119 THEN
    RAISE EXCEPTION 'Ma tran v3 phai co dung 7 x 17 = 119 o';
  END IF;
END $$;

INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES ('065','Ma tran quyen v3 7 loai tai khoan x 17 trang theo PQ-07')
ON CONFLICT (version) DO NOTHING;

COMMIT;
