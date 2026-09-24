import { Activity, Briefcase, Building2, CheckCircle2, Clock3, IndianRupee, UserCheck, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Loading from '../components/Loading.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatCard from '../components/StatCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { endpoints } from '../utils/api.js';

const palette = ['#2563eb', '#4f46e5', '#7c3aed', '#14b8a6', '#f97316'];

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    endpoints.dashboard().then(setData);
  }, []);

  if (!data) return <Loading />;
  const cards = data.cards || {};
  const monthly = data.monthlyProjects?.map((item) => ({ month: item._id, projects: item.projects, completed: item.completed })) || [];
  const summary = data.statusSummary?.map((item) => ({ name: item._id, value: item.count })) || [];

  return (
    <>
      <PageHeader title="Enterprise Dashboard">Live operational analytics from MongoDB across projects, people, workload, deadlines, and payments.</PageHeader>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Projects" value={cards.totalProjects} icon={Briefcase} />
        <StatCard label="Live Projects" value={cards.activeProjects} icon={Activity} accent="from-emerald-500 to-teal-600" />
        <StatCard label="Completed Projects" value={cards.completedProjects} icon={CheckCircle2} accent="from-blue-500 to-cyan-600" />
        <StatCard label="Pending Projects" value={cards.pendingProjects} icon={Clock3} accent="from-amber-500 to-orange-600" />
        <StatCard label="Candidates" value={cards.totalCandidates} icon={UserCheck} />
        <StatCard label="Vendors" value={cards.totalVendors} icon={Building2} accent="from-purple-500 to-indigo-600" />
        <StatCard label="Freelancers" value={cards.totalFreelancers} icon={Users} accent="from-sky-500 to-blue-600" />
        <StatCard label="Employees" value={cards.totalEmployees} icon={Users} accent="from-slate-700 to-slate-950" />
      </div>

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
          <StatCard label="Pending Payments" value={`₹${cards.pendingPayments.toLocaleString('en-IN')}`} icon={IndianRupee} accent="from-rose-500 to-orange-500" />
          <StatCard label="Paid Payments" value={`₹${cards.paidPayments.toLocaleString('en-IN')}`} icon={IndianRupee} accent="from-emerald-500 to-teal-600" />
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
    </>
  );
}
