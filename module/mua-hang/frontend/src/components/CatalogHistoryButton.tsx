import { useState } from 'react';
import { DongLichSuDanhMuc, layLichSuDanhMuc } from '../api/client';

const ACTION_LABEL: Record<DongLichSuDanhMuc['hanh_dong'], string> = {
  TAO: 'Tạo', SUA: 'Sửa', XOA: 'Xóa', DUYET: 'Duyệt', HUY: 'Hủy',
  XEM: 'Xem', XUAT: 'Xuất',
};

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(date);
}

export function CatalogHistoryButton({ ma, id, ten }: { ma: string; id: string; ten: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<DongLichSuDanhMuc[]>([]);

  async function showHistory() {
    setOpen(true);
    setLoading(true);
    setError('');
    try {
      const result = await layLichSuDanhMuc(ma, id);
      setItems(result.items);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không tải được lịch sử.');
    } finally {
      setLoading(false);
    }
  }

  return <>
    <button type="button" onClick={() => void showHistory()} aria-label={`Lịch sử ${ten}`}
      title="Lịch sử thay đổi" className="min-w-10 min-h-10 text-[#59627A] hover:text-[#283A97]">
      <span className="material-symbols-outlined">history</span>
    </button>
    {open && <div className="fixed inset-0 z-[90] bg-black/40 p-3 flex items-center justify-center"
      role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="catalog-history-title"
        className="w-full max-w-3xl max-h-[88vh] overflow-hidden bg-white border rounded shadow-xl flex flex-col">
        <header className="px-5 py-4 border-b flex items-center justify-between gap-4">
          <div><h2 id="catalog-history-title" className="font-bold">LỊCH SỬ THAY ĐỔI</h2>
            <p className="mt-1 text-[12px] text-[#59627A]">{ten} · <span className="font-mono">{id}</span></p></div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Đóng"
            className="min-w-10 min-h-10 border rounded"><span className="material-symbols-outlined">close</span></button>
        </header>
        <div className="overflow-y-auto p-5 space-y-3">
          {loading && <p className="py-8 text-center text-[#59627A]">Đang tải lịch sử…</p>}
          {error && <div role="alert" className="p-3 bg-[#FDECEE] border border-[#F9B9BE] text-[#C4141F]">{error}</div>}
          {!loading && !error && items.length === 0 && <p className="py-8 text-center text-[#59627A]">Chưa có lịch sử ghi nhận.</p>}
          {items.map((item) => <article key={item.id} className="border rounded p-3">
            <div className="flex flex-wrap justify-between gap-2 text-[12px]">
              <strong>{ACTION_LABEL[item.hanh_dong]}</strong>
              <span>{formatTime(item.thoi_diem)} · {item.nguoi_thuc_hien || 'Không rõ người thực hiện'}</span>
            </div>
            <div className="grid gap-3 mt-3 sm:grid-cols-2">
              <div><h3 className="text-[10px] font-bold text-[#59627A]">GIÁ TRỊ CŨ</h3>
                <pre className="mt-1 whitespace-pre-wrap break-words text-[11px]">{item.du_lieu_cu ? JSON.stringify(item.du_lieu_cu, null, 2) : '—'}</pre></div>
              <div><h3 className="text-[10px] font-bold text-[#59627A]">GIÁ TRỊ MỚI</h3>
                <pre className="mt-1 whitespace-pre-wrap break-words text-[11px]">{item.du_lieu_moi ? JSON.stringify(item.du_lieu_moi, null, 2) : '—'}</pre></div>
            </div>
          </article>)}
        </div>
      </section>
    </div>}
  </>;
}
