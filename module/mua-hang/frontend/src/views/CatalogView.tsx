import { FormEvent, useEffect, useState } from 'react';
import { DonViTinh, layDonViTinh, taoDonViTinh, taoVatTu, timVatTu, VatTuTraCuu } from '../api/client';
import { BulkUnitPaste } from '../components/BulkUnitPaste';

type RootTab = 'company' | 'system';
type CompanyTab = 'departments' | 'employees' | 'warehouses' | 'units' | 'materials';
type SystemTab = 'accounts' | 'permissions' | 'parameters' | 'audit-log';

export function CatalogView({ onNotify }: { onNotify: (message: string) => void }) {
  const [rootTab, setRootTab] = useState<RootTab>('company');
  const [companyTab, setCompanyTab] = useState<CompanyTab>('units');
  const [systemTab, setSystemTab] = useState<SystemTab>('accounts');
  const [units, setUnits] = useState<DonViTinh[]>([]);
  const [materials, setMaterials] = useState<VatTuTraCuu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [unitForm, setUnitForm] = useState({ dvt: '', ten_dvt: '', so_le: 0 });
  const [materialForm, setMaterialForm] = useState({ ma_vat_tu: '', ten_hang: '', dvt: '', quy_cach: '' });
  const [showBulkUnits, setShowBulkUnits] = useState(false);

  const loadUnits = () => {
    setLoading(true);
    setError('');
    layDonViTinh().then(setUnits).catch((reason) => setError(reason instanceof Error ? reason.message : 'Không tải được dữ liệu.')).finally(() => setLoading(false));
  };

  useEffect(loadUnits, []);

  async function search() {
    if (query.trim().length < 2) {
      setError('Nhập ít nhất 2 ký tự để tìm vật tư.');
      return;
    }
    setLoading(true);
    setError('');
    try { setMaterials(await timVatTu(query)); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tìm được vật tư.'); }
    finally { setLoading(false); }
  }

  async function createUnit(event: FormEvent) {
    event.preventDefault();
    try {
      await taoDonViTinh({ ...unitForm, dvt: unitForm.dvt.trim().toUpperCase() });
      setUnitForm({ dvt: '', ten_dvt: '', so_le: 0 });
      onNotify('Đã thêm đơn vị tính.');
      loadUnits();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thêm được đơn vị tính.'); }
  }

  async function createMaterial(event: FormEvent) {
    event.preventDefault();
    try {
      await taoVatTu({ ...materialForm, ma_vat_tu: materialForm.ma_vat_tu.trim().toUpperCase() });
      setMaterialForm({ ma_vat_tu: '', ten_hang: '', dvt: '', quy_cach: '' });
      onNotify('Đã thêm vật tư vào danh mục.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thêm được vật tư.'); }
  }

  return <div className="space-y-4">
    <header className="bg-white border border-[#DCE1EC] rounded p-4"><div className="text-[11px] text-[#59627A] font-bold mb-1">QUẢN TRỊ</div><h1 className="text-[18px] font-bold">DỮ LIỆU GỐC</h1><p className="text-[12px] text-[#59627A] mt-1">Quản lý dữ liệu dùng chung của công ty và cấu hình nền của hệ thống.</p></header>

    <div className="bg-white border border-[#DCE1EC] rounded overflow-hidden">
      <div className="grid grid-cols-2 bg-[#F4F6FA] border-b border-[#DCE1EC]">
        <button onClick={() => setRootTab('company')} className={`min-h-12 px-4 font-condensed font-bold text-[13px] ${rootTab === 'company' ? 'bg-white text-[#283A97] border-t-2 border-[#283A97]' : 'text-[#59627A]'}`}>DỮ LIỆU CÔNG TY</button>
        <button onClick={() => setRootTab('system')} className={`min-h-12 px-4 font-condensed font-bold text-[13px] ${rootTab === 'system' ? 'bg-white text-[#283A97] border-t-2 border-[#283A97]' : 'text-[#59627A]'}`}>DỮ LIỆU HỆ THỐNG</button>
      </div>
      <div className="flex gap-1 px-3 pt-2 overflow-x-auto">
        {rootTab === 'company' ? ([
          ['departments', 'Bộ phận'], ['employees', 'Nhân viên'], ['warehouses', 'Kho'],
          ['units', 'Đơn vị tính'], ['materials', 'Vật tư & tồn kho']
        ] as Array<[CompanyTab, string]>).map(([key, label]) => <button key={key} onClick={() => setCompanyTab(key)} className={`min-h-11 px-4 whitespace-nowrap font-condensed font-bold text-[12px] border-b-2 ${companyTab === key ? 'border-[#283A97] text-[#283A97]' : 'border-transparent text-[#59627A]'}`}>{label}</button>) : ([
          ['accounts', 'Tài khoản'], ['permissions', 'Vai trò & phân quyền'],
          ['parameters', 'Tham số hệ thống'], ['audit-log', 'Nhật ký thay đổi']
        ] as Array<[SystemTab, string]>).map(([key, label]) => <button key={key} onClick={() => setSystemTab(key)} className={`min-h-11 px-4 whitespace-nowrap font-condensed font-bold text-[12px] border-b-2 ${systemTab === key ? 'border-[#283A97] text-[#283A97]' : 'border-transparent text-[#59627A]'}`}>{label}</button>)}
      </div>
    </div>
    {error && <div className="p-3 bg-[#FDECEE] border border-[#F9B9BE] text-[#C4141F] text-[12px]">{error}</div>}
    {rootTab === 'company' && companyTab === 'units' ? <div className="grid lg:grid-cols-[360px_1fr] gap-4">
      <form onSubmit={createUnit} className="bg-white border border-[#DCE1EC] rounded p-4 space-y-3"><div className="flex items-center justify-between gap-2"><h2 className="font-bold text-[13px]">THÊM ĐƠN VỊ TÍNH</h2><button type="button" onClick={() => setShowBulkUnits(true)} className="min-h-10 px-3 border border-[#283A97] text-[#283A97] font-bold rounded text-[11px]">NHẬP TỪ EXCEL</button></div><label className="block text-[11px] font-bold">MÃ ĐƠN VỊ *</label><input required value={unitForm.dvt} onChange={(e) => setUnitForm({ ...unitForm, dvt: e.target.value })} className="w-full h-11 px-3 border rounded" placeholder="VD: CAI" /><label className="block text-[11px] font-bold">TÊN ĐƠN VỊ *</label><input required value={unitForm.ten_dvt} onChange={(e) => setUnitForm({ ...unitForm, ten_dvt: e.target.value })} className="w-full h-11 px-3 border rounded" placeholder="VD: Cái" /><label className="block text-[11px] font-bold">SỐ CHỮ SỐ THẬP PHÂN</label><input type="number" min="0" max="4" value={unitForm.so_le} onChange={(e) => setUnitForm({ ...unitForm, so_le: Number(e.target.value) })} className="w-full h-11 px-3 border rounded" /><button className="w-full min-h-11 bg-[#283A97] text-white font-bold rounded">LƯU ĐƠN VỊ TÍNH</button></form>
      <div className="bg-white border border-[#DCE1EC] rounded overflow-x-auto">{loading ? <p className="p-5 text-[#59627A]">Đang tải đơn vị tính…</p> : units.length === 0 ? <p className="p-5 text-[#59627A]">Chưa có đơn vị tính. Hãy thêm bản ghi đầu tiên.</p> : <table className="w-full text-[12px]"><thead className="bg-[#F4F6FA]"><tr><th className="p-3 text-left">Mã</th><th className="p-3 text-left">Tên đơn vị</th><th className="p-3 text-right">Số lẻ</th></tr></thead><tbody>{units.map((unit) => <tr key={unit.dvt} className="border-t"><td className="p-3 font-mono font-bold">{unit.dvt}</td><td className="p-3">{unit.ten_dvt}</td><td className="p-3 text-right">{unit.so_le}</td></tr>)}</tbody></table>}</div>
    </div> : rootTab === 'company' && companyTab === 'materials' ? <div className="space-y-4">
      <form onSubmit={createMaterial} className="bg-white border border-[#DCE1EC] rounded p-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3"><input required value={materialForm.ma_vat_tu} onChange={(e) => setMaterialForm({ ...materialForm, ma_vat_tu: e.target.value })} className="h-11 px-3 border rounded" placeholder="Mã vật tư *" /><input required value={materialForm.ten_hang} onChange={(e) => setMaterialForm({ ...materialForm, ten_hang: e.target.value })} className="h-11 px-3 border rounded lg:col-span-2" placeholder="Tên hàng - quy cách *" /><select required value={materialForm.dvt} onChange={(e) => setMaterialForm({ ...materialForm, dvt: e.target.value })} className="h-11 px-3 border rounded"><option value="">Đơn vị tính *</option>{units.map((unit) => <option key={unit.dvt} value={unit.dvt}>{unit.ten_dvt}</option>)}</select><button className="h-11 bg-[#283A97] text-white font-bold rounded">THÊM VẬT TƯ</button></form>
      <div className="bg-white border border-[#DCE1EC] rounded p-4"><div className="flex gap-2"><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void search(); }} className="flex-1 h-11 px-3 border rounded" placeholder="Tìm theo mã hoặc tên vật tư…" /><button onClick={() => void search()} className="h-11 px-5 bg-[#283A97] text-white font-bold rounded">TÌM</button></div>{!loading && materials.length === 0 ? <p className="py-6 text-center text-[#59627A]">Nhập từ khóa để tra vật tư và tồn khả dụng.</p> : <div className="overflow-x-auto mt-4"><table className="w-full min-w-[700px] text-[12px]"><thead className="bg-[#F4F6FA]"><tr><th className="p-3 text-left">Mã vật tư</th><th className="p-3 text-left">Tên hàng</th><th className="p-3">ĐVT</th><th className="p-3 text-right">Tồn khả dụng</th><th className="p-3">Trạng thái dữ liệu</th></tr></thead><tbody>{materials.map((material) => <tr key={material.id} className="border-t"><td className="p-3 font-mono font-bold">{material.ma_vat_tu || 'Chờ cấp mã'}</td><td className="p-3">{material.ten_hang}</td><td className="p-3 text-center">{material.dvt}</td><td className="p-3 text-right font-mono">{material.ton_kho == null ? '—' : material.ton_kho}</td><td className="p-3">{material.ton_kho == null ? 'Chưa đồng bộ từ Kho' : material.ton_kho > 0 ? 'Còn hàng' : 'Hết hàng'}</td></tr>)}</tbody></table></div>}</div>
    </div> : <div className="bg-white border border-[#DCE1EC] rounded min-h-[280px] p-8 flex flex-col items-center justify-center text-center"><span className="material-symbols-outlined text-[38px] text-[#283A97] mb-3">database</span><h2 className="text-[15px] font-bold text-[#0E1220]">{rootTab === 'company' ? ({ departments: 'BỘ PHẬN', employees: 'NHÂN VIÊN', warehouses: 'KHO' } as Record<string, string>)[companyTab] : ({ accounts: 'TÀI KHOẢN', permissions: 'VAI TRÒ & PHÂN QUYỀN', parameters: 'THAM SỐ HỆ THỐNG', 'audit-log': 'NHẬT KÝ THAY ĐỔI' } as Record<string, string>)[systemTab]}</h2><p className="mt-2 text-[13px] text-[#59627A]">Tab dữ liệu này đã được bố trí sẵn và sẽ được kết nối API ở bước triển khai tương ứng.</p></div>}
    {showBulkUnits && <BulkUnitPaste onClose={() => setShowBulkUnits(false)} onError={setError} onImported={(count, hasErrors) => { if (!hasErrors) setShowBulkUnits(false); onNotify(`Đã nhập ${count} đơn vị tính hợp lệ.`); loadUnits(); }} />}
  </div>;
}
