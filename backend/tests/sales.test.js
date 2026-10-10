import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import ApiKey from '../src/models/ApiKey.js';
import test, {before,after} from 'node:test';
import mongoose from 'mongoose';
import express from 'express';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import User from '../src/models/User.js';
import { Employee } from '../src/models/People.js';
import { Invoice } from '../src/models/Finance.js';
import Project from '../src/models/Project.js';
import SystemSetting from '../src/models/SystemSetting.js';
import { models, SalesAudit } from '../src/sales/models.js';
import routes from '../src/sales/routes.js';
import adminRoutes from '../src/routes/adminRoutes.js';
import { errorHandler } from '../src/middleware/error.js';
import { quoteTotal,checkTransition,completion } from '../src/sales/validation.js';
import { escapeRegex } from '../src/sales/store.js';
import { permissionsFor,scopeFor } from '../src/sales/security.js';
import { resources,navigation } from '../src/sales/config.js';

let repl,server,base,manager,bda,other,tokens,employee,superAdmin;
before(async()=>{
  process.env.JWT_SECRET='isolated-sales-test-secret';
  process.env.SALES_RATE_LIMIT='10000';
  process.env.SMTP_HOST='test.smtp.invalid';process.env.SMTP_USER='test@example.invalid';process.env.SMTP_FROM='test@example.invalid';process.env.SMTP_PASS='test-fixture-only';
  repl=await MongoMemoryReplSet.create({replSet:{count:1,launchTimeout:120000},instanceOpts:[{launchTimeout:120000}],binary:{version:process.env.SALES_TEST_MONGO_VERSION || '7.0.14'}});
  await mongoose.connect(repl.getUri('sales_workflow_tests'));
  await Promise.all([...Object.values(models),SalesAudit,User,Employee,Project,Invoice].map(model=>model.init()));
  [manager,bda,other]=await User.create([{name:'Test Manager',email:'manager@sales.test',password:'test-password',role:'admin'},{name:'Test BDA',email:'bda@sales.test',password:'test-password',role:'employee'},{name:'Other BDA',email:'other@sales.test',password:'test-password',role:'employee'}]);
  employee=await Employee.create({employeeId:'TEST-PM',name:'Test Project Manager'});
  superAdmin=await User.create({name:'Access Administrator',email:'access-admin@sales.test',password:'test-password',role:'super_admin'});
  tokens=Object.fromEntries([manager,bda,other,superAdmin].map(user=>[String(user._id),jwt.sign({id:user._id},process.env.JWT_SECRET)]));
  const app=express();app.use(express.json());app.use('/api/sales',routes);app.use('/api/administrators',adminRoutes);app.use(errorHandler);
  server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));base='http://127.0.0.1:'+server.address().port+'/api/sales';
});
after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));await mongoose.disconnect();if(repl)await repl.stop();});
async function request(user,path,method='GET',body,status=200) {
  const response=await fetch(base+path,{method,headers:{Authorization:'Bearer '+tokens[String(user._id)],...(body instanceof FormData?{}:{'Content-Type':'application/json'})},...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})});
  const data=await response.json();
  assert.equal(response.status,status,method+' '+path+': '+JSON.stringify(data));
  return data;
}

test('isolated MongoDB: creator isolation ignores assignment and sharing',async()=>{
const lead=await request(bda,'/leads','POST',{name:'Ownership Fixture',email:'own@fixture.test',serviceCategory:'Transcription'},201);
assert.equal(String(lead.assignedTo),String(bda._id));
for(const user of [manager,other]){await request(user,'/leads/'+lead._id,'GET',undefined,404);await request(user,'/leads/'+lead._id,'PUT',{notes:'forbidden',version:lead.version},404);assert.equal((await request(user,'/leads')).total,0);}
await request(manager,'/leads','POST',{name:'Spoofed Owner',assignedTo:String(bda._id)},403);
await request(bda,'/leads/'+lead._id,'PUT',{assignedTo:String(other._id),version:lead.version},403);
await models.leads.updateOne({_id:lead._id},{$set:{assignedTo:manager._id,sharedWith:[other._id]}});
await request(bda,'/leads/'+lead._id);
const refs=await request(other,'/metadata');assert.equal(refs.references.companies.length,0);
const csv=await fetch(base+'/leads/export?format=csv',{headers:{Authorization:'Bearer '+tokens[String(other._id)]}});assert.equal(csv.status,200);assert.equal((await csv.text()).includes('Ownership Fixture'),false);
await models.permissions.collection.insertOne({user:other._id,salesRole:'Sales Head',allRecords:true,createdBy:manager._id});assert.equal((await request(other,'/leads')).total,0);await models.permissions.deleteOne({user:other._id});
await request(manager,'/leads/'+lead._id,'GET',undefined,404);await request(other,'/leads/'+lead._id,'GET',undefined,404);
await request(manager,'/contacts','POST',{name:'Cross User Contact',company:lead.company},404);
await request(bda,'/leads','POST',{name:lead.name,company:lead.company,email:lead.email,serviceCategory:'Transcription'},409);
await request(manager,'/leads','POST',{name:lead.name,email:lead.email,serviceCategory:'Transcription'},201);
});

test('isolated MongoDB: complete researched lead to approved Operations handover and client payment',async(t)=>{
  let providerCalls=0;
  t.mock.method(nodemailer,'createTransport',()=>({sendMail:async()=>{providerCalls++;return {messageId:'isolated-provider-test-id',accepted:['client@fixture.test'],rejected:[]};},close(){}}));
  const research=await request(manager,'/research','POST',{name:'Workflow Fixture',website:'https://fixture.example',email:'client@fixture.test',serviceCategory:'Transcription',notes:'Manually verified test fixture'},201);
  const conversion=await request(manager,'/research/'+research._id+'/actions/convert-to-lead','POST',{version:research.version});
  let lead=conversion.related;assert.ok(lead.company);assert.equal(await models.companies.countDocuments({_id:lead.company}),1);
  const contact=await request(manager,'/contacts','POST',{name:'Test Contact',company:lead.company,email:'client@fixture.test'},201);
  lead=await request(manager,'/leads/'+lead._id,'PUT',{status:'Contacted',lastContacted:new Date().toISOString(),version:lead.version});
  await request(manager,'/calls','POST',{company:lead.company,lead:lead._id,contact:contact._id,summary:'Requirements collected',outcome:'Interested',nextFollowup:new Date(Date.now()+86400000).toISOString()},201);
  const followup=await request(manager,'/followups','POST',{name:'Requirements Follow-up',company:lead.company,lead:lead._id,dueDate:new Date().toISOString()},201);
  await request(manager,'/followups/'+followup._id+'/actions/complete','POST',{version:followup.version});
  const meeting=await request(manager,'/meetings','POST',{name:'Requirements Meeting',company:lead.company,contact:contact._id,lead:lead._id,startsAt:new Date().toISOString(),endsAt:new Date(Date.now()+3600000).toISOString(),platform:'Google Meet',meetingUrl:'https://meet.google.com/test'},201);
  await request(manager,'/meetings/'+meeting._id+'/actions/complete','POST',{version:meeting.version});
  const qualification=await request(manager,'/qualifications','POST',{company:lead.company,lead:lead._id,requirement:'Transcription fixture scope',estimatedValue:1062,score:90},201);
  const qualified=await request(manager,'/qualifications/'+qualification._id+'/actions/qualify','POST',{version:qualification.version});
  const dealResponse=await request(manager,'/qualifications/'+qualification._id+'/actions/convert-to-opportunity','POST',{version:qualified.item.version});
  let deal=dealResponse.related;
  await request(manager,'/deals/'+deal._id,'PUT',{stage:'Won',version:deal.version},400);
  const proposal=await request(manager,'/proposals','POST',{company:lead.company,deal:deal._id,name:'Transcription Quote',quantity:10,unitRate:100,tax:18,discount:100,currency:'INR',recipient:'client@fixture.test'},201);
  assert.equal(proposal.total,1062);
  let proposed=(await request(manager,'/proposals/'+proposal._id+'/actions/submit-approval','POST',{version:proposal.version})).item;
  await request(other,'/proposals/'+proposal._id+'/actions/approve','POST',{version:proposed.version},403);
  proposed=(await request(manager,'/proposals/'+proposal._id+'/actions/approve','POST',{version:proposed.version})).item;
  proposed=(await request(manager,'/proposals/'+proposal._id+'/actions/send','POST',{version:proposed.version})).item;
  assert.equal(providerCalls,1);assert.equal(proposed.status,'Sent');assert.ok(proposed.providerAcceptedAt);
  proposed=(await request(manager,'/proposals/'+proposal._id+'/actions/accept','POST',{version:proposed.version})).item;
  for(const documentType of ['NDA','SOW']){
    let contract=await request(manager,'/contracts','POST',{name:documentType+' Test Evidence',company:lead.company,deal:deal._id,documentType},201);
    await request(manager,'/contracts/'+contract._id,'PUT',{status:'Signed',version:contract.version},400);
    const form=new FormData();form.append('files',new Blob(['%PDF-1.4\nIsolated signed evidence fixture'],{type:'application/pdf'}),'evidence.pdf');
    contract=await request(manager,'/contracts/'+contract._id+'/files','POST',form,201);
    await request(other,'/contracts/'+contract._id+'/files/'+contract.files[0].id,'GET',undefined,404);
    contract=(await request(manager,'/contracts/'+contract._id+'/actions/verify-signature','POST',{version:contract.version,fileId:contract.files[0].id,evidence:'Manager verified the signed test fixture',signedDate:new Date().toISOString()})).item;
    assert.equal(contract.status,'Signed');assert.ok(contract.signatureVerifiedAt);
    if(documentType==='NDA')assert.equal((await request(manager,'/analytics?currency=INR')).revenue.contracted,0);
  }
  for(const stage of ['Qualified','Proposal Preparation','Proposal Sent','Negotiation','NDA / Contract','Won'])deal=await request(manager,'/deals/'+deal._id,'PUT',{stage,version:deal.version});
  assert.equal(deal.stage,'Won');assert.ok(deal.closedAt);assert.equal((await models.leads.findById(lead._id)).status,'Won');
  const onboarding=await request(manager,'/onboarding','POST',{name:'Workflow Onboarding',company:lead.company,deal:deal._id,companyDetails:true,contactsVerified:true,requirementsConfirmed:true,commercialApproved:true,ndaSigned:true,agreementSigned:true,billingCollected:true,projectManager:String(employee._id),kickoffScheduled:true,status:'Completed',assignedTo:String(manager._id)},201);
  assert.equal(onboarding.completion,100);
  let handover=await request(manager,'/handovers','POST',{name:'Workflow Project',company:lead.company,deal:deal._id,serviceCategory:'Transcription',currency:'INR',scope:'Verified test scope',deliverables:'Transcripts',startDate:new Date().toISOString(),deadline:new Date(Date.now()+7*86400000).toISOString(),projectManager:String(employee._id),assignedTo:String(manager._id)},201);
  handover=(await request(manager,'/handovers/'+handover._id+'/actions/submit-review','POST',{version:handover.version})).item;
  handover=(await request(manager,'/handovers/'+handover._id+'/actions/approve-handover','POST',{version:handover.version})).item;
  assert.ok(handover.project);
  const project=await Project.findById(handover.project);assert.equal(project.name,'Workflow Project');
  const linked=await models.deals.findById(deal._id);assert.equal(String(linked.project),String(project._id));
  const invoice=await request(manager,'/invoices','POST',{deal:deal._id,invoiceNumber:'TEST-RECEIVABLE-1',amount:1062,amountPaid:500,currency:'INR',paymentReference:'Verified-test-payment'},201);
  await request(manager,'/invoices/'+invoice._id+'/payment','PATCH',{amountPaid:1062,paymentReference:'Verified-test-payment-2'});
  const metrics=await request(manager,'/analytics?currency=INR');assert.equal(metrics.revenue.won,1062);assert.equal(metrics.revenue.invoiced,1062);assert.equal(metrics.revenue.collected,1062);assert.equal(metrics.revenue.forecast,0);
  assert.ok(await SalesAudit.countDocuments({record:handover._id,action:'approve-handover'}));
  const activity=await request(manager,'/activities?company='+lead.company);assert.ok(activity.total>5);
  const pdf=await fetch(base+'/proposals/'+proposal._id+'/pdf',{headers:{Authorization:'Bearer '+tokens[String(manager._id)]}});assert.equal(pdf.status,200);assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0,5).toString(),'%PDF-');
});

test('isolated MongoDB: imports, exports, manager pricing and all module list APIs',async()=>{
  const form=new FormData();form.append('file',new Blob(['Company / Lead Name,Email,Service Category\nImported Fixture,import@fixture.test,Translation']), 'leads.csv');
  const imported=await request(manager,'/leads/import','POST',form);assert.equal(imported.created,1);assert.equal(imported.rejected,0);
  const exported=await fetch(base+'/leads/export?format=xlsx',{headers:{Authorization:'Bearer '+tokens[String(manager._id)]}});assert.equal(exported.status,200);const bytes=Buffer.from(await exported.arrayBuffer());assert.equal(bytes.subarray(0,2).toString(),'PK');
  await request(bda,'/pricing','POST',{name:'Unauthorized Rate',unitRate:10},403);
  for(const resource of Object.keys(resources)){const list=await request(manager,'/'+resource);assert.ok(Array.isArray(list.items));}
  await request(bda,'/permissions','GET',undefined,403);
  const empty=await request(other,'/analytics?currency=USD');assert.equal(empty.revenue.won,0);assert.equal(empty.revenue.collected,0);
});
test('isolated MongoDB: finalized proposal revisions, role grants, reporting and reminders',async()=>{
  const proposal=await models.proposals.findOne({status:'Accepted'});
  const revised=await request(manager,'/proposals/'+proposal._id+'/actions/revise','POST',{version:proposal.version});
  assert.equal(revised.related.status,'Draft');
  assert.equal(revised.resource,'proposals');
  assert.notEqual(String(revised.related._id),String(proposal._id));
  assert.equal((await models.proposals.findById(proposal._id)).status,'Accepted');
  const permission=await request(manager,'/permissions','POST',{user:String(other._id),salesRole:'Read-only Auditor',grants:{}},201);
  const read=await request(other,'/leads');assert.equal(read.total,0);
  await request(other,'/leads','POST',{name:'Auditor Cannot Create'},403);
  await request(other,'/permissions','GET',undefined,403);
  for(const type of ['daily','weekly','monthly','sources','followups','conversion','deals','revenue','employees']){
    const report=await request(manager,'/reports?type='+type);
    assert.ok(Array.isArray(report.rows));assert.ok(report.fields.length);
    const response=await fetch(base+'/reports/export?type='+type+'&format=pdf',{headers:{Authorization:'Bearer '+tokens[String(manager._id)]}});
    assert.equal(response.status,200);assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0,5).toString(),'%PDF-');
  }
  const {publishSalesReminders}=await import('../src/sales/reminders.js');
  const Notification=(await import('../src/models/Notification.js')).default;
  await Notification.init();
  await request(manager,'/followups','POST',{name:'Overdue Reminder Fixture',company:String(proposal.company),dueDate:new Date(Date.now()-86400000).toISOString()},201);
  await publishSalesReminders();const first=await Notification.countDocuments({salesKey:{$exists:true}});
  assert.ok(first>0);await publishSalesReminders();assert.equal(await Notification.countDocuments({salesKey:{$exists:true}}),first);
});

test('isolated MongoDB: email drafts, scheduling and provider failure do not fabricate sent status',async(t)=>{
  const lead=await models.leads.findOne({email:'client@fixture.test'});
  const draft=await request(manager,'/emails','POST',{company:String(lead.company),to:'client@fixture.test',subject:'Fixture Email',body:'Authorized isolated test'},201);
  await request(manager,'/emails/'+draft._id,'PUT',{status:'Sent',version:draft.version},400);
  const scheduled=(await request(manager,'/emails/'+draft._id+'/actions/schedule','POST',{version:draft.version,scheduledAt:new Date(Date.now()+86400000).toISOString()})).item;
  assert.equal(scheduled.status,'Scheduled');
  const cancelled=(await request(manager,'/emails/'+draft._id+'/actions/cancel-schedule','POST',{version:scheduled.version})).item;
  assert.equal(cancelled.status,'Draft');
  t.mock.method(nodemailer,'createTransport',()=>({sendMail:async()=>{throw new Error('Isolated provider failure');},close(){}}));
  await request(manager,'/emails/'+draft._id+'/actions/send','POST',{version:cancelled.version},502);
  const persisted=await models.emails.findById(draft._id);
  assert.equal(persisted.status,'Failed');assert.equal(persisted.sentAt,undefined);assert.equal(persisted.providerAcceptedAt,undefined);
});
test('isolated MongoDB: configured rules drive follow-ups, qualification and custom statuses',async()=>{
  await request(manager,'/settings','POST',{name:'Global Sales Rules',currency:'INR',timeZone:'Asia/Kolkata',duplicateDetection:true,leadStatuses:['Needs Review'],leadSources:['Referral'],followupRules:{autoCreate:true,defaultDays:2,contractReminderDays:15},notificationPreferences:{followups:true,contractExpiry:true,leadAssignments:true},approvalWorkflows:{minimumQualificationScore:50,minimumWinProbability:0}},201);
  const settings=await models.settings.findOne();await request(manager,'/settings/'+settings._id,'PUT',{version:settings.version,followupRules:{defaultDays:-1}},400);
  const lead=await request(bda,'/leads','POST',{name:'Settings Fixture',email:'settings@fixture.test',serviceCategory:'Translation'},201);
  assert.ok(lead.nextFollowup);
  const followups=await request(bda,'/followups?lead='+lead._id);assert.equal(followups.total,1);
  const pending=await request(manager,'/leads?qualificationPending=true');assert.ok(pending.items.every(item=>['New','Contacted','Responded'].includes(item.status)));
  await request(bda,'/leads/'+lead._id,'PUT',{status:'Needs Review',version:lead.version});
  const qualification=await request(bda,'/qualifications','POST',{company:lead.company,lead:lead._id,requirement:'Settings validation fixture',score:10},201);
  await request(bda,'/qualifications/'+qualification._id+'/actions/qualify','POST',{version:qualification.version},400);
  await request(bda,'/contacts','POST',{name:'Invalid Time Zone Fixture',company:lead.company,timeZone:'Invalid/Zone'},400);
});
test('isolated MongoDB: existing Access Control persists and enforces all Sales permissions',async()=>{
  const controlBase=base.replace('/sales','/administrators');
  const update=async permissions=>{const response=await fetch(controlBase+'/access-users/'+bda._id+'/permissions',{method:'PATCH',headers:{Authorization:'Bearer '+tokens[String(superAdmin._id)],'Content-Type':'application/json'},body:JSON.stringify({accessPermissions:permissions})});assert.equal(response.status,200,await response.text());};
  await update({'sales-leads':{view:true,create:false,edit:false,delete:false,export:false,approve:false},'sales-analytics':{view:false},'sales-reports':{view:false},'sales-assigned-leads':{view:false}});
  const persisted=await User.findById(bda._id);assert.equal(persisted.accessPermissions.get('sales-leads').export,false);
  const metadata=await request(bda,'/metadata');assert.equal(Object.keys(metadata.pages).length,26);assert.equal(metadata.pages['assigned-leads'].view,false);assert.equal(metadata.permissions.leads.create,false);
  await request(bda,'/leads','POST',{name:'Denied Access Fixture'},403);await request(bda,'/analytics','GET',undefined,403);await request(bda,'/reports','GET',undefined,403);
  const csv=await fetch(base+'/leads/export?format=csv',{headers:{Authorization:'Bearer '+tokens[String(bda._id)]}});assert.equal(csv.status,403);
  const list=await request(bda,'/leads');assert.ok(list.total>0);
  const control=await fetch(controlBase+'/access-users',{headers:{Authorization:'Bearer '+tokens[String(superAdmin._id)]}});assert.equal(control.status,200);const users=await control.json();assert.equal(users.items.find(user=>String(user._id)===String(bda._id)).effectiveSalesAccess['sales-leads'].create,false);
  await update({sales:{view:false}});await request(bda,'/metadata','GET',undefined,403);await request(bda,'/leads','GET',undefined,403);
  await update({'sales-leads':{view:true,create:true,edit:true,delete:false,export:true,approve:false}});
  const lead=await request(bda,'/leads','POST',{name:'Enabled Access Fixture'},201);assert.equal(String(lead.createdBy),String(bda._id));
  await request(manager,'/leads/'+lead._id,'GET',undefined,404);
  await update({});
});

test('isolated MongoDB: API keys inherit owner Sales Access Control restrictions',async()=>{
  const secret='isolated-sales-api-key';
  await ApiKey.create({name:'Isolated Sales Access Test',keyPrefix:'test',keyHash:crypto.createHash('sha256').update(secret).digest('hex'),role:'admin',createdBy:manager._id});
  await User.updateOne({_id:manager._id},{$set:{accessPermissions:{sales:{view:false}}}});
  const blocked=await fetch(base+'/leads',{headers:{'X-API-Key':secret}});assert.equal(blocked.status,403);
  await User.updateOne({_id:manager._id},{$unset:{accessPermissions:1}});
  const allowed=await fetch(base+'/leads',{headers:{'X-API-Key':secret}});assert.equal(allowed.status,200);
  const data=await allowed.json();assert.ok(data.items.every(item=>String(item.createdBy._id)===String(manager._id)));
  await ApiKey.deleteOne({name:'Isolated Sales Access Test'});
});

test('isolated MongoDB: only Super Admin can view every user Sales records and exports',async()=>{
  const records=await models.leads.find().lean();assert.ok(records.some(item=>String(item.createdBy)===String(bda._id)));assert.ok(records.some(item=>String(item.createdBy)===String(manager._id)));
  const all=await request(superAdmin,'/leads?limit=100');assert.equal(all.total,records.length);
  const employeeRecord=records.find(item=>String(item.createdBy)===String(bda._id));
  await request(superAdmin,'/leads/'+employeeRecord._id);await request(manager,'/leads/'+employeeRecord._id,'GET',undefined,404);
  const metadata=await request(superAdmin,'/metadata');assert.equal(metadata.allRecords,true);assert.equal(metadata.references.leads.length,records.length);assert.equal((await request(manager,'/metadata')).allRecords,false);
  const metrics=await request(superAdmin,'/analytics');assert.equal(metrics.metrics.find(item=>item.label==='Total Leads').value,records.length);
  const csv=await fetch(base+'/leads/export?format=csv',{headers:{Authorization:'Bearer '+tokens[String(superAdmin._id)]}});assert.equal(csv.status,200);const text=await csv.text();assert.ok(text.includes('Workflow Fixture'));assert.ok(text.includes('Settings Fixture'));
  const contract=await models.contracts.findOne({status:'Signed'});assert.ok(contract?.files.length);
  const file=await fetch(base+'/contracts/'+contract._id+'/files/'+contract.files[0].id,{headers:{Authorization:'Bearer '+tokens[String(superAdmin._id)]}});assert.equal(file.status,200);await file.arrayBuffer();
});

test('isolated MongoDB: personal email signatures and multiple attachments persist and reach the provider',async(t)=>{
  await request(bda,'/email-preferences','PATCH',{signature:'Test BDA\nSales Executive\nTrimurya',autoInclude:true});
  assert.equal((await request(bda,'/email-preferences')).signature,'Test BDA\nSales Executive\nTrimurya');
  assert.equal((await request(manager,'/email-preferences')).signature,'');
  assert.equal((await request(bda,'/metadata')).emailPreferences.autoInclude,true);
  await request(bda,'/email-preferences','PATCH',{signature:'x'.repeat(5001),autoInclude:true},400);
  await request(bda,'/email-preferences','PATCH',{signature:'Unsafe override',autoInclude:true,userId:String(manager._id)},400);
  const body='Hello client\n\n--\nTest BDA\nSales Executive\nTrimurya';
  let draft=await request(bda,'/emails','POST',{to:'attachments@fixture.test',subject:'Attachment delivery fixture',body},201);
  const upload=new FormData();upload.append('files',new Blob(['%PDF-1.4\nFirst fixture'],{type:'application/pdf'}),'first.pdf');upload.append('files',new Blob(['name,value\nfixture,1'],{type:'text/csv'}),'second.csv');
  draft=await request(bda,'/emails/'+draft._id+'/files','POST',upload,201);assert.equal(draft.files.length,2);
  let sentPayload;t.mock.method(nodemailer,'createTransport',()=>({sendMail:async payload=>{sentPayload=payload;return {messageId:'signature-attachments-test',accepted:['attachments@fixture.test'],rejected:[]};},close(){}}));
  await request(bda,'/emails/'+draft._id+'/actions/send','POST',{version:draft.version});assert.equal(sentPayload.text,body);assert.equal(sentPayload.attachments.length,2);assert.equal(sentPayload.attachments[0].filename,'first.pdf');assert.equal(sentPayload.attachments[1].filename,'second.csv');
  await request(other,'/emails/'+draft._id+'/files/'+draft.files[0].id,'GET',undefined,404);
  await request(bda,'/email-preferences','PATCH',{signature:'',autoInclude:false});assert.equal((await request(bda,'/email-preferences')).autoInclude,false);
});
