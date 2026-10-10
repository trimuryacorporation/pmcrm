import { useEffect, useId, useRef, useState } from 'react';
import EmailComposer from './EmailComposer.jsx';
import { X } from 'lucide-react';
import { salesApi, idOf, money } from './api.js';
import { resources } from '../data/sales.js';
import { localDateTime, zonedDateTime } from './time.js';
const control='w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#403DF0] focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100';
export function ReferenceField({field,value,onChange,options=[],disabled}) {
  const [search,setSearch]=useState('');
  const [matches,setMatches]=useState(options);
  useEffect(()=>{setMatches(options);},[options]);
  useEffect(()=>{
    if(!search.trim())return;
    let current=true;const timer=setTimeout(()=>salesApi('/references/'+field.ref+'?q='+encodeURIComponent(search)).then(data=>{if(current)setMatches(data.items);}).catch(()=>{}),250);
    return ()=>{current=false;clearTimeout(timer);};
  },[search,field.ref]);
  const selected=options.find(item=>String(item._id)===String(value));
  const all=selected&&!matches.some(item=>String(item._id)===String(value))?[selected,...matches]:matches;
  return <div className="space-y-1"><input aria-label={'Search '+field.label} className={control+' text-xs'} disabled={disabled} value={search} onChange={event=>setSearch(event.target.value)} placeholder={'Search '+field.label.toLowerCase()} /><select className={control} required={field.required} disabled={disabled} value={value || ''} onChange={event=>onChange(event.target.value)}><option value="">Select {field.label}</option>{all.map(item=><option key={item._id} value={item._id}>{item.name || item.recordId}{item.email?' · '+item.email:''}</option>)}</select></div>;
}
export default function SalesForm(props){return props.resource==='emails'?<EmailComposer {...props}/>:<RecordForm {...props}/>;}
function RecordForm({title,fields,initial={},metadata,onClose,onSave,resource,permissions={},submitLabel='Save'}) {
  const titleId=useId();const formRef=useRef(null);
  const [form,setForm]=useState(()=>Object.fromEntries(fields.map(field=>{
    const value=initial[field.key];
    return [field.key,field.type==='reference'?idOf(value) || (field.key==='assignedTo'?metadata?.userId:''):field.type==='references'?(value || []).map(idOf):field.type==='checkbox'?(value===undefined&&field.key==='duplicateDetection'?true:Boolean(value)):field.type==='json'?JSON.stringify(value ?? (['leadStatuses','dealStages','leadSources','serviceCategories'].includes(field.key)?[]:{}),null,2):['date','datetime-local'].includes(field.type)&&value?field.type==='date'?new Date(value).toISOString().slice(0,10):localDateTime(value,initial.timeZone || metadata?.settings?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone):value ?? (field.key==='timeZone'?metadata?.settings?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone:'')];
  })));
  const [saving,setSaving]=useState(false),[error,setError]=useState(''),[files,setFiles]=useState([]),[preview,setPreview]=useState(false);
  useEffect(()=>{
    const previous=document.activeElement;
    formRef.current?.querySelector('input,select,textarea,button')?.focus();
    const keydown=event=>{
      if(event.key==='Escape'&&!saving)onClose();
      if(event.key==='Tab'){const nodes=[...formRef.current.querySelectorAll('input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled])')];if(event.shiftKey&&document.activeElement===nodes[0]){event.preventDefault();nodes.at(-1)?.focus();}else if(!event.shiftKey&&document.activeElement===nodes.at(-1)){event.preventDefault();nodes[0]?.focus();}}
    };
    document.addEventListener('keydown',keydown);return ()=>{document.removeEventListener('keydown',keydown);previous?.focus();};
  },[onClose,saving]);
  const set=(key,value)=>setForm(current=>({...current,[key]:value}));
  async function save(event) {
    event.preventDefault();setSaving(true);setError('');
    try{
      const payload={};
      for(const field of fields) {
        const value=form[field.key];
        if(field.key==='assignedTo')continue;
        if(field.type==='json'){payload[field.key]=value?JSON.parse(value):null;}
        else if(field.type==='number'){if(value!=='')payload[field.key]=Number(value);}
        else if(field.type==='checkbox')payload[field.key]=Boolean(value);
        else if(['date','datetime-local'].includes(field.type)){if(value)payload[field.key]=field.type==='datetime-local'?zonedDateTime(value,form.timeZone || metadata?.settings?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone):value;}
        else if(value!=='' || initial[field.key])payload[field.key]=value;
      }
      if(initial.version)payload.version=initial.version;
      await onSave(payload,files);
    }catch(err){setError(err.message);}finally{setSaving(false);}
  }
  const subtotal=Number(form.quantity || 0)*Number(form.unitRate || 0),total=Math.max(0,subtotal-Number(form.discount || 0))*(1+Number(form.tax || 0)/100);
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm">
    <form ref={formRef} role="dialog" aria-modal="true" aria-labelledby={titleId} onSubmit={save} className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b p-5"><h2 id={titleId} className="text-lg font-bold">{title}</h2><button type="button" aria-label="Close form" disabled={saving} onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2">
        {error&&<p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 sm:col-span-2">{error}</p>}
        {resource==='leads'&&!initial._id&&<p className="text-sm text-slate-500 sm:col-span-2">Select an existing company, or leave Company empty and enter a company name to create and link it automatically.</p>}
        {fields.some(field=>field.type==='datetime-local')&&<p className="text-xs text-slate-500 sm:col-span-2">Date/time entries use {form.timeZone || metadata?.settings?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone}.</p>}
        {fields.map(rawField=>{
          const field={...rawField,required:rawField.required&&!(resource==='leads'&&rawField.key==='company')};
          const options=field.key==='status'&&resource==='leads'?[...(field.options || []),...(metadata?.settings?.leadStatuses || [])]:field.key==='stage'?[...(field.options || []),...(metadata?.settings?.dealStages || [])]:field.key==='serviceCategory'&&resource!=='pricing'?[...(field.options || []),...(metadata?.settings?.serviceCategories || [])]:field.options || [];
          const disabled=field.key==='assignedTo'&&!permissions.assign;
          return <label key={field.key} className={['textarea','json'].includes(field.type)?'sm:col-span-2':''}>
            <span className="mb-1 block text-sm font-semibold text-slate-700">{field.key==='assignedTo'?'Added By':field.label}{field.required?' *':''}</span>
            {field.key==='assignedTo'?<input className={control} readOnly value={initial.createdBy?.name || metadata?.userName || metadata?.references?.users?.find(user=>String(user._id)===String(metadata?.userId))?.name || 'Current user'} aria-label="Added By" />:field.type==='reference'?<ReferenceField field={field} value={form[field.key]} onChange={value=>set(field.key,value)} options={metadata?.references?.[field.ref] || []} disabled={disabled}/>:
            field.type==='references'?<select className={control} multiple value={form[field.key] || []} onChange={event=>set(field.key,[...event.target.selectedOptions].map(option=>option.value))}>{(metadata?.references?.[field.ref] || []).map(item=><option key={item._id} value={item._id}>{item.name}</option>)}</select>:
            field.type==='checkbox'?<input type="checkbox" checked={Boolean(form[field.key])} onChange={event=>set(field.key,event.target.checked)} className="h-5 w-5 accent-[#403DF0]" />:
            field.type==='select'?<select className={control} required={field.required} value={form[field.key] || ''} onChange={event=>set(field.key,event.target.value)}><option value="">Select {field.label}</option>{[...new Set(options)].map(value=><option key={value} value={value}>{value}</option>)}</select>:
            field.key==='grants'&&resource==='permissions'?<div className="max-h-80 overflow-auto rounded-lg border"><table className="w-full text-xs"><thead className="sticky top-0 bg-slate-50"><tr><th className="p-2 text-left">Module</th>{['view','create','edit','delete','export','approve'].map(action=><th className="p-2 capitalize" key={action}>{action}</th>)}</tr></thead><tbody>{Object.entries(resources).filter(([key])=>!['permissions','settings'].includes(key)).map(([key,module])=>{
              let grants={};try{grants=JSON.parse(form.grants || '{}');}catch{}
              const manager=['Sales Head','Sales Manager'].includes(form.salesRole),auditor=form.salesRole==='Read-only Auditor';
              return <tr key={key} className="border-t"><td className="p-2">{module.title}</td>{['view','create','edit','delete','export','approve'].map(action=>{
                const inherited=auditor?['view','export'].includes(action):manager || (['view','create','edit','export'].includes(action)&&!(['pricing','team','targets'].includes(key)&&['create','edit'].includes(action)));
                const checked=grants[key]?.[action] ?? inherited;
                return <td key={action} className="p-2 text-center"><input aria-label={module.title+' '+action} type="checkbox" checked={checked} onChange={event=>set('grants',JSON.stringify({...grants,[key]:{...(grants[key] || {}),[action]:event.target.checked}},null,2))}/></td>;
              })}</tr>;
            })}</tbody></table></div>:
            ['textarea','json'].includes(field.type)?<textarea className={control+' min-h-28 '+(field.type==='json'?'font-mono text-xs':'')} required={field.required} value={form[field.key]} onChange={event=>set(field.key,event.target.value)} />:
            <input className={control} type={field.type || 'text'} required={field.required} min={field.type==='number'?0:undefined} max={['score','probability','tax'].includes(field.key)?100:undefined} step={field.type==='number'?'any':undefined} value={form[field.key]} onChange={event=>set(field.key,event.target.value)} />}
          </label>;
        })}
        {['emails','proposals','contracts','handovers'].includes(resource)&&<label className="sm:col-span-2"><span className="mb-1 block text-sm font-semibold">Attachments / Supporting Documents</span><input type="file" multiple accept=".pdf,.doc,.docx,.xlsx,.csv,.png,.jpg,.jpeg" onChange={event=>setFiles([...event.target.files])} className={control}/><span className="mt-1 block text-xs text-slate-500">Private documents, maximum 10 MB per file. Files are attached after saving the record.</span></label>}
        {resource==='emails'&&<div className="sm:col-span-2"><button type="button" className="btn-secondary" onClick={()=>setPreview(current=>!current)}>Preview Email</button>{preview&&<div className="mt-3 rounded-xl border bg-slate-50 p-4"><p className="text-xs text-slate-500">To: {form.to} · CC: {form.cc}</p><h3 className="mt-3 font-semibold">{form.subject || 'No subject'}</h3><p className="mt-3 whitespace-pre-wrap text-sm">{form.body || 'No message body'}</p></div>}</div>}
        {resource==='proposals'&&<div className="rounded-xl bg-indigo-50 p-4 sm:col-span-2"><span className="text-sm text-slate-600">Subtotal: {money(subtotal,form.currency || 'INR')}</span><p className="mt-1 text-lg font-bold text-[#403DF0]">Quotation total: {money(total,form.currency || 'INR')}</p></div>}
        {resource==='permissions'&&<p className="text-xs text-slate-500 sm:col-span-2">Module keys include leads, companies, contacts, deals, proposals and contracts. Example: {'{"leads":{"view":true,"create":true,"edit":true,"export":true,"assign":false}}'}. Sales records are visible only to their creator.</p>}
      </div>
      <div className="flex justify-end gap-3 border-t p-4"><button type="button" className="btn-secondary" disabled={saving} onClick={onClose}>Cancel</button><button className="btn-primary !bg-[#403DF0]" disabled={saving}>{saving?'Saving…':submitLabel}</button></div>
    </form>
  </div>;
}