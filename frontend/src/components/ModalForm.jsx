import { X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import SearchableSelect from './SearchableSelect.jsx';
import SelectField from './SelectField.jsx';
import MultiSearchableSelect from './MultiSearchableSelect.jsx';
import LanguageTeamCounts from './LanguageTeamCounts.jsx';
import SelectedLanguageTeamCounts from './SelectedLanguageTeamCounts.jsx';
import TaskAssigneeSelect from './TaskAssigneeSelect.jsx';
import AllocationPeopleSelect from './AllocationPeopleSelect.jsx';

export default function ModalForm({ title, fields, initial, onClose, onSubmit, requiredFields }) {
  const titleId = useId();
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const required = requiredFields || fields.slice(0, 3).map(([name]) => name);

  useEffect(() => setForm(initial || {}), [initial]);

  function setValue(name, value) {
    setForm((current) => {
      // A new project-document selection is a replacement, not an addition.
      // Existing files remain untouched until the user saves the form.
      const next = { ...current, [name]: value };
      if (name === 'documentFiles' && value.length) next.files = [];
      fields.forEach(([fieldName, , type, sourceField]) => {
        if (type !== 'languageTeamCounts' || sourceField !== name) return;
        const selectedLanguages = Array.isArray(value) ? value : value ? [value] : [];
        next[fieldName] = (current[fieldName] || []).filter((item) => selectedLanguages.includes(item.language));
      });
      if (name === 'languages') {
        const selectedLanguages = Array.isArray(value) ? value : value ? [value] : [];
        next.languageTeamCounts = (current.languageTeamCounts || []).filter((item) => selectedLanguages.includes(item.language));
      }
      if (name === 'assignedToType') {
        ['employee', 'vendor', 'freelancer', 'candidate'].forEach((field) => { delete next[field]; });
        delete next.languageTeamCounts;
      }
      if (name === 'personType') {
        ['employee', 'vendor', 'freelancer', 'candidate'].forEach((field) => { delete next[field]; });
      }
      if (['vendor', 'freelancer'].includes(name)) delete next.languageTeamCounts;
      return next;
    });
  }

  function removeExistingFile(index) {
    setForm((current) => ({
      ...current,
      files: (current.files || []).filter((_, fileIndex) => fileIndex !== index)
    }));
  }

  function removeSelectedFile(index) {
    setForm((current) => ({
      ...current,
      documentFiles: (current.documentFiles || []).filter((_, fileIndex) => fileIndex !== index)
    }));
  }

  function setTaskAssignee(value) {
    const fieldByType = { Employee: 'employee', Vendor: 'vendor', Freelancer: 'freelancer', Candidate: 'candidate' };
    const field = fieldByType[form.assignedToType];
    if (!field) return;
    setForm((current) => {
      const next = { ...current, [field]: value };
      ['employee', 'vendor', 'freelancer', 'candidate'].filter((key) => key !== field).forEach((key) => { delete next[key]; });
      delete next.languageTeamCounts;
      return next;
    });
  }

  function setAllocationPeople(value) {
    const fieldByType = { Employee: 'employee', Vendor: 'vendor', Freelancer: 'freelancer', Candidate: 'candidate' };
    const field = fieldByType[form.personType];
    if (!field) return;
    setForm((current) => {
      const next = { ...current, [field]: value };
      ['employee', 'vendor', 'freelancer', 'candidate'].filter((key) => key !== field).forEach((key) => { delete next[key]; });
      return next;
    });
  }

  function fieldValue(name, type) {
    const value = form[name];
    if (type === 'textarea' && Array.isArray(value)) return value.join('\n');
    if (type === 'multicombobox') {
      const values = Array.isArray(value) ? value : value ? [value] : [];
      return values.map((item) => (item && typeof item === 'object' ? item._id || item.id : item));
    }
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
            <label key={name} className={['textarea', 'file', 'languageTeamCounts', 'taskLanguageTeamCounts'].includes(type) ? 'md:col-span-2' : ''}>
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                {label}
                {required.includes(name) && <span className="ml-1 text-rose-500" aria-hidden="true">*</span>}
              </span>
              {type === 'combobox' ? (
                <SearchableSelect value={fieldValue(name, type)} options={fieldOptions(options)} placeholder={`Type to search ${label}`} noResultsText={`No ${label.toLowerCase()} found`} invalid={Boolean(errors[name])} onChange={(value) => setValue(name, value)} />
              ) : type === 'multicombobox' ? (
                <MultiSearchableSelect value={fieldValue(name, type)} options={fieldOptions(options)} placeholder={`Search and select ${label.toLowerCase()}`} noResultsText={`No ${label.toLowerCase()} found`} invalid={Boolean(errors[name])} onChange={(value) => setValue(name, value)} />
              ) : type === 'languageTeamCounts' ? (
                <LanguageTeamCounts languages={form[options]} value={form[name]} onChange={(value) => setValue(name, value)} />
              ) : type === 'taskLanguageTeamCounts' ? (
                <SelectedLanguageTeamCounts languages={form.languages} assignedToType={form.assignedToType} form={form} references={options} value={form[name]} onChange={(value) => setValue(name, value)} />
              ) : type === 'taskAssignee' ? (
                <TaskAssigneeSelect assignedToType={form.assignedToType} form={form} references={options} onChange={setTaskAssignee} />
              ) : type === 'allocationPeople' ? (
                <AllocationPeopleSelect personType={form.personType} form={form} references={options} onChange={setAllocationPeople} />
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
                  <p className="mt-2 text-xs text-slate-500">PDF, DOC or DOCX. Maximum 20 MB per file. Selecting new files replaces all existing documents when you save.</p>
                  {form.files?.length > 0 && <div className="mt-3 space-y-1.5">
                    <p className="text-xs font-medium text-slate-600">Current documents: remove any that should not be kept.</p>
                    {form.files.map((file, index) => <div key={`${file.key || file.url || file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                      <span className="min-w-0 truncate">{file.name || `Document ${index + 1}`}</span>
                      <button type="button" onClick={() => removeExistingFile(index)} className="shrink-0 font-semibold text-rose-600 hover:text-rose-700">Remove</button>
                    </div>)}
                  </div>}
                  {form.documentFiles?.length > 0 && <div className="mt-3 space-y-1.5">
                    <p className="text-xs font-medium text-emerald-700">New documents to save:</p>
                    {form.documentFiles.map((file, index) => <div key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                      <span className="min-w-0 truncate">{file.name}</span>
                      <button type="button" onClick={() => removeSelectedFile(index)} className="shrink-0 font-semibold text-rose-600 hover:text-rose-700">Remove</button>
                    </div>)}
                  </div>}
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
