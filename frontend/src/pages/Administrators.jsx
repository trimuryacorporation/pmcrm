import { Power, PowerOff, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Loading from '../components/Loading.jsx';
import ModalForm from '../components/ModalForm.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { endpoints } from '../utils/api.js';

const fields = [
  ['name', 'Full Name'],
  ['email', 'Email', 'email'],
  ['password', 'Temporary Password', 'password'],
  ['role', 'Role', 'select', [
    { value: 'admin', label: 'Admin' },
    { value: 'super_admin', label: 'Super Admin' }
  ]]
];

export default function Administrators() {
  const [items, setItems] = useState(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState('');
  const { user: currentUser } = useAuth();

  async function load() {
    const data = await endpoints.administrators();
    setItems(data.items || []);
  }

  useEffect(() => {
    load().catch((error) => toast.error(error.message));
  }, []);

  async function create(payload) {
    try {
      await endpoints.createAdministrator(payload);
      toast.success(`${payload.role === 'super_admin' ? 'Super Admin' : 'Admin'} account created`);
      setCreating(false);
      await load();
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function toggleStatus(item) {
    setBusyId(item._id);
    try {
      await endpoints.updateAdministratorStatus(item._id, !item.isActive);
      toast.success(`Account ${item.isActive ? 'deactivated' : 'activated'}`);
      await load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusyId('');
    }
  }

  if (!items) return <Loading label="Loading administrators..." />;

  return (
    <>
      <PageHeader
        title="Administrators"
        action={<button className="btn-primary" onClick={() => setCreating(true)}><UserPlus className="h-4 w-4" />Add Administrator</button>}
      >
        Manage Admin and Super Admin accounts with protected access.
      </PageHeader>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>{['Administrator', 'Role', 'Created', 'Last Login', 'Status', 'Action'].map((label) => <th key={label} className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">{label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {items.map((item) => (
                <tr key={item._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><p className="font-semibold text-slate-900">{item.name}</p><p className="text-xs text-slate-500">{item.email}</p></td>
                  <td className="px-4 py-3"><StatusBadge value={item.role === 'super_admin' ? 'Super Admin' : 'Admin'} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{item.lastLoginAt ? new Date(item.lastLoginAt).toLocaleString() : '-'}</td>
                  <td className="px-4 py-3"><StatusBadge value={item.isActive ? 'Active' : 'Inactive'} /></td>
                  <td className="px-4 py-3">
                    <button
                      className={`rounded-lg border p-2 disabled:cursor-not-allowed disabled:opacity-40 ${item.isActive ? 'border-rose-200 text-rose-600 hover:bg-rose-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}
                      disabled={busyId === item._id || String(item._id) === String(currentUser?.id || currentUser?._id)}
                      onClick={() => toggleStatus(item)}
                      title={item.isActive ? 'Deactivate account' : 'Activate account'}
                    >
                      {item.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </button>
                  </td>
                </tr>
              ))}
              {!items.length && <tr><td colSpan="6" className="px-4 py-12 text-center text-slate-500">No administrator accounts found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {creating && <ModalForm title="Add Administrator" fields={fields} initial={{ role: 'admin' }} requiredFields={['name', 'email', 'password', 'role']} onClose={() => setCreating(false)} onSubmit={create} />}
    </>
  );
}
