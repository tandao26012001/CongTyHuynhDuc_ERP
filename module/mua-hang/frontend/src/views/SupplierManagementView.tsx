import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  DuLieuNhaCungCap, layDanhSachNhaCungCap, NhaCungCapQuanLy, suaNhaCungCap, taoNhaCungCap,
} from '../api/client';
import { BulkSupplierPaste } from '../components/BulkSupplierPaste';

type FormNcc = DuLieuNhaCungCap & { ngay_phe_duyet?: string };
const FORM_MOI: FormNcc = {
  ten: '', mst: '', dia_chi: '', nguoi_lien_he: '', sdt: '', email: '',
  la_ncc_mua_hang: true, la_ncc_gia_cong: false, da_phe_duyet: false,
  trang_thai: 'HOAT_DONG', ghi_chu: '',
};

function statusName(status: string) {
  return ({ HOAT_DONG: 'Hoạt động', CANH_BAO: 'Cảnh báo', TAM_NGUNG: 'Tạm ngưng', LOAI_BO: 'Loại bỏ' } as Record<string, string>)[status] || status;
}

export function SupplierManagementView({ onNotify, canEdit }: { onNotify: (message: string) => void; canEdit: boolean }) {
  const [items, setItems] = useState<NhaCungCapQuanLy[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [form, setForm] = useState<FormNcc>(FORM_MOI);
  const [editing, setEditing] = useState<NhaCungCapQuanLy | null>(null);
  const [xacNhanTrung, setXacNhanTrung] = useState(false);
  const pageSize = 25;

  async function loadSuppliers() {
    setLoading(true);
    setError('');
    try {
      const result = await layDanhSachNhaCungCap(page, pageSize);
      setItems(result.items);
      setTotal(result.tong);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không tải được danh sách nhà cung cấp.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void loadSuppliers(); }, [page]);

  const visibleItems = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('vi');
    return items.filter((item) => {
      const matchKeyword = !keyword || `${item.ma} ${item.ma_ncc} ${item.ten} ${item.mst || ''} ${item.nguoi_lien_he || ''}`.toLocaleLowerCase('vi').includes(keyword);
      const matchStatus = !statusFilter || item.trang_thai === statusFilter;
      const matchType = !typeFilter || (typeFilter === 'MUA_HANG' ? item.la_ncc_mua_hang : item.la_ncc_gia_cong);
      return matchKeyword && matchStatus && matchType;
    });
  }, [items, query, statusFilter, typeFilter]);

  useEffect(() => { setSelected([]); }, [page, query, statusFilter, typeFilter]);

  async function layTatCaTheoBoLoc() {
    const first = await layDanhSachNhaCungCap(1, 100);
    const all = [...first.items];
    for (let currentPage = 2; all.length < first.tong; currentPage += 1) {
      const next = await layDanhSachNhaCungCap(currentPage, 100);
      if (!next.items.length) break;
      all.push(...next.items);
    }
    const keyword = query.trim().toLocaleLowerCase('vi');
    return all.filter((item) => {
      const matchKeyword = !keyword || `${item.ma} ${item.ma_ncc} ${item.ten} ${item.mst || ''} ${item.nguoi_lien_he || ''}`.toLocaleLowerCase('vi').includes(keyword);
      const matchStatus = !statusFilter || item.trang_thai === statusFilter;
      const matchType = !typeFilter || (typeFilter === 'MUA_HANG' ? item.la_ncc_mua_hang : item.la_ncc_gia_cong);
      return matchKeyword && matchStatus && matchType;
    });
  }

  function toggleSelected(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  async function archiveSuppliers(targets: NhaCungCapQuanLy[]) {
    if (!canEdit || targets.length === 0 || bulkBusy) return;
    const confirmed = window.confirm(`Chuyển ${targets.length} nhà cung cấp sang trạng thái Loại bỏ? Dữ liệu vẫn được lưu để tra cứu lịch sử.`);
    if (!confirmed) return;
    setBulkBusy(true);
    setError('');
    try {
      const results = await Promise.allSettled(targets.map((item) => suaNhaCungCap(item.ma, { trang_thai: 'LOAI_BO' }, item.phien_ban)));
      const failed = results.filter((result) => result.status === 'rejected').length;
      setSelected([]);
      await loadSuppliers();
      if (failed) setError(`Đã xử lý ${targets.length - failed}/${targets.length}; ${failed} NCC chưa cập nhật. Tải lại và thử từng dòng.`);
      else onNotify(`Đã chuyển ${targets.length} nhà cung cấp sang trạng thái Loại bỏ.`);
    } finally {
      setBulkBusy(false);
    }
  }

  async function downloadCsv() {
    const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    try {
      const rows = [
        ['Mã NCC', 'Tên nhà cung cấp', 'MST', 'Người liên hệ', 'Điện thoại', 'Email', 'Loại NCC', 'Trạng thái', 'Phê duyệt'],
        ...(await layTatCaTheoBoLoc()).map((item) => [item.ma, item.ten, item.mst, item.nguoi_lien_he, item.sdt, item.email,
          [item.la_ncc_mua_hang && 'Mua hàng', item.la_ncc_gia_cong && 'Gia công'].filter(Boolean).join(' / '), item.trang_thai, item.da_phe_duyet ? 'Đã duyệt' : 'Chưa duyệt']),
      ];
      const blob = new Blob([`\uFEFF${rows.map((row) => row.map(quote).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = 'nha-cung-cap.csv'; anchor.click();
      URL.revokeObjectURL(url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không tải được dữ liệu xuất file.');
    }
  }

  async function archiveAllFiltered() {
    if (!canEdit || bulkBusy) return;
    setBulkBusy(true);
    setError('');
    try {
      const targets = (await layTatCaTheoBoLoc()).filter((item) => item.trang_thai !== 'LOAI_BO');
      setBulkBusy(false);
      await archiveSuppliers(targets);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không tải được danh sách NCC cần xử lý.');
      setBulkBusy(false);
    }
  }

  function openCreate() {
    setEditing(null); setForm(FORM_MOI); setFormError(''); setXacNhanTrung(false); setShowForm(true);
  }
  function openEdit(item: NhaCungCapQuanLy) {
    setEditing(item);
    setForm({ ...FORM_MOI, ten: item.ten, mst: item.mst || '', dia_chi: item.dia_chi || '', nguoi_lien_he: item.nguoi_lien_he || '', sdt: item.sdt || '', email: item.email || '', la_ncc_mua_hang: item.la_ncc_mua_hang, la_ncc_gia_cong: item.la_ncc_gia_cong, da_phe_duyet: item.da_phe_duyet, ngay_phe_duyet: item.ngay_phe_duyet || '', trang_thai: item.trang_thai, ghi_chu: item.ghi_chu || '' });
    setFormError(''); setXacNhanTrung(false); setShowForm(true);
  }
  function setField<K extends keyof FormNcc>(key: K, value: FormNcc[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setFormError('');
    try {
      const payload = { ...form, xac_nhan_trung: xacNhanTrung };
      const result = editing
        ? await suaNhaCungCap(editing.ma, payload, editing.phien_ban)
        : await taoNhaCungCap(payload);
      if (result.can_xac_nhan && !xacNhanTrung) {
        setXacNhanTrung(true);
        setFormError(`Có nhà cung cấp gần trùng; hãy rà soát cảnh báo rồi bấm xác nhận để tiếp tục. ${JSON.stringify(result.canh_bao_trung || [])}`);
        return;
      }
      if (!result.da_luu) throw new Error('Hệ thống chưa lưu được nhà cung cấp.');
      setShowForm(false);
      await loadSuppliers();
      onNotify(editing ? 'Đã cập nhật nhà cung cấp.' : 'Đã thêm nhà cung cấp.');
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : 'Không lưu được nhà cung cấp.');
    } finally {
      setSaving(false);
    }
  }

  return <div className="space-y-4">
    <header className="bg-white border border-[#DCE1EC] rounded p-4 flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-[21px] font-bold">QUẢN LÝ NHÀ CUNG CẤP</h1><p className="mt-1 text-[13px] text-[#59627A]">Danh mục NCC do bộ phận Mua hàng quản lý; Kinh doanh chỉ chọn NCC gia công khi xử lý Đặt ngoài.</p></div>
      {canEdit && <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setShowBulkForm(true)} className="min-h-11 px-4 border border-[#283A97] text-[#283A97] rounded font-bold">THÊM HÀNG LOẠT</button><button type="button" onClick={openCreate} className="min-h-11 px-4 bg-[#283A97] text-white rounded font-bold">THÊM NHÀ CUNG CẤP</button></div>}
    </header>
    {error && <div role="alert" className="p-3 bg-[#FDECEE] border-l-4 border-[#EE202E] text-[#C4141F] text-[13px] flex items-center justify-between gap-3"><span>{error}</span><button type="button" onClick={() => void loadSuppliers()} className="min-h-10 px-3 border border-[#C4141F] rounded font-bold">TẢI LẠI</button></div>}
    <section className="bg-white border border-[#DCE1EC] rounded p-4 space-y-3">
      <div className="grid sm:grid-cols-2 lg:grid-cols-[1fr_220px_220px_auto] gap-3 items-end">
        <label className="block text-[12px] font-bold">TÌM NHÀ CUNG CẤP<input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Mã NCC, tên, MST, người liên hệ" className="mt-1 w-full h-11 px-3 border rounded font-normal" /></label>
        <label className="block text-[12px] font-bold">TRẠNG THÁI<select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} className="mt-1 w-full h-11 px-3 border rounded bg-white font-normal"><option value="">Tất cả</option><option value="HOAT_DONG">Hoạt động</option><option value="CANH_BAO">Cảnh báo</option><option value="TAM_NGUNG">Tạm ngưng</option><option value="LOAI_BO">Loại bỏ</option></select></label>
        <label className="block text-[12px] font-bold">LOẠI NCC<select value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setPage(1); }} className="mt-1 w-full h-11 px-3 border rounded bg-white font-normal"><option value="">Tất cả</option><option value="MUA_HANG">Mua hàng</option><option value="GIA_CONG">Gia công</option></select></label>
        <button type="button" onClick={() => void downloadCsv()} disabled={loading || !total} className="min-h-11 px-4 border border-[#283A97] text-[#283A97] rounded font-bold disabled:opacity-40">TẢI XUỐNG CSV</button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#59627A]"><span>Tổng {total} nhà cung cấp · {visibleItems.length} dòng trên trang · Trang {page}/{Math.max(1, Math.ceil(total / pageSize))}</span><div className="flex gap-2">{canEdit && <><button type="button" disabled={!selected.length || bulkBusy} onClick={() => void archiveSuppliers(visibleItems.filter((item) => selected.includes(item.ma)))} className="min-h-10 px-3 border border-[#EE202E] text-[#C4141F] rounded font-bold disabled:opacity-40">{bulkBusy ? 'ĐANG XỬ LÝ…' : `XÓA ĐÃ CHỌN (${selected.length})`}</button><button type="button" disabled={!total || bulkBusy} onClick={() => void archiveAllFiltered()} className="min-h-10 px-3 border border-[#EE202E] text-[#C4141F] rounded font-bold disabled:opacity-40">XÓA TẤT CẢ THEO BỘ LỌC</button></>}</div></div>
      <div className="overflow-x-auto border rounded"><table className="w-full min-w-[1050px] text-[12px]"><thead className="bg-[#F4F6FA]"><tr><th className="p-3"><input aria-label="Chọn tất cả dòng trên trang" type="checkbox" checked={visibleItems.length > 0 && visibleItems.every((item) => selected.includes(item.ma))} onChange={(event) => setSelected(event.target.checked ? visibleItems.map((item) => item.ma) : [])} /></th>{['MÃ NCC', 'TÊN NHÀ CUNG CẤP', 'MST', 'LOẠI NCC', 'TRẠNG THÁI', 'THAO TÁC'].map((label) => <th key={label} className="p-3 text-left">{label}</th>)}</tr></thead><tbody>
        {loading ? <tr><td colSpan={7} className="p-8 text-center">Đang tải danh sách…</td></tr> : visibleItems.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-[#59627A]">Không có nhà cung cấp phù hợp. Thử đổi bộ lọc hoặc thêm nhà cung cấp mới.</td></tr> : visibleItems.map((item) => <tr key={item.ma} className="border-t"><td className="p-3"><input aria-label={`Chọn ${item.ma}`} type="checkbox" checked={selected.includes(item.ma)} onChange={() => toggleSelected(item.ma)} /></td><td className="p-3"><strong className="font-mono">{item.ma}</strong>{item.ma_ncc !== item.ma && <span className="block mt-1 text-[#59627A]">Mã cũ: <span className="font-mono">{item.ma_ncc}</span></span>}</td><td className="p-3"><strong>{item.ten}</strong>{item.nguoi_lien_he && <span className="block mt-1 text-[#59627A]">{item.nguoi_lien_he} · {item.sdt || 'Chưa có SĐT'}</span>}</td><td className="p-3 font-mono">{item.mst || '—'}</td><td className="p-3">{[item.la_ncc_mua_hang && 'Mua hàng', item.la_ncc_gia_cong && 'Gia công'].filter(Boolean).join(' · ')}</td><td className="p-3"><span className="pill p-info px-2 py-1">{statusName(item.trang_thai)}{item.da_phe_duyet ? ' · Đã duyệt' : ' · Chưa duyệt'}</span></td><td className="p-3"><div className="flex gap-2">{canEdit && <><button type="button" onClick={() => openEdit(item)} className="min-h-10 px-3 border border-[#283A97] text-[#283A97] rounded font-bold">CHỈNH SỬA</button>{item.trang_thai !== 'LOAI_BO' && <button type="button" disabled={bulkBusy} onClick={() => void archiveSuppliers([item])} className="min-h-10 px-3 border border-[#EE202E] text-[#C4141F] rounded font-bold">XÓA</button>}</>}</div></td></tr>)}
      </tbody></table></div>
      <div className="flex justify-end gap-2"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="min-h-10 px-4 border rounded disabled:opacity-40">TRƯỚC</button><button type="button" disabled={page >= Math.max(1, Math.ceil(total / pageSize)) || loading} onClick={() => setPage((value) => value + 1)} className="min-h-10 px-4 border rounded disabled:opacity-40">SAU</button></div>
    </section>
    {showBulkForm && <BulkSupplierPaste onClose={() => setShowBulkForm(false)} onImported={(count, hasErrors) => { if (count) { onNotify(`Đã thêm ${count} nhà cung cấp hợp lệ.`); void loadSuppliers(); } if (!hasErrors) setShowBulkForm(false); }} />}
    {showForm && <div className="fixed inset-0 z-[80] bg-black/45 flex items-center justify-center p-3"><form onSubmit={(event) => void save(event)} className="bg-white w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded shadow-xl">
      <header className="p-4 border-b border-[#DCE1EC] flex items-center justify-between"><div><h2 className="text-[16px] font-bold">{editing ? 'CHỈNH SỬA NHÀ CUNG CẤP' : 'THÊM NHÀ CUNG CẤP'}</h2><p className="mt-1 text-[12px] text-[#59627A]">Thông tin được lưu theo danh mục NCC chung.</p></div><button type="button" disabled={saving} onClick={() => setShowForm(false)} aria-label="Đóng form" className="min-w-11 min-h-11"><span className="material-symbols-outlined">close</span></button></header>
      <div className="p-4 space-y-4">
        {formError && <div role="alert" className="p-3 bg-[#FDECEE] border-l-4 border-[#EE202E] text-[#C4141F] text-[12px] break-words">{formError}</div>}
        <div className="p-3 bg-[#EEF0F9] border border-[#C6CCE9] rounded text-[12px] text-[#59627A]">Mã NCC sẽ được hệ thống tự cấp theo thứ tự khi lưu.</div>
        <div className="grid sm:grid-cols-2 gap-3"><label className="text-[12px] font-bold">TÊN NHÀ CUNG CẤP *<input required maxLength={300} value={form.ten} onChange={(event) => setField('ten', event.target.value)} className="mt-1 w-full h-11 px-3 border rounded font-normal" /></label><label className="text-[12px] font-bold">MÃ SỐ THUẾ<input maxLength={20} value={form.mst || ''} onChange={(event) => setField('mst', event.target.value)} className="mt-1 w-full h-11 px-3 border rounded font-normal" /></label><label className="text-[12px] font-bold">NGƯỜI LIÊN HỆ<input maxLength={120} value={form.nguoi_lien_he || ''} onChange={(event) => setField('nguoi_lien_he', event.target.value)} className="mt-1 w-full h-11 px-3 border rounded font-normal" /></label><label className="text-[12px] font-bold">SỐ ĐIỆN THOẠI<input maxLength={40} value={form.sdt || ''} onChange={(event) => setField('sdt', event.target.value)} className="mt-1 w-full h-11 px-3 border rounded font-normal" /></label><label className="text-[12px] font-bold">EMAIL<input type="email" maxLength={120} value={form.email || ''} onChange={(event) => setField('email', event.target.value)} className="mt-1 w-full h-11 px-3 border rounded font-normal" /></label></div>
        <label className="block text-[12px] font-bold">ĐỊA CHỈ<textarea rows={2} value={form.dia_chi || ''} onChange={(event) => setField('dia_chi', event.target.value)} className="mt-1 w-full p-3 border rounded font-normal" /></label>
        <div className="flex flex-wrap gap-5 text-[13px]"><label className="flex items-center gap-2"><input type="checkbox" checked={form.la_ncc_mua_hang} onChange={(event) => setField('la_ncc_mua_hang', event.target.checked)} />NCC mua hàng</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.la_ncc_gia_cong} onChange={(event) => setField('la_ncc_gia_cong', event.target.checked)} />NCC gia công</label></div>
        <div className="grid sm:grid-cols-2 gap-3"><label className="text-[12px] font-bold">TRẠNG THÁI<select value={form.trang_thai} onChange={(event) => setField('trang_thai', event.target.value)} className="mt-1 w-full h-11 px-3 border rounded bg-white font-normal"><option value="HOAT_DONG">Hoạt động</option><option value="CANH_BAO">Cảnh báo</option><option value="TAM_NGUNG">Tạm ngưng</option><option value="LOAI_BO">Loại bỏ</option></select></label><label className="flex items-center gap-2 self-end min-h-11"><input type="checkbox" checked={form.da_phe_duyet} onChange={(event) => { setField('da_phe_duyet', event.target.checked); if (event.target.checked && !form.ngay_phe_duyet) setField('ngay_phe_duyet', new Date().toISOString().slice(0, 10)); }} />Đã phê duyệt</label></div>
        {form.da_phe_duyet && <label className="block text-[12px] font-bold">NGÀY PHÊ DUYỆT *<input type="date" required value={form.ngay_phe_duyet || ''} onChange={(event) => setField('ngay_phe_duyet', event.target.value)} className="mt-1 w-full h-11 px-3 border rounded font-normal" /></label>}
        <label className="block text-[12px] font-bold">GHI CHÚ<textarea rows={2} value={form.ghi_chu || ''} onChange={(event) => setField('ghi_chu', event.target.value)} className="mt-1 w-full p-3 border rounded font-normal" /></label>
      </div>
      <footer className="p-4 border-t border-[#DCE1EC] flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => setShowForm(false)} className="min-h-11 px-5 border rounded font-bold">HỦY</button><button type="submit" disabled={saving} className="min-h-11 px-5 bg-[#283A97] text-white rounded font-bold disabled:opacity-50">{saving ? 'ĐANG LƯU…' : xacNhanTrung ? 'XÁC NHẬN LƯU' : 'LƯU NHÀ CUNG CẤP'}</button></footer>
    </form></div>}
  </div>;
}
