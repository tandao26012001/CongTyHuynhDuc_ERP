-- Quy tắc mã vật tư theo QT-KV-01-PL02.
-- Số thứ tự có tối thiểu 2 chữ số và tự mở rộng không giới hạn.
CREATE TABLE IF NOT EXISTS mua_hang.quy_tac_ma_vat_tu (
  ma_quy_tac varchar(30) PRIMARY KEY,
  kho varchar(10) NOT NULL CHECK (kho IN ('TH','VT','TL')),
  ma_nhom varchar(10) NOT NULL,
  ten_nhom varchar(150) NOT NULL,
  mau_ma varchar(100) NOT NULL,
  can_ma_vat_lieu boolean NOT NULL DEFAULT false,
  can_loai_hinh boolean NOT NULL DEFAULT false,
  thu_tu integer NOT NULL DEFAULT 0,
  trang_thai varchar(20) NOT NULL DEFAULT 'HOAT_DONG'
    CHECK (trang_thai IN ('HOAT_DONG','NGUNG')),
  UNIQUE (kho, ma_nhom)
);

CREATE TABLE IF NOT EXISTS mua_hang.bo_dem_ma_vat_tu (
  khoa_ma varchar(80) PRIMARY KEY,
  so_hien_tai bigint NOT NULL DEFAULT 0 CHECK (so_hien_tai >= 0),
  ngay_sua timestamptz NOT NULL DEFAULT now()
);

INSERT INTO mua_hang.quy_tac_ma_vat_tu
  (ma_quy_tac,kho,ma_nhom,ten_nhom,mau_ma,can_ma_vat_lieu,can_loai_hinh,thu_tu)
VALUES
  ('TH-TP','TH','TP','Trang phục','TH-TP-{STT}',false,false,10),
  ('TH-VP','TH','VP','Văn phòng phẩm','TH-VP-{STT}',false,false,20),
  ('TH-CT','TH','CT','Căn tin và vệ sinh','TH-CT-{STT}',false,false,30),
  ('TH-HC','TH','HC','Hoá chất','TH-HC-{STT}',false,false,40),
  ('TH-BH','TH','BH','Bảo hộ','TH-BH-{STT}',false,false,50),
  ('TH-SX','TH','SX','Dụng cụ và vật tư tiêu hao hỗ trợ sản xuất','TH-SX-{STT}',false,false,60),
  ('TH-TDH','TH','TDH','Linh kiện thay thế máy móc thiết bị','TH-TDH-{STT}',false,false,70),
  ('TH-NK','TH','NK','Ngũ kim','TH-NK-{STT}',false,false,80),
  ('TH-VI','TH','VI','Vít','TH-VI-{STT}',false,false,90),
  ('TH-LD','TH','LD','Lông đền','TH-LD-{STT}',false,false,100),
  ('TH-TA','TH','TA','Tán','TH-TA-{STT}',false,false,110),
  ('TH-BL','TH','BL','Bulong','TH-BL-{STT}',false,false,120),
  ('TH-LGT','TH','LGT','Lục giác đầu trụ','TH-LGT-{STT}',false,false,130),
  ('TH-LGC','TH','LGC','Lục giác đầu côn','TH-LGC-{STT}',false,false,140),
  ('TH-LGA','TH','LGA','Lục giác âm','TH-LGA-{STT}',false,false,150),
  ('TH-LGD','TH','LGD','Lục giác đầu dù','TH-LGD-{STT}',false,false,160),
  ('VT-NC','VT','NC','Nguyên cây','VT-NC-{MVL}-{LOAI_HINH}-{STT}',true,true,200),
  ('VT-LC','VT','LC','Lẻ cây','VT-LC-{MVL}-{LOAI_HINH}-{STT}',true,true,210),
  ('VT-TN','VT','TN','Tấm nguyên','VT-TN-{MVL}-{STT}',true,false,220),
  ('VT-TL','VT','TL','Tấm lẻ','VT-TL-{MVL}-{STT}',true,false,230),
  ('VT-PT','VT','PT','Phôi tấm','VT-PT-{MVL}-{STT}',true,false,240),
  ('VT-PL','VT','PL','Phôi lẻ','VT-PL-{MVL}-{STT}',true,false,250),
  ('VT-SX','VT','SX','Linh kiện theo PO/lệnh sản xuất','VT-SX-{STT}',false,false,260),
  ('TL-MK','TL','MK','Mũi khoan','TL-MK-{MVL}-{STT}',true,false,300),
  ('TL-MP','TL','MP','Mũi phay','TL-MP-{MVL}-{STT}',true,false,310),
  ('TL-MR','TL','MR','Mũi reamer','TL-MR-{MVL}-{STT}',true,false,320),
  ('TL-DT','TL','DT','Dao tiện','TL-DT-{MVL}-{STT}',true,false,330),
  ('TL-MC','TL','MC','Mâm cặp','TL-MC-{MVL}-{STT}',true,false,340)
ON CONFLICT (ma_quy_tac) DO UPDATE SET
  ten_nhom=excluded.ten_nhom, mau_ma=excluded.mau_ma,
  can_ma_vat_lieu=excluded.can_ma_vat_lieu,
  can_loai_hinh=excluded.can_loai_hinh, thu_tu=excluded.thu_tu;
