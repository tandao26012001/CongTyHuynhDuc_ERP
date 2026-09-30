BEGIN;

-- Quyen xem gia tach khoi quyen xem trang, mac dinh dong voi vai tro moi.
INSERT INTO mua_hang.phan_quyen
  (vai_tro,trang,duoc_xem,duoc_sua,duoc_duyet,duoc_xuat,pham_vi)
SELECT v.ma,p.trang,
       CASE
         WHEN p.trang='gia_giao_dich' THEN v.ma IN
           ('QUAN_TRI_KY_THUAT','QUAN_TRI_NGHIEP_VU','BAN_LANH_DAO',
            'TBP_MUA_HANG','NV_MUA_HANG','KE_TOAN')
         ELSE v.ma IN ('QUAN_TRI_NGHIEP_VU','BAN_LANH_DAO','TBP_MUA_HANG')
       END,
       false,false,false,'toan_bo'
FROM mua_hang.vai_tro v
CROSS JOIN (VALUES ('gia_giao_dich'),('gia_ncc')) AS p(trang)
ON CONFLICT (vai_tro,trang) DO NOTHING;

INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES ('051','Tach quyen xem gia giao dich va bang gia NCC khoi quyen trang')
ON CONFLICT(version) DO NOTHING;

COMMIT;
