import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ChungLoai, layChungLoai, layQuyTacNhanDien, nhapQuyTacNhanDien, QuyTacNhanDien, taoChungLoai, xoaChungLoai, xoaQuyTacNhanDien } from '../api/client';
import { BulkCompanyDataPaste } from './BulkCompanyDataPaste';
import { confirmDeleteRows, RowSelectionActions, SelectionCheckbox, useRowSelection } from './RowSelection';

const Alert = ({ message }: { message: string }) => message ? <div role="alert" className="p-3 bg-[#FDECEE] border-l-4 border-[#EE202E] text-[#C4141F] text-[12px]">{message}</div> : null;
const RULE_GROUP_LABELS = { VAT_LIEU: 'Vật liệu', BE_MAT: 'Bề mặt / Đặc tính', MAU_SAC: 'Màu sắc' } as const;
const RULE_NAME_LABELS = { VAT_LIEU: 'TÊN HÀNG / VẬT LIỆU THỰC TẾ', BE_MAT: 'BỀ MẶT / ĐẶC TÍNH', MAU_SAC: 'MÀU SẮC THỰC TẾ' } as const;

function Toolbar({ onNew, onBulk }: { onNew: () => void; onBulk: () => void }) {
  return <div className="bg-white border border-[#DCE1EC] rounded p-4 flex flex-wrap gap-2"><button type="button" onClick={onNew} className="min-h-11 px-5 bg-[#283A97] text-white font-bold rounded flex items-center gap-2"><span className="material-symbols-outlined">add</span>THÊM MỚI</button><button type="button" onClick={onBulk} className="min-h-11 px-5 border border-[#283A97] text-[#283A97] font-bold rounded flex items-center gap-2"><span className="material-symbols-outlined">upload_file</span>THÊM HÀNG LOẠT TỪ EXCEL</button></div>;
}

export function CategoryPanel({ onNotify }: { onNotify: (message: string) => void }) {
  const empty = { ma_chung_loai: '', ten: '', thu_tu: 0 };
  const [items, setItems] = useState<ChungLoai[]>([]);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const selection = useRowSelection(items.map((item) => item.ma));

  async function deleteItems(ids: Set<string>) {
    if (!ids.size || !confirmDeleteRows(ids.size, 'chủng loại')) return;
    setSaving(true); setListError('');
    const results = await Promise.allSettled([...ids].map(xoaChungLoai));
    const failed = results.filter((result) => result.status === 'rejected').length;
    await load(); selection.clearSelection(); setSaving(false);
    if (failed) setListError(`Đã xoá ${ids.size - failed}/${ids.size} chủng loại. ${failed} dòng đang được sử dụng hoặc không thể xoá.`);
    else onNotify(`Đã xoá ${ids.size} chủng loại.`);
  }

  const load = useCallback(async () => {
    setLoading(true); setListError('');
    try { setItems(await layChungLoai()); }
    catch (reason) { setListError(reason instanceof Error ? reason.message : 'Không tải được chủng loại.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  function openForm() { setForm(empty); setError(''); setShowForm(true); }
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      await taoChungLoai({ ...form, ma_chung_loai: form.ma_chung_loai.toUpperCase() });
      await load();
      setShowForm(false);
      onNotify('Đã thêm chủng loại thành công.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thêm được chủng loại.'); }
    finally { setSaving(false); }
  }

  return <div className="space-y-4">
    <Toolbar onNew={openForm} onBulk={() => setShowBulk(true)} />
    <Alert message={listError} />
    <RowSelectionActions total={items.length} selectedCount={selection.selectedCount} allSelected={selection.allSelected} onToggleAll={selection.toggleAll} onDeleteSelected={() => void deleteItems(selection.selected)} onDeleteAll={() => void deleteItems(new Set(items.map((item) => item.ma)))} disabled={saving || loading} />
    <div className="bg-white border border-[#DCE1EC] rounded overflow-x-auto">{loading ? <p className="p-5 text-[#59627A]">Đang tải chủng loại…</p> : items.length === 0 ? <p className="p-5 text-[#59627A]">Chưa có dữ liệu chủng loại.</p> : <table className="w-full text-[12px]"><thead className="bg-[#F4F6FA]"><tr><th className="p-3 w-10 text-center"><SelectionCheckbox checked={selection.allSelected} onChange={selection.toggleAll} label="Chọn tất cả chủng loại" /></th><th className="p-3 text-left">MÃ CHỦNG LOẠI</th><th className="p-3 text-left">TÊN CHỦNG LOẠI</th><th className="p-3 text-right">THỨ TỰ</th><th className="p-3 w-14" /></tr></thead><tbody>{items.map((item) => <tr key={item.ma} className={`border-t ${selection.selected.has(item.ma) ? 'bg-[#EEF0F9]' : ''}`}><td className="p-3 text-center"><SelectionCheckbox checked={selection.selected.has(item.ma)} onChange={() => selection.toggle(item.ma)} label={`Chọn ${item.ten}`} /></td><td className="p-3 font-mono font-bold">{item.ma}</td><td className="p-3">{item.ten}</td><td className="p-3 text-right">{item.thu_tu ?? '—'}</td><td className="p-1 text-center"><button type="button" onClick={() => void deleteItems(new Set([item.ma]))} aria-label={`Xoá ${item.ten}`} className="min-w-10 min-h-10 text-[#EE202E]"><span className="material-symbols-outlined">delete</span></button></td></tr>)}</tbody></table>}</div>
    {showForm && <div className="fixed inset-0 z-[80] bg-black/45 flex items-center justify-center p-3"><form onSubmit={submit} className="bg-white w-full max-w-xl rounded shadow-xl"><header className="p-4 border-b flex items-center justify-between"><h2 className="font-bold">THÊM CHỦNG LOẠI</h2><button type="button" disabled={saving} onClick={() => setShowForm(false)} className="min-w-11 min-h-11"><span className="material-symbols-outlined">close</span></button></header><div className="p-4 space-y-3"><Alert message={error} /><label className="block text-[11px] font-bold">MÃ CHỦNG LOẠI *</label><input required value={form.ma_chung_loai} onChange={(e) => setForm({ ...form, ma_chung_loai: e.target.value.toUpperCase() })} className="w-full h-11 px-3 border rounded" placeholder="VD: KIM_LOAI" /><label className="block text-[11px] font-bold">TÊN CHỦNG LOẠI *</label><input required value={form.ten} onChange={(e) => setForm({ ...form, ten: e.target.value })} className="w-full h-11 px-3 border rounded" placeholder="VD: Kim loại" /><label className="block text-[11px] font-bold">THỨ TỰ</label><input type="number" min="0" value={form.thu_tu} onChange={(e) => setForm({ ...form, thu_tu: Number(e.target.value) })} className="w-full h-11 px-3 border rounded" /></div><footer className="p-4 border-t flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => setShowForm(false)} className="min-h-11 px-5 border rounded font-bold">HỦY</button><button disabled={saving} className="min-h-11 px-5 bg-[#283A97] text-white font-bold rounded disabled:opacity-50">{saving ? 'ĐANG LƯU…' : 'LƯU CHỦNG LOẠI'}</button></footer></form></div>}
    {showBulk && <BulkCompanyDataPaste type="category" onClose={() => setShowBulk(false)} onImported={(count, hasErrors) => { if (count) onNotify(`Đã thêm ${count} chủng loại hợp lệ.`); void load(); if (!hasErrors) setShowBulk(false); }} />}
  </div>;
}

export function RecognitionRulePanel({ onNotify }: { onNotify: (message: string) => void }) {
  const empty = { loai: 'VAT_LIEU' as 'VAT_LIEU' | 'BE_MAT' | 'MAU_SAC', ten_thuc_te: '', ma_quy_uoc: '', vi_du_ten_hang: '', vi_du_ma_vat_tu: '' };
  const [items, setItems] = useState<QuyTacNhanDien[]>([]);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const selection = useRowSelection(items.map((item) => item.id));

  async function deleteItems(ids: Set<string>) {
    if (!ids.size || !confirmDeleteRows(ids.size, 'quy tắc nhận diện')) return;
    setSaving(true); setListError('');
    const results = await Promise.allSettled([...ids].map(xoaQuyTacNhanDien));
    const failed = results.filter((result) => result.status === 'rejected').length;
    await load(); selection.clearSelection(); setSaving(false);
    if (failed) setListError(`Đã xoá ${ids.size - failed}/${ids.size} quy tắc. ${failed} dòng không thể xoá.`);
    else onNotify(`Đã xoá ${ids.size} quy tắc nhận diện.`);
  }

  const load = useCallback(async () => {
    setLoading(true); setListError('');
    try { setItems(await layQuyTacNhanDien()); }
    catch (reason) { setListError(reason instanceof Error ? reason.message : 'Không tải được quy tắc nhận diện.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  function openForm() { setForm(empty); setError(''); setShowForm(true); }
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const result = await nhapQuyTacNhanDien([{ ...form, ma_quy_uoc: form.ma_quy_uoc.toUpperCase(), vi_du_ma_vat_tu: form.vi_du_ma_vat_tu.toUpperCase() }]);
      if (result.co_loi) throw new Error(result.errors[0]?.loi || 'Quy tắc đã tồn tại.');
      await load();
      setShowForm(false);
      onNotify('Đã thêm quy tắc nhận diện thành công.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thêm được quy tắc nhận diện.'); }
    finally { setSaving(false); }
  }

  return <div className="space-y-4">
    <Toolbar onNew={openForm} onBulk={() => setShowBulk(true)} />
    <Alert message={listError} />
    <RowSelectionActions total={items.length} selectedCount={selection.selectedCount} allSelected={selection.allSelected} onToggleAll={selection.toggleAll} onDeleteSelected={() => void deleteItems(selection.selected)} onDeleteAll={() => void deleteItems(new Set(items.map((item) => item.id)))} disabled={saving || loading} />
    <div className="bg-white border border-[#DCE1EC] rounded overflow-x-auto">{loading ? <p className="p-5 text-[#59627A]">Đang tải quy tắc…</p> : items.length === 0 ? <p className="p-5 text-[#59627A]">Chưa có quy tắc nhận diện.</p> : <table className="w-full min-w-[1050px] text-[12px]"><thead className="bg-[#F4F6FA]"><tr><th className="p-3 w-10 text-center"><SelectionCheckbox checked={selection.allSelected} onChange={selection.toggleAll} label="Chọn tất cả quy tắc" /></th><th className="p-3 text-left">NHÓM</th><th className="p-3 text-left">TÊN HÀNG / THUỘC TÍNH THỰC TẾ</th><th className="p-3 text-left">MÃ QUY ƯỚC</th><th className="p-3 text-left">VÍ DỤ TÊN HÀNG</th><th className="p-3 text-left">VÍ DỤ MÃ VT TƯƠNG ỨNG</th><th className="p-3 w-14" /></tr></thead><tbody>{items.map((item) => <tr key={item.id} className={`border-t ${selection.selected.has(item.id) ? 'bg-[#EEF0F9]' : ''}`}><td className="p-3 text-center"><SelectionCheckbox checked={selection.selected.has(item.id)} onChange={() => selection.toggle(item.id)} label={`Chọn ${item.ten_chuan}`} /></td><td className="p-3 font-bold">{RULE_GROUP_LABELS[item.loai]}</td><td className="p-3">{item.ten_chuan}</td><td className="p-3 font-mono text-[#283A97] font-bold">{item.ma_quy_uoc}</td><td className="p-3">{item.vi_du_ten_hang || '—'}</td><td className="p-3 font-mono">{item.vi_du_ma_vat_tu || '—'}</td><td className="p-1 text-center"><button type="button" onClick={() => void deleteItems(new Set([item.id]))} aria-label={`Xoá ${item.ten_chuan}`} className="min-w-10 min-h-10 text-[#EE202E]"><span className="material-symbols-outlined">delete</span></button></td></tr>)}</tbody></table>}</div>
    {showForm && <div className="fixed inset-0 z-[80] bg-black/45 flex items-center justify-center p-3"><form onSubmit={submit} className="bg-white w-full max-w-3xl rounded shadow-xl"><header className="p-4 border-b flex items-center justify-between"><div><h2 className="font-bold">THÊM QUY TẮC NHẬN DIỆN</h2><p className="mt-1 text-[12px] text-[#59627A]">Nội dung theo mẫu QUY TẮC ĐẶT TÊN HÀNG.xlsx</p></div><button type="button" disabled={saving} onClick={() => setShowForm(false)} className="min-w-11 min-h-11"><span className="material-symbols-outlined">close</span></button></header><div className="p-4 grid sm:grid-cols-2 gap-3"><div className="sm:col-span-2"><Alert message={error} /></div><label className="text-[11px] font-bold">NHÓM QUY TẮC *<select value={form.loai} onChange={(e) => setForm({ ...form, loai: e.target.value as typeof form.loai })} className="mt-1 w-full h-11 px-3 border rounded font-normal"><option value="VAT_LIEU">Vật liệu</option><option value="BE_MAT">Bề mặt / Đặc tính</option><option value="MAU_SAC">Màu sắc</option></select></label><label className="text-[11px] font-bold">MÃ QUY ƯỚC *<input required value={form.ma_quy_uoc} onChange={(e) => setForm({ ...form, ma_quy_uoc: e.target.value.toUpperCase() })} className="mt-1 w-full h-11 px-3 border rounded font-normal" placeholder="VD: SUS304" /></label><label className="text-[11px] font-bold sm:col-span-2">{RULE_NAME_LABELS[form.loai]} *<input required value={form.ten_thuc_te} onChange={(e) => setForm({ ...form, ten_thuc_te: e.target.value })} className="mt-1 w-full h-11 px-3 border rounded font-normal" placeholder="VD: Inox 304 / SUS 304" /></label><label className="text-[11px] font-bold">VÍ DỤ TÊN HÀNG<input value={form.vi_du_ten_hang} onChange={(e) => setForm({ ...form, vi_du_ten_hang: e.target.value })} className="mt-1 w-full h-11 px-3 border rounded font-normal" placeholder="VD: INOX 304 4.0MM*690*420" /></label><label className="text-[11px] font-bold">VÍ DỤ MÃ VT TƯƠNG ỨNG<input value={form.vi_du_ma_vat_tu} onChange={(e) => setForm({ ...form, vi_du_ma_vat_tu: e.target.value.toUpperCase() })} className="mt-1 w-full h-11 px-3 border rounded font-normal" placeholder="VD: VT-TL-SUS304-01" /></label></div><footer className="p-4 border-t flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => setShowForm(false)} className="min-h-11 px-5 border rounded font-bold">HỦY</button><button disabled={saving} className="min-h-11 px-5 bg-[#283A97] text-white font-bold rounded disabled:opacity-50">{saving ? 'ĐANG LƯU…' : 'LƯU QUY TẮC'}</button></footer></form></div>}
    {showBulk && <BulkCompanyDataPaste type="recognition" onClose={() => setShowBulk(false)} onImported={(count, hasErrors) => { if (count) onNotify(`Đã thêm ${count} quy tắc hợp lệ.`); void load(); if (!hasErrors) setShowBulk(false); }} />}
  </div>;
}
