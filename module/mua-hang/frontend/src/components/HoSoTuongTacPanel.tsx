import { FormEvent, useEffect, useRef, useState } from 'react';
import { ApiError, layNguoiCoTheTag, NguoiTag, layTuongTacHoSo, themTepHoSo, themTraoDoiHoSo, taiTepHoSo, TuongTacHoSo } from '../api/client';

export function HoSoTuongTacPanel({ loai, id, canEdit }: {
  loai: 'ncc' | 'dat-ngoai'; id: string; canEdit: boolean;
}) {
  const [data, setData] = useState<TuongTacHoSo | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [people, setPeople] = useState<NguoiTag[]>([]);
  const [tagged, setTagged] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [showTags, setShowTags] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mentionRange = useRef<{ start: number; end: number } | null>(null);
  const canChat = canEdit || data?.co_the_trao_doi === true;

  function updateMention(text: string, cursor: number) {
    const match = /(?:^|\s)@([^@\n]*)$/.exec(text.slice(0, cursor));
    mentionRange.current = match ? { start: cursor - match[1].length - 1, end: cursor } : null;
    setSearch(match?.[1] || '');
    setShowTags(!!match);
  }

  function choosePerson(person: NguoiTag) {
    const input = inputRef.current;
    const range = mentionRange.current || { start: input?.selectionStart ?? message.length, end: input?.selectionEnd ?? message.length };
    const token = `@${person.ho_va_ten} `;
    setMessage(message.slice(0, range.start) + token + message.slice(range.end));
    setTagged((ids) => ids.includes(person.ma_nhan_vien) ? ids : [...ids, person.ma_nhan_vien]);
    setShowTags(false); mentionRange.current = null;
    requestAnimationFrame(() => { input?.focus(); input?.setSelectionRange(range.start + token.length, range.start + token.length); });
  }

  function renderMessage(text: string, mentions: { ho_va_ten: string }[] = []) {
    const names = [...new Set(mentions.map((person) => `@${person.ho_va_ten}`))].sort((a, b) => b.length - a.length);
    if (!names.length) return text;
    const pattern = new RegExp('(' + names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'g');
    return text.split(pattern).map((part, index) => names.includes(part) ? <span key={index} className="rounded bg-[#EEF0F9] px-1 font-semibold text-[#283A97]">{part}</span> : part);
  }

  async function load() {
    try { setData(await layTuongTacHoSo(loai, id)); setError(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được trao đổi và tệp.'); }
  }
  useEffect(() => {
    setData(null); void load();
    const timer = globalThis.setInterval(() => void load(), 15_000);
    return () => globalThis.clearInterval(timer);
  }, [loai, id]);
  useEffect(() => {
    let active = true;
    setPeople([]); setTagged([]); setSearch(''); setShowTags(false); setMessage('');
    if (canChat) void layNguoiCoTheTag(loai, id).then((rows) => { if (active) setPeople(rows); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Không tải được danh sách tag.'); });
    return () => { active = false; };
  }, [loai, id, canChat]);

  async function send(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { await themTraoDoiHoSo(loai, id, message, tagged.filter((ma) => people.some((person) => person.ma_nhan_vien === ma && message.includes(`@${person.ho_va_ten}`)))); setMessage(''); setTagged([]); setShowTags(false); mentionRange.current = null; await load(); }
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
    {data?.trao_doi.length ? <div className="max-h-64 overflow-y-auto divide-y border rounded">{data.trao_doi.map((item) => <article key={item.id} className="p-3"><strong>{item.ten_nguoi_gui || item.nguoi_gui}</strong><time className="ml-2 text-xs text-[#59627A]">{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.thoi_diem))}</time><p className="mt-1 whitespace-pre-wrap break-words">{renderMessage(item.noi_dung, item.nguoi_duoc_tag)}</p>{!!item.nguoi_duoc_tag?.some((person) => !item.noi_dung.includes(`@${person.ho_va_ten}`)) && <p className="mt-2 text-xs text-[#283A97]">{item.nguoi_duoc_tag.filter((person) => !item.noi_dung.includes(`@${person.ho_va_ten}`)).map((person) => `@${person.ho_va_ten}`).join(', ')}</p>}</article>)}</div> : <p className="text-sm text-[#59627A]">Chưa có trao đổi.</p>}
    {data?.tep.length ? <ul className="space-y-1">{data.tep.map((file) => <li key={file.id} className="flex items-center justify-between gap-2 border rounded px-3 py-2"><span className="truncate">{file.ten_tep} · {Math.ceil(file.kich_thuoc / 1024)} KB</span><button type="button" onClick={() => void taiTepHoSo(loai, id, file.id)} className="min-h-10 px-3 border rounded text-[#283A97]">TẢI TỆP</button></li>)}</ul> : <p className="text-sm text-[#59627A]">Chưa có tệp đính kèm.</p>}
    {canChat && <form onSubmit={(event) => void send(event)} className="flex flex-col sm:flex-row gap-2">
      <div className="relative min-w-0 flex-1">
        {showTags && <div className="absolute bottom-full left-0 z-10 mb-2 w-full max-h-56 overflow-y-auto rounded border border-[#DCE1EC] bg-white p-2 shadow-lg">
          <p className="px-2 py-1 text-xs text-[#59627A]">Chọn nhân viên để chèn vào nội dung</p>
          {people.filter((person) => `${person.ho_va_ten} ${person.ma_nhan_vien} ${person.ten_bo_phan || person.ma_bo_phan} ${person.vai_tro}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))).map((person) => <button key={person.ma_nhan_vien} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => choosePerson(person)} className="block w-full rounded px-2 py-2 text-left text-sm hover:bg-[#EEF0F9]"><strong className="text-[#283A97]">{person.ho_va_ten}</strong><span className="block text-xs text-[#59627A]">{person.ma_nhan_vien} · {person.ten_bo_phan || person.ma_bo_phan} · {person.vai_tro}</span></button>)}
          {!people.some((person) => `${person.ho_va_ten} ${person.ma_nhan_vien} ${person.ten_bo_phan || person.ma_bo_phan} ${person.vai_tro}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))) && <p className="p-2 text-sm text-[#59627A]">Không tìm thấy nhân viên phù hợp.</p>}
        </div>}
        <textarea ref={inputRef} aria-label="Nội dung trao đổi" required disabled={busy} maxLength={5000} value={message} onChange={(event) => {
          const text = event.target.value;
          setMessage(text);
          setTagged((ids) => ids.filter((ma) => people.some((person) => person.ma_nhan_vien === ma && text.includes(`@${person.ho_va_ten}`))));
          updateMention(text, event.target.selectionStart);
        }} onClick={(event) => updateMention(message, event.currentTarget.selectionStart)} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); setShowTags(false); } }} className="block min-h-20 w-full p-2 border rounded" placeholder="Nhập nội dung trao đổi, gõ @ để tag nhân viên…" />
      </div>
      <button disabled={busy || !message.trim()} className="min-h-11 px-4 bg-[#283A97] text-white rounded font-bold disabled:opacity-50">GỬI</button>
    </form>}
    {canEdit && <><label className="inline-flex min-h-11 items-center px-4 border rounded text-[#283A97] font-bold cursor-pointer">ĐÍNH KÈM TỆP<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => { void upload(event.target.files?.[0]); event.currentTarget.value = ''; }} className="sr-only" /></label><span className="ml-2 text-xs text-[#59627A]">PDF, JPG, PNG hoặc WEBP; tối đa 10 MB</span></>}
  </section>;
}
