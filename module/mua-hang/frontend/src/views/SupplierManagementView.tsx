import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ChungLoai, DanhGiaNcc, DonViTinh, DuLieuNhaCungCap, DuLieuMatHangNcc, MatHangNcc,
  MatHangNccDenHan, SuCoNcc, duyetDanhGiaNcc, layChungLoai, layDanhSachDanhGiaNcc,
  layDanhSachMatHangNcc, layDanhSachMatHangNccDenHan, layDanhSachNhaCungCap,
  layDonViTinh, laySoTheoDoiNcc, NhaCungCapQuanLy, suaMatHangNcc, suaNhaCungCap,
  taoDanhGiaNcc, taoMatHangNcc, taoNhaCungCap,
} from '../api/client';
import { BulkSupplierPaste } from '../components/BulkSupplierPaste';
import { RowSelectionActions } from '../components/RowSelection';

type FormNcc = DuLieuNhaCungCap & { ngay_phe_duyet?: string };
const FORM_MOI: FormNcc = {
  ten: '', mst: '', dia_chi: '', nguoi_lien_he: '', sdt: '', email: '',
  la_ncc_mua_hang: true, la_ncc_gia_cong: false, da_phe_duyet: false,
  dinh_muc_thang: null, ghi_chu_dinh_muc: '', nhom_hang_chi_tiet: [],
  trang_thai: 'HOAT_DONG', ghi_chu: '',
};

function statusName(status: string) {
  return ({ HOAT_DONG: 'Hoạt động', CANH_BAO: 'Cảnh báo', TAM_NGUNG: 'Tạm ngưng', LOAI_BO: 'Loại bỏ' } as Record<string, string>)[status] || status;
}

export function SupplierManagementView({ onNotify, canEdit, canApprove = false }: { onNotify: (message: string) => void; canEdit: boolean; canApprove?: boolean }) {
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
  const [pageSize, setPageSize] = useState(25);
  const [activeSection, setActiveSection] = useState<'DANH_MUC' | 'MAT_HANG' | 'DANH_GIA' | 'DEN_HAN' | 'SO_THEO_DOI'>('DANH_MUC');
  const [matHangItems, setMatHangItems] = useState<MatHangNcc[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<NhaCungCapQuanLy[]>([]);
  const [matHangTotal, setMatHangTotal] = useState(0);
  const [matHangLoading, setMatHangLoading] = useState(false);
  const [matHangError, setMatHangError] = useState('');
  const [matHangQuery, setMatHangQuery] = useState('');
  const [matHangStatus, setMatHangStatus] = useState('');
  const [showMatHangForm, setShowMatHangForm] = useState(false);
  const [matHangSaving, setMatHangSaving] = useState(false);
  const [matHangEditing, setMatHangEditing] = useState<MatHangNcc | null>(null);
  const [matHangForm, setMatHangForm] = useState<Partial<DuLieuMatHangNcc>>({ loai: 'HANG_HOA', dvt: '', trang_thai: 'DE_XUAT' });
  const [categories, setCategories] = useState<ChungLoai[]>([]);
  const [units, setUnits] = useState<DonViTinh[]>([]);
  const [evaluationItems, setEvaluationItems] = useState<DanhGiaNcc[]>([]);
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [evaluationStatus, setEvaluationStatus] = useState('');
  const [evaluationError, setEvaluationError] = useState('');
  const [showEvaluationForm, setShowEvaluationForm] = useState(false);
  const [evaluationSaving, setEvaluationSaving] = useState(false);
  const [evaluationForm, setEvaluationForm] = useState<{ id_mat_hang_ncc: string; diem_gia_ca: string; diem_tam_voc: string; diem_thanh_toan: string; diem_dich_vu: string; ghi_chu: string }>({ id_mat_hang_ncc: '', diem_gia_ca: '', diem_tam_voc: '', diem_thanh_toan: '', diem_dich_vu: '', ghi_chu: '' });
  const [dueItems, setDueItems] = useState<MatHangNccDenHan[]>([]);
  const [dueTotal, setDueTotal] = useState(0);
  const [duePage, setDuePage] = useState(1);
  const [dueLoading, setDueLoading] = useState(false);
  const [dueError, setDueError] = useState('');
  const [issueItems, setIssueItems] = useState<SuCoNcc[]>([]);
  const [issueTotal, setIssueTotal] = useState(0);
  const [issuePage, setIssuePage] = useState(1);
  const [issueLoading, setIssueLoading] = useState(false);
  const [issueError, setIssueError] = useState('');
  const [issueQuery, setIssueQuery] = useState('');
  const [issueStatus, setIssueStatus] = useState('');
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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
  useEffect(() => { void loadSuppliers(); }, [page, pageSize]);

  const visibleItems = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('vi');
    return items.filter((item) => {
      const matchKeyword = !keyword || `${item.ma} ${item.ma_ncc} ${item.ten} ${item.mst || ''} ${item.nguoi_lien_he || ''}`.toLocaleLowerCase('vi').includes(keyword);
      const matchStatus = !statusFilter || item.trang_thai === statusFilter;
      const matchType = !typeFilter || (typeFilter === 'MUA_HANG' ? item.la_ncc_mua_hang : item.la_ncc_gia_cong);
      return matchKeyword && matchStatus && matchType;
    });
  }, [items, query, statusFilter, typeFilter]);

  useEffect(() => { setSelected([]); }, [page, pageSize, query, statusFilter, typeFilter]);

  async function loadDanhGia(status = evaluationStatus) {
    setEvaluationLoading(true); setEvaluationError('');
    try {
      const result = await layDanhSachDanhGiaNcc({ trangThai: status });
      setEvaluationItems(result.items);
    } catch (reason) { setEvaluationError(reason instanceof Error ? reason.message : 'Không tải được bảng đánh giá NCC.'); }
    finally { setEvaluationLoading(false); }
  }

  async function loadDueItems() {
    setDueLoading(true); setDueError('');
    try {
      const result = await layDanhSachMatHangNccDenHan(duePage, 100);
      setDueItems(result.items); setDueTotal(result.tong);
    } catch (reason) { setDueError(reason instanceof Error ? reason.message : 'Không tải được hàng đợi đánh giá.'); }
    finally { setDueLoading(false); }
  }

  async function loadIssueItems() {
    setIssueLoading(true); setIssueError('');
    try {
      const result = await laySoTheoDoiNcc({ q: issueQuery, trangThai: issueStatus, trang: issuePage, kichThuoc: 100 });
      setIssueItems(result.items); setIssueTotal(result.tong);
    } catch (reason) { setIssueError(reason instanceof Error ? reason.message : 'Không tải được sổ theo dõi NCC.'); }
    finally { setIssueLoading(false); }
  }

  async function loadMatHang() {
    setMatHangLoading(true); setMatHangError('');
    try {
      const result = await layDanhSachMatHangNcc({ q: matHangQuery, trangThai: matHangStatus, kichThuoc: 200 });
      setMatHangItems(result.items); setMatHangTotal(result.tong);
    } catch (reason) {
      setMatHangError(reason instanceof Error ? reason.message : 'Không tải được danh sách mặt hàng NCC.');
    } finally { setMatHangLoading(false); }
  }
  useEffect(() => {
    if (activeSection === 'DEN_HAN') { void loadDueItems(); return; }
    if (activeSection === 'SO_THEO_DOI') { void loadIssueItems(); return; }
    if (activeSection !== 'MAT_HANG' && activeSection !== 'DANH_GIA') return;
    async function loadSupplierOptions() {
      const first = await layDanhSachNhaCungCap(1, 100);
      const all = [...first.items];
      for (let currentPage = 2; all.length < first.tong; currentPage += 1) {
        const next = await layDanhSachNhaCungCap(currentPage, 100);
        if (!next.items.length) break;
        all.push(...next.items);
      }
      setSupplierOptions(all);
    }
    void Promise.all([loadMatHang(), loadSupplierOptions(), layChungLoai().then(setCategories), layDonViTinh().then(setUnits), activeSection === 'DANH_GIA' ? loadDanhGia() : Promise.resolve()]).catch(() => undefined);
  }, [activeSection, duePage, issuePage, issueQuery, issueStatus]);

  function openMatHangCreate() {
    setMatHangEditing(null); setMatHangForm({ loai: 'HANG_HOA', dvt: units[0]?.dvt || '', trang_thai: 'DE_XUAT' }); setShowMatHangForm(true);
  }
  function openMatHangEdit(item: MatHangNcc) {
    setMatHangEditing(item); setMatHangForm({ ...item }); setShowMatHangForm(true);
  }
  function setMatHangField(key: keyof DuLieuMatHangNcc, value: string) {
    setMatHangForm((current) => ({ ...current, [key]: value }));
  }
  function openEvaluationCreate(idMatHang?: string) {
    setEvaluationForm({ id_mat_hang_ncc: idMatHang || matHangItems[0]?.id || '', diem_gia_ca: '', diem_tam_voc: '', diem_thanh_toan: '', diem_dich_vu: '', ghi_chu: '' });
    setShowEvaluationForm(true);
  }
  function setEvaluationField(key: keyof typeof evaluationForm, value: string) { setEvaluationForm((current) => ({ ...current, [key]: value })); }
  async function saveEvaluation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setEvaluationSaving(true); setEvaluationError('');
    try {
      await taoDanhGiaNcc({ id_mat_hang_ncc: evaluationForm.id_mat_hang_ncc, diem_gia_ca: Number(evaluationForm.diem_gia_ca), diem_tam_voc: Number(evaluationForm.diem_tam_voc), diem_thanh_toan: Number(evaluationForm.diem_thanh_toan), diem_dich_vu: Number(evaluationForm.diem_dich_vu), ghi_chu: evaluationForm.ghi_chu });
      setShowEvaluationForm(false); await Promise.all([loadDanhGia(), loadDueItems()]); onNotify('Đã lưu bảng đánh giá ở trạng thái chờ duyệt.');
    } catch (reason) { setEvaluationError(reason instanceof Error ? reason.message : 'Không lưu được bảng đánh giá.'); }
    finally { setEvaluationSaving(false); }
  }
  async function approveEvaluation(item: DanhGiaNcc) {
    try { await duyetDanhGiaNcc(item.id, item.phien_ban); await Promise.all([loadDanhGia(), loadDueItems()]); onNotify('Đã duyệt bảng đánh giá NCC.'); }
    catch (reason) { setEvaluationError(reason instanceof Error ? reason.message : 'Không duyệt được bảng đánh giá.'); }
  }

  async function saveMatHang(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMatHangSaving(true); setMatHangError('');
    try {
      const payload = {
        id_ncc: String(matHangForm.id_ncc || ''), ma_vat_tu: matHangForm.ma_vat_tu || undefined,
        ten_hang: String(matHangForm.ten_hang || ''), loai: String(matHangForm.loai || 'HANG_HOA'),
        nhom_hang_chinh: matHangForm.nhom_hang_chinh || undefined, nhom_hang_chi_tiet: matHangForm.nhom_hang_chi_tiet || undefined,
        ma_loai_gia_cong: matHangForm.ma_loai_gia_cong || undefined, dvt: String(matHangForm.dvt || ''),
        thong_so_ky_thuat: matHangForm.thong_so_ky_thuat || undefined, ghi_chu: matHangForm.ghi_chu || undefined,
        trang_thai: String(matHangForm.trang_thai || 'DE_XUAT'),
      } as DuLieuMatHangNcc;
      if (matHangEditing) await suaMatHangNcc(matHangEditing.id, payload, matHangEditing.phien_ban);
      else await taoMatHangNcc(String(payload.id_ncc), payload);
      setShowMatHangForm(false); await loadMatHang(); onNotify(matHangEditing ? 'Đã cập nhật mặt hàng NCC.' : 'Đã thêm mặt hàng NCC.');
    } catch (reason) { setMatHangError(reason instanceof Error ? reason.message : 'Không lưu được mặt hàng NCC.'); }
    finally { setMatHangSaving(false); }
  }

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
    setForm({ ...FORM_MOI, ten: item.ten, mst: item.mst || '', dia_chi: item.dia_chi || '', nguoi_lien_he: item.nguoi_lien_he || '', sdt: item.sdt || '', email: item.email || '', la_ncc_mua_hang: item.la_ncc_mua_hang, la_ncc_gia_cong: item.la_ncc_gia_cong, da_phe_duyet: item.da_phe_duyet, ngay_phe_duyet: item.ngay_phe_duyet || '', dinh_muc_thang: item.dinh_muc_thang ?? null, ghi_chu_dinh_muc: item.ghi_chu_dinh_muc || '', nhom_hang_chi_tiet: item.nhom_hang_chi_tiet || [], trang_thai: item.trang_thai, ghi_chu: item.ghi_chu || '' });
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
    <nav className="flex gap-2 overflow-x-auto border-b border-[#DCE1EC] bg-white px-4 pt-3" aria-label="Nội dung nhà cung cấp">
      <button type="button" onClick={() => setActiveSection('DANH_MUC')} className={`min-h-11 px-4 border-b-2 font-bold ${activeSection === 'DANH_MUC' ? 'border-[#283A97] text-[#283A97]' : 'border-transparent text-[#59627A]'}`}>DANH MỤC NCC</button>
      <button type="button" onClick={() => setActiveSection('MAT_HANG')} className={`min-h-11 px-4 border-b-2 font-bold ${activeSection === 'MAT_HANG' ? 'border-[#283A97] text-[#283A97]' : 'border-transparent text-[#59627A]'}`}>MẶT HÀNG CỦA NCC {matHangTotal ? `(${matHangTotal})` : ''}</button>
      <button type="button" onClick={() => setActiveSection('DANH_GIA')} className={`min-h-11 px-4 border-b-2 font-bold ${activeSection === 'DANH_GIA' ? 'border-[#283A97] text-[#283A97]' : 'border-transparent text-[#59627A]'}`}>ĐÁNH GIÁ {evaluationItems.length ? `(${evaluationItems.length})` : ''}</button>
      <button type="button" onClick={() => setActiveSection('DEN_HAN')} className={`min-h-11 px-4 border-b-2 font-bold ${activeSection === 'DEN_HAN' ? 'border-[#283A97] text-[#283A97]' : 'border-transparent text-[#59627A]'}`}>ĐẾN HẠN ĐÁNH GIÁ {dueTotal ? `(${dueTotal})` : ''}</button>
      <button type="button" onClick={() => setActiveSection('SO_THEO_DOI')} className={`min-h-11 px-4 border-b-2 font-bold ${activeSection === 'SO_THEO_DOI' ? 'border-[#283A97] text-[#283A97]' : 'border-transparent text-[#59627A]'}`}>SỔ THEO DÕI BM08 {issueTotal ? `(${issueTotal})` : ''}</button>
    </nav>
    {error && activeSection === 'DANH_MUC' && <div role="alert" className="p-3 bg-[#FDECEE] border-l-4 border-[#EE202E] text-[#C4141F] text-[13px] flex items-center justify-between gap-3"><span>{error}</span><button type="button" onClick={() => void loadSuppliers()} className="min-h-10 px-3 border border-[#C4141F] rounded font-bold">TẢI LẠI</button></div>}
    {activeSection === 'DANH_MUC' && <section className="bg-white border border-[#DCE1EC] rounded p-4 space-y-3">
      <div className="grid sm:grid-cols-2 lg:grid-cols-[1fr_220px_220px_auto] gap-3 items-end">
        <label className="block text-[12px] font-bold">TÌM NHÀ CUNG CẤP<input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Mã NCC, tên, MST, người liên hệ" className="mt-1 w-full h-11 px-3 border rounded font-normal" /></label>
        <label className="block text-[12px] font-bold">TRẠNG THÁI<select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} className="mt-1 w-full h-11 px-3 border rounded bg-white font-normal"><option value="">Tất cả</option><option value="HOAT_DONG">Hoạt động</option><option value="CANH_BAO">Cảnh báo</option><option value="TAM_NGUNG">Tạm ngưng</option><option value="LOAI_BO">Loại bỏ</option></select></label>
        <label className="block text-[12px] font-bold">LOẠI NCC<select value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setPage(1); }} className="mt-1 w-full h-11 px-3 border rounded bg-white font-normal"><option value="">Tất cả</option><option value="MUA_HANG">Mua hàng</option><option value="GIA_CONG">Gia công</option></select></label>
        <button type="button" onClick={() => void downloadCsv()} disabled={loading || !total} className="min-h-11 px-4 border border-[#283A97] text-[#283A97] rounded font-bold disabled:opacity-40">TẢI XUỐNG CSV</button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-[12px]">
        <span className="text-[#59627A]">Hiển thị <strong>{total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)}</strong> / {total} nhà cung cấp</span>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2">Số dòng/trang
            <select value={pageSize} disabled={loading} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="h-10 px-2 border border-[#DCE1EC] rounded bg-white">
              <option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
            </select>
          </label>
          <button type="button" onClick={() => setPage(1)} disabled={page <= 1 || loading} className="min-w-10 h-10 border rounded disabled:opacity-40" aria-label="Trang đầu"><span className="material-symbols-outlined">first_page</span></button>
          <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1 || loading} className="min-w-10 h-10 border rounded disabled:opacity-40" aria-label="Trang trước"><span className="material-symbols-outlined">chevron_left</span></button>
          <strong className="min-w-24 text-center">Trang {page}/{totalPages}</strong>
          <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages || loading} className="min-w-10 h-10 border rounded disabled:opacity-40" aria-label="Trang sau"><span className="material-symbols-outlined">chevron_right</span></button>
          <button type="button" onClick={() => setPage(totalPages)} disabled={page >= totalPages || loading} className="min-w-10 h-10 border rounded disabled:opacity-40" aria-label="Trang cuối"><span className="material-symbols-outlined">last_page</span></button>
        </div>
      </div>
      {canEdit && <RowSelectionActions
        total={visibleItems.length}
        selectedCount={selected.length}
        allSelected={visibleItems.length > 0 && visibleItems.every((item) => selected.includes(item.ma))}
        onToggleAll={() => setSelected(visibleItems.every((item) => selected.includes(item.ma)) ? [] : visibleItems.map((item) => item.ma))}
        onDeleteSelected={() => void archiveSuppliers(visibleItems.filter((item) => selected.includes(item.ma)))}
        onDeleteAll={() => void archiveAllFiltered()}
        disabled={loading || bulkBusy}
      />}
      <div className="overflow-x-auto border rounded"><table className="w-full min-w-[1050px] text-[12px]"><thead className="bg-[#F4F6FA]"><tr><th className="p-3"><input aria-label="Chọn tất cả dòng trên trang" type="checkbox" checked={visibleItems.length > 0 && visibleItems.every((item) => selected.includes(item.ma))} onChange={(event) => setSelected(event.target.checked ? visibleItems.map((item) => item.ma) : [])} /></th>{['MÃ NCC', 'TÊN NHÀ CUNG CẤP', 'MST', 'LOẠI NCC', 'ĐỊNH MỨC THÁNG', 'TRẠNG THÁI', 'THAO TÁC'].map((label) => <th key={label} className="p-3 text-left">{label}</th>)}</tr></thead><tbody>
        {loading ? <tr><td colSpan={8} className="p-8 text-center">Đang tải danh sách…</td></tr> : visibleItems.length === 0 ? <tr><td colSpan={8} className="p-8 text-center text-[#59627A]">Không có nhà cung cấp phù hợp. Thử đổi bộ lọc hoặc thêm nhà cung cấp mới.</td></tr> : visibleItems.map((item) => <tr key={item.ma} className="border-t"><td className="p-3"><input aria-label={`Chọn ${item.ma}`} type="checkbox" checked={selected.includes(item.ma)} onChange={() => toggleSelected(item.ma)} /></td><td className="p-3"><strong className="font-mono">{item.ma}</strong>{item.ma_ncc !== item.ma && <span className="block mt-1 text-[#59627A]">Mã cũ: <span className="font-mono">{item.ma_ncc}</span></span>}</td><td className="p-3"><strong>{item.ten}</strong>{item.nguoi_lien_he && <span className="block mt-1 text-[#59627A]">{item.nguoi_lien_he} · {item.sdt || 'Chưa có SĐT'}</span>}</td><td className="p-3 font-mono">{item.mst || '—'}</td><td className="p-3">{[item.la_ncc_mua_hang && 'Mua hàng', item.la_ncc_gia_cong && 'Gia công'].filter(Boolean).join(' · ')}</td><td className="p-3">{item.dinh_muc_thang != null ? <><span className="block">{Number(item.da_dat_thang || 0).toLocaleString('vi-VN')} / {Number(item.dinh_muc_thang).toLocaleString('vi-VN')} đ</span><span className="block mt-1 h-1.5 w-28 bg-[#E7EAF2] rounded"><span className="block h-full bg-[#283A97] rounded" style={{ width: `${Math.min(100, Number(item.da_dat_thang || 0) / Math.max(Number(item.dinh_muc_thang), 1) * 100)}%` }} /></span></> : 'Không áp dụng'}</td><td className="p-3"><span className="pill p-info px-2 py-1">{statusName(item.trang_thai)}{item.da_phe_duyet ? ' · Đã duyệt' : ' · Chưa duyệt'}</span></td><td className="p-3"><div className="flex gap-2">{canEdit && <><button type="button" onClick={() => openEdit(item)} className="min-h-10 px-3 border border-[#283A97] text-[#283A97] rounded font-bold">CHỈNH SỬA</button>{item.trang_thai !== 'LOAI_BO' && <button type="button" disabled={bulkBusy} onClick={() => void archiveSuppliers([item])} className="min-h-10 px-3 border border-[#EE202E] text-[#C4141F] rounded font-bold">XÓA</button>}</>}</div></td></tr>)}
      </tbody></table></div>

    </section>}
    {activeSection === 'MAT_HANG' && <section className="space-y-3">
      <div className="bg-white border border-[#DCE1EC] rounded p-4 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-bold text-[16px]">MẶT HÀNG CỦA NHÀ CUNG CẤP</h2><p className="mt-1 text-[12px] text-[#59627A]">Mỗi dòng là một mặt hàng hoặc loại gia công của một NCC; nhóm hàng dùng mã chuẩn.</p></div>
        {canEdit && <button type="button" onClick={openMatHangCreate} className="min-h-11 px-4 bg-[#283A97] text-white rounded font-bold">THÊM MẶT HÀNG</button>}
      </div>
      {matHangError && <div role="alert" className="p-3 bg-[#FDECEE] border-l-4 border-[#EE202E] text-[#C4141F] text-[13px]">{matHangError}</div>}
      <div className="bg-white border border-[#DCE1EC] rounded p-4 space-y-3">
        <div className="grid sm:grid-cols-[1fr_220px_auto] gap-3 items-end"><label className="block text-[12px] font-bold">TÌM NCC / MẶT HÀNG<input value={matHangQuery} onChange={(event) => setMatHangQuery(event.target.value)} placeholder="Tên NCC, mã vật tư, tên hàng" className="mt-1 w-full h-11 px-3 border rounded font-normal" /></label><label className="block text-[12px] font-bold">TRẠNG THÁI<select value={matHangStatus} onChange={(event) => setMatHangStatus(event.target.value)} className="mt-1 w-full h-11 px-3 border rounded bg-white font-normal"><option value="">Tất cả</option><option value="DE_XUAT">Đề xuất</option><option value="DA_DUYET">Đã duyệt</option><option value="TAM_NGUNG">Tạm ngưng</option></select></label><button type="button" onClick={() => void loadMatHang()} className="min-h-11 px-4 border border-[#283A97] text-[#283A97] rounded font-bold">LỌC</button></div>
        <div className="overflow-x-auto border rounded"><table className="w-full min-w-[1200px] text-[12px]"><thead className="bg-[#F4F6FA]"><tr>{['NHÀ CUNG CẤP','MẶT HÀNG','LOẠI','NHÓM / GIA CÔNG','ĐVT','CHẤT LƯỢNG','TRẠNG THÁI','THAO TÁC'].map((label) => <th key={label} className="p-3 text-left">{label}</th>)}</tr></thead><tbody>{matHangLoading ? <tr><td colSpan={8} className="p-8 text-center">Đang tải danh sách mặt hàng…</td></tr> : matHangItems.length === 0 ? <tr><td colSpan={8} className="p-8 text-center text-[#59627A]">Chưa có mặt hàng NCC phù hợp.</td></tr> : matHangItems.map((item) => <tr key={item.id} className="border-t"><td className="p-3"><strong>{item.ten_ncc}</strong><span className="block font-mono text-[#59627A]">{item.ma_ncc}</span></td><td className="p-3"><strong>{item.ten_hang}</strong>{item.ma_vat_tu && <span className="block font-mono text-[#59627A]">{item.ma_vat_tu}</span>}</td><td className="p-3">{item.loai === 'HANG_HOA' ? 'Hàng hóa' : 'Gia công'}</td><td className="p-3">{item.loai === 'HANG_HOA' ? (item.ten_nhom_hang_chinh || item.nhom_hang_chinh || 'Chưa gán nhóm') : (item.ten_loai_gia_cong || item.ma_loai_gia_cong || 'Chưa gán loại')}</td><td className="p-3">{item.ten_dvt || item.dvt}</td><td className="p-3">{item.muc_chat_luong || 'Chưa đánh giá'}{item.diem_chat_luong != null ? ` · ${item.diem_chat_luong}/10` : ''}</td><td className="p-3"><span className="pill p-info px-2 py-1">{item.trang_thai === 'DA_DUYET' ? 'Đã duyệt' : item.trang_thai === 'TAM_NGUNG' ? 'Tạm ngưng' : 'Đề xuất'}</span></td><td className="p-3">{canEdit && <button type="button" onClick={() => openMatHangEdit(item)} className="min-h-10 px-3 border border-[#283A97] text-[#283A97] rounded font-bold">CHỈNH SỬA</button>}</td></tr>)}</tbody></table></div>
      </div>
    </section>}
    {activeSection === 'DANH_GIA' && <section className="space-y-3">
      <div className="bg-white border border-[#DCE1EC] rounded p-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-[16px]">ĐÁNH GIÁ NHÀ CUNG CẤP THEO MẶT HÀNG</h2><p className="mt-1 text-[12px] text-[#59627A]">Bốn tiêu chí tự động lấy từ giao nhận và đơn hàng; bảng điểm mới phải được trưởng bộ phận duyệt.</p></div>{canEdit && <button type="button" onClick={openEvaluationCreate} disabled={!matHangItems.length} className="min-h-11 px-4 bg-[#283A97] text-white rounded font-bold disabled:opacity-40">TẠO BẢNG ĐIỂM</button>}</div>
      {evaluationError && <div role="alert" className="p-3 bg-[#FDECEE] border-l-4 border-[#EE202E] text-[#C4141F] text-[13px]">{evaluationError}</div>}
      <div className="bg-white border border-[#DCE1EC] rounded p-4 space-y-3"><div className="flex justify-end"><select value={evaluationStatus} onChange={(event) => { const status = event.target.value; setEvaluationStatus(status); void loadDanhGia(status); }} className="h-11 px-3 border rounded bg-white text-[12px]"><option value="">Tất cả trạng thái</option><option value="CHO_DUYET">Chờ duyệt</option><option value="DA_DUYET">Đã duyệt</option><option value="TU_CHOI">Từ chối</option></select></div><div className="overflow-x-auto border rounded"><table className="w-full min-w-[1100px] text-[12px]"><thead className="bg-[#F4F6FA]"><tr>{['NCC','MẶT HÀNG','ĐIỂM TỔNG','KẾT LUẬN BM06','IQC','ĐÚNG HẠN','TRẠNG THÁI','THAO TÁC'].map((label) => <th key={label} className="p-3 text-left">{label}</th>)}</tr></thead><tbody>{evaluationLoading ? <tr><td colSpan={8} className="p-8 text-center">Đang tải bảng điểm…</td></tr> : evaluationItems.length === 0 ? <tr><td colSpan={8} className="p-8 text-center text-[#59627A]">Chưa có bảng đánh giá.</td></tr> : evaluationItems.map((item) => <tr key={item.id} className="border-t"><td className="p-3"><strong>{item.ten_ncc || item.ma_ncc}</strong><span className="block font-mono text-[#59627A]">{item.ma_ncc}</span></td><td className="p-3">{item.ten_hang || 'Đánh giá cấp NCC cũ'}</td><td className="p-3 font-bold">{item.diem_tong != null ? `${Number(item.diem_tong).toFixed(2)}/100` : 'Chưa đủ dữ liệu'}</td><td className="p-3">{item.ket_luan_bm06 || '—'}</td><td className="p-3">{item.ty_le_iqc_dat != null ? `${Number(item.ty_le_iqc_dat).toFixed(1)}%` : '—'}</td><td className="p-3">{item.ty_le_dung_han != null ? `${Number(item.ty_le_dung_han).toFixed(1)}%` : '—'}</td><td className="p-3"><span className="pill p-info px-2 py-1">{item.trang_thai === 'DA_DUYET' ? 'Đã duyệt' : item.trang_thai === 'TU_CHOI' ? 'Từ chối' : 'Chờ duyệt'}</span></td><td className="p-3">{item.trang_thai === 'CHO_DUYET' && canApprove && <button type="button" onClick={() => void approveEvaluation(item)} className="min-h-10 px-3 border border-[#283A97] text-[#283A97] rounded font-bold">DUYỆT</button>}</td></tr>)}</tbody></table></div></div>
    </section>}
    {activeSection === 'DEN_HAN' && <section className="space-y-3">
      <div className="bg-white border border-[#DCE1EC] rounded p-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-[16px]">MẶT HÀNG ĐẾN HẠN ĐÁNH GIÁ</h2><p className="mt-1 text-[12px] text-[#59627A]">Mặt hàng đã duyệt, chưa từng có bảng điểm được duyệt hoặc đã quá chu kỳ đánh giá.</p></div><button type="button" onClick={() => void loadDueItems()} className="min-h-11 px-4 border border-[#283A97] text-[#283A97] rounded font-bold">TẢI LẠI</button></div>
      {dueError && <div role="alert" className="p-3 bg-[#FDECEE] border-l-4 border-[#EE202E] text-[#C4141F] text-[13px]">{dueError}</div>}
      <div className="overflow-x-auto border rounded bg-white"><table className="w-full min-w-[850px] text-[12px]"><thead className="bg-[#F4F6FA]"><tr>{['NHÀ CUNG CẤP','MÃ VẬT TƯ','MẶT HÀNG','LẦN ĐÁNH GIÁ GẦN NHẤT','ĐẾN HẠN','TÌNH TRẠNG','THAO TÁC'].map((label) => <th key={label} className="p-3 text-left">{label}</th>)}</tr></thead><tbody>{dueLoading ? <tr><td colSpan={7} className="p-8 text-center">Đang tải…</td></tr> : dueItems.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-[#59627A]">Không có mặt hàng nào đến hạn.</td></tr> : dueItems.map((item) => <tr key={item.id} className="border-t"><td className="p-3"><strong>{item.ten_ncc}</strong><span className="block font-mono text-[#59627A]">{item.ma_ncc}</span></td><td className="p-3 font-mono">{item.ma_vat_tu || '—'}</td><td className="p-3">{item.ten_hang}</td><td className="p-3">{item.ngay_cham_gan_nhat || 'Chưa từng đánh giá'}</td><td className="p-3">{item.ngay_den_han || '—'}</td><td className="p-3">{item.ngay_cham_gan_nhat ? (item.so_ngay_qua_han ? `Quá hạn ${item.so_ngay_qua_han} ngày` : 'Đến hạn hôm nay') : 'Chưa từng đánh giá'}</td><td className="p-3">{canEdit && <button type="button" onClick={() => { setActiveSection('DANH_GIA'); openEvaluationCreate(item.id); }} className="min-h-10 px-3 border border-[#283A97] text-[#283A97] rounded font-bold">TẠO BẢNG ĐIỂM</button>}</td></tr>)}</tbody></table></div>
      <div className="flex justify-end items-center gap-2 text-[12px]"><span>Trang {duePage}/{Math.max(1, Math.ceil(dueTotal / 100))}</span><button type="button" disabled={duePage <= 1 || dueLoading} onClick={() => setDuePage((p) => Math.max(1, p - 1))} className="min-w-10 h-10 border rounded disabled:opacity-40" aria-label="Trang trước">‹</button><button type="button" disabled={duePage >= Math.ceil(dueTotal / 100) || dueLoading} onClick={() => setDuePage((p) => p + 1)} className="min-w-10 h-10 border rounded disabled:opacity-40" aria-label="Trang sau">›</button></div>
    </section>}
    {activeSection === 'SO_THEO_DOI' && <section className="space-y-3">
      <div className="bg-white border border-[#DCE1EC] rounded p-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-bold text-[16px]">SỔ THEO DÕI TÌNH TRẠNG NHÀ CUNG CẤP</h2><p className="mt-1 text-[12px] text-[#59627A]">Sự cố chất lượng được nối với nhà cung cấp, mặt hàng và phiếu nhận hàng.</p></div><div className="flex flex-wrap gap-2"><label className="text-[12px] font-bold">TÌM<input value={issueQuery} onChange={(event) => { setIssueQuery(event.target.value); setIssuePage(1); }} placeholder="NCC, mã hàng, nội dung" className="mt-1 block h-11 px-3 border rounded font-normal" /></label><label className="text-[12px] font-bold">TÌNH TRẠNG<select value={issueStatus} onChange={(event) => { setIssueStatus(event.target.value); setIssuePage(1); }} className="mt-1 block h-11 px-3 border rounded bg-white font-normal"><option value="">Tất cả</option><option value="MO">Đang mở</option><option value="DA_DONG">Đã đóng</option></select></label><button type="button" onClick={() => void loadIssueItems()} className="min-h-11 px-4 border border-[#283A97] text-[#283A97] rounded font-bold">LỌC</button></div></div>
      {issueError && <div role="alert" className="p-3 bg-[#FDECEE] border-l-4 border-[#EE202E] text-[#C4141F] text-[13px]">{issueError}</div>}
      <div className="overflow-x-auto border rounded bg-white"><table className="w-full min-w-[1350px] text-[12px]"><thead className="bg-[#F4F6FA]"><tr>{['NGÀY NHẬN','NHÀ CUNG CẤP','MẶT HÀNG','VẤN ĐỀ PHÁT SINH','HƯỚNG XỬ LÝ','KẾT QUẢ GỐC','NGƯỜI GIÁM SÁT','TÌNH TRẠNG / NGÀY ĐÓNG'].map((label) => <th key={label} className="p-3 text-left">{label}</th>)}</tr></thead><tbody>{issueLoading ? <tr><td colSpan={8} className="p-8 text-center">Đang tải…</td></tr> : issueItems.length === 0 ? <tr><td colSpan={8} className="p-8 text-center text-[#59627A]">Chưa có sự cố chất lượng phù hợp.</td></tr> : issueItems.map((item) => <tr key={item.id} className="border-t"><td className="p-3">{item.ngay_nhan}</td><td className="p-3"><strong>{item.ten_ncc || '—'}</strong><span className="block font-mono text-[#59627A]">{item.ma_ncc || ''}</span></td><td className="p-3">{item.ten_hang_chup}<span className="block font-mono text-[#59627A]">{item.ma_vat_tu || ''}</span></td><td className="p-3 whitespace-normal">{item.mo_ta}</td><td className="p-3 whitespace-normal">{item.huong_xu_ly || '—'}</td><td className="p-3">{item.ket_qua || '—'}</td><td className="p-3">{item.ten_nguoi_giam_sat || item.nguoi_giam_sat || '—'}</td><td className="p-3">{item.ngay_dong ? `Đã đóng · ${item.ngay_dong}` : 'Đang mở'}</td></tr>)}</tbody></table></div>
      <div className="flex justify-end items-center gap-2 text-[12px]"><span>Trang {issuePage}/{Math.max(1, Math.ceil(issueTotal / 100))}</span><button type="button" disabled={issuePage <= 1 || issueLoading} onClick={() => setIssuePage((p) => Math.max(1, p - 1))} className="min-w-10 h-10 border rounded disabled:opacity-40" aria-label="Trang trước">‹</button><button type="button" disabled={issuePage >= Math.ceil(issueTotal / 100) || issueLoading} onClick={() => setIssuePage((p) => p + 1)} className="min-w-10 h-10 border rounded disabled:opacity-40" aria-label="Trang sau">›</button></div>
    </section>}
    {showEvaluationForm && <div className="fixed inset-0 z-[80] bg-black/45 flex items-center justify-center p-3"><form onSubmit={(event) => void saveEvaluation(event)} className="bg-white w-full max-w-xl max-h-[92vh] overflow-y-auto rounded shadow-xl"><header className="p-4 border-b border-[#DCE1EC] flex items-center justify-between"><div><h2 className="text-[16px] font-bold">TẠO BẢNG ĐÁNH GIÁ MẶT HÀNG</h2><p className="mt-1 text-[12px] text-[#59627A]">Điểm tự động được khóa và tính sau khi lưu.</p></div><button type="button" onClick={() => setShowEvaluationForm(false)} aria-label="Đóng form" className="min-w-11 min-h-11"><span className="material-symbols-outlined">close</span></button></header><div className="p-4 space-y-3"><label className="block text-[12px] font-bold">MẶT HÀNG NCC *<select required value={evaluationForm.id_mat_hang_ncc} onChange={(event) => setEvaluationField('id_mat_hang_ncc', event.target.value)} className="mt-1 w-full h-11 px-3 border rounded bg-white font-normal"><option value="">-- Chọn mặt hàng --</option>{dueItems.filter((item) => item.id === evaluationForm.id_mat_hang_ncc && !matHangItems.some((current) => current.id === item.id)).map((item) => <option key={item.id} value={item.id}>{item.ma_ncc} · {item.ten_hang}</option>)}{matHangItems.map((item) => <option key={item.id} value={item.id}>{item.ma_ncc} · {item.ten_hang}</option>)}</select></label><div className="grid sm:grid-cols-2 gap-3">{[['diem_gia_ca','ĐIỂM GIÁ CẢ'],['diem_tam_voc','ĐIỂM TẦM VÓC'],['diem_thanh_toan','ĐIỂM THANH TOÁN'],['diem_dich_vu','ĐIỂM DỊCH VỤ']].map(([key,label]) => <label key={key} className="text-[12px] font-bold">{label} (0–10)<input required min="0" max="10" step="0.01" type="number" value={evaluationForm[key as keyof typeof evaluationForm]} onChange={(event) => setEvaluationField(key as keyof typeof evaluationForm, event.target.value)} className="mt-1 w-full h-11 px-3 border rounded font-normal" /></label>)}</div><label className="block text-[12px] font-bold">GHI CHÚ<textarea rows={3} value={evaluationForm.ghi_chu} onChange={(event) => setEvaluationField('ghi_chu', event.target.value)} className="mt-1 w-full p-3 border rounded font-normal" /></label></div><footer className="p-4 border-t border-[#DCE1EC] flex justify-end gap-2"><button type="button" onClick={() => setShowEvaluationForm(false)} className="min-h-11 px-5 border rounded font-bold">HỦY</button><button type="submit" disabled={evaluationSaving} className="min-h-11 px-5 bg-[#283A97] text-white rounded font-bold">{evaluationSaving ? 'ĐANG LƯU…' : 'LƯU BẢNG ĐIỂM'}</button></footer></form></div>}
    {showMatHangForm && <div className="fixed inset-0 z-[80] bg-black/45 flex items-center justify-center p-3"><form onSubmit={(event) => void saveMatHang(event)} className="bg-white w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded shadow-xl"><header className="p-4 border-b border-[#DCE1EC] flex items-center justify-between"><div><h2 className="text-[16px] font-bold">{matHangEditing ? 'CHỈNH SỬA MẶT HÀNG NCC' : 'THÊM MẶT HÀNG NCC'}</h2><p className="mt-1 text-[12px] text-[#59627A]">Nhóm hàng và đơn vị tính phải là mã đang có trong Dữ liệu gốc.</p></div><button type="button" onClick={() => setShowMatHangForm(false)} aria-label="Đóng form" className="min-w-11 min-h-11"><span className="material-symbols-outlined">close</span></button></header><div className="p-4 space-y-3"><label className="block text-[12px] font-bold">NHÀ CUNG CẤP *<select required disabled={!!matHangEditing} value={String(matHangForm.id_ncc || '')} onChange={(event) => setMatHangField('id_ncc', event.target.value)} className="mt-1 w-full h-11 px-3 border rounded bg-white font-normal"><option value="">-- Chọn NCC --</option>{supplierOptions.map((supplier) => <option key={supplier.ma} value={supplier.ma}>{supplier.ma_ncc} · {supplier.ten}</option>)}</select></label><label className="block text-[12px] font-bold">TÊN MẶT HÀNG *<input required value={String(matHangForm.ten_hang || '')} onChange={(event) => setMatHangField('ten_hang', event.target.value)} className="mt-1 w-full h-11 px-3 border rounded font-normal" /></label><div className="grid sm:grid-cols-2 gap-3"><label className="text-[12px] font-bold">LOẠI<select value={String(matHangForm.loai || 'HANG_HOA')} onChange={(event) => setMatHangField('loai', event.target.value)} className="mt-1 w-full h-11 px-3 border rounded bg-white font-normal"><option value="HANG_HOA">Hàng hóa</option><option value="GIA_CONG">Gia công</option></select></label><label className="text-[12px] font-bold">ĐVT *<select required value={String(matHangForm.dvt || '')} onChange={(event) => setMatHangField('dvt', event.target.value)} className="mt-1 w-full h-11 px-3 border rounded bg-white font-normal"><option value="">-- Chọn ĐVT --</option>{units.map((unit) => <option key={unit.dvt} value={unit.dvt}>{unit.dvt} · {unit.ten_dvt}</option>)}</select></label></div><div className="grid sm:grid-cols-2 gap-3"><label className="text-[12px] font-bold">NHÓM HÀNG CHÍNH<select value={String(matHangForm.nhom_hang_chinh || '')} onChange={(event) => setMatHangField('nhom_hang_chinh', event.target.value)} className="mt-1 w-full h-11 px-3 border rounded bg-white font-normal"><option value="">-- Chọn nhóm --</option>{categories.map((category) => <option key={category.ma} value={category.ma}>{category.ma} · {category.ten}</option>)}</select></label><label className="text-[12px] font-bold">NHÓM HÀNG CHI TIẾT<select value={String(matHangForm.nhom_hang_chi_tiet || '')} onChange={(event) => setMatHangField('nhom_hang_chi_tiet', event.target.value)} className="mt-1 w-full h-11 px-3 border rounded bg-white font-normal"><option value="">-- Không chọn --</option>{categories.map((category) => <option key={category.ma} value={category.ma}>{category.ma} · {category.ten}</option>)}</select></label></div><label className="block text-[12px] font-bold">MÃ LOẠI GIA CÔNG<input value={String(matHangForm.ma_loai_gia_cong || '')} onChange={(event) => setMatHangField('ma_loai_gia_cong', event.target.value)} placeholder="Chỉ dùng khi loại là Gia công" className="mt-1 w-full h-11 px-3 border rounded font-normal" /></label><label className="block text-[12px] font-bold">THÔNG SỐ KỸ THUẬT<textarea rows={2} value={String(matHangForm.thong_so_ky_thuat || '')} onChange={(event) => setMatHangField('thong_so_ky_thuat', event.target.value)} className="mt-1 w-full p-3 border rounded font-normal" /></label><label className="block text-[12px] font-bold">GHI CHÚ<textarea rows={2} value={String(matHangForm.ghi_chu || '')} onChange={(event) => setMatHangField('ghi_chu', event.target.value)} className="mt-1 w-full p-3 border rounded font-normal" /></label></div><footer className="p-4 border-t border-[#DCE1EC] flex justify-end gap-2"><button type="button" onClick={() => setShowMatHangForm(false)} className="min-h-11 px-5 border rounded font-bold">HỦY</button><button type="submit" disabled={matHangSaving} className="min-h-11 px-5 bg-[#283A97] text-white rounded font-bold">{matHangSaving ? 'ĐANG LƯU…' : 'LƯU MẶT HÀNG'}</button></footer></form></div>}
    {showBulkForm && <BulkSupplierPaste onClose={() => setShowBulkForm(false)} onImported={(count, hasErrors) => { if (count) { onNotify(`Đã thêm ${count} nhà cung cấp hợp lệ.`); void loadSuppliers(); } if (!hasErrors) setShowBulkForm(false); }} />}
    {showForm && <div className="fixed inset-0 z-[80] bg-black/45 flex items-center justify-center p-3"><form onSubmit={(event) => void save(event)} className="bg-white w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded shadow-xl">
      <header className="p-4 border-b border-[#DCE1EC] flex items-center justify-between"><div><h2 className="text-[16px] font-bold">{editing ? 'CHỈNH SỬA NHÀ CUNG CẤP' : 'THÊM NHÀ CUNG CẤP'}</h2><p className="mt-1 text-[12px] text-[#59627A]">Thông tin được lưu theo danh mục NCC chung.</p></div><button type="button" disabled={saving} onClick={() => setShowForm(false)} aria-label="Đóng form" className="min-w-11 min-h-11"><span className="material-symbols-outlined">close</span></button></header>
      <div className="p-4 space-y-4">
        {formError && <div role="alert" className="p-3 bg-[#FDECEE] border-l-4 border-[#EE202E] text-[#C4141F] text-[12px] break-words">{formError}</div>}
        <div className="p-3 bg-[#EEF0F9] border border-[#C6CCE9] rounded text-[12px] text-[#59627A]">Mã NCC sẽ được hệ thống tự cấp theo thứ tự khi lưu.</div>
        <div className="grid sm:grid-cols-2 gap-3"><label className="text-[12px] font-bold">TÊN NHÀ CUNG CẤP *<input required maxLength={300} value={form.ten} onChange={(event) => setField('ten', event.target.value)} className="mt-1 w-full h-11 px-3 border rounded font-normal" /></label><label className="text-[12px] font-bold">MÃ SỐ THUẾ<input maxLength={20} value={form.mst || ''} onChange={(event) => setField('mst', event.target.value)} className="mt-1 w-full h-11 px-3 border rounded font-normal" /></label><label className="text-[12px] font-bold">NGƯỜI LIÊN HỆ<input maxLength={120} value={form.nguoi_lien_he || ''} onChange={(event) => setField('nguoi_lien_he', event.target.value)} className="mt-1 w-full h-11 px-3 border rounded font-normal" /></label><label className="text-[12px] font-bold">SỐ ĐIỆN THOẠI<input maxLength={40} value={form.sdt || ''} onChange={(event) => setField('sdt', event.target.value)} className="mt-1 w-full h-11 px-3 border rounded font-normal" /></label><label className="text-[12px] font-bold">EMAIL<input type="email" maxLength={120} value={form.email || ''} onChange={(event) => setField('email', event.target.value)} className="mt-1 w-full h-11 px-3 border rounded font-normal" /></label></div>
        <label className="block text-[12px] font-bold">ĐỊA CHỈ<textarea rows={2} value={form.dia_chi || ''} onChange={(event) => setField('dia_chi', event.target.value)} className="mt-1 w-full p-3 border rounded font-normal" /></label>
        <div className="flex flex-wrap gap-5 text-[13px]"><label className="flex items-center gap-2"><input type="checkbox" checked={form.la_ncc_mua_hang} onChange={(event) => setField('la_ncc_mua_hang', event.target.checked)} />NCC mua hàng</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.la_ncc_gia_cong} onChange={(event) => setField('la_ncc_gia_cong', event.target.checked)} />NCC gia công</label></div>
        <div className="grid sm:grid-cols-2 gap-3"><label className="text-[12px] font-bold">ĐỊNH MỨC THÁNG (VND)<input type="number" min="0" step="0.01" value={form.dinh_muc_thang ?? ''} onChange={(event) => setField('dinh_muc_thang', event.target.value === '' ? null : Number(event.target.value))} className="mt-1 w-full h-11 px-3 border rounded font-normal" /></label><label className="text-[12px] font-bold">TRẠNG THÁI<select value={form.trang_thai} onChange={(event) => setField('trang_thai', event.target.value)} className="mt-1 w-full h-11 px-3 border rounded bg-white font-normal"><option value="HOAT_DONG">Hoạt động</option><option value="CANH_BAO">Cảnh báo</option><option value="TAM_NGUNG">Tạm ngưng</option><option value="LOAI_BO">Loại bỏ</option></select></label><label className="flex items-center gap-2 self-end min-h-11"><input type="checkbox" checked={form.da_phe_duyet} onChange={(event) => { setField('da_phe_duyet', event.target.checked); if (event.target.checked && !form.ngay_phe_duyet) setField('ngay_phe_duyet', new Date().toISOString().slice(0, 10)); }} />Đã phê duyệt</label></div>
        {form.dinh_muc_thang != null && <label className="block text-[12px] font-bold">LÝ DO ĐẶT ĐỊNH MỨC<textarea rows={2} value={form.ghi_chu_dinh_muc || ''} onChange={(event) => setField('ghi_chu_dinh_muc', event.target.value)} className="mt-1 w-full p-3 border rounded font-normal" /></label>}
        {form.da_phe_duyet && <label className="block text-[12px] font-bold">NGÀY PHÊ DUYỆT *<input type="date" required value={form.ngay_phe_duyet || ''} onChange={(event) => setField('ngay_phe_duyet', event.target.value)} className="mt-1 w-full h-11 px-3 border rounded font-normal" /></label>}
        <label className="block text-[12px] font-bold">GHI CHÚ<textarea rows={2} value={form.ghi_chu || ''} onChange={(event) => setField('ghi_chu', event.target.value)} className="mt-1 w-full p-3 border rounded font-normal" /></label>
      </div>
      <footer className="p-4 border-t border-[#DCE1EC] flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => setShowForm(false)} className="min-h-11 px-5 border rounded font-bold">HỦY</button><button type="submit" disabled={saving} className="min-h-11 px-5 bg-[#283A97] text-white rounded font-bold disabled:opacity-50">{saving ? 'ĐANG LƯU…' : xacNhanTrung ? 'XÁC NHẬN LƯU' : 'LƯU NHÀ CUNG CẤP'}</button></footer>
    </form></div>}
  </div>;
}
