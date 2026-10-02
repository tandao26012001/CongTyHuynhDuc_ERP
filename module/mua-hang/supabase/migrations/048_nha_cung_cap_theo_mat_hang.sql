BEGIN;

-- F1: bo sung cau truc moi, khong viet lai danh gia hay nhom hang cu.
ALTER TABLE mua_hang.chung_loai
  ADD COLUMN IF NOT EXISTS ma_cha varchar(20) REFERENCES mua_hang.chung_loai(ma_chung_loai) ON DELETE RESTRICT;

ALTER TABLE mua_hang.nha_cung_cap
  ADD COLUMN IF NOT EXISTS dinh_muc_thang bigint,
  ADD COLUMN IF NOT EXISTS ghi_chu_dinh_muc text,
  ADD COLUMN IF NOT EXISTS nhom_hang_chi_tiet_cu text,
  ADD COLUMN IF NOT EXISTS xuat_xu text,
  ADD COLUMN IF NOT EXISTS nguoi_de_xuat varchar(20),
  ADD COLUMN IF NOT EXISTS ngay_de_xuat timestamptz,
  ADD COLUMN IF NOT EXISTS nguoi_duyet varchar(20),
  ADD COLUMN IF NOT EXISTS ngay_duyet timestamptz,
  ADD COLUMN IF NOT EXISTS trang_thai_xet_duyet varchar(20) NOT NULL DEFAULT 'CHUA_DUYET'
    CHECK (trang_thai_xet_duyet IN ('CHUA_DUYET','DE_XUAT','DA_DUYET'));

UPDATE mua_hang.nha_cung_cap
SET trang_thai_xet_duyet='DA_DUYET'
WHERE trang_thai_xet_duyet='CHUA_DUYET';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_ncc_dinh_muc_thang'
                 AND conrelid = 'mua_hang.nha_cung_cap'::regclass) THEN
    ALTER TABLE mua_hang.nha_cung_cap ADD CONSTRAINT ck_ncc_dinh_muc_thang
      CHECK (dinh_muc_thang IS NULL OR dinh_muc_thang >= 0);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS mua_hang.ncc_nhom_hang (
  id_ncc varchar(20) NOT NULL REFERENCES mua_hang.nha_cung_cap(id) ON DELETE RESTRICT,
  ma_chung_loai varchar(20) NOT NULL REFERENCES mua_hang.chung_loai(ma_chung_loai) ON DELETE RESTRICT,
  PRIMARY KEY (id_ncc, ma_chung_loai)
);

CREATE TABLE IF NOT EXISTS mua_hang.ncc_loai_gia_cong (
  id_ncc varchar(20) NOT NULL REFERENCES mua_hang.nha_cung_cap(id) ON DELETE RESTRICT,
  ma_loai_gia_cong varchar(20) NOT NULL REFERENCES mua_hang.loai_gia_cong(ma) ON DELETE RESTRICT,
  PRIMARY KEY (id_ncc, ma_loai_gia_cong)
);

INSERT INTO mua_hang.ncc_loai_gia_cong (id_ncc, ma_loai_gia_cong)
SELECT id, ma_loai_gia_cong FROM mua_hang.nha_cung_cap
WHERE ma_loai_gia_cong IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS mua_hang.mat_hang_ncc (
  id varchar(24) PRIMARY KEY,
  id_ncc varchar(20) NOT NULL REFERENCES mua_hang.nha_cung_cap(id) ON DELETE RESTRICT,
  ma_vat_tu varchar(100) REFERENCES mua_hang.vat_tu(ma_vat_tu) ON DELETE RESTRICT,
  ten_hang varchar(300) NOT NULL,
  loai varchar(20) NOT NULL CHECK (loai IN ('HANG_HOA', 'GIA_CONG')),
  nhom_hang_chinh varchar(20) REFERENCES mua_hang.chung_loai(ma_chung_loai) ON DELETE RESTRICT,
  nhom_hang_chi_tiet varchar(20) REFERENCES mua_hang.chung_loai(ma_chung_loai) ON DELETE RESTRICT,
  ma_loai_gia_cong varchar(20) REFERENCES mua_hang.loai_gia_cong(ma) ON DELETE RESTRICT,
  ma_cong_doan varchar(20) REFERENCES mua_hang.cong_doan(ma_cong_doan) ON DELETE RESTRICT,
  dvt varchar(20) NOT NULL REFERENCES mua_hang.don_vi_tinh(dvt) ON DELETE RESTRICT,
  thong_so_ky_thuat text,
  diem_ky_thuat numeric(4,2) CHECK (diem_ky_thuat BETWEEN 0 AND 10),
  muc_chat_luong varchar(20) CHECK (muc_chat_luong IN ('ON_DINH','DAO_DONG','HAY_LOI','CHUA_DANH_GIA')),
  diem_chat_luong numeric(4,2) CHECK (diem_chat_luong BETWEEN 0 AND 10),
  nang_luc_thang numeric(14,4) CHECK (nang_luc_thang >= 0),
  so_ngay_giao_chuan integer CHECK (so_ngay_giao_chuan >= 0),
  trang_thai varchar(20) NOT NULL DEFAULT 'DE_XUAT'
    CHECK (trang_thai IN ('DE_XUAT','DA_DUYET','TAM_NGUNG')),
  nguoi_de_xuat varchar(20), ngay_de_xuat timestamptz,
  nguoi_duyet varchar(20), ngay_duyet timestamptz,
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL,
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1,
  CHECK (loai <> 'HANG_HOA' OR nhom_hang_chinh IS NOT NULL),
  CHECK (loai <> 'GIA_CONG' OR ma_loai_gia_cong IS NOT NULL),
  CHECK (trang_thai <> 'DA_DUYET' OR (nguoi_duyet IS NOT NULL AND ngay_duyet IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mat_hang_ncc_dinh_danh
  ON mua_hang.mat_hang_ncc (id_ncc, coalesce(ma_vat_tu, ''), lower(ten_hang));
CREATE INDEX IF NOT EXISTS ix_mat_hang_ncc_tra_cuu
  ON mua_hang.mat_hang_ncc (loai, nhom_hang_chinh, nhom_hang_chi_tiet, ma_loai_gia_cong, trang_thai);

ALTER TABLE mua_hang.danh_gia_ncc
  ADD COLUMN IF NOT EXISTS id_mat_hang_ncc varchar(24) REFERENCES mua_hang.mat_hang_ncc(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS trang_thai_duyet varchar(20) NOT NULL DEFAULT 'CHO_DUYET'
    CHECK (trang_thai_duyet IN ('TRUOC_V3','CHO_DUYET','DA_DUYET','TU_CHOI')),
  ADD COLUMN IF NOT EXISTS nguoi_duyet varchar(20),
  ADD COLUMN IF NOT EXISTS ngay_duyet timestamptz,
  ADD COLUMN IF NOT EXISTS trong_so_du_lieu numeric(5,2)
    CHECK (trong_so_du_lieu IS NULL OR trong_so_du_lieu BETWEEN 0 AND 100);

-- Lich su A/B/C van duoc giu; danh gia v3 can nam muc ket luan BM06.
ALTER TABLE mua_hang.danh_gia_ncc ALTER COLUMN xep_loai TYPE varchar(20);
ALTER TABLE mua_hang.danh_gia_ncc DROP CONSTRAINT IF EXISTS danh_gia_ncc_xep_loai_check;
ALTER TABLE mua_hang.danh_gia_ncc ADD CONSTRAINT danh_gia_ncc_xep_loai_check
  CHECK (xep_loai IS NULL OR xep_loai IN
    ('A','B','C','KHONG_CHON','DU_PHONG','TIEU_CHUAN','CHINH_YEU','CHIEN_LUOC'));

-- Danh gia cu giu nguyen diem/xep loai va khong gia lap mot lan duyet v3.
UPDATE mua_hang.danh_gia_ncc
SET trang_thai_duyet='TRUOC_V3'
WHERE id_mat_hang_ncc IS NULL AND trang_thai_duyet='CHO_DUYET';

CREATE INDEX IF NOT EXISTS ix_danh_gia_ncc_mat_hang
  ON mua_hang.danh_gia_ncc (id_mat_hang_ncc, ngay_danh_gia DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_danh_gia_ncc_cho_duyet_mat_hang
  ON mua_hang.danh_gia_ncc (id_mat_hang_ncc)
  WHERE id_mat_hang_ncc IS NOT NULL AND trang_thai_duyet='CHO_DUYET';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_danh_gia_ncc_diem_v3'
                 AND conrelid='mua_hang.danh_gia_ncc'::regclass) THEN
    ALTER TABLE mua_hang.danh_gia_ncc ADD CONSTRAINT ck_danh_gia_ncc_diem_v3 CHECK (
      id_mat_hang_ncc IS NULL OR (
        (diem_chat_luong IS NULL OR diem_chat_luong BETWEEN 0 AND 10) AND
        (diem_giao_hang IS NULL OR diem_giao_hang BETWEEN 0 AND 10) AND
        diem_gia_ca IS NOT NULL AND diem_gia_ca BETWEEN 0 AND 10 AND
        diem_tam_voc IS NOT NULL AND diem_tam_voc BETWEEN 0 AND 10 AND
        diem_thanh_toan IS NOT NULL AND diem_thanh_toan BETWEEN 0 AND 10 AND
        diem_dich_vu IS NOT NULL AND diem_dich_vu BETWEEN 0 AND 10 AND
        (diem_thoi_gian_hop_tac IS NULL OR diem_thoi_gian_hop_tac BETWEEN 0 AND 5) AND
        (diem_gia_tri_giao_dich IS NULL OR diem_gia_tri_giao_dich BETWEEN 0 AND 5)
      )
    );
  END IF;
END $$;

INSERT INTO mua_hang.tham_so_he_thong(ma,gia_tri,kieu,mo_ta,nhom)
VALUES ('SO_LAN_GIAO_TOI_THIEU_CHAM_TU_DONG','3','INTEGER','Mau toi thieu de cham chat luong va giao hang NCC','NCC'),
       ('SO_THANG_HOP_TAC_DIEM_TOI_DA','12','INTEGER','So thang hop tac de dat 5 diem BM06','NCC'),
       ('GIA_TRI_GIAO_DICH_NCC_MUC_5','0','INTEGER','Nguong gia tri de dat 5 diem BM06; 0 la chua cau hinh','NCC')
ON CONFLICT (ma) DO NOTHING;

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('048', 'Nen du lieu NCC theo tung mat hang; giu lich su danh gia cap NCC')
ON CONFLICT (version) DO NOTHING;

COMMIT;
