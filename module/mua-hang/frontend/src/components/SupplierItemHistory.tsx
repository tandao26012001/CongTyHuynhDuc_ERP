import { useState } from 'react';
import { api } from '../api/client';

type History = { id: string; hanh_dong: string; thoi_diem: string; nguoi_thuc_hien: string;
  du_lieu_cu: Record<string, unknown> | null; du_lieu_moi: Record<string, unknown> };

export function SupplierItemHistory({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<History[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function load() {
    setOpen(true); setBusy(true); setError('');
    try { setRows(await api<History[]>(`/api/v1/mat-hang-ncc/${encodeURIComponent(id)}/lich-su`)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không tải được lịch sử.'); }
    finally { setBusy(false); }
  }
  return <><button type="button" onClick={() => void load()} className="min-h-11 px-3 border rounded">LỊCH SỬ</button>
    {open && <div className="fixed inset-0 z-[90] bg-black/40 p-3 flex items-center justify-center"><section role="dialog" aria-modal="true" aria-label="Lịch sử mặt hàng NCC" className="bg-white rounded p-4 w-full max-w-3xl max-h-[90vh] overflow-y-auto space-y-3">
      <header className="flex justify-between items-center"><h2 className="font-bold">LỊCH SỬ MẶT HÀNG NCC</h2><button type="button" onClick={() => setOpen(false)} className="min-h-11 px-3 border rounded">ĐÓNG</button></header>
      {busy && <p>Đang tải…</p>}{error && <p role="alert" className="text-red-700">{error}</p>}
      {!busy && !error && rows.length === 0 && <p>Chưa có lịch sử ghi nhận.</p>}
      {rows.map((row) => <article key={row.id} className="border rounded p-3 space-y-2">
        <strong>{({ TAO: 'Tạo', SUA: 'Sửa', DUYET: 'Duyệt' } as Record<string, string>)[row.hanh_dong]} · {row.nguoi_thuc_hien}</strong>
        <p>{new Date(row.thoi_diem).toLocaleString('vi-VN')}</p>
        <div className="grid sm:grid-cols-2 gap-3">{[row.du_lieu_cu, row.du_lieu_moi].map((data, i) => <div key={i}><h3>{i === 0 ? 'Trước thay đổi' : 'Sau thay đổi'}</h3><pre className="text-xs whitespace-pre-wrap break-words">{data ? JSON.stringify(data, null, 2) : '—'}</pre></div>)}</div>
      </article>)}
    </section></div>}
  </>;
}
