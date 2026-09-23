import { Download, Filter } from 'lucide-react';
import { useState } from 'react';
import DataTable from '../components/DataTable.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { endpoints } from '../utils/api.js';

export default function Reports() {
  const [query, setQuery] = useState({ type: 'projects', status: '' });
  const [report, setReport] = useState(null);

  async function run() {
    const data = await endpoints.report(query);
    setReport(data);
  }

  async function downloadCsv() {
    const params = new URLSearchParams({ ...query, format: 'csv' });
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/reports?${params}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('trimurya_token')}` }
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${query.type}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader title="Reports" action={<button className="btn-primary" onClick={downloadCsv}><Download className="h-4 w-4" />Export CSV</button>}>
        Generate project-wise, employee-wise, vendor-wise, freelancer-wise, candidate-wise, payment, and invoice reports with filters.
      </PageHeader>
      <div className="card mb-6 grid gap-4 p-5 md:grid-cols-4">
        <select className="input" value={query.type} onChange={(event) => setQuery({ ...query, type: event.target.value })}>
          {['projects', 'employees', 'vendors', 'freelancers', 'candidates', 'payments', 'invoices'].map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <input className="input" placeholder="Status" value={query.status} onChange={(event) => setQuery({ ...query, status: event.target.value })} />
        <input className="input" type="date" onChange={(event) => setQuery({ ...query, from: event.target.value })} />
        <button className="btn-secondary" onClick={run}>
          <Filter className="h-4 w-4" />
          Run Report
        </button>
      </div>
      {report && <DataTable rows={report.rows} columns={Object.keys(report.rows[0] || {}).filter((key) => !['_id', '__v'].includes(key)).slice(0, 6)} basePath="/reports" onEdit={() => {}} onDelete={() => {}} empty="No rows match this report." />}
    </>
  );
}
