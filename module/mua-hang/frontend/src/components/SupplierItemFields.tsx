import { TaoMatHangNcc } from '../api/client';

export const QUALITY = [
  ['ON_DINH', 'Ổn định'], ['DAO_DONG', 'Dao động'],
  ['HAY_LOI', 'Hay lỗi'], ['CHUA_DANH_GIA', 'Chưa đánh giá'],
] as const;

export function SupplierItemFields({ form, onChange, processes }: {
  form: TaoMatHangNcc; onChange: (form: TaoMatHangNcc) => void;
  processes: Array<{ ma: string; ten: string }>;
}) {
  const numeric = [
    ['diem_ky_thuat', 'Điểm kỹ thuật', 10, '0.01'],
    ['diem_chat_luong', 'Điểm chất lượng', 10, '0.01'],
    ['nang_luc_thang', 'Năng lực tháng (theo ĐVT)', undefined, '0.0001'],
    ['so_ngay_giao_chuan', 'Số ngày làm việc giao chuẩn', undefined, '1'],
  ] as const;
  return <div className="grid sm:grid-cols-2 gap-3">
    {form.loai === 'GIA_CONG' && <label className="text-sm">CÔNG ĐOẠN
      <select value={form.ma_cong_doan || ''} onChange={(e) => onChange({ ...form, ma_cong_doan: e.target.value || null })} className="block mt-1 w-full h-11 border rounded px-3 bg-white">
        <option value="">Chưa chọn</option>{processes.map((p) => <option key={p.ma} value={p.ma}>{p.ten}</option>)}
      </select>{processes.length === 0 && <small>Danh mục công đoạn chưa có dữ liệu.</small>}
    </label>}
    <label className="text-sm">MỨC CHẤT LƯỢNG
      <select value={form.muc_chat_luong || ''} onChange={(e) => onChange({ ...form, muc_chat_luong: e.target.value || null })} className="block mt-1 w-full h-11 border rounded px-3 bg-white">
        <option value="">Chưa ghi nhận</option>{QUALITY.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
      </select>
    </label>
    {numeric.map(([key, name, max, step]) => <label key={key} className="text-sm">{name.toUpperCase()}
      <input type="number" min="0" max={max} step={step} value={form[key] ?? ''}
        onChange={(e) => onChange({ ...form, [key]: e.target.value === '' ? null : Number(e.target.value) })}
        className="block mt-1 w-full h-11 border rounded px-3" />
    </label>)}
  </div>;
}
