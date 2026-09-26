import { Activity, Briefcase, Building2, CheckCircle2, Clock3, IndianRupee, KeyRound, Mail, RefreshCw, UserCheck, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link } from 'react-router-dom';
import Loading from '../components/Loading.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatCard from '../components/StatCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { endpoints } from '../utils/api.js';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import ProjectApplicantsModal from '../components/ProjectApplicantsModal.jsx';

const palette = ['#2563eb', '#4f46e5', '#7c3aed', '#14b8a6', '#f97316'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [passwordStatus, setPasswordStatus] = useState('');
  const [sendingInviteId, setSendingInviteId] = useState('');
  const [selectedProjectApplicants, setSelectedProjectApplicants] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  async function loadDashboard() {
    const response = await endpoints.dashboard();
    setData(response);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function refreshDashboard() {
    setRefreshing(true);
    try {
      await loadDashboard();
      toast.success('Dashboard refreshed');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setRefreshing(false);
    }
  }

  if (!data) return <Loading />;
  const cards = data.cards || {};
  const monthly = data.monthlyProjects?.map((item) => ({ month: item._id, projects: item.projects, completed: item.completed })) || [];
  const summary = data.statusSummary?.map((item) => ({ name: item._id, value: item.count })) || [];
  const languageSummary = data.languageSummary || [];
  const passwordSetup = data.passwordSetup || { summary: [], records: [] };
  const selectedPasswordRecords = passwordSetup.records.filter((item) => item.status === passwordStatus);
  const isAdmin = ['super_admin', 'admin'].includes(user?.role);
  const canViewFullDashboard = isAdmin || Boolean(user?.accessPermissions?.['dashboard-full']?.view);
  const canViewProjectApplications = canViewFullDashboard || Boolean(user?.accessPermissions?.['project-applications']?.view);
  const canViewPasswordSetup = canViewFullDashboard || Boolean(user?.accessPermissions?.['password-setup-status']?.view);
  const applicantsByProject = (data.projectApplications || []).reduce((groups, application) => {
    const project = application.project;
    if (!project?._id) return groups;
    const id = String(project._id);
    if (!groups[id]) groups[id] = { project, applications: [] };
    groups[id].applications.push(application);
    return groups;
  }, {});
  const projectApplicantGroups = Object.values(applicantsByProject);

  async function sendSetupEmail(person) {
    if (!person.profileId) return toast.error('This account is not linked to a person profile.');
    setSendingInviteId(person.id);
    try {
      const response = person.resource === 'employees'
        ? await endpoints.inviteEmployee(person.profileId)
        : await endpoints.invitePerson(person.resource, person.profileId);
      toast.success(response.message);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSendingInviteId('');
    }
  }

  return (
    <>
      <PageHeader title="Enterprise Dashboard" action={<button className="btn-secondary" disabled={refreshing} onClick={refreshDashboard}><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />{refreshing ? 'Refreshing...' : 'Refresh'}</button>}>Live operational analytics from MongoDB across projects, people, workload, deadlines, and payments.</PageHeader>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Projects" value={cards.totalProjects} icon={Briefcase} to="/projects" />
        <StatCard label="Live Projects" value={cards.activeProjects} icon={Activity} accent="from-emerald-500 to-teal-600" to="/projects?status=Live" />
        <StatCard label="Completed Projects" value={cards.completedProjects} icon={CheckCircle2} accent="from-blue-500 to-cyan-600" to="/projects?status=Completed" />
        <StatCard label="Pending Projects" value={cards.pendingProjects} icon={Clock3} accent="from-amber-500 to-orange-600" to="/projects?status=Pre-Sale,Not%20Live,On%20Hold,Draft" />
        {canViewFullDashboard && <><StatCard label="Candidates" value={cards.totalCandidates} icon={UserCheck} to="/candidates" />
        <StatCard label="Vendors" value={cards.totalVendors} icon={Building2} accent="from-purple-500 to-indigo-600" to="/vendors" />
        <StatCard label="Freelancers" value={cards.totalFreelancers} icon={Users} accent="from-sky-500 to-blue-600" to="/freelancers" />
        <StatCard label="Employees" value={cards.totalEmployees} icon={Users} accent="from-slate-700 to-slate-950" to="/employees" /></>}
      </div>

      {canViewPasswordSetup && passwordSetup.summary.length > 0 && <div className="card mt-6 p-5">
        <div className="mb-4 flex items-center gap-2"><KeyRound className="h-5 w-5 text-indigo-600" /><div><h3 className="font-bold text-slate-950">Password Setup Status</h3><p className="mt-0.5 text-sm text-slate-500">Click a status to view the people in that group.</p></div></div>
        <div className="grid gap-3 sm:grid-cols-3">
          {passwordSetup.summary.map((item) => <button key={item.status} type="button" onClick={() => setPasswordStatus(item.status)} className={`rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${item.status === 'Password set' ? 'border-emerald-200 bg-emerald-50' : item.status === 'Setup pending' ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}><p className="text-sm font-semibold text-slate-700">{item.status}</p><p className="mt-2 text-3xl font-black text-slate-950">{item.count}</p><p className="mt-1 text-xs font-semibold text-indigo-600">View people →</p></button>)}
        </div>
      </div>}

      {canViewProjectApplications && <div className="card mt-6 p-5">
        <div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="font-bold text-slate-950">Project Applications</h3><p className="mt-1 text-sm text-slate-500">See who applied to each project. Click a project to view applicant details.</p></div><span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-bold text-indigo-700">{data.projectApplications?.length || 0} total</span></div>
        {projectApplicantGroups.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{projectApplicantGroups.map(({ project, applications }) => <button key={project._id} type="button" onClick={() => setSelectedProjectApplicants({ project, applications })} className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-bold text-slate-900">{project.name}</p><p className="mt-1 text-xs font-semibold text-indigo-600">{project.code || 'Project'}</p></div><span className="shrink-0 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700">{applications.length} applied</span></div><div className="mt-4 flex -space-x-1.5 overflow-hidden">{applications.slice(0, 5).map((application) => <span key={application._id} title={application.applicant?.name || application.applicant?.email || 'Applicant'} className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-slate-200 text-[10px] font-bold text-slate-700">{(application.applicant?.name || application.applicant?.email || '?').slice(0, 1).toUpperCase()}</span>)}{applications.length > 5 && <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-indigo-600 text-[10px] font-bold text-white">+{applications.length - 5}</span>}</div><p className="mt-3 text-xs font-semibold text-indigo-700">View applicants →</p></button>)}</div> : <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">No project applications received yet.</p>}
      </div>}

      {canViewFullDashboard && <div className="card mt-6 overflow-hidden">
        <div className="border-b border-slate-200 p-5"><h3 className="font-bold text-slate-950">Payment Recipients</h3><p className="mt-1 text-sm text-slate-500">Vendor and Freelancer payment details. Add the transaction ID while recording a payment to show it here.</p></div>
        {(data.paymentRecipients || []).length ? <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Name</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Transaction ID</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Mobile</th><th className="px-5 py-3 text-right">Amount</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{data.paymentRecipients.map((recipient) => <tr key={recipient.id} className="text-slate-700"><td className="px-5 py-3 font-semibold text-slate-900">{recipient.name}</td><td className="px-5 py-3"><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">{recipient.type}</span></td><td className="px-5 py-3 font-mono text-xs text-slate-600">{recipient.transactionId}</td><td className="px-5 py-3">{recipient.email}</td><td className="px-5 py-3">{recipient.phone}</td><td className="px-5 py-3 text-right font-semibold">₹{Number(recipient.amount || 0).toLocaleString('en-IN')}</td><td className="px-5 py-3"><StatusBadge value={recipient.status} /></td></tr>)}</tbody></table></div> : <p className="m-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">No Vendor or Freelancer payment records yet.</p>}
      </div>}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-slate-950">Monthly Project Analytics</h3>
            <StatusBadge value={`${data.completionPercentage}% Completed`} />
          </div>
          <div className="h-80">
            <ResponsiveContainer>
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="projects" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="projects" stroke="#4f46e5" fill="url(#projects)" strokeWidth={3} />
                <Area type="monotone" dataKey="completed" stroke="#14b8a6" fill="#14b8a622" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-5">
          <h3 className="mb-4 font-bold text-slate-950">Project Status Summary</h3>
          <div className="h-80">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={summary} dataKey="value" nameKey="name" innerRadius={68} outerRadius={108} paddingAngle={4}>
                  {summary.map((entry, index) => (
                    <Cell key={entry.name} fill={palette[index % palette.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card mt-6 p-5">
        <div className="mb-5">
          <h3 className="font-bold text-slate-950">Language-wise Resource Availability</h3>
          <p className="mt-1 text-sm text-slate-500">Candidates, vendors and freelancers available for each selected language.</p>
        </div>
        {languageSummary.length ? (
          <>
            <div className="h-80">
              <ResponsiveContainer>
                <BarChart data={languageSummary.slice(0, 12)} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="language" tick={{ fontSize: 11 }} interval={0} angle={-24} textAnchor="end" height={76} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="candidates" name="Candidates" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="vendors" name="Vendors" fill="#9333ea" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="freelancers" name="Freelancers" fill="#0284c7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="scrollbar-thin mt-5 overflow-x-auto rounded-lg border border-slate-100">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-3">Language</th><th className="px-4 py-3 text-center">Candidates</th><th className="px-4 py-3 text-center">Vendors</th><th className="px-4 py-3 text-center">Freelancers</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {languageSummary.map((item) => (
                    <tr key={item.language} className="text-slate-700 hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 font-medium">{item.language}</td>
                      <td className="px-4 py-3 text-center"><LanguageCountLink module="candidates" language={item.language} count={item.candidates} /></td>
                      <td className="px-4 py-3 text-center"><LanguageCountLink module="vendors" language={item.language} count={item.vendors} /></td>
                      <td className="px-4 py-3 text-center"><LanguageCountLink module="freelancers" language={item.language} count={item.freelancers} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">No language data has been added yet.</p>}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-2">
          <h3 className="mb-4 font-bold text-slate-950">Recent Activities</h3>
          <div className="space-y-3">
            {data.recentActivities.map((item) => (
              <div key={`${item.title}-${item.date}`} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                <div>
                  <p className="font-semibold text-slate-800">{item.title}</p>
                  <p className="text-sm text-slate-500">{item.meta}</p>
                </div>
                <span className="text-sm font-bold text-indigo-600">{item.progress}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          {canViewFullDashboard && <><StatCard label="Pending Payments" value={`₹${cards.pendingPayments.toLocaleString('en-IN')}`} icon={IndianRupee} accent="from-rose-500 to-orange-500" />
          <StatCard label="Paid Payments" value={`₹${cards.paidPayments.toLocaleString('en-IN')}`} icon={IndianRupee} accent="from-emerald-500 to-teal-600" /></>}
          <div className="card p-5">
            <h3 className="mb-4 font-bold text-slate-950">Upcoming Deadlines</h3>
            <div className="space-y-3">
              {data.upcomingDeadlines.map((project) => (
                <div key={project._id} className="rounded-lg bg-slate-50 p-3">
                  <p className="font-semibold text-slate-800">{project.name}</p>
                  <p className="text-sm text-slate-500">{new Date(project.endDate).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {passwordStatus && <PasswordStatusModal status={passwordStatus} records={selectedPasswordRecords} sendingInviteId={sendingInviteId} onSendSetupEmail={sendSetupEmail} onClose={() => setPasswordStatus('')} />}
      {selectedProjectApplicants && <ProjectApplicantsModal applications={selectedProjectApplicants.applications} onClose={() => setSelectedProjectApplicants(null)} />}
    </>
  );
}

function PasswordStatusModal({ status, records, sendingInviteId, onSendSetupEmail, onClose }) {
  const canSendEmail = status !== 'Password set';
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-label={`${status} people`} className="flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-slate-200 px-5 py-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">Password setup status</p><h2 className="mt-1 text-xl font-bold text-slate-950">{status} ({records.length})</h2></div><button type="button" onClick={onClose} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" aria-label="Close"><X className="h-4 w-4" /></button></div><div className="min-h-0 flex-1 overflow-y-auto p-4">{records.length ? <div className="space-y-2">{records.map((person) => <div key={person.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-3"><div className="min-w-0"><p className="truncate font-bold text-slate-900">{person.name}</p><p className="truncate text-sm text-slate-500">{person.email}</p>{person.mobile && <p className="truncate text-sm text-slate-500">Mobile: {person.mobile}</p>}</div><div className="flex shrink-0 items-center gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold capitalize text-slate-600">{person.role}</span>{canSendEmail && <button type="button" onClick={() => onSendSetupEmail(person)} disabled={!person.profileId || sendingInviteId === person.id} className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"><Mail className={`h-3.5 w-3.5 ${sendingInviteId === person.id ? 'animate-pulse' : ''}`} />{sendingInviteId === person.id ? 'Sending...' : 'Send email'}</button>}</div></div>)}</div> : <p className="py-12 text-center text-sm text-slate-500">No people in this status.</p>}</div><div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-right"><button type="button" className="btn-secondary" onClick={onClose}>Close</button></div></section></div>;
}

function LanguageCountLink({ module, language, count }) {
  if (!count) return <span className="text-slate-400">0</span>;
  return <Link to={`/${module}?language=${encodeURIComponent(language)}`} title={`View ${module} for ${language}`} className="inline-flex min-w-8 justify-center rounded-md bg-indigo-50 px-2 py-1 font-semibold text-indigo-700 transition hover:bg-indigo-600 hover:text-white">{count}</Link>;
}
