import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  capNhatPhanQuyen, duyetTaiKhoan, HoSo, khoaTaiKhoan, layTaiKhoanQuanTri,
  layVaiTroVaPhanQuyen, QuyenVaiTro, TaiKhoanQuanTri, VaiTroQuanTri,
} from '../api/client';

const PAGE_LABELS: Record<string, string> = {
  home: 'Tổng quan', de_nghi: 'Đề nghị', xac_nhan_kt: 'Xác nhận kỹ thuật',
  bao_gia: 'Báo giá', don_hang: 'Đơn hàng', cong_viec: 'Giao việc',
  giao_nhan: 'Giao nhận', dat_ngoai: 'Đặt ngoài', dieu_xe: 'Điều xe',
  thanh_toan: 'Thanh toán', ncc: 'Nhà cung cấp', danh_muc: 'Dữ liệu gốc',
  bao_cao: 'Báo cáo', tien_ich: 'Tiện ích', quan_tri: 'Quản trị hệ thống',
};

const STATUS_LABELS: Record<string, string> = {
  CHO_DUYET: 'Chờ duyệt', HOAT_DONG: 'Hoạt động', KHOA: 'Đã khóa',
};

function displayDateTime(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function Pagination({ total, page, pageSize, onPage }: { total: number; page: number; pageSize: number; onPage: (page: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return <div className="flex flex-wrap items-center justify-between gap-3 text-[12px]"><span className="text-[#59627A]">Tổng <strong>{total}</strong> tài khoản</span><div className="flex items-center gap-2"><button type="button" onClick={() => onPage(Math.max(1, page - 1))} disabled={page <= 1} className="h-10 px-3 border rounded disabled:opacity-40">TRƯỚC</button><strong>Trang {Math.min(page, totalPages)}/{totalPages}</strong><button type="button" onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="h-10 px-3 border rounded disabled:opacity-40">SAU</button></div></div>;
}

export function AccountManagementPanel({ currentUser, canEdit, onNotify }: { currentUser: HoSo; canEdit: boolean; onNotify: (message: string) => void }) {
  const [items, setItems] = useState<TaiKhoanQuanTri[]>([]);
  const [roles, setRoles] = useState<VaiTroQuanTri[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [queryDraft, setQueryDraft] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [accounts, roleData] = await Promise.all([
        layTaiKhoanQuanTri(page, pageSize, query, status), layVaiTroVaPhanQuyen(),
      ]);
      setItems(accounts.items); setTotal(accounts.tong); setRoles(roleData.items);
      setSelectedRoles(Object.fromEntries(accounts.items.map((item) => [item.ma_tai_khoan, item.vai_tro || ''])));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không tải được danh sách tài khoản.');
    } finally { setLoading(false); }
  }, [page, pageSize, query, status]);

  useEffect(() => { void load(); }, [load]);

  async function saveRole(account: TaiKhoanQuanTri) {
    const role = selectedRoles[account.ma_tai_khoan];
    if (!role) { setError('Hãy chọn vai trò trước khi kích hoạt tài khoản.'); return; }
    setSaving(account.ma_tai_khoan); setError('');
    try {
      await duyetTaiKhoan(account.ma_tai_khoan, role, account.phien_ban);
      onNotify(`Đã kích hoạt và gán vai trò cho ${account.ma_tai_khoan}.`);
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không cập nhật được tài khoản.'); }
    finally { setSaving(''); }
  }

  async function lock(account: TaiKhoanQuanTri) {
    if (!globalThis.confirm(`Khóa tài khoản ${account.ma_tai_khoan}? Các phiên đăng nhập sẽ bị thu hồi.`)) return;
    setSaving(account.ma_tai_khoan); setError('');
    try {
      await khoaTaiKhoan(account.ma_tai_khoan, account.phien_ban);
      onNotify(`Đã khóa tài khoản ${account.ma_tai_khoan}.`);
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không khóa được tài khoản.'); }
    finally { setSaving(''); }
  }

  function submitFilter(event: FormEvent) {
    event.preventDefault(); setPage(1); setQuery(queryDraft.trim());
  }

  return <div className="space-y-4">
    <form onSubmit={submitFilter} className="bg-white border rounded p-4 grid md:grid-cols-[1fr_220px_auto] gap-3">
      <label className="text-[11px] font-bold">TỪ KHÓA<input value={queryDraft} onChange={(event) => setQueryDraft(event.target.value)} className="mt-1 w-full h-11 px-3 border rounded font-normal" placeholder="Tên đăng nhập, nhân viên, bộ phận…" /></label>
      <label className="text-[11px] font-bold">TRẠNG THÁI<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="mt-1 w-full h-11 px-3 border rounded bg-white font-normal"><option value="">Tất cả</option><option value="CHO_DUYET">Chờ duyệt</option><option value="HOAT_DONG">Hoạt động</option><option value="KHOA">Đã khóa</option></select></label>
      <button disabled={loading} className="min-h-11 self-end px-5 bg-[#283A97] text-white rounded font-bold disabled:opacity-40">TÌM</button>
    </form>
    {error && <div role="alert" className="p-3 bg-[#FDECEE] border-l-4 border-[#EE202E] text-[#C4141F] text-[12px]">{error}</div>}
    <section className="bg-white border rounded p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3"><Pagination total={total} page={page} pageSize={pageSize} onPage={setPage} /><label className="text-[12px]">Số dòng/trang <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="ml-2 h-10 px-2 border rounded bg-white"><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label></div>
      {loading ? <div className="py-10 text-center text-[#59627A]">Đang tải tài khoản…</div> : items.length === 0 ? <div className="py-10 text-center"><strong>Không có tài khoản phù hợp</strong><p className="mt-1 text-[12px] text-[#59627A]">Thử thay đổi từ khóa hoặc trạng thái lọc.</p></div> : <div className="overflow-x-auto border rounded"><table className="w-full min-w-[1200px] text-[12px]"><thead className="bg-[#F4F6FA]"><tr>{['TÀI KHOẢN', 'NHÂN VIÊN', 'BỘ PHẬN', 'VAI TRÒ', 'TRẠNG THÁI', 'ĐĂNG NHẬP CUỐI', 'THAO TÁC'].map((head) => <th key={head} className="p-3 text-left">{head}</th>)}</tr></thead><tbody>{items.map((account) => <tr key={account.ma_tai_khoan} className="border-t align-top"><td className="p-3"><strong className="font-mono text-[#283A97]">{account.ma_tai_khoan}</strong><span className="block text-[10px] text-[#59627A]">Tạo: {displayDateTime(account.ngay_tao)}</span></td><td className="p-3"><strong>{account.ho_va_ten}</strong><span className="block font-mono text-[10px]">{account.ma_nhan_vien || '—'}</span></td><td className="p-3 font-mono">{account.ma_bo_phan || '—'}</td><td className="p-3"><select value={selectedRoles[account.ma_tai_khoan] || ''} disabled={!canEdit || saving === account.ma_tai_khoan} onChange={(event) => setSelectedRoles((current) => ({ ...current, [account.ma_tai_khoan]: event.target.value }))} className="h-10 min-w-52 px-2 border rounded bg-white disabled:bg-[#F4F6FA]"><option value="">-- Chọn vai trò --</option>{roles.map((role) => <option key={role.ma} value={role.ma}>{role.ten}</option>)}</select></td><td className="p-3"><span className={`pill px-2 py-1 text-[10px] ${account.trang_thai === 'KHOA' ? 'p-r' : account.trang_thai === 'CHO_DUYET' ? 'p-info' : 'p-ok'}`}>{STATUS_LABELS[account.trang_thai] || account.trang_thai}</span></td><td className="p-3 font-mono">{displayDateTime(account.lan_dang_nhap_cuoi)}</td><td className="p-3"><div className="flex gap-2"><button type="button" onClick={() => void saveRole(account)} disabled={!canEdit || saving === account.ma_tai_khoan || !selectedRoles[account.ma_tai_khoan]} className="min-h-10 px-3 border border-[#283A97] text-[#283A97] rounded font-bold disabled:opacity-40">{account.trang_thai === 'CHO_DUYET' ? 'DUYỆT' : account.trang_thai === 'KHOA' ? 'MỞ KHÓA' : 'LƯU VAI TRÒ'}</button>{account.trang_thai === 'HOAT_DONG' && <button type="button" onClick={() => void lock(account)} disabled={!canEdit || saving === account.ma_tai_khoan || account.ma_tai_khoan.toLowerCase() === currentUser.ma_tai_khoan.toLowerCase()} className="min-h-10 px-3 border border-[#EE202E] text-[#C4141F] rounded font-bold disabled:opacity-40">KHÓA</button>}</div></td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}

export function PermissionManagementPanel({ canEdit, onNotify }: { canEdit: boolean; onNotify: (message: string) => void }) {
  const [roles, setRoles] = useState<VaiTroQuanTri[]>([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await layVaiTroVaPhanQuyen();
      setRoles(result.items);
      setSelectedRole((current) => current || result.items[0]?.ma || '');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được ma trận phân quyền.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const role = roles.find((item) => item.ma === selectedRole);
  const sortedPermissions = useMemo(() => [...(role?.quyen || [])].sort((a, b) => (PAGE_LABELS[a.trang] || a.trang).localeCompare(PAGE_LABELS[b.trang] || b.trang, 'vi')), [role]);

  function updateLocal(page: string, patch: Partial<QuyenVaiTro>) {
    setRoles((current) => current.map((item) => item.ma !== selectedRole ? item : {
      ...item, quyen: item.quyen.map((permission) => permission.trang === page ? { ...permission, ...patch } : permission),
    }));
  }

  async function save(permission: QuyenVaiTro) {
    setSaving(permission.trang); setError('');
    try {
      const saved = await capNhatPhanQuyen(permission);
      updateLocal(permission.trang, saved);
      onNotify(`Đã cập nhật quyền ${PAGE_LABELS[permission.trang] || permission.trang} cho ${role?.ten}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không cập nhật được phân quyền.'); }
    finally { setSaving(''); }
  }

  return <div className="space-y-4">
    <section className="bg-white border rounded p-4"><div className="grid md:grid-cols-[320px_1fr] gap-4 items-end"><label className="text-[11px] font-bold">VAI TRÒ<select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)} className="mt-1 w-full h-11 px-3 border rounded bg-white font-normal">{roles.map((item) => <option key={item.ma} value={item.ma}>{item.ten}</option>)}</select></label><div className="p-3 bg-[#F4F6FA] rounded text-[12px]"><strong>{role?.ma || '—'}</strong><span className="block text-[#59627A]">{role?.mo_ta || 'Chưa có mô tả vai trò.'}</span></div></div></section>
    {error && <div role="alert" className="p-3 bg-[#FDECEE] border-l-4 border-[#EE202E] text-[#C4141F] text-[12px]">{error}</div>}
    <section className="bg-white border rounded overflow-hidden">{loading ? <div className="p-10 text-center text-[#59627A]">Đang tải ma trận phân quyền…</div> : !role ? <div className="p-10 text-center">Chưa có vai trò nào.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[950px] text-[12px]"><thead className="bg-[#F4F6FA]"><tr><th className="p-3 text-left">MÀN HÌNH</th><th className="p-3 text-center">XEM</th><th className="p-3 text-center">SỬA</th><th className="p-3 text-center">DUYỆT</th><th className="p-3 text-center">XUẤT</th><th className="p-3 text-left">PHẠM VI</th><th className="p-3">THAO TÁC</th></tr></thead><tbody>{sortedPermissions.map((permission) => <tr key={permission.trang} className="border-t"><td className="p-3"><strong>{PAGE_LABELS[permission.trang] || permission.trang}</strong><span className="block font-mono text-[10px] text-[#59627A]">{permission.trang}</span></td>{(['duoc_xem', 'duoc_sua', 'duoc_duyet', 'duoc_xuat'] as const).map((key) => <td key={key} className="p-3 text-center"><input type="checkbox" checked={permission[key]} disabled={!canEdit || saving === permission.trang} onChange={(event) => updateLocal(permission.trang, { [key]: event.target.checked })} aria-label={`${key} ${permission.trang}`} /></td>)}<td className="p-3"><select value={permission.pham_vi} disabled={!canEdit || saving === permission.trang} onChange={(event) => updateLocal(permission.trang, { pham_vi: event.target.value as QuyenVaiTro['pham_vi'] })} className="h-10 px-2 border rounded bg-white disabled:bg-[#F4F6FA]"><option value="ca_nhan">Cá nhân</option><option value="bo_phan">Bộ phận</option><option value="toan_bo">Toàn bộ</option></select></td><td className="p-3 text-center"><button type="button" onClick={() => void save(permission)} disabled={!canEdit || saving === permission.trang} className="min-h-10 px-4 bg-[#283A97] text-white rounded font-bold disabled:opacity-40">{saving === permission.trang ? 'ĐANG LƯU…' : 'LƯU'}</button></td></tr>)}</tbody></table></div>}</section>
  </div>;
}
