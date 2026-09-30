import { useEffect, useMemo, useState } from 'react';
import { BaoCaoF2, BoLocBaoCaoF2, layBaoCaoF2, taiBaoCaoF2 } from '../api/client';

const TABS = [
  { key: 'hieu-qua', label: 'Hiệu quả Mua hàng' },
  { key: 'bao-gia', label: 'Quản lý Báo giá' },
  { key: 'dat-hang', label: 'Quản lý Đặt hàng' },
  { key: 'giao-nhan', label: 'Tình trạng Giao nhận' },
  { key: 'thanh-toan', label: 'Quản lý Thanh toán' },
  { key: 'nha-cung-cap', label: 'Quản lý Nhà cung cấp' },
  { key: 'dat-ngoai', label: 'Quản lý Đặt ngoài' },
] as const;
const CURRENT = new Date();
const TODAY = `${CURRENT.getFullYear()}-${String(CURRENT.getMonth() + 1).padStart(2, '0')}-${String(CURRENT.getDate()).padStart(2, '0')}`;
const FIRST_DAY = `${CURRENT.getFullYear()}-${String(CURRENT.getMonth() + 1).padStart(2, '0')}-01`;
const INITIAL: BoLocBaoCaoF2 = { tu_ngay: FIRST_DAY, den_ngay: TODAY, id_ncc: '', trang_thai: '' };

function display(value: string | number | boolean | null) {
  if (value === null || value === '') return '—';
  if (typeof value === 'number') return value.toLocaleString('vi-VN');
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  return String(value);
}

export function ReportsView() {
  const [tab, setTab] = useState<string>('hieu-qua');
  const [draft, setDraft] = useState<BoLocBaoCaoF2>(INITIAL);
  const [filters, setFilters] = useState<BoLocBaoCaoF2>(INITIAL);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mode, setMode] = useState<'line' | 'ticket'>('line');
  const [report, setReport] = useState<BaoCaoF2 | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setBusy(true); setError('');
    layBaoCaoF2(tab, filters).then((result) => { if (active) setReport(result); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Không tải được báo cáo.'); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [tab, filters]);

  const canGroup = ['hieu-qua', 'dat-hang', 'giao-nhan', 'dat-ngoai'].includes(tab);
  const rows = useMemo(() => {
    if (!report || mode === 'line' || !canGroup) return report?.rows || [];
    const groups = new Map<string, Record<string, string | number | boolean | null>>();
    for (const row of report.rows) {
      const key = String(row.so_phieu || row.so_don || row.ma_dong || '');
      const existing = groups.get(key);
      if (existing) existing.so_dong = Number(existing.so_dong || 1) + 1;
      else groups.set(key, { ...row, so_dong: 1 });
    }
    return [...groups.values()];
  }, [report, mode, canGroup]);
  const columns = mode === 'ticket' && canGroup ? [...(report?.columns || []), 'so_dong'] : report?.columns || [];
  const maxChart = Math.max(1, ...(report?.chart.map((point) => point.value) || []));

  async function download(format: 'xlsx' | 'pdf') {
    setError('');
    try { await taiBaoCaoF2(tab, filters, format); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được tệp.'); }
  }

  return <div className="space-y-4">
    <header className="bg-white border rounded p-4"><h1 className="text-xl font-bold">BÁO CÁO MUA HÀNG</h1><p className="text-sm text-[#59627A]">Số liệu tính từ chứng từ gốc theo kỳ đã chọn.</p></header>
    <nav className="bg-white border rounded p-2 flex flex-wrap gap-2">{TABS.map((item) => <button key={item.key} type="button" onClick={() => setTab(item.key)} className={`min-h-11 px-3 rounded text-sm font-bold ${tab === item.key ? 'bg-[#283A97] text-white' : 'border text-[#283A97]'}`}>{item.label}</button>)}</nav>
    <section className="bg-white border rounded p-4 space-y-3">
      <div className="flex flex-wrap justify-between gap-2 items-center"><button type="button" onClick={() => setFiltersOpen(!filtersOpen)} className="font-bold text-[#283A97] min-h-10">BỘ LỌC {filtersOpen ? '▴' : '▾'}</button><span className="text-xs text-[#59627A]">{filters.tu_ngay} → {filters.den_ngay}{filters.id_ncc ? ` · NCC ${filters.id_ncc}` : ''}{filters.trang_thai ? ` · ${filters.trang_thai}` : ''}</span><div className="flex gap-2"><button type="button" onClick={() => void download('xlsx')} className="min-h-10 px-3 border rounded">TẢI EXCEL</button><button type="button" onClick={() => void download('pdf')} className="min-h-10 px-3 border rounded">TẢI PDF</button></div></div>
      {filtersOpen && <form onSubmit={(event) => { event.preventDefault(); setFilters({ ...draft }); }} className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2 items-end"><label className="text-xs">Từ ngày<input type="date" value={draft.tu_ngay} onChange={(event) => setDraft({ ...draft, tu_ngay: event.target.value })} className="block mt-1 h-10 w-full border rounded px-2" /></label><label className="text-xs">Đến ngày<input type="date" value={draft.den_ngay} onChange={(event) => setDraft({ ...draft, den_ngay: event.target.value })} className="block mt-1 h-10 w-full border rounded px-2" /></label><label className="text-xs">Mã NCC<input value={draft.id_ncc} onChange={(event) => setDraft({ ...draft, id_ncc: event.target.value })} className="block mt-1 h-10 w-full border rounded px-2" placeholder="Tất cả" /></label><label className="text-xs">Trạng thái<input value={draft.trang_thai} onChange={(event) => setDraft({ ...draft, trang_thai: event.target.value })} className="block mt-1 h-10 w-full border rounded px-2" placeholder="Tất cả" /></label><button className="h-10 bg-[#283A97] text-white rounded font-bold">ÁP DỤNG</button></form>}
    </section>
    {error && <p role="alert" className="p-3 bg-[#FDECEE] text-[#C4141F] rounded">{error}</p>}
    {busy && <p className="bg-white border rounded p-5">Đang tải báo cáo…</p>}
    {report && !busy && <>
      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">{report.metrics.map((metric) => <article key={metric.label} className="bg-white border rounded p-4"><p className="text-xs text-[#59627A] font-bold">{metric.label.toUpperCase()}</p><strong className="block mt-2 text-xl text-[#283A97]">{metric.value === null ? 'Chưa có dữ liệu' : `${display(metric.value)} ${metric.unit}`}</strong></article>)}</section>
      <section className="bg-white border rounded p-4 space-y-2"><h2 className="font-bold">PHÂN BỐ THEO TRẠNG THÁI</h2>{report.chart.length === 0 ? <p className="text-sm">Chưa có dữ liệu.</p> : report.chart.map((point) => <div key={point.label} className="flex items-center gap-2 text-xs"><span className="w-36 shrink-0 truncate" title={point.label}>{point.label}</span><div className="flex-1 bg-[#EEF0F9] rounded h-6"><div style={{ width: `${point.value / maxChart * 100}%` }} className="h-6 rounded bg-[#283A97]" /></div><strong className="w-12 text-right">{point.value}</strong></div>)}</section>
      <section className="bg-white border rounded p-4 space-y-3"><div className="flex justify-between gap-2 items-center"><h2 className="font-bold">BẢNG DỮ LIỆU GỐC · {rows.length} dòng</h2>{canGroup && <div className="flex gap-1 text-xs"><button onClick={() => setMode('line')} className={`px-3 h-10 rounded ${mode === 'line' ? 'bg-[#283A97] text-white' : 'border'}`}>Theo mã hàng</button><button onClick={() => setMode('ticket')} className={`px-3 h-10 rounded ${mode === 'ticket' ? 'bg-[#283A97] text-white' : 'border'}`}>Theo phiếu</button></div>}</div>{report.truncated && <p className="text-xs text-[#C4141F]">Kết quả đạt giới hạn 2.000 dòng. Thu hẹp bộ lọc để xem và tải đầy đủ.</p>}<div className="overflow-x-auto border rounded"><table className="min-w-full text-xs"><thead className="bg-[#F4F6FA]"><tr>{columns.map((column) => <th key={column} className="text-left p-2 whitespace-nowrap">{column.replaceAll('_', ' ').toUpperCase()}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.ma_dong}-${index}`} className="border-t">{columns.map((column) => <td key={column} className="p-2 whitespace-nowrap">{display(row[column] ?? null)}</td>)}</tr>)}</tbody></table>{rows.length === 0 && <p className="p-6 text-center text-sm">Chưa có dữ liệu theo bộ lọc.</p>}</div></section>
    </>}
  </div>;
}
