"""Quy tac cham diem BM06 cho tung mat hang NCC."""

from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from psycopg.errors import UniqueViolation

from backend.data import danh_gia_mat_hang_repo
from backend.services.errors import KhongCoQuyen, KhongTimThay, ThieuDuLieu, XungDot
from backend.services.phan_quyen_service import kiem_quyen


def _nguon(id_mat_hang: str, ho_so: dict) -> dict:
    kiem_quyen(ho_so, 'ncc', 'xem')
    row = danh_gia_mat_hang_repo.nguon_diem(id_mat_hang)
    if not row:
        raise KhongTimThay('Không tìm thấy mặt hàng của nhà cung cấp.')
    return row


def _lam_tron(value: Decimal) -> Decimal:
    return value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def tinh_diem(nguon: dict, diem_nhap: dict) -> dict:
    """Chi nhan bon diem nguoi cham; moi diem khac lay tu giao dich."""
    diem = {key: Decimal(str(diem_nhap[key])) for key in
            ('diem_gia_ca', 'diem_tam_voc', 'diem_thanh_toan', 'diem_dich_vu')}
    if any(value < 0 or value > 10 for value in diem.values()):
        raise ThieuDuLieu('Điểm người chấm phải nằm trong khoảng 0–10.')
    min_giao = max(1, int(nguon.get('so_lan_toi_thieu') or 3))
    auto: dict[str, Decimal | None] = {
        'diem_chat_luong': None, 'diem_giao_hang': None,
        'diem_thoi_gian_hop_tac': None, 'diem_gia_tri_giao_dich': None,
    }
    ly_do: dict[str, str] = {}
    iqc_count = int(nguon.get('so_lan_iqc') or 0)
    iqc_qty = Decimal(str(nguon.get('so_luong_iqc_kiem') or 0))
    if iqc_count >= min_giao and iqc_qty > 0:
        ratio = min(Decimal(1), max(Decimal(0), Decimal(str(nguon['so_luong_iqc_dat'] or 0)) / iqc_qty))
        auto['diem_chat_luong'] = _lam_tron(ratio * 10)
        ly_do['diem_chat_luong'] = f'{nguon["so_luong_iqc_dat"]}/{nguon["so_luong_iqc_kiem"]} sản phẩm IQC đạt qua {iqc_count} lần kiểm.'
    else:
        ly_do['diem_chat_luong'] = f'Chưa đủ {min_giao} lần kiểm IQC có số lượng.'
    delivery_count = int(nguon.get('so_lan_co_han') or 0)
    if delivery_count >= min_giao:
        ratio = Decimal(int(nguon.get('so_lan_dung_han') or 0)) / delivery_count
        auto['diem_giao_hang'] = _lam_tron(ratio * 10)
        ly_do['diem_giao_hang'] = f'{nguon["so_lan_dung_han"]}/{delivery_count} dòng nhận đúng hạn.'
    else:
        ly_do['diem_giao_hang'] = f'Chưa đủ {min_giao} dòng nhận có hạn giao.'
    first = nguon.get('ngay_giao_dau')
    if first:
        if isinstance(first, str):
            first = date.fromisoformat(first)
        today = date.today()
        months = max(0, (today.year - first.year) * 12 + today.month - first.month)
        max_months = max(1, int(nguon.get('thang_toi_da') or 12))
        auto['diem_thoi_gian_hop_tac'] = _lam_tron(min(Decimal(5), Decimal(months) * 5 / max_months))
        ly_do['diem_thoi_gian_hop_tac'] = f'{months} tháng từ lần nhận hàng đầu, tối đa sau {max_months} tháng.'
    else:
        ly_do['diem_thoi_gian_hop_tac'] = 'Chưa có lần nhận hàng cho mặt hàng này.'
    value_limit = Decimal(str(nguon.get('gia_tri_muc_5') or 0))
    value = Decimal(str(nguon.get('gia_tri_12_thang') or 0))
    if value_limit > 0 and nguon.get('gia_tri_12_thang') is not None:
        auto['diem_gia_tri_giao_dich'] = _lam_tron(min(Decimal(5), value * 5 / value_limit))
        ly_do['diem_gia_tri_giao_dich'] = f'{value} VND đơn đặt hàng trong 12 tháng / ngưỡng {value_limit} VND.'
    else:
        ly_do['diem_gia_tri_giao_dich'] = 'Chưa có giao dịch hoặc chưa cấu hình ngưỡng; tiêu chí tạm không tính.'
    weights = {'diem_chat_luong': 2, 'diem_giao_hang': 2, 'diem_gia_ca': 2,
               'diem_tam_voc': 1, 'diem_thanh_toan': 1, 'diem_dich_vu': 1,
               'diem_thoi_gian_hop_tac': 1, 'diem_gia_tri_giao_dich': 1}
    all_scores = {**diem, **auto}
    max_scores = {key: 5 if key in ('diem_thoi_gian_hop_tac', 'diem_gia_tri_giao_dich') else 10
                  for key in weights}
    available = sum(max_scores[key] * weight for key, weight in weights.items()
                    if all_scores[key] is not None)
    earned = sum(all_scores[key] * weight for key, weight in weights.items()
                 if all_scores[key] is not None)
    total = _lam_tron(earned * 100 / Decimal(available))
    return {**all_scores, 'diem_tong': total, 'trong_so_du_lieu': available,
            'ty_le_dung_han': _lam_tron(Decimal(int(nguon.get('so_lan_dung_han') or 0)) * 100 / delivery_count)
            if delivery_count else None,
            'ty_le_iqc_dat': _lam_tron(Decimal(str(nguon.get('so_luong_iqc_dat') or 0)) * 100 / iqc_qty)
            if iqc_qty else None,
            'giai_thich_tu_dong': ly_do}


def xem_nguon(id_mat_hang: str, ho_so: dict) -> dict:
    if ho_so.get('vai_tro') not in ('ADMIN', 'TBP_MUA_HANG', 'NV_MUA_HANG'):
        raise KhongCoQuyen('Chỉ Mua hàng được xem nguồn dữ liệu chấm điểm BM06.')
    source = _nguon(id_mat_hang, ho_so)
    return {**source, 'diem_xem_truoc': tinh_diem(source, {
        'diem_gia_ca': 0, 'diem_tam_voc': 0, 'diem_thanh_toan': 0, 'diem_dich_vu': 0,
    })}


def danh_sach(id_mat_hang: str, ho_so: dict) -> list[dict]:
    _nguon(id_mat_hang, ho_so)
    return danh_gia_mat_hang_repo.danh_sach(id_mat_hang)


def tao(id_mat_hang: str, body: dict, ho_so: dict, khoa: str) -> dict:
    if ho_so.get('vai_tro') not in ('ADMIN', 'TBP_MUA_HANG', 'NV_MUA_HANG'):
        raise KhongCoQuyen('Chỉ Mua hàng được chấm điểm mặt hàng NCC.')
    source = _nguon(id_mat_hang, ho_so)
    if source['trang_thai'] != 'DA_DUYET':
        raise ThieuDuLieu('Mặt hàng NCC cần được duyệt trước khi chấm điểm.')
    scores = tinh_diem(source, body)
    scores.update({'id_ncc': source['id_ncc'], 'id_mat_hang_ncc': id_mat_hang,
                   'ghi_chu': body.get('ghi_chu'), 'xep_loai': xep_loai(scores['diem_tong'])})
    scores.pop('giai_thich_tu_dong')
    try:
        return danh_gia_mat_hang_repo.tao(scores, ho_so['ma_nhan_vien'],
                                          ho_so['ma_tai_khoan'], khoa)
    except UniqueViolation as exc:
        raise XungDot('Mặt hàng này còn một bảng điểm chờ duyệt.') from exc


def xep_loai(total: Decimal) -> str:
    # Cac moc bien lien tuc theo de xuat F1-H2; hien thi 5 bac BM06.
    if total < 50:
        return 'KHONG_CHON'
    if total < 75:
        return 'DU_PHONG'
    if total < 80:
        return 'TIEU_CHUAN'
    if total < 91:
        return 'CHINH_YEU'
    return 'CHIEN_LUOC'


def duyet(id_danh_gia: str, phien_ban: int, ho_so: dict) -> dict:
    if ho_so.get('vai_tro') not in ('ADMIN', 'TBP_MUA_HANG'):
        raise KhongCoQuyen('Chỉ Trưởng bộ phận Mua hàng được duyệt bảng điểm.')
    row = danh_gia_mat_hang_repo.duyet(id_danh_gia, phien_ban, ho_so['ma_nhan_vien'])
    if not row:
        raise XungDot('Bảng điểm đã thay đổi hoặc không còn chờ duyệt.')
    return row
