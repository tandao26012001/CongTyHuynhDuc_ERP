BEGIN;

-- Repair databases where the base migration was marked applied without this table.
CREATE TABLE IF NOT EXISTS mua_hang.bo_dem_chung_tu (
  tien_to varchar(10) NOT NULL,
  nam smallint NOT NULL CHECK (nam BETWEEN 2000 AND 9999),
  so_hien_tai integer NOT NULL CHECK (so_hien_tai >= 0),
  PRIMARY KEY (tien_to, nam)
);

INSERT INTO mua_hang.schema_migrations(version,mo_ta)
VALUES ('055','Khoi phuc bang bo dem chung tu bi thieu tren mot so DB')
ON CONFLICT (version) DO NOTHING;

COMMIT;
