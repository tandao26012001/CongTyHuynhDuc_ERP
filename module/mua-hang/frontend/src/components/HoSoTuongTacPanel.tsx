import { FormEvent, useEffect, useState } from 'react';
import { ApiError, layTuongTacHoSo, themTepHoSo, themTraoDoiHoSo, taiTepHoSo, TuongTacHoSo } from '../api/client';

export function HoSoTuongTacPanel({ loai, id, canEdit }: {
  loai: 'ncc' | 'dat-ngoai'; id: string; canEdit: boolean;
}) {
  const [data, setData] = useState<TuongTacHoSo | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try { setData(await layTuongTacHoSo(loai, id)); setError(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được trao đổi và tệp.'); }
  }
  useEffect(() => { setData(null); void load(); }, [loai, id]);

  async function send(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { await themTraoDoiHoSo(loai, id, message); setMessage(''); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không gửi được trao đổi.'); }
    finally { setBusy(false); }
  }

  async function upload(file?: File) {
    if (!file) return;
    setBusy(true); setError('');
    try { await themTepHoSo(loai, id, file); await load(); }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Không tải được tệp lên.'); }
    finally { setBusy(false); }
  }

  return <section className="border-t pt-4 space-y-3">
    <h3 className="font-bold">TRAO ĐỔI VÀ TỆP ĐÍNH KÈM</h3>
    {error && <p role="alert" className="p-3 bg-[#FDECEE] text-[#C4141F] rounded">{error}</p>}
    {data?.trao_doi.length ? <div className="max-h-64 overflow-y-auto divide-y border rounded">{data.trao_doi.map((item) => <article key={item.id} className="p-3"><strong>{item.ten_nguoi_gui || item.nguoi_gui}</strong><time className="ml-2 text-xs text-[#59627A]">{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.thoi_diem))}</time><p className="mt-1 whitespace-pre-wrap">{item.noi_dung}</p></article>)}</div> : <p className="text-sm text-[#59627A]">Chưa có trao đổi.</p>}
    {data?.tep.length ? <ul className="space-y-1">{data.tep.map((file) => <li key={file.id} className="flex items-center justify-between gap-2 border rounded px-3 py-2"><span className="truncate">{file.ten_tep} · {Math.ceil(file.kich_thuoc / 1024)} KB</span><button type="button" onClick={() => void taiTepHoSo(loai, id, file.id)} className="min-h-10 px-3 border rounded text-[#283A97]">TẢI TỆP</button></li>)}</ul> : <p className="text-sm text-[#59627A]">Chưa có tệp đính kèm.</p>}
    {canEdit && <><form onSubmit={(event) => void send(event)} className="flex flex-col sm:flex-row gap-2"><textarea required maxLength={5000} value={message} onChange={(event) => setMessage(event.target.value)} className="min-h-11 flex-1 p-2 border rounded" placeholder="Nội dung trao đổi" /><button disabled={busy} className="min-h-11 px-4 bg-[#283A97] text-white rounded font-bold">GỬI</button></form><label className="inline-flex min-h-11 items-center px-4 border rounded text-[#283A97] font-bold cursor-pointer">ĐÍNH KÈM TỆP<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => { void upload(event.target.files?.[0]); event.currentTarget.value = ''; }} className="sr-only" /></label><span className="ml-2 text-xs text-[#59627A]">PDF, JPG, PNG hoặc WEBP; tối đa 10 MB</span></>}
  </section>;
}
