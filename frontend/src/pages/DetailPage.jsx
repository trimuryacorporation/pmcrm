import { ArrowLeft, Download, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Loading from '../components/Loading.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { moduleConfig } from '../data/modules.js';
import { endpoints, SERVER_URL } from '../utils/api.js';

export default function DetailPage({ module }) {
  const { id } = useParams();
  const config = moduleConfig[module];
  const [item, setItem] = useState(null);

  useEffect(() => {
    endpoints.get(config.endpoint, id).then(setItem);
  }, [id, config.endpoint]);

  if (!item) return <Loading />;
  const title = item.name || item.fullName || item.agencyName || item.employeeId || config.singular;

  return (
    <>
      <PageHeader
        title={title}
        action={
          <Link className="btn-secondary" to={`/${module}`}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        }
      >
        Profile, project history, documents, performance, notes, and operational details.
      </PageHeader>
      <div className="grid gap-6 xl:grid-cols-[1fr_0.7fr]">
        <div className="card p-5">
          <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-950">
            <FileText className="h-5 w-5 text-indigo-600" />
            Record Details
          </h3>
          <dl className="grid gap-4 md:grid-cols-2">
            {Object.entries(item)
              .filter(([key]) => !key.startsWith('_') && !['__v', 'createdAt', 'updatedAt', 'files'].includes(key))
              .slice(0, 24)
              .map(([key, value]) => (
                <div key={key} className="rounded-lg bg-slate-50 p-3">
                  <dt className="text-xs font-semibold uppercase text-slate-500">{key.replace(/([A-Z])/g, ' $1')}</dt>
                  <dd className="mt-1 break-words text-sm font-medium text-slate-800">
                    {key.toLowerCase().includes('status') || key === 'priority' ? <StatusBadge value={value} /> : ['budget', 'paymentRate', 'clientRate', 'vendorRate', 'freelancerRate', 'rate', 'amount'].includes(key) && value !== undefined && value !== null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: item.currency || 'INR', maximumFractionDigits: 2 }).format(value) : Array.isArray(value) ? (value.every((entry) => typeof entry === 'string') ? value.join(', ') || '-' : `${value.length} linked records`) : typeof value === 'object' && value ? value.name || value.fullName || value.agencyName || JSON.stringify(value) : String(value ?? '-')}
                  </dd>
                </div>
              ))}
          </dl>
        </div>
        <div className="space-y-6">
          {module === 'projects' && (
            <div className="card p-5">
              <h3 className="flex items-center gap-2 font-bold text-slate-950">
                <FileText className="h-5 w-5 text-indigo-600" />
                Project Documents
              </h3>
              <div className="mt-4 space-y-2">
                {(item.files || []).map((file, index) => file.key ? (
                  <button
                    key={file.key}
                    type="button"
                    onClick={() => endpoints.downloadProjectFile(item._id, index, file.name).catch((error) => toast.error(error.message))}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
                  >
                    <span className="min-w-0 truncate">{file.name}</span>
                    <Download className="h-4 w-4 shrink-0" />
                  </button>
                ) : (
                  <a key={file.url || index} href={file.url?.startsWith('http') ? file.url : `${SERVER_URL}${file.url}`} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-700">
                    <span className="min-w-0 truncate">{file.name}</span><Download className="h-4 w-4 shrink-0" />
                  </a>
                ))}
                {!item.files?.length && <p className="text-sm text-slate-500">No documents uploaded.</p>}
              </div>
            </div>
          )}
          <div className="card p-5">
            <h3 className="font-bold text-slate-950">Performance Snapshot</h3>
            <div className="mt-4 space-y-4">
              {['progress', 'performanceScore', 'currentWorkload'].map((key) => (
                <div key={key}>
                  <div className="mb-1 flex justify-between text-sm font-medium text-slate-600">
                    <span>{key.replace(/([A-Z])/g, ' $1')}</span>
                    <span>{item[key] || 0}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600" style={{ width: `${item[key] || 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-5">
            <h3 className="font-bold text-slate-950">Notes</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">{item.notes || item.description || 'No notes added yet.'}</p>
          </div>
        </div>
      </div>
    </>
  );
}
