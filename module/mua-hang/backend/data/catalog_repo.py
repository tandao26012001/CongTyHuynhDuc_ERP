"""SQL đọc/ghi danh mục. Service khác không truy vấn trực tiếp các bảng này."""

import json

from psycopg import sql
from psycopg.errors import CheckViolation, ForeignKeyViolation, UniqueViolation
from psycopg.types.json import Jsonb

from backend.data.db import get_conn


def la_schema_rut_gon() -> bool:
    with get_conn() as conn:
        return not conn.execute(
            "SELECT to_regclass('mua_hang.vat_tu') IS NOT NULL AS co"
        ).fetchone()["co"]


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
    ket_qua = []
    for loai in ("VAT_LIEU", "BE_MAT", "MAU_SAC"):
        match = next((dict(row) for row in rows if row["loai"] == loai and row["tu_khoa"] in ten_khong_dau), None)
        if match:
            ket_qua.append(match)
    return ket_qua


def lay_quy_tac_nhan_dien():
    with get_conn() as conn:
        return conn.execute(
            """SELECT id,loai,tu_khoa,ten_chuan,ma_quy_uoc,uu_tien,trang_thai
               FROM quy_tac_ten_hang
               ORDER BY CASE loai WHEN 'VAT_LIEU' THEN 1 WHEN 'BE_MAT' THEN 2 ELSE 3 END,
                        uu_tien DESC,tu_khoa"""
        ).fetchall()


def nhap_quy_tac_nhan_dien(danh_sach: list[dict]):
    rows, errors = [], []
    with get_conn() as conn:
        for index, item in enumerate(danh_sach, 1):
            dong = item.get("_dong", index)
            try:
                with conn.transaction():
                    row = conn.execute(
                        """INSERT INTO quy_tac_ten_hang
                             (id,loai,tu_khoa,ten_chuan,ma_quy_uoc,uu_tien,trang_thai)
                           VALUES(%(id)s,%(loai)s,%(tu_khoa)s,%(ten_chuan)s,%(ma_quy_uoc)s,%(uu_tien)s,'HOAT_DONG')
                           RETURNING id,loai,tu_khoa,ten_chuan,ma_quy_uoc,uu_tien,trang_thai""",
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
        for index, item in enumerate(danh_sach, 1):
            dong = item.get("_dong", index)
            try:
                with conn.transaction():
                    row = _tao_vat_tu(conn, item, nguoi_tao)
                    rows.append(dict(row))
            except UniqueViolation:
                errors.append({"dong": dong, "ma": item.get("ma_vat_tu", ""), "loi": "Mã hoặc tên vật tư đã tồn tại."})
            except (ForeignKeyViolation, CheckViolation) as exc:
                errors.append({"dong": dong, "ma": item.get("ma_vat_tu", ""), "loi": "Đơn vị tính hoặc dữ liệu liên kết không hợp lệ."})
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


def lay_don_vi_tinh_hoat_dong():
    with get_conn() as conn:
        if conn.execute("SELECT to_regclass('mua_hang.don_vi_tinh') IS NOT NULL AS co").fetchone()["co"]:
            return conn.execute(
                """SELECT dvt,ten_dvt,so_le FROM don_vi_tinh
                   WHERE trang_thai='HOAT_DONG' ORDER BY ten_dvt,dvt"""
            ).fetchall()
        return conn.execute(
            '''SELECT "MA" AS dvt,"TEN" AS ten_dvt,
                      coalesce(("DU_LIEU"->>'so_le')::smallint,0) AS so_le
               FROM danh_muc_dong
               WHERE "MA_LOAI"='DVT' AND "TRANG_THAI"='DANG_SU_DUNG'
               ORDER BY "TEN","MA"'''
        ).fetchall()


def nhap_don_vi_tinh_hang_loat(danh_sach: list[dict], nguoi_tao: str, khoa: str):
    with get_conn() as conn:
        schema_rut_gon = not conn.execute(
            "SELECT to_regclass('mua_hang.don_vi_tinh') IS NOT NULL AS co"
        ).fetchone()["co"]
        rows = []
        errors = []
        for index, item in enumerate(danh_sach, 1):
            try:
                with conn.transaction():
                    if schema_rut_gon:
                        row = conn.execute(
                            '''INSERT INTO danh_muc_dong("ID","MA_LOAI","MA","TEN","DU_LIEU")
                               VALUES(%s,'DVT',%s,%s,%s)
                               ON CONFLICT ("ID") DO UPDATE SET "ID"=excluded."ID"
                               RETURNING "MA" AS dvt,"TEN" AS ten_dvt,
                                         coalesce(("DU_LIEU"->>'so_le')::smallint,0) AS so_le''',
                            (f"DVT-{khoa}-{item['_dong']}", item["dvt"], item["ten_dvt"],
                             Jsonb({"so_le": item["so_le"], "nguoi_tao": nguoi_tao})),
                        ).fetchone()
                    else:
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
    if ma == "don-vi-tinh" and la_schema_rut_gon():
        with get_conn() as conn:
            row = conn.execute(
                '''INSERT INTO danh_muc_dong("ID","MA_LOAI","MA","TEN","DU_LIEU")
                   VALUES(%s,'DVT',%s,%s,%s)
                   ON CONFLICT ("ID") DO UPDATE SET "ID"=excluded."ID"
                   RETURNING "MA" AS dvt,"TEN" AS ten_dvt,
                             coalesce(("DU_LIEU"->>'so_le')::smallint,0) AS so_le''',
                (f"DVT-{khoa}", du_lieu["dvt"], du_lieu["ten_dvt"],
                 Jsonb({"so_le": du_lieu["so_le"], "nguoi_tao": nguoi_tao})),
            ).fetchone()
            return {"da_luu": True, "item": dict(row), "lap_lai": False}
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
    if la_schema_rut_gon():
        ma_loai = {"dvt": "DVT", "vat_tu": "VT", "chung_loai": "CL"}.get(loai)
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
