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
                '''SELECT id,ma,ma_loai AS loai
                   FROM danh_muc_dong
                   WHERE ma_loai IN ('VT','CL') AND trang_thai='DANG_SU_DUNG' '''
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
                '''SELECT id, ma AS ma_vat_tu, ten AS ten_hang,
                          coalesce(du_lieu->>'don_vi','') AS dvt,
                          NULL::text AS ma_chung_loai, NULL::text AS phan_loai,
                          du_lieu->>'kho' AS kho, NULL::text AS quy_cach,
                          CASE WHEN trang_thai='DANG_SU_DUNG' THEN 'HOAT_DONG' ELSE trang_thai END AS trang_thai,
                          CASE WHEN du_lieu ? 'ton_kho' THEN (du_lieu->>'ton_kho')::numeric ELSE NULL END AS ton_kho,
                          CASE WHEN lower(ma)=lower(%s) THEN 1.0 ELSE 0.8 END AS diem
                   FROM danh_muc_dong
                   WHERE ma_loai='VT' AND trang_thai='DANG_SU_DUNG'
                     AND (ma ILIKE %s OR ten ILIKE %s)
                   ORDER BY diem DESC,ten LIMIT %s''',
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
                       cl.ten AS ten_chung_loai,v.phan_loai,v.kho,v.loai_phoi,v.quy_cach,v.ghi_chu,
                       v.trang_thai,v.phien_ban,{ton_sql} AS ton_kho
                FROM vat_tu v
                LEFT JOIN chung_loai cl ON cl.ma_chung_loai=v.ma_chung_loai
                WHERE {dieu_kien}
                ORDER BY v.ma_vat_tu,v.ten_hang,v.id
                LIMIT %s OFFSET %s""",
            (*params, limit, offset),
        ).fetchall()
        return rows, total


def danh_sach_lenh_san_xuat(tu_khoa: str, offset: int, limit: int):
    """Đọc danh sách lệnh sản xuất để hiển thị tại dữ liệu công ty."""
    with get_conn() as conn:
        bang = conn.execute(
            """SELECT to_regclass('mua_hang.lenh_san_xuat') AS lenh,
                      to_regclass('mua_hang.lsx_dong') AS dong"""
        ).fetchone()
        if not bang["lenh"]:
            return [], 0
        co_dong = bool(bang["dong"])
        dieu_kien = """(
            %s = ''
            OR lower(coalesce(l.lenh_san_xuat, '')) LIKE %s
            OR lower(coalesce(l.so_po, '')) LIKE %s
            OR lower(coalesce(l.ma_khach_hang, '')) LIKE %s
            OR lower(coalesce(l.ten_khach_hang_chup, '')) LIKE %s
            OR lower(coalesce(l.ma_bo_phan, '')) LIKE %s
            OR lower(coalesce(l.ten_bo_phan_chup, '')) LIKE %s
            OR lower(coalesce(l.trang_thai_don, '')) LIKE %s
        )"""
        mau_tim = f"%{tu_khoa}%"
        params = (tu_khoa, mau_tim, mau_tim, mau_tim, mau_tim, mau_tim, mau_tim, mau_tim)
        total = conn.execute(
            f"SELECT count(*) AS n FROM lenh_san_xuat l WHERE {dieu_kien}", params
        ).fetchone()["n"]
        cot_so_dong = "count(d.ma_vach)::int" if co_dong else "0::int"
        noi_dong = (
            "LEFT JOIN lsx_dong d ON d.lenh_san_xuat=l.lenh_san_xuat"
            if co_dong else ""
        )
        rows = conn.execute(
            f"""SELECT l.lenh_san_xuat,l.so_po,l.ma_khach_hang,l.ten_khach_hang_chup,
                       l.ma_bo_phan,l.ten_bo_phan_chup,l.so_so,l.ngay_so,l.ki_han_khach_hang,
                       l.muc_do_uu_tien,l.ngay_nhan_lenh,l.trang_thai_don,l.ghi_chu,
                       {cot_so_dong} AS so_dong
                FROM lenh_san_xuat l
                {noi_dong}
                WHERE {dieu_kien}
                GROUP BY l.lenh_san_xuat,l.so_po,l.ma_khach_hang,l.ten_khach_hang_chup,
                         l.ma_bo_phan,l.ten_bo_phan_chup,l.so_so,l.ngay_so,l.ki_han_khach_hang,
                         l.muc_do_uu_tien,l.ngay_nhan_lenh,l.trang_thai_don,l.ghi_chu
                ORDER BY l.ngay_nhan_lenh DESC NULLS LAST,l.lenh_san_xuat
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
                     INSERT INTO danh_muc_dong(id,ma_loai,ma,ten,du_lieu)
                     SELECT id,'VT',ma,ten,du_lieu FROM dau_vao
                     ON CONFLICT (ma_loai,ma) DO NOTHING
                     RETURNING id,ma AS ma_vat_tu,ten AS ten_hang,
                               du_lieu->>'don_vi' AS dvt,
                               du_lieu->>'quy_cach' AS quy_cach,
                               trang_thai
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
            "DELETE FROM danh_muc_dong WHERE ma_loai='VT' AND id=%s RETURNING id",
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
    "nhan-vien": """SELECT nv.ma_nhan_vien ma,nv.ho_va_ten ten,nv.ma_bo_phan,
                              bp.ten ten_bo_phan,nv.chuc_vu,nv.ngay_vao_lam,
                              nv.trang_thai,nv.ghi_chu,nv.phien_ban
                       FROM nhan_vien nv LEFT JOIN bo_phan bp ON bp.ma_bo_phan=nv.ma_bo_phan""",
    "nha-cung-cap": "SELECT id ma,ma_ncc,ten,la_ncc_mua_hang,la_ncc_gia_cong,da_phe_duyet,trang_thai FROM nha_cung_cap",
}


def danh_sach_nha_cung_cap(offset: int, limit: int):
    with get_conn() as conn:
        co_bang_don_hang = conn.execute(
            "SELECT to_regclass('don_hang') IS NOT NULL AND to_regclass('don_hang_dong') IS NOT NULL AS co"
        ).fetchone()["co"]
        co_cot_id_chuan = conn.execute(
            """SELECT EXISTS(
                 SELECT 1 FROM pg_attribute
                 WHERE attrelid=to_regclass('nha_cung_cap')
                   AND attname='id' AND attnum > 0 AND NOT attisdropped
               ) AS co"""
        ).fetchone()["co"]
        if co_cot_id_chuan:
            gia_tri_da_dat_thang = (
                """coalesce((SELECT sum(dhd.so_luong * dhd.don_gia_co_so)
                              FROM don_hang dh JOIN don_hang_dong dhd ON dhd.id_don_hang=dh.id
                              WHERE dh.id_ncc=nha_cung_cap.id
                                AND dh.trang_thai NOT IN ('HUY','TU_CHOI')
                                AND date_trunc('month', dh.ngay_dat)=date_trunc('month', current_date)),0)"""
                if co_bang_don_hang else "0::numeric"
            )
            items = conn.execute(
                f"""SELECT id ma,ma_ncc,ten,mst,dia_chi,nguoi_lien_he,sdt,email,
                          la_ncc_mua_hang,la_ncc_gia_cong,da_phe_duyet,ngay_phe_duyet,
                          dinh_muc_thang,ghi_chu_dinh_muc,nhom_hang_chi_tiet,
                          {gia_tri_da_dat_thang} AS da_dat_thang,
                          trang_thai,ghi_chu,phien_ban
                   FROM nha_cung_cap ORDER BY ten,id OFFSET %s LIMIT %s""",
                (offset, limit),
            ).fetchall()
        else:
            # Một số CSDL đang chạy bảng danh mục legacy với tên cột viết HOA.
            # Lấy giá trị từ những cột legacy đang có, thay vì trả NULL/false
            # cố định khiến người dùng tưởng thao tác sửa không được lưu.
            cot_hien_co = {
                row["attname"] for row in conn.execute(
                    """SELECT attname FROM pg_attribute
                       WHERE attrelid=to_regclass('nha_cung_cap')
                         AND attnum > 0 AND NOT attisdropped"""
                ).fetchall()
            }
            select = [
                sql.SQL('"ID" AS ma'), sql.SQL('"MA_NCC" AS ma_ncc'), sql.SQL('"TEN" AS ten'),
            ]
            for alias, column, default in (
                ("mst", "MST", "NULL::text"), ("dia_chi", "DIA_CHI", "NULL::text"),
                ("nguoi_lien_he", "NGUOI_LIEN_HE", "NULL::text"), ("sdt", "SDT", "NULL::text"),
                ("email", "EMAIL", "NULL::text"), ("la_ncc_mua_hang", "LA_NCC_MUA_HANG", "false"),
                ("la_ncc_gia_cong", "LA_NCC_GIA_CONG", "false"), ("da_phe_duyet", "DA_PHE_DUYET", "false"),
                ("ngay_phe_duyet", "NGAY_PHE_DUYET", "NULL::date"),
                ("ghi_chu", "GHI_CHU", "NULL::text"), ("phien_ban", "PHIEN_BAN", "1"),
            ):
                expression = sql.Identifier(column) if column in cot_hien_co else sql.SQL(default)
                select.append(sql.SQL("{} AS {}").format(expression, sql.Identifier(alias)))
            status = (
                sql.SQL("coalesce(\"TRANG_THAI\",'HOAT_DONG')")
                if "TRANG_THAI" in cot_hien_co else sql.SQL("'HOAT_DONG'")
            )
            select.append(sql.SQL("{} AS trang_thai").format(status))
            items = conn.execute(
                sql.SQL('SELECT {} FROM nha_cung_cap ORDER BY "TEN","ID" OFFSET %s LIMIT %s').format(
                    sql.SQL(",").join(select)
                ),
                (offset, limit),
            ).fetchall()
        total = conn.execute("SELECT count(*) n FROM nha_cung_cap").fetchone()["n"]
        return items, total


def lay_danh_muc(ma: str, offset: int, limit: int, bo_loc: dict | None = None):
    with get_conn() as conn:
        sql = DANH_MUC_SQL[ma]
        params: list = []
        where = ""
        bo_loc = bo_loc or {}
        if ma == "nha-cung-cap":
            co_cot_moi = conn.execute(
                """SELECT EXISTS(
                     SELECT 1 FROM information_schema.columns
                     WHERE table_schema='mua_hang' AND table_name='nha_cung_cap'
                       AND column_name='id'
                   ) AS co"""
            ).fetchone()["co"]
            if not co_cot_moi:
                sql = '''SELECT "ID" ma,"MA_NCC" ma_ncc,"TEN" ten,
                                false AS la_ncc_mua_hang,
                                false AS la_ncc_gia_cong,
                                false AS da_phe_duyet,
                                coalesce("TRANG_THAI",'HOAT_DONG') trang_thai
                         FROM nha_cung_cap'''
        if ma == "nhan-vien":
            conditions = []
            q = str(bo_loc.get("q") or "").strip().lower()
            if q:
                conditions.append(
                    "lower(concat_ws(' ',nv.ma_nhan_vien,nv.ho_va_ten,nv.chuc_vu,bp.ten)) LIKE %s"
                )
                params.append(f"%{q}%")
            if bo_loc.get("trang_thai"):
                conditions.append("nv.trang_thai=%s")
                params.append(bo_loc["trang_thai"])
            if bo_loc.get("ma_bo_phan"):
                conditions.append("nv.ma_bo_phan=%s")
                params.append(bo_loc["ma_bo_phan"])
            if conditions:
                where = " WHERE " + " AND ".join(conditions)
        elif ma == "bo-phan":
            conditions = []
            q = str(bo_loc.get("q") or "").strip().lower()
            if q:
                conditions.append("lower(concat_ws(' ',ma_bo_phan,ten,loai)) LIKE %s")
                params.append(f"%{q}%")
            if bo_loc.get("trang_thai"):
                conditions.append("trang_thai=%s")
                params.append(bo_loc["trang_thai"])
            if conditions:
                where = " WHERE " + " AND ".join(conditions)
        rows = conn.execute(
            f"{sql}{where} ORDER BY 1 OFFSET %s LIMIT %s", (*params, offset, limit)
        ).fetchall()
        table = {
            "don-vi-tinh": "don_vi_tinh", "chung-loai": "chung_loai",
            "bo-phan": "bo_phan", "nhan-vien": "nhan_vien",
            "nha-cung-cap": "nha_cung_cap",
        }[ma]
        if ma == "nhan-vien":
            total = conn.execute(
                f"SELECT count(*) n FROM nhan_vien nv LEFT JOIN bo_phan bp "
                f"ON bp.ma_bo_phan=nv.ma_bo_phan{where}", params,
            ).fetchone()["n"]
        elif ma == "bo-phan":
            total = conn.execute(
                f"SELECT count(*) n FROM bo_phan{where}", params,
            ).fetchone()["n"]
        else:
            total = conn.execute(f"SELECT count(*) n FROM {table}").fetchone()["n"]
        return rows, total


def lay_nha_cung_cap(id_ncc: str):
    with get_conn() as conn:
        co_cot_id_chuan = conn.execute(
            """SELECT EXISTS(
                 SELECT 1 FROM pg_attribute
                 WHERE attrelid=to_regclass('nha_cung_cap')
                   AND attname='id' AND attnum > 0 AND NOT attisdropped
               ) AS co"""
        ).fetchone()["co"]
        if not co_cot_id_chuan:
            cot_hien_co = {
                row["attname"] for row in conn.execute(
                    """SELECT attname FROM pg_attribute
                       WHERE attrelid=to_regclass('nha_cung_cap')
                         AND attnum > 0 AND NOT attisdropped"""
                ).fetchall()
            }
            anh_xa = {
                "ma_ncc": "MA_NCC", "ten": "TEN", "mst": "MST", "dia_chi": "DIA_CHI",
                "nguoi_lien_he": "NGUOI_LIEN_HE", "sdt": "SDT",
                "fax": "FAX", "email": "EMAIL", "mat_hang": "MAT_HANG",
                "la_ncc_mua_hang": "LA_NCC_MUA_HANG", "la_ncc_gia_cong": "LA_NCC_GIA_CONG",
                "co_hoa_don": "CO_HOA_DON", "cong_no": "CONG_NO", "tien_mat": "TIEN_MAT",
                "nganh_nghe": "NGANH_NGHE", "ma_loai_gia_cong": "MA_LOAI_GIA_CONG",
                "vung": "VUNG", "so_km": "SO_KM", "ky_han_quy_dinh": "KY_HAN_QUY_DINH",
                "da_phe_duyet": "DA_PHE_DUYET", "ngay_phe_duyet": "NGAY_PHE_DUYET",
                "phan_loai_ncc": "PHAN_LOAI_NCC", "trang_thai": "TRANG_THAI",
                "ghi_chu": "GHI_CHU", "phien_ban": "PHIEN_BAN",
            }
            select = [sql.SQL('"ID" AS id')]
            for alias, column in anh_xa.items():
                if column in cot_hien_co:
                    select.append(sql.SQL("{} AS {}").format(sql.Identifier(column), sql.Identifier(alias)))
            for alias, column, default in (
                ("la_ncc_mua_hang", "LA_NCC_MUA_HANG", "true"),
                ("la_ncc_gia_cong", "LA_NCC_GIA_CONG", "false"),
                ("da_phe_duyet", "DA_PHE_DUYET", "false"),
                ("phien_ban", "PHIEN_BAN", "1"),
            ):
                if column not in cot_hien_co:
                    select.append(sql.SQL("{} AS {}").format(sql.SQL(default), sql.Identifier(alias)))
            return conn.execute(
                sql.SQL("SELECT {} FROM nha_cung_cap WHERE \"ID\"=%s").format(sql.SQL(",").join(select)),
                (id_ncc,),
            ).fetchone()
        return conn.execute(
            """SELECT id,ma_ncc,ten,mst,dia_chi,nguoi_lien_he,sdt,fax,email,
                      mat_hang,la_ncc_mua_hang,la_ncc_gia_cong,co_hoa_don,cong_no,
                      tien_mat,nganh_nghe,ma_loai_gia_cong,vung,so_km,ky_han_quy_dinh,
                      dinh_muc_thang,ghi_chu_dinh_muc,nhom_hang_chi_tiet,
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
                   SELECT d.dong,v.id,v.ma AS ma_vat_tu,v.ten AS ten_hang,
                          CASE WHEN d.ma_vat_tu IS NOT NULL AND upper(v.ma)=upper(d.ma_vat_tu)
                               THEN 'MA_CHINH_XAC' ELSE 'TEN_CHINH_XAC' END AS loai_trung,
                          1.0::real AS diem
                   FROM dau_vao d
                   JOIN danh_muc_dong v ON v.ma_loai='VT'
                    AND (d.bo_qua_id IS NULL OR v.id::text<>d.bo_qua_id)
                    AND ((d.ma_vat_tu IS NOT NULL AND upper(v.ma)=upper(d.ma_vat_tu))
                         OR lower(v.ten)=lower(d.ten_hang))
                   ORDER BY d.dong,v.id''',
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
        return tim_trung_ncc_conn(conn, ma_ncc, ten_khong_dau, mst, bo_qua_id)


def tim_trung_ncc_conn(conn, ma_ncc, ten_khong_dau, mst, bo_qua_id=None):
    co_cot_id_chuan = conn.execute(
        """SELECT EXISTS(
             SELECT 1 FROM pg_attribute
             WHERE attrelid=to_regclass('nha_cung_cap')
               AND attname='id' AND attnum > 0 AND NOT attisdropped
           ) AS co"""
    ).fetchone()["co"]
    nguong = nguong_trung_ten_conn(conn)
    if not co_cot_id_chuan:
        # Một số CSDL cũ dùng cột viết HOA; không truy vấn các cột schema
        # mới (id/mst/ten_khong_dau) cho tới khi được chuẩn hóa bằng migration.
        return conn.execute(
            '''SELECT "ID" AS id,"MA_NCC" AS ma_ncc,"TEN" AS ten,
                      NULL::text AS mst,
                      CASE WHEN %s::text IS NOT NULL AND upper("MA_NCC")=upper(%s)
                           THEN 'MA_CHINH_XAC'
                           WHEN lower("TEN")=lower(%s) THEN 'TEN_CHINH_XAC'
                           ELSE 'TEN_GAN_GIONG' END AS loai_trung,
                      extensions.similarity(lower("TEN"),lower(%s)) AS diem
               FROM nha_cung_cap
               WHERE (%s::text IS NULL OR "ID"::text<>%s) AND (
                 (%s::text IS NOT NULL AND upper("MA_NCC")=upper(%s))
                 OR lower("TEN")=lower(%s)
                 OR extensions.similarity(lower("TEN"),lower(%s)) >= %s
               )
               ORDER BY diem DESC,"TEN","ID" LIMIT 10''',
            (ma_ncc, ma_ncc, ten_khong_dau, ten_khong_dau,
             bo_qua_id, bo_qua_id, ma_ncc, ma_ncc, ten_khong_dau,
             ten_khong_dau, nguong),
        ).fetchall()
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


def lay_tham_chieu_nhap_nhan_vien() -> tuple[set[str], set[str]]:
    """Tai bo phan va ma nhan vien hien co trong mot ket noi cho nhap lo."""
    with get_conn() as conn:
        bo_phan = {
            row["ma_bo_phan"] for row in conn.execute(
                "SELECT ma_bo_phan FROM bo_phan"
            ).fetchall()
        }
        nhan_vien = {
            row["ma_nhan_vien"] for row in conn.execute(
                "SELECT ma_nhan_vien FROM nhan_vien"
            ).fetchall()
        }
    return bo_phan, nhan_vien


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
                   WHERE ma_loai=%s AND (ma=%s OR id=%s) AND trang_thai='DANG_SU_DUNG' ''',
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
                '''INSERT INTO danh_muc_dong(id,ma_loai,ma,ten,du_lieu)
                   VALUES(%s,'VT',%s,%s,%s)
                   ON CONFLICT (id) DO UPDATE SET id=excluded.id
                   RETURNING id,ma AS ma_vat_tu,ten AS ten_hang,
                             du_lieu->>'don_vi' AS dvt,du_lieu->>'quy_cach' AS quy_cach,
                             trang_thai''',
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
    co_cot_id_chuan = conn.execute(
        """SELECT EXISTS(
             SELECT 1 FROM pg_attribute
             WHERE attrelid=to_regclass('nha_cung_cap')
               AND attname='id' AND attnum > 0 AND NOT attisdropped
           ) AS co"""
    ).fetchone()["co"]
    if not co_cot_id_chuan:
        # Tương thích bảng NCC cũ có tên cột viết HOA. Tạo mã dựa trên ID
        # cũ, đồng thời chỉ ghi các trường mà bảng đó thực sự có.
        conn.execute("SELECT pg_advisory_xact_lock(hashtext(%s))", ("ID:nha_cung_cap",))
        cot_hien_co = {
            row["attname"] for row in conn.execute(
                """SELECT attname FROM pg_attribute
                   WHERE attrelid=to_regclass('nha_cung_cap')
                     AND attnum > 0 AND NOT attisdropped"""
            ).fetchall()
        }
        if not {"ID", "MA_NCC", "TEN"}.issubset(cot_hien_co):
            raise RuntimeError("Bảng nhà cung cấp không khớp schema chuẩn hoặc schema legacy được hỗ trợ.")
        row = conn.execute(
            '''SELECT coalesce(max((substring("ID" from '[0-9]+$'))::integer),0)+1 AS n
               FROM nha_cung_cap WHERE "ID" ~ %s''',
            (r"^NCC-[0-9]+$",),
        ).fetchone()
        id_moi = f"NCC-{row['n']:05d}"
        ma_ncc = du_lieu.get("ma_ncc") or id_moi
        while not du_lieu.get("ma_ncc") and conn.execute(
            'SELECT EXISTS(SELECT 1 FROM nha_cung_cap WHERE "MA_NCC"=%s) AS co',
            (ma_ncc,),
        ).fetchone()["co"]:
            so_thu_tu = int(id_moi.rsplit("-", 1)[1]) + 1
            id_moi = f"NCC-{so_thu_tu:05d}"
            ma_ncc = id_moi

        gia_tri = {"ID": id_moi, "MA_NCC": ma_ncc, "TEN": du_lieu["ten"]}
        # Những trường đã tồn tại trên một số biến thể legacy được lưu luôn;
        # các trường không có trong bảng được bỏ qua, không làm mất dữ liệu cũ.
        for ten_cot in (
            "TEN_KHONG_DAU", "MST", "DIA_CHI", "NGUOI_LIEN_HE", "SDT", "EMAIL",
            "LA_NCC_MUA_HANG", "LA_NCC_GIA_CONG", "DA_PHE_DUYET", "TRANG_THAI",
            "GHI_CHU", "NGUOI_TAO",
        ):
            khoa = ten_cot.lower()
            if ten_cot in cot_hien_co and khoa in du_lieu:
                # Cột địa chỉ của một số bảng legacy là NOT NULL, dù form
                # hiện tại cho phép bỏ trống địa chỉ.
                gia_tri[ten_cot] = (du_lieu[khoa] or "") if ten_cot == "DIA_CHI" else du_lieu[khoa]
        if "TEN_KHONG_DAU" in cot_hien_co:
            gia_tri["TEN_KHONG_DAU"] = du_lieu.get("ten_khong_dau") or du_lieu["ten"].lower()
        if "NGUOI_TAO" in cot_hien_co:
            gia_tri["NGUOI_TAO"] = nguoi_tao
        if "TRANG_THAI" in cot_hien_co:
            gia_tri["TRANG_THAI"] = du_lieu.get("trang_thai", "HOAT_DONG")
        cot = list(gia_tri)
        query = sql.SQL("INSERT INTO nha_cung_cap ({}) VALUES ({}) RETURNING *").format(
            sql.SQL(",").join(map(sql.Identifier, cot)),
            sql.SQL(",").join(sql.Placeholder() for _ in cot),
        )
        return conn.execute(query, [gia_tri[key] for key in cot]).fetchone()

    id_moi = _id_moi(conn, "nha_cung_cap", "NCC", 5)
    while conn.execute(
        "SELECT EXISTS(SELECT 1 FROM nha_cung_cap WHERE ma_ncc=%s) AS co",
        (id_moi,),
    ).fetchone()["co"]:
        so_thu_tu = int(id_moi.rsplit("-", 1)[1]) + 1
        id_moi = f"NCC-{so_thu_tu:05d}"
    ma_ncc = du_lieu.get("ma_ncc") or id_moi
    du_lieu = {**du_lieu, "ma_ncc": ma_ncc}
    cot = [
        "ma_ncc", "ten", "ten_khong_dau", "mst", "dia_chi", "nguoi_lien_he", "sdt",
        "fax", "email", "mat_hang", "la_ncc_mua_hang", "la_ncc_gia_cong", "co_hoa_don",
        "cong_no", "tien_mat", "nganh_nghe", "ma_loai_gia_cong", "vung", "so_km",
        "ky_han_quy_dinh", "dinh_muc_thang", "ghi_chu_dinh_muc", "nhom_hang_chi_tiet",
        "da_phe_duyet", "ngay_phe_duyet", "phan_loai_ncc", "trang_thai", "ghi_chu",
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
        "ma_ncc", "ten", "ten_khong_dau", "mst", "dia_chi", "nguoi_lien_he", "sdt",
        "fax", "email", "mat_hang", "la_ncc_mua_hang", "la_ncc_gia_cong", "co_hoa_don",
        "cong_no", "tien_mat", "nganh_nghe", "ma_loai_gia_cong", "vung", "so_km",
        "ky_han_quy_dinh", "dinh_muc_thang", "ghi_chu_dinh_muc", "nhom_hang_chi_tiet",
        "da_phe_duyet", "ngay_phe_duyet", "phan_loai_ncc", "trang_thai", "ghi_chu",
    }
    cot = [key for key in du_lieu if key in cot_hop_le]
    gan = [sql.SQL("{}={}").format(sql.Identifier(key), sql.Placeholder()) for key in cot]
    gan.append(sql.SQL("nguoi_sua={}").format(sql.Placeholder()))
    query = sql.SQL("UPDATE nha_cung_cap SET {} WHERE id=%s AND phien_ban=%s RETURNING *").format(sql.SQL(",").join(gan))
    with get_conn() as conn:
        cot_id_chuan = conn.execute(
            """SELECT EXISTS(
                 SELECT 1 FROM pg_attribute
                 WHERE attrelid=to_regclass('nha_cung_cap')
                   AND attname='id' AND attnum > 0 AND NOT attisdropped
               ) AS co"""
        ).fetchone()["co"]
        if not cot_id_chuan:
            cot_hien_co = {
                row["attname"] for row in conn.execute(
                    """SELECT attname FROM pg_attribute
                       WHERE attrelid=to_regclass('nha_cung_cap')
                         AND attnum > 0 AND NOT attisdropped"""
                ).fetchall()
            }
            anh_xa = {key: key.upper() for key in cot_hop_le}
            cot = [key for key in cot if anh_xa[key] in cot_hien_co]
            cot_text_bat_buoc = {
                row["attname"] for row in conn.execute(
                    """SELECT a.attname FROM pg_attribute a
                       JOIN pg_type t ON t.oid=a.atttypid
                       WHERE a.attrelid=to_regclass('nha_cung_cap')
                         AND a.attnum > 0 AND NOT a.attisdropped
                         AND a.attnotnull AND t.typcategory='S'"""
                ).fetchall()
            }
            gia_tri_cap_nhat = {
                key: ("" if du_lieu[key] is None and anh_xa[key] in cot_text_bat_buoc else du_lieu[key])
                for key in cot
            }
            if "NGUOI_SUA" in cot_hien_co:
                cot.append("nguoi_sua")
                gan = [sql.SQL("{}={}").format(sql.Identifier(anh_xa[key]), sql.Placeholder()) for key in cot[:-1]]
                gan.append(sql.SQL('"NGUOI_SUA"=%s'))
            else:
                gan = [sql.SQL("{}={}").format(sql.Identifier(anh_xa[key]), sql.Placeholder()) for key in cot]
            if not gan:
                raise RuntimeError("Bảng NCC legacy không có cột trạng thái để lưu thao tác loại bỏ.")
            if "PHIEN_BAN" in cot_hien_co:
                where = sql.SQL('"ID"=%s AND "PHIEN_BAN"=%s')
                params = (*[gia_tri_cap_nhat[key] for key in cot if key != "nguoi_sua"], nguoi_sua) if "NGUOI_SUA" in cot_hien_co else tuple(gia_tri_cap_nhat[key] for key in cot)
                params = (*params, id_ncc, phien_ban)
            else:
                where = sql.SQL('"ID"=%s')
                params = (*[gia_tri_cap_nhat[key] for key in cot if key != "nguoi_sua"], nguoi_sua) if "NGUOI_SUA" in cot_hien_co else tuple(gia_tri_cap_nhat[key] for key in cot)
                params = (*params, id_ncc)
            query = sql.SQL("UPDATE nha_cung_cap SET {} WHERE {} RETURNING *").format(sql.SQL(",").join(gan), where)
            return conn.execute(query, params).fetchone()
        return conn.execute(query, (*[du_lieu[key] for key in cot], nguoi_sua, id_ncc, phien_ban)).fetchone()



def danh_sach_mat_hang_ncc(id_ncc: str | None = None, bo_loc: dict | None = None,
                           offset: int = 0, limit: int = 100):
    """Danh sách mặt hàng NCC theo trục F1, dùng được cho cả tab NCC và tra cứu toàn hệ thống."""
    bo_loc = bo_loc or {}
    conditions = []
    params: list = []
    if id_ncc:
        conditions.append("m.id_ncc=%s")
        params.append(id_ncc)
    if bo_loc.get("trang_thai"):
        conditions.append("m.trang_thai=%s")
        params.append(bo_loc["trang_thai"])
    if bo_loc.get("loai"):
        conditions.append("m.loai=%s")
        params.append(bo_loc["loai"])
    for key in ("nhom_hang_chinh", "nhom_hang_chi_tiet", "ma_loai_gia_cong", "muc_chat_luong"):
        if bo_loc.get(key):
            column = "m.muc_chat_luong" if key == "muc_chat_luong" else f"m.{key}"
            conditions.append(f"{column}=%s")
            params.append(bo_loc[key])
    if bo_loc.get("q"):
        conditions.append("lower(concat_ws(' ',m.ten_hang,n.ten,coalesce(m.ma_vat_tu,''))) LIKE %s")
        params.append(f"%{str(bo_loc['q']).strip().lower()}%")
    where = " WHERE " + " AND ".join(conditions) if conditions else ""
    sql_base = f"""
        FROM mat_hang_ncc m
        JOIN nha_cung_cap n ON n.id=m.id_ncc
        LEFT JOIN chung_loai cl ON cl.ma_chung_loai=m.nhom_hang_chinh
        LEFT JOIN chung_loai clct ON clct.ma_chung_loai=m.nhom_hang_chi_tiet
        LEFT JOIN loai_gia_cong lg ON lg.ma=m.ma_loai_gia_cong
        LEFT JOIN don_vi_tinh dvt ON dvt.dvt=m.dvt
        {where}
    """
    with get_conn() as conn:
        rows = conn.execute(
            f"""SELECT m.*, n.ma_ncc, n.ten AS ten_ncc,
                       cl.ten AS ten_nhom_hang_chinh, clct.ten AS ten_nhom_hang_chi_tiet,
                       lg.ten AS ten_loai_gia_cong, dvt.ten_dvt
                {sql_base}
                ORDER BY n.ten, m.ten_hang, m.id OFFSET %s LIMIT %s""",
            (*params, offset, limit),
        ).fetchall()
        total = conn.execute(f"SELECT count(*) AS n {sql_base}", params).fetchone()["n"]
        return rows, total


def lay_mat_hang_ncc(id_mat_hang: str):
    with get_conn() as conn:
        return conn.execute(
            """SELECT m.*, n.ma_ncc, n.ten AS ten_ncc,
                      cl.ten AS ten_nhom_hang_chinh, clct.ten AS ten_nhom_hang_chi_tiet,
                      lg.ten AS ten_loai_gia_cong, dvt.ten_dvt
               FROM mat_hang_ncc m
               JOIN nha_cung_cap n ON n.id=m.id_ncc
               LEFT JOIN chung_loai cl ON cl.ma_chung_loai=m.nhom_hang_chinh
               LEFT JOIN chung_loai clct ON clct.ma_chung_loai=m.nhom_hang_chi_tiet
               LEFT JOIN loai_gia_cong lg ON lg.ma=m.ma_loai_gia_cong
               LEFT JOIN don_vi_tinh dvt ON dvt.dvt=m.dvt
               WHERE m.id=%s""",
            (id_mat_hang,),
        ).fetchone()


def tao_mat_hang_ncc(du_lieu: dict, nguoi_tao: str):
    id_moi = f"MHN-{uuid.uuid4().hex[:20].upper()}"
    cot = [
        "id", "id_ncc", "ma_vat_tu", "ten_hang", "loai", "nhom_hang_chinh",
        "nhom_hang_chi_tiet", "ma_loai_gia_cong", "ma_cong_doan", "dvt",
        "thong_so_ky_thuat", "diem_ky_thuat", "muc_chat_luong", "diem_chat_luong",
        "nang_luc_thang", "so_ngay_giao_chuan", "trang_thai", "nguoi_de_xuat",
        "ngay_de_xuat", "ghi_chu", "nguoi_tao",
    ]
    values = {**du_lieu, "id": id_moi, "nguoi_tao": nguoi_tao}
    query = sql.SQL("INSERT INTO mat_hang_ncc ({}) VALUES ({}) RETURNING *").format(
        sql.SQL(",").join(map(sql.Identifier, cot)),
        sql.SQL(",").join(sql.Placeholder() for _ in cot),
    )
    with get_conn() as conn:
        return conn.execute(query, [values.get(key) for key in cot]).fetchone()


def cap_nhat_mat_hang_ncc(id_mat_hang: str, du_lieu: dict, phien_ban: int, nguoi_sua: str):
    cot_hop_le = {
        "ma_vat_tu", "ten_hang", "loai", "nhom_hang_chinh", "nhom_hang_chi_tiet",
        "ma_loai_gia_cong", "ma_cong_doan", "dvt", "thong_so_ky_thuat",
        "diem_ky_thuat", "muc_chat_luong", "diem_chat_luong", "nang_luc_thang",
        "so_ngay_giao_chuan", "trang_thai", "nguoi_de_xuat", "ngay_de_xuat",
        "nguoi_duyet", "ngay_duyet", "ghi_chu",
    }
    cot = [key for key in du_lieu if key in cot_hop_le]
    if not cot:
        return lay_mat_hang_ncc(id_mat_hang)
    gan = [sql.SQL("{}={}").format(sql.Identifier(key), sql.Placeholder()) for key in cot]
    gan.extend([
        sql.SQL("phien_ban=phien_ban+1"),
        sql.SQL("ngay_sua=now()"),
        sql.SQL("nguoi_sua={}").format(sql.Placeholder()),
    ])
    query = sql.SQL("UPDATE mat_hang_ncc SET {} WHERE id=%s AND phien_ban=%s RETURNING *").format(sql.SQL(",").join(gan))
    with get_conn() as conn:
        return conn.execute(query, (*[du_lieu[key] for key in cot], nguoi_sua, id_mat_hang, phien_ban)).fetchone()

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



def _kpi_mat_hang_ncc_conn(conn, id_mat_hang: str):
    return conn.execute(
        """SELECT m.id, m.id_ncc, m.ma_vat_tu,
                  coalesce(del.total,0) AS so_lan_giao,
                  coalesce(del.dung_han,0) AS so_lan_dung_han,
                  del.ty_le_iqc AS ty_le_iqc,
                  coalesce(del.so_lan_khong_phu_hop,0) AS so_lan_khong_phu_hop,
                  coalesce(gd.gia_tri_12_thang,0) AS gia_tri_12_thang,
                  extract(months from age(current_date, coalesce(gd.ngay_dau_tien, current_date)))::integer AS thang_hop_tac
           FROM mat_hang_ncc m
           LEFT JOIN LATERAL (
             SELECT count(*) AS total,
                    count(*) FILTER (WHERE coalesce(nhd.so_ngay_som_tre,0) >= 0) AS dung_han,
                    100.0 * sum(coalesce(iqc.so_luong_dat,0)) / NULLIF(sum(coalesce(iqc.so_luong_kiem,0)),0) AS ty_le_iqc,
                    count(DISTINCT hk.id) AS so_lan_khong_phu_hop
             FROM nhan_hang nh
             JOIN nhan_hang_dong nhd ON nhd.id_nhan_hang=nh.id
             LEFT JOIN vat_tu vt ON vt.id=nhd.id_vat_tu
             LEFT JOIN ket_qua_iqc iqc ON iqc.id_nhan_hang_dong=nhd.id
             LEFT JOIN hang_khong_phu_hop hk ON hk.id_ket_qua_iqc=iqc.id
             WHERE nh.id_ncc=m.id_ncc
               AND m.ma_vat_tu IS NOT NULL AND vt.ma_vat_tu=m.ma_vat_tu
           ) del ON true
           LEFT JOIN LATERAL (
             SELECT sum(dhd.so_luong*dhd.don_gia_co_so) FILTER (WHERE dh.ngay_dat >= current_date - interval '12 months') AS gia_tri_12_thang,
                    min(dh.ngay_dat) AS ngay_dau_tien
             FROM don_hang dh
             JOIN don_hang_dong dhd ON dhd.id_don_hang=dh.id
             LEFT JOIN vat_tu vt ON vt.id=dhd.id_vat_tu
             WHERE dh.id_ncc=m.id_ncc
               AND m.ma_vat_tu IS NOT NULL AND vt.ma_vat_tu=m.ma_vat_tu
               AND dh.trang_thai NOT IN ('HUY','TU_CHOI')
           ) gd ON true
           WHERE m.id=%s""",
        (id_mat_hang,),
    ).fetchone()


def danh_sach_danh_gia_ncc(id_mat_hang: str | None = None, trang_thai: str | None = None,
                           offset: int = 0, limit: int = 100):
    conditions = []
    params: list = []
    if id_mat_hang:
        conditions.append("d.id_mat_hang_ncc=%s")
        params.append(id_mat_hang)
    if trang_thai:
        conditions.append("d.trang_thai=%s")
        params.append(trang_thai)
    where = " WHERE " + " AND ".join(conditions) if conditions else ""
    base = f"""FROM danh_gia_ncc d
        JOIN nha_cung_cap n ON n.id=d.id_ncc
        LEFT JOIN mat_hang_ncc m ON m.id=d.id_mat_hang_ncc
        LEFT JOIN nhan_vien nv ON nv.ma_nhan_vien=d.nguoi_danh_gia
        LEFT JOIN nhan_vien nd ON nd.ma_nhan_vien=d.nguoi_duyet
        {where}"""
    with get_conn() as conn:
        rows = conn.execute(
            f"""SELECT d.*, n.ma_ncc, n.ten AS ten_ncc, m.ten_hang, m.ma_vat_tu,
                       nv.ho_va_ten AS ten_nguoi_danh_gia, nd.ho_va_ten AS ten_nguoi_duyet
                {base} ORDER BY d.ngay_danh_gia DESC, d.id DESC OFFSET %s LIMIT %s""",
            (*params, offset, limit),
        ).fetchall()
        total = conn.execute(f"SELECT count(*) AS n {base}", params).fetchone()["n"]
        return rows, total


def danh_sach_mat_hang_ncc_den_han(offset: int = 0, limit: int = 100):
    base = """FROM mat_hang_ncc m
        JOIN nha_cung_cap n ON n.id=m.id_ncc
        LEFT JOIN LATERAL (
          SELECT d.ngay_danh_gia
          FROM danh_gia_ncc d
          WHERE d.id_mat_hang_ncc=m.id AND d.trang_thai='DA_DUYET'
          ORDER BY d.ngay_danh_gia DESC,d.id DESC LIMIT 1
        ) d ON true
        CROSS JOIN LATERAL (
          SELECT coalesce(nullif(gia_tri,'')::integer,12) AS thang
          FROM tham_so_he_thong WHERE ma='CHU_KY_DANH_GIA_NCC_THANG'
          UNION ALL SELECT 12 WHERE NOT EXISTS (
            SELECT 1 FROM tham_so_he_thong WHERE ma='CHU_KY_DANH_GIA_NCC_THANG'
          )
          LIMIT 1
        ) chu_ky
        WHERE m.trang_thai='DA_DUYET'
          AND (d.ngay_danh_gia IS NULL OR d.ngay_danh_gia + chu_ky.thang * interval '1 month' <= current_date)
          AND NOT EXISTS (
            SELECT 1 FROM danh_gia_ncc cho_duyet
            WHERE cho_duyet.id_mat_hang_ncc=m.id AND cho_duyet.trang_thai='CHO_DUYET'
          )"""
    with get_conn() as conn:
        rows = conn.execute(
            f"""SELECT m.id,m.id_ncc,n.ma_ncc,n.ten AS ten_ncc,m.ma_vat_tu,
                       m.ten_hang,m.loai,m.nhom_hang_chinh,m.nhom_hang_chi_tiet,
                       d.ngay_danh_gia AS ngay_cham_gan_nhat,
                       (d.ngay_danh_gia + chu_ky.thang * interval '1 month')::date AS ngay_den_han,
                       CASE WHEN d.ngay_danh_gia IS NULL THEN NULL
                            ELSE greatest(0,current_date - (d.ngay_danh_gia + chu_ky.thang * interval '1 month')::date) END AS so_ngay_qua_han
                {base}
                ORDER BY d.ngay_danh_gia NULLS FIRST,n.ten,m.ten_hang,m.id
                OFFSET %s LIMIT %s""",
            (offset, limit),
        ).fetchall()
        total = conn.execute(f"SELECT count(*) AS n {base}").fetchone()["n"]
        return rows, total


def danh_sach_so_theo_doi_ncc(id_ncc: str | None = None, trang_thai: str | None = None,
                               q: str = "", offset: int = 0, limit: int = 100):
    conditions = []
    params: list = []
    if id_ncc:
        conditions.append("coalesce(hk.id_ncc,nh.id_ncc)=%s")
        params.append(id_ncc)
    if trang_thai == "MO":
        conditions.append("hk.ngay_dong IS NULL")
    elif trang_thai == "DA_DONG":
        conditions.append("hk.ngay_dong IS NOT NULL")
    if q.strip():
        conditions.append("lower(concat_ws(' ',n.ma_ncc,n.ten,nhd.ten_hang_chup,vt.ma_vat_tu,hk.mo_ta,hk.huong_xu_ly)) LIKE %s")
        params.append(f"%{q.strip().lower()}%")
    where = " WHERE " + " AND ".join(conditions) if conditions else ""
    base = f"""FROM hang_khong_phu_hop hk
        JOIN ket_qua_iqc iqc ON iqc.id=hk.id_ket_qua_iqc
        JOIN nhan_hang_dong nhd ON nhd.id=iqc.id_nhan_hang_dong
        JOIN nhan_hang nh ON nh.id=nhd.id_nhan_hang
        LEFT JOIN nha_cung_cap n ON n.id=coalesce(hk.id_ncc,nh.id_ncc)
        LEFT JOIN vat_tu vt ON vt.id=nhd.id_vat_tu
        LEFT JOIN nhan_vien nv ON nv.ma_nhan_vien=hk.nguoi_giam_sat
        {where}"""
    with get_conn() as conn:
        rows = conn.execute(
            f"""SELECT hk.id,hk.id_ncc,n.ma_ncc,n.ten AS ten_ncc,
                       nh.ngay_nhan,nhd.ten_hang_chup,vt.ma_vat_tu,
                       hk.mo_ta,hk.huong_xu_ly,hk.ket_qua,hk.nguoi_giam_sat,
                       nv.ho_va_ten AS ten_nguoi_giam_sat,hk.ngay_dong,hk.trang_thai
                {base}
                ORDER BY nh.ngay_nhan DESC,hk.id DESC OFFSET %s LIMIT %s""",
            (*params, offset, limit),
        ).fetchall()
        total = conn.execute(f"SELECT count(*) AS n {base}", params).fetchone()["n"]
        return rows, total


def tao_danh_gia_ncc(du_lieu: dict, nguoi_tao: str):
    id_moi = f"DGN-{uuid.uuid4().hex[:20].upper()}"
    cot = [
        "id", "id_ncc", "id_mat_hang_ncc", "loai", "ky_danh_gia", "ngay_danh_gia",
        "nguoi_danh_gia", "diem_chat_luong", "diem_giao_hang", "diem_gia_ca",
        "diem_thanh_toan", "diem_dich_vu", "diem_tam_voc", "diem_thoi_gian_hop_tac",
        "diem_gia_tri_giao_dich", "diem_tong", "xep_loai", "ty_le_dung_han",
        "ty_le_iqc_dat", "so_lan_khong_phu_hop", "ket_luan", "ket_luan_bm06",
        "trang_thai", "ghi_chu", "ngay_tao", "nguoi_tao",
    ]
    values = {**du_lieu, "id": id_moi, "ngay_tao": None, "nguoi_tao": nguoi_tao}
    query = sql.SQL("INSERT INTO danh_gia_ncc ({}) VALUES ({}) RETURNING *").format(
        sql.SQL(",").join(map(sql.Identifier, cot)),
        sql.SQL(",").join(sql.Placeholder() if key != "ngay_tao" else sql.SQL("now()") for key in cot),
    )
    with get_conn() as conn:
        return conn.execute(query, [values.get(key) for key in cot if key != "ngay_tao"]).fetchone()


def duyet_danh_gia_ncc(id_danh_gia: str, phien_ban: int, trang_thai: str,
                       nguoi_duyet: str):
    with get_conn() as conn:
        return conn.execute(
            """UPDATE danh_gia_ncc
               SET trang_thai=%s, nguoi_duyet=%s, ngay_duyet=current_date,
                   ngay_sua=now(), nguoi_sua=%s, phien_ban=phien_ban+1
               WHERE id=%s AND phien_ban=%s RETURNING *""",
            (trang_thai, nguoi_duyet if trang_thai == 'DA_DUYET' else None,
             nguoi_duyet, id_danh_gia, phien_ban),
        ).fetchone()



def tinh_dinh_muc_ncc(id_ncc: str, ngay_dat):
    with get_conn() as conn:
        return conn.execute(
            """SELECT n.id, n.ma_ncc, n.ten, n.dinh_muc_thang,
                      coalesce(sum(dhd.so_luong*dhd.don_gia_co_so),0) AS da_dat_thang
               FROM nha_cung_cap n
               LEFT JOIN don_hang dh ON dh.id_ncc=n.id
                 AND dh.trang_thai NOT IN ('HUY','TU_CHOI')
                 AND date_trunc('month', dh.ngay_dat)=date_trunc('month', %s::date)
               LEFT JOIN don_hang_dong dhd ON dhd.id_don_hang=dh.id
               WHERE n.id=%s
               GROUP BY n.id, n.ma_ncc, n.ten, n.dinh_muc_thang""",
            (ngay_dat, id_ncc),
        ).fetchone()
