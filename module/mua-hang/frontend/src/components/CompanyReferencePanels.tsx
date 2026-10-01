import { FormEvent, useCallback, useEffect, useState } from 'react';
import { BoPhanDanhMuc, ChungLoai, DuLieuBoPhan, DuLieuNhanVien, layBoPhanDanhMuc, layChungLoai, layDanhSachBoPhan, layNhanVienDanhMuc, layQuyTacNhanDien, NhanVienDanhMuc, nhapQuyTacNhanDien, QuyTacNhanDien, suaBoPhan, suaNhanVien, taoBoPhan, taoChungLoai, taoNhanVien, xoaChungLoai, xoaQuyTacNhanDien } from '../api/client';
import { BulkCompanyDataPaste } from './BulkCompanyDataPaste';
import { BulkDepartmentPaste } from './BulkDepartmentPaste';
import { BulkEmployeePaste } from './BulkEmployeePaste';
import { CatalogHistoryButton } from './CatalogHistoryButton';
import { confirmDeleteRows, RowSelectionActions, SelectionCheckbox, useRowSelection } from './RowSelection';
import { FilterField, FilterValues, SharedFilterBar } from './SharedFilterBar';

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
    <div className="bg-white border border-[#DCE1EC] rounded overflow-x-auto">{loading ? <p className="p-5 text-[#59627A]">Đang tải chủng loại…</p> : items.length === 0 ? <p className="p-5 text-[#59627A]">Chưa có dữ liệu chủng loại.</p> : <table className="w-full text-[12px]"><thead className="bg-[#F4F6FA]"><tr><th className="p-3 w-10 text-center"><SelectionCheckbox checked={selection.allSelected} onChange={selection.toggleAll} label="Chọn tất cả chủng loại" /></th><th className="p-3 text-left">MÃ CHỦNG LOẠI</th><th className="p-3 text-left">TÊN CHỦNG LOẠI</th><th className="p-3 text-right">THỨ TỰ</th><th className="p-3 w-14" /></tr></thead><tbody>{items.map((item) => <tr key={item.ma} className={`border-t ${selection.selected.has(item.ma) ? 'bg-[#EEF0F9]' : ''}`}><td className="p-3 text-center"><SelectionCheckbox checked={selection.selected.has(item.ma)} onChange={() => selection.toggle(item.ma)} label={`Chọn ${item.ten}`} /></td><td className="p-3 font-mono font-bold"><span>{item.ma}</span><CatalogHistoryButton ma="chung-loai" id={item.ma} ten={item.ten} /></td><td className="p-3">{item.ten}</td><td className="p-3 text-right">{item.thu_tu ?? '—'}</td><td className="p-1 text-center"><button type="button" onClick={() => void deleteItems(new Set([item.ma]))} aria-label={`Xoá ${item.ten}`} className="min-w-10 min-h-10 text-[#EE202E]"><span className="material-symbols-outlined">delete</span></button></td></tr>)}</tbody></table>}</div>
    {showForm && <div className="fixed inset-0 z-[80] bg-black/45 flex items-center justify-center p-3"><form onSubmit={submit} className="bg-white w-full max-w-xl rounded shadow-xl"><header className="p-4 border-b flex items-center justify-between"><h2 className="font-bold">THÊM CHỦNG LOẠI</h2><button type="button" disabled={saving} onClick={() => setShowForm(false)} className="min-w-11 min-h-11"><span className="material-symbols-outlined">close</span></button></header><div className="p-4 space-y-3"><Alert message={error} /><label className="block text-[11px] font-bold">MÃ CHỦNG LOẠI *</label><input required value={form.ma_chung_loai} onChange={(e) => setForm({ ...form, ma_chung_loai: e.target.value.toUpperCase() })} className="w-full h-11 px-3 border rounded" placeholder="VD: KIM_LOAI" /><label className="block text-[11px] font-bold">TÊN CHỦNG LOẠI *</label><input required value={form.ten} onChange={(e) => setForm({ ...form, ten: e.target.value })} className="w-full h-11 px-3 border rounded" placeholder="VD: Kim loại" /><label className="block text-[11px] font-bold">THỨ TỰ</label><input type="number" min="0" value={form.thu_tu} onChange={(e) => setForm({ ...form, thu_tu: Number(e.target.value) })} className="w-full h-11 px-3 border rounded" /></div><footer className="p-4 border-t flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => setShowForm(false)} className="min-h-11 px-5 border rounded font-bold">HỦY</button><button disabled={saving} className="min-h-11 px-5 bg-[#283A97] text-white font-bold rounded disabled:opacity-50">{saving ? 'ĐANG LƯU…' : 'LƯU CHỦNG LOẠI'}</button></footer></form></div>}
    {showBulk && <BulkCompanyDataPaste type="category" onClose={() => setShowBulk(false)} onImported={(count, hasErrors) => { if (count) onNotify(`Đã thêm ${count} chủng loại hợp lệ.`); void load(); if (!hasErrors) setShowBulk(false); }} />}
  </div>;
}

const EMPTY_DEPARTMENT: DuLieuBoPhan = {
  ma_bo_phan: '', ten: '', loai: '', thu_tu: 0, trang_thai: 'HOAT_DONG',
};

export function DepartmentPanel({ onNotify }: { onNotify: (message: string) => void }) {
  const [items, setItems] = useState<BoPhanDanhMuc[]>([]);
  const [filters, setFilters] = useState<FilterValues>({ q: '', trang_thai: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [editing, setEditing] = useState<BoPhanDanhMuc | null>(null);
  const [form, setForm] = useState<DuLieuBoPhan>(EMPTY_DEPARTMENT);
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const filterFields: FilterField[] = [
    { key: 'q', label: 'TỪ KHÓA', placeholder: 'Mã, tên hoặc loại bộ phận…' },
    { key: 'trang_thai', label: 'TRẠNG THÁI', type: 'select', options: [{ value: 'HOAT_DONG', label: 'Đang hoạt động' }, { value: 'NGUNG', label: 'Ngưng hoạt động' }] },
  ];

  const load = useCallback(async (nextPage = page, nextFilters = filters) => {
    setLoading(true); setError('');
    try {
      const result = await layDanhSachBoPhan(nextPage, pageSize, nextFilters);
      setItems(result.items); setTotal(result.tong);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được danh sách bộ phận.'); }
    finally { setLoading(false); }
  }, [page, pageSize, filters]);

  useEffect(() => { void load(page, filters); }, [page, pageSize, filters]);

  function openNew() {
    setEditing(null); setForm(EMPTY_DEPARTMENT); setFormError(''); setShowForm(true);
  }
  function openEdit(item: BoPhanDanhMuc) {
    setEditing(item); setForm({
      ma_bo_phan: item.ma, ten: item.ten, loai: item.loai || '', thu_tu: item.thu_tu || 0,
      trang_thai: item.trang_thai as DuLieuBoPhan['trang_thai'],
    }); setFormError(''); setShowForm(true);
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setFormError('');
    try {
      if (editing) await suaBoPhan(editing.ma, form, editing.phien_ban);
      else await taoBoPhan({ ...form, ma_bo_phan: form.ma_bo_phan.toUpperCase(), loai: form.loai?.toUpperCase() });
      await load(page, filters); setShowForm(false);
      onNotify(editing ? 'Đã cập nhật bộ phận.' : 'Đã thêm bộ phận mới.');
    } catch (reason) { setFormError(reason instanceof Error ? reason.message : 'Không lưu được bộ phận.'); }
    finally { setSaving(false); }
  }
  async function stopDepartment(item: BoPhanDanhMuc) {
    if (!window.confirm(`Ngừng sử dụng bộ phận ${item.ten}? Nhân viên cũ vẫn giữ nguyên bộ phận này.`)) return;
    setSaving(true); setError('');
    try {
      await suaBoPhan(item.ma, {
        ma_bo_phan: item.ma, ten: item.ten, loai: item.loai || '',
        thu_tu: item.thu_tu || 0, trang_thai: 'NGUNG',
      }, item.phien_ban);
      await load(page, filters); onNotify('Đã ngừng sử dụng bộ phận.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không cập nhật được bộ phận.'); }
    finally { setSaving(false); }
  }

  return <div className="space-y-4">
    <Toolbar onNew={openNew} onBulk={() => setShowBulk(true)} />
    <SharedFilterBar storageKey="danh-muc-bo-phan" fields={filterFields} value={filters} loading={loading} onApply={(next) => { setPage(1); setFilters(next); }} />
    <Alert message={error} />
    <div className="bg-white border border-[#DCE1EC] rounded p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 text-[12px]"><span>Hiển thị <strong>{total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)}</strong> / {total} bộ phận</span><div className="flex items-center gap-2"><label>Số dòng/trang <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="h-10 px-2 border rounded bg-white"><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1 || loading} className="min-w-10 h-10 border rounded disabled:opacity-40"><span className="material-symbols-outlined">chevron_left</span></button><strong>Trang {page}/{totalPages}</strong><button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages || loading} className="min-w-10 h-10 border rounded disabled:opacity-40"><span className="material-symbols-outlined">chevron_right</span></button></div></div>
      {loading ? <p className="py-8 text-center text-[#59627A]">Đang tải bộ phận…</p> : items.length === 0 ? <div className="py-8 text-center"><strong>Chưa có bộ phận phù hợp</strong><p className="mt-1 text-[12px] text-[#59627A]">Thêm bộ phận mới hoặc thay đổi điều kiện lọc.</p></div> : <div className="overflow-x-auto border rounded"><table className="w-full min-w-[850px] text-[12px]"><thead className="bg-[#F4F6FA]"><tr>{['MÃ BỘ PHẬN','TÊN BỘ PHẬN','LOẠI','THỨ TỰ','TRẠNG THÁI','THAO TÁC'].map((head) => <th key={head} className="p-3 text-left">{head}</th>)}</tr></thead><tbody>{items.map((item) => <tr key={item.ma} className="border-t"><td className="p-3 font-mono font-bold text-[#283A97]">{item.ma}</td><td className="p-3 font-semibold">{item.ten}</td><td className="p-3">{item.loai || '—'}</td><td className="p-3">{item.thu_tu ?? '—'}</td><td className="p-3"><span className={`pill px-2 py-1 text-[10px] ${item.trang_thai === 'HOAT_DONG' ? 'p-ok' : 'p-r'}`}>{item.trang_thai === 'HOAT_DONG' ? 'Đang hoạt động' : 'Ngưng hoạt động'}</span></td><td className="p-2"><div className="flex gap-1"><button type="button" onClick={() => openEdit(item)} disabled={saving} className="min-w-10 min-h-10 text-[#283A97]" aria-label={`Sửa ${item.ten}`}><span className="material-symbols-outlined">edit</span></button>{item.trang_thai === 'HOAT_DONG' && <button type="button" onClick={() => void stopDepartment(item)} disabled={saving} className="min-w-10 min-h-10 text-[#C4141F]" aria-label={`Ngừng ${item.ten}`}><span className="material-symbols-outlined">block</span></button>}</div></td></tr>)}</tbody></table></div>}
    </div>
    {showForm && <div className="fixed inset-0 z-[80] bg-black/45 flex items-center justify-center p-3"><form onSubmit={submit} className="bg-white w-full max-w-2xl rounded shadow-xl"><header className="p-4 border-b flex items-center justify-between"><h2 className="font-bold">{editing ? 'CẬP NHẬT BỘ PHẬN' : 'THÊM MỚI BỘ PHẬN'}</h2><button type="button" disabled={saving} onClick={() => setShowForm(false)} className="min-w-11 min-h-11"><span className="material-symbols-outlined">close</span></button></header><div className="p-4 grid sm:grid-cols-2 gap-3"><div className="sm:col-span-2"><Alert message={formError} /></div><label className="text-[11px] font-bold">MÃ BỘ PHẬN *<input required disabled={!!editing} maxLength={10} value={form.ma_bo_phan} onChange={(event) => setForm({ ...form, ma_bo_phan: event.target.value.toUpperCase() })} className="mt-1 w-full h-11 px-3 border rounded font-mono font-normal disabled:bg-[#F4F6FA]" placeholder="VD: KD" /></label><label className="text-[11px] font-bold">TÊN BỘ PHẬN *<input required maxLength={100} value={form.ten} onChange={(event) => setForm({ ...form, ten: event.target.value })} className="mt-1 w-full h-11 px-3 border rounded font-normal" placeholder="VD: Kinh doanh" /></label><label className="text-[11px] font-bold">LOẠI BỘ PHẬN<input list="department-types" maxLength={20} value={form.loai} onChange={(event) => setForm({ ...form, loai: event.target.value.toUpperCase() })} className="mt-1 w-full h-11 px-3 border rounded font-normal" placeholder="VD: PHONG_BAN" /><datalist id="department-types"><option value="PHONG_BAN" /><option value="BO_PHAN" /><option value="TO_SAN_XUAT" /><option value="BAN_GIAM_DOC" /></datalist></label><label className="text-[11px] font-bold">THỨ TỰ<input type="number" min="0" value={form.thu_tu ?? 0} onChange={(event) => setForm({ ...form, thu_tu: Number(event.target.value) })} className="mt-1 w-full h-11 px-3 border rounded font-normal" /></label><label className="text-[11px] font-bold sm:col-span-2">TRẠNG THÁI *<select value={form.trang_thai} onChange={(event) => setForm({ ...form, trang_thai: event.target.value as DuLieuBoPhan['trang_thai'] })} className="mt-1 w-full h-11 px-3 border rounded bg-white font-normal"><option value="HOAT_DONG">Đang hoạt động</option><option value="NGUNG">Ngưng hoạt động</option></select></label></div><footer className="p-4 border-t flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => setShowForm(false)} className="min-h-11 px-5 border rounded font-bold">HỦY</button><button disabled={saving} className="min-h-11 px-5 bg-[#283A97] text-white rounded font-bold disabled:opacity-50">{saving ? 'ĐANG LƯU…' : 'LƯU BỘ PHẬN'}</button></footer></form></div>}
    {showBulk && <BulkDepartmentPaste onClose={() => setShowBulk(false)} onImported={(count) => { onNotify(`Đã thêm ${count} bộ phận.`); void load(page, filters); }} />}
  </div>;
}

const EMPTY_EMPLOYEE: DuLieuNhanVien = {
  ma_nhan_vien: '', ho_va_ten: '', ma_bo_phan: '', chuc_vu: '', ngay_vao_lam: '',
  trang_thai: 'HOAT_DONG', ghi_chu: '',
};

const EMPLOYEE_STATUS: Record<NhanVienDanhMuc['trang_thai'], string> = {
  HOAT_DONG: 'Đang làm', TAM_NGHI: 'Tạm nghỉ', NGHI_VIEC: 'Nghỉ việc',
};

function displayDate(value: string | null) {
  if (!value) return '—';
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export function EmployeePanel({ onNotify }: { onNotify: (message: string) => void }) {
  const [items, setItems] = useState<NhanVienDanhMuc[]>([]);
  const [departments, setDepartments] = useState<BoPhanDanhMuc[]>([]);
  const [filters, setFilters] = useState<FilterValues>({ q: '', ma_bo_phan: '', trang_thai: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editing, setEditing] = useState<NhanVienDanhMuc | null>(null);
  const [form, setForm] = useState<DuLieuNhanVien>(EMPTY_EMPLOYEE);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const filterFields: FilterField[] = [
    { key: 'q', label: 'TỪ KHÓA', placeholder: 'Mã, tên hoặc chức vụ…' },
    { key: 'ma_bo_phan', label: 'BỘ PHẬN', type: 'select', options: departments.map((item) => ({ value: item.ma, label: `${item.ma} — ${item.ten}` })) },
    { key: 'trang_thai', label: 'TRẠNG THÁI', type: 'select', options: Object.entries(EMPLOYEE_STATUS).map(([value, label]) => ({ value, label })) },
  ];

  const load = useCallback(async (nextPage = page, nextFilters = filters) => {
    setLoading(true); setError('');
    try {
      const result = await layNhanVienDanhMuc(nextPage, pageSize, nextFilters);
      setItems(result.items); setTotal(result.tong);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được danh sách nhân viên.'); }
    finally { setLoading(false); }
  }, [page, pageSize, filters]);

  useEffect(() => {
    void layBoPhanDanhMuc().then((result) => setDepartments(result.items))
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Không tải được bộ phận.'));
  }, []);
  useEffect(() => { void load(page, filters); }, [page, pageSize, filters]);

  function openNew() {
    setEditing(null); setForm(EMPTY_EMPLOYEE); setFormError(''); setShowForm(true);
  }
  function openEdit(item: NhanVienDanhMuc) {
    setEditing(item); setForm({
      ma_nhan_vien: item.ma, ho_va_ten: item.ten, ma_bo_phan: item.ma_bo_phan || '',
      chuc_vu: item.chuc_vu || '', ngay_vao_lam: item.ngay_vao_lam?.slice(0, 10) || '',
      trang_thai: item.trang_thai, ghi_chu: item.ghi_chu || '',
    }); setFormError(''); setShowForm(true);
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setFormError('');
    try {
      if (editing) await suaNhanVien(editing.ma, form, editing.phien_ban);
      else await taoNhanVien({ ...form, ma_nhan_vien: form.ma_nhan_vien.toUpperCase() });
      await load(page, filters); setShowForm(false);
      onNotify(editing ? 'Đã cập nhật nhân viên.' : 'Đã thêm nhân viên mới.');
    } catch (reason) { setFormError(reason instanceof Error ? reason.message : 'Không lưu được nhân viên.'); }
    finally { setSaving(false); }
  }
  async function stopEmployee(item: NhanVienDanhMuc) {
    if (!window.confirm(`Chuyển ${item.ten} sang trạng thái Nghỉ việc?`)) return;
    setSaving(true); setError('');
    try {
      await suaNhanVien(item.ma, {
        ma_nhan_vien: item.ma, ho_va_ten: item.ten, ma_bo_phan: item.ma_bo_phan || '',
        chuc_vu: item.chuc_vu || '', ngay_vao_lam: item.ngay_vao_lam?.slice(0, 10) || '',
        trang_thai: 'NGHI_VIEC', ghi_chu: item.ghi_chu || '',
      }, item.phien_ban);
      await load(page, filters); onNotify('Đã cập nhật trạng thái nghỉ việc.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không cập nhật được nhân viên.'); }
    finally { setSaving(false); }
  }

  return <div className="space-y-4">
    <Toolbar onNew={openNew} onBulk={() => setShowBulk(true)} />
    <SharedFilterBar storageKey="danh-muc-nhan-vien" fields={filterFields} value={filters} loading={loading} onApply={(next) => { setPage(1); setFilters(next); }} />
    <Alert message={error} />
    <div className="bg-white border border-[#DCE1EC] rounded p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 text-[12px]"><span>Hiển thị <strong>{total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)}</strong> / {total} nhân viên</span><div className="flex items-center gap-2"><label>Số dòng/trang <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="h-10 px-2 border rounded bg-white"><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1 || loading} className="min-w-10 h-10 border rounded disabled:opacity-40"><span className="material-symbols-outlined">chevron_left</span></button><strong>Trang {page}/{totalPages}</strong><button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages || loading} className="min-w-10 h-10 border rounded disabled:opacity-40"><span className="material-symbols-outlined">chevron_right</span></button></div></div>
      {loading ? <p className="py-8 text-center text-[#59627A]">Đang tải nhân viên…</p> : items.length === 0 ? <div className="py-8 text-center"><strong>Chưa có nhân viên phù hợp</strong><p className="mt-1 text-[12px] text-[#59627A]">Thêm nhân viên mới hoặc thay đổi điều kiện lọc.</p></div> : <div className="overflow-x-auto border rounded"><table className="w-full min-w-[1100px] text-[12px]"><thead className="bg-[#F4F6FA]"><tr>{['MÃ NHÂN VIÊN','HỌ VÀ TÊN','BỘ PHẬN','CHỨC VỤ','NGÀY VÀO LÀM','TRẠNG THÁI','GHI CHÚ','THAO TÁC'].map((head) => <th key={head} className="p-3 text-left">{head}</th>)}</tr></thead><tbody>{items.map((item) => <tr key={item.ma} className="border-t"><td className="p-3 font-mono font-bold text-[#283A97]">{item.ma}</td><td className="p-3 font-semibold">{item.ten}</td><td className="p-3">{item.ten_bo_phan || item.ma_bo_phan || '—'}{item.ten_bo_phan && <span className="block font-mono text-[10px] text-[#59627A]">{item.ma_bo_phan}</span>}</td><td className="p-3">{item.chuc_vu || '—'}</td><td className="p-3 font-mono">{displayDate(item.ngay_vao_lam)}</td><td className="p-3"><span className={`pill px-2 py-1 text-[10px] ${item.trang_thai === 'HOAT_DONG' ? 'p-ok' : item.trang_thai === 'TAM_NGHI' ? 'p-info' : 'p-r'}`}>{EMPLOYEE_STATUS[item.trang_thai]}</span></td><td className="p-3 max-w-64 truncate" title={item.ghi_chu || ''}>{item.ghi_chu || '—'}</td><td className="p-2"><div className="flex gap-1"><button type="button" onClick={() => openEdit(item)} disabled={saving} className="min-w-10 min-h-10 text-[#283A97]" aria-label={`Sửa ${item.ten}`}><span className="material-symbols-outlined">edit</span></button>{item.trang_thai !== 'NGHI_VIEC' && <button type="button" onClick={() => void stopEmployee(item)} disabled={saving} className="min-w-10 min-h-10 text-[#C4141F]" aria-label={`Cho ${item.ten} nghỉ việc`}><span className="material-symbols-outlined">person_off</span></button>}</div></td></tr>)}</tbody></table></div>}
    </div>
    {showForm && <div className="fixed inset-0 z-[80] bg-black/45 flex items-center justify-center p-3"><form onSubmit={submit} className="bg-white w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded shadow-xl"><header className="p-4 border-b flex items-center justify-between"><h2 className="font-bold">{editing ? 'CẬP NHẬT NHÂN VIÊN' : 'THÊM MỚI NHÂN VIÊN'}</h2><button type="button" disabled={saving} onClick={() => setShowForm(false)} className="min-w-11 min-h-11"><span className="material-symbols-outlined">close</span></button></header><div className="p-4 grid sm:grid-cols-2 gap-3"><div className="sm:col-span-2"><Alert message={formError} /></div><label className="text-[11px] font-bold">MÃ NHÂN VIÊN *<input required disabled={!!editing} maxLength={20} value={form.ma_nhan_vien} onChange={(event) => setForm({ ...form, ma_nhan_vien: event.target.value.toUpperCase() })} className="mt-1 w-full h-11 px-3 border rounded font-mono font-normal disabled:bg-[#F4F6FA]" placeholder="VD: NV0001" /></label><label className="text-[11px] font-bold">HỌ VÀ TÊN *<input required maxLength={120} value={form.ho_va_ten} onChange={(event) => setForm({ ...form, ho_va_ten: event.target.value })} className="mt-1 w-full h-11 px-3 border rounded font-normal" /></label><label className="text-[11px] font-bold">BỘ PHẬN<select value={form.ma_bo_phan} onChange={(event) => setForm({ ...form, ma_bo_phan: event.target.value })} className="mt-1 w-full h-11 px-3 border rounded bg-white font-normal"><option value="">-- Chưa phân bộ phận --</option>{departments.filter((item) => item.trang_thai === 'HOAT_DONG').map((item) => <option key={item.ma} value={item.ma}>{item.ma} — {item.ten}</option>)}</select></label><label className="text-[11px] font-bold">CHỨC VỤ<input maxLength={80} value={form.chuc_vu} onChange={(event) => setForm({ ...form, chuc_vu: event.target.value })} className="mt-1 w-full h-11 px-3 border rounded font-normal" /></label><label className="text-[11px] font-bold">NGÀY VÀO LÀM<input type="date" value={form.ngay_vao_lam} onChange={(event) => setForm({ ...form, ngay_vao_lam: event.target.value })} className="mt-1 w-full h-11 px-3 border rounded font-normal" /></label><label className="text-[11px] font-bold">TRẠNG THÁI *<select required value={form.trang_thai} onChange={(event) => setForm({ ...form, trang_thai: event.target.value as DuLieuNhanVien['trang_thai'] })} className="mt-1 w-full h-11 px-3 border rounded bg-white font-normal">{Object.entries(EMPLOYEE_STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-[11px] font-bold sm:col-span-2">GHI CHÚ<textarea rows={3} maxLength={2000} value={form.ghi_chu} onChange={(event) => setForm({ ...form, ghi_chu: event.target.value })} className="mt-1 w-full p-3 border rounded font-normal" /></label></div><footer className="p-4 border-t flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => setShowForm(false)} className="min-h-11 px-5 border rounded font-bold">HỦY</button><button disabled={saving} className="min-h-11 px-5 bg-[#283A97] text-white rounded font-bold disabled:opacity-50">{saving ? 'ĐANG LƯU…' : 'LƯU NHÂN VIÊN'}</button></footer></form></div>}
    {showBulk && <BulkEmployeePaste onClose={() => setShowBulk(false)} onImported={(count) => { onNotify(`Đã thêm ${count} nhân viên.`); void load(page, filters); }} />}
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
