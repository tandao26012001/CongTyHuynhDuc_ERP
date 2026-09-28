"""Nhập NCC theo lô, trả kết quả riêng từng dòng và chống gửi trùng."""
from psycopg.errors import CheckViolation, ForeignKeyViolation, NotNullViolation, UniqueViolation

from backend.data import catalog_repo as repo
from backend.services import catalog_service as catalog
from backend.services.errors import LoiNghiepVu, ThieuDuLieu, XungDot

PATH = "POST:/api/v1/nha-cung-cap/nhap-hang-loat"


def nhap(rows, nguoi_tao, tai_khoan, khoa, xac_nhan_trung=False):
    if not 1 <= len(rows) <= 500:
        raise ThieuDuLieu("Mỗi lần nhập từ 1 đến 500 nhà cung cấp.")
    with repo.get_conn() as conn:
        try:
            cu = repo._bat_dau_idempotency(conn, tai_khoan, khoa, PATH)
        except ValueError:
            raise XungDot("Khóa chống trùng đã dùng cho yêu cầu khác.") from None
        if cu is not None:
            return cu
        results = []
        for dong, raw in enumerate(rows, 1):
            try:
                chuan = catalog._chuan_ncc(raw)
                with conn.transaction():
                    trung = repo.tim_trung_ncc_conn(
                        conn, chuan["ma_ncc"], chuan["ten_khong_dau"], chuan["mst"],
                    )
                    chan, canh_bao = catalog._tach_trung(trung, "nha-cung-cap")
                    if chan:
                        raise XungDot("Mã hoặc mã số thuế nhà cung cấp đã tồn tại.", "NCC_TRUNG_CHINH_XAC")
                    if canh_bao and not xac_nhan_trung:
                        results.append({"dong": dong, "da_luu": False, "can_xac_nhan": True,
                                        "canh_bao_trung": [dict(x) for x in canh_bao]})
                        continue
                    try:
                        repo._tao_nha_cung_cap(conn, chuan, nguoi_tao)
                    except (UniqueViolation, ForeignKeyViolation, CheckViolation, NotNullViolation) as exc:
                        catalog._loi_csdl(exc)
                results.append({"dong": dong, "da_luu": True})
            except LoiNghiepVu as exc:
                results.append({"dong": dong, "da_luu": False, "loi": str(exc), "ma_loi": exc.ma_loi})
        result = {"so_dong": sum(x["da_luu"] for x in results), "results": results}
        repo._hoan_tat_idempotency(conn, tai_khoan, khoa, result)
        return result
