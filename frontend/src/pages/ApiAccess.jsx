import { Check, Copy, KeyRound, Plus, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Loading from '../components/Loading.jsx';
import ModalForm from '../components/ModalForm.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { endpoints } from '../utils/api.js';

const keyFields = [
  ['name', 'Key Name', 'text', ''],
  ['role', 'Access Role', 'select', [{ value: 'admin', label: 'Admin API Access' }, { value: 'super_admin', label: 'Super Admin API Access' }]]
];

const methodStyle = {
  GET: 'bg-emerald-50 text-emerald-700', POST: 'bg-indigo-50 text-indigo-700', PUT: 'bg-amber-50 text-amber-700', PATCH: 'bg-violet-50 text-violet-700', DELETE: 'bg-rose-50 text-rose-700'
};

export default function ApiAccess() {
  const [documentation, setDocumentation] = useState(null);
  const [keys, setKeys] = useState(null);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [newSecret, setNewSecret] = useState('');
  const [busyId, setBusyId] = useState('');

  async function load() {
    const [docs, keyData] = await Promise.all([endpoints.apiEndpoints(), endpoints.apiKeys()]);
    setDocumentation(docs);
    setKeys(keyData.items || []);
  }

  useEffect(() => { load().catch((error) => toast.error(error.message)); }, []);

  const visibleEndpoints = useMemo(() => (documentation?.items || []).filter((item) => `${item.method} ${item.path}`.toLowerCase().includes(query.toLowerCase())), [documentation, query]);

  async function createKey(payload) {
    try {
      const result = await endpoints.createApiKey(payload);
      setCreating(false);
      setNewSecret(result.secret);
      toast.success('API key created');
      await load();
    } catch (error) { toast.error(error.message); }
  }

  async function revoke(id) {
    setBusyId(id);
    try {
      await endpoints.revokeApiKey(id);
      toast.success('API key revoked');
      await load();
    } catch (error) { toast.error(error.message); } finally { setBusyId(''); }
  }

  async function copy(value, message = 'Copied') {
    try { await navigator.clipboard.writeText(value); toast.success(message); } catch { toast.error('Copy failed. Please copy manually.'); }
  }

  if (!documentation || !keys) return <Loading label="Loading API access..." />;

  return <>
    <PageHeader title="API Access" action={<button className="btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Create API Key</button>}>
      Secure keys and live documentation for integrating with Trimurya Enterprise CRM.
    </PageHeader>

    <section className="card overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-950 px-6 py-5 text-white">
        <div className="flex items-center gap-2 text-lg font-bold"><KeyRound className="h-5 w-5 text-indigo-300" />API authentication</div>
        <p className="mt-1 text-sm text-slate-300">Use this header with every API request.</p>
        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-slate-900 px-4 py-3 font-mono text-sm text-indigo-100"><span className="truncate">x-api-key: YOUR_API_KEY</span><button onClick={() => copy('x-api-key: YOUR_API_KEY')} title="Copy header" className="shrink-0 text-indigo-200 hover:text-white"><Copy className="h-4 w-4" /></button></div>
      </div>
      <div className="grid gap-4 p-6 md:grid-cols-2"><Info label="API base URL" value={`${documentation.baseUrl}/api`} onCopy={() => copy(`${documentation.baseUrl}/api`)} /><Info label="Authentication" value="x-api-key request header" /></div>
    </section>

    <section className="card mt-6 overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold text-slate-950">Your API keys</h2><p className="text-sm text-slate-500">Keys are shown once only. Revoke a key immediately if it is exposed.</p></div><button className="btn-secondary" onClick={() => load().catch((error) => toast.error(error.message))}><RefreshCw className="h-4 w-4" />Refresh</button></div>
      <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50"><tr>{['Name', 'Access', 'Key prefix', 'Created', 'Last used', 'Status', 'Action'].map((name) => <th key={name} className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">{name}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{keys.map((item) => <tr key={item._id}><td className="px-4 py-3 font-semibold text-slate-900">{item.name}</td><td className="px-4 py-3 capitalize text-slate-600">{item.role.replace('_', ' ')}</td><td className="px-4 py-3 font-mono text-xs text-slate-600">{item.keyPrefix}...</td><td className="px-4 py-3 text-slate-600">{new Date(item.createdAt).toLocaleDateString()}</td><td className="px-4 py-3 text-slate-600">{item.lastUsedAt ? new Date(item.lastUsedAt).toLocaleString() : 'Never'}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{item.isActive ? 'Active' : 'Revoked'}</span></td><td className="px-4 py-3">{item.isActive && <button disabled={busyId === item._id} onClick={() => revoke(item._id)} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50">Revoke</button>}</td></tr>)}{!keys.length && <tr><td colSpan="7" className="px-4 py-10 text-center text-slate-500">No API keys created yet.</td></tr>}</tbody></table></div>
    </section>

    <section className="card mt-6 overflow-hidden"><div className="flex flex-col gap-4 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between"><div><h2 className="font-bold text-slate-950">Live API endpoints</h2><p className="text-sm text-slate-500">This list is scanned from the backend routes, so new registered APIs appear automatically.</p></div><label className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="input w-full pl-9 md:w-80" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search endpoint" /></label></div><div className="max-h-[520px] overflow-auto"><table className="min-w-full text-sm"><thead className="sticky top-0 bg-slate-50"><tr><th className="px-5 py-3 text-left font-semibold text-slate-600">Method</th><th className="px-5 py-3 text-left font-semibold text-slate-600">Endpoint</th><th className="px-5 py-3 text-right font-semibold text-slate-600">Copy</th></tr></thead><tbody className="divide-y divide-slate-100">{visibleEndpoints.map((item, index) => <tr key={`${item.method}-${item.path}-${index}`}><td className="px-5 py-3"><span className={`rounded px-2 py-1 text-xs font-extrabold ${methodStyle[item.method] || 'bg-slate-100 text-slate-700'}`}>{item.method}</span></td><td className="px-5 py-3 font-mono text-xs text-slate-700">{item.path}</td><td className="px-5 py-3 text-right"><button className="text-slate-500 hover:text-indigo-600" onClick={() => copy(`${documentation.baseUrl}${item.path}`, 'Endpoint URL copied')}><Copy className="h-4 w-4" /></button></td></tr>)}{!visibleEndpoints.length && <tr><td colSpan="3" className="px-5 py-10 text-center text-slate-500">No endpoint found.</td></tr>}</tbody></table></div></section>

    {creating && <ModalForm title="Create API Key" fields={keyFields} initial={{ role: 'admin' }} requiredFields={['name', 'role']} onClose={() => setCreating(false)} onSubmit={createKey} />}
    {newSecret && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"><div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-amber-500" /><div><h2 className="text-lg font-bold text-slate-950">Copy your API key now</h2><p className="mt-1 text-sm text-slate-600">For security, this secret cannot be displayed again after closing this window.</p></div></div><div className="mt-5 flex gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3"><code className="min-w-0 flex-1 break-all text-sm text-slate-800">{newSecret}</code><button onClick={() => copy(newSecret, 'API key copied')} className="shrink-0 text-indigo-600"><Copy className="h-5 w-5" /></button></div><button className="btn-primary mt-5 w-full" onClick={() => setNewSecret('')}><Check className="h-4 w-4" />I copied the key</button></div></div>}
  </>;
}

function Info({ label, value, onCopy }) { return <div className="rounded-lg border border-slate-200 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{value}</code>{onCopy && <button onClick={onCopy} className="text-indigo-600"><Copy className="h-4 w-4" /></button>}</div></div>; }
