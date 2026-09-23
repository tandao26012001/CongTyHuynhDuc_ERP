import { FormEvent, useEffect, useMemo, useState } from 'react';
import { capMaVatTu, DonViTinh, duKienMaVatTu, layDanhSachVatTu, layDonViTinh, layQuyTacMaVatTu, QuyTacMaVatTu, taoVatTu, VatTuTraCuu, xoaVatTu } from '../api/client';
import { BulkCatalogMaterialPaste } from '../components/BulkCatalogMaterialPaste';
import { CategoryPanel, RecognitionRulePanel } from '../components/CompanyReferencePanels';
import { UnitPanel } from '../components/UnitPanel';
import { confirmDeleteRows, RowSelectionActions, SelectionCheckbox, useRowSelection } from '../components/RowSelection';
import { FilterField, FilterValues, readStoredFilters, SharedFilterBar } from '../components/SharedFilterBar';

type RootTab = 'company' | 'system';
type CompanyTab = 'departments' | 'employees' | 'warehouses' | 'categories' | 'recognition-rules' | 'units' | 'materials';
type SystemTab = 'accounts' | 'permissions' | 'parameters' | 'audit-log';

const MATERIAL_FILTER_DEFAULTS: FilterValues = {
  tu_khoa: '', ma_vat_tu: '', ten_hang: '', dvt: '', trang_thai: '',
};

export function CatalogView({ onNotify }: { onNotify: (message: string) => void }) {
  const [rootTab, setRootTab] = useState<RootTab>('company');
  const [companyTab, setCompanyTab] = useState<CompanyTab>('units');
  const [systemTab, setSystemTab] = useState<SystemTab>('accounts');
  const [units, setUnits] = useState<DonViTinh[]>([]);
  const [materials, setMaterials] = useState<VatTuTraCuu[]>([]);
  const [materialTotal, setMaterialTotal] = useState(0);
  const [materialPage, setMaterialPage] = useState(1);
  const [materialPageSize, setMaterialPageSize] = useState(25);
  const [materialFilters, setMaterialFilters] = useState<FilterValues>(
    () => readStoredFilters('danh-muc-vat-tu', MATERIAL_FILTER_DEFAULTS),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [materialForm, setMaterialForm] = useState({ ma_vat_tu: '', ten_hang: '', dvt: '', quy_cach: '' });
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [showBulkMaterials, setShowBulkMaterials] = useState(false);
  const [materialRules, setMaterialRules] = useState<QuyTacMaVatTu[]>([]);
  const [materialCodeRule, setMaterialCodeRule] = useState({ ma_quy_tac: '', ma_vat_lieu: '', loai_hinh: '' });
  const [generatingCode, setGeneratingCode] = useState(false);
  const [materialType, setMaterialType] = useState<'TH' | 'VT' | 'TL'>('TH');
  const [materialCodePreview, setMaterialCodePreview] = useState('');
  const [formFeedback, setFormFeedback] = useState('');
  const materialSelection = useRowSelection(materials.map((material) => material.id));
  const materialTotalPages = Math.max(1, Math.ceil(materialTotal / materialPageSize));

  const materialFilterFields = useMemo<FilterField[]>(() => [
    { key: 'tu_khoa', label: 'TỪ KHOÁ', placeholder: 'Mã hoặc tên vật tư…' },
    { key: 'ma_vat_tu', label: 'MÃ VẬT TƯ', placeholder: 'Ví dụ: TH-BL…' },
    { key: 'ten_hang', label: 'TÊN HÀNG', placeholder: 'Nhập một phần tên…' },
    { key: 'dvt', label: 'ĐƠN VỊ TÍNH', type: 'select', options: units.map((unit) => ({ value: unit.dvt, label: `${unit.dvt} — ${unit.ten_dvt}` })) },
    { key: 'trang_thai', label: 'TÌNH TRẠNG', type: 'select', options: [{ value: 'HOAT_DONG', label: 'Đang hoạt động' }, { value: 'NGUNG', label: 'Ngưng hoạt động' }, { value: 'DA_GOP', label: 'Đã gộp dữ liệu' }] },
  ], [units]);

  async function loadMaterials(page = materialPage, filters = materialFilters) {
    setLoading(true); setError('');
    try {
      const result = await layDanhSachVatTu(page, materialPageSize, filters);
      setMaterials(result.items);
      setMaterialTotal(result.tong);
      materialSelection.clearSelection();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không tải được danh sách vật tư.');
    } finally { setLoading(false); }
  }

  async function deleteMaterials(ids: Set<string>) {
    if (!ids.size || !confirmDeleteRows(ids.size, 'vật tư')) return;
    setLoading(true); setError('');
    const results = await Promise.allSettled([...ids].map(xoaVatTu));
    const failed = results.filter((result) => result.status === 'rejected').length;
    if (!failed && ids.size >= materials.length && materialPage > 1) setMaterialPage((current) => current - 1);
    else await loadMaterials(materialPage, materialFilters);
    materialSelection.clearSelection(); setLoading(false);
    if (failed) setError(`Đã xoá ${ids.size - failed}/${ids.size} vật tư. ${failed} dòng đang được sử dụng hoặc không thể xoá.`);
    else onNotify(`Đã xoá ${ids.size} vật tư.`);
  }

  useEffect(() => {
    void layDonViTinh().then(setUnits).catch(() => undefined);
    void layQuyTacMaVatTu().then(setMaterialRules).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (rootTab === 'company' && companyTab === 'materials') void loadMaterials(materialPage, materialFilters);
  }, [rootTab, companyTab, materialPage, materialPageSize, materialFilters]);

  const selectedMaterialRule = materialRules.find((rule) => rule.ma_quy_tac === materialCodeRule.ma_quy_tac);

  useEffect(() => {
    if (!selectedMaterialRule) { setMaterialCodePreview(''); return; }
    const timer = window.setTimeout(() => {
      void duKienMaVatTu({ ma_quy_tac: selectedMaterialRule.ma_quy_tac, ten_hang: materialForm.ten_hang, loai_hinh: materialCodeRule.loai_hinh || undefined })
        .then((result) => {
          setMaterialCodePreview(result.ma_du_kien);
          setMaterialCodeRule((current) => ({ ...current, ma_vat_lieu: result.ma_vat_lieu || '' }));
        })
        .catch(() => setMaterialCodePreview(selectedMaterialRule.mau_ma.replace('{STT}', '[tự cấp]')));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [selectedMaterialRule, materialForm.ten_hang, materialCodeRule.loai_hinh]);

  function openMaterialForm() {
    setMaterialForm({ ma_vat_tu: '', ten_hang: '', dvt: '', quy_cach: '' });
    setMaterialCodeRule({ ma_quy_tac: '', ma_vat_lieu: '', loai_hinh: '' });
    setMaterialCodePreview('');
    setFormFeedback('');
    setShowMaterialForm(true);
  }

  async function createMaterial(event: FormEvent) {
    event.preventDefault();
    setFormFeedback('');
    if (!selectedMaterialRule) { setFormFeedback('Hãy chọn loại và nhóm vật tư.'); return; }
    if (selectedMaterialRule.can_ma_vat_lieu && !materialCodeRule.ma_vat_lieu) { setFormFeedback('Tên vật tư chưa khớp quy tắc vật liệu để sinh mã.'); return; }
    setGeneratingCode(true);
    try {
      const code = await capMaVatTu({ ma_quy_tac: selectedMaterialRule.ma_quy_tac, ma_vat_lieu: materialCodeRule.ma_vat_lieu || undefined, loai_hinh: materialCodeRule.loai_hinh || undefined });
      await taoVatTu({ ...materialForm, ma_vat_tu: code.ma_vat_tu, ten_hang: materialForm.ten_hang.trim().toUpperCase() });
      await loadMaterials(materialPage, materialFilters);
      setShowMaterialForm(false);
      onNotify('Đã thêm vật tư vào danh mục.');
    } catch (reason) {
      setFormFeedback(reason instanceof Error ? reason.message : 'Không thêm được vật tư.');
    } finally { setGeneratingCode(false); }
  }

  const companyTabs: Array<[CompanyTab, string]> = [['materials', 'Vật tư & Hàng hoá'], ['units', 'Đơn vị tính'], ['departments', 'Bộ phận'], ['employees', 'Nhân viên'], ['warehouses', 'Kho'], ['categories', 'Chủng loại'], ['recognition-rules', 'Quy tắc nhận diện']];
  const systemTabs: Array<[SystemTab, string]> = [['accounts', 'Tài khoản'], ['permissions', 'Vai trò & phân quyền'], ['parameters', 'Tham số hệ thống'], ['audit-log', 'Nhật ký thay đổi']];

  return <div className="space-y-4">
    <header className="bg-white border border-[#DCE1EC] rounded p-4"><div className="text-[11px] text-[#59627A] font-bold mb-1">QUẢN TRỊ</div><h1 className="text-[18px] font-bold">DỮ LIỆU GỐC</h1><p className="text-[12px] text-[#59627A] mt-1">Quản lý dữ liệu dùng chung của công ty và cấu hình nền của hệ thống.</p></header>
    <div className="bg-white border border-[#DCE1EC] rounded overflow-hidden">
      <div className="grid grid-cols-2 bg-[#F4F6FA] border-b border-[#DCE1EC]"><button onClick={() => setRootTab('company')} className={`min-h-12 px-4 font-condensed font-bold text-[13px] ${rootTab === 'company' ? 'bg-white text-[#283A97] border-t-2 border-[#283A97]' : 'text-[#59627A]'}`}>DỮ LIỆU CÔNG TY</button><button onClick={() => setRootTab('system')} className={`min-h-12 px-4 font-condensed font-bold text-[13px] ${rootTab === 'system' ? 'bg-white text-[#283A97] border-t-2 border-[#283A97]' : 'text-[#59627A]'}`}>DỮ LIỆU HỆ THỐNG</button></div>
      <div className="flex gap-1 px-3 pt-2 overflow-x-auto">{rootTab === 'company' ? companyTabs.map(([key, label]) => <button key={key} onClick={() => setCompanyTab(key)} className={`min-h-11 px-4 whitespace-nowrap font-condensed font-bold text-[12px] border-b-2 ${companyTab === key ? 'border-[#283A97] text-[#283A97]' : 'border-transparent text-[#59627A]'}`}>{label}</button>) : systemTabs.map(([key, label]) => <button key={key} onClick={() => setSystemTab(key)} className={`min-h-11 px-4 whitespace-nowrap font-condensed font-bold text-[12px] border-b-2 ${systemTab === key ? 'border-[#283A97] text-[#283A97]' : 'border-transparent text-[#59627A]'}`}>{label}</button>)}</div>
    </div>
    {error && <div role="alert" className="p-3 bg-[#FDECEE] border border-[#F9B9BE] text-[#C4141F] text-[12px]">{error}</div>}

    {rootTab === 'company' && companyTab === 'categories' ? <CategoryPanel onNotify={onNotify} /> : rootTab === 'company' && companyTab === 'recognition-rules' ? <RecognitionRulePanel onNotify={onNotify} /> : rootTab === 'company' && companyTab === 'units' ? <UnitPanel onNotify={onNotify} /> : rootTab === 'company' && companyTab === 'materials' ? <div className="space-y-4">
      <div className="bg-white border border-[#DCE1EC] rounded p-4 flex flex-wrap gap-2"><button type="button" onClick={openMaterialForm} className="min-h-11 px-5 bg-[#283A97] text-white font-bold rounded flex items-center gap-2"><span className="material-symbols-outlined">add</span>THÊM MỚI</button><button type="button" onClick={() => setShowBulkMaterials(true)} className="min-h-11 px-5 border border-[#283A97] text-[#283A97] font-bold rounded flex items-center gap-2"><span className="material-symbols-outlined">upload_file</span>THÊM HÀNG LOẠT TỪ EXCEL</button></div>
      <SharedFilterBar storageKey="danh-muc-vat-tu" fields={materialFilterFields} value={materialFilters} loading={loading} onApply={(next) => { setMaterialPage(1); setMaterialFilters(next); }} />
      <div className="bg-white border border-[#DCE1EC] rounded p-4 space-y-3"><div className="flex flex-wrap items-center justify-between gap-3 text-[12px]"><span className="text-[#59627A]">Hiển thị <strong>{materialTotal ? (materialPage - 1) * materialPageSize + 1 : 0}–{Math.min(materialPage * materialPageSize, materialTotal)}</strong> / {materialTotal} vật tư</span><div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2">Số dòng/trang<select value={materialPageSize} onChange={(event) => { setMaterialPageSize(Number(event.target.value)); setMaterialPage(1); }} className="h-10 px-2 border border-[#DCE1EC] rounded bg-white"><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label><button type="button" onClick={() => setMaterialPage(1)} disabled={materialPage === 1 || loading} className="min-w-10 h-10 border rounded disabled:opacity-40" aria-label="Trang đầu"><span className="material-symbols-outlined">first_page</span></button><button type="button" onClick={() => setMaterialPage((value) => Math.max(1, value - 1))} disabled={materialPage === 1 || loading} className="min-w-10 h-10 border rounded disabled:opacity-40" aria-label="Trang trước"><span className="material-symbols-outlined">chevron_left</span></button><strong className="min-w-24 text-center">Trang {materialPage}/{materialTotalPages}</strong><button type="button" onClick={() => setMaterialPage((value) => Math.min(materialTotalPages, value + 1))} disabled={materialPage === materialTotalPages || loading} className="min-w-10 h-10 border rounded disabled:opacity-40" aria-label="Trang sau"><span className="material-symbols-outlined">chevron_right</span></button><button type="button" onClick={() => setMaterialPage(materialTotalPages)} disabled={materialPage === materialTotalPages || loading} className="min-w-10 h-10 border rounded disabled:opacity-40" aria-label="Trang cuối"><span className="material-symbols-outlined">last_page</span></button></div></div><RowSelectionActions total={materials.length} selectedCount={materialSelection.selectedCount} allSelected={materialSelection.allSelected} onToggleAll={materialSelection.toggleAll} onDeleteSelected={() => void deleteMaterials(materialSelection.selected)} onDeleteAll={() => void deleteMaterials(new Set(materials.map((material) => material.id)))} disabled={loading} />{loading ? <p className="py-6 text-center text-[#59627A]">Đang tải vật tư…</p> : materials.length === 0 ? <div className="py-7 text-center"><p className="font-bold">Không có vật tư phù hợp</p><p className="mt-1 text-[#59627A]">Hãy xoá bớt điều kiện hoặc thử từ khoá khác.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-[12px]"><thead className="bg-[#F4F6FA]"><tr><th className="p-3 w-10 text-center"><SelectionCheckbox checked={materialSelection.allSelected} onChange={materialSelection.toggleAll} label="Chọn tất cả vật tư" /></th><th className="p-3 text-left">MÃ VẬT TƯ</th><th className="p-3 text-left">TÊN HÀNG</th><th className="p-3">ĐVT</th><th className="p-3 text-right">TỒN KHẢ DỤNG</th><th className="p-3">TÌNH TRẠNG</th><th className="p-3 w-14" /></tr></thead><tbody>{materials.map((material) => <tr key={material.id} className={`border-t ${materialSelection.selected.has(material.id) ? 'bg-[#EEF0F9]' : ''}`}><td className="p-3 text-center"><SelectionCheckbox checked={materialSelection.selected.has(material.id)} onChange={() => materialSelection.toggle(material.id)} label={`Chọn ${material.ten_hang}`} /></td><td className="p-3 font-mono font-bold">{material.ma_vat_tu || 'Chờ cấp mã'}</td><td className="p-3">{material.ten_hang}</td><td className="p-3 text-center">{material.dvt}</td><td className="p-3 text-right font-mono">{material.ton_kho == null ? '—' : material.ton_kho}</td><td className="p-3"><span className={`pill px-2 py-1 text-[11px] ${material.trang_thai === 'HOAT_DONG' ? 'p-ok' : 'p-info'}`}>{material.trang_thai === 'HOAT_DONG' ? 'Đang hoạt động' : material.trang_thai === 'DA_GOP' ? 'Đã gộp dữ liệu' : 'Ngưng hoạt động'}</span></td><td className="p-1 text-center"><button type="button" onClick={() => void deleteMaterials(new Set([material.id]))} aria-label={`Xoá ${material.ten_hang}`} className="min-w-10 min-h-10 text-[#EE202E]"><span className="material-symbols-outlined">delete</span></button></td></tr>)}</tbody></table></div>}</div>
    </div> : <div className="bg-white border border-[#DCE1EC] rounded min-h-[280px] p-8 flex flex-col items-center justify-center text-center"><span className="material-symbols-outlined text-[38px] text-[#283A97] mb-3">database</span><h2 className="text-[15px] font-bold">{rootTab === 'company' ? ({ departments: 'BỘ PHẬN', employees: 'NHÂN VIÊN', warehouses: 'KHO' } as Record<string, string>)[companyTab] : ({ accounts: 'TÀI KHOẢN', permissions: 'VAI TRÒ & PHÂN QUYỀN', parameters: 'THAM SỐ HỆ THỐNG', 'audit-log': 'NHẬT KÝ THAY ĐỔI' } as Record<string, string>)[systemTab]}</h2><p className="mt-2 text-[13px] text-[#59627A]">Tab dữ liệu này đã được bố trí sẵn và sẽ được kết nối API ở bước triển khai tương ứng.</p></div>}

    {showMaterialForm && <div className="fixed inset-0 z-[80] bg-black/45 flex items-center justify-center p-3"><form onSubmit={createMaterial} className="bg-white w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded shadow-xl"><header className="p-4 border-b border-[#DCE1EC] flex items-center justify-between"><h2 className="font-bold text-[16px]">THÊM MỚI VẬT TƯ & HÀNG HOÁ</h2><button type="button" disabled={generatingCode} onClick={() => setShowMaterialForm(false)} className="min-w-11 min-h-11"><span className="material-symbols-outlined">close</span></button></header><div className="p-4 space-y-4">{formFeedback && <div role="alert" className="p-3 bg-[#FDECEE] border-l-4 border-[#EE202E] text-[#C4141F] text-[12px]">{formFeedback}</div>}<div className="p-4 bg-[#F4F6FA] border border-[#DCE1EC] rounded-lg grid sm:grid-cols-2 gap-3"><label className="text-[11px] font-bold">LOẠI VẬT TƯ, HÀNG HOÁ *<select value={materialType} onChange={(e) => { const value = e.target.value as typeof materialType; setMaterialType(value); setMaterialCodeRule({ ma_quy_tac: '', ma_vat_lieu: '', loai_hinh: '' }); setMaterialCodePreview(''); }} className="mt-1 w-full h-11 px-3 border rounded bg-white font-normal"><option value="TH">Vật tư tiêu hao (TH)</option><option value="VT">Nguyên vật liệu (VT)</option><option value="TL">Tools, dụng cụ (TL)</option></select></label><label className="text-[11px] font-bold">MÃ NHÓM *<select required value={materialCodeRule.ma_quy_tac} onChange={(e) => setMaterialCodeRule({ ma_quy_tac: e.target.value, ma_vat_lieu: '', loai_hinh: '' })} className="mt-1 w-full h-11 px-3 border rounded bg-white font-normal"><option value="">-- Chọn mã nhóm --</option>{materialRules.filter((rule) => rule.kho === materialType).map((rule) => <option key={rule.ma_quy_tac} value={rule.ma_quy_tac}>{rule.ma_nhom} — {rule.ten_nhom}</option>)}</select></label>{selectedMaterialRule?.can_loai_hinh && <label className="text-[11px] font-bold sm:col-span-2">LOẠI HÌNH<select value={materialCodeRule.loai_hinh} onChange={(e) => setMaterialCodeRule({ ...materialCodeRule, loai_hinh: e.target.value })} className="mt-1 w-full h-11 px-3 border rounded bg-white font-normal"><option value="">Không có</option><option value="ON">ON — Ống</option><option value="VU">VU — Vuông</option><option value="CU">CU — Chữ U</option><option value="CV">CV — Chữ V</option><option value="HO">HO — Hộp</option></select></label>}<div className="sm:col-span-2 p-3 bg-[#E9ECFA] rounded flex items-center justify-between gap-3"><span className="text-[12px] font-bold text-[#59627A]">Mã dự kiến</span><strong className="font-mono text-[16px] text-[#283A97] text-right">{materialCodePreview || selectedMaterialRule?.mau_ma.replace('{STT}', '[tự cấp]') || `${materialType}-[NHÓM]-[tự cấp]`}</strong></div></div><label className="block text-[11px] font-bold">TÊN VẬT TƯ *<input required value={materialForm.ten_hang} onChange={(e) => setMaterialForm({ ...materialForm, ten_hang: e.target.value })} className="mt-1 w-full h-11 px-3 border rounded font-normal" placeholder="Ví dụ: INOX 304 SỌC 1.2MM*1285*380" /></label><fieldset><legend className="text-[11px] font-bold mb-2">KHO LƯU TRỮ *</legend><div className="grid sm:grid-cols-3 gap-2 border border-[#DCE1EC] rounded p-3">{([['TH', 'Kho Vật tư tiêu hao'], ['VT', 'Kho Nguyên liệu - Vật tư'], ['TL', 'Kho Tools']] as const).map(([code, label]) => <label key={code} className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={materialType === code} onChange={() => { setMaterialType(code); setMaterialCodeRule({ ma_quy_tac: '', ma_vat_lieu: '', loai_hinh: '' }); }} />{label}</label>)}</div></fieldset><label className="block text-[11px] font-bold">MÔ TẢ / THÔNG SỐ<textarea value={materialForm.quy_cach} onChange={(e) => setMaterialForm({ ...materialForm, quy_cach: e.target.value })} rows={4} className="mt-1 w-full p-3 border rounded font-normal" placeholder="Thông số kỹ thuật, quy cách…" /></label><label className="block text-[11px] font-bold">ĐƠN VỊ TÍNH *<select required value={materialForm.dvt} onChange={(e) => setMaterialForm({ ...materialForm, dvt: e.target.value })} className="mt-1 w-full h-11 px-3 border rounded font-normal"><option value="">-- Chọn đơn vị tính --</option>{units.map((unit) => <option key={unit.dvt} value={unit.dvt}>{unit.ten_dvt}</option>)}</select></label></div><footer className="p-4 border-t border-[#DCE1EC] flex justify-end gap-2"><button type="button" disabled={generatingCode} onClick={() => setShowMaterialForm(false)} className="min-h-11 px-5 border rounded font-bold">HỦY</button><button disabled={!selectedMaterialRule || !materialCodePreview || generatingCode} className="min-h-11 px-5 bg-[#283A97] text-white rounded font-bold disabled:opacity-50">{generatingCode ? 'ĐANG LƯU…' : 'LƯU VẬT TƯ'}</button></footer></form></div>}
    {showBulkMaterials && <BulkCatalogMaterialPaste onClose={() => setShowBulkMaterials(false)} onError={setError} onImported={(count, hasErrors) => { if (count) { onNotify(`Đã nhập ${count} vật tư hợp lệ vào danh mục.`); void loadMaterials(materialPage, materialFilters); } if (!hasErrors) setShowBulkMaterials(false); }} />}
  </div>;
}
