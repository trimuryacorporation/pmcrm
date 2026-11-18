import { ArrowRight, BriefcaseBusiness, ShieldCheck, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return <main className="min-h-screen bg-slate-950 text-white">
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6"><strong className="text-lg">Trimurya Enterprise CRM</strong><Link className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/10" to="/login">Secure login</Link></header>
    <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 text-center sm:pb-28 sm:pt-24"><p className="font-semibold uppercase tracking-[0.2em] text-indigo-300">Project management &amp; workforce coordination</p><h1 className="mx-auto mt-5 max-w-4xl text-4xl font-black leading-tight sm:text-6xl">A project management CRM for your people and delivery.</h1><p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">Trimurya Enterprise CRM brings project tracking, employee coordination, vendor and freelancer management, candidate records, tasks and payment workflows into one secure workspace.</p><Link className="mt-9 inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-3 font-bold hover:bg-indigo-400" to="/login">Access your workspace <ArrowRight className="h-4 w-4" /></Link></section>
    <section aria-labelledby="platform-features" className="mx-auto max-w-6xl px-6 pb-16">
      <h2 id="platform-features" className="mb-5 text-center text-2xl font-bold">Project and workforce management in one platform</h2>
      <div className="grid gap-5 md:grid-cols-3"><Feature icon={BriefcaseBusiness} title="Project tracking" text="Track project assignments, deadlines, status and operational progress in one place." /><Feature icon={UsersRound} title="Workforce and partner management" text="Coordinate employees, vendors, freelancers and candidate records through a shared CRM workspace." /><Feature icon={ShieldCheck} title="Tasks, payments and access control" text="Manage task workflows and payment records while using role-based access to protect business information." /></div>
    </section>
  </main>;
}

function Feature({ icon: Icon, title, text }) {
  return <article className="rounded-2xl border border-white/10 bg-white/5 p-6"><Icon className="h-6 w-6 text-indigo-300" /><h2 className="mt-5 text-lg font-bold">{title}</h2><p className="mt-2 leading-6 text-slate-300">{text}</p></article>;
}