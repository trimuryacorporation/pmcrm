import { Check, Search } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';

export default function SearchableSelect({ value = '', options = [], placeholder, onChange, invalid = false }) {
  const listId = useId();
  const normalizedOptions = useMemo(() => options.map((option) => (
    typeof option === 'object' ? option : { value: option, label: option }
  )), [options]);
  const selected = normalizedOptions.find((option) => option.value === value);
  const [query, setQuery] = useState(selected?.label || value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const match = normalizedOptions.find((option) => option.value === value);
    setQuery(match?.label || value || '');
  }, [value, normalizedOptions]);

  const matches = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return [];
    return normalizedOptions
      .filter((option) => option.label.toLowerCase().includes(search) || option.value.toLowerCase().includes(search))
      .sort((a, b) => {
        const aStarts = a.label.toLowerCase().startsWith(search);
        const bStarts = b.label.toLowerCase().startsWith(search);
        return Number(bStarts) - Number(aStarts) || a.label.localeCompare(b.label);
      })
      .slice(0, 12);
  }, [normalizedOptions, query]);

  function choose(option) {
    onChange(option.value);
    setQuery(option.label);
    setOpen(false);
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.min(current + 1, matches.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter' && open && matches[activeIndex]) {
      event.preventDefault();
      choose(matches[activeIndex]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        className={`input h-10 pl-9 ${invalid ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : ''}`}
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open}
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => setOpen(Boolean(query.trim()))}
        onBlur={() => window.setTimeout(() => setOpen(false), 100)}
        onChange={(event) => {
          setQuery(event.target.value);
          onChange(event.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
      />
      {open && query.trim() && (
        <div id={listId} role="listbox" className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-xl">
          {matches.map((option, index) => (
            <button
              key={`${option.value}-${option.label}`}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm ${index === activeIndex ? 'bg-indigo-50 text-indigo-800' : 'text-slate-700 hover:bg-slate-50'}`}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(option)}
            >
              <span>{option.label}</span>
              {option.value === value && <Check className="h-4 w-4 shrink-0 text-indigo-600" />}
            </button>
          ))}
          {!matches.length && <p className="px-3 py-3 text-sm text-slate-500">No language found</p>}
        </div>
      )}
    </div>
  );
}
