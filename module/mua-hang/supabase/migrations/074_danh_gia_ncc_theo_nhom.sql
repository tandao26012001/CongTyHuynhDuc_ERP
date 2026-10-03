BEGIN;

-- Khong chuyen diem cu sang nhom: pham vi giao dich cua diem cu khac nhau.
ALTER TABLE mua_hang.mat_hang_ncc
  ADD COLUMN IF NOT EXISTS pham_vi_danh_gia varchar(20) NOT NULL DEFAULT 'MA_VAT_TU'
  CHECK (pham_vi_danh_gia IN ('MA_VAT_TU', 'NHOM_HANG'));

-- Chi cac ho so moi duoc tao ro rang theo nhom; ho so cu van tra cuu duoc.
CREATE UNIQUE INDEX IF NOT EXISTS uq_mat_hang_ncc_nhom
  ON mua_hang.mat_hang_ncc
    (id_ncc, loai, coalesce(nhom_hang_chinh,''), coalesce(nhom_hang_chi_tiet,''),
     coalesce(ma_loai_gia_cong,''), coalesce(ma_cong_doan,''))
  WHERE pham_vi_danh_gia='NHOM_HANG';

INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES ('074','Danh gia NCC theo nhom; bao toan pham vi va diem lich su')
ON CONFLICT (version) DO NOTHING;
COMMIT;
