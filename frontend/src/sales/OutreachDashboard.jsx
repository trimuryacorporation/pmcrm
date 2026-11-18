import { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, CalendarDays, ChevronDown, ChevronUp, ClipboardCheck, Mail, MessageSquareText, Phone, RefreshCw, Users, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { queryString, salesApi } from './api.js';

const icons = {
  emails: Mail,
  linkedin: MessageSquareText,
  calls: Phone,
  meetings: Video,
  followups: ClipboardCheck,
  activities: MessageSquareText
};
const colors = [
  'from-indigo-500 to-violet-600',
  'from-sky-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-teal-500'
];
const formatDate = value => value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '-';

export default function OutreachDashboard({ filters = {}, allRecords = false }) {
  const [data, setData] = useState(null);
  const [rows, setRows] = useState([]);
  const [module, setModule] = useState('all');
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const dateFilters = {
    from: filters.from,
    to: filters.to,
    department: filters.department,
    vertical: filters.vertical,
    serviceCategory: filters.serviceCategory,
    assignedTo: allRecords ? filters.assignedTo : ''
  };
  const request = queryString({ ...dateFilters, module });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    salesApi('/outreach-dashboard?' + request)
      .then(result => {
        if (!active) return;
        setData(result);
        setRows(result.rows || []);
      })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [request, refresh]);

  async function loadMore() {
    if (!data?.nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError('');
    try {
      const next = await salesApi('/outreach-dashboard?' + queryString({
        ...dateFilters,
        module,
        afterDate: data.nextCursor.createdAt,
        afterId: data.nextCursor.id,
        afterModule: data.nextCursor.module
      }));
      setRows(current => [...current, ...(next.rows || [])]);
      setData(current => ({ ...current, ...next }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  }

  function chooseModule(value) {
    setModule(value);
    setExpanded(true);
  }

  return <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-6 text-white sm:p-8">
      <div className="absolute -right-10 -top-20 h-64 w-64 rounded-full bg-indigo-400/10 blur-2xl"/>
      <div className="relative flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-indigo-100"><MessageSquareText className="h-3.5 w-3.5"/>Team activity overview</div>
          <h2 className="text-xl font-bold sm:text-2xl">Outreach &amp; Communication</h2>
          <p className="mt-2 text-sm leading-6 text-indigo-100/80">Track outreach records, channel performance, and contributions from each team member.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3">
            <p className="text-xs font-medium text-indigo-100/75">Total records added</p>
            <p className="mt-1 text-3xl font-bold">{loading && !data ? '—' : (data?.total || 0).toLocaleString()}</p>
          </div>
          <button type="button" className="rounded-xl border border-white/15 bg-white/10 p-3 text-white transition hover:bg-white/20 disabled:opacity-50" onClick={() => setRefresh(value => value + 1)} disabled={loading} aria-label="Refresh Outreach & Communication report"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/></button>
        </div>
      </div>
      <div className="relative mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-4 text-xs text-indigo-100/80">
        <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5"/>{data?.contributors?.length || 0} contributors</span>
        <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5"/>{filters.from || filters.to ? 'Filtered by selected date range' : 'All time'}</span>
        <button type="button" onClick={() => setExpanded(value => !value)} className="ml-auto inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 font-semibold text-indigo-900 transition hover:bg-indigo-50">
          {expanded ? 'Hide report' : 'View report & details'}{expanded ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
        </button>
      </div>
    </div>

    {error && <div role="alert" className="m-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}<button type="button" className="ml-3 font-semibold underline" onClick={() => setRefresh(value => value + 1)}>Retry</button></div>}
    {loading && !data ? <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100"/> )}</div> : data && <>
      <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.modules.map((item, index) => {
          const Icon = icons[item.resource] || MessageSquareText;
          return <button key={item.resource} type="button" onClick={() => chooseModule(item.resource)} className={`group flex items-center gap-4 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md ${expanded && module === item.resource ? 'border-indigo-300 bg-indigo-50/60' : 'border-slate-200 bg-white'}`}>
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${colors[index % colors.length]} text-white shadow-sm`}><Icon className="h-5 w-5"/></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-700">{item.label}</span><span className="mt-1 block text-2xl font-bold text-slate-950">{item.count.toLocaleString()}</span></span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-indigo-600"/>
          </button>;
        })}
      </div>

      {data.contributors.length > 0 && <div className="border-t border-slate-100 px-5 py-4">
        <div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-sm font-bold text-slate-800">Records added by team member</h3><span className="text-xs text-slate-400">Based on record creator</span></div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {data.contributors.slice(0, 6).map((person, index) => {
            const share = data.total ? Math.round(person.count / data.total * 100) : 0;
            return <div key={person.user} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <div className="flex items-center justify-between gap-3"><span className="truncate text-sm font-semibold text-slate-700">{person.name}</span><span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-indigo-700 shadow-sm">{person.count.toLocaleString()} · {share}%</span></div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full bg-gradient-to-r ${colors[index % colors.length]}`} style={{ width: `${share}%` }}/></div>
            </div>;
          })}
        </div>
      </div>}

      {expanded && <div className="border-t border-slate-200">
        <div className="flex flex-wrap items-center gap-3 bg-slate-50/80 px-5 py-4">
          <div className="mr-auto"><h3 className="font-bold text-slate-900">Outreach activity report</h3><p className="mt-0.5 text-xs text-slate-500">{data.modules.find(item => item.resource === module)?.label || 'All outreach modules'} · {filters.from || filters.to ? 'selected date range' : 'all time'}</p></div>
          <label className="sr-only" htmlFor="outreach-report-module">Filter outreach report by module</label>
          <select id="outreach-report-module" value={module} onChange={event => setModule(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="all">All modules</option>
            {data.modules.map(item => <option key={item.resource} value={item.resource}>{item.label} ({item.count})</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full whitespace-nowrap text-left text-sm">
            <thead className="bg-white text-xs uppercase tracking-wide text-slate-500"><tr>{['Date added', 'Module', 'Record details', 'Related to', 'Added by', 'Status', ''].map((label, index) => <th key={`${label}-${index}`} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(row => <tr key={`${row.resource}-${row._id}`} className="transition hover:bg-indigo-50/40">
                <td className="px-4 py-3 text-xs text-slate-500">{formatDate(row.createdAt)}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{row.module}</span></td>
                <td className="max-w-64 truncate px-4 py-3"><span className="font-semibold text-slate-800">{row.title}</span><span className="ml-2 text-xs text-slate-400">{row.recordId}</span></td>
                <td className="max-w-48 truncate px-4 py-3 text-slate-600">{row.related || '-'}</td>
                <td className="px-4 py-3 font-medium text-slate-700">{row.createdBy}</td>
                <td className="px-4 py-3 text-slate-600">{row.status || '-'}</td>
                <td className="px-4 py-3"><Link to={`/sales/${row.page}?record=${encodeURIComponent(row._id)}`} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800">Details <ArrowDownRight className="h-3.5 w-3.5"/></Link></td>
              </tr>)}
            </tbody>
          </table>
          {!rows.length && <p className="p-10 text-center text-sm text-slate-500">{loading ? 'Loading outreach records…' : 'No outreach records found for this selection.'}</p>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
          <span>Showing {rows.length.toLocaleString()} of {(module === 'all' ? data.total : data.modules.find(item => item.resource === module)?.count || 0).toLocaleString()} records</span>
          {data.nextCursor && <button type="button" disabled={loadingMore} onClick={loadMore} className="btn-secondary !py-2">{loadingMore ? 'Loading…' : 'Load more records'}</button>}
        </div>
      </div>}
    </>}
  </section>;
}
