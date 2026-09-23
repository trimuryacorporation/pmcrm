const colors = {
  Active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Completed: 'bg-blue-50 text-blue-700 ring-blue-200',
  Pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  Partial: 'bg-purple-50 text-purple-700 ring-purple-200',
  Paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Urgent: 'bg-rose-50 text-rose-700 ring-rose-200',
  High: 'bg-orange-50 text-orange-700 ring-orange-200',
  Inactive: 'bg-slate-100 text-slate-600 ring-slate-200',
  Blocked: 'bg-red-50 text-red-700 ring-red-200'
};

export default function StatusBadge({ value }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${colors[value] || 'bg-slate-50 text-slate-700 ring-slate-200'}`}>{value || 'N/A'}</span>;
}
