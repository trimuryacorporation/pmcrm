import SearchableSelect from './SearchableSelect.jsx';

const configByType = {
  Employee: { field: 'employee', label: 'Employee', resource: 'employees' },
  Vendor: { field: 'vendor', label: 'Vendor', resource: 'vendors' },
  Freelancer: { field: 'freelancer', label: 'Freelancer', resource: 'freelancers' },
  Candidate: { field: 'candidate', label: 'Candidate', resource: 'candidates' }
};

export default function TaskAssigneeSelect({ assignedToType, form = {}, references = {}, onChange }) {
  const config = configByType[assignedToType];
  if (!config) return <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">Select an Assigned To Type first.</p>;

  const current = form[config.field];
  const value = current?._id || current || '';
  return <SearchableSelect value={value} options={references[config.resource] || []} placeholder={`Search ${config.label.toLowerCase()}`} noResultsText={`No ${config.label.toLowerCase()} found`} onChange={onChange} />;
}
