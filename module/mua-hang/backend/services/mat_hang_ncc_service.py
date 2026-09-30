"""Quy tac danh muc mat hang NCC theo v3 F1."""

from backend.data import mat_hang_ncc_repo
from backend.services import catalog_service
from psycopg.errors import CheckViolation, ForeignKeyViolation, UniqueViolation
from backend.services.errors import KhongCoQuyen, KhongTimThay, ThieuDuLieu, XungDot
from backend.services.phan_quyen_service import co_quyen_xem_gia, kiem_quyen


def _la_mua_hang(ho_so: dict) -> bool:
    return ho_so.get("vai_tro") in ("ADMIN", "TBP_MUA_HANG", "NV_MUA_HANG")


def danh_muc_phan_loai(ho_so: dict) -> dict:
    kiem_quyen(ho_so, "ncc", "xem")
    return mat_hang_ncc_repo.danh_muc_phan_loai()


def danh_sach(id_ncc: str | None, tu_khoa: str, trang_thai: str | None, ho_so: dict) -> list[dict]:
    kiem_quyen(ho_so, "ncc", "xem")
    if trang_thai not in (None, "DE_XUAT", "DA_DUYET", "TAM_NGUNG"):
        raise ThieuDuLieu("Trạng thái mặt hàng không hợp lệ.")
    return mat_hang_ncc_repo.danh_sach(id_ncc, tu_khoa.strip(), trang_thai)


def tao(du_lieu: dict, ho_so: dict, khoa: str) -> dict:
    kiem_quyen(ho_so, "ncc", "xem")
    if ho_so.get("vai_tro") == "CHI_XEM":
        raise KhongCoQuyen("Tài khoản chỉ xem không được đề xuất mặt hàng NCC.")
    if du_lieu["loai"] == "HANG_HOA" and not du_lieu.get("nhom_hang_chinh"):
        raise ThieuDuLieu("Mặt hàng hóa phải có nhóm hàng chính.")
    if du_lieu["loai"] == "GIA_CONG" and not du_lieu.get("ma_loai_gia_cong"):
        raise ThieuDuLieu("Mặt hàng gia công phải có loại gia công.")
    if du_lieu["loai"] == "HANG_HOA":
        groups = {item["ma"]: item for item in mat_hang_ncc_repo.danh_muc_phan_loai()["nhom_hang"]}
        main = groups.get(du_lieu["nhom_hang_chinh"])
        if not main or main["ma_cha"]:
            raise ThieuDuLieu("Nhóm hàng chính phải là nhóm gốc trong danh mục chuẩn.")
        detail_code = du_lieu.get("nhom_hang_chi_tiet")
        if detail_code and (detail_code not in groups or groups[detail_code]["ma_cha"] != main["ma"]):
            raise ThieuDuLieu("Nhóm hàng chi tiết phải thuộc nhóm hàng chính đã chọn.")
    ncc = catalog_service.lay_nha_cung_cap(du_lieu["id_ncc"])
    if du_lieu["loai"] == "HANG_HOA" and not ncc.get("la_ncc_mua_hang"):
        raise ThieuDuLieu("NCC này chưa được khai là nhà cung cấp hàng hóa.")
    if du_lieu["loai"] == "GIA_CONG" and not ncc.get("la_ncc_gia_cong"):
        raise ThieuDuLieu("NCC này chưa được khai là nhà cung cấp gia công.")
    du_lieu["trang_thai"] = "DA_DUYET" if _la_mua_hang(ho_so) else "DE_XUAT"
    du_lieu["nguoi_duyet"] = ho_so["ma_nhan_vien"] if _la_mua_hang(ho_so) else None
    try:
        return mat_hang_ncc_repo.tao(
            du_lieu, ho_so["ma_nhan_vien"], ho_so["ma_tai_khoan"], khoa,
        )
    except ForeignKeyViolation as exc:
        raise ThieuDuLieu("Mã phân loại, vật tư hoặc đơn vị tính không tồn tại.",
                          "THAM_CHIEU_KHONG_TON_TAI") from exc
    except CheckViolation as exc:
        raise ThieuDuLieu("Dữ liệu mặt hàng không đúng quy tắc phân loại.",
                          "MAT_HANG_NCC_KHONG_HOP_LE") from exc
    except UniqueViolation as exc:
        raise XungDot("Mặt hàng này đã có trong danh mục của NCC.",
                      "MAT_HANG_NCC_TRUNG") from exc


def duyet(id_mat_hang: str, phien_ban: int, ho_so: dict) -> dict:
    if not _la_mua_hang(ho_so):
        raise KhongCoQuyen("Chỉ bộ phận Mua hàng được duyệt mặt hàng NCC.")
    row = mat_hang_ncc_repo.duyet(id_mat_hang, phien_ban, ho_so["ma_nhan_vien"])
    if not row:
        raise XungDot("Mặt hàng đã thay đổi hoặc không còn chờ duyệt.")
    return row


def lay_dinh_muc(id_ncc: str, ho_so: dict) -> dict:
    kiem_quyen(ho_so, "ncc", "xem")
    row = mat_hang_ncc_repo.lay_dinh_muc(id_ncc)
    if not row:
        raise KhongTimThay("Không tìm thấy nhà cung cấp.")
    limit = row['dinh_muc_thang']
    used = row['da_dat_thang_nay']
    if not _la_mua_hang(ho_so):
        return {**row, 'dinh_muc_thang': None, 'ghi_chu_dinh_muc': None,
                'da_dat_thang_nay': None, 'con_lai': None}
    if not co_quyen_xem_gia(ho_so):
        return {**row, 'dinh_muc_thang': None, 'ghi_chu_dinh_muc': None,
                'da_dat_thang_nay': None, 'con_lai': None}
    return {**row, 'con_lai': max(0, limit - used) if limit is not None else None}


def dat_dinh_muc(id_ncc: str, phien_ban: int, dinh_muc: int | None,
                 ghi_chu: str | None, ho_so: dict) -> dict:
    if ho_so.get("vai_tro") not in ("ADMIN", "TBP_MUA_HANG"):
        raise KhongCoQuyen("Chỉ Trưởng bộ phận Mua hàng được đặt định mức NCC.")
    row = mat_hang_ncc_repo.dat_dinh_muc(
        id_ncc, phien_ban, dinh_muc, ghi_chu, ho_so["ma_nhan_vien"],
    )
    if not row:
        raise XungDot("Nhà cung cấp vừa thay đổi. Hãy tải lại.")
    return lay_dinh_muc(id_ncc, ho_so)


def de_xuat_ncc(du_lieu: dict, ho_so: dict, khoa: str, xac_nhan_trung: bool) -> dict:
    kiem_quyen(ho_so, "ncc", "xem")
    if ho_so.get("vai_tro") == "CHI_XEM":
        raise KhongCoQuyen("Tài khoản chỉ xem không được đề xuất NCC.")
    du_lieu = {**du_lieu, "trang_thai": "TAM_NGUNG", "da_phe_duyet": False,
              "trang_thai_xet_duyet": "DE_XUAT"}
    return catalog_service.tao_nha_cung_cap(
        du_lieu, ho_so["ma_nhan_vien"], ho_so["ma_tai_khoan"], khoa,
        xac_nhan_trung, "POST:/api/v1/nha-cung-cap/de-xuat",
    )


def duyet_de_xuat_ncc(id_ncc: str, phien_ban: int, ho_so: dict) -> dict:
    if not _la_mua_hang(ho_so):
        raise KhongCoQuyen("Chỉ bộ phận Mua hàng được duyệt đề xuất NCC.")
    row = mat_hang_ncc_repo.duyet_de_xuat_ncc(
        id_ncc, phien_ban, ho_so["ma_nhan_vien"],
    )
    if not row:
        raise XungDot("Đề xuất NCC đã thay đổi hoặc không còn chờ duyệt.")
    return row


def danh_gia_den_han(ho_so: dict) -> list[dict]:
    kiem_quyen(ho_so, 'ncc', 'xem')
    return mat_hang_ncc_repo.danh_gia_den_han()


def so_theo_doi_bm08(ho_so: dict) -> list[dict]:
    kiem_quyen(ho_so, 'ncc', 'xem')
    result = []
    for row in mat_hang_ncc_repo.so_theo_doi_bm08():
        raw = (row.get('ket_qua') or '').upper()
        if raw in ('CHAP_NHAN', 'CHẤP NHẬN'):
            conclusion = 'Đạt'
        elif raw in ('DOI_TRA', 'ĐỔI TRẢ', 'KHIEU_NAI', 'KHIẾU NẠI',
                     'GIAM_GIA', 'GIẢM GIÁ'):
            conclusion = 'Không đạt'
        else:
            conclusion = 'Chưa xác định'
        result.append({**row, 'ket_luan_bm08': conclusion})
    return result
