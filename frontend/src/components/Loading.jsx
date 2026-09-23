export default function Loading({ label = 'Loading workspace...' }) {
  return (
    <div className="grid min-h-64 place-items-center">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
        <p className="mt-3 text-sm font-medium text-slate-500">{label}</p>
      </div>
    </div>
  );
}
