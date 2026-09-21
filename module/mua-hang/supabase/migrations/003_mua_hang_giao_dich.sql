CREATE TABLE mua_hang.yeu_cau_bao_gia (
  id varchar(24) PRIMARY KEY, so_phieu_cu varchar(60),
  id_ncc varchar(20) NOT NULL REFERENCES mua_hang.nha_cung_cap(id) ON DELETE RESTRICT,
  ngay_gui date, han_tra_loi date, trang_thai varchar(30) NOT NULL DEFAULT 'NHAP', ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1
);
CREATE TABLE mua_hang.ycbg_dong (
  id varchar(24) PRIMARY KEY,
  id_ycbg varchar(24) NOT NULL REFERENCES mua_hang.yeu_cau_bao_gia(id) ON DELETE RESTRICT,
  id_de_nghi_dong varchar(24) REFERENCES mua_hang.de_nghi_dong(id) ON DELETE RESTRICT,
  stt_dong smallint NOT NULL CHECK (stt_dong > 0), ten_hang_chup varchar(300) NOT NULL,
  quy_cach text, dvt_chup varchar(20) NOT NULL, so_luong numeric(14,4) NOT NULL CHECK (so_luong > 0),
  ky_han_yc date, ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1,
  UNIQUE (id_ycbg, stt_dong)
);

CREATE TABLE mua_hang.bao_gia (
  id varchar(24) PRIMARY KEY,
  id_ycbg varchar(24) REFERENCES mua_hang.yeu_cau_bao_gia(id) ON DELETE RESTRICT,
  id_ncc varchar(20) NOT NULL REFERENCES mua_hang.nha_cung_cap(id) ON DELETE RESTRICT,
  ngay_bao_gia date, hieu_luc_den date, dieu_kien_thanh_toan text,
  thoi_gian_giao integer CHECK (thoi_gian_giao IS NULL OR thoi_gian_giao >= 0),
  duoc_chon boolean NOT NULL DEFAULT false, ly_do_chon text,
  mien_tru_2_bao_gia boolean NOT NULL DEFAULT false, ly_do_mien_tru text,
  trang_thai varchar(30) NOT NULL DEFAULT 'NHAP',
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1,
  CHECK ((mien_tru_2_bao_gia AND ly_do_mien_tru IS NOT NULL) OR NOT mien_tru_2_bao_gia)
);
CREATE TABLE mua_hang.bao_gia_dong (
  id varchar(24) PRIMARY KEY,
  id_bao_gia varchar(24) NOT NULL REFERENCES mua_hang.bao_gia(id) ON DELETE RESTRICT,
  id_de_nghi_dong varchar(24) REFERENCES mua_hang.de_nghi_dong(id) ON DELETE RESTRICT,
  stt_dong smallint NOT NULL CHECK (stt_dong > 0), ten_hang_chup varchar(300) NOT NULL,
  dvt_chup varchar(20) NOT NULL, so_luong numeric(14,4) NOT NULL CHECK (so_luong > 0),
  don_gia_co_so bigint NOT NULL CHECK (don_gia_co_so >= 0),
  don_vi_gia varchar(10) NOT NULL DEFAULT 'PCS',
  trong_luong numeric(14,4) CHECK (trong_luong IS NULL OR trong_luong > 0),
  thoi_gian_giao integer CHECK (thoi_gian_giao IS NULL OR thoi_gian_giao >= 0), ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1,
  UNIQUE (id_bao_gia, stt_dong),
  CHECK (don_vi_gia = 'PCS' OR trong_luong IS NOT NULL)
);

CREATE TABLE mua_hang.don_hang (
  id varchar(24) PRIMARY KEY, so_phieu_cu varchar(60),
  id_ncc varchar(20) NOT NULL REFERENCES mua_hang.nha_cung_cap(id) ON DELETE RESTRICT,
  id_bao_gia varchar(24) REFERENCES mua_hang.bao_gia(id) ON DELETE RESTRICT,
  loai varchar(20) NOT NULL CHECK (loai IN ('MUA_HANG','GIA_CONG_NGOAI')),
  ngay_dat date NOT NULL, ky_han_giao date, dieu_kien_thanh_toan text,
  phan_loai_cao_nhat varchar(20), cap_duyet_yeu_cau varchar(40),
  trang_thai varchar(30) NOT NULL DEFAULT 'NHAP',
  nguoi_kiem_tra varchar(20) REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  nguoi_duyet varchar(20) REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  ngay_duyet timestamptz, ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1
);
CREATE INDEX ix_don_hang_ngay ON mua_hang.don_hang(ngay_dat DESC);
CREATE INDEX ix_don_hang_ncc ON mua_hang.don_hang(id_ncc, trang_thai);
CREATE TABLE mua_hang.don_hang_dong (
  id varchar(24) PRIMARY KEY,
  id_don_hang varchar(24) NOT NULL REFERENCES mua_hang.don_hang(id) ON DELETE RESTRICT,
  id_de_nghi_dong varchar(24) REFERENCES mua_hang.de_nghi_dong(id) ON DELETE RESTRICT,
  stt_dong smallint NOT NULL CHECK (stt_dong > 0),
  id_vat_tu varchar(20) REFERENCES mua_hang.vat_tu(id) ON DELETE RESTRICT,
  ten_hang_chup varchar(300) NOT NULL, ten_ncc_ghi_tren_chung_tu varchar(300),
  dvt_chup varchar(20) NOT NULL, quy_cach text,
  so_luong numeric(14,4) NOT NULL CHECK (so_luong > 0),
  don_gia_co_so bigint NOT NULL CHECK (don_gia_co_so >= 0), don_vi_gia varchar(10) NOT NULL,
  trong_luong numeric(14,4) CHECK (trong_luong IS NULL OR trong_luong > 0),
  phan_loai_chup varchar(20), ky_han_giao date,
  so_luong_da_nhan numeric(14,4) NOT NULL DEFAULT 0 CHECK (so_luong_da_nhan >= 0),
  trang_thai_dong varchar(30) NOT NULL DEFAULT 'NHAP', ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1,
  UNIQUE (id_don_hang, stt_dong),
  CHECK (don_vi_gia = 'PCS' OR trong_luong IS NOT NULL)
);

CREATE TABLE mua_hang.cong_viec (
  id varchar(24) PRIMARY KEY, so_phieu_cu varchar(60),
  loai varchar(30) NOT NULL CHECK (loai IN ('XU_LY_DE_NGHI','LAY_BAO_GIA','THEO_DOI_GIAO','KHAC')),
  nguoi_giao varchar(20) NOT NULL REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  nguoi_nhan varchar(20) NOT NULL REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  ngay_giao date NOT NULL, han_xu_ly date, tieu_de varchar(300), noi_dung text,
  trang_thai varchar(30) NOT NULL DEFAULT 'MOI' CHECK (trang_thai IN ('MOI','DANG_LAM','XONG','HUY')),
  ngay_hoan_thanh timestamptz, phan_hoi text,
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1
);
CREATE TABLE mua_hang.cong_viec_dong (
  id varchar(24) PRIMARY KEY,
  id_cong_viec varchar(24) NOT NULL REFERENCES mua_hang.cong_viec(id) ON DELETE RESTRICT,
  id_de_nghi_dong varchar(24) REFERENCES mua_hang.de_nghi_dong(id) ON DELETE RESTRICT,
  stt_dong smallint NOT NULL CHECK (stt_dong > 0),
  UNIQUE (id_cong_viec, stt_dong)
);

CREATE TABLE mua_hang.nhan_hang (
  id varchar(24) PRIMARY KEY, so_phieu_cu varchar(60),
  id_don_hang varchar(24) REFERENCES mua_hang.don_hang(id) ON DELETE RESTRICT,
  id_ncc varchar(20) REFERENCES mua_hang.nha_cung_cap(id) ON DELETE RESTRICT,
  ngay_nhan date NOT NULL, lan_giao smallint NOT NULL DEFAULT 1 CHECK (lan_giao > 0),
  nguoi_nhan varchar(20) REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  ma_kho varchar(20), trang_thai varchar(30) NOT NULL DEFAULT 'DA_NHAN',
  ngay_ban_giao_chung_tu date, ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1
);
CREATE INDEX ix_nhan_hang_ngay ON mua_hang.nhan_hang(ngay_nhan DESC);
CREATE TABLE mua_hang.nhan_hang_dong (
  id varchar(24) PRIMARY KEY,
  id_nhan_hang varchar(24) NOT NULL REFERENCES mua_hang.nhan_hang(id) ON DELETE RESTRICT,
  id_don_hang_dong varchar(24) REFERENCES mua_hang.don_hang_dong(id) ON DELETE RESTRICT,
  stt_dong smallint NOT NULL CHECK (stt_dong > 0),
  id_vat_tu varchar(20) REFERENCES mua_hang.vat_tu(id) ON DELETE RESTRICT,
  ten_hang_chup varchar(300) NOT NULL, dvt_chup varchar(20) NOT NULL,
  so_luong_nhan numeric(14,4) NOT NULL CHECK (so_luong_nhan > 0),
  so_ngay_som_tre integer, ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1,
  UNIQUE (id_nhan_hang, stt_dong)
);
CREATE TABLE mua_hang.ket_qua_iqc (
  id varchar(24) PRIMARY KEY,
  id_nhan_hang_dong varchar(24) NOT NULL REFERENCES mua_hang.nhan_hang_dong(id) ON DELETE RESTRICT,
  nguoi_kiem varchar(20) NOT NULL REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  ngay_kiem date NOT NULL, so_luong_kiem numeric(14,4), so_luong_dat numeric(14,4),
  so_luong_khong_dat numeric(14,4),
  ket_luan varchar(20) NOT NULL CHECK (ket_luan IN ('DAT','KHONG_DAT','DAT_CO_DIEU_KIEN')),
  loi_phat_hien text, huong_xu_ly text, ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1,
  UNIQUE (id_nhan_hang_dong)
);
CREATE TABLE mua_hang.hang_khong_phu_hop (
  id varchar(24) PRIMARY KEY,
  id_ket_qua_iqc varchar(24) NOT NULL REFERENCES mua_hang.ket_qua_iqc(id) ON DELETE RESTRICT,
  id_ncc varchar(20) REFERENCES mua_hang.nha_cung_cap(id) ON DELETE RESTRICT,
  mo_ta text NOT NULL, huong_xu_ly text, ket_qua varchar(20),
  nguoi_giam_sat varchar(20) REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  ngay_dong date, trang_thai varchar(20) NOT NULL DEFAULT 'MO',
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1
);

CREATE TABLE mua_hang.yeu_cau_thanh_toan (
  id varchar(24) PRIMARY KEY,
  id_don_hang varchar(24) REFERENCES mua_hang.don_hang(id) ON DELETE RESTRICT,
  id_ncc varchar(20) NOT NULL REFERENCES mua_hang.nha_cung_cap(id) ON DELETE RESTRICT,
  nguoi_de_nghi varchar(20) NOT NULL REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  ngay_yeu_cau date NOT NULL, ly_do_thanh_toan varchar(200), hinh_thuc_thanh_toan varchar(200),
  ly_do_yeu_cau varchar(200), gia_tri_don_hang bigint CHECK (gia_tri_don_hang IS NULL OR gia_tri_don_hang >= 0),
  ky_han_thanh_toan date, tinh_trang_hang varchar(30),
  trang_thai varchar(20) NOT NULL DEFAULT 'CHUA_TT' CHECK (trang_thai IN ('CHUA_TT','TT_MOT_PHAN','DA_TT')),
  nguoi_lap varchar(20) REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  nguoi_duyet varchar(20) REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  ngay_duyet timestamptz, ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1
);
CREATE TABLE mua_hang.dot_thanh_toan (
  id varchar(24) PRIMARY KEY,
  id_yctt varchar(24) NOT NULL REFERENCES mua_hang.yeu_cau_thanh_toan(id) ON DELETE RESTRICT,
  dot_so smallint NOT NULL CHECK (dot_so > 0), so_tien bigint NOT NULL CHECK (so_tien > 0),
  ngay_du_kien date, ngay_thuc_te date,
  trang_thai varchar(20) NOT NULL DEFAULT 'CHUA_TT' CHECK (trang_thai IN ('CHUA_TT','DA_TT')),
  ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1,
  UNIQUE (id_yctt, dot_so)
);

CREATE TABLE mua_hang.ban_giao_chung_tu (
  id varchar(24) PRIMARY KEY, ngay_ban_giao date NOT NULL,
  nguoi_ban_giao varchar(20) REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  nguoi_nhan varchar(20) REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  trang_thai varchar(20) NOT NULL DEFAULT 'DA_BAN_GIAO', ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1
);
CREATE TABLE mua_hang.bgct_dong (
  id varchar(24) PRIMARY KEY,
  id_bgct varchar(24) NOT NULL REFERENCES mua_hang.ban_giao_chung_tu(id) ON DELETE RESTRICT,
  id_nhan_hang varchar(24) REFERENCES mua_hang.nhan_hang(id) ON DELETE RESTRICT,
  id_ncc varchar(20) REFERENCES mua_hang.nha_cung_cap(id) ON DELETE RESTRICT,
  so_pgh varchar(60), ngay_nhan_hang date, ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1
);

CREATE TABLE mua_hang.dieu_xe (
  id varchar(24) PRIMARY KEY, so_phieu_cu varchar(60),
  hang_muc varchar(30) NOT NULL, chieu varchar(30) NOT NULL,
  khan varchar(20) NOT NULL DEFAULT 'BINH_THUONG' CHECK (khan IN ('BINH_THUONG','GAP')),
  nguoi_de_nghi varchar(20) NOT NULL REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  ma_bo_phan varchar(10) REFERENCES mua_hang.bo_phan(ma_bo_phan) ON DELETE RESTRICT,
  ngay_lap_phieu date NOT NULL, thoi_diem_gui timestamptz, tre_gio_chot boolean NOT NULL DEFAULT false,
  ngay_dieu_xe date NOT NULL, ma_xe varchar(20) REFERENCES mua_hang.xe(ma_xe) ON DELETE RESTRICT,
  tai_xe varchar(20) REFERENCES mua_hang.tai_xe(ma_nhan_vien) ON DELETE RESTRICT, phu_xe varchar(20),
  id_doi_tac varchar(20), loai_doi_tac varchar(10) CHECK (loai_doi_tac IS NULL OR loai_doi_tac IN ('NCC','KH')),
  dia_chi text, khu_vuc varchar(60), vung varchar(30), so_km numeric(8,1) CHECK (so_km IS NULL OR so_km >= 0),
  so_chuyen smallint NOT NULL DEFAULT 1 CHECK (so_chuyen > 0),
  thoi_gian_toi_noi_phut integer CHECK (thoi_gian_toi_noi_phut IS NULL OR thoi_gian_toi_noi_phut >= 0),
  so_tien_thanh_toan bigint CHECK (so_tien_thanh_toan IS NULL OR so_tien_thanh_toan >= 0),
  trang_thai varchar(20) NOT NULL DEFAULT 'CHUA_XU_LY'
    CHECK (trang_thai IN ('CHUA_XU_LY','DANG_XU_LY','HOAN_THANH','HUY')),
  ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1
);
CREATE TABLE mua_hang.dieu_xe_dong (
  id varchar(24) PRIMARY KEY,
  id_dieu_xe varchar(24) NOT NULL REFERENCES mua_hang.dieu_xe(id) ON DELETE RESTRICT,
  stt_dong smallint NOT NULL CHECK (stt_dong > 0), noi_dung text NOT NULL, kich_thuoc text,
  so_luong numeric(14,4) CHECK (so_luong IS NULL OR so_luong > 0), dvt varchar(20),
  id_de_nghi_dong varchar(24) REFERENCES mua_hang.de_nghi_dong(id) ON DELETE RESTRICT, ghi_chu text,
  UNIQUE (id_dieu_xe, stt_dong)
);

CREATE TABLE mua_hang.danh_gia_ncc (
  id varchar(24) PRIMARY KEY,
  id_ncc varchar(20) NOT NULL REFERENCES mua_hang.nha_cung_cap(id) ON DELETE RESTRICT,
  loai varchar(20) NOT NULL CHECK (loai IN ('BAN_DAU','DINH_KY')),
  ky_danh_gia varchar(20), ngay_danh_gia date NOT NULL,
  nguoi_danh_gia varchar(20) NOT NULL REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  diem_chat_luong numeric(5,2), diem_giao_hang numeric(5,2), diem_gia_ca numeric(5,2),
  diem_thanh_toan numeric(5,2), diem_dich_vu numeric(5,2), diem_tam_voc numeric(5,2),
  diem_thoi_gian_hop_tac numeric(5,2), diem_gia_tri_giao_dich numeric(5,2),
  diem_tong numeric(5,2), xep_loai varchar(10) CHECK (xep_loai IS NULL OR xep_loai IN ('A','B','C')),
  ty_le_dung_han numeric(5,2), ty_le_iqc_dat numeric(5,2), so_lan_khong_phu_hop integer,
  ket_luan varchar(20), hanh_dong_xu_ly text, ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1,
  CHECK (diem_tong IS NULL OR diem_tong BETWEEN 0 AND 100),
  CHECK (ty_le_dung_han IS NULL OR ty_le_dung_han BETWEEN 0 AND 100),
  CHECK (ty_le_iqc_dat IS NULL OR ty_le_iqc_dat BETWEEN 0 AND 100)
);

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('003', 'Bao gia, don hang, giao nhan, thanh toan, dieu xe va danh gia NCC');
