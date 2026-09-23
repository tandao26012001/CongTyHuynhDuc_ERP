import { useState } from 'react';
import { nhapChungLoaiHangLoat, nhapQuyTacNhanDien } from '../api/client';
import { confirmDeleteRows, RowSelectionActions, SelectionCheckbox, useRowSelection } from './RowSelection';

type RuleType = 'VAT_LIEU' | 'BE_MAT' | 'MAU_SAC';

const RULE_LABELS: Record<RuleType, string> = {
  VAT_LIEU: 'Vật liệu', BE_MAT: 'Bề mặt / Đặc tính', MAU_SAC: 'Màu sắc',
};

function plainCell(value = '') {
  return value.trim().replace(/\*\*/g, '').replace(/`/g, '').trim();
}

// Excel bao chuỗi có xuống dòng bằng dấu nháy kép khi sao chép.
function parseTsv(text: string) {
  const result: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === '\t' && !quoted) {
      row.push(cell); cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell); cell = '';
      if (row.some((item) => item.trim())) result.push(row);
      row = [];
    } else cell += char;
  }
  row.push(cell);
  if (row.some((item) => item.trim())) result.push(row);
  return result;
}

function unaccent(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

function groupFromHeader(value: string): RuleType | null {
  const key = unaccent(plainCell(value));
  if (key.includes('be mat') || key.includes('dac tinh')) return 'BE_MAT';
  if (key.includes('mau sac')) return 'MAU_SAC';
  if (key.includes('ten hang') || key.includes('vat lieu')) return 'VAT_LIEU';
  return null;
}

function splitLines(value: string) {
  const lines = value.split(/\r?\n/).map(plainCell).filter(Boolean);
  return lines.length ? lines : [''];
}

export function parseRecognitionRows(text: string, fallbackType: RuleType) {
  const result: string[][] = [];
  let currentType = fallbackType;
  for (const raw of parseTsv(text)) {
    const headerType = groupFromHeader(raw[0] || '');
    const isHeader = raw.some((cell) => unaccent(cell).includes('ma quy uoc'));
    if (isHeader) {
      if (headerType) currentType = headerType;
      continue;
    }

    let type = currentType;
    let name = '';
    let code = '';
    let exampleName = '';
    let exampleCode = '';
    if (['VAT_LIEU', 'BE_MAT', 'MAU_SAC'].includes(plainCell(raw[0]))) {
      type = plainCell(raw[0]) as RuleType;
      [name, code, exampleName, exampleCode] = raw.slice(1, 5);
    } else if (raw.length >= 6) {
      // Bố cục A:F của file mẫu có các ô gộp thay đổi theo từng đoạn.
      name = raw[0] || raw[1];
      code = raw[2] || raw[1];
      exampleName = raw[3] || raw[4];
      exampleCode = raw[5] || raw[4];
    } else [name, code, exampleName, exampleCode] = raw.slice(0, 4);

    const columns = [name, code, exampleName, exampleCode].map((value) => splitLines(value || ''));
    const count = Math.max(...columns.map((items) => items.length));
    for (let index = 0; index < count; index += 1) {
      result.push([type, ...columns.map((items) => items[index] || '')]);
    }
  }
  return result.filter((row) => row.slice(1).some(Boolean));
}

export function BulkCompanyDataPaste({ type, onClose, onImported }: {
  type: 'category' | 'recognition';
  onClose: () => void;
  onImported: (count: number, hasErrors: boolean) => void;
}) {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<string[][]>([]);
  const [defaultRuleType, setDefaultRuleType] = useState<RuleType>('VAT_LIEU');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Array<{ dong: number; ma: string; loi: string }>>([]);
  const rowIds = rows.map((_, index) => String(index));
  const selection = useRowSelection(rowIds);
  const headers = type === 'category'
    ? ['MÃ CHỦNG LOẠI *', 'TÊN CHỦNG LOẠI *', 'THỨ TỰ']
    : ['NHÓM', 'TÊN HÀNG / THUỘC TÍNH THỰC TẾ *', 'MÃ QUY ƯỚC *', 'VÍ DỤ TÊN HÀNG', 'VÍ DỤ MÃ VT TƯƠNG ỨNG'];

  function deleteRows(ids: Set<string>) {
    if (!ids.size || !confirmDeleteRows(ids.size)) return;
    setRows((current) => current.filter((_, index) => !ids.has(String(index))));
    setMessage(''); setErrors([]); selection.clearSelection();
  }

  function preview() {
    const clean = type === 'recognition'
      ? parseRecognitionRows(text, defaultRuleType)
      : parseTsv(text).map((row) => row.map(plainCell))
        .filter((row, index) => !(index === 0 && /mã|ma/i.test(row[0]) && /tên|ten|loại|loai/i.test(row[1] || '')));
    setRows(clean); setErrors([]); setMessage(clean.length ? '' : 'Không đọc được dòng dữ liệu nào.');
  }

  async function save() {
    if (!rows.length) { setMessage('Hãy dán dữ liệu và bấm Xem trước trước khi nhập.'); return; }
    setBusy(true); setMessage(''); setErrors([]);
    try {
      const result = type === 'category'
        ? await nhapChungLoaiHangLoat(rows.map((row) => ({ ma_chung_loai: (row[0] || '').toUpperCase(), ten: row[1] || '', thu_tu: Number(row[2] || 0) })))
        : await nhapQuyTacNhanDien(rows.map((row) => ({
          loai: row[0] as RuleType, ten_thuc_te: row[1] || '', ma_quy_uoc: (row[2] || '').toUpperCase(),
          vi_du_ten_hang: row[3] || '', vi_du_ma_vat_tu: (row[4] || '').toUpperCase(),
        })));
      if (result.co_loi) {
        const failedRows = result.errors.map((error) => rows[error.dong - 1]).filter(Boolean);
        setRows(failedRows);
        setText(failedRows.map((row) => row.join('\t')).join('\n'));
        setErrors(result.errors);
        setMessage(`Đã thêm ${result.so_dong} dòng hợp lệ; giữ lại ${result.co_loi} dòng lỗi để sửa và nhập lại.`);
      }
      if (result.so_dong || result.co_loi) onImported(result.so_dong, result.co_loi > 0);
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không nhập được dữ liệu.'); }
    finally { setBusy(false); }
  }

  return <div className="fixed inset-0 z-[80] bg-black/45 flex items-center justify-center p-3"><div className="bg-white w-full max-w-6xl max-h-[92vh] overflow-hidden rounded shadow-xl flex flex-col">
    <header className="p-4 border-b flex justify-between items-center"><div><h2 className="font-bold">THÊM HÀNG LOẠT TỬ EXCEL</h2><p className="text-[12px] text-[#59627A] mt-1">{type === 'category' ? 'Chủng loại' : 'Quy tắc nhận diện theo mẫu QUY TẮC ĐẶT TÊN HÀNG.xlsx'} · tối đa 500 dòng</p></div><button onClick={onClose} className="min-w-11 min-h-11"><span className="material-symbols-outlined">close</span></button></header>
    <div className="p-4 overflow-y-auto space-y-3">
      <div className="p-3 bg-[#EEF0F9] border border-[#C6CCE9] text-[12px]"><strong>Thứ tự cột:</strong> {type === 'recognition' ? 'Tên hàng / Vật liệu thực tế | Mã quy ước | Ví dụ Tên hàng | Ví dụ Mã VT tương ứng' : headers.join(' | ')}{type === 'recognition' && <span className="block mt-1 text-[#59627A]">Có thể sao chép trực tiếp toàn bộ 6 cột A:F, kể cả các dòng tiêu đề nhóm, từ file mẫu.</span>}</div>
      {type === 'recognition' && <label className="block max-w-xs text-[11px] font-bold">NHÓM MẶC ĐỊNH CHO DÒNG KHÔNG CÓ TIÊU ĐỀ<select value={defaultRuleType} onChange={(event) => setDefaultRuleType(event.target.value as RuleType)} className="mt-1 w-full h-11 px-3 border rounded bg-white font-normal"><option value="VAT_LIEU">Vật liệu</option><option value="BE_MAT">Bề mặt / Đặc tính</option><option value="MAU_SAC">Màu sắc</option></select></label>}
      {message && <div role="alert" className="p-3 bg-[#FDECEE] border-l-4 border-[#EE202E] text-[#C4141F] text-[12px]">{message}{errors.length > 0 && <ul className="list-disc pl-5 mt-2">{errors.map((error) => <li key={`${error.dong}-${error.ma}`}>Dòng {error.dong} — {error.ma}: {error.loi}</li>)}</ul>}</div>}
      <textarea rows={7} value={text} onChange={(e) => setText(e.target.value)} className="w-full p-3 border rounded font-mono text-[12px]" placeholder={type === 'category' ? 'CL01\tKim loại\t1' : 'Inox 304 / SUS 304\tSUS304\tINOX 304 4.0MM*690*420\tVT-TL-SUS304-01'} />
      <div className="flex gap-2"><button onClick={preview} className="min-h-11 px-5 border border-[#283A97] text-[#283A97] font-bold rounded">XEM TRƯỚC</button><button onClick={() => void save()} disabled={!rows.length || busy} className="min-h-11 px-5 bg-[#283A97] text-white font-bold rounded disabled:opacity-50">{busy ? 'ĐANG NHẬP…' : `NHẬP ${rows.length} DÒNG`}</button></div>
      <RowSelectionActions total={rows.length} selectedCount={selection.selectedCount} allSelected={selection.allSelected} onToggleAll={selection.toggleAll} onDeleteSelected={() => deleteRows(selection.selected)} onDeleteAll={() => deleteRows(new Set(rowIds))} disabled={busy} />
      {rows.length > 0 && <div className="overflow-x-auto border rounded"><table className="w-full min-w-[900px] text-[12px]"><thead className="bg-[#F4F6FA]"><tr><th className="p-2 w-10 text-center"><SelectionCheckbox checked={selection.allSelected} onChange={selection.toggleAll} label="Chọn tất cả dòng" /></th>{headers.map((header) => <th key={header} className="p-2 text-left">{header}</th>)}<th className="p-2 w-14" /></tr></thead><tbody>{rows.map((row, index) => { const id = String(index); return <tr key={index} className={`border-t ${selection.selected.has(id) ? 'bg-[#EEF0F9]' : ''}`}><td className="p-2 text-center"><SelectionCheckbox checked={selection.selected.has(id)} onChange={() => selection.toggle(id)} label={`Chọn dòng ${index + 1}`} /></td>{headers.map((_, cell) => <td key={cell} className="p-2">{type === 'recognition' && cell === 0 ? RULE_LABELS[row[cell] as RuleType] : row[cell] || '—'}</td>)}<td className="p-1 text-center"><button type="button" onClick={() => deleteRows(new Set([id]))} aria-label={`Xóa dòng ${index + 1}`} className="min-w-10 min-h-10 text-[#EE202E]"><span className="material-symbols-outlined">delete</span></button></td></tr>; })}</tbody></table></div>}
    </div>
    <footer className="p-4 border-t flex justify-end"><button onClick={onClose} className="min-h-11 px-5 border rounded font-bold">ĐÓNG</button></footer>
  </div></div>;
}
