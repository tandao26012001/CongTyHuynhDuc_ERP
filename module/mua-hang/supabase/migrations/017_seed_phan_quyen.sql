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
ON CONFLICT(ma) DO UPDATE SET ten=EXCLUDED.ten,thu_tu=EXCLUDED.thu_tu,mo_ta=EXCLUDED.mo_ta;

WITH trang(ma) AS (VALUES
 ('home'),('de_nghi'),('xac_nhan_kt'),('bao_gia'),('don_hang'),('cong_viec'),
 ('giao_nhan'),('dat_ngoai'),('dieu_xe'),('thanh_toan'),('ncc'),('danh_muc'),
 ('bao_cao'),('tien_ich'),('quan_tri')
)
INSERT INTO mua_hang.phan_quyen(vai_tro,trang,duoc_xem,duoc_sua,duoc_duyet,duoc_xuat,pham_vi)
SELECT v.ma,t.ma,false,false,false,false,'ca_nhan'
FROM mua_hang.vai_tro v CROSS JOIN trang t
ON CONFLICT(vai_tro,trang) DO NOTHING;

WITH cap(vai_tro,ds_trang,xem,sua,duyet,xuat,pham_vi) AS (VALUES
 ('QUAN_TRI_KY_THUAT','home,de_nghi,xac_nhan_kt,bao_gia,don_hang,cong_viec,giao_nhan,dat_ngoai,dieu_xe,thanh_toan',true,false,false,false,'toan_bo'),
 ('QUAN_TRI_KY_THUAT','ncc,danh_muc,tien_ich',true,true,false,false,'toan_bo'),
 ('QUAN_TRI_KY_THUAT','bao_cao',true,false,false,true,'toan_bo'),
 ('QUAN_TRI_KY_THUAT','quan_tri',true,true,true,true,'toan_bo'),

 ('QUAN_TRI_NGHIEP_VU','home,giao_nhan,dat_ngoai',true,false,false,false,'toan_bo'),
 ('QUAN_TRI_NGHIEP_VU','de_nghi,don_hang,ncc',true,true,true,false,'toan_bo'),
 ('QUAN_TRI_NGHIEP_VU','xac_nhan_kt',true,false,true,false,'toan_bo'),
 ('QUAN_TRI_NGHIEP_VU','bao_gia,cong_viec,dieu_xe,thanh_toan,danh_muc,tien_ich',true,true,false,false,'toan_bo'),
 ('QUAN_TRI_NGHIEP_VU','bao_cao',true,false,false,true,'toan_bo'),
 ('QUAN_TRI_NGHIEP_VU','quan_tri',true,false,false,false,'toan_bo'),

 ('BAN_LANH_DAO','home,xac_nhan_kt,bao_gia,cong_viec,giao_nhan,dat_ngoai,dieu_xe,danh_muc,tien_ich',true,false,false,false,'toan_bo'),
 ('BAN_LANH_DAO','de_nghi,don_hang,thanh_toan,ncc',true,false,true,false,'toan_bo'),
 ('BAN_LANH_DAO','bao_cao',true,false,false,true,'toan_bo'),

 ('TBP_MUA_HANG','home',true,false,false,false,'bo_phan'),
 ('TBP_MUA_HANG','de_nghi,bao_gia,don_hang,ncc',true,true,true,false,'toan_bo'),
 ('TBP_MUA_HANG','xac_nhan_kt',true,false,true,false,'toan_bo'),
 ('TBP_MUA_HANG','cong_viec',true,true,false,false,'toan_bo'),
 ('TBP_MUA_HANG','giao_nhan,dat_ngoai,danh_muc',true,false,false,false,'toan_bo'),
 ('TBP_MUA_HANG','dieu_xe,thanh_toan,tien_ich',true,true,false,false,'toan_bo'),
 ('TBP_MUA_HANG','bao_cao',true,false,false,true,'toan_bo'),

 ('NV_MUA_HANG','home,cong_viec,bao_cao',true,false,false,false,'ca_nhan'),
 ('NV_MUA_HANG','de_nghi,bao_gia,don_hang',true,true,false,false,'ca_nhan'),
 ('NV_MUA_HANG','xac_nhan_kt,dieu_xe,thanh_toan,ncc,tien_ich',true,true,false,false,'ca_nhan'),
 ('NV_MUA_HANG','giao_nhan,dat_ngoai,danh_muc',true,false,false,false,'ca_nhan'),

 ('TBP_YEU_CAU','home,bao_gia,don_hang,cong_viec,giao_nhan,bao_cao',true,false,false,false,'bo_phan'),
 ('TBP_YEU_CAU','de_nghi',true,true,true,false,'bo_phan'),
 ('TBP_YEU_CAU','xac_nhan_kt,dieu_xe',true,true,false,false,'bo_phan'),
 ('TBP_YEU_CAU','ncc,danh_muc,tien_ich',true,false,false,false,'bo_phan'),

 ('NV_YEU_CAU','home,don_hang,cong_viec,giao_nhan',true,false,false,false,'ca_nhan'),
 ('NV_YEU_CAU','de_nghi,dieu_xe',true,true,false,false,'ca_nhan'),
 ('NV_YEU_CAU','xac_nhan_kt,ncc,danh_muc,tien_ich',true,false,false,false,'ca_nhan'),

 ('KY_THUAT','home,de_nghi,bao_gia,don_hang,giao_nhan,dat_ngoai,ncc,danh_muc,bao_cao,tien_ich',true,false,false,false,'toan_bo'),
 ('KY_THUAT','xac_nhan_kt',true,true,true,false,'toan_bo'),
 ('KY_THUAT','cong_viec',true,false,false,false,'ca_nhan'),

 ('TBP_KHO_VAN','home,cong_viec,bao_cao',true,false,false,false,'bo_phan'),
 ('TBP_KHO_VAN','de_nghi,don_hang',true,false,false,false,'toan_bo'),
 ('TBP_KHO_VAN','xac_nhan_kt',true,false,true,false,'toan_bo'),
 ('TBP_KHO_VAN','giao_nhan,dieu_xe',true,true,true,false,'toan_bo'),
 ('TBP_KHO_VAN','dat_ngoai,ncc,tien_ich',true,false,false,false,'toan_bo'),
 ('TBP_KHO_VAN','danh_muc',true,true,false,false,'toan_bo'),

 ('NV_KHO_VAN','home,cong_viec',true,false,false,false,'ca_nhan'),
 ('NV_KHO_VAN','de_nghi,xac_nhan_kt,don_hang,dat_ngoai,ncc,danh_muc,tien_ich',true,false,false,false,'ca_nhan'),
 ('NV_KHO_VAN','giao_nhan,dieu_xe',true,true,false,false,'ca_nhan'),

 ('QC','home,de_nghi,xac_nhan_kt,don_hang,cong_viec,dat_ngoai,ncc,danh_muc,bao_cao,tien_ich',true,false,false,false,'ca_nhan'),
 ('QC','giao_nhan',true,true,true,false,'toan_bo'),

 ('TBP_KINH_DOANH','home,cong_viec,bao_cao',true,false,false,false,'bo_phan'),
 ('TBP_KINH_DOANH','de_nghi,xac_nhan_kt,bao_gia,don_hang,giao_nhan,ncc,danh_muc,tien_ich',true,false,false,false,'toan_bo'),
 ('TBP_KINH_DOANH','dat_ngoai',true,true,true,false,'toan_bo'),
 ('TBP_KINH_DOANH','dieu_xe',true,true,false,false,'toan_bo'),

 ('NV_KINH_DOANH','home,cong_viec',true,false,false,false,'ca_nhan'),
 ('NV_KINH_DOANH','de_nghi,xac_nhan_kt,bao_gia,don_hang,giao_nhan,ncc,danh_muc,tien_ich',true,false,false,false,'ca_nhan'),
 ('NV_KINH_DOANH','dat_ngoai,dieu_xe',true,true,false,false,'ca_nhan'),

 ('KE_TOAN','home,de_nghi,bao_gia,don_hang,giao_nhan,dat_ngoai,ncc,danh_muc,tien_ich',true,false,false,false,'toan_bo'),
 ('KE_TOAN','thanh_toan',true,true,false,false,'toan_bo'),
 ('KE_TOAN','bao_cao',true,false,false,true,'toan_bo'),

 ('CHI_XEM','home,de_nghi,don_hang,giao_nhan,dat_ngoai,dieu_xe,ncc,danh_muc,bao_cao,tien_ich',true,false,false,false,'ca_nhan')
), mo AS (
 SELECT vai_tro,trim(x) trang,xem,sua,duyet,xuat,pham_vi
 FROM cap CROSS JOIN LATERAL regexp_split_to_table(ds_trang,',') x
)
UPDATE mua_hang.phan_quyen p SET
  duoc_xem=mo.xem,duoc_sua=mo.sua,duoc_duyet=mo.duyet,duoc_xuat=mo.xuat,pham_vi=mo.pham_vi
FROM mo WHERE p.vai_tro=mo.vai_tro AND p.trang=mo.trang;

INSERT INTO mua_hang.tham_so_he_thong(ma,gia_tri,kieu,mo_ta,nhom)
VALUES('HD_PHIEN_HET_HAN_PHUT','480','INTEGER','Thời hạn phiên đăng nhập, mặc định 8 giờ','BAO_MAT')
ON CONFLICT(ma) DO UPDATE SET gia_tri=EXCLUDED.gia_tri,kieu=EXCLUDED.kieu,mo_ta=EXCLUDED.mo_ta;

INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES('017','Nap 15 vai tro, ma tran 15 trang va thoi han phien 480 phut');
