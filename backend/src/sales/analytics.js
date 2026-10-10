import { stages } from './config.js';
import { models, SalesAudit } from './models.js';
import { Task } from '../models/Work.js';
import { Invoice } from '../models/Finance.js';
import { scope, requirePermission, permitted, fail } from './security.js';
import { listFilter } from './store.js';
const sum=(rows,key)=>rows.reduce((total,row)=>total+Number(row[key] || 0),0);
const percentage=(part,whole)=>whole?Math.round(part/whole*10000)/100:0;
const group=(rows,key,valueKey)=>Object.entries(rows.reduce((out,row)=>{const value=String(row[key] || 'Unspecified');out[value]=(out[value] || 0)+(valueKey?Number(row[valueKey] || 0):1);return out;},{})).map(([name,value])=>({name,value}));
export async function analytics(req) {
  if(!['leads','deals','calls','meetings','targets'].some(resource=>permitted(req,resource,'view')))fail('You do not have access to Sales analytics',403);
  const currency=String(req.query.currency || 'INR');
  if(!['INR','USD','EUR','GBP'].includes(currency))fail('Unsupported currency');
  let employeeIds;
  if(req.query.department || req.query.vertical) {
    const filter={$and:[await scope(req,'team'),{...(req.query.department?{department:String(req.query.department)}:{}),...(req.query.vertical?{vertical:String(req.query.vertical)}:{})}]};
    employeeIds=await models.team.find(filter).distinct('user');
  }
  const data={};
  for(const resource of ['leads','deals','emails','calls','meetings','followups','proposals','activities','contracts','targets']) {
    if(!permitted(req,resource,'view')){data[resource]=[];continue;}
    let filter=await listFilter(req,resource);
    const extra=[];
    if(employeeIds)extra.push({createdBy:{$in:employeeIds}});
    if(['deals','proposals','targets'].includes(resource))extra.push({currency});
    if(extra.length)filter={$and:[filter,...extra]};
    const count=await models[resource].countDocuments(filter);
    if(count>50000)fail('Select a narrower date range to analyze up to 50,000 records per module',422);
    data[resource]=await models[resource].find(filter).select('-body -bcc -files -history -signatureEvidence -description -notes').lean();
  }
  const {leads,deals,emails,calls,meetings,followups,proposals,activities,contracts,targets}=data;
  const won=deals.filter(item=>item.stage==='Won'),lost=deals.filter(item=>item.stage==='Lost'),open=deals.filter(item=>!['Won','Lost'].includes(item.stage));
  const qualified=leads.filter(item=>['Qualified','Proposal Sent','Negotiation','Won'].includes(item.status));
  const now=new Date(),today=new Date();today.setHours(0,0,0,0);
  const overdue=followups.filter(item=>item.status==='Pending'&&item.dueDate &&new Date(item.dueDate)<now);
  const taskPermission=req.user.accessPermissions?.get ? req.user.accessPermissions.get('tasks') : req.user.accessPermissions?.tasks;
  const canViewTasks=req.user.role==='super_admin' || taskPermission?.view!==false;
  const overdueTasks=canViewTasks?await Task.find({dueDate:{$lt:now},status:{$ne:'Completed'},...(['super_admin','admin'].includes(req.user.role)?{}:{employee:req.user.linkedEmployee || null})}).sort({dueDate:1}).limit(10).select('title dueDate status priority project').lean():[];
  const sent=emails.filter(item=>item.status==='Sent'),replies=emails.filter(item=>item.status==='Reply');
  const companyReplies=new Set(replies.map(item=>String(item.company)));
  const responded=sent.filter(item=>companyReplies.has(String(item.company)));
  const proposalsSent=proposals.filter(item=>['Sent','Accepted'].includes(item.status));
  const signedDeals=new Set(contracts.filter(item=>item.status==='Signed'&&item.signatureVerifiedAt&&['MSA','SOW','Service Agreement','Purchase Order'].includes(item.documentType)).map(item=>String(item.deal)));
  const contracted=deals.filter(item=>signedDeals.has(String(item._id)));
  const invoiceRows=await Invoice.find({direction:'Receivable',currency,salesDeal:{$in:deals.map(item=>item._id)}}).lean();
  const metrics=[
    {label:'Total Leads',value:leads.length,page:'leads'},
    {label:'New Leads Today',value:leads.filter(item=>new Date(item.createdAt)>=today).length,page:'leads',filters:{from:today.toISOString()}},
    {label:'Contacted Leads',value:leads.filter(item=>item.status==='Contacted').length,page:'leads',filters:{status:'Contacted'}},
    {label:'Qualified Leads',value:leads.filter(item=>item.status==='Qualified').length,page:'leads',filters:{status:'Qualified'}},
    {label:'Active Opportunities',value:open.length,page:'deals',filters:{closed:'false'}},
    {label:'Meetings Scheduled',value:meetings.filter(item=>item.status==='Scheduled').length,page:'meetings',filters:{status:'Scheduled'}},
    {label:'Proposals Sent',value:proposals.filter(item=>item.status==='Sent').length,page:'proposals',filters:{status:'Sent'}},
    {label:'Deals Won',value:won.length,page:'deals',filters:{stage:'Won'}},
    {label:'Deals Lost',value:lost.length,page:'deals',filters:{stage:'Lost'}},
    {label:'Total Pipeline Value',value:sum(open,'estimatedValue'),money:true,page:'deals',filters:{closed:'false'}},
    {label:'Revenue Won',value:sum(won,'estimatedValue'),money:true,page:'deals',filters:{stage:'Won'}},
    {label:'Pending Follow-ups',value:followups.filter(item=>item.status==='Pending').length,page:'follow-ups',filters:{status:'Pending'}},
  ];
  const performance=new Map();
  for(const resource of ['leads','deals','emails','calls','meetings','proposals'])for(const item of data[resource]) {
    const key=String(item.createdBy);if(!performance.has(key))performance.set(key,{user:key,leadsAssigned:0,leadsContacted:0,qualifiedLeads:0,emailsSent:0,callsLogged:0,meetingsCompleted:0,proposalsSent:0,dealsWon:0,revenueGenerated:0});
    const row=performance.get(key);
    if(resource==='leads'){row.leadsAssigned++;if(item.lastContacted || item.status!=='New')row.leadsContacted++;if(['Qualified','Proposal Sent','Negotiation','Won'].includes(item.status))row.qualifiedLeads++;}
    if(resource==='deals'&&item.stage==='Won'){row.dealsWon++;row.revenueGenerated+=item.estimatedValue || 0;}
    if(resource==='emails'&&item.status==='Sent')row.emailsSent++;
    if(resource==='calls')row.callsLogged++;
    if(resource==='meetings'&&item.status==='Completed')row.meetingsCompleted++;
    if(resource==='proposals'&&['Sent','Accepted'].includes(item.status))row.proposalsSent++;
  }
  const month=(item,key='createdAt')=>new Date(item[key] || item.createdAt).toISOString().slice(0,7);
  const trends=group(leads.map(item=>({...item,month:month(item)})),'month').sort((a,b)=>a.name.localeCompare(b.name));
  const monthlyRevenue=group(won.map(item=>({...item,month:month(item,'closedAt')})),'month','estimatedValue').sort((a,b)=>a.name.localeCompare(b.name));
  const software=['Website Development','Mobile App Development','Custom Software Development','CRM/ERP Development','SaaS Development','API Integration','AI Chatbot Development','IT Consulting'];
  const audit=permitted(req,'activities','view')?await SalesAudit.find(await scope(req,'activities')).sort({createdAt:-1}).limit(10).select('resource action record createdAt assignedTo').lean():[];
  const team=[...performance.values()].map(row=>({...row,conversionRate:percentage(row.dealsWon,row.leadsAssigned)}));
  const targetResults=targets.map(target=>{
    const start=target.periodStart?new Date(target.periodStart):new Date(0),end=target.periodEnd?new Date(target.periodEnd):new Date('9999-12-31');
    end.setUTCHours(23,59,59,999);
    const belongs=item=>String(item.createdBy)===String(target.createdBy)&&new Date(item.createdAt)>=start&&new Date(item.createdAt)<=end;
    const targetLeads=leads.filter(belongs),targetDeals=deals.filter(belongs),targetEmails=emails.filter(belongs),targetMeetings=meetings.filter(belongs),targetProposals=proposals.filter(belongs);
    const weekStart=new Date(today);weekStart.setDate(weekStart.getDate()-((weekStart.getDay()+6)%7));
    const monthStart=new Date(today);monthStart.setDate(1);
    return {...target,actual:{dailyLeads:targetLeads.filter(item=>new Date(item.createdAt)>=today).length,weeklyOutreach:targetEmails.filter(item=>item.status==='Sent'&&new Date(item.sentAt || item.createdAt)>=weekStart).length+calls.filter(item=>belongs(item)&&new Date(item.occurredAt || item.createdAt)>=weekStart).length,monthlyMeetings:targetMeetings.filter(item=>new Date(item.startsAt || item.createdAt)>=monthStart).length,qualifiedLeads:targetLeads.filter(item=>['Qualified','Proposal Sent','Negotiation','Won'].includes(item.status)).length,proposalsSent:targetProposals.filter(item=>['Sent','Accepted'].includes(item.status)).length,revenueGenerated:sum(targetDeals.filter(item=>item.stage==='Won'),'estimatedValue'),dealsWon:targetDeals.filter(item=>item.stage==='Won').length}};
  });
  const stageEntries=Object.fromEntries(stages.map(stage=>[stage,new Set()]));
  const stageAudit=await SalesAudit.find({resource:'deals',record:{$in:deals.map(item=>item._id)}}).select('record before.stage after.stage').lean();
  for(const event of stageAudit)for(const stage of [event.before?.stage,event.after?.stage])if(stageEntries[stage])stageEntries[stage].add(String(event.record));
  const pipelineConversion=stages.slice(1,8).map((stage,index)=>({name:stage,value:percentage([...stageEntries[stage]].filter(id=>stageEntries[stages[index]].has(id)).length,stageEntries[stages[index]].size)}));
  const salesCycle=won.filter(item=>item.closedAt).map(item=>(new Date(item.closedAt)-new Date(item.createdAt))/86400000);
  return {currency,metrics,rates:[
    {label:'Lead Conversion Rate',value:percentage(won.filter(item=>item.lead).length,leads.length),unit:'%'},
    {label:'Email Response Rate',value:percentage(responded.length,sent.length),unit:'%',note:'Company-level response rate from manually recorded replies; not provider reply tracking.'},
    {label:'Meeting Conversion Rate',value:percentage(meetings.filter(item=>item.status==='Completed').length,meetings.filter(item=>item.status!=='Cancelled').length),unit:'%'},
    {label:'Proposal Acceptance Rate',value:percentage(proposals.filter(item=>item.status==='Accepted').length,proposalsSent.length),unit:'%'},
    {label:'Win/Loss Ratio',value:lost.length?Math.round(won.length/lost.length*100)/100:won.length?'No losses':'No closed deals'},
    {label:'Average Deal Value',value:won.length?sum(won,'estimatedValue')/won.length:0,money:true},
    {label:'Average Sales Cycle',value:salesCycle.length?Math.round(salesCycle.reduce((a,b)=>a+b,0)/salesCycle.length):0,unit:' days'},
  ],charts:{trends,funnel:group(leads,'status'),monthlyRevenue,sources:group(leads,'leadSource'),services:group(won,'serviceCategory','estimatedValue'),verticals:group(deals.map(item=>({...item,vertical:software.includes(item.serviceCategory)?'Software / IT':'AI / ML'})),'vertical','estimatedValue'),pipeline:group(deals,'stage'),pipelineConversion,forecast:group(open.map(item=>({...item,month:item.expectedClosing?month(item,'expectedClosing'):'Unscheduled',weighted:(item.estimatedValue || 0)*(item.probability || 0)/100})),'month','weighted'),clients:group(won,'company','estimatedValue')},
  team,targets:targetResults,
  revenue:{won:sum(won,'estimatedValue'),pipeline:sum(open,'estimatedValue'),forecast:open.reduce((total,item)=>total+(item.estimatedValue || 0)*(item.probability || 0)/100,0),contracted:sum(contracted,'estimatedValue'),invoiced:sum(invoiceRows,'amount'),collected:sum(invoiceRows,'amountPaid'),invoices:invoiceRows},
  sections:{overdueTasks,todayFollowups:followups.filter(item=>item.status==='Pending'&&item.dueDate&&new Date(item.dueDate)>=today&&new Date(item.dueDate)<new Date(today.getTime()+86400000)).slice(0,10),upcomingMeetings:meetings.filter(item=>item.status==='Scheduled'&&new Date(item.startsAt)>=now).sort((a,b)=>new Date(a.startsAt)-new Date(b.startsAt)).slice(0,10),recentActivities:activities.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,10),latestDeals:deals.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,10),overdue,expiringContracts:contracts.filter(item=>item.expiryDate&&new Date(item.expiryDate)>=now&&new Date(item.expiryDate)<=new Date(now.getTime()+30*86400000))},audit};
}