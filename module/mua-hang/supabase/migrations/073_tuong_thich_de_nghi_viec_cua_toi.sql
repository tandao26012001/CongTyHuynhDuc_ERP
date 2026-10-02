BEGIN;
ALTER TABLE mua_hang.de_nghi
  ADD COLUMN IF NOT EXISTS nguoi_yeu_cau varchar(20),
  ADD COLUMN IF NOT EXISTS nguoi_duyet_bp varchar(20),
  ADD COLUMN IF NOT EXISTS ngay_duyet_bp timestamptz,
  ADD COLUMN IF NOT EXISTS nguoi_duyet_bld varchar(20),
  ADD COLUMN IF NOT EXISTS ngay_duyet_bld timestamptz,
  ADD COLUMN IF NOT EXISTS thoi_diem_gui timestamptz,
  ADD COLUMN IF NOT EXISTS so_phieu_cu varchar(60),
  ADD COLUMN IF NOT EXISTS muc_do_uu_tien smallint,
  ADD COLUMN IF NOT EXISTS tinh_trang_yc varchar(30) NOT NULL DEFAULT 'BINH_THUONG',
  ADD COLUMN IF NOT EXISTS ly_do_tra_lai text,
  ADD COLUMN IF NOT EXISTS ghi_chu text;
ALTER TABLE mua_hang.de_nghi_dong
  ADD COLUMN IF NOT EXISTS id_de_nghi varchar(24),
  ADD COLUMN IF NOT EXISTS stt_dong integer,
  ADD COLUMN IF NOT EXISTS id_vt_de_nghi varchar(20),
  ADD COLUMN IF NOT EXISTS id_vt_duyet_mua varchar(20),
  ADD COLUMN IF NOT EXISTS ten_hang_chup varchar(300),
  ADD COLUMN IF NOT EXISTS dvt_chup varchar(20),
  ADD COLUMN IF NOT EXISTS da_xoa boolean NOT NULL DEFAULT false;

-- Copy existing records only when the legacy columns exist.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mua_hang' AND table_name='de_nghi_dong' AND column_name='ma_de_nghi') THEN
    UPDATE mua_hang.de_nghi_dong SET id_de_nghi=ma_de_nghi WHERE id_de_nghi IS NULL;
    UPDATE mua_hang.de_nghi_dong SET ten_hang_chup=ten_hang WHERE ten_hang_chup IS NULL;
    UPDATE mua_hang.de_nghi_dong SET dvt_chup=dvt WHERE dvt_chup IS NULL;
    WITH numbered AS (
      SELECT id,row_number() OVER (PARTITION BY id_de_nghi ORDER BY ngay_tao,id) AS stt
      FROM mua_hang.de_nghi_dong
    )
    UPDATE mua_hang.de_nghi_dong d SET stt_dong=n.stt FROM numbered n WHERE n.id=d.id AND d.stt_dong IS NULL;
    UPDATE mua_hang.de_nghi_dong d SET id_vt_de_nghi=v.id
    FROM mua_hang.vat_tu v WHERE v.ma_vat_tu=d.ma_hang AND d.id_vt_de_nghi IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mua_hang' AND table_name='de_nghi' AND column_name='nguoi_duyet') THEN
    UPDATE mua_hang.de_nghi dn SET nguoi_yeu_cau=tk.ma_nhan_vien
    FROM mua_hang.tai_khoan tk WHERE tk.ma_tai_khoan=dn.nguoi_tao AND dn.nguoi_yeu_cau IS NULL;
    UPDATE mua_hang.de_nghi dn SET nguoi_duyet_bp=tk.ma_nhan_vien,ngay_duyet_bp=dn.ngay_duyet
    FROM mua_hang.tai_khoan tk WHERE tk.ma_tai_khoan=dn.nguoi_duyet AND dn.nguoi_duyet_bp IS NULL;
    UPDATE mua_hang.de_nghi SET ly_do_tra_lai=ly_do WHERE ly_do_tra_lai IS NULL AND trang_thai='TRA_LAI';
    UPDATE mua_hang.de_nghi SET ngay_hieu_luc=ngay_lap WHERE ngay_hieu_luc IS NULL;
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS mua_hang.lich_su_trang_thai (
  id varchar(24) PRIMARY KEY, bang varchar(40) NOT NULL, id_ban_ghi varchar(24) NOT NULL,
  tu_trang_thai varchar(30), sang_trang_thai varchar(30) NOT NULL,
  nguoi_thuc_hien varchar(20) NOT NULL, thoi_diem timestamptz NOT NULL DEFAULT now(), ghi_chu text
);
CREATE INDEX IF NOT EXISTS ix_lich_su_trang_thai ON mua_hang.lich_su_trang_thai(bang,id_ban_ghi,thoi_diem DESC);
CREATE INDEX IF NOT EXISTS ix_lich_su_nguoi_xu_ly ON mua_hang.lich_su_trang_thai(nguoi_thuc_hien,bang,id_ban_ghi);
CREATE INDEX IF NOT EXISTS ix_de_nghi_dong_id_de_nghi ON mua_hang.de_nghi_dong(id_de_nghi);
INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES ('073','Tuong thich du lieu de nghi cu voi hang doi va lich su viec cua toi')
ON CONFLICT (version) DO NOTHING;
COMMIT;
