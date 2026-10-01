import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  capNhatPhanQuyenV3, layPhanQuyenV3,
  LoaiTaiKhoanQuanTri, QuyenLoaiTaiKhoan,
} from '../api/client';

const LABELS: Record<string, string> = {
  home: 'Tổng quan', de_nghi: 'Đề nghị', bao_gia: 'Báo giá',
  don_hang: 'Đặt hàng', giao_nhan: 'Giao nhận', thanh_toan: 'Thanh toán',
  dat_ngoai: 'Đặt ngoài', ncc: 'Nhà cung cấp', danh_muc: 'Dữ liệu gốc',
  quan_tri: 'Phân quyền', cong_viec: 'Việc của tôi', tro_chuyen: 'Trò chuyện',
  hop_thu: 'Hộp thư', su_co: 'Báo cáo sự cố', tien_ich: 'Tiện ích',
  bao_cao: 'Báo cáo', xac_nhan_kt: 'Xác nhận kỹ thuật',
};

const SCOPE: Array<[QuyenLoaiTaiKhoan['pham_vi_xem'], string]> = [
  ['toan_bo', 'Toàn công ty'], ['bo_phan', 'Bộ phận'], ['ca_nhan', 'Cá nhân'],
];

export function PermissionManagementV3Panel({ canEdit, onNotify }: {
  canEdit: boolean; onNotify: (message: string) => void;
}) {
  const [types, setTypes] = useState<LoaiTaiKhoanQuanTri[]>([]);
  const [selected, setSelected] = useState('');
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await layPhanQuyenV3();
      setTypes(result.items); setReady(result.san_sang);
      setSelected((current) => current || result.items[0]?.ma || '');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không tải được ma trận phân quyền.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const current = types.find((item) => item.ma === selected);
  const permissions = useMemo(() => [...(current?.quyen || [])].sort((a, b) =>
    (LABELS[a.trang] || a.trang).localeCompare(LABELS[b.trang] || b.trang, 'vi')),
  [current]);

  function patch(page: string, changes: Partial<QuyenLoaiTaiKhoan>) {
    setTypes((previous) => previous.map((item) => item.ma === selected ? {
      ...item, quyen: item.quyen.map((row) => row.trang === page ? { ...row, ...changes } : row),
    } : item));
  }

  async function save(row: QuyenLoaiTaiKhoan) {
    setSaving(row.trang); setError('');
    try {
      const result = await capNhatPhanQuyenV3(row);
      patch(row.trang, result);
      onNotify(`Đã lưu quyền ${LABELS[row.trang] || row.trang} cho ${current?.ten}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không lưu được quyền.');
    } finally { setSaving(''); }
  }

  return <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
    <aside className="rounded border bg-white p-3">
      <h2 className="mb-3 text-sm font-bold">7 LOẠI TÀI KHOẢN</h2>
      <div className="space-y-1">{types.map((item) =>
        <button key={item.ma} type="button" onClick={() => setSelected(item.ma)}
          className={`w-full rounded px-3 py-3 text-left text-sm ${selected === item.ma ? 'bg-[#283A97] text-white' : 'hover:bg-[#F4F6FA]'}`}>
          <strong>{item.ten}</strong><span className="block text-xs opacity-75">{item.so_tai_khoan} tài khoản đang áp dụng</span>
        </button>)}</div>
    </aside>
    <section className="min-w-0 rounded border bg-white p-4">
      {error && <div role="alert" className="mb-3 rounded bg-red-50 p-3 text-red-700">{error}</div>}
      {loading ? <p>Đang tải phân quyền…</p> : !ready ?
        <p>Ma trận 7 loại tài khoản chưa được cài đặt. Cần chạy migration 065 sau khi triển khai backend tương ứng.</p> : <>
          <p className="mb-3 rounded bg-amber-50 p-3 text-xs text-amber-900">Ma trận v3 đang ở giai đoạn đối soát. Quyền đang chạy vẫn đọc ma trận vai trò cũ.</p>
          <h2 className="text-base font-bold">{current?.ten}</h2>
          <p className="mb-3 text-xs text-[#59627A]">{current?.mo_ta} · Loại này có {current?.so_tai_khoan || 0} tài khoản; ma trận mới chưa có hiệu lực.</p>
          <div className="overflow-x-auto"><table className="w-full min-w-[980px] border-collapse text-xs">
            <thead className="bg-[#F4F6FA]"><tr>{['MÀN HÌNH', 'XEM', 'PHẠM VI XEM', 'SỬA', 'PHẠM VI SỬA', 'KIỂU SỬA', 'AI DUYỆT', ''].map((head) =>
              <th key={head} className="border p-2 text-left">{head}</th>)}</tr></thead>
            <tbody>{permissions.map((row) => <tr key={row.trang}>
              <td className="border p-2 font-semibold">{LABELS[row.trang] || row.trang}</td>
              <td className="border p-2"><input type="checkbox" checked={row.duoc_xem} disabled={!canEdit || saving === row.trang} onChange={(event) => patch(row.trang, { duoc_xem: event.target.checked })} aria-label={`Xem ${row.trang}`} /></td>
              <td className="border p-2"><select value={row.pham_vi_xem} disabled={!canEdit || !row.duoc_xem || saving === row.trang} onChange={(event) => patch(row.trang, { pham_vi_xem: event.target.value as QuyenLoaiTaiKhoan['pham_vi_xem'] })} className="h-9 border bg-white">{SCOPE.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td>
              <td className="border p-2"><input type="checkbox" checked={row.duoc_sua} disabled={!canEdit || saving === row.trang} onChange={(event) => patch(row.trang, { duoc_sua: event.target.checked, duoc_xem: event.target.checked ? true : row.duoc_xem, kieu_sua: event.target.checked ? row.kieu_sua : 'THANG', loai_tai_khoan_duyet: event.target.checked ? row.loai_tai_khoan_duyet : [] })} aria-label={`Sửa ${row.trang}`} /></td>
              <td className="border p-2"><select value={row.pham_vi_sua} disabled={!canEdit || !row.duoc_sua || saving === row.trang} onChange={(event) => patch(row.trang, { pham_vi_sua: event.target.value as QuyenLoaiTaiKhoan['pham_vi_sua'] })} className="h-9 border bg-white">{SCOPE.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td>
              <td className="border p-2"><select value={row.kieu_sua} disabled={!canEdit || !row.duoc_sua || saving === row.trang} onChange={(event) => patch(row.trang, { kieu_sua: event.target.value as QuyenLoaiTaiKhoan['kieu_sua'], loai_tai_khoan_duyet: event.target.value === 'THANG' ? [] : row.loai_tai_khoan_duyet })} className="h-9 border bg-white"><option value="THANG">Sửa thẳng</option><option value="CAN_DUYET">Cần duyệt</option></select></td>
              <td className="border p-2">{row.kieu_sua === 'CAN_DUYET' && row.duoc_sua && <select value={row.loai_tai_khoan_duyet[0] || ''} disabled={!canEdit || saving === row.trang} onChange={(event) => patch(row.trang, { loai_tai_khoan_duyet: event.target.value ? [event.target.value] : [] })} className="h-9 border bg-white"><option value="">Chọn người duyệt</option>{types.map((item) => <option key={item.ma} value={item.ma}>{item.ten}</option>)}</select>}</td>
              <td className="border p-2"><button type="button" disabled={!canEdit || saving === row.trang} onClick={() => void save(row)} className="h-9 rounded bg-[#283A97] px-3 font-bold text-white disabled:opacity-40">LƯU</button></td>
            </tr>)}</tbody>
          </table></div>
        </>}
    </section>
  </div>;
}
