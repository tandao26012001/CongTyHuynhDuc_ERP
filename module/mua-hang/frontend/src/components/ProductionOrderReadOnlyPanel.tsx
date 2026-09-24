import { FormEvent, useEffect, useState } from 'react';
import { layDanhSachLenhSanXuat, LenhSanXuat } from '../api/client';

function hienThiNgay(value: string | null) {
  if (!value) return '—';
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export function ProductionOrderReadOnlyPanel() {
  const [items, setItems] = useState<LenhSanXuat[]>([]);
  const [queryDraft, setQueryDraft] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void layDanhSachLenhSanXuat(query, page, pageSize)
      .then((result) => {
        if (!active) return;
        setItems(result.items);
        setTotal(result.tong);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Không tải được lệnh sản xuất.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, pageSize, query]);

  function search(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setQuery(queryDraft.trim());
  }

  return <section className="bg-white border border-[#DCE1EC] rounded overflow-hidden">
    <header className="p-4 border-b border-[#DCE1EC] flex flex-col lg:flex-row lg:items-end justify-between gap-3">
      <div><div className="flex items-center gap-2"><h2 className="font-bold text-[15px]">LỆNH SẢN XUẤT</h2><span className="pill p-info px-2 py-1 text-[10px]">CHỈ XEM</span></div><p className="mt-1 text-[12px] text-[#59627A]">Dữ liệu dùng chung từ bảng lệnh sản xuất; không cho phép thêm, sửa hoặc xoá tại đây.</p></div>
      <form onSubmit={search} className="flex w-full lg:max-w-xl gap-2"><input value={queryDraft} onChange={(event) => setQueryDraft(event.target.value)} placeholder="Tìm theo LSX, PO, khách hàng, trạng thái…" className="h-11 flex-1 min-w-0 px-3 border border-[#DCE1EC] rounded" /><button className="h-11 px-5 bg-[#283A97] text-white rounded font-bold">TÌM</button></form>
    </header>
    {error && <div role="alert" className="m-4 p-3 bg-[#FDECEE] border border-[#F9B9BE] text-[#C4141F] text-[12px]">{error}</div>}
    <div className="p-4 flex flex-wrap items-center justify-between gap-3 text-[12px]"><span className="text-[#59627A]">Hiển thị <strong>{total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)}</strong> / {total} lệnh</span><div className="flex items-center gap-2"><label>Số dòng/trang <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="ml-1 h-9 px-2 border rounded bg-white"><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1 || loading} className="w-9 h-9 border rounded disabled:opacity-40"><span className="material-symbols-outlined">chevron_left</span></button><strong>Trang {page}/{totalPages}</strong><button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages || loading} className="w-9 h-9 border rounded disabled:opacity-40"><span className="material-symbols-outlined">chevron_right</span></button></div></div>
    {loading ? <p className="p-10 text-center text-[#59627A]">Đang tải lệnh sản xuất…</p> : items.length === 0 ? <div className="p-10 text-center"><strong>Chưa có lệnh sản xuất</strong><p className="mt-1 text-[12px] text-[#59627A]">Không có dữ liệu phù hợp với từ khoá đang tìm.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-[12px]"><thead className="bg-[#F4F6FA]"><tr><th className="p-3 text-left">LỆNH SẢN XUẤT</th><th className="p-3 text-left">SỐ PO</th><th className="p-3 text-left">KHÁCH HÀNG</th><th className="p-3 text-center">NGÀY NHẬN</th><th className="p-3 text-center">KỲ HẠN KH</th><th className="p-3 text-center">ƯU TIÊN</th><th className="p-3 text-center">SỐ DÒNG</th><th className="p-3 text-left">TRẠNG THÁI</th><th className="p-3 text-left">GHI CHÚ</th></tr></thead><tbody>{items.map((item) => <tr key={item.lenh_san_xuat} className="border-t border-[#EDF0F6]"><td className="p-3 font-mono font-bold text-[#283A97]">{item.lenh_san_xuat}</td><td className="p-3">{item.so_po || '—'}</td><td className="p-3">{item.ten_khach_hang_chup || item.ma_khach_hang || '—'}</td><td className="p-3 text-center">{hienThiNgay(item.ngay_nhan_lenh)}</td><td className="p-3 text-center">{hienThiNgay(item.ki_han_khach_hang)}</td><td className="p-3 text-center">{item.muc_do_uu_tien || '—'}</td><td className="p-3 text-center font-mono">{item.so_dong}</td><td className="p-3"><span className="pill p-info px-2 py-1 text-[10px]">{item.trang_thai_don || 'CHƯA CẬP NHẬT'}</span></td><td className="p-3 max-w-72 truncate" title={item.ghi_chu || ''}>{item.ghi_chu || '—'}</td></tr>)}</tbody></table></div>}
  </section>;
}
