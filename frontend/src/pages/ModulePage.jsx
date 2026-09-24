import { ChevronLeft, ChevronRight, Download, Plus, RefreshCw, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useSearchParams } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import Loading from '../components/Loading.jsx';
import ModalForm from '../components/ModalForm.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { moduleConfig } from '../data/modules.js';
import { endpoints } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function ModulePage({ module }) {
  const config = moduleConfig[module];
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [invitingId, setInvitingId] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [exporting, setExporting] = useState(false);
  const [searchParams] = useSearchParams();
  const languageFilter = searchParams.get('language');
  const directoryModule = ['candidates', 'vendors', 'freelancers'].includes(module);
  const pageSize = directoryModule ? 100 : 50;
  const statusOptions = config.fields.find(([name]) => name === 'status')?.[3] || [];
  const { user } = useAuth();
  const vendorManagedModules = [];
  const employeeManagedModules = ['candidates', 'vendors', 'freelancers'];
  const isAdmin = ['super_admin', 'admin'].includes(user?.role);
  const visibleColumns = isAdmin ? config.columns : config.columns.filter((column) => !config.adminOnlyColumns?.includes(column));
  const visibleFields = isAdmin ? config.fields : config.fields.filter(([name]) => !config.adminOnlyFields?.includes(name));
  const canManage = isAdmin
    || (user?.role === 'vendor' && vendorManagedModules.includes(module))
    || (user?.role === 'employee' && employeeManagedModules.includes(module));

  async function load() {
    const data = await endpoints.list(config.endpoint, {
      ...(languageFilter ? { language: languageFilter } : {}),
      ...(search.trim() ? { q: search.trim() } : {}),
      ...(status ? { status } : {}),
      page,
      limit: pageSize
    });
    setRows(data.items || []);
    setPagination({ total: data.total || 0, pages: data.pages || 1 });
  }

  useEffect(() => {
    setRows(null);
    load();
  }, [module, languageFilter, search, status, page]);

  useEffect(() => {
    setPage(1);
  }, [module, languageFilter, search, status]);

  function csvCell(value) {
    const text = Array.isArray(value) ? value.join(', ') : value && typeof value === 'object' ? value.name || value.fullName || value.agencyName || '' : String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
  }

  async function downloadExcel() {
    setExporting(true);
    try {
      const query = {
        ...(languageFilter ? { language: languageFilter } : {}),
        ...(search.trim() ? { q: search.trim() } : {}),
        ...(status ? { status } : {}),
        limit: 100
      };
      const first = await endpoints.list(config.endpoint, { ...query, page: 1 });
      const exportRows = [...(first.items || [])];
      for (let currentPage = 2; currentPage <= (first.pages || 1); currentPage += 1) {
        const next = await endpoints.list(config.endpoint, { ...query, page: currentPage });
        exportRows.push(...(next.items || []));
      }
      const csv = [config.columns.join(','), ...exportRows.map((row) => config.columns.map((column) => csvCell(row[column])).join(','))].join('\n');
      const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${config.endpoint}-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setExporting(false);
    }
  }

  async function save(payload) {
    try {
      const body = { ...payload };
      if (module === 'projects' && body.documentFiles?.length) {
        const uploaded = await endpoints.upload(body.documentFiles);
        body.files = [...(body.files || []), ...(uploaded.files || [])];
      }
      delete body.documentFiles;
      if (body._id) await endpoints.update(config.endpoint, body._id, body);
      else await endpoints.create(config.endpoint, body);
      toast.success(`${config.singular} saved`);
      setEditing(null);
      load();
    } catch (error) {
      if (error.status === 409) {
        setEditing(null);
        await load().catch(() => {});
      }
      toast.error(error.message);
    }
  }

  async function confirmRemove() {
    if (!deleting) return;
    setDeleteSaving(true);
    try {
      await endpoints.remove(config.endpoint, deleting._id);
      toast.success(`${config.singular} deleted successfully`);
      setDeleting(null);
      load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDeleteSaving(false);
    }
  }

  async function invite(row) {
    setInvitingId(row._id);
    try {
      const result = await endpoints.invitePerson(config.endpoint, row._id);
      toast.success(result.message);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setInvitingId('');
    }
  }

  function openWhatsApp(row) {
    const rawPhone = row.phone || row.mobile || '';
    const phone = String(rawPhone).replace(/\D/g, '');
    if (!phone) return toast.error(`No phone number is available for this ${config.singular.toLowerCase()}`);
    const name = row.name || row.fullName || row.contactPerson || row.agencyName || config.singular;
    const loginUrl = `${window.location.origin}/login`;
    const text = `Hello ${name},\n\nYour Trimurya Enterprise CRM access is ready. You can log in here:\n${loginUrl}\n\nIf you have not set your password yet, please use the password setup link sent to your email.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <>
      <PageHeader
        title={config.title}
        action={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={load}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            {canManage && <button className="btn-primary" onClick={() => setEditing({})}>
              <Plus className="h-4 w-4" />
              Add {config.singular}
            </button>}
          </div>
        }
      >
        {languageFilter ? <span>Showing {config.title.toLowerCase()} for <strong>{languageFilter}</strong>. <Link className="font-semibold text-indigo-600 hover:text-indigo-700" to={`/${module}`}>Clear filter</Link></span> : `Manage ${config.title.toLowerCase()} with validation, responsive tables, profile pages, and role-protected API access.`}
      </PageHeader>
      {directoryModule && <div className="card mb-5 grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_13rem_auto] xl:items-center">
        <div className="relative min-w-0 sm:col-span-2 xl:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input h-10 pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${config.title.toLowerCase()}...`} />
        </div>
        <select className="input h-10 min-w-44" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {statusOptions.map((option) => {
            const normalized = typeof option === 'object' ? option : { value: option, label: option };
            return <option key={normalized.value} value={normalized.value}>{normalized.label}</option>;
          })}
        </select>
        <button className="btn-secondary w-full xl:w-auto" disabled={exporting} onClick={downloadExcel}>
          <Download className="h-4 w-4" />
          {exporting ? 'Preparing...' : 'Download Excel'}
        </button>
      </div>}
      {!rows ? <Loading label={`Loading ${config.title.toLowerCase()}...`} /> : <DataTable rows={rows} columns={visibleColumns} basePath={`/${module}`} onEdit={canManage ? setEditing : undefined} onDelete={canManage ? setDeleting : undefined} onInvite={canManage && ['employees', 'vendors', 'freelancers'].includes(module) ? invite : undefined} onWhatsApp={canManage && ['candidates', 'vendors', 'freelancers'].includes(module) ? openWhatsApp : undefined} invitingId={invitingId} />}
      {directoryModule && pagination.total > 0 && <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">Showing {Math.min((page - 1) * pageSize + 1, pagination.total)}-{Math.min(page * pageSize, pagination.total)} of {pagination.total} records</p>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" disabled={page === 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft className="h-4 w-4" /> Previous</button>
          <span className="text-sm font-medium text-slate-600">Page {page} of {pagination.pages}</span>
          <button className="btn-secondary" disabled={page >= pagination.pages} onClick={() => setPage((current) => current + 1)}>Next <ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>}
      {editing && <ModalForm title={`${editing._id ? 'Edit' : 'Add'} ${config.singular}`} fields={visibleFields} initial={editing} requiredFields={config.requiredFields} onClose={() => setEditing(null)} onSubmit={save} />}
      {deleting && <ConfirmDialog title={`Delete ${config.singular}?`} message={`Are you sure you want to delete this ${config.singular.toLowerCase()}? This action cannot be undone.`} confirming={deleteSaving} onCancel={() => setDeleting(null)} onConfirm={confirmRemove} />}
    </>
  );
}
