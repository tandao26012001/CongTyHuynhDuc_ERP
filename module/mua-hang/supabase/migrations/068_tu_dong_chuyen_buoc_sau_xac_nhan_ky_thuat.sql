BEGIN;

-- Đồng bộ các phiếu đã được xác nhận đủ trước khi bật chuyển bước tự động.
WITH chuyen AS (
  UPDATE mua_hang.dat_ngoai p
  SET trang_thai='DANG_BAO_GIA',
      nguoi_xac_nhan_ky_thuat=coalesce(p.nguoi_xac_nhan_ky_thuat,
        (SELECT x.nguoi_xac_nhan FROM mua_hang.dat_ngoai_xac_nhan_kt x
         JOIN mua_hang.dat_ngoai_dong d ON d.id=x.id_dat_ngoai_dong
         WHERE d.id_dat_ngoai=p.id AND x.la_xac_nhan
         ORDER BY x.thoi_diem DESC,x.id DESC LIMIT 1)),
      xac_nhan_ky_thuat_luc=coalesce(p.xac_nhan_ky_thuat_luc,
        (SELECT max(x.thoi_diem) FROM mua_hang.dat_ngoai_xac_nhan_kt x
         JOIN mua_hang.dat_ngoai_dong d ON d.id=x.id_dat_ngoai_dong
         WHERE d.id_dat_ngoai=p.id AND x.la_xac_nhan)),
      ngay_sua=now(),phien_ban=p.phien_ban+1
  WHERE p.trang_thai='CHO_XAC_NHAN_KY_THUAT'
    AND EXISTS (SELECT 1 FROM mua_hang.dat_ngoai_dong d
                WHERE d.id_dat_ngoai=p.id AND d.can_xac_nhan_ky_thuat)
    AND NOT EXISTS (
      SELECT 1 FROM mua_hang.dat_ngoai_yeu_cau_kt y
      JOIN mua_hang.dat_ngoai_dong d ON d.id=y.id_dat_ngoai_dong
      WHERE d.id_dat_ngoai=p.id
        AND NOT EXISTS (
          SELECT 1 FROM mua_hang.dat_ngoai_xac_nhan_kt x
          WHERE x.id_yeu_cau=y.id AND x.la_xac_nhan
        )
    )
  RETURNING p.id,p.nguoi_xac_nhan_ky_thuat
), dong AS (
  UPDATE mua_hang.dat_ngoai_dong d
  SET trang_thai_dong='DANG_BAO_GIA',ngay_sua=now()
  FROM chuyen c WHERE d.id_dat_ngoai=c.id
    AND d.trang_thai_dong='CHO_XAC_NHAN_KY_THUAT'
  RETURNING d.id
)
INSERT INTO mua_hang.dat_ngoai_lich_su
  (id_dat_ngoai,trang_thai_cu,trang_thai_moi,noi_dung,nguoi_thuc_hien)
SELECT c.id,'CHO_XAC_NHAN_KY_THUAT','DANG_BAO_GIA',
       'Đã xác nhận kỹ thuật tất cả mã hàng.',c.nguoi_xac_nhan_ky_thuat
FROM chuyen c;

INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES ('068','Tu dong chuyen buoc phieu khi xac nhan ky thuat day du')
ON CONFLICT (version) DO NOTHING;

COMMIT;
