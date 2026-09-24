import { useMemo, useState } from 'react';
import { DuLieuBoPhan, xemTruocNhapBoPhan, xacNhanNhapBoPhan } from '../api/client';

function parseRows(text: string) {
  return text.split(/\r?\n/).map((line) => line.split('\t').map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean));
}

function normalizeStatus(value: string): DuLieuBoPhan['trang_thai'] {
  const key = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd')
    .trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  if (['NGUNG', 'NGUNG_HOAT_DONG'].includes(key)) return 'NGUNG';
  return 'HOAT_DONG';
}

export function BulkDepartmentPaste({ onClose, onImported }: {
  onClose: () => void;
  onImported: (count: number) => void;
}) {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<DuLieuBoPhan[]>([]);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Array<{ dong: number; loi: string[] }>>([]);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const visible = useMemo(() => rows.slice((page - 1) * pageSize, page * pageSize), [rows, page]);

  function preview() {
    const parsed = parseRows(text).filter((row, index) => !(
      index === 0 && /mã|ma/i.test(row[0] || '') && /tên|ten/i.test(row[1] || '')
    )).map((row) => ({
      ma_bo_phan: (row[0] || '').toUpperCase(), ten: row[1] || '', loai: row[2] || '',
      thu_tu: Number(row[3] || 0),
      trang_thai: normalizeStatus(row[4] || 'HOAT_DONG'),
    }));
    setRows(parsed); setErrors([]); setPage(1);
    setMessage(parsed.length ? '' : 'Không đọc được dòng dữ liệu nào.');
  }

  async function save() {
    if (!rows.length) return;
    setBusy(true); setMessage(''); setErrors([]);
    try {
      const checked = await xemTruocNhapBoPhan(rows);
      if (checked.co_loi) {
        setErrors(checked.chi_tiet.filter((item) => item.loi.length).map((item) => ({ dong: item.dong, loi: item.loi })));
        setMessage(`Còn ${checked.co_loi} dòng lỗi. Hãy sửa dữ liệu rồi xem trước lại.`);
        return;
      }
      const result = await xacNhanNhapBoPhan(rows, checked.ma_xac_nhan);
      onImported(result.so_dong); onClose();
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không nhập được danh sách bộ phận.'); }
    finally { setBusy(false); }
  }

  return <div className="fixed inset-0 z-[80] bg-black/45 flex items-center justify-center p-3"><div className="bg-white w-full max-w-5xl max-h-[92vh] overflow-hidden rounded shadow-xl flex flex-col">
    <header className="p-4 border-b flex justify-between items-center"><div><h2 className="font-bold">THÊM BỘ PHẬN HÀNG LOẠT TỪ EXCEL</h2><p className="text-[12px] text-[#59627A] mt-1">Tối đa 500 dòng; bảng xem trước hiển thị 20 dòng/trang.</p></div><button type="button" disabled={busy} onClick={onClose} className="min-w-11 min-h-11"><span className="material-symbols-outlined">close</span></button></header>
    <div className="p-4 overflow-y-auto space-y-3">
      <div className="p-3 bg-[#EEF0F9] border border-[#C6CCE9] text-[12px]"><strong>Thứ tự cột:</strong> Mã bộ phận | Tên bộ phận | Loại bộ phận | Thứ tự | Trạng thái</div>
      {message && <div role="alert" className="p-3 bg-[#FDECEE] border-l-4 border-[#EE202E] text-[#C4141F] text-[12px]">{message}{errors.length > 0 && <ul className="list-disc pl-5 mt-2 max-h-32 overflow-y-auto">{errors.map((error) => <li key={error.dong}>Dòng {error.dong}: {error.loi.join('; ')}</li>)}</ul>}</div>}
      <textarea rows={7} value={text} onChange={(event) => setText(event.target.value)} className="w-full p-3 border rounded font-mono text-[12px]" placeholder={'KD\tKinh doanh\tPHONG_BAN\t1\tHOAT_DONG'} />
      <div className="flex flex-wrap gap-2"><button type="button" onClick={preview} disabled={busy} className="min-h-11 px-5 border border-[#283A97] text-[#283A97] font-bold rounded">XEM TRƯỚC</button><button type="button" onClick={() => void save()} disabled={!rows.length || busy} className="min-h-11 px-5 bg-[#283A97] text-white font-bold rounded disabled:opacity-50">{busy ? 'ĐANG KIỂM TRA & NHẬP…' : `NHẬP ${rows.length} BỘ PHẬN`}</button></div>
      {rows.length > 0 && <><div className="flex items-center justify-between text-[12px]"><span>{rows.length} dòng</span><div className="flex items-center gap-2"><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} className="min-w-10 h-10 border rounded disabled:opacity-40"><span className="material-symbols-outlined">chevron_left</span></button><strong>Trang {page}/{totalPages}</strong><button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages} className="min-w-10 h-10 border rounded disabled:opacity-40"><span className="material-symbols-outlined">chevron_right</span></button></div></div><div className="overflow-x-auto border rounded"><table className="w-full min-w-[760px] text-[12px]"><thead className="bg-[#F4F6FA]"><tr>{['MÃ BỘ PHẬN','TÊN BỘ PHẬN','LOẠI','THỨ TỰ','TRẠNG THÁI'].map((head) => <th key={head} className="p-2 text-left">{head}</th>)}</tr></thead><tbody>{visible.map((row, index) => <tr key={`${row.ma_bo_phan}-${index}`} className="border-t"><td className="p-2 font-mono font-bold">{row.ma_bo_phan}</td><td className="p-2">{row.ten}</td><td className="p-2">{row.loai || '—'}</td><td className="p-2">{row.thu_tu ?? '—'}</td><td className="p-2">{row.trang_thai}</td></tr>)}</tbody></table></div></>}
    </div><footer className="p-4 border-t flex justify-end"><button type="button" disabled={busy} onClick={onClose} className="min-h-11 px-5 border rounded font-bold">ĐÓNG</button></footer>
  </div></div>;
}
