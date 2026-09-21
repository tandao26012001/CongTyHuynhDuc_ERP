CREATE SCHEMA IF NOT EXISTS mua_hang;
REVOKE ALL ON SCHEMA mua_hang FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE TABLE mua_hang.schema_migrations (
  version varchar(20) PRIMARY KEY,
  mo_ta text NOT NULL,
  ap_dung_luc timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION mua_hang.tang_phien_ban()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, mua_hang AS $$
BEGIN
  NEW.ngay_sua := now();
  NEW.phien_ban := OLD.phien_ban + 1;
  RETURN NEW;
END;
$$;

CREATE TABLE mua_hang.don_vi_tinh (
  dvt varchar(20) PRIMARY KEY,
  ten_dvt varchar(60) NOT NULL,
  so_le smallint NOT NULL DEFAULT 0 CHECK (so_le BETWEEN 0 AND 4),
  trang_thai varchar(20) NOT NULL DEFAULT 'HOAT_DONG'
    CHECK (trang_thai IN ('HOAT_DONG','NGUNG'))
);

CREATE TABLE mua_hang.chung_loai (
  ma_chung_loai varchar(20) PRIMARY KEY,
  ten varchar(100) NOT NULL UNIQUE,
  thu_tu integer
);

CREATE TABLE mua_hang.muc_dich_su_dung (
  ma varchar(20) PRIMARY KEY,
  ten varchar(100) NOT NULL,
  thu_tu integer
);

CREATE TABLE mua_hang.bo_phan (
  ma_bo_phan varchar(10) PRIMARY KEY,
  ten varchar(100) NOT NULL,
  loai varchar(20),
  thu_tu integer,
  trang_thai varchar(20) NOT NULL DEFAULT 'HOAT_DONG'
    CHECK (trang_thai IN ('HOAT_DONG','NGUNG'))
);

CREATE TABLE mua_hang.nhan_vien (
  ma_nhan_vien varchar(20) PRIMARY KEY,
  ho_va_ten varchar(120) NOT NULL,
  ma_bo_phan varchar(10) REFERENCES mua_hang.bo_phan(ma_bo_phan) ON DELETE RESTRICT,
  chuc_vu varchar(80),
  ngay_vao_lam date,
  trang_thai varchar(20) NOT NULL DEFAULT 'HOAT_DONG'
    CHECK (trang_thai IN ('HOAT_DONG','NGHI_VIEC','TAM_NGHI')),
  ghi_chu text
);

CREATE TABLE mua_hang.loai_gia_cong (
  ma varchar(20) PRIMARY KEY,
  ten varchar(100) NOT NULL UNIQUE,
  so_ngay_chuan integer NOT NULL CHECK (so_ngay_chuan >= 0),
  ma_cong_doan varchar(20),
  ghi_chu text
);

CREATE TABLE mua_hang.vat_tu (
  id varchar(20) PRIMARY KEY,
  ma_vat_tu varchar(40) UNIQUE,
  ten_hang varchar(300) NOT NULL UNIQUE,
  ten_khong_dau varchar(300) NOT NULL,
  dvt varchar(20) NOT NULL REFERENCES mua_hang.don_vi_tinh(dvt) ON DELETE RESTRICT,
  ma_chung_loai varchar(20) REFERENCES mua_hang.chung_loai(ma_chung_loai) ON DELETE RESTRICT,
  phan_loai varchar(20) NOT NULL DEFAULT 'THONG_DUNG_SX'
    CHECK (phan_loai IN ('THONG_DUNG_SX','THONG_DUNG_BTBD','CHUYEN_DUNG')),
  kho varchar(10),
  loai_phoi varchar(4) CHECK (loai_phoi IS NULL OR loai_phoi IN ('NC','LC','TN','TL','PT','PL')),
  id_vt_goc varchar(20) REFERENCES mua_hang.vat_tu(id) ON DELETE RESTRICT,
  quy_cach text,
  khoi_luong_rieng numeric(6,3) CHECK (khoi_luong_rieng IS NULL OR khoi_luong_rieng > 0),
  nguon_so_huu varchar(20) NOT NULL DEFAULT 'KHO_VAN',
  trang_thai varchar(20) NOT NULL DEFAULT 'HOAT_DONG'
    CHECK (trang_thai IN ('HOAT_DONG','NGUNG','DA_GOP')),
  id_gop_ve varchar(20) REFERENCES mua_hang.vat_tu(id) ON DELETE RESTRICT,
  ten_hang_cu text,
  ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(),
  nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz,
  nguoi_sua varchar(20),
  phien_ban integer NOT NULL DEFAULT 1 CHECK (phien_ban > 0),
  CHECK (id_vt_goc IS NULL OR id_vt_goc <> id),
  CHECK (id_gop_ve IS NULL OR id_gop_ve <> id),
  CHECK ((trang_thai = 'DA_GOP' AND id_gop_ve IS NOT NULL) OR trang_thai <> 'DA_GOP')
);
CREATE INDEX ix_vat_tu_ten_trgm ON mua_hang.vat_tu
  USING gin (ten_khong_dau extensions.gin_trgm_ops);
CREATE INDEX ix_vat_tu_chung_loai ON mua_hang.vat_tu(ma_chung_loai);

CREATE TABLE mua_hang.khach_hang (
  id varchar(20) PRIMARY KEY,
  ma_khach_hang varchar(40) NOT NULL UNIQUE,
  ten varchar(300) NOT NULL,
  dia_chi text,
  nguoi_lien_he varchar(120),
  sdt varchar(40),
  email varchar(120),
  trang_thai varchar(20) NOT NULL DEFAULT 'HOAT_DONG'
    CHECK (trang_thai IN ('HOAT_DONG','NGUNG')),
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1
);

CREATE TABLE mua_hang.nha_cung_cap (
  id varchar(20) PRIMARY KEY,
  ma_ncc varchar(40) NOT NULL UNIQUE,
  ten varchar(300) NOT NULL,
  ten_khong_dau varchar(300) NOT NULL,
  mst varchar(20), dia_chi text, nguoi_lien_he varchar(120),
  sdt varchar(40), sdt_2 varchar(40), fax varchar(40), email varchar(120), mat_hang text,
  la_ncc_mua_hang boolean NOT NULL DEFAULT false,
  la_ncc_gia_cong boolean NOT NULL DEFAULT false,
  co_hoa_don boolean, cong_no text, tien_mat text,
  nganh_nghe varchar(60),
  ma_loai_gia_cong varchar(20) REFERENCES mua_hang.loai_gia_cong(ma) ON DELETE RESTRICT,
  vung varchar(60), so_km numeric(8,1) CHECK (so_km IS NULL OR so_km >= 0),
  ky_han_quy_dinh integer CHECK (ky_han_quy_dinh IS NULL OR ky_han_quy_dinh >= 0),
  da_phe_duyet boolean NOT NULL DEFAULT false,
  ngay_phe_duyet date,
  phan_loai_ncc varchar(20) CHECK (phan_loai_ncc IS NULL OR phan_loai_ncc IN ('A','B','C')),
  trang_thai varchar(20) NOT NULL DEFAULT 'HOAT_DONG'
    CHECK (trang_thai IN ('HOAT_DONG','CANH_BAO','TAM_NGUNG','LOAI_BO')),
  ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1,
  CHECK (la_ncc_mua_hang OR la_ncc_gia_cong),
  CHECK ((da_phe_duyet AND ngay_phe_duyet IS NOT NULL) OR NOT da_phe_duyet)
);
CREATE INDEX ix_nha_cung_cap_ten_trgm ON mua_hang.nha_cung_cap
  USING gin (ten_khong_dau extensions.gin_trgm_ops);

CREATE TABLE mua_hang.cong_doan (
  ma_cong_doan varchar(20) PRIMARY KEY,
  ten_cong_doan varchar(120) NOT NULL,
  mo_ta text,
  thu_tu integer
);
ALTER TABLE mua_hang.loai_gia_cong ADD CONSTRAINT fk_loai_gc_cong_doan
  FOREIGN KEY (ma_cong_doan) REFERENCES mua_hang.cong_doan(ma_cong_doan) ON DELETE RESTRICT;

CREATE TABLE mua_hang.lenh_san_xuat (
  lenh_san_xuat varchar(60) PRIMARY KEY,
  so_po varchar(40),
  ma_khach_hang varchar(40),
  ki_han_khach_hang date,
  muc_do_uu_tien smallint CHECK (muc_do_uu_tien IS NULL OR muc_do_uu_tien BETWEEN 1 AND 3),
  ngay_nhan_lenh date,
  trang_thai_don varchar(30),
  ghi_chu text
);

CREATE TABLE mua_hang.lsx_dong (
  ma_vach varchar(40) PRIMARY KEY,
  lenh_san_xuat varchar(60) NOT NULL REFERENCES mua_hang.lenh_san_xuat(lenh_san_xuat) ON DELETE RESTRICT,
  ma_hang varchar(60) NOT NULL,
  ten_hang varchar(300),
  so_luong_po numeric(14,4) CHECK (so_luong_po IS NULL OR so_luong_po > 0),
  dvt varchar(20)
);
CREATE INDEX ix_lsx_dong_ma_hang ON mua_hang.lsx_dong(ma_hang);
CREATE INDEX ix_lsx_dong_lenh ON mua_hang.lsx_dong(lenh_san_xuat);

CREATE TABLE mua_hang.lich_nghi (
  id varchar(20) PRIMARY KEY,
  ngay_bat_dau date NOT NULL,
  ngay_ket_thuc date NOT NULL,
  ma varchar(20) NOT NULL DEFAULT 'ALL',
  ten varchar(120),
  loai_nghi varchar(20) NOT NULL CHECK (loai_nghi IN ('CHU_NHAT','NGHI_LE','NGHI_TET','NGHI_PHEP','KHAC')),
  ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1,
  CHECK (ngay_ket_thuc >= ngay_bat_dau)
);

CREATE TABLE mua_hang.tham_so_he_thong (
  ma varchar(50) PRIMARY KEY,
  gia_tri text NOT NULL,
  kieu varchar(20) NOT NULL CHECK (kieu IN ('TEXT','INTEGER','NUMERIC','BOOLEAN','TIME')),
  mo_ta text,
  nhom varchar(40),
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL DEFAULT 'SYSTEM',
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1
);

CREATE TABLE mua_hang.anh_xa_tien_to (
  tien_to_cu varchar(20) PRIMARY KEY,
  ma_bo_phan varchar(10) NOT NULL REFERENCES mua_hang.bo_phan(ma_bo_phan) ON DELETE RESTRICT,
  ghi_chu text
);

CREATE TABLE mua_hang.xe (
  ma_xe varchar(20) PRIMARY KEY,
  loai_xe varchar(40) NOT NULL,
  bien_so varchar(20),
  nhom_xe varchar(40),
  trang_thai varchar(20) NOT NULL DEFAULT 'HOAT_DONG'
);

CREATE TABLE mua_hang.tai_xe (
  ma_nhan_vien varchar(20) PRIMARY KEY REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  ho_va_ten varchar(120) NOT NULL,
  trang_thai varchar(20) NOT NULL DEFAULT 'HOAT_DONG'
);

CREATE TABLE mua_hang.vat_lieu_tinh_toan (
  ma varchar(20) PRIMARY KEY,
  ten varchar(100) NOT NULL,
  khoi_luong_rieng numeric(6,3) NOT NULL CHECK (khoi_luong_rieng > 0),
  don_gia_tham_khao bigint CHECK (don_gia_tham_khao IS NULL OR don_gia_tham_khao >= 0),
  don_vi_gia varchar(10) NOT NULL DEFAULT 'KG'
);

CREATE TABLE mua_hang.mau_son_khach_hang (
  id varchar(20) PRIMARY KEY,
  ma_khach_hang varchar(40) NOT NULL,
  ma_mau_khach varchar(60) NOT NULL,
  ma_mau_hd varchar(60) NOT NULL,
  ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1,
  FOREIGN KEY (ma_khach_hang) REFERENCES mua_hang.khach_hang(ma_khach_hang) ON DELETE RESTRICT,
  UNIQUE (ma_khach_hang, ma_mau_khach)
);

CREATE TABLE mua_hang.bo_dem_chung_tu (
  tien_to varchar(10) NOT NULL,
  nam smallint NOT NULL CHECK (nam BETWEEN 2000 AND 9999),
  so_hien_tai integer NOT NULL CHECK (so_hien_tai >= 0),
  PRIMARY KEY (tien_to, nam)
);

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('001', 'Nen tang, danh muc va du lieu doc tu he khac');
