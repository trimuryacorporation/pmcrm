import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Upload, Download, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { stages } from '../../../backend/src/sales/config.js';
import { resources, pageResources } from '../data/sales.js';
import { salesApi, salesDownload, display, money } from './api.js';
import SalesForm from './SalesForm.jsx';
export const pageFor=resource=>Object.entries(pageResources).find(([,value])=>value===resource)?.[0] || resource;
const actionFields=(resource,action,item)=>action==='move-stage'?[{key:'stage',label:'Pipeline Stage',type:'select',options:stages,required:true}]:action==='schedule'?[{key:'scheduledAt',label:'Send Date & Time',type:'datetime-local',required:true}]:action==='verify-signature'?[
  {key:'fileId',label:'Signed Evidence Document',type:'select',options:(item.files || []).map(file=>String(file.id)),required:true},
  {key:'signedDate',label:'Signature Date',type:'date',required:true},
  {key:'evidence',label:'How was the signature verified?',type:'textarea',required:true},
]:[];
export default function SalesDetail({resource,id,metadata,onClose,onEdit,onDelete,onChange,onOpen,onCreate}) {
  const [data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[actionForm,setActionForm]=useState(null),[tab,setTab]=useState('details');
  const page=window.location.pathname.split('/')[2];
  const pagePermissions=metadata.pages?.[page];
  const permissions=Object.fromEntries(Object.entries(metadata.permissions[resource] || {}).map(([action,value])=>[action,Boolean(value && pagePermissions?.[action]!==false)]));
  const load=()=>{setLoading(true);return salesApi('/'+resource+'/'+id).then(setData).catch(err=>setError(err.message)).finally(()=>setLoading(false));};
  useEffect(()=>{load();const previous=document.activeElement;const key=event=>{if(event.key==='Escape')onClose();};document.addEventListener('keydown',key);return ()=>{document.removeEventListener('keydown',key);previous?.focus();};},[resource,id]);
  const item=data?.item;
  async function run(action,values={}) {
    setBusy(true);try{const response=await salesApi('/'+resource+'/'+id+'/actions/'+action,'POST',{version:item.version,...values});toast.success(action==='send'?'Provider accepted the email': 'Action saved');setActionForm(null);await load();onChange();if(response.related&&response.resource!=='projects')onOpen(response.resource,response.related._id);}catch(err){toast.error(err.message);throw err;}finally{setBusy(false);}
  }
  async function upload(files) {
    if(!files.length)return;setBusy(true);
    try{const form=new FormData();[...files].forEach(file=>form.append('files',file));await salesApi('/'+resource+'/'+id+'/files','POST',form);toast.success('Private documents uploaded');await load();onChange();}catch(err){toast.error(err.message);}finally{setBusy(false);}
  }
  const buttons=[];
  if(item&&permissions.edit){
    if(resource==='deals'&&!['Won','Lost'].includes(item.stage))buttons.push(['move-stage','Move Stage']);
    if(resource==='research')buttons.push(['convert-to-lead','Convert to Lead']);
    if(resource==='leads'&&item.status==='Qualified')buttons.push(['convert-to-opportunity','Convert to Opportunity']);
    if(resource==='qualifications'){buttons.push(['qualify','Qualify Lead'],['disqualify','Disqualify'],['request-information','Request More Information']);if(item.status==='Qualified')buttons.push(['convert-to-opportunity','Convert to Opportunity']);}
    if(resource==='followups'&&item.status==='Pending')buttons.push(['complete','Complete Follow-up']);
    if(resource==='meetings'&&item.status==='Scheduled')buttons.push(['complete','Complete Meeting'],['cancel','Cancel Meeting']);
    if(resource==='proposals'){if(item.status==='Draft')buttons.push(['submit-approval','Submit for Approval']);if(item.status==='Pending Approval'&&permissions.approve)buttons.push(['approve','Approve']);if(item.status==='Approved')buttons.push(['send','Send to Client']);if(item.status==='Sent')buttons.push(['accept','Record Acceptance']);if(['Approved','Sent','Accepted','Rejected'].includes(item.status))buttons.push(['revise','Create Revised Draft']);}
    if(resource==='pricing'){if(['Draft','Pending Approval'].includes(item.status)&&permissions.approve)buttons.push(['approve','Approve Official Rate']);if(item.status==='Approved'&&permissions.create)buttons.push(['new-version','New Rate Version']);}
    if(resource==='contracts'&&item.status!=='Signed'&&permissions.approve)buttons.push(['verify-signature','Verify Signature']);
    if(resource==='handovers'){if(item.status==='Draft')buttons.push(['submit-review','Submit for Review']);if(item.status==='Pending Review'&&permissions.approve)buttons.push(['approve-handover','Approve & Create Operations Project']);}
    if(resource==='emails'){if(['Draft','Failed'].includes(item.status))buttons.push(['send','Send Email'],['schedule','Schedule Email']);if(item.status==='Scheduled')buttons.push(['cancel-schedule','Cancel Schedule']);}
  }
  const canEdit=item&&permissions.edit&&!( ['proposals','contracts','handovers'].includes(resource)&&['Approved','Sent','Accepted','Signed','Sending'].includes(item.status))&&!(resource==='pricing'&&item.status==='Approved')&&!(resource==='emails'&&['Sent','Sending','Scheduled'].includes(item.status));
  return <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50">
    <button className="absolute inset-0" aria-label="Close record details" onClick={onClose}/>
    <section role="dialog" aria-modal="true" aria-label="Record details" className="relative flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">
      <header className="flex items-center justify-between border-b p-5"><div><p className="text-xs font-semibold uppercase text-[#403DF0]">{resources[resource].title}</p><h2 className="mt-1 text-lg font-bold">{item?.name || item?.subject || item?.recordId || 'Record Details'}</h2></div><button autoFocus onClick={onClose} aria-label="Close details" className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5"/></button></header>
      {loading?<div className="space-y-4 p-6">{[1,2,3,4].map(key=><div key={key} className="h-12 animate-pulse rounded-lg bg-slate-100"/>)}</div>:error?<div role="alert" className="p-6 text-rose-700">{error}<button onClick={load} className="btn-secondary ml-3">Retry</button></div>:item&&<>
        <div className="flex flex-wrap gap-2 border-b px-5 py-3">
          {canEdit&&<button disabled={busy} onClick={()=>onEdit(item)} className="btn-secondary"><Pencil className="mr-1 h-4 w-4"/>Edit / Reschedule</button>}
          {permissions.delete&&<button disabled={busy} onClick={()=>onDelete(item)} className="btn-secondary text-rose-600"><Trash2 className="mr-1 h-4 w-4"/>Delete</button>}
          {buttons.map(([action,label])=><button key={action} disabled={busy} className="btn-secondary" onClick={()=>actionFields(resource,action,item).length?setActionForm({action,label}):run(action).catch(()=>{})}>{label}</button>)}
          {resource==='emails'&&item.status==='Template'&&metadata.permissions.emails?.create&&<button className="btn-secondary" onClick={()=>onCreate('emails',{company:item.company,to:item.to,subject:item.subject,body:item.body,status:'Draft'})}>Use Template</button>}
          {resource==='proposals'&&<button className="btn-secondary" onClick={()=>salesDownload('/proposals/'+id+'/pdf',item.recordId+'.pdf',true).catch(err=>toast.error(err.message))}>Preview / Download PDF</button>}
          {resource==='linkedin'&&item.linkedinUrl&&<a className="btn-secondary" href={item.linkedinUrl} target="_blank" rel="noopener noreferrer">Open LinkedIn <ExternalLink className="ml-2 h-4 w-4"/></a>}
          {item.project&&<Link className="btn-secondary" to={'/projects/'+item.project}>Open Operations Project</Link>}
          {resource==='leads'&&metadata.permissions.qualifications?.create&&<button className="btn-secondary" onClick={()=>onCreate('qualifications',{company:item.company,lead:item,assignedTo:item.assignedTo})}>Add Qualification</button>}
          {item.company&&<button className="btn-secondary" onClick={()=>onOpen('companies',item.company._id || item.company)}>Company Profile</button>}
          {['companies','leads','contacts','deals','calls','meetings'].includes(resource)&&metadata.permissions.followups?.create&&<button className="btn-secondary" onClick={()=>onCreate('followups',{company:resource==='companies'?item:item.company,lead:resource==='leads'?item:item.lead,contact:resource==='contacts'?item:item.contact,deal:resource==='deals'?item:item.deal,assignedTo:item.assignedTo,status:'Pending'})}>Schedule Follow-up</button>}
          {['companies','leads','deals','contacts'].includes(resource)&&metadata.permissions.activities?.create&&<button className="btn-secondary" onClick={()=>onCreate('activities',{company:resource==='companies'?item:item.company,lead:resource==='leads'?item:item.lead,deal:resource==='deals'?item:item.deal,contact:resource==='contacts'?item:item.contact,assignedTo:item.assignedTo,type:'Note'})}>Add Activity / Note</button>}
          {resource==='deals'&&metadata.permissions.proposals?.create&&<button className="btn-secondary" onClick={()=>onCreate('proposals',{company:item.company,deal:item,name:item.name,serviceCategory:item.serviceCategory,currency:item.currency,quantity:1,unitRate:item.estimatedValue,status:'Draft',assignedTo:item.assignedTo})}>Generate Quotation</button>}
          {resource==='deals'&&item.stage==='Won'&&metadata.permissions.onboarding?.create&&<button className="btn-secondary" onClick={()=>onCreate('onboarding',{name:item.name,company:item.company,deal:item,assignedTo:item.assignedTo})}>Start Onboarding</button>}
          {resource==='deals'&&item.stage==='Won'&&metadata.permissions.handovers?.create&&<button className="btn-secondary" onClick={()=>onCreate('handovers',{name:item.name,company:item.company,deal:item,serviceCategory:item.serviceCategory,currency:item.currency,assignedTo:item.assignedTo})}>Create Handover</button>}
        </div>
        <div className="flex gap-5 border-b px-5">{['details','documents','relationships','activity',...(['proposals','pricing','contracts'].includes(resource)?['versions']:[])].map(value=><button key={value} className={'py-3 text-sm font-semibold capitalize '+(tab===value?'border-b-2 border-[#403DF0] text-[#403DF0]':'text-slate-500')} onClick={()=>setTab(value)}>{value}</button>)}</div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {tab==='details'&&<><dl className="grid gap-5 sm:grid-cols-2">{[{key:'recordId',label:'Record ID'},...resources[resource].fields,{key:'createdAt',label:'Created Date',type:'datetime-local'}].map(field=><div key={field.key} className={['textarea','json'].includes(field.type)?'sm:col-span-2':''}><dt className="text-xs font-semibold text-slate-500">{field.key==='assignedTo'?'Added By':field.label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-900">{display((field.key==='assignedTo'?item.createdBy:item[field.key]),field.type)}</dd></div>)}</dl>{resource==='proposals'&&<p className="mt-5 rounded-xl bg-indigo-50 p-4 text-lg font-bold text-[#403DF0]">Total: {money(item.total,item.currency)}</p>}{resource==='onboarding'&&<div className="mt-5"><p className="text-sm font-bold">{item.completion || 0}% complete</p><progress className="mt-2 h-3 w-full accent-[#403DF0]" max="100" value={item.completion || 0}/></div>}{item.failure&&<p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">Provider error: {item.failure}</p>}{item.providerAcceptedAt&&<p className="mt-4 text-xs text-slate-500">Provider accepted: {display(item.providerAcceptedAt,'datetime-local')}. Delivery and read receipts are not tracked.</p>}</>}
          {tab==='documents'&&<div className="space-y-3">{permissions.edit&&!['Sent','Accepted','Signed','Approved'].includes(item.status)&&<label className="btn-secondary inline-flex cursor-pointer"><Upload className="mr-2 h-4 w-4"/>Upload Private Files<input disabled={busy} className="hidden" type="file" multiple accept=".pdf,.doc,.docx,.xlsx,.csv,.png,.jpg,.jpeg" onChange={event=>{upload(event.target.files);event.target.value='';}}/></label>}<p className="text-xs text-slate-500">Private storage · 10 MB per file · PDF, Office, CSV and images. Downloads require record access.</p>{item.files?.length?item.files.map(file=><div key={file.id} className="flex items-center justify-between rounded-xl border p-3"><div><p className="text-sm font-semibold">{file.name}</p><p className="text-xs text-slate-500">{Math.round(file.size/1024)} KB · {display(file.uploadedAt,'datetime-local')}</p></div><button className="btn-secondary" onClick={()=>salesDownload('/'+resource+'/'+id+'/files/'+file.id,file.name).catch(err=>toast.error(err.message))}><Download className="h-4 w-4"/></button></div>):<p className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">No documents uploaded.</p>}</div>}
          {tab==='relationships'&&<div className="space-y-5">{Object.entries(data.related || {}).map(([related,rows])=><div key={related}><h3 className="mb-2 text-sm font-bold">{resources[related].title}</h3>{rows.length?rows.map(row=><button key={row._id} onClick={()=>onOpen(related,row._id)} className="flex w-full items-center justify-between border-b py-3 text-left text-sm hover:text-[#403DF0]"><span>{row.name || row.subject || row.summary || row.recordId}</span><span className="text-xs text-slate-500">{row.stage || row.status}</span></button>):<p className="text-sm text-slate-400">No linked records.</p>}</div>)}{!Object.keys(data.related || {}).length&&<p className="text-sm text-slate-500">No child records for this module.</p>}</div>}
          {tab==='activity'&&<ol className="space-y-4">{data.history?.map(entry=><li key={entry._id} className="border-l-2 border-indigo-200 pl-4"><p className="text-sm font-semibold">{entry.action.replaceAll('-',' ')}</p><p className="mt-1 text-xs text-slate-500">{entry.actor?.name || 'System'} · {display(entry.createdAt,'datetime-local')}</p></li>)}</ol>}
          {tab==='versions'&&<div className="space-y-3"><p className="text-sm font-semibold">Current version: {item.version}</p>{item.history?.length?item.history.map((version,index)=><details key={index} className="rounded-xl border p-3"><summary className="cursor-pointer text-sm">Version {version.version} · {display(version.at,'datetime-local')}</summary><pre className="mt-3 overflow-auto text-xs">{JSON.stringify(version.snapshot,null,2)}</pre></details>):<p className="text-sm text-slate-500">No previous versions.</p>}</div>}
        </div>
      </>}
    </section>
    {actionForm&&<SalesForm title={actionForm.label} fields={actionFields(resource,actionForm.action,item)} initial={{signedDate:new Date().toISOString().slice(0,10)}} metadata={metadata} permissions={permissions} onClose={()=>setActionForm(null)} onSave={async values=>{if(actionForm.action==='move-stage'){await salesApi('/deals/'+id,'PUT',{...values,version:item.version});toast.success('Deal stage saved');setActionForm(null);await load();onChange();}else await run(actionForm.action,values);}} submitLabel={actionForm.label}/>}
  </div>;
}