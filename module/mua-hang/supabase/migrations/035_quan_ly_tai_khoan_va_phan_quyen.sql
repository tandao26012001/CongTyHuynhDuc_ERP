BEGIN;

-- Môi trường hiện tại còn dùng bảng tai_khoan legacy. Hai bảng dưới đây độc lập
-- với cấu trúc tài khoản nên có thể bổ sung an toàn mà không đổi mật khẩu/phiên.
CREATE TABLE IF NOT EXISTS mua_hang.vai_tro (
  ma varchar(40) PRIMARY KEY,
  ten varchar(100) NOT NULL,
  thu_tu integer,
  mo_ta text
);

CREATE TABLE IF NOT EXISTS mua_hang.phan_quyen (
  vai_tro varchar(40) NOT NULL REFERENCES mua_hang.vai_tro(ma) ON DELETE RESTRICT,
  trang varchar(40) NOT NULL,
  duoc_xem boolean NOT NULL DEFAULT false,
  duoc_sua boolean NOT NULL DEFAULT false,
  duoc_duyet boolean NOT NULL DEFAULT false,
  duoc_xuat boolean NOT NULL DEFAULT false,
  pham_vi varchar(20) NOT NULL DEFAULT 'ca_nhan'
    CHECK (pham_vi IN ('toan_bo','bo_phan','ca_nhan')),
  phien_ban integer NOT NULL DEFAULT 1,
  ngay_sua timestamptz,
  nguoi_sua varchar(20),
  PRIMARY KEY (vai_tro, trang)
);

ALTER TABLE mua_hang.phan_quyen
  ADD COLUMN IF NOT EXISTS phien_ban integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS ngay_sua timestamptz,
  ADD COLUMN IF NOT EXISTS nguoi_sua varchar(20);

-- Vai trò ADMIN được giữ để tương thích các tài khoản đang vận hành.
INSERT INTO mua_hang.vai_tro(ma,ten,thu_tu,mo_ta)
VALUES ('ADMIN','Quản trị hệ thống',0,'Vai trò tương thích của hệ thống hiện tại')
ON CONFLICT(ma) DO UPDATE SET ten=excluded.ten,thu_tu=excluded.thu_tu,mo_ta=excluded.mo_ta;

INSERT INTO mua_hang.vai_tro(ma,ten,thu_tu,mo_ta) VALUES
('QUAN_TRI_KY_THUAT','Quản trị kỹ thuật',1,'Toàn bộ hệ thống, cấu hình và nhật ký'),
('QUAN_TRI_NGHIEP_VU','Quản trị nghiệp vụ',2,'Toàn bộ nghiệp vụ, danh mục và tham số'),
('BAN_LANH_DAO','Ban lãnh đạo',3,'Xem toàn công ty và duyệt mọi mức'),
('TBP_MUA_HANG','Trưởng BP Mua hàng',4,'Quản lý toàn bộ nghiệp vụ Mua hàng'),
('NV_MUA_HANG','Nhân viên Mua hàng',5,'Chứng từ được phân công'),
('TBP_YEU_CAU','Trưởng bộ phận yêu cầu',6,'Dữ liệu thuộc bộ phận'),
('NV_YEU_CAU','Nhân viên yêu cầu',7,'Phiếu cá nhân tạo'),
('KY_THUAT','Kỹ thuật',8,'Xác nhận kỹ thuật'),
('TBP_KHO_VAN','Trưởng BP Kho vận',9,'Danh mục vật tư, nhận hàng và điều xe'),
('NV_KHO_VAN','Nhân viên Kho vận',10,'Nhận hàng, xác nhận tồn và điều xe'),
('QC','Kiểm soát chất lượng',11,'IQC và hàng không phù hợp'),
('TBP_KINH_DOANH','Trưởng BP Kinh doanh',12,'Đặt ngoài và duyệt đặt ngoài'),
('NV_KINH_DOANH','Nhân viên Kinh doanh',13,'Lập đặt ngoài'),
('KE_TOAN','Kế toán',14,'Thanh toán và bàn giao chứng từ'),
('CHI_XEM','Chỉ xem',15,'Quyền xem theo chỉ định')
ON CONFLICT(ma) DO UPDATE SET ten=excluded.ten,thu_tu=excluded.thu_tu,mo_ta=excluded.mo_ta;

WITH trang(ma) AS (VALUES
 ('home'),('de_nghi'),('xac_nhan_kt'),('bao_gia'),('don_hang'),('cong_viec'),
 ('giao_nhan'),('dat_ngoai'),('dieu_xe'),('thanh_toan'),('ncc'),('danh_muc'),
 ('bao_cao'),('tien_ich'),('quan_tri')
)
INSERT INTO mua_hang.phan_quyen(
  vai_tro,trang,duoc_xem,duoc_sua,duoc_duyet,duoc_xuat,pham_vi
)
SELECT v.ma,t.ma,false,false,false,false,'ca_nhan'
FROM mua_hang.vai_tro v CROSS JOIN trang t
ON CONFLICT(vai_tro,trang) DO NOTHING;

WITH trang(ma) AS (VALUES
 ('home'),('de_nghi'),('xac_nhan_kt'),('bao_gia'),('don_hang'),('cong_viec'),
 ('giao_nhan'),('dat_ngoai'),('dieu_xe'),('thanh_toan'),('ncc'),('danh_muc'),
 ('bao_cao'),('tien_ich'),('quan_tri')
)
INSERT INTO mua_hang.phan_quyen(
  vai_tro,trang,duoc_xem,duoc_sua,duoc_duyet,duoc_xuat,pham_vi
)
SELECT 'ADMIN',ma,true,true,true,true,'toan_bo' FROM trang
ON CONFLICT(vai_tro,trang) DO UPDATE SET
  duoc_xem=true,duoc_sua=true,duoc_duyet=true,duoc_xuat=true,pham_vi='toan_bo';

INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES('035','Bo sung quan ly tai khoan legacy va ma tran phan quyen')
ON CONFLICT(version) DO NOTHING;

COMMIT;
