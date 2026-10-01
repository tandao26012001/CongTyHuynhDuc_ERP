import { useEffect, useState } from 'react';
import { capNhatYeuCauDongDatNgoai, chonNhaCungCapDatNgoai, taoBaoGiaDatNgoai, chuyenTrangThaiDatNgoai, guiDuyetDatNgoai, LsxDatNgoai, NhaCungCapDanhMuc, PhieuDatNgoai } from '../api/client';

const STATUS_LABELS: Record<string, string> = {
  NHAP: 'Nháp',
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

function displayDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="p-3 bg-[#F4F6FA] rounded min-h-16"><span className="block text-[11px] font-bold text-[#59627A]">{label}</span><strong className={`block mt-1 text-[13px] ${mono ? 'font-mono' : ''}`}>{value}</strong></div>;
}

interface Props {
  lsx: LsxDatNgoai;
  request?: PhieuDatNgoai;
  allRequests?: PhieuDatNgoai[];
  onClose: () => void;
  canCancel?: boolean;
  canApprove?: boolean;
  canChooseSupplier?: boolean;
  suppliers?: NhaCungCapDanhMuc[];
  onRequestChanged?: () => Promise<void>;
  onNotify?: (message: string) => void;
}

export function OutsourceDetailModal({ lsx, request, allRequests = [], onClose, canCancel = false, canApprove = false, canChooseSupplier = false, suppliers = [], onRequestChanged, onNotify }: Props) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [confirming, setConfirming] = useState(false);
  const [actionError, setActionError] = useState('');
  const [selectedLine, setSelectedLine] = useState<LsxDatNgoai['dong'][number] | null>(null);
  const [itemForm, setItemForm] = useState({ ncc: '', kyHan: '', giaCong: '', kyThuat: '', chatLuong: '', ghiChu: '', canXacNhan: false, noiDungXacNhan: '' });
  const itemRequest = selectedLine ? allRequests.find((item) => item.dong.some((line) => line.ma_vach === selectedLine.ma_vach) && item.trang_thai !== 'HUY') : undefined;
  const itemRequestLine = itemRequest?.dong.find((line) => line.ma_vach === selectedLine?.ma_vach);
  useEffect(() => {
    if (!selectedLine) return;
    setItemForm({ ncc: itemRequest?.id_ncc || '', kyHan: itemRequestLine?.ky_han || itemRequest?.ky_han || '', giaCong: itemRequestLine?.noi_dung_gia_cong || '', kyThuat: itemRequestLine?.yeu_cau_ky_thuat || '', chatLuong: itemRequestLine?.yeu_cau_chat_luong || '', ghiChu: itemRequest?.ghi_chu || '', canXacNhan: itemRequest?.can_xac_nhan_ky_thuat || false, noiDungXacNhan: itemRequest?.noi_dung_ky_thuat || '' });
  }, [selectedLine?.ma_vach, itemRequest?.id, itemRequest?.phien_ban, itemRequestLine?.id]);
  const totalPages = Math.max(1, Math.ceil(lsx.dong.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleLines = lsx.dong.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const from = lsx.dong.length ? (currentPage - 1) * pageSize + 1 : 0;
  const to = Math.min(currentPage * pageSize, lsx.dong.length);

<<<<<<< HEAD
  const supplierSummary = [...new Set((request?.dong || []).map((line) => line.ten_ncc_chup).filter(Boolean))].join(', ')
    || request?.ten_ncc_chup || 'Chưa chọn theo mã';
  const technicalLines = request?.dong.filter((line) => line.can_xac_nhan_ky_thuat) || [];
  const confirmedTechnicalLines = technicalLines.filter((line) => line.da_xac_nhan_kt).length;
  const allTechnicalLinesConfirmed = technicalLines.length > 0
    && confirmedTechnicalLines === technicalLines.length;

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

=======
>>>>>>> 3161f51fb7cd5a9588d7eb1642db7e90454e8fbb
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
<<<<<<< HEAD
          <h3 className="font-bold text-[15px] mb-3">THÔNG TIN PHIẾU ĐẶT NGOÀI</h3>
          {!request ? <div className="p-4 border bg-[#EEF0F9] rounded text-[13px]">LSX này chưa được lập phiếu báo giá/đặt ngoài.</div> : <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Info label="SỐ PHIẾU" value={request.id} mono />
              <Info label="TRẠNG THÁI" value={statusLabel(request.trang_thai)} />
              <Info label="NHÀ CUNG CẤP THEO MÃ" value={supplierSummary} />
              <Info label="TỔNG GIÁ TRỊ" value={money(request.tong_gia_tri)} mono />
              <Info label="NGƯỜI LẬP" value={request.nguoi_lap || '—'} />
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
=======
>>>>>>> 3161f51fb7cd5a9588d7eb1642db7e90454e8fbb
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="font-bold text-[15px]">DANH SÁCH MÃ HÀNG</h3><span className="text-[12px] text-[#59627A]">Hiển thị {from}–{to} / {lsx.dong.length} dòng</span></div>
            <label className="text-[12px]">Số dòng/trang <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="ml-2 h-10 px-2 border rounded bg-white"><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label>
          </div>
          <div className="border rounded overflow-x-auto">
            <table className="w-full min-w-[1250px] text-[12px]">
<<<<<<< HEAD
              <thead className="bg-[#F4F6FA]"><tr>{['STT', 'MÃ VẠCH', 'MÃ HÀNG', 'TÊN HÀNG', 'BẢN VẼ', 'NHÀ CUNG CẤP', 'SL / ĐVT', 'ĐƠN GIÁ', 'THÀNH TIỀN', 'KỲ HẠN', 'TRẠNG THÁI'].map((head) => <th key={head} className="p-3 text-left">{head}</th>)}</tr></thead>
              <tbody>{visibleLines.map((line, index) => { const quoteLine = requestLines.get(line.ma_vach); return <tr key={line.ma_vach} className="border-t align-top"><td className="p-3 font-mono">{(currentPage - 1) * pageSize + index + 1}</td><td className="p-3 font-mono">{line.ma_vach}</td><td className="p-3 font-mono font-bold text-[#283A97]">{quoteLine ? <><button type="button" onClick={() => setSelectedLineId(quoteLine.id)} className="underline">{line.ma_hang}</button>{quoteLine.can_xac_nhan_ky_thuat && <span className={`block mt-1 text-[10px] ${quoteLine.da_xac_nhan_kt ? 'text-emerald-700' : 'text-amber-700'}`}>{quoteLine.da_xac_nhan_kt ? (canConfirmTechnical && request?.trang_thai !== 'HUY' && request?.trang_thai !== 'HOAN_THANH' ? 'Đã xác nhận · Bấm mã để xác nhận tiếp' : 'Đã xác nhận kỹ thuật') : 'Chờ xác nhận kỹ thuật'}</span>}</> : line.ma_hang}</td><td className="p-3 min-w-56">{line.ten_hang}<span className="block text-[10px] text-[#59627A]">{line.ghi_chu || ''}</span></td><td className="p-3 font-mono">{line.ma_ban_ve || '—'}</td><td className="p-3">{quoteLine?.ten_ncc_chup || '—'}</td><td className="p-3 font-mono">{Number(line.so_luong).toLocaleString('vi-VN')} {line.dvt}</td><td className="p-3 font-mono">{money(quoteLine?.don_gia)}</td><td className="p-3 font-mono font-bold">{quoteLine?.don_gia == null ? '—' : money(Number(line.so_luong) * Number(quoteLine.don_gia))}</td><td className="p-3 font-mono">{displayDate(quoteLine?.ky_han || request?.ky_han)}</td><td className="p-3"><span className="pill p-info px-2 py-1 text-[10px]">{statusLabel(quoteLine?.trang_thai || request?.trang_thai)}</span></td></tr>; })}</tbody>
            </table>
          </div>
          {request && selectedLineId && request.dong.find((item) => item.id === selectedLineId) && <OutsourceLineDetails
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
          />}
        {request && <HoSoTuongTacPanel loai="dat-ngoai" id={request.id} canEdit={canCancel} />}
=======
              <thead className="bg-[#F4F6FA]"><tr>{['STT', 'MÃ VẠCH', 'MÃ HÀNG', 'TÊN HÀNG', 'BẢN VẼ', 'CÔNG ĐOẠN', 'SL / ĐVT', 'HẠN GIAO', 'TRẠNG THÁI'].map((head) => <th key={head} className="p-3 text-left">{head}</th>)}</tr></thead>
              <tbody>{visibleLines.map((line, index) => { const lineRequest = allRequests.find((ticket) => ticket.trang_thai !== 'HUY' && ticket.dong.some((item) => item.ma_vach === line.ma_vach)); const requestLine = lineRequest?.dong.find((item) => item.ma_vach === line.ma_vach); return <tr key={line.ma_vach} className="border-t align-top"><td className="p-3 font-mono">{(currentPage - 1) * pageSize + index + 1}</td><td className="p-3 font-mono">{line.ma_vach}</td><td className="p-3"><button type="button" onClick={() => setSelectedLine(line)} className="font-mono font-bold text-[#283A97] underline underline-offset-2">{line.ma_hang}</button></td><td className="p-3 min-w-56">{line.ten_hang}<span className="block text-[10px] text-[#59627A]">{line.ghi_chu || ''}</span></td><td className="p-3 font-mono">{line.ma_ban_ve || '—'}</td><td className="p-3">{line.ma_cong_doan || '—'}</td><td className="p-3 font-mono">{Number(line.so_luong).toLocaleString('vi-VN')} {line.dvt}</td><td className="p-3 font-mono">{displayDate(requestLine?.ky_han || lineRequest?.ky_han || lsx.ki_han_khach_hang)}</td><td className="p-3"><span className="pill p-info px-2 py-1 text-[10px]">{lineRequest ? statusLabel(lineRequest.trang_thai) : 'Chưa lập phiếu'}</span></td></tr>; })}</tbody>
            </table>
          </div>
>>>>>>> 3161f51fb7cd5a9588d7eb1642db7e90454e8fbb
          {totalPages > 1 && <div className="mt-3 flex items-center justify-end gap-2 text-[12px]"><button type="button" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="h-10 px-3 border rounded disabled:opacity-40">TRƯỚC</button><strong>Trang {currentPage}/{totalPages}</strong><button type="button" onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="h-10 px-3 border rounded disabled:opacity-40">SAU</button></div>}
        </section>

      </div>

<<<<<<< HEAD
      <footer className="sticky bottom-0 bg-white p-4 border-t flex flex-wrap justify-between gap-2">
        {canConfirmTechnical && request?.trang_thai === 'CHO_XAC_NHAN_KY_THUAT' && <div className="flex flex-wrap items-center gap-3"><span className="text-[12px]">Đã xác nhận {confirmedTechnicalLines}/{technicalLines.length} mã cần xác nhận</span><button type="button" disabled={confirming || !allTechnicalLinesConfirmed} onClick={() => void confirmTechnical()} className="min-h-11 px-5 bg-emerald-700 text-white rounded font-bold disabled:opacity-50">{confirming ? 'ĐANG XỬ LÝ…' : 'HOÀN TẤT XÁC NHẬN KỸ THUẬT'}</button></div>}
        {canCancel && request && request.trang_thai !== 'HUY' && <button type="button" disabled={confirming} onClick={() => { setShowCancelForm((shown) => !shown); setActionError(''); }} className="min-h-11 px-5 border border-[#EE202E] text-[#C4141F] rounded font-bold disabled:opacity-50">HỦY PHIẾU</button>}
=======
      {selectedLine && <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-labelledby="outsource-item-title"><form className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded shadow-xl" onSubmit={async (event) => { event.preventDefault(); if (!selectedLine || confirming) return; setConfirming(true); setActionError(''); try { if (itemRequest && itemRequestLine) { if (itemForm.ncc && itemForm.ncc !== itemRequest.id_ncc) await chonNhaCungCapDatNgoai(itemRequest, itemForm.ncc); if (itemRequest.trang_thai === 'NHAP') await capNhatYeuCauDongDatNgoai(itemRequest.id, itemRequestLine.id, { noi_dung_gia_cong: itemForm.giaCong, yeu_cau_ky_thuat: itemForm.kyThuat, yeu_cau_chat_luong: itemForm.chatLuong }); } else { await taoBaoGiaDatNgoai({ ma_vach: [selectedLine.ma_vach], id_ncc: itemForm.ncc || undefined, ky_han: itemForm.kyHan || undefined, ghi_chu: itemForm.ghiChu || undefined, can_xac_nhan_ky_thuat: itemForm.canXacNhan, noi_dung_ky_thuat: itemForm.noiDungXacNhan || undefined, noi_dung_gia_cong: itemForm.giaCong, yeu_cau_ky_thuat: itemForm.kyThuat, yeu_cau_chat_luong: itemForm.chatLuong }); } await onRequestChanged?.(); onNotify?.(`Đã lưu thông tin mã hàng ${selectedLine.ma_hang}.`); setSelectedLine(null); } catch (reason) { setActionError(reason instanceof Error ? reason.message : 'Không lưu được thông tin mã hàng.'); } finally { setConfirming(false); } }}><header className="p-4 border-b flex justify-between"><div><span className="text-[11px] font-bold text-[#59627A]">THÔNG TIN GIA CÔNG THEO MÃ HÀNG</span><h3 id="outsource-item-title" className="mt-1 text-lg font-bold text-[#283A97]">{selectedLine.ma_hang} · {selectedLine.ten_hang}</h3><p className="text-[12px] text-[#59627A]">Mã vạch {selectedLine.ma_vach} · {Number(selectedLine.so_luong).toLocaleString('vi-VN')} {selectedLine.dvt}</p></div><button type="button" onClick={() => setSelectedLine(null)} className="w-10 h-10 border rounded" aria-label="Đóng"><span className="material-symbols-outlined">close</span></button></header><div className="p-4 space-y-3">{actionError && <div role="alert" className="p-3 bg-[#FDECEE] text-[#C4141F] rounded">{actionError}</div>}<label className="block text-[12px] font-bold">NHÀ CUNG CẤP GIA CÔNG *<select required value={itemForm.ncc} onChange={(e) => setItemForm({...itemForm,ncc:e.target.value})} className="mt-1 w-full min-h-11 px-3 border rounded bg-white font-normal"><option value="">-- Chọn nhà cung cấp --</option>{suppliers.map((supplier) => <option key={supplier.ma} value={supplier.ma}>{supplier.ma_ncc} · {supplier.ten}</option>)}</select></label><div className="grid sm:grid-cols-2 gap-3"><label className="text-[12px] font-bold">HẠN GIAO DỰ KIẾN<input type="date" value={itemForm.kyHan} onChange={(e)=>setItemForm({...itemForm,kyHan:e.target.value})} className="mt-1 w-full min-h-11 px-3 border rounded"/></label><label className="text-[12px] font-bold">GHI CHÚ<textarea value={itemForm.ghiChu} onChange={(e)=>setItemForm({...itemForm,ghiChu:e.target.value})} rows={2} className="mt-1 w-full p-3 border rounded font-normal"/></label></div><label className="flex items-center gap-2 text-[12px] font-bold"><input type="checkbox" checked={itemForm.canXacNhan} onChange={(e)=>setItemForm({...itemForm,canXacNhan:e.target.checked})}/>CẦN XÁC NHẬN KỸ THUẬT</label>{itemForm.canXacNhan&&<label className="block text-[12px] font-bold">NỘI DUNG CẦN XÁC NHẬN<textarea required value={itemForm.noiDungXacNhan} onChange={(e)=>setItemForm({...itemForm,noiDungXacNhan:e.target.value})} rows={2} className="mt-1 w-full p-3 border rounded font-normal"/></label>}<div className="grid gap-3"><label className="text-[12px] font-bold">NỘI DUNG GIA CÔNG *<textarea required disabled={Boolean(itemRequest && itemRequest.trang_thai!=='NHAP')} value={itemForm.giaCong} onChange={(e)=>setItemForm({...itemForm,giaCong:e.target.value})} rows={2} className="mt-1 w-full p-3 border rounded font-normal disabled:bg-[#F4F6FA]"/></label><label className="text-[12px] font-bold">YÊU CẦU KỸ THUẬT *<textarea required disabled={Boolean(itemRequest && itemRequest.trang_thai!=='NHAP')} value={itemForm.kyThuat} onChange={(e)=>setItemForm({...itemForm,kyThuat:e.target.value})} rows={2} className="mt-1 w-full p-3 border rounded font-normal disabled:bg-[#F4F6FA]"/></label><label className="text-[12px] font-bold">YÊU CẦU CHẤT LƯỢNG *<textarea required disabled={Boolean(itemRequest && itemRequest.trang_thai!=='NHAP')} value={itemForm.chatLuong} onChange={(e)=>setItemForm({...itemForm,chatLuong:e.target.value})} rows={2} className="mt-1 w-full p-3 border rounded font-normal disabled:bg-[#F4F6FA]"/></label></div>{itemRequest&&<p className="text-[11px] text-[#59627A]">Phiếu {itemRequest.id} · {statusLabel(itemRequest.trang_thai)}{itemRequest.trang_thai!=='NHAP'?' · yêu cầu đã khóa theo trạng thái phiếu':''}</p>}</div><footer className="p-4 border-t flex flex-wrap justify-end gap-2"><button type="button" onClick={()=>setSelectedLine(null)} className="min-h-10 px-4 border rounded font-bold">ĐÓNG</button>{itemRequest?.trang_thai==='NHAP'&&canCancel&&<button type="button" disabled={confirming} onClick={async()=>{setConfirming(true);setActionError('');try{await guiDuyetDatNgoai(itemRequest);await onRequestChanged?.();onNotify?.(`Đã gửi duyệt phiếu ${itemRequest.id}.`);}catch(reason){setActionError(reason instanceof Error?reason.message:'Không gửi duyệt được phiếu.');}finally{setConfirming(false);}}} className="min-h-10 px-4 bg-[#283A97] text-white rounded font-bold">GỬI DUYỆT</button>}{itemRequest?.trang_thai==='CHO_DUYET'&&canApprove&&<button type="button" disabled={confirming} onClick={async()=>{setConfirming(true);setActionError('');try{await chuyenTrangThaiDatNgoai(itemRequest,'DA_DUYET');await onRequestChanged?.();onNotify?.(`Đã duyệt phiếu ${itemRequest.id}.`);}catch(reason){setActionError(reason instanceof Error?reason.message:'Không duyệt được phiếu.');}finally{setConfirming(false);}}} className="min-h-10 px-4 bg-emerald-700 text-white rounded font-bold">DUYỆT PHIẾU</button>}{itemRequest?.trang_thai==='DA_DUYET'&&canChooseSupplier&&<button type="button" disabled={confirming} onClick={async()=>{setConfirming(true);setActionError('');try{await chuyenTrangThaiDatNgoai(itemRequest,'DANG_BAO_GIA');await onRequestChanged?.();}catch(reason){setActionError(reason instanceof Error?reason.message:'Không chuyển bước được.');}finally{setConfirming(false);}}} className="min-h-10 px-4 bg-[#283A97] text-white rounded font-bold">BẮT ĐẦU BÁO GIÁ</button>}{(!itemRequest||itemRequest.trang_thai==='NHAP')&&<button type="submit" disabled={confirming} className="min-h-10 px-5 bg-[#283A97] text-white rounded font-bold disabled:opacity-50">{confirming?'ĐANG LƯU…':itemRequest?'LƯU THÔNG TIN':'TẠO PHIẾU NHÁP'}</button>}</footer></form></div>}

      <footer className="sticky bottom-0 bg-white p-4 border-t flex justify-end">
>>>>>>> 3161f51fb7cd5a9588d7eb1642db7e90454e8fbb
        <button type="button" onClick={onClose} className="min-h-11 px-5 bg-[#283A97] text-white rounded font-bold">ĐÓNG</button>
      </footer>
    </div>
  </div>;
}
