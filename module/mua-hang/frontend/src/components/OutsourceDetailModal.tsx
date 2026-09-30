import { FormEvent, useEffect, useMemo, useState } from 'react';
import { OutsourceQuotePanel } from './OutsourceQuotePanel';
import { capNhatYeuCauDongDatNgoai, chonNhaCungCapDatNgoai, chuyenTrangThaiDatNgoai, doiMaDatNgoai, ganSuCoDatNgoai, ghiDotGiaoDatNgoai, ghiXacNhanKyThuatDong, guiDuyetDatNgoai, LsxDatNgoai, NhaCungCapDanhMuc, PhieuDatNgoai, taiNoiDungTepDatNgoai, taiTepDatNgoai, themTraoDoiDatNgoai, xacNhanKyThuatDatNgoai } from '../api/client';

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
  canApprove?: boolean;
  canChooseSupplier?: boolean;
  suppliers?: NhaCungCapDanhMuc[];
  onRequestChanged?: () => Promise<void>;
  onNotify?: (message: string) => void;
}

export function OutsourceDetailModal({ lsx, request, onClose, canConfirmTechnical = false, canCancel = false, canApprove = false, canChooseSupplier = false, suppliers = [], onRequestChanged, onNotify }: Props) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [confirming, setConfirming] = useState(false);
  const [actionError, setActionError] = useState('');
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(request?.id_ncc || '');
  const [drafts, setDrafts] = useState<Record<string, { giaCong: string; kyThuat: string; chatLuong: string }>>({});
  const [technical, setTechnical] = useState({ id: '', noiDung: '', ketQua: 'DA_XAC_NHAN', ghiChu: '' });
  const [delivery, setDelivery] = useState({ id: '', lan: '1', duKien: '', soLuong: '', thucTe: '', soLuongThucTe: '', ghiChu: '' });
  const [incident, setIncident] = useState({ id: '', suCoId: '' });
  const [replacement, setReplacement] = useState({ id: '', ma: '', lyDo: '' });
  const [message, setMessage] = useState('');
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

  async function submitForApproval() {
    if (!request || confirming) return;
    setConfirming(true); setActionError('');
    try { await guiDuyetDatNgoai(request); await onRequestChanged?.(); onNotify?.(`Đã gửi duyệt phiếu ${request.id}.`); }
    catch (reason) { setActionError(reason instanceof Error ? reason.message : 'Không gửi duyệt được phiếu.'); }
    finally { setConfirming(false); }
  }

  async function approveRequest() {
    if (!request || confirming) return;
    setConfirming(true); setActionError('');
    try { await chuyenTrangThaiDatNgoai(request, 'DA_DUYET'); await onRequestChanged?.(); onNotify?.(`Đã duyệt phiếu ${request.id}.`); }
    catch (reason) { setActionError(reason instanceof Error ? reason.message : 'Không duyệt được phiếu.'); }
    finally { setConfirming(false); }
  }

  async function startQuote() {
    if (!request || confirming) return;
    setConfirming(true); setActionError('');
    try { await chuyenTrangThaiDatNgoai(request, 'DANG_BAO_GIA'); await onRequestChanged?.(); }
    catch (reason) { setActionError(reason instanceof Error ? reason.message : 'Không chuyển bước được.'); }
    finally { setConfirming(false); }
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
          <p className="mt-1 text-[12px] text-[#59627A]">Chọn và lưu NCC gia công, sau đó nhập báo giá ngay bên dưới.</p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="min-w-64 flex-1 text-[12px] font-bold">NHÀ CUNG CẤP *<select value={selectedSupplier} onChange={(event) => setSelectedSupplier(event.target.value)} className="mt-1 w-full min-h-11 px-3 border rounded bg-white font-normal"><option value="">-- Chọn NCC gia công --</option>{suppliers.map((item) => <option key={item.ma} value={item.ma}>{item.ma_ncc} · {item.ten}{item.da_phe_duyet ? '' : ' · Chưa phê duyệt'}</option>)}</select></label>
            <button type="button" disabled={!selectedSupplier || confirming || selectedSupplier === request.id_ncc} onClick={() => void saveSupplier()} className="min-h-11 px-5 rounded bg-[#283A97] text-white font-bold disabled:opacity-50">{confirming ? 'ĐANG LƯU…' : 'LƯU NHÀ CUNG CẤP'}</button>
          </div>
          {suppliers.length === 0 && <p className="mt-2 text-[12px] text-[#C4141F]">Không tải được NCC gia công đang hoạt động. Kiểm tra danh mục NCC.</p>}
        </section>}

        {request?.trang_thai === 'NHAP' && <section className="p-4 border rounded bg-[#FFF7E6] border-[#F2CD82]"><h3 className="font-bold">YÊU CẦU THEO TỪNG MÃ HÀNG</h3><p className="text-[12px] mt-1">Ba trường dưới đây bắt buộc trước khi gửi duyệt.</p><div className="mt-3 space-y-3">{request.dong.map((line) => { const draft=drafts[line.id] || {giaCong:line.noi_dung_gia_cong||'',kyThuat:line.yeu_cau_ky_thuat||'',chatLuong:line.yeu_cau_chat_luong||''}; return <div key={line.id} className="grid md:grid-cols-3 gap-2 p-3 border bg-white rounded"><strong className="md:col-span-3 font-mono">{line.ma_hang} · {line.ten_hang}</strong>{([['giaCong','Nội dung gia công'],['kyThuat','Yêu cầu kỹ thuật'],['chatLuong','Yêu cầu chất lượng']] as const).map(([key,label])=><label key={key} className="text-[11px] font-bold">{label} *<textarea required value={draft[key]} onChange={(e)=>setDrafts((cur)=>({...cur,[line.id]:{...draft,...{[key]:e.target.value}}}))} className="mt-1 w-full p-2 border rounded font-normal" rows={2}/></label>)}<button type="button" className="md:col-span-3 justify-self-end px-3 min-h-9 bg-[#283A97] text-white rounded font-bold" onClick={async()=>{try{await capNhatYeuCauDongDatNgoai(request.id,line.id,{noi_dung_gia_cong:draft.giaCong,yeu_cau_ky_thuat:draft.kyThuat,yeu_cau_chat_luong:draft.chatLuong});await onRequestChanged?.();}catch(e){setActionError(e instanceof Error?e.message:'Không lưu được yêu cầu.');}}}>LƯU YÊU CẦU DÒNG</button></div>; })}</div></section>}

        {request && <OutsourceQuotePanel key={`${request.id}-${request.phien_ban}`} request={request} canEdit={canChooseSupplier} onChanged={onRequestChanged} onNotify={onNotify} />}

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

        {request && <section className="space-y-4">
          <h3 className="font-bold text-[15px]">HỒ SƠ THEO MÃ HÀNG</h3>
          {request.dong.map((line) => <article key={line.id} className="p-4 border rounded space-y-3"><div className="flex flex-wrap justify-between gap-2"><div><strong className="font-mono text-[#283A97]">{line.ma_hang}</strong> · {line.ten_hang}<span className="block text-[11px] text-[#59627A]">Mã vạch {line.ma_vach} · số sự cố: {line.so_su_co||0}</span>{line.ma_hang_goc&&<span className="text-[11px]">Mã gốc {line.ma_hang_goc} → thay thế {line.ma_hang_thay_the}</span>}</div><button type="button" className="min-h-9 px-3 border rounded text-[11px] font-bold" onClick={()=>setReplacement({id:line.id,ma:line.ma_hang_thay_the||'',lyDo:''})}>ĐỔI MÃ</button></div>
            {replacement.id===line.id&&<div className="grid md:grid-cols-[1fr_2fr_auto] gap-2"><input aria-label="Mã hàng thay thế" value={replacement.ma} onChange={e=>setReplacement({...replacement,ma:e.target.value})} placeholder="Mã hàng thay thế" className="p-2 border rounded"/><input aria-label="Lý do đổi mã" value={replacement.lyDo} onChange={e=>setReplacement({...replacement,lyDo:e.target.value})} placeholder="Lý do đổi mã" className="p-2 border rounded"/><button type="button" className="px-3 min-h-9 bg-[#283A97] text-white rounded" onClick={async()=>{try{await doiMaDatNgoai(request.id,line.id,replacement.ma,replacement.lyDo);setReplacement({id:'',ma:'',lyDo:''});await onRequestChanged?.();}catch(e){setActionError(e instanceof Error?e.message:'Không đổi được mã.');}}}>LƯU MÃ THAY THẾ</button></div>}
            {(line.noi_dung_gia_cong||line.yeu_cau_ky_thuat||line.yeu_cau_chat_luong)&&<div className="grid md:grid-cols-3 gap-2 text-[12px]">{[['NỘI DUNG GIA CÔNG',line.noi_dung_gia_cong],['YÊU CẦU KỸ THUẬT',line.yeu_cau_ky_thuat],['YÊU CẦU CHẤT LƯỢNG',line.yeu_cau_chat_luong]].map(([h,v])=><div key={String(h)} className="p-2 bg-[#F4F6FA] rounded"><strong className="block text-[10px]">{h}</strong>{v||'—'}</div>)}</div>}
            <div className="grid md:grid-cols-2 gap-3"><div className="p-3 bg-[#F4F6FA] rounded"><strong className="text-[11px]">LỊCH SỬ XÁC NHẬN KỸ THUẬT</strong>{line.xac_nhan_ky_thuat?.map((x)=><p key={x.id} className="mt-2 text-[12px]">{displayDate(x.thoi_diem,true)} · {x.ket_qua}: {x.noi_dung} <span className="text-[#59627A]">({x.nguoi_xac_nhan})</span></p>)}{canConfirmTechnical&&<div className="mt-2 grid gap-2"><textarea aria-label="Nội dung xác nhận kỹ thuật" placeholder="Nội dung xác nhận" value={technical.id===line.id?technical.noiDung:''} onChange={e=>setTechnical({...technical,id:line.id,noiDung:e.target.value})} className="p-2 border rounded"/><select value={technical.id===line.id?technical.ketQua:'DA_XAC_NHAN'} onChange={e=>setTechnical({...technical,id:line.id,ketQua:e.target.value})} className="p-2 border rounded"><option value="DA_XAC_NHAN">Đã xác nhận</option><option value="CAN_LAM_RO">Cần làm rõ</option><option value="KHONG_DAT">Không đạt</option></select><button type="button" className="px-3 min-h-9 bg-emerald-700 text-white rounded" onClick={async()=>{try{await ghiXacNhanKyThuatDong(request.id,{id_dat_ngoai_dong:line.id,noi_dung:technical.noiDung,ket_qua:technical.ketQua,ghi_chu:technical.ghiChu});setTechnical({id:'',noiDung:'',ketQua:'DA_XAC_NHAN',ghiChu:''});await onRequestChanged?.();}catch(e){setActionError(e instanceof Error?e.message:'Không lưu được xác nhận.');}}}>GHI NHẬN LẦN XÁC NHẬN</button></div>}</div>
            <div className="p-3 bg-[#F4F6FA] rounded"><strong className="text-[11px]">CÁC ĐỢT GIAO VÀ LỊCH SỬ KỲ HẠN</strong>{line.dot_giao?.map(g=><p key={g.id} className="mt-2 text-[12px]">Đợt {g.lan_giao}: dự kiến {displayDate(g.ngay_du_kien)} / {g.so_luong_du_kien??'—'} · thực tế {displayDate(g.ngay_thuc_te)} / {g.so_luong_thuc_te??'—'}</p>)}{line.lich_su_ky_han?.map((h,i)=><p key={i} className="text-[11px] text-[#59627A]">Hạn {displayDate(h.ky_han_cu)} → {displayDate(h.ky_han_moi)} · {h.ly_do}</p>)}<div className="mt-2 grid sm:grid-cols-3 gap-2"><input type="number" min="1" aria-label="Lần giao" placeholder="Đợt số" value={delivery.id===line.id?delivery.lan:'1'} onChange={e=>setDelivery({...delivery,id:line.id,lan:e.target.value})} className="p-2 border rounded"/><input type="date" aria-label="Ngày dự kiến" value={delivery.id===line.id?delivery.duKien:''} onChange={e=>setDelivery({...delivery,id:line.id,duKien:e.target.value})} className="p-2 border rounded"/><input type="number" min="0" aria-label="Số lượng dự kiến" placeholder="SL dự kiến" value={delivery.id===line.id?delivery.soLuong:''} onChange={e=>setDelivery({...delivery,id:line.id,soLuong:e.target.value})} className="p-2 border rounded"/><input type="date" aria-label="Ngày thực tế" value={delivery.id===line.id?delivery.thucTe:''} onChange={e=>setDelivery({...delivery,id:line.id,thucTe:e.target.value})} className="p-2 border rounded"/><input type="number" min="0" aria-label="Số lượng thực tế" placeholder="SL thực tế" value={delivery.id===line.id?delivery.soLuongThucTe:''} onChange={e=>setDelivery({...delivery,id:line.id,soLuongThucTe:e.target.value})} className="p-2 border rounded"/><button type="button" className="px-3 min-h-9 bg-[#283A97] text-white rounded" onClick={async()=>{if(!delivery.duKien)return;try{await ghiDotGiaoDatNgoai(request.id,{id_dat_ngoai_dong:line.id,lan_giao:Number(delivery.lan),ngay_du_kien:delivery.duKien,so_luong_du_kien:delivery.soLuong?Number(delivery.soLuong):undefined,ngay_thuc_te:delivery.thucTe||undefined,so_luong_thuc_te:delivery.soLuongThucTe?Number(delivery.soLuongThucTe):undefined});await onRequestChanged?.();}catch(e){setActionError(e instanceof Error?e.message:'Không lưu được đợt giao.');}}}>LƯU ĐỢT GIAO</button></div></div></div>
            <div className="flex flex-wrap gap-2">{line.su_co?.map(sc=><span key={sc.id} className="pill p-info px-2 py-1">{sc.id}: {sc.mo_ta}</span>)}<input aria-label="Mã sự cố" placeholder="Mã sự cố để liên kết" value={incident.id===line.id?incident.suCoId:''} onChange={e=>setIncident({id:line.id,suCoId:e.target.value})} className="px-2 border rounded"/><button type="button" className="px-3 min-h-9 border rounded" onClick={async()=>{try{await ganSuCoDatNgoai(request.id,line.id,incident.suCoId);setIncident({id:'',suCoId:''});await onRequestChanged?.();}catch(e){setActionError(e instanceof Error?e.message:'Không gắn được sự cố.');}}}>GẮN SỰ CỐ</button></div>
          </article>)}
        </section>}

        {request && <section className="p-4 border rounded space-y-3"><h3 className="font-bold">TRAO ĐỔI VÀ TỆP ĐÍNH KÈM</h3><div className="space-y-2">{request.trao_doi?.map(item=><div key={item.id} className="p-2 bg-[#F4F6FA] rounded text-[12px]"><strong>{item.ten_nguoi_gui||item.nguoi_gui}</strong> · {displayDate(item.thoi_diem,true)}<p>{item.noi_dung}</p></div>)}</div><form className="flex gap-2" onSubmit={async e=>{e.preventDefault();try{await themTraoDoiDatNgoai(request.id,message);setMessage('');await onRequestChanged?.();}catch(err){setActionError(err instanceof Error?err.message:'Không gửi được trao đổi.');}}}><input value={message} onChange={e=>setMessage(e.target.value)} className="flex-1 min-h-10 px-3 border rounded" placeholder="Nhập trao đổi"/><button className="px-4 bg-[#283A97] text-white rounded">GỬI</button></form><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={async e=>{const file=e.target.files?.[0];if(file)try{await taiTepDatNgoai(request.id,file);await onRequestChanged?.();}catch(err){setActionError(err instanceof Error?err.message:'Không tải được tệp.');}}}/><div className="flex flex-wrap gap-2">{request.tep?.map(file=><button type="button" key={file.id} className="text-[#283A97] underline" onClick={async()=>{try{const blob=await taiNoiDungTepDatNgoai(request.id,file.id);const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=file.ten_tep;a.click();URL.revokeObjectURL(url);}catch(e){setActionError(e instanceof Error?e.message:'Không tải được tệp.');}}}>{file.ten_tep}</button>)}</div></section>}

        {request && <section>
          <h3 className="font-bold text-[15px] mb-3">LỊCH SỬ XỬ LÝ</h3>
          {!request.lich_su?.length ? <div className="p-4 border rounded text-[13px] text-[#59627A]">Chưa có lịch sử xử lý.</div> : <div className="border rounded divide-y">{request.lich_su.map((item, index) => <div key={`${item.thoi_diem}-${index}`} className="p-3 grid md:grid-cols-[170px_1fr_180px] gap-2 text-[12px]"><span className="font-mono">{displayDate(item.thoi_diem, true)}</span><div><strong>{statusLabel(item.trang_thai_cu)} → {statusLabel(item.trang_thai_moi)}</strong><span className="block text-[#59627A]">{item.noi_dung || '—'}</span></div><span>Thực hiện: <strong>{item.nguoi_thuc_hien}</strong></span></div>)}</div>}
        </section>}
      </div>

      <footer className="sticky bottom-0 bg-white p-4 border-t flex flex-wrap justify-between gap-2">
        {request?.trang_thai === 'NHAP' && canCancel && <button type="button" disabled={confirming} onClick={()=>void submitForApproval()} className="min-h-11 px-5 bg-[#283A97] text-white rounded font-bold">GỬI TRƯỞNG BP KINH DOANH DUYỆT</button>}
        {request?.trang_thai === 'CHO_DUYET' && canApprove && <button type="button" disabled={confirming} onClick={()=>void approveRequest()} className="min-h-11 px-5 bg-emerald-700 text-white rounded font-bold">DUYỆT PHIẾU</button>}
        {request?.trang_thai === 'DA_DUYET' && canChooseSupplier && <button type="button" disabled={confirming} onClick={()=>void startQuote()} className="min-h-11 px-5 bg-[#283A97] text-white rounded font-bold">BẮT ĐẦU BÁO GIÁ</button>}
        {canConfirmTechnical && request?.trang_thai === 'CHO_XAC_NHAN_KY_THUAT' && <button type="button" disabled={confirming} onClick={() => void confirmTechnical()} className="min-h-11 px-5 bg-emerald-700 text-white rounded font-bold disabled:opacity-50">{confirming ? 'ĐANG XÁC NHẬN…' : 'XÁC NHẬN KỸ THUẬT'}</button>}
        {canCancel && request && request.trang_thai !== 'HUY' && <button type="button" disabled={confirming} onClick={() => { setShowCancelForm((shown) => !shown); setActionError(''); }} className="min-h-11 px-5 border border-[#EE202E] text-[#C4141F] rounded font-bold disabled:opacity-50">HỦY PHIẾU</button>}
        <button type="button" onClick={onClose} className="min-h-11 px-5 bg-[#283A97] text-white rounded font-bold">ĐÓNG</button>
      </footer>
    </div>
  </div>;
}
