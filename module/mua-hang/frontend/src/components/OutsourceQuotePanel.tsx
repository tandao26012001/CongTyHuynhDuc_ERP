import { useState } from 'react';
import { luuBaoGiaDatNgoai, DongPhieuDatNgoai, NhaCungCapDanhMuc, PhieuDatNgoai } from '../api/client';

const money = (value: number) => `${value.toLocaleString('vi-VN')} đ`;

export function OutsourceQuotePanel({ request, row, suppliers, canEdit, onChanged, onNotify }: {
  request: PhieuDatNgoai; row: DongPhieuDatNgoai; suppliers: NhaCungCapDanhMuc[]; canEdit: boolean;
  onChanged?: () => Promise<void>; onNotify?: (message: string) => void;
}) {
  const [supplierId, setSupplierId] = useState(row.id_ncc || request.id_ncc || '');
  const [price, setPrice] = useState(row.don_gia == null ? '' : String(row.don_gia));
  const [deadline, setDeadline] = useState(row.ky_han || '');
  const [note, setNote] = useState(request.ghi_chu || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const editable = canEdit && request.trang_thai === 'DANG_BAO_GIA';
  const lineTotal = price.trim() && Number.isFinite(Number(price))
    ? Number(row.so_luong) * Number(price)
    : null;
  const supplierName = suppliers.find((item) => item.ma === row.id_ncc)?.ten
    || row.ten_ncc_chup || request.ten_ncc_chup || 'Chưa chọn';
  const selectedSupplier = suppliers.find((item) => item.ma === supplierId);

  async function save() {
    if (!editable || busy) return;
    if (!supplierId) { setError(`Chọn nhà cung cấp cho mã ${row.ma_hang}.`); return; }
    if (!price.trim() || !Number.isSafeInteger(Number(price)) || Number(price) < 0) {
      setError(`Nhập đơn giá VND nguyên, không âm cho mã ${row.ma_hang}.`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await luuBaoGiaDatNgoai(request, {
        ghi_chu: note || null,
        dong: [{ id: row.id, id_ncc: supplierId, ma_ncc: selectedSupplier?.ma_ncc,
          ten_ncc: selectedSupplier?.ten, don_gia: Number(price),
          ky_han: deadline || null, ghi_chu: row.ghi_chu }],
      });
      onNotify?.(`Đã lưu báo giá mã ${row.ma_hang}.`);
      await onChanged?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `Không lưu được báo giá mã ${row.ma_hang}.`);
    } finally {
      setBusy(false);
    }
  }

  return <section className="border-t pt-4 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h5 className="font-bold">NHÀ CUNG CẤP VÀ BÁO GIÁ MÃ {row.ma_hang}</h5>
      <span className="text-[12px] text-[#59627A]">{row.trang_thai === 'CHO_DUYET' ? 'Đã lưu báo giá' : 'Chưa báo giá'}</span>
    </div>
    {error && <p role="alert" className="p-3 bg-[#FDECEE] text-[#C4141F] border-l-4 border-[#EE202E] text-[13px]">{error}</p>}
    {request.trang_thai === 'CHO_XAC_NHAN_KY_THUAT' && <p className="text-[12px] text-[#59627A]">Cần xác nhận kỹ thuật trước khi nhập báo giá.</p>}
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
      <label className="text-[12px] font-bold">NHÀ CUNG CẤP
        {editable ? <select aria-label={`Nhà cung cấp ${row.ma_hang}`} value={supplierId} disabled={busy} onChange={(event) => setSupplierId(event.target.value)} className="mt-1 w-full min-h-11 px-2 border rounded bg-white font-normal">
          <option value="">-- Chọn nhà cung cấp --</option>
          {suppliers.map((item) => <option key={item.ma} value={item.ma}>{item.ma_ncc} · {item.ten}</option>)}
        </select> : <span className="block mt-1 min-h-11 py-3 font-normal">{supplierName}</span>}
      </label>
      <label className="text-[12px] font-bold">ĐƠN GIÁ (VND)
        {editable ? <input aria-label={`Đơn giá ${row.ma_hang}`} type="number" min={0} step={1} disabled={busy} value={price} onChange={(event) => setPrice(event.target.value)} className="mt-1 w-full min-h-11 px-3 border rounded font-normal" /> : <span className="block mt-1 min-h-11 py-3 font-normal">{row.don_gia == null ? '—' : money(Number(row.don_gia))}</span>}
      </label>
      <label className="text-[12px] font-bold">HẠN GIAO
        {editable ? <input aria-label={`Hạn giao ${row.ma_hang}`} type="date" disabled={busy} value={deadline} onChange={(event) => setDeadline(event.target.value)} className="mt-1 w-full min-h-11 px-2 border rounded font-normal" /> : <span className="block mt-1 min-h-11 py-3 font-normal">{row.ky_han || '—'}</span>}
      </label>
      <div className="flex min-h-11 items-center justify-between gap-2">
        <span className="text-[12px]">Thành tiền <strong>{lineTotal == null ? '—' : money(lineTotal)}</strong></span>
        {editable && <button type="button" onClick={() => void save()} disabled={busy} className="min-h-10 px-3 bg-[#283A97] text-white rounded font-bold disabled:opacity-50">{busy ? 'ĐANG LƯU…' : row.don_gia == null ? 'LƯU BÁO GIÁ' : 'CẬP NHẬT'}</button>}
      </div>
    </div>
    <label className="block text-[12px] font-bold">GHI CHÚ PHIẾU (DÙNG CHUNG)
      <textarea disabled={!editable || busy} value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 w-full p-3 border rounded font-normal" />
    </label>
  </section>;
}
