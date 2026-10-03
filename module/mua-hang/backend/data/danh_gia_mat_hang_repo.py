"""Du lieu cham diem BM06 theo mot mat hang cua nha cung cap."""

from backend.data.db import get_conn
from backend.data.catalog_repo import _bat_dau_idempotency, _hoan_tat_idempotency
from backend.services.sinh_ma import sinh_ma
from backend.data.ncc_nhom import dieu_kien_vat_tu


def nguon_diem(id_mat_hang: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            """SELECT m.id, m.id_ncc, m.ten_hang, m.ma_vat_tu, m.trang_thai, m.pham_vi_danh_gia,
                      m.loai,m.nhom_hang_chinh,m.nhom_hang_chi_tiet,
                      m.ma_loai_gia_cong,m.ma_cong_doan,
                      n.ten AS ten_ncc,
                      (SELECT gia_tri FROM tham_so_he_thong
                       WHERE ma='SO_LAN_GIAO_TOI_THIEU_CHAM_TU_DONG') AS so_lan_toi_thieu,
                      (SELECT gia_tri FROM tham_so_he_thong
                       WHERE ma='SO_THANG_HOP_TAC_DIEM_TOI_DA') AS thang_toi_da,
                      (SELECT gia_tri FROM tham_so_he_thong
                       WHERE ma='GIA_TRI_GIAO_DICH_NCC_MUC_5') AS gia_tri_muc_5
               FROM mat_hang_ncc m JOIN nha_cung_cap n ON n.id=m.id_ncc
               WHERE m.id=%s""", (id_mat_hang,),
        ).fetchone()
        if not row:
            return None
        result = dict(row)
        metrics = conn.execute(
            f"""SELECT count(*)::integer AS so_lan_giao,
                      count(k.id) FILTER (WHERE k.so_luong_kiem>0 AND k.so_luong_dat IS NOT NULL)::integer AS so_lan_iqc,
                      sum(k.so_luong_dat) FILTER (WHERE k.so_luong_kiem>0 AND k.so_luong_dat IS NOT NULL) AS so_luong_iqc_dat,
                      sum(k.so_luong_kiem) FILTER (WHERE k.so_luong_kiem>0 AND k.so_luong_dat IS NOT NULL) AS so_luong_iqc_kiem,
                      count(*) FILTER (WHERE coalesce(d.so_ngay_som_tre,
                        h.ngay_nhan - coalesce(od.ky_han_giao, o.ky_han_giao)) IS NOT NULL)::integer AS so_lan_co_han,
                      count(*) FILTER (WHERE coalesce(d.so_ngay_som_tre,
                        h.ngay_nhan - coalesce(od.ky_han_giao, o.ky_han_giao)) <= 0)::integer AS so_lan_dung_han,
                      min(h.ngay_nhan) AS ngay_giao_dau
               FROM mat_hang_ncc m
               JOIN nhan_hang h ON h.id_ncc=m.id_ncc
               JOIN nhan_hang_dong d ON d.id_nhan_hang=h.id
               LEFT JOIN don_hang_dong od ON od.id=d.id_don_hang_dong
               LEFT JOIN don_hang o ON o.id=coalesce(od.id_don_hang,h.id_don_hang)
               LEFT JOIN ket_qua_iqc k ON k.id_nhan_hang_dong=d.id
               LEFT JOIN vat_tu v ON v.id=d.id_vat_tu
               WHERE m.id=%s AND {dieu_kien_vat_tu()}""",
            (id_mat_hang,),
        ).fetchone()
        result.update(dict(metrics))
        value = conn.execute(
            f"""SELECT sum(od.don_gia_co_so *
                        CASE WHEN od.don_vi_gia='PCS' THEN od.so_luong
                             ELSE od.trong_luong END) AS gia_tri_12_thang
               FROM mat_hang_ncc m
               JOIN don_hang o ON o.id_ncc=m.id_ncc
               JOIN don_hang_dong od ON o.id=od.id_don_hang
               JOIN vat_tu v ON v.id=od.id_vat_tu
               WHERE m.id=%s AND {dieu_kien_vat_tu()}
                 AND o.ngay_dat >= current_date - interval '12 months'
                 AND o.trang_thai NOT IN ('HUY','NHAP')""",
            (id_mat_hang,),
        ).fetchone()
        result.update(dict(value))
        return result


def danh_sach(id_mat_hang: str) -> list[dict]:
    with get_conn() as conn:
        return [dict(r) for r in conn.execute(
            """SELECT id,id_mat_hang_ncc,loai,ngay_danh_gia,nguoi_danh_gia,
                      diem_chat_luong,diem_giao_hang,diem_gia_ca,diem_tam_voc,
                      diem_thanh_toan,diem_dich_vu,diem_thoi_gian_hop_tac,
                      diem_gia_tri_giao_dich,diem_tong,trong_so_du_lieu,xep_loai,
                      trang_thai_duyet,nguoi_duyet,ngay_duyet,ghi_chu,phien_ban
               FROM danh_gia_ncc WHERE id_mat_hang_ncc=%s
               ORDER BY ngay_danh_gia DESC,ngay_tao DESC LIMIT 100""",
            (id_mat_hang,),
        )]


def tao(du_lieu: dict, nguoi: str, tai_khoan: str, khoa: str) -> dict:
    with get_conn() as conn:
        cu = _bat_dau_idempotency(conn, tai_khoan, khoa, 'POST:/api/v1/mat-hang-ncc/danh-gia')
        if cu is not None:
            return cu
        # Serialize assessment creation per group, including schemas whose
        # historical unique index uses a different approval-status column.
        conn.execute('SELECT id FROM mat_hang_ncc WHERE id=%s FOR UPDATE',
                     (du_lieu['id_mat_hang_ncc'],)).fetchone()
        pending = conn.execute(
            "SELECT id FROM danh_gia_ncc WHERE id_mat_hang_ncc=%s "
            "AND trang_thai_duyet='CHO_DUYET' LIMIT 1",
            (du_lieu['id_mat_hang_ncc'],),
        ).fetchone()
        if pending:
            from backend.services.errors import XungDot
            raise XungDot('Mặt hàng này còn một bảng điểm chờ duyệt.')
        row = conn.execute(
            """INSERT INTO danh_gia_ncc (
                 id,id_ncc,id_mat_hang_ncc,loai,ngay_danh_gia,nguoi_danh_gia,
                 diem_chat_luong,diem_giao_hang,diem_gia_ca,diem_tam_voc,
                 diem_thanh_toan,diem_dich_vu,diem_thoi_gian_hop_tac,
                 diem_gia_tri_giao_dich,diem_tong,trong_so_du_lieu,xep_loai,
                 ty_le_dung_han,ty_le_iqc_dat,ghi_chu,nguoi_tao)
               VALUES (%s,%s,%s,'DINH_KY',current_date,%s,%s,%s,%s,%s,%s,%s,
                       %s,%s,%s,%s,%s,%s,%s,%s,%s)
               RETURNING *""",
            (sinh_ma(conn, 'DGN'), du_lieu['id_ncc'], du_lieu['id_mat_hang_ncc'], nguoi,
             du_lieu.get('diem_chat_luong'), du_lieu.get('diem_giao_hang'),
             du_lieu['diem_gia_ca'], du_lieu['diem_tam_voc'],
             du_lieu['diem_thanh_toan'], du_lieu['diem_dich_vu'],
             du_lieu.get('diem_thoi_gian_hop_tac'),
             du_lieu.get('diem_gia_tri_giao_dich'), du_lieu['diem_tong'],
             du_lieu['trong_so_du_lieu'], du_lieu['xep_loai'],
             du_lieu.get('ty_le_dung_han'), du_lieu.get('ty_le_iqc_dat'),
             du_lieu.get('ghi_chu'), nguoi),
        ).fetchone()
        result = dict(row)
        _hoan_tat_idempotency(conn, tai_khoan, khoa, result)
        return result


def duyet(id_danh_gia: str, phien_ban: int, nguoi: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            """UPDATE danh_gia_ncc SET trang_thai_duyet='DA_DUYET',
                      nguoi_duyet=%s,ngay_duyet=now(),ngay_sua=now(),
                      nguoi_sua=%s,phien_ban=phien_ban+1
               WHERE id=%s AND phien_ban=%s AND trang_thai_duyet='CHO_DUYET'
               RETURNING *""", (nguoi, nguoi, id_danh_gia, phien_ban),
        ).fetchone()
        return dict(row) if row else None
