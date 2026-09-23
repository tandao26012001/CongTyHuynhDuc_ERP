import { useMemo, useState } from 'react';

export function useRowSelection(rowIds: string[]) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const activeSelected = useMemo(
    () => new Set(rowIds.filter((id) => selected.has(id))),
    [rowIds, selected]
  );
  const allSelected = rowIds.length > 0 && activeSelected.size === rowIds.length;

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rowIds));
  }

  return {
    selected: activeSelected,
    selectedCount: activeSelected.size,
    allSelected,
    toggle,
    toggleAll,
    clearSelection: () => setSelected(new Set<string>())
  };
}

export function SelectionCheckbox({ checked, onChange, label }: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return <input
    type="checkbox"
    checked={checked}
    onChange={onChange}
    aria-label={label}
    className="w-4 h-4 accent-[#283A97] cursor-pointer"
  />;
}

export function RowSelectionActions({
  total,
  selectedCount,
  allSelected,
  onToggleAll,
  onDeleteSelected,
  onDeleteAll,
  disabled = false
}: {
  total: number;
  selectedCount: number;
  allSelected: boolean;
  onToggleAll: () => void;
  onDeleteSelected: () => void;
  onDeleteAll: () => void;
  disabled?: boolean;
}) {
  if (!total) return null;
  return <div className="flex flex-wrap items-center gap-2 p-2 bg-[#F4F6FA] border border-[#DCE1EC] rounded text-[12px]">
    <label className="min-h-10 px-2 flex items-center gap-2 cursor-pointer font-bold text-[#0E1220]">
      <SelectionCheckbox checked={allSelected} onChange={onToggleAll} label="Chọn tất cả dòng" />
      Chọn tất cả ({total})
    </label>
    <span className="text-[#59627A]">Đã chọn: <strong>{selectedCount}</strong></span>
    <div className="ml-auto flex flex-wrap gap-2">
      <button type="button" disabled={disabled || selectedCount === 0} onClick={onDeleteSelected} className="min-h-10 px-3 border border-[#EE202E] text-[#C4141F] rounded font-bold disabled:opacity-40">
        XÓA ĐÃ CHỌN ({selectedCount})
      </button>
      <button type="button" disabled={disabled || total === 0} onClick={onDeleteAll} className="min-h-10 px-3 bg-[#EE202E] text-white rounded font-bold disabled:opacity-40">
        XÓA TẤT CẢ
      </button>
    </div>
  </div>;
}

export function confirmDeleteRows(count: number, noun = 'dòng') {
  return window.confirm(`Bạn chắc chắn muốn xoá ${count} ${noun} đã chọn? Thao tác này không thể hoàn tác.`);
}
