BEGIN;

ALTER TABLE mua_hang.dat_ngoai_yeu_cau_kt
  ADD COLUMN IF NOT EXISTS la_ban_dau boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS ux_dat_ngoai_yeu_cau_kt_ban_dau
  ON mua_hang.dat_ngoai_yeu_cau_kt(id_dat_ngoai_dong)
  WHERE la_ban_dau;

-- Mỗi mã cần kỹ thuật có một câu hỏi ban đầu, kể cả phiếu đã tạo trước đây.
INSERT INTO mua_hang.dat_ngoai_yeu_cau_kt
  (id,id_dat_ngoai_dong,noi_dung,nguoi_yeu_cau,thoi_diem,la_ban_dau)
SELECT 'DNBD-' || substr(md5(d.id),1,19),d.id,
       coalesce(nullif(trim(d.noi_dung_can_xac_nhan_kt),''),
                nullif(trim(d.yeu_cau_ky_thuat),''),
                'Yêu cầu xác nhận kỹ thuật ban đầu'),
       p.nguoi_lap,d.ngay_tao,true
FROM mua_hang.dat_ngoai_dong d
JOIN mua_hang.dat_ngoai p ON p.id=d.id_dat_ngoai
WHERE d.can_xac_nhan_ky_thuat
  AND NOT EXISTS (
    SELECT 1 FROM mua_hang.dat_ngoai_yeu_cau_kt y
    WHERE y.id_dat_ngoai_dong=d.id AND y.la_ban_dau
  )
ON CONFLICT DO NOTHING;

-- Gắn lần xác nhận cũ đầu tiên vào đúng câu hỏi ban đầu.
WITH xac_nhan_cu AS (
  SELECT DISTINCT ON (x.id_dat_ngoai_dong)
         x.id,x.id_dat_ngoai_dong
  FROM mua_hang.dat_ngoai_xac_nhan_kt x
  WHERE x.la_xac_nhan AND x.id_yeu_cau IS NULL
  ORDER BY x.id_dat_ngoai_dong,x.thoi_diem,x.id
)
UPDATE mua_hang.dat_ngoai_xac_nhan_kt x
SET id_yeu_cau=y.id
FROM xac_nhan_cu cu
JOIN mua_hang.dat_ngoai_yeu_cau_kt y
  ON y.id_dat_ngoai_dong=cu.id_dat_ngoai_dong AND y.la_ban_dau
WHERE x.id=cu.id
  AND NOT EXISTS (
    SELECT 1 FROM mua_hang.dat_ngoai_xac_nhan_kt da
    WHERE da.id_yeu_cau=y.id
  );

-- Phiếu cũ chỉ xác nhận ở cấp phiếu: giữ kết quả đó cho từng câu hỏi ban đầu.
WITH lan_xac_nhan AS (
  SELECT DISTINCT ON (ls.id_dat_ngoai)
         ls.id_dat_ngoai,ls.thoi_diem,ls.noi_dung,ls.nguoi_thuc_hien
  FROM mua_hang.dat_ngoai_lich_su ls
  WHERE ls.trang_thai_cu='CHO_XAC_NHAN_KY_THUAT'
    AND ls.trang_thai_moi='DANG_BAO_GIA'
  ORDER BY ls.id_dat_ngoai,ls.thoi_diem,ls.id
)
INSERT INTO mua_hang.dat_ngoai_xac_nhan_kt
  (id,id_dat_ngoai_dong,noi_dung,nguoi_xac_nhan,thoi_diem,la_xac_nhan,id_yeu_cau)
SELECT 'DNLG-' || substr(md5(d.id),1,19),d.id,
       coalesce(nullif(trim(ls.noi_dung),''),'Đã xác nhận kỹ thuật theo phiếu'),
       coalesce(ls.nguoi_thuc_hien,p.nguoi_xac_nhan_ky_thuat,p.nguoi_lap),
       ls.thoi_diem,true,y.id
FROM mua_hang.dat_ngoai_yeu_cau_kt y
JOIN mua_hang.dat_ngoai_dong d ON d.id=y.id_dat_ngoai_dong
JOIN mua_hang.dat_ngoai p ON p.id=d.id_dat_ngoai
JOIN lan_xac_nhan ls ON ls.id_dat_ngoai=p.id
WHERE y.la_ban_dau
  AND NOT EXISTS (
    SELECT 1 FROM mua_hang.dat_ngoai_xac_nhan_kt x
    WHERE x.id_yeu_cau=y.id AND x.la_xac_nhan
  )
ON CONFLICT DO NOTHING;

INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES ('067','Luu yeu cau ky thuat ban dau thanh cau hoi co tra loi theo ma')
ON CONFLICT (version) DO NOTHING;

COMMIT;
