-- Hoan thien F01: duyet BLD, SLA tung dong, xoa mem va idempotency tao de nghi.
ALTER TABLE mua_hang.de_nghi
  ADD COLUMN IF NOT EXISTS can_bld_duyet boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS nguoi_duyet_bld varchar(20)
    REFERENCES mua_hang.nhan_vien(ma_nhan_vien) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS ngay_duyet_bld timestamptz;

ALTER TABLE mua_hang.de_nghi_dong
  ADD COLUMN IF NOT EXISTS muc_do_uu_tien smallint
    CHECK (muc_do_uu_tien IS NULL OR muc_do_uu_tien BETWEEN 1 AND 3),
  ADD COLUMN IF NOT EXISTS ngay_du_kien_ve date,
  ADD COLUMN IF NOT EXISTS ma_loai_gia_cong varchar(20),
  ADD COLUMN IF NOT EXISTS yeu_cau_ky_thuat text,
  ADD COLUMN IF NOT EXISTS da_xoa boolean NOT NULL DEFAULT false;

ALTER TABLE mua_hang.de_nghi_dong
  DROP CONSTRAINT IF EXISTS de_nghi_dong_id_de_nghi_stt_dong_key;
CREATE UNIQUE INDEX IF NOT EXISTS ux_de_nghi_dong_stt_dang_dung
  ON mua_hang.de_nghi_dong(id_de_nghi, stt_dong)
  WHERE da_xoa = false;

CREATE INDEX IF NOT EXISTS ix_de_nghi_dong_dang_dung
  ON mua_hang.de_nghi_dong(id_de_nghi, da_xoa, stt_dong);

INSERT INTO mua_hang.schema_migrations(version, mo_ta)
VALUES ('021', 'Hoan thien F01: duyet BLD, SLA tung dong, xoa mem va idempotency')
ON CONFLICT(version) DO NOTHING;
