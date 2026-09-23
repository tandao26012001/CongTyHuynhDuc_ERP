import { FormEvent, useCallback, useEffect, useState } from 'react';
import { DonViTinh, layDonViTinh, taoDonViTinh, xoaDonViTinh } from '../api/client';
import { BulkUnitPaste } from './BulkUnitPaste';
import { confirmDeleteRows, RowSelectionActions, SelectionCheckbox, useRowSelection } from './RowSelection';

export function UnitPanel({ onNotify }: { onNotify: (message: string) => void }) {
  const [items, setItems] = useState<DonViTinh[]>([]);
  const [form, setForm] = useState({ dvt: '', ten_dvt: '', so_le: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const selection = useRowSelection(items.map((item) => item.dvt));

  async function deleteItems(ids: Set<string>) {
    if (!ids.size || !confirmDeleteRows(ids.size, 'đơn vị tính')) return;
    setSaving(true); setListError('');
    const results = await Promise.allSettled([...ids].map(xoaDonViTinh));
    const failed = results.filter((result) => result.status === 'rejected');
    await load(); selection.clearSelection(); setSaving(false);
    if (failed.length) setListError(`Đã xoá ${ids.size - failed.length}/${ids.size} đơn vị tính. ${failed.length} dòng đang được sử dụng hoặc không thể xoá.`);
    else onNotify(`Đã xoá ${ids.size} đơn vị tính.`);
  }

  const load = useCallback(async () => {
    setLoading(true);
    setListError('');
    try { setItems(await layDonViTinh()); }
    catch (reason) { setListError(reason instanceof Error ? reason.message : 'Không tải được đơn vị tính.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openForm() {
    setForm({ dvt: '', ten_dvt: '', so_le: 0 });
    setError('');
    setShowForm(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await taoDonViTinh({ ...form, dvt: form.dvt.trim().toUpperCase() });
      await load();
      setShowForm(false);
      onNotify('Đã thêm đơn vị tính thành công.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thêm được đơn vị tính.');
    } finally { setSaving(false); }
  }

  return <div className="space-y-4">
    <div className="bg-white border border-[#DCE1EC] rounded p-4 flex flex-wrap gap-2">
      <button type="button" onClick={openForm} className="min-h-11 px-5 bg-[#283A97] text-white font-bold rounded flex items-center gap-2"><span className="material-symbols-outlined">add</span>THÊM MỚI</button>
      <button type="button" onClick={() => setShowBulk(true)} className="min-h-11 px-5 border border-[#283A97] text-[#283A97] font-bold rounded flex items-center gap-2"><span className="material-symbols-outlined">upload_file</span>THÊM HÀNG LOẠT TỪ EXCEL</button>
    </div>
    {listError && <div role="alert" className="p-3 bg-[#FDECEE] border-l-4 border-[#EE202E] text-[#C4141F] text-[12px]">{listError}</div>}
    <RowSelectionActions total={items.length} selectedCount={selection.selectedCount} allSelected={selection.allSelected} onToggleAll={selection.toggleAll} onDeleteSelected={() => void deleteItems(selection.selected)} onDeleteAll={() => void deleteItems(new Set(items.map((item) => item.dvt)))} disabled={saving || loading} />
    <div className="bg-white border border-[#DCE1EC] rounded overflow-x-auto">
      {loading ? <p className="p-5 text-[#59627A]">Đang tải đơn vị tính…</p> : items.length === 0 ? <p className="p-5 text-[#59627A]">Chưa có đơn vị tính.</p> : <table className="w-full text-[12px]"><thead className="bg-[#F4F6FA]"><tr><th className="p-3 w-10 text-center"><SelectionCheckbox checked={selection.allSelected} onChange={selection.toggleAll} label="Chọn tất cả đơn vị tính" /></th><th className="p-3 text-left">MÃ</th><th className="p-3 text-left">TÊN ĐƠN VỊ</th><th className="p-3 text-right">SỐ LẺ</th><th className="p-3 w-14" /></tr></thead><tbody>{items.map((item) => <tr key={item.dvt} className={`border-t ${selection.selected.has(item.dvt) ? 'bg-[#EEF0F9]' : ''}`}><td className="p-3 text-center"><SelectionCheckbox checked={selection.selected.has(item.dvt)} onChange={() => selection.toggle(item.dvt)} label={`Chọn ${item.ten_dvt}`} /></td><td className="p-3 font-mono font-bold">{item.dvt}</td><td className="p-3">{item.ten_dvt}</td><td className="p-3 text-right">{item.so_le}</td><td className="p-1 text-center"><button type="button" onClick={() => void deleteItems(new Set([item.dvt]))} aria-label={`Xoá ${item.ten_dvt}`} className="min-w-10 min-h-10 text-[#EE202E]"><span className="material-symbols-outlined">delete</span></button></td></tr>)}</tbody></table>}
    </div>
    {showForm && <div className="fixed inset-0 z-[80] bg-black/45 flex items-center justify-center p-3"><form onSubmit={submit} className="bg-white w-full max-w-xl rounded shadow-xl"><header className="p-4 border-b flex items-center justify-between"><h2 className="font-bold">THÊM ĐƠN VỊ TÍNH</h2><button type="button" onClick={() => setShowForm(false)} disabled={saving} className="min-w-11 min-h-11"><span className="material-symbols-outlined">close</span></button></header><div className="p-4 space-y-3">{error && <div role="alert" className="p-3 bg-[#FDECEE] border-l-4 border-[#EE202E] text-[#C4141F] text-[12px]">{error}</div>}<label className="block text-[11px] font-bold">MÃ ĐƠN VỊ *</label><input required value={form.dvt} onChange={(e) => setForm({ ...form, dvt: e.target.value.toUpperCase() })} className="w-full h-11 px-3 border rounded" placeholder="VD: CAI" /><label className="block text-[11px] font-bold">TÊN ĐƠN VỊ *</label><input required value={form.ten_dvt} onChange={(e) => setForm({ ...form, ten_dvt: e.target.value })} className="w-full h-11 px-3 border rounded" placeholder="VD: Cái" /><label className="block text-[11px] font-bold">SỐ CHỮ SỐ THẬP PHÂN</label><input type="number" min="0" max="4" value={form.so_le} onChange={(e) => setForm({ ...form, so_le: Number(e.target.value) })} className="w-full h-11 px-3 border rounded" /></div><footer className="p-4 border-t flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => setShowForm(false)} className="min-h-11 px-5 border rounded font-bold">HỦY</button><button disabled={saving} className="min-h-11 px-5 bg-[#283A97] text-white font-bold rounded disabled:opacity-50">{saving ? 'ĐANG LƯU…' : 'LƯU ĐƠN VỊ TÍNH'}</button></footer></form></div>}
    {showBulk && <BulkUnitPaste onClose={() => setShowBulk(false)} onError={setListError} onImported={(count, hasErrors) => { if (count) onNotify(`Đã nhập ${count} đơn vị tính hợp lệ.`); void load(); if (!hasErrors) setShowBulk(false); }} />}
  </div>;
}
