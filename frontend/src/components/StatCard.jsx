export default function StatCard({ label, value, icon: Icon, accent = 'from-blue-500 to-indigo-600', sub }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{value ?? 0}</p>
          {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        </div>
        {Icon && (
          <div className={`grid h-11 w-11 place-items-center rounded-lg bg-gradient-to-br ${accent} text-white`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
