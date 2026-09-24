import { Building2, ChevronLeft, ChevronRight, ExternalLink, Globe2, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Loading from '../components/Loading.jsx';
import ModalForm from '../components/ModalForm.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { endpoints } from '../utils/api.js';

const portalFields = [
  ['companyName', 'Company Name'],
  ['contactPerson', 'Contact Person Name'],
  ['email', 'Email ID', 'email'],
  ['url', 'Portal URL', 'url']
];

function hostname(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

export default function Portal() {
  const [portals, setPortals] = useState(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const { user } = useAuth();
  const canConfigure = user?.role === 'super_admin';

  async function load() {
    try {
      const data = await endpoints.portals({ q: search.trim(), field: filter, page, limit: 100 });
      setPortals(data.items || []);
      setPagination({ total: data.total || 0, pages: data.pages || 1 });
    } catch (error) {
      toast.error(error.message);
      setPortals([]);
    }
  }

  useEffect(() => { load(); }, [search, filter, page]);
  useEffect(() => { setPage(1); }, [search, filter]);
  async function save(form) {
    setSaving(true);
    try {
      await endpoints.createPortal(form);
      toast.success('Portal added successfully');
      setAdding(false);
      await load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  function openPortal(portal) { window.open(portal.url, '_blank', 'noopener,noreferrer'); }
  if (portals === null) return <Loading label="Loading portals..." />;

  return <>
    <PageHeader title="Portal Directory" action={<div className="flex items-center gap-2"><span className="hidden rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 sm:inline-flex">{pagination.total} saved portal{pagination.total === 1 ? '' : 's'}</span>{canConfigure && <button type="button" className="btn-primary" onClick={() => setAdding(true)}><Plus className="h-4 w-4" />Add Portal</button>}</div>}>Save partner portals and open their login pages in one click.</PageHeader>

    <section className="card mb-5 grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
      <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="input h-10 pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search portals, company, contact, email..." /></div>
      <select className="input h-10" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All fields</option><option value="companyName">Company</option><option value="contactPerson">Contact person</option><option value="email">Email ID</option><option value="url">Portal URL</option></select>
    </section>

    <section className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6"><div><h2 className="font-bold text-slate-950">Saved Portals</h2><p className="mt-0.5 text-sm text-slate-500">Click any row to open its portal login page.</p></div><Globe2 className="h-5 w-5 text-indigo-600" /></div>
      {portals.length ? <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50"><tr>{['Company', 'Contact Person', 'Email ID', 'Portal', ''].map((label) => <th key={label} className="whitespace-nowrap px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 bg-white">{portals.map((portal) => <tr key={portal._id} role="link" tabIndex={0} onClick={() => openPortal(portal)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openPortal(portal); } }} className="group cursor-pointer transition hover:bg-indigo-50 focus:outline-none focus-visible:bg-indigo-50"><td className="px-5 py-4"><span className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-100 text-indigo-700"><Building2 className="h-4 w-4" /></span><span className="font-semibold text-slate-900">{portal.companyName}</span></span></td><td className="whitespace-nowrap px-5 py-4 text-slate-700">{portal.contactPerson}</td><td className="whitespace-nowrap px-5 py-4 text-slate-600">{portal.email}</td><td className="whitespace-nowrap px-5 py-4"><span className="inline-flex items-center gap-1.5 font-medium text-indigo-600 group-hover:text-indigo-700"><Globe2 className="h-4 w-4" />{hostname(portal.url)}</span></td><td className="px-5 py-4 text-right"><span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white"><ExternalLink className="h-3.5 w-3.5" />Open</span></td></tr>)}</tbody></table></div> : <div className="grid min-h-52 place-items-center px-5 py-10 text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><Globe2 className="h-6 w-6" /></span><h3 className="mt-3 font-bold text-slate-900">No portals saved yet</h3><p className="mt-1 text-sm text-slate-500">Add a company portal above to make it available here.</p></div></div>}
    </section>
    {pagination.total > 0 && <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-500">Showing {Math.min((page - 1) * 100 + 1, pagination.total)}-{Math.min(page * 100, pagination.total)} of {pagination.total} portals</p><div className="flex items-center gap-2"><button className="btn-secondary" disabled={page === 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft className="h-4 w-4" />Previous</button><span className="text-sm font-semibold text-slate-600">Page {page} of {pagination.pages}</span><button className="btn-secondary" disabled={page >= pagination.pages} onClick={() => setPage((current) => current + 1)}>Next<ChevronRight className="h-4 w-4" /></button></div></div>}
    {adding && <ModalForm title="Add a portal" fields={portalFields} requiredFields={portalFields.map(([name]) => name)} initial={{}} onClose={() => setAdding(false)} onSubmit={save} />}
  </>;
}
