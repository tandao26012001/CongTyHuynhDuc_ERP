"""SQL đọc/ghi danh mục. Service khác không truy vấn trực tiếp các bảng này."""

import json
import re
import uuid

from psycopg import sql
from psycopg.errors import CheckViolation, ForeignKeyViolation, UniqueViolation
from psycopg.types.json import Jsonb

from backend.data.db import get_conn
from backend.services.bo_loc import tao_menh_de


def la_schema_rut_gon() -> bool:
    with get_conn() as conn:
        return not conn.execute(
            "SELECT to_regclass('mua_hang.vat_tu') IS NOT NULL AS co"
        ).fetchone()["co"]


def lay_tham_chieu_chuan_vat_tu() -> dict:
    """Nạp tham chiếu một lần cho thao tác kiểm tra tệp hàng loạt."""
    with get_conn() as conn:
        rut_gon = not conn.execute(
            "SELECT to_regclass('mua_hang.vat_tu') IS NOT NULL AS co"
        ).fetchone()["co"]
        don_vi_tinh = {
            row["dvt"] for row in conn.execute(
                "SELECT dvt FROM don_vi_tinh WHERE trang_thai='HOAT_DONG'"
            ).fetchall()
        }
        if rut_gon:
            rows = conn.execute(
                '''SELECT "ID" AS id,"MA" AS ma,"MA_LOAI" AS loai
                   FROM danh_muc_dong
                   WHERE "MA_LOAI" IN ('VT','CL') AND "TRANG_THAI"='DANG_SU_DUNG' '''
            ).fetchall()
            chung_loai = {row["ma"] for row in rows if row["loai"] == "CL"}
            vat_tu = {
                value for row in rows if row["loai"] == "VT"
                for value in (row["id"], row["ma"])
            }
        else:
            chung_loai = {
                row["ma_chung_loai"] for row in conn.execute(
                    "SELECT ma_chung_loai FROM chung_loai"
                ).fetchall()
            }
            vat_tu = {row["id"] for row in conn.execute("SELECT id FROM vat_tu").fetchall()}
    return {
        "rut_gon": rut_gon,
        "don_vi_tinh": don_vi_tinh,
        "chung_loai": chung_loai,
        "vat_tu": vat_tu,
    }


def lay_vat_tu(id_vat_tu: str):
    with get_conn() as conn:
        return conn.execute(
            """SELECT id,ma_vat_tu,ten_hang,dvt,ma_chung_loai,phan_loai,kho,
                      loai_phoi,id_vt_goc,quy_cach,khoi_luong_rieng,ghi_chu,
                      trang_thai,phien_ban
               FROM vat_tu WHERE id=%s""",
            (id_vat_tu,),
        ).fetchone()


def tim_vat_tu(tu_khoa: str, gioi_han: int):
    with get_conn() as conn:
        if not conn.execute("SELECT to_regclass('mua_hang.vat_tu') IS NOT NULL AS co").fetchone()["co"]:
            like = f"%{tu_khoa}%"
            return conn.execute(
                '''SELECT "ID" AS id, "MA" AS ma_vat_tu, "TEN" AS ten_hang,
                          coalesce("DU_LIEU"->>'don_vi','') AS dvt,
                          NULL::text AS ma_chung_loai, NULL::text AS phan_loai,
                          "DU_LIEU"->>'kho' AS kho, NULL::text AS quy_cach,
                          CASE WHEN "TRANG_THAI"='DANG_SU_DUNG' THEN 'HOAT_DONG' ELSE "TRANG_THAI" END AS trang_thai,
                          CASE WHEN "DU_LIEU" ? 'ton_kho' THEN ("DU_LIEU"->>'ton_kho')::numeric ELSE NULL END AS ton_kho,
                          CASE WHEN lower("MA")=lower(%s) THEN 1.0 ELSE 0.8 END AS diem
                   FROM danh_muc_dong
                   WHERE "MA_LOAI"='VT' AND "TRANG_THAI"='DANG_SU_DUNG'
                     AND ("MA" ILIKE %s OR "TEN" ILIKE %s)
                   ORDER BY diem DESC,"TEN" LIMIT %s''',
                (tu_khoa, like, like, gioi_han),
            ).fetchall()
        co_ton = conn.execute(
            "SELECT to_regclass('mua_hang.ton_kho_tham_chieu') IS NOT NULL AS co"
        ).fetchone()["co"]
        ton_sql = (
            "(SELECT sum(t.so_luong_ton-t.so_luong_giu_cho) "
            "FROM ton_kho_tham_chieu t WHERE t.id_vat_tu=vat_tu.id)"
            if co_ton else "NULL::numeric"
        )
        return conn.execute(
            f"""SELECT id,ma_vat_tu,ten_hang,dvt,ma_chung_loai,phan_loai,kho,
                      quy_cach,trang_thai,NULL::text AS ma_vach,{ton_sql} AS ton_kho,
                      CASE
                        WHEN lower(coalesce(ma_vat_tu,''))=%s THEN 1.0
                        WHEN strpos(lower(coalesce(ma_vat_tu,'')),%s)=1 THEN 0.98
                        WHEN strpos(ten_khong_dau,%s)=1 THEN 0.95
                        WHEN strpos(ten_khong_dau,%s)>0 THEN 0.90
                        ELSE extensions.similarity(ten_khong_dau,%s)
                      END AS diem
               FROM vat_tu
               WHERE trang_thai='HOAT_DONG' AND (
                 strpos(lower(coalesce(ma_vat_tu,'')),%s)>0
                 OR strpos(ten_khong_dau,%s)>0
                 OR extensions.similarity(ten_khong_dau,%s)>=0.20
               )
               ORDER BY diem DESC,ten_hang,id LIMIT %s""",
            (tu_khoa, tu_khoa, tu_khoa, tu_khoa, tu_khoa,
             tu_khoa, tu_khoa, tu_khoa, gioi_han),
        ).fetchall()


def danh_sach_vat_tu(bo_loc: dict, offset: int, limit: int):
    with get_conn() as conn:
        co_ton = conn.execute(
            "SELECT to_regclass('mua_hang.ton_kho_tham_chieu') IS NOT NULL AS co"
        ).fetchone()["co"]
        ton_sql = (
            "(SELECT sum(t.so_luong_ton-t.so_luong_giu_cho) "
            "FROM ton_kho_tham_chieu t WHERE t.id_vat_tu=v.id)"
            if co_ton else "NULL::numeric"
        )
        dieu_kien, params = tao_menh_de("vat_tu", bo_loc)
        total = conn.execute(
            f"SELECT count(*) AS n FROM vat_tu v WHERE {dieu_kien}", tuple(params)
        ).fetchone()["n"]
        rows = conn.execute(
            f"""SELECT v.id,v.ma_vat_tu,v.ten_hang,v.dvt,v.ma_chung_loai,
                       v.phan_loai,v.kho,v.loai_phoi,v.quy_cach,v.ghi_chu,
                       v.trang_thai,v.phien_ban,{ton_sql} AS ton_kho
                FROM vat_tu v
                WHERE {dieu_kien}
                ORDER BY v.ma_vat_tu,v.ten_hang,v.id
                LIMIT %s OFFSET %s""",
            (*params, limit, offset),
        ).fetchall()
        return rows, total


def lay_quy_tac_ma_vat_tu():
    with get_conn() as conn:
        return conn.execute(
            """SELECT ma_quy_tac,kho,ma_nhom,ten_nhom,mau_ma,
                      can_ma_vat_lieu,can_loai_hinh
               FROM quy_tac_ma_vat_tu
               WHERE trang_thai='HOAT_DONG'
               ORDER BY thu_tu,ma_quy_tac"""
        ).fetchall()


def nhan_dien_quy_tac_ten(ten_khong_dau: str):
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT loai,tu_khoa,ten_chuan,ma_quy_uoc,uu_tien
               FROM quy_tac_ten_hang WHERE trang_thai='HOAT_DONG'
               ORDER BY CASE loai WHEN 'VAT_LIEU' THEN 1 WHEN 'BE_MAT' THEN 2 ELSE 3 END,
                        uu_tien DESC,length(tu_khoa) DESC"""
        ).fetchall()
    return nhan_dien_quy_tac_ten_tu_danh_sach(ten_khong_dau, rows)


def nhan_dien_quy_tac_ten_tu_danh_sach(ten_khong_dau: str, rows):
    ket_qua = []
    for loai in ("VAT_LIEU", "BE_MAT", "MAU_SAC"):
        ung_vien = []
        for row in rows:
            if row["loai"] != loai:
                continue
            # Một ô trong mẫu có thể ghi nhiều cách gọi, ví dụ
            # "Inox 304 / SUS 304" hoặc "Sọc (Hairline / HL)".
            aliases = [
                re.sub(r"\s+CHUNG$", "", item.strip())
                for item in re.split(r"[/()\n]+", row["tu_khoa"])
            ]
            aliases = [item for item in aliases if item]
            do_dai = max((len(item) for item in aliases if item in ten_khong_dau), default=0)
            if do_dai:
                ung_vien.append((row["uu_tien"], do_dai, dict(row)))
        match = max(ung_vien, key=lambda item: (item[0], item[1]))[2] if ung_vien else None
        if match:
            ket_qua.append(match)
    return ket_qua


def lay_du_lieu_du_kien_ma_hang_loat():
    """Đọc toàn bộ dữ liệu lập mã trong một kết nối cho tối đa 500 dòng."""
    with get_conn() as conn:
        quy_tac = conn.execute(
            """SELECT ma_quy_tac,kho,ma_nhom,ten_nhom,mau_ma,
                      can_ma_vat_lieu,can_loai_hinh
               FROM quy_tac_ma_vat_tu
               WHERE trang_thai='HOAT_DONG'
               ORDER BY thu_tu,ma_quy_tac"""
        ).fetchall()
        nhan_dien = conn.execute(
            """SELECT loai,tu_khoa,ten_chuan,ma_quy_uoc,uu_tien
               FROM quy_tac_ten_hang WHERE trang_thai='HOAT_DONG'
               ORDER BY CASE loai WHEN 'VAT_LIEU' THEN 1 WHEN 'BE_MAT' THEN 2 ELSE 3 END,
                        uu_tien DESC,length(tu_khoa) DESC"""
        ).fetchall()
        bo_dem = conn.execute(
            "SELECT khoa_ma,so_hien_tai FROM bo_dem_ma_vat_tu"
        ).fetchall()
    return quy_tac, nhan_dien, bo_dem


def lay_quy_tac_nhan_dien():
    with get_conn() as conn:
        return conn.execute(
            """SELECT id,loai,tu_khoa,ten_chuan,ma_quy_uoc,
                      vi_du_ten_hang,vi_du_ma_vat_tu,uu_tien,trang_thai
               FROM quy_tac_ten_hang
               ORDER BY CASE loai WHEN 'VAT_LIEU' THEN 1 WHEN 'BE_MAT' THEN 2 ELSE 3 END,
                        uu_tien DESC,tu_khoa"""
        ).fetchall()


def xoa_quy_tac_nhan_dien(id_quy_tac: str) -> bool:
    with get_conn() as conn:
        return conn.execute(
            "DELETE FROM quy_tac_ten_hang WHERE id=%s RETURNING id", (id_quy_tac,)
        ).fetchone() is not None


def nhap_quy_tac_nhan_dien(danh_sach: list[dict]):
    rows, errors = [], []
    with get_conn() as conn:
        for index, item in enumerate(danh_sach, 1):
            dong = item.get("_dong", index)
            try:
                with conn.transaction():
                    row = conn.execute(
                        """INSERT INTO quy_tac_ten_hang
                             (id,loai,tu_khoa,ten_chuan,ma_quy_uoc,
                              vi_du_ten_hang,vi_du_ma_vat_tu,uu_tien,trang_thai)
                           VALUES(%(id)s,%(loai)s,%(tu_khoa)s,%(ten_chuan)s,%(ma_quy_uoc)s,
                                  %(vi_du_ten_hang)s,%(vi_du_ma_vat_tu)s,%(uu_tien)s,'HOAT_DONG')
                           RETURNING id,loai,tu_khoa,ten_chuan,ma_quy_uoc,
                                     vi_du_ten_hang,vi_du_ma_vat_tu,uu_tien,trang_thai""",
                        item,
                    ).fetchone()
                    rows.append(dict(row))
            except UniqueViolation:
                errors.append({"dong": dong, "ma": item.get("id", ""), "loi": "Mã hoặc từ khóa nhận diện đã tồn tại."})
    return {"so_dong": len(rows), "items": rows, "co_loi": len(errors), "errors": errors}


def nhap_chung_loai_hang_loat(danh_sach: list[dict], nguoi_tao: str):
    rows, errors = [], []
    with get_conn() as conn:
        for index, item in enumerate(danh_sach, 1):
            dong = item.get("_dong", index)
            try:
                with conn.transaction():
                    row = conn.execute(
                        """INSERT INTO chung_loai(ma_chung_loai,ten,thu_tu,nguoi_tao)
                           VALUES(%(ma_chung_loai)s,%(ten)s,%(thu_tu)s,%(nguoi_tao)s)
                           RETURNING ma_chung_loai AS ma,ten,thu_tu,phien_ban""",
                        {**item, "nguoi_tao": nguoi_tao},
                    ).fetchone()
                    rows.append(dict(row))
            except UniqueViolation:
                errors.append({"dong": dong, "ma": item.get("ma_chung_loai", ""), "loi": "Mã hoặc tên chủng loại đã tồn tại."})
    return {"so_dong": len(rows), "items": rows, "co_loi": len(errors), "errors": errors}


def nhap_vat_tu_hang_loat_tung_dong(danh_sach: list[dict], nguoi_tao: str):
    rows, errors = [], []
    with get_conn() as conn:
        rut_gon = not conn.execute(
            "SELECT to_regclass('mua_hang.vat_tu') IS NOT NULL AS co"
        ).fetchone()["co"]
        if rut_gon:
            payload = [
                {
                    "dong": item.get("_dong", index),
                    "id": f"VT-{uuid.uuid4()}",
                    "ma": item["ma_vat_tu"],
                    "ten": item["ten_hang"],
                    "du_lieu": {
                        "don_vi": item["dvt"],
                        "quy_cach": item.get("quy_cach"),
                        "ghi_chu": item.get("ghi_chu"),
                        "phan_loai": item.get("phan_loai"),
                        "nguoi_tao": nguoi_tao,
                    },
                }
                for index, item in enumerate(danh_sach, 1)
            ]
            inserted = conn.execute(
                '''WITH dau_vao AS (
                     SELECT * FROM jsonb_to_recordset(%s::jsonb) AS x(
                       dong integer,id text,ma text,ten text,du_lieu jsonb
                     )
                   ), da_them AS (
                     INSERT INTO danh_muc_dong("ID","MA_LOAI","MA","TEN","DU_LIEU")
                     SELECT id,'VT',ma,ten,du_lieu FROM dau_vao
                     ON CONFLICT ("MA_LOAI","MA") DO NOTHING
                     RETURNING "ID" AS id,"MA" AS ma_vat_tu,"TEN" AS ten_hang,
                               "DU_LIEU"->>'don_vi' AS dvt,
                               "DU_LIEU"->>'quy_cach' AS quy_cach,
                               "TRANG_THAI" AS trang_thai
                   )
                   SELECT d.dong,t.id,t.ma_vat_tu,t.ten_hang,t.dvt,t.quy_cach,t.trang_thai
                   FROM dau_vao d JOIN da_them t ON t.id=d.id ORDER BY d.dong''',
                (Jsonb(payload),),
            ).fetchall()
            inserted_by_row = {row["dong"]: dict(row) for row in inserted}
            for item in payload:
                saved = inserted_by_row.get(item["dong"])
                if saved:
                    saved.pop("dong", None)
                    rows.append(saved)
                else:
                    errors.append({
                        "dong": item["dong"], "ma": item["ma"],
                        "loi": "Mã vật tư đã tồn tại.",
                    })
            return {"so_dong": len(rows), "items": rows, "co_loi": len(errors), "errors": errors}

        payload = [
            {
                "dong": item.get("_dong", index), "id": f"VT-{uuid.uuid4()}",
                "ma_vat_tu": item["ma_vat_tu"], "ten_hang": item["ten_hang"],
                "ten_khong_dau": item["ten_khong_dau"], "dvt": item["dvt"],
                "ma_chung_loai": item.get("ma_chung_loai"), "phan_loai": item["phan_loai"],
                "kho": item.get("kho"), "loai_phoi": item.get("loai_phoi"),
                "id_vt_goc": item.get("id_vt_goc"), "quy_cach": item.get("quy_cach"),
                "khoi_luong_rieng": str(item["khoi_luong_rieng"]) if item.get("khoi_luong_rieng") is not None else None,
                "trang_thai": item["trang_thai"], "ghi_chu": item.get("ghi_chu"),
                "nguoi_tao": nguoi_tao,
            }
            for index, item in enumerate(danh_sach, 1)
        ]
        inserted = conn.execute(
            """WITH dau_vao AS (
                 SELECT * FROM jsonb_to_recordset(%s::jsonb) AS x(
                   dong integer,id text,ma_vat_tu text,ten_hang text,ten_khong_dau text,
                   dvt text,ma_chung_loai text,phan_loai text,kho text,loai_phoi text,
                   id_vt_goc text,quy_cach text,khoi_luong_rieng numeric,
                   trang_thai text,ghi_chu text,nguoi_tao text
                 )
               ), da_them AS (
                 INSERT INTO vat_tu(
                   id,ma_vat_tu,ten_hang,ten_khong_dau,dvt,ma_chung_loai,phan_loai,
                   kho,loai_phoi,id_vt_goc,quy_cach,khoi_luong_rieng,nguon_so_huu,
                   trang_thai,ghi_chu,nguoi_tao
                 )
                 SELECT id,ma_vat_tu,ten_hang,ten_khong_dau,dvt,ma_chung_loai,phan_loai,
                        kho,loai_phoi,id_vt_goc,quy_cach,khoi_luong_rieng,'KHO_VAN',
                        trang_thai,ghi_chu,nguoi_tao
                 FROM dau_vao
                 ON CONFLICT DO NOTHING
                 RETURNING id,ma_vat_tu,ten_hang,dvt,quy_cach,trang_thai
               )
               SELECT d.dong,t.id,t.ma_vat_tu,t.ten_hang,t.dvt,t.quy_cach,t.trang_thai
               FROM dau_vao d JOIN da_them t ON t.id=d.id ORDER BY d.dong""",
            (Jsonb(payload),),
        ).fetchall()
        inserted_by_row = {row["dong"]: dict(row) for row in inserted}
        for item in payload:
            saved = inserted_by_row.get(item["dong"])
            if saved:
                saved.pop("dong", None)
                rows.append(saved)
            else:
                errors.append({
                    "dong": item["dong"], "ma": item["ma_vat_tu"],
                    "loi": "Mã vật tư đã tồn tại.",
                })
    return {"so_dong": len(rows), "items": rows, "co_loi": len(errors), "errors": errors}


def tao_tien_to_ma(quy_tac: dict, ma_vat_lieu: str | None, loai_hinh: str | None):
    parts = [quy_tac["kho"], quy_tac["ma_nhom"]]
    if quy_tac["can_ma_vat_lieu"] and ma_vat_lieu:
        parts.extend(ma_vat_lieu.split("-"))
    if quy_tac["can_loai_hinh"] and loai_hinh:
        parts.append(loai_hinh)
    return "-".join(parts)


def xem_so_tiep_theo(khoa_ma: str):
    with get_conn() as conn:
        row = conn.execute("SELECT so_hien_tai+1 AS so_tiep FROM bo_dem_ma_vat_tu WHERE khoa_ma=%s", (khoa_ma,)).fetchone()
        return row["so_tiep"] if row else 1


def cap_ma_vat_tu(ma_quy_tac: str, ma_vat_lieu: str | None, loai_hinh: str | None):
    with get_conn() as conn:
        quy_tac = conn.execute(
            """SELECT ma_quy_tac,kho,ma_nhom,mau_ma,can_ma_vat_lieu,can_loai_hinh
               FROM quy_tac_ma_vat_tu
               WHERE ma_quy_tac=%s AND trang_thai='HOAT_DONG' FOR SHARE""",
            (ma_quy_tac,),
        ).fetchone()
        if not quy_tac:
            return None
        khoa_ma = tao_tien_to_ma(quy_tac, ma_vat_lieu, loai_hinh)
        bo_dem = conn.execute(
            """INSERT INTO bo_dem_ma_vat_tu(khoa_ma,so_hien_tai)
               VALUES(%s,1)
               ON CONFLICT(khoa_ma) DO UPDATE
               SET so_hien_tai=bo_dem_ma_vat_tu.so_hien_tai+1,ngay_sua=now()
               RETURNING so_hien_tai""",
            (khoa_ma,),
        ).fetchone()
        stt = str(bo_dem["so_hien_tai"]).zfill(2)
        return {"ma_vat_tu": f"{khoa_ma}-{stt}", "so_thu_tu": bo_dem["so_hien_tai"]}


def cap_ma_vat_tu_hang_loat(prefixes: list[str]) -> list[dict]:
    """Giữ chỗ dải số theo từng tiền tố bằng một giao dịch."""
    if not prefixes:
        return []
    so_luong: dict[str, int] = {}
    for prefix in prefixes:
        so_luong[prefix] = so_luong.get(prefix, 0) + 1

    with get_conn() as conn:
        allocated = conn.execute(
            """WITH dau_vao AS (
                 SELECT * FROM jsonb_to_recordset(%s::jsonb) AS x(khoa_ma text,so_luong integer)
               )
               INSERT INTO bo_dem_ma_vat_tu(khoa_ma,so_hien_tai)
               SELECT khoa_ma,so_luong FROM dau_vao
               ON CONFLICT(khoa_ma) DO UPDATE
               SET so_hien_tai=bo_dem_ma_vat_tu.so_hien_tai+excluded.so_hien_tai,
                   ngay_sua=now()
               RETURNING khoa_ma,so_hien_tai""",
            (Jsonb([{"khoa_ma": prefix, "so_luong": count} for prefix, count in so_luong.items()]),),
        ).fetchall()
        so_cuoi = {row["khoa_ma"]: row["so_hien_tai"] for row in allocated}

    da_dung: dict[str, int] = {}
    ket_qua = []
    for prefix in prefixes:
        offset = da_dung.get(prefix, 0)
        so = so_cuoi[prefix] - so_luong[prefix] + 1 + offset
        da_dung[prefix] = offset + 1
        ket_qua.append({"ma_vat_tu": f"{prefix}-{str(so).zfill(2)}", "so_thu_tu": so})
    return ket_qua


def lay_don_vi_tinh_hoat_dong():
    with get_conn() as conn:
        return conn.execute(
            """SELECT dvt,ten_dvt,so_le FROM don_vi_tinh
               WHERE trang_thai='HOAT_DONG' ORDER BY ten_dvt,dvt"""
        ).fetchall()


def xoa_don_vi_tinh(dvt: str) -> bool:
    with get_conn() as conn:
        return conn.execute(
            "DELETE FROM don_vi_tinh WHERE dvt=%s RETURNING dvt",
            (dvt,),
        ).fetchone() is not None


def xoa_chung_loai(ma_chung_loai: str) -> bool:
    with get_conn() as conn:
        return conn.execute(
            "DELETE FROM chung_loai WHERE ma_chung_loai=%s RETURNING ma_chung_loai",
            (ma_chung_loai,),
        ).fetchone() is not None


def xoa_vat_tu(id_vat_tu: str) -> bool:
    with get_conn() as conn:
        if conn.execute("SELECT to_regclass('mua_hang.vat_tu') IS NOT NULL AS co").fetchone()["co"]:
            return conn.execute(
                "DELETE FROM vat_tu WHERE id=%s RETURNING id", (id_vat_tu,)
            ).fetchone() is not None
        return conn.execute(
            '''DELETE FROM danh_muc_dong WHERE "MA_LOAI"='VT' AND "ID"=%s RETURNING "ID"''',
            (id_vat_tu,),
        ).fetchone() is not None


def nhap_don_vi_tinh_hang_loat(danh_sach: list[dict], nguoi_tao: str, _khoa: str):
    with get_conn() as conn:
        rows = []
        errors = []
        for index, item in enumerate(danh_sach, 1):
            try:
                with conn.transaction():
                    row = conn.execute(
                        """INSERT INTO don_vi_tinh(dvt,ten_dvt,so_le,trang_thai,nguoi_tao)
                           VALUES(%s,%s,%s,'HOAT_DONG',%s)
                           RETURNING dvt,ten_dvt,so_le""",
                        (item["dvt"], item["ten_dvt"], item["so_le"], nguoi_tao),
                    ).fetchone()
                    rows.append(dict(row))
            except UniqueViolation:
                errors.append({"dong": item["_dong"], "ma": item["dvt"], "loi": "Mã đơn vị đã tồn tại"})
        return {"da_luu": bool(rows), "so_dong": len(rows), "items": rows, "co_loi": len(errors), "errors": errors}


def tim_nha_cung_cap(tu_khoa: str, gioi_han: int):
    with get_conn() as conn:
        return conn.execute(
            """SELECT id,ma_ncc,ten,la_ncc_mua_hang,la_ncc_gia_cong,
                      da_phe_duyet,phan_loai_ncc,trang_thai,
                      CASE
                        WHEN lower(ma_ncc)=%s THEN 1.0
                        WHEN strpos(lower(ma_ncc),%s)=1 THEN 0.98
                        WHEN strpos(ten_khong_dau,%s)=1 THEN 0.95
                        WHEN strpos(ten_khong_dau,%s)>0 THEN 0.90
                        ELSE extensions.similarity(ten_khong_dau,%s)
                      END AS diem
               FROM nha_cung_cap
               WHERE trang_thai IN ('HOAT_DONG','CANH_BAO') AND (
                 strpos(lower(ma_ncc),%s)>0 OR strpos(ten_khong_dau,%s)>0
                 OR extensions.similarity(ten_khong_dau,%s)>=0.20
               )
               ORDER BY diem DESC,ten,id LIMIT %s""",
            (tu_khoa, tu_khoa, tu_khoa, tu_khoa, tu_khoa,
             tu_khoa, tu_khoa, tu_khoa, gioi_han),
        ).fetchall()


DANH_MUC_SQL = {
    "don-vi-tinh": "SELECT dvt ma,ten_dvt ten,so_le,trang_thai,phien_ban FROM don_vi_tinh",
    "chung-loai": "SELECT ma_chung_loai ma,ten,thu_tu,phien_ban FROM chung_loai",
    "bo-phan": "SELECT ma_bo_phan ma,ten,loai,thu_tu,trang_thai,phien_ban FROM bo_phan",
    "nhan-vien": "SELECT ma_nhan_vien ma,ho_va_ten ten,ma_bo_phan,chuc_vu,trang_thai,phien_ban FROM nhan_vien",
    "nha-cung-cap": "SELECT id ma,ma_ncc,ten,la_ncc_mua_hang,la_ncc_gia_cong,da_phe_duyet,trang_thai FROM nha_cung_cap",
}


def lay_danh_muc(ma: str, offset: int, limit: int):
    sql = DANH_MUC_SQL[ma]
    with get_conn() as conn:
        rows = conn.execute(f"{sql} ORDER BY 1 OFFSET %s LIMIT %s", (offset, limit)).fetchall()
        table = {
            "don-vi-tinh": "don_vi_tinh", "chung-loai": "chung_loai",
            "bo-phan": "bo_phan", "nhan-vien": "nhan_vien",
            "nha-cung-cap": "nha_cung_cap",
        }[ma]
        total = conn.execute(f"SELECT count(*) n FROM {table}").fetchone()["n"]
        return rows, total


def lay_nha_cung_cap(id_ncc: str):
    with get_conn() as conn:
        return conn.execute(
            """SELECT id,ma_ncc,ten,mst,dia_chi,nguoi_lien_he,sdt,sdt_2,fax,email,
                      mat_hang,la_ncc_mua_hang,la_ncc_gia_cong,co_hoa_don,cong_no,
                      tien_mat,nganh_nghe,ma_loai_gia_cong,vung,so_km,ky_han_quy_dinh,
                      da_phe_duyet,ngay_phe_duyet,phan_loai_ncc,trang_thai,ghi_chu,phien_ban
               FROM nha_cung_cap WHERE id=%s""",
            (id_ncc,),
        ).fetchone()


def nguong_trung_ten() -> float:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT gia_tri FROM tham_so_he_thong WHERE ma='NGUONG_TRUNG_TEN'"
        ).fetchone()
        return float(row["gia_tri"]) / 100 if row else 0.85


def tim_trung_vat_tu(ma_vat_tu: str | None, ten_khong_dau: str, bo_qua_id: str | None = None):
    with get_conn() as conn:
        nguong = nguong_trung_ten_conn(conn)
        return conn.execute(
            """SELECT id,ma_vat_tu,ten_hang,
                      CASE WHEN ma_vat_tu IS NOT NULL AND upper(ma_vat_tu)=upper(%s)
                           THEN 'MA_CHINH_XAC'
                           WHEN ten_khong_dau=%s THEN 'TEN_CHINH_XAC'
                           ELSE 'TEN_GAN_GIONG' END loai_trung,
                      CASE WHEN ten_khong_dau=%s THEN 1.0
                           ELSE extensions.similarity(ten_khong_dau,%s) END diem
               FROM vat_tu
               WHERE (%s::text IS NULL OR id<>%s) AND (
                 (%s::text IS NOT NULL AND upper(ma_vat_tu)=upper(%s))
                 OR ten_khong_dau=%s
                 OR extensions.similarity(ten_khong_dau,%s)>=%s
               )
               ORDER BY diem DESC,id LIMIT 10""",
            (ma_vat_tu, ten_khong_dau, ten_khong_dau, ten_khong_dau,
             bo_qua_id, bo_qua_id, ma_vat_tu, ma_vat_tu, ten_khong_dau,
             ten_khong_dau, nguong),
        ).fetchall()


def tim_trung_vat_tu_hang_loat(rows: list[dict]) -> dict[int, list[dict]]:
    """Kiểm tra trùng cho cả tệp bằng một truy vấn thay vì một kết nối mỗi dòng."""
    if not rows:
        return {}
    payload = [
        {
            "dong": row["dong"],
            "ma_vat_tu": row.get("ma_vat_tu"),
            "ten_hang": row.get("ten_hang"),
            "ten_khong_dau": row["ten_khong_dau"],
            "bo_qua_id": row.get("bo_qua_id"),
        }
        for row in rows
    ]
    with get_conn() as conn:
        co_vat_tu = conn.execute(
            "SELECT to_regclass('mua_hang.vat_tu') AS bang"
        ).fetchone()["bang"]
        if not co_vat_tu:
            matches = conn.execute(
                '''WITH dau_vao AS (
                     SELECT * FROM jsonb_to_recordset(%s::jsonb) AS x(
                       dong integer, ma_vat_tu text, ten_hang text,
                       ten_khong_dau text, bo_qua_id text
                     )
                   )
                   SELECT d.dong,v."ID" AS id,v."MA" AS ma_vat_tu,v."TEN" AS ten_hang,
                          CASE WHEN d.ma_vat_tu IS NOT NULL AND upper(v."MA")=upper(d.ma_vat_tu)
                               THEN 'MA_CHINH_XAC' ELSE 'TEN_CHINH_XAC' END AS loai_trung,
                          1.0::real AS diem
                   FROM dau_vao d
                   JOIN danh_muc_dong v ON v."MA_LOAI"='VT'
                    AND (d.bo_qua_id IS NULL OR v."ID"::text<>d.bo_qua_id)
                    AND ((d.ma_vat_tu IS NOT NULL AND upper(v."MA")=upper(d.ma_vat_tu))
                         OR lower(v."TEN")=lower(d.ten_hang))
                   ORDER BY d.dong,v."ID"''',
                (Jsonb(payload),),
            ).fetchall()
            result = {row["dong"]: [] for row in payload}
            for match in matches:
                item = dict(match)
                dong = item.pop("dong")
                result[dong].append(item)
            return result

        nguong = nguong_trung_ten_conn(conn)
        matches = conn.execute(
            """WITH dau_vao AS (
                 SELECT * FROM jsonb_to_recordset(%s::jsonb) AS x(
                   dong integer, ma_vat_tu text, ten_khong_dau text, bo_qua_id text
                 )
               )
               SELECT d.dong,k.id,k.ma_vat_tu,k.ten_hang,k.loai_trung,k.diem
               FROM dau_vao d
               JOIN LATERAL (
                 SELECT v.id,v.ma_vat_tu,v.ten_hang,
                        CASE WHEN d.ma_vat_tu IS NOT NULL AND upper(v.ma_vat_tu)=upper(d.ma_vat_tu)
                             THEN 'MA_CHINH_XAC'
                             WHEN v.ten_khong_dau=d.ten_khong_dau THEN 'TEN_CHINH_XAC'
                             ELSE 'TEN_GAN_GIONG' END AS loai_trung,
                        CASE WHEN v.ten_khong_dau=d.ten_khong_dau THEN 1.0
                             ELSE extensions.similarity(v.ten_khong_dau,d.ten_khong_dau) END AS diem
                 FROM vat_tu v
                 WHERE (d.bo_qua_id IS NULL OR v.id::text<>d.bo_qua_id) AND (
                   (d.ma_vat_tu IS NOT NULL AND upper(v.ma_vat_tu)=upper(d.ma_vat_tu))
                   OR v.ten_khong_dau=d.ten_khong_dau
                   OR extensions.similarity(v.ten_khong_dau,d.ten_khong_dau)>=%s
                 )
                 ORDER BY diem DESC,v.id LIMIT 10
               ) k ON true
               ORDER BY d.dong,k.diem DESC,k.id""",
            (Jsonb(payload), nguong),
        ).fetchall()
    result = {row["dong"]: [] for row in payload}
    for match in matches:
        item = dict(match)
        dong = item.pop("dong")
        result[dong].append(item)
    return result


def tim_trung_nha_cung_cap(
    ma_ncc: str | None, ten_khong_dau: str, mst: str | None, bo_qua_id: str | None = None
):
    with get_conn() as conn:
        nguong = nguong_trung_ten_conn(conn)
        return conn.execute(
            """SELECT id,ma_ncc,ten,mst,
                      CASE WHEN ma_ncc IS NOT NULL AND upper(ma_ncc)=upper(%s)
                           THEN 'MA_CHINH_XAC'
                           WHEN %s::text IS NOT NULL AND mst=%s THEN 'MST_CHINH_XAC'
                           WHEN ten_khong_dau=%s THEN 'TEN_CHINH_XAC'
                           ELSE 'TEN_GAN_GIONG' END loai_trung,
                      CASE WHEN ten_khong_dau=%s THEN 1.0
                           ELSE extensions.similarity(ten_khong_dau,%s) END diem
               FROM nha_cung_cap
               WHERE (%s::text IS NULL OR id<>%s) AND (
                 (%s::text IS NOT NULL AND upper(ma_ncc)=upper(%s))
                 OR (%s::text IS NOT NULL AND mst=%s)
                 OR ten_khong_dau=%s
                 OR extensions.similarity(ten_khong_dau,%s)>=%s
               )
               ORDER BY diem DESC,id LIMIT 10""",
            (ma_ncc, mst, mst, ten_khong_dau, ten_khong_dau, ten_khong_dau,
             bo_qua_id, bo_qua_id, ma_ncc, ma_ncc, mst, mst, ten_khong_dau,
             ten_khong_dau, nguong),
        ).fetchall()


def nguong_trung_ten_conn(conn) -> float:
    co_bang = conn.execute(
        "SELECT to_regclass('mua_hang.tham_so_he_thong') AS bang"
    ).fetchone()["bang"]
    if not co_bang:
        return 0.85
    row = conn.execute(
        "SELECT gia_tri FROM tham_so_he_thong WHERE ma='NGUONG_TRUNG_TEN'"
    ).fetchone()
    return float(row["gia_tri"]) / 100 if row else 0.85


DANH_MUC_GHI = {
    "don-vi-tinh": ("don_vi_tinh", "dvt", {"dvt", "ten_dvt", "so_le", "trang_thai"}),
    "chung-loai": ("chung_loai", "ma_chung_loai", {"ma_chung_loai", "ten", "thu_tu"}),
    "bo-phan": ("bo_phan", "ma_bo_phan", {"ma_bo_phan", "ten", "loai", "thu_tu", "trang_thai"}),
    "nhan-vien": (
        "nhan_vien", "ma_nhan_vien",
        {"ma_nhan_vien", "ho_va_ten", "ma_bo_phan", "chuc_vu", "ngay_vao_lam", "trang_thai", "ghi_chu"},
    ),
}


def _id_moi(conn, bang: str, tien_to: str, so_chu_so: int) -> str:
    conn.execute("SELECT pg_advisory_xact_lock(hashtext(%s))", (f"ID:{bang}",))
    row = conn.execute(
        sql.SQL("SELECT coalesce(max((substring(id from '[0-9]+$'))::integer),0)+1 n FROM {} WHERE id ~ %s")
        .format(sql.Identifier(bang)),
        (f"^{tien_to}-[0-9]+$",),
    ).fetchone()
    return f"{tien_to}-{row['n']:0{so_chu_so}d}"


def _bat_dau_idempotency(conn, tai_khoan: str, khoa: str, duong_dan: str):
    moi = conn.execute(
        """INSERT INTO thao_tac_da_xu_ly(ma_tai_khoan,khoa,duong_dan)
           VALUES(%s,%s,%s) ON CONFLICT DO NOTHING RETURNING khoa""",
        (tai_khoan, khoa, duong_dan),
    ).fetchone()
    if moi:
        return None
    row = conn.execute(
        "SELECT duong_dan,ket_qua FROM thao_tac_da_xu_ly WHERE ma_tai_khoan=%s AND khoa=%s",
        (tai_khoan, khoa),
    ).fetchone()
    if not row or row["duong_dan"] != duong_dan:
        raise ValueError("Khoa idempotency da duoc dung cho yeu cau khac")
    return row["ket_qua"]


def lay_ket_qua_idempotency(tai_khoan: str, khoa: str, duong_dan: str):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT duong_dan,ket_qua FROM thao_tac_da_xu_ly WHERE ma_tai_khoan=%s AND khoa=%s",
            (tai_khoan, khoa),
        ).fetchone()
        if not row:
            return None
        if row["duong_dan"] != duong_dan:
            raise ValueError("Khoa idempotency da duoc dung cho yeu cau khac")
        return row["ket_qua"]


def _hoan_tat_idempotency(conn, tai_khoan: str, khoa: str, ket_qua: dict):
    conn.execute(
        "UPDATE thao_tac_da_xu_ly SET ket_qua=%s WHERE ma_tai_khoan=%s AND khoa=%s",
        (Jsonb(ket_qua, dumps=lambda value: json.dumps(value, default=str)), tai_khoan, khoa),
    )


def _tao_danh_muc(conn, ma: str, du_lieu: dict, nguoi_tao: str):
    bang, _, cot_hop_le = DANH_MUC_GHI[ma]
    cot = [key for key in du_lieu if key in cot_hop_le]
    values = [du_lieu[key] for key in cot]
    query = sql.SQL("INSERT INTO {} ({},nguoi_tao) VALUES ({},%s) RETURNING *").format(
        sql.Identifier(bang),
        sql.SQL(",").join(map(sql.Identifier, cot)),
        sql.SQL(",").join(sql.Placeholder() for _ in cot),
    )
    return conn.execute(query, (*values, nguoi_tao)).fetchone()


def tao_danh_muc(ma: str, du_lieu: dict, nguoi_tao: str, tai_khoan: str, khoa: str):
    duong = f"POST:/api/v1/danh-muc/{ma}"
    with get_conn() as conn:
        cu = _bat_dau_idempotency(conn, tai_khoan, khoa, duong)
        if cu is not None:
            return cu
        row = dict(_tao_danh_muc(conn, ma, du_lieu, nguoi_tao))
        ket_qua = {"da_luu": True, "item": row, "lap_lai": False}
        _hoan_tat_idempotency(conn, tai_khoan, khoa, ket_qua)
        return ket_qua


def cap_nhat_danh_muc(ma: str, id_ban_ghi: str, du_lieu: dict, phien_ban: int, nguoi_sua: str):
    bang, cot_khoa, cot_hop_le = DANH_MUC_GHI[ma]
    cot = [key for key in du_lieu if key in cot_hop_le and key != cot_khoa]
    if not cot:
        return None
    gan = [sql.SQL("{}={}").format(sql.Identifier(key), sql.Placeholder()) for key in cot]
    gan.append(sql.SQL("nguoi_sua={}").format(sql.Placeholder()))
    query = sql.SQL("UPDATE {} SET {} WHERE {}=%s AND phien_ban=%s RETURNING *").format(
        sql.Identifier(bang), sql.SQL(",").join(gan), sql.Identifier(cot_khoa)
    )
    with get_conn() as conn:
        return conn.execute(
            query, (*[du_lieu[key] for key in cot], nguoi_sua, id_ban_ghi, phien_ban)
        ).fetchone()


def ton_tai_danh_muc(ma: str, id_ban_ghi: str) -> bool:
    bang, cot_khoa, _ = DANH_MUC_GHI[ma]
    with get_conn() as conn:
        query = sql.SQL("SELECT 1 FROM {} WHERE {}=%s").format(
            sql.Identifier(bang), sql.Identifier(cot_khoa)
        )
        return conn.execute(query, (id_ban_ghi,)).fetchone() is not None


def lay_ban_ghi_danh_muc(ma: str, id_ban_ghi: str):
    bang, cot_khoa, _ = DANH_MUC_GHI[ma]
    query = sql.SQL("SELECT * FROM {} WHERE {}=%s").format(
        sql.Identifier(bang), sql.Identifier(cot_khoa)
    )
    with get_conn() as conn:
        return conn.execute(query, (id_ban_ghi,)).fetchone()


def trung_danh_muc(ma: str, du_lieu: dict) -> bool:
    bang, cot_khoa, _ = DANH_MUC_GHI[ma]
    dieu_kien = [sql.SQL("{}=%s").format(sql.Identifier(cot_khoa))]
    tham_so = [du_lieu[cot_khoa]]
    if ma == "chung-loai":
        dieu_kien.append(sql.SQL("lower(ten)=lower(%s)"))
        tham_so.append(du_lieu["ten"])
    query = sql.SQL("SELECT 1 FROM {} WHERE {} LIMIT 1").format(
        sql.Identifier(bang), sql.SQL(" OR ").join(dieu_kien)
    )
    with get_conn() as conn:
        return conn.execute(query, tham_so).fetchone() is not None


THAM_CHIEU = {
    "dvt": ("don_vi_tinh", "dvt"),
    "chung_loai": ("chung_loai", "ma_chung_loai"),
    "bo_phan": ("bo_phan", "ma_bo_phan"),
    "vat_tu": ("vat_tu", "id"),
    "loai_gia_cong": ("loai_gia_cong", "ma"),
}


def gia_tri_ton_tai(loai: str, gia_tri: str | None) -> bool:
    if gia_tri is None:
        return True
    if loai == "dvt":
        with get_conn() as conn:
            return conn.execute(
                "SELECT 1 FROM don_vi_tinh WHERE dvt=%s AND trang_thai='HOAT_DONG'",
                (gia_tri,),
            ).fetchone() is not None
    if la_schema_rut_gon():
        ma_loai = {"vat_tu": "VT", "chung_loai": "CL"}.get(loai)
        if not ma_loai:
            return False
        with get_conn() as conn:
            return conn.execute(
                '''SELECT 1 FROM danh_muc_dong
                   WHERE "MA_LOAI"=%s AND ("MA"=%s OR "ID"=%s) AND "TRANG_THAI"='DANG_SU_DUNG' ''',
                (ma_loai, gia_tri, gia_tri),
            ).fetchone() is not None
    bang, cot = THAM_CHIEU[loai]
    query = sql.SQL("SELECT 1 FROM {} WHERE {}=%s").format(
        sql.Identifier(bang), sql.Identifier(cot)
    )
    with get_conn() as conn:
        return conn.execute(query, (gia_tri,)).fetchone() is not None


def _tao_vat_tu(conn, du_lieu: dict, nguoi_tao: str):
    id_moi = _id_moi(conn, "vat_tu", "VT", 6)
    return conn.execute(
        """INSERT INTO vat_tu(
             id,ma_vat_tu,ten_hang,ten_khong_dau,dvt,ma_chung_loai,phan_loai,
             kho,loai_phoi,id_vt_goc,quy_cach,khoi_luong_rieng,nguon_so_huu,
             trang_thai,ghi_chu,nguoi_tao)
           VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'KHO_VAN',%s,%s,%s)
           RETURNING *""",
        (id_moi, du_lieu["ma_vat_tu"], du_lieu["ten_hang"], du_lieu["ten_khong_dau"],
         du_lieu["dvt"], du_lieu.get("ma_chung_loai"), du_lieu["phan_loai"],
         du_lieu.get("kho"), du_lieu.get("loai_phoi"), du_lieu.get("id_vt_goc"),
         du_lieu.get("quy_cach"), du_lieu.get("khoi_luong_rieng"),
         du_lieu["trang_thai"], du_lieu.get("ghi_chu"), nguoi_tao),
    ).fetchone()


def tao_vat_tu(du_lieu: dict, nguoi_tao: str, tai_khoan: str, khoa: str):
    if la_schema_rut_gon():
        with get_conn() as conn:
            row = conn.execute(
                '''INSERT INTO danh_muc_dong("ID","MA_LOAI","MA","TEN","DU_LIEU")
                   VALUES(%s,'VT',%s,%s,%s)
                   ON CONFLICT ("ID") DO UPDATE SET "ID"=excluded."ID"
                   RETURNING "ID" AS id,"MA" AS ma_vat_tu,"TEN" AS ten_hang,
                             "DU_LIEU"->>'don_vi' AS dvt,"DU_LIEU"->>'quy_cach' AS quy_cach,
                             "TRANG_THAI" AS trang_thai''',
                (f"VT-{khoa}", du_lieu["ma_vat_tu"], du_lieu["ten_hang"], Jsonb({
                    "don_vi": du_lieu["dvt"], "quy_cach": du_lieu.get("quy_cach"),
                    "nguoi_tao": nguoi_tao,
                })),
            ).fetchone()
            return {"da_luu": True, "item": dict(row), "canh_bao_trung": []}
    with get_conn() as conn:
        cu = _bat_dau_idempotency(conn, tai_khoan, khoa, "POST:/api/v1/vat-tu")
        if cu is not None:
            return cu
        row = dict(_tao_vat_tu(conn, du_lieu, nguoi_tao))
        ket_qua = {"da_luu": True, "item": row, "canh_bao_trung": []}
        _hoan_tat_idempotency(conn, tai_khoan, khoa, ket_qua)
        return ket_qua


def cap_nhat_vat_tu(id_vat_tu: str, du_lieu: dict, phien_ban: int, nguoi_sua: str):
    cot_hop_le = {
        "ma_vat_tu", "ten_hang", "ten_khong_dau", "dvt", "ma_chung_loai", "phan_loai", "kho",
        "loai_phoi", "id_vt_goc", "quy_cach", "khoi_luong_rieng", "trang_thai", "ghi_chu",
    }
    cot = [key for key in du_lieu if key in cot_hop_le]
    gan = [sql.SQL("{}={}").format(sql.Identifier(key), sql.Placeholder()) for key in cot]
    gan.append(sql.SQL("nguoi_sua={}").format(sql.Placeholder()))
    query = sql.SQL("UPDATE vat_tu SET {} WHERE id=%s AND phien_ban=%s RETURNING *").format(sql.SQL(",").join(gan))
    with get_conn() as conn:
        return conn.execute(query, (*[du_lieu[key] for key in cot], nguoi_sua, id_vat_tu, phien_ban)).fetchone()


def _tao_nha_cung_cap(conn, du_lieu: dict, nguoi_tao: str):
    id_moi = _id_moi(conn, "nha_cung_cap", "NCC", 5)
    cot = [
        "ma_ncc", "ten", "ten_khong_dau", "mst", "dia_chi", "nguoi_lien_he", "sdt", "sdt_2",
        "fax", "email", "mat_hang", "la_ncc_mua_hang", "la_ncc_gia_cong", "co_hoa_don",
        "cong_no", "tien_mat", "nganh_nghe", "ma_loai_gia_cong", "vung", "so_km",
        "ky_han_quy_dinh", "da_phe_duyet", "ngay_phe_duyet", "phan_loai_ncc", "trang_thai", "ghi_chu",
    ]
    query = sql.SQL("INSERT INTO nha_cung_cap(id,{},nguoi_tao) VALUES(%s,{},%s) RETURNING *").format(
        sql.SQL(",").join(map(sql.Identifier, cot)),
        sql.SQL(",").join(sql.Placeholder() for _ in cot),
    )
    return conn.execute(query, (id_moi, *[du_lieu.get(key) for key in cot], nguoi_tao)).fetchone()


def tao_nha_cung_cap(du_lieu: dict, nguoi_tao: str, tai_khoan: str, khoa: str):
    with get_conn() as conn:
        cu = _bat_dau_idempotency(conn, tai_khoan, khoa, "POST:/api/v1/nha-cung-cap")
        if cu is not None:
            return cu
        row = dict(_tao_nha_cung_cap(conn, du_lieu, nguoi_tao))
        ket_qua = {"da_luu": True, "item": row, "canh_bao_trung": []}
        _hoan_tat_idempotency(conn, tai_khoan, khoa, ket_qua)
        return ket_qua


def cap_nhat_nha_cung_cap(id_ncc: str, du_lieu: dict, phien_ban: int, nguoi_sua: str):
    cot_hop_le = {
        "ma_ncc", "ten", "ten_khong_dau", "mst", "dia_chi", "nguoi_lien_he", "sdt", "sdt_2",
        "fax", "email", "mat_hang", "la_ncc_mua_hang", "la_ncc_gia_cong", "co_hoa_don",
        "cong_no", "tien_mat", "nganh_nghe", "ma_loai_gia_cong", "vung", "so_km",
        "ky_han_quy_dinh", "da_phe_duyet", "ngay_phe_duyet", "phan_loai_ncc", "trang_thai", "ghi_chu",
    }
    cot = [key for key in du_lieu if key in cot_hop_le]
    gan = [sql.SQL("{}={}").format(sql.Identifier(key), sql.Placeholder()) for key in cot]
    gan.append(sql.SQL("nguoi_sua={}").format(sql.Placeholder()))
    query = sql.SQL("UPDATE nha_cung_cap SET {} WHERE id=%s AND phien_ban=%s RETURNING *").format(sql.SQL(",").join(gan))
    with get_conn() as conn:
        return conn.execute(query, (*[du_lieu[key] for key in cot], nguoi_sua, id_ncc, phien_ban)).fetchone()


def nhap_hang_loat(
    loai: str, danh_sach: list[dict], nguoi_tao: str, tai_khoan: str, khoa: str
):
    duong = "POST:/api/v1/danh-muc/nhap-hang-loat/xac-nhan"
    with get_conn() as conn:
        cu = _bat_dau_idempotency(conn, tai_khoan, khoa, duong)
        if cu is not None:
            return cu
        rows = []
        for du_lieu in danh_sach:
            if loai == "vat-tu":
                row = _tao_vat_tu(conn, du_lieu, nguoi_tao)
            elif loai == "nha-cung-cap":
                row = _tao_nha_cung_cap(conn, du_lieu, nguoi_tao)
            else:
                row = _tao_danh_muc(conn, loai, du_lieu, nguoi_tao)
            rows.append(dict(row))
        ket_qua = {"da_luu": True, "loai": loai, "so_dong": len(rows), "items": rows}
        _hoan_tat_idempotency(conn, tai_khoan, khoa, ket_qua)
        return ket_qua
