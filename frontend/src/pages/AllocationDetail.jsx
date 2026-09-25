import { ArrowLeft, Briefcase, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Loading from '../components/Loading.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { endpoints } from '../utils/api.js';

function personName(item) {
  return item.employee?.name || item.vendor?.agencyName || item.freelancer?.name || item.candidate?.fullName || 'Unassigned person';
}

export default function AllocationDetail() {
  const { id } = useParams();
  const [allocation, setAllocation] = useState(null);

  useEffect(() => {
    endpoints.get('allocations', id).then(setAllocation);
  }, [id]);

  if (!allocation) return <Loading label="Loading allocation..." />;
  const languages = allocation.languages?.length ? allocation.languages.join(', ') : 'No languages selected';

  return <>
    <PageHeader title="Allocation Details" action={<Link className="btn-secondary" to="/allocation"><ArrowLeft className="h-4 w-4" />Back to Allocation</Link>}>
      Assignment details for the selected project resource.
    </PageHeader>
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <section className="card p-5">
        <h2 className="flex items-center gap-2 font-bold text-slate-950"><Briefcase className="h-5 w-5 text-indigo-600" />Project & Assignment</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <Detail label="Project" value={allocation.project?.name || '-'} />
          <Detail label="Project Code" value={allocation.project?.code || '-'} />
          <Detail label="Person Type" value={allocation.personType} />
          <Detail label="Assigned Person" value={personName(allocation)} />
          <Detail label="Role" value={allocation.role} />
          <Detail label="Work Status" value={<StatusBadge value={allocation.workStatus} />} />
          <Detail label="Completion" value={`${allocation.completionPercentage || 0}%`} />
          <Detail label="Assignment Date" value={allocation.assignmentDate ? new Date(allocation.assignmentDate).toLocaleString('en-IN') : '-'} />
        </dl>
      </section>
      <section className="card p-5">
        <h2 className="flex items-center gap-2 font-bold text-slate-950"><Users className="h-5 w-5 text-indigo-600" />Languages & Team Count</h2>
        <div className="mt-5 rounded-lg bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Selected Languages</p><p className="mt-2 text-sm font-medium text-slate-800">{languages}</p></div>
        <div className="mt-4 space-y-2">
          {allocation.languageTeamCounts?.length ? allocation.languageTeamCounts.map((item) => <div key={item.language} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3"><span className="font-medium text-slate-800">{item.language}</span><span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-bold text-indigo-700">{item.teamCount}</span></div>) : <p className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">No language-wise team count added.</p>}
        </div>
      </section>
    </div>
  </>;
}

function Detail({ label, value }) {
  return <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-sm font-medium text-slate-800">{value}</dd></div>;
}
