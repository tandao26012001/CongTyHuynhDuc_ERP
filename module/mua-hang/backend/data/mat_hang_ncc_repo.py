"""Truy cap bang mat hang cua nha cung cap (F1)."""

from backend.data.db import get_conn
from backend.data.catalog_repo import _bat_dau_idempotency, _hoan_tat_idempotency
from backend.services.sinh_ma import sinh_ma
from backend.data.mat_hang_ncc_edit_repo import ghi


def danh_muc_phan_loai() -> dict:
    with get_conn() as conn:
        return {
            "nhom_hang": [dict(r) for r in conn.execute(
                "SELECT ma_chung_loai AS ma,ten,ma_cha FROM chung_loai ORDER BY thu_tu NULLS LAST,ten")],
            "loai_gia_cong": [dict(r) for r in conn.execute(
                "SELECT ma,ten FROM loai_gia_cong ORDER BY ten")],
            "cong_doan": [dict(r) for r in conn.execute(
                "SELECT ma_cong_doan AS ma,ten_cong_doan AS ten FROM cong_doan ORDER BY thu_tu NULLS LAST,ten_cong_doan")],
            "don_vi_tinh": [dict(r) for r in conn.execute(
                "SELECT dvt,ten_dvt FROM don_vi_tinh WHERE trang_thai='HOAT_DONG' ORDER BY ten_dvt")],
        }


def danh_sach(id_ncc: str | None, tu_khoa: str, trang_thai: str | None, filters: dict | None = None) -> list[dict]:
    fields = ('nhom_hang_chinh','nhom_hang_chi_tiet','ma_loai_gia_cong','muc_chat_luong')
    filters = filters or {}
    clauses = ''.join(f' AND (%s::text IS NULL OR m.{key}=%s)' for key in fields)
    params = tuple(value for key in fields for value in (filters.get(key) or None,)*2)
    with get_conn() as conn:
        rows = conn.execute(
            f"""SELECT m.*, n.ten AS ten_ncc, n.ma_ncc
               FROM mat_hang_ncc m JOIN nha_cung_cap n ON n.id=m.id_ncc
               WHERE (%s::text IS NULL OR m.id_ncc=%s)
                 AND (%s='' OR m.ten_hang ILIKE '%%'||%s||'%%' OR n.ten ILIKE '%%'||%s||'%%')
                 AND (%s::text IS NULL OR m.trang_thai=%s)
               {clauses}
               ORDER BY m.ngay_tao DESC, m.id DESC LIMIT 500""",
            (id_ncc, id_ncc, tu_khoa, tu_khoa, tu_khoa, trang_thai, trang_thai) + params,
        ).fetchall()
        return [dict(row) for row in rows]


def tao(du_lieu: dict, nguoi: str, tai_khoan: str, khoa: str) -> dict:
    with get_conn() as conn:
        cu = _bat_dau_idempotency(conn, tai_khoan, khoa, "POST:/api/v1/mat-hang-ncc")
        if cu is not None:
            return cu
        row = conn.execute(
            """INSERT INTO mat_hang_ncc (
                 id,id_ncc,ma_vat_tu,ten_hang,loai,pham_vi_danh_gia,nhom_hang_chinh,nhom_hang_chi_tiet,
                 ma_loai_gia_cong,ma_cong_doan,dvt,thong_so_ky_thuat,diem_ky_thuat,
                 muc_chat_luong,diem_chat_luong,nang_luc_thang,so_ngay_giao_chuan,
                 trang_thai,nguoi_de_xuat,ngay_de_xuat,nguoi_duyet,ngay_duyet,nguoi_tao)
               VALUES (%s,%s,%s,%s,%s,'NHOM_HANG',%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,now(),%s,
                       CASE WHEN %s::text IS NULL THEN NULL ELSE now() END,%s)
               RETURNING *""",
            (sinh_ma(conn, "MHN"), du_lieu["id_ncc"], du_lieu.get("ma_vat_tu"),
             du_lieu["ten_hang"], du_lieu["loai"], du_lieu.get("nhom_hang_chinh"),
             du_lieu.get("nhom_hang_chi_tiet"), du_lieu.get("ma_loai_gia_cong"),
             du_lieu.get("ma_cong_doan"), du_lieu["dvt"], du_lieu.get("thong_so_ky_thuat"),
             du_lieu.get("diem_ky_thuat"), du_lieu.get("muc_chat_luong"),
             du_lieu.get("diem_chat_luong"), du_lieu.get("nang_luc_thang"),
             du_lieu.get("so_ngay_giao_chuan"), du_lieu["trang_thai"], nguoi,
             du_lieu.get("nguoi_duyet"), du_lieu.get("nguoi_duyet"), nguoi),
        ).fetchone()
        result = dict(row)
        ghi(conn, None, result, "TAO", nguoi)
        _hoan_tat_idempotency(conn, tai_khoan, khoa, result)
        return result


def duyet(id_mat_hang: str, phien_ban: int, nguoi: str) -> dict | None:
    with get_conn() as conn:
        old = conn.execute('SELECT * FROM mat_hang_ncc WHERE id=%s FOR UPDATE',(id_mat_hang,)).fetchone()
        row = conn.execute(
            """UPDATE mat_hang_ncc
               SET trang_thai='DA_DUYET',nguoi_duyet=%s,ngay_duyet=now(),
                   ngay_sua=now(),nguoi_sua=%s,phien_ban=phien_ban+1
               WHERE id=%s AND phien_ban=%s AND trang_thai='DE_XUAT'
               RETURNING *""",
            (nguoi, nguoi, id_mat_hang, phien_ban),
        ).fetchone()
        if row:
            ghi(conn, dict(old), dict(row), "DUYET", nguoi)
        return dict(row) if row else None


def lay_dinh_muc(id_ncc: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id,ma_ncc,ten,dinh_muc_thang,ghi_chu_dinh_muc,phien_ban "
            "FROM nha_cung_cap WHERE id=%s", (id_ncc,),
        ).fetchone()
        if not row:
            return None
        totals = conn.execute(
            """SELECT
                 (SELECT coalesce(sum(d.don_gia_co_so *
                      CASE WHEN d.don_vi_gia='PCS' THEN d.so_luong ELSE d.trong_luong END),0)
                  FROM don_hang o JOIN don_hang_dong d ON d.id_don_hang=o.id
                  WHERE o.id_ncc=%s AND o.ngay_dat>=date_trunc('month',current_date)::date
                    AND o.ngay_dat<(date_trunc('month',current_date)+interval '1 month')::date
                    AND o.ngay_duyet IS NOT NULL AND o.trang_thai<>'HUY')
                + (SELECT coalesce(sum(d.so_luong*d.don_gia),0)
                   FROM dat_ngoai o JOIN dat_ngoai_dong d ON d.id_dat_ngoai=o.id
                   WHERE d.id_ncc=%s AND o.ngay_dat>=date_trunc('month',current_date)
                     AND o.ngay_dat<date_trunc('month',current_date)+interval '1 month'
                     AND o.trang_thai<>'HUY')
                 AS da_dat_thang_nay""", (id_ncc, id_ncc),
        ).fetchone()
        return {**dict(row), **dict(totals)}


def dat_dinh_muc(id_ncc: str, phien_ban: int, dinh_muc: int | None,
                 ghi_chu: str | None, nguoi: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            """UPDATE nha_cung_cap
               SET dinh_muc_thang=%s,ghi_chu_dinh_muc=%s,ngay_sua=now(),
                   nguoi_sua=%s,phien_ban=phien_ban+1
               WHERE id=%s AND phien_ban=%s
               RETURNING id,ma_ncc,ten,dinh_muc_thang,ghi_chu_dinh_muc,phien_ban""",
            (dinh_muc, ghi_chu, nguoi, id_ncc, phien_ban),
        ).fetchone()
        return dict(row) if row else None


def duyet_de_xuat_ncc(id_ncc: str, phien_ban: int, nguoi: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            """UPDATE nha_cung_cap
               SET trang_thai='HOAT_DONG',trang_thai_xet_duyet='DA_DUYET',
                   da_phe_duyet=true,ngay_phe_duyet=current_date,
                   nguoi_duyet=%s,ngay_duyet=now(),ngay_sua=now(),
                   nguoi_sua=%s,phien_ban=phien_ban+1
               WHERE id=%s AND phien_ban=%s AND trang_thai_xet_duyet='DE_XUAT'
               RETURNING *""",
            (nguoi, nguoi, id_ncc, phien_ban),
        ).fetchone()
        return dict(row) if row else None


def danh_gia_den_han() -> list[dict]:
    with get_conn() as conn:
        return [dict(r) for r in conn.execute(
            """SELECT m.id,m.id_ncc,n.ten AS ten_ncc,m.ten_hang,m.ma_vat_tu,m.pham_vi_danh_gia,
                      m.nhom_hang_chinh,m.nhom_hang_chi_tiet,m.ma_loai_gia_cong,m.ma_cong_doan,
                      dg.ngay_danh_gia AS ngay_cham_gan_nhat,
                      dg.diem_tong,dg.xep_loai,
                      coalesce((SELECT gia_tri::integer FROM tham_so_he_thong
                                WHERE ma='CHU_KY_DANH_GIA_NCC_THANG'),12) AS chu_ky_thang,
                      CASE WHEN dg.ngay_danh_gia IS NULL THEN NULL
                           ELSE (dg.ngay_danh_gia +
                             make_interval(months=>coalesce((SELECT gia_tri::integer
                               FROM tham_so_he_thong WHERE ma='CHU_KY_DANH_GIA_NCC_THANG'),12)))::date
                      END AS ngay_den_han
               FROM mat_hang_ncc m JOIN nha_cung_cap n ON n.id=m.id_ncc
               LEFT JOIN LATERAL (
                 SELECT ngay_danh_gia,diem_tong,xep_loai FROM danh_gia_ncc
                 WHERE id_mat_hang_ncc=m.id AND trang_thai_duyet='DA_DUYET'
                 ORDER BY ngay_danh_gia DESC,ngay_duyet DESC LIMIT 1
               ) dg ON true
               WHERE m.trang_thai='DA_DUYET'
                 AND (dg.ngay_danh_gia IS NULL OR dg.ngay_danh_gia +
                   make_interval(months=>coalesce((SELECT gia_tri::integer FROM tham_so_he_thong
                     WHERE ma='CHU_KY_DANH_GIA_NCC_THANG'),12)) <= current_date)
               ORDER BY ngay_den_han NULLS FIRST,n.ten,m.ten_hang LIMIT 500"""
        )]


def so_theo_doi_bm08() -> list[dict]:
    with get_conn() as conn:
        return [dict(r) for r in conn.execute(
            """SELECT h.id,h.id_ncc,n.ten AS ten_ncc,r.ngay_nhan,
                      v.ma_vat_tu,d.ten_hang_chup AS ten_hang,
                      h.mo_ta AS van_de,h.huong_xu_ly,h.ket_qua,
                      h.nguoi_giam_sat,h.ngay_dong,h.trang_thai
               FROM hang_khong_phu_hop h
               JOIN ket_qua_iqc k ON k.id=h.id_ket_qua_iqc
               JOIN nhan_hang_dong d ON d.id=k.id_nhan_hang_dong
               JOIN nhan_hang r ON r.id=d.id_nhan_hang
               LEFT JOIN nha_cung_cap n ON n.id=coalesce(h.id_ncc,r.id_ncc)
               LEFT JOIN vat_tu v ON v.id=d.id_vat_tu
               ORDER BY r.ngay_nhan DESC,h.id DESC LIMIT 500"""
        )]
