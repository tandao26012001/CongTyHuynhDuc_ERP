import { useState } from 'react';
import { nhapDonViTinhHangLoat } from '../api/client';

interface UnitRow { id: string; dvt: string; ten_dvt: string; so_le: number; }

export function BulkUnitPaste({ onClose, onImported, onError }: {
  onClose: () => void;
  onImported: (count: number, hasErrors: boolean) => void;
  onError: (message: string) => void;
}) {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<UnitRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [errorDetails, setErrorDetails] = useState<Array<{ dong: number; ma: string; loi: string }>>([]);

  function preview() {
    const parsed = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line, index) => {
      let cells = line.split('\t').map((cell) => cell.trim());
      if (cells.length === 1) {
        const match = line.match(/^(\S+)\s+(.+?)\s+([0-4])$/);
        cells = match ? [match[1], match[2], match[3]] : [line, '', '0'];
      }
      return { id: `unit-${Date.now()}-${index}`, dvt: (cells[0] || '').toUpperCase(), ten_dvt: cells[1] || '', so_le: Number(cells[2] || 0) };
    }).filter((row, index) => !(index === 0 && ['DVT', 'MÃ ĐƠN VỊ', 'MÃ ĐVT'].includes(row.dvt)));
    setRows(parsed);
    setErrorDetails([]);
    setSubmitError(parsed.length ? '' : 'Không đọc được dòng dữ liệu nào. Hãy dán dữ liệu rồi bấm Xem trước.');
  }

  function update(id: string, patch: Partial<UnitRow>) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  async function save() {
    if (!rows.length) {
      setSubmitError('Chưa có dữ liệu để nhập. Hãy dán dữ liệu và bấm Xem trước trước khi submit.');
      return;
    }
    setSaving(true);
    setSubmitError('');
    setErrorDetails([]);
    try {
      const result = await nhapDonViTinhHangLoat(rows.map(({ dvt, ten_dvt, so_le }) => ({ dvt, ten_dvt, so_le })));
      if (result.errors.length) {
        const failedRows = result.errors.map((error) => rows[error.dong - 1]).filter(Boolean);
        setRows(failedRows);
        setErrorDetails(result.errors);
        setSubmitError(`Đã thêm ${result.so_dong} dòng hợp lệ; bỏ qua ${result.co_loi} dòng lỗi. Các dòng lỗi được giữ lại bên dưới để sửa và nhập lại.`);
        onImported(result.so_dong, true);
      } else {
        onImported(result.so_dong, false);
      }
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Không nhập được danh sách đơn vị tính.';
      setSubmitError(message);
      onError(message);
    } finally { setSaving(false); }
  }

  return <div className="fixed inset-0 z-[70] bg-black/45 flex items-center justify-center p-3">
    <div className="bg-white w-full max-w-5xl max-h-[92vh] overflow-hidden rounded shadow-xl flex flex-col">
      <header className="p-4 border-b border-[#DCE1EC] flex items-center justify-between"><div><h2 className="font-bold text-[16px]">NHẬP NHIỀU ĐƠN VỊ TÍNH TỪ EXCEL</h2><p className="text-[12px] text-[#59627A] mt-1">Sao chép ba cột từ Excel hoặc nhập từng dòng theo dạng: BAO Bao 0.</p></div><button onClick={onClose} aria-label="Đóng" className="min-w-11 min-h-11"><span className="material-symbols-outlined">close</span></button></header>
      <div className="p-4 overflow-y-auto space-y-4">
        <div className="p-3 bg-[#EEF0F9] border border-[#C6CCE9] text-[12px]"><strong>Cột bắt buộc:</strong> Mã đơn vị * · Tên đơn vị *. Số chữ số thập phân nhận từ 0 đến 4, mặc định là 0.<br /><span className="text-[#59627A]">Nếu không dùng cột Excel: từ đầu là mã, số cuối là số lẻ, phần chữ ở giữa là tên đơn vị. Ví dụ: <span className="font-mono">THUNG Thùng carton 0</span>.</span></div>
        {submitError && <div role="alert" className="p-3 bg-[#FDECEE] border-l-4 border-[#EE202E] border-y border-r border-[#F9B9BE] text-[#C4141F] text-[12px] flex items-start gap-2"><span className="material-symbols-outlined text-[19px]">error</span><div><strong>DỮ LIỆU CẦN KIỂM TRA</strong><p className="mt-1">{submitError}</p>{errorDetails.length > 0 && <ul className="mt-2 space-y-1 list-disc pl-5">{errorDetails.map((error) => <li key={`${error.dong}-${error.ma}`}>Dòng {error.dong} — <span className="font-mono font-bold">{error.ma || '(chưa có mã)'}</span>: {error.loi}</li>)}</ul>}</div></div>}
        <textarea value={text} onChange={(event) => setText(event.target.value)} rows={6} className="w-full p-3 border border-[#DCE1EC] rounded font-mono text-[12px]" placeholder={'CAI\tCái\t0\nKG\tKilôgam\t3'} />
        <button type="button" onClick={preview} className="min-h-11 px-5 bg-[#283A97] text-white font-bold rounded">XEM TRƯỚC DỮ LIỆU</button>
        {rows.length > 0 && <div className="overflow-x-auto border border-[#DCE1EC] rounded"><table className="w-full min-w-[650px] text-[12px]"><thead className="bg-[#F4F6FA]"><tr><th className="p-2 text-left">MÃ ĐƠN VỊ *</th><th className="p-2 text-left">TÊN ĐƠN VỊ *</th><th className="p-2 text-right">SỐ LẺ</th><th className="p-2 w-14" /></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t"><td className="p-1"><input value={row.dvt} onChange={(event) => update(row.id, { dvt: event.target.value.toUpperCase() })} className={`w-full h-10 px-2 border rounded font-mono ${!row.dvt ? 'border-[#EE202E] bg-[#FDECEE]' : 'border-[#DCE1EC]'}`} /></td><td className="p-1"><input value={row.ten_dvt} onChange={(event) => update(row.id, { ten_dvt: event.target.value })} className={`w-full h-10 px-2 border rounded ${!row.ten_dvt ? 'border-[#EE202E] bg-[#FDECEE]' : 'border-[#DCE1EC]'}`} /></td><td className="p-1"><input type="number" min="0" max="4" value={row.so_le} onChange={(event) => update(row.id, { so_le: Number(event.target.value) })} className={`w-full h-10 px-2 border rounded text-right font-mono ${row.so_le < 0 || row.so_le > 4 || !Number.isInteger(row.so_le) ? 'border-[#EE202E] bg-[#FDECEE]' : 'border-[#DCE1EC]'}`} /></td><td className="p-1 text-center"><button onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))} aria-label="Xóa dòng" className="min-w-10 min-h-10 text-[#EE202E]"><span className="material-symbols-outlined">delete</span></button></td></tr>)}</tbody></table></div>}
      </div>
      <footer className="p-4 border-t border-[#DCE1EC] flex justify-end gap-2"><button onClick={onClose} disabled={saving} className="min-h-11 px-5 border border-[#DCE1EC] font-bold rounded disabled:opacity-50">HỦY</button><button onClick={() => void save()} disabled={saving} className="min-h-11 px-5 bg-[#283A97] text-white font-bold rounded disabled:opacity-50">{saving ? 'ĐANG LƯU…' : `NHẬP ${rows.length} DÒNG`}</button></footer>
    </div>
  </div>;
}
