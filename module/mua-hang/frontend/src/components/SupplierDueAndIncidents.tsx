import { SupplierFormDownload } from './SupplierFormDownload';
import { useEffect, useState } from 'react';
import { DanhGiaNccDenHan, layDanhGiaNccDenHan, laySoBm08, SuCoNccBm08 } from '../api/client';

export function SupplierDuePanel() {
  const [rows, setRows] = useState<DanhGiaNccDenHan[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { layDanhGiaNccDenHan().then(setRows).catch((reason) =>
    setError(reason instanceof Error ? reason.message : 'Không tải được danh sách đến hạn.')); }, []);
  return <section className="bg-white border rounded p-4 space-y-3"><h2 className="font-bold">ĐÁNH GIÁ ĐẾN HẠN · {rows.length} MẶT HÀNG</h2>
    <SupplierFormDownload form="BM07" />
    {error && <p role="alert" className="p-3 bg-[#FDECEE] text-[#C4141F] rounded">{error}</p>}
    <div className="overflow-x-auto border rounded"><table className="w-full min-w-[800px] text-sm"><thead className="bg-[#F4F6FA]"><tr>{['NHÀ CUNG CẤP', 'NHÓM / MÃ CŨ', 'MẶT HÀNG', 'CHẤM GẦN NHẤT', 'ĐIỂM', 'ĐẾN HẠN'].map((head) => <th key={head} className="p-3 text-left">{head}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t"><td className="p-3">{row.ten_ncc}</td><td className="p-3 font-mono">{row.pham_vi_danh_gia === 'NHOM_HANG' ? (row.nhom_hang_chi_tiet || row.nhom_hang_chinh || row.ma_cong_doan || row.ma_loai_gia_cong) : (row.ma_vat_tu || '—')}</td><td className="p-3">{row.ten_hang}</td><td className="p-3">{row.ngay_cham_gan_nhat || 'Chưa chấm'}</td><td className="p-3">{row.diem_tong ?? '—'}</td><td className="p-3 text-[#C4141F]">{row.ngay_den_han || 'Cần chấm lần đầu'}</td></tr>)}</tbody></table>{rows.length === 0 && !error && <p className="p-6 text-center text-sm">Không có mặt hàng quá hạn.</p>}</div>
  </section>;
}

export function SupplierIncidentsPanel() {
  const [rows, setRows] = useState<SuCoNccBm08[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { laySoBm08().then(setRows).catch((reason) =>
    setError(reason instanceof Error ? reason.message : 'Không tải được sổ BM08.')); }, []);
  return <section className="bg-white border rounded p-4 space-y-3"><h2 className="font-bold">SỔ THEO DÕI TÌNH TRẠNG NCC · BM08</h2>
    <SupplierFormDownload form="BM08" />
    {error && <p role="alert" className="p-3 bg-[#FDECEE] text-[#C4141F] rounded">{error}</p>}
    <div className="overflow-x-auto border rounded"><table className="w-full min-w-[1100px] text-sm"><thead className="bg-[#F4F6FA]"><tr>{['NGÀY', 'NCC', 'MÃ HÀNG', 'VẤN ĐỀ', 'HƯỚNG XỬ LÝ', 'KẾT QUẢ', 'ĐẠT / KHÔNG ĐẠT', 'GIÁM SÁT'].map((head) => <th key={head} className="p-3 text-left">{head}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t"><td className="p-3">{row.ngay_nhan}</td><td className="p-3">{row.ten_ncc || '—'}</td><td className="p-3">{row.ma_vat_tu || '—'} · {row.ten_hang}</td><td className="p-3">{row.van_de}</td><td className="p-3">{row.huong_xu_ly || '—'}</td><td className="p-3">{row.ket_qua || '—'}</td><td className="p-3">{row.ket_luan_bm08}</td><td className="p-3">{row.nguoi_giam_sat || '—'}</td></tr>)}</tbody></table>{rows.length === 0 && !error && <p className="p-6 text-center text-sm">Chưa có sự cố nhà cung cấp.</p>}</div>
  </section>;
}
