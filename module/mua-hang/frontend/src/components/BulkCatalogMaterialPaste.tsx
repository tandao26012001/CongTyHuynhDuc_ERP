import { useEffect, useState } from 'react';
import {
  capMaVatTuHangLoat, DongNhapVatTu, DonViTinh, duKienMaVatTu, duKienMaVatTuHangLoat, KetQuaXemTruocNhapVatTu,
  layDonViTinh, layQuyTacMaVatTu, layQuyTacNhanDien, nhapVatTuHangLoatTungDong,
  QuyTacMaVatTu, QuyTacNhanDien, xemTruocNhapVatTu,
} from '../api/client';
import { confirmDeleteRows, RowSelectionActions, SelectionCheckbox, useRowSelection } from './RowSelection';

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
function resolveUnit(value: string, units: DonViTinh[]) {
  const raw = value.trim();
  if (!raw) return undefined;
  const exactCode = units.find((unit) => unit.dvt.toUpperCase() === raw.toUpperCase());
  if (exactCode) return exactCode;
  const key = normalize(raw);
  const matches = units.filter((unit) => normalize(unit.ten_dvt) === key || normalize(unit.dvt) === key);
  return matches.length === 1 ? matches[0] : undefined;
}
function hasTerm(value: string, term: string) { return ` ${value} `.includes(` ${term} `); }
function inferRule(name: string, rules: QuyTacMaVatTu[], recognitionRules: QuyTacNhanDien[]) {
  const normalizedName = normalize(name);
  const ranked = rules.map((rule) => {
    const terms = [normalize(rule.ten_nhom), ...(RULE_ALIASES[rule.ma_quy_tac] || [])].filter((term) => term.length >= 3);
    return { rule, score: Math.max(0, ...terms.filter((term) => hasTerm(normalizedName, term)).map((term) => term.length)) };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
  if (ranked.length && (!ranked[1] || ranked[0].score !== ranked[1].score)) return ranked[0].rule;

  // Tên dạng cây như ống/vuông cần biết nguyên cây hay lẻ cây,
  // không tự suy từ mã ví dụ của vật liệu tấm.
  if (inferShape(name)) return undefined;
  const recognized = recognitionRules
    .filter((item) => item.loai === 'VAT_LIEU' && item.vi_du_ma_vat_tu)
    .map((item) => {
      const aliases = item.tu_khoa.split(/[/()\n]+/)
        .map((alias) => normalize(alias).replace(/\s+CHUNG$/, '').trim())
        .filter(Boolean);
      return { item, score: Math.max(0, ...aliases.filter((alias) => hasTerm(normalizedName, alias)).map((alias) => alias.length)) };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.item.uu_tien - a.item.uu_tien || b.score - a.score)[0]?.item;
  if (!recognized?.vi_du_ma_vat_tu) return undefined;
  return [...rules]
    .sort((a, b) => b.ma_quy_tac.length - a.ma_quy_tac.length)
    .find((rule) => recognized.vi_du_ma_vat_tu === rule.ma_quy_tac
      || recognized.vi_du_ma_vat_tu?.startsWith(`${rule.ma_quy_tac}-`));
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
  const [recognitionRules, setRecognitionRules] = useState<QuyTacNhanDien[]>([]);
  const [units, setUnits] = useState<DonViTinh[]>([]);
  const [loadingReferences, setLoadingReferences] = useState(true);
  const [preview, setPreview] = useState<KetQuaXemTruocNhapVatTu | null>(null);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorDetails, setErrorDetails] = useState<ErrorDetail[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [codeModal, setCodeModal] = useState<CodeModalState | null>(null);
  const [codeModalBusy, setCodeModalBusy] = useState(false);
  const [codeModalError, setCodeModalError] = useState('');
  const selection = useRowSelection(rows.map((row) => row.id));
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const visibleRows = rows.slice(pageStart, pageStart + pageSize)
    .map((row, offset) => ({ row, index: pageStart + offset }));

  function deleteRows(ids: Set<string>) {
    if (!ids.size || !confirmDeleteRows(ids.size)) return;
    setRows((current) => current.filter((row) => !ids.has(row.id)));
    setPreview(null); setErrorDetails([]); selection.clearSelection();
  }

  useEffect(() => {
    void Promise.all([layQuyTacMaVatTu(), layQuyTacNhanDien(), layDonViTinh()]).then(([loadedRules, loadedRecognitionRules, loadedUnits]) => {
      setRules(loadedRules);
      setRecognitionRules(loadedRecognitionRules);
      setUnits(loadedUnits);
      setLoadingReferences(false);
    }).catch((reason) => {
      const value = reason instanceof Error ? reason.message : 'Không tải được quy tắc cấp mã hoặc danh mục đơn vị tính.';
      setLoadingReferences(false);
      setMessage(value); onError(value);
    });
  }, [onError]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  async function parse() {
    const sourceLines = text.split(/\r?\n/).filter((line) => line.trim().length > 0).slice(0, 500);
    const parsed = sourceLines.flatMap((line, index) => {
      let cells = line.split('\t').map((cell) => cell.trim());
      const header = normalize(cells.join(' '));
      if (index === 0 && (header.includes('MA VAT TU') || header.includes('TEN HANG'))) return [];
      // Giữ tab rỗng đầu dòng. Nếu chỉ dán tên hoặc bỏ cột mã, cột đầu là Tên hàng.
      if (cells.length === 1 || (cells[0] && !looksLikeMaterialCode(cells[0]))) cells = ['', ...cells];
      const name = cells[1] || '';
      const pastedUnit = cells[2] || '';
      const resolvedUnit = resolveUnit(pastedUnit, units);
      const inferred = !cells[0] ? inferRule(name, rules, recognitionRules) : undefined;
      return [{ id: `material-${Date.now()}-${index}`, ma_vat_tu: (cells[0] || '').toUpperCase(), ten_hang: name,
        dvt: resolvedUnit?.dvt || pastedUnit.toUpperCase(), quy_cach: cells[3] || '', ghi_chu: cells[4] || '',
        phan_loai: 'THONG_DUNG_SX', trang_thai: 'HOAT_DONG', tu_dong_cap_ma: !cells[0],
        ma_quy_tac: inferred?.ma_quy_tac || '', ma_vat_lieu: '',
        loai_hinh: inferred?.can_loai_hinh ? inferShape(name) : '', ma_du_kien: '' }];
    });
    setRows(parsed); setPage(1); setPreview(null); setErrorDetails([]);
    if (!parsed.length) {
      setMessage('Không đọc được dòng dữ liệu nào từ nội dung đã dán.');
      return;
    }

    // Lập mã dự kiến cho cả danh sách bằng một request để danh sách lớn không
    // phải mở hàng trăm kết nối API/DB riêng lẻ.
    setBusy(true); setReading(true); setMessage('');
    const resolved = [...parsed];
    try {
      const candidateIndexes: number[] = [];
      resolved.forEach((row, index) => {
        if (!row.tu_dong_cap_ma || !row.ma_quy_tac) return;
        const rule = rules.find((item) => item.ma_quy_tac === row.ma_quy_tac);
        if (!rule || (rule.can_loai_hinh && !row.loai_hinh)) {
          resolved[index] = { ...row, ma_quy_tac: '', ma_du_kien: '' };
          return;
        }
        candidateIndexes.push(index);
      });
      if (candidateIndexes.length) {
        const results = await duKienMaVatTuHangLoat(candidateIndexes.map((index) => ({
          ma_quy_tac: resolved[index].ma_quy_tac,
          ten_hang: resolved[index].ten_hang,
          loai_hinh: resolved[index].loai_hinh || undefined,
        })));
        results.forEach((result, resultIndex) => {
          const index = candidateIndexes[resultIndex];
          const row = resolved[index];
          if (!row) return;
          if (result.loi || result.can_bo_sung) {
            resolved[index] = { ...row, ma_quy_tac: '', ma_vat_lieu: '', ma_du_kien: '' };
            return;
          }
          resolved[index] = { ...row, ma_vat_lieu: result.ma_vat_lieu || '', ma_du_kien: result.ma_du_kien };
        });
      }
      setRows(resolved);
    } catch (reason) {
      const value = reason instanceof Error ? reason.message : 'Không lập được mã dự kiến.';
      setMessage(value); onError(value);
    } finally {
      setReading(false); setBusy(false);
    }
  }

  function update(id: string, patch: Partial<Row>) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch, ma_du_kien: '' } : row));
    setPreview(null); setErrorDetails([]);
  }

  function openCodeModal(row: Row) {
    const inferred = rules.find((rule) => rule.ma_quy_tac === row.ma_quy_tac) || inferRule(row.ten_hang, rules, recognitionRules);
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
      const candidateIndexes: number[] = [];
      for (let index = 0; index < resolved.length; index += 1) {
        let row = resolved[index];
        if (!units.some((unit) => unit.dvt === row.dvt)) {
          localErrors.set(index, [`Đơn vị tính "${row.dvt || '(trống)'}" không có trong danh mục ĐVT. Hãy chọn lại từ danh sách.`]);
          continue;
        }
        if (!row.tu_dong_cap_ma) continue;
        const rule = rules.find((item) => item.ma_quy_tac === row.ma_quy_tac) || inferRule(row.ten_hang, rules, recognitionRules);
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
        candidateIndexes.push(index);
      }
      if (candidateIndexes.length) {
        const results = await duKienMaVatTuHangLoat(candidateIndexes.map((index) => ({
          ma_quy_tac: resolved[index].ma_quy_tac,
          ten_hang: resolved[index].ten_hang,
          loai_hinh: resolved[index].loai_hinh || undefined,
        })));
        results.forEach((result, resultIndex) => {
          const index = candidateIndexes[resultIndex];
          const row = resolved[index];
          if (!row) return;
          if (result.loi) {
            localErrors.set(index, [result.loi]);
          } else if (result.can_bo_sung) {
            localErrors.set(index, ['Tên hàng chưa khớp Quy tắc nhận diện vật liệu; hãy bổ sung từ khóa nhận diện trong Dữ liệu công ty.']);
          } else {
            resolved[index] = { ...row, ma_du_kien: result.ma_du_kien, ma_vat_lieu: result.ma_vat_lieu || '' };
          }
        });
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
      const autoIndexes = rows.map((row, index) => ({ row, index }))
        .filter(({ row, index }) => row.tu_dong_cap_ma && !failed.has(index));
      const allocatedCodes = new Map<number, string>();
      if (autoIndexes.length) {
        const allocated = await capMaVatTuHangLoat(autoIndexes.map(({ row }) => ({
          ma_quy_tac: row.ma_quy_tac,
          ma_vat_lieu: row.ma_vat_lieu || undefined,
          loai_hinh: row.loai_hinh || undefined,
        })));
        allocated.forEach((item, index) => allocatedCodes.set(autoIndexes[index].index, item.ma_vat_tu));
      }
      for (let index = 0; index < rows.length; index += 1) {
        if (failed.has(index)) continue;
        const row = rows[index];
        try {
          const code = row.tu_dong_cap_ma
            ? allocatedCodes.get(index)
            : row.ma_vat_tu;
          if (!code) throw new Error('Không cấp được mã vật tư.');
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
      setPage(1);
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
        <div className="p-3 bg-[#EEF0F9] border border-[#C6CCE9] text-[12px]"><strong>Thứ tự cột:</strong> Mã vật tư · Tên hàng * · Đơn vị tính * · Mô tả / Quy cách · Ghi chú. Mỗi lần nhập tối đa 500 dòng.<span className="block mt-1 text-[#59627A]"><strong>Mã vật tư không bắt buộc:</strong> để trống ô đầu tiên hoặc chỉ dán Tên hàng, hệ thống sẽ tự đối chiếu quy tắc nhận diện và mã ví dụ để lập mã. Chỉ tên mới chưa khớp quy tắc mới hiện nút chọn quy ước thủ công.</span><span className="block mt-1 text-[#59627A]"><strong>Đơn vị tính:</strong> có thể dán mã hoặc tên trong danh mục; ví dụ <strong>CAI</strong> hoặc <strong>Cái</strong> đều được quy đổi về mã <strong>CAI</strong>.</span></div>
        {message && <div role="alert" className="p-3 bg-[#FDECEE] border-l-4 border-[#EE202E] text-[#C4141F] text-[12px]">{message}{errorDetails.length > 0 && <ul className="list-disc pl-5 mt-2">{errorDetails.map((error, index) => <li key={`${error.dong}-${error.ma}-${index}`}>Dòng {error.dong} — {error.ma || '(tự động cấp mã)'}: {error.loi}</li>)}</ul>}</div>}
        <textarea value={text} onChange={(event) => setText(event.target.value)} rows={6} className="w-full p-3 border border-[#DCE1EC] rounded font-mono text-[12px]" placeholder={'\tBulong M8 x 30\tCAI\tInox 304\tGhi chú'} />
        <div className="flex gap-2"><button onClick={() => void parse()} disabled={busy || loadingReferences} className="min-h-11 px-5 border border-[#283A97] text-[#283A97] font-bold rounded disabled:opacity-50">{loadingReferences ? 'ĐANG TẢI QUY TẮC…' : reading ? 'ĐANG LẬP MÃ DỰ KIẾN…' : 'ĐỌC DỮ LIỆU'}</button><button onClick={() => void check()} disabled={!rows.length || busy || loadingReferences} className="min-h-11 px-5 bg-[#283A97] text-white font-bold rounded disabled:opacity-50">{busy && !reading ? 'ĐANG KIỂM TRA…' : 'XEM TRƯỚC & KIỂM TRA'}</button></div>
        {preview && <div className={`p-3 border text-[12px] ${preview.co_loi ? 'bg-[#FDECEE] border-[#F9B9BE] text-[#C4141F]' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>Hợp lệ: <strong>{preview.hop_le}/{preview.tong_so}</strong> · Lỗi: <strong>{preview.co_loi}</strong> · Cảnh báo: <strong>{preview.co_canh_bao}</strong></div>}
        <RowSelectionActions total={rows.length} selectedCount={selection.selectedCount} allSelected={selection.allSelected} onToggleAll={selection.toggleAll} onDeleteSelected={() => deleteRows(selection.selected)} onDeleteAll={() => deleteRows(new Set(rows.map((row) => row.id)))} disabled={busy} />
        {rows.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 text-[12px]">
          <span className="text-[#59627A]">Hiển thị <strong>{pageStart + 1}–{Math.min(pageStart + pageSize, rows.length)}</strong> / {rows.length} dòng</span>
          <div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2">Số dòng/trang<select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="h-10 px-2 border border-[#DCE1EC] rounded bg-white"><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label><button type="button" onClick={() => setPage(1)} disabled={currentPage === 1} className="min-w-10 h-10 border rounded disabled:opacity-40" aria-label="Trang đầu"><span className="material-symbols-outlined">first_page</span></button><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} className="min-w-10 h-10 border rounded disabled:opacity-40" aria-label="Trang trước"><span className="material-symbols-outlined">chevron_left</span></button><strong className="min-w-24 text-center">Trang {currentPage}/{totalPages}</strong><button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages} className="min-w-10 h-10 border rounded disabled:opacity-40" aria-label="Trang sau"><span className="material-symbols-outlined">chevron_right</span></button><button type="button" onClick={() => setPage(totalPages)} disabled={currentPage === totalPages} className="min-w-10 h-10 border rounded disabled:opacity-40" aria-label="Trang cuối"><span className="material-symbols-outlined">last_page</span></button></div>
        </div>}
        {rows.length > 0 && <div className="overflow-x-auto border border-[#DCE1EC] rounded"><table className="w-full min-w-[1160px] text-[12px]">
          <thead className="bg-[#F4F6FA]"><tr><th className="p-2 w-10 text-center"><SelectionCheckbox checked={selection.allSelected} onChange={selection.toggleAll} label="Chọn tất cả dòng vật tư" /></th><th className="p-2 text-left">MÃ VẬT TƯ</th><th className="p-2 text-left">TÊN HÀNG *</th><th className="p-2 text-left">ĐƠN VỊ TÍNH *</th><th className="p-2 text-left">MÔ TẢ / QUY CÁCH</th><th className="p-2 text-left">GHI CHÚ</th><th className="p-2 text-left">KẾT QUẢ</th><th className="w-14" /></tr></thead>
          <tbody>{visibleRows.map(({ row, index }) => {
            const result = preview?.chi_tiet[index];
            const validUnit = units.some((unit) => unit.dvt === row.dvt);
            return <tr key={row.id} className={`border-t align-top ${selection.selected.has(row.id) ? 'bg-[#EEF0F9]' : ''}`}>
              <td className="p-2 text-center"><SelectionCheckbox checked={selection.selected.has(row.id)} onChange={() => selection.toggle(row.id)} label={`Chọn dòng ${row.ten_hang || row.id}`} /></td>
              <td className="p-1"><div className="flex items-center gap-1"><input readOnly={row.tu_dong_cap_ma} value={row.tu_dong_cap_ma ? row.ma_du_kien : row.ma_vat_tu} onChange={(event) => { const value = event.target.value.toUpperCase(); update(row.id, { ma_vat_tu: value, tu_dong_cap_ma: !value, ma_quy_tac: value ? '' : row.ma_quy_tac }); }} placeholder={row.ma_quy_tac ? 'Đang chờ lập mã' : 'Chưa nhận diện'} className={`w-40 h-10 px-2 border rounded font-mono ${row.tu_dong_cap_ma ? 'bg-[#F4F6FA]' : 'bg-white'}`} />{row.tu_dong_cap_ma && !row.ma_quy_tac && <button type="button" onClick={() => openCodeModal(row)} title="Chọn quy ước cấp mã" aria-label="Chọn quy ước cấp mã" className="w-10 h-10 shrink-0 rounded bg-[#283A97] text-white flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">add</span></button>}</div><div className={`mt-1 text-[10px] ${row.tu_dong_cap_ma && !row.ma_quy_tac ? 'text-[#C4141F]' : 'text-[#59627A]'}`}>{row.tu_dong_cap_ma ? (row.ma_quy_tac ? `Tự nhận diện: ${row.ma_quy_tac}` : 'Tên mới — hãy chọn quy ước') : 'Mã nhập từ Excel'}</div></td>
              <td className="p-1"><input value={row.ten_hang} onChange={(event) => { const name = event.target.value; const inferred = row.tu_dong_cap_ma ? inferRule(name, rules, recognitionRules) : undefined; update(row.id, { ten_hang: name, ma_quy_tac: row.tu_dong_cap_ma ? (inferred?.ma_quy_tac || '') : row.ma_quy_tac, loai_hinh: inferred?.can_loai_hinh ? inferShape(name) : '' }); }} className="w-64 h-10 px-2 border rounded" /></td>
              <td className="p-1"><select required value={validUnit ? row.dvt : ''} onChange={(event) => update(row.id, { dvt: event.target.value })} aria-label={`Đơn vị tính của ${row.ten_hang || `dòng ${index + 1}`}`} className={`w-40 h-10 px-2 border rounded bg-white ${validUnit ? 'border-[#DCE1EC]' : 'border-[#EE202E] bg-[#FDECEE]'}`}><option value="">-- Chọn ĐVT --</option>{units.map((unit) => <option key={unit.dvt} value={unit.dvt}>{unit.ten_dvt} ({unit.dvt})</option>)}</select>{row.dvt && !validUnit && <p className="mt-1 text-[10px] text-[#C4141F]">Giá trị dán: {row.dvt}</p>}</td>
              <td className="p-1"><input value={row.quy_cach} onChange={(event) => update(row.id, { quy_cach: event.target.value })} className="w-56 h-10 px-2 border rounded" /></td>
              <td className="p-1"><input value={row.ghi_chu} onChange={(event) => update(row.id, { ghi_chu: event.target.value })} className="w-48 h-10 px-2 border rounded" /></td>
              <td className={`p-2 w-64 ${result?.hop_le ? 'text-emerald-700' : 'text-[#C4141F]'}`}>{result ? (result.hop_le ? (result.canh_bao_trung.length ? 'Có cảnh báo trùng gần' : 'Hợp lệ') : result.loi.join('; ')) : 'Chưa kiểm tra'}</td>
              <td className="p-1"><button type="button" onClick={() => deleteRows(new Set([row.id]))} aria-label="Xóa dòng" className="min-w-10 min-h-10 text-[#EE202E]"><span className="material-symbols-outlined">delete</span></button></td>
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
