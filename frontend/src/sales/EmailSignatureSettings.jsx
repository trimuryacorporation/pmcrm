import { useEffect, useState } from 'react';
import { PenLine, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { salesApi } from './api.js';

export default function EmailSignatureSettings({onSaved}) {
  const [value,setValue]=useState({signature:'',autoInclude:true});
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{let active=true;salesApi('/email-preferences').then(data=>{if(active)setValue(data);}).catch(err=>{if(active)setError(err.message);}).finally(()=>{if(active)setLoading(false);});return ()=>{active=false;};},[]);
  async function save(event){event.preventDefault();event.stopPropagation();setBusy(true);setError('');try{const saved=await salesApi('/email-preferences','PATCH',value);setValue(saved);onSaved?.(saved);toast.success('Your email signature is saved');}catch(err){setError(err.message);}finally{setBusy(false);}}
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center gap-3"><div className="rounded-xl bg-blue-50 p-2 text-blue-600"><PenLine className="h-5 w-5"/></div><div><h2 className="font-semibold text-slate-900">Email signature</h2><p className="mt-1 text-xs text-slate-500">Your personal signature for Sales emails.</p></div></div>
    {error&&<p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {loading?<div className="mt-4 h-28 animate-pulse rounded-lg bg-slate-100"/>:<div className="mt-4 space-y-4">
      <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">Signature text</span><textarea aria-label="Email signature text" maxLength={5000} rows={5} className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={value.signature} onChange={event=>setValue(current=>({...current,signature:event.target.value}))} placeholder={'Your name\nDesignation | Company\nPhone | Website'}/><span className="mt-1 block text-xs text-slate-400">{value.signature.length} / 5,000 characters</span></label>
      <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" className="h-4 w-4 accent-blue-600" checked={value.autoInclude} onChange={event=>setValue(current=>({...current,autoInclude:event.target.checked}))}/>Automatically add to new emails</label>
      {value.signature&&<div className="rounded-xl bg-slate-50 p-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Signature preview</p><p className="whitespace-pre-wrap break-words text-sm text-slate-700">{value.signature}</p></div>}
      <button type="button" onClick={save} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"><Save className="h-4 w-4"/>{busy?'Saving...':'Save signature'}</button>
    </div>}
  </section>;
}
