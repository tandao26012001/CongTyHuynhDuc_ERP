BEGIN;
CREATE TABLE IF NOT EXISTS mua_hang.tham_so_he_thong (
  ma varchar(50) PRIMARY KEY,
  gia_tri text NOT NULL,
  kieu varchar(20) NOT NULL CHECK (kieu IN ('TEXT','INTEGER','NUMERIC','BOOLEAN','TIME')),
  mo_ta text,
  nhom varchar(40),
  ngay_tao timestamptz NOT NULL DEFAULT now(), nguoi_tao varchar(20) NOT NULL DEFAULT 'SYSTEM',
  ngay_sua timestamptz, nguoi_sua varchar(20), phien_ban integer NOT NULL DEFAULT 1
);
INSERT INTO mua_hang.tham_so_he_thong(ma,gia_tri,kieu,mo_ta,nhom)
VALUES ('SO_LAN_GIAO_TOI_THIEU_CHAM_TU_DONG','3','INTEGER','Mau toi thieu de cham chat luong va giao hang NCC','NCC'),
       ('SO_THANG_HOP_TAC_DIEM_TOI_DA','12','INTEGER','So thang hop tac de dat 5 diem BM06','NCC'),
       ('GIA_TRI_GIAO_DICH_NCC_MUC_5','0','INTEGER','Nguong gia tri de dat 5 diem BM06; 0 la chua cau hinh','NCC')
ON CONFLICT (ma) DO NOTHING;
INSERT INTO mua_hang.tham_so_he_thong(ma,gia_tri,kieu,mo_ta,nhom) VALUES ('CHU_KY_DANH_GIA_NCC_THANG','12','INTEGER','Chu ky danh gia NCC','NCC') ON CONFLICT (ma) DO NOTHING;
INSERT INTO mua_hang.schema_migrations(version,mo_ta) VALUES ('076','Khoi phuc tham so cham diem NCC') ON CONFLICT (version) DO NOTHING;
COMMIT;
