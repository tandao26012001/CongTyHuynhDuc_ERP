import { FormEvent, useState } from 'react';
import { luuBaoGiaDatNgoai, PhieuDatNgoai } from '../api/client';

const money = (value: number) => `${value.toLocaleString('vi-VN')} đ`;

export function OutsourceQuotePanel({ request, canEdit, onChanged, onNotify }: {
  request: PhieuDatNgoai; canEdit: boolean;
  onChanged?: () => Promise<void>; onNotify?: (message: string) => void;
}) {
  const [prices, setPrices] = useState<Record<string, string>>(() => Object.fromEntries(request.dong.map((row) => [row.id, row.don_gia == null ? '' : String(row.don_gia)])));
  const [deadline, setDeadline] = useState(request.ky_han || '');
  const [note, setNote] = useState(request.ghi_chu || '');
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const editable = canEdit && request.trang_thai === 'DANG_BAO_GIA' && !submitted;
  const total = request.dong.reduce((sum, row) => sum + Number(row.so_luong) * (Number(prices[row.id]) || 0), 0);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editable || saving) return;
    setError('');
    if (!request.id_ncc) { setError('Hãy chọn và lưu nhà cung cấp trước khi gửi báo giá.'); return; }
    if (!request.dong.length || request.dong.some((row) => !prices[row.id]?.trim() || !Number.isSafeInteger(Number(prices[row.id])) || Number(prices[row.id]) < 0)) {
      setError('Nhập đơn giá VND nguyên, không âm cho tất cả mã hàng.'); return;
    }
    setSaving(true);
    try {
      await luuBaoGiaDatNgoai(request, { ky_han: deadline || null, ghi_chu: note || null,
        dong: request.dong.map((row) => ({ id: row.id, don_gia: Number(prices[row.id]), ghi_chu: row.ghi_chu })),
      });
      setSubmitted(true);
      onNotify?.(`Đã lưu báo giá phiếu ${request.id} và chuyển chờ duyệt.`);
      await onChanged?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không lưu được báo giá.');
    } finally { setSaving(false); }
  }

  return <section className="p-4 border border-[#DCE1EC] rounded bg-white">
    <h3 className="font-bold text-[15px] mb-3">BÁO GIÁ ĐẶT NGOÀI</h3>
    <form onSubmit={(event) => void save(event)} className="space-y-3">
      {error && <div role="alert" className="p-3 bg-[#FDECEE] text-[#C4141F] border-l-4 border-[#EE202E] text-[13px]">{error}</div>}
      {submitted && <p role="status" className="text-emerald-700">Đã lưu báo giá và chuyển chờ duyệt.</p>}
      <p className="text-[13px]">Nhà cung cấp: <strong>{request.ten_ncc_chup || 'Chưa chọn'}</strong></p>
      {request.trang_thai === 'CHO_XAC_NHAN_KY_THUAT' && <p className="text-[12px] text-[#59627A]">Cần xác nhận kỹ thuật trước khi nhập báo giá.</p>}
      <div className="overflow-x-auto border rounded">
        <table className="w-full min-w-[720px] text-[12px]">
          <thead className="bg-[#F4F6FA]"><tr>{['MÃ HÀNG', 'TÊN HÀNG', 'SL / ĐVT', 'ĐƠN GIÁ (VND)', 'THÀNH TIỀN'].map((label) => <th key={label} className="p-3 text-left">{label}</th>)}</tr></thead>
          <tbody>{request.dong.map((row) => <tr key={row.id} className="border-t">
            <td className="p-3 font-mono">{row.ma_hang}</td><td className="p-3">{row.ten_hang}</td>
            <td className="p-3">{Number(row.so_luong).toLocaleString('vi-VN')} {row.dvt}</td>
            <td className="p-3">{editable ? <input aria-label={`Đơn giá ${row.ma_hang}`} type="number" required min={0} step={1} disabled={saving} value={prices[row.id] ?? ''} onChange={(event) => setPrices((current) => ({ ...current, [row.id]: event.target.value }))} className="w-40 min-h-11 px-3 border rounded" /> : row.don_gia == null ? '—' : money(Number(row.don_gia))}</td>
            <td className="p-3 font-bold">{prices[row.id] === '' ? '—' : money(Number(row.so_luong) * Number(prices[row.id]))}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <p className="text-right font-bold text-[#283A97]">Tổng giá trị: {money(total)}</p>
      <div className="grid sm:grid-cols-2 gap-3 text-[12px]">
        <label className="font-bold">KỲ HẠN GIAO HÀNG<input aria-label="Kỳ hạn giao hàng" type="date" disabled={!editable || saving} value={deadline} onChange={(event) => setDeadline(event.target.value)} className="mt-1 w-full min-h-11 px-3 border rounded bg-white" /></label>
        <label className="font-bold">GHI CHÚ BÁO GIÁ<textarea disabled={!editable || saving} value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 w-full p-3 border rounded" /></label>
      </div>
      {editable && <div className="flex justify-end"><button type="submit" disabled={saving || !request.id_ncc} className="min-h-11 px-5 bg-[#283A97] text-white rounded font-bold disabled:opacity-50">{saving ? 'ĐANG LƯU…' : 'LƯU BÁO GIÁ VÀ GỬI DUYỆT'}</button></div>}
    </form>
  </section>;
}
