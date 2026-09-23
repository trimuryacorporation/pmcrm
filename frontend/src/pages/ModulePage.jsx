import { Plus, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import DataTable from '../components/DataTable.jsx';
import Loading from '../components/Loading.jsx';
import ModalForm from '../components/ModalForm.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { moduleConfig } from '../data/modules.js';
import { endpoints } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function ModulePage({ module }) {
  const config = moduleConfig[module];
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null);
  const { user } = useAuth();
  const canManage = ['super_admin', 'admin'].includes(user?.role);

  async function load() {
    const data = await endpoints.list(config.endpoint);
    setRows(data.items || []);
  }

  useEffect(() => {
    setRows(null);
    load();
  }, [module]);

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
      toast.error(error.message);
    }
  }

  async function remove(row) {
    if (!confirm(`Delete ${config.singular.toLowerCase()}?`)) return;
    try {
      await endpoints.remove(config.endpoint, row._id);
      toast.success('Record deleted');
      load();
    } catch (error) {
      toast.error(error.message);
    }
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
        Manage {config.title.toLowerCase()} with validation, responsive tables, profile pages, and role-protected API access.
      </PageHeader>
      {!rows ? <Loading label={`Loading ${config.title.toLowerCase()}...`} /> : <DataTable rows={rows} columns={config.columns} basePath={`/${module}`} onEdit={canManage ? setEditing : undefined} onDelete={canManage ? remove : undefined} />}
      {editing && <ModalForm title={`${editing._id ? 'Edit' : 'Add'} ${config.singular}`} fields={config.fields} initial={editing} onClose={() => setEditing(null)} onSubmit={save} />}
    </>
  );
}
