import { api } from '../utils/api.js';
const salesHeaders=()=>({'X-Sales-Page':window.location.pathname.split('/')[2] || 'dashboard'});
export const salesApi=(path,method='GET',body)=>api('/sales'+path,{method,headers:salesHeaders(),...(body===undefined?{}:{body:body instanceof FormData?body:JSON.stringify(body)})});
export const queryString=(values)=>new URLSearchParams(Object.entries(values).filter(([,value])=>value!==''&&value!==undefined&&value!==null)).toString();
export async function salesDownload(path,name,preview=false) {
  const base=(import.meta.env.VITE_API_URL?.trim().replace(/\/$/,'') || (['localhost','127.0.0.1'].includes(window.location.hostname)?'http://localhost:5000/api':'/api'));
  const response=await fetch(base+'/sales'+path,{headers:{...salesHeaders(),Authorization:'Bearer '+localStorage.getItem('trimurya_token')}});
  if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.message || 'Download failed');}
  const url=URL.createObjectURL(await response.blob());
  if(preview){const tab=window.open(url,'_blank','noopener,noreferrer');if(!tab){const link=document.createElement('a');link.href=url;link.download=name;link.click();}}
  else {const link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();}
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}
export const idOf=(value)=>value && typeof value==='object'?value._id:value;
export function display(value,type) {
  if(value===undefined || value===null || value==='')return '-';
  if(type==='checkbox' || typeof value==='boolean')return value?'Yes':'No';
  if(['date','datetime-local'].includes(type))return new Date(value).toLocaleString(undefined,type==='date'?{dateStyle:'medium'}:{dateStyle:'medium',timeStyle:'short'});
  if(Array.isArray(value))return value.map(item=>display(item)).join(', ');
  if(typeof value==='object')return value.name || value.recordId || value.employeeId || JSON.stringify(value);
  return String(value);
}
export const money=(value,currency='INR')=>new Intl.NumberFormat(undefined,{style:'currency',currency,maximumFractionDigits:2}).format(Number(value || 0));