-- F1: mở rộng nhà cung cấp theo mặt hàng, giữ nguyên dữ liệu NCC/đánh giá cũ.
-- Một số DB cũ chỉ có bảng NCC mà chưa có hai danh mục gia công.
-- Tạo đúng khung nền còn thiếu để migration F1 không phụ thuộc thứ tự chạy thủ công.
CREATE TABLE IF NOT EXISTS mua_hang.cong_doan (
  ma_cong_doan varchar(20) PRIMARY KEY,
  ten_cong_doan varchar(120) NOT NULL,
  mo_ta text,
  thu_tu integer
);

CREATE TABLE IF NOT EXISTS mua_hang.loai_gia_cong (
  ma varchar(20) PRIMARY KEY,
  ten varchar(100) NOT NULL UNIQUE,
  so_ngay_chuan integer NOT NULL DEFAULT 0 CHECK (so_ngay_chuan >= 0),
  ma_cong_doan varchar(20) REFERENCES mua_hang.cong_doan(ma_cong_doan) ON DELETE RESTRICT,
  ghi_chu text
);

ALTER TABLE mua_hang.nha_cung_cap
  ADD COLUMN IF NOT EXISTS dinh_muc_thang numeric(18,2),
  ADD COLUMN IF NOT EXISTS ghi_chu_dinh_muc text,
  ADD COLUMN IF NOT EXISTS nhom_hang_chi_tiet text[],
  ADD COLUMN IF NOT EXISTS nhom_hang_chi_tiet_cu text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'mua_hang.nha_cung_cap'::regclass
      AND conname = 'ck_nha_cung_cap_dinh_muc_thang'
  ) THEN
    ALTER TABLE mua_hang.nha_cung_cap
      ADD CONSTRAINT ck_nha_cung_cap_dinh_muc_thang
      CHECK (dinh_muc_thang IS NULL OR dinh_muc_thang >= 0);
  END IF;
END $$;

-- Giữ nguyên nhóm hàng tự do cũ để chuyển dần sang mã CHUNG_LOAI, không xoá dữ liệu gốc.
UPDATE mua_hang.nha_cung_cap
SET nhom_hang_chi_tiet_cu = mat_hang
WHERE nhom_hang_chi_tiet_cu IS NULL AND nullif(trim(coalesce(mat_hang, '')), '') IS NOT NULL;

CREATE TABLE IF NOT EXISTS mua_hang.mat_hang_ncc (
  id varchar(24) PRIMARY KEY,
  id_ncc varchar(20) NOT NULL REFERENCES mua_hang.nha_cung_cap(id) ON DELETE RESTRICT,
  ma_vat_tu varchar(40),
  ten_hang varchar(300) NOT NULL,
  loai varchar(20) NOT NULL CHECK (loai IN ('HANG_HOA','GIA_CONG')),
  nhom_hang_chinh varchar(20) REFERENCES mua_hang.chung_loai(ma_chung_loai) ON DELETE RESTRICT,
  nhom_hang_chi_tiet varchar(20) REFERENCES mua_hang.chung_loai(ma_chung_loai) ON DELETE RESTRICT,
  ma_loai_gia_cong varchar(20) REFERENCES mua_hang.loai_gia_cong(ma) ON DELETE RESTRICT,
  ma_cong_doan varchar(20) REFERENCES mua_hang.cong_doan(ma_cong_doan) ON DELETE RESTRICT,
  dvt varchar(20) NOT NULL REFERENCES mua_hang.don_vi_tinh(dvt) ON DELETE RESTRICT,
  thong_so_ky_thuat text,
  diem_ky_thuat numeric(4,2) CHECK (diem_ky_thuat IS NULL OR diem_ky_thuat BETWEEN 0 AND 10),
  muc_chat_luong varchar(20) CHECK (muc_chat_luong IS NULL OR muc_chat_luong IN ('ON_DINH','DAO_DONG','HAY_LOI','CHUA_DANH_GIA')),
  diem_chat_luong numeric(4,2) CHECK (diem_chat_luong IS NULL OR diem_chat_luong BETWEEN 0 AND 10),
  nang_luc_thang numeric(18,4) CHECK (nang_luc_thang IS NULL OR nang_luc_thang >= 0),
  so_ngay_giao_chuan integer CHECK (so_ngay_giao_chuan IS NULL OR so_ngay_giao_chuan >= 0),
  trang_thai varchar(20) NOT NULL DEFAULT 'DE_XUAT'
    CHECK (trang_thai IN ('DE_XUAT','DA_DUYET','TAM_NGUNG')),
  nguoi_de_xuat varchar(20) REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  ngay_de_xuat date,
  nguoi_duyet varchar(20) REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  ngay_duyet date,
  ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(),
  nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz,
  nguoi_sua varchar(20),
  phien_ban integer NOT NULL DEFAULT 1 CHECK (phien_ban > 0),
  CHECK ((loai = 'HANG_HOA' AND nhom_hang_chinh IS NOT NULL AND ma_loai_gia_cong IS NULL)
      OR (loai = 'GIA_CONG' AND ma_loai_gia_cong IS NOT NULL AND nhom_hang_chinh IS NULL)),
  CHECK ((trang_thai = 'DA_DUYET' AND nguoi_duyet IS NOT NULL AND ngay_duyet IS NOT NULL)
      OR trang_thai <> 'DA_DUYET')
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_mat_hang_ncc_khoa
  ON mua_hang.mat_hang_ncc (id_ncc, coalesce(ma_vat_tu, ''), lower(ten_hang));
CREATE INDEX IF NOT EXISTS ix_mat_hang_ncc_nhom
  ON mua_hang.mat_hang_ncc (nhom_hang_chinh, nhom_hang_chi_tiet, trang_thai);
CREATE INDEX IF NOT EXISTS ix_mat_hang_ncc_ncc
  ON mua_hang.mat_hang_ncc (id_ncc, trang_thai);

CREATE TABLE IF NOT EXISTS mua_hang.ncc_loai_gia_cong (
  id_ncc varchar(20) NOT NULL REFERENCES mua_hang.nha_cung_cap(id) ON DELETE RESTRICT,
  ma_loai_gia_cong varchar(20) NOT NULL REFERENCES mua_hang.loai_gia_cong(ma) ON DELETE RESTRICT,
  ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(),
  nguoi_tao varchar(20) NOT NULL,
  PRIMARY KEY (id_ncc, ma_loai_gia_cong)
);

-- Tao bang danh gia nen neu DB cu chua chay migration 003.
CREATE TABLE IF NOT EXISTS mua_hang.danh_gia_ncc (
  id varchar(24) PRIMARY KEY,
  id_ncc varchar(20) NOT NULL REFERENCES mua_hang.nha_cung_cap(id) ON DELETE RESTRICT,
  loai varchar(20) NOT NULL CHECK (loai IN ('BAN_DAU','DINH_KY')),
  ky_danh_gia varchar(20), ngay_danh_gia date NOT NULL,
  nguoi_danh_gia varchar(20) NOT NULL REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  diem_chat_luong numeric(5,2), diem_giao_hang numeric(5,2), diem_gia_ca numeric(5,2),
  diem_thanh_toan numeric(5,2), diem_dich_vu numeric(5,2), diem_tam_voc numeric(5,2),
  diem_thoi_gian_hop_tac numeric(5,2), diem_gia_tri_giao_dich numeric(5,2), diem_tong numeric(5,2),
  xep_loai varchar(10) CHECK (xep_loai IS NULL OR xep_loai IN ('A','B','C')),
  ty_le_dung_han numeric(5,2), ty_le_iqc_dat numeric(5,2), so_lan_khong_phu_hop integer,
  ket_luan varchar(20), hanh_dong_xu_ly text, ghi_chu text,
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1 CHECK (phien_ban > 0),
  CHECK (diem_tong IS NULL OR diem_tong BETWEEN 0 AND 100),
  CHECK (ty_le_dung_han IS NULL OR ty_le_dung_han BETWEEN 0 AND 100),
  CHECK (ty_le_iqc_dat IS NULL OR ty_le_iqc_dat BETWEEN 0 AND 100)
);

ALTER TABLE mua_hang.danh_gia_ncc
  ADD COLUMN IF NOT EXISTS id_mat_hang_ncc varchar(24),
  ADD COLUMN IF NOT EXISTS trang_thai varchar(20) NOT NULL DEFAULT 'DA_DUYET',
  ADD COLUMN IF NOT EXISTS nguoi_duyet varchar(20),
  ADD COLUMN IF NOT EXISTS ngay_duyet date,
  ADD COLUMN IF NOT EXISTS ket_luan_bm06 varchar(30);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'mua_hang.danh_gia_ncc'::regclass
      AND conname = 'fk_danh_gia_ncc_mat_hang'
  ) THEN
    ALTER TABLE mua_hang.danh_gia_ncc
      ADD CONSTRAINT fk_danh_gia_ncc_mat_hang
      FOREIGN KEY (id_mat_hang_ncc) REFERENCES mua_hang.mat_hang_ncc(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'mua_hang.danh_gia_ncc'::regclass
      AND conname = 'ck_danh_gia_ncc_trang_thai_f1'
  ) THEN
    ALTER TABLE mua_hang.danh_gia_ncc
      ADD CONSTRAINT ck_danh_gia_ncc_trang_thai_f1
      CHECK (trang_thai IN ('CHO_DUYET','DA_DUYET','TU_CHOI'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_danh_gia_ncc_mat_hang
  ON mua_hang.danh_gia_ncc (id_mat_hang_ncc, ngay_danh_gia DESC);

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('048', 'F1 nha cung cap theo mat hang va dinh muc')
ON CONFLICT (version) DO NOTHING;
