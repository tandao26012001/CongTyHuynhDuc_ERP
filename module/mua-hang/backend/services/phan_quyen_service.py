"""Kiểm quyền tập trung và quản trị tài khoản."""

from backend.data import auth_repo
from backend.services.loai_tai_khoan import LOAI_TAI_KHOAN, vai_tro_tuong_thich
from backend.services.errors import KhongCoQuyen, KhongTimThay, ThieuDuLieu, XungDot


def kiem_quyen(ho_so: dict, trang: str, hanh_dong: str, conn=None) -> str:
    cot = {"xem": "duoc_xem", "sua": "duoc_sua", "duyet": "duoc_duyet", "xuat": "duoc_xuat"}
    if hanh_dong not in cot:
        raise ValueError("Hành động quyền không hợp lệ")
    if trang == "quan_tri" and ho_so.get("ma_loai_tk"):
        if ho_so["ma_loai_tk"] == "QUAN_TRI_HE_THONG":
            return "toan_bo"
        raise KhongCoQuyen("Chỉ Quản trị hệ thống được vào màn quản trị.")
    if str(ho_so.get("vai_tro", "")).strip().lower() == "admin":
        return "toan_bo"
    quyen = next((q for q in auth_repo.lay_quyen(
        ho_so["vai_tro"], ho_so.get("ma_bo_phan"), conn
    ) if q["trang"] == trang), None)
    if not quyen or not quyen[cot[hanh_dong]]:
        raise KhongCoQuyen(f"Bạn không có quyền {hanh_dong} ở màn hình này.")
    cot_pham_vi = "pham_vi_xem" if hanh_dong in ("xem", "xuat") else "pham_vi_sua"
    return quyen.get(cot_pham_vi, quyen["pham_vi"])


def co_quyen_xem_gia(ho_so: dict, loai: str = "giao_dich") -> bool:
    if loai not in ("giao_dich", "ncc"):
        raise ValueError("Loai gia khong hop le")
    try:
        kiem_quyen(ho_so, f"gia_{loai}", "xem")
        return True
    except KhongCoQuyen:
        return False


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


<<<<<<< HEAD
def danh_sach_quyen_loai_tk() -> dict:
    loai = auth_repo.danh_sach_loai_tai_khoan()
    rows = auth_repo.danh_sach_quyen_loai_tk()
    so_tai_khoan = {row["ma_loai_tk"]: row["so_tai_khoan"]
                   for row in auth_repo.dem_tai_khoan_theo_loai()}
    quyen = {}
    for row in rows:
        quyen.setdefault(row["ma_loai_tk"], []).append(dict(row))
    return {"items": [{**dict(row), "quyen": quyen.get(row["ma"], []),
                       "so_tai_khoan": so_tai_khoan.get(row["ma"], 0)} for row in loai],
            "san_sang": len(rows) == 119}


def cap_nhat_quyen_loai_tk(ma_loai_tk: str, trang: str, phien_ban: int,
                          du_lieu: dict, nguoi_sua: str) -> dict:
    if ma_loai_tk not in LOAI_TAI_KHOAN:
        raise ThieuDuLieu("Loại tài khoản không hợp lệ.")
    if du_lieu["pham_vi_xem"] not in {"toan_bo", "bo_phan", "ca_nhan"} or \
       du_lieu["pham_vi_sua"] not in {"toan_bo", "bo_phan", "ca_nhan"}:
        raise ThieuDuLieu("Phạm vi quyền không hợp lệ.")
    if du_lieu["kieu_sua"] not in {"THANG", "CAN_DUYET"}:
        raise ThieuDuLieu("Kiểu sửa không hợp lệ.")
    nguoi_duyet = du_lieu["loai_tai_khoan_duyet"]
    if any(item not in LOAI_TAI_KHOAN for item in nguoi_duyet):
        raise ThieuDuLieu("Loại tài khoản duyệt không hợp lệ.")
    if du_lieu["duoc_sua"] and not du_lieu["duoc_xem"]:
        raise ThieuDuLieu("Quyền sửa cần có quyền xem.")
    if du_lieu["kieu_sua"] == "CAN_DUYET" and (not du_lieu["duoc_sua"] or not nguoi_duyet):
        raise ThieuDuLieu("Sửa cần duyệt phải chỉ rõ loại tài khoản duyệt.")
    if ma_loai_tk == "QUAN_TRI_HE_THONG" and trang == "quan_tri" and not (
        du_lieu["duoc_xem"] and du_lieu["duoc_sua"] and du_lieu["kieu_sua"] == "THANG"
    ):
        raise KhongCoQuyen("Không thể tắt quyền quản trị cốt lõi.", "KHONG_THE_TAT_QUYEN_ADMIN")
    if ma_loai_tk != "QUAN_TRI_HE_THONG" and trang == "quan_tri" and (
        du_lieu["duoc_xem"] or du_lieu["duoc_sua"]
    ):
        raise KhongCoQuyen("Chỉ Quản trị hệ thống được xem Phân quyền.")
    row = auth_repo.cap_nhat_quyen_loai_tk(ma_loai_tk, trang, phien_ban, du_lieu, nguoi_sua)
    if not row:
        raise XungDot("Quyền vừa được cập nhật. Hãy tải lại rồi thử lại.")
    return dict(row)


=======
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

>>>>>>> 3161f51fb7cd5a9588d7eb1642db7e90454e8fbb
def cap_nhat_quyen(vai_tro: str, trang: str, phien_ban: int, du_lieu: dict, nguoi_sua: str) -> dict:
    if trang == "dieu_xe":
        raise ThieuDuLieu("Điều xe đã chuyển sang Hệ thống Kho vận.", "DIEU_XE_DA_CHUYEN")
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
    tai_khoan = auth_repo.lay_tai_khoan(ma)
    if not tai_khoan:
        raise KhongTimThay("Không tìm thấy tài khoản.")
    loai_tk = vai_tro if vai_tro in LOAI_TAI_KHOAN else None
    vai_tro_cu = vai_tro_tuong_thich(loai_tk, tai_khoan["ma_bo_phan"]) if loai_tk else vai_tro
    if not auth_repo.vai_tro_ton_tai(vai_tro_cu):
        raise KhongTimThay("Vai trò không tồn tại.", "KHONG_TIM_THAY_VAI_TRO")
    if not auth_repo.cap_nhat_tai_khoan(ma, phien_ban, nguoi_duyet, vai_tro=vai_tro_cu, ma_loai_tk=loai_tk):
        _bao_loi_cap_nhat(ma)
    return {"ma_tai_khoan": ma, "trang_thai": "HOAT_DONG"}


def cap_nhat_thong_tin_tai_khoan(
    ma: str, ma_bo_phan: str, vai_tro: str, phien_ban: int, nguoi_sua: str,
) -> dict:
    loai_tk = vai_tro if vai_tro in LOAI_TAI_KHOAN else None
    vai_tro_cu = vai_tro_tuong_thich(loai_tk, ma_bo_phan) if loai_tk else vai_tro
    if not auth_repo.vai_tro_ton_tai(vai_tro_cu):
        raise KhongTimThay("Chức vụ không tồn tại.", "KHONG_TIM_THAY_VAI_TRO")
    ket_qua = auth_repo.cap_nhat_thong_tin_tai_khoan(
        ma, ma_bo_phan.strip(), vai_tro_cu, phien_ban, nguoi_sua, ma_loai_tk=loai_tk,
    )
    if ket_qua == "BO_PHAN_KHONG_HOP_LE":
        raise KhongTimThay("Bộ phận không tồn tại hoặc đã ngừng hoạt động.", "KHONG_TIM_THAY_BO_PHAN")
    if ket_qua == "KHONG_CO_HO_SO_NHAN_VIEN":
        raise KhongTimThay("Không tìm thấy hồ sơ nhân viên để cập nhật bộ phận.", "KHONG_TIM_THAY_NHAN_VIEN")
    if ket_qua != "OK":
        _bao_loi_cap_nhat(ma)
    return {"ma_tai_khoan": ma, "ma_bo_phan": ma_bo_phan.strip(), "vai_tro": vai_tro_cu,
            "ma_loai_tk": loai_tk,
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
