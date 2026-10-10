import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import SalesRecords from './SalesRecords.jsx';
import { salesApi } from './api.js';
import { services } from '../../../backend/src/sales/config.js';

export default function SalesRoleAccess() {
  const [metadata,setMetadata]=useState(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{
    let active=true;setError('');
    salesApi('/metadata').then(data=>{if(active)setMetadata({...data,serviceCategories:[...new Set([...services,...(data.settings?.serviceCategories || [])])]});}).catch(err=>{if(active)setError(err.message);});
    return ()=>{active=false;};
  },[retry]);
  return <section id="sales-roles-permissions" className="card mt-6 overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 p-5">
      <div><h2 className="flex items-center gap-2 font-bold text-slate-950"><ShieldCheck className="h-5 w-5 text-indigo-600"/>Sales Roles &amp; Permissions</h2><p className="mt-1 text-sm text-slate-500">Set Sales roles and module permissions here. User access controls above take precedence.</p></div>
      <Link to="/sales/permissions" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600">Open full page<ExternalLink className="h-4 w-4"/></Link>
    </div>
    <div className="p-5">
      {error?<div role="alert" className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">{error}<button className="btn-secondary ml-3" onClick={()=>setRetry(value=>value+1)}>Retry</button></div>:!metadata?<div aria-label="Loading Sales roles" className="h-40 animate-pulse rounded-xl bg-slate-100"/>:!metadata.pages?.permissions?.view?<p className="text-sm text-slate-500">You do not have access to Sales Roles &amp; Permissions.</p>:<SalesRecords page="permissions" resource="permissions" metadata={metadata}/>}
    </div>
  </section>;
}
