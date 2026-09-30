"""Kiểm quyền tập trung và quản trị tài khoản."""

from backend.data import auth_repo
from backend.services.errors import KhongCoQuyen, KhongTimThay, ThieuDuLieu, XungDot


def kiem_quyen(ho_so: dict, trang: str, hanh_dong: str, conn=None) -> str:
    cot = {"xem": "duoc_xem", "sua": "duoc_sua", "duyet": "duoc_duyet", "xuat": "duoc_xuat"}
    if hanh_dong not in cot:
        raise ValueError("Hành động quyền không hợp lệ")
    if str(ho_so.get("vai_tro", "")).strip().lower() == "admin":
        return "toan_bo"
    quyen = next((q for q in auth_repo.lay_quyen(
        ho_so["vai_tro"], ho_so.get("ma_bo_phan"), conn
    ) if q["trang"] == trang), None)
    if not quyen or not quyen[cot[hanh_dong]]:
        raise KhongCoQuyen(f"Bạn không có quyền {hanh_dong} ở màn hình này.")
    cot_pham_vi = "pham_vi_xem" if hanh_dong in ("xem", "xuat") else "pham_vi_sua"
    return quyen.get(cot_pham_vi, quyen["pham_vi"])


def danh_sach_tai_khoan(trang: int, kich_thuoc: int, tu_khoa: str = "", trang_thai: str = "") -> dict:
    kich_thuoc = min(max(kich_thuoc, 1), 100)
    trang = max(trang, 1)
    trang_thai = str(trang_thai or "").strip().upper()
    if trang_thai not in ("", "CHO_DUYET", "HOAT_DONG", "KHOA"):
        raise ThieuDuLieu("Trạng thái tài khoản không hợp lệ")
    rows, total = auth_repo.danh_sach_tai_khoan(
        (trang - 1) * kich_thuoc, kich_thuoc, str(tu_khoa or "").strip(), trang_thai
    )
    return {"items": [dict(r) for r in rows], "tong": total, "trang": trang, "kich_thuoc": kich_thuoc}


def danh_sach_vai_tro_va_quyen() -> dict:
    vai_tro_rows, quyen_rows = auth_repo.danh_sach_vai_tro_va_quyen()
    quyen_theo_vai_tro = {}
    for row in quyen_rows:
        quyen_theo_vai_tro.setdefault(row["vai_tro"], []).append(dict(row))
    return {
        "items": [
            {**dict(row), "quyen": quyen_theo_vai_tro.get(row["ma"], [])}
            for row in vai_tro_rows
        ]
    }


def danh_sach_loai_tai_khoan() -> dict:
    loai, bo_phan, _ = auth_repo.danh_sach_loai_tai_khoan_va_bo_phan()
    return {"items": [dict(row) for row in loai], "bo_phan": [dict(row) for row in bo_phan]}


def danh_sach_quyen_loai_tk(ma_loai_tk: str, ma_bo_phan: str) -> dict:
    loai, bo_phan, trang = auth_repo.danh_sach_loai_tai_khoan_va_bo_phan()
    if not any(row["ma"] == ma_loai_tk for row in loai):
        raise KhongTimThay("Loại tài khoản không tồn tại.")
    if not any(row["ma"] == ma_bo_phan for row in bo_phan):
        raise KhongTimThay("Bộ phận không tồn tại.")
    rows = {row["trang"]: dict(row) for row in auth_repo.danh_sach_quyen_loai_tk(ma_loai_tk, ma_bo_phan)}
    return {"items": [rows.get(page, {
        "ma_loai_tk": ma_loai_tk, "ma_bo_phan": ma_bo_phan, "trang": page,
        "duoc_xem": False, "duoc_sua": False, "duoc_duyet": False, "duoc_xuat": False,
        "pham_vi_xem": "ca_nhan", "pham_vi_sua": "ca_nhan", "kieu_sua": "THANG",
        "ma_loai_tk_duyet": None, "phien_ban": 1,
    }) for page in trang]}


def cap_nhat_quyen_loai_tk(ma_loai_tk: str, ma_bo_phan: str, trang: str,
                           phien_ban: int, du_lieu: dict, nguoi_sua: str) -> dict:
    cac_loai, cac_bp, cac_trang = auth_repo.danh_sach_loai_tai_khoan_va_bo_phan()
    if not any(row["ma"] == ma_loai_tk for row in cac_loai):
        raise KhongTimThay("Loại tài khoản không tồn tại.")
    if not any(row["ma"] == ma_bo_phan for row in cac_bp):
        raise KhongTimThay("Bộ phận không tồn tại.")
    if trang not in cac_trang:
        raise KhongTimThay("Màn hình không tồn tại.")
    for key in ("pham_vi_xem", "pham_vi_sua"):
        if du_lieu[key] not in ("toan_bo", "bo_phan", "ca_nhan"):
            raise ThieuDuLieu("Phạm vi quyền không hợp lệ.")
    if du_lieu["kieu_sua"] != "THANG":
        raise ThieuDuLieu("Kiểu sửa không hợp lệ.")
    if du_lieu["duoc_sua"] or du_lieu["duoc_duyet"] or du_lieu["duoc_xuat"]:
        du_lieu["duoc_xem"] = True
    row = auth_repo.cap_nhat_quyen_loai_tk(
        ma_loai_tk, ma_bo_phan, trang, phien_ban, du_lieu, nguoi_sua
    )
    if not row:
        raise XungDot("Quyền vừa được cập nhật. Hãy tải lại rồi thực hiện lại.")
    return dict(row)


def cap_nhat_ma_tran_quyen_loai_tk(ma_loai_tk: str, ma_bo_phan: str,
                                   items: list[dict], nguoi_sua: str) -> dict:
    cac_loai, cac_bp, cac_trang = auth_repo.danh_sach_loai_tai_khoan_va_bo_phan()
    if not any(row["ma"] == ma_loai_tk for row in cac_loai):
        raise KhongTimThay("Loại tài khoản không tồn tại.")
    if not any(row["ma"] == ma_bo_phan for row in cac_bp):
        raise KhongTimThay("Bộ phận không tồn tại.")
    da_gap = set()
    chuan = []
    for item in items:
        trang = item.get("trang")
        if trang not in cac_trang or trang in da_gap:
            raise ThieuDuLieu("Màn hình không hợp lệ hoặc bị lặp trong ma trận quyền.")
        da_gap.add(trang)
        if any(item[key] not in ("toan_bo", "bo_phan", "ca_nhan")
               for key in ("pham_vi_xem", "pham_vi_sua")):
            raise ThieuDuLieu("Phạm vi quyền không hợp lệ.")
        if item["kieu_sua"] != "THANG":
            raise ThieuDuLieu("Kiểu sửa không hợp lệ.")
        ban_ghi = dict(item)
        if ban_ghi["duoc_sua"] or ban_ghi["duoc_duyet"] or ban_ghi["duoc_xuat"]:
            ban_ghi["duoc_xem"] = True
        chuan.append(ban_ghi)
    if da_gap != set(cac_trang):
        raise ThieuDuLieu("Ma trận phải gửi đầy đủ quyền của các màn hình.")
    try:
        ket_qua = auth_repo.cap_nhat_quyen_loai_tk_hang_loat(
            ma_loai_tk, ma_bo_phan, chuan, nguoi_sua
        )
    except auth_repo.XungDotMaTran:
        raise XungDot("Có quyền vừa được cập nhật ở phiên khác. Tải lại ma trận rồi lưu lại.") from None
    return {"items": ket_qua}

def cap_nhat_quyen(vai_tro: str, trang: str, phien_ban: int, du_lieu: dict, nguoi_sua: str) -> dict:
    if du_lieu["pham_vi"] not in ("toan_bo", "bo_phan", "ca_nhan"):
        raise ThieuDuLieu("Phạm vi quyền không hợp lệ")
    if any(du_lieu[key] for key in ("duoc_sua", "duoc_duyet", "duoc_xuat")):
        du_lieu["duoc_xem"] = True
    if vai_tro == "ADMIN" and trang == "quan_tri" and not (
        du_lieu["duoc_xem"] and du_lieu["duoc_sua"]
    ):
        raise KhongCoQuyen("Không thể tắt quyền quản trị cốt lõi của vai trò ADMIN.", "KHONG_THE_TAT_QUYEN_ADMIN")
    row = auth_repo.cap_nhat_quyen(vai_tro, trang, phien_ban, du_lieu, nguoi_sua)
    if not row:
        raise XungDot("Quyền vừa được cập nhật. Hãy tải lại rồi thực hiện lại.")
    return dict(row)


def duyet_tai_khoan(ma: str, vai_tro: str, phien_ban: int, nguoi_duyet: str) -> dict:
    if not auth_repo.vai_tro_ton_tai(vai_tro):
        raise KhongTimThay("Vai trò không tồn tại.", "KHONG_TIM_THAY_VAI_TRO")
    if not auth_repo.cap_nhat_tai_khoan(ma, phien_ban, nguoi_duyet, vai_tro=vai_tro):
        _bao_loi_cap_nhat(ma)
    return {"ma_tai_khoan": ma, "trang_thai": "HOAT_DONG"}


def cap_nhat_thong_tin_tai_khoan(
    ma: str, ma_bo_phan: str, vai_tro: str, phien_ban: int, nguoi_sua: str,
) -> dict:
    if not auth_repo.vai_tro_ton_tai(vai_tro):
        raise KhongTimThay("Chức vụ không tồn tại.", "KHONG_TIM_THAY_VAI_TRO")
    ket_qua = auth_repo.cap_nhat_thong_tin_tai_khoan(
        ma, ma_bo_phan.strip(), vai_tro, phien_ban, nguoi_sua,
    )
    if ket_qua == "BO_PHAN_KHONG_HOP_LE":
        raise KhongTimThay("Bộ phận không tồn tại hoặc đã ngừng hoạt động.", "KHONG_TIM_THAY_BO_PHAN")
    if ket_qua == "KHONG_CO_HO_SO_NHAN_VIEN":
        raise KhongTimThay("Không tìm thấy hồ sơ nhân viên để cập nhật bộ phận.", "KHONG_TIM_THAY_NHAN_VIEN")
    if ket_qua != "OK":
        _bao_loi_cap_nhat(ma)
    return {"ma_tai_khoan": ma, "ma_bo_phan": ma_bo_phan.strip(), "vai_tro": vai_tro,
            "trang_thai": "HOAT_DONG"}


def khoa_tai_khoan(ma: str, phien_ban: int, nguoi_khoa: str, tai_khoan_hien_tai: str) -> None:
    if ma.lower() == tai_khoan_hien_tai.lower():
        raise KhongCoQuyen("Không thể tự khóa tài khoản đang đăng nhập.", "KHONG_THE_TU_KHOA")
    if not auth_repo.cap_nhat_tai_khoan(ma, phien_ban, nguoi_khoa, khoa=True):
        _bao_loi_cap_nhat(ma)


def _bao_loi_cap_nhat(ma: str):
    if not auth_repo.lay_tai_khoan(ma):
        raise KhongTimThay("Không tìm thấy tài khoản.")
    raise XungDot("Tài khoản vừa được cập nhật. Hãy tải lại rồi thực hiện lại.")
