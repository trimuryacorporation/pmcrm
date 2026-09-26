import { Check, Pencil, Search, ShieldCheck, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Loading from '../components/Loading.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { navItems } from '../data/modules.js';
import { endpoints } from '../utils/api.js';

const roles = [
  ['super_admin', 'Super Admin'], ['admin', 'Admin'], ['employee', 'Employee'], ['vendor', 'Vendor'], ['freelancer', 'Freelancer'], ['candidate', 'Candidate']
];
const permissionModules = [
  ['dashboard-full', 'Full Dashboard'], ['projects', 'Projects'], ['project-applications', 'Project Applications'], ['password-setup-status', 'Password Setup Status'], ['employee-activity-report', 'Employee Activity Report'], ['portal-directory', 'Portal Directory'], ['clients', 'Clients'], ['candidates', 'Candidates'], ['vendors', 'Vendors'], ['freelancers', 'Freelancers'], ['employees', 'Employees'], ['allocation', 'Allocation'], ['tasks', 'Tasks'], ['payments', 'Payments']
];
const actions = ['view', 'create', 'edit', 'delete'];
const dashboardRoleAccess = [
  ['Vendor', 'Only vendor-assigned projects', 'Project status, progress, monthly analytics, upcoming deadlines, recent activity and assigned tasks'],
  ['Freelancer', 'Only freelancer-assigned projects', 'Project status, progress, monthly analytics, upcoming deadlines, recent activity and assigned tasks'],
  ['Candidate', 'Only candidate-assigned projects', 'Project status, progress, monthly analytics, upcoming deadlines, recent activity and assigned tasks']
];

export default function AccessControl() {
  const [users, setUsers] = useState(null);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loginFilter, setLoginFilter] = useState('');
  const [permissionFilter, setPermissionFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [busy, setBusy] = useState(false);
  const [permissionUser, setPermissionUser] = useState(null);
  const [permissions, setPermissions] = useState({});

  async function load() {
    const data = await endpoints.accessUsers();
    setUsers(data.items || []);
  }

  useEffect(() => { load().catch((error) => toast.error(error.message)); }, []);
  const filteredUsers = useMemo(() => (users || []).filter((user) => {
    const matchesText = `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(query.toLowerCase());
    const matchesRole = !roleFilter || user.role === roleFilter;
    const matchesStatus = !statusFilter || String(user.isActive) === statusFilter;
    const matchesLogin = !loginFilter || (loginFilter === 'never' ? !user.lastLoginAt : Boolean(user.lastLoginAt));
    const granted = user.accessPermissions || {};
    const matchesPermission = !permissionFilter || Boolean(granted[permissionFilter]?.view || granted[permissionFilter]?.create || granted[permissionFilter]?.edit || granted[permissionFilter]?.delete);
    return matchesText && matchesRole && matchesStatus && matchesLogin && matchesPermission;
  }), [users, query, roleFilter, statusFilter, loginFilter, permissionFilter]);

  async function saveRole() {
    setBusy(true);
    try {
      await endpoints.updateAccessRole(editing._id, newRole);
      toast.success('User access updated');
      setEditing(null);
      await load();
    } catch (error) { toast.error(error.message); } finally { setBusy(false); }
  }

  function openPermissions(user) {
    setPermissionUser(user);
    const existing = user.accessPermissions || {};
    setPermissions(Object.fromEntries(permissionModules.map(([key]) => [key, actions.reduce((item, action) => ({ ...item, [action]: Boolean(existing[key]?.[action]) }), {})])));
  }

  async function savePermissions() {
    setBusy(true);
    try {
      await endpoints.updateUserPermissions(permissionUser._id, permissions);
      toast.success('View, add, edit and delete permissions updated');
      setPermissionUser(null);
      await load();
    } catch (error) { toast.error(error.message); } finally { setBusy(false); }
  }

  if (!users) return <Loading label="Loading access control..." />;
  const modules = navItems.filter((item) => item.path !== '/access-control');

  return <>
    <PageHeader title="Access Control">See who can access each CRM section and assign the appropriate role to every user.</PageHeader>

    <section className="card overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50 p-5"><div className="flex items-center gap-2 font-bold text-slate-950"><ShieldCheck className="h-5 w-5 text-indigo-600" />Role access matrix</div><p className="mt-1 text-sm text-slate-500">A check means that role can see and use the module. Backend API access is protected by the same role rules.</p></div>
      <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-white"><tr><th className="sticky left-0 z-10 bg-white px-5 py-3 text-left font-semibold text-slate-600">Module</th>{roles.map(([, label]) => <th key={label} className="px-4 py-3 text-center font-semibold text-slate-600">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{modules.map((module) => <tr key={module.path}><td className="sticky left-0 bg-white px-5 py-3 font-semibold text-slate-800">{module.label}<span className="ml-2 font-mono text-xs font-normal text-slate-400">{module.path}</span></td>{roles.map(([role]) => <td key={role} className="px-4 py-3 text-center">{module.roles?.includes(role) ? <Check className="mx-auto h-4 w-4 text-emerald-600" /> : <X className="mx-auto h-4 w-4 text-slate-300" />}</td>)}</tr>)}</tbody></table></div>
    </section>

    <section className="card mt-6 overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50 p-5"><div className="font-bold text-slate-950">Partner dashboard access</div><p className="mt-1 text-sm text-slate-500">Vendor, Freelancer and Candidate dashboards are limited to their own assigned work. They cannot view other teams&apos; projects, people, payments or organisation-wide resource data.</p></div>
      <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-white"><tr><th className="px-5 py-3 text-left font-semibold text-slate-600">Role</th><th className="px-5 py-3 text-left font-semibold text-slate-600">Can assess</th><th className="px-5 py-3 text-left font-semibold text-slate-600">Can view on dashboard</th></tr></thead><tbody className="divide-y divide-slate-100">{dashboardRoleAccess.map(([role, scope, views]) => <tr key={role}><td className="px-5 py-3 font-semibold text-slate-800">{role}</td><td className="px-5 py-3 text-slate-700">{scope}</td><td className="px-5 py-3 text-slate-700">{views}</td></tr>)}</tbody></table></div>
    </section>
    <section className="card mt-6 overflow-hidden"><div className="border-b border-slate-200 p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div><h2 className="font-bold text-slate-950">User access</h2><p className="text-sm text-slate-500">Change role or give module-wise View, Add, Edit and Delete access.</p></div><label className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="input w-full pl-9 xl:w-72" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search user or role" /></label></div><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><select className="input" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="">All roles</option>{roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All status</option><option value="true">Active</option><option value="false">Inactive</option></select><select className="input" value={loginFilter} onChange={(event) => setLoginFilter(event.target.value)}><option value="">Any login status</option><option value="logged-in">Logged in</option><option value="never">Never logged in</option></select><select className="input" value={permissionFilter} onChange={(event) => setPermissionFilter(event.target.value)}><option value="">Any custom permission</option>{permissionModules.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div></div><div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50"><tr>{['User', 'Current role', 'Granted permissions', 'Last login', 'Status', 'Access'].map((item) => <th key={item} className="px-4 py-3 text-left font-semibold text-slate-600">{item}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filteredUsers.map((user) => <tr key={user._id}><td className="px-4 py-3"><p className="font-semibold text-slate-900">{user.name}</p><p className="text-xs text-slate-500">{user.email}</p></td><td className="px-4 py-3 capitalize text-slate-700">{user.role.replace('_', ' ')}</td><td className="max-w-xs px-4 py-3"><PermissionSummary permissions={user.accessPermissions} /></td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${user.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{user.isActive ? 'Active' : 'Inactive'}</span></td><td className="flex gap-2 px-4 py-3"><button onClick={() => { setEditing(user); setNewRole(user.role); }} className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50"><Pencil className="h-3.5 w-3.5" />Role</button><button onClick={() => openPermissions(user)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">Permissions</button></td></tr>)}{!filteredUsers.length && <tr><td colSpan="6" className="px-4 py-10 text-center text-slate-500">No users found with these filters.</td></tr>}</tbody></table></div></section>

    {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 className="text-lg font-bold text-slate-950">Change access role</h2><p className="mt-1 text-sm text-slate-600">{editing.name} will immediately receive the access defined for the selected role.</p><label className="mt-5 block"><span className="mb-1 block text-sm font-semibold text-slate-700">Role</span><select className="input" value={newRole} onChange={(event) => setNewRole(event.target.value)}>{roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><div className="mt-6 flex justify-end gap-3"><button className="btn-secondary" disabled={busy} onClick={() => setEditing(null)}>Cancel</button><button className="btn-primary" disabled={busy} onClick={saveRole}>{busy ? 'Saving...' : 'Save access'}</button></div></div></div>}
    {permissionUser && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"><div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl"><div className="border-b border-slate-200 p-6"><h2 className="text-lg font-bold text-slate-950">Module permissions</h2><p className="mt-1 text-sm text-slate-600">{permissionUser.name}: select exactly what they can do.</p></div><div className="overflow-auto p-6"><table className="min-w-full text-sm"><thead><tr><th className="pb-3 text-left text-slate-600">Module</th>{actions.map((action) => <th key={action} className="px-3 pb-3 text-center capitalize text-slate-600">{action}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{permissionModules.map(([key, label]) => <tr key={key}><td className="py-3 font-semibold text-slate-800">{label}</td>{actions.map((action) => <td key={action} className="px-3 py-3 text-center"><input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={Boolean(permissions[key]?.[action])} onChange={(event) => setPermissions((current) => ({ ...current, [key]: { ...current[key], [action]: event.target.checked } }))} /></td>)}</tr>)}</tbody></table></div><div className="flex justify-end gap-3 border-t border-slate-200 p-5"><button className="btn-secondary" disabled={busy} onClick={() => setPermissionUser(null)}>Cancel</button><button className="btn-primary" disabled={busy} onClick={savePermissions}>{busy ? 'Saving...' : 'Save permissions'}</button></div></div></div>}
  </>;
}

function PermissionSummary({ permissions = {} }) {
  const granted = permissionModules.flatMap(([key, label]) => {
    const actionsGranted = actions.filter((action) => permissions?.[key]?.[action]);
    return actionsGranted.length ? [{ label, actions: actionsGranted }] : [];
  });
  if (!granted.length) return <span className="text-xs text-slate-400">Role default access</span>;
  return <div className="flex flex-wrap gap-1.5">{granted.map((item) => <span key={item.label} title={`${item.label}: ${item.actions.join(', ')}`} className="rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700">{item.label} · {item.actions.join('/')}</span>)}</div>;
}
