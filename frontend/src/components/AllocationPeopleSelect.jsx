import MultiSearchableSelect from './MultiSearchableSelect.jsx';

const configByType = {
  Employee: { field: 'employee', label: 'employees', resource: 'employees' },
  Vendor: { field: 'vendor', label: 'vendors', resource: 'vendors' },
  Freelancer: { field: 'freelancer', label: 'freelancers', resource: 'freelancers' },
  Candidate: { field: 'candidate', label: 'candidates', resource: 'candidates' }
};

export default function AllocationPeopleSelect({ personType, form = {}, references = {}, onChange }) {
  const config = configByType[personType];
  if (!config) return <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">Select a Person Type first.</p>;
  const current = form[config.field];
  const value = (Array.isArray(current) ? current : current ? [current] : []).map((item) => item?._id || item);
  return <MultiSearchableSelect value={value} options={references[config.resource] || []} placeholder={`Search and select ${config.label}`} noResultsText={`No ${config.label} found`} onChange={onChange} />;
}
