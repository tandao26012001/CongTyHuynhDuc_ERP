import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  capNhatTaiKhoanQuanTri, HoSo, khoaTaiKhoan,
  layBoPhanDanhMuc, layTaiKhoanQuanTri, layVaiTroVaPhanQuyen,
  TaiKhoanQuanTri, VaiTroQuanTri,
  LoaiTaiKhoanQuyen, QuyenLoaiTaiKhoan,
  capNhatMaTranQuyenLoaiTaiKhoan, layLoaiTaiKhoanVaBoPhan, layQuyenLoaiTaiKhoan,
} from '../api/client';

const PAGE_LABELS: Record<string, string> = {
  home: 'Tổng quan', de_nghi: 'Đề nghị', xac_nhan_kt: 'Xác nhận kỹ thuật',
  bao_gia: 'Báo giá', don_hang: 'Đơn hàng', cong_viec: 'Giao việc',
  giao_nhan: 'Giao nhận', dat_ngoai: 'Đặt ngoài',
  thanh_toan: 'Thanh toán', ncc: 'Nhà cung cấp', danh_muc: 'Dữ liệu gốc',
  bao_cao: 'Báo cáo', tien_ich: 'Tiện ích', quan_tri: 'Quản trị hệ thống',
  gia_giao_dich: 'Giá trị giao dịch', gia_ncc: 'Bảng giá nhà cung cấp',
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  QUAN_TRI_HE_THONG: 'Quản trị hệ thống', BAN_LANH_DAO: 'Ban lãnh đạo',
  TRUONG_BO_PHAN: 'Trưởng bộ phận', NHAN_VIEN: 'Nhân viên', KY_THUAT: 'Kỹ thuật',
  KE_TOAN: 'Kế toán', CHI_XEM: 'Chỉ xem',
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
  const [departments, setDepartments] = useState<Array<{ ma: string; ten: string; trang_thai: string }>>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<Record<string, string>>({});
  const [queryDraft, setQueryDraft] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<TaiKhoanQuanTri | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [accounts, roleData, departmentData] = await Promise.all([
        layTaiKhoanQuanTri(page, pageSize, query, status), layVaiTroVaPhanQuyen(), layBoPhanDanhMuc(),
      ]);
      setItems(accounts.items); setTotal(accounts.tong); setRoles(roleData.items);
      setDepartments(departmentData.items.filter((item) => item.trang_thai === 'HOAT_DONG'));
      setSelectedRoles(Object.fromEntries(accounts.items.map((item) => [item.ma_tai_khoan, item.vai_tro || ''])));
      setSelectedDepartments(Object.fromEntries(accounts.items.map((item) => [item.ma_tai_khoan, item.ma_bo_phan || ''])));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không tải được danh sách tài khoản.');
    } finally { setLoading(false); }
  }, [page, pageSize, query, status]);

  useEffect(() => { void load(); }, [load]);

  async function saveRole(account: TaiKhoanQuanTri) {
    const role = selectedRoles[account.ma_tai_khoan];
    const maBoPhan = selectedDepartments[account.ma_tai_khoan];
    if (!role) { setError('Hãy chọn chức vụ trước khi lưu tài khoản.'); return; }
    if (!maBoPhan) { setError('Hãy chọn bộ phận trước khi lưu tài khoản.'); return; }
    setSaving(account.ma_tai_khoan); setError('');
    try {
      await capNhatTaiKhoanQuanTri(account.ma_tai_khoan, maBoPhan, role, account.phien_ban);
      onNotify(`Đã lưu chức vụ và bộ phận cho ${account.ma_tai_khoan}.`);
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

  return <>
  <div className="space-y-4">
    <form onSubmit={submitFilter} className="bg-white border rounded p-4 grid md:grid-cols-[1fr_220px_auto] gap-3">
      <label className="text-[11px] font-bold">TỪ KHÓA<input value={queryDraft} onChange={(event) => setQueryDraft(event.target.value)} className="mt-1 w-full h-11 px-3 border rounded font-normal" placeholder="Tên đăng nhập, nhân viên, bộ phận…" /></label>
      <label className="text-[11px] font-bold">TRẠNG THÁI<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="mt-1 w-full h-11 px-3 border rounded bg-white font-normal"><option value="">Tất cả</option><option value="CHO_DUYET">Chờ duyệt</option><option value="HOAT_DONG">Hoạt động</option><option value="KHOA">Đã khóa</option></select></label>
      <button disabled={loading} className="min-h-11 self-end px-5 bg-[#283A97] text-white rounded font-bold disabled:opacity-40">TÌM</button>
    </form>
    {error && <div role="alert" className="p-3 bg-[#FDECEE] border-l-4 border-[#EE202E] text-[#C4141F] text-[12px]">{error}</div>}
    <section className="bg-white border rounded p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3"><Pagination total={total} page={page} pageSize={pageSize} onPage={setPage} /><label className="text-[12px]">Số dòng/trang <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="ml-2 h-10 px-2 border rounded bg-white"><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label></div>
      {loading ? <div className="py-10 text-center text-[#59627A]">Đang tải tài khoản…</div> : items.length === 0 ? <div className="py-10 text-center"><strong>Không có tài khoản phù hợp</strong><p className="mt-1 text-[12px] text-[#59627A]">Thử thay đổi từ khóa hoặc trạng thái lọc.</p></div> : <div className="overflow-x-auto border rounded"><table className="w-full min-w-[1200px] text-[12px]"><thead className="bg-[#F4F6FA]"><tr>{['TÀI KHOẢN', 'NHÂN VIÊN', 'BỘ PHẬN', 'CHỨC VỤ', 'TRẠNG THÁI', 'ĐĂNG NHẬP CUỐI', 'THAO TÁC'].map((head) => <th key={head} className="p-3 text-left">{head}</th>)}</tr></thead><tbody>{items.map((account) => <tr key={account.ma_tai_khoan} className="border-t align-top"><td className="p-3"><strong className="font-mono text-[#283A97]">{account.ma_tai_khoan}</strong><span className="block text-[10px] text-[#59627A]">Tạo: {displayDateTime(account.ngay_tao)}</span></td><td className="p-3"><strong>{account.ho_va_ten}</strong><span className="block font-mono text-[10px]">{account.ma_nhan_vien || '—'}</span></td><td className="p-3"><select aria-label={`Bộ phận của ${account.ho_va_ten}`} value={selectedDepartments[account.ma_tai_khoan] || ''} disabled={!canEdit || saving === account.ma_tai_khoan} onChange={(event) => setSelectedDepartments((current) => ({ ...current, [account.ma_tai_khoan]: event.target.value }))} className="h-10 min-w-44 px-2 border rounded bg-white disabled:bg-[#F4F6FA]">{!departments.some((item) => item.ma === account.ma_bo_phan) && account.ma_bo_phan && <option value={account.ma_bo_phan}>{account.ten_bo_phan || account.ma_bo_phan} (ngừng hoạt động)</option>}{departments.map((item) => <option key={item.ma} value={item.ma}>{item.ten}</option>)}</select></td><td className="p-3"><select value={selectedRoles[account.ma_tai_khoan] || ''} disabled={!canEdit || saving === account.ma_tai_khoan} onChange={(event) => setSelectedRoles((current) => ({ ...current, [account.ma_tai_khoan]: event.target.value }))} className="h-10 min-w-52 px-2 border rounded bg-white disabled:bg-[#F4F6FA]"><option value="">-- Chọn chức vụ --</option>{roles.map((role) => <option key={role.ma} value={role.ma}>{role.ten}</option>)}</select><span className="mt-1 block text-[10px] text-[#59627A]">Loại tài khoản: {ACCOUNT_TYPE_LABELS[roles.find((item) => item.ma === (selectedRoles[account.ma_tai_khoan] || account.vai_tro))?.ma_loai_tk || ''] || 'Chưa ánh xạ'}</span></td><td className="p-3"><span className={`pill px-2 py-1 text-[10px] ${account.trang_thai === 'KHOA' ? 'p-r' : account.trang_thai === 'CHO_DUYET' ? 'p-info' : 'p-ok'}`}>{STATUS_LABELS[account.trang_thai] || account.trang_thai}</span></td><td className="p-3 font-mono">{displayDateTime(account.lan_dang_nhap_cuoi)}</td><td className="p-3"><div className="flex gap-2"><button type="button" onClick={() => setDetail(account)} className="min-h-10 px-3 border rounded font-bold text-[#283A97]">CHI TIẾT</button><button type="button" onClick={() => void saveRole(account)} disabled={!canEdit || saving === account.ma_tai_khoan || !selectedRoles[account.ma_tai_khoan] || !selectedDepartments[account.ma_tai_khoan]} className="min-h-10 px-3 border border-[#283A97] text-[#283A97] rounded font-bold disabled:opacity-40">{saving === account.ma_tai_khoan ? 'ĐANG LƯU…' : account.trang_thai === 'CHO_DUYET' ? 'DUYỆT & LƯU' : account.trang_thai === 'KHOA' ? 'MỞ KHÓA & LƯU' : 'LƯU'}</button>{account.trang_thai === 'HOAT_DONG' && <button type="button" onClick={() => void lock(account)} disabled={!canEdit || saving === account.ma_tai_khoan || account.ma_tai_khoan.toLowerCase() === currentUser.ma_tai_khoan.toLowerCase()} className="min-h-10 px-3 border border-[#EE202E] text-[#C4141F] rounded font-bold disabled:opacity-40">KHÓA</button>}</div></td></tr>)}</tbody></table></div>}
    </section>
    {detail && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetail(null); }}><section role="dialog" aria-modal="true" aria-labelledby="account-detail-title" className="w-full max-w-xl rounded-lg bg-white shadow-xl"><header className="flex items-center justify-between border-b p-5"><div><h2 id="account-detail-title" className="text-lg font-bold">Chi tiết tài khoản</h2><p className="mt-1 text-sm text-[#59627A]">{detail.ma_tai_khoan}</p></div><button type="button" onClick={() => setDetail(null)} className="h-10 w-10 rounded border text-xl" aria-label="Đóng">×</button></header><dl className="grid gap-4 p-5 sm:grid-cols-2 text-sm"><div><dt className="text-[#59627A]">Họ và tên</dt><dd className="mt-1 font-semibold">{detail.ho_va_ten}</dd></div><div><dt className="text-[#59627A]">Mã nhân viên</dt><dd className="mt-1 font-mono">{detail.ma_nhan_vien || '—'}</dd></div><div><dt className="text-[#59627A]">Bộ phận</dt><dd className="mt-1">{detail.ten_bo_phan || detail.ma_bo_phan || '—'}</dd></div><div><dt className="text-[#59627A]">Chức vụ</dt><dd className="mt-1">{roles.find((role) => role.ma === detail.vai_tro)?.ten || detail.vai_tro || 'Chưa gán'}</dd></div><div><dt className="text-[#59627A]">Trạng thái</dt><dd className="mt-1">{STATUS_LABELS[detail.trang_thai] || detail.trang_thai}</dd></div><div><dt className="text-[#59627A]">Tạo lúc</dt><dd className="mt-1">{displayDateTime(detail.ngay_tao)}</dd></div><div className="sm:col-span-2"><dt className="text-[#59627A]">Đăng nhập cuối</dt><dd className="mt-1">{displayDateTime(detail.lan_dang_nhap_cuoi)}</dd></div></dl><footer className="flex justify-end border-t p-4"><button type="button" onClick={() => setDetail(null)} className="h-10 rounded border px-5 font-semibold">ĐÓNG</button></footer></section></div>}
  </div>
  </>;
}

export function PermissionManagementPanel({ canEdit, onNotify }: { canEdit: boolean; onNotify: (message: string) => void }) {
  const [types, setTypes] = useState<LoaiTaiKhoanQuyen[]>([]);
  const [departments, setDepartments] = useState<Array<{ ma: string; ten: string; trang_thai: string }>>([]);
  const [selectedType, setSelectedType] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [permissions, setPermissions] = useState<QuyenLoaiTaiKhoan[]>([]);
  const [savedPermissions, setSavedPermissions] = useState<QuyenLoaiTaiKhoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    layLoaiTaiKhoanVaBoPhan().then((result) => {
      setTypes(result.items);
      setDepartments(result.bo_phan.filter((item) => item.trang_thai === "HOAT_DONG"));
      setSelectedType((current) => current || result.items[0]?.ma || "");
      setSelectedDepartment((current) => current || result.bo_phan.find((item) => item.trang_thai === "HOAT_DONG")?.ma || "");
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "Không tải được loại tài khoản."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedType || !selectedDepartment) return;
    setLoading(true); setError("");
    layQuyenLoaiTaiKhoan(selectedType, selectedDepartment)
      .then((result) => { setPermissions(result.items); setSavedPermissions(result.items); })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Không tải được ma trận quyền."))
      .finally(() => setLoading(false));
  }, [selectedType, selectedDepartment]);

  const hasChanges = useMemo(() => permissions.some((permission) => {
    const saved = savedPermissions.find((item) => item.trang === permission.trang);
    return !saved || ["duoc_xem", "duoc_sua", "duoc_duyet", "duoc_xuat", "pham_vi_xem", "pham_vi_sua"]
      .some((key) => permission[key as keyof QuyenLoaiTaiKhoan] !== saved[key as keyof QuyenLoaiTaiKhoan]);
  }), [permissions, savedPermissions]);

  function updateLocal(page: string, patch: Partial<QuyenLoaiTaiKhoan>) {
    setPermissions((current) => current.map((permission) => permission.trang === page
      ? { ...permission, ...patch } : permission));
  }

  function changeScope(setter: (value: string) => void, value: string) {
    if (hasChanges && !window.confirm("Bỏ các thay đổi chưa lưu và chuyển phạm vi?")) return;
    setter(value);
  }

  async function save() {
    setSaving(true); setError("");
    try {
      const result = await capNhatMaTranQuyenLoaiTaiKhoan(selectedType, selectedDepartment, permissions);
      setPermissions(result.items); setSavedPermissions(result.items);
      const typeName = types.find((item) => item.ma === selectedType)?.ten || selectedType;
      const departmentName = departments.find((item) => item.ma === selectedDepartment)?.ten || selectedDepartment;
      onNotify("Đã lưu ma trận quyền cho " + typeName + " · " + departmentName + ".");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không lưu được ma trận quyền."); }
    finally { setSaving(false); }
  }

  const sortedPermissions = useMemo(() => [...permissions].sort((a, b) =>
    (PAGE_LABELS[a.trang] || a.trang).localeCompare(PAGE_LABELS[b.trang] || b.trang, "vi")),
  [permissions]);
  const controlsDisabled = !canEdit || saving || loading;

  return <div className="space-y-4">
    <section className="bg-white border rounded p-4 grid gap-3 md:grid-cols-2">
      <label className="text-[11px] font-bold">LOẠI TÀI KHOẢN<select value={selectedType} disabled={saving || loading} onChange={(event) => changeScope(setSelectedType, event.target.value)} className="mt-1 w-full h-11 px-3 border rounded bg-white font-normal">{types.map((item) => <option key={item.ma} value={item.ma}>{item.ten}</option>)}</select></label>
      <label className="text-[11px] font-bold">BỘ PHẬN<select value={selectedDepartment} disabled={saving || loading} onChange={(event) => changeScope(setSelectedDepartment, event.target.value)} className="mt-1 w-full h-11 px-3 border rounded bg-white font-normal">{departments.map((item) => <option key={item.ma} value={item.ma}>{item.ten}</option>)}</select></label>
    </section>
    {error && <div role="alert" className="p-3 bg-[#FDECEE] border-l-4 border-[#EE202E] text-[#C4141F] text-[12px]">{error}</div>}
    <section className="bg-white border rounded overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3">
        <span className="text-[12px] text-[#59627A]">{hasChanges ? "Có thay đổi chưa lưu" : "Ma trận quyền đã lưu"}</span>
        <button type="button" onClick={() => void save()} disabled={controlsDisabled || !hasChanges || permissions.length === 0} className="min-h-10 px-4 bg-[#283A97] text-white rounded font-bold disabled:opacity-40">{saving ? "ĐANG LƯU…" : "LƯU MA TRẬN QUYỀN"}</button>
      </div>
      {loading ? <div className="p-10 text-center text-[#59627A]">Đang tải ma trận phân quyền…</div> : <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-[12px]"><thead className="bg-[#F4F6FA]"><tr><th className="p-3 text-left">MÀN HÌNH</th><th className="p-3 text-center">XEM</th><th className="p-3 text-center">SỬA</th><th className="p-3 text-center">DUYỆT</th><th className="p-3 text-center">XUẤT</th><th className="p-3 text-left">PHẠM VI XEM</th><th className="p-3 text-left">PHẠM VI SỬA</th></tr></thead><tbody>{sortedPermissions.map((permission) => <tr key={permission.trang} className="border-t"><td className="p-3"><strong>{PAGE_LABELS[permission.trang] || permission.trang}</strong><span className="block font-mono text-[10px] text-[#59627A]">{permission.trang}</span></td>{(["duoc_xem", "duoc_sua", "duoc_duyet", "duoc_xuat"] as const).map((key) => <td key={key} className="p-3 text-center"><input type="checkbox" checked={permission[key]} disabled={controlsDisabled} onChange={(event) => updateLocal(permission.trang, { [key]: event.target.checked })} aria-label={key + " " + permission.trang} /></td>)}<td className="p-3"><select value={permission.pham_vi_xem} disabled={controlsDisabled} onChange={(event) => updateLocal(permission.trang, { pham_vi_xem: event.target.value as QuyenLoaiTaiKhoan["pham_vi_xem"] })} className="h-10 px-2 border rounded bg-white"><option value="ca_nhan">Cá nhân</option><option value="bo_phan">Bộ phận</option><option value="toan_bo">Toàn bộ</option></select></td><td className="p-3"><select value={permission.pham_vi_sua} disabled={controlsDisabled} onChange={(event) => updateLocal(permission.trang, { pham_vi_sua: event.target.value as QuyenLoaiTaiKhoan["pham_vi_sua"] })} className="h-10 px-2 border rounded bg-white"><option value="ca_nhan">Cá nhân</option><option value="bo_phan">Bộ phận</option><option value="toan_bo">Toàn bộ</option></select></td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
