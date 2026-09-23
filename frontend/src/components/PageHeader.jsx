export default function PageHeader({ title, eyebrow, action, children }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">{eyebrow || 'Trimurya Enterprise CRM'}</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">{title}</h2>
        {children && <p className="mt-2 max-w-3xl text-sm text-slate-500">{children}</p>}
      </div>
      {action}
    </div>
  );
}
