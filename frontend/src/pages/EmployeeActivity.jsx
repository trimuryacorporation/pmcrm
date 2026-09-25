import { Download, RefreshCw, Search, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import Loading from '../components/Loading.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { endpoints } from '../utils/api.js';

function csvValue(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export default function EmployeeActivity() {
  const [items, setItems] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  async function load() {
    try {
      const data = await endpoints.employeeActivity();
      setItems(data.items || []);
    } catch {
      setItems([]);
    }
  }

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, []);

  function downloadReport() {
    const rows = [['Employee Name', 'Employee ID', 'Email', 'Activity', 'Record', 'Time'], ...filteredItems.map((entry) => [
      entry.user?.name || entry.userName || '-', entry.user?.linkedEmployee?.employeeId || '-', entry.user?.email || '-',
      `${entry.action} ${entry.resource}`, entry.summary || entry.resourceId || '-', new Date(entry.occurredAt).toLocaleString('en-IN')
    ])];
    const blob = new Blob([rows.map((row) => row.map(csvValue).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `employee-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!items) return <Loading label="Loading employee activity..." />;
  const actions = [...new Set(items.map((item) => item.action).filter(Boolean))].sort();
  const query = search.trim().toLowerCase();
  const filteredItems = items.filter((entry) => {
    const matchesAction = !actionFilter || entry.action === actionFilter;
    const text = [entry.user?.name, entry.userName, entry.user?.linkedEmployee?.employeeId, entry.user?.email, entry.action, entry.resource, entry.summary, entry.resourceId].filter(Boolean).join(' ').toLowerCase();
    return matchesAction && (!query || text.includes(query));
  });

  return <>
    <PageHeader title="Employee Activity Report" action={<div className="flex gap-2"><button className="btn-secondary" disabled={refreshing} onClick={refresh}><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />{refreshing ? 'Refreshing...' : 'Refresh'}</button><button className="btn-primary" onClick={downloadReport}><Download className="h-4 w-4" />Download Report</button></div>}>
      Employee actions with name, employee ID, email address, and exact activity timing.
    </PageHeader>
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-200 p-5"><Users className="h-5 w-5 text-indigo-600" /><h3 className="font-bold text-slate-950">Activity Log</h3></div>
      <div className="grid gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="input h-10 pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employee name, ID, email, activity or record..." /></div>
        <select className="input h-10" value={actionFilter} onChange={(event) => setActionFilter(event.target.value)}><option value="">All activities</option>{actions.map((action) => <option key={action} value={action}>{action}</option>)}</select>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50"><tr>{['Employee', 'Employee ID', 'Email', 'Activity', 'Record', 'Timing'].map((label) => <th key={label} className="px-4 py-3 text-left font-semibold text-slate-600">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.map((entry) => <tr key={entry._id}>
              <td className="px-4 py-3 font-semibold text-slate-900">{entry.user?.name || entry.userName || '-'}</td>
              <td className="px-4 py-3 text-slate-600">{entry.user?.linkedEmployee?.employeeId || '-'}</td>
              <td className="px-4 py-3 text-slate-600">{entry.user?.email || '-'}</td>
              <td className="px-4 py-3 text-slate-700">{entry.action} {entry.resource}</td>
              <td className="px-4 py-3 text-slate-600">{entry.summary || entry.resourceId || '-'}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-500">{new Date(entry.occurredAt).toLocaleString('en-IN')}</td>
            </tr>)}
            {!filteredItems.length && <tr><td colSpan="6" className="px-4 py-10 text-center text-slate-500">{items.length ? 'No activity matches the selected search or filter.' : 'No employee activity recorded yet.'}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  </>;
}
