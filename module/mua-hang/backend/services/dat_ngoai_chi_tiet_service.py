"""Quy tac chi tiet dong dat ngoai v3."""

from decimal import Decimal
from psycopg.errors import ForeignKeyViolation, UniqueViolation

from backend.data import dat_ngoai_chi_tiet_repo
from backend.data.catalog_repo import lay_ket_qua_idempotency
from backend.services.errors import KhongCoQuyen, KhongTimThay, ThieuDuLieu, XungDot
from backend.services.phan_quyen_service import kiem_quyen


def _dong(id_phieu: str, id_dong: str, ho_so: dict) -> dict:
    kiem_quyen(ho_so, 'dat_ngoai', 'xem')
    row = dat_ngoai_chi_tiet_repo.lay_dong(id_phieu, id_dong)
    if not row:
        raise KhongTimThay('Không tìm thấy dòng đặt ngoài thuộc phiếu này.')
    return row


def chi_tiet(id_phieu: str, id_dong: str, ho_so: dict) -> dict:
    row = _dong(id_phieu, id_dong, ho_so)
    return {**row, 'xac_nhan_ky_thuat': dat_ngoai_chi_tiet_repo.danh_sach_xac_nhan(id_dong),
            'dot_giao': dat_ngoai_chi_tiet_repo.danh_sach_dot_giao(id_dong)}


def sua_dong(id_phieu: str, id_dong: str, data: dict, ho_so: dict) -> dict:
    kiem_quyen(ho_so, 'dat_ngoai', 'sua')
    old = _dong(id_phieu, id_dong, ho_so)
    if old['trang_thai_phieu'] in ('HUY', 'HOAN_THANH'):
        raise XungDot('Phiếu đã kết thúc, không thể sửa dòng.')
    if any(not str(data.get(key) or '').strip() for key in
           ('noi_dung_gia_cong', 'yeu_cau_ky_thuat', 'yeu_cau_chat_luong')):
        raise ThieuDuLieu('Nội dung gia công, yêu cầu kỹ thuật và chất lượng không được để trống.')
    if old.get('ngay_ncc_cam_ket') and data.get('ngay_ncc_cam_ket') != old['ngay_ncc_cam_ket']:
        if not str(data.get('ly_do_doi_han') or '').strip():
            raise ThieuDuLieu('Đổi ngày NCC cam kết phải ghi lý do.')
    try:
        result = dat_ngoai_chi_tiet_repo.sua_dong(
            id_dong, data['phien_ban'], data, ho_so['ma_nhan_vien'])
    except ForeignKeyViolation as exc:
        raise ThieuDuLieu('Phiếu sự cố được chọn không tồn tại.') from exc
    if not result:
        raise XungDot('Dòng đặt ngoài vừa được cập nhật. Hãy tải lại.')
    return result


def them_xac_nhan(id_phieu: str, id_dong: str, data: dict,
                  ho_so: dict, khoa: str) -> dict:
    kiem_quyen(ho_so, 'dat_ngoai', 'xem')
    prior = lay_ket_qua_idempotency(ho_so['ma_tai_khoan'], khoa,
                                   f'POST:/api/v1/dat-ngoai/dong/{id_dong}/xac-nhan-kt')
    if prior is not None:
        return prior
    row = _dong(id_phieu, id_dong, ho_so)
    if row['trang_thai_phieu'] in ('HUY', 'HOAN_THANH'):
        raise XungDot('Phiếu đã kết thúc, không thể thêm xác nhận.')
    if ho_so.get('vai_tro') != 'QC':
        try:
            kiem_quyen(ho_so, 'xac_nhan_kt', 'sua')
        except KhongCoQuyen:
            kiem_quyen(ho_so, 'dat_ngoai', 'sua')
    content = str(data['noi_dung']).strip()
    if not content:
        raise ThieuDuLieu('Nội dung xác nhận không được để trống.')
    return dat_ngoai_chi_tiet_repo.them_xac_nhan(
        id_dong, content, ho_so['ma_nhan_vien'],
        ho_so['ma_tai_khoan'], khoa)


def them_dot_giao(id_phieu: str, id_dong: str, data: dict,
                  ho_so: dict, khoa: str) -> dict:
    kiem_quyen(ho_so, 'dat_ngoai', 'sua')
    prior = lay_ket_qua_idempotency(ho_so['ma_tai_khoan'], khoa,
                                   f'POST:/api/v1/dat-ngoai/dong/{id_dong}/dot-giao')
    if prior is not None:
        return prior
    row = _dong(id_phieu, id_dong, ho_so)
    if row['trang_thai_phieu'] in ('HUY', 'HOAN_THANH'):
        raise XungDot('Phiếu đã kết thúc, không thể thêm đợt giao.')
    current = dat_ngoai_chi_tiet_repo.danh_sach_dot_giao(id_dong)
    total = sum((Decimal(str(item['so_luong'])) for item in current), Decimal(0))
    if total + Decimal(str(data['so_luong'])) > Decimal(str(row['so_luong'])):
        raise ThieuDuLieu('Tổng số lượng các đợt giao vượt số lượng dòng đặt ngoài.')
    try:
        return dat_ngoai_chi_tiet_repo.them_dot_giao(
            id_dong, data, ho_so['ma_nhan_vien'], ho_so['ma_tai_khoan'], khoa)
    except UniqueViolation as exc:
        raise XungDot('Số đợt giao đã tồn tại cho mã hàng này.') from exc
    except ValueError as exc:
        raise ThieuDuLieu('Tổng số lượng các đợt giao vượt số lượng dòng đặt ngoài.') from exc


def nhan_dot_giao(id_phieu: str, id_dong: str, id_dot: str,
                  phien_ban: int, ngay_thuc_te, ho_so: dict) -> dict:
    kiem_quyen(ho_so, 'dat_ngoai', 'sua')
    _dong(id_phieu, id_dong, ho_so)
    row = dat_ngoai_chi_tiet_repo.nhan_dot_giao(
        id_dong, id_dot, phien_ban, ngay_thuc_te, ho_so['ma_nhan_vien'])
    if not row:
        raise XungDot('Đợt giao vừa được cập nhật. Hãy tải lại.')
    return row


def sua_dot_giao(id_phieu: str, id_dong: str, id_dot: str,
                 data: dict, ho_so: dict) -> dict:
    kiem_quyen(ho_so, 'dat_ngoai', 'sua')
    row = _dong(id_phieu, id_dong, ho_so)
    if row['trang_thai_phieu'] in ('HUY', 'HOAN_THANH'):
        raise XungDot('Phiếu đã kết thúc, không thể điều chỉnh đợt giao.')
    if not str(data.get('ly_do') or '').strip():
        raise ThieuDuLieu('Điều chỉnh ngày dự kiến phải ghi lý do.')
    result = dat_ngoai_chi_tiet_repo.sua_ngay_du_kien_dot_giao(
        id_dong, id_dot, data['phien_ban'], data['ngay_du_kien'],
        data['ly_do'].strip(), ho_so['ma_nhan_vien'])
    if not result:
        raise XungDot('Đợt giao vừa được cập nhật. Hãy tải lại.')
    return result
