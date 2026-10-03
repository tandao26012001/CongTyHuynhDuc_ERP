import React, { useEffect, useState } from 'react';
import { NavigationTab } from '../types';
import { coTheNhanThongBaoKyThuat, api, chuyenTrangThaiDatNgoai, HoSo, layHangDoiKyThuatDatNgoai, layPhieuDatNgoai, PhieuDatNgoai } from '../api/client';

const outsourceStatuses: Record<string, string> = {
  CHO_XAC_NHAN_KY_THUAT: 'Chờ xác nhận kỹ thuật', DANG_BAO_GIA: 'Đang xử lý / báo giá',
  CHO_DUYET: 'Chờ duyệt', DA_DUYET: 'Đã duyệt', DA_DAT: 'Đã đặt',
  DA_NHAN: 'Đã nhận', HOAN_THANH: 'Hoàn thành', HUY: 'Đã hủy',
};

interface MyTasksViewProps {
  onNavigate: (tab: NavigationTab) => void;
  onNotify: (msg: string) => void;
  onTasksCountChange?: (count: number) => void;
  currentUser: HoSo;
}
interface DeNghi {
  id: string; loai: string; trang_thai: string; phien_ban: number;
  ten_bo_phan?: string; ma_bo_phan: string; ten_nguoi_yeu_cau?: string;
  nguoi_yeu_cau: string; ngay_hieu_luc: string; so_dong: number;
  ghi_chu?: string | null; ly_do_tra_lai?: string | null;
}
interface Page { items: DeNghi[]; tong: number; kich_thuoc: number }
interface Detail {
  de_nghi: DeNghi;
  dong: { id: string; ten_hang_chup: string; ma_vat_tu?: string; so_luong: number; dvt_chup: string; ky_han_yc: string }[];
  lich_su: { id: string; tu_trang_thai: string | null; sang_trang_thai: string; thoi_diem: string; ghi_chu?: string; ten_nguoi_thuc_hien?: string; nguoi_thuc_hien: string }[];
}
const statuses: Record<string, string> = { CHO_DUYET: 'Chờ duyệt', TRA_LAI: 'Trả lại', DA_DUYET: 'Đã duyệt', CHO_KY_BU: 'Chờ ký bù', NHAP: 'Nháp', HUY: 'Đã hủy' };
const dateText = (value: string) => value ? new Date(value).toLocaleDateString('vi-VN') : '—';
async function allPages(path: string): Promise<DeNghi[]> {
  const rows: DeNghi[] = [];
  for (let page = 1; ; page++) {
    const result = await api<Page>(path + (path.includes('?') ? '&' : '?') + 'trang=' + page + '&kich_thuoc=100');
    rows.push(...result.items);
    if (rows.length >= result.tong || !result.items.length) return rows;
  }
}

export const MyTasksView: React.FC<MyTasksViewProps> = ({ onNavigate, onNotify, onTasksCountChange, currentUser }) => {
  const [queues, setQueues] = useState<{ pending: DeNghi[]; supplement: DeNghi[]; history: DeNghi[] }>({ pending: [], supplement: [], history: [] });
  const [technicalQueue, setTechnicalQueue] = useState<PhieuDatNgoai[]>([]);
  const [outsourceApprovalQueue, setOutsourceApprovalQueue] = useState<PhieuDatNgoai[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [outsourceHistoryQueue, setOutsourceHistoryQueue] = useState<PhieuDatNgoai[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'supplement' | 'history'>('pending');
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [type, setType] = useState('');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [outsourceDetail, setOutsourceDetail] = useState<PhieuDatNgoai | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [rejecting, setRejecting] = useState<DeNghi | null>(null);
  const [rejectingOutsource, setRejectingOutsource] = useState<PhieuDatNgoai | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const canView = currentUser.quyen?.de_nghi?.xem === true;
  const canApprove = currentUser.quyen?.de_nghi?.duyet === true;
  const canViewTechnical = coTheNhanThongBaoKyThuat(currentUser);
  const canApproveOutsource = currentUser.quyen?.dat_ngoai?.duyet === true;
  const canViewOutsource = currentUser.quyen?.dat_ngoai?.xem === true;

  useEffect(() => {
    let active = true;
    setQueues({ pending: [], supplement: [], history: [] }); setTechnicalQueue([]); setOutsourceApprovalQueue([]); setOutsourceHistoryQueue([]);
    async function load(initial = false) {
      if (initial) setLoading(true);
      const results = await Promise.allSettled([
        canApprove ? allPages('/api/v1/de-nghi/cho-duyet') : Promise.resolve([]),
        canView ? allPages('/api/v1/de-nghi?trang_thai=TRA_LAI&nguoi_yeu_cau=' + encodeURIComponent(currentUser.ma_nhan_vien)) : Promise.resolve([]),
        canView ? allPages('/api/v1/de-nghi/da-xu-ly') : Promise.resolve([]),
        canViewTechnical ? layHangDoiKyThuatDatNgoai() : Promise.resolve([]),
        canViewOutsource ? layPhieuDatNgoai() : Promise.resolve([]),
      ]);
      if (!active) return;
      const names = ['chờ duyệt', 'cần bổ sung', 'lịch sử xử lý', 'kỹ thuật', 'đặt ngoài'];
      setErrors(results.flatMap((result, index) => result.status === 'rejected' ? ['Không tải được ' + names[index] + ': ' + (result.reason instanceof Error ? result.reason.message : 'Lỗi kết nối.')] : []));
      const [pending, supplement, history, technical, outsource] = results;
      const outsourcePending = outsource.status === 'fulfilled' && canApproveOutsource ? outsource.value.filter((item) => item.trang_thai === 'CHO_DUYET') : [];
      setQueues({ pending: pending.status === 'fulfilled' ? pending.value : [],
        supplement: supplement.status === 'fulfilled' ? supplement.value : [],
        history: history.status === 'fulfilled' ? history.value : [] });
      setTechnicalQueue(technical.status === 'fulfilled' ? technical.value : []);
      setOutsourceApprovalQueue(outsourcePending);
      setOutsourceHistoryQueue(outsource.status === 'fulfilled' ? outsource.value.filter((item) =>
        item.lich_su.some((entry) => entry.loai === 'PHIEU'
          && entry.nguoi_thuc_hien === currentUser.ma_nhan_vien
          && entry.trang_thai_cu === 'CHO_DUYET'
          && ['DA_DUYET', 'DANG_BAO_GIA'].includes(entry.trang_thai_moi))) : []);
      onTasksCountChange?.((pending.status === 'fulfilled' ? pending.value.length : 0) + (technical.status === 'fulfilled' ? technical.value.length : 0) + outsourcePending.length);
      setLoading(false);
    }
    void load(true);
    const timer = globalThis.setInterval(() => void load(), 30_000);
    return () => { active = false; globalThis.clearInterval(timer); };
  }, [currentUser.ma_tai_khoan, currentUser.ma_nhan_vien, canView, canApprove, canViewTechnical, canApproveOutsource, canViewOutsource, refresh]);

  async function approveOutsource(item: PhieuDatNgoai) {
    if (busy) return;
    setBusy(true);
    try {
      await chuyenTrangThaiDatNgoai(item, 'DA_DUYET');
      onNotify(`Đã duyệt phiếu đặt ngoài ${item.id}.`);
      setOutsourceDetail(null);
    } catch (error) {
      onNotify(error instanceof Error ? error.message : 'Không duyệt được phiếu đặt ngoài.');
    } finally {
      setBusy(false);
      setRefresh((value) => value + 1);
    }
  }

  async function returnOutsource(item: PhieuDatNgoai) {
    if (busy || !reason.trim()) return;
    setBusy(true);
    try {
      await chuyenTrangThaiDatNgoai(item, 'DANG_BAO_GIA', reason.trim());
      onNotify(`Đã trả lại phiếu đặt ngoài ${item.id} để xử lý báo giá.`);
      setRejectingOutsource(null); setOutsourceDetail(null); setReason('');
    } catch (error) {
      onNotify(error instanceof Error ? error.message : 'Không trả lại được phiếu đặt ngoài.');
    } finally {
      setBusy(false);
      setRefresh((value) => value + 1);
    }
  }

  async function openDetail(item: DeNghi) {
    setDetailLoading(true);
    try { setDetail(await api<Detail>('/api/v1/de-nghi/' + encodeURIComponent(item.id))); }
    catch (error) { onNotify(error instanceof Error ? error.message : 'Không tải được chi tiết.'); }
    finally { setDetailLoading(false); }
  }
  async function process(item: DeNghi, action: 'duyet' | 'tra-lai') {
    if (busy) return;
    if (action === 'tra-lai' && !reason.trim()) return;
    setBusy(true);
    try {
      const updated = await api<DeNghi>('/api/v1/de-nghi/' + encodeURIComponent(item.id) + '/' + action, {
        method: 'POST', body: JSON.stringify({ phien_ban: item.phien_ban, ...(action === 'tra-lai' ? { ly_do: reason.trim() } : { duyet_online: false }) }),
      });
      onNotify(action === 'tra-lai' ? 'Đã trả lại phiếu ' + item.id : 'Đã xử lý phiếu ' + item.id + ' · ' + (statuses[updated.trang_thai] || updated.trang_thai));
      setRejecting(null); setDetail(null); setRefresh((value) => value + 1);
    } catch (error) {
      onNotify(error instanceof Error ? error.message : 'Không lưu được thao tác.');
      setRefresh((value) => value + 1);
    } finally { setBusy(false); }
  }
  const departments = Array.from(new Map([
    ...Object.values(queues).flat().map((row): [string, string] => [row.ma_bo_phan, row.ten_bo_phan || row.ma_bo_phan]),
    ...((outsourceApprovalQueue.length || outsourceHistoryQueue.length) ? [['KD', 'Kinh doanh'] as [string, string]] : []),
  ]).entries());
  const filtered = queues[activeSubTab].filter((item) => (!department || item.ma_bo_phan === department) && (!type || item.loai === type)
    && [item.id, item.ten_bo_phan, item.ten_nguoi_yeu_cau, item.ghi_chu].join(' ').toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
  const outsourceRows = activeSubTab === 'pending' ? outsourceApprovalQueue : activeSubTab === 'history' ? outsourceHistoryQueue : [];
  const filteredOutsource = outsourceRows.filter((item) => (!department || department === 'KD') && (!type || type === 'DAT_NGOAI')
    && [item.id, item.lenh_san_xuat, item.ten_nguoi_lap, item.nguoi_lap, item.nha_cung_cap_tom_tat, item.ghi_chu].join(' ').toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
  const filteredCount = filtered.length + filteredOutsource.length;
  const tabCount = (key: 'pending' | 'supplement' | 'history') => queues[key].length + (key === 'pending' ? outsourceApprovalQueue.length : key === 'history' ? outsourceHistoryQueue.length : 0);
  const tabs = [{ key: 'pending' as const, label: 'Chờ tôi duyệt' }, { key: 'supplement' as const, label: 'Cần xử lý bổ sung' }, { key: 'history' as const, label: 'Đã xử lý' }];

  return <div className="space-y-5 pb-16">
    <div className="flex items-center justify-between"><h1 className="font-bold text-lg">VIỆC CỦA TÔI</h1><button type="button" disabled={loading || busy} onClick={() => setRefresh((value) => value + 1)} className="rounded border bg-white px-4 py-2">Tải lại</button></div>
    {errors.map((error) => <p key={error} role="alert" className="rounded border border-red-200 bg-white p-3 text-sm text-red-700">{error}</p>)}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{tabs.map((tab) => <button key={tab.key} type="button" onClick={() => setActiveSubTab(tab.key)} className="rounded border bg-white p-4 text-left"><span className="text-sm text-[#59627A]">{tab.label}</span><strong className="block text-3xl text-[#283A97]">{loading ? '—' : tabCount(tab.key)}</strong></button>)}</div>
    {canViewTechnical && <section className="overflow-hidden rounded border bg-white">
      <header className="flex items-center justify-between border-b bg-[#EEF0F9] p-4"><h2 className="font-bold">PHIẾU ĐẶT NGOÀI CHỜ KỸ THUẬT</h2><span>{loading ? '—' : technicalQueue.length} đang chờ</span></header>
      {loading ? <p className="p-4">Đang tải hàng đợi kỹ thuật…</p> : technicalQueue.length === 0 ? <p className="p-4 text-sm text-[#59627A]">{errors.some((error) => error.startsWith('Không tải được kỹ thuật')) ? 'Chưa tải được dữ liệu.' : 'Không có phiếu đang chờ xác nhận kỹ thuật.'}</p> : technicalQueue.map((item) => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div><strong className="font-mono text-[#283A97]">{item.id} · LSX {item.lenh_san_xuat}</strong><p className="mt-1 text-sm text-[#59627A]">{item.noi_dung_ky_thuat || 'Chờ xác nhận kỹ thuật'} · {item.dong.filter((line) => line.cho_xac_nhan_kt || (line.can_xac_nhan_ky_thuat && !line.da_xac_nhan_kt)).length} mã chờ xác nhận · Người lập: {item.ten_nguoi_lap || '—'}</p></div>
        <button type="button" onClick={() => onNavigate('outsource')} className="rounded bg-emerald-700 px-4 py-2 text-white">Mở đặt ngoài</button>
      </article>)}
    </section>}
    <section className="overflow-hidden rounded border bg-white">
      <div className="flex flex-wrap gap-2 border-b p-3">{tabs.map((tab) => <button key={tab.key} type="button" onClick={() => setActiveSubTab(tab.key)} className={'rounded px-4 py-2 text-sm font-bold ' + (activeSubTab === tab.key ? 'bg-[#283A97] text-white' : 'bg-[#F4F6FA]')}>{tab.label} ({loading ? '—' : tabCount(tab.key)})</button>)}</div>
      <div className="flex flex-wrap gap-2 border-b p-3">
        <input aria-label="Tìm công việc" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã phiếu, người yêu cầu, bộ phận…" className="min-w-60 flex-1 rounded border px-3 py-2 text-sm" />
        <select aria-label="Loại phiếu" value={type} onChange={(event) => setType(event.target.value)} className="rounded border p-2 text-sm"><option value="">Tất cả loại phiếu</option><option value="MUA_HANG">Mua hàng</option><option value="GIA_CONG_NGOAI">Gia công ngoài</option><option value="DAT_NGOAI">Đặt ngoài</option></select>
        <select aria-label="Bộ phận" value={department} onChange={(event) => setDepartment(event.target.value)} className="rounded border p-2 text-sm"><option value="">Tất cả bộ phận</option>{departments.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
      </div>
      {loading ? <p className="p-5">Đang tải công việc…</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-[#F4F6FA] text-left"><tr>{['Mã phiếu', 'Loại', 'Bộ phận / Người yêu cầu', 'Số dòng', 'Ngày lập / hiệu lực', 'Trạng thái', 'Thao tác'].map((label) => <th key={label} className="p-3">{label}</th>)}</tr></thead>
        <tbody>{filteredCount === 0 ? <tr><td colSpan={7} className="p-6 text-center text-[#59627A]">{errors.some((error) => error.startsWith('Không tải được ' + (activeSubTab === 'pending' ? 'chờ duyệt' : activeSubTab === 'supplement' ? 'cần bổ sung' : 'lịch sử xử lý')) || (activeSubTab !== 'supplement' && error.startsWith('Không tải được đặt ngoài'))) ? 'Chưa tải được dữ liệu. Hãy thử tải lại.' : 'Không có công việc phù hợp.'}</td></tr> : <>{filtered.map((item) => <tr key={'de-nghi-' + item.id} className="border-t">
          <td className="p-3"><button type="button" disabled={detailLoading} onClick={() => void openDetail(item)} className="font-mono font-bold text-[#283A97] underline">{item.id}</button>{item.ly_do_tra_lai && <p className="mt-1 text-xs text-orange-700">{item.ly_do_tra_lai}</p>}</td>
          <td className="p-3">{item.loai === 'MUA_HANG' ? 'Mua hàng' : item.loai === 'GIA_CONG_NGOAI' ? 'Gia công ngoài' : item.loai}</td>
          <td className="p-3">{item.ten_bo_phan || item.ma_bo_phan}<p className="text-xs text-[#59627A]">{item.ten_nguoi_yeu_cau || item.nguoi_yeu_cau}</p></td>
          <td className="p-3">{item.so_dong}</td><td className="p-3">{dateText(item.ngay_hieu_luc)}</td><td className="p-3">{statuses[item.trang_thai] || item.trang_thai}</td>
          <td className="p-3"><div className="flex gap-2"><button type="button" disabled={detailLoading || busy} onClick={() => void openDetail(item)} className="whitespace-nowrap rounded border px-3 py-2">Chi tiết</button>{activeSubTab === 'pending' && canApprove && <><button type="button" disabled={busy} onClick={() => void process(item, 'duyet')} className="rounded bg-[#283A97] px-3 py-2 text-white">Duyệt</button><button type="button" disabled={busy} onClick={() => { setRejecting(item); setReason(''); }} className="whitespace-nowrap rounded border px-3 py-2 text-red-700">Trả lại</button></>}{activeSubTab === 'supplement' && <button type="button" onClick={() => onNavigate('requests')} className="whitespace-nowrap rounded border px-3 py-2">Mở đề nghị</button>}</div></td>
        </tr>)}{filteredOutsource.map((item) => <tr key={'dat-ngoai-' + item.id} className="border-t">
          <td className="p-3"><button type="button" onClick={() => setOutsourceDetail(item)} className="font-mono font-bold text-[#283A97] underline">{item.id}</button><p className="text-xs text-[#59627A]">LSX {item.lenh_san_xuat}</p></td>
          <td className="p-3">Đặt ngoài</td>
          <td className="p-3">Kinh doanh<p className="text-xs text-[#59627A]">{item.ten_nguoi_lap || '—'}</p></td>
          <td className="p-3">{item.dong.length}</td><td className="p-3">{dateText(item.ngay_lap)}</td><td className="p-3">{outsourceStatuses[item.trang_thai] || item.trang_thai}</td>
          <td className="p-3"><div className="flex gap-2"><button type="button" onClick={() => setOutsourceDetail(item)} className="whitespace-nowrap rounded border px-3 py-2">Chi tiết</button>{activeSubTab === 'pending' && canApproveOutsource && item.trang_thai === 'CHO_DUYET' && <><button type="button" disabled={busy} onClick={() => void approveOutsource(item)} className="rounded bg-[#283A97] px-3 py-2 text-white disabled:opacity-50">Duyệt</button>{currentUser.quyen?.dat_ngoai?.sua && <button type="button" disabled={busy} onClick={() => { setRejectingOutsource(item); setReason(''); }} className="whitespace-nowrap rounded border px-3 py-2 text-red-700">Trả lại</button>}</>}</div></td>
        </tr>)}</>}</tbody></table></div>}
      <p className="border-t bg-[#F4F6FA] p-3 text-xs text-[#59627A]">Hiển thị {loading ? '—' : filteredCount} phiếu · Dữ liệu cập nhật mỗi 30 giây</p>
    </section>
    {detail && <div role="dialog" aria-modal="true" aria-labelledby="task-detail-title" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-3"><section className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded bg-white p-5">
      <header className="mb-4 flex items-center justify-between"><h2 id="task-detail-title" className="font-bold">ĐỀ NGHỊ {detail.de_nghi.id}</h2><button type="button" onClick={() => setDetail(null)} className="rounded border px-3 py-2">Đóng</button></header>
      <p className="mb-3 text-sm">{statuses[detail.de_nghi.trang_thai] || detail.de_nghi.trang_thai} · {detail.de_nghi.ten_bo_phan || detail.de_nghi.ma_bo_phan} · {detail.de_nghi.ten_nguoi_yeu_cau || detail.de_nghi.nguoi_yeu_cau}</p>
      {detail.de_nghi.ghi_chu && <p className="mb-3 whitespace-pre-wrap text-sm">{detail.de_nghi.ghi_chu}</p>}
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-[#F4F6FA] text-left"><tr>{['Mã vật tư', 'Tên hàng', 'Số lượng', 'ĐVT', 'Kỳ hạn yêu cầu'].map((label) => <th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{detail.dong.map((line) => <tr key={line.id} className="border-t"><td className="p-2">{line.ma_vat_tu || '—'}</td><td className="p-2">{line.ten_hang_chup}</td><td className="p-2">{line.so_luong}</td><td className="p-2">{line.dvt_chup}</td><td className="p-2">{dateText(line.ky_han_yc)}</td></tr>)}</tbody></table></div>
      <h3 className="mt-5 font-bold">LỊCH SỬ XỬ LÝ</h3>{detail.lich_su.length === 0 ? <p className="mt-2 text-sm">Chưa có lịch sử xử lý.</p> : detail.lich_su.map((entry) => <article key={entry.id} className="mt-2 border-t pt-2 text-sm"><time>{new Date(entry.thoi_diem).toLocaleString('vi-VN')}</time> · {entry.ten_nguoi_thuc_hien || entry.nguoi_thuc_hien}<p>{entry.tu_trang_thai ? (statuses[entry.tu_trang_thai] || entry.tu_trang_thai) + ' → ' : ''}{statuses[entry.sang_trang_thai] || entry.sang_trang_thai}</p><p className="whitespace-pre-wrap">{entry.ghi_chu}</p></article>)}
    </section></div>}
    {outsourceDetail && <div role="dialog" aria-modal="true" aria-labelledby="outsource-task-detail-title" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-3"><section className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded bg-white p-5">
      <header className="mb-4 flex items-center justify-between gap-3"><h2 id="outsource-task-detail-title" className="font-bold">PHIẾU ĐẶT NGOÀI {outsourceDetail.id}</h2><button type="button" onClick={() => setOutsourceDetail(null)} className="rounded border px-3 py-2">Đóng</button></header>
      <p className="mb-3 text-sm">LSX {outsourceDetail.lenh_san_xuat} · Người lập: {outsourceDetail.ten_nguoi_lap || '—'} · Ngày lập: {dateText(outsourceDetail.ngay_lap)} · Hạn trả: {dateText(outsourceDetail.ky_han || '')}</p>
      <p className="mb-3 text-sm">Nhà cung cấp: {outsourceDetail.nha_cung_cap_tom_tat || 'Theo từng mã hàng'} · Tổng giá trị: <strong>{Number(outsourceDetail.tong_gia_tri || 0).toLocaleString('vi-VN')} đ</strong></p>
      <p className="mb-3 text-sm">Trạng thái: {outsourceStatuses[outsourceDetail.trang_thai] || outsourceDetail.trang_thai}</p>
      {outsourceDetail.ghi_chu && <p className="mb-3 whitespace-pre-wrap text-sm">{outsourceDetail.ghi_chu}</p>}
      <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="bg-[#F4F6FA] text-left"><tr>{['Mã hàng', 'Tên hàng / Gia công', 'Số lượng', 'Nhà cung cấp', 'Đơn giá', 'Hạn trả'].map((label) => <th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{outsourceDetail.dong.map((line) => <tr key={line.id} className="border-t"><td className="p-2 font-mono">{line.ma_hang}</td><td className="p-2">{line.ten_hang}{line.noi_dung_gia_cong && <p className="text-xs text-[#59627A]">{line.noi_dung_gia_cong}</p>}</td><td className="p-2">{Number(line.so_luong).toLocaleString('vi-VN')} {line.dvt}</td><td className="p-2">{line.ten_ncc_chup || '—'}</td><td className="p-2">{line.don_gia == null ? '—' : Number(line.don_gia).toLocaleString('vi-VN') + ' đ'}</td><td className="p-2">{dateText(line.ky_han || '')}</td></tr>)}</tbody></table></div>
      <h3 className="mt-5 font-bold">LỊCH SỬ XỬ LÝ</h3>
      {outsourceDetail.lich_su.filter((entry) => entry.loai === 'PHIEU').map((entry, index) => <article key={index} className="mt-2 border-t pt-2 text-sm">
        <time>{new Date(entry.thoi_diem).toLocaleString('vi-VN')}</time> · {entry.ten_nguoi_thuc_hien || '—'}
        <p>{entry.trang_thai_cu ? (outsourceStatuses[entry.trang_thai_cu] || entry.trang_thai_cu) + ' → ' : ''}{outsourceStatuses[entry.trang_thai_moi] || entry.trang_thai_moi}</p>
        <p className="whitespace-pre-wrap">{entry.noi_dung}</p>
      </article>)}
      {activeSubTab === 'pending' && canApproveOutsource && outsourceDetail.trang_thai === 'CHO_DUYET' && <div className="mt-5 flex justify-end gap-2"><button type="button" disabled={busy} onClick={() => void approveOutsource(outsourceDetail)} className="rounded bg-[#283A97] px-4 py-2 text-white disabled:opacity-50">Duyệt</button>{currentUser.quyen?.dat_ngoai?.sua && <button type="button" disabled={busy} onClick={() => { setRejectingOutsource(outsourceDetail); setReason(''); }} className="rounded border px-4 py-2 text-red-700">Trả lại</button>}</div>}
    </section></div>}
    {rejecting && <div role="dialog" aria-modal="true" aria-labelledby="task-return-title" className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 p-3"><section className="w-full max-w-lg rounded bg-white p-5"><h2 id="task-return-title" className="font-bold">TRẢ LẠI {rejecting.id}</h2><label className="mt-4 block text-sm">Lý do trả lại<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} className="mt-2 w-full rounded border p-3" /></label><div className="mt-4 flex justify-end gap-2"><button type="button" disabled={busy} onClick={() => setRejecting(null)} className="rounded border px-4 py-2">Hủy</button><button type="button" disabled={busy || !reason.trim()} onClick={() => void process(rejecting, 'tra-lai')} className="rounded bg-red-700 px-4 py-2 text-white disabled:opacity-50">{busy ? 'Đang lưu…' : 'Xác nhận trả lại'}</button></div></section></div>}
    {rejectingOutsource && <div role="dialog" aria-modal="true" aria-labelledby="outsource-task-return-title" className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 p-3"><section className="w-full max-w-lg rounded bg-white p-5"><h2 id="outsource-task-return-title" className="font-bold">TRẢ LẠI PHIẾU ĐẶT NGOÀI {rejectingOutsource.id}</h2><label className="mt-4 block text-sm">Lý do trả lại để xử lý báo giá<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} className="mt-2 w-full rounded border p-3" /></label><div className="mt-4 flex justify-end gap-2"><button type="button" disabled={busy} onClick={() => setRejectingOutsource(null)} className="rounded border px-4 py-2">Hủy</button><button type="button" disabled={busy || !reason.trim()} onClick={() => void returnOutsource(rejectingOutsource)} className="rounded bg-red-700 px-4 py-2 text-white disabled:opacity-50">{busy ? 'Đang lưu…' : 'Xác nhận trả lại'}</button></div></section></div>}
  </div>;
};
