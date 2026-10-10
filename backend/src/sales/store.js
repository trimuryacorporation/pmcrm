import mongoose from 'mongoose';
import crypto from 'node:crypto';
import Notification from '../models/Notification.js';
import { models } from './models.js';
import { resources } from './config.js';
import { getRecord, scope, fail, requirePermission } from './security.js';
import { validatePayload, writeSalesAudit, settingsFor } from './validation.js';
export const transaction = (work) => mongoose.connection.transaction(work);
export function escapeRegex(value) {return String(value).replace(/[.*+?^$()|[\]\\]/g,'\\$&');}
export async function listFilter(req,resource) {
  const clauses=[await scope(req,resource)];
  const config=resources[resource];
  if(req.query.q){const fields=config.fields.filter(f=>['text','email','textarea'].includes(f.type)).map(f=>f.key);fields.push('recordId');clauses.push({$or:fields.map(key=>({[key]:{$regex:escapeRegex(String(req.query.q).slice(0,200)),$options:'i'}}))});}
  for(const key of ['company','lead','deal','assignedTo','user','status','stage','priority','serviceCategory','industry','type','documentType','leadSource','currency']) {
    const value=req.query[key];
    if(value && config.fields.some(f=>f.key===key)){if(typeof value!=='string')fail('Invalid filter');clauses.push({[key]:value});}
  }
  const dateField=['createdAt',...config.fields.filter(f=>['date','datetime-local'].includes(f.type)).map(f=>f.key)].includes(req.query.dateField)?req.query.dateField:'createdAt';
  if(req.query.from || req.query.to) {
    const range={};
    if(req.query.from){range.$gte=new Date(req.query.from);if(Number.isNaN(range.$gte.getTime()))fail('Invalid start date');}
    if(req.query.to){range.$lte=new Date(req.query.to);if(Number.isNaN(range.$lte.getTime()))fail('Invalid end date');if(String(req.query.to).length===10)range.$lte.setUTCHours(23,59,59,999);}
    clauses.push({[dateField]:range});
  }
  if(req.query.tab==='Today' && resource==='followups'){const start=new Date();start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+1);clauses.push({dueDate:{$gte:start,$lt:end},status:'Pending'});}
  if(req.query.tab==='Upcoming' && resource==='followups')clauses.push({dueDate:{$gt:new Date()},status:'Pending'});
  if(req.query.tab==='Overdue' && resource==='followups')clauses.push({dueDate:{$lt:new Date()},status:'Pending'});
  if(req.query.tab==='Completed' && ['followups','meetings'].includes(resource))clauses.push({status:'Completed'});
  if(req.query.tab==='Upcoming' && resource==='meetings')clauses.push({startsAt:{$gte:new Date()},status:'Scheduled'});
  if(req.query.tab==='Today' && resource==='meetings'){const start=new Date();start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+1);clauses.push({startsAt:{$gte:start,$lt:end}});}
  if(req.query.tab==='New Assignments' && resource==='leads')clauses.push({status:'New'});
  if(req.query.tab==='Contacted' && resource==='leads')clauses.push({status:{$in:['Contacted','Responded']}});
  if(req.query.tab==='Follow-up Pending' && resource==='leads')clauses.push({nextFollowup:{$exists:true},status:{$nin:['Won','Lost']}});
  if(req.query.tab==='Qualified' && resource==='leads')clauses.push({status:'Qualified'});
  if(req.query.tab==='Closed' && resource==='leads')clauses.push({status:{$in:['Won','Lost']}});
  if(req.query.qualificationPending==='true' && resource==='leads')clauses.push({status:{$in:['New','Contacted','Responded']}});
  if(req.query.mine==='true')clauses.push({createdBy:req.sales.userId});
  if(req.query.closed==='false' && resource==='deals')clauses.push({stage:{$nin:['Won','Lost']}});
  return {$and:clauses};
}
export function populateQuery(query,resource) {
  for(const field of resources[resource].fields)if(['reference','references'].includes(field.type))query.populate({path:field.key,select:field.ref==='users'?'name email role':field.ref==='employees'?'name employeeId':'name recordId'});
  query.populate({path:'createdBy',select:'name email'});
  return query;
}
function duplicateKey(resource,data,creator) {
  if(!['companies','leads','research'].includes(resource))return undefined;
  const key=resource==='leads'?[String(data.company),String(data.email || data.contactName || '').toLowerCase(),data.serviceCategory || '']:[String(data.name || '').toLowerCase().replace(/\s+/g,' ').trim(),String(data.website || '').toLowerCase().replace(/\/$/,'')];
  return crypto.createHash('sha256').update(JSON.stringify([String(creator),...key])).digest('hex');
}
export async function createRecord(req,resource,body,session) {
  requirePermission(req,resource,'create');
  const data=await validatePayload(req,resource,body,null,session);
  if(resource==='leads' && !data.company) {
    requirePermission(req,'companies','create');
    const company=await createRecord(req,'companies',{name:data.name,website:data.website,country:data.country,industry:data.industry,city:data.city,assignedTo:data.assignedTo},session);
    data.company=company._id;
  }
  const settings=await settingsFor(session);
  const key=settings?.duplicateDetection===false?undefined:duplicateKey(resource,data,req.user._id);
  if(['leads','calls','linkedin'].includes(resource)&&!data.nextFollowup&&Number(settings?.followupRules?.defaultDays)>0)data.nextFollowup=new Date(Date.now()+Number(settings.followupRules.defaultDays)*86400000);
  if(key)data.dedupeKey=key;
  const [item]=await models[resource].create([{...data,createdBy:req.user._id}],{session});
  await writeSalesAudit(req,resource,item,'create',null,session);
  await recordInteraction(req,resource,item,'created',session);
  if(settings?.followupRules?.autoCreate!==false && ['leads','calls','linkedin'].includes(resource) && item.nextFollowup)await createRecord(req,'followups',{name:'Follow up '+(item.name || item.recordId),company:item.company,lead:resource==='leads'?item._id:item.lead,contact:item.contact,assignedTo:req.user._id,dueDate:item.nextFollowup.toISOString(),type:resource==='calls'?'Call':resource==='linkedin'?'LinkedIn':'Other',status:'Pending'},session);
  return item;
}
export async function updateRecord(req,resource,id,body,session) {
  requirePermission(req,resource,'edit');
  const item=await getRecord(req,resource,id,session);
  if(body.version===undefined || Number(body.version)!==item.version)fail('This record changed. Reload it before saving.',409);
  const before=item.toObject();
  const data=await validatePayload(req,resource,body,item,session);
  if(['proposals','pricing','contracts'].includes(resource))item.history.push({at:new Date(),actor:req.user._id,version:item.version,snapshot:before.history?{...before,history:undefined}:before});
  Object.assign(item,data);
  const settings=await settingsFor(session);
  const key=settings?.duplicateDetection===false?undefined:duplicateKey(resource,item,item.createdBy);
  if(key)item.dedupeKey=key;else item.dedupeKey=undefined;
  if(resource==='deals' && ['Won','Lost'].includes(item.stage) && before.stage!==item.stage)item.closedAt=new Date();
  item.version++;
  await item.save({session});
  if(resource==='deals' && item.lead && before.stage!==item.stage && ['Proposal Sent','Negotiation','Won','Lost'].includes(item.stage)){
    requirePermission(req,'leads','edit');
    const linkedLead=await getRecord(req,'leads',item.lead,session),leadBefore=linkedLead.toObject();
    linkedLead.status=item.stage;linkedLead.version++;await linkedLead.save({session});await writeSalesAudit(req,'leads',linkedLead,'sync-deal-stage',leadBefore,session);await recordInteraction(req,'leads',linkedLead,'deal stage synchronized',session);
  }
  await recordInteraction(req,resource,item,'updated',session);
  const reassigned=String(before.assignedTo)!==String(item.assignedTo);
  await writeSalesAudit(req,resource,item,reassigned?'reassign':'update',before,session);
  if(settings?.followupRules?.autoCreate!==false && resource==='leads' && item.nextFollowup && String(before.nextFollowup)!==String(item.nextFollowup))await createRecord(req,'followups',{name:'Follow up '+item.name,company:item.company,lead:item._id,assignedTo:req.user._id,dueDate:item.nextFollowup.toISOString(),type:'Other',status:'Pending'},session);
  if(reassigned && resource==='leads') {
    if(settings?.notificationPreferences?.leadAssignments!==false)await Notification.create([{user:item.assignedTo,title:'Sales Lead Assigned',message:item.name+' has been assigned to you.',type:'System',link:'/sales/assigned-leads?record='+item._id}],{session});
    for(const dependent of ['qualifications','activities','calls','meetings','followups']) {
      const linked=await models[dependent].find({lead:item._id,assignedTo:before.assignedTo}).session(session);
      for(const child of linked){const previous=child.toObject();child.assignedTo=item.assignedTo;child.version++;await child.save({session});await writeSalesAudit(req,dependent,child,'reassign-linked-record',previous,session);}
    }
  }
  return item;
}
export async function deleteRecord(req,resource,id,version,session) {
  requirePermission(req,resource,'delete');
  const item=await getRecord(req,resource,id,session);
  if(Number(version)!==item.version)fail('Reload the record before deleting',409);
  if(item.files?.length)fail('Records with retained documents cannot be deleted');
  if(['Sent','Accepted','Signed','Approved'].includes(item.status) || item.stage==='Won')fail('Approved or closed commercial records cannot be deleted');
  const reference={companies:'company',leads:'lead',contacts:'contact',deals:'deal'}[resource];
  if(reference)for(const [other,config] of Object.entries(resources))if(config.fields.some(field=>field.key===reference)&&await models[other].exists({[reference]:item._id}).session(session))fail('Linked records exist; retain this record to preserve history');
  await writeSalesAudit(req,resource,item,'delete',item.toObject(),session);
  await item.deleteOne({session});
}

export async function recordInteraction(req,resource,item,verb,session) {
  if(resource==='activities' || !item.company)return;
  const types={emails:item.status==='Reply'?'Reply':'Email',calls:'Call',meetings:'Meeting',followups:'Follow-up',proposals:'Proposal',leads:'Status Change',deals:'Status Change'};
  const type=types[resource];if(!type)return;
  const [activity]=await models.activities.create([{company:item.company,lead:resource==='leads'?item._id:item.lead,deal:resource==='deals'?item._id:item.deal,contact:item.contact,type,summary:resources[resource].title+' '+verb+': '+(item.name || item.subject || item.recordId)+(item.stage || item.status?' ['+(item.stage || item.status)+']':''),occurredAt:new Date(),assignedTo:req.user._id,sharedWith:item.sharedWith,createdBy:req.user._id}],{session});
  await writeSalesAudit(req,'activities',activity,'record-interaction',null,session);
}