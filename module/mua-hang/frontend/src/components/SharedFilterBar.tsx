import { FormEvent, useEffect, useMemo, useState } from 'react';

export type FilterValues = Record<string, string>;

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterField {
  key: string;
  label: string;
  type?: 'text' | 'select';
  placeholder?: string;
  options?: FilterOption[];
  className?: string;
}

interface SharedFilterBarProps {
  storageKey: string;
  fields: FilterField[];
  value: FilterValues;
  onApply: (value: FilterValues) => void;
  loading?: boolean;
}

function cleanValues(fields: FilterField[], value: FilterValues) {
  return Object.fromEntries(fields.map((field) => [field.key, String(value[field.key] ?? '')]));
}

export function readStoredFilters(storageKey: string, defaults: FilterValues = {}): FilterValues {
  if (typeof window === 'undefined') return defaults;
  try {
    const stored = window.localStorage.getItem(`bo-loc:${storageKey}`);
    return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
  } catch {
    return defaults;
  }
}

export function SharedFilterBar({ storageKey, fields, value, onApply, loading = false }: SharedFilterBarProps) {
  const [draft, setDraft] = useState<FilterValues>(() => cleanValues(fields, value));
  const activeCount = useMemo(() => Object.values(value).filter((item) => item.trim()).length, [value]);

  useEffect(() => setDraft(cleanValues(fields, value)), [fields, value]);

  function apply(event: FormEvent) {
    event.preventDefault();
    const next = cleanValues(fields, draft);
    window.localStorage.setItem(`bo-loc:${storageKey}`, JSON.stringify(next));
    onApply(next);
  }

  function clear() {
    const next = cleanValues(fields, {});
    window.localStorage.removeItem(`bo-loc:${storageKey}`);
    setDraft(next);
    onApply(next);
  }

  return <form onSubmit={apply} className="shared-filter-bar" aria-label="Bộ lọc danh sách">
    <div className="shared-filter-heading">
      <div>
        <strong className="font-condensed">BỘ LỌC</strong>
        <span>Chỉ hiện các trường phù hợp với danh mục này</span>
      </div>
      {activeCount > 0 && <span className="pill p-b px-2 py-1 text-[11px]">{activeCount} điều kiện</span>}
    </div>
    <div className="shared-filter-fields">
      {fields.map((field) => <label key={field.key} className={field.className || ''}>
        <span>{field.label}</span>
        {field.type === 'select' ? <select
          value={draft[field.key] || ''}
          onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}
          className="shared-filter-control"
        >
          <option value="">Tất cả</option>
          {(field.options || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select> : <input
          value={draft[field.key] || ''}
          onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}
          className="shared-filter-control"
          placeholder={field.placeholder}
        />}
      </label>)}
      <div className="shared-filter-actions">
        <button type="submit" disabled={loading} className="shared-filter-primary">
          <span className="material-symbols-outlined">filter_alt</span>{loading ? 'ĐANG LỌC…' : 'ÁP DỤNG'}
        </button>
        <button type="button" disabled={loading || activeCount === 0} onClick={clear} className="shared-filter-clear">
          XOÁ LỌC
        </button>
      </div>
    </div>
  </form>;
}
