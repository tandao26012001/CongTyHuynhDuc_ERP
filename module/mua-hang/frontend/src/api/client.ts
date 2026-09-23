const TOKEN_KEY = 'hd_phien';
const API_TIMEOUT_MS = 15_000;

export interface HoSo {
  ma_tai_khoan: string;
  ma_nhan_vien: string;
  ho_va_ten: string;
  ma_bo_phan: string;
  vai_tro: string;
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

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
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
  }, API_TIMEOUT_MS);

  try {
    const response = await fetch(path, { ...init, headers, signal: controller.signal });
    const result = await response.json() as ApiEnvelope<T>;
    if (!response.ok || !result.ok) {
      if (response.status === 401) luuToken('');
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
  return data.ho_so;
}

export async function layHoSo() {
  return api<HoSo>('/api/v1/toi');
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
  trang_thai?: string;
}

export async function layDanhSachVatTu(trang = 1, kichThuoc = 25, boLoc: BoLocVatTu = {}) {
  const params = new URLSearchParams({ trang: String(trang), kich_thuoc: String(kichThuoc) });
  const mapping: Record<keyof BoLocVatTu, string> = {
    tu_khoa: 'q', ma_vat_tu: 'ma_vat_tu', ten_hang: 'ten_hang', dvt: 'dvt', trang_thai: 'trang_thai',
  };
  for (const [key, apiKey] of Object.entries(mapping)) {
    const value = boLoc[key as keyof BoLocVatTu]?.trim();
    if (value) params.set(apiKey, value);
  }
  return api<{ items: VatTuTraCuu[]; tong: number; trang: number; kich_thuoc: number }>(
    `/api/v1/vat-tu?${params.toString()}`,
  );
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

export async function taoVatTu(input: { ma_vat_tu: string; ten_hang: string; dvt: string; quy_cach?: string }) {
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
  const result = await api<{ items: ChungLoai[] }>('/api/v1/danh-muc/chung-loai?trang=1&kich_thuoc=100');
  return result.items;
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
