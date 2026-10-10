import { useEffect, useId, useRef, useState } from 'react';
import { Expand, Eye, FileText, Minus, Paperclip, PenLine, Send, Settings2, X } from 'lucide-react';
import { idOf, salesApi } from './api.js';
import EmailSignatureSettings from './EmailSignatureSettings.jsx';

const input='min-w-0 flex-1 bg-transparent py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400';
const select='w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500';
export default function EmailComposer({initial={},metadata,onClose,onSave}) {
  const titleId=useId(),fileInput=useRef(null),formRef=useRef(null),bodyEdited=useRef(false);
  const [preferences,setPreferences]=useState(metadata.emailPreferences || {signature:'',autoInclude:true});
  const [form,setForm]=useState(()=>({
    to:initial.to || '',cc:initial.cc || '',bcc:initial.bcc || '',subject:initial.subject || '',
    body:initial.body || (metadata.emailPreferences?.autoInclude&&metadata.emailPreferences?.signature?'\n\n--\n'+metadata.emailPreferences.signature:''),
    company:idOf(initial.company) || '',contact:idOf(initial.contact) || '',deal:idOf(initial.deal) || '',
    status:['Reply','Template'].includes(initial.status)?initial.status:'Draft'
  }));
  const [cc,setCc]=useState(Boolean(initial.cc)),[bcc,setBcc]=useState(Boolean(initial.bcc));
  const [files,setFiles]=useState([]),[saving,setSaving]=useState(''),[error,setError]=useState('');
  const [expanded,setExpanded]=useState(false),[minimized,setMinimized]=useState(false),[preview,setPreview]=useState(false),[settings,setSettings]=useState(false),[links,setLinks]=useState(false);
  useEffect(()=>{let active=true;salesApi('/email-preferences').then(value=>{if(!active)return;setPreferences(value);if(!initial._id&&!initial.body&&!bodyEdited.current)setForm(current=>({...current,body:value.autoInclude&&value.signature?'\n\n--\n'+value.signature:''}));}).catch(()=>{});return ()=>{active=false;};},[]);
  const storedFiles=initial.files || [];
  const storedIds=storedFiles.map(file=>file.id).join(',');
  const uploadedIds=useRef(storedIds);
  useEffect(()=>{if(uploadedIds.current!==storedIds){setFiles([]);uploadedIds.current=storedIds;}},[storedIds]);
  useEffect(()=>{formRef.current?.querySelector('input')?.focus();const key=event=>{if(event.key==='Escape'&&!saving)onClose();};document.addEventListener('keydown',key);return ()=>document.removeEventListener('keydown',key);},[saving,onClose]);
  const set=(key,value)=>{if(key==='body')bodyEdited.current=true;setForm(current=>({...current,[key]:value}));};
  function addFiles(selected) {
    const next=[...files];
    for(const file of selected)if(!next.some(item=>item.name===file.name&&item.size===file.size&&item.lastModified===file.lastModified))next.push(file);
    if(next.length>5){setError('Choose up to 5 new attachments at a time.');return;}
    if(next.some(file=>file.size>10*1024*1024)){setError('Each attachment must be 10 MB or smaller.');return;}
    if([...storedFiles,...next].reduce((total,file)=>total+file.size,0)>25*1024*1024){setError('Total attachments must be 25 MB or smaller.');return;}
    setError('');setFiles(next);
  }
  function insertSignature(){if(!preferences.signature){setSettings(true);return;}set('body',form.body.replace(/\s+$/,'')+'\n\n--\n'+preferences.signature);}
  async function submit(event) {
    event.preventDefault();const action=event.nativeEvent.submitter?.value || 'draft';
    setSaving(action);setError('');
    try{
      const payload={...form,cc:form.cc.trim(),bcc:form.bcc.trim()};
      if(initial.version)payload.version=initial.version;
      await onSave(payload,files,action);
    }catch(err){setError(err.message);}finally{setSaving('');}
  }
  const canSend=metadata.emailConfigured&&form.status==='Draft';
  return <div className="fixed inset-0 z-[60] flex items-end justify-end bg-slate-950/25 p-0 backdrop-blur-[1px] sm:p-5">
    <form ref={formRef} onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby={titleId} className={'flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl ring-1 ring-slate-200 sm:rounded-2xl '+(expanded?'h-[88dvh] sm:max-w-5xl':'sm:max-w-2xl')}>
      <header className="flex items-center justify-between bg-[#f2f6fc] px-5 py-3"><h2 id={titleId} className="text-sm font-semibold text-slate-800">{form.status==='Template'?'Email template':form.status==='Reply'?'Record email reply':'New message'}</h2><div className="flex items-center gap-1"><button type="button" aria-label={minimized?'Restore message':'Minimize message'} onClick={()=>setMinimized(value=>!value)} className="rounded p-1.5 text-slate-500 hover:bg-slate-200"><Minus className="h-4 w-4"/></button><button type="button" aria-label="Toggle larger compose window" onClick={()=>{setExpanded(value=>!value);setMinimized(false);}} className="rounded p-1.5 text-slate-500 hover:bg-slate-200"><Expand className="h-4 w-4"/></button><button type="button" disabled={Boolean(saving)} aria-label="Close compose" onClick={onClose} className="rounded p-1.5 text-slate-500 hover:bg-slate-200"><X className="h-4 w-4"/></button></div></header>
      {!minimized&&<>
        <div className="min-h-0 flex-1 overflow-y-auto px-5">
          <div className="flex items-center gap-3 border-b border-slate-100"><label htmlFor={titleId+'-to'} className="w-12 text-sm text-slate-500">To</label><input id={titleId+'-to'} type="email" required className={input} value={form.to} onChange={event=>set('to',event.target.value)} placeholder="recipient@company.com"/><div className="flex gap-3 text-xs text-slate-500"><button type="button" onClick={()=>setCc(value=>!value)}>Cc</button><button type="button" onClick={()=>setBcc(value=>!value)}>Bcc</button></div></div>
          {cc&&<div className="flex items-center gap-3 border-b border-slate-100"><label htmlFor={titleId+'-cc'} className="w-12 text-sm text-slate-500">Cc</label><input id={titleId+'-cc'} className={input} value={form.cc} onChange={event=>set('cc',event.target.value)} placeholder="Separate email addresses with commas"/></div>}
          {bcc&&<div className="flex items-center gap-3 border-b border-slate-100"><label htmlFor={titleId+'-bcc'} className="w-12 text-sm text-slate-500">Bcc</label><input id={titleId+'-bcc'} className={input} value={form.bcc} onChange={event=>set('bcc',event.target.value)} placeholder="Separate email addresses with commas"/></div>}
          <input aria-label="Email subject" required className={input+' w-full border-b border-slate-100 font-medium'} value={form.subject} onChange={event=>set('subject',event.target.value)} placeholder="Subject"/>
          <textarea aria-label="Message body" required value={form.body} onChange={event=>set('body',event.target.value)} placeholder="Write your message..." className={'w-full resize-none bg-white py-4 text-sm leading-7 text-slate-800 outline-none '+(expanded?'min-h-72':'min-h-56')}/>
          {error&&<p role="alert" className="mb-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          {(storedFiles.length>0||files.length>0)&&<div className="mb-4 flex flex-wrap gap-2">
            {storedFiles.map(file=><span key={file.id} className="inline-flex max-w-full items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2 text-xs text-slate-600"><FileText className="h-4 w-4 shrink-0"/><span className="truncate">{file.name}</span><span className="shrink-0 text-slate-400">Attached</span></span>)}
            {files.map((file,index)=><span key={file.name+index} className="inline-flex max-w-full items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800"><FileText className="h-4 w-4 shrink-0"/><span className="truncate">{file.name}</span><span className="shrink-0 text-blue-500">{Math.ceil(file.size/1024)} KB</span><button type="button" aria-label={'Remove '+file.name} disabled={Boolean(saving)} onClick={()=>setFiles(current=>current.filter((_,position)=>position!==index))}><X className="h-3.5 w-3.5"/></button></span>)}
          </div>}
          {links&&<div className="mb-4 grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-3">{[['company','companies','Company'],['contact','contacts','Contact'],['deal','deals','Opportunity']].map(([key,resource,label])=><label key={key} className="text-xs font-medium text-slate-500">{label}<select className={select+' mt-1'} value={form[key]} onChange={event=>set(key,event.target.value)}><option value="">None</option>{(metadata.references[resource] || []).map(record=><option key={record._id} value={record._id}>{record.name || record.recordId}</option>)}</select></label>)}</div>}
          {preview&&<div className="mb-4 rounded-xl border p-4"><p className="text-xs text-slate-400">To: {form.to}{form.cc?' | Cc: '+form.cc:''}</p><h3 className="mt-2 font-semibold">{form.subject || 'No subject'}</h3><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">{form.body || 'No message body'}</p></div>}
        </div>
        <div className="flex flex-wrap items-center gap-1 border-t border-slate-100 px-4 py-2">
          <input ref={fileInput} type="file" multiple accept=".pdf,.doc,.docx,.xlsx,.csv,.png,.jpg,.jpeg" className="hidden" onChange={event=>{addFiles([...event.target.files]);event.target.value='';}}/>
          <button type="button" title="Attach files" aria-label="Attach multiple files" disabled={Boolean(saving)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={()=>fileInput.current.click()}><Paperclip className="h-5 w-5"/></button>
          <button type="button" title="Insert signature" aria-label="Insert signature" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={insertSignature}><PenLine className="h-5 w-5"/></button>
          <button type="button" title="Preview email" aria-label="Preview email" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={()=>setPreview(value=>!value)}><Eye className="h-5 w-5"/></button>
          <button type="button" title="Email signature settings" aria-label="Email signature settings" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={()=>setSettings(value=>!value)}><Settings2 className="h-5 w-5"/></button>
          <button type="button" onClick={()=>setLinks(value=>!value)} className="ml-auto rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100">Link CRM records</button>
        </div>
        {settings&&<div className="max-h-72 overflow-y-auto border-t bg-slate-50 p-4"><EmailSignatureSettings onSaved={value=>{setPreferences(value);setSettings(false);}}/></div>}
        <footer className="border-t border-slate-100 px-5 py-4"><div className="flex flex-wrap items-center gap-3">
          {form.status==='Draft'&&<button type="submit" value="send" disabled={Boolean(saving)||!canSend} className="inline-flex items-center gap-3 rounded-full bg-[#0b57d0] px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"><Send className="h-4 w-4"/>{saving==='send'?'Sending...':'Send'}</button>}
          <button type="submit" value="draft" disabled={Boolean(saving)} className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">{saving==='draft'?'Saving...':form.status==='Draft'?'Save draft':'Save '+form.status.toLowerCase()}</button>
          <span className="ml-auto text-xs text-slate-400">Added by {initial.createdBy?.name || metadata.userName}</span>
        </div><p className="mt-3 text-[11px] text-slate-400">Up to 5 new files per save · 10 MB each · 25 MB total{!metadata.emailConfigured?' · Configure your email provider to send.':''}</p></footer>
      </>}
    </form>
  </div>;
}
