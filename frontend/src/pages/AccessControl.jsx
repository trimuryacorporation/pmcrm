import { Check, ChevronLeft, ChevronRight, LayoutDashboard, Pencil, Search, ShieldCheck, X } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Loading from '../components/Loading.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { salesAccessModules, salesAccessActions, salesRoles } from '../data/sales.js';
import { navItems } from '../data/modules.js';
import { endpoints } from '../utils/api.js';

const roles = [
  ['super_admin', 'Super Admin'], ['admin', 'Admin'], ['employee', 'Employee'], ['vendor', 'Vendor'], ['freelancer', 'Freelancer'], ['candidate', 'Candidate']
];
const crmPermissionModules = [
  ['dashboard-full', 'Full Dashboard'], ['dashboard-projects', 'Dashboard: Project overview'], ['dashboard-monthly-analytics', 'Dashboard: Monthly project analytics'], ['dashboard-project-status', 'Dashboard: Project status summary'], ['dashboard-recent-activity', 'Dashboard: Recent activity'], ['dashboard-upcoming-deadlines', 'Dashboard: Upcoming deadlines'], ['dashboard-card-total-projects', 'Dashboard card: Total Projects'], ['dashboard-card-live-projects', 'Dashboard card: Live Projects'], ['dashboard-card-completed-projects', 'Dashboard card: Completed Projects'], ['dashboard-card-pending-projects', 'Dashboard card: Pending Projects'], ['dashboard-card-candidates', 'Dashboard card: Candidates'], ['dashboard-card-vendors', 'Dashboard card: Vendors'], ['dashboard-card-freelancers', 'Dashboard card: Freelancers'], ['dashboard-card-employees', 'Dashboard card: Employees'], ['outreach-dashboard', 'Outreach & Communication Dashboard'], ['projects', 'Projects'], ['project-applications', 'Project Applications'], ['password-setup-status', 'Password Setup Status'], ['employee-activity-report', 'Employee Activity Report'], ['portal-directory', 'Portal Directory'], ['clients', 'Clients'], ['candidates', 'Candidates'], ['vendors', 'Vendors'], ['freelancers', 'Freelancers'], ['employees', 'Employees'], ['allocation', 'Allocation'], ['tasks', 'Tasks'], ['payments', 'Payments']
];
const actions = salesAccessActions;
const usersPerPage=50;
const permissionModules=[...crmPermissionModules,['sales','Sales module access'],...salesAccessModules.map(module=>[module.key,module.label])];
const moduleActions=key=>key==='outreach-dashboard'||key.startsWith('dashboard-card-')?['view']:key==='sales'?actions:key.startsWith('sales-')?actions:['view','create','edit','delete'];
const groupFor=key=>key==='sales'?'Sales module access':salesAccessModules.find(module=>module.key===key)?.section;

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
  const [accessPanels, setAccessPanels] = useState({matrix:true,partner:false});
  const [userPage,setUserPage]=useState(1);
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
    const matchesPermission = !permissionFilter || moduleActions(permissionFilter).some(action=>granted[permissionFilter]?.[action]);
    return matchesText && matchesRole && matchesStatus && matchesLogin && matchesPermission;
  }), [users, query, roleFilter, statusFilter, loginFilter, permissionFilter]);
  useEffect(()=>{setUserPage(1);},[query,roleFilter,statusFilter,loginFilter,permissionFilter]);
  const userPageCount=Math.max(1,Math.ceil(filteredUsers.length/usersPerPage));
  const currentUserPage=Math.min(userPage,userPageCount);
  const pageUsers=filteredUsers.slice((currentUserPage-1)*usersPerPage,currentUserPage*usersPerPage);
  const firstUserIndex=filteredUsers.length?(currentUserPage-1)*usersPerPage+1:0;
  const lastUserIndex=Math.min(currentUserPage*usersPerPage,filteredUsers.length);

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
    const existing = {...(user.effectiveSalesAccess || {}),...(user.accessPermissions || {})};
    setPermissions(Object.fromEntries(permissionModules.map(([key]) => [key, moduleActions(key).reduce((item, action) => ({ ...item, [action]: Boolean(existing[key]?.[action]) }), {})])));
  }

  function updatePermission(key, action, enabled) {
    setPermissions(current => {
      const updated = { ...current, [key]: { ...current[key], [action]: enabled } };
      if (key === 'sales') {
        salesAccessModules.forEach(module => {
          updated[module.key] = { ...current[module.key], [action]: enabled };
        });
      } else if (key.startsWith('sales-')) {
        updated.sales = {
          ...current.sales,
          [action]: enabled || salesAccessModules.some(module => module.key !== key && current[module.key]?.[action])
        };
      }
      return updated;
    });
  }

  async function savePermissions() {
    setBusy(true);
    try {
      await endpoints.updateUserPermissions(permissionUser._id, permissions);
      toast.success('CRM and Sales permissions updated');
      setPermissionUser(null);
      await load();
    } catch (error) { toast.error(error.message); } finally { setBusy(false); }
  }

  if (!users) return <Loading label="Loading access control..." />;
  const modules = [...navItems.filter((item) => item.path !== '/access-control'),...salesAccessModules.map(module=>({label:module.label,path:'/sales/'+module.page,roles:module.page==='permissions'?['super_admin']:salesRoles}))];

  return <>
    <PageHeader title="Roles & Permissions">Manage CRM and Sales access, roles, and user permissions in one place.</PageHeader>

    <div role="group" aria-label="Access information" className="mb-6 grid gap-3 sm:grid-cols-2">
      <button id="role-matrix-tab" type="button" aria-expanded={accessPanels.matrix} aria-controls="role-access-panel" onClick={()=>setAccessPanels(current=>({...current,matrix:!current.matrix}))} className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${accessPanels.matrix?'border-indigo-300 bg-indigo-50 text-indigo-900 shadow-sm':'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-slate-50'}`}>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white shadow-sm"><ShieldCheck className="h-5 w-5 text-indigo-600"/></span>
        <span><span className="block font-bold">Role access matrix</span><span className="mt-1 block text-xs font-normal text-slate-500">See module access for each role</span></span>
      </button>
      <button id="partner-access-tab" type="button" aria-expanded={accessPanels.partner} aria-controls="partner-access-panel" onClick={()=>setAccessPanels(current=>({...current,partner:!current.partner}))} className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${accessPanels.partner?'border-indigo-300 bg-indigo-50 text-indigo-900 shadow-sm':'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-slate-50'}`}>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white shadow-sm"><LayoutDashboard className="h-5 w-5 text-indigo-600"/></span>
        <span><span className="block font-bold">Partner dashboard access</span><span className="mt-1 block text-xs font-normal text-slate-500">Review vendor, freelancer and candidate access</span></span>
      </button>
    </div>

    <section id="role-access-panel" aria-labelledby="role-matrix-tab" hidden={!accessPanels.matrix} className="card overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50 p-5"><div className="flex items-center gap-2 font-bold text-slate-950"><ShieldCheck className="h-5 w-5 text-indigo-600" />Role access matrix</div><p className="mt-1 text-sm text-slate-500">A check means that role can see and use the module. Backend API access is protected by the same role rules.</p></div>
      <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-white"><tr><th className="sticky left-0 z-10 bg-white px-5 py-3 text-left font-semibold text-slate-600">Module</th>{roles.map(([, label]) => <th key={label} className="px-4 py-3 text-center font-semibold text-slate-600">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{modules.map((module) => <tr key={module.path}><td className="sticky left-0 bg-white px-5 py-3 font-semibold text-slate-800">{module.label}<span className="ml-2 font-mono text-xs font-normal text-slate-400">{module.path}</span></td>{roles.map(([role]) => <td key={role} className="px-4 py-3 text-center">{module.roles?.includes(role) ? <Check className="mx-auto h-4 w-4 text-emerald-600" /> : <X className="mx-auto h-4 w-4 text-slate-300" />}</td>)}</tr>)}</tbody></table></div>
    </section>

    <section id="partner-access-panel" aria-labelledby="partner-access-tab" hidden={!accessPanels.partner} className="card overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50 p-5"><div className="font-bold text-slate-950">Partner dashboard access</div><p className="mt-1 text-sm text-slate-500">Vendor, Freelancer and Candidate dashboards are limited to their own assigned work. They cannot view other teams&apos; projects, people, payments or organisation-wide resource data.</p></div>
      <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-white"><tr><th className="px-5 py-3 text-left font-semibold text-slate-600">Role</th><th className="px-5 py-3 text-left font-semibold text-slate-600">Can assess</th><th className="px-5 py-3 text-left font-semibold text-slate-600">Can view on dashboard</th></tr></thead><tbody className="divide-y divide-slate-100">{dashboardRoleAccess.map(([role, scope, views]) => <tr key={role}><td className="px-5 py-3 font-semibold text-slate-800">{role}</td><td className="px-5 py-3 text-slate-700">{scope}</td><td className="px-5 py-3 text-slate-700">{views}</td></tr>)}</tbody></table></div>
    </section>
    <section className="card mt-6 overflow-hidden">
      <div className="border-b border-slate-200 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div><h2 className="font-bold text-slate-950">User access</h2><p className="text-sm text-slate-500">Select a user, then use Permissions to enable each dashboard section or module individually.</p></div>
          <label className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="input w-full pl-9 xl:w-72" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search user or role" /></label>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <select className="input" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="">All roles</option>{roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All status</option><option value="true">Active</option><option value="false">Inactive</option></select>
          <select className="input" value={loginFilter} onChange={(event) => setLoginFilter(event.target.value)}><option value="">Any login status</option><option value="logged-in">Logged in</option><option value="never">Never logged in</option></select>
          <select className="input" value={permissionFilter} onChange={(event) => setPermissionFilter(event.target.value)}><option value="">Any custom permission</option>{permissionModules.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50"><tr>{['User', 'Current role', 'Granted permissions', 'Last login', 'Status', 'Access'].map((item) => <th key={item} className="px-4 py-3 text-left font-semibold text-slate-600">{item}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {pageUsers.map((user) => <tr key={user._id}>
              <td className="px-4 py-3"><p className="font-semibold text-slate-900">{user.name}</p><p className="text-xs text-slate-500">{user.email}</p></td>
              <td className="px-4 py-3 capitalize text-slate-700">{user.role.replace('_', ' ')}</td>
              <td className="max-w-xs px-4 py-3"><PermissionSummary permissions={user.accessPermissions} /></td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}</td>
              <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${user.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{user.isActive ? 'Active' : 'Inactive'}</span></td>
              <td className="flex gap-2 px-4 py-3"><button onClick={() => { setEditing(user); setNewRole(user.role); }} className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50"><Pencil className="h-3.5 w-3.5" />Role</button><button onClick={() => openPermissions(user)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">Permissions</button></td>
            </tr>)}
            {!filteredUsers.length && <tr><td colSpan="6" className="px-4 py-10 text-center text-slate-500">No users found with these filters.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 text-sm text-slate-600">
        <p>Showing {firstUserIndex}-{lastUserIndex} of {filteredUsers.length} users · 50 per page</p>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-secondary" aria-label="Previous user page" disabled={currentUserPage<=1} onClick={()=>setUserPage(currentUserPage-1)}><ChevronLeft className="h-4 w-4"/></button>
          <span className="min-w-24 text-center">Page {currentUserPage} of {userPageCount}</span>
          <button type="button" className="btn-secondary" aria-label="Next user page" disabled={currentUserPage>=userPageCount} onClick={()=>setUserPage(currentUserPage+1)}><ChevronRight className="h-4 w-4"/></button>
        </div>
      </div>
    </section>

    {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 className="text-lg font-bold text-slate-950">Change access role</h2><p className="mt-1 text-sm text-slate-600">{editing.name} will immediately receive the access defined for the selected role.</p><label className="mt-5 block"><span className="mb-1 block text-sm font-semibold text-slate-700">Role</span><select className="input" value={newRole} onChange={(event) => setNewRole(event.target.value)}>{roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><div className="mt-6 flex justify-end gap-3"><button className="btn-secondary" disabled={busy} onClick={() => setEditing(null)}>Cancel</button><button className="btn-primary" disabled={busy} onClick={saveRole}>{busy ? 'Saving...' : 'Save access'}</button></div></div></div>}
    {permissionUser && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"><div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl"><div className="border-b border-slate-200 p-6"><h2 className="text-lg font-bold text-slate-950">Module permissions</h2><p className="mt-1 text-sm text-slate-600">{permissionUser.name}: select exactly what they can do. Sales access applies only to their own records.</p><div className="mt-3 flex flex-wrap gap-2">{[true,false].map(enabled=><button key={String(enabled)} type="button" className="btn-secondary text-xs" onClick={()=>setPermissions(current=>({...current,...Object.fromEntries(['sales',...salesAccessModules.map(module=>module.key)].map(key=>[key,Object.fromEntries(actions.map(action=>[action,enabled]))]))}))}>{enabled?'Enable all Sales modules':'Disable all Sales modules'}</button>)}</div></div><div className="overflow-auto p-6"><table className="min-w-full text-sm"><thead><tr><th className="pb-3 text-left text-slate-600">Module</th>{actions.map((action) => <th key={action} className="px-3 pb-3 text-center capitalize text-slate-600">{action}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{permissionModules.map(([key,label],index)=>{
const group=groupFor(key),previous=groupFor(permissionModules[index-1]?.[0]);
return <Fragment key={key}>
{group&&group!==previous&&<tr className="bg-indigo-50"><td colSpan={actions.length+1} className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-indigo-700">{group}</td></tr>}
<tr><td className="py-3 font-semibold text-slate-800">{label}</td>{actions.map(action=><td key={action} className="px-3 py-3 text-center">{moduleActions(key).includes(action)?<input aria-label={label+' '+action} type="checkbox" className="h-4 w-4 accent-indigo-600" checked={Boolean(permissions[key]?.[action])} onChange={event=>updatePermission(key,action,event.target.checked)}/>:<span className="text-slate-300">?</span>}</td>)}</tr>
</Fragment>;})}</tbody></table></div><div className="flex justify-end gap-3 border-t border-slate-200 p-5"><button className="btn-secondary" disabled={busy} onClick={() => setPermissionUser(null)}>Cancel</button><button className="btn-primary" disabled={busy} onClick={savePermissions}>{busy ? 'Saving...' : 'Save permissions'}</button></div></div></div>}
  </>;
}

function PermissionSummary({ permissions = {} }) {
  const granted = permissionModules.flatMap(([key, label]) => {
    const actionsGranted = moduleActions(key).filter((action) => permissions?.[key]?.[action]);
    return actionsGranted.length ? [{ label, actions: actionsGranted }] : [];
  });
  if (!granted.length) return <span className="text-xs text-slate-400">Role default access</span>;
  return <div className="flex flex-wrap gap-1.5">{granted.map((item) => <span key={item.label} title={`${item.label}: ${item.actions.join(', ')}`} className="rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700">{item.label} · {item.actions.join('/')}</span>)}</div>;
}
