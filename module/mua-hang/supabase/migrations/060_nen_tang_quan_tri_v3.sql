BEGIN;

-- Repair databases where migration 004 was marked applied without the audit table.
CREATE TABLE IF NOT EXISTS mua_hang.nhat_ky_thay_doi (
  id varchar(24) PRIMARY KEY,
  bang varchar(40) NOT NULL,
  id_ban_ghi varchar(24),
  cot varchar(60),
  gia_tri_cu text,
  gia_tri_moi text,
  nguoi_sua varchar(20),
  thoi_diem timestamptz NOT NULL DEFAULT now(),
  ip varchar(45),
  thiet_bi text,
  hanh_dong varchar(20) NOT NULL
    CHECK (hanh_dong IN ('TAO','SUA','DUYET','HUY','XEM','XUAT'))
);
CREATE INDEX IF NOT EXISTS ix_nhat_ky_thay_doi
  ON mua_hang.nhat_ky_thay_doi(bang,id_ban_ghi,thoi_diem DESC);

ALTER TABLE mua_hang.nhat_ky_thay_doi
  ADD COLUMN IF NOT EXISTS ma_danh_muc varchar(40),
  ADD COLUMN IF NOT EXISTS du_lieu_cu jsonb,
  ADD COLUMN IF NOT EXISTS du_lieu_moi jsonb;

ALTER TABLE mua_hang.nhat_ky_thay_doi
  DROP CONSTRAINT IF EXISTS nhat_ky_thay_doi_hanh_dong_check;
ALTER TABLE mua_hang.nhat_ky_thay_doi
  ADD CONSTRAINT nhat_ky_thay_doi_hanh_dong_check
  CHECK (hanh_dong IN ('TAO','SUA','DUYET','HUY','XOA','XEM','XUAT'));
CREATE INDEX IF NOT EXISTS ix_nhat_ky_danh_muc_ban_ghi
  ON mua_hang.nhat_ky_thay_doi(ma_danh_muc,id_ban_ghi,thoi_diem DESC,id DESC)
  WHERE ma_danh_muc IS NOT NULL;

CREATE TABLE IF NOT EXISTS mua_hang.de_xuat_sua_danh_muc (
  id varchar(24) PRIMARY KEY,
  ma_danh_muc varchar(40) NOT NULL,
  ma_trang varchar(40) NOT NULL,
  id_ban_ghi varchar(120) NOT NULL,
  du_lieu_cu jsonb NOT NULL,
  du_lieu_moi jsonb NOT NULL,
  trang_thai varchar(16) NOT NULL DEFAULT 'CHO_DUYET'
    CHECK (trang_thai IN ('CHO_DUYET','DA_DUYET','TU_CHOI','HUY')),
  ly_do_tu_choi text,
  nguoi_de_xuat varchar(20) NOT NULL,
  thoi_diem_de_xuat timestamptz NOT NULL DEFAULT now(),
  han_nhac timestamptz NOT NULL DEFAULT now() + interval '48 hours',
  nguoi_duyet varchar(20),
  thoi_diem_duyet timestamptz,
  phien_ban integer NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS ix_de_xuat_sua_danh_muc_hang_doi
  ON mua_hang.de_xuat_sua_danh_muc(trang_thai,han_nhac,thoi_diem_de_xuat);

CREATE TABLE IF NOT EXISTS mua_hang.loai_tai_khoan (
  ma varchar(40) PRIMARY KEY,
  ten varchar(100) NOT NULL,
  thu_tu smallint NOT NULL,
  mo_ta text
);

INSERT INTO mua_hang.loai_tai_khoan(ma,ten,thu_tu,mo_ta) VALUES
  ('QUAN_TRI_HE_THONG','QUẢN TRỊ HỆ THỐNG',1,'Team dev / IT và chủ hệ thống Mua hàng; loại duy nhất được xem tab Phân quyền.'),
  ('BAN_LANH_DAO','BAN LÃNH ĐẠO',2,'Xem toàn công ty và duyệt mọi thứ; không xem tab Phân quyền.'),
  ('TRUONG_BO_PHAN','TRƯỞNG BỘ PHẬN',3,'Sửa trong bộ phận; duyệt cho Nhân viên và Kỹ thuật cùng bộ phận.'),
  ('NHAN_VIEN','NHÂN VIÊN',4,'Sửa phiếu cá nhân hoặc được giao; thao tác rộng hơn cần duyệt.'),
  ('KY_THUAT','KỸ THUẬT',5,'Quyền như Nhân viên, cộng xác nhận kỹ thuật trên mọi phiếu.'),
  ('KE_TOAN','KẾ TOÁN',6,'Xem toàn công ty; chỉ sửa ở màn Thanh toán.'),
  ('CHI_XEM','CHỈ XEM',7,'Tài khoản được cấp theo chỉ định và thời hạn; không có quyền sửa.')
ON CONFLICT (ma) DO UPDATE SET
  ten=excluded.ten,
  thu_tu=excluded.thu_tu,
  mo_ta=excluded.mo_ta;

CREATE TABLE IF NOT EXISTS mua_hang.doi_chieu_vai_tro_loai_tk (
  vai_tro_cu varchar(40) PRIMARY KEY REFERENCES mua_hang.vai_tro(ma) ON DELETE RESTRICT,
  ma_loai_tk varchar(40) REFERENCES mua_hang.loai_tai_khoan(ma) ON DELETE RESTRICT,
  nguoi_duyet varchar(20),
  thoi_diem_duyet timestamptz,
  ghi_chu text,
  CHECK ((nguoi_duyet IS NULL) = (thoi_diem_duyet IS NULL))
);

ALTER TABLE mua_hang.phan_quyen
  ADD COLUMN IF NOT EXISTS pham_vi_xem varchar(20)
    CHECK (pham_vi_xem IS NULL OR pham_vi_xem IN ('toan_bo','bo_phan','ca_nhan')),
  ADD COLUMN IF NOT EXISTS pham_vi_sua varchar(20)
    CHECK (pham_vi_sua IS NULL OR pham_vi_sua IN ('toan_bo','bo_phan','ca_nhan')),
  ADD COLUMN IF NOT EXISTS kieu_sua varchar(16) NOT NULL DEFAULT 'THANG'
    CHECK (kieu_sua IN ('THANG','CAN_DUYET')),
  ADD COLUMN IF NOT EXISTS loai_tai_khoan_duyet varchar(40)[] NOT NULL DEFAULT '{}';

UPDATE mua_hang.phan_quyen
SET pham_vi_xem=coalesce(pham_vi_xem,pham_vi),
    pham_vi_sua=coalesce(pham_vi_sua,pham_vi);

CREATE TABLE IF NOT EXISTS mua_hang.quyen_nhay_cam (
  ma_loai_tk varchar(40) NOT NULL REFERENCES mua_hang.loai_tai_khoan(ma) ON DELETE RESTRICT,
  ma_bo_phan varchar(10) NOT NULL REFERENCES mua_hang.bo_phan(ma_bo_phan) ON DELETE RESTRICT,
  ma_quyen varchar(40) NOT NULL,
  duoc_xem boolean NOT NULL DEFAULT false,
  nguoi_sua varchar(20),
  ngay_sua timestamptz,
  phien_ban integer NOT NULL DEFAULT 1,
  PRIMARY KEY (ma_loai_tk,ma_bo_phan,ma_quyen)
);

CREATE TABLE IF NOT EXISTS mua_hang.nhat_ky_quan_tri_tai_khoan (
  id varchar(24) PRIMARY KEY,
  ma_tai_khoan varchar(60) NOT NULL,
  hanh_dong varchar(30) NOT NULL,
  ly_do text,
  gia_tri_cu jsonb,
  gia_tri_moi jsonb,
  nguoi_thuc_hien varchar(60) NOT NULL,
  thoi_diem timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_nhat_ky_quan_tri_tai_khoan
  ON mua_hang.nhat_ky_quan_tri_tai_khoan(ma_tai_khoan,thoi_diem DESC);

CREATE OR REPLACE FUNCTION mua_hang.ghi_lich_su_danh_muc()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_cu jsonb;
  v_moi jsonb;
  v_ban_ghi jsonb;
  v_id text;
  v_nguoi text;
  v_ma text;
  v_hanh_dong text;
BEGIN
  IF TG_OP='DELETE' THEN
    v_cu := to_jsonb(OLD);
    v_moi := NULL;
    v_ban_ghi := v_cu;
    v_hanh_dong := 'XOA';
  ELSIF TG_OP='INSERT' THEN
    v_cu := NULL;
    v_moi := to_jsonb(NEW);
    v_ban_ghi := v_moi;
    v_hanh_dong := 'TAO';
  ELSE
    v_cu := to_jsonb(OLD);
    v_moi := to_jsonb(NEW);
    v_ban_ghi := v_moi;
    v_hanh_dong := 'SUA';
  END IF;

  v_id := coalesce(v_ban_ghi->>'id',v_ban_ghi->>'ma_vat_tu',
    v_ban_ghi->>'ma_ncc',v_ban_ghi->>'ma_nhan_vien',
    v_ban_ghi->>'ma_bo_phan',v_ban_ghi->>'ma_chung_loai',
    v_ban_ghi->>'ma_cong_doan',v_ban_ghi->>'lenh_san_xuat',
    v_ban_ghi->>'ma_xe',v_ban_ghi->>'ma_kho',v_ban_ghi->>'ma_vach',
    v_ban_ghi->>'ma_khach_hang',v_ban_ghi->>'dvt',
    v_ban_ghi->>'ma',v_ban_ghi->>'ma_tham_so');
  v_nguoi := coalesce(v_moi->>'nguoi_sua',v_moi->>'nguoi_tao',
    v_cu->>'nguoi_sua',v_cu->>'nguoi_tao');
  v_ma := CASE TG_TABLE_NAME
    WHEN 'vat_tu' THEN 'VAT_TU'
    WHEN 'don_vi_tinh' THEN 'DON_VI_TINH'
    WHEN 'chung_loai' THEN 'CHUNG_LOAI'
    WHEN 'bo_phan' THEN 'BO_PHAN'
    WHEN 'nhan_vien' THEN 'NHAN_VIEN'
    WHEN 'nha_cung_cap' THEN 'NHA_CUNG_CAP'
    WHEN 'khach_hang' THEN 'KHACH_HANG'
    WHEN 'muc_dich_su_dung' THEN 'MUC_DICH_SU_DUNG'
    WHEN 'loai_gia_cong' THEN 'LOAI_GIA_CONG'
    WHEN 'cong_doan' THEN 'CONG_DOAN'
    WHEN 'lenh_san_xuat' THEN 'LENH_SAN_XUAT'
    WHEN 'lsx_dong' THEN 'LENH_SAN_XUAT_DONG'
    WHEN 'xe' THEN 'XE'
    WHEN 'tai_xe' THEN 'TAI_XE'
    WHEN 'lich_nghi' THEN 'LICH_NGHI'
    WHEN 'vat_lieu_tinh_toan' THEN 'VAT_LIEU_TINH_TOAN'
    WHEN 'mau_son_khach_hang' THEN 'MAU_SON_KHACH_HANG'
    WHEN 'danh_muc_dong' THEN coalesce(v_ban_ghi->>'ma_loai','DANH_MUC_DONG')
    WHEN 'tham_so_he_thong' THEN 'THAM_SO_HE_THONG'
    ELSE upper(TG_TABLE_NAME)
  END;
  IF v_id IS NOT NULL THEN
    INSERT INTO mua_hang.nhat_ky_thay_doi(
      id,bang,id_ban_ghi,cot,hanh_dong,nguoi_sua,thoi_diem,
      ma_danh_muc,du_lieu_cu,du_lieu_moi,gia_tri_cu,gia_tri_moi
    ) VALUES (
      'NKDM-'||upper(substr(md5(random()::text||clock_timestamp()::text),1,18)),
      TG_TABLE_NAME,v_id,'*',v_hanh_dong,v_nguoi,clock_timestamp(),
      v_ma,v_cu,v_moi,
      CASE WHEN v_cu IS NULL THEN NULL ELSE v_cu::text END,
      CASE WHEN v_moi IS NULL THEN NULL ELSE v_moi::text END
    );
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'vat_tu','don_vi_tinh','chung_loai','bo_phan','nhan_vien','kho','ton_kho',
    'nha_cung_cap','khach_hang','muc_dich_su_dung','loai_gia_cong',
    'cong_doan','lenh_san_xuat','lsx_dong','xe','tai_xe','lich_nghi',
    'vat_lieu_tinh_toan','mau_son_khach_hang','danh_muc_dong',
    'anh_xa_tien_to','tieu_chi_cham_bao_gia','ly_do_thanh_toan',
    'hinh_thuc_thanh_toan','ly_do_yeu_cau','tham_so_he_thong'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='mua_hang' AND c.relname=t AND c.relkind IN ('r','p')
    ) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_lich_su ON mua_hang.%I',t,t);
      EXECUTE format('CREATE TRIGGER trg_%I_lich_su AFTER INSERT OR UPDATE OR DELETE ON mua_hang.%I '
        'FOR EACH ROW EXECUTE FUNCTION mua_hang.ghi_lich_su_danh_muc()',t,t);
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION mua_hang.cam_sua_nhat_ky_quan_tri()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Nhat ky quan tri chi duoc ghi them';
END $$;
DROP TRIGGER IF EXISTS trg_nhat_ky_tai_khoan_chi_ghi_them ON mua_hang.nhat_ky_quan_tri_tai_khoan;
CREATE TRIGGER trg_nhat_ky_tai_khoan_chi_ghi_them
  BEFORE UPDATE OR DELETE ON mua_hang.nhat_ky_quan_tri_tai_khoan
  FOR EACH ROW EXECUTE FUNCTION mua_hang.cam_sua_nhat_ky_quan_tri();
DROP TRIGGER IF EXISTS trg_nhat_ky_thay_doi_chi_ghi_them ON mua_hang.nhat_ky_thay_doi;
CREATE TRIGGER trg_nhat_ky_thay_doi_chi_ghi_them
  BEFORE UPDATE OR DELETE ON mua_hang.nhat_ky_thay_doi
  FOR EACH ROW EXECUTE FUNCTION mua_hang.cam_sua_nhat_ky_quan_tri();

INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES ('060','Nen tang B1 lich su danh muc va schema phan quyen v3, chua chuyen mapping vai tro')
ON CONFLICT (version) DO NOTHING;

COMMIT;
