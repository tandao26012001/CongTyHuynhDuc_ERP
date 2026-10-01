import { useState } from 'react';
import { LsxDatNgoai } from '../api/client';

export function LsxSearchSelect({ orders, value, onChange }: {
  orders: LsxDatNgoai[];
  value: string;
  onChange: (code: string) => void;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const normalized = query.trim().toLocaleLowerCase('vi-VN');
  const matches = orders.filter((order) => order.lenh_san_xuat.toLocaleLowerCase('vi-VN').includes(normalized));
  const visible = matches.slice(0, 50);

  function select(code: string) {
    setQuery(code);
    onChange(code);
    setOpen(false);
  }

  return <div className="relative">
    <label htmlFor="create-outsource-lsx" className="block text-[11px] font-bold">LỆNH SẢN XUẤT *</label>
    <input
      id="create-outsource-lsx"
      type="text"
      role="combobox"
      aria-autocomplete="list"
      aria-controls="create-outsource-lsx-options"
      aria-expanded={open}
      autoComplete="off"
      value={query}
      placeholder="Nhập mã LSX để tìm hoặc chọn từ danh sách"
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onChange={(event) => {
        const next = event.target.value;
        setQuery(next);
        setActiveIndex(0);
        onChange(orders.find((order) => order.lenh_san_xuat.toLocaleLowerCase('vi-VN') === next.trim().toLocaleLowerCase('vi-VN'))?.lenh_san_xuat || '');
        setOpen(true);
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActiveIndex((index) => Math.min(index + 1, visible.length - 1)); }
        if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); }
        if (event.key === 'Enter' && open && visible.length) { event.preventDefault(); select(visible[activeIndex]?.lenh_san_xuat || visible[0].lenh_san_xuat); }
        if (event.key === 'Escape') setOpen(false);
      }}
      className="mt-1 h-11 w-full rounded border bg-white px-3 text-[14px] font-normal"
    />
    {query && !value && <p className="mt-1 text-[11px] text-[#9A6700]">Chọn một mã LSX trong danh sách gợi ý.</p>}
    {open && <div id="create-outsource-lsx-options" role="listbox" className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded border border-[#DCE1EC] bg-white shadow-lg">
      {visible.length ? visible.map((order, index) => <button
        key={order.lenh_san_xuat}
        type="button"
        role="option"
        aria-selected={order.lenh_san_xuat === value}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => select(order.lenh_san_xuat)}
        className={`block w-full px-3 py-2 text-left text-[13px] hover:bg-[#EEF0F9] ${index === activeIndex ? 'bg-[#EEF0F9]' : ''}`}
      >{order.lenh_san_xuat} · {order.dong.length} mã hàng</button>)
        : <p className="px-3 py-2 text-[12px] text-[#59627A]">Không tìm thấy lệnh sản xuất phù hợp.</p>}
      {matches.length > visible.length && <p className="border-t px-3 py-2 text-[11px] text-[#59627A]">Nhập thêm ký tự để thu hẹp {matches.length} kết quả.</p>}
    </div>}
  </div>;
}
