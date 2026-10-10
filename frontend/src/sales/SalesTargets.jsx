import { useEffect,useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SalesRecords from './SalesRecords.jsx';
import { salesApi,money } from './api.js';
export default function SalesTargets({metadata}) {
  const [params]=useSearchParams(),[data,setData]=useState(null);
  const query=params.toString();
  useEffect(()=>{let current=true;salesApi('/analytics?salesPage=targets&'+query).then(result=>{if(current)setData(result);}).catch(()=>{});return ()=>{current=false;};},[query]);
  const metrics=[['dailyLeads','dailyLeads','Daily Leads'],['weeklyOutreach','weeklyOutreach','Weekly Outreach'],['monthlyMeetings','monthlyMeetings','Monthly Meetings'],['qualifiedLeads','qualifiedLeads','Qualified Leads'],['proposals','proposalsSent','Proposals Sent'],['revenue','revenueGenerated','Revenue'],['dealsWon','dealsWon','Deals Won']];
  return <div className="space-y-6">{data?.targets?.length>0&&<section className="grid gap-4 lg:grid-cols-2">{data.targets.map(target=><div key={target._id} className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-xs font-semibold text-slate-500">{metadata.references.users.find(user=>String(user._id)===String(target.createdBy))?.name || 'Sales Executive'}</p><h2 className="mt-1 font-bold">{target.name}</h2><div className="mt-4 grid gap-4 sm:grid-cols-2">{metrics.map(([key,actualKey,label])=>{const actual=Number(target.actual?.[actualKey] || 0),goal=Number(target[key] || 0);return <div key={key}><div className="flex justify-between gap-2 text-xs"><span>{label}</span><span className="font-semibold">{key==='revenue'?money(actual,target.currency):actual} / {key==='revenue'?money(goal,target.currency):goal}</span></div><progress className="mt-2 h-2 w-full accent-[#403DF0]" max={goal || 1} value={Math.min(actual,goal || 1)}/></div>;})}</div></div>)}</section>}<SalesRecords page="targets" resource="targets" metadata={metadata}/></div>;
}