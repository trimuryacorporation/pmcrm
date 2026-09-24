import { Check, Search } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

function splitLabel(label) {
  const separator = label.indexOf(' - ');
  return separator === -1
    ? { group: '', name: label }
    : { group: label.slice(0, separator), name: label.slice(separator + 3) };
}

export default function SearchableSelect({ value = '', options = [], placeholder, noResultsText = 'No matching option found', onChange, invalid = false }) {
  const listId = useId();
  const inputRef = useRef(null);
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
    const terms = search.replace(/[-(),]/g, ' ').split(/\s+/).filter(Boolean);
    return normalizedOptions
      .filter((option) => {
        const searchable = `${option.label} ${option.value}`.toLowerCase().replace(/[-(),]/g, ' ');
        return terms.every((term) => searchable.includes(term));
      })
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

  function openMenu(queryValue) {
    if (!queryValue.trim()) return;
    setOpen(true);
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      openMenu(query);
      if (matches.length) setActiveIndex((current) => Math.min(current + 1, matches.length - 1));
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
        ref={inputRef}
        className={`input h-10 pl-9 ${invalid ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : ''}`}
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open}
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => openMenu(query)}
        onBlur={() => window.setTimeout(() => setOpen(false), 100)}
        onChange={(event) => {
          setQuery(event.target.value);
          onChange(event.target.value);
          setActiveIndex(0);
          openMenu(event.target.value);
        }}
        onKeyDown={handleKeyDown}
      />
      {open && query.trim() && (
        <div id={listId} role="listbox" className="scrollbar-thin mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-sm">
          {matches.map((option, index) => {
            const { group, name } = splitLabel(option.label);
            return (
              <button
                key={`${option.value}-${option.label}`}
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${index === activeIndex ? 'bg-indigo-50 text-indigo-800' : 'text-slate-700 hover:bg-slate-50'}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(option)}
              >
                {group && <span title={group} className={`max-w-24 shrink-0 truncate rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${index === activeIndex ? 'bg-white text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>{group}</span>}
                <span className="min-w-0 flex-1 truncate" title={name}>{name}</span>
                {option.value === value && <Check className="h-4 w-4 shrink-0 text-indigo-600" />}
              </button>
            );
          })}
          {!matches.length && <div className="px-3 py-4 text-center text-sm text-slate-500">{noResultsText}</div>}
        </div>
      )}
    </div>
  );
}
