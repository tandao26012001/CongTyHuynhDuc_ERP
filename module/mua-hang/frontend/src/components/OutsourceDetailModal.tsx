import { FormEvent, useEffect, useMemo, useState } from 'react';
import { chonNhaCungCapDatNgoai, chuyenTrangThaiDatNgoai, LsxDatNgoai, NhaCungCapDanhMuc, PhieuDatNgoai, xacNhanKyThuatDatNgoai } from '../api/client';

const STATUS_LABELS: Record<string, string> = {
  CHO_XAC_NHAN_KY_THUAT: 'Chờ xác nhận kỹ thuật',
  DANG_BAO_GIA: 'Đang xử lý / Báo giá',
  CHO_DUYET: 'Chờ duyệt',
  DA_DUYET: 'Đã duyệt / Chờ đặt',
  DA_DAT: 'Đã đặt',
  DANG_LAM: 'Đang làm',
  DA_NHAN: 'Đã nhận',
  HOAN_THANH: 'Hoàn thành',
  HUY: 'Đã huỷ',
  CHUA_HOAN_THANH: 'Chưa hoàn thành',
  TRE_CHUA_HOAN_THANH: 'Trễ - chưa hoàn thành',
};

function statusLabel(value: string | null | undefined) {
  return value ? STATUS_LABELS[value] || value : 'Chưa cập nhật';
}

function displayDate(value: string | null | undefined, includeTime = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', includeTime
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function money(value: number | null | undefined) {
  return value == null ? '—' : `${Number(value).toLocaleString('vi-VN')} đ`;
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="p-3 bg-[#F4F6FA] rounded min-h-16"><span className="block text-[11px] font-bold text-[#59627A]">{label}</span><strong className={`block mt-1 text-[13px] ${mono ? 'font-mono' : ''}`}>{value}</strong></div>;
}

interface Props {
  lsx: LsxDatNgoai;
  request?: PhieuDatNgoai;
  onClose: () => void;
  canConfirmTechnical?: boolean;
  canCancel?: boolean;
  canChooseSupplier?: boolean;
  suppliers?: NhaCungCapDanhMuc[];
  onRequestChanged?: () => Promise<void>;
  onNotify?: (message: string) => void;
}

export function OutsourceDetailModal({ lsx, request, onClose, canConfirmTechnical = false, canCancel = false, canChooseSupplier = false, suppliers = [], onRequestChanged, onNotify }: Props) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [confirming, setConfirming] = useState(false);
  const [actionError, setActionError] = useState('');
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(request?.id_ncc || '');
  const requestLines = useMemo(
    () => new Map((request?.dong || []).map((line) => [line.ma_vach, line])),
    [request],
  );
  const totalPages = Math.max(1, Math.ceil(lsx.dong.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleLines = lsx.dong.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const from = lsx.dong.length ? (currentPage - 1) * pageSize + 1 : 0;
  const to = Math.min(currentPage * pageSize, lsx.dong.length);

  useEffect(() => setSelectedSupplier(request?.id_ncc || ''), [request?.id_ncc]);

  async function confirmTechnical() {
    if (!request || confirming) return;
    setConfirming(true);
    setActionError('');
    try {
      await xacNhanKyThuatDatNgoai(request);
      await onRequestChanged?.();
      onNotify?.(`Đã xác nhận kỹ thuật phiếu ${request.id}.`);
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'Không xác nhận được phiếu.');
    } finally {
      setConfirming(false);
    }
  }

  async function cancelRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!request || !cancelReason.trim() || confirming) return;
    setConfirming(true);
    setActionError('');
    try {
      await chuyenTrangThaiDatNgoai(request, 'HUY', cancelReason.trim());
      await onRequestChanged?.();
      setShowCancelForm(false);
      onNotify?.(`Đã hủy phiếu ${request.id}. Lý do: ${cancelReason.trim()}`);
      setCancelReason('');
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'Không hủy được phiếu.');
    } finally {
      setConfirming(false);
    }
  }

  async function saveSupplier() {
    if (!request || !selectedSupplier || confirming) return;
    setConfirming(true);
    setActionError('');
    try {
      await chonNhaCungCapDatNgoai(request, selectedSupplier);
      await onRequestChanged?.();
      onNotify?.(`Đã lưu nhà cung cấp cho phiếu ${request.id}.`);
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'Không lưu được nhà cung cấp.');
    } finally {
      setConfirming(false);
    }
  }

  return <div className="fixed inset-0 z-[100] bg-black/45 flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-labelledby="outsource-detail-title">
    <div className="bg-white w-full max-w-7xl max-h-[95vh] overflow-y-auto rounded shadow-xl">
      <header className="sticky top-0 z-10 bg-white p-4 border-b flex items-start justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-[#59627A]">CHI TIẾT ĐẶT NGOÀI</span>
          <h2 id="outsource-detail-title" className="font-bold text-[18px] text-[#283A97] font-mono">{request?.id || lsx.lenh_san_xuat}</h2>
          <p className="mt-1 text-[12px] text-[#59627A]">LSX: <strong className="font-mono">{lsx.lenh_san_xuat}</strong> · {lsx.dong.length} mã hàng</p>
        </div>
        <button type="button" onClick={onClose} className="w-11 h-11 border rounded" aria-label="Đóng chi tiết"><span className="material-symbols-outlined">close</span></button>
      </header>

      <div className="p-4 space-y-5">
        {actionError && <div role="alert" className="p-3 bg-[#FDECEE] border-l-4 border-[#EE202E] text-[#C4141F] text-[12px]">{actionError}</div>}
        {request?.trang_thai === 'HUY' && <div className="p-3 border border-[#F2CD82] bg-[#FFF7E6] rounded text-[13px]"><strong>Phiếu đã hủy.</strong> Lý do: {request.ly_do_huy || '—'}{(() => { const entry = request.lich_su?.find((item) => item.trang_thai_moi === 'HUY'); return entry ? <span className="block mt-1 text-[12px]">Người hủy: <strong>{entry.nguoi_thuc_hien}</strong> · Thời điểm: <strong>{displayDate(entry.thoi_diem, true)}</strong></span> : null; })()}</div>}
        {showCancelForm && <form onSubmit={(event) => void cancelRequest(event)} className="p-4 border border-[#F2CD82] bg-[#FFF7E6] rounded space-y-3">
          <label className="block text-[12px] font-bold">LÝ DO HỦY PHIẾU *<textarea required minLength={1} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} rows={3} className="mt-1 w-full p-3 border rounded font-normal bg-white" placeholder="Nhập lý do hủy để lưu vào lịch sử phiếu." /></label>
          <div className="flex justify-end gap-2"><button type="button" disabled={confirming} onClick={() => { setShowCancelForm(false); setActionError(''); }} className="min-h-10 px-4 border rounded font-bold">ĐÓNG</button><button type="submit" disabled={confirming || !cancelReason.trim()} className="min-h-10 px-4 bg-[#283A97] text-white rounded font-bold disabled:opacity-50">{confirming ? 'ĐANG HỦY…' : 'XÁC NHẬN HỦY'}</button></div>
        </form>}
        <section>
          <h3 className="font-bold text-[15px] mb-3">THÔNG TIN LỆNH SẢN XUẤT</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Info label="KHÁCH HÀNG" value={lsx.ten_khach_hang_chup || lsx.ma_khach_hang || '—'} />
            <Info label="SỐ PO / SỐ SO" value={`${lsx.so_po || '—'} / ${lsx.so_so || '—'}`} mono />
            <Info label="XƯỞNG / BỘ PHẬN" value={lsx.ten_bo_phan_chup || lsx.ma_bo_phan || '—'} />
            <Info label="TRẠNG THÁI NGUỒN" value={statusLabel(lsx.trang_thai_don)} />
            <Info label="NGÀY NHẬN LỆNH" value={displayDate(lsx.ngay_nhan_lenh)} mono />
            <Info label="NGÀY SO" value={displayDate(lsx.ngay_so)} mono />
            <Info label="DỰ KIẾN GIAO" value={displayDate(lsx.ki_han_khach_hang)} mono />
            <Info label="GHI CHÚ LSX" value={lsx.ghi_chu || '—'} />
          </div>
        </section>

        <section>
          <h3 className="font-bold text-[15px] mb-3">THÔNG TIN PHIẾU ĐẶT NGOÀI</h3>
          {!request ? <div className="p-4 border bg-[#EEF0F9] rounded text-[13px]">LSX này chưa được lập phiếu báo giá/đặt ngoài.</div> : <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Info label="SỐ PHIẾU" value={request.id} mono />
              <Info label="TRẠNG THÁI" value={statusLabel(request.trang_thai)} />
              <Info label="NHÀ CUNG CẤP" value={request.ten_ncc_chup || 'Chưa chọn'} />
              <Info label="TỔNG GIÁ TRỊ" value={money(request.tong_gia_tri)} mono />
              <Info label="NGƯỜI LẬP" value={request.nguoi_lap || '—'} />
              <Info label="NGÀY LẬP" value={displayDate(request.ngay_lap)} mono />
              <Info label="KỲ HẠN" value={displayDate(request.ky_han)} mono />
              <Info label="PHIÊN BẢN" value={String(request.phien_ban)} mono />
            </div>
            {(request.can_xac_nhan_ky_thuat || request.noi_dung_ky_thuat || request.ghi_chu) && <div className="mt-3 grid md:grid-cols-2 gap-3 text-[13px]">
              <div className="p-3 border rounded"><strong className="block text-[11px] text-[#59627A]">XÁC NHẬN KỸ THUẬT</strong><span>{request.can_xac_nhan_ky_thuat ? request.noi_dung_ky_thuat || 'Có yêu cầu xác nhận' : 'Không yêu cầu'}</span></div>
              <div className="p-3 border rounded"><strong className="block text-[11px] text-[#59627A]">GHI CHÚ PHIẾU</strong><span>{request.ghi_chu || '—'}</span></div>
            </div>}
          </>}
        </section>

        {canChooseSupplier && request?.trang_thai === 'DANG_BAO_GIA' && <section className="p-4 border border-[#DCE1EC] rounded bg-white">
          <h3 className="font-bold text-[14px]">CHỌN NHÀ CUNG CẤP GIA CÔNG</h3>
          <p className="mt-1 text-[12px] text-[#59627A]">Kinh doanh chọn NCC hoạt động; lựa chọn được lưu vào lịch sử phiếu. Form báo giá và so sánh NCC sẽ thực hiện ở bước sau.</p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="min-w-64 flex-1 text-[12px] font-bold">NHÀ CUNG CẤP *<select value={selectedSupplier} onChange={(event) => setSelectedSupplier(event.target.value)} className="mt-1 w-full min-h-11 px-3 border rounded bg-white font-normal"><option value="">-- Chọn NCC gia công --</option>{suppliers.map((item) => <option key={item.ma} value={item.ma}>{item.ma_ncc} · {item.ten}{item.da_phe_duyet ? '' : ' · Chưa phê duyệt'}</option>)}</select></label>
            <button type="button" disabled={!selectedSupplier || confirming || selectedSupplier === request.id_ncc} onClick={() => void saveSupplier()} className="min-h-11 px-5 rounded bg-[#283A97] text-white font-bold disabled:opacity-50">{confirming ? 'ĐANG LƯU…' : 'LƯU NHÀ CUNG CẤP'}</button>
          </div>
          {suppliers.length === 0 && <p className="mt-2 text-[12px] text-[#C4141F]">Không tải được NCC gia công đang hoạt động. Kiểm tra danh mục NCC.</p>}
        </section>}

        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="font-bold text-[15px]">DANH SÁCH MÃ HÀNG</h3><span className="text-[12px] text-[#59627A]">Hiển thị {from}–{to} / {lsx.dong.length} dòng</span></div>
            <label className="text-[12px]">Số dòng/trang <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="ml-2 h-10 px-2 border rounded bg-white"><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label>
          </div>
          <div className="border rounded overflow-x-auto">
            <table className="w-full min-w-[1250px] text-[12px]">
              <thead className="bg-[#F4F6FA]"><tr>{['STT', 'MÃ VẠCH', 'MÃ HÀNG', 'TÊN HÀNG', 'BẢN VẼ', 'CÔNG ĐOẠN', 'SL / ĐVT', 'ĐƠN GIÁ', 'THÀNH TIỀN', 'KỲ HẠN', 'TRẠNG THÁI'].map((head) => <th key={head} className="p-3 text-left">{head}</th>)}</tr></thead>
              <tbody>{visibleLines.map((line, index) => { const quoteLine = requestLines.get(line.ma_vach); return <tr key={line.ma_vach} className="border-t align-top"><td className="p-3 font-mono">{(currentPage - 1) * pageSize + index + 1}</td><td className="p-3 font-mono">{line.ma_vach}</td><td className="p-3 font-mono font-bold text-[#283A97]">{line.ma_hang}</td><td className="p-3 min-w-56">{line.ten_hang}<span className="block text-[10px] text-[#59627A]">{line.ghi_chu || ''}</span></td><td className="p-3 font-mono">{line.ma_ban_ve || '—'}</td><td className="p-3">{line.ma_cong_doan || '—'}</td><td className="p-3 font-mono">{Number(line.so_luong).toLocaleString('vi-VN')} {line.dvt}</td><td className="p-3 font-mono">{money(quoteLine?.don_gia)}</td><td className="p-3 font-mono font-bold">{quoteLine?.don_gia == null ? '—' : money(Number(line.so_luong) * Number(quoteLine.don_gia))}</td><td className="p-3 font-mono">{displayDate(quoteLine?.ky_han || request?.ky_han)}</td><td className="p-3"><span className="pill p-info px-2 py-1 text-[10px]">{statusLabel(quoteLine?.trang_thai || request?.trang_thai)}</span></td></tr>; })}</tbody>
            </table>
          </div>
          {totalPages > 1 && <div className="mt-3 flex items-center justify-end gap-2 text-[12px]"><button type="button" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="h-10 px-3 border rounded disabled:opacity-40">TRƯỚC</button><strong>Trang {currentPage}/{totalPages}</strong><button type="button" onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="h-10 px-3 border rounded disabled:opacity-40">SAU</button></div>}
        </section>

        {request && <section>
          <h3 className="font-bold text-[15px] mb-3">LỊCH SỬ XỬ LÝ</h3>
          {!request.lich_su?.length ? <div className="p-4 border rounded text-[13px] text-[#59627A]">Chưa có lịch sử xử lý.</div> : <div className="border rounded divide-y">{request.lich_su.map((item, index) => <div key={`${item.thoi_diem}-${index}`} className="p-3 grid md:grid-cols-[170px_1fr_180px] gap-2 text-[12px]"><span className="font-mono">{displayDate(item.thoi_diem, true)}</span><div><strong>{statusLabel(item.trang_thai_cu)} → {statusLabel(item.trang_thai_moi)}</strong><span className="block text-[#59627A]">{item.noi_dung || '—'}</span></div><span>Thực hiện: <strong>{item.nguoi_thuc_hien}</strong></span></div>)}</div>}
        </section>}
      </div>

      <footer className="sticky bottom-0 bg-white p-4 border-t flex flex-wrap justify-between gap-2">
        {canConfirmTechnical && request?.trang_thai === 'CHO_XAC_NHAN_KY_THUAT' && <button type="button" disabled={confirming} onClick={() => void confirmTechnical()} className="min-h-11 px-5 bg-emerald-700 text-white rounded font-bold disabled:opacity-50">{confirming ? 'ĐANG XÁC NHẬN…' : 'XÁC NHẬN KỸ THUẬT'}</button>}
        {canCancel && request && request.trang_thai !== 'HUY' && <button type="button" disabled={confirming} onClick={() => { setShowCancelForm((shown) => !shown); setActionError(''); }} className="min-h-11 px-5 border border-[#EE202E] text-[#C4141F] rounded font-bold disabled:opacity-50">HỦY PHIẾU</button>}
        <button type="button" onClick={onClose} className="min-h-11 px-5 bg-[#283A97] text-white rounded font-bold">ĐÓNG</button>
      </footer>
    </div>
  </div>;
}
