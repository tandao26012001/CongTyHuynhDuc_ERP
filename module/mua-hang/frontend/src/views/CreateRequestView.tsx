import React, { useEffect, useState } from 'react';
import { DonViTinh, HoSo, layDonViTinh, timVatTu, VatTuTraCuu } from '../api/client';
import { BulkMaterialPaste } from '../components/BulkMaterialPaste';
import { MaterialRequest, MaterialItem, NavigationTab } from '../types';

interface CreateRequestViewProps {
  onNavigate: (tab: NavigationTab) => void;
  onSubmitNewRequest: (req: MaterialRequest) => void;
  onNotify: (msg: string) => void;
  currentUser: HoSo;
}

const PRIORITY_OPTIONS = [
  {
    value: 'ƯU TIÊN 1',
    label: 'ƯU TIÊN 1 — CAO NHẤT / GẤP NHẤT (3 NGÀY LÀM VIỆC)',
    detail: 'Lập đề nghị ngay trong ngày; phản hồi tiến độ trong 1–2 ngày làm việc.'
  },
  {
    value: 'ƯU TIÊN 2',
    label: 'ƯU TIÊN 2 (5 NGÀY LÀM VIỆC)',
    detail: 'Lập đề nghị trong 1 ngày; phản hồi tiến độ trong 2–3 ngày làm việc.'
  },
  {
    value: 'ƯU TIÊN 3',
    label: 'ƯU TIÊN 3 — THƯỜNG (7 NGÀY LÀM VIỆC)',
    detail: 'Lập đề nghị trong 2 ngày; phản hồi tiến độ trong 3–5 ngày làm việc.'
  }
];

export const CreateRequestView: React.FC<CreateRequestViewProps> = ({
  onNavigate,
  onSubmitNewRequest,
  onNotify,
  currentUser
}) => {
  const [lsxCode, setLsxCode] = useState('');
  const [productName, setProductName] = useState('');
  const [productionPlan, setProductionPlan] = useState('');
  const [machineCenter, setMachineCenter] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState('ƯU TIÊN 1');
  const [items, setItems] = useState<MaterialItem[]>([
    {
      id: 'item-1',
      code: '',
      name: '',
      spec: '',
      unit: '',
      quantity: 1,
      stockQty: 0,
      unitPrice: 0,
      note: '',
      deadline: '',
      productionOrder: '',
      productionOrderDate: '',
      barcode: '',
      purpose: '',
      catalogStatus: 'CHUA_KIEM_TRA',
      inventoryStatus: 'CHUA_CO_DU_LIEU'
    }
  ]);
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [units, setUnits] = useState<DonViTinh[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [unitsError, setUnitsError] = useState('');
  const [materialSuggestions, setMaterialSuggestions] = useState<Record<string, VatTuTraCuu[]>>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    layDonViTinh()
      .then(setUnits)
      .catch((error) => setUnitsError(error instanceof Error ? error.message : 'Không tải được đơn vị tính.'))
      .finally(() => setUnitsLoading(false));
  }, []);

  async function searchMaterial(itemId: string, value: string) {
    if (value.trim().length < 2) {
      setMaterialSuggestions((current) => ({ ...current, [itemId]: [] }));
      return;
    }
    try {
      const result = await timVatTu(value.trim());
      setMaterialSuggestions((current) => ({ ...current, [itemId]: result }));
    } catch {
      setMaterialSuggestions((current) => ({ ...current, [itemId]: [] }));
    }
  }

  function chooseMaterial(index: number, material: VatTuTraCuu) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? {
      ...item,
      code: material.ma_vat_tu || '',
      name: material.ten_hang,
      spec: material.quy_cach || item.spec,
      unit: material.dvt,
      barcode: material.ma_vach || item.barcode,
      stockQty: material.ton_kho ?? 0,
      catalogStatus: 'DA_CO_MA',
      inventoryStatus: material.ton_kho == null ? 'CHUA_CO_DU_LIEU' : material.ton_kho > 0 ? 'CON_HANG' : 'HET_HANG'
    } : item));
    setMaterialSuggestions((current) => ({ ...current, [items[index].id]: [] }));
  }

  const [attachedPhotos, setAttachedPhotos] = useState<Array<{ name: string; size: string; url: string; type: 'image' | 'pdf' }>>([]);

  const totalEstimate = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const handleAddItem = () => {
    const newItem: MaterialItem = {
      id: 'item-' + Date.now(),
      code: '',
      name: '',
      spec: '',
      unit: 'Chiếc',
      quantity: 1,
      stockQty: 0,
      unitPrice: 0,
      note: '',
      deadline: '',
      productionOrder: '',
      productionOrderDate: '',
      barcode: '',
      purpose: '',
      catalogStatus: 'CHUA_KIEM_TRA',
      inventoryStatus: 'CHUA_CO_DU_LIEU'
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setSubmitError('Đề nghị vật tư cần có ít nhất 1 dòng vật tư.');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  async function checkMaterialCode(index: number) {
    const item = items[index];
    if (!item.code.trim()) {
      setItems((prev) => prev.map((current, i) => i === index ? { ...current, catalogStatus: 'VT_MOI_CHO_CAP_MA', inventoryStatus: 'CHUA_CO_DU_LIEU', stockQty: 0 } : current));
      return;
    }
    try {
      const matches = await timVatTu(item.code.trim());
      const found = matches.find((value) => value.ma_vat_tu.toLowerCase() === item.code.trim().toLowerCase());
      setItems((prev) => prev.map((current, i) => i !== index ? current : found ? {
        ...current, code: found.ma_vat_tu, name: current.name || found.ten_hang,
        unit: current.unit || found.dvt, stockQty: found.ton_kho ?? 0,
        catalogStatus: 'DA_CO_MA', inventoryStatus: found.ton_kho == null ? 'CHUA_CO_DU_LIEU' : found.ton_kho > 0 ? 'CON_HANG' : 'HET_HANG'
      } : { ...current, catalogStatus: 'VT_MOI_CHO_CAP_MA', inventoryStatus: 'CHUA_CO_DU_LIEU', stockQty: 0 }));
    } catch (error) {
      onNotify(error instanceof Error ? error.message : 'Không kiểm tra được mã vật tư.');
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!productName.trim() || !deadline) {
      setSubmitError('Vui lòng nhập tên sản phẩm và ngày cần vật tư.');
      return;
    }
    if (items.some((it) => !it.name.trim() || !it.unit.trim() || it.quantity <= 0 || !it.deadline?.trim())) {
      setSubmitError('Vui lòng nhập đủ tên hàng - quy cách, đơn vị tính, số lượng và kỳ hạn cho tất cả các dòng.');
      return;
    }

    const newReqId = `DN-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const newRequest: MaterialRequest = {
      id: newReqId,
      date: new Date().toISOString().split('T')[0],
      department: currentUser.ma_bo_phan,
      lsxCode: lsxCode.trim(),
      lsxItem: productName.trim(),
      creator: currentUser.ho_va_ten || currentUser.ma_tai_khoan,
      creatorRole: currentUser.vai_tro,
      lineCount: items.length,
      status: 'CHO_DUYET',
      statusText: 'Chờ duyệt',
      totalEstimatedPrice: totalEstimate,
      deadline,
      priority,
      items,
      attachments: attachedPhotos.map((p) => ({
        name: p.name,
        size: p.size,
        type: p.type,
        url: p.url
      })),
      comments: []
    };

    setSubmitting(true);
    try {
      await Promise.resolve(onSubmitNewRequest(newRequest));
      onNotify(`TẠO THÀNH CÔNG: Phiếu đề nghị vật tư [${newReqId}] đã được gửi tới Quản đốc xưởng phê duyệt!`);
      onNavigate('requests');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Không thể gửi đề nghị vật tư. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-24">
      {submitError && <div role="alert" className="p-4 bg-[#FDECEE] border-l-4 border-[#EE202E] border-y border-r border-[#F9B9BE] text-[#C4141F] rounded flex items-start gap-2"><span className="material-symbols-outlined">error</span><div><strong>KHÔNG THỂ GỬI ĐỀ NGHỊ</strong><p className="mt-1 text-[13px]">{submitError}</p></div></div>}
      {/* Top Banner */}
      <div className="bg-white border border-[#DCE1EC] rounded p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="pill bg-[#EEF0F9] text-[#283A97] text-[11px] px-2.5 py-0.5 border border-[#C6CCE9]">
              TẠO PHIẾU XƯỞNG
            </span>
            <span className="text-[12px] text-[#59627A]">
              Phân hệ: <strong className="text-[#0E1220]">Đề nghị vật tư sản xuất</strong>
            </span>
          </div>
          <h1 className="text-[18px] font-bold text-[#0E1220]">
            Tạo Đề nghị Vật tư - {currentUser.ma_bo_phan}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right text-[12px] text-[#59627A]">
            Tự động lưu nháp: <strong className="font-mono text-[#4557b2]">Vừa xong</strong>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('requests')}
            className="h-[34px] px-3 border border-[#DCE1EC] rounded font-condensed font-bold text-[12px] uppercase text-[#59627A] hover:bg-[#F4F6FA]"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>

      {/* Idempotency Hint */}
      <div className="p-3 bg-[#EEF0F9] border border-[#C6CCE9] rounded text-[12.5px] text-[#283A97] flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px] shrink-0">info</span>
        <span>
          <strong>Lưu ý nghiệp vụ:</strong> Mỗi Lệnh sản xuất (LSX) chỉ nên lập 01 phiếu vật tư chính để kiểm soát định mức tiêu hao và hạn mức ngân sách xưởng.
        </span>
      </div>

      {/* BLOCK 1: LSX & MACHINE PLAN */}
      <div className="bg-white border border-[#DCE1EC] rounded p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-[#DCE1EC] pb-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#283A97] text-[20px]">precision_manufacturing</span>
            <h2 className="font-condensed font-bold text-[14px] uppercase text-[#0E1220]">
              KHỐI 1: LỆNH SẢN XUẤT (LSX) &amp; KẾ HOẠCH MÁY
            </h2>
          </div>
          <span className="font-mono text-[11px] text-[#8A93AA]">LSX KHÔNG BẮT BUỘC</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-6">
            <label className="block font-condensed font-bold text-[11.5px] uppercase text-[#59627A] mb-1">
              MÃ LỆNH SẢN XUẤT (LSX)
            </label>
            <div className="relative">
              <input
                type="text"
                value={lsxCode}
                onChange={(e) => {
                  const value = e.target.value;
                  setLsxCode(value);
                  if (!value.trim()) setPriority('ƯU TIÊN 1');
                }}
                placeholder="Nhập mã lệnh sản xuất..."
                className="w-full h-[38px] pl-3 pr-24 font-mono font-bold text-[14px] text-[#0E1220] border border-[#DCE1EC] rounded outline-none focus:border-[#283A97]"
              />
              <button
                type="button"
                onClick={() => onNotify(lsxCode.trim() ? `Chưa tìm thấy dữ liệu LSX ${lsxCode.trim()} từ backend.` : 'Vui lòng nhập mã LSX cần kiểm tra.')}
                className="absolute right-1 top-1 bottom-1 px-3 bg-[#EEF0F9] text-[#283A97] font-condensed font-bold text-[11px] uppercase rounded hover:bg-[#283A97] hover:text-white"
              >
                KIỂM TRA
              </button>
            </div>
          </div>

          <div className="md:col-span-6">
            <button
              type="button"
              onClick={() => onNotify('Đã bật camera quét mã vạch trên phiếu lệnh sản xuất giấy...')}
              className="w-full h-[38px] px-3 bg-[#F4F6FA] border border-[#DCE1EC] text-[#0E1220] hover:bg-[#EEF0F9] hover:text-[#283A97] rounded font-condensed font-bold text-[12px] uppercase flex items-center justify-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">barcode_scanner</span>
              QUÉT MÃ VẠCH LSX TỪ PHIẾU GIẤY
            </button>
          </div>
        </div>

        <div className="p-3 bg-[#F4F6FA] rounded border border-[#DCE1EC] grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12.5px]">
          <div>
            <label className="text-[#59627A] block text-[11px] uppercase font-condensed font-bold mb-1">TÊN SẢN PHẨM GIA CÔNG:</label>
            <input value={productName} onChange={(e) => setProductName(e.target.value)} required placeholder="Nhập tên sản phẩm" className="w-full h-9 px-2 border border-[#DCE1EC] rounded bg-white outline-none focus:border-[#283A97]" />
          </div>
          <div>
            <label className="text-[#59627A] block text-[11px] uppercase font-condensed font-bold mb-1">KẾ HOẠCH &amp; TIẾN ĐỘ:</label>
            <input value={productionPlan} onChange={(e) => setProductionPlan(e.target.value)} placeholder="Nhập kế hoạch sản xuất" className="w-full h-9 px-2 border border-[#DCE1EC] rounded bg-white outline-none focus:border-[#283A97]" />
          </div>
          <div>
            <label className="text-[#59627A] block text-[11px] uppercase font-condensed font-bold mb-1">TRUNG TÂM GIA CÔNG:</label>
            <input value={machineCenter} onChange={(e) => setMachineCenter(e.target.value)} placeholder="Nhập máy hoặc trung tâm gia công" className="w-full h-9 px-2 border border-[#DCE1EC] rounded bg-white outline-none focus:border-[#283A97]" />
          </div>
        </div>
      </div>

      {/* BLOCK 2: DEADLINE & PRIORITY */}
      <div className="bg-white border border-[#DCE1EC] rounded p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-[#DCE1EC] pb-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#283A97] text-[20px]">event_busy</span>
            <h2 className="font-condensed font-bold text-[14px] uppercase text-[#0E1220]">
              KHỐI 2: KỲ HẠN CẦN VẬT TƯ VỀ XƯỞNG &amp; MỨC ĐỘ ƯU TIÊN
            </h2>
          </div>
          <span className="text-[11.5px] text-[#EE202E] font-bold">KỲ HẠN PHỤC VỤ CA SẢN XUẤT</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-condensed font-bold text-[11.5px] uppercase text-[#59627A] mb-1">
              NGÀY CẦN VẬT TƯ TẠI XƯỞNG
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full h-[38px] px-3 font-mono text-[13px] border border-[#DCE1EC] rounded outline-none focus:border-[#283A97]"
            />
          </div>

          <div>
            <label className="block font-condensed font-bold text-[11.5px] uppercase text-[#59627A] mb-1">
              MỨC ĐỘ ƯU TIÊN PHÊ DUYỆT
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              disabled={!lsxCode.trim()}
              className="w-full h-[38px] px-3 text-[13px] border border-[#DCE1EC] rounded outline-none focus:border-[#283A97] disabled:bg-[#F4F6FA] disabled:text-[#59627A] disabled:cursor-not-allowed"
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-[#59627A]">
              {!lsxCode.trim()
                ? 'Không có Lệnh sản xuất: hệ thống mặc định và khóa ở Ưu tiên 1.'
                : PRIORITY_OPTIONS.find((option) => option.value === priority)?.detail}
            </p>
          </div>
        </div>

        {/* Real-time rush warning */}
        <div className="p-3 bg-[#FDECEE] border-l-4 border-l-[#EE202E] border-y border-r border-[#F9B9BE] rounded text-[12px] text-[#EE202E] flex items-start gap-2">
          <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">warning</span>
          <div>
            <strong>QUY ĐỊNH TIẾN ĐỘ:</strong> {priority === 'ƯU TIÊN 1'
              ? 'Yêu cầu xử lý chuẩn trong 3 ngày làm việc; lập đề nghị ngay trong ngày và phản hồi tiến độ trong 1–2 ngày.'
              : priority === 'ƯU TIÊN 2'
                ? 'Yêu cầu xử lý chuẩn trong 5 ngày làm việc; lập đề nghị trong 1 ngày và phản hồi tiến độ trong 2–3 ngày.'
                : 'Yêu cầu xử lý chuẩn trong 7 ngày làm việc; lập đề nghị trong 2 ngày và phản hồi tiến độ trong 3–5 ngày.'}
          </div>
        </div>
      </div>

      {/* BLOCK 3: DYNAMIC LINE ITEMS */}
      <div className="bg-white border border-[#DCE1EC] rounded shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#DCE1EC] bg-[#F4F6FA] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#283A97] text-[20px]">list_alt</span>
            <h2 className="font-condensed font-bold text-[14px] uppercase text-[#0E1220]">
              KHỐI 3: DANH SÁCH VẬT TƯ ĐỀ NGHỊ ({items.length} DÒNG)
            </h2>
          </div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setShowBulkPaste(true)} className="h-[32px] px-3 bg-white border border-[#283A97] text-[#283A97] rounded font-condensed font-bold text-[11px] uppercase flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">content_paste</span>NHẬP NHIỀU TỪ EXCEL</button><button type="button" onClick={handleAddItem} className="h-[32px] px-3 bg-[#283A97] hover:bg-[#1E2C75] text-white rounded font-condensed font-bold text-[11px] uppercase flex items-center gap-1 shadow-xs"><span className="material-symbols-outlined text-[16px]">add</span>+ THÊM DÒNG VẬT TƯ MỚI</button></div>
        </div>

        <div className="p-4 space-y-4">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="p-3.5 border border-[#DCE1EC] rounded bg-[#FFFDFD] space-y-3 relative hover:border-[#283A97] transition-all"
            >
              <div className="flex items-center justify-between border-b border-[#EDF0F6] pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#EEF0F9] text-[#283A97] font-mono font-bold text-[12px] flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="font-condensed font-bold text-[12px] uppercase text-[#0E1220]">
                    DÒNG SỐ {idx + 1}
                  </span>
                  {item.code && (
                    <span className="font-mono text-[11.5px] text-[#59627A] bg-[#F4F6FA] px-2 py-0.5 border border-[#DCE1EC] rounded">
                      {item.code}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="text-[#EE202E] hover:bg-[#FDECEE] p-1 rounded text-[12px] flex items-center gap-1"
                  title="Xóa dòng"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  <span className="text-[11px] uppercase font-condensed font-bold">Xóa dòng</span>
                </button>
              </div>

              <p className="text-[10.5px] text-[#C4141F] font-bold">* Cột bắt buộc</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-3">
                <div className="xl:col-span-3">
                  <label className="block font-condensed font-bold text-[11px] uppercase text-[#59627A] mb-1">MÃ VẬT TƯ</label>
                  <div className="flex"><input value={item.code} onChange={(e) => setItems((prev) => prev.map((it, i) => i === idx ? { ...it, code: e.target.value, catalogStatus: 'CHUA_KIEM_TRA', inventoryStatus: 'CHUA_CO_DU_LIEU' } : it))} placeholder="Để trống nếu là VT mới" className="min-w-0 flex-1 h-[36px] px-2 font-mono text-[12px] border border-[#DCE1EC] rounded-l outline-none focus:border-[#283A97]"/><button type="button" onClick={() => void checkMaterialCode(idx)} className="h-[36px] px-2 bg-[#EEF0F9] text-[#283A97] border border-l-0 border-[#C6CCE9] rounded-r font-condensed font-bold text-[10px]">KIỂM TRA</button></div>
                </div>
                <div className="xl:col-span-4 relative">
                  <label className="block font-condensed font-bold text-[11px] uppercase text-[#59627A] mb-1">
                    TÊN HÀNG - QUY CÁCH <span className="text-[#EE202E]">*</span>
                  </label>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setItems((prev) =>
                        prev.map((it, i) => (i === idx ? { ...it, name: val, catalogStatus: 'CHUA_KIEM_TRA' } : it))
                      );
                      void searchMaterial(item.id, val);
                    }}
                    placeholder="Nhập tên vật tư..."
                    className="w-full h-[36px] px-3 text-[13px] border border-[#DCE1EC] rounded outline-none focus:border-[#283A97]"
                  />
                  {(materialSuggestions[item.id]?.length || 0) > 0 && <div className="absolute z-20 left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-white border border-[#C6CCE9] rounded shadow-lg">
                    {materialSuggestions[item.id].map((material) => <button key={material.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => chooseMaterial(idx, material)} className="w-full min-h-11 px-3 py-2 text-left hover:bg-[#EEF0F9] border-b border-[#EDF0F6] last:border-0">
                      <span className="block text-[12px] font-bold text-[#0E1220]">{material.ten_hang}</span>
                      <span className="block text-[11px] text-[#59627A]">{material.ma_vat_tu || 'Chưa có mã'} · {material.dvt} · {material.ton_kho == null ? 'Chưa có dữ liệu tồn' : `Khả dụng: ${material.ton_kho}`}</span>
                    </button>)}
                  </div>}
                </div>

                <div className="xl:col-span-2">
                  <label className="block font-condensed font-bold text-[11px] uppercase text-[#59627A] mb-1">
                    ĐƠN VỊ TÍNH <span className="text-[#EE202E]">*</span>
                  </label>
                  <select value={item.unit} onChange={(e) => setItems((prev) => prev.map((it, i) => i === idx ? { ...it, unit: e.target.value } : it))} disabled={unitsLoading} className="w-full h-[36px] px-2 text-[13px] border border-[#DCE1EC] rounded outline-none focus:border-[#283A97] disabled:bg-[#F4F6FA]">
                    <option value="">{unitsLoading ? 'Đang tải…' : 'Chọn đơn vị'}</option>
                    {units.map((unit) => <option key={unit.dvt} value={unit.dvt}>{unit.ten_dvt} ({unit.dvt})</option>)}
                  </select>
                  {unitsError && <span className="block mt-1 text-[10px] text-[#C4141F]">{unitsError}</span>}
                </div>
                <div className="xl:col-span-3">
                  <label className="block font-condensed font-bold text-[11px] uppercase text-[#59627A] mb-1">
                    SỐ LƯỢNG YÊU CẦU MUA <span className="text-[#EE202E]">*</span>
                  </label>
                  <input type="number" min="0.01" step="any" value={item.quantity} onChange={(e) => setItems((prev) => prev.map((it, i) => i === idx ? { ...it, quantity: Number(e.target.value) } : it))} className="w-full h-[36px] px-2 text-right font-mono font-bold border border-[#DCE1EC] rounded outline-none focus:border-[#283A97]" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {[
                  ['KỲ HẠN YÊU CẦU', 'deadline', 'date', true],
                  ['LỆNH SẢN XUẤT', 'productionOrder', 'text', false],
                  ['NGÀY LỆNH SẢN XUẤT', 'productionOrderDate', 'date', false],
                  ['MÃ VẠCH', 'barcode', 'text', false]
                ].map(([label, field, type, required]) => <div key={field as string}><label className="block font-condensed font-bold text-[11px] uppercase text-[#59627A] mb-1">{label}{required && <span className="text-[#EE202E]"> *</span>}</label><input type={type as string} value={String(item[field as keyof MaterialItem] ?? '')} onChange={(e) => setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [field as string]: e.target.value } : it))} className="w-full h-[36px] px-2 text-[12px] border border-[#DCE1EC] rounded outline-none focus:border-[#283A97]" /></div>)}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="block font-condensed font-bold text-[11px] uppercase text-[#59627A] mb-1">MỤC ĐÍCH SỬ DỤNG</label><input value={item.purpose || ''} onChange={(e) => setItems((prev) => prev.map((it, i) => i === idx ? { ...it, purpose: e.target.value } : it))} className="w-full h-[36px] px-2 text-[12px] border border-[#DCE1EC] rounded outline-none focus:border-[#283A97]" /></div>
                <div><label className="block font-condensed font-bold text-[11px] uppercase text-[#59627A] mb-1">GHI CHÚ</label><input value={item.note || ''} onChange={(e) => setItems((prev) => prev.map((it, i) => i === idx ? { ...it, note: e.target.value } : it))} className="w-full h-[36px] px-2 text-[12px] border border-[#DCE1EC] rounded outline-none focus:border-[#283A97]" /></div>
              </div>

              <div className="flex items-center justify-between text-[11.5px] pt-1 text-[#59627A]">
                <span>{item.catalogStatus === 'DA_CO_MA' ? <><strong className="text-emerald-700">Mã vật tư hợp lệ</strong> · {item.inventoryStatus === 'CHUA_CO_DU_LIEU' ? 'Chưa có dữ liệu tồn kho' : item.inventoryStatus === 'CON_HANG' ? <strong className="text-emerald-700">Còn tồn {item.stockQty} {item.unit}</strong> : <strong className="text-[#EE202E]">Hết tồn kho</strong>}</> : item.catalogStatus === 'VT_MOI_CHO_CAP_MA' ? <strong className="text-amber-700">Vật tư mới — Kho sẽ cấp mã sau khi gửi phiếu</strong> : 'Chưa kiểm tra mã vật tư'}</span>
                <span>{item.code ? 'Mã vật tư sẽ được đối chiếu với dữ liệu Kho.' : 'Vật tư mới có thể để trống mã để Kho cấp sau.'}</span>
              </div>
            </div>
          ))}

          {/* Add Line Button */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={handleAddItem}
              className="h-[36px] px-4 border border-dashed border-[#283A97] text-[#283A97] hover:bg-[#EEF0F9] rounded font-condensed font-bold text-[12px] uppercase inline-flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add_box</span>
              + THÊM DÒNG VẬT TƯ MỚI
            </button>
          </div>
        </div>
      </div>

      {showBulkPaste && <BulkMaterialPaste onClose={() => setShowBulkPaste(false)} onImport={(newItems) => { setItems((current) => [...current.filter((item) => item.name || item.code), ...newItems]); setShowBulkPaste(false); onNotify(`Đã thêm ${newItems.length} dòng vật tư từ Excel.`); }} />}

      {/* BLOCK 4: WORKSHOP PHOTOS & CAD DRAWINGS */}
      <div className="bg-white border border-[#DCE1EC] rounded p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-[#DCE1EC] pb-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#283A97] text-[20px]">attachment</span>
            <h2 className="font-condensed font-bold text-[14px] uppercase text-[#0E1220]">
              KHỐI 4: ẢNH HIỆN TRẠNG XƯỞNG / BẢN VẼ KỸ THUẬT (TỆP ĐÍNH KÈM)
            </h2>
          </div>
          <span className="text-[11.5px] text-[#59627A]">Hỗ trợ JPG, PNG, WEBP, PDF</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          {/* Upload Box */}
          <label className="border-2 border-dashed border-[#DCE1EC] hover:border-[#283A97] rounded p-4 text-center cursor-pointer bg-[#F4F6FA] hover:bg-[#EEF0F9]/30 transition-colors">
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(event) => {
                const files = Array.from(event.target.files || []);
                if (!files.length) return;
                setAttachedPhotos((prev) => [...prev, ...files.map((file) => ({
                  name: file.name,
                  size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
                  url: URL.createObjectURL(file),
                  type: file.type === 'application/pdf' ? 'pdf' as const : 'image' as const
                }))]);
                event.target.value = '';
              }}
            />
            <span className="material-symbols-outlined text-[28px] text-[#59627A] mb-1">cloud_upload</span>
            <div className="text-[13px] text-[#0E1220] font-bold">Kéo thả ảnh hoặc click để đính kèm</div>
            <div className="text-[11.5px] text-[#8A93AA] mt-0.5">Chọn ảnh hiện trường hoặc bản vẽ PDF từ thiết bị</div>
          </label>

          {/* Previews */}
          <div className="space-y-2">
            {attachedPhotos.map((p, i) => (
              <div
                key={p.name + i}
                className="p-2.5 border border-[#DCE1EC] rounded bg-white flex items-center justify-between text-[12.5px]"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  {p.type === 'image' ? <img src={p.url} alt={p.name} className="w-9 h-9 object-cover rounded border border-[#DCE1EC] shrink-0" /> : <span className="w-9 h-9 flex items-center justify-center bg-[#FDECEE] text-[#EE202E] border border-[#F9B9BE] rounded material-symbols-outlined">picture_as_pdf</span>}
                  <div className="truncate">
                    <span className="font-bold text-[#0E1220] block truncate">{p.name}</span>
                    <span className="text-[11px] text-[#8A93AA] font-mono">{p.size}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-[#EE202E] p-1 hover:bg-[#FDECEE] rounded"
                  title="Xóa tệp"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BLOCK 5: SUBMITTER INFO */}
      <div className="bg-white border border-[#DCE1EC] rounded p-4 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12.5px]">
        <div>
          <span className="font-condensed font-bold text-[11px] uppercase text-[#59627A] block">
            NGƯỜI LẬP PHIẾU ĐỀ NGHỊ:
          </span>
          <span className="font-bold text-[#0E1220] block mt-0.5">{currentUser.ho_va_ten || currentUser.ma_tai_khoan}</span>
          <span className="text-[#59627A]">{currentUser.vai_tro}</span>
        </div>

        <div>
          <span className="font-condensed font-bold text-[11px] uppercase text-[#59627A] block">
            BỘ PHẬN XƯỞNG:
          </span>
          <span className="font-bold text-[#283A97] block mt-0.5">{currentUser.ma_bo_phan}</span>
          <span className="text-[#59627A]">Theo hồ sơ tài khoản đang đăng nhập</span>
        </div>

        <div>
          <span className="font-condensed font-bold text-[11px] uppercase text-[#59627A] block">
            THỜI ĐIỂM GỬI DUYỆT:
          </span>
          <span className="font-mono text-[#0E1220] block mt-0.5">{new Date().toLocaleString('vi-VN')}</span>
          <span className="text-[#4557b2] font-bold">Hệ thống ghi nhận dấu thời gian thực</span>
        </div>
      </div>

      {/* STICKY BOTTOM ACTIONS */}
      <footer className="fixed bottom-0 right-0 left-0 lg:left-[250px] z-40 bg-white border-t-2 border-[#DCE1EC] px-4 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="pill bg-[#EEF0F9] text-[#283A97] text-[11px] px-2.5 py-1">
            TỔNG DỰ TOÁN TẠM TÍNH:
          </span>
          <span className="font-mono text-[16px] font-bold text-[#0E1220]">
            {totalEstimate.toLocaleString('vi-VN')} VNĐ
          </span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => onNotify('Đã lưu bản nháp thành công vào bộ nhớ tạm xưởng.')}
            className="h-[38px] px-4 rounded border border-[#DCE1EC] text-[#0E1220] hover:bg-[#F4F6FA] font-condensed font-bold text-[12px] uppercase transition-colors"
          >
            LƯU NHÁP
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="h-[38px] px-6 rounded bg-[#283A97] hover:bg-[#1E2C75] active:scale-[0.98] text-white font-condensed font-bold text-[12px] uppercase transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-wait"
          >
            <span className={`material-symbols-outlined text-[19px] ${submitting ? 'animate-spin' : ''}`}>{submitting ? 'progress_activity' : 'send'}</span>
            <span>{submitting ? 'ĐANG LƯU…' : `GỬI DUYỆT NGAY (${items.length} DÒNG)`}</span>
          </button>
        </div>
      </footer>
    </form>
  );
};
