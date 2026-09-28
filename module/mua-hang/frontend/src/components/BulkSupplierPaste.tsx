import { useRef, useState } from 'react';
import { DuLieuNhaCungCap, nhapNhaCungCapHangLoat } from '../api/client';
import { confirmDeleteRows, RowSelectionActions, SelectionCheckbox, useRowSelection } from './RowSelection';

interface ImportRow {
  id: string;
  dong: number;
  duLieu: DuLieuNhaCungCap;
  loi: string;
  canXacNhan: boolean;
}

const COT = 'Tên nhà cung cấp | MST | Địa chỉ | Người liên hệ | Điện thoại | Email | Loại NCC (Mua hàng/Gia công/Cả hai) | Ghi chú';

function chuanHoaLoaiNcc(value: string) {
  const loai = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (['MUA_HANG', 'MUAHANG'].includes(loai)) return 'MUA_HANG';
  if (['GIA_CONG', 'GIACONG'].includes(loai)) return 'GIA_CONG';
  if (['CA_HAI', 'CAHAI'].includes(loai)) return 'CA_HAI';
  return '';
}

export function BulkSupplierPaste({ onClose, onImported }: {
  onClose: () => void;
  onImported: (count: number, hasErrors: boolean) => void;
}) {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [saving, setSaving] = useState(false);
  const pendingBatch = useRef<{ payload: string; headers: Record<string, string> } | null>(null);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState('');
  const selection = useRowSelection(rows.map((row) => row.id));

  function preview() {
    const parsed = text.split(/\r?\n/).map((line, index) => ({ line, dong: index + 1 }))
      .filter(({ line }) => line.trim())
      .filter(({ line, dong }) => !(dong === 1 && /tên\s*(nhà cung cấp|ncc)/i.test(line)))
      .map(({ line, dong }): ImportRow => {
        const cells = line.split('\t').map((cell) => cell.trim());
        const loai = chuanHoaLoaiNcc(cells[6] || 'MUA_HANG');
        const laNccMuaHang = loai === 'MUA_HANG' || loai === 'CA_HAI';
        const laNccGiaCong = loai === 'GIA_CONG' || loai === 'CA_HAI';
        const loi = [];
        if (!cells[0]) loi.push('Thiếu tên nhà cung cấp');
        if (!loai) loi.push('Loại NCC phải là Mua hàng, Gia công hoặc Cả hai');
        return {
          // Mỗi dòng nguồn có số dòng riêng; không phụ thuộc crypto.randomUUID
          // vì một số trình duyệt/môi trường HTTP nội bộ không hỗ trợ API này.
          id: `ncc-${dong}`, dong, loi: loi.join('; '), canXacNhan: false,
          duLieu: {
            ten: cells[0] || '', mst: cells[1] || '', dia_chi: cells[2] || '',
            nguoi_lien_he: cells[3] || '', sdt: cells[4] || '', email: cells[5] || '',
            la_ncc_mua_hang: laNccMuaHang, la_ncc_gia_cong: laNccGiaCong,
            da_phe_duyet: false, trang_thai: 'HOAT_DONG', ghi_chu: cells[7] || '',
          },
        };
      });
    if (parsed.length > 500) {
      setRows([]);
      setMessage(`Danh sách có ${parsed.length} dòng; mỗi lần chỉ nhập tối đa 500 dòng. Hãy chia nhỏ dữ liệu.`);
      return;
    }
    setRows(parsed);
    setMessage(parsed.length ? '' : 'Chưa đọc được dòng nào. Hãy dán dữ liệu Excel rồi bấm Xem trước.');
    setProgress('');
  }

  function remove(ids: Set<string>) {
    if (!ids.size || !confirmDeleteRows(ids.size, 'nhà cung cấp')) return;
    setRows((current) => current.filter((row) => !ids.has(row.id)));
    selection.clearSelection();
  }

  async function importRows(confirmWarnings = false) {
    if (saving) return;
    const targets = rows.filter((row) => confirmWarnings ? row.canXacNhan : !row.loi && !row.canXacNhan);
    if (!targets.length) {
      setMessage(confirmWarnings ? 'Không còn dòng cảnh báo cần xác nhận.' : 'Không có dòng hợp lệ để nhập.');
      return;
    }
    setSaving(true);
    setMessage('');
    setProgress(`Bắt đầu nhập ${targets.length} dòng…`);
    let imported = 0;
    const updated = [...rows];
    try {
      const payload = JSON.stringify({ rows: targets.map((row) => row.duLieu), xac_nhan_trung: confirmWarnings });
      setProgress(`Đang nhập khối ${targets.length} nhà cung cấp…`);
      const batch = await nhapNhaCungCapHangLoat(payload, pendingBatch);
      for (const result of batch.results) {
        const target = targets[result.dong - 1];
        const index = updated.findIndex((row) => row.id === target.id);
        if (result.da_luu) {
          updated.splice(index, 1);
          imported += 1;
        } else {
          updated[index] = { ...target, canXacNhan: !!result.can_xac_nhan,
            loi: result.can_xac_nhan
              ? `Gần trùng: ${JSON.stringify(result.canh_bao_trung || [])}`
              : result.loi || 'Hệ thống chưa xác nhận đã lưu dòng này.' };
        }
      }
      setRows(updated);
      const remaining = updated.filter((row) => row.loi || row.canXacNhan).length;
      setMessage(`Đã thêm ${imported} nhà cung cấp hợp lệ; giữ lại ${remaining} dòng cần xử lý.`);
      setProgress('');
      onImported(imported, remaining > 0);
      if (remaining === 0) onClose();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Có lỗi khi nhập danh sách nhà cung cấp.');
    } finally {
      setSaving(false);
      setProgress('');
    }
  }

  function updateRow(id: string, column: number, value: string) {
    setRows((current) => current.map((row) => {
      if (row.id !== id) return row;
      const fields = ['ten', 'mst', 'dia_chi', 'nguoi_lien_he', 'sdt', 'email'] as const;
      if (column < 6) return { ...row, loi: '', canXacNhan: false, duLieu: { ...row.duLieu, [fields[column]]: value } };
      if (column === 6) {
        const type = chuanHoaLoaiNcc(value);
        return { ...row, loi: type ? '' : 'Loại NCC phải là Mua hàng, Gia công hoặc Cả hai', canXacNhan: false, duLieu: { ...row.duLieu, la_ncc_mua_hang: type === 'MUA_HANG' || type === 'CA_HAI', la_ncc_gia_cong: type === 'GIA_CONG' || type === 'CA_HAI' } };
      }
      return { ...row, duLieu: { ...row.duLieu, ghi_chu: value } };
    }));
  }

  return <div className="fixed inset-0 z-[90] bg-black/45 flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-labelledby="bulk-supplier-title">
    <section className="bg-white w-full max-w-6xl max-h-[92vh] rounded shadow-xl flex flex-col">
      <header className="p-4 border-b border-[#DCE1EC] flex items-center justify-between"><div><h2 id="bulk-supplier-title" className="font-bold text-[16px]">THÊM HÀNG LOẠT NHÀ CUNG CẤP TỪ EXCEL</h2><p className="mt-1 text-[12px] text-[#59627A]">Tối đa 500 dòng. Dòng lỗi được giữ lại; dòng hợp lệ được thêm riêng.</p></div><button type="button" disabled={saving} onClick={onClose} aria-label="Đóng" className="min-w-11 min-h-11"><span className="material-symbols-outlined">close</span></button></header>
      <div className="p-4 overflow-y-auto space-y-3">
        <div className="p-3 bg-[#EEF0F9] border border-[#C6CCE9] text-[12px]"><strong>Thứ tự cột:</strong> {COT}<p className="mt-1 text-[#59627A]">Sao chép các cột từ Excel, không cần cột tiêu đề. Loại NCC mặc định là MUA_HANG.</p></div>
        {progress && <div role="status" aria-live="polite" className="p-3 bg-[#EEF0F9] border border-[#C6CCE9] rounded text-[#283A97] text-[13px] font-bold">{progress}</div>}
        {message && <div role="status" className="p-3 bg-[#FDECEE] border-l-4 border-[#EE202E] text-[#C4141F] text-[12px]">{message}</div>}
        <textarea disabled={saving} value={text} onChange={(event) => setText(event.target.value)} rows={5} className="w-full p-3 border border-[#DCE1EC] rounded font-mono text-[12px]" placeholder={'Công ty mẫu\t0101234567\tĐịa chỉ\tNguyễn Văn A\t0900000000\ta@example.com\tCA_HAI\tGhi chú'} />
        <button type="button" disabled={saving} onClick={preview} className="min-h-11 px-5 bg-[#283A97] text-white font-bold rounded disabled:opacity-50">XEM TRƯỚC</button>
        {rows.length > 0 && <>
          <RowSelectionActions total={rows.length} selectedCount={selection.selectedCount} allSelected={selection.allSelected} onToggleAll={selection.toggleAll} onDeleteSelected={() => remove(selection.selected)} onDeleteAll={() => remove(new Set(rows.map((row) => row.id)))} disabled={saving} />
          <div className="overflow-x-auto border border-[#DCE1EC] rounded"><table className="w-full min-w-[1200px] text-[12px]"><thead className="bg-[#F4F6FA]"><tr><th className="p-2"><SelectionCheckbox checked={selection.allSelected} onChange={selection.toggleAll} label="Chọn tất cả dòng NCC" /></th><th className="p-2">DÒNG / LỖI</th>{COT.split(' | ').map((col) => <th key={col} className="p-2 text-left">{col}</th>)}<th /></tr></thead><tbody>{rows.map((row) => {
            const values = [row.duLieu.ten, row.duLieu.mst, row.duLieu.dia_chi, row.duLieu.nguoi_lien_he, row.duLieu.sdt, row.duLieu.email, row.duLieu.la_ncc_mua_hang && row.duLieu.la_ncc_gia_cong ? 'CA_HAI' : row.duLieu.la_ncc_gia_cong ? 'GIA_CONG' : 'MUA_HANG', row.duLieu.ghi_chu];
            return <tr key={row.id} className="border-t align-top"><td className="p-2"><SelectionCheckbox checked={selection.selected.has(row.id)} onChange={() => selection.toggle(row.id)} label={`Chọn dòng ${row.dong}`} /></td><td className="p-2"><strong>{row.dong}</strong>{row.loi && <span className="block max-w-48 text-[#C4141F]">{row.loi}</span>}</td>{values.map((value, column) => <td key={column} className="p-1"><input disabled={saving} value={String(value || '')} onChange={(event) => updateRow(row.id, column, event.target.value)} className="w-full min-w-24 h-10 px-2 border rounded" /></td>)}<td className="p-1"><button type="button" disabled={saving} onClick={() => remove(new Set([row.id]))} aria-label={`Xóa dòng ${row.dong}`} className="min-w-10 min-h-10 text-[#EE202E]"><span className="material-symbols-outlined">delete</span></button></td></tr>;
          })}</tbody></table></div>
        </>}
      </div>
      <footer className="p-4 border-t border-[#DCE1EC] flex justify-end gap-2"><button type="button" disabled={saving} onClick={onClose} className="min-h-11 px-5 border rounded font-bold">HỦY</button><button type="button" disabled={saving || !rows.some((row) => !row.loi && !row.canXacNhan)} onClick={() => void importRows(false)} className="min-h-11 px-5 bg-[#283A97] text-white font-bold rounded disabled:opacity-50">{saving ? 'ĐANG LƯU…' : `NHẬP DÒNG HỢP LỆ`}</button>{rows.some((row) => row.canXacNhan) && <button type="button" disabled={saving} onClick={() => void importRows(true)} className="min-h-11 px-5 border border-[#283A97] text-[#283A97] font-bold rounded disabled:opacity-50">XÁC NHẬN DÒNG GẦN TRÙNG</button>}</footer>
    </section>
  </div>;
}
