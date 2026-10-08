import { useEffect, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { endpoints } from '../utils/api.js';
import Loading from '../components/Loading.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
export default function SharedProject() {
  const { token } = useParams();
  const [project, setProject] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setProject(null);
    setError('');
    endpoints.sharedProject(token).then((data) => { if (active) setProject(data); }).catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [token]);
  if (error) return <main className="mx-auto max-w-3xl p-6"><div className="card p-6"><h1 className="text-xl font-bold">Project unavailable</h1><p className="mt-2 text-slate-600">{error}</p></div></main>;
  if (!project) return <Loading />;
  const detailFields = ['code', 'projectType', 'description', 'requiredLanguage', 'startDate', 'endDate', 'status'];
  return <main className="mx-auto max-w-6xl p-4 sm:p-8">
    <p className="text-sm font-semibold text-indigo-600">TRIMURYA ENTERPRISE CRM</p>
    <h1 className="mt-2 text-3xl font-bold text-slate-950">{project.name}</h1>
    <p className="mt-2 text-sm text-slate-500">Project details</p>
    <div className="mt-6 grid items-start gap-6 xl:grid-cols-[1fr_0.7fr]">
      <div className="space-y-6">
        <section className="card p-5"><h2 className="mb-4 font-bold text-slate-950">Record Details</h2><dl className="grid gap-4 md:grid-cols-2">
          {detailFields.map((key) => <div key={key} className={`rounded-lg bg-slate-50 p-3 ${key === 'description' ? 'md:col-span-2' : ''}`}>
            <dt className="text-xs font-semibold uppercase text-slate-500">{key.replace(/([A-Z])/g, ' $1')}</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">{key === 'status' ? <StatusBadge value={project[key]} /> : Array.isArray(project[key]) ? project[key].join(', ') || '-' : String(project[key] ?? '-')}</dd>
          </div>)}
        </dl></section>
        <section className="card p-5"><h2 className="font-bold text-slate-950">Application Questions</h2>
          {project.applicationQuestions?.length ? <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm text-slate-700">{project.applicationQuestions.map((question, index) => <li className="whitespace-pre-wrap break-words" key={index}>{question}</li>)}</ol> : <p className="mt-3 text-sm text-slate-500">No application questions added.</p>}
        </section>
      </div>
      <div className="space-y-6">
        <section className="card p-5"><h2 className="flex items-center gap-2 font-bold text-slate-950"><FileText className="h-5 w-5 text-indigo-600" />Project Documents</h2>
          <div className="mt-4 space-y-2">{project.files?.length ? project.files.map((file) => <a key={file.index} href={endpoints.sharedProjectFileUrl(token, file.index)} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-700"><span className="min-w-0 break-words">{file.name || 'Download document'}</span><Download className="h-4 w-4 shrink-0" /></a>) : <p className="text-sm text-slate-500">No documents uploaded.</p>}</div>
        </section>
        <section className="card p-5"><h2 className="font-bold text-slate-950">Performance Snapshot</h2><div className="mt-4 space-y-4">
          {['progress', 'performanceScore', 'currentWorkload'].map((key) => {
            const percentage = Math.max(0, Math.min(100, Number(project[key]) || 0));
            return <div key={key}><div className="mb-1 flex justify-between text-sm text-slate-600"><span>{key.replace(/([A-Z])/g, ' $1')}</span><span>{percentage}%</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-indigo-500" style={{ width: `${percentage}%` }} /></div></div>;
          })}
        </div></section>
        <section className="card p-5"><h2 className="font-bold text-slate-950">Notes</h2><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{project.notes || project.description || 'No notes added yet.'}</p></section>
      </div>
    </div>
  </main>;
}
