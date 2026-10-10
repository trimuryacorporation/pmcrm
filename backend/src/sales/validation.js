import mongoose from 'mongoose';
import User from '../models/User.js';
import { Employee } from '../models/People.js';
import { models, SalesAudit } from './models.js';
import { resources, stages, onboardingChecks, actions } from './config.js';
import { fail, getRecord, permitted, validId } from './security.js';
export const transitionMap = {
  'New Opportunity':['Requirement Received','Qualified','Lost','On Hold'],
  'Requirement Received':['Qualified','Lost','On Hold'],
  'Qualified':['Proposal Preparation','Lost','On Hold'],
  'Proposal Preparation':['Proposal Sent','Lost','On Hold'],
  'Proposal Sent':['Negotiation','NDA / Contract','Lost','On Hold'],
  'Negotiation':['NDA / Contract','Proposal Preparation','Lost','On Hold'],
  'NDA / Contract':['Won','Negotiation','Lost','On Hold'],
  'On Hold':stages.filter(stage=>!['Won','On Hold'].includes(stage)),
  'Won':[], 'Lost':['New Opportunity'],
};
export function quoteTotal(data) {
  const quantity=Number(data.quantity ?? 0),rate=Number(data.unitRate ?? 0),tax=Number(data.tax ?? 0),discount=Number(data.discount ?? 0);
  if(![quantity,rate,tax,discount].every(Number.isFinite) || [quantity,rate,tax,discount].some(v=>v<0) || tax>100)fail('Quotation numbers are invalid');
  const subtotal=Math.round(quantity*rate*100)/100;
  if(discount>subtotal)fail('Discount cannot exceed the subtotal');
  return {subtotal,total:Math.round((subtotal-discount)*(1+tax/100)*100)/100};
}
export function checkTransition(oldStage,newStage,customStages=[]) {
  if(oldStage===newStage)return;
  const allowed=transitionMap[oldStage];
  if(allowed && !allowed.includes(newStage) && !customStages.includes(newStage))fail('Stage transition from '+oldStage+' to '+newStage+' is not allowed');
  if(!allowed && !customStages.includes(oldStage))fail('Unknown current deal stage');
  if(['Won','Lost'].includes(oldStage) && !allowed?.includes(newStage))fail('This closed deal cannot move to that stage');
}
export function completion(data) {
  const checks=[...onboardingChecks,'projectManager',...(data.poRequired?['poReceived']:[])];
  return Math.round(checks.filter(key=>Boolean(data[key])).length/checks.length*100);
}
export async function writeSalesAudit(req,resource,item,action,before,session) {
  const after=item.toObject ? item.toObject() : item;
  await SalesAudit.create([{actor:req.user._id,createdBy:item.createdBy,resource,record:item._id,action,company:resource==='companies'?item._id:item.company,lead:resource==='leads'?item._id:item.lead,deal:resource==='deals'?item._id:item.deal,assignedTo:item.assignedTo,sharedWith:item.sharedWith,before,after,ip:req.ip}],{session});
}
export async function settingsFor(session) {return models.settings.findOne().session(session || null).lean();}
export async function validatePayload(req,resource,body,existing,session) {
  const config=resources[resource], output={};
  if(!body || typeof body!=='object' || Array.isArray(body))fail('A JSON object is required');
  const fields=new Map(config.fields.map(field=>[field.key,field]));
  const allowed=new Set([...fields.keys(),'sharedWith','version']);
  for(const key of Object.keys(body))if(!allowed.has(key))fail('Unsupported field: '+key);
  const settings=await settingsFor(session);
  for(const [key,input] of Object.entries(body)) {
    if(['version','sharedWith'].includes(key))continue;
    if(input===undefined)continue;
    const field=fields.get(key);
    if(input===null || input===''){if(field.required && !(resource==='leads'&&key==='company'))fail(field.label+' is required');output[key]=undefined;continue;}
    if(field.type==='number'){output[key]=Number(input);if(!Number.isFinite(output[key]) || output[key]<0 || (['score','probability','tax'].includes(key)&&output[key]>100))fail(field.label+' is invalid');}
    else if(field.type==='checkbox'){if(typeof input!=='boolean')fail(field.label+' must be true or false');output[key]=input;}
    else if(['date','datetime-local'].includes(field.type)){if(Number.isNaN(new Date(input).getTime()))fail(field.label+' is invalid');output[key]=new Date(input);}
    else if(['reference','references'].includes(field.type)) {
      const values=field.type==='references'?input:[input];if(!Array.isArray(values))fail(field.label+' must be a list');
      for(const id of values) {
        validId(id);
        if(field.ref==='users') {
          const user=await User.findOne({_id:id,isActive:true,role:{$in:['super_admin','admin','employee']}}).session(session).select('_id');
          if(!user)fail('Invalid active CRM user');
          if(key==='assignedTo' && String(id)!==req.sales.userId)fail('You cannot assign this record to another user',403);
          if(key!=='assignedTo' && !req.sales.root && String(id)!==req.sales.userId)fail('User reference access denied',403);
        } else if(field.ref==='employees') {
          if(!req.sales.root && String(id)!==String(req.user.linkedEmployee))fail('Employee reference access denied',403);
          if(!await Employee.exists({_id:id}).session(session))fail('Employee not found');
        } else await getRecord(req,field.ref,id,session);
      }
      output[key]=input;
    } else if(field.type==='json') {
      const value=typeof input==='string'?JSON.parse(input):input;
      if(value && JSON.stringify(value).length>30000)fail('Settings payload too large');
      if(resource==='permissions' && key==='grants') {
        if(!value || Array.isArray(value) || typeof value!=='object')fail('Permissions must be a module-to-actions object');
        for(const [module,grant] of Object.entries(value)) {
          if(!Object.hasOwn(resources,module) || ['permissions','settings'].includes(module))fail('Invalid permission module');
          if(!grant || typeof grant!=='object' || Array.isArray(grant))fail('Invalid module permissions');
          for(const [action,enabled] of Object.entries(grant))if(!actions.includes(action)||typeof enabled!=='boolean')fail('Permissions must contain boolean actions');
        }
      }
      if(['leadStatuses','dealStages','leadSources','serviceCategories'].includes(key)&&(!Array.isArray(value)||value.some(v=>typeof v!=='string'||!v.trim()||v.length>100)))fail(field.label+' must be a list of strings');
      if(resource==='settings' && /password|secret|token|credential/i.test(JSON.stringify(value)))fail('Store integration secrets in the secure existing configuration or environment');
      if(resource==='settings'&&['followupRules','notificationPreferences','approvalWorkflows'].includes(key)) {
        if(!value || Array.isArray(value) || typeof value!=='object')fail(field.label+' must be an object');
        const keys={followupRules:['autoCreate','defaultDays','contractReminderDays'],notificationPreferences:['followups','contractExpiry','leadAssignments'],approvalWorkflows:['minimumQualificationScore','minimumWinProbability']};
        for(const [option,setting] of Object.entries(value)){
          if(!keys[key].includes(option))fail('Unsupported '+field.label+' option: '+option);
          if(['autoCreate','followups','contractExpiry','leadAssignments'].includes(option)){if(typeof setting!=='boolean')fail(option+' must be true or false');}
          else if(typeof setting!=='number'||!Number.isFinite(setting)||setting<0||setting>(['defaultDays','contractReminderDays'].includes(option)?365:100))fail(option+' is out of range');
        }
      }
      output[key]=value;
    } else {
      if(typeof input!=='string')fail(field.label+' must be text');
      const value=input.trim();
      if(value.length>(field.type==='textarea'?20000:1000))fail(field.label+' is too long');
      if(field.type==='url'){let url;try{url=new URL(value);}catch{fail(field.label+' must be a valid URL');}if(!['https:','http:'].includes(url.protocol))fail('Only HTTP(S) URLs are allowed');}
      if(field.type==='email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))fail(field.label+' must be a valid email');
      if(field.type==='select') {
        const extra=key==='status' && resource==='leads'?settings?.leadStatuses:key==='stage'?settings?.dealStages:key==='serviceCategory'&&resource!=='pricing'?settings?.serviceCategories:[];
        if(![...(field.options || []),...(extra || [])].includes(value))fail(field.label+' contains an unsupported value');
      }
      if(['cc','bcc'].includes(key) && value.split(',').some(v=>!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())))fail('Invalid email address list');
      if(resource==='settings' && key==='integrations' && /password|secret|token|credential/i.test(value))fail('Do not store integration secrets here');
      output[key]=field.type==='email'?value.toLowerCase():value;
    }
  }
  if(body.sharedWith!==undefined) {
    if(!permitted(req,resource,'assign'))fail('Sharing requires assignment permission',403);
    if(!Array.isArray(body.sharedWith)||body.sharedWith.length>100)fail('Invalid shared users');
    for(const id of body.sharedWith){validId(id);if(!await User.exists({_id:id,isActive:true}).session(session))fail('Shared user not found');}
    output.sharedWith=body.sharedWith;
  }
  const merged={...(existing?.toObject() || {}),...output};
  for(const field of config.fields)if(field.required && !merged[field.key] && !(resource==='leads' && field.key==='company' && merged.name))fail(field.label+' is required');
  if(!existing) {
    if(!['settings','permissions'].includes(resource))output.assignedTo = req.user._id;
    const defaultStatus={leads:'New',qualifications:'Pending',emails:'Draft',meetings:'Scheduled',followups:'Pending',proposals:'Draft',pricing:'Draft',contracts:'Draft',onboarding:'In Progress',handovers:'Draft',team:'Active'};
    output.status ||= defaultStatus[resource];
    if(!output.status)delete output.status;
    if(resource==='deals'){output.stage ||= 'New Opportunity';if(output.stage!=='New Opportunity')fail('Create a deal in the New Opportunity stage');output.probability ??= 0;}
    if(config.fields.some(field=>field.key==='currency'))output.currency ||= settings?.currency || 'INR';
    if(['meetings','contacts'].includes(resource))output.timeZone ||= settings?.timeZone || 'UTC';
  }
  if(existing && output.assignedTo && String(output.assignedTo)!==String(existing.assignedTo) && !permitted(req,resource,'assign'))fail('Assignment permission required',403);
  for(const related of ['lead','contact','deal']) {
    if(merged[related] && merged.company){const linked=await getRecord(req,related==='lead'?'leads':related==='contact'?'contacts':'deals',merged[related],session);if(String(linked.company)!==String(merged.company))fail('Related '+related+' belongs to a different company');}
  }
  if(merged.timeZone){try{new Intl.DateTimeFormat('en',{timeZone:merged.timeZone});}catch{fail('Use a valid IANA time zone such as Asia/Kolkata');}}
  if(resource==='meetings' && !(merged.startsAt&&merged.endsAt))fail('Meeting start and end are required');
  if(resource==='followups' && !merged.dueDate)fail('Follow-up due date is required');
  if(resource==='contracts' && !merged.documentType)fail('Document type is required');
  if(resource==='proposals' && !(Number(merged.quantity)>0 && Number(merged.unitRate)>=0))fail('Quotation quantity must be greater than zero');
  if(resource==='leads' && ['Won','Lost'].includes(output.status) && merged.convertedDeal) {
    const linked=await getRecord(req,'deals',merged.convertedDeal,session);
    if(linked.stage!==output.status)fail('Close the linked deal before closing this lead');
  }
  if(resource==='meetings' && merged.startsAt && merged.endsAt && new Date(merged.endsAt)<=new Date(merged.startsAt))fail('Meeting end must be after start');
  if(resource==='targets' && merged.periodStart && merged.periodEnd && new Date(merged.periodEnd)<new Date(merged.periodStart))fail('Target period end must follow its start');
  if(resource==='deals' && existing && output.stage) {
    checkTransition(existing.stage,output.stage,settings?.dealStages || []);
    if(output.stage==='Proposal Sent' && !await models.proposals.exists({deal:existing._id,status:{$in:['Sent','Accepted']}}).session(session))fail('Send an approved proposal before moving to Proposal Sent');
    if(output.stage==='Won') {
      if(Number(merged.probability || 0)<Number(settings?.approvalWorkflows?.minimumWinProbability || 0))fail('The win probability is below the configured approval threshold');
      if(!permitted(req,resource,'approve'))fail('Winning a deal requires approval permission',403);
      if(!await models.contracts.exists({deal:existing._id,status:'Signed',documentType:{$in:['MSA','SOW','Service Agreement','Purchase Order']},signatureVerifiedAt:{$exists:true}}).session(session))fail('A verified signed commercial agreement or SOW is required to win a deal');
      if(!await models.proposals.exists({deal:existing._id,status:'Accepted'}).session(session))fail('An accepted proposal is required to win a deal');
    }
  }
  if(resource==='emails') {
    if(output.status && !['Draft','Reply','Template'].includes(output.status))fail('Use email send or schedule actions to change delivery status');
    if(existing && ['Sending','Sent','Scheduled'].includes(existing.status))fail('Sent or scheduled emails cannot be edited; cancel scheduling or create a new draft');
  }
  if(['proposals','handovers'].includes(resource) && merged.deal){const linked=await getRecord(req,'deals',merged.deal,session);if((output.currency || merged.currency || 'INR')!==linked.currency)fail('Commercial currency must match the related deal');}
  if(resource==='proposals') {
    Object.assign(output,quoteTotal({...merged,...output}));
    if(output.status==='Approved' && !permitted(req,resource,'approve'))fail('Proposal approval permission required',403);
    if(output.status==='Approved' && existing?.status!=='Pending Approval')fail('Submit a proposal for approval first');
    if(output.status==='Sent')fail('Use Send to Client to send the approved proposal');
    if(output.status==='Accepted' && existing?.status!=='Sent')fail('A proposal must be sent before acceptance can be recorded');
    if(existing && ['Approved','Sent','Accepted'].includes(existing.status) && Object.keys(output).some(key=>!['status','notes','total','subtotal'].includes(key)))fail('Revise the proposal to create a new draft before changing commercial terms');
    if(!existing && output.status!=='Draft')fail('New proposals must start as drafts');
  }
  if(resource==='pricing' && existing?.status==='Approved')fail('Official rates are immutable. Create a new version of the rate card');
  if(resource==='pricing' && output.status==='Approved' && !permitted(req,resource,'approve'))fail('Rate approval permission required',403);
  if(resource==='contracts' && output.status==='Signed')fail('Use Verify Signature with uploaded evidence to mark a contract signed');
  if(resource==='contracts' && output.signedDate && merged.status!=='Signed')fail('Only verified signed contracts can have a signed date');
  if(['onboarding','handovers'].includes(resource)) {
    const won=merged.deal && await getRecord(req,'deals',merged.deal,session);
    if(!won || won.stage!=='Won')fail('This workflow requires a won deal');
    if(resource==='onboarding') {
      if(merged.ndaSigned && !await models.contracts.exists({deal:won._id,documentType:'NDA',status:'Signed',signatureVerifiedAt:{$exists:true}}).session(session))fail('A verified signed NDA is required');
      if(merged.agreementSigned && !await models.contracts.exists({deal:won._id,documentType:{$in:['MSA','SOW','Service Agreement']},status:'Signed',signatureVerifiedAt:{$exists:true}}).session(session))fail('A verified signed MSA/SOW or agreement is required');
      output.completion=completion({...merged,...output});
      if(output.status==='Completed'&&output.completion!==100)fail('Complete all onboarding steps first');
    }
    if(resource==='handovers' && output.status==='Approved')fail('Use Approve Handover to create the linked Operations project');
  }
  return output;
}