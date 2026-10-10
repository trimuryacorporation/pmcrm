import crypto from 'node:crypto';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import Project from '../models/Project.js';
import User from '../models/User.js';
import { getCommunicationConfig } from '../config/communications.js';
import { models } from './models.js';
import { resources } from './config.js';
import { fail, getRecord, requirePermission, permitted, salesIdentity } from './security.js';
import { createRecord, transaction, updateRecord, recordInteraction } from './store.js';
import { writeSalesAudit, settingsFor } from './validation.js';
import { publishSalesReminders } from './reminders.js';
import { quotationPdf } from './exports.js';
export async function act(req,resource,id,action,body,session) {
  requirePermission(req,resource,action.startsWith('approve') || action==='verify-signature'?'approve':'edit');
  const item=await getRecord(req,resource,id,session);
  if(Number(body.version)!==item.version)fail('This record changed. Reload before continuing.',409);
  const before=item.toObject();
  let related;
  if(resource==='research' && action==='convert-to-lead') {
    if(item.convertedLead)return {item,resource:'leads',related:await getRecord(req,'leads',item.convertedLead,session)};
    related=await createRecord(req,'leads',{name:item.name,website:item.website,industry:item.industry,country:item.country,contactName:item.contactName,email:item.email,serviceCategory:item.serviceCategory,leadSource:'Research',assignedTo:req.user._id,notes:item.notes},session);
    item.convertedLead=related._id;
  } else if(['leads','qualifications'].includes(resource) && action==='convert-to-opportunity') {
    const source=resource==='leads'?item:await getRecord(req,'leads',item.lead,session);
    if(source.status!=='Qualified' && item.status!=='Qualified')fail('Qualify the lead before converting it');
    if(source.convertedDeal)return {item:source,resource:'deals',related:await getRecord(req,'deals',source.convertedDeal,session)};
    related=await createRecord(req,'deals',{name:body.name || source.name,company:source.company,lead:source._id,serviceCategory:source.serviceCategory,estimatedValue:item.estimatedValue || 0,assignedTo:req.user._id,description:resource==='qualifications'?item.requirement:source.notes},session);
    const sourceBefore=source.toObject();source.convertedDeal=related._id;source.version++;await source.save({session});
    await writeSalesAudit(req,'leads',source,'convert-to-opportunity',sourceBefore,session);
    if(resource==='leads')return {item:source,resource:'deals',related};
  } else if(resource==='qualifications' && ['qualify','disqualify','request-information'].includes(action)) {
    const rules=await settingsFor(session);if(action==='qualify' && Number(item.score || 0)<Number(rules?.approvalWorkflows?.minimumQualificationScore || 0))fail('The qualification score is below the configured approval threshold');
    item.status={qualify:'Qualified',disqualify:'Disqualified','request-information':'More Information Requested'}[action];
    const source=await getRecord(req,'leads',item.lead,session);
    requirePermission(req,'leads','edit');
    const sourceBefore=source.toObject();source.status=action==='qualify'?'Qualified':action==='disqualify'?'Lost':'Responded';source.version++;await source.save({session});await writeSalesAudit(req,'leads',source,action,sourceBefore,session);
  } else if(resource==='followups' && action==='complete')item.status='Completed';
  else if(resource==='meetings' && ['complete','cancel'].includes(action))item.status=action==='complete'?'Completed':'Cancelled';
  else if(resource==='proposals' && action==='submit-approval') {
    if(item.status!=='Draft')fail('Only drafts can be submitted');item.status='Pending Approval';
  } else if(resource==='proposals' && action==='approve') {
    if(item.status!=='Pending Approval')fail('Submit the proposal for approval first');item.status='Approved';
  } else if(resource==='proposals' && action==='revise') {
    const values=Object.fromEntries(resources.proposals.fields.filter(field=>field.key!=='status').map(field=>[field.key,item[field.key]]));
    related=await createRecord(req,'proposals',{...values,status:'Draft'},session);
    related.version=item.version+1;related.history=[{at:new Date(),actor:req.user._id,version:item.version,snapshot:{...before,history:undefined}}];await related.save({session});
  } else if(resource==='proposals' && action==='accept') {
    if(item.status!=='Sent')fail('Send the proposal before recording acceptance');item.status='Accepted';
  } else if(resource==='pricing' && action==='approve') {
    if(!['Draft','Pending Approval'].includes(item.status))fail('Rate cannot be approved in this status');if(!item.unitRate || !item.unit || !item.serviceCategory || !item.effectiveDate)fail('Set the rate, unit, service and effective date before approval');item.status='Approved';
  } else if(resource==='pricing' && action==='new-version') {
    const data=Object.fromEntries(resources.pricing.fields.filter(field=>field.key!=='status').map(field=>[field.key,item[field.key]]));data.status='Draft';
    related=await createRecord(req,'pricing',data,session);related.version=item.version+1;await related.save({session});
  } else if(resource==='contracts' && action==='verify-signature') {
    const evidence=item.files.find(file=>String(file.id)===String(body.fileId));
    if(!evidence || !body.evidence || String(body.evidence).trim().length<10)fail('Select an uploaded signed document and record verification evidence');
    if(!body.signedDate || Number.isNaN(new Date(body.signedDate).getTime()) || new Date(body.signedDate)>new Date())fail('A valid past or present signature date is required');
    if(item.status==='Signed')fail('Contract is already verified');
    item.status='Signed';item.signedDate=new Date(body.signedDate);item.signatureEvidence=String(body.evidence).slice(0,20000);item.signatureVerifiedBy=req.user._id;item.signatureVerifiedAt=new Date();item.signatureFile=evidence.id;
  } else if(resource==='handovers' && action==='submit-review') {
    if(item.status!=='Draft')fail('Only draft handovers can be submitted');item.status='Pending Review';
  } else if(resource==='handovers' && action==='approve-handover') {
    if(item.status!=='Pending Review')fail('Submit the handover for review first');
    if(item.project)fail('Handover already has an Operations project');
    const won=await getRecord(req,'deals',item.deal,session);
    if(won.stage!=='Won')fail('A won deal is required');
    const onboarding=await models.onboarding.findOne({deal:item.deal,status:'Completed',completion:100}).session(session);
    if(!onboarding)fail('Complete client onboarding before approving handover');
    if(!item.projectManager || !item.startDate || !item.deadline || !item.deliverables)fail('Project manager, start, deadline and deliverables are required');
    if(!['INR','USD'].includes(item.currency))fail('The existing Operations project supports INR or USD; convert the approved commercial rate first');
    const company=await getRecord(req,'companies',item.company,session);
    const [project]=await Project.create([{name:item.name,code:'SAL-'+crypto.randomUUID(),clientName:company.name,projectType:[item.serviceCategory || 'Sales'],description:item.scope,requiredLanguage:(item.languages || '').split(',').map(v=>v.trim()).filter(Boolean),startDate:item.startDate,endDate:item.deadline,budget:won.estimatedValue,currency:item.currency,clientRate:item.approvedRate || 0,projectManager:item.projectManager,status:'Pre-Sale',notes:[item.guidelines,item.deliverables,item.qaRequirements].filter(Boolean).join('\n'),activityLog:[{message:'Created from sales handover '+item.recordId,actor:req.user._id,type:'Sales Handover'}]}],{session});
    item.project=project._id;item.status='Approved';const dealBefore=won.toObject();won.project=project._id;won.version++;await won.save({session});await writeSalesAudit(req,'deals',won,'link-operations-project',dealBefore,session);
    related={_id:project._id,name:project.name}; 
  } else if(resource==='emails' && action==='schedule') {
    if(!['Draft','Failed'].includes(item.status))fail('Only a draft or failed email can be scheduled');
    const scheduled=new Date(body.scheduledAt);
    if(Number.isNaN(scheduled.getTime()) || scheduled<=new Date())fail('Schedule a future date and time');
    const config=await getCommunicationConfig();if(!config.email.enabled || !config.email.host)fail('Configure the authorized email provider first',503);
    item.status='Scheduled';item.scheduledAt=scheduled;
  } else if(resource==='emails' && action==='cancel-schedule') {
    if(item.status!=='Scheduled')fail('Email is not scheduled');item.status='Draft';item.scheduledAt=undefined;
  } else fail('Unsupported action for this module');
  item.history.push({at:new Date(),actor:req.user._id,version:item.version,snapshot:{...before,history:undefined}});
  item.version++;await item.save({session});await writeSalesAudit(req,resource,item,action,before,session);await recordInteraction(req,resource,item,action,session);
  return {item,resource:related ? ({research:'leads',pricing:'pricing',handovers:'projects',proposals:'proposals',leads:'deals',qualifications:'deals'}[resource] || resource):resource,related};
}
function bucket() {return new mongoose.mongo.GridFSBucket(mongoose.connection.db,{bucketName:'sales_private_files'});}
async function attachmentBuffers(files) {
  const attachments=[];
  for(const file of files || []) {
    const chunks=[];for await (const chunk of bucket().openDownloadStream(file.id))chunks.push(chunk);
    attachments.push({filename:file.name,content:Buffer.concat(chunks)});
  }
  return attachments;
}
export async function deliverEmail(id,actor,resource='emails',expectedVersion) {
  const user=await User.findOne({_id:actor,isActive:true});
  if(!user)fail('Email sender is no longer authorized',403);
  const identityRequest={user};
  await new Promise((resolve,reject)=>salesIdentity(identityRequest,null,error=>error?reject(error):resolve()));
  requirePermission(identityRequest,resource,'edit');
  const authorizedRecord=await getRecord(identityRequest,resource,id);
  expectedVersion ??= authorizedRecord.version;
  const config=await getCommunicationConfig();
  if(!config.email.enabled || !config.email.host || !config.email.from)fail('Configure authorized SMTP in CRM communication settings before sending',503);
  let claimed;
  await transaction(async session=>{
    claimed=await models[resource].findOneAndUpdate({_id:id,...(expectedVersion?{version:expectedVersion}:{}),status:resource==='emails'?{$in:['Draft','Scheduled','Failed']}:'Approved'},{$set:{status:'Sending',sendingStartedAt:new Date()},$inc:{version:1}},{new:true,session});
    if(!claimed)fail('Record is already being sent or is not ready to send',409);
    await writeSalesAudit({user:{_id:actor},ip:'email-service'},resource,claimed,'provider-send-started',null,session);
  });
  const transport=nodemailer.createTransport({host:config.email.host,port:config.email.port,secure:config.email.secure,auth:{user:config.email.user,pass:config.email.password},connectionTimeout:15000,greetingTimeout:10000,socketTimeout:30000});
  let provider;
  try {
    const attachments=await attachmentBuffers(claimed.files);
    if(resource==='proposals')attachments.push({filename:claimed.recordId+'.pdf',content:await quotationPdf(await claimed.populate({path:'company',select:'name'}))});
    provider=await transport.sendMail({from:config.email.from,to:resource==='emails'?claimed.to:claimed.recipient,cc:claimed.cc || undefined,bcc:claimed.bcc || undefined,subject:resource==='emails'?claimed.subject:'Proposal: '+claimed.name,text:resource==='emails'?claimed.body:'Please find the attached proposal for '+claimed.name+'.',attachments});
    if(provider.rejected?.length || (provider.accepted && !provider.accepted.length))throw new Error('Provider rejected one or more recipients');
  } catch(error) {
    await transaction(async session=>{
      const failed=await models[resource].findById(id).session(session);const before=failed.toObject();failed.status=resource==='emails'?'Failed':'Approved';failed.failure=String(error.message).slice(0,1000);failed.version++;await failed.save({session});await writeSalesAudit({user:{_id:actor},ip:'email-service'},resource,failed,'provider-send-failed',before,session);
    });
    fail('Email provider could not accept the message. Check configuration and the record error.',502);
  } finally {transport.close();}
  await transaction(async session=>{
    const sent=await models[resource].findById(id).session(session);const before=sent.toObject();sent.status='Sent';sent.providerId=provider.messageId;sent.providerAcceptedAt=new Date();sent.sentAt=new Date();sent.failure=undefined;sent.version++;await sent.save({session});await writeSalesAudit({user:{_id:actor},ip:'email-service'},resource,sent,'provider-accepted',before,session);await recordInteraction({user:{_id:actor}},resource,sent,'provider accepted message',session);
  });
  return models[resource].findById(id);
}
export function startEmailScheduler() {
  let working=false,lastReminders=0;
  const timer=setInterval(async()=>{
    if(working)return;working=true;
    try {
      if(Date.now()-lastReminders>600000){await publishSalesReminders();lastReminders=Date.now();}
      const due=await models.emails.find({status:'Scheduled',scheduledAt:{$lte:new Date()}}).sort({scheduledAt:1}).limit(10);
      for(const item of due)try{await deliverEmail(item._id,item.createdBy);}catch(error){console.error('Sales scheduled email:',error.message);}
    }catch(error){console.error('Sales email scheduler:',error.message);}finally{working=false;}
  },30000);
  timer.unref();return timer;
}