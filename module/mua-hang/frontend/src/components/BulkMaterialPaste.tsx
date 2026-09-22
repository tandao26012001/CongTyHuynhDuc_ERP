import { useState } from 'react';
import { timVatTu } from '../api/client';
import { MaterialItem } from '../types';

interface PreviewRow {
  id: string;
  code: string;
  name: string;
  spec: string;
  quantity: number;
  unit: string;
  note: string;
  deadline: string;
  productionOrder: string;
  productionOrderDate: string;
  barcode: string;
  purpose: string;
  status: 'CHUA_KIEM_TRA' | 'DANG_KIEM_TRA' | 'DA_CO_MA' | 'VT_MOI_CHO_CAP_MA' | 'LOI';
  stock: number | null;
  error?: string;
}

interface Props {
  onClose: () => void;
  onImport: (items: MaterialItem[]) => void;
}

const sampleHeader = 'STT\tMÃ VẬT TƯ\tTÊN HÀNG - QUY CÁCH\tĐƠN VỊ TÍNH\tSỐ LƯỢNG YÊU CẦU MUA\tKỲ HẠN YÊU CẦU\tLỆNH SẢN XUẤT\tNGÀY LỆNH SẢN XUẤT\tMÃ VẠCH\tMỤC ĐÍCH SỬ DỤNG\tGHI CHÚ';
const requiredColumns = new Set(['TÊN HÀNG - QUY CÁCH', 'ĐVT', 'SL', 'KỲ HẠN']);

function parseRows(text: string): PreviewRow[] {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map<PreviewRow>((line, index) => {
    const cells = line.split('\t').map((cell) => cell.trim());
    const source = cells.length >= 17
      ? [cells[0], cells[1], cells[2], cells[4], cells[5], cells[11], cells[12], cells[13], cells[14], cells[15], cells[16]]
      : cells;
    return {
      id: `paste-${Date.now()}-${index}`, code: source[1] || '', name: source[2] || '', spec: '',
      unit: source[3] || '', quantity: Number(String(source[4] || '').replace(',', '.')) || 1,
      deadline: source[5] || '', productionOrder: source[6] || '', productionOrderDate: source[7] || '',
      barcode: source[8] || '', purpose: source[9] || '', note: source[10] || '',
      status: 'CHUA_KIEM_TRA', stock: null
    };
  }).filter((row, index) => !(index === 0 && /mã vật tư|ma vat tu/i.test(row.code)));
}

export function BulkMaterialPaste({ onClose, onImport }: Props) {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [checking, setChecking] = useState(false);

  const update = (id: string, values: Partial<PreviewRow>) => setRows((current) => current.map((row) => row.id === id ? { ...row, ...values } : row));

  async function checkAll(source = rows) {
    setChecking(true);
    const checked = await Promise.all(source.map(async (row) => {
      if (!row.code) return { ...row, status: 'VT_MOI_CHO_CAP_MA' as const, stock: null };
      try {
        const matches = await timVatTu(row.code);
        const found = matches.find((item) => item.ma_vat_tu.toLowerCase() === row.code.toLowerCase());
        if (!found) return { ...row, status: 'VT_MOI_CHO_CAP_MA' as const, stock: null };
        return {
          ...row, code: found.ma_vat_tu, name: row.name || found.ten_hang,
          unit: row.unit || found.dvt, stock: found.ton_kho ?? null,
          status: 'DA_CO_MA' as const, error: undefined
        };
      } catch (error) {
        return { ...row, status: 'LOI' as const, error: error instanceof Error ? error.message : 'Không kiểm tra được mã vật tư.' };
      }
    }));
    setRows(checked);
    setChecking(false);
  }

  function makePreview() {
    const parsed = parseRows(text);
    setRows(parsed);
    if (parsed.length) void checkAll(parsed);
  }

  function confirmImport() {
    if (!rows.length || rows.some((row) => !row.name || !row.unit || !row.deadline || row.quantity <= 0 || row.status === 'LOI')) return;
    onImport(rows.map((row) => ({
      id: `item-${Date.now()}-${row.id}`, code: row.code, name: row.name, spec: row.spec,
      unit: row.unit, quantity: row.quantity, stockQty: row.stock ?? 0, unitPrice: 0,
      note: row.note, catalogStatus: row.status === 'DA_CO_MA' ? 'DA_CO_MA' : 'VT_MOI_CHO_CAP_MA',
      inventoryStatus: row.stock == null ? 'CHUA_CO_DU_LIEU' : row.stock > 0 ? 'CON_HANG' : 'HET_HANG',
      deadline: row.deadline, productionOrder: row.productionOrder, productionOrderDate: row.productionOrderDate,
      barcode: row.barcode, purpose: row.purpose
    })));
  }

  return <div className="fixed inset-0 z-[80] bg-[#0E1220]/50 p-3 flex items-center justify-center">
    <div className="bg-white border border-[#DCE1EC] rounded-lg shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col">
      <header className="p-4 border-b border-[#DCE1EC] flex items-center justify-between"><div><h2 className="font-bold text-[17px]">Nhập nhiều vật tư từ Excel</h2><p className="text-[12px] text-[#59627A] mt-1">Sao chép các cột theo đúng thứ tự rồi dán vào vùng bên dưới.</p></div><button onClick={onClose} className="material-symbols-outlined p-2">close</button></header>
      <div className="p-4 overflow-y-auto space-y-4">
        <div className="bg-[#EEF0F9] border border-[#C6CCE9] p-3 text-[12px]"><b>Cấu trúc lấy từ file de-nghi-vat-tu-mau.xlsx:</b><div className="font-mono text-[10px] mt-1 break-words">{sampleHeader.replaceAll('\t', '  |  ')}</div><span className="text-[#59627A] block mt-1">Sao chép các dòng trong bảng Excel; có thể kèm hoặc không kèm hàng tiêu đề. Mã vật tư được phép để trống để Kho cấp mã sau.</span><span className="text-[#C4141F] block mt-1 font-bold">* Cột bắt buộc: Tên hàng – quy cách, Đơn vị tính, Số lượng yêu cầu mua và Kỳ hạn yêu cầu.</span></div>
        <textarea value={text} onChange={(event) => setText(event.target.value)} rows={6} placeholder={`${sampleHeader}\n1\tVT-...\tTên hàng và quy cách...\tPCS\t10\t30/09/2026\tLSX-...\t21/09/2026\t...\tSản xuất\t...`} className="w-full p-3 border border-[#DCE1EC] rounded font-mono text-[12px] outline-none focus:border-[#283A97]" />
        <div className="flex gap-2"><button onClick={makePreview} disabled={!text.trim()} className="h-9 px-4 bg-[#283A97] text-white disabled:opacity-50 font-condensed font-bold text-[11px]">XEM TRƯỚC & KIỂM TRA MÃ</button>{rows.length > 0 && <button onClick={() => void checkAll()} disabled={checking} className="h-9 px-4 border border-[#283A97] text-[#283A97] font-condensed font-bold text-[11px]">{checking ? 'ĐANG KIỂM TRA...' : 'KIỂM TRA LẠI'}</button>}</div>
        {rows.length > 0 && <div className="border border-[#DCE1EC] overflow-x-auto"><table className="w-full min-w-[1550px] text-[11px]"><thead className="bg-[#F4F6FA] text-[#59627A] font-condensed"><tr>{['MÃ VẬT TƯ','TÊN HÀNG - QUY CÁCH','ĐVT','SL','KỲ HẠN','LỆNH SX','NGÀY LSX','MÃ VẠCH','MỤC ĐÍCH','GHI CHÚ','KIỂM TRA',''].map((h) => <th key={h} className="p-2 text-left">{h}{requiredColumns.has(h) && <span className="text-[#EE202E] ml-0.5">*</span>}</th>)}</tr></thead><tbody className="divide-y divide-[#EDF0F6]">{rows.map((row) => <tr key={row.id}><td className="p-1"><input value={row.code} onChange={(e) => update(row.id,{code:e.target.value,status:'CHUA_KIEM_TRA'})} className="w-32 p-2 border" /></td><td className="p-1"><input value={row.name} onChange={(e) => update(row.id,{name:e.target.value})} className={`w-72 p-2 border ${!row.name ? 'border-[#EE202E] bg-[#FDECEE]' : ''}`} /></td><td className="p-1"><input value={row.unit} onChange={(e) => update(row.id,{unit:e.target.value})} className={`w-20 p-2 border ${!row.unit ? 'border-[#EE202E] bg-[#FDECEE]' : ''}`} /></td><td className="p-1"><input type="number" min="0.01" step="any" value={row.quantity} onChange={(e) => update(row.id,{quantity:Number(e.target.value)})} className={`w-20 p-2 border text-right ${row.quantity <= 0 ? 'border-[#EE202E] bg-[#FDECEE]' : ''}`} /></td><td className="p-1"><input value={row.deadline} onChange={(e) => update(row.id,{deadline:e.target.value})} className={`w-28 p-2 border ${!row.deadline ? 'border-[#EE202E] bg-[#FDECEE]' : ''}`} /></td><td className="p-1"><input value={row.productionOrder} onChange={(e) => update(row.id,{productionOrder:e.target.value})} className="w-28 p-2 border" /></td><td className="p-1"><input value={row.productionOrderDate} onChange={(e) => update(row.id,{productionOrderDate:e.target.value})} className="w-28 p-2 border" /></td><td className="p-1"><input value={row.barcode} onChange={(e) => update(row.id,{barcode:e.target.value})} className="w-28 p-2 border" /></td><td className="p-1"><input value={row.purpose} onChange={(e) => update(row.id,{purpose:e.target.value})} className="w-32 p-2 border" /></td><td className="p-1"><input value={row.note} onChange={(e) => update(row.id,{note:e.target.value})} className="w-36 p-2 border" /></td><td className="p-2"><span className={`font-bold ${row.status === 'DA_CO_MA' ? 'text-emerald-700' : row.status === 'LOI' ? 'text-[#EE202E]' : 'text-amber-700'}`}>{row.status === 'DA_CO_MA' ? `Đã có mã · ${row.stock == null ? 'Chưa có dữ liệu tồn' : `Tồn ${row.stock}`}` : row.status === 'LOI' ? row.error : row.status === 'VT_MOI_CHO_CAP_MA' ? 'VT mới · chờ Kho cấp mã' : 'Chưa kiểm tra'}</span></td><td className="p-1"><button onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))} className="text-[#EE202E] material-symbols-outlined">delete</button></td></tr>)}</tbody></table></div>}
      </div>
      <footer className="p-4 border-t border-[#DCE1EC] flex justify-end gap-2"><button onClick={onClose} className="h-9 px-4 border border-[#DCE1EC] font-bold text-[11px]">HỦY</button><button onClick={confirmImport} disabled={!rows.length || checking || rows.some((row) => !row.name || !row.unit || !row.deadline || row.quantity <= 0 || row.status === 'LOI')} className="h-9 px-4 bg-[#283A97] text-white disabled:opacity-50 font-bold text-[11px]">THÊM {rows.length} DÒNG VÀO PHIẾU</button></footer>
    </div>
  </div>;
}
