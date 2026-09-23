import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ModalForm({ title, fields, initial, onClose, onSubmit, requiredFields }) {
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});

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

  function submit(event) {
    event.preventDefault();
    const nextErrors = {};
    const required = requiredFields || fields.slice(0, 3).map(([name]) => name);
    fields.filter(([name]) => required.includes(name)).forEach(([name, label]) => {
      if (!form[name]) nextErrors[name] = `${label} is required`;
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onSubmit(form);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
      <form onSubmit={submit} className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <h3 className="text-lg font-bold text-slate-950">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 p-2" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          {fields.map(([name, label, type = 'text', options]) => (
            <label key={name} className={['textarea', 'file'].includes(type) ? 'md:col-span-2' : ''}>
              <span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>
              {type === 'select' ? (
                <select className="input" value={fieldValue(name, type)} onChange={(event) => setValue(name, event.target.value)}>
                  <option value="">Select {label}</option>
                  {(options || []).map((option) => (
                    <option key={typeof option === 'object' ? option.value : option} value={typeof option === 'object' ? option.value : option}>
                      {typeof option === 'object' ? option.label : option}
                    </option>
                  ))}
                </select>
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
                <textarea className="input min-h-24" value={fieldValue(name, type)} onChange={(event) => setValue(name, event.target.value)} />
              ) : (
                <input className="input" type={type} value={fieldValue(name, type)} onChange={(event) => setValue(name, type === 'number' ? Number(event.target.value) : event.target.value)} />
              )}
              {errors[name] && <span className="mt-1 block text-xs font-medium text-rose-600">{errors[name]}</span>}
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary">Save</button>
        </div>
      </form>
    </div>
  );
}
