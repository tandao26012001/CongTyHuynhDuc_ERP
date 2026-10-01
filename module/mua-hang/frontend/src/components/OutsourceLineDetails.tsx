import { FormEvent, useEffect, useState } from 'react';
import { ChiTietDatNgoaiDong, DongPhieuDatNgoai, layChiTietDatNgoaiDong, NhaCungCapDanhMuc, nhanDotGiaoDatNgoai, PhieuDatNgoai,
  suaChiTietDatNgoaiDong, suaNgayDuKienDotGiaoDatNgoai, themDotGiaoDatNgoai, themXacNhanDatNgoaiDong } from '../api/client';
import { OutsourceQuotePanel } from './OutsourceQuotePanel';

function localToday() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function displayDate(value: string | null) {
  if (!value) return 'chưa nhận';
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function displayDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value || '';
  return `${part('day')}/${part('month')}/${part('year')} ${part('hour')}:${part('minute')}:${part('second')}`;
}

export function OutsourceLineDetails({ idPhieu, idDong, request, quoteLine, suppliers, canQuote,
  onRequestChanged, onNotify, canEdit, canConfirm }: {
  idPhieu: string; idDong: string; request: PhieuDatNgoai; quoteLine: DongPhieuDatNgoai;
  suppliers: NhaCungCapDanhMuc[]; canQuote: boolean;
  onRequestChanged?: () => Promise<void>; onNotify?: (message: string) => void;
  canEdit: boolean; canConfirm: boolean;
}) {
  const [line, setLine] = useState<ChiTietDatNgoaiDong | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [quantity, setQuantity] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [editingDeliveryId, setEditingDeliveryId] = useState<string | null>(null);
  const [editedDeliveryDate, setEditedDeliveryDate] = useState('');
  const [deliveryChangeReason, setDeliveryChangeReason] = useState('');
  const [receiveDates, setReceiveDates] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [details, setDetails] = useState({ noi_dung_gia_cong: '', yeu_cau_ky_thuat: '',
    yeu_cau_chat_luong: '', ngay_khach_yeu_cau: '', ngay_ncc_cam_ket: '',
    ngay_du_kien_noi_bo: '', ma_hang_thay_the: '', id_su_co: '', ly_do_doi_han: '' });

  async function load() {
    setError('');
    try {
      const result = await layChiTietDatNgoaiDong(idPhieu, idDong);
      setLine(result);
      setDetails({ noi_dung_gia_cong: result.noi_dung_gia_cong || '',
        yeu_cau_ky_thuat: result.yeu_cau_ky_thuat || '',
        yeu_cau_chat_luong: result.yeu_cau_chat_luong || '',
        ngay_khach_yeu_cau: result.ngay_khach_yeu_cau || '',
        ngay_ncc_cam_ket: result.ngay_ncc_cam_ket || '',
        ngay_du_kien_noi_bo: result.ngay_du_kien_noi_bo || '',
        ma_hang_thay_the: result.ma_hang_thay_the || '', id_su_co: result.id_su_co || '',
        ly_do_doi_han: '' });
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được chi tiết dòng.'); }
  }
  useEffect(() => { setLine(null); void load(); }, [idPhieu, idDong]);

  async function addConfirmation(event: FormEvent) {
    event.preventDefault();
    if (!confirmation.trim()) return;
    setBusy(true); setError('');
    try {
      await themXacNhanDatNgoaiDong(idPhieu, idDong, confirmation.trim());
      setConfirmation('');
      await load();
      await onRequestChanged?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không lưu được lần xác nhận kỹ thuật.');
    } finally { setBusy(false); }
  }

  async function addDelivery(event: FormEvent) {
    event.preventDefault(); if (!line) return;
    setBusy(true); setError('');
    try {
      await themDotGiaoDatNgoai(idPhieu, idDong, { dot_so: line.dot_giao.length + 1,
        so_luong: Number(quantity), ngay_du_kien: deliveryDate });
      setQuantity(''); setDeliveryDate(''); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không lưu được đợt giao.'); }
    finally { setBusy(false); }
  }

  async function receive(idDot: string, version: number) {
    const received = receiveDates[idDot] ?? localToday();
    if (!received) { setError('Hãy chọn ngày nhận thực tế.'); return; }
    setBusy(true); setError('');
    try { await nhanDotGiaoDatNgoai(idPhieu, idDong, idDot, version, received); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không lưu được ngày nhận.'); }
    finally { setBusy(false); }
  }

  async function saveDeliveryDate(event: FormEvent, idDot: string, version: number) {
    event.preventDefault();
    if (!editedDeliveryDate || !deliveryChangeReason.trim()) {
      setError('Chọn ngày dự kiến mới và ghi lý do điều chỉnh.');
      return;
    }
    setBusy(true); setError('');
    try {
      await suaNgayDuKienDotGiaoDatNgoai(
        idPhieu, idDong, idDot, version, editedDeliveryDate, deliveryChangeReason.trim());
      setEditingDeliveryId(null); setEditedDeliveryDate(''); setDeliveryChangeReason('');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không điều chỉnh được ngày giao.');
    } finally { setBusy(false); }
  }

  async function saveDetails(event: FormEvent) {
    event.preventDefault(); if (!line) return;
    setBusy(true); setError('');
    try {
      await suaChiTietDatNgoaiDong(idPhieu, idDong, {
        phien_ban: line.phien_ban,
        noi_dung_gia_cong: details.noi_dung_gia_cong,
        yeu_cau_ky_thuat: details.yeu_cau_ky_thuat,
        yeu_cau_chat_luong: details.yeu_cau_chat_luong,
        ngay_khach_yeu_cau: details.ngay_khach_yeu_cau || null,
        ngay_ncc_cam_ket: details.ngay_ncc_cam_ket || null,
        ngay_du_kien_noi_bo: details.ngay_du_kien_noi_bo || null,
        ma_hang_thay_the: details.ma_hang_thay_the || null,
        id_su_co: details.id_su_co || null,
        ly_do_doi_han: details.ly_do_doi_han || null,
      });
      setEditing(false); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không lưu được chi tiết.'); }
    finally { setBusy(false); }
  }

  return <section className="mt-4 border rounded p-4 space-y-4 text-sm">
    <div className="flex justify-between gap-2"><h4 className="font-bold">CHI TIẾT MÃ HÀNG {line?.ma_hang || ''}</h4>{canEdit && line && <button type="button" onClick={() => setEditing(!editing)} className="px-3 h-10 border rounded text-[#283A97]">{editing ? 'ĐÓNG' : 'SỬA CHI TIẾT'}</button>}</div>
    {error && <p role="alert" className="p-3 bg-[#FDECEE] text-[#C4141F] rounded">{error}</p>}
    {line && <>
      <OutsourceQuotePanel key={`${request.id}-${request.phien_ban}-${line.id}`} request={request} row={quoteLine}
        suppliers={suppliers} canEdit={canQuote} onChanged={onRequestChanged} onNotify={onNotify} />
      <div className="grid sm:grid-cols-2 gap-3">
        <p><strong>Nội dung gia công:</strong> {line.noi_dung_gia_cong || 'Chưa ghi'}</p>
        <p><strong>Yêu cầu kỹ thuật:</strong> {line.yeu_cau_ky_thuat || 'Chưa ghi'}</p>
        <p><strong>Yêu cầu chất lượng:</strong> {line.yeu_cau_chat_luong || 'Chưa ghi'}</p>
        <p><strong>Mã gốc → mã thay thế:</strong> {line.ma_hang_goc || line.ma_hang} → {line.ma_hang_thay_the || '—'}</p>
        <p><strong>Hạn khách yêu cầu / NCC cam kết / nội bộ:</strong> {line.ngay_khach_yeu_cau || '—'} / {line.ngay_ncc_cam_ket || '—'} / {line.ngay_du_kien_noi_bo || '—'}</p>
        <p><strong>Phiếu sự cố:</strong> {line.id_su_co || 'Chưa có'}</p>
      </div>
      {line.can_xac_nhan_ky_thuat && <div className="rounded border border-[#C6CCE9] bg-[#EEF0F9] p-3">
        <h5 className="font-bold">NỘI DUNG CẦN KỸ THUẬT XÁC NHẬN</h5>
        <p className="mt-1 whitespace-pre-wrap">{line.noi_dung_can_xac_nhan_kt || line.yeu_cau_ky_thuat || 'Chưa ghi nội dung.'}</p>
      </div>}
      {editing && <form onSubmit={(event) => void saveDetails(event)} className="grid sm:grid-cols-2 gap-3 border-t pt-3">
        {([['noi_dung_gia_cong', 'Nội dung gia công'], ['yeu_cau_ky_thuat', 'Yêu cầu kỹ thuật'], ['yeu_cau_chat_luong', 'Yêu cầu chất lượng']] as const).map(([key, label]) => <label key={key}>{label} *<textarea required value={details[key]} onChange={(event) => setDetails({ ...details, [key]: event.target.value })} className="block mt-1 w-full p-2 border rounded" /></label>)}
        {([['ngay_khach_yeu_cau', 'Ngày khách yêu cầu'], ['ngay_ncc_cam_ket', 'Ngày NCC cam kết'], ['ngay_du_kien_noi_bo', 'Ngày dự kiến nội bộ']] as const).map(([key, label]) => <label key={key}>{label}<input type="date" value={details[key]} onChange={(event) => setDetails({ ...details, [key]: event.target.value })} className="block mt-1 h-10 w-full px-2 border rounded" /></label>)}
        <label>Mã thay thế<input value={details.ma_hang_thay_the} onChange={(event) => setDetails({ ...details, ma_hang_thay_the: event.target.value })} className="block mt-1 h-10 w-full px-2 border rounded" /></label>
        <label>Mã phiếu sự cố<input value={details.id_su_co} onChange={(event) => setDetails({ ...details, id_su_co: event.target.value })} className="block mt-1 h-10 w-full px-2 border rounded" /></label>
        <label>Lý do đổi hạn<input value={details.ly_do_doi_han} onChange={(event) => setDetails({ ...details, ly_do_doi_han: event.target.value })} className="block mt-1 h-10 w-full px-2 border rounded" /></label>
        <div className="flex items-end"><button disabled={busy} className="h-10 px-4 bg-[#283A97] text-white rounded">LƯU CHI TIẾT</button></div>
      </form>}
      <div className="border-t pt-3 space-y-3"><h5 className="font-bold">LỊCH SỬ XÁC NHẬN KỸ THUẬT · {line.ma_hang} ({line.xac_nhan_ky_thuat.length} lần)</h5>
        {line.xac_nhan_ky_thuat.length === 0 && <p>Chưa có lần xác nhận kỹ thuật nào cho mã hàng này.</p>}
        {line.xac_nhan_ky_thuat.length > 0 && <ol className="space-y-2">
          {line.xac_nhan_ky_thuat.map((item, index) => <li key={item.id} className="rounded border border-[#DCE1EC] bg-[#F4F6FA] p-3">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <strong>Lần xác nhận {line.xac_nhan_ky_thuat.length - index} · {item.loai === 'PHIEU' ? 'Phiếu' : 'Mã hàng'}</strong>
              <time className="text-[12px] text-[#59627A]" dateTime={item.thoi_diem}>{displayDateTime(item.thoi_diem)}</time>
            </div>
            <p className="mt-1">Đã xác nhận kỹ thuật cho mã hàng này.</p>
            {item.noi_dung && <p className="mt-1 whitespace-pre-wrap text-[12px] text-[#59627A]">Ghi chú: {item.noi_dung}</p>}
            <p className="mt-2 text-[12px] text-[#59627A]">Người xác nhận: {item.ten_nguoi_xac_nhan || item.nguoi_xac_nhan} · Phiếu {item.id_phieu}</p>
          </li>)}
        </ol>}
        {canConfirm && line.can_xac_nhan_ky_thuat && request.trang_thai !== 'HUY' && request.trang_thai !== 'HOAN_THANH' && <form onSubmit={(event) => void addConfirmation(event)} className="flex flex-wrap items-end gap-2 border-t pt-3">
          <label className="min-w-64 flex-1">Nội dung xác nhận lần {line.xac_nhan_ky_thuat.length + 1}<textarea required rows={2} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-1 block w-full rounded border px-2 py-2" placeholder="Ghi rõ nội dung kỹ thuật được xác nhận trong lần này" /></label>
          <button disabled={busy || !confirmation.trim()} className="h-10 rounded bg-[#283A97] px-3 text-white disabled:opacity-50">{busy ? 'ĐANG GHI…' : `GHI XÁC NHẬN LẦN ${line.xac_nhan_ky_thuat.length + 1}`}</button>
        </form>}
      </div>
      <div className="border-t pt-3 space-y-2"><h5 className="font-bold">CÁC ĐỢT GIAO</h5>
        {line.dot_giao.length === 0 && <p>Chưa lập lịch giao.</p>}
        {line.dot_giao.map((item) => <div key={item.id} className="grid gap-4 rounded border border-[#DCE1EC] bg-[#F4F6FA]/60 p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex h-8 min-w-8 items-center justify-center rounded border border-[#C6CCE9] bg-white px-2 font-mono text-[12px] font-bold text-[#283A97]">{item.dot_so}</span>
            <div className="min-w-0">
              <p className="font-bold text-[#0E1220]">Đợt giao {item.dot_so}<span className="ml-2 font-normal tabular-nums">{Number(item.so_luong).toLocaleString('vi-VN')} {line.dvt}</span></p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#59627A]">
                <span>Dự kiến <strong className="font-medium text-[#0E1220]">{displayDate(item.ngay_du_kien)}</strong></span>
                <span className={item.ngay_thuc_te ? 'text-[#0E1220]' : ''}>Thực nhận <strong className="font-medium">{displayDate(item.ngay_thuc_te)}</strong></span>
              </div>
            </div>
          </div>
          {canEdit && <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-end">
            <button type="button" disabled={busy} onClick={() => {
              setEditingDeliveryId(item.id); setEditedDeliveryDate(item.ngay_du_kien);
              setDeliveryChangeReason(''); setError('');
            }} className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-[#C6CCE9] bg-white px-3 text-[12px] font-bold text-[#283A97] hover:bg-[#EEF0F9] disabled:opacity-50">
              <span className="material-symbols-outlined text-[17px]" aria-hidden="true">edit_calendar</span> ĐIỀU CHỈNH HẠN
            </button>
            {!item.ngay_thuc_te && <div className="flex flex-wrap items-end gap-2">
              <label className="block min-w-[170px] flex-1 text-[11px] font-bold text-[#59627A]">NGÀY NHẬN
                <input aria-label={`Ngày nhận đợt ${item.dot_so}`} type="date" required value={receiveDates[item.id] ?? localToday()} onChange={(event) => setReceiveDates({ ...receiveDates, [item.id]: event.target.value })} className="mt-1 block h-10 w-full rounded border border-[#DCE1EC] bg-white px-2 text-[14px] font-normal text-[#0E1220] focus:border-[#283A97] focus:outline-none focus:ring-2 focus:ring-[#C6CCE9]" />
              </label>
              <button type="button" disabled={busy} onClick={() => void receive(item.id, item.phien_ban)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-[#283A97] px-3 text-[12px] font-bold text-white hover:bg-[#1E2C75] disabled:opacity-50">
                <span className="material-symbols-outlined text-[17px]" aria-hidden="true">check</span> GHI NHẬN
              </button>
            </div>}
          </div>}
          {editingDeliveryId === item.id && <form onSubmit={(event) => void saveDeliveryDate(event, item.id, item.phien_ban)} className="grid sm:grid-cols-[180px_1fr_auto_auto] gap-2 items-end">
            <label>Ngày dự kiến mới<input type="date" required value={editedDeliveryDate} onChange={(event) => setEditedDeliveryDate(event.target.value)} className="block mt-1 h-10 w-full px-2 border rounded" /></label>
            <label>Lý do điều chỉnh<input required value={deliveryChangeReason} onChange={(event) => setDeliveryChangeReason(event.target.value)} className="block mt-1 h-10 w-full px-2 border rounded" /></label>
            <button disabled={busy} className="h-10 px-3 bg-[#283A97] text-white rounded disabled:opacity-50">{busy ? 'ĐANG LƯU…' : 'LƯU ĐIỀU CHỈNH'}</button>
            <button type="button" disabled={busy} onClick={() => { setEditingDeliveryId(null); setError(''); }} className="h-10 px-3 border rounded disabled:opacity-50">HỦY</button>
          </form>}
          {item.lich_su.length > 0 && <details className="text-[12px]">
            <summary className="cursor-pointer text-[#283A97]">Lịch sử điều chỉnh ({item.lich_su.length})</summary>
            <div className="mt-2 space-y-2">
              {item.lich_su.map((history) => <p key={history.id} className="border-l-2 border-[#DCE1EC] pl-3">
                {displayDate(history.ngay_cu)} → {displayDate(history.ngay_moi)} · {displayDateTime(history.thoi_diem)}
                {' · '}{history.ten_nguoi_sua || 'Không rõ người cập nhật'} · {history.ly_do}
              </p>)}
            </div>
          </details>}
        </div>)}
        {canEdit && <form onSubmit={(event) => void addDelivery(event)} className="flex flex-wrap gap-2 items-end"><label>Số lượng<input type="number" min="0.0001" step="0.0001" required value={quantity} onChange={(event) => setQuantity(event.target.value)} className="block mt-1 h-10 w-32 px-2 border rounded" /></label><label>Ngày dự kiến<input type="date" required value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} className="block mt-1 h-10 px-2 border rounded" /></label><button disabled={busy} className="h-10 px-3 bg-[#283A97] text-white rounded">THÊM ĐỢT GIAO</button></form>}
      </div>
    </>}
  </section>;
}
