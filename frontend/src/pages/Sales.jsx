import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { resources, pageResources } from '../data/sales.js';
import { services } from '../../../backend/src/sales/config.js';
import { salesApi } from '../sales/api.js';
import SalesRecords from '../sales/SalesRecords.jsx';
import SalesDashboard from '../sales/SalesDashboard.jsx';
import EmailSignatureSettings from '../sales/EmailSignatureSettings.jsx';
import SalesTargets from '../sales/SalesTargets.jsx';

export default function Sales() {
  const {page='dashboard'}=useParams();
  const [metadata,setMetadata]=useState(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{let current=true;setError('');salesApi('/metadata').then(data=>{if(current)setMetadata({...data,serviceCategories:[...new Set([...services,...(data.settings?.serviceCategories || [])])]});}).catch(err=>{if(current)setError(err.message);});return ()=>{current=false;};},[retry,page]);
  const resource=pageResources[page] || page;
  const computed=['dashboard','analytics','team-performance','revenue','reports'].includes(page);
  if(!computed&&!resources[resource])return <Navigate to="/sales/dashboard" replace/>;
  if(error)return <div role="alert" className="rounded-xl border border-rose-200 bg-white p-6 text-rose-700">{error}<button className="btn-secondary ml-3" onClick={()=>setRetry(current=>current+1)}>Retry</button></div>;
  if(!metadata)return <div className="space-y-4">{[1,2,3,4].map(key=><div key={key} className="h-20 animate-pulse rounded-xl bg-slate-200"/>)}</div>;
  if(!metadata.pages?.[page]?.view && page!=='companies')return <div role="alert" className="rounded-xl border bg-white p-6 text-slate-700">You do not have access to this Sales page.</div>;
  if(page==='settings')return <div className="space-y-6">{metadata.permissions.emails?.view&&<EmailSignatureSettings/>}<SalesRecords key={page} page={page} resource={resource} metadata={metadata}/></div>;
  if(page==='targets'&&metadata.permissions.targets?.view)return <SalesTargets metadata={metadata}/>;
  return computed?<SalesDashboard key={page} page={page} metadata={metadata}/>:<SalesRecords key={page} page={page} resource={resource} metadata={metadata}/>;
}