CREATE TABLE mua_hang.vai_tro (
  ma varchar(40) PRIMARY KEY,
  ten varchar(100) NOT NULL,
  thu_tu integer,
  mo_ta text
);

CREATE TABLE mua_hang.phan_quyen (
  vai_tro varchar(40) NOT NULL REFERENCES mua_hang.vai_tro(ma) ON DELETE RESTRICT,
  trang varchar(40) NOT NULL,
  duoc_xem boolean NOT NULL DEFAULT false,
  duoc_sua boolean NOT NULL DEFAULT false,
  duoc_duyet boolean NOT NULL DEFAULT false,
  duoc_xuat boolean NOT NULL DEFAULT false,
  pham_vi varchar(20) NOT NULL DEFAULT 'ca_nhan'
    CHECK (pham_vi IN ('toan_bo','bo_phan','ca_nhan')),
  PRIMARY KEY (vai_tro, trang)
);

CREATE TABLE mua_hang.tai_khoan (
  ma_tai_khoan varchar(60) PRIMARY KEY,
  ma_nhan_vien varchar(20) NOT NULL UNIQUE REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  ho_va_ten varchar(120) NOT NULL,
  ma_bo_phan varchar(10) NOT NULL REFERENCES mua_hang.bo_phan(ma_bo_phan) ON DELETE RESTRICT,
  vai_tro varchar(40) NOT NULL REFERENCES mua_hang.vai_tro(ma) ON DELETE RESTRICT,
  mat_khau_hash varchar(120) NOT NULL,
  trang_thai varchar(20) NOT NULL DEFAULT 'CHO_DUYET'
    CHECK (trang_thai IN ('CHO_DUYET','HOAT_DONG','KHOA')),
  lan_dang_nhap_cuoi timestamptz,
  ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1
);

CREATE TABLE mua_hang.phien_dang_nhap (
  token varchar(64) PRIMARY KEY,
  ma_tai_khoan varchar(60) NOT NULL REFERENCES mua_hang.tai_khoan(ma_tai_khoan) ON DELETE CASCADE,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  het_han timestamptz NOT NULL,
  ip varchar(45),
  thiet_bi text,
  CHECK (het_han > tao_luc)
);
CREATE INDEX ix_phien_dang_nhap_tai_khoan ON mua_hang.phien_dang_nhap(ma_tai_khoan, het_han);

CREATE TABLE mua_hang.de_nghi (
  id varchar(24) PRIMARY KEY,
  loai varchar(20) NOT NULL CHECK (loai IN ('MUA_HANG','GIA_CONG_NGOAI')),
  so_phieu_cu varchar(60),
  ma_bo_phan varchar(10) NOT NULL REFERENCES mua_hang.bo_phan(ma_bo_phan) ON DELETE RESTRICT,
  nguoi_yeu_cau varchar(20) NOT NULL REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  thoi_diem_gui timestamptz,
  ngay_hieu_luc date,
  tre_gio_chot boolean NOT NULL DEFAULT false,
  muc_do_uu_tien smallint CHECK (muc_do_uu_tien IS NULL OR muc_do_uu_tien BETWEEN 1 AND 3),
  tinh_trang_yc varchar(30) NOT NULL DEFAULT 'BINH_THUONG'
    CHECK (tinh_trang_yc IN ('BINH_THUONG','HANG_KHAN_CAP','KHAN_CAP_NG','HANG_NG')),
  trang_thai varchar(30) NOT NULL DEFAULT 'NHAP',
  ly_do_tra_lai text,
  nguoi_duyet_bp varchar(20) REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  ngay_duyet_bp timestamptz,
  duyet_online boolean NOT NULL DEFAULT false,
  ngay_ky_bu date,
  nguoi_mua_hang varchar(20) REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1,
  CHECK ((trang_thai = 'NHAP' AND thoi_diem_gui IS NULL) OR trang_thai = 'NHAP' OR thoi_diem_gui IS NOT NULL)
);
CREATE INDEX ix_de_nghi_trang_thai ON mua_hang.de_nghi(trang_thai);
CREATE INDEX ix_de_nghi_bo_phan ON mua_hang.de_nghi(ma_bo_phan, ngay_hieu_luc DESC);
CREATE INDEX ix_de_nghi_nguoi_mua ON mua_hang.de_nghi(nguoi_mua_hang, trang_thai);

CREATE TABLE mua_hang.de_nghi_dong (
  id varchar(24) PRIMARY KEY,
  id_de_nghi varchar(24) NOT NULL REFERENCES mua_hang.de_nghi(id) ON DELETE RESTRICT,
  stt_dong smallint NOT NULL CHECK (stt_dong > 0),
  id_sp_cu varchar(30),
  id_vt_de_nghi varchar(20) REFERENCES mua_hang.vat_tu(id) ON DELETE RESTRICT,
  id_vt_duyet_mua varchar(20) REFERENCES mua_hang.vat_tu(id) ON DELETE RESTRICT,
  ten_hang_chup varchar(300) NOT NULL,
  dvt_chup varchar(20) NOT NULL,
  phan_loai_chup varchar(20) NOT NULL,
  quy_cach text,
  ma_chung_loai varchar(20) REFERENCES mua_hang.chung_loai(ma_chung_loai) ON DELETE RESTRICT,
  muc_dich_su_dung varchar(20) REFERENCES mua_hang.muc_dich_su_dung(ma) ON DELETE RESTRICT,
  so_luong numeric(14,4) NOT NULL CHECK (so_luong > 0),
  ky_han_yc date NOT NULL,
  tra_loi_ky_han date,
  lenh_san_xuat varchar(60) REFERENCES mua_hang.lenh_san_xuat(lenh_san_xuat) ON DELETE RESTRICT,
  ma_vach varchar(40) REFERENCES mua_hang.lsx_dong(ma_vach) ON DELETE RESTRICT,
  ma_cong_doan varchar(20) REFERENCES mua_hang.cong_doan(ma_cong_doan) ON DELETE RESTRICT,
  noi_dung_gia_cong text,
  bat_kha_thi boolean NOT NULL DEFAULT false,
  can_xac_nhan_kt boolean NOT NULL DEFAULT false,
  trang_thai_dong varchar(30) NOT NULL DEFAULT 'NHAP',
  ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1,
  UNIQUE (id_de_nghi, stt_dong)
);
CREATE INDEX ix_de_nghi_dong_vat_tu ON mua_hang.de_nghi_dong(id_vt_duyet_mua);
CREATE INDEX ix_de_nghi_dong_lsx ON mua_hang.de_nghi_dong(lenh_san_xuat);
CREATE INDEX ix_de_nghi_dong_ma_vach ON mua_hang.de_nghi_dong(ma_vach);

CREATE TABLE mua_hang.doi_vat_lieu (
  id varchar(24) PRIMARY KEY,
  id_de_nghi_dong varchar(24) NOT NULL REFERENCES mua_hang.de_nghi_dong(id) ON DELETE RESTRICT,
  id_vt_tu varchar(20) REFERENCES mua_hang.vat_tu(id) ON DELETE RESTRICT,
  id_vt_sang varchar(20) REFERENCES mua_hang.vat_tu(id) ON DELETE RESTRICT,
  ten_tu varchar(300) NOT NULL,
  ten_sang varchar(300) NOT NULL,
  noi_dung_yeu_cau text NOT NULL,
  ly_do text,
  nguoi_yeu_cau varchar(20) NOT NULL REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  nguoi_duyet varchar(20) REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  thoi_diem_duyet timestamptz,
  trang_thai varchar(20) NOT NULL DEFAULT 'CHO_DUYET'
    CHECK (trang_thai IN ('CHO_DUYET','DONG_Y','TU_CHOI')),
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1
);

CREATE TABLE mua_hang.yeu_cau_huy (
  id varchar(24) PRIMARY KEY,
  id_de_nghi_dong varchar(24) NOT NULL REFERENCES mua_hang.de_nghi_dong(id) ON DELETE RESTRICT,
  ly_do text NOT NULL,
  nguoi_yeu_cau varchar(20) NOT NULL REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  nguoi_duyet varchar(20) REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  thoi_diem_duyet timestamptz,
  trang_thai varchar(20) NOT NULL DEFAULT 'CHO_DUYET'
    CHECK (trang_thai IN ('CHO_DUYET','DONG_Y','TU_CHOI')),
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1
);

CREATE TABLE mua_hang.yeu_cau_cap_ma (
  id varchar(24) PRIMARY KEY,
  id_de_nghi_dong varchar(24) REFERENCES mua_hang.de_nghi_dong(id) ON DELETE RESTRICT,
  ten_de_xuat varchar(300) NOT NULL,
  quy_cach text,
  dvt_de_xuat varchar(20) REFERENCES mua_hang.don_vi_tinh(dvt) ON DELETE RESTRICT,
  ma_chung_loai varchar(20) REFERENCES mua_hang.chung_loai(ma_chung_loai) ON DELETE RESTRICT,
  ghi_chu text,
  nguoi_yeu_cau varchar(20) NOT NULL REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  id_vat_tu_cap varchar(20) REFERENCES mua_hang.vat_tu(id) ON DELETE RESTRICT,
  nguoi_cap varchar(20) REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  thoi_diem_cap timestamptz,
  trang_thai varchar(20) NOT NULL DEFAULT 'CHO_CAP'
    CHECK (trang_thai IN ('CHO_CAP','DA_CAP','TU_CHOI')),
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1
);

CREATE TABLE mua_hang.dat_ngoai (
  id varchar(24) PRIMARY KEY,
  lenh_san_xuat varchar(60) NOT NULL REFERENCES mua_hang.lenh_san_xuat(lenh_san_xuat) ON DELETE RESTRICT,
  id_ncc varchar(20) REFERENCES mua_hang.nha_cung_cap(id) ON DELETE RESTRICT,
  nguoi_lap varchar(20) NOT NULL REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  ngay_lap date NOT NULL,
  ky_han date,
  trang_thai varchar(30) NOT NULL DEFAULT 'NHAP',
  nguoi_duyet varchar(20) REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  ngay_duyet timestamptz,
  ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1
);

CREATE TABLE mua_hang.dat_ngoai_dong (
  id varchar(24) PRIMARY KEY,
  id_dat_ngoai varchar(24) NOT NULL REFERENCES mua_hang.dat_ngoai(id) ON DELETE RESTRICT,
  stt_dong smallint NOT NULL CHECK (stt_dong > 0),
  ma_vach varchar(40) REFERENCES mua_hang.lsx_dong(ma_vach) ON DELETE RESTRICT,
  ma_hang varchar(60),
  ten_hang_chup varchar(300) NOT NULL,
  dvt_chup varchar(20) NOT NULL,
  so_luong numeric(14,4) NOT NULL CHECK (so_luong > 0),
  don_gia bigint CHECK (don_gia IS NULL OR don_gia >= 0),
  ky_han date,
  ngay_nhan date,
  trang_thai_dong varchar(30) NOT NULL DEFAULT 'NHAP',
  ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1,
  UNIQUE (id_dat_ngoai, stt_dong)
);

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('002', 'Tai khoan tu quan, phan quyen va luong de nghi');
