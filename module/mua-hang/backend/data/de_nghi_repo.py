"""Tầng truy vấn CSDL cho module Đề nghị (de_nghi, de_nghi_dong, lich_su, thong_bao)."""

import json
import uuid
from psycopg.types.json import Jsonb
from backend.data.de_nghi_tuong_tac_repo import (
    ghi_lich_su_trang_thai, ghi_nhat_ky, gui_nhac_ky_bu_den_han, gui_thong_bao, huy_cac_dong,
    lay_ban_lanh_dao, lay_nguoi_duyet_bo_phan, lay_nhan_vien_mua_hang,
    lay_mot_tep, lay_tep_dinh_kem, lay_trao_doi, them_tep_dinh_kem, them_trao_doi,
)


def lay_de_nghi(conn, id_dn: str, khoa: bool = False) -> dict | None:
    cur = conn.cursor()
    sql = """
        SELECT dn.*, bp.ten AS ten_bo_phan, nv.ho_va_ten AS ten_nguoi_yeu_cau,
               nd.ho_va_ten AS ten_nguoi_duyet, nmh.ho_va_ten AS ten_nguoi_mua_hang
        FROM de_nghi dn
        LEFT JOIN bo_phan bp ON bp.ma_bo_phan = dn.ma_bo_phan
        LEFT JOIN nhan_vien nv ON nv.ma_nhan_vien = dn.nguoi_yeu_cau
        LEFT JOIN nhan_vien nd ON nd.ma_nhan_vien = dn.nguoi_duyet_bp
        LEFT JOIN nhan_vien nmh ON nmh.ma_nhan_vien = dn.nguoi_mua_hang
        WHERE dn.id = %s
    """
    if khoa:
        sql += " FOR UPDATE OF dn"
    cur.execute(sql, (id_dn,))
    return cur.fetchone()


def lay_cac_dong(conn, id_dn: str) -> list[dict]:
    cur = conn.cursor()
    cur.execute(
        """
        SELECT d.*, vt.ma_vat_tu, vtd.ma_vat_tu AS ma_vat_tu_duyet
        FROM de_nghi_dong d
        LEFT JOIN vat_tu vt ON vt.id = d.id_vt_de_nghi
        LEFT JOIN vat_tu vtd ON vtd.id = d.id_vt_duyet_mua
        WHERE d.id_de_nghi = %s AND d.da_xoa = false
        ORDER BY d.stt_dong ASC
        """,
        (id_dn,),
    )
    return cur.fetchall()


def dem_dong(conn, id_dn: str) -> int:
    cur = conn.cursor()
    cur.execute("SELECT count(*) AS n FROM de_nghi_dong WHERE id_de_nghi = %s AND da_xoa = false", (id_dn,))
    return cur.fetchone()["n"]


def lay_cac_lsx(conn, id_dn: str) -> list[str]:
    cur = conn.cursor()
    cur.execute(
        "SELECT DISTINCT lenh_san_xuat FROM de_nghi_dong WHERE id_de_nghi = %s AND da_xoa = false AND lenh_san_xuat IS NOT NULL",
        (id_dn,),
    )
    return [r["lenh_san_xuat"] for r in cur.fetchall() if r["lenh_san_xuat"]]


def lsx_da_co_de_nghi(conn, lenh_san_xuat: str, tru_id_dn: str | None = None) -> bool:
    cur = conn.cursor()
    sql = """
        SELECT 1
        FROM de_nghi_dong d
        JOIN de_nghi dn ON dn.id = d.id_de_nghi
        WHERE d.lenh_san_xuat = %s AND d.da_xoa = false AND dn.trang_thai <> 'HUY'
    """
    params = [lenh_san_xuat]
    if tru_id_dn:
        sql += " AND dn.id <> %s"
        params.append(tru_id_dn)
    sql += " LIMIT 1"
    cur.execute(sql, tuple(params))
    return cur.fetchone() is not None


def lay_lenh_san_xuat(conn, lenh_san_xuat: str) -> dict | None:
    cur = conn.cursor()
    cur.execute("SELECT * FROM lenh_san_xuat WHERE lenh_san_xuat = %s", (lenh_san_xuat,))
    return cur.fetchone()


def lay_vat_tu(conn, id_vat_tu: str) -> dict | None:
    cur = conn.cursor()
    cur.execute("SELECT * FROM vat_tu WHERE id = %s", (id_vat_tu,))
    return cur.fetchone()


def lay_cong_doan(conn, ma_cong_doan: str) -> dict | None:
    cur = conn.cursor()
    cur.execute("SELECT * FROM cong_doan WHERE ma_cong_doan = %s", (ma_cong_doan,))
    return cur.fetchone()


def la_nhan_vien_mua_hang_hoat_dong(conn, ma_nhan_vien: str) -> bool:
    """Chỉ nhân viên Mua hàng đang hoạt động mới được nhận phân công F01."""
    return conn.execute(
        """SELECT 1
           FROM tai_khoan
           WHERE ma_nhan_vien=%s AND vai_tro='NV_MUA_HANG' AND trang_thai='HOAT_DONG'
           LIMIT 1""",
        (ma_nhan_vien,),
    ).fetchone() is not None


def tao_de_nghi(conn, data: dict) -> None:
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO de_nghi (
            id, loai, so_phieu_cu, ma_bo_phan, nguoi_yeu_cau,
            thoi_diem_gui, ngay_hieu_luc, tre_gio_chot, muc_do_uu_tien,
            tinh_trang_yc, trang_thai, ly_do_tra_lai, can_bld_duyet,
            nguoi_duyet_bp, ngay_duyet_bp, duyet_online, ngay_ky_bu,
            nguoi_mua_hang, ghi_chu, nguoi_tao
        ) VALUES (
            %(id)s, %(loai)s, %(so_phieu_cu)s, %(ma_bo_phan)s, %(nguoi_yeu_cau)s,
            %(thoi_diem_gui)s, %(ngay_hieu_luc)s, %(tre_gio_chot)s, %(muc_do_uu_tien)s,
            %(tinh_trang_yc)s, %(trang_thai)s, %(ly_do_tra_lai)s, %(can_bld_duyet)s,
            %(nguoi_duyet_bp)s, %(ngay_duyet_bp)s, %(duyet_online)s, %(ngay_ky_bu)s,
            %(nguoi_mua_hang)s, %(ghi_chu)s, %(nguoi_tao)s
        )
        """,
        data,
    )


def tao_dong(conn, data: dict) -> None:
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO de_nghi_dong (
            id, id_de_nghi, stt_dong, id_sp_cu, id_vt_de_nghi, id_vt_duyet_mua,
            ten_hang_chup, dvt_chup, phan_loai_chup, quy_cach, ma_chung_loai,
            muc_dich_su_dung, so_luong, ky_han_yc, tra_loi_ky_han, lenh_san_xuat,
            ma_vach, ma_cong_doan, noi_dung_gia_cong, muc_do_uu_tien,
            ngay_du_kien_ve, ma_loai_gia_cong, yeu_cau_ky_thuat,
            bat_kha_thi, can_xac_nhan_kt, trang_thai_dong, ghi_chu, nguoi_tao
        ) VALUES (
            %(id)s, %(id_de_nghi)s, %(stt_dong)s, %(id_sp_cu)s, %(id_vt_de_nghi)s, %(id_vt_duyet_mua)s,
            %(ten_hang_chup)s, %(dvt_chup)s, %(phan_loai_chup)s, %(quy_cach)s, %(ma_chung_loai)s,
            %(muc_dich_su_dung)s, %(so_luong)s, %(ky_han_yc)s, %(tra_loi_ky_han)s, %(lenh_san_xuat)s,
            %(ma_vach)s, %(ma_cong_doan)s, %(noi_dung_gia_cong)s, %(muc_do_uu_tien)s,
            %(ngay_du_kien_ve)s, %(ma_loai_gia_cong)s, %(yeu_cau_ky_thuat)s,
            %(bat_kha_thi)s, %(can_xac_nhan_kt)s,
            %(trang_thai_dong)s, %(ghi_chu)s, %(nguoi_tao)s
        )
        """,
        data,
    )


def xoa_cac_dong(conn, id_dn: str, nguoi_sua: str) -> None:
    cur = conn.cursor()
    cur.execute(
        """UPDATE yeu_cau_cap_ma SET trang_thai='TU_CHOI',nguoi_sua=%s
           WHERE trang_thai='CHO_CAP' AND id_de_nghi_dong IN (
             SELECT id FROM de_nghi_dong WHERE id_de_nghi=%s AND da_xoa=false)""",
        (nguoi_sua, id_dn),
    )
    cur.execute(
        """UPDATE de_nghi_dong
           SET da_xoa=true,trang_thai_dong='HUY',nguoi_sua=%s
           WHERE id_de_nghi=%s AND da_xoa=false""",
        (nguoi_sua, id_dn),
    )


def cham_de_nghi(conn, id_dn: str, phien_ban: int, nguoi_sua: str) -> dict | None:
    return conn.execute(
        """UPDATE de_nghi SET nguoi_sua=%s
           WHERE id=%s AND phien_ban=%s RETURNING *""",
        (nguoi_sua, id_dn, phien_ban),
    ).fetchone()


def cap_nhat_sla_dong(conn, id_dong: str, muc_do_uu_tien, ngay_du_kien_ve, bat_kha_thi: bool) -> None:
    conn.execute(
        """UPDATE de_nghi_dong
           SET muc_do_uu_tien=%s,ngay_du_kien_ve=%s,bat_kha_thi=%s
           WHERE id=%s""",
        (muc_do_uu_tien, ngay_du_kien_ve, bat_kha_thi, id_dong),
    )


def tao_yeu_cau_cap_ma(conn, dong: dict, nguoi_tao: str) -> None:
    id_yc = f"YCM-{uuid.uuid4().hex[:18].upper()}"
    conn.execute(
        """INSERT INTO yeu_cau_cap_ma(
             id,id_de_nghi_dong,ten_de_xuat,quy_cach,dvt_de_xuat,ma_chung_loai,
             ghi_chu,nguoi_yeu_cau,trang_thai,nguoi_tao
           ) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,'CHO_CAP',%s)""",
        (id_yc, dong["id"], dong["ten_hang_chup"], dong.get("quy_cach"),
         dong["dvt_chup"], dong.get("ma_chung_loai"), dong.get("ghi_chu"),
         nguoi_tao, nguoi_tao),
    )


def bat_dau_idempotency(conn, tai_khoan: str, khoa: str, duong_dan: str):
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
        raise ValueError("Khóa chống trùng đã được dùng cho yêu cầu khác.")
    return row["ket_qua"]


def hoan_tat_idempotency(conn, tai_khoan: str, khoa: str, ket_qua: dict) -> None:
    conn.execute(
        "UPDATE thao_tac_da_xu_ly SET ket_qua=%s WHERE ma_tai_khoan=%s AND khoa=%s",
        (Jsonb(ket_qua, dumps=lambda value: json.dumps(value, default=str)), tai_khoan, khoa),
    )


def cap_nhat_de_nghi(conn, id_dn: str, phien_ban: int, truong_cap_nhat: dict) -> dict | None:
    if not truong_cap_nhat:
        return lay_de_nghi(conn, id_dn)
    set_clauses = [f"{k} = %({k})s" for k in truong_cap_nhat]
    sql = f"""
        UPDATE de_nghi
        SET {', '.join(set_clauses)}
        WHERE id = %(id_dn)s AND phien_ban = %(phien_ban)s
        RETURNING *
    """
    params = {**truong_cap_nhat, "id_dn": id_dn, "phien_ban": phien_ban}
    cur = conn.cursor()
    cur.execute(sql, params)
    return cur.fetchone()


def danh_sach_de_nghi(
    conn,
    bo_loc: dict,
    pham_vi: str,
    ho_so: dict,
    offset: int = 0,
    limit: int = 50,
) -> tuple[list[dict], int]:
    cur = conn.cursor()
    where = ["1=1"]
    params = []

    # 1. Phân quyền phạm vi
    if pham_vi == "ca_nhan":
        cot_ca_nhan = "dn.nguoi_mua_hang" if ho_so.get("vai_tro") == "NV_MUA_HANG" else "dn.nguoi_yeu_cau"
        where.append(f"{cot_ca_nhan} = %s")
        params.append(ho_so["ma_nhan_vien"])
    elif pham_vi == "bo_phan":
        where.append("dn.ma_bo_phan = %s")
        params.append(ho_so["ma_bo_phan"])

    # 2. Các bộ lọc
    if bo_loc.get("tu_ngay"):
        where.append("dn.ngay_hieu_luc >= %s")
        params.append(bo_loc["tu_ngay"])
    if bo_loc.get("den_ngay"):
        where.append("dn.ngay_hieu_luc <= %s")
        params.append(bo_loc["den_ngay"])
    if bo_loc.get("trang_thai"):
        where.append("dn.trang_thai = %s")
        params.append(bo_loc["trang_thai"])
    if bo_loc.get("ma_bo_phan"):
        where.append("dn.ma_bo_phan = %s")
        params.append(bo_loc["ma_bo_phan"])
    if bo_loc.get("loai"):
        where.append("dn.loai = %s")
        params.append(bo_loc["loai"])
    if bo_loc.get("nguoi_yeu_cau"):
        where.append("dn.nguoi_yeu_cau = %s")
        params.append(bo_loc["nguoi_yeu_cau"])

    # Lọc trễ hạn (có dòng nào ky_han_yc < CURRENT_DATE mà chưa hoàn thành)
    if bo_loc.get("chi_tre_han"):
        where.append(
            """EXISTS (
                SELECT 1 FROM de_nghi_dong d
                WHERE d.id_de_nghi = dn.id AND d.da_xoa = false
                  AND d.ky_han_yc < CURRENT_DATE
                  AND d.trang_thai_dong NOT IN ('HOAN_THANH', 'HUY')
            )"""
        )

    # Lọc bất khả thi
    if bo_loc.get("chi_bat_kha_thi"):
        where.append(
            """EXISTS (
                SELECT 1 FROM de_nghi_dong d
                WHERE d.id_de_nghi = dn.id AND d.da_xoa = false AND d.bat_kha_thi = true
            )"""
        )

    # Từ khóa tìm kiếm (khớp id, mã LSX, mã vạch hoặc tên hàng trong dòng)
    if bo_loc.get("tu_khoa"):
        tk = bo_loc["tu_khoa"].strip()
        where.append(
            """(
                dn.id ILIKE %s
                OR dn.so_phieu_cu ILIKE %s
                OR EXISTS (
                    SELECT 1 FROM de_nghi_dong d
                    WHERE d.id_de_nghi = dn.id AND d.da_xoa = false
                      AND (
                        d.ten_hang_chup ILIKE %s
                        OR d.lenh_san_xuat ILIKE %s
                        OR d.ma_vach ILIKE %s
                      )
                )
            )"""
        )
        like_tk = f"%{tk}%"
        params.extend([like_tk, like_tk, like_tk, like_tk, like_tk])

    where_str = " AND ".join(where)

    # Đếm tổng
    cur.execute(f"SELECT count(*) AS n FROM de_nghi dn WHERE {where_str}", tuple(params))
    tong = cur.fetchone()["n"]

    # Truy vấn dữ liệu kèm số dòng và cờ cảnh báo
    sql = f"""
        SELECT dn.*, bp.ten AS ten_bo_phan, nv.ho_va_ten AS ten_nguoi_yeu_cau,
               (SELECT count(*) FROM de_nghi_dong d WHERE d.id_de_nghi = dn.id AND d.da_xoa=false) AS so_dong,
               EXISTS (SELECT 1 FROM de_nghi_dong d WHERE d.id_de_nghi = dn.id AND d.da_xoa=false AND d.bat_kha_thi = true) AS co_bat_kha_thi
        FROM de_nghi dn
        LEFT JOIN bo_phan bp ON bp.ma_bo_phan = dn.ma_bo_phan
        LEFT JOIN nhan_vien nv ON nv.ma_nhan_vien = dn.nguoi_yeu_cau
        WHERE {where_str}
        ORDER BY dn.ngay_hieu_luc DESC, dn.ngay_tao DESC
        OFFSET %s LIMIT %s
    """
    cur.execute(sql, tuple(params + [offset, limit]))
    items = cur.fetchall()

    return items, tong


def thong_ke_de_nghi(conn, bo_loc: dict, pham_vi: str, ho_so: dict) -> dict:
    cur = conn.cursor()
    where = ["1=1"]
    params = []
    if pham_vi == "ca_nhan":
        cot_ca_nhan = "dn.nguoi_mua_hang" if ho_so.get("vai_tro") == "NV_MUA_HANG" else "dn.nguoi_yeu_cau"
        where.append(f"{cot_ca_nhan} = %s")
        params.append(ho_so["ma_nhan_vien"])
    elif pham_vi == "bo_phan":
        where.append("dn.ma_bo_phan = %s")
        params.append(ho_so["ma_bo_phan"])

    for ten, bieu_thuc in (
        ("tu_ngay", "dn.ngay_hieu_luc >= %s"), ("den_ngay", "dn.ngay_hieu_luc <= %s"),
        ("trang_thai", "dn.trang_thai = %s"), ("ma_bo_phan", "dn.ma_bo_phan = %s"),
        ("loai", "dn.loai = %s"), ("nguoi_yeu_cau", "dn.nguoi_yeu_cau = %s"),
    ):
        if bo_loc.get(ten):
            where.append(bieu_thuc)
            params.append(bo_loc[ten])
    if bo_loc.get("chi_tre_han"):
        where.append("""EXISTS (SELECT 1 FROM de_nghi_dong d WHERE d.id_de_nghi=dn.id
                      AND d.da_xoa=false AND d.ky_han_yc<CURRENT_DATE
                      AND d.trang_thai_dong NOT IN ('HOAN_THANH','HUY'))""")
    if bo_loc.get("chi_bat_kha_thi"):
        where.append("""EXISTS (SELECT 1 FROM de_nghi_dong d WHERE d.id_de_nghi=dn.id
                      AND d.da_xoa=false AND d.bat_kha_thi=true)""")
    if bo_loc.get("tu_khoa"):
        tk = f"%{bo_loc['tu_khoa'].strip()}%"
        where.append("""(dn.id ILIKE %s OR dn.so_phieu_cu ILIKE %s OR EXISTS (
          SELECT 1 FROM de_nghi_dong d WHERE d.id_de_nghi=dn.id AND d.da_xoa=false
          AND (d.ten_hang_chup ILIKE %s OR d.lenh_san_xuat ILIKE %s OR d.ma_vach ILIKE %s)))""")
        params.extend([tk, tk, tk, tk, tk])

    where_str = " AND ".join(where)
    sql = f"""
        SELECT
            count(*) AS tong,
            count(*) FILTER (WHERE dn.trang_thai = 'CHO_DUYET') AS cho_duyet,
            count(*) FILTER (WHERE dn.trang_thai = 'TRA_LAI') AS tra_lai,
            count(*) FILTER (WHERE dn.trang_thai = 'CHO_KY_BU') AS cho_ky_bu,
            count(*) FILTER (WHERE dn.trang_thai <> 'HUY' AND EXISTS (
              SELECT 1 FROM de_nghi_dong d WHERE d.id_de_nghi=dn.id
              AND d.da_xoa=false AND d.trang_thai_dong='CHO_CAP_MA')) AS cho_cap_ma,
            count(*) FILTER (WHERE dn.trang_thai <> 'HUY' AND EXISTS (
              SELECT 1 FROM de_nghi_dong d WHERE d.id_de_nghi=dn.id
              AND d.da_xoa=false AND d.bat_kha_thi=true)) AS bat_kha_thi
        FROM de_nghi dn
        WHERE {where_str}
    """
    cur.execute(sql, tuple(params))
    return cur.fetchone()


def hang_doi_cho_duyet(conn, ho_so: dict, pham_vi: str, offset: int = 0, limit: int = 50) -> tuple[list[dict], int]:
    cur = conn.cursor()
    where = ["dn.trang_thai = 'CHO_DUYET'"]
    params = []

    if pham_vi == "bo_phan":
        where.append("dn.ma_bo_phan = %s")
        params.append(ho_so["ma_bo_phan"])
    elif pham_vi == "ca_nhan":
        # Vai trò chỉ duyệt cá nhân thực tế không duyệt được người khác
        where.append("dn.nguoi_yeu_cau = %s")
        params.append(ho_so["ma_nhan_vien"])
    if ho_so.get("vai_tro") == "BAN_LANH_DAO":
        where.append("dn.can_bld_duyet=true AND dn.nguoi_duyet_bp IS NOT NULL AND dn.nguoi_duyet_bld IS NULL")

    where_str = " AND ".join(where)
    cur.execute(f"SELECT count(*) AS n FROM de_nghi dn WHERE {where_str}", tuple(params))
    tong = cur.fetchone()["n"]

    sql = f"""
        SELECT dn.*, bp.ten AS ten_bo_phan, nv.ho_va_ten AS ten_nguoi_yeu_cau,
               (SELECT count(*) FROM de_nghi_dong d WHERE d.id_de_nghi = dn.id AND d.da_xoa=false) AS so_dong,
               EXISTS (SELECT 1 FROM de_nghi_dong d WHERE d.id_de_nghi = dn.id AND d.da_xoa=false AND d.bat_kha_thi = true) AS co_bat_kha_thi
        FROM de_nghi dn
        LEFT JOIN bo_phan bp ON bp.ma_bo_phan = dn.ma_bo_phan
        LEFT JOIN nhan_vien nv ON nv.ma_nhan_vien = dn.nguoi_yeu_cau
        WHERE {where_str}
        ORDER BY dn.ngay_hieu_luc ASC, dn.ngay_tao ASC
        OFFSET %s LIMIT %s
    """
    cur.execute(sql, tuple(params + [offset, limit]))
    return cur.fetchall(), tong


def lay_lich_su_trang_thai(conn, id_dn: str) -> list[dict]:
    cur = conn.cursor()
    cur.execute(
        """
        SELECT ls.*, nv.ho_va_ten AS ten_nguoi_thuc_hien
        FROM lich_su_trang_thai ls
        LEFT JOIN nhan_vien nv ON nv.ma_nhan_vien = ls.nguoi_thuc_hien
        WHERE ls.bang = 'DE_NGHI' AND ls.id_ban_ghi = %s
        ORDER BY ls.thoi_diem ASC
        """,
        (id_dn,),
    )
    return cur.fetchall()
