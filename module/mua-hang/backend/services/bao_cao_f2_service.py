"""Tong hop bay tab bao cao F2 tu du lieu goc, loc gia tren may chu."""

from collections import Counter
from datetime import date
from decimal import Decimal

from backend.data import bao_cao_f2_repo
from backend.services.errors import ThieuDuLieu
from backend.services.phan_quyen_service import co_quyen_xem_gia, kiem_quyen


TABS = {
    'hieu-qua': 'Hiệu quả Mua hàng',
    'bao-gia': 'Quản lý Báo giá',
    'dat-hang': 'Quản lý Đặt hàng',
    'giao-nhan': 'Tình trạng Giao nhận',
    'thanh-toan': 'Quản lý Thanh toán',
    'nha-cung-cap': 'Quản lý Nhà cung cấp',
    'dat-ngoai': 'Quản lý Đặt ngoài',
}
PRICE_FIELDS = {'don_gia', 'thanh_tien', 'so_tien', 'chi_phi', 'dinh_muc_thang'}


def _sum(rows: list[dict], key: str) -> Decimal:
    return sum((Decimal(str(row[key])) for row in rows if row.get(key) is not None), Decimal(0))


def _percent(numerator: Decimal | int, denominator: Decimal | int) -> float | None:
    return round(float(Decimal(numerator) * 100 / Decimal(denominator)), 2) if denominator else None


def _metrics(tab: str, rows: list[dict], show_prices: bool) -> list[dict]:
    result = [{'label': 'Số dòng dữ liệu', 'value': len(rows), 'unit': 'dòng'}]
    if tab == 'hieu-qua':
        result.extend([
            {'label': 'Tỷ lệ đề nghị bất khả thi', 'value': _percent(sum(bool(r['bat_kha_thi']) for r in rows), len(rows)), 'unit': '%'},
            {'label': 'Mã chờ xác nhận kỹ thuật', 'value': sum(r['trang_thai'] == 'CHO_XAC_NHAN_KT' for r in rows), 'unit': 'mã'},
            {'label': 'Tỷ lệ hàng khẩn cấp', 'value': _percent(sum(r['tinh_trang_yeu_cau'] != 'BINH_THUONG' for r in rows), len(rows)), 'unit': '%'},
        ])
    elif tab == 'bao-gia':
        unique = {r['so_ycbg'] for r in rows}
        replied = {r['so_ycbg'] for r in rows if r['ngay_tra_loi']}
        result.extend([
            {'label': 'Yêu cầu báo giá đã phát', 'value': len(unique), 'unit': 'phiếu'},
            {'label': 'Tỷ lệ NCC trả lời', 'value': _percent(len(replied), len(unique)), 'unit': '%'},
            {'label': 'Yêu cầu quá hạn trả lời', 'value': len({r['so_ycbg'] for r in rows if not r['ngay_tra_loi'] and r['han_tra_loi'] and r['han_tra_loi'] < date.today()}), 'unit': 'phiếu'},
        ])
    elif tab == 'dat-hang':
        result.extend([
            {'label': 'Đơn đặt hàng trong kỳ', 'value': len({r['so_don'] for r in rows}), 'unit': 'đơn'},
            {'label': 'Đơn chờ duyệt', 'value': len({r['so_don'] for r in rows if r['trang_thai'] == 'CHO_DUYET'}), 'unit': 'đơn'},
        ])
        if show_prices:
            result.append({'label': 'Giá trị đặt hàng trước VAT', 'value': float(_sum(rows, 'thanh_tien')), 'unit': 'VND'})
    elif tab == 'giao-nhan':
        dated = [r for r in rows if r['so_ngay_som_tre'] is not None]
        inspected = _sum(rows, 'so_luong_kiem')
        result.extend([
            {'label': 'Tỷ lệ dòng về đúng hạn', 'value': _percent(sum(r['so_ngay_som_tre'] <= 0 for r in dated), len(dated)), 'unit': '%'},
            {'label': 'Tỷ lệ IQC đạt', 'value': _percent(_sum(rows, 'so_luong_dat'), inspected), 'unit': '%'},
        ])
    elif tab == 'thanh-toan':
        late = [r for r in rows if r['ngay_du_kien'] and
                (r['ngay_thuc_te'] or date.today()) > r['ngay_du_kien']]
        paid = [r for r in rows if r['ngay_thuc_te']]
        result.extend([
            {'label': 'Đợt thanh toán quá hạn', 'value': len(late), 'unit': 'đợt'},
            {'label': 'Tỷ lệ trả đúng hạn', 'value': _percent(sum(r['ngay_thuc_te'] <= r['ngay_du_kien'] for r in paid if r['ngay_du_kien']), sum(bool(r['ngay_du_kien']) for r in paid)), 'unit': '%'},
        ])
        if show_prices:
            result.append({'label': 'Tiền chưa trả', 'value': float(_sum([r for r in rows if not r['ngay_thuc_te']], 'so_tien')), 'unit': 'VND'})
    elif tab == 'nha-cung-cap':
        suppliers = {r['id_ncc'] for r in rows}
        result.extend([
            {'label': 'NCC đang hoạt động', 'value': len({r['id_ncc'] for r in rows if r['trang_thai'] == 'HOAT_DONG'}), 'unit': 'NCC'},
            {'label': 'Mặt hàng đã duyệt', 'value': sum(r['trang_thai_mat_hang'] == 'DA_DUYET' for r in rows), 'unit': 'mặt hàng'},
            {'label': 'Tỷ lệ NCC có trong BM03', 'value': _percent(len({r['id_ncc'] for r in rows if r['da_phe_duyet']}), len(suppliers)), 'unit': '%'},
        ])
    elif tab == 'dat-ngoai':
        result.extend([
            {'label': 'Phiếu đặt ngoài trong kỳ', 'value': len({r['so_phieu'] for r in rows}), 'unit': 'phiếu'},
            {'label': 'Dòng quá hạn chưa về', 'value': sum(bool(r['ngay_du_kien'] and not r['ngay_thuc_te'] and r['ngay_du_kien'] < date.today()) for r in rows), 'unit': 'dòng'},
            {'label': 'Xác nhận kỹ thuật trung bình / mã', 'value': round(sum(r['so_lan_xac_nhan'] for r in rows) / len(rows), 2) if rows else None, 'unit': 'lần'},
        ])
        if show_prices:
            result.append({'label': 'Chi phí gia công', 'value': float(_sum(rows, 'chi_phi')), 'unit': 'VND'})
    return result


def lay_bao_cao(tab: str, from_date: date, to_date: date, ncc: str | None,
                status: str | None, ho_so: dict) -> dict:
    scope = kiem_quyen(ho_so, 'bao_cao', 'xem')
    if tab not in TABS:
        raise ThieuDuLieu('Tab báo cáo không hợp lệ.')
    if from_date > to_date:
        raise ThieuDuLieu('Ngày bắt đầu phải trước ngày kết thúc.')
    show_prices = co_quyen_xem_gia(ho_so)
    show_supplier_prices = co_quyen_xem_gia(ho_so, 'ncc')
    all_rows = bao_cao_f2_repo.lay_bang_goc(
        tab, {'from': from_date, 'to': to_date, 'ncc': ncc, 'status': status},
        scope, ho_so['ma_nhan_vien'], ho_so.get('ma_bo_phan'))
    source_truncated = len(all_rows) > 2000
    rows = all_rows[:2000]
    metrics = _metrics(tab, all_rows, show_prices)
    status_counts = Counter(str(row.get('trang_thai_dong') or row.get('trang_thai') or
                                row.get('trang_thai_mat_hang') or 'CHUA_CO') for row in all_rows)
    columns = [key for key in rows[0] if not key.startswith('_')] if rows else []
    if not show_prices:
        columns = [key for key in columns if key not in PRICE_FIELDS]
    elif tab == 'bao-gia' and not show_supplier_prices:
        columns = [key for key in columns if key != 'don_gia']
    visible = [{key: row.get(key) for key in columns} for row in rows]
    return {'tab': tab, 'title': TABS[tab], 'filters': {'from': from_date, 'to': to_date,
            'ncc': ncc, 'status': status}, 'metrics': metrics,
            'chart': [{'label': key, 'value': count} for key, count in status_counts.most_common()],
            'columns': columns, 'rows': visible, 'truncated': source_truncated,
            'show_prices': show_prices}
