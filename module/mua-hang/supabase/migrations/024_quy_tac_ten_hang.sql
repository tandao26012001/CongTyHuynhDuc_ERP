-- Ánh xạ tên hàng sang thành phần mã theo QUY TẮC ĐẶT TÊN HÀNG.docx.
CREATE TABLE IF NOT EXISTS mua_hang.quy_tac_ten_hang (
  id varchar(30) PRIMARY KEY,
  loai varchar(20) NOT NULL CHECK (loai IN ('VAT_LIEU','BE_MAT','MAU_SAC')),
  tu_khoa varchar(100) NOT NULL,
  ten_chuan varchar(100) NOT NULL,
  ma_quy_uoc varchar(30) NOT NULL,
  uu_tien integer NOT NULL DEFAULT 0,
  trang_thai varchar(20) NOT NULL DEFAULT 'HOAT_DONG'
    CHECK (trang_thai IN ('HOAT_DONG','NGUNG')),
  UNIQUE (loai,tu_khoa)
);

INSERT INTO mua_hang.quy_tac_ten_hang(id,loai,tu_khoa,ten_chuan,ma_quy_uoc,uu_tien) VALUES
 ('VL-SUS316','VAT_LIEU','INOX 316','INOX 316','SUS316',100),
 ('VL-SUS304','VAT_LIEU','INOX 304','INOX 304','SUS304',100),
 ('VL-SUS201','VAT_LIEU','INOX 201','INOX 201','SUS201',100),
 ('VL-SUS316B','VAT_LIEU','SUS 316','INOX 316','SUS316',100),
 ('VL-SUS304B','VAT_LIEU','SUS 304','INOX 304','SUS304',100),
 ('VL-SUS201B','VAT_LIEU','SUS 201','INOX 201','SUS201',100),
 ('VL-SUS','VAT_LIEU','INOX','INOX','SUS',10),
 ('VL-SS400','VAT_LIEU','SAT','SẮT','SS400',50),
 ('VL-THEP','VAT_LIEU','THEP','THÉP','SS400',40),
 ('VL-AL5052','VAT_LIEU','NHOM 5052','NHÔM 5052','AL5052',100),
 ('VL-AL6061','VAT_LIEU','NHOM 6061','NHÔM 6061','AL6061',100),
 ('VL-AL7075','VAT_LIEU','NHOM 7075','NHÔM 7075','AL7075',100),
 ('VL-AL2017','VAT_LIEU','NHOM 2017','NHÔM 2017','AL2017',100),
 ('VL-AL','VAT_LIEU','NHOM','NHÔM','AL',10),
 ('VL-MICA','VAT_LIEU','MICA','MICA','MICA',50),
 ('VL-PET','VAT_LIEU','PET','PET','PET',50),
 ('VL-POM','VAT_LIEU','POM','POM','POM',50),
 ('VL-PHIMCAM','VAT_LIEU','PHIM CAM','PHÍM CAM','PHIM-CAM',50),
 ('VL-NHUAPP','VAT_LIEU','NHUA PP','NHỰA PP','NHUAPP',50),
 ('VL-POLY','VAT_LIEU','POLY','POLY','POLY',50),
 ('VL-HSS','VAT_LIEU','HSS','HSS','HSS',50),
 ('VL-CARB','VAT_LIEU','CARBIDE','CARBIDE','CARB',50),
 ('BM-SOC','BE_MAT','SOC','SỌC','SOC',50), ('BM-GAN','BE_MAT','GAN','GÂN','GAN',50),
 ('BM-2B','BE_MAT','2B','2B','2B',50), ('BM-PO','BE_MAT','PO','PO','PO',50),
 ('BM-MC','BE_MAT','MC','MC','MC',50),
 ('MS-TRONG','MAU_SAC','TRONG','TRONG','TRONG',50), ('MS-DEN','MAU_SAC','DEN','ĐEN','DEN',50),
 ('MS-TRANG','MAU_SAC','TRANG','TRẮNG','TRANG',50), ('MS-TRA','MAU_SAC','TRA','TRÀ','TRA',50),
 ('MS-XAMSUA','MAU_SAC','XAM SUA','XÁM SỮA','XAM-SUA',100), ('MS-XAM','MAU_SAC','XAM','XÁM','XAM',50),
 ('MS-XANH','MAU_SAC','XANH','XANH','XANH',50), ('MS-VANG','MAU_SAC','VANG','VÀNG','VANG',50)
ON CONFLICT (id) DO UPDATE SET ten_chuan=excluded.ten_chuan,
 ma_quy_uoc=excluded.ma_quy_uoc,uu_tien=excluded.uu_tien;
