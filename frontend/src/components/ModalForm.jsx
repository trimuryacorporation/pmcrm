import { X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import SearchableSelect from './SearchableSelect.jsx';
import SelectField from './SelectField.jsx';

export default function ModalForm({ title, fields, initial, onClose, onSubmit, requiredFields }) {
  const titleId = useId();
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const required = requiredFields || fields.slice(0, 3).map(([name]) => name);

  useEffect(() => setForm(initial || {}), [initial]);

  function setValue(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function fieldValue(name, type) {
    const value = form[name];
    if (value && typeof value === 'object') return value._id || '';
    if (type === 'date' && value) return String(value).slice(0, 10);
    return value ?? '';
  }

  function fieldOptions(options) {
    return typeof options === 'function' ? options() : options || [];
  }

  function submit(event) {
    event.preventDefault();
    const nextErrors = {};
    fields.filter(([name]) => required.includes(name)).forEach(([name, label]) => {
      if (!form[name]) nextErrors[name] = `${label} is required`;
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onSubmit(form);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-3 backdrop-blur-[2px] sm:p-5">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={submit}
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100dvh-2.5rem)]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <h3 id={titleId} className="text-lg font-bold text-slate-950">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div data-modal-scroll className="scrollbar-thin grid min-h-0 flex-1 gap-x-4 gap-y-4 overflow-y-auto px-5 py-4 sm:grid-cols-2 sm:px-6 sm:py-5">
          {fields.map(([name, label, type = 'text', options]) => (
            <label key={name} className={['textarea', 'file'].includes(type) ? 'md:col-span-2' : ''}>
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                {label}
                {required.includes(name) && <span className="ml-1 text-rose-500" aria-hidden="true">*</span>}
              </span>
              {type === 'combobox' ? (
                <SearchableSelect value={fieldValue(name, type)} options={fieldOptions(options)} placeholder={`Type to search ${label}`} invalid={Boolean(errors[name])} onChange={(value) => setValue(name, value)} />
              ) : type === 'select' ? (
                <SelectField value={fieldValue(name, type)} options={fieldOptions(options)} placeholder={`Select ${label}`} invalid={Boolean(errors[name])} onChange={(value) => setValue(name, value)} />
              ) : type === 'file' ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
                  <input
                    className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-indigo-700"
                    type="file"
                    accept={options}
                    multiple
                    onChange={(event) => setValue(name, Array.from(event.target.files || []))}
                  />
                  <p className="mt-2 text-xs text-slate-500">PDF, DOC or DOCX. Maximum 20 MB per file.</p>
                  {form.files?.length > 0 && <p className="mt-2 text-xs font-medium text-indigo-600">{form.files.length} existing document(s) will be preserved.</p>}
                </div>
              ) : type === 'textarea' ? (
                <textarea className={`input min-h-24 resize-y ${errors[name] ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : ''}`} value={fieldValue(name, type)} onChange={(event) => setValue(name, event.target.value)} />
              ) : (
                <input className={`input h-10 ${errors[name] ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : ''}`} type={type} value={fieldValue(name, type)} onChange={(event) => setValue(name, type === 'number' ? Number(event.target.value) : event.target.value)} />
              )}
              {errors[name] && <span className="mt-1 block text-xs font-medium text-rose-600">{errors[name]}</span>}
            </label>
          ))}
        </div>
        <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-white px-5 py-3.5 sm:px-6">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">Save</button>
        </div>
      </form>
    </div>
  );
}
