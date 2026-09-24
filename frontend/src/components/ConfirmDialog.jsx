import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDialog({ title, message, confirming, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-[2px]">
      <section role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-rose-100 text-rose-600"><AlertTriangle className="h-5 w-5" /></span>
            <div><h2 id="confirm-dialog-title" className="text-lg font-bold text-slate-950">{title}</h2><p className="mt-1 text-sm text-slate-600">{message}</p></div>
          </div>
          <button type="button" aria-label="Close" onClick={onCancel} disabled={confirming} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={confirming}>No</button>
          <button type="button" onClick={onConfirm} disabled={confirming} className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60">{confirming ? 'Deleting...' : 'Yes, delete'}</button>
        </div>
      </section>
    </div>
  );
}
