import { Check, ChevronDown } from 'lucide-react';
import { useId, useMemo, useRef, useState } from 'react';

export default function SelectField({ value = '', options = [], placeholder, onChange, invalid = false }) {
  const listId = useId();
  const buttonRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [opensUpward, setOpensUpward] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedOptions = useMemo(() => options.map((option) => (
    typeof option === 'object' ? option : { value: option, label: option }
  )), [options]);
  const selected = normalizedOptions.find((option) => option.value === value);
  const menuOptions = [{ value: '', label: placeholder }, ...normalizedOptions];

  function openMenu() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const scrollArea = buttonRef.current.closest('[data-modal-scroll]');
      const scrollRect = scrollArea?.getBoundingClientRect();
      const lowerBoundary = Math.min(window.innerHeight, scrollRect?.bottom || window.innerHeight);
      const upperBoundary = Math.max(0, scrollRect?.top || 0);
      const spaceBelow = lowerBoundary - rect.bottom;
      const spaceAbove = rect.top - upperBoundary;
      const menuHeight = Math.min(224, menuOptions.length * 36 + 8);
      setOpensUpward(spaceBelow < menuHeight && spaceAbove > spaceBelow);
    }
    const selectedIndex = menuOptions.findIndex((option) => option.value === value);
    setActiveIndex(Math.max(selectedIndex, 0));
    setOpen(true);
  }

  function choose(option) {
    onChange(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!open) openMenu();
      else if (menuOptions[activeIndex]) choose(menuOptions[activeIndex]);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((current) => Math.min(Math.max(current + step, 0), menuOptions.length - 1));
    }
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-controls={listId}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`input flex h-10 items-center justify-between gap-3 text-left ${invalid ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : ''}`}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onBlur={() => window.setTimeout(() => setOpen(false), 100)}
        onKeyDown={handleKeyDown}
      >
        <span className={`truncate ${selected ? 'text-slate-900' : 'text-slate-500'}`}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          id={listId}
          role="listbox"
          className={`scrollbar-thin absolute z-40 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl ${opensUpward ? 'bottom-full mb-1' : 'top-full mt-1'}`}
        >
          {menuOptions.map((option, index) => (
            <button
              key={`${option.value}-${option.label}`}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${index === activeIndex ? 'bg-indigo-50 text-indigo-800' : 'text-slate-700 hover:bg-slate-50'}`}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(option)}
            >
              <span className={`truncate ${option.value ? '' : 'text-slate-500'}`}>{option.label}</span>
              {option.value === value && <Check className="h-4 w-4 shrink-0 text-indigo-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
