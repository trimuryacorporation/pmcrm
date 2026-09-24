import { Check, Search, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

function normalizeOptions(options) {
  return options.map((option) => (typeof option === 'object' ? option : { value: option, label: option }));
}

export default function MultiSearchableSelect({ value = [], options = [], placeholder, noResultsText = 'No matching option found', onChange, invalid = false }) {
  const listId = useId();
  const inputRef = useRef(null);
  const normalizedOptions = useMemo(() => normalizeOptions(options), [options]);
  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
  const selectedOptions = normalizedOptions.filter((option) => selectedValues.includes(option.value));
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => setQuery(''), [value]);

  const matches = useMemo(() => {
    const search = query.trim().toLowerCase();
    return normalizedOptions
      .filter((option) => !selectedValues.includes(option.value))
      .filter((option) => !search || `${option.label} ${option.value}`.toLowerCase().includes(search))
      .slice(0, 12);
  }, [normalizedOptions, query, selectedValues]);

  function openMenu() {
    setOpen(true);
  }

  function add(option) {
    onChange([...selectedValues, option.value]);
    setQuery('');
    inputRef.current?.focus();
  }

  function remove(optionValue) {
    onChange(selectedValues.filter((value) => value !== optionValue));
  }

  return (
    <div className="relative">
      <div className={`input flex min-h-10 flex-wrap items-center gap-1.5 py-1.5 ${invalid ? 'border-rose-400 focus-within:border-rose-500 focus-within:ring-rose-100' : ''}`}>
        {selectedOptions.map((option) => (
          <span key={option.value} className="inline-flex max-w-full items-center gap-1 rounded-md bg-indigo-50 py-1 pl-2 pr-1 text-xs font-medium text-indigo-700">
            <span className="truncate" title={option.label}>{option.label}</span>
            <button type="button" onClick={() => remove(option.value)} className="rounded p-0.5 hover:bg-indigo-100" aria-label={`Remove ${option.label}`}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <div className="flex min-w-32 flex-1 items-center gap-2">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            role="combobox"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={open}
            value={query}
            placeholder={selectedOptions.length ? 'Add another...' : placeholder}
            autoComplete="off"
            onFocus={openMenu}
            onBlur={() => window.setTimeout(() => setOpen(false), 100)}
            onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
            onKeyDown={(event) => {
              if (event.key === 'Backspace' && !query && selectedValues.length) remove(selectedValues.at(-1));
              if (event.key === 'Enter' && matches[0]) { event.preventDefault(); add(matches[0]); }
              if (event.key === 'Escape') setOpen(false);
            }}
          />
        </div>
      </div>
      {open && (
        <div id={listId} role="listbox" className="scrollbar-thin mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-sm">
          {matches.map((option) => (
            <button key={option.value} type="button" role="option" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-800" onMouseDown={(event) => event.preventDefault()} onClick={() => add(option)}>
              <Check className="h-4 w-4 text-transparent" />
              <span className="truncate" title={option.label}>{option.label}</span>
            </button>
          ))}
          {!matches.length && <div className="px-3 py-4 text-center text-sm text-slate-500">{noResultsText}</div>}
        </div>
      )}
    </div>
  );
}
