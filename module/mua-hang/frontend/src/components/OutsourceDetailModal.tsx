import { FormEvent, useEffect, useMemo, useState } from 'react';
import { OutsourceLineDetails } from './OutsourceLineDetails';
import { HoSoTuongTacPanel } from './HoSoTuongTacPanel';
import { chuyenTrangThaiDatNgoai, layChiTietDatNgoaiDong, LsxDatNgoai, NhaCungCapDanhMuc, PhieuDatNgoai } from '../api/client';

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
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [loadedTechnicalCounts, setLoadedTechnicalCounts] = useState<Map<string, number>>(new Map());
  const requestLines = useMemo(
    () => new Map((request?.dong || []).map((line) => [line.ma_vach, line])),
    [request],
  );
  const totalPages = Math.max(1, Math.ceil(lsx.dong.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleLines = lsx.dong.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const from = lsx.dong.length ? (currentPage - 1) * pageSize + 1 : 0;
  const to = Math.min(currentPage * pageSize, lsx.dong.length);

  const supplierSummary = [...new Set((request?.dong || []).map((line) => line.ten_ncc_chup).filter(Boolean))].join(', ')
    || request?.ten_ncc_chup || 'Chưa chọn theo mã';
  const technicalLines = request?.dong.filter((line) => line.can_xac_nhan_ky_thuat) || [];
  const technicalHistoryLines = request?.dong.filter((line) =>
    line.can_xac_nhan_ky_thuat || Number(line.so_lan_xac_nhan_kt || 0) > 0) || [];
  const technicalConfirmationCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of request?.lich_su || []) {
      if (item.loai === 'XAC_NHAN_KY_THUAT' && item.ma_hang) {
        counts.set(item.ma_hang, (counts.get(item.ma_hang) || 0) + 1);
      }
    }
    return counts;
  }, [request]);
  useEffect(() => {
    let active = true;
    const lines = (request?.dong || []).filter((line) => line.can_xac_nhan_ky_thuat);
    if (!request || lines.length === 0) {
      setLoadedTechnicalCounts(new Map());
      return () => { active = false; };
    }
    void Promise.all(lines.map(async (line) => {
      const detail = await layChiTietDatNgoaiDong(request.id, line.id);
      return [line.id, detail.xac_nhan_ky_thuat.filter((item) => item.loai === 'MA_HANG').length] as const;
    })).then((entries) => {
      if (active) setLoadedTechnicalCounts(new Map(entries));
    }).catch(() => {
      if (active) setLoadedTechnicalCounts(new Map());
    });
    return () => { active = false; };
  }, [request?.id, request?.phien_ban]);
  const confirmedTechnicalLines = technicalLines.filter((line) => line.da_xac_nhan_kt).length;
  const pendingTechnicalLines = technicalLines.filter((line) => line.cho_xac_nhan_kt || !line.da_xac_nhan_kt).length;
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
        {request?.trang_thai === 'HUY' && <div className="p-3 border border-[#F2CD82] bg-[#FFF7E6] rounded text-[13px]"><strong>Phiếu đã hủy.</strong> Lý do: {request.ly_do_huy || '—'}{(() => { const entry = request.lich_su?.find((item) => item.trang_thai_moi === 'HUY'); return entry ? <span className="block mt-1 text-[12px]">Người hủy: <strong>{entry.ten_nguoi_thuc_hien || '—'}</strong> · Thời điểm: <strong>{displayDate(entry.thoi_diem, true)}</strong></span> : null; })()}</div>}
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
              <Info label="TRẠNG THÁI PHIẾU" value={`${statusLabel(request.trang_thai)}${request.trang_thai === 'CHO_XAC_NHAN_KY_THUAT' ? ` · còn ${pendingTechnicalLines} mã` : ''}`} />
              <Info label="NHÀ CUNG CẤP THEO MÃ" value={supplierSummary} />
              <Info label="TỔNG GIÁ TRỊ" value={money(request.tong_gia_tri)} mono />
              <Info label="NGƯỜI LẬP" value={request.ten_nguoi_lap || '—'} />
              <Info label="NGÀY LẬP" value={displayDate(request.ngay_lap)} mono />
              <Info label="HẠN GIAO SỚM NHẤT" value={displayDate(request.ky_han)} mono />
              <Info label="PHIÊN BẢN" value={String(request.phien_ban)} mono />
            </div>
            {(request.can_xac_nhan_ky_thuat || request.noi_dung_ky_thuat || request.ghi_chu) && <div className="mt-3 grid md:grid-cols-2 gap-3 text-[13px]">
              <div className="p-3 border rounded"><strong className="block text-[11px] text-[#59627A]">XÁC NHẬN KỸ THUẬT</strong><span>{request.can_xac_nhan_ky_thuat ? `${technicalLines.length} mã hàng cần xác nhận` : 'Không yêu cầu'}</span></div>
              <div className="p-3 border rounded"><strong className="block text-[11px] text-[#59627A]">GHI CHÚ PHIẾU</strong><span>{request.ghi_chu || '—'}</span></div>
            </div>}
          </>}
        </section>

        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="font-bold text-[15px]">DANH SÁCH MÃ HÀNG</h3><span className="text-[12px] text-[#59627A]">Hiển thị {from}–{to} / {lsx.dong.length} dòng</span></div>
            <label className="text-[12px]">Số dòng/trang <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="ml-2 h-10 px-2 border rounded bg-white"><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label>
          </div>
          <div className="border rounded overflow-x-auto">
            <table className="w-full min-w-[1250px] text-[12px]">
              <thead className="bg-[#F4F6FA]"><tr>{['STT', 'MÃ VẠCH', 'MÃ HÀNG', 'TÊN HÀNG', 'BẢN VẼ', 'NHÀ CUNG CẤP', 'SL / ĐVT', 'ĐƠN GIÁ', 'THÀNH TIỀN', 'KỲ HẠN', 'TRẠNG THÁI'].map((head) => <th key={head} className="p-3 text-left">{head}</th>)}</tr></thead>
              <tbody>{visibleLines.map((line, index) => { const quoteLine = requestLines.get(line.ma_vach); return <tr key={line.ma_vach} className="border-t align-top"><td className="p-3 font-mono">{(currentPage - 1) * pageSize + index + 1}</td><td className="p-3 font-mono">{line.ma_vach}</td><td className="p-3 font-mono font-bold text-[#283A97]">{quoteLine ? <><button type="button" onClick={() => setSelectedLineId(quoteLine.id)} className="underline">{line.ma_hang}</button>{quoteLine.cho_xac_nhan_kt ? <span className="block mt-1 text-[10px] text-amber-700">Yêu cầu mới · Chờ kỹ thuật xác nhận</span> : quoteLine.can_xac_nhan_ky_thuat && <span className={`block mt-1 text-[10px] ${quoteLine.da_xac_nhan_kt ? 'text-emerald-700' : 'text-amber-700'}`}>{quoteLine.da_xac_nhan_kt ? (canConfirmTechnical && request?.trang_thai !== 'HUY' && request?.trang_thai !== 'HOAN_THANH' ? 'Đã xác nhận · Bấm mã để xác nhận tiếp' : 'Đã xác nhận kỹ thuật') : 'Chờ xác nhận kỹ thuật'}</span>}</> : line.ma_hang}</td><td className="p-3 min-w-56">{line.ten_hang}<span className="block text-[10px] text-[#59627A]">{line.ghi_chu || ''}</span></td><td className="p-3 font-mono">{line.ma_ban_ve || '—'}</td><td className="p-3">{quoteLine?.ten_ncc_chup || '—'}</td><td className="p-3 font-mono">{Number(line.so_luong).toLocaleString('vi-VN')} {line.dvt}</td><td className="p-3 font-mono">{money(quoteLine?.don_gia)}</td><td className="p-3 font-mono font-bold">{quoteLine?.don_gia == null ? '—' : money(Number(line.so_luong) * Number(quoteLine.don_gia))}</td><td className="p-3 font-mono">{displayDate(quoteLine?.ky_han || request?.ky_han)}</td><td className="p-3"><span className="pill p-info px-2 py-1 text-[10px]">{statusLabel(quoteLine?.trang_thai || request?.trang_thai)}</span></td></tr>; })}</tbody>
            </table>
          </div>
          {totalPages > 1 && <div className="mt-3 flex items-center justify-end gap-2 text-[12px]"><button type="button" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="h-10 px-3 border rounded disabled:opacity-40">TRƯỚC</button><strong>Trang {currentPage}/{totalPages}</strong><button type="button" onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="h-10 px-3 border rounded disabled:opacity-40">SAU</button></div>}
        </section>

        {request && <section>
          <div className="mb-3">
            <h3 className="font-bold text-[15px]">LỊCH SỬ XÁC NHẬN KỸ THUẬT THEO MÃ</h3>
            <span className="text-[12px] text-[#59627A]">Bấm mã hàng để xem nội dung từng lần yêu cầu và xác nhận.</span>
          </div>
          {technicalHistoryLines.length === 0 ? <div className="p-4 border rounded text-[13px] text-[#59627A]">Phiếu không có mã cần xác nhận kỹ thuật.</div> : <div className="overflow-x-auto rounded border">
            <table className="w-full min-w-[760px] text-[12px]">
              <thead className="bg-[#F4F6FA]"><tr>{['STT', 'MÃ VẠCH', 'MÃ HÀNG', 'TÊN HÀNG', 'SỐ LẦN ĐÃ XÁC NHẬN KỸ THUẬT', 'TRẠNG THÁI XÁC NHẬN'].map((head) => <th key={head} className="p-3 text-left">{head}</th>)}</tr></thead>
              <tbody>{technicalHistoryLines.map((line, index) => {
                const count = Math.max(Number(line.so_lan_xac_nhan_kt || 0), technicalConfirmationCounts.get(line.ma_hang) || 0, loadedTechnicalCounts.get(line.id) || 0);
                const confirmed = !line.cho_xac_nhan_kt && (line.da_xac_nhan_kt || count > 0);
                const badgeColor = confirmed ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800';
                return <tr key={line.id} className="border-t bg-white">
                <td className="p-3 font-mono">{index + 1}</td>
                <td className="p-3 font-mono">{line.ma_vach}</td>
                <td className="p-3"><button type="button" onClick={() => setSelectedLineId(line.id)} className="font-mono font-bold text-[#283A97] underline">{line.ma_hang}</button></td>
                <td className="p-3">{line.ten_hang}</td>
                <td className="p-3"><strong className="inline-flex min-w-8 justify-center px-2 py-1 font-mono">{count}</strong></td>
                <td className="p-3"><span className={`inline-flex whitespace-nowrap rounded px-2 py-1 font-bold ${badgeColor}`}>{confirmed ? 'Đã xác nhận' : 'Chờ xác nhận'}</span></td>
              </tr>; })}</tbody>
            </table>
          </div>}
        </section>}

        {request && <HoSoTuongTacPanel loai="dat-ngoai" id={request.id} canEdit={canCancel} />}

        {request && <section>
          <h3 className="font-bold text-[15px] mb-3">LỊCH SỬ XỬ LÝ</h3>
          {!request.lich_su?.length ? <div className="p-4 border rounded text-[13px] text-[#59627A]">Chưa có lịch sử xử lý.</div> : <div className="border rounded divide-y">{request.lich_su.map((item, index) => <div key={`${item.thoi_diem}-${index}`} className="p-3 grid md:grid-cols-[170px_1fr_180px] gap-2 text-[12px]"><span className="font-mono">{displayDate(item.thoi_diem, true)}</span><div>{item.ma_hang && <span className="mb-1 inline-block rounded bg-[#EEF0F9] px-2 py-0.5 font-mono font-bold text-[#283A97]">Mã {item.ma_hang}</span>}<strong className="block">{item.loai === 'YEU_CAU_KY_THUAT' ? 'Gửi yêu cầu xác nhận kỹ thuật' : item.loai === 'XAC_NHAN_KY_THUAT' ? 'Kỹ thuật đã xác nhận · Chuyển sang báo giá' : `${statusLabel(item.trang_thai_cu)} → ${statusLabel(item.trang_thai_moi)}`}</strong><span className="block text-[#59627A]">{item.noi_dung || '—'}</span></div><span>Thực hiện: <strong>{item.ten_nguoi_thuc_hien || '—'}</strong></span></div>)}</div>}
        </section>}
      </div>

      <footer className="sticky bottom-0 bg-white p-4 border-t flex flex-wrap justify-between gap-2">
        {canConfirmTechnical && request?.trang_thai === 'CHO_XAC_NHAN_KY_THUAT' && <span className="text-[12px]">Đã xác nhận {confirmedTechnicalLines}/{technicalLines.length} mã cần xác nhận</span>}
        {canCancel && request && request.trang_thai !== 'HUY' && <button type="button" disabled={confirming} onClick={() => { setShowCancelForm((shown) => !shown); setActionError(''); }} className="min-h-11 px-5 border border-[#EE202E] text-[#C4141F] rounded font-bold disabled:opacity-50">HỦY PHIẾU</button>}
        <button type="button" onClick={onClose} className="min-h-11 px-5 bg-[#283A97] text-white rounded font-bold">ĐÓNG</button>
      </footer>
    </div>
    {request && selectedLineId && request.dong.find((item) => item.id === selectedLineId) && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 p-3" role="dialog" aria-modal="true" aria-labelledby="outsource-line-title">
      <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded bg-white shadow-xl">
        <header className="flex items-center justify-between gap-3 border-b p-4">
          <h2 id="outsource-line-title" className="text-[16px] font-bold text-[#283A97]">CHI TIẾT MÃ HÀNG {request.dong.find((item) => item.id === selectedLineId)?.ma_hang}</h2>
          <button type="button" onClick={() => setSelectedLineId(null)} className="h-10 w-10 rounded border" aria-label="Đóng chi tiết mã hàng"><span className="material-symbols-outlined">close</span></button>
        </header>
        <div className="overflow-y-auto p-4"><OutsourceLineDetails
          key={`${request.id}-${selectedLineId}`}
          idPhieu={request.id}
          idDong={selectedLineId}
          request={request}
          quoteLine={request.dong.find((item) => item.id === selectedLineId)!}
          suppliers={suppliers}
          canQuote={canChooseSupplier}
          onRequestChanged={onRequestChanged}
          onNotify={onNotify}
          canEdit={canCancel}
          canConfirm={canConfirmTechnical}
        /></div>
      </div>
    </div>}
  </div>;
}
