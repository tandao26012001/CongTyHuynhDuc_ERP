import { useState } from 'react';
import { layToken } from '../api/client';

export function SupplierFormDownload({ form, supplierId, scoreId }: {
  form: 'BM03' | 'BM06' | 'BM07' | 'BM08'; supplierId?: string; scoreId?: string;
}) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [start, setStart] = useState(`${year}-01-01`);
  const [end, setEnd] = useState(`${year}-12-31`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function download(format: 'xlsx' | 'pdf') {
    setBusy(true); setError('');
    let url: string | null = null;
    try {
      const params = new URLSearchParams({ nam: String(year), dinh_dang: format });
      if (form === 'BM08') { params.set('tu_ngay', start); params.set('den_ngay', end); }
      if (supplierId) params.set('id_ncc', supplierId);
      if (scoreId) params.set('id_danh_gia', scoreId);
      const response = await fetch(`/api/v1/bieu-mau/ncc/${form}/tai?${params}`, { headers: { 'X-Phien': layToken() } });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || 'Không tải được biểu mẫu.');
      }
      url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a'); link.href = url;
      link.download = `${form}_${scoreId || supplierId || year}.${format}`;
      document.body.append(link); link.click(); link.remove();
    } catch (e) { setError(e instanceof Error ? e.message : 'Không tải được biểu mẫu.'); }
    finally { if (url) setTimeout(() => URL.revokeObjectURL(url!), 1000); setBusy(false); }
  }
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-2 items-end">
      {form === 'BM07' && <label className="text-xs">Năm đánh giá<input type="number" min="2000" max="2100" value={year} onChange={(e) => setYear(Number(e.target.value))} className="block h-11 border rounded px-2 w-28" /></label>}
      {form === 'BM08' && <><label className="text-xs">Từ ngày<input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="block h-11 border rounded px-2" /></label><label className="text-xs">Đến ngày<input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="block h-11 border rounded px-2" /></label></>}
      <button type="button" disabled={busy} onClick={() => void download('xlsx')} className="min-h-11 px-3 border rounded text-[#283A97] font-bold">{busy ? 'ĐANG TẢI…' : `EXCEL ${form}`}</button>
      <button type="button" disabled={busy} onClick={() => void download('pdf')} className="min-h-11 px-3 border rounded text-[#283A97] font-bold">PDF / IN {form}</button>
    </div>
    {form === 'BM07' && <p className="text-xs text-[#59627A]">Mỗi dòng là một nhóm hàng của NCC; lấy kết luận đã duyệt gần nhất trong từng tháng. Tháng chưa chấm để trống.</p>}
    {error && <p role="alert" className="text-sm text-[#C4141F]">{error}</p>}
  </div>;
}
