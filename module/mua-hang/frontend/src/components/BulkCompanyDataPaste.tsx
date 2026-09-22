import { useState } from 'react';
import { nhapChungLoaiHangLoat, nhapQuyTacNhanDien } from '../api/client';

export function BulkCompanyDataPaste({ type, onClose, onImported }: {
  type: 'category' | 'recognition';
  onClose: () => void;
  onImported: (count: number, hasErrors: boolean) => void;
}) {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<string[][]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Array<{ dong: number; ma: string; loi: string }>>([]);
  const headers = type === 'category' ? ['MÃ CHỦNG LOẠI *', 'TÊN CHỦNG LOẠI *', 'THỨ TỰ'] : ['MÃ QUY TẮC *', 'LOẠI *', 'TỪ KHÓA *', 'TÊN CHUẨN *', 'MÃ QUY ƯỚC *', 'ƯU TIÊN'];

  function preview() {
    const parsed = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => line.split('\t').map((cell) => cell.trim()));
    const clean = parsed.filter((row, index) => !(index === 0 && /mã|ma/i.test(row[0]) && /tên|ten|loại|loai/i.test(row[1] || '')));
    setRows(clean); setErrors([]); setMessage(clean.length ? '' : 'Không đọc được dòng dữ liệu nào.');
  }

  async function save() {
    if (!rows.length) { setMessage('Hãy dán dữ liệu và bấm Xem trước trước khi nhập.'); return; }
    setBusy(true); setMessage(''); setErrors([]);
    try {
      const result = type === 'category'
        ? await nhapChungLoaiHangLoat(rows.map((row) => ({ ma_chung_loai: (row[0] || '').toUpperCase(), ten: row[1] || '', thu_tu: Number(row[2] || 0) })))
        : await nhapQuyTacNhanDien(rows.map((row) => ({ id: (row[0] || '').toUpperCase(), loai: (row[1] || '').toUpperCase() as 'VAT_LIEU' | 'BE_MAT' | 'MAU_SAC', tu_khoa: (row[2] || '').toUpperCase(), ten_chuan: row[3] || '', ma_quy_uoc: (row[4] || '').toUpperCase(), uu_tien: Number(row[5] || 0) })));
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

  return <div className="fixed inset-0 z-[80] bg-black/45 flex items-center justify-center p-3"><div className="bg-white w-full max-w-5xl max-h-[92vh] overflow-hidden rounded shadow-xl flex flex-col"><header className="p-4 border-b flex justify-between items-center"><div><h2 className="font-bold">THÊM HÀNG LOẠT TỪ EXCEL</h2><p className="text-[12px] text-[#59627A] mt-1">{type === 'category' ? 'Chủng loại' : 'Quy tắc nhận diện'} · tối đa 500 dòng</p></div><button onClick={onClose} className="min-w-11 min-h-11"><span className="material-symbols-outlined">close</span></button></header><div className="p-4 overflow-y-auto space-y-3"><div className="p-3 bg-[#EEF0F9] border border-[#C6CCE9] text-[12px]"><strong>Thứ tự cột:</strong> {headers.join(' | ')}</div>{message && <div role="alert" className="p-3 bg-[#FDECEE] border-l-4 border-[#EE202E] text-[#C4141F] text-[12px]">{message}{errors.length > 0 && <ul className="list-disc pl-5 mt-2">{errors.map((error) => <li key={`${error.dong}-${error.ma}`}>Dòng {error.dong} — {error.ma}: {error.loi}</li>)}</ul>}</div>}<textarea rows={7} value={text} onChange={(e) => setText(e.target.value)} className="w-full p-3 border rounded font-mono text-[12px]" placeholder={type === 'category' ? 'CL01\tKim loại\t1' : 'VL-CU\tVAT_LIEU\tDONG\tĐỒNG\tCU\t50'} /><div className="flex gap-2"><button onClick={preview} className="min-h-11 px-5 border border-[#283A97] text-[#283A97] font-bold rounded">XEM TRƯỚC</button><button onClick={() => void save()} disabled={!rows.length || busy} className="min-h-11 px-5 bg-[#283A97] text-white font-bold rounded disabled:opacity-50">{busy ? 'ĐANG NHẬP…' : `NHẬP ${rows.length} DÒNG`}</button></div>{rows.length > 0 && <div className="overflow-x-auto border rounded"><table className="w-full min-w-[700px] text-[12px]"><thead className="bg-[#F4F6FA]"><tr>{headers.map((header) => <th key={header} className="p-2 text-left">{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-t">{headers.map((_, cell) => <td key={cell} className="p-2">{row[cell] || '—'}</td>)}</tr>)}</tbody></table></div>}</div><footer className="p-4 border-t flex justify-end"><button onClick={onClose} className="min-h-11 px-5 border rounded font-bold">ĐÓNG</button></footer></div></div>;
}
