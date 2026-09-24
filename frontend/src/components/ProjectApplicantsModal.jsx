import { ChevronRight, FileQuestion, Users, X } from 'lucide-react';
import { useState } from 'react';

function applicantName(application) {
  return application.applicant?.name || application.applicant?.email || 'Deleted account';
}

function profileFor(application) {
  const applicant = application.applicant || {};
  return applicant.linkedVendor || applicant.linkedFreelancer || applicant.linkedEmployee || {};
}

function profileDetails(application) {
  const applicant = application.applicant || {};
  const profile = profileFor(application);
  const details = [
    ['Contact number', profile.phone || profile.mobile],
    ['Email', profile.email || applicant.email],
    ['Location', profile.location || profile.address],
    ['Contact person', profile.contactPerson],
    ['Employee ID', profile.employeeId],
    ['Department', profile.department],
    ['Designation', profile.designation],
    ['Experience', profile.experience],
    ['Availability', profile.availability || profile.availabilityStatus],
    ['Languages', profile.language || profile.languagesAvailable],
    ['Skills', profile.skills],
    ['Project types', profile.projectTypes],
    ['Team capacity', profile.teamCapacity],
    ['Daily production capacity', profile.dailyProductionCapacity],
    ['Status', profile.status]
  ];
  return details.filter(([, value]) => value !== undefined && value !== null && value !== '');
}

function displayValue(value) {
  return Array.isArray(value) ? value.join(', ') : String(value);
}

export default function ProjectApplicantsModal({ applications, onClose }) {
  const [selected, setSelected] = useState(applications[0] || null);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5">
      <section role="dialog" aria-modal="true" aria-label="Project applicants" className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Project applications</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">Applicants ({applications.length})</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" aria-label="Close applicants"><X className="h-4 w-4" /></button>
        </div>
        {!applications.length ? (
          <div className="grid min-h-64 place-items-center px-6 text-center"><div><Users className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 font-semibold text-slate-700">No applications yet</p><p className="mt-1 text-sm text-slate-500">Applicants will appear here after they apply.</p></div></div>
        ) : (
          <div className="grid min-h-0 flex-1 overflow-hidden md:grid-cols-[0.8fr_1.2fr]">
            <div className="overflow-y-auto border-b border-slate-200 p-3 md:border-b-0 md:border-r">
              {applications.map((application) => (
                <button key={application._id} type="button" onClick={() => setSelected(application)} className={`mb-2 flex w-full items-center justify-between rounded-xl p-3 text-left transition ${selected?._id === application._id ? 'bg-indigo-50 text-indigo-950 ring-1 ring-indigo-200' : 'hover:bg-slate-50'}`}>
                  <span className="min-w-0"><span className="block truncate text-sm font-bold">{applicantName(application)}</span><span className="mt-0.5 block text-xs capitalize text-slate-500">{application.applicantRole} · {new Date(application.createdAt).toLocaleDateString('en-IN')}</span></span><ChevronRight className="h-4 w-4 shrink-0" />
                </button>
              ))}
            </div>
            {selected && <div className="overflow-y-auto p-5 sm:p-6"><div className="rounded-xl bg-slate-50 p-4"><h3 className="text-lg font-bold text-slate-950">{applicantName(selected)}</h3><p className="mt-1 text-sm text-slate-600">{selected.applicant?.email || 'No email available'}</p><p className="mt-2 inline-flex rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold capitalize text-indigo-700">{selected.applicantRole}</p></div><div className="mt-5"><h4 className="font-bold text-slate-950">Profile details</h4><dl className="mt-3 grid gap-2 sm:grid-cols-2">{profileDetails(selected).map(([label, value]) => <div key={label} className="rounded-lg border border-slate-200 px-3 py-2.5"><dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-slate-800">{displayValue(value)}</dd></div>)}</dl></div><div className="mt-5 space-y-4"><h4 className="flex items-center gap-2 font-bold text-slate-950"><FileQuestion className="h-4 w-4 text-indigo-600" />Application answers</h4>{selected.answers.map((answer, index) => <div key={`${answer.question}-${index}`} className="rounded-xl border border-slate-200 p-4"><p className="text-sm font-bold text-slate-800">{index + 1}. {answer.question}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{answer.answer}</p></div>)}</div></div>}
          </div>
        )}
        <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-3.5 sm:px-6"><button type="button" className="btn-secondary" onClick={onClose}>Close</button></div>
      </section>
    </div>
  );
}
