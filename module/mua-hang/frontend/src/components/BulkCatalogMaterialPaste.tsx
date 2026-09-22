import { useEffect, useState } from 'react';
import {
  capMaVatTu, DongNhapVatTu, duKienMaVatTu, KetQuaXemTruocNhapVatTu,
  layQuyTacMaVatTu, nhapVatTuHangLoatTungDong, QuyTacMaVatTu, xemTruocNhapVatTu,
} from '../api/client';

type Row = DongNhapVatTu & {
  id: string;
  tu_dong_cap_ma: boolean;
  ma_quy_tac: string;
  ma_vat_lieu: string;
  loai_hinh: string;
  ma_du_kien: string;
};
type ErrorDetail = { dong: number; ma: string; loi: string };
type CodeModalState = { rowId: string; kho: 'TH' | 'VT' | 'TL'; ma_quy_tac: string; loai_hinh: string };

const RULE_ALIASES: Record<string, string[]> = {
  'TH-TP': ['TRANG PHUC', 'DONG PHUC'], 'TH-VP': ['VAN PHONG PHAM'],
  'TH-CT': ['CAN TIN', 'VE SINH'], 'TH-HC': ['HOA CHAT'], 'TH-BH': ['BAO HO'],
  'TH-TDH': ['LINH KIEN THAY THE'], 'TH-NK': ['NGU KIM'], 'TH-VI': ['VIT', 'OC VIT'],
  'TH-LD': ['LONG DEN'], 'TH-TA': ['DINH TAN', 'RIVE', 'RIVET'],
  'TH-BL': ['BU LONG', 'BULONG'], 'TH-LGT': ['LUC GIAC DAU TRU'],
  'TH-LGC': ['LUC GIAC DAU CON'], 'TH-LGA': ['LUC GIAC AM'], 'TH-LGD': ['LUC GIAC DAU DU'],
  'VT-NC': ['NGUYEN CAY'], 'VT-LC': ['LE CAY'], 'VT-TN': ['TAM NGUYEN'],
  'VT-TL': ['TAM LE'], 'VT-PT': ['PHOI TAM'], 'VT-PL': ['PHOI LE'],
  'TL-MK': ['MUI KHOAN'], 'TL-MP': ['MUI PHAY'], 'TL-MR': ['MUI REAMER', 'REAMER'],
  'TL-DT': ['DAO TIEN'], 'TL-MC': ['MAM CAP'],
};

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/Đ/g, 'D').replace(/đ/g, 'd')
    .toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
}
function hasTerm(value: string, term: string) { return ` ${value} `.includes(` ${term} `); }
function inferRule(name: string, rules: QuyTacMaVatTu[]) {
  const normalizedName = normalize(name);
  const ranked = rules.map((rule) => {
    const terms = [normalize(rule.ten_nhom), ...(RULE_ALIASES[rule.ma_quy_tac] || [])].filter((term) => term.length >= 3);
    return { rule, score: Math.max(0, ...terms.filter((term) => hasTerm(normalizedName, term)).map((term) => term.length)) };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
  if (!ranked.length || (ranked[1] && ranked[0].score === ranked[1].score)) return undefined;
  return ranked[0].rule;
}
function inferShape(name: string) {
  const value = normalize(name);
  if (hasTerm(value, 'ONG')) return 'ON';
  if (hasTerm(value, 'VUONG')) return 'VU';
  if (hasTerm(value, 'CHU U')) return 'CU';
  if (hasTerm(value, 'CHU V')) return 'CV';
  if (hasTerm(value, 'HOP')) return 'HO';
  return '';
}
function looksLikeMaterialCode(value: string) { return /^(TH|VT|TL)-[A-Z0-9-]+$/i.test(value.trim()); }
function nextPreviewCode(code: string, offset: number) {
  if (!offset) return code;
  const match = code.match(/^(.*-)(\d+)$/);
  if (!match) return code;
  return `${match[1]}${String(Number(match[2]) + offset).padStart(match[2].length, '0')}`;
}
function toPayload(row: Row, code = row.ma_vat_tu): DongNhapVatTu {
  return { ma_vat_tu: code, ten_hang: row.ten_hang, dvt: row.dvt, quy_cach: row.quy_cach,
    ghi_chu: row.ghi_chu, phan_loai: row.phan_loai, trang_thai: row.trang_thai };
}

export function BulkCatalogMaterialPaste({ onClose, onImported, onError }: {
  onClose: () => void;
  onImported: (count: number, hasErrors: boolean) => void;
  onError: (message: string) => void;
}) {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [rules, setRules] = useState<QuyTacMaVatTu[]>([]);
  const [preview, setPreview] = useState<KetQuaXemTruocNhapVatTu | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [errorDetails, setErrorDetails] = useState<ErrorDetail[]>([]);
  const [codeModal, setCodeModal] = useState<CodeModalState | null>(null);
  const [codeModalBusy, setCodeModalBusy] = useState(false);
  const [codeModalError, setCodeModalError] = useState('');

  useEffect(() => {
    void layQuyTacMaVatTu().then(setRules).catch((reason) => {
      const value = reason instanceof Error ? reason.message : 'Không tải được bảng quy tắc cấp mã vật tư.';
      setMessage(value); onError(value);
    });
  }, [onError]);

  function parse() {
    const sourceLines = text.split(/\r?\n/).filter((line) => line.trim().length > 0).slice(0, 500);
    const parsed = sourceLines.flatMap((line, index) => {
      let cells = line.split('\t').map((cell) => cell.trim());
      const header = normalize(cells.join(' '));
      if (index === 0 && (header.includes('MA VAT TU') || header.includes('TEN HANG'))) return [];
      // Giữ tab rỗng đầu dòng. Nếu chỉ dán tên hoặc bỏ cột mã, cột đầu là Tên hàng.
      if (cells.length === 1 || (cells[0] && !looksLikeMaterialCode(cells[0]))) cells = ['', ...cells];
      const name = cells[1] || '';
      const inferred = !cells[0] ? inferRule(name, rules) : undefined;
      return [{ id: `material-${Date.now()}-${index}`, ma_vat_tu: (cells[0] || '').toUpperCase(), ten_hang: name,
        dvt: (cells[2] || '').toUpperCase(), quy_cach: cells[3] || '', ghi_chu: cells[4] || '',
        phan_loai: 'THONG_DUNG_SX', trang_thai: 'HOAT_DONG', tu_dong_cap_ma: !cells[0],
        ma_quy_tac: inferred?.ma_quy_tac || '', ma_vat_lieu: '',
        loai_hinh: inferred?.can_loai_hinh ? inferShape(name) : '', ma_du_kien: '' }];
    });
    setRows(parsed); setPreview(null); setErrorDetails([]);
    setMessage(parsed.length ? '' : 'Không đọc được dòng dữ liệu nào từ nội dung đã dán.');
  }

  function update(id: string, patch: Partial<Row>) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch, ma_du_kien: '' } : row));
    setPreview(null); setErrorDetails([]);
  }

  function openCodeModal(row: Row) {
    const inferred = rules.find((rule) => rule.ma_quy_tac === row.ma_quy_tac) || inferRule(row.ten_hang, rules);
    setCodeModal({
      rowId: row.id,
      kho: inferred?.kho || 'TH',
      ma_quy_tac: inferred?.ma_quy_tac || '',
      loai_hinh: row.loai_hinh || (inferred?.can_loai_hinh ? inferShape(row.ten_hang) : ''),
    });
    setCodeModalError('');
  }

  async function applyCodeInfo() {
    if (!codeModal) return;
    const row = rows.find((item) => item.id === codeModal.rowId);
    const rule = rules.find((item) => item.ma_quy_tac === codeModal.ma_quy_tac);
    if (!row || !rule) { setCodeModalError('Hãy chọn mã nhóm theo quy ước.'); return; }
    if (rule.can_loai_hinh && !codeModal.loai_hinh) { setCodeModalError('Hãy chọn loại hình để lập mã.'); return; }
    setCodeModalBusy(true); setCodeModalError('');
    try {
      const result = await duKienMaVatTu({
        ma_quy_tac: rule.ma_quy_tac,
        ten_hang: row.ten_hang,
        loai_hinh: codeModal.loai_hinh || undefined,
      });
      if (result.can_bo_sung) {
        setCodeModalError('Tên hàng chưa có từ khóa nhận diện vật liệu. Hãy bổ sung tên hàng hoặc quy tắc nhận diện.');
        return;
      }
      setRows((current) => current.map((item) => item.id === row.id ? {
        ...item,
        tu_dong_cap_ma: true,
        ma_vat_tu: '',
        ma_quy_tac: rule.ma_quy_tac,
        ma_vat_lieu: result.ma_vat_lieu || '',
        loai_hinh: codeModal.loai_hinh,
        ma_du_kien: result.ma_du_kien,
      } : item));
      setPreview(null);
      setCodeModal(null);
    } catch (reason) {
      setCodeModalError(reason instanceof Error ? reason.message : 'Không lập được mã vật tư dự kiến.');
    } finally { setCodeModalBusy(false); }
  }

  async function check() {
    if (!rows.length) { setMessage('Hãy dán dữ liệu và bấm Đọc dữ liệu trước.'); return; }
    setBusy(true); setMessage(''); setErrorDetails([]);
    try {
      const localErrors = new Map<number, string[]>();
      const resolved = [...rows];
      const previewCodeCounts = new Map<string, number>();
      for (let index = 0; index < resolved.length; index += 1) {
        let row = resolved[index];
        if (!row.tu_dong_cap_ma) continue;
        const rule = rules.find((item) => item.ma_quy_tac === row.ma_quy_tac) || inferRule(row.ten_hang, rules);
        if (!rule) {
          localErrors.set(index, ['Tên hàng chưa khớp quy ước cấp mã. Hãy bổ sung tên đúng quy tắc nhận diện.']);
          continue;
        }
        row = { ...row, ma_quy_tac: rule.ma_quy_tac, loai_hinh: rule.can_loai_hinh ? (row.loai_hinh || inferShape(row.ten_hang)) : '' };
        resolved[index] = row;
        if (rule.can_loai_hinh && !row.loai_hinh) {
          localErrors.set(index, ['Tên hàng chưa thể hiện loại hình (Ống, Vuông, Chữ U, Chữ V hoặc Hộp).']);
          continue;
        }
        try {
          const result = await duKienMaVatTu({ ma_quy_tac: rule.ma_quy_tac, ten_hang: row.ten_hang, loai_hinh: row.loai_hinh || undefined });
          if (result.can_bo_sung) {
            localErrors.set(index, ['Tên hàng chưa khớp Quy tắc nhận diện vật liệu; hãy bổ sung từ khóa nhận diện trong Dữ liệu công ty.']);
            continue;
          }
          const seen = previewCodeCounts.get(result.ma_du_kien) || 0;
          previewCodeCounts.set(result.ma_du_kien, seen + 1);
          resolved[index] = { ...row, ma_du_kien: nextPreviewCode(result.ma_du_kien, seen), ma_vat_lieu: result.ma_vat_lieu || '' };
        } catch (reason) { localErrors.set(index, [reason instanceof Error ? reason.message : 'Không tạo được mã dự kiến.']); }
      }
      const eligibleIndexes = resolved.map((_, index) => index).filter((index) => !localErrors.has(index));
      const checked = eligibleIndexes.length
        ? await xemTruocNhapVatTu(eligibleIndexes.map((index) => toPayload(resolved[index], resolved[index].tu_dong_cap_ma ? resolved[index].ma_du_kien : resolved[index].ma_vat_tu)))
        : null;
      const checkedByOriginal = new Map(eligibleIndexes.map((originalIndex, checkedIndex) => [originalIndex, checked?.chi_tiet[checkedIndex]]));
      const details = resolved.map((_, index) => {
        const errors = localErrors.get(index);
        if (errors) return { dong: index + 1, hop_le: false, loi: errors, canh_bao_trung: [] };
        const result = checkedByOriginal.get(index);
        return result ? { ...result, dong: index + 1 } : { dong: index + 1, hop_le: false, loi: ['Không kiểm tra được dòng dữ liệu.'], canh_bao_trung: [] };
      });
      setRows(resolved);
      setPreview({ tong_so: resolved.length, hop_le: details.filter((item) => item.hop_le).length,
        co_loi: details.filter((item) => !item.hop_le).length,
        co_canh_bao: details.filter((item) => item.canh_bao_trung.length > 0).length,
        chi_tiet: details, ma_xac_nhan: checked?.ma_xac_nhan || '' });
    } catch (reason) {
      const value = reason instanceof Error ? reason.message : 'Không kiểm tra được dữ liệu.';
      setMessage(value); onError(value);
    } finally { setBusy(false); }
  }

  async function save() {
    if (!preview) { setMessage('Hãy xem trước và kiểm tra dữ liệu trước khi nhập.'); return; }
    setBusy(true); setMessage(''); setErrorDetails([]);
    try {
      const failed = new Set(preview.chi_tiet.filter((item) => !item.hop_le).map((item) => item.dong - 1));
      const errors: ErrorDetail[] = preview.chi_tiet.filter((item) => !item.hop_le).map((item) => ({
        dong: item.dong, ma: rows[item.dong - 1]?.ma_vat_tu || '', loi: item.loi.join('; ') }));
      const candidates: Array<{ originalIndex: number; payload: DongNhapVatTu }> = [];
      for (let index = 0; index < rows.length; index += 1) {
        if (failed.has(index)) continue;
        const row = rows[index];
        try {
          const code = row.tu_dong_cap_ma
            ? (await capMaVatTu({ ma_quy_tac: row.ma_quy_tac, ma_vat_lieu: row.ma_vat_lieu || undefined, loai_hinh: row.loai_hinh || undefined })).ma_vat_tu
            : row.ma_vat_tu;
          candidates.push({ originalIndex: index, payload: toPayload(row, code) });
        } catch (reason) {
          failed.add(index);
          errors.push({ dong: index + 1, ma: row.ma_du_kien || row.ma_vat_tu,
            loi: reason instanceof Error ? reason.message : 'Không cấp được mã vật tư.' });
        }
      }
      let imported = 0;
      if (candidates.length) {
        const result = await nhapVatTuHangLoatTungDong(candidates.map((item) => item.payload));
        imported = result.so_dong;
        result.errors.forEach((error) => {
          const candidate = candidates[error.dong - 1];
          if (!candidate) return;
          failed.add(candidate.originalIndex);
          errors.push({ dong: candidate.originalIndex + 1, ma: error.ma, loi: error.loi });
        });
      }
      const retained = rows.filter((_, index) => failed.has(index));
      setErrorDetails(errors.sort((a, b) => a.dong - b.dong));
      setRows(retained);
      setText(retained.map((row) => [row.ma_vat_tu, row.ten_hang, row.dvt, row.quy_cach || '', row.ghi_chu || ''].join('\t')).join('\n'));
      setPreview(null);
      if (retained.length) setMessage(`Đã thêm ${imported} vật tư hợp lệ; giữ lại ${retained.length} dòng lỗi để sửa và nhập lại.`);
      onImported(imported, retained.length > 0);
    } catch (reason) {
      const value = reason instanceof Error ? reason.message : 'Không nhập được danh mục vật tư.';
      setMessage(value); onError(value);
    } finally { setBusy(false); }
  }

  return <div className="fixed inset-0 z-[80] bg-black/45 flex items-center justify-center p-3">
    <div className="bg-white w-full max-w-6xl max-h-[92vh] overflow-hidden rounded shadow-xl flex flex-col">
      <header className="p-4 border-b border-[#DCE1EC] flex items-center justify-between">
        <div><h2 className="font-bold text-[16px]">THÊM HÀNG LOẠT VẬT TƯ TỪ EXCEL</h2><p className="text-[12px] text-[#59627A] mt-1">Sao chép các cột từ Excel theo đúng thứ tự rồi dán vào bên dưới.</p></div>
        <button onClick={onClose} disabled={busy} aria-label="Đóng" className="min-w-11 min-h-11 disabled:opacity-50"><span className="material-symbols-outlined">close</span></button>
      </header>
      <div className="p-4 overflow-y-auto space-y-4">
        <div className="p-3 bg-[#EEF0F9] border border-[#C6CCE9] text-[12px]"><strong>Thứ tự cột:</strong> Mã vật tư · Tên hàng * · Đơn vị tính * · Mô tả / Quy cách · Ghi chú. Mỗi lần nhập tối đa 500 dòng.<span className="block mt-1 text-[#59627A]"><strong>Mã vật tư không bắt buộc:</strong> để trống ô đầu tiên hoặc chỉ dán Tên hàng, hệ thống sẽ tự đối chiếu quy ước để lập mã. Tên hàng phải chứa thông tin nhận diện theo quy tắc đã khai báo.</span></div>
        {message && <div role="alert" className="p-3 bg-[#FDECEE] border-l-4 border-[#EE202E] text-[#C4141F] text-[12px]">{message}{errorDetails.length > 0 && <ul className="list-disc pl-5 mt-2">{errorDetails.map((error, index) => <li key={`${error.dong}-${error.ma}-${index}`}>Dòng {error.dong} — {error.ma || '(tự động cấp mã)'}: {error.loi}</li>)}</ul>}</div>}
        <textarea value={text} onChange={(event) => setText(event.target.value)} rows={6} className="w-full p-3 border border-[#DCE1EC] rounded font-mono text-[12px]" placeholder={'\tBulong M8 x 30\tCAI\tInox 304\tGhi chú'} />
        <div className="flex gap-2"><button onClick={parse} disabled={busy} className="min-h-11 px-5 border border-[#283A97] text-[#283A97] font-bold rounded disabled:opacity-50">ĐỌC DỮ LIỆU</button><button onClick={() => void check()} disabled={!rows.length || busy} className="min-h-11 px-5 bg-[#283A97] text-white font-bold rounded disabled:opacity-50">{busy ? 'ĐANG KIỂM TRA…' : 'XEM TRƯỚC & KIỂM TRA'}</button></div>
        {preview && <div className={`p-3 border text-[12px] ${preview.co_loi ? 'bg-[#FDECEE] border-[#F9B9BE] text-[#C4141F]' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>Hợp lệ: <strong>{preview.hop_le}/{preview.tong_so}</strong> · Lỗi: <strong>{preview.co_loi}</strong> · Cảnh báo: <strong>{preview.co_canh_bao}</strong></div>}
        {rows.length > 0 && <div className="overflow-x-auto border border-[#DCE1EC] rounded"><table className="w-full min-w-[1100px] text-[12px]">
          <thead className="bg-[#F4F6FA]"><tr><th className="p-2 text-left">MÃ VẬT TƯ</th><th className="p-2 text-left">TÊN HÀNG *</th><th className="p-2 text-left">ĐƠN VỊ TÍNH *</th><th className="p-2 text-left">MÔ TẢ / QUY CÁCH</th><th className="p-2 text-left">GHI CHÚ</th><th className="p-2 text-left">KẾT QUẢ</th><th className="w-14" /></tr></thead>
          <tbody>{rows.map((row, index) => {
            const result = preview?.chi_tiet[index];
            return <tr key={row.id} className="border-t align-top">
              <td className="p-1"><div className="flex items-center gap-1"><input value={row.tu_dong_cap_ma ? row.ma_du_kien : row.ma_vat_tu} onChange={(event) => { const value = event.target.value.toUpperCase(); update(row.id, { ma_vat_tu: value, tu_dong_cap_ma: !value, ma_quy_tac: value ? '' : row.ma_quy_tac }); }} placeholder="Tự động cấp" className="w-40 h-10 px-2 border rounded font-mono" /><button type="button" onClick={() => openCodeModal(row)} title="Thêm thông tin lập mã vật tư" aria-label="Thêm thông tin lập mã vật tư" className="w-10 h-10 shrink-0 rounded bg-[#283A97] text-white flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">add</span></button></div><div className="mt-1 text-[10px] text-[#59627A]">{row.tu_dong_cap_ma ? 'Tự động theo quy tắc' : 'Mã nhập từ Excel'}</div></td>
              <td className="p-1"><input value={row.ten_hang} onChange={(event) => { const name = event.target.value; const inferred = row.tu_dong_cap_ma ? inferRule(name, rules) : undefined; update(row.id, { ten_hang: name, ma_quy_tac: row.tu_dong_cap_ma ? (inferred?.ma_quy_tac || '') : row.ma_quy_tac, loai_hinh: inferred?.can_loai_hinh ? inferShape(name) : '' }); }} className="w-64 h-10 px-2 border rounded" /></td>
              <td className="p-1"><input value={row.dvt} onChange={(event) => update(row.id, { dvt: event.target.value.toUpperCase() })} className="w-28 h-10 px-2 border rounded" /></td>
              <td className="p-1"><input value={row.quy_cach} onChange={(event) => update(row.id, { quy_cach: event.target.value })} className="w-56 h-10 px-2 border rounded" /></td>
              <td className="p-1"><input value={row.ghi_chu} onChange={(event) => update(row.id, { ghi_chu: event.target.value })} className="w-48 h-10 px-2 border rounded" /></td>
              <td className={`p-2 w-64 ${result?.hop_le ? 'text-emerald-700' : 'text-[#C4141F]'}`}>{result ? (result.hop_le ? (result.canh_bao_trung.length ? 'Có cảnh báo trùng gần' : 'Hợp lệ') : result.loi.join('; ')) : 'Chưa kiểm tra'}</td>
              <td className="p-1"><button onClick={() => { setRows((current) => current.filter((item) => item.id !== row.id)); setPreview(null); }} aria-label="Xóa dòng" className="min-w-10 min-h-10 text-[#EE202E]"><span className="material-symbols-outlined">delete</span></button></td>
            </tr>;
          })}</tbody>
        </table></div>}
      </div>
      <footer className="p-4 border-t border-[#DCE1EC] flex justify-end gap-2"><button onClick={onClose} disabled={busy} className="min-h-11 px-5 border border-[#DCE1EC] font-bold rounded disabled:opacity-50">HỦY</button><button onClick={() => void save()} disabled={busy || !preview || preview.hop_le === 0} className="min-h-11 px-5 bg-[#283A97] text-white font-bold rounded disabled:opacity-50">{busy ? 'ĐANG LƯU…' : `NHẬP ${preview?.hop_le ?? rows.length} VẬT TƯ HỢP LỆ`}</button></footer>
    </div>
    {codeModal && (() => {
      const row = rows.find((item) => item.id === codeModal.rowId);
      const selectedRule = rules.find((rule) => rule.ma_quy_tac === codeModal.ma_quy_tac);
      const pattern = selectedRule?.mau_ma.replace('{MVL}', '[vật liệu]').replace('{LOAI_HINH}', codeModal.loai_hinh || '[loại hình]').replace('{STT}', '[tự cấp]');
      return <div className="fixed inset-0 z-[90] bg-black/35 flex items-center justify-center p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !codeModalBusy) setCodeModal(null); }}>
        <div className="bg-white w-full max-w-lg rounded-lg shadow-2xl overflow-hidden">
          <header className="px-5 py-4 border-b border-[#DCE1EC] flex items-center justify-between"><div><h3 className="font-bold text-[15px]">THÔNG TIN LẬP MÃ VẬT TƯ</h3><p className="text-[12px] text-[#59627A] mt-1 truncate max-w-sm">{row?.ten_hang || 'Chưa có tên hàng'}</p></div><button type="button" disabled={codeModalBusy} onClick={() => setCodeModal(null)} className="w-10 h-10"><span className="material-symbols-outlined">close</span></button></header>
          <div className="p-5 space-y-4">
            {codeModalError && <div role="alert" className="p-3 bg-[#FDECEE] border-l-4 border-[#EE202E] text-[#C4141F] text-[12px]">{codeModalError}</div>}
            <div className="grid sm:grid-cols-2 gap-3 p-4 bg-[#F4F6FA] border border-[#DCE1EC] rounded-lg">
              <label className="text-[11px] font-bold">LOẠI VẬT TƯ, HÀNG HOÁ *<select value={codeModal.kho} onChange={(event) => setCodeModal({ ...codeModal, kho: event.target.value as CodeModalState['kho'], ma_quy_tac: '', loai_hinh: '' })} className="mt-1 w-full h-11 px-3 border rounded bg-white font-normal"><option value="TH">Vật tư tiêu hao (TH)</option><option value="VT">Nguyên vật liệu (VT)</option><option value="TL">Tools, dụng cụ (TL)</option></select></label>
              <label className="text-[11px] font-bold">QUY ƯỚC CẤP MÃ *<select value={codeModal.ma_quy_tac} onChange={(event) => { const rule = rules.find((item) => item.ma_quy_tac === event.target.value); setCodeModal({ ...codeModal, ma_quy_tac: event.target.value, loai_hinh: rule?.can_loai_hinh ? inferShape(row?.ten_hang || '') : '' }); }} className="mt-1 w-full h-11 px-3 border rounded bg-white font-normal"><option value="">-- Chọn quy ước --</option>{rules.filter((rule) => rule.kho === codeModal.kho).map((rule) => <option key={rule.ma_quy_tac} value={rule.ma_quy_tac}>{rule.ten_nhom}</option>)}</select></label>
              {selectedRule?.can_loai_hinh && <label className="text-[11px] font-bold sm:col-span-2">LOẠI HÌNH *<select value={codeModal.loai_hinh} onChange={(event) => setCodeModal({ ...codeModal, loai_hinh: event.target.value })} className="mt-1 w-full h-11 px-3 border rounded bg-white font-normal"><option value="">-- Chọn loại hình --</option><option value="ON">ON — Ống</option><option value="VU">VU — Vuông</option><option value="CU">CU — Chữ U</option><option value="CV">CV — Chữ V</option><option value="HO">HO — Hộp</option></select></label>}
              <div className="sm:col-span-2 p-3 bg-[#E9ECFA] rounded flex items-center justify-between gap-3"><span className="text-[11px] font-bold text-[#59627A]">MÃ DỰ KIẾN</span><strong className="font-mono text-[14px] text-[#283A97] text-right">{pattern || '[chọn quy ước cấp mã]'}</strong></div>
            </div>
          </div>
          <footer className="px-5 py-4 border-t border-[#DCE1EC] flex justify-end gap-2"><button type="button" disabled={codeModalBusy} onClick={() => setCodeModal(null)} className="min-h-11 px-5 border rounded font-bold">HỦY</button><button type="button" disabled={codeModalBusy || !codeModal.ma_quy_tac} onClick={() => void applyCodeInfo()} className="min-h-11 px-5 bg-[#283A97] text-white rounded font-bold disabled:opacity-50">{codeModalBusy ? 'ĐANG LẬP MÃ…' : 'ÁP DỤNG'}</button></footer>
        </div>
      </div>;
    })()}
  </div>;
}
