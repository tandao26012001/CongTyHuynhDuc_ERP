-- Tu bo sung cac phu thuoc cua F3 cho database chua chay deploy_mua_hang.sql.
CREATE SCHEMA IF NOT EXISTS mua_hang;
CREATE TABLE IF NOT EXISTS mua_hang.schema_migrations (
  version varchar(20) PRIMARY KEY,
  mo_ta text NOT NULL,
  ap_dung_luc timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS mua_hang.bo_phan (
  ma_bo_phan varchar(10) PRIMARY KEY,
  ten varchar(100) NOT NULL,
  loai varchar(20), thu_tu integer,
  trang_thai varchar(20) NOT NULL DEFAULT 'HOAT_DONG'
);
CREATE TABLE IF NOT EXISTS mua_hang.nhan_vien (
  ma_nhan_vien varchar(20) PRIMARY KEY,
  ho_va_ten varchar(120) NOT NULL,
  ma_bo_phan varchar(10) REFERENCES mua_hang.bo_phan(ma_bo_phan) ON DELETE RESTRICT,
  chuc_vu varchar(80), ngay_vao_lam date,
  trang_thai varchar(20) NOT NULL DEFAULT 'HOAT_DONG', ghi_chu text
);
CREATE TABLE IF NOT EXISTS mua_hang.lenh_san_xuat (
  lenh_san_xuat varchar(60) PRIMARY KEY, so_po varchar(40), ma_khach_hang varchar(40),
  ki_han_khach_hang date, muc_do_uu_tien smallint, ngay_nhan_lenh date,
  trang_thai_don varchar(30), ghi_chu text, ma_bo_phan varchar(20),
  ten_khach_hang_chup varchar(300), so_so varchar(60), ngay_so date
);
CREATE TABLE IF NOT EXISTS mua_hang.lsx_dong (
  ma_vach varchar(40) PRIMARY KEY,
  lenh_san_xuat varchar(60) NOT NULL REFERENCES mua_hang.lenh_san_xuat(lenh_san_xuat) ON DELETE RESTRICT,
  ma_hang varchar(60) NOT NULL, ten_hang varchar(300), so_luong_po numeric(14,4),
  dvt varchar(20), ma_cong_doan varchar(20), ma_ban_ve varchar(60), ghi_chu text
);
CREATE TABLE IF NOT EXISTS mua_hang.dat_ngoai (
  id varchar(24) PRIMARY KEY,
  lenh_san_xuat varchar(60) NOT NULL REFERENCES mua_hang.lenh_san_xuat(lenh_san_xuat) ON DELETE RESTRICT,
  id_ncc varchar(20), nguoi_lap varchar(20) NOT NULL,
  ngay_lap date NOT NULL DEFAULT current_date, ky_han date,
  trang_thai varchar(30) NOT NULL DEFAULT 'DANG_BAO_GIA',
  nguoi_duyet varchar(20), ngay_duyet timestamptz, ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1,
  can_xac_nhan_ky_thuat boolean NOT NULL DEFAULT false, noi_dung_ky_thuat text,
  nguoi_xac_nhan_ky_thuat varchar(20), xac_nhan_ky_thuat_luc timestamptz,
  ten_ncc_chup varchar(200), ngay_dat timestamptz, ngay_nhan timestamptz,
  ngay_hoan_thanh timestamptz, ly_do_huy text
);
CREATE TABLE IF NOT EXISTS mua_hang.dat_ngoai_dong (
  id varchar(24) PRIMARY KEY,
  id_dat_ngoai varchar(24) NOT NULL REFERENCES mua_hang.dat_ngoai(id) ON DELETE RESTRICT,
  stt_dong smallint NOT NULL CHECK (stt_dong > 0),
  ma_vach varchar(40) REFERENCES mua_hang.lsx_dong(ma_vach) ON DELETE RESTRICT,
  ma_hang varchar(60), ten_hang_chup varchar(300) NOT NULL,
  dvt_chup varchar(20) NOT NULL, so_luong numeric(14,4) NOT NULL CHECK (so_luong > 0),
  don_gia bigint, ky_han date, ngay_nhan date,
  trang_thai_dong varchar(30) NOT NULL DEFAULT 'DANG_BAO_GIA', ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1,
  UNIQUE(id_dat_ngoai,stt_dong)
);
CREATE TABLE IF NOT EXISTS mua_hang.dat_ngoai_lich_su (
  id bigserial PRIMARY KEY,
  id_dat_ngoai varchar(24) NOT NULL REFERENCES mua_hang.dat_ngoai(id) ON DELETE RESTRICT,
  trang_thai_cu varchar(30), trang_thai_moi varchar(30) NOT NULL,
  noi_dung text, nguoi_thuc_hien varchar(20) NOT NULL, thoi_diem timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS mua_hang.su_co (
  id varchar(24) PRIMARY KEY, loai varchar(40) NOT NULL, muc_do varchar(20),
  bang varchar(40), id_ban_ghi varchar(24), mo_ta text NOT NULL,
  nguoi_bao varchar(20), thoi_diem timestamptz NOT NULL DEFAULT now(),
  huong_xu_ly text, nguoi_xu_ly varchar(20), ngay_dong date,
  trang_thai varchar(20) NOT NULL DEFAULT 'MO',
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS mua_hang.trao_doi (
  id varchar(24) PRIMARY KEY, bang varchar(40) NOT NULL, id_ban_ghi varchar(24) NOT NULL,
  noi_dung text NOT NULL, nguoi_gui varchar(20) NOT NULL,
  thoi_diem timestamptz NOT NULL DEFAULT now(),
  id_tra_loi_cho varchar(24) REFERENCES mua_hang.trao_doi(id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS mua_hang.tep_dinh_kem (
  id varchar(24) PRIMARY KEY, bang varchar(40) NOT NULL, id_ban_ghi varchar(24) NOT NULL,
  ten_tep varchar(300) NOT NULL, duong_dan text NOT NULL, kich_thuoc bigint,
  loai_mime varchar(100), nguoi_tai_len varchar(20) NOT NULL,
  thoi_diem timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mua_hang.lenh_san_xuat
  ADD COLUMN IF NOT EXISTS so_po varchar(40),
  ADD COLUMN IF NOT EXISTS ma_khach_hang varchar(40),
  ADD COLUMN IF NOT EXISTS ki_han_khach_hang date,
  ADD COLUMN IF NOT EXISTS muc_do_uu_tien smallint,
  ADD COLUMN IF NOT EXISTS ngay_nhan_lenh date,
  ADD COLUMN IF NOT EXISTS trang_thai_don varchar(30),
  ADD COLUMN IF NOT EXISTS ghi_chu text,
  ADD COLUMN IF NOT EXISTS ma_bo_phan varchar(20),
  ADD COLUMN IF NOT EXISTS ten_khach_hang_chup varchar(300),
  ADD COLUMN IF NOT EXISTS so_so varchar(60),
  ADD COLUMN IF NOT EXISTS ngay_so date;
ALTER TABLE mua_hang.lsx_dong
  ADD COLUMN IF NOT EXISTS lenh_san_xuat varchar(60),
  ADD COLUMN IF NOT EXISTS ma_hang varchar(60),
  ADD COLUMN IF NOT EXISTS ten_hang varchar(300),
  ADD COLUMN IF NOT EXISTS so_luong_po numeric(14,4),
  ADD COLUMN IF NOT EXISTS dvt varchar(20),
  ADD COLUMN IF NOT EXISTS ma_cong_doan varchar(20),
  ADD COLUMN IF NOT EXISTS ma_ban_ve varchar(60),
  ADD COLUMN IF NOT EXISTS ghi_chu text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='mua_hang.lsx_dong'::regclass AND conname='fk_lsx_dong_lsx') THEN
    ALTER TABLE mua_hang.lsx_dong ADD CONSTRAINT fk_lsx_dong_lsx FOREIGN KEY (lenh_san_xuat) REFERENCES mua_hang.lenh_san_xuat(lenh_san_xuat) ON DELETE RESTRICT NOT VALID;
  END IF;
END $$;
-- F3: ho so dat ngoai theo ma hang, giu lich su ky thuat/giao hang.
ALTER TABLE mua_hang.dat_ngoai
  ADD COLUMN IF NOT EXISTS ngay_gui_duyet timestamptz,
  ADD COLUMN IF NOT EXISTS f3_yeu_cau_moi boolean NOT NULL DEFAULT false;

ALTER TABLE mua_hang.dat_ngoai_dong
  ADD COLUMN IF NOT EXISTS noi_dung_gia_cong text,
  ADD COLUMN IF NOT EXISTS yeu_cau_ky_thuat text,
  ADD COLUMN IF NOT EXISTS yeu_cau_chat_luong text,
  ADD COLUMN IF NOT EXISTS ma_hang_goc varchar(60),
  ADD COLUMN IF NOT EXISTS ma_hang_thay_the varchar(60),
  ADD COLUMN IF NOT EXISTS thoi_diem_doi_ma timestamptz,
  ADD COLUMN IF NOT EXISTS nguoi_doi_ma varchar(20) REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS mua_hang.dat_ngoai_xac_nhan_ky_thuat (
  id varchar(24) PRIMARY KEY,
  id_dat_ngoai_dong varchar(24) NOT NULL REFERENCES mua_hang.dat_ngoai_dong(id) ON DELETE RESTRICT,
  noi_dung text NOT NULL,
  ket_qua varchar(20) NOT NULL DEFAULT 'DA_XAC_NHAN'
    CHECK (ket_qua IN ('CAN_LAM_RO','DA_XAC_NHAN','KHONG_DAT')),
  nguoi_xac_nhan varchar(20) NOT NULL REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  thoi_diem timestamptz NOT NULL DEFAULT now(),
  ghi_chu text
);
CREATE INDEX IF NOT EXISTS ix_dat_ngoai_xnkt_dong
  ON mua_hang.dat_ngoai_xac_nhan_ky_thuat(id_dat_ngoai_dong, thoi_diem DESC);

CREATE TABLE IF NOT EXISTS mua_hang.dat_ngoai_dot_giao (
  id varchar(24) PRIMARY KEY,
  id_dat_ngoai_dong varchar(24) NOT NULL REFERENCES mua_hang.dat_ngoai_dong(id) ON DELETE RESTRICT,
  lan_giao smallint NOT NULL CHECK (lan_giao > 0),
  so_luong_du_kien numeric(14,4) CHECK (so_luong_du_kien IS NULL OR so_luong_du_kien > 0),
  ngay_du_kien date NOT NULL,
  so_luong_thuc_te numeric(14,4) CHECK (so_luong_thuc_te IS NULL OR so_luong_thuc_te > 0),
  ngay_thuc_te date,
  ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(),
  nguoi_tao varchar(20) NOT NULL REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  UNIQUE (id_dat_ngoai_dong, lan_giao)
);

CREATE TABLE IF NOT EXISTS mua_hang.dat_ngoai_lich_su_ky_han (
  id varchar(24) PRIMARY KEY,
  id_dat_ngoai_dong varchar(24) NOT NULL REFERENCES mua_hang.dat_ngoai_dong(id) ON DELETE RESTRICT,
  ky_han_cu date,
  ky_han_moi date NOT NULL,
  ly_do text NOT NULL,
  nguoi_sua varchar(20) NOT NULL REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  thoi_diem timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_dat_ngoai_dot_giao_dong
  ON mua_hang.dat_ngoai_dot_giao(id_dat_ngoai_dong, ngay_du_kien);
CREATE TABLE IF NOT EXISTS mua_hang.dat_ngoai_su_co_dong (
  id_dat_ngoai_dong varchar(24) NOT NULL REFERENCES mua_hang.dat_ngoai_dong(id) ON DELETE RESTRICT,
  id_su_co varchar(24) NOT NULL REFERENCES mua_hang.su_co(id) ON DELETE RESTRICT,
  nguoi_gan varchar(20) NOT NULL REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  thoi_diem timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id_dat_ngoai_dong, id_su_co)
);
CREATE INDEX IF NOT EXISTS ix_dat_ngoai_su_co_dong
  ON mua_hang.dat_ngoai_su_co_dong(id_dat_ngoai_dong, thoi_diem DESC);

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('050', 'Dat ngoai ho so theo dong, lich su xac nhan va giao nhieu dot')
ON CONFLICT (version) DO NOTHING;
