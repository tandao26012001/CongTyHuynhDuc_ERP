"""Truy vấn cho luồng Kinh doanh đặt ngoài."""

import logging

from psycopg.types.json import Jsonb

from backend.data.db import get_conn
from backend.data.catalog_repo import _bat_dau_idempotency, _hoan_tat_idempotency

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


def tao_dat_ngoai(ds_phieu: list[dict], nguoi_tao: str,
                  tai_khoan: str, khoa: str) -> list[dict]:
    with get_conn() as conn:
        cu = _bat_dau_idempotency(conn, tai_khoan, khoa, 'POST:/api/v1/dat-ngoai')
        if cu is not None:
            return cu
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
                           so_luong,trang_thai_dong,nguoi_tao,noi_dung_gia_cong,
                           yeu_cau_ky_thuat,yeu_cau_chat_luong,ma_hang_goc,
                           can_xac_nhan_ky_thuat,noi_dung_can_xac_nhan_kt)
                       VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                    (dong["id"], phieu["id"], stt, dong["ma_vach"], dong["ma_hang"],
                     dong["ten_hang"], dong["dvt"], dong["so_luong_po"],
                     phieu["trang_thai"], nguoi_tao, dong['noi_dung_gia_cong'],
                     dong['yeu_cau_ky_thuat'], dong['yeu_cau_chat_luong'], dong['ma_hang'],
                     dong['can_xac_nhan_ky_thuat'], dong['noi_dung_can_xac_nhan_kt']),
                )
                if dong['can_xac_nhan_ky_thuat']:
                    conn.execute(
                        """INSERT INTO dat_ngoai_yeu_cau_kt
                             (id,id_dat_ngoai_dong,noi_dung,nguoi_yeu_cau,la_ban_dau)
                           VALUES ('DNBD-' || substr(md5(%s),1,19),%s,%s,%s,true)""",
                        (dong['id'], dong['id'], dong['noi_dung_can_xac_nhan_kt'], nguoi_tao),
                    )
            conn.execute(
                """INSERT INTO dat_ngoai_lich_su(
                       id_dat_ngoai,trang_thai_cu,trang_thai_moi,noi_dung,nguoi_thuc_hien)
                   VALUES(%s,NULL,%s,%s,%s)""",
                (phieu["id"], phieu["trang_thai"], 'Khởi tạo từ LSX', nguoi_tao),
            )
            ket_qua.append(dict(row))
        _hoan_tat_idempotency(conn, tai_khoan, khoa, ket_qua)
        return ket_qua


def danh_sach_dat_ngoai(conn=None) -> list[dict]:
    if conn is None:
        with get_conn() as own_conn:
            return danh_sach_dat_ngoai(own_conn)
    if not san_sang(conn):
        return []
    return conn.execute(
            """SELECT dn.*,
                      coalesce(jsonb_agg(jsonb_build_object(
                        'id',dd.id,'ma_vach',dd.ma_vach,'ma_hang',dd.ma_hang,
                        'can_xac_nhan_ky_thuat',dd.can_xac_nhan_ky_thuat,
                        'noi_dung_can_xac_nhan_kt',dd.noi_dung_can_xac_nhan_kt,
                        'da_xac_nhan_kt',EXISTS (
                          SELECT 1 FROM dat_ngoai_xac_nhan_kt x
                          JOIN dat_ngoai_yeu_cau_kt y ON y.id=x.id_yeu_cau
                          WHERE x.id_dat_ngoai_dong=dd.id AND x.la_xac_nhan AND y.la_ban_dau
                        ),
                        'so_lan_xac_nhan_kt',(
                          SELECT count(*) FROM dat_ngoai_xac_nhan_kt x
                          WHERE x.id_dat_ngoai_dong=dd.id AND x.la_xac_nhan
                        ),
                        'cho_xac_nhan_kt',EXISTS (
                          SELECT 1 FROM dat_ngoai_yeu_cau_kt y
                          WHERE y.id_dat_ngoai_dong=dd.id
                            AND NOT EXISTS (SELECT 1 FROM dat_ngoai_xac_nhan_kt x
                                            WHERE x.id_yeu_cau=y.id AND x.la_xac_nhan)
                        ),
                        'ten_hang',dd.ten_hang_chup,'dvt',dd.dvt_chup,'so_luong',dd.so_luong,
                        'id_ncc',dd.id_ncc,'ma_ncc_chup',dd.ma_ncc_chup,'ten_ncc_chup',dd.ten_ncc_chup,
                        'don_gia',dd.don_gia,'ky_han',dd.ky_han,'ngay_nhan',dd.ngay_nhan,
                        'trang_thai',dd.trang_thai_dong,'ghi_chu',dd.ghi_chu,
                        'noi_dung_gia_cong',dd.noi_dung_gia_cong,
                        'yeu_cau_ky_thuat',dd.yeu_cau_ky_thuat,
                        'yeu_cau_chat_luong',dd.yeu_cau_chat_luong,
                        'ngay_khach_yeu_cau',dd.ngay_khach_yeu_cau,
                        'ngay_ncc_cam_ket',dd.ngay_ncc_cam_ket,
                        'ngay_du_kien_noi_bo',dd.ngay_du_kien_noi_bo,
                        'ma_hang_goc',dd.ma_hang_goc,
                        'ma_hang_thay_the',dd.ma_hang_thay_the,
                        'id_su_co',dd.id_su_co
                      ) ORDER BY dd.stt_dong) FILTER (WHERE dd.id IS NOT NULL),'[]'::jsonb) AS dong,
                      coalesce((
                        SELECT jsonb_agg(to_jsonb(ls) ORDER BY ls.thoi_diem DESC)
                        FROM (
                          SELECT l.trang_thai_cu,l.trang_thai_moi,l.noi_dung,
                                 l.nguoi_thuc_hien,l.thoi_diem,NULL::varchar AS ma_hang,
                                 'PHIEU'::varchar AS loai
                          FROM dat_ngoai_lich_su l
                          WHERE l.id_dat_ngoai=dn.id
                          UNION ALL
                          SELECT NULL,'CHO_XAC_NHAN_KY_THUAT',
                                 'Yêu cầu kỹ thuật: ' || y.noi_dung,
                                 y.nguoi_yeu_cau,y.thoi_diem,d.ma_hang,'YEU_CAU_KY_THUAT'
                          FROM dat_ngoai_yeu_cau_kt y
                          JOIN dat_ngoai_dong d ON d.id=y.id_dat_ngoai_dong
                          WHERE d.id_dat_ngoai=dn.id
                          UNION ALL
                          SELECT 'CHO_XAC_NHAN_KY_THUAT','DANG_BAO_GIA',
                                 'Đã xác nhận kỹ thuật: ' || x.noi_dung,
                                 x.nguoi_xac_nhan,x.thoi_diem,d.ma_hang,'XAC_NHAN_KY_THUAT'
                          FROM dat_ngoai_xac_nhan_kt x
                          JOIN dat_ngoai_dong d ON d.id=x.id_dat_ngoai_dong
                          WHERE d.id_dat_ngoai=dn.id AND x.la_xac_nhan
                        ) ls
                      ),'[]'::jsonb) AS lich_su,
                      coalesce(sum(dd.so_luong*dd.don_gia),0)::bigint AS tong_gia_tri
                      ,coalesce(string_agg(DISTINCT dd.ten_ncc_chup,', ' ORDER BY dd.ten_ncc_chup)
                                FILTER (WHERE dd.ten_ncc_chup IS NOT NULL),dn.ten_ncc_chup) AS nha_cung_cap_tom_tat
               FROM dat_ngoai dn LEFT JOIN dat_ngoai_dong dd ON dd.id_dat_ngoai=dn.id
               GROUP BY dn.id ORDER BY dn.ngay_tao DESC,dn.id DESC"""
    ).fetchall()


def lay_dat_ngoai(conn, id_phieu: str, khoa: bool = False):
    sql = "SELECT * FROM dat_ngoai WHERE id=%s"
    if khoa:
        sql += " FOR UPDATE"
    return conn.execute(sql, (id_phieu,)).fetchone()


def dong_chua_xac_nhan_ky_thuat(id_phieu: str) -> list[dict]:
    with get_conn() as conn:
        return [dict(row) for row in conn.execute(
            """SELECT d.id,d.ma_hang FROM dat_ngoai_dong d
               WHERE d.id_dat_ngoai=%s AND d.can_xac_nhan_ky_thuat
                 AND NOT EXISTS (
                   SELECT 1 FROM dat_ngoai_yeu_cau_kt y
                   JOIN dat_ngoai_xac_nhan_kt x ON x.id_yeu_cau=y.id AND x.la_xac_nhan
                   WHERE y.id_dat_ngoai_dong=d.id AND y.la_ban_dau
                 ) ORDER BY d.stt_dong""", (id_phieu,),
        )]


def cap_nhat_bao_gia(id_phieu: str, phien_ban: int, du_lieu: dict, nguoi_sua: str):
    with get_conn() as conn:
        phieu = lay_dat_ngoai(conn, id_phieu, True)
        if (not phieu or phieu["phien_ban"] != phien_ban
                or phieu["trang_thai"] not in ("CHO_XAC_NHAN_KY_THUAT", "DANG_BAO_GIA")):
            return None
        ids = [dong["id"] for dong in du_lieu["dong"]]
        expected = {dong["id"] for dong in conn.execute(
            """SELECT d.id FROM dat_ngoai_dong d
               WHERE d.id_dat_ngoai=%s AND d.trang_thai_dong IN ('DANG_BAO_GIA','CHO_DUYET')
                 AND NOT EXISTS (
                   SELECT 1 FROM dat_ngoai_yeu_cau_kt y
                   WHERE y.id_dat_ngoai_dong=d.id
                     AND NOT EXISTS (SELECT 1 FROM dat_ngoai_xac_nhan_kt x
                                     WHERE x.id_yeu_cau=y.id AND x.la_xac_nhan)
                 )""", (id_phieu,),
        ).fetchall()}
        if not expected or not ids or len(ids) != len(set(ids)) or not set(ids).issubset(expected):
            return None
        for dong in du_lieu["dong"]:
            old_line = conn.execute(
                "SELECT ma_hang,trang_thai_dong FROM dat_ngoai_dong WHERE id=%s AND id_dat_ngoai=%s",
                (dong["id"], id_phieu),
            ).fetchone()
            conn.execute(
                """UPDATE dat_ngoai_dong SET id_ncc=%s,ma_ncc_chup=%s,ten_ncc_chup=%s,
                       don_gia=%s,ky_han=%s,ghi_chu=%s,
                       trang_thai_dong='CHO_DUYET',ngay_sua=now(),nguoi_sua=%s,phien_ban=phien_ban+1
                   WHERE id=%s AND id_dat_ngoai=%s""",
                (dong["id_ncc"], dong["ma_ncc"], dong["ten_ncc"], dong["don_gia"],
                 dong.get("ky_han"), dong.get("ghi_chu"), nguoi_sua, dong["id"], id_phieu),
            )
            conn.execute(
                """INSERT INTO dat_ngoai_lich_su
                     (id_dat_ngoai,trang_thai_cu,trang_thai_moi,noi_dung,nguoi_thuc_hien)
                   VALUES(%s,%s,'CHO_DUYET',%s,%s)""",
                (id_phieu, old_line["trang_thai_dong"],
                 f"Mã {old_line['ma_hang']}: đã lưu báo giá cho NCC {dong['ten_ncc']}", nguoi_sua),
            )
        summary = conn.execute(
            """SELECT string_agg(DISTINCT ten_ncc_chup,', ' ORDER BY ten_ncc_chup) AS nha_cung_cap,
                      min(ky_han) AS ky_han,
                      bool_and(id_ncc IS NOT NULL AND don_gia IS NOT NULL) AS da_bao_gia_day_du,
                      EXISTS (
                        SELECT 1 FROM dat_ngoai_yeu_cau_kt y
                        JOIN dat_ngoai_dong d ON d.id=y.id_dat_ngoai_dong
                        WHERE d.id_dat_ngoai=%s
                          AND NOT EXISTS (SELECT 1 FROM dat_ngoai_xac_nhan_kt x
                                          WHERE x.id_yeu_cau=y.id AND x.la_xac_nhan)
                      ) AS con_cho_ky_thuat
               FROM dat_ngoai_dong WHERE id_dat_ngoai=%s""",
            (id_phieu, id_phieu),
        ).fetchone()
        trang_thai = ("CHO_XAC_NHAN_KY_THUAT" if summary["con_cho_ky_thuat"]
                      and phieu["trang_thai"] == "CHO_XAC_NHAN_KY_THUAT"
                      else "CHO_DUYET" if summary["da_bao_gia_day_du"] else "DANG_BAO_GIA")
        row = conn.execute(
            """UPDATE dat_ngoai SET id_ncc=NULL,ten_ncc_chup=%s,ky_han=%s,ghi_chu=%s,
                      trang_thai=%s,ngay_sua=now(),nguoi_sua=%s,phien_ban=phien_ban+1
               WHERE id=%s RETURNING *""",
            (summary["nha_cung_cap"], summary["ky_han"], du_lieu.get("ghi_chu"), trang_thai, nguoi_sua, id_phieu),
        ).fetchone()
        if phieu["trang_thai"] != trang_thai:
            conn.execute(
                """INSERT INTO dat_ngoai_lich_su(id_dat_ngoai,trang_thai_cu,trang_thai_moi,noi_dung,nguoi_thuc_hien)
                   VALUES(%s,%s,%s,%s,%s)""",
                (id_phieu, phieu["trang_thai"], trang_thai,
                 'Tất cả mã hàng đã hoàn tất bước hiện tại.', nguoi_sua),
            )
        return dict(row)


def chuyen_trang_thai(id_phieu: str, phien_ban: int, trang_thai_moi: str, noi_dung: str | None, nguoi: str):
    with get_conn() as conn:
        phieu = lay_dat_ngoai(conn, id_phieu, True)
        if not phieu or phieu["phien_ban"] != phien_ban:
            return None
        if trang_thai_moi == 'HOAN_THANH' and conn.execute(
            """SELECT 1 FROM dat_ngoai_yeu_cau_kt y
               JOIN dat_ngoai_dong d ON d.id=y.id_dat_ngoai_dong
               WHERE d.id_dat_ngoai=%s
                 AND NOT EXISTS (SELECT 1 FROM dat_ngoai_xac_nhan_kt x
                                 WHERE x.id_yeu_cau=y.id AND x.la_xac_nhan)
               LIMIT 1""", (id_phieu,),
        ).fetchone():
            raise ValueError('Còn yêu cầu kỹ thuật chưa được xác nhận.')
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
