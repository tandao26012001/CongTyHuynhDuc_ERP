import { useMemo, useState } from 'react';
import { DuLieuNhanVien, xemTruocNhapNhanVien, xacNhanNhapNhanVien } from '../api/client';

function parseTsv(text: string) {
  return text.split(/\r?\n/).map((line) => line.split('\t').map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean));
}

function normalizeDate(value: string) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  return match ? `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}` : value;
}

function normalizeStatus(value: string): DuLieuNhanVien['trang_thai'] {
  const key = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd')
    .trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  if (key === 'NGHI_VIEC') return 'NGHI_VIEC';
  if (['TAM_NGHI', 'TAM_NGUNG'].includes(key)) return 'TAM_NGHI';
  return 'HOAT_DONG';
}

export function BulkEmployeePaste({ onClose, onImported }: {
  onClose: () => void;
  onImported: (count: number) => void;
}) {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<DuLieuNhanVien[]>([]);
  const [errors, setErrors] = useState<Array<{ dong: number; loi: string[] }>>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const visible = useMemo(() => rows.slice((page - 1) * pageSize, page * pageSize), [rows, page]);

  function preview() {
    const parsed = parseTsv(text).filter((row, index) => !(
      index === 0 && /mã|ma/i.test(row[0] || '') && /tên|ten/i.test(row[1] || '')
    )).map((row) => ({
      ma_nhan_vien: (row[0] || '').toUpperCase(), ho_va_ten: row[1] || '',
      ma_bo_phan: (row[2] || '').toUpperCase(), chuc_vu: row[3] || '',
      ngay_vao_lam: normalizeDate(row[4] || ''),
      trang_thai: normalizeStatus(row[5] || 'HOAT_DONG'),
      ghi_chu: row[6] || '',
    }));
    setRows(parsed); setErrors([]); setPage(1);
    setMessage(parsed.length ? '' : 'Không đọc được dòng dữ liệu nào.');
  }

  async function save() {
    if (!rows.length) return;
    setBusy(true); setMessage(''); setErrors([]);
    try {
      const checked = await xemTruocNhapNhanVien(rows);
      const invalidRows = checked.chi_tiet
        .filter((item) => !item.hop_le)
        .map((item) => ({ row: rows[item.dong - 1], error: { dong: item.dong, loi: item.loi } }))
        .filter((item) => item.row);
      const validRows = checked.chi_tiet
        .filter((item) => item.hop_le)
        .map((item) => rows[item.dong - 1])
        .filter((row): row is DuLieuNhanVien => Boolean(row));

      if (!validRows.length) {
        setRows(invalidRows.map((item) => item.row));
        setErrors(invalidRows.map((item) => item.error));
        setText(invalidRows.map(({ row }) => [row.ma_nhan_vien, row.ho_va_ten, row.ma_bo_phan || '', row.chuc_vu || '', row.ngay_vao_lam || '', row.trang_thai, row.ghi_chu || ''].join('\t')).join('\n'));
        setMessage(`Còn ${invalidRows.length} dòng lỗi; không có dòng hợp lệ để nhập.`);
        return;
      }

      let rowsToInsert = validRows;
      let validPreview = await xemTruocNhapNhanVien(rowsToInsert);
      while (validPreview.co_loi) {
        const newlyInvalid = validPreview.chi_tiet
          .filter((item) => !item.hop_le)
          .map((item) => ({ row: rowsToInsert[item.dong - 1], error: { dong: rows.indexOf(rowsToInsert[item.dong - 1]) + 1, loi: item.loi } }))
          .filter((item) => item.row);
        invalidRows.push(...newlyInvalid);
        rowsToInsert = validPreview.chi_tiet
          .filter((item) => item.hop_le)
          .map((item) => rowsToInsert[item.dong - 1])
          .filter((row): row is DuLieuNhanVien => Boolean(row));
        if (!rowsToInsert.length) {
          const retained = invalidRows.sort((a, b) => a.error.dong - b.error.dong);
          setRows(retained.map((item) => item.row));
          setErrors(retained.map((item) => item.error));
          setText(retained.map(({ row }) => [row.ma_nhan_vien, row.ho_va_ten, row.ma_bo_phan || '', row.chuc_vu || '', row.ngay_vao_lam || '', row.trang_thai, row.ghi_chu || ''].join('\t')).join('\n'));
          setMessage(`Còn ${retained.length} dòng lỗi; không có dòng hợp lệ để nhập.`);
          return;
        }
        validPreview = await xemTruocNhapNhanVien(rowsToInsert);
      }

      const result = await xacNhanNhapNhanVien(rowsToInsert, validPreview.ma_xac_nhan);
      onImported(result.so_dong);
      if (invalidRows.length) {
        setRows(invalidRows.map((item) => item.row));
        setErrors(invalidRows.map((item) => item.error));
        setText(invalidRows.map(({ row }) => [row.ma_nhan_vien, row.ho_va_ten, row.ma_bo_phan || '', row.chuc_vu || '', row.ngay_vao_lam || '', row.trang_thai, row.ghi_chu || ''].join('\t')).join('\n'));
        setPage(1);
        setMessage(`Đã thêm ${result.so_dong} nhân viên hợp lệ; giữ lại ${invalidRows.length} dòng lỗi để bạn sửa và nhập lại.`);
      } else {
        onClose();
      }
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Không nhập được danh sách nhân viên.');
    } finally { setBusy(false); }
  }

  return <div className="fixed inset-0 z-[80] bg-black/45 flex items-center justify-center p-3"><div className="bg-white w-full max-w-6xl max-h-[92vh] overflow-hidden rounded shadow-xl flex flex-col">
    <header className="p-4 border-b flex justify-between items-center"><div><h2 className="font-bold">THÊM NHÂN VIÊN HÀNG LOẠT TỪ EXCEL</h2><p className="text-[12px] text-[#59627A] mt-1">Tối đa 500 dòng; bảng xem trước hiển thị 20 dòng/trang.</p></div><button type="button" disabled={busy} onClick={onClose} className="min-w-11 min-h-11"><span className="material-symbols-outlined">close</span></button></header>
    <div className="p-4 overflow-y-auto space-y-3">
      <div className="p-3 bg-[#EEF0F9] border border-[#C6CCE9] text-[12px]"><strong>Thứ tự cột:</strong> Mã nhân viên | Họ và tên | Mã bộ phận | Chức vụ | Ngày vào làm (DD/MM/YYYY) | Trạng thái | Ghi chú</div>
      {message && <div role="alert" className="p-3 bg-[#FDECEE] border-l-4 border-[#EE202E] text-[#C4141F] text-[12px]">{message}{errors.length > 0 && <ul className="list-disc pl-5 mt-2 max-h-32 overflow-y-auto">{errors.map((error) => <li key={error.dong}>Dòng {error.dong}: {error.loi.join('; ')}</li>)}</ul>}</div>}
      <textarea rows={7} value={text} onChange={(event) => setText(event.target.value)} className="w-full p-3 border rounded font-mono text-[12px]" placeholder={'NV0001\tNguyễn Văn A\tKD\tNhân viên\t01/09/2026\tHOAT_DONG\t'} />
      <div className="flex flex-wrap gap-2"><button type="button" onClick={preview} disabled={busy} className="min-h-11 px-5 border border-[#283A97] text-[#283A97] font-bold rounded">XEM TRƯỚC</button><button type="button" onClick={() => void save()} disabled={!rows.length || busy} className="min-h-11 px-5 bg-[#283A97] text-white font-bold rounded disabled:opacity-50">{busy ? 'ĐANG KIỂM TRA & NHẬP…' : `NHẬP ${rows.length} NHÂN VIÊN`}</button></div>
      {rows.length > 0 && <><div className="flex items-center justify-between text-[12px]"><span>{rows.length} dòng</span><div className="flex items-center gap-2"><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} className="min-w-10 h-10 border rounded disabled:opacity-40"><span className="material-symbols-outlined">chevron_left</span></button><strong>Trang {page}/{totalPages}</strong><button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages} className="min-w-10 h-10 border rounded disabled:opacity-40"><span className="material-symbols-outlined">chevron_right</span></button></div></div><div className="overflow-x-auto border rounded"><table className="w-full min-w-[1000px] text-[12px]"><thead className="bg-[#F4F6FA]"><tr>{['MÃ NV','HỌ VÀ TÊN','BỘ PHẬN','CHỨC VỤ','NGÀY VÀO LÀM','TRẠNG THÁI','GHI CHÚ'].map((head) => <th key={head} className="p-2 text-left">{head}</th>)}</tr></thead><tbody>{visible.map((row, index) => <tr key={`${row.ma_nhan_vien}-${index}`} className="border-t"><td className="p-2 font-mono font-bold">{row.ma_nhan_vien}</td><td className="p-2">{row.ho_va_ten}</td><td className="p-2 font-mono">{row.ma_bo_phan || '—'}</td><td className="p-2">{row.chuc_vu || '—'}</td><td className="p-2">{row.ngay_vao_lam || '—'}</td><td className="p-2">{row.trang_thai}</td><td className="p-2">{row.ghi_chu || '—'}</td></tr>)}</tbody></table></div></>}
    </div>
    <footer className="p-4 border-t flex justify-end"><button type="button" disabled={busy} onClick={onClose} className="min-h-11 px-5 border rounded font-bold">ĐÓNG</button></footer>
  </div></div>;
}
