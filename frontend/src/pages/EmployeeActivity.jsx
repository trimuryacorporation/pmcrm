import { Download, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import Loading from '../components/Loading.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { endpoints } from '../utils/api.js';

function csvValue(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export default function EmployeeActivity() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    endpoints.employeeActivity().then((data) => setItems(data.items || [])).catch(() => setItems([]));
  }, []);

  function downloadReport() {
    const rows = [['Employee Name', 'Employee ID', 'Email', 'Activity', 'Record', 'Time'], ...items.map((entry) => [
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

  return <>
    <PageHeader title="Employee Activity Report" action={<button className="btn-primary" onClick={downloadReport}><Download className="h-4 w-4" />Download Report</button>}>
      Employee actions with name, employee ID, email address, and exact activity timing.
    </PageHeader>
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-200 p-5"><Users className="h-5 w-5 text-indigo-600" /><h3 className="font-bold text-slate-950">Activity Log</h3></div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50"><tr>{['Employee', 'Employee ID', 'Email', 'Activity', 'Record', 'Timing'].map((label) => <th key={label} className="px-4 py-3 text-left font-semibold text-slate-600">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((entry) => <tr key={entry._id}>
              <td className="px-4 py-3 font-semibold text-slate-900">{entry.user?.name || entry.userName || '-'}</td>
              <td className="px-4 py-3 text-slate-600">{entry.user?.linkedEmployee?.employeeId || '-'}</td>
              <td className="px-4 py-3 text-slate-600">{entry.user?.email || '-'}</td>
              <td className="px-4 py-3 text-slate-700">{entry.action} {entry.resource}</td>
              <td className="px-4 py-3 text-slate-600">{entry.summary || entry.resourceId || '-'}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-500">{new Date(entry.occurredAt).toLocaleString('en-IN')}</td>
            </tr>)}
            {!items.length && <tr><td colSpan="6" className="px-4 py-10 text-center text-slate-500">No employee activity recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  </>;
}
