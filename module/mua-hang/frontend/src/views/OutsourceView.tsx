import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  DongNhapLsx, HoSo, layLsxDatNgoai, layNhaCungCapDatNgoai, layPhieuDatNgoai, LsxDatNgoai,
  NhaCungCapDanhMuc, nhapLsxDatNgoai, PhieuDatNgoai, taoBaoGiaDatNgoai,
} from '../api/client';
import { OutsourceDetailModal } from '../components/OutsourceDetailModal';

type OutsourceTab = 'tracking' | 'tickets' | 'quotes' | 'orders' | 'suppliers';
type FilterState = { from: string; to: string; workshop: string; supplier: string; status: string; query: string };

interface ProgressLine {
  code: string; material: string; name: string; process: string; quantity: string; timing: string; status: string; danger?: boolean;
}
interface ProgressGroup {
  id: string; title: string; priority: string; workshop: string; coordinator: string; customer: string; po: string;
  supplier: string; quantity: string; progress: number; due: string; timing: string; status: string; note: string;
  danger?: boolean; lines: ProgressLine[];
}

const TABS: Array<{ key: OutsourceTab; label: string; icon: string }> = [
  { key: 'tracking', label: 'Theo dõi', icon: 'table_rows' },
  { key: 'tickets', label: 'Danh sách phiếu', icon: 'receipt_long' },
  { key: 'quotes', label: 'Báo giá', icon: 'compare_arrows' },
  { key: 'orders', label: 'Đơn đặt gia công', icon: 'verified' },
  { key: 'suppliers', label: 'Nhà cung cấp', icon: 'factory' },
];
const DEFAULT_FILTERS: FilterState = { from: '', to: '', workshop: '', supplier: '', status: '', query: '' };

function parseNumber(value: string) { return Number(value.trim().replace(/\s/g, '').replace(/,(?=\d{1,4}$)/, '.')); }

function parseExcelDate(value: string) {
  const raw = value.replace(/\u00a0/g, ' ').trim();
  if (!raw) return undefined;
  if (/^\d+(\.\d+)?$/.test(raw)) {
    const serial = Number(raw);
    if (serial >= 20_000 && serial <= 80_000) {
      return new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000).toISOString().slice(0, 10);
    }
  }
  const isoDate = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:\s|T|$)/);
  if (isoDate) return `${isoDate[1]}-${isoDate[2].padStart(2, '0')}-${isoDate[3].padStart(2, '0')}`;
  const vietnameseDate = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})(?:\s|T|$)/);
  if (vietnameseDate) {
    const year = vietnameseDate[3].length === 2 ? `20${vietnameseDate[3]}` : vietnameseDate[3];
    return `${year}-${vietnameseDate[2].padStart(2, '0')}-${vietnameseDate[1].padStart(2, '0')}`;
  }
  return raw;
}

function normalizeSourceStatus(value: string) {
  const normalized = value.trim().toLocaleUpperCase('vi-VN')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/Đ/g, 'D')
    .replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  if (normalized === 'CHUA_HOAN_THANH') return 'CHUA_HOAN_THANH';
  if (normalized === 'TRE_CHUA_HT' || normalized === 'TRE_CHUA_HOAN_THANH') return 'TRE_CHUA_HOAN_THANH';
  return normalized || undefined;
}

export function parseExcel(value: string): DongNhapLsx[] {
  const rows = value.split(/\r?\n/)
    .map((line) => line.split('\t').map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean));
  if (!rows.length) return [];
  const sourceHeader = rows.findIndex((row) => row[0]?.toLocaleUpperCase('vi-VN') === 'CHỨNG TỪ' && row[2]?.toLocaleUpperCase('vi-VN') === 'SỐ PO');
  const sourceLayout = sourceHeader >= 0 || rows.some((row) => row.length >= 30 && row[0] && row[6]);
  let data = sourceHeader >= 0 ? rows.slice(sourceHeader + 2) : rows;
  if (!sourceLayout) {
    const first = rows[0][0]?.toLocaleUpperCase('vi-VN') || '';
    if (first.includes('LỆNH SẢN XUẤT') || first === 'LSX') data = rows.slice(1);
  }
  data = data.filter((row) => sourceLayout ? Boolean(row[0] || row[4] || row[6]) : row.some(Boolean));
  const seen = new Set<string>();
  return data.map((cells, index) => {
    const normalized = sourceLayout ? {
      lenh_san_xuat: cells[0], ma_vach: cells[6], ma_hang: cells[4], ten_hang: cells[5],
      rawQuantity: cells[8], dvt: cells[9], so_po: cells[2], ma_khach_hang: undefined,
      ten_khach_hang_chup: cells[3] || undefined, ma_bo_phan: undefined,
      ten_bo_phan_chup: cells[7] || undefined,
      ki_han_khach_hang: parseExcelDate(cells[10] || ''), ngay_nhan_lenh: parseExcelDate(cells[1] || ''),
      so_so: cells[34] || undefined, ngay_so: parseExcelDate(cells[36] || ''),
      trang_thai_don: normalizeSourceStatus(cells[13] || ''), rawPriority: '',
      ma_cong_doan: cells[37] || undefined, ma_ban_ve: cells[35] || undefined,
      ghi_chu: cells[31] || undefined, ghi_chu_dong: cells[32] || undefined,
    } : {
      lenh_san_xuat: cells[0], ma_vach: cells[1], ma_hang: cells[2], ten_hang: cells[3],
      rawQuantity: cells[4], dvt: cells[5], so_po: cells[6], ma_khach_hang: cells[7],
      ki_han_khach_hang: parseExcelDate(cells[8] || ''), rawPriority: cells[9], ghi_chu: cells[10],
      ten_khach_hang_chup: undefined, ma_bo_phan: undefined, ten_bo_phan_chup: undefined, ngay_nhan_lenh: undefined,
      so_so: undefined, ngay_so: undefined, trang_thai_don: undefined,
      ma_cong_doan: undefined, ma_ban_ve: undefined, ghi_chu_dong: undefined,
    };
    const { lenh_san_xuat, ma_vach, ma_hang, ten_hang, rawQuantity, dvt, so_po, ma_khach_hang,
      ten_khach_hang_chup, ma_bo_phan, ten_bo_phan_chup, ki_han_khach_hang, ngay_nhan_lenh, so_so, ngay_so,
      trang_thai_don, rawPriority, ma_cong_doan, ma_ban_ve, ghi_chu, ghi_chu_dong } = normalized;
    if (!lenh_san_xuat || !ma_vach || !ma_hang || !ten_hang || !rawQuantity || !dvt) throw new Error(`Dòng ${index + 1}: thiếu trường bắt buộc.`);
    if (seen.has(ma_vach)) throw new Error(`Dòng ${index + 1}: mã vạch ${ma_vach} bị trùng.`);
    seen.add(ma_vach);
    const so_luong = parseNumber(rawQuantity);
    if (!Number.isFinite(so_luong) || so_luong <= 0) throw new Error(`Dòng ${index + 1}: số lượng không hợp lệ.`);
    const muc_do_uu_tien = rawPriority ? Number(rawPriority) : undefined;
    if (muc_do_uu_tien && ![1, 2, 3].includes(muc_do_uu_tien)) throw new Error(`Dòng ${index + 1}: ưu tiên chỉ nhận 1–3.`);
    return { lenh_san_xuat: lenh_san_xuat.toUpperCase(), ma_vach: ma_vach.toUpperCase(), ma_hang: ma_hang.toUpperCase(), ten_hang, so_luong, dvt: dvt.toUpperCase(), so_po: so_po || undefined, ma_khach_hang: ma_khach_hang || undefined, ten_khach_hang_chup, ma_bo_phan: ma_bo_phan?.toUpperCase(), ten_bo_phan_chup, ki_han_khach_hang, ngay_nhan_lenh, so_so, ngay_so, trang_thai_don, muc_do_uu_tien, ma_cong_doan: ma_cong_doan?.toUpperCase(), ma_ban_ve, ghi_chu: ghi_chu || undefined, ghi_chu_dong };
  });
}

const STATUS_LABELS: Record<string, string> = {
  NHAP: 'NHÁP', CHO_XAC_NHAN_KY_THUAT: 'CHỜ XÁC NHẬN KỸ THUẬT', DANG_BAO_GIA: 'ĐANG XỬ LÝ / BÁO GIÁ',
  CHO_DUYET: 'CHỜ DUYỆT', DA_DUYET: 'ĐÃ DUYỆT / CHỜ ĐẶT', DA_DAT: 'ĐÃ ĐẶT',
  DANG_LAM: 'ĐANG LÀM', DA_NHAN: 'ĐÃ NHẬN', HOAN_THANH: 'HOÀN THÀNH', HUY: 'ĐÃ HUỶ',
};
const STATUS_PROGRESS: Record<string, number> = {
  NHAP: 3, CHO_XAC_NHAN_KY_THUAT: 10, DANG_BAO_GIA: 25, CHO_DUYET: 40, DA_DUYET: 50,
  DA_DAT: 60, DANG_LAM: 75, DA_NHAN: 90, HOAN_THANH: 100, HUY: 0,
};

function displayDate(value: string | null | undefined) {
  if (!value) return '—';
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function importedToGroup(item: LsxDatNgoai, requests: PhieuDatNgoai[]): ProgressGroup {
  const request = requests.find((entry) => entry.lenh_san_xuat === item.lenh_san_xuat && entry.trang_thai !== 'HUY')
    || requests.find((entry) => entry.lenh_san_xuat === item.lenh_san_xuat);
  const progress = request ? STATUS_PROGRESS[request.trang_thai] || 0 : 0;
  const dueValue = request?.ky_han || item.ki_han_khach_hang;
  const overdue = Boolean(dueValue && new Date(`${dueValue.slice(0, 10)}T23:59:59`) < new Date() && !['DA_NHAN', 'HOAN_THANH', 'HUY'].includes(request?.trang_thai || ''));
  return {
    id: item.lenh_san_xuat, title: item.ghi_chu || `Lệnh sản xuất ${item.lenh_san_xuat}`,
    priority: item.muc_do_uu_tien ? `ƯU TIÊN ${item.muc_do_uu_tien}` : 'BÌNH THƯỜNG',
    workshop: item.ten_bo_phan_chup || item.ma_bo_phan || 'Bộ phận Kinh doanh', coordinator: request?.nguoi_lap || 'Chưa phân công',
    customer: item.ten_khach_hang_chup || item.ma_khach_hang || 'Chưa cập nhật', po: item.so_po || '—',
    supplier: request?.ten_ncc_chup || 'Chưa chọn nhà cung cấp', quantity: `${item.dong.length} mã hàng`,
    progress, due: displayDate(dueValue), timing: overdue ? 'QUÁ HẠN' : (dueValue ? 'TRONG HẠN' : 'CHƯA CÓ HẠN'),
    status: request ? STATUS_LABELS[request.trang_thai] || request.trang_thai : 'CHƯA LẬP BÁO GIÁ',
    note: request?.ghi_chu || item.ghi_chu || '—', danger: overdue,
    lines: item.dong.map((line) => {
      const requestLine = request?.dong.find((entry) => entry.ma_vach === line.ma_vach);
      return { code: line.ma_hang, material: line.ma_vach, name: line.ten_hang,
        process: line.ma_cong_doan || requestLine?.ghi_chu || request?.noi_dung_ky_thuat || 'Chưa cập nhật công đoạn',
        quantity: `${Number(line.so_luong).toLocaleString('vi-VN')} ${line.dvt}`,
        timing: displayDate(requestLine?.ky_han || request?.ky_han),
        status: requestLine ? STATUS_LABELS[requestLine.trang_thai] || requestLine.trang_thai : 'Chờ xử lý',
        danger: overdue };
    }),
  };
}

function StatusPill({ children, danger = false }: { children: string; danger?: boolean }) {
  return <span className={`pill px-2 py-1 text-[10px] ${danger ? 'p-r' : 'p-info'}`}>{children}</span>;
}

function SupplierCards({ suppliers: supplied, onNotify }: { suppliers?: NhaCungCapDanhMuc[]; onNotify: (message: string) => void }) {
  const suppliers = supplied || [];
  return <section className="space-y-4"><div className="bg-white border border-[#DCE1EC] rounded p-4"><h3 className="font-bold text-[15px]">DANH MỤC NHÀ CUNG CẤP GIA CÔNG</h3><p className="text-[12px] text-[#59627A] mt-1">Dữ liệu trực tiếp từ danh mục nhà cung cấp của hệ thống.</p></div>{suppliers.length === 0 ? <div className="bg-white border rounded p-10 text-center text-[#59627A]">Chưa có nhà cung cấp gia công.</div> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{suppliers.map((supplier) => <article key={supplier.ma} className="bg-white border border-[#DCE1EC] border-t-4 border-t-[#283A97] rounded p-4"><div className="flex justify-between gap-2"><div><h4 className="font-bold">{supplier.ten}</h4><span className="text-[11px] text-[#59627A]">MÃ NCC: {supplier.ma_ncc}</span></div><StatusPill danger={supplier.trang_thai === 'CANH_BAO'}>{supplier.trang_thai}</StatusPill></div><div className="mt-4 grid grid-cols-2 gap-2 text-[12px]"><div className="p-2 bg-[#F4F6FA] rounded"><span className="block text-[#59627A]">Loại cung cấp</span><strong>{supplier.la_ncc_gia_cong ? 'Gia công' : supplier.la_ncc_mua_hang ? 'Mua hàng' : 'Chưa phân loại'}</strong></div><div className="p-2 bg-[#F4F6FA] rounded"><span className="block text-[#59627A]">Phê duyệt</span><strong>{supplier.da_phe_duyet ? 'Đã phê duyệt' : 'Chưa phê duyệt'}</strong></div></div><div className="mt-4 pt-3 border-t flex justify-end"><button onClick={() => onNotify(`Đã mở thông tin ${supplier.ten}.`)} className="min-h-9 px-3 border rounded font-bold text-[11px]">XEM THÔNG TIN</button></div></article>)}</div>}</section>;
}

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString('vi-VN')} đ`;
}

function EmptyTableRow({ colSpan, children }: { colSpan: number; children: string }) {
  return <tr><td colSpan={colSpan} className="p-10 text-center text-[#59627A]">{children}</td></tr>;
}

interface PaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  label?: string;
}

function Pagination({ total, page, pageSize, onPageChange, onPageSizeChange, label = 'dòng' }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const from = total ? (currentPage - 1) * pageSize + 1 : 0;
  const to = Math.min(currentPage * pageSize, total);
  return <div className="p-3 bg-white border rounded flex flex-wrap items-center justify-between gap-3 text-[12px]"><span className="text-[#59627A]">Hiển thị <strong>{from}–{to}</strong> / {total} {label}</span><div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2">Số dòng/trang<select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))} className="h-10 px-2 border border-[#DCE1EC] rounded bg-white"><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label><button type="button" onClick={() => onPageChange(1)} disabled={currentPage === 1} className="min-w-10 h-10 border rounded disabled:opacity-40" aria-label="Trang đầu"><span className="material-symbols-outlined">first_page</span></button><button type="button" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="min-w-10 h-10 border rounded disabled:opacity-40" aria-label="Trang trước"><span className="material-symbols-outlined">chevron_left</span></button><strong className="min-w-24 text-center">Trang {currentPage}/{totalPages}</strong><button type="button" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="min-w-10 h-10 border rounded disabled:opacity-40" aria-label="Trang sau"><span className="material-symbols-outlined">chevron_right</span></button><button type="button" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} className="min-w-10 h-10 border rounded disabled:opacity-40" aria-label="Trang cuối"><span className="material-symbols-outlined">last_page</span></button></div></div>;
}

function TicketTable({ requests, onView }: { requests: PhieuDatNgoai[]; onView: (lsx: string) => void }) {
  const [page, setPage] = useState(1); const [pageSize, setPageSize] = useState(50);
  const totalPages = Math.max(1, Math.ceil(requests.length / pageSize)); const currentPage = Math.min(page, totalPages);
  const visible = requests.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return <div className="space-y-3"><Pagination total={requests.length} page={currentPage} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} label="phiếu" /><section className="bg-white border rounded overflow-x-auto"><table className="w-full min-w-[900px] text-[12px]"><thead className="bg-[#F4F6FA]"><tr>{['SỐ PHIẾU', 'NGÀY TẠO', 'LỆNH SẢN XUẤT', 'NHÀ CUNG CẤP', 'SỐ MÃ HÀNG', 'HẠN TRẢ', 'TRẠNG THÁI'].map((head) => <th key={head} className="p-3 text-left">{head}</th>)}</tr></thead><tbody>{requests.length === 0 ? <EmptyTableRow colSpan={7}>Chưa có phiếu đặt ngoài.</EmptyTableRow> : visible.map((request) => <tr key={request.id} className="border-t"><td className="p-3"><button type="button" onClick={() => onView(request.lenh_san_xuat)} className="font-mono font-bold text-[#283A97] hover:underline">{request.id}</button></td><td className="p-3">{displayDate(request.ngay_lap)}</td><td className="p-3 font-mono">{request.lenh_san_xuat}</td><td className="p-3">{request.ten_ncc_chup || 'Chưa chọn'}</td><td className="p-3">{request.dong.length}</td><td className="p-3">{displayDate(request.ky_han)}</td><td className="p-3"><StatusPill danger={request.trang_thai === 'HUY'}>{STATUS_LABELS[request.trang_thai] || request.trang_thai}</StatusPill></td></tr>)}</tbody></table></section></div>;
}

function QuoteTable({ requests, onView }: { requests: PhieuDatNgoai[]; onView: (lsx: string) => void }) {
  const [page, setPage] = useState(1); const [pageSize, setPageSize] = useState(50);
  const totalPages = Math.max(1, Math.ceil(requests.length / pageSize)); const currentPage = Math.min(page, totalPages);
  const visible = requests.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return <div className="space-y-3"><Pagination total={requests.length} page={currentPage} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} label="phiếu báo giá" /><section className="bg-white border rounded overflow-x-auto"><table className="w-full min-w-[900px] text-[12px]"><thead className="bg-[#F4F6FA]"><tr>{['SỐ PHIẾU', 'LỆNH SẢN XUẤT', 'NHÀ CUNG CẤP', 'SỐ MÃ HÀNG', 'TỔNG GIÁ TRỊ', 'KỲ HẠN', 'TRẠNG THÁI'].map((head) => <th key={head} className="p-3 text-left">{head}</th>)}</tr></thead><tbody>{requests.length === 0 ? <EmptyTableRow colSpan={7}>Chưa có phiếu đang báo giá hoặc chờ duyệt.</EmptyTableRow> : visible.map((request) => <tr key={request.id} className="border-t"><td className="p-3"><button type="button" onClick={() => onView(request.lenh_san_xuat)} className="font-mono font-bold text-[#283A97] hover:underline">{request.id}</button></td><td className="p-3 font-mono">{request.lenh_san_xuat}</td><td className="p-3">{request.ten_ncc_chup || 'Chưa chọn'}</td><td className="p-3">{request.dong.length}</td><td className="p-3 font-mono font-bold">{formatMoney(request.tong_gia_tri)}</td><td className="p-3">{displayDate(request.ky_han)}</td><td className="p-3"><StatusPill>{STATUS_LABELS[request.trang_thai] || request.trang_thai}</StatusPill></td></tr>)}</tbody></table></section></div>;
}

function OrderTable({ requests, onView }: { requests: PhieuDatNgoai[]; onView: (lsx: string) => void }) {
  const [page, setPage] = useState(1); const [pageSize, setPageSize] = useState(50);
  const totalPages = Math.max(1, Math.ceil(requests.length / pageSize)); const currentPage = Math.min(page, totalPages);
  const visible = requests.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return <div className="space-y-3"><Pagination total={requests.length} page={currentPage} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} label="đơn" /><section className="bg-white border rounded overflow-x-auto"><table className="w-full min-w-[900px] text-[12px]"><thead className="bg-[#F4F6FA]"><tr>{['SỐ ĐƠN', 'LỆNH SẢN XUẤT', 'NHÀ CUNG CẤP', 'GIÁ TRỊ', 'KỲ HẠN', 'SỐ DÒNG', 'TRẠNG THÁI'].map((head) => <th key={head} className="p-3 text-left">{head}</th>)}</tr></thead><tbody>{requests.length === 0 ? <EmptyTableRow colSpan={7}>Chưa có đơn đặt gia công.</EmptyTableRow> : visible.map((request) => <tr key={request.id} className="border-t"><td className="p-3"><button type="button" onClick={() => onView(request.lenh_san_xuat)} className="font-mono font-bold text-[#283A97] hover:underline">{request.id}</button></td><td className="p-3 font-mono">{request.lenh_san_xuat}</td><td className="p-3">{request.ten_ncc_chup || 'Chưa chọn'}</td><td className="p-3 font-mono font-bold">{formatMoney(request.tong_gia_tri)}</td><td className="p-3">{displayDate(request.ky_han)}</td><td className="p-3">{request.dong.length}</td><td className="p-3"><StatusPill>{STATUS_LABELS[request.trang_thai] || request.trang_thai}</StatusPill></td></tr>)}</tbody></table></section></div>;
}

interface CreateRequestModalProps {
  imported: LsxDatNgoai[];
  selectedOrder?: LsxDatNgoai;
  createLsx: string;
  createLines: Set<string>;
  needsTechnical: boolean;
  technicalNote: string;
  loading: boolean;
  onSelectLsx: (value: string) => void;
  onToggleLine: (barcode: string) => void;
  onNeedsTechnical: (value: boolean) => void;
  onTechnicalNote: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}

function CreateRequestModal(props: CreateRequestModalProps) {
  return <div className="fixed inset-0 z-[80] bg-black/45 flex items-center justify-center p-3"><form onSubmit={props.onSubmit} className="bg-white w-full max-w-3xl max-h-[94vh] overflow-y-auto rounded shadow-xl"><header className="p-4 border-b flex justify-between"><div><h2 className="font-bold">THÊM MỚI ĐẶT NGOÀI</h2><p className="mt-1 text-[12px] text-[#59627A]">Chọn LSX và mã hàng đã nạp từ dữ liệu thật.</p></div><button type="button" onClick={props.onClose} className="w-10 h-10"><span className="material-symbols-outlined">close</span></button></header><div className="p-4 space-y-4"><label className="block text-[11px] font-bold">LỆNH SẢN XUẤT *<select required value={props.createLsx} onChange={(event) => props.onSelectLsx(event.target.value)} className="mt-1 w-full h-11 px-3 border rounded bg-white font-normal"><option value="">-- Chọn LSX --</option>{props.imported.map((item) => <option key={item.lenh_san_xuat} value={item.lenh_san_xuat}>{item.lenh_san_xuat} · {item.dong.length} mã hàng</option>)}</select></label>{props.imported.length === 0 && <div className="p-4 bg-[#FFF7E6] border border-[#F2CD82] rounded text-[12px]">Chưa có dữ liệu LSX. Hãy dùng nút “Nạp LSX từ Excel” trước.</div>}{props.selectedOrder && <div className="border rounded overflow-x-auto"><table className="w-full min-w-[650px] text-[12px]"><thead className="bg-[#F4F6FA]"><tr><th className="p-3 text-left">CHỌN</th><th className="p-3 text-left">MÃ VẠCH</th><th className="p-3 text-left">MÃ HÀNG</th><th className="p-3 text-left">TÊN HÀNG</th><th className="p-3 text-left">SỐ LƯỢNG</th></tr></thead><tbody>{props.selectedOrder.dong.map((line) => <tr key={line.ma_vach} className="border-t"><td className="p-3"><input type="checkbox" checked={props.createLines.has(line.ma_vach)} disabled={line.da_lap_bao_gia} onChange={() => props.onToggleLine(line.ma_vach)} aria-label={`Chọn ${line.ma_hang}`} /></td><td className="p-3 font-mono">{line.ma_vach}</td><td className="p-3 font-mono font-bold">{line.ma_hang}</td><td className="p-3">{line.ten_hang}{line.da_lap_bao_gia && <span className="block text-[10px] text-[#59627A]">Đã lập phiếu</span>}</td><td className="p-3">{Number(line.so_luong).toLocaleString('vi-VN')} {line.dvt}</td></tr>)}</tbody></table></div>}<label className="flex items-center gap-2 text-[12px] font-bold"><input type="checkbox" checked={props.needsTechnical} onChange={(event) => props.onNeedsTechnical(event.target.checked)} />CẦN XÁC NHẬN KỸ THUẬT</label>{props.needsTechnical && <label className="block text-[11px] font-bold">NỘI DUNG CẦN XÁC NHẬN *<textarea required value={props.technicalNote} onChange={(event) => props.onTechnicalNote(event.target.value)} rows={3} className="mt-1 w-full p-3 border rounded font-normal" /></label>}</div><footer className="p-4 border-t flex justify-end gap-2"><button type="button" onClick={props.onClose} className="min-h-11 px-5 border rounded font-bold">HỦY</button><button disabled={props.loading || props.createLines.size === 0} className="min-h-11 px-5 bg-[#283A97] text-white rounded font-bold disabled:opacity-40">TẠO PHIẾU ({props.createLines.size})</button></footer></form></div>;
}

export function OutsourceView({ onNotify, currentUser }: { onNotify: (message: string) => void; currentUser: HoSo }) {
  const [tab, setTab] = useState<OutsourceTab>('tracking');
  const [imported, setImported] = useState<LsxDatNgoai[]>([]);
  const [requests, setRequests] = useState<PhieuDatNgoai[]>([]);
  const [suppliers, setSuppliers] = useState<NhaCungCapDanhMuc[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [showPaste, setShowPaste] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [detailLsxId, setDetailLsxId] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [pasteRows, setPasteRows] = useState<DongNhapLsx[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [createLsx, setCreateLsx] = useState('');
  const [createLines, setCreateLines] = useState<Set<string>>(new Set());
  const [needsTechnical, setNeedsTechnical] = useState(false);
  const [technicalNote, setTechnicalNote] = useState('');
  const [trackingPage, setTrackingPage] = useState(1);
  const [trackingPageSize, setTrackingPageSize] = useState(50);
  const [pastePage, setPastePage] = useState(1);
  const [pastePageSize, setPastePageSize] = useState(50);
  const groups = useMemo(() => imported.map((item) => importedToGroup(item, requests)), [imported, requests]);
  const filteredGroups = useMemo(() => groups.filter((group) => {
    const query = filters.query.trim().toLocaleUpperCase('vi-VN');
    if (filters.workshop && group.workshop !== filters.workshop) return false;
    if (filters.supplier && group.supplier !== filters.supplier) return false;
    if (filters.status === 'late' && !group.danger) return false;
    if (filters.status === 'on-time' && group.danger) return false;
    return !query || `${group.id} ${group.po} ${group.title} ${group.lines.map((line) => line.code).join(' ')}`.toLocaleUpperCase('vi-VN').includes(query);
  }), [filters, groups]);
  const trackingTotalPages = Math.max(1, Math.ceil(filteredGroups.length / trackingPageSize));
  const currentTrackingPage = Math.min(trackingPage, trackingTotalPages);
  const visibleGroups = useMemo(() => filteredGroups.slice(
    (currentTrackingPage - 1) * trackingPageSize,
    currentTrackingPage * trackingPageSize,
  ), [currentTrackingPage, filteredGroups, trackingPageSize]);
  const pasteTotalPages = Math.max(1, Math.ceil(pasteRows.length / pastePageSize));
  const currentPastePage = Math.min(pastePage, pasteTotalPages);
  const visiblePasteRows = useMemo(() => pasteRows.slice(
    (currentPastePage - 1) * pastePageSize,
    currentPastePage * pastePageSize,
  ), [currentPastePage, pastePageSize, pasteRows]);

  useEffect(() => setTrackingPage((page) => Math.min(page, trackingTotalPages)), [trackingTotalPages]);
  useEffect(() => setPastePage((page) => Math.min(page, pasteTotalPages)), [pasteTotalPages]);

  async function loadData() {
    setLoading(true); setError('');
    try {
      const [lsxData, requestData] = await Promise.all([layLsxDatNgoai(), layPhieuDatNgoai()]);
      setImported(lsxData); setRequests(requestData);
      setExpanded((current) => current.size ? current : new Set(lsxData.slice(0, 5).map((item) => item.lenh_san_xuat)));
      try {
        const supplierData = await layNhaCungCapDatNgoai();
        setSuppliers(supplierData);
      } catch {
        setSuppliers([]);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không tải được dữ liệu Đặt ngoài.');
    } finally { setLoading(false); }
  }
  useEffect(() => { void loadData(); }, []);

  function exportCsv() {
    const rows = [['Lệnh sản xuất', 'Nội dung', 'Khách hàng', 'Nhà cung cấp', 'Tiến độ', 'Hạn giao', 'Trạng thái'], ...filteredGroups.map((group) => [group.id, group.title, group.customer, group.supplier, `${group.progress}%`, group.due, group.status])];
    const content = '\ufeff' + rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'theo-doi-dat-ngoai.csv'; link.click(); URL.revokeObjectURL(url);
  }

  function previewPaste() {
    setError('');
    try { const rows = parseExcel(pasteText); if (!rows.length) throw new Error('Hãy dán ít nhất một dòng từ Excel.'); setPasteRows(rows); setPastePage(1); }
    catch (reason) { setPasteRows([]); setError(reason instanceof Error ? reason.message : 'Dữ liệu Excel không hợp lệ.'); }
  }
  async function importRows() {
    setLoading(true); setError('');
    try {
      const submittedRows = [...pasteRows];
      const result = await nhapLsxDatNgoai(submittedRows);
      await loadData();
      setExpanded((current) => new Set([...current, ...submittedRows.map((row) => row.lenh_san_xuat)]));
      if (result.errors.length) {
        const failedIndexes = new Set(result.errors.map((item) => item.dong - 1));
        const failedRows = submittedRows.filter((_, index) => failedIndexes.has(index));
        setPasteRows(failedRows); setPastePage(1);
        setPasteText(failedRows.map((row) => [row.lenh_san_xuat, row.ma_vach, row.ma_hang, row.ten_hang,
          row.so_luong, row.dvt, row.so_po || '', row.ma_khach_hang || '', row.ki_han_khach_hang || '',
          row.muc_do_uu_tien || '', row.ghi_chu || ''].join('\t')).join('\n'));
        setError(`Đã thêm ${result.so_dong} dòng hợp lệ; giữ lại ${result.co_loi} dòng lỗi để sửa và nhập lại. ${result.errors.map((item) => `Dòng ${item.dong} (${item.ma}): ${item.loi}`).join(' · ')}`);
        onNotify(`Đã nạp ${result.so_dong} mã hàng; còn ${result.co_loi} dòng lỗi.`);
      } else {
        setShowPaste(false); setPasteRows([]); setPasteText('');
        onNotify(`Đã nạp ${result.so_dong} mã hàng thuộc ${result.so_lsx} LSX.`);
      }
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không nạp được LSX.'); }
    finally { setLoading(false); }
  }
  async function submitCreate(event: FormEvent) {
    event.preventDefault();
    if (!createLines.size) { setError('Hãy chọn ít nhất một mã hàng.'); return; }
    setLoading(true); setError('');
    try {
      const result = await taoBaoGiaDatNgoai({ ma_vach: [...createLines], can_xac_nhan_ky_thuat: needsTechnical, noi_dung_ky_thuat: technicalNote || undefined });
      setShowCreate(false); setCreateLsx(''); setCreateLines(new Set()); setNeedsTechnical(false); setTechnicalNote('');
      await loadData(); onNotify(`Đã tạo ${result.so_phieu} phiếu đặt ngoài từ dữ liệu LSX.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tạo được phiếu đặt ngoài.'); }
    finally { setLoading(false); }
  }

  const activeAtSupplier = requests.filter((item) => ['DA_DAT', 'DANG_LAM'].includes(item.trang_thai)).length;
  const waitingReceipt = requests.filter((item) => item.trang_thai === 'DA_NHAN').length;
  const quoteRequests = requests.filter((item) => ['NHAP', 'CHO_XAC_NHAN_KY_THUAT', 'DANG_BAO_GIA', 'CHO_DUYET'].includes(item.trang_thai));
  const placedOrders = requests.filter((item) => ['DA_DUYET', 'DA_DAT', 'DANG_LAM', 'DA_NHAN', 'HOAN_THANH'].includes(item.trang_thai));
  const selectedCreateOrder = imported.find((item) => item.lenh_san_xuat === createLsx);
  const detailLsx = imported.find((item) => item.lenh_san_xuat === detailLsxId);
  const detailRequest = requests.find((item) => item.lenh_san_xuat === detailLsxId && item.trang_thai !== 'HUY')
    || requests.find((item) => item.lenh_san_xuat === detailLsxId);
  const outsourcePermission = currentUser.quyen?.dat_ngoai as { sua?: boolean; duyet?: boolean } | undefined;
  const canCancelOutsource = outsourcePermission?.sua === true;
  const canApproveOutsource = outsourcePermission?.duyet === true;

  return <div className="space-y-4">
    <header className="bg-white border border-[#DCE1EC] rounded p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"><div><h1 className="text-[20px] sm:text-[23px] font-bold flex items-center gap-2"><span className="material-symbols-outlined text-[#283A97] text-[28px]">build_circle</span>Theo dõi Đặt ngoài</h1><p className="text-[13px] text-[#59627A] mt-1">Chức năng riêng của Bộ phận Kinh doanh để quản trị tiến độ, chất lượng giao nhận và hạn mức phê duyệt.</p></div><div className="flex flex-wrap gap-2"><button onClick={exportCsv} className="min-h-10 px-4 border rounded font-bold flex items-center gap-2"><span className="material-symbols-outlined">file_download</span>XUẤT CSV</button><button onClick={() => { setShowPaste(true); setPasteRows([]); setError(''); }} className="min-h-10 px-4 border border-[#283A97] text-[#283A97] rounded font-bold flex items-center gap-2"><span className="material-symbols-outlined">content_paste</span>NẠP LSX TỪ EXCEL</button><button onClick={() => setShowCreate(true)} className="min-h-10 px-4 bg-[#283A97] text-white rounded font-bold flex items-center gap-2"><span className="material-symbols-outlined">add</span>THÊM MỚI</button></div></header>
    {error && <div role="alert" className="p-3 bg-[#FDECEE] border-l-4 border-[#EE202E] text-[#C4141F] text-[12px]">{error}</div>}
    <nav className="bg-white border-b rounded-t px-2 pt-2 flex overflow-x-auto">{TABS.map((item) => { const badge = item.key === 'tracking' ? groups.length : item.key === 'tickets' ? requests.length : item.key === 'quotes' ? quoteRequests.length : item.key === 'orders' ? placedOrders.length : suppliers.length; return <button key={item.key} onClick={() => setTab(item.key)} className={`min-h-11 px-4 flex items-center gap-2 whitespace-nowrap border-b-2 font-condensed text-[12px] font-bold ${tab === item.key ? 'border-[#283A97] text-[#283A97]' : 'border-transparent text-[#59627A]'}`}><span className="material-symbols-outlined text-[18px]">{item.icon}</span>{item.label}<span className="pill p-info px-2 py-0.5 text-[10px]">{badge}</span></button>; })}</nav>

    {tab === 'tracking' && <Pagination total={filteredGroups.length} page={currentTrackingPage} pageSize={trackingPageSize} onPageChange={setTrackingPage} onPageSizeChange={(size) => { setTrackingPageSize(size); setTrackingPage(1); }} label="lệnh sản xuất" />}

    {tab === 'tracking' && <><section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">{[
      ['layers', 'TỔNG LỆNH GIA CÔNG NGOÀI', String(groups.length), 'lệnh', 'Dữ liệu theo LSX', false],
      ['precision_manufacturing', 'ĐANG GIA CÔNG TẠI NCC', String(activeAtSupplier), 'đơn', 'Theo dõi trực tiếp nhà cung cấp', false],
      ['warning', 'TRỄ TIẾN ĐỘ / BÁO ĐỘNG', String(groups.filter((item) => item.danger).length), 'đơn', 'Cần đôn đốc tiến độ', true],
      ['fact_check', 'ĐÃ NHẬN / CHỜ HOÀN THÀNH', String(waitingReceipt), 'lô', 'Chờ xác nhận hoàn thành', false],
    ].map(([icon, title, value, unit, note, danger]) => <article key={String(title)} className={`bg-white border rounded p-4 ${danger ? 'border-[#F9B9BE] border-l-4 border-l-[#EE202E]' : 'border-[#DCE1EC]'}`}><div className={`flex justify-between text-[12px] font-bold ${danger ? 'text-[#C4141F]' : 'text-[#59627A]'}`}><span>{title}</span><span className="material-symbols-outlined">{icon}</span></div><div className="mt-2"><strong className={`font-mono text-[24px] ${danger ? 'text-[#C4141F]' : 'text-[#283A97]'}`}>{value}</strong> <span>{unit}</span></div><p className="mt-2 pt-2 border-t text-[12px] text-[#59627A]">{note}</p></article>)}</section>
      <section className="bg-white border rounded p-3 space-y-3"><div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2"><label className="text-[11px] font-bold">TỪ NGÀY<input type="date" value={draftFilters.from} onChange={(event) => setDraftFilters({ ...draftFilters, from: event.target.value })} className="mt-1 w-full h-10 px-2 border rounded font-normal" /></label><label className="text-[11px] font-bold">ĐẾN NGÀY<input type="date" value={draftFilters.to} onChange={(event) => setDraftFilters({ ...draftFilters, to: event.target.value })} className="mt-1 w-full h-10 px-2 border rounded font-normal" /></label><label className="text-[11px] font-bold">XƯỞNG / BỘ PHẬN<select value={draftFilters.workshop} onChange={(event) => setDraftFilters({ ...draftFilters, workshop: event.target.value })} className="mt-1 w-full h-10 px-2 border rounded bg-white font-normal"><option value="">Tất cả</option>{[...new Set(groups.map((group) => group.workshop))].map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-[11px] font-bold">NHÀ CUNG CẤP<select value={draftFilters.supplier} onChange={(event) => setDraftFilters({ ...draftFilters, supplier: event.target.value })} className="mt-1 w-full h-10 px-2 border rounded bg-white font-normal"><option value="">Tất cả</option>{[...new Set(groups.map((group) => group.supplier))].map((value) => <option key={value}>{value}</option>)}</select></label><label className="text-[11px] font-bold">TRẠNG THÁI<select value={draftFilters.status} onChange={(event) => setDraftFilters({ ...draftFilters, status: event.target.value })} className="mt-1 w-full h-10 px-2 border rounded bg-white font-normal"><option value="">Tất cả</option><option value="late">Đang trễ</option><option value="on-time">Trong hạn</option></select></label><label className="text-[11px] font-bold">TÌM LSX, MÃ HÀNG, PO<input value={draftFilters.query} onChange={(event) => setDraftFilters({ ...draftFilters, query: event.target.value })} className="mt-1 w-full h-10 px-2 border rounded font-normal" /></label></div><div className="pt-2 border-t flex justify-between"><span className="text-[12px] text-[#59627A]">Hiển thị <strong>{visibleGroups.length} lệnh sản xuất</strong></span><div className="flex gap-2"><button onClick={() => { setDraftFilters(DEFAULT_FILTERS); setFilters(DEFAULT_FILTERS); }} className="min-h-9 px-3 border rounded font-bold text-[11px]">XOÁ LỌC</button><button onClick={() => setFilters(draftFilters)} className="min-h-9 px-4 bg-[#283A97] text-white rounded font-bold text-[11px]">ÁP DỤNG LỌC</button></div></div></section>
      <section className="bg-white border rounded overflow-hidden"><div className="p-3 bg-[#F4F6FA] border-b flex justify-between"><div><h2 className="font-bold text-[15px]">BẢNG TIẾN ĐỘ THEO LỆNH SẢN XUẤT</h2><span className="text-[12px] text-[#59627A]">Bấm mũi tên để bung/gập mã hàng gia công</span></div></div><div className="overflow-x-auto"><table className="w-full min-w-[1150px] text-[12px]"><thead className="bg-[#F4F6FA]"><tr>{['#', 'LỆNH SẢN XUẤT / NỘI DUNG', 'KHÁCH HÀNG', 'NHÀ CUNG CẤP', 'SỐ LƯỢNG / TIẾN ĐỘ', 'HẠN GIAO', 'TRẠNG THÁI', 'THAO TÁC'].map((head) => <th key={head} className="p-3 text-left">{head}</th>)}</tr></thead><tbody>{visibleGroups.flatMap((group) => { const parent = <tr key={group.id} className={`border-t align-top ${group.danger ? 'bg-[#FDECEE]/45 border-l-4 border-l-[#EE202E]' : ''}`}><td className="p-3"><button onClick={() => setExpanded((current) => { const next = new Set(current); if (next.has(group.id)) next.delete(group.id); else next.add(group.id); return next; })} className="w-8 h-8 border rounded"><span className={`material-symbols-outlined text-[17px] ${expanded.has(group.id) ? 'rotate-90' : ''}`}>chevron_right</span></button></td><td className="p-3"><div className="flex gap-2"><strong className="font-mono text-[#283A97]">#{group.id}</strong><StatusPill danger={group.danger}>{group.priority}</StatusPill></div><strong className="block mt-1">{group.title}</strong><span className="text-[11px] text-[#59627A]">{group.workshop} · Điều độ: {group.coordinator}</span></td><td className="p-3"><strong>{group.customer}</strong><span className="block font-mono text-[11px]">{group.po}</span></td><td className="p-3"><strong>{group.supplier}</strong></td><td className="p-3 text-center"><strong>{group.quantity}</strong><div className="h-1.5 mt-2 bg-[#DCE1EC] rounded-full"><div className="h-full bg-[#283A97]" style={{ width: `${group.progress}%` }} /></div><span className="text-[10px]">{group.progress}%</span></td><td className="p-3 text-center"><span>{group.due}</span><strong className={`block ${group.danger ? 'text-[#C4141F]' : 'text-[#283A97]'}`}>{group.timing}</strong></td><td className="p-3"><StatusPill danger={group.danger}>{group.status}</StatusPill><span className="block mt-1 text-[10px]">{group.note}</span></td><td className="p-3"><button onClick={() => setDetailLsxId(group.id)} className="min-h-8 px-3 border rounded font-bold text-[10px]">XEM CHI TIẾT</button></td></tr>; const children = expanded.has(group.id) ? group.lines.map((line) => <tr key={`${group.id}-${line.code}`} className="border-t bg-[#EEF0F9]/45"><td className="p-3 text-center">↳</td><td className="p-3"><strong className="font-mono text-[#283A97]">{line.code}</strong><span className="pill p-info ml-2 px-2 py-0.5 text-[9px]">{line.material}</span><span className="block mt-1">{line.name}</span></td><td /><td className="p-3">{line.process}</td><td className="p-3 text-center">{line.quantity}</td><td className="p-3 text-center">{line.timing}</td><td className="p-3"><StatusPill danger={line.danger}>{line.status}</StatusPill></td><td /></tr>) : []; return [parent, ...children]; })}</tbody></table></div></section><SupplierCards suppliers={suppliers} onNotify={onNotify} /></>}

    {tab === 'tickets' && <TicketTable requests={requests} onView={setDetailLsxId} />}
    {tab === 'quotes' && <QuoteTable requests={quoteRequests} onView={setDetailLsxId} />}
    {tab === 'orders' && <OrderTable requests={placedOrders} onView={setDetailLsxId} />}
    {tab === 'suppliers' && <SupplierCards suppliers={suppliers} onNotify={onNotify} />}

    {showPaste && <div className="fixed inset-0 z-[90] bg-black/45 flex items-center justify-center p-3"><div className="bg-white w-full max-w-6xl max-h-[94vh] overflow-y-auto rounded shadow-xl"><header className="p-4 border-b flex justify-between"><div><h2 className="font-bold">NẠP LSX VÀ MÃ HÀNG TỪ EXCEL</h2><p className="mt-1 text-[12px] text-[#59627A]">Một luồng xem trước và nhập dòng hợp lệ; dữ liệu nguồn được chuẩn hóa trước khi lưu.</p></div><button onClick={() => setShowPaste(false)} disabled={loading} className="w-10 h-10 disabled:opacity-40"><span className="material-symbols-outlined">close</span></button></header><div className="p-4 space-y-3"><div className="p-3 bg-[#EEF0F9] text-[12px] rounded"><strong>Luồng nhập dùng chung:</strong> dán dữ liệu LSX, xem trước, nhận lỗi theo dòng và nhập lại các dòng lỗi. Có thể dán bảng nguồn hoặc mẫu chuẩn 11 cột.</div>{error && <div role="alert" className="p-3 bg-[#FDECEE] border-l-4 border-[#EE202E] text-[#C4141F] text-[12px]">{error}</div>}<textarea value={pasteText} onChange={(event) => { setPasteText(event.target.value); setPasteRows([]); setPastePage(1); setError(''); }} rows={8} className="w-full p-3 border rounded font-mono text-[12px]" placeholder={'Dán dữ liệu theo mẫu 11 cột, hoặc dán vùng bảng nguồn LSX có tiêu đề...'} />{pasteRows.length > 0 && <Pagination total={pasteRows.length} page={currentPastePage} pageSize={pastePageSize} onPageChange={setPastePage} onPageSizeChange={(size) => { setPastePageSize(size); setPastePage(1); }} />}{pasteRows.length > 0 && <div className="overflow-x-auto border rounded"><table className="w-full min-w-[950px] text-[12px]"><thead className="bg-[#F4F6FA]"><tr>{['LSX', 'MÃ VẠCH', 'MÃ HÀNG', 'TÊN HÀNG', 'SL', 'ĐVT', 'PO / KH', 'NGÀY NHẬN', 'HẠN GIAO', 'TÌNH TRẠNG'].map((head) => <th key={head} className="p-3 text-left">{head}</th>)}</tr></thead><tbody>{visiblePasteRows.map((row) => <tr key={row.ma_vach} className="border-t"><td className="p-3 font-mono font-bold">{row.lenh_san_xuat}</td><td className="p-3 font-mono">{row.ma_vach}</td><td className="p-3 font-mono">{row.ma_hang}</td><td className="p-3">{row.ten_hang}</td><td className="p-3">{row.so_luong}</td><td className="p-3">{row.dvt}</td><td className="p-3">{row.so_po || '—'} / {row.ten_khach_hang_chup || row.ma_khach_hang || '—'}</td><td className="p-3">{displayDate(row.ngay_nhan_lenh)}</td><td className="p-3">{displayDate(row.ki_han_khach_hang)}</td><td className="p-3">{row.trang_thai_don || '—'}</td></tr>)}</tbody></table></div>}</div><footer className="p-4 border-t flex justify-end gap-2"><button onClick={() => setShowPaste(false)} disabled={loading} className="min-h-11 px-4 border rounded font-bold disabled:opacity-40">HỦY</button><button onClick={previewPaste} disabled={loading} className="min-h-11 px-4 border border-[#283A97] text-[#283A97] rounded font-bold disabled:opacity-40">ĐỌC & XEM TRƯỚC</button><button disabled={!pasteRows.length || loading} onClick={() => void importRows()} className="min-h-11 px-4 bg-[#283A97] text-white rounded font-bold disabled:opacity-40">{loading ? 'ĐANG LƯU…' : `NẠP ${pasteRows.length || ''} DÒNG`}</button></footer></div></div>}
    {showCreate && <CreateRequestModal imported={imported} selectedOrder={selectedCreateOrder} createLsx={createLsx} createLines={createLines} needsTechnical={needsTechnical} technicalNote={technicalNote} loading={loading} onSelectLsx={(value) => { setCreateLsx(value); setCreateLines(new Set()); }} onToggleLine={(barcode) => setCreateLines((current) => { const next = new Set(current); if (next.has(barcode)) next.delete(barcode); else next.add(barcode); return next; })} onNeedsTechnical={setNeedsTechnical} onTechnicalNote={setTechnicalNote} onClose={() => setShowCreate(false)} onSubmit={submitCreate} />}
    {detailLsx && <OutsourceDetailModal key={`${detailLsx.lenh_san_xuat}-${detailRequest?.id || 'lsx'}`} lsx={detailLsx} request={detailRequest} allRequests={requests} canApprove={canApproveOutsource} canCancel={canCancelOutsource} canChooseSupplier={canCancelOutsource} suppliers={suppliers} onRequestChanged={loadData} onNotify={onNotify} onClose={() => setDetailLsxId(null)} />}
  </div>;
}
