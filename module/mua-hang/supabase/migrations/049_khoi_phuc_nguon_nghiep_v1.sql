-- Restore the F1 quote/order/receiving/IQC source tables when a DB has the
-- supplier catalog but skipped these objects from migration 003.
-- Existing tables and data are preserved.
CREATE TABLE IF NOT EXISTS mua_hang.yeu_cau_bao_gia (
  id varchar(24) PRIMARY KEY, so_phieu_cu varchar(60),
  id_ncc varchar(20) NOT NULL REFERENCES mua_hang.nha_cung_cap(id) ON DELETE RESTRICT,
  ngay_gui date, han_tra_loi date, trang_thai varchar(30) NOT NULL DEFAULT 'NHAP', ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS mua_hang.ycbg_dong (
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

CREATE TABLE IF NOT EXISTS mua_hang.bao_gia (
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

CREATE TABLE IF NOT EXISTS mua_hang.bao_gia_dong (
  id varchar(24) PRIMARY KEY,
  id_bao_gia varchar(24) NOT NULL REFERENCES mua_hang.bao_gia(id) ON DELETE RESTRICT,
  id_de_nghi_dong varchar(24) REFERENCES mua_hang.de_nghi_dong(id) ON DELETE RESTRICT,
  stt_dong smallint NOT NULL CHECK (stt_dong > 0), ten_hang_chup varchar(300) NOT NULL,
  dvt_chup varchar(20) NOT NULL, so_luong numeric(14,4) NOT NULL CHECK (so_luong > 0),
  don_gia_co_so bigint NOT NULL CHECK (don_gia_co_so >= 0), don_vi_gia varchar(10) NOT NULL DEFAULT 'PCS',
  trong_luong numeric(14,4) CHECK (trong_luong IS NULL OR trong_luong > 0),
  thoi_gian_giao integer CHECK (thoi_gian_giao IS NULL OR thoi_gian_giao >= 0), ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1,
  UNIQUE (id_bao_gia, stt_dong), CHECK (don_vi_gia = 'PCS' OR trong_luong IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS mua_hang.don_hang (
  id varchar(24) PRIMARY KEY, so_phieu_cu varchar(60),
  id_ncc varchar(20) NOT NULL REFERENCES mua_hang.nha_cung_cap(id) ON DELETE RESTRICT,
  id_bao_gia varchar(24) REFERENCES mua_hang.bao_gia(id) ON DELETE RESTRICT,
  loai varchar(20) NOT NULL CHECK (loai IN ('MUA_HANG','GIA_CONG_NGOAI')),
  ngay_dat date NOT NULL, ky_han_giao date, dieu_kien_thanh_toan text,
  phan_loai_cao_nhat varchar(20), cap_duyet_yeu_cau varchar(40), trang_thai varchar(30) NOT NULL DEFAULT 'NHAP',
  nguoi_kiem_tra varchar(20) REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  nguoi_duyet varchar(20) REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  ngay_duyet timestamptz, ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS mua_hang.don_hang_dong (
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
  UNIQUE (id_don_hang, stt_dong), CHECK (don_vi_gia = 'PCS' OR trong_luong IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS mua_hang.nhan_hang (
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

CREATE TABLE IF NOT EXISTS mua_hang.nhan_hang_dong (
  id varchar(24) PRIMARY KEY,
  id_nhan_hang varchar(24) NOT NULL REFERENCES mua_hang.nhan_hang(id) ON DELETE RESTRICT,
  id_don_hang_dong varchar(24) REFERENCES mua_hang.don_hang_dong(id) ON DELETE RESTRICT,
  stt_dong smallint NOT NULL CHECK (stt_dong > 0),
  id_vat_tu varchar(20) REFERENCES mua_hang.vat_tu(id) ON DELETE RESTRICT,
  ten_hang_chup varchar(300) NOT NULL, dvt_chup varchar(20) NOT NULL,
  so_luong_nhan numeric(14,4) NOT NULL CHECK (so_luong_nhan > 0), so_ngay_som_tre integer, ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1,
  UNIQUE (id_nhan_hang, stt_dong)
);

CREATE TABLE IF NOT EXISTS mua_hang.ket_qua_iqc (
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

CREATE TABLE IF NOT EXISTS mua_hang.hang_khong_phu_hop (
  id varchar(24) PRIMARY KEY,
  id_ket_qua_iqc varchar(24) NOT NULL REFERENCES mua_hang.ket_qua_iqc(id) ON DELETE RESTRICT,
  id_ncc varchar(20) REFERENCES mua_hang.nha_cung_cap(id) ON DELETE RESTRICT,
  mo_ta text NOT NULL, huong_xu_ly text, ket_qua varchar(20),
  nguoi_giam_sat varchar(20) REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  ngay_dong date, trang_thai varchar(20) NOT NULL DEFAULT 'MO',
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS ix_ycbg_ncc ON mua_hang.yeu_cau_bao_gia(id_ncc, ngay_gui DESC);
CREATE INDEX IF NOT EXISTS ix_bao_gia_ycbg ON mua_hang.bao_gia(id_ycbg, id_ncc);
CREATE INDEX IF NOT EXISTS ix_don_hang_ngay ON mua_hang.don_hang(ngay_dat DESC);
CREATE INDEX IF NOT EXISTS ix_don_hang_ncc ON mua_hang.don_hang(id_ncc, trang_thai);
CREATE INDEX IF NOT EXISTS ix_nhan_hang_ngay ON mua_hang.nhan_hang(ngay_nhan DESC);
CREATE INDEX IF NOT EXISTS ix_nhan_hang_dong_vat_tu ON mua_hang.nhan_hang_dong(id_vat_tu, id_nhan_hang);
CREATE INDEX IF NOT EXISTS ix_ket_qua_iqc_nhan_hang ON mua_hang.ket_qua_iqc(id_nhan_hang_dong);
CREATE INDEX IF NOT EXISTS ix_hang_khong_phu_hop_ncc ON mua_hang.hang_khong_phu_hop(id_ncc, ngay_dong DESC);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'yeu_cau_bao_gia','ycbg_dong','bao_gia','bao_gia_dong','don_hang',
    'don_hang_dong','nhan_hang','nhan_hang_dong','ket_qua_iqc','hang_khong_phu_hop'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgrelid = to_regclass('mua_hang.' || quote_ident(t))
        AND tgname = 'trg_' || t || '_phien_ban' AND NOT tgisinternal
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE UPDATE ON mua_hang.%I FOR EACH ROW EXECUTE FUNCTION mua_hang.tang_phien_ban()',
        'trg_' || t || '_phien_ban', t
      );
    END IF;
  END LOOP;
END $$;

REVOKE ALL ON TABLE
  mua_hang.yeu_cau_bao_gia, mua_hang.ycbg_dong, mua_hang.bao_gia, mua_hang.bao_gia_dong,
  mua_hang.don_hang, mua_hang.don_hang_dong, mua_hang.nhan_hang, mua_hang.nhan_hang_dong,
  mua_hang.ket_qua_iqc, mua_hang.hang_khong_phu_hop
FROM PUBLIC, anon, authenticated;

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('049', 'Khoi phuc bang bao gia, dat hang, giao nhan va IQC cho F1')
ON CONFLICT (version) DO NOTHING;
