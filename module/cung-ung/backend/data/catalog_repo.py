"""SQL đọc/ghi danh mục. Service khác không truy vấn trực tiếp các bảng này."""

import json

from psycopg import sql
from psycopg.types.json import Jsonb

from backend.data.db import get_conn


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
        return conn.execute(
            """SELECT id,ma_vat_tu,ten_hang,dvt,ma_chung_loai,phan_loai,kho,
                      quy_cach,trang_thai,
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
