BEGIN;

CREATE TABLE IF NOT EXISTS mua_hang.loai_tai_khoan (
  ma varchar(40) PRIMARY KEY, ten varchar(100) NOT NULL, thu_tu integer NOT NULL, mo_ta text
);
INSERT INTO mua_hang.loai_tai_khoan(ma,ten,thu_tu,mo_ta) VALUES
 ('QUAN_TRI_HE_THONG','Quản trị hệ thống',1,'Quản trị kỹ thuật và chủ hệ thống nghiệp vụ'),
 ('BAN_LANH_DAO','Ban lãnh đạo',2,'Xem toàn công ty và duyệt theo phân quyền'),
 ('TRUONG_BO_PHAN','Trưởng bộ phận',3,'Quản lý trong phạm vi bộ phận được gán'),
 ('NHAN_VIEN','Nhân viên',4,'Thao tác theo phạm vi bộ phận hoặc phân công'),
 ('KY_THUAT','Kỹ thuật',5,'Xác nhận kỹ thuật theo phân công'),
 ('KE_TOAN','Kế toán',6,'Theo dõi nghiệp vụ thanh toán liên bộ phận'),
 ('CHI_XEM','Chỉ xem',7,'Chỉ xem trong phạm vi được gán')
ON CONFLICT (ma) DO UPDATE SET ten=excluded.ten,thu_tu=excluded.thu_tu,mo_ta=excluded.mo_ta;

ALTER TABLE mua_hang.vai_tro ADD COLUMN IF NOT EXISTS ma_loai_tk varchar(40)
  REFERENCES mua_hang.loai_tai_khoan(ma) ON DELETE RESTRICT;
INSERT INTO mua_hang.vai_tro(ma,ten,thu_tu,mo_ta) VALUES
 ('TBP_QC','Trưởng BP Kiểm soát chất lượng',16,'Trưởng bộ phận QC')
ON CONFLICT (ma) DO NOTHING;
UPDATE mua_hang.vai_tro SET ma_loai_tk=CASE ma
 WHEN 'ADMIN' THEN 'QUAN_TRI_HE_THONG'
 WHEN 'QUAN_TRI_KY_THUAT' THEN 'QUAN_TRI_HE_THONG'
 WHEN 'QUAN_TRI_NGHIEP_VU' THEN 'QUAN_TRI_HE_THONG'
 WHEN 'BAN_LANH_DAO' THEN 'BAN_LANH_DAO'
 WHEN 'TBP_MUA_HANG' THEN 'TRUONG_BO_PHAN'
 WHEN 'TBP_YEU_CAU' THEN 'TRUONG_BO_PHAN'
 WHEN 'TBP_KHO_VAN' THEN 'TRUONG_BO_PHAN'
 WHEN 'TBP_QC' THEN 'TRUONG_BO_PHAN'
 WHEN 'TBP_KINH_DOANH' THEN 'TRUONG_BO_PHAN'
 WHEN 'NV_MUA_HANG' THEN 'NHAN_VIEN'
 WHEN 'NV_YEU_CAU' THEN 'NHAN_VIEN'
 WHEN 'NV_KHO_VAN' THEN 'NHAN_VIEN'
 WHEN 'QC' THEN 'NHAN_VIEN'
 WHEN 'NV_KINH_DOANH' THEN 'NHAN_VIEN'
 WHEN 'KY_THUAT' THEN 'KY_THUAT'
 WHEN 'KE_TOAN' THEN 'KE_TOAN'
 WHEN 'CHI_XEM' THEN 'CHI_XEM'
 ELSE ma_loai_tk END;

CREATE TABLE IF NOT EXISTS mua_hang.phan_quyen_loai_tai_khoan (
 ma_loai_tk varchar(40) NOT NULL REFERENCES mua_hang.loai_tai_khoan(ma) ON DELETE RESTRICT,
 ma_bo_phan varchar(10) NOT NULL, trang varchar(40) NOT NULL,
 duoc_xem boolean NOT NULL DEFAULT false, duoc_sua boolean NOT NULL DEFAULT false,
 duoc_duyet boolean NOT NULL DEFAULT false, duoc_xuat boolean NOT NULL DEFAULT false,
 pham_vi_xem varchar(20) NOT NULL DEFAULT 'ca_nhan' CHECK (pham_vi_xem IN ('toan_bo','bo_phan','ca_nhan')),
 pham_vi_sua varchar(20) NOT NULL DEFAULT 'ca_nhan' CHECK (pham_vi_sua IN ('toan_bo','bo_phan','ca_nhan')),
 kieu_sua varchar(20) NOT NULL DEFAULT 'THANG' CHECK (kieu_sua IN ('THANG','CAN_DUYET')),
 ma_loai_tk_duyet varchar(40) REFERENCES mua_hang.loai_tai_khoan(ma) ON DELETE RESTRICT,
 phien_ban integer NOT NULL DEFAULT 1, ngay_sua timestamptz, nguoi_sua varchar(20),
 PRIMARY KEY (ma_loai_tk,ma_bo_phan,trang)
);
CREATE INDEX IF NOT EXISTS ix_phan_quyen_loai_tk_bo_phan
 ON mua_hang.phan_quyen_loai_tai_khoan(ma_bo_phan,ma_loai_tk);

-- Preserve each existing job role and initialize the matrix for its department.
INSERT INTO mua_hang.phan_quyen_loai_tai_khoan
 (ma_loai_tk,ma_bo_phan,trang,duoc_xem,duoc_sua,duoc_duyet,duoc_xuat,pham_vi_xem,pham_vi_sua)
SELECT v.ma_loai_tk,bp.ma_bo_phan,p.trang,bool_or(p.duoc_xem),bool_or(p.duoc_sua),
 bool_or(p.duoc_duyet),bool_or(p.duoc_xuat),
 CASE WHEN bool_or(p.pham_vi='toan_bo') THEN 'toan_bo' WHEN bool_or(p.pham_vi='bo_phan') THEN 'bo_phan' ELSE 'ca_nhan' END,
 CASE WHEN bool_or(p.pham_vi='toan_bo') THEN 'toan_bo' WHEN bool_or(p.pham_vi='bo_phan') THEN 'bo_phan' ELSE 'ca_nhan' END
FROM mua_hang.vai_tro v
CROSS JOIN mua_hang.bo_phan bp
JOIN mua_hang.phan_quyen p ON p.vai_tro=v.ma
WHERE v.ma_loai_tk IS NOT NULL AND bp.trang_thai= 'HOAT_DONG'
GROUP BY v.ma_loai_tk,bp.ma_bo_phan,p.trang
ON CONFLICT (ma_loai_tk,ma_bo_phan,trang) DO NOTHING;

-- Global roles have a deliberate wildcard row; ordinary users never fall back to it.
INSERT INTO mua_hang.phan_quyen_loai_tai_khoan
 (ma_loai_tk,ma_bo_phan,trang,duoc_xem,duoc_sua,duoc_duyet,duoc_xuat,pham_vi_xem,pham_vi_sua)
SELECT v.ma_loai_tk,'*',p.trang,bool_or(p.duoc_xem),bool_or(p.duoc_sua),bool_or(p.duoc_duyet),bool_or(p.duoc_xuat),'toan_bo','toan_bo'
FROM mua_hang.vai_tro v JOIN mua_hang.phan_quyen p ON p.vai_tro=v.ma
WHERE v.ma IN ('ADMIN','QUAN_TRI_KY_THUAT','QUAN_TRI_NGHIEP_VU','BAN_LANH_DAO')
GROUP BY v.ma_loai_tk,p.trang
ON CONFLICT (ma_loai_tk,ma_bo_phan,trang) DO NOTHING;

INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES ('047','Them loai tai khoan va ma tran quyen theo bo phan')
ON CONFLICT (version) DO NOTHING;
COMMIT;
