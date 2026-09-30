const TOKEN_KEY = 'hd_phien';
const API_TIMEOUT_MS = 15_000;
const BULK_IMPORT_TIMEOUT_MS = 60_000;
export const PHIEN_HET_HAN_EVENT = 'hd-phien-het-han';

export interface HoSo {
  ma_tai_khoan: string;
  ma_nhan_vien: string;
  ho_va_ten: string;
  ma_bo_phan: string;
  vai_tro: string;
  ma_loai_tk?: string | null;
  trang_thai: string;
  phien_ban: number;
  quyen?: Record<string, unknown>;
}

interface ApiEnvelope<T> {
  ok: boolean;
  data: T;
  error: string | null;
  ma_loi: string | null;
}

export class ApiError extends Error {
  constructor(message: string, public maLoi: string | null, public status: number) {
    super(message);
  }
}

export function layToken() {
  return sessionStorage.getItem(TOKEN_KEY) || '';
}

export function luuToken(token: string) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

export async function api<T>(path: string, init: RequestInit = {}, timeoutMs = API_TIMEOUT_MS): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body) headers.set('Content-Type', 'application/json');
  const token = layToken();
  if (token) headers.set('X-Phien', token);

  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort();
  init.signal?.addEventListener('abort', abortFromCaller, { once: true });
  const timeoutId = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(path, { ...init, headers, signal: controller.signal });
    const result = await response.json() as ApiEnvelope<T>;
    if (!response.ok || !result.ok) {
      if (response.status === 401) {
        luuToken('');
        globalThis.dispatchEvent(new CustomEvent(PHIEN_HET_HAN_EVENT, {
          detail: result.error || 'Phiên đăng nhập đã hết. Hãy đăng nhập lại.',
        }));
      }
      throw new ApiError(result.error || 'Không thể kết nối hệ thống.', result.ma_loi, response.status);
    }
    return result.data;
  } catch (reason) {
    if (timedOut) {
      throw new ApiError('Máy chủ phản hồi quá lâu. Hãy thử lại sau.', 'API_TIMEOUT', 408);
    }
    throw reason;
  } finally {
    globalThis.clearTimeout(timeoutId);
    init.signal?.removeEventListener('abort', abortFromCaller);
  }
}

export async function dangNhap(maTaiKhoan: string, matKhau: string) {
  const data = await api<{ token: string; ho_so: HoSo }>('/api/v1/dang-nhap', {
    method: 'POST',
    body: JSON.stringify({ ma_tai_khoan: maTaiKhoan, mat_khau: matKhau }),
  });
  luuToken(data.token);
  try {
    return await layHoSo();
  } catch (error) {
    luuToken('');
    throw error;
  }
}

export async function timNhanVienDangKy(hoVaTen: string) {
  const params = new URLSearchParams({ ho_va_ten: hoVaTen });
  return api<{ ma_nhan_vien: string; ho_va_ten: string }>(`/api/v1/dang-ky/nhan-vien?${params.toString()}`);
}

export async function dangKyTaiKhoan(hoVaTen: string, matKhau: string) {
  return api<{ ma_tai_khoan: string; ma_nhan_vien: string; ho_va_ten: string; trang_thai: string }>(
    '/api/v1/dang-ky', { method: 'POST', body: JSON.stringify({ ho_va_ten: hoVaTen, mat_khau: matKhau }) },
  );
}

export async function doiMatKhau(matKhauCu: string, matKhauMoi: string) {
  return api<{ da_doi_mat_khau: boolean; can_dang_nhap_lai: boolean }>('/api/v1/doi-mat-khau', {
    method: 'POST', body: JSON.stringify({ mat_khau_cu: matKhauCu, mat_khau_moi: matKhauMoi }),
  });
}

export async function layHoSo() {
  return api<HoSo>('/api/v1/toi');
}

export interface BoPhanDanhMuc {
  ma: string;
  ten: string;
  loai: string | null;
  thu_tu: number | null;
  trang_thai: string;
  phien_ban: number;
}

export interface DuLieuBoPhan {
  ma_bo_phan: string;
  ten: string;
  loai?: string;
  thu_tu?: number;
  trang_thai: 'HOAT_DONG' | 'NGUNG';
}

export interface NhanVienDanhMuc {
  ma: string;
  ten: string;
  ma_bo_phan: string | null;
  ten_bo_phan: string | null;
  chuc_vu: string | null;
  ngay_vao_lam: string | null;
  trang_thai: 'HOAT_DONG' | 'TAM_NGHI' | 'NGHI_VIEC';
  ghi_chu: string | null;
  phien_ban: number;
}

export interface DuLieuNhanVien {
  ma_nhan_vien: string;
  ho_va_ten: string;
  ma_bo_phan?: string;
  chuc_vu?: string;
  ngay_vao_lam?: string;
  trang_thai: NhanVienDanhMuc['trang_thai'];
  ghi_chu?: string;
}

export async function layBoPhanDanhMuc() {
  return api<{ items: BoPhanDanhMuc[]; tong: number }>('/api/v1/danh-muc/bo-phan?trang=1&kich_thuoc=100');
}

export async function layDanhSachBoPhan(
  trang = 1, kichThuoc = 25, boLoc: { q?: string; trang_thai?: string } = {},
) {
  const params = new URLSearchParams({ trang: String(trang), kich_thuoc: String(kichThuoc) });
  if (boLoc.q?.trim()) params.set('q', boLoc.q.trim());
  if (boLoc.trang_thai) params.set('trang_thai', boLoc.trang_thai);
  return api<{ items: BoPhanDanhMuc[]; tong: number; trang: number; kich_thuoc: number }>(
    `/api/v1/danh-muc/bo-phan?${params.toString()}`,
  );
}

export async function taoBoPhan(input: DuLieuBoPhan) {
  return api<{ item: BoPhanDanhMuc }>('/api/v1/danh-muc/bo-phan', {
    method: 'POST', headers: idempotencyHeaders(), body: JSON.stringify({ du_lieu: input }),
  });
}

export async function suaBoPhan(ma: string, input: DuLieuBoPhan, phienBan: number) {
  return api<BoPhanDanhMuc>(`/api/v1/danh-muc/bo-phan/${encodeURIComponent(ma)}`, {
    method: 'PATCH', body: JSON.stringify({ du_lieu: input, phien_ban: phienBan }),
  });
}

export async function xemTruocNhapBoPhan(rows: DuLieuBoPhan[]) {
  return api<KetQuaXemTruocNhapVatTu>('/api/v1/danh-muc/nhap-hang-loat/xem-truoc', {
    method: 'POST', body: JSON.stringify({ loai: 'bo-phan', rows }),
  });
}

export async function xacNhanNhapBoPhan(rows: DuLieuBoPhan[], maXacNhan: string) {
  return api<{ so_dong: number; items: BoPhanDanhMuc[] }>('/api/v1/danh-muc/nhap-hang-loat/xac-nhan', {
    method: 'POST', headers: idempotencyHeaders(),
    body: JSON.stringify({ loai: 'bo-phan', rows, ma_xac_nhan: maXacNhan, xac_nhan_canh_bao: false }),
  });
}

export async function layNhanVienDanhMuc(
  trang = 1, kichThuoc = 25, boLoc: { q?: string; trang_thai?: string; ma_bo_phan?: string } = {},
) {
  const params = new URLSearchParams({ trang: String(trang), kich_thuoc: String(kichThuoc) });
  if (boLoc.q?.trim()) params.set('q', boLoc.q.trim());
  if (boLoc.trang_thai) params.set('trang_thai', boLoc.trang_thai);
  if (boLoc.ma_bo_phan) params.set('ma_bo_phan', boLoc.ma_bo_phan);
  return api<{ items: NhanVienDanhMuc[]; tong: number; trang: number; kich_thuoc: number }>(
    `/api/v1/danh-muc/nhan-vien?${params.toString()}`,
  );
}

export async function taoNhanVien(input: DuLieuNhanVien) {
  return api<{ item: NhanVienDanhMuc }>('/api/v1/danh-muc/nhan-vien', {
    method: 'POST', headers: idempotencyHeaders(), body: JSON.stringify({ du_lieu: input }),
  });
}

export async function suaNhanVien(ma: string, input: DuLieuNhanVien, phienBan: number) {
  return api<NhanVienDanhMuc>(`/api/v1/danh-muc/nhan-vien/${encodeURIComponent(ma)}`, {
    method: 'PATCH', body: JSON.stringify({ du_lieu: input, phien_ban: phienBan }),
  });
}

export async function xemTruocNhapNhanVien(rows: DuLieuNhanVien[]) {
  return api<KetQuaXemTruocNhapVatTu>('/api/v1/danh-muc/nhap-hang-loat/xem-truoc', {
    method: 'POST', body: JSON.stringify({ loai: 'nhan-vien', rows }),
  }, BULK_IMPORT_TIMEOUT_MS);
}

export async function xacNhanNhapNhanVien(rows: DuLieuNhanVien[], maXacNhan: string) {
  return api<{ so_dong: number; items: NhanVienDanhMuc[] }>('/api/v1/danh-muc/nhap-hang-loat/xac-nhan', {
    method: 'POST', headers: idempotencyHeaders(),
    body: JSON.stringify({ loai: 'nhan-vien', rows, ma_xac_nhan: maXacNhan, xac_nhan_canh_bao: false }),
  }, BULK_IMPORT_TIMEOUT_MS);
}

export interface TaiKhoanQuanTri {
  ma_tai_khoan: string;
  ma_nhan_vien: string;
  ho_va_ten: string;
  ma_bo_phan: string;
  ten_bo_phan?: string | null;
  vai_tro: string | null;
  trang_thai: 'CHO_DUYET' | 'HOAT_DONG' | 'KHOA';
  lan_dang_nhap_cuoi: string | null;
  ngay_tao: string | null;
  phien_ban: number;
}

export interface QuyenVaiTro {
  vai_tro: string;
  trang: string;
  duoc_xem: boolean;
  duoc_sua: boolean;
  duoc_duyet: boolean;
  duoc_xuat: boolean;
  pham_vi: 'toan_bo' | 'bo_phan' | 'ca_nhan';
  phien_ban: number;
}

export interface VaiTroQuanTri {
  ma: string;
  ten: string;
  thu_tu: number | null;
  mo_ta: string | null;
  ma_loai_tk?: string | null;
  quyen: QuyenVaiTro[];
}

export interface LoaiTaiKhoanQuyen {
  ma: string;
  ten: string;
  thu_tu: number;
  mo_ta: string | null;
}

export interface QuyenLoaiTaiKhoan {
  ma_loai_tk: string;
  ma_bo_phan: string;
  trang: string;
  duoc_xem: boolean;
  duoc_sua: boolean;
  duoc_duyet: boolean;
  duoc_xuat: boolean;
  pham_vi_xem: 'toan_bo' | 'bo_phan' | 'ca_nhan';
  pham_vi_sua: 'toan_bo' | 'bo_phan' | 'ca_nhan';
  kieu_sua: 'THANG' | 'CAN_DUYET';
  ma_loai_tk_duyet: string | null;
  phien_ban: number;
}

export async function layTaiKhoanQuanTri(trang = 1, kichThuoc = 25, q = '', trangThai = '') {
  const params = new URLSearchParams({
    trang: String(trang), kich_thuoc: String(kichThuoc), q, trang_thai: trangThai,
  });
  return api<{ items: TaiKhoanQuanTri[]; tong: number; trang: number; kich_thuoc: number }>(
    `/api/v1/tai-khoan?${params.toString()}`,
  );
}

export async function duyetTaiKhoan(ma: string, vaiTro: string, phienBan: number) {
  return api<{ ma_tai_khoan: string; trang_thai: string }>(`/api/v1/tai-khoan/${encodeURIComponent(ma)}/duyet`, {
    method: 'POST', headers: idempotencyHeaders(), body: JSON.stringify({ vai_tro: vaiTro, phien_ban: phienBan }),
  });
}

export async function khoaTaiKhoan(ma: string, phienBan: number) {
  return api<{ ma_tai_khoan: string; trang_thai: string }>(`/api/v1/tai-khoan/${encodeURIComponent(ma)}/khoa`, {
    method: 'POST', headers: idempotencyHeaders(), body: JSON.stringify({ phien_ban: phienBan }),
  });
}

export async function capNhatTaiKhoanQuanTri(ma: string, maBoPhan: string, vaiTro: string, phienBan: number) {
  return api<{ ma_tai_khoan: string; ma_bo_phan: string; vai_tro: string; trang_thai: string }>(
    `/api/v1/tai-khoan/${encodeURIComponent(ma)}`,
    { method: 'PATCH', body: JSON.stringify({ ma_bo_phan: maBoPhan, vai_tro: vaiTro, phien_ban: phienBan }) },
  );
}

export async function layVaiTroVaPhanQuyen() {
  return api<{ items: VaiTroQuanTri[] }>('/api/v1/vai-tro');
}

export async function capNhatPhanQuyen(quyen: QuyenVaiTro) {
  return api<QuyenVaiTro>(`/api/v1/phan-quyen/${encodeURIComponent(quyen.vai_tro)}/${encodeURIComponent(quyen.trang)}`, {
    method: 'PATCH', headers: idempotencyHeaders(), body: JSON.stringify(quyen),
  });
}

export async function layLoaiTaiKhoanVaBoPhan() {
  return api<{ items: LoaiTaiKhoanQuyen[]; bo_phan: Array<{ ma: string; ten: string; trang_thai: string }> }>(
    '/api/v1/loai-tai-khoan',
  );
}

export async function layQuyenLoaiTaiKhoan(maLoai: string, maBoPhan: string) {
  return api<{ items: QuyenLoaiTaiKhoan[] }>(
    `/api/v1/phan-quyen/${encodeURIComponent(maLoai)}/${encodeURIComponent(maBoPhan)}`,
  );
}

export async function capNhatMaTranQuyenLoaiTaiKhoan(
  maLoai: string, maBoPhan: string, items: QuyenLoaiTaiKhoan[],
) {
  return api<{ items: QuyenLoaiTaiKhoan[] }>(
    "/api/v1/phan-quyen/" + encodeURIComponent(maLoai) + "/" + encodeURIComponent(maBoPhan),
    { method: "PUT", headers: idempotencyHeaders(), body: JSON.stringify({ items }) },
  );
}

export async function dangXuat() {
  try {
    await api('/api/v1/dang-xuat', { method: 'POST' });
  } finally {
    luuToken('');
  }
}

export interface VatTuTraCuu {
  id: string;
  ma_vat_tu: string;
  ten_hang: string;
  dvt: string;
  ma_chung_loai?: string | null;
  ten_chung_loai?: string | null;
  phan_loai?: string | null;
  ton_kho?: number | null;
  ma_vach?: string | null;
  quy_cach?: string | null;
  trang_thai: string;
}

export interface DonViTinh {
  dvt: string;
  ten_dvt: string;
  so_le: number;
}

export async function timVatTu(tuKhoa: string) {
  return api<VatTuTraCuu[]>(`/api/v1/vat-tu/tim?q=${encodeURIComponent(tuKhoa)}&gioi_han=20`);
}

export interface BoLocVatTu {
  tu_khoa?: string;
  ma_vat_tu?: string;
  ten_hang?: string;
  dvt?: string;
  ma_chung_loai?: string;
  trang_thai?: string;
}

export async function layDanhSachVatTu(trang = 1, kichThuoc = 25, boLoc: BoLocVatTu = {}) {
  const params = new URLSearchParams({ trang: String(trang), kich_thuoc: String(kichThuoc) });
  const mapping: Record<keyof BoLocVatTu, string> = {
    tu_khoa: 'q', ma_vat_tu: 'ma_vat_tu', ten_hang: 'ten_hang', dvt: 'dvt',
    ma_chung_loai: 'ma_chung_loai', trang_thai: 'trang_thai',
  };
  for (const [key, apiKey] of Object.entries(mapping)) {
    const value = boLoc[key as keyof BoLocVatTu]?.trim();
    if (value) params.set(apiKey, value);
  }
  const result = await api<{ items: VatTuTraCuu[]; tong: number; trang: number; kich_thuoc: number } | null>(
    `/api/v1/vat-tu?${params.toString()}`,
  );
  if (!result || !Array.isArray(result.items) || typeof result.tong !== 'number') {
    throw new ApiError('Máy chủ trả về danh sách vật tư không hợp lệ. Kiểm tra API GET /api/v1/vat-tu rồi tải lại.', 'VAT_TU_DANH_SACH_RONG', 502);
  }
  return result;
}

export async function layDonViTinh() {
  return api<DonViTinh[]>('/api/v1/don-vi-tinh');
}

export async function xoaDonViTinh(dvt: string) {
  return api<{ da_xoa: boolean; ma: string }>(`/api/v1/don-vi-tinh/${encodeURIComponent(dvt)}`, { method: 'DELETE' });
}

function taoUuidTuongThich() {
  const webCrypto = globalThis.crypto;
  if (typeof webCrypto?.randomUUID === 'function') return webCrypto.randomUUID();

  const bytes = new Uint8Array(16);
  if (typeof webCrypto?.getRandomValues === 'function') {
    webCrypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function idempotencyHeaders() {
  return { 'X-Idempotency-Key': taoUuidTuongThich() };
}

export async function taoDonViTinh(input: { dvt: string; ten_dvt: string; so_le: number }) {
  return api<{ item: DonViTinh }>('/api/v1/danh-muc/don-vi-tinh', {
    method: 'POST',
    headers: idempotencyHeaders(),
    body: JSON.stringify({ du_lieu: { ...input, trang_thai: 'HOAT_DONG' } }),
  });
}

export async function nhapDonViTinhHangLoat(rows: Array<{ dvt: string; ten_dvt: string; so_le: number }>) {
  return api<{ so_dong: number; items: DonViTinh[]; co_loi: number; errors: Array<{ dong: number; ma: string; loi: string }> }>('/api/v1/don-vi-tinh/nhap-hang-loat', {
    method: 'POST',
    headers: idempotencyHeaders(),
    body: JSON.stringify({ rows }),
  });
}

export async function taoVatTu(input: { ma_vat_tu: string; ten_hang: string; dvt: string; ma_chung_loai: string; quy_cach?: string }) {
  return api<{ item: VatTuTraCuu }>('/api/v1/vat-tu', {
    method: 'POST',
    headers: idempotencyHeaders(),
    body: JSON.stringify({ ...input, phan_loai: 'THONG_DUNG_SX', trang_thai: 'HOAT_DONG' }),
  });
}

export interface QuyTacMaVatTu {
  ma_quy_tac: string;
  kho: 'TH' | 'VT' | 'TL';
  ma_nhom: string;
  ten_nhom: string;
  mau_ma: string;
  can_ma_vat_lieu: boolean;
  can_loai_hinh: boolean;
}

export async function layQuyTacMaVatTu() {
  return api<QuyTacMaVatTu[]>('/api/v1/quy-tac-ma-vat-tu');
}

export interface ChungLoai {
  ma: string;
  ten: string;
  thu_tu: number | null;
  phien_ban: number;
}

export interface QuyTacNhanDien {
  id: string;
  loai: 'VAT_LIEU' | 'BE_MAT' | 'MAU_SAC';
  tu_khoa: string;
  ten_chuan: string;
  ma_quy_uoc: string;
  vi_du_ten_hang: string | null;
  vi_du_ma_vat_tu: string | null;
  uu_tien: number;
  trang_thai: string;
}

export interface NhapQuyTacNhanDienRow {
  loai: QuyTacNhanDien['loai'];
  ten_thuc_te: string;
  ma_quy_uoc: string;
  vi_du_ten_hang?: string;
  vi_du_ma_vat_tu?: string;
}

export async function layChungLoai() {
  const result = await api<{ items: ChungLoai[] } | null>('/api/v1/danh-muc/chung-loai?trang=1&kich_thuoc=100');
  if (!result || !Array.isArray(result.items)) {
    throw new ApiError('Máy chủ trả về danh sách chủng loại không hợp lệ. Kiểm tra API GET /api/v1/danh-muc/chung-loai.', 'CHUNG_LOAI_DANH_SACH_RONG', 502);
  }
  return result.items;
}

export interface LenhSanXuat {
  lenh_san_xuat: string;
  so_po: string | null;
  ma_khach_hang: string | null;
  ten_khach_hang_chup: string | null;
  ma_bo_phan: string | null;
  ten_bo_phan_chup: string | null;
  so_so: string | null;
  ngay_so: string | null;
  ki_han_khach_hang: string | null;
  muc_do_uu_tien: number | null;
  ngay_nhan_lenh: string | null;
  trang_thai_don: string | null;
  ghi_chu: string | null;
  so_dong: number;
}

export async function layDanhSachLenhSanXuat(q = '', trang = 1, kichThuoc = 25) {
  const params = new URLSearchParams({ q, trang: String(trang), kich_thuoc: String(kichThuoc) });
  return api<{ items: LenhSanXuat[]; tong: number; trang: number; kich_thuoc: number }>(
    `/api/v1/lenh-san-xuat?${params.toString()}`,
  );
}

export async function layQuyTacNhanDien() {
  return api<QuyTacNhanDien[]>('/api/v1/quy-tac-nhan-dien');
}

export async function xoaChungLoai(ma: string) {
  return api<{ da_xoa: boolean; ma: string }>(`/api/v1/chung-loai/${encodeURIComponent(ma)}`, { method: 'DELETE' });
}

export async function xoaQuyTacNhanDien(id: string) {
  return api<{ da_xoa: boolean; ma: string }>(`/api/v1/quy-tac-nhan-dien/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function xoaVatTu(id: string) {
  return api<{ da_xoa: boolean; ma: string }>(`/api/v1/vat-tu/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function taoChungLoai(input: { ma_chung_loai: string; ten: string; thu_tu?: number }) {
  return api<{ item: ChungLoai }>('/api/v1/danh-muc/chung-loai', {
    method: 'POST', headers: idempotencyHeaders(), body: JSON.stringify({ du_lieu: input }),
  });
}

export async function nhapChungLoaiHangLoat(rows: Array<{ ma_chung_loai: string; ten: string; thu_tu?: number }>) {
  return api<{ so_dong: number; co_loi: number; errors: Array<{ dong: number; ma: string; loi: string }> }>('/api/v1/chung-loai/nhap-hang-loat', {
    method: 'POST', body: JSON.stringify({ rows }),
  });
}

export async function nhapQuyTacNhanDien(rows: NhapQuyTacNhanDienRow[]) {
  return api<{ so_dong: number; co_loi: number; errors: Array<{ dong: number; ma: string; loi: string }> }>('/api/v1/quy-tac-nhan-dien/nhap-hang-loat', {
    method: 'POST', body: JSON.stringify({ rows }),
  });
}

export async function capMaVatTu(input: { ma_quy_tac: string; ma_vat_lieu?: string; loai_hinh?: string }) {
  return api<{ ma_vat_tu: string; so_thu_tu: number }>('/api/v1/vat-tu/cap-ma', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function capMaVatTuHangLoat(rows: Array<{ ma_quy_tac: string; ma_vat_lieu?: string; loai_hinh?: string }>) {
  return api<Array<{ ma_vat_tu: string; so_thu_tu: number }>>('/api/v1/vat-tu/cap-ma-hang-loat', {
    method: 'POST',
    body: JSON.stringify({ rows }),
  });
}

export interface DuKienMaVatTuInput { ma_quy_tac: string; ten_hang: string; loai_hinh?: string }
export interface DuKienMaVatTuResult {
  ma_du_kien: string;
  ten_de_xuat: string;
  ma_vat_lieu: string | null;
  can_bo_sung: boolean;
  loi?: string | null;
}

export async function duKienMaVatTu(input: DuKienMaVatTuInput) {
  return api<DuKienMaVatTuResult>('/api/v1/vat-tu/du-kien-ma', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function duKienMaVatTuHangLoat(rows: DuKienMaVatTuInput[]) {
  return api<DuKienMaVatTuResult[]>('/api/v1/vat-tu/du-kien-ma-hang-loat', {
    method: 'POST',
    body: JSON.stringify({ rows }),
  });
}

export interface DongNhapVatTu {
  ma_vat_tu: string;
  ten_hang: string;
  dvt: string;
  ma_chung_loai?: string;
  quy_cach?: string;
  ghi_chu?: string;
  phan_loai?: string;
  trang_thai?: string;
}

export interface KetQuaXemTruocNhapVatTu {
  tong_so: number;
  hop_le: number;
  co_loi: number;
  co_canh_bao: number;
  chi_tiet: Array<{ dong: number; hop_le: boolean; loi: string[]; canh_bao_trung: unknown[] }>;
  ma_xac_nhan: string;
}

export async function xemTruocNhapVatTu(rows: DongNhapVatTu[]) {
  return api<KetQuaXemTruocNhapVatTu>('/api/v1/danh-muc/nhap-hang-loat/xem-truoc', {
    method: 'POST',
    body: JSON.stringify({ loai: 'vat-tu', rows }),
  });
}

export async function xacNhanNhapVatTu(rows: DongNhapVatTu[], maXacNhan: string, xacNhanCanhBao = false) {
  return api<{ so_dong?: number; items?: VatTuTraCuu[] }>('/api/v1/danh-muc/nhap-hang-loat/xac-nhan', {
    method: 'POST',
    headers: idempotencyHeaders(),
    body: JSON.stringify({ loai: 'vat-tu', rows, ma_xac_nhan: maXacNhan, xac_nhan_canh_bao: xacNhanCanhBao }),
  });
}

export async function nhapVatTuHangLoatTungDong(rows: DongNhapVatTu[]) {
  return api<{ so_dong: number; co_loi: number; errors: Array<{ dong: number; ma: string; loi: string }> }>('/api/v1/vat-tu/nhap-hang-loat', {
    method: 'POST', body: JSON.stringify({ rows }),
  });
}

export interface DongNhapLsx {
  lenh_san_xuat: string;
  ma_vach: string;
  ma_hang: string;
  ten_hang: string;
  so_luong: number;
  dvt: string;
  so_po?: string;
  ma_khach_hang?: string;
  ten_khach_hang_chup?: string;
  ma_bo_phan?: string;
  ten_bo_phan_chup?: string;
  ki_han_khach_hang?: string;
  ngay_nhan_lenh?: string;
  so_so?: string;
  ngay_so?: string;
  trang_thai_don?: string;
  muc_do_uu_tien?: number;
  ma_cong_doan?: string;
  ma_ban_ve?: string;
  ghi_chu?: string;
  ghi_chu_dong?: string;
}

export interface LsxDatNgoai {
  lenh_san_xuat: string;
  so_po: string | null;
  ma_khach_hang: string | null;
  ten_khach_hang_chup: string | null;
  ma_bo_phan: string | null;
  ten_bo_phan_chup: string | null;
  ki_han_khach_hang: string | null;
  muc_do_uu_tien: number | null;
  ngay_nhan_lenh: string | null;
  so_so: string | null;
  ngay_so: string | null;
  trang_thai_don: string | null;
  ghi_chu: string | null;
  dong: Array<{
    ma_vach: string;
    ma_hang: string;
    ten_hang: string;
    so_luong: number;
    dvt: string;
    ma_cong_doan: string | null;
    ma_ban_ve: string | null;
    ghi_chu: string | null;
    da_lap_bao_gia: boolean;
  }>;
}

export async function nhapLsxDatNgoai(rows: DongNhapLsx[]) {
  return api<{ so_dong: number; so_lsx: number; co_loi: number; errors: Array<{ dong: number; ma: string; loi: string }> }>('/api/v1/dat-ngoai/nhap-lsx', {
    method: 'POST', headers: idempotencyHeaders(), body: JSON.stringify({ rows }),
  }, BULK_IMPORT_TIMEOUT_MS);
}

export async function layLsxDatNgoai(q = '') {
  return api<LsxDatNgoai[]>(`/api/v1/dat-ngoai/lsx?q=${encodeURIComponent(q)}`);
}

export interface DongPhieuDatNgoai {
  id: string;
  ma_vach: string;
  ma_hang: string;
  ten_hang: string;
  dvt: string;
  so_luong: number;
  don_gia: number | null;
  ky_han: string | null;
  ngay_nhan: string | null;
  trang_thai: string;
  ghi_chu: string | null;
  noi_dung_gia_cong?: string | null;
  yeu_cau_ky_thuat?: string | null;
  yeu_cau_chat_luong?: string | null;
  ma_hang_goc?: string | null;
  ma_hang_thay_the?: string | null;
  so_su_co?: number;
  su_co?: Array<{ id: string; mo_ta: string; loai: string; thoi_diem: string }>;
  xac_nhan_ky_thuat?: Array<{ id: string; noi_dung: string; ket_qua: string; nguoi_xac_nhan: string; thoi_diem: string; ghi_chu: string | null }>;
  dot_giao?: Array<{ id: string; lan_giao: number; ngay_du_kien: string; so_luong_du_kien: number | null; ngay_thuc_te: string | null; so_luong_thuc_te: number | null; ghi_chu: string | null }>;
  lich_su_ky_han?: Array<{ ky_han_cu: string | null; ky_han_moi: string; ly_do: string; nguoi_sua: string; thoi_diem: string }>;
}

export interface PhieuDatNgoai {
  id: string;
  id_ncc: string | null;
  lenh_san_xuat: string;
  nguoi_lap: string;
  ngay_lap: string;
  ten_ncc_chup: string | null;
  ky_han: string | null;
  trang_thai: string;
  can_xac_nhan_ky_thuat: boolean;
  noi_dung_ky_thuat: string | null;
  ghi_chu: string | null;
  ly_do_huy: string | null;
  tong_gia_tri: number;
  phien_ban: number;
  f3_yeu_cau_moi?: boolean;
  trao_doi?: Array<{ id: string; noi_dung: string; nguoi_gui: string; ten_nguoi_gui: string | null; thoi_diem: string }>;
  tep?: Array<{ id: string; ten_tep: string; kich_thuoc: number | null; loai_mime: string | null; nguoi_tai_len: string; thoi_diem: string }>;
  dong: DongPhieuDatNgoai[];
  lich_su: Array<{
    trang_thai_cu: string | null;
    trang_thai_moi: string;
    noi_dung: string | null;
    nguoi_thuc_hien: string;
    thoi_diem: string;
  }>;
}

export interface NhaCungCapDanhMuc {
  ma: string;
  ma_ncc: string;
  ten: string;
  mst?: string | null;
  dia_chi?: string | null;
  nguoi_lien_he?: string | null;
  sdt?: string | null;
  email?: string | null;
  ghi_chu?: string | null;
  ngay_phe_duyet?: string | null;
  dinh_muc_thang?: number | null;
  da_dat_thang?: number | null;
  ghi_chu_dinh_muc?: string | null;
  nhom_hang_chi_tiet?: string[] | null;
  la_ncc_mua_hang: boolean;
  la_ncc_gia_cong: boolean;
  da_phe_duyet: boolean;
  trang_thai: string;
  phien_ban?: number;
}

export interface DuLieuNhaCungCap {
  ma_ncc?: string;
  ten: string;
  mst?: string;
  dia_chi?: string;
  nguoi_lien_he?: string;
  sdt?: string;
  email?: string;
  la_ncc_mua_hang: boolean;
  la_ncc_gia_cong: boolean;
  da_phe_duyet: boolean;
  trang_thai: string;
  ghi_chu?: string;
  dinh_muc_thang?: number | null;
  ghi_chu_dinh_muc?: string | null;
  nhom_hang_chi_tiet?: string[] | null;
  xac_nhan_trung?: boolean;
}

export interface NhaCungCapQuanLy extends NhaCungCapDanhMuc { phien_ban: number }

export async function layPhieuDatNgoai() {
  return api<PhieuDatNgoai[]>('/api/v1/dat-ngoai');
}

export async function layNhaCungCapDatNgoai() {
  return api<NhaCungCapDanhMuc[]>('/api/v1/dat-ngoai/nha-cung-cap');
}

export async function chonNhaCungCapDatNgoai(phieu: PhieuDatNgoai, idNcc: string) {
  return api<PhieuDatNgoai>(`/api/v1/dat-ngoai/${encodeURIComponent(phieu.id)}/nha-cung-cap`, {
    method: 'PATCH', body: JSON.stringify({ id_ncc: idNcc, phien_ban: phieu.phien_ban }),
  });
}

export async function guiDuyetDatNgoai(phieu: PhieuDatNgoai) {
  return api<PhieuDatNgoai>(`/api/v1/dat-ngoai/${encodeURIComponent(phieu.id)}/gui-duyet`, { method: 'POST', body: JSON.stringify({ phien_ban: phieu.phien_ban }) });
}

export async function capNhatYeuCauDongDatNgoai(phieuId: string, dongId: string, input: { noi_dung_gia_cong: string; yeu_cau_ky_thuat: string; yeu_cau_chat_luong: string }) {
  return api<DongPhieuDatNgoai>(`/api/v1/dat-ngoai/${encodeURIComponent(phieuId)}/dong/${encodeURIComponent(dongId)}/yeu-cau`, { method: 'PATCH', body: JSON.stringify(input) });
}

export async function ghiXacNhanKyThuatDong(phieuId: string, input: { id_dat_ngoai_dong: string; noi_dung: string; ket_qua: string; ghi_chu?: string }) {
  return api(`/api/v1/dat-ngoai/${encodeURIComponent(phieuId)}/xac-nhan-ky-thuat`, { method: 'POST', body: JSON.stringify(input) });
}

export async function ghiDotGiaoDatNgoai(phieuId: string, input: { id_dat_ngoai_dong: string; lan_giao: number; ngay_du_kien: string; so_luong_du_kien?: number; ngay_thuc_te?: string; so_luong_thuc_te?: number; ghi_chu?: string }) {
  return api(`/api/v1/dat-ngoai/${encodeURIComponent(phieuId)}/dot-giao`, { method: 'POST', body: JSON.stringify(input) });
}

export async function ganSuCoDatNgoai(phieuId: string, id_dat_ngoai_dong: string, id_su_co: string) {
  return api(`/api/v1/dat-ngoai/${encodeURIComponent(phieuId)}/gan-su-co`, { method: 'POST', body: JSON.stringify({ id_dat_ngoai_dong, id_su_co }) });
}

export async function doiMaDatNgoai(phieuId: string, dongId: string, ma_hang_thay_the: string, ly_do: string) {
  return api(`/api/v1/dat-ngoai/${encodeURIComponent(phieuId)}/dong/${encodeURIComponent(dongId)}/doi-ma`, { method: 'PATCH', body: JSON.stringify({ ma_hang_thay_the, ly_do }) });
}

export async function themTraoDoiDatNgoai(phieuId: string, noi_dung: string) {
  return api(`/api/v1/dat-ngoai/${encodeURIComponent(phieuId)}/trao-doi`, { method: 'POST', body: JSON.stringify({ noi_dung }) });
}

export async function taiTepDatNgoai(phieuId: string, file: File) {
  const headers = new Headers(); headers.set('Accept', 'application/json');
  const token = layToken(); if (token) headers.set('X-Phien', token);
  const body = new FormData(); body.append('tep', file);
  const response = await fetch(`/api/v1/dat-ngoai/${encodeURIComponent(phieuId)}/tep`, { method: 'POST', headers, body });
  const result = await response.json() as ApiEnvelope<unknown>;
  if (!response.ok || !result.ok) throw new ApiError(result.error || 'Không tải được tệp.', result.ma_loi, response.status);
  return result.data;
}

export async function taiNoiDungTepDatNgoai(phieuId: string, tepId: string) {
  const headers = new Headers(); headers.set('Accept', '*/*');
  const token = layToken(); if (token) headers.set('X-Phien', token);
  const response = await fetch(`/api/v1/dat-ngoai/${encodeURIComponent(phieuId)}/tep/${encodeURIComponent(tepId)}`, { headers });
  if (!response.ok) throw new ApiError('Không tải được tệp.', null, response.status);
  return response.blob();
}

export async function layHangDoiKyThuatDatNgoai() {
  return api<PhieuDatNgoai[]>('/api/v1/dat-ngoai/hang-doi-ky-thuat');
}

export async function xacNhanKyThuatDatNgoai(phieu: PhieuDatNgoai, noiDung?: string) {
  return chuyenTrangThaiDatNgoai(phieu, 'DANG_BAO_GIA', noiDung);
}

export async function chuyenTrangThaiDatNgoai(phieu: PhieuDatNgoai, trangThai: string, noiDung?: string) {
  return api<PhieuDatNgoai>(`/api/v1/dat-ngoai/${encodeURIComponent(phieu.id)}/chuyen-trang-thai`, {
    method: 'POST', body: JSON.stringify({ phien_ban: phieu.phien_ban, trang_thai: trangThai, noi_dung: noiDung }),
  });
}

export async function taoBaoGiaDatNgoai(input: { ma_vach: string[]; can_xac_nhan_ky_thuat?: boolean; noi_dung_ky_thuat?: string; ghi_chu?: string; id_ncc?: string; ky_han?: string; noi_dung_gia_cong?: string; yeu_cau_ky_thuat?: string; yeu_cau_chat_luong?: string }) {
  return api<{ so_phieu: number }>('/api/v1/dat-ngoai', { method: 'POST', body: JSON.stringify(input) });
}

export async function layNhaCungCapDanhMuc() {
  return layDanhSachNhaCungCap(1, 100);
}

export async function layDanhSachNhaCungCap(trang = 1, kichThuoc = 25) {
  const params = new URLSearchParams({ trang: String(trang), kich_thuoc: String(kichThuoc) });
  const result = await api<{ items: NhaCungCapQuanLy[]; tong: number; trang: number; kich_thuoc: number } | null>(`/api/v1/nha-cung-cap?${params}`);
  if (!result || !Array.isArray(result.items) || typeof result.tong !== 'number') {
    throw new ApiError('Máy chủ trả về danh sách nhà cung cấp không hợp lệ. Hãy khởi động lại backend và thử tải lại.', 'NCC_DANH_SACH_RONG', 502);
  }
  return result;
}

export async function taoNhaCungCap(duLieu: DuLieuNhaCungCap) {
  return api<{ da_luu: boolean; can_xac_nhan?: boolean; canh_bao_trung?: unknown[]; item?: NhaCungCapQuanLy }>(
    '/api/v1/nha-cung-cap', { method: 'POST', headers: idempotencyHeaders(), body: JSON.stringify(duLieu) },
  );
}

export async function suaNhaCungCap(id: string, duLieu: Partial<DuLieuNhaCungCap>, phienBan: number) {
  return api<{ da_luu: boolean; can_xac_nhan?: boolean; canh_bao_trung?: unknown[]; item?: NhaCungCapQuanLy }>(
    `/api/v1/nha-cung-cap/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: JSON.stringify({ ...duLieu, phien_ban: phienBan }) },
  );
}


export interface MatHangNcc {
  id: string;
  id_ncc: string;
  ma_ncc: string;
  ten_ncc: string;
  ma_vat_tu: string | null;
  ten_hang: string;
  loai: 'HANG_HOA' | 'GIA_CONG';
  nhom_hang_chinh: string | null;
  nhom_hang_chi_tiet: string | null;
  ma_loai_gia_cong: string | null;
  ma_cong_doan: string | null;
  dvt: string;
  ten_nhom_hang_chinh?: string | null;
  ten_nhom_hang_chi_tiet?: string | null;
  ten_loai_gia_cong?: string | null;
  ten_dvt?: string | null;
  thong_so_ky_thuat: string | null;
  diem_ky_thuat: number | null;
  muc_chat_luong: string | null;
  diem_chat_luong: number | null;
  nang_luc_thang: number | null;
  so_ngay_giao_chuan: number | null;
  trang_thai: 'DE_XUAT' | 'DA_DUYET' | 'TAM_NGUNG';
  nguoi_de_xuat: string | null;
  ngay_de_xuat: string | null;
  nguoi_duyet: string | null;
  ngay_duyet: string | null;
  ghi_chu: string | null;
  phien_ban: number;
}

export type DuLieuMatHangNcc = Omit<MatHangNcc, 'id' | 'ma_ncc' | 'ten_ncc' | 'ten_nhom_hang_chinh' | 'ten_nhom_hang_chi_tiet' | 'ten_loai_gia_cong' | 'ten_dvt' | 'nguoi_duyet' | 'ngay_duyet' | 'phien_ban'> & {
  id_ncc?: string;
};

export async function layDanhSachMatHangNcc(options: {
  idNcc?: string; q?: string; loai?: string; nhomHangChinh?: string;
  nhomHangChiTiet?: string; maLoaiGiaCong?: string; mucChatLuong?: string;
  trangThai?: string; trang?: number; kichThuoc?: number;
} = {}) {
  const params = new URLSearchParams({
    trang: String(options.trang || 1), kich_thuoc: String(options.kichThuoc || 100),
  });
  if (options.idNcc) params.set('id_ncc', options.idNcc);
  if (options.q) params.set('q', options.q);
  if (options.loai) params.set('loai', options.loai);
  if (options.nhomHangChinh) params.set('nhom_hang_chinh', options.nhomHangChinh);
  if (options.nhomHangChiTiet) params.set('nhom_hang_chi_tiet', options.nhomHangChiTiet);
  if (options.maLoaiGiaCong) params.set('ma_loai_gia_cong', options.maLoaiGiaCong);
  if (options.mucChatLuong) params.set('muc_chat_luong', options.mucChatLuong);
  if (options.trangThai) params.set('trang_thai', options.trangThai);
  return api<{ items: MatHangNcc[]; tong: number; trang: number; kich_thuoc: number }>(`/api/v1/mat-hang-ncc?${params}`);
}

export async function taoMatHangNcc(idNcc: string, input: DuLieuMatHangNcc) {
  return api<{ da_luu: boolean; item: MatHangNcc }>(`/api/v1/nha-cung-cap/${encodeURIComponent(idNcc)}/mat-hang`, {
    method: 'POST', body: JSON.stringify({ ...input, id_ncc: idNcc }),
  });
}

export async function suaMatHangNcc(id: string, input: Partial<DuLieuMatHangNcc>, phienBan: number) {
  return api<{ da_luu: boolean; item: MatHangNcc }>(`/api/v1/mat-hang-ncc/${encodeURIComponent(id)}`, {
    method: 'PATCH', body: JSON.stringify({ ...input, phien_ban: phienBan }),
  });
}

export async function duyetMatHangNcc(id: string, phienBan: number, trangThai = 'DA_DUYET') {
  return api<{ da_luu: boolean; item: MatHangNcc }>(`/api/v1/mat-hang-ncc/${encodeURIComponent(id)}/duyet`, {
    method: 'POST', body: JSON.stringify({ phien_ban: phienBan, trang_thai: trangThai }),
  });
}


export interface DanhGiaNcc {
  id: string;
  id_ncc: string;
  id_mat_hang_ncc: string | null;
  ma_ncc?: string;
  ten_ncc?: string;
  ten_hang?: string | null;
  ma_vat_tu?: string | null;
  loai: string;
  ngay_danh_gia: string;
  diem_chat_luong: number | null;
  diem_giao_hang: number | null;
  diem_gia_ca: number | null;
  diem_tam_voc: number | null;
  diem_thanh_toan: number | null;
  diem_dich_vu: number | null;
  diem_thoi_gian_hop_tac: number | null;
  diem_gia_tri_giao_dich: number | null;
  diem_tong: number | null;
  ket_luan_bm06: string | null;
  trang_thai: 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI';
  ty_le_dung_han: number | null;
  ty_le_iqc_dat: number | null;
  so_lan_khong_phu_hop: number | null;
  ghi_chu: string | null;
  phien_ban: number;
}

export async function layDanhSachDanhGiaNcc(options: { idMatHang?: string; trangThai?: string } = {}) {
  const params = new URLSearchParams({ trang: '1', kich_thuoc: '200' });
  if (options.idMatHang) params.set('id_mat_hang', options.idMatHang);
  if (options.trangThai) params.set('trang_thai', options.trangThai);
  return api<{ items: DanhGiaNcc[]; tong: number }>(`/api/v1/danh-gia-ncc?${params}`);
}

export interface MatHangNccDenHan {
  id: string;
  id_ncc: string;
  ma_ncc: string;
  ten_ncc: string;
  ma_vat_tu: string | null;
  ten_hang: string;
  loai: string;
  ngay_cham_gan_nhat: string | null;
  ngay_den_han: string | null;
  so_ngay_qua_han: number | null;
}

export async function layDanhSachMatHangNccDenHan(trang = 1, kichThuoc = 100) {
  const params = new URLSearchParams({ trang: String(trang), kich_thuoc: String(kichThuoc) });
  return api<{ items: MatHangNccDenHan[]; tong: number; trang: number; kich_thuoc: number }>(
    `/api/v1/danh-gia-ncc/den-han?${params}`,
  );
}

export interface SuCoNcc {
  id: string;
  id_ncc: string | null;
  ma_ncc: string | null;
  ten_ncc: string | null;
  ngay_nhan: string;
  ten_hang_chup: string;
  ma_vat_tu: string | null;
  mo_ta: string;
  huong_xu_ly: string | null;
  ket_qua: string | null;
  nguoi_giam_sat: string | null;
  ten_nguoi_giam_sat: string | null;
  ngay_dong: string | null;
  trang_thai: string;
}

export async function laySoTheoDoiNcc(options: {
  idNcc?: string; trangThai?: string; q?: string; trang?: number; kichThuoc?: number;
} = {}) {
  const params = new URLSearchParams({
    trang: String(options.trang || 1), kich_thuoc: String(options.kichThuoc || 100),
  });
  if (options.idNcc) params.set('id_ncc', options.idNcc);
  if (options.trangThai) params.set('trang_thai', options.trangThai);
  if (options.q) params.set('q', options.q);
  return api<{ items: SuCoNcc[]; tong: number; trang: number; kich_thuoc: number }>(
    `/api/v1/so-theo-doi-ncc?${params}`,
  );
}

export async function taoDanhGiaNcc(input: {
  id_mat_hang_ncc: string; loai?: string; ky_danh_gia?: string;
  ngay_danh_gia?: string; diem_gia_ca?: number; diem_tam_voc?: number;
  diem_thanh_toan?: number; diem_dich_vu?: number; ghi_chu?: string;
}) {
  return api<{ da_luu: boolean; item: DanhGiaNcc; kpi?: Record<string, unknown> }>('/api/v1/danh-gia-ncc', {
    method: 'POST', body: JSON.stringify(input),
  });
}


export async function kiemTraDinhMucNcc(idNcc: string, giaTriDon: number, ngayDat?: string) {
  return api<{ id_ncc: string; ma_ncc: string; ten_ncc: string; dinh_muc_thang: number | null; da_dat_thang: number; con_lai: number | null; gia_tri_don: number; vuot_dinh_muc: boolean; co_ap_dung: boolean }>(`/api/v1/nha-cung-cap/${encodeURIComponent(idNcc)}/kiem-tra-dinh-muc`, {
    method: 'POST', body: JSON.stringify({ gia_tri_don: giaTriDon, ngay_dat: ngayDat }),
  });
}

export async function duyetDanhGiaNcc(id: string, phienBan: number, trangThai = 'DA_DUYET') {
  return api<{ da_luu: boolean; item: DanhGiaNcc }>(`/api/v1/danh-gia-ncc/${encodeURIComponent(id)}/duyet`, {
    method: 'POST', body: JSON.stringify({ phien_ban: phienBan, trang_thai: trangThai }),
  });
}

export async function luuBaoGiaDatNgoai(phieu: PhieuDatNgoai, input: {
  ky_han: string | null; ghi_chu: string | null;
  dong: Array<{ id: string; don_gia: number; ghi_chu: string | null }>;
}) {
  return api(`/api/v1/dat-ngoai/${encodeURIComponent(phieu.id)}/bao-gia`, {
    method: 'PATCH', body: JSON.stringify({ ...input, phien_ban: phieu.phien_ban, ten_ncc: phieu.ten_ncc_chup }),
  });
}


export async function nhapNhaCungCapHangLoat(
  payload: string,
  pending: { current: { payload: string; headers: Record<string, string> } | null },
) {
  // Giữ khóa khi lỗi mạng để lần thử lại nhận đúng kết quả đã lưu.
  if (!pending.current || pending.current.payload !== payload) {
    pending.current = { payload, headers: idempotencyHeaders() };
  }
  const result = await api<{ so_dong: number; results: Array<{
    dong: number; da_luu: boolean; can_xac_nhan?: boolean; canh_bao_trung?: unknown[]; loi?: string;
  }> }>('/api/v1/nha-cung-cap/nhap-hang-loat', {
    method: 'POST', headers: pending.current.headers, body: payload,
  }, 120000);
  pending.current = null;
  return result;
}
