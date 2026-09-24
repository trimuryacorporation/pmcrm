import { ArrowLeft, CheckCircle2, Download, FileText, Send, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Loading from '../components/Loading.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ProjectApplicationModal from '../components/ProjectApplicationModal.jsx';
import ProjectApplicantsModal from '../components/ProjectApplicantsModal.jsx';
import { moduleConfig } from '../data/modules.js';
import { endpoints, SERVER_URL } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function DetailPage({ module }) {
  const { id } = useParams();
  const config = moduleConfig[module];
  const [item, setItem] = useState(null);
  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [applications, setApplications] = useState(null);
  const [showApplicants, setShowApplicants] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    endpoints.get(config.endpoint, id).then(setItem);
  }, [id, config.endpoint]);

  useEffect(() => {
    const eligible = module === 'projects' && ['employee', 'vendor', 'freelancer'].includes(user?.role);
    if (!eligible) return;
    endpoints.myProjectApplication(id)
      .then((response) => setHasApplied(response.applied))
      .catch(() => setHasApplied(false));
  }, [id, module, user?.role]);

  useEffect(() => {
    if (module !== 'projects' || !['super_admin', 'admin'].includes(user?.role)) return;
    endpoints.projectApplications(id)
      .then((response) => setApplications(response.applications || []))
      .catch(() => setApplications([]));
  }, [id, module, user?.role]);

  if (!item) return <Loading />;
  const title = item.name || item.fullName || item.agencyName || item.employeeId || config.singular;
  const canApply = module === 'projects' && ['employee', 'vendor', 'freelancer'].includes(user?.role);
  const canReviewApplications = module === 'projects' && ['super_admin', 'admin'].includes(user?.role);

  return (
    <>
      <PageHeader
        title={title}
        action={
          <div className="flex gap-2">
            {canReviewApplications && <button type="button" className="btn-secondary" onClick={() => setShowApplicants(true)}><Users className="h-4 w-4" />Applicants ({applications?.length || 0})</button>}
            {canApply && (hasApplied ? (
              <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-100 px-4 py-2.5 text-sm font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" />Applied</span>
            ) : (
              <button type="button" className="btn-primary" onClick={() => setApplying(true)}><Send className="h-4 w-4" />Apply</button>
            ))}
            <Link className="btn-secondary" to={`/${module}`}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </div>
        }
      >
        Profile, project history, documents, performance, notes, and operational details.
      </PageHeader>
      {canApply && hasApplied && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-emerald-900 shadow-sm">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-bold">Application submitted</p>
            <p className="mt-0.5 text-sm leading-5 text-emerald-800">Thank you for your interest. Our team will review your application and contact you soon.</p>
          </div>
        </div>
      )}
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
      {applying && <ProjectApplicationModal project={item} onClose={() => setApplying(false)} onSubmitted={() => setHasApplied(true)} />}
      {showApplicants && <ProjectApplicantsModal applications={applications || []} onClose={() => setShowApplicants(false)} />}
    </>
  );
}
