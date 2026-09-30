import { FormEvent, useEffect, useState } from 'react';
import { HoSoTuongTacPanel } from './HoSoTuongTacPanel';
import { datDinhMucNcc, DinhMucNcc, duyetMatHangNcc, layDanhMucMatHangNcc, layDinhMucNcc,
  layMatHangNcc, MatHangNcc, NhaCungCapQuanLy,
  taoMatHangNcc, TaoMatHangNcc } from '../api/client';

const EMPTY: TaoMatHangNcc = { id_ncc: '', ten_hang: '', loai: 'HANG_HOA', dvt: '',
  nhom_hang_chinh: null, ma_loai_gia_cong: null };

export function SupplierItemsPanel({ supplier, canEdit, canApprove, canPropose, onNotify }: {
  supplier: NhaCungCapQuanLy | null;
  canEdit: boolean;
  canApprove: boolean;
  canPropose: boolean;
  onNotify: (message: string) => void;
}) {
  const [items, setItems] = useState<MatHangNcc[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [groups, setGroups] = useState<Array<{ ma: string; ten: string; ma_cha: string | null }>>([]);
  const [processTypes, setProcessTypes] = useState<Array<{ ma: string; ten: string }>>([]);
  const [units, setUnits] = useState<Array<{ dvt: string; ten_dvt: string }>>([]);
  const [form, setForm] = useState<TaoMatHangNcc>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [limit, setLimit] = useState<DinhMucNcc | null>(null);
  const [limitValue, setLimitValue] = useState('');
  const [limitNote, setLimitNote] = useState('');
  const [limitSaving, setLimitSaving] = useState(false);

  async function load() {
    setLoading(true); setError('');
    try { setItems(await layMatHangNcc(supplier?.ma, query, status)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được mặt hàng NCC.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [supplier?.ma, query, status]);
  useEffect(() => {
    if (!supplier) { setLimit(null); return; }
    layDinhMucNcc(supplier.ma).then((result) => {
      setLimit(result); setLimitValue(result.dinh_muc_thang?.toString() || '');
      setLimitNote(result.ghi_chu_dinh_muc || '');
    }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Không tải được định mức.'));
  }, [supplier?.ma]);

  async function saveLimit() {
    if (!limit) return;
    setLimitSaving(true); setError('');
    try {
      const value = limitValue.trim() === '' ? null : Number(limitValue);
      if (value !== null && (!Number.isSafeInteger(value) || value < 0)) {
        setError('Định mức phải là số tiền VND nguyên không âm.'); return;
      }
      const updated = await datDinhMucNcc(limit, value, limitNote);
      setLimit(updated); onNotify('Đã lưu định mức tháng của nhà cung cấp.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không lưu được định mức.'); }
    finally { setLimitSaving(false); }
  }

  async function openForm() {
    if (!supplier) return;
    setForm({ ...EMPTY, id_ncc: supplier.ma }); setFormError('');
    try {
      const catalog = await layDanhMucMatHangNcc();
      setGroups(catalog.nhom_hang);
      setProcessTypes(catalog.loai_gia_cong);
      setUnits(catalog.don_vi_tinh);
      setShowForm(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được danh mục.'); }
  }

  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setFormError('');
    try {
      await taoMatHangNcc(form);
      setShowForm(false); onNotify('Đã ghi mặt hàng nhà cung cấp.');
      await load();
    } catch (reason) { setFormError(reason instanceof Error ? reason.message : 'Không lưu được mặt hàng.'); }
    finally { setSaving(false); }
  }

  async function approve(item: MatHangNcc) {
    setError('');
    try { await duyetMatHangNcc(item); onNotify('Đã duyệt mặt hàng nhà cung cấp.'); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không duyệt được mặt hàng.'); }
  }

  return <section className="bg-white border border-[#DCE1EC] rounded p-4 space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">MẶT HÀNG CỦA NHÀ CUNG CẤP</h2><p className="text-[12px] text-[#59627A]">{supplier ? `Đang xem ${supplier.ten}` : 'Chọn một NCC ở tab Danh mục để thêm mặt hàng.'}</p></div>{canPropose && <button type="button" onClick={() => void openForm()} disabled={!supplier} className="min-h-11 px-4 bg-[#283A97] text-white rounded font-bold disabled:opacity-40">THÊM MẶT HÀNG</button>}</header>
    {limit && <div className="border rounded p-3 space-y-2"><strong className="text-[13px]">ĐỊNH MỨC ĐẶT HÀNG THÁNG</strong><p className="text-[12px] text-[#59627A]">{limit.da_dat_thang_nay === null ? 'Không có quyền xem giá trị đặt hàng.' : `Đã đặt tháng này: ${Number(limit.da_dat_thang_nay).toLocaleString('vi-VN')} VND${limit.con_lai !== null ? ` ? Còn lại: ${Number(limit.con_lai).toLocaleString('vi-VN')} VND` : ''}`}</p>{canApprove ? <div className="flex flex-wrap gap-2 items-end"><label className="text-[12px]">Định mức (VND)<input type="number" min="0" step="1" value={limitValue} onChange={(e) => setLimitValue(e.target.value)} className="block mt-1 h-11 px-3 border rounded" placeholder="Để trống nếu không áp dụng" /></label><label className="text-[12px] flex-1 min-w-48">Lý do<input value={limitNote} onChange={(e) => setLimitNote(e.target.value)} className="block mt-1 w-full h-11 px-3 border rounded" /></label><button type="button" onClick={() => void saveLimit()} disabled={limitSaving} className="min-h-11 px-4 bg-[#283A97] text-white rounded font-bold disabled:opacity-40">{limitSaving ? 'ĐANG LƯU…' : 'LƯU ĐỊNH MỨC'}</button></div> : <p className="text-[13px]">{limit.dinh_muc_thang === null ? 'Không áp dụng' : `${limit.dinh_muc_thang.toLocaleString('vi-VN')} VND`}</p>}</div>}
    <div className="grid sm:grid-cols-2 gap-3"><input aria-label="Tìm mặt hàng hoặc nhà cung cấp" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên hàng hoặc NCC" className="h-11 px-3 border rounded" /><select aria-label="Lọc trạng thái mặt hàng" value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 px-3 border rounded bg-white"><option value="">Tất cả trạng thái</option><option value="DE_XUAT">Đề xuất</option><option value="DA_DUYET">Đã duyệt</option><option value="TAM_NGUNG">Tạm ngưng</option></select></div>
    {error && <div role="alert" className="p-3 bg-[#FDECEE] text-[#C4141F] rounded">{error} <button type="button" onClick={() => void load()} className="underline">Tải lại</button></div>}
    <div className="overflow-x-auto border rounded"><table className="w-full min-w-[900px] text-[12px]"><thead className="bg-[#F4F6FA]"><tr>{['NHÀ CUNG CẤP','MÃ VẬT TƯ','TÊN HÀNG','LOẠI','NHÓM / LOẠI GIA CÔNG','ĐVT','TRẠNG THÁI','THAO TÁC'].map((head) => <th key={head} className="p-3 text-left">{head}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={8} className="p-8 text-center">Đang tải…</td></tr> : items.length === 0 ? <tr><td colSpan={8} className="p-8 text-center">Chưa có mặt hàng phù hợp.</td></tr> : items.map((item) => <tr key={item.id} className="border-t"><td className="p-3">{item.ten_ncc}</td><td className="p-3 font-mono">{item.ma_vat_tu || '—'}</td><td className="p-3 font-bold">{item.ten_hang}</td><td className="p-3">{item.loai === 'HANG_HOA' ? 'Hàng hóa' : 'Gia công'}</td><td className="p-3">{item.nhom_hang_chinh || item.ma_loai_gia_cong || '—'}</td><td className="p-3">{item.dvt}</td><td className="p-3">{item.trang_thai === 'DA_DUYET' ? 'Đã duyệt' : item.trang_thai === 'DE_XUAT' ? 'Đề xuất' : 'Tạm ngưng'}</td><td className="p-3">{canEdit && item.trang_thai === 'DE_XUAT' && <button type="button" onClick={() => void approve(item)} className="min-h-10 px-3 border border-[#283A97] text-[#283A97] rounded font-bold">DUYỆT</button>}</td></tr>)}</tbody></table></div>
    {showForm && <div className="fixed inset-0 z-[80] bg-black/45 flex items-center justify-center p-3"><form onSubmit={(event) => void save(event)} className="bg-white w-full max-w-xl max-h-[90vh] overflow-y-auto rounded shadow-xl"><header className="p-4 border-b font-bold">THÊM MẶT HÀNG CHO {supplier?.ten}</header><div className="p-4 space-y-3">{formError && <div role="alert" className="p-3 bg-[#FDECEE] text-[#C4141F] rounded">{formError}</div>}<label className="block text-[12px] font-bold">TÊN HÀNG *<input required maxLength={300} value={form.ten_hang} onChange={(e) => setForm({ ...form, ten_hang: e.target.value })} className="mt-1 w-full h-11 px-3 border rounded" /></label><label className="block text-[12px] font-bold">LOẠI *<select value={form.loai} onChange={(e) => setForm({ ...form, loai: e.target.value as TaoMatHangNcc['loai'] })} className="mt-1 w-full h-11 px-3 border rounded bg-white"><option value="HANG_HOA">Hàng hóa</option><option value="GIA_CONG">Gia công</option></select></label>{form.loai === 'HANG_HOA' ? <label className="block text-[12px] font-bold">NHÓM HÀNG CHÍNH *<select required value={form.nhom_hang_chinh || ''} onChange={(e) => setForm({ ...form, nhom_hang_chinh: e.target.value })} className="mt-1 w-full h-11 px-3 border rounded bg-white"><option value="">Chọn nhóm</option>{groups.filter((group) => !group.ma_cha).map((group) => <option key={group.ma} value={group.ma}>{group.ten}</option>)}</select></label> : <label className="block text-[12px] font-bold">LOẠI GIA CÔNG *<select required value={form.ma_loai_gia_cong || ''} onChange={(e) => setForm({ ...form, ma_loai_gia_cong: e.target.value })} className="mt-1 w-full h-11 px-3 border rounded bg-white"><option value="">Chọn loại</option>{processTypes.map((process) => <option key={process.ma} value={process.ma}>{process.ten}</option>)}</select></label>}<label className="block text-[12px] font-bold">ĐƠN VỊ TÍNH *<select required value={form.dvt} onChange={(e) => setForm({ ...form, dvt: e.target.value })} className="mt-1 w-full h-11 px-3 border rounded bg-white"><option value="">Chọn đơn vị</option>{units.map((unit) => <option key={unit.dvt} value={unit.dvt}>{unit.ten_dvt}</option>)}</select></label><label className="block text-[12px] font-bold">THÔNG SỐ KỸ THUẬT<textarea value={form.thong_so_ky_thuat || ''} onChange={(e) => setForm({ ...form, thong_so_ky_thuat: e.target.value })} className="mt-1 w-full p-3 border rounded" /></label>{form.loai === 'HANG_HOA' && form.nhom_hang_chinh && <label className="block text-[12px] font-bold">NHÓM HÀNG CHI TIẾT<select value={form.nhom_hang_chi_tiet || ''} onChange={(e) => setForm({ ...form, nhom_hang_chi_tiet: e.target.value || null })} className="mt-1 w-full h-11 px-3 border rounded bg-white"><option value="">Chưa phân loại chi tiết</option>{groups.filter((group) => group.ma_cha === form.nhom_hang_chinh).map((group) => <option key={group.ma} value={group.ma}>{group.ten}</option>)}</select></label>}</div><footer className="p-4 border-t flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => setShowForm(false)} className="min-h-11 px-4 border rounded">HỦY</button><button disabled={saving} className="min-h-11 px-4 bg-[#283A97] text-white rounded font-bold">{saving ? 'ĐANG LƯU…' : 'LƯU'}</button></footer></form></div>}
    {supplier && <HoSoTuongTacPanel loai="ncc" id={supplier.ma} canEdit={canEdit} />}
  </section>;
}
