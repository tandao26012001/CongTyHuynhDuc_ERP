import { FormEvent, useEffect, useState } from 'react';
import { DiemNhapNcc, DiemNcc, duyetDanhGiaMatHangNcc, layDanhGiaMatHangNcc,
  layMatHangNcc, layNguonDiemNcc, MatHangNcc, NguonDiemNcc,
  NhaCungCapQuanLy, taoDanhGiaMatHangNcc } from '../api/client';

const CRITERIA = [
  { key: 'diem_chat_luong', name: 'Chất lượng sản phẩm', max: 10, factor: 2, auto: true },
  { key: 'diem_giao_hang', name: 'Thời gian giao hàng', max: 10, factor: 2, auto: true },
  { key: 'diem_gia_ca', name: 'Giá cả', max: 10, factor: 2, auto: false },
  { key: 'diem_tam_voc', name: 'Tầm vóc', max: 10, factor: 1, auto: false },
  { key: 'diem_thanh_toan', name: 'Thanh toán', max: 10, factor: 1, auto: false },
  { key: 'diem_dich_vu', name: 'Dịch vụ khách hàng', max: 10, factor: 1, auto: false },
  { key: 'diem_thoi_gian_hop_tac', name: 'Thời gian hợp tác', max: 5, factor: 1, auto: true },
  { key: 'diem_gia_tri_giao_dich', name: 'Giá trị giao dịch', max: 5, factor: 1, auto: true },
] as const;
const RANKS: Record<string, string> = { KHONG_CHON: 'Không chọn', DU_PHONG: 'Dự phòng',
  TIEU_CHUAN: 'Tiêu chuẩn', CHINH_YEU: 'Chính yếu', CHIEN_LUOC: 'Chiến lược' };
const INITIAL: DiemNhapNcc = { diem_gia_ca: 0, diem_tam_voc: 0, diem_thanh_toan: 0, diem_dich_vu: 0 };

export function SupplierEvaluationPanel({ supplier, canEdit, canApprove, onNotify }: {
  supplier: NhaCungCapQuanLy | null;
  canEdit: boolean;
  canApprove: boolean;
  onNotify: (message: string) => void;
}) {
  const [items, setItems] = useState<MatHangNcc[]>([]);
  const [itemId, setItemId] = useState('');
  const [source, setSource] = useState<NguonDiemNcc | null>(null);
  const [history, setHistory] = useState<DiemNcc[]>([]);
  const [form, setForm] = useState<DiemNhapNcc>(INITIAL);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setItemId(''); setSource(null); setHistory([]);
    layMatHangNcc(supplier?.ma).then((rows) => setItems(rows.filter((row) => row.trang_thai === 'DA_DUYET')))
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Không tải được mặt hàng.'));
  }, [supplier?.ma]);

  async function load(id: string) {
    setItemId(id); setSource(null); setHistory([]); setError('');
    if (!id) return;
    try {
      const [nextSource, nextHistory] = await Promise.all([
        canEdit ? layNguonDiemNcc(id) : Promise.resolve(null), layDanhGiaMatHangNcc(id),
      ]);
      setSource(nextSource); setHistory(nextHistory);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được đánh giá.'); }
  }

  async function save(event: FormEvent) {
    event.preventDefault(); if (!itemId) return;
    setBusy(true); setError('');
    try {
      await taoDanhGiaMatHangNcc(itemId, form);
      setForm(INITIAL); await load(itemId); onNotify('Đã lưu bảng điểm, chờ Trưởng bộ phận Mua hàng duyệt.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không lưu được bảng điểm.'); }
    finally { setBusy(false); }
  }

  async function approve(score: DiemNcc) {
    setBusy(true); setError('');
    try { await duyetDanhGiaMatHangNcc(score); await load(itemId); onNotify('Đã duyệt bảng điểm BM06.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không duyệt được bảng điểm.'); }
    finally { setBusy(false); }
  }

  const auto = source?.diem_xem_truoc;
  return <section className="bg-white border border-[#DCE1EC] rounded p-4 space-y-4">
    <h2 className="font-bold">ĐÁNH GIÁ THEO MẶT HÀNG · BM06</h2>
    <label className="block text-sm">Mặt hàng của NCC
      <select value={itemId} onChange={(event) => void load(event.target.value)} className="block mt-1 h-11 w-full border rounded px-3 bg-white">
        <option value="">Chọn mặt hàng đã duyệt</option>
        {items.map((item) => <option key={item.id} value={item.id}>{item.ten_ncc} · {item.ten_hang} {item.ma_vat_tu ? `(${item.ma_vat_tu})` : ''}</option>)}
      </select>
    </label>
    {error && <p role="alert" className="p-3 rounded bg-[#FDECEE] text-[#C4141F]">{error}</p>}
    {itemId && <>{source && <div className="p-3 bg-[#F4F6FA] rounded text-sm"><strong>{source.ten_ncc} · {source.ten_hang}</strong><p>{source.so_lan_giao} lần giao · {source.so_lan_iqc} lần kiểm IQC. Điểm sẽ tính trên {auto?.trong_so_du_lieu ?? 0}% hệ số có dữ liệu.</p></div>}
      {source &&
      <form onSubmit={(event) => void save(event)} className="space-y-3">
        <div className="overflow-x-auto border rounded"><table className="w-full min-w-[720px] text-sm"><thead className="bg-[#F4F6FA]"><tr>{['STT', 'TIÊU CHÍ', 'ĐIỂM TỐI ĐA', 'HỆ SỐ', 'ĐIỂM ĐÁNH GIÁ', 'TỔNG ĐIỂM'].map((label) => <th key={label} className="p-2 text-left">{label}</th>)}</tr></thead><tbody>{CRITERIA.map((criterion, index) => {
          const key = criterion.key;
          const value = criterion.auto ? auto?.[key] : form[key as keyof DiemNhapNcc];
          return <tr key={key} className="border-t"><td className="p-2">{index + 1}</td><td className="p-2">{criterion.name}{criterion.auto && <small className="block text-[#59627A]">{auto?.giai_thich_tu_dong[key]}</small>}</td><td className="p-2">{criterion.max}</td><td className="p-2">{criterion.factor}</td><td className="p-2">{criterion.auto ? <span>{value ?? 'Chưa đủ dữ liệu'}</span> : <input aria-label={`Điểm ${criterion.name}`} type="number" min="0" max="10" step="0.01" required value={value ?? 0} onChange={(event) => setForm({ ...form, [key]: Number(event.target.value) })} className="w-24 h-10 border rounded px-2" />}</td><td className="p-2">{typeof value === 'number' ? (value * criterion.factor).toFixed(2) : '—'}</td></tr>;
        })}</tbody></table></div>
        {canEdit && <div className="flex flex-wrap gap-3 items-end"><label className="text-sm flex-1">Ghi chú<input value={form.ghi_chu || ''} onChange={(event) => setForm({ ...form, ghi_chu: event.target.value })} className="block mt-1 w-full h-11 border rounded px-3" /></label><button disabled={busy} className="h-11 px-4 rounded bg-[#283A97] text-white font-bold">LƯU BẢNG ĐIỂM</button></div>}
      </form>}
      <div className="space-y-2"><h3 className="font-bold">LỊCH SỬ ĐÁNH GIÁ</h3>{history.length === 0 ? <p className="text-sm text-[#59627A]">Chưa có bảng điểm.</p> : history.map((score) => <div key={score.id} className="border rounded p-3 flex flex-wrap items-center justify-between gap-2 text-sm"><span>{score.ngay_danh_gia} · <strong>{score.diem_tong}/100</strong> · {RANKS[score.xep_loai] || score.xep_loai} · {score.trong_so_du_lieu}% dữ liệu · {score.trang_thai_duyet === 'DA_DUYET' ? 'Đã duyệt' : 'Chờ duyệt'}</span>{canApprove && score.trang_thai_duyet === 'CHO_DUYET' && <button type="button" disabled={busy} onClick={() => void approve(score)} className="h-10 px-3 border border-[#283A97] rounded text-[#283A97] font-bold">DUYỆT</button>}</div>)}</div>
    </>}
  </section>;
}
