"""Truy vấn cho luồng Kinh doanh đặt ngoài."""

import logging


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
                       can_xac_nhan_ky_thuat,noi_dung_ky_thuat,f3_yeu_cau_moi,id_ncc,ten_ncc_chup,ky_han)
                   VALUES(%s,%s,%s,current_date,%s,%s,%s,%s,%s,true,%s,%s,%s) RETURNING *""",
                (phieu["id"], phieu["lenh_san_xuat"], nguoi_tao, phieu["trang_thai"],
                 phieu.get("ghi_chu"), nguoi_tao, phieu["can_xac_nhan_ky_thuat"],
                 phieu.get("noi_dung_ky_thuat"), phieu.get("id_ncc"), phieu.get("ten_ncc_chup"), phieu.get("ky_han")),
            ).fetchone()
            for stt, dong in enumerate(phieu["dong"], 1):
                conn.execute(
                    """INSERT INTO dat_ngoai_dong(
                           id,id_dat_ngoai,stt_dong,ma_vach,ma_hang,ten_hang_chup,dvt_chup,
<<<<<<< HEAD
                           so_luong,trang_thai_dong,nguoi_tao,noi_dung_gia_cong,
                           yeu_cau_ky_thuat,yeu_cau_chat_luong,ma_hang_goc,
                           can_xac_nhan_ky_thuat,noi_dung_can_xac_nhan_kt)
                       VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                    (dong["id"], phieu["id"], stt, dong["ma_vach"], dong["ma_hang"],
                     dong["ten_hang"], dong["dvt"], dong["so_luong_po"],
                     phieu["trang_thai"], nguoi_tao, dong['noi_dung_gia_cong'],
                     dong['yeu_cau_ky_thuat'], dong['yeu_cau_chat_luong'], dong['ma_hang'],
                     dong['can_xac_nhan_ky_thuat'], dong['noi_dung_can_xac_nhan_kt']),
=======
                           so_luong,trang_thai_dong,nguoi_tao,noi_dung_gia_cong,yeu_cau_ky_thuat,yeu_cau_chat_luong,ky_han)
                       VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                    (dong["id"], phieu["id"], stt, dong["ma_vach"], dong["ma_hang"],
                     dong["ten_hang"], dong["dvt"], dong["so_luong_po"],
                     phieu["trang_thai"], nguoi_tao, dong.get("noi_dung_gia_cong"),
                     dong.get("yeu_cau_ky_thuat"), dong.get("yeu_cau_chat_luong"), phieu.get("ky_han")),
>>>>>>> 3161f51fb7cd5a9588d7eb1642db7e90454e8fbb
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
                        'can_xac_nhan_ky_thuat',dd.can_xac_nhan_ky_thuat,
                        'noi_dung_can_xac_nhan_kt',dd.noi_dung_can_xac_nhan_kt,
                        'da_xac_nhan_kt',EXISTS (
                          SELECT 1 FROM dat_ngoai_xac_nhan_kt x
                          WHERE x.id_dat_ngoai_dong=dd.id AND x.la_xac_nhan
                        ),
                        'ten_hang',dd.ten_hang_chup,'dvt',dd.dvt_chup,'so_luong',dd.so_luong,
                        'don_gia',dd.don_gia,'ky_han',dd.ky_han,'ngay_nhan',dd.ngay_nhan,
                        'trang_thai',dd.trang_thai_dong,'ghi_chu',dd.ghi_chu,
                        'noi_dung_gia_cong',dd.noi_dung_gia_cong,'yeu_cau_ky_thuat',dd.yeu_cau_ky_thuat,
                        'yeu_cau_chat_luong',dd.yeu_cau_chat_luong,'ma_hang_goc',dd.ma_hang_goc,
                        'ma_hang_thay_the',dd.ma_hang_thay_the,
                        'so_su_co',(SELECT count(*) FROM dat_ngoai_su_co_dong sc WHERE sc.id_dat_ngoai_dong=dd.id),
                        'su_co',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',sc.id,'mo_ta',sc.mo_ta,'loai',sc.loai,'thoi_diem',lk.thoi_diem) ORDER BY lk.thoi_diem DESC),'[]'::jsonb) FROM dat_ngoai_su_co_dong lk JOIN su_co sc ON sc.id=lk.id_su_co WHERE lk.id_dat_ngoai_dong=dd.id),
                        'xac_nhan_ky_thuat',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',x.id,'noi_dung',x.noi_dung,'ket_qua',x.ket_qua,'nguoi_xac_nhan',x.nguoi_xac_nhan,'thoi_diem',x.thoi_diem,'ghi_chu',x.ghi_chu) ORDER BY x.thoi_diem DESC),'[]'::jsonb) FROM dat_ngoai_xac_nhan_ky_thuat x WHERE x.id_dat_ngoai_dong=dd.id),
                        'dot_giao',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',g.id,'lan_giao',g.lan_giao,'ngay_du_kien',g.ngay_du_kien,'so_luong_du_kien',g.so_luong_du_kien,'ngay_thuc_te',g.ngay_thuc_te,'so_luong_thuc_te',g.so_luong_thuc_te,'ghi_chu',g.ghi_chu) ORDER BY g.lan_giao),'[]'::jsonb) FROM dat_ngoai_dot_giao g WHERE g.id_dat_ngoai_dong=dd.id),
                        'lich_su_ky_han',(SELECT coalesce(jsonb_agg(jsonb_build_object('ky_han_cu',h.ky_han_cu,'ky_han_moi',h.ky_han_moi,'ly_do',h.ly_do,'nguoi_sua',h.nguoi_sua,'thoi_diem',h.thoi_diem) ORDER BY h.thoi_diem DESC),'[]'::jsonb) FROM dat_ngoai_lich_su_ky_han h WHERE h.id_dat_ngoai_dong=dd.id)
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
                      coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'noi_dung',t.noi_dung,'nguoi_gui',t.nguoi_gui,'ten_nguoi_gui',nv.ho_va_ten,'thoi_diem',t.thoi_diem) ORDER BY t.thoi_diem) FROM trao_doi t LEFT JOIN nhan_vien nv ON nv.ma_nhan_vien=t.nguoi_gui WHERE t.bang='DAT_NGOAI' AND t.id_ban_ghi=dn.id),'[]'::jsonb) AS trao_doi,
                      coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'ten_tep',t.ten_tep,'kich_thuoc',t.kich_thuoc,'loai_mime',t.loai_mime,'nguoi_tai_len',t.nguoi_tai_len,'thoi_diem',t.thoi_diem) ORDER BY t.thoi_diem) FROM tep_dinh_kem t WHERE t.bang='DAT_NGOAI' AND t.id_ban_ghi=dn.id),'[]'::jsonb) AS tep,
                      coalesce(sum(dd.so_luong*dd.don_gia),0)::bigint AS tong_gia_tri
               FROM dat_ngoai dn LEFT JOIN dat_ngoai_dong dd ON dd.id_dat_ngoai=dn.id
               GROUP BY dn.id ORDER BY dn.ngay_tao DESC,dn.id DESC"""
        ).fetchall()


def lay_dat_ngoai(conn, id_phieu: str, khoa: bool = False):
    sql = "SELECT * FROM dat_ngoai WHERE id=%s"
    if khoa:
        sql += " FOR UPDATE"
    return conn.execute(sql, (id_phieu,)).fetchone()


<<<<<<< HEAD
def dong_chua_xac_nhan_ky_thuat(id_phieu: str) -> list[dict]:
    with get_conn() as conn:
        return [dict(row) for row in conn.execute(
            """SELECT d.id,d.ma_hang FROM dat_ngoai_dong d
               WHERE d.id_dat_ngoai=%s AND d.can_xac_nhan_ky_thuat
                 AND NOT EXISTS (
                   SELECT 1 FROM dat_ngoai_xac_nhan_kt x
                   WHERE x.id_dat_ngoai_dong=d.id AND x.la_xac_nhan
                 ) ORDER BY d.stt_dong""", (id_phieu,),
        )]
=======
def chon_nha_cung_cap(id_phieu: str, phien_ban: int, id_ncc: str, ma_ncc: str, ten_ncc: str, nguoi_sua: str):
    with get_conn() as conn:
        phieu = lay_dat_ngoai(conn, id_phieu, True)
        if not phieu or phieu["trang_thai"] not in ("NHAP", "DANG_BAO_GIA") or phieu["phien_ban"] != phien_ban:
            return None
        row = conn.execute(
            """UPDATE dat_ngoai SET id_ncc=%s,ten_ncc_chup=%s,ngay_sua=now(),nguoi_sua=%s,
                      phien_ban=phien_ban+1 WHERE id=%s AND phien_ban=%s RETURNING *""",
            (id_ncc, ten_ncc, nguoi_sua, id_phieu, phien_ban),
        ).fetchone()
        conn.execute(
            """INSERT INTO dat_ngoai_lich_su(id_dat_ngoai,trang_thai_cu,trang_thai_moi,noi_dung,nguoi_thuc_hien)
               VALUES(%s,%s,%s,%s,%s)""",
            (id_phieu, phieu["trang_thai"], phieu["trang_thai"],
             f"Chọn nhà cung cấp gia công {ma_ncc} - {ten_ncc}", nguoi_sua),
        )
        return dict(row) if row else None
>>>>>>> 3161f51fb7cd5a9588d7eb1642db7e90454e8fbb


def cap_nhat_bao_gia(id_phieu: str, phien_ban: int, du_lieu: dict, nguoi_sua: str):
    with get_conn() as conn:
        phieu = lay_dat_ngoai(conn, id_phieu, True)
        if not phieu or phieu["phien_ban"] != phien_ban or phieu["trang_thai"] != "DANG_BAO_GIA" or not phieu.get("id_ncc"):
            return None
        ids = [dong["id"] for dong in du_lieu["dong"]]
        expected = {dong["id"] for dong in conn.execute(
            "SELECT id FROM dat_ngoai_dong WHERE id_dat_ngoai=%s", (id_phieu,),
        ).fetchall()}
        if not expected or len(ids) != len(set(ids)) or set(ids) != expected:
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
            (phieu["ten_ncc_chup"], du_lieu.get("ky_han"), du_lieu.get("ghi_chu"), nguoi_sua, id_phieu),
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
            "UPDATE dat_ngoai_dong SET trang_thai_dong=%s,ngay_sua=now(),nguoi_sua=%s,phien_ban=phien_ban+1 WHERE id_dat_ngoai=%s",
            (trang_thai_moi, nguoi, id_phieu),
        )
        conn.execute(
            """INSERT INTO dat_ngoai_lich_su(id_dat_ngoai,trang_thai_cu,trang_thai_moi,noi_dung,nguoi_thuc_hien)
               VALUES(%s,%s,%s,%s,%s)""",
            (id_phieu, phieu["trang_thai"], trang_thai_moi, noi_dung, nguoi),
        )
        return dict(row)



def gui_duyet(id_phieu: str, phien_ban: int, nguoi: str):
    with get_conn() as conn:
        p = lay_dat_ngoai(conn, id_phieu, True)
        if not p or p["phien_ban"] != phien_ban or p["trang_thai"] != "NHAP":
            return None
        if p.get("f3_yeu_cau_moi") and conn.execute(
            """SELECT count(*) AS n FROM dat_ngoai_dong WHERE id_dat_ngoai=%s AND
               (nullif(trim(noi_dung_gia_cong),'') IS NULL OR nullif(trim(yeu_cau_ky_thuat),'') IS NULL
                OR nullif(trim(yeu_cau_chat_luong),'') IS NULL)""", (id_phieu,)
        ).fetchone()["n"]:
            return {"thieu_yeu_cau": True}
        row=conn.execute("UPDATE dat_ngoai SET trang_thai='CHO_DUYET',ngay_gui_duyet=now(),ngay_sua=now(),nguoi_sua=%s,phien_ban=phien_ban+1 WHERE id=%s RETURNING *",(nguoi,id_phieu)).fetchone()
        conn.execute("UPDATE dat_ngoai_dong SET trang_thai_dong='CHO_DUYET',phien_ban=phien_ban+1 WHERE id_dat_ngoai=%s",(id_phieu,))
        conn.execute("INSERT INTO dat_ngoai_lich_su(id_dat_ngoai,trang_thai_cu,trang_thai_moi,noi_dung,nguoi_thuc_hien) VALUES(%s,'NHAP','CHO_DUYET','Gửi duyệt phiếu',%s)",(id_phieu,nguoi))
        return dict(row)


def cap_nhat_yeu_cau(id_phieu: str,id_dong: str,data: dict,nguoi: str):
    with get_conn() as conn:
        return conn.execute("""UPDATE dat_ngoai_dong dd SET noi_dung_gia_cong=%s,yeu_cau_ky_thuat=%s,yeu_cau_chat_luong=%s,nguoi_sua=%s,ngay_sua=now(),phien_ban=phien_ban+1 FROM dat_ngoai dn WHERE dd.id=%s AND dd.id_dat_ngoai=%s AND dn.id=dd.id_dat_ngoai AND dn.trang_thai='NHAP' RETURNING dd.*""",(data["noi_dung_gia_cong"],data["yeu_cau_ky_thuat"],data["yeu_cau_chat_luong"],nguoi,id_dong,id_phieu)).fetchone()


def them_xac_nhan_ky_thuat(id_phieu: str,data: dict,nguoi: str):
    with get_conn() as conn:
        if not conn.execute("SELECT 1 FROM dat_ngoai_dong WHERE id=%s AND id_dat_ngoai=%s",(data["id_dat_ngoai_dong"],id_phieu)).fetchone(): return None
        return conn.execute("""INSERT INTO dat_ngoai_xac_nhan_ky_thuat(id,id_dat_ngoai_dong,noi_dung,ket_qua,nguoi_xac_nhan,ghi_chu) VALUES(%s,%s,%s,%s,%s,%s) RETURNING *""",(_ma_repo("XKT"),data["id_dat_ngoai_dong"],data["noi_dung"],data["ket_qua"],nguoi,data.get("ghi_chu"))).fetchone()


def ghi_dot_giao(id_phieu: str,data: dict,nguoi: str):
    with get_conn() as conn:
        dd=conn.execute("SELECT dd.id,dd.ky_han FROM dat_ngoai_dong dd WHERE dd.id=%s AND dd.id_dat_ngoai=%s FOR UPDATE",(data["id_dat_ngoai_dong"],id_phieu)).fetchone()
        if not dd:return None
        old=conn.execute("SELECT * FROM dat_ngoai_dot_giao WHERE id_dat_ngoai_dong=%s AND lan_giao=%s",(dd["id"],data["lan_giao"])).fetchone()
        row=conn.execute("""INSERT INTO dat_ngoai_dot_giao(id,id_dat_ngoai_dong,lan_giao,ngay_du_kien,so_luong_du_kien,ngay_thuc_te,so_luong_thuc_te,ghi_chu,nguoi_tao) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT(id_dat_ngoai_dong,lan_giao) DO UPDATE SET ngay_du_kien=excluded.ngay_du_kien,so_luong_du_kien=excluded.so_luong_du_kien,ngay_thuc_te=excluded.ngay_thuc_te,so_luong_thuc_te=excluded.so_luong_thuc_te,ghi_chu=excluded.ghi_chu RETURNING *""",(_ma_repo("DNGG"),dd["id"],data["lan_giao"],data["ngay_du_kien"],data.get("so_luong_du_kien"),data.get("ngay_thuc_te"),data.get("so_luong_thuc_te"),data.get("ghi_chu"),nguoi)).fetchone()
        if not old or old["ngay_du_kien"]!=data["ngay_du_kien"]:
            conn.execute("INSERT INTO dat_ngoai_lich_su_ky_han(id,id_dat_ngoai_dong,ky_han_cu,ky_han_moi,ly_do,nguoi_sua) VALUES(%s,%s,%s,%s,%s,%s)",(_ma_repo("KH"),dd["id"],old["ngay_du_kien"] if old else dd["ky_han"],data["ngay_du_kien"],data.get("ghi_chu") or "Cập nhật đợt giao",nguoi))
        conn.execute("UPDATE dat_ngoai_dong SET ky_han=%s,ngay_nhan=coalesce(%s,ngay_nhan),ngay_sua=now(),nguoi_sua=%s,phien_ban=phien_ban+1 WHERE id=%s",(data["ngay_du_kien"],data.get("ngay_thuc_te"),nguoi,dd["id"]))
        return row


def gan_su_co(id_phieu: str,id_dong: str,id_su_co: str,nguoi: str):
    with get_conn() as conn:
        if not conn.execute("SELECT 1 FROM dat_ngoai_dong WHERE id=%s AND id_dat_ngoai=%s",(id_dong,id_phieu)).fetchone():return None
        if not conn.execute("SELECT 1 FROM su_co WHERE id=%s",(id_su_co,)).fetchone():return False
        return conn.execute("INSERT INTO dat_ngoai_su_co_dong(id_dat_ngoai_dong,id_su_co,nguoi_gan) VALUES(%s,%s,%s) ON CONFLICT DO NOTHING RETURNING id_su_co",(id_dong,id_su_co,nguoi)).fetchone() or {"id_su_co":id_su_co}


def doi_ma_dong(id_phieu: str,id_dong: str,ma_moi: str,ly_do: str,nguoi: str):
    with get_conn() as conn:
        row=conn.execute("""UPDATE dat_ngoai_dong SET ma_hang_goc=coalesce(ma_hang_goc,ma_hang),ma_hang_thay_the=%s,ma_hang=%s,ghi_chu=concat_ws(E'\n',ghi_chu,%s),thoi_diem_doi_ma=now(),nguoi_doi_ma=%s,ngay_sua=now(),nguoi_sua=%s,phien_ban=phien_ban+1 WHERE id=%s AND id_dat_ngoai=%s RETURNING *""",(ma_moi,ma_moi,"Lý do đổi mã: "+ly_do,nguoi,nguoi,id_dong,id_phieu)).fetchone()
        return row


def _ma_repo(prefix):
    import uuid
    return f"{prefix}-{uuid.uuid4().hex[:18].upper()}"


def them_trao_doi(id_phieu,noi_dung,nguoi):
    with get_conn() as conn:
        return conn.execute("INSERT INTO trao_doi(id,bang,id_ban_ghi,noi_dung,nguoi_gui) VALUES(%s,'DAT_NGOAI',%s,%s,%s) RETURNING *",(_ma_repo("TD"),id_phieu,noi_dung,nguoi)).fetchone()


def them_tep(id_phieu,ten_tep,duong_dan,kich_thuoc,mime,nguoi):
    with get_conn() as conn:
        return conn.execute("INSERT INTO tep_dinh_kem(id,bang,id_ban_ghi,ten_tep,duong_dan,kich_thuoc,loai_mime,nguoi_tai_len) VALUES(%s,'DAT_NGOAI',%s,%s,%s,%s,%s,%s) RETURNING id,ten_tep,kich_thuoc,loai_mime,nguoi_tai_len,thoi_diem",(_ma_repo("TEP"),id_phieu,ten_tep,duong_dan,kich_thuoc,mime,nguoi)).fetchone()


def lay_tep(id_phieu,id_tep):
    with get_conn() as conn:
        return conn.execute("SELECT * FROM tep_dinh_kem WHERE bang='DAT_NGOAI' AND id_ban_ghi=%s AND id=%s",(id_phieu,id_tep)).fetchone()
