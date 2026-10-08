import { useEffect, useState } from 'react';
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
  return <main className="mx-auto max-w-5xl p-4 sm:p-8">
    <p className="text-sm font-semibold text-indigo-600">TRIMURYA ENTERPRISE CRM</p>
    <h1 className="mt-2 text-3xl font-bold text-slate-950">{project.name}</h1>
    <p className="mt-2 text-sm text-slate-500">Project details</p>
    <section className="card mt-6 p-5"><dl className="grid gap-4 md:grid-cols-2">
      {Object.entries(project).filter(([key]) => key !== 'name').map(([key, value]) => <div key={key} className={`rounded-lg bg-slate-50 p-3 ${key === 'description' ? 'md:col-span-2' : ''}`}>
        <dt className="text-xs font-semibold uppercase text-slate-500">{key.replace(/([A-Z])/g, ' $1')}</dt>
        <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">{key === 'status' ? <StatusBadge value={value} /> : Array.isArray(value) ? value.join(', ') || '-' : String(value ?? '-')}</dd>
      </div>)}
    </dl></section>
  </main>;
}
