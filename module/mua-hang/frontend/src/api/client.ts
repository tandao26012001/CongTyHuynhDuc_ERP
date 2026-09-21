const TOKEN_KEY = 'hd_phien';

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

  const response = await fetch(path, { ...init, headers });
  const result = await response.json() as ApiEnvelope<T>;
  if (!response.ok || !result.ok) {
    if (response.status === 401) luuToken('');
    throw new ApiError(result.error || 'Không thể kết nối hệ thống.', result.ma_loi, response.status);
  }
  return result.data;
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

export async function layDonViTinh() {
  return api<DonViTinh[]>('/api/v1/don-vi-tinh');
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
