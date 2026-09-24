"""Truy vấn cho luồng Kinh doanh đặt ngoài."""

import logging

from psycopg.types.json import Jsonb

from backend.data.db import get_conn

log = logging.getLogger(__name__)

SQL_UPSERT_LSX = """INSERT INTO lenh_san_xuat(
       lenh_san_xuat,so_po,ma_khach_hang,ten_khach_hang_chup,ma_bo_phan,ten_bo_phan_chup,
       ki_han_khach_hang,muc_do_uu_tien,ngay_nhan_lenh,so_so,ngay_so,
       trang_thai_don,ghi_chu)
   VALUES(%(lenh_san_xuat)s,%(so_po)s,%(ma_khach_hang)s,%(ten_khach_hang_chup)s,
          %(ma_bo_phan)s,%(ten_bo_phan_chup)s,%(ki_han_khach_hang)s,
          %(muc_do_uu_tien)s,coalesce(%(ngay_nhan_lenh)s,current_date),
          %(so_so)s,%(ngay_so)s,coalesce(%(trang_thai_don)s,'DANG_XU_LY'),%(ghi_chu)s)
   ON CONFLICT(lenh_san_xuat) DO UPDATE SET
     so_po=coalesce(excluded.so_po,lenh_san_xuat.so_po),
     ma_khach_hang=coalesce(excluded.ma_khach_hang,lenh_san_xuat.ma_khach_hang),
     ten_khach_hang_chup=coalesce(excluded.ten_khach_hang_chup,lenh_san_xuat.ten_khach_hang_chup),
     ma_bo_phan=coalesce(excluded.ma_bo_phan,lenh_san_xuat.ma_bo_phan),
     ten_bo_phan_chup=coalesce(excluded.ten_bo_phan_chup,lenh_san_xuat.ten_bo_phan_chup),
     ki_han_khach_hang=coalesce(excluded.ki_han_khach_hang,lenh_san_xuat.ki_han_khach_hang),
     muc_do_uu_tien=coalesce(excluded.muc_do_uu_tien,lenh_san_xuat.muc_do_uu_tien),
     ngay_nhan_lenh=coalesce(excluded.ngay_nhan_lenh,lenh_san_xuat.ngay_nhan_lenh),
     so_so=coalesce(excluded.so_so,lenh_san_xuat.so_so),
     ngay_so=coalesce(excluded.ngay_so,lenh_san_xuat.ngay_so),
     trang_thai_don=coalesce(excluded.trang_thai_don,lenh_san_xuat.trang_thai_don),
     ghi_chu=coalesce(excluded.ghi_chu,lenh_san_xuat.ghi_chu)"""

SQL_UPSERT_LSX_DONG = """INSERT INTO lsx_dong(
       ma_vach,lenh_san_xuat,ma_hang,ten_hang,so_luong_po,dvt,
       ma_cong_doan,ma_ban_ve,ghi_chu)
   VALUES(%(ma_vach)s,%(lenh_san_xuat)s,%(ma_hang)s,%(ten_hang)s,
          %(so_luong)s,%(dvt)s,%(ma_cong_doan)s,%(ma_ban_ve)s,%(ghi_chu_dong)s)
   ON CONFLICT(ma_vach) DO UPDATE SET
     lenh_san_xuat=excluded.lenh_san_xuat,ma_hang=excluded.ma_hang,
     ten_hang=excluded.ten_hang,so_luong_po=excluded.so_luong_po,dvt=excluded.dvt,
     ma_cong_doan=coalesce(excluded.ma_cong_doan,lsx_dong.ma_cong_doan),
     ma_ban_ve=coalesce(excluded.ma_ban_ve,lsx_dong.ma_ban_ve),
     ghi_chu=coalesce(excluded.ghi_chu,lsx_dong.ghi_chu)"""


def san_sang(conn) -> bool:
    row = conn.execute(
        """SELECT to_regclass('mua_hang.lenh_san_xuat') AS lsx,
                  to_regclass('mua_hang.lsx_dong') AS dong,
                  to_regclass('mua_hang.dat_ngoai') AS dat_ngoai,
                  to_regclass('mua_hang.dat_ngoai_dong') AS dat_ngoai_dong"""
    ).fetchone()
    return all(row.values())


def nhap_lsx(rows: list[dict]) -> dict:
    with get_conn() as conn:
        if not san_sang(conn):
            return {"san_sang": False, "so_dong": 0, "errors": []}
        # Psycopg pipeline cac lenh trong executemany, tranh 2 lan round-trip cho
        # tung dong Excel. Neu DB gap loi hiem, lui ve che do tung dong de van
        # tra dung danh sach dong loi cho nguoi dung.
        try:
            with conn.transaction():
                with conn.cursor() as cur:
                    cur.executemany(SQL_UPSERT_LSX, rows)
                    cur.executemany(SQL_UPSERT_LSX_DONG, rows)
            return {"san_sang": True, "so_dong": len(rows), "errors": []}
        except Exception:
            log.exception("Nap nhanh LSX that bai; chuyen sang kiem tra tung dong")

        errors = []
        for stt, row in enumerate(rows, 1):
            try:
                with conn.transaction():
                    conn.execute(SQL_UPSERT_LSX, row)
                    conn.execute(SQL_UPSERT_LSX_DONG, row)
            except Exception:
                dong = row.get("_dong", stt)
                log.exception("Không nạp được dòng LSX %s (%s)", dong, row.get("ma_vach"))
                errors.append({
                    "dong": dong,
                    "ma": row.get("ma_vach") or "",
                    "loi": "Không lưu được dòng vào cơ sở dữ liệu.",
                })
        return {"san_sang": True, "so_dong": len(rows) - len(errors), "errors": errors}


def danh_sach_lsx(tu_khoa: str = "") -> list[dict]:
    with get_conn() as conn:
        if not san_sang(conn):
            return []
        mau = f"%{tu_khoa}%"
        return conn.execute(
            """SELECT l.lenh_san_xuat,l.so_po,l.ma_khach_hang,l.ten_khach_hang_chup,
                      l.ma_bo_phan,l.ten_bo_phan_chup,l.ki_han_khach_hang,l.muc_do_uu_tien,l.ngay_nhan_lenh,
                      l.so_so,l.ngay_so,l.trang_thai_don,l.ghi_chu,
                      d.ma_vach,d.ma_hang,d.ten_hang,d.so_luong_po,d.dvt,
                      d.ma_cong_doan,d.ma_ban_ve,d.ghi_chu AS ghi_chu_dong,
                      EXISTS(SELECT 1 FROM dat_ngoai_dong dd JOIN dat_ngoai dn ON dn.id=dd.id_dat_ngoai
                             WHERE dd.ma_vach=d.ma_vach AND dn.trang_thai <> 'HUY') AS da_lap_bao_gia
               FROM lenh_san_xuat l
               LEFT JOIN lsx_dong d ON d.lenh_san_xuat=l.lenh_san_xuat
               WHERE %s='' OR lower(concat_ws(' ',l.lenh_san_xuat,l.so_po,l.ma_khach_hang,
                     d.ma_vach,d.ma_hang,d.ten_hang)) LIKE %s
               ORDER BY l.ngay_nhan_lenh DESC NULLS LAST,l.lenh_san_xuat,d.ma_hang,d.ma_vach""",
            (tu_khoa, mau),
        ).fetchall()


def lay_dong_lsx(conn, ma_vach: list[str]) -> list[dict]:
    return conn.execute(
        """SELECT d.*,l.lenh_san_xuat,
                  EXISTS(SELECT 1 FROM dat_ngoai_dong dd JOIN dat_ngoai dn ON dn.id=dd.id_dat_ngoai
                         WHERE dd.ma_vach=d.ma_vach AND dn.trang_thai <> 'HUY') AS da_lap_bao_gia
           FROM lsx_dong d
           JOIN lenh_san_xuat l ON l.lenh_san_xuat=d.lenh_san_xuat
           WHERE d.ma_vach=ANY(%s) ORDER BY l.lenh_san_xuat,d.ma_hang""",
        (ma_vach,),
    ).fetchall()


def tao_dat_ngoai(ds_phieu: list[dict], nguoi_tao: str) -> list[dict]:
    with get_conn() as conn:
        ket_qua = []
        for phieu in ds_phieu:
            row = conn.execute(
                """INSERT INTO dat_ngoai(
                       id,lenh_san_xuat,nguoi_lap,ngay_lap,trang_thai,ghi_chu,nguoi_tao,
                       can_xac_nhan_ky_thuat,noi_dung_ky_thuat)
                   VALUES(%s,%s,%s,current_date,%s,%s,%s,%s,%s) RETURNING *""",
                (phieu["id"], phieu["lenh_san_xuat"], nguoi_tao, phieu["trang_thai"],
                 phieu.get("ghi_chu"), nguoi_tao, phieu["can_xac_nhan_ky_thuat"],
                 phieu.get("noi_dung_ky_thuat")),
            ).fetchone()
            for stt, dong in enumerate(phieu["dong"], 1):
                conn.execute(
                    """INSERT INTO dat_ngoai_dong(
                           id,id_dat_ngoai,stt_dong,ma_vach,ma_hang,ten_hang_chup,dvt_chup,
                           so_luong,trang_thai_dong,nguoi_tao)
                       VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                    (dong["id"], phieu["id"], stt, dong["ma_vach"], dong["ma_hang"],
                     dong["ten_hang"], dong["dvt"], dong["so_luong_po"],
                     phieu["trang_thai"], nguoi_tao),
                )
            conn.execute(
                """INSERT INTO dat_ngoai_lich_su(
                       id_dat_ngoai,trang_thai_cu,trang_thai_moi,noi_dung,nguoi_thuc_hien)
                   VALUES(%s,NULL,%s,%s,%s)""",
                (phieu["id"], phieu["trang_thai"], 'Khởi tạo từ LSX', nguoi_tao),
            )
            ket_qua.append(dict(row))
        return ket_qua


def danh_sach_dat_ngoai() -> list[dict]:
    with get_conn() as conn:
        if not san_sang(conn):
            return []
        return conn.execute(
            """SELECT dn.*,
                      coalesce(jsonb_agg(jsonb_build_object(
                        'id',dd.id,'ma_vach',dd.ma_vach,'ma_hang',dd.ma_hang,
                        'ten_hang',dd.ten_hang_chup,'dvt',dd.dvt_chup,'so_luong',dd.so_luong,
                        'don_gia',dd.don_gia,'ky_han',dd.ky_han,'ngay_nhan',dd.ngay_nhan,
                        'trang_thai',dd.trang_thai_dong,'ghi_chu',dd.ghi_chu
                      ) ORDER BY dd.stt_dong) FILTER (WHERE dd.id IS NOT NULL),'[]'::jsonb) AS dong,
                      coalesce((
                        SELECT jsonb_agg(jsonb_build_object(
                          'trang_thai_cu',ls.trang_thai_cu,
                          'trang_thai_moi',ls.trang_thai_moi,
                          'noi_dung',ls.noi_dung,
                          'nguoi_thuc_hien',ls.nguoi_thuc_hien,
                          'thoi_diem',ls.thoi_diem
                        ) ORDER BY ls.thoi_diem DESC)
                        FROM dat_ngoai_lich_su ls WHERE ls.id_dat_ngoai=dn.id
                      ),'[]'::jsonb) AS lich_su,
                      coalesce(sum(dd.so_luong*dd.don_gia),0)::bigint AS tong_gia_tri
               FROM dat_ngoai dn LEFT JOIN dat_ngoai_dong dd ON dd.id_dat_ngoai=dn.id
               GROUP BY dn.id ORDER BY dn.ngay_tao DESC,dn.id DESC"""
        ).fetchall()


def lay_dat_ngoai(conn, id_phieu: str, khoa: bool = False):
    sql = "SELECT * FROM dat_ngoai WHERE id=%s"
    if khoa:
        sql += " FOR UPDATE"
    return conn.execute(sql, (id_phieu,)).fetchone()


def cap_nhat_bao_gia(id_phieu: str, phien_ban: int, du_lieu: dict, nguoi_sua: str):
    with get_conn() as conn:
        phieu = lay_dat_ngoai(conn, id_phieu, True)
        if not phieu or phieu["phien_ban"] != phien_ban:
            return None
        for dong in du_lieu["dong"]:
            conn.execute(
                """UPDATE dat_ngoai_dong SET don_gia=%s,ky_han=%s,ghi_chu=%s,
                       trang_thai_dong='CHO_DUYET',ngay_sua=now(),nguoi_sua=%s,phien_ban=phien_ban+1
                   WHERE id=%s AND id_dat_ngoai=%s""",
                (dong["don_gia"], du_lieu.get("ky_han"), dong.get("ghi_chu"),
                 nguoi_sua, dong["id"], id_phieu),
            )
        row = conn.execute(
            """UPDATE dat_ngoai SET ten_ncc_chup=%s,ky_han=%s,ghi_chu=%s,
                      trang_thai='CHO_DUYET',ngay_sua=now(),nguoi_sua=%s,phien_ban=phien_ban+1
               WHERE id=%s RETURNING *""",
            (du_lieu["ten_ncc"], du_lieu.get("ky_han"), du_lieu.get("ghi_chu"), nguoi_sua, id_phieu),
        ).fetchone()
        conn.execute(
            """INSERT INTO dat_ngoai_lich_su(id_dat_ngoai,trang_thai_cu,trang_thai_moi,noi_dung,nguoi_thuc_hien)
               VALUES(%s,%s,'CHO_DUYET',%s,%s)""",
            (id_phieu, phieu["trang_thai"], 'Đã nhập báo giá', nguoi_sua),
        )
        return dict(row)


def chuyen_trang_thai(id_phieu: str, phien_ban: int, trang_thai_moi: str, noi_dung: str | None, nguoi: str):
    with get_conn() as conn:
        phieu = lay_dat_ngoai(conn, id_phieu, True)
        if not phieu or phieu["phien_ban"] != phien_ban:
            return None
        row = conn.execute(
            """UPDATE dat_ngoai SET trang_thai=%s,
                      nguoi_duyet=CASE WHEN %s='DA_DUYET' THEN %s ELSE nguoi_duyet END,
                      ngay_duyet=CASE WHEN %s='DA_DUYET' THEN now() ELSE ngay_duyet END,
                      nguoi_xac_nhan_ky_thuat=CASE WHEN %s='DANG_BAO_GIA' AND can_xac_nhan_ky_thuat THEN %s ELSE nguoi_xac_nhan_ky_thuat END,
                      xac_nhan_ky_thuat_luc=CASE WHEN %s='DANG_BAO_GIA' AND can_xac_nhan_ky_thuat THEN now() ELSE xac_nhan_ky_thuat_luc END,
                      ngay_dat=CASE WHEN %s='DA_DAT' THEN now() ELSE ngay_dat END,
                      ngay_nhan=CASE WHEN %s='DA_NHAN' THEN now() ELSE ngay_nhan END,
                      ngay_hoan_thanh=CASE WHEN %s='HOAN_THANH' THEN now() ELSE ngay_hoan_thanh END,
                      ly_do_huy=CASE WHEN %s='HUY' THEN %s ELSE ly_do_huy END,
                      ngay_sua=now(),nguoi_sua=%s,phien_ban=phien_ban+1
               WHERE id=%s RETURNING *""",
            (trang_thai_moi, trang_thai_moi, nguoi, trang_thai_moi,
             trang_thai_moi, nguoi, trang_thai_moi, trang_thai_moi,
             trang_thai_moi, trang_thai_moi, trang_thai_moi, noi_dung,
             nguoi, id_phieu),
        ).fetchone()
        conn.execute(
            "UPDATE dat_ngoai_dong SET trang_thai_dong=%s,ngay_sua=now(),nguoi_sua=%s WHERE id_dat_ngoai=%s",
            (trang_thai_moi, nguoi, id_phieu),
        )
        conn.execute(
            """INSERT INTO dat_ngoai_lich_su(id_dat_ngoai,trang_thai_cu,trang_thai_moi,noi_dung,nguoi_thuc_hien)
               VALUES(%s,%s,%s,%s,%s)""",
            (id_phieu, phieu["trang_thai"], trang_thai_moi, noi_dung, nguoi),
        )
        return dict(row)
