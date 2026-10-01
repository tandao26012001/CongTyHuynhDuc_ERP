BEGIN;

-- DOCX v3, PQ-02. ADMIN la vai tro bootstrap bo sung ngoai 16 dong tai lieu.
-- Ghi lai phe duyet cua nguoi dung, giu nguyen vai tro tai khoan va quyen dang chay.
WITH doi_chieu(vai_tro_cu, ma_loai_tk, ghi_chu) AS (
  VALUES
    ('ADMIN', 'QUAN_TRI_HE_THONG', 'Vai tro bootstrap bo sung; giu quyen quan tri.'),
    ('QUAN_TRI_KY_THUAT', 'QUAN_TRI_HE_THONG', 'Bo phan IT.'),
    ('QUAN_TRI_NGHIEP_VU', 'QUAN_TRI_HE_THONG', 'Bo phan Mua hang; phuong an a cua PQ-03.'),
    ('BAN_LANH_DAO', 'BAN_LANH_DAO', NULL),
    ('TBP_MUA_HANG', 'TRUONG_BO_PHAN', NULL),
    ('NV_MUA_HANG', 'NHAN_VIEN', NULL),
    ('TBP_YEU_CAU', 'TRUONG_BO_PHAN', NULL),
    ('NV_YEU_CAU', 'NHAN_VIEN', NULL),
    ('KY_THUAT', 'KY_THUAT', NULL),
    ('TBP_KHO_VAN', 'TRUONG_BO_PHAN', NULL),
    ('NV_KHO_VAN', 'NHAN_VIEN', NULL),
    ('TBP_QC', 'TRUONG_BO_PHAN', NULL),
    ('QC', 'NHAN_VIEN', NULL),
    ('TBP_KINH_DOANH', 'TRUONG_BO_PHAN', NULL),
    ('NV_KINH_DOANH', 'NHAN_VIEN', NULL),
    ('KE_TOAN', 'KE_TOAN', NULL),
    ('CHI_XEM', 'CHI_XEM', NULL)
)
INSERT INTO mua_hang.doi_chieu_vai_tro_loai_tk
  (vai_tro_cu, ma_loai_tk, nguoi_duyet, thoi_diem_duyet, ghi_chu)
SELECT d.vai_tro_cu, d.ma_loai_tk, 'XAC_NHAN_NGUOI_DUNG', now(), d.ghi_chu
FROM doi_chieu d
JOIN mua_hang.vai_tro v ON v.ma=d.vai_tro_cu
JOIN mua_hang.loai_tai_khoan l ON l.ma=d.ma_loai_tk
ON CONFLICT (vai_tro_cu) DO UPDATE SET
  ma_loai_tk=excluded.ma_loai_tk,
  nguoi_duyet=excluded.nguoi_duyet,
  thoi_diem_duyet=excluded.thoi_diem_duyet,
  ghi_chu=excluded.ghi_chu;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM mua_hang.vai_tro v
    LEFT JOIN mua_hang.doi_chieu_vai_tro_loai_tk d ON d.vai_tro_cu=v.ma
    WHERE d.ma_loai_tk IS NULL
  ) THEN
    RAISE EXCEPTION 'Con vai tro chua co loai tai khoan v3';
  END IF;
END $$;

-- Chuyen 7 tai khoan hien co sang loai v3 ma khong thay doi quyen dang nhap
-- truoc khi ma tran moi va backend duoc chuyen cung luc.
ALTER TABLE mua_hang.tai_khoan
  ADD COLUMN IF NOT EXISTS ma_loai_tk varchar(40)
    REFERENCES mua_hang.loai_tai_khoan(ma) ON DELETE RESTRICT;

UPDATE mua_hang.tai_khoan t
SET ma_loai_tk=d.ma_loai_tk
FROM mua_hang.doi_chieu_vai_tro_loai_tk d
WHERE t.vai_tro=d.vai_tro_cu
  AND t.ma_loai_tk IS DISTINCT FROM d.ma_loai_tk;

CREATE INDEX IF NOT EXISTS ix_tai_khoan_ma_loai_tk
  ON mua_hang.tai_khoan(ma_loai_tk);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM mua_hang.tai_khoan
    WHERE vai_tro IS NOT NULL AND ma_loai_tk IS NULL
  ) THEN
    RAISE EXCEPTION 'Con tai khoan chua duoc doi chieu loai v3';
  END IF;
END $$;

INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES ('064','Doi chieu vai tro cu voi 7 loai tai khoan theo PQ-02 va vai tro ADMIN bo sung')
ON CONFLICT (version) DO NOTHING;

COMMIT;
