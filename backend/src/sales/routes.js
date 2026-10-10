import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';
import User from '../models/User.js';
import { Employee } from '../models/People.js';
import { Invoice } from '../models/Finance.js';
import { protect } from '../middleware/auth.js';
import { resources, actions, salesAccessModules } from './config.js';
import { models, SalesAudit } from './models.js';
import { salesIdentity, salesRateLimit, requirePermission, permissionsFor, scope, getRecord, fail, permitted, salesPagePermissions, requireSalesPage } from './security.js';
import { createRecord, updateRecord, deleteRecord, listFilter, populateQuery, transaction, escapeRegex } from './store.js';
import { act, deliverEmail } from './workflows.js';
import { analytics } from './analytics.js';
import { salesReport } from './reports.js';
import { spreadsheet, tablePdf, quotationPdf, parseImport, reportSpreadsheet } from './exports.js';
import { writeSalesAudit } from './validation.js';
import { getCommunicationConfig } from '../config/communications.js';
const router=express.Router();
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(error=>{
  if(error.name==='ValidationError' || error.name==='CastError' || error.name==='StrictModeError' || error.name==='SyntaxError')error.statusCode=400;
  if(error.name==='VersionError')error.statusCode=409;
  next(error);
});
const formUpload=multer({storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024,files:5}});
router.use(protect,salesRateLimit,salesIdentity);
router.use((req,res,next)=>{try{
  const page=req.get('X-Sales-Page');
  if(page && req.path!=='/metadata' && req.path!=='/email-preferences' && salesAccessModules.some(module=>module.page===page)){
    const action=req.path.includes('/export')?'export':req.method==='GET'?'view':req.method==='DELETE'?'delete':/\/actions\/(approve|approve-handover|verify-signature)$/.test(req.path)?'approve':['PUT','PATCH'].includes(req.method)||req.path.includes('/actions/')||req.path.endsWith('/bulk')||/\/files$/.test(req.path)?'edit':'create';
    requireSalesPage(req,page,'view');requireSalesPage(req,page,action);
  }next();
}catch(error){next(error);}});
router.get('/email-preferences',wrap(async(req,res)=>{requirePermission(req,'emails','view');res.json({signature:req.user.salesEmailPreferences?.signature || '',autoInclude:req.user.salesEmailPreferences?.autoInclude!==false});}));
router.patch('/email-preferences',wrap(async(req,res)=>{
  requirePermission(req,'emails','view');
  if(Object.keys(req.body).some(key=>!['signature','autoInclude'].includes(key)))fail('Unknown email preference');
  const {signature,autoInclude}=req.body;
  if(typeof signature!=='string'||signature.length>5000)fail('Signature must contain at most 5,000 characters');
  if(typeof autoInclude!=='boolean')fail('Automatic signature must be true or false');
  await transaction(async session=>{
    await User.updateOne({_id:req.user._id},{$set:{salesEmailPreferences:{signature,autoInclude}}},{session,runValidators:true});
    await SalesAudit.create([{actor:req.user._id,createdBy:req.user._id,resource:'emails',record:req.user._id,action:'update-email-signature',after:{signatureLength:signature.length,autoInclude},ip:req.ip}],{session});
  });res.json({signature,autoInclude});
}));
router.get('/metadata',wrap(async(req,res)=>{
  const permissions=Object.fromEntries(Object.keys(resources).map(key=>[key,permissionsFor(req.sales,key)]));
  const references={};
  for(const resource of ['companies','contacts','leads','deals']){
    references[resource]=permitted(req,resource,'view')?await models[resource].find(await scope(req,resource)).sort({name:1}).limit(1000).select('name recordId company stage status assignedTo').lean():[];
  }
  references.users=await User.find(req.sales.root?{isActive:true,role:{$in:['super_admin','admin','employee']}}:{_id:req.user._id}).select('name email linkedEmployee').sort({name:1}).limit(1000).lean();
  references.employees=await Employee.find(req.sales.root?{}:{_id:req.user.linkedEmployee || null}).select('name employeeId').sort({name:1}).limit(1000).lean();
  const email=await getCommunicationConfig();
  res.json({pages:Object.fromEntries(salesAccessModules.map(item=>[item.page,salesPagePermissions(req.sales,item.page)])),permissions,references,role:req.sales.role,allRecords:req.sales.allRecords,userId:req.sales.userId,userName:req.user.name,emailPreferences:{signature:req.user.salesEmailPreferences?.signature || '',autoInclude:req.user.salesEmailPreferences?.autoInclude!==false},emailConfigured:Boolean(email.email.enabled&&email.email.host&&email.email.from),settings:permitted(req,'settings','view')?await models.settings.findOne().select('-history').lean():null});
}));
router.get('/reports/export',wrap(async(req,res)=>{
  requireSalesPage(req,'reports','view');requireSalesPage(req,'reports','export');const data=await salesReport(req,true),format=String(req.query.format || 'xlsx');
  if(!['xlsx','csv','pdf'].includes(format))fail('Unsupported export format');
  const buffer=format==='pdf'?await tablePdf(data.title,data.fields,data.rows):await reportSpreadsheet(data.fields,data.rows,format);
  res.set('Content-Type',format==='pdf'?'application/pdf':format==='csv'?'text/csv':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.set('Content-Disposition','attachment; filename="sales-report.'+format+'"').send(Buffer.from(buffer));
}));
router.get('/reports',wrap(async(req,res)=>{requireSalesPage(req,'reports');const data=await salesReport(req);const page=Math.max(1,Number(req.query.page)||1),limit=Math.max(1,Math.min(100,Number(req.query.limit)||20));res.json({...data,rows:data.rows.slice((page-1)*limit,page*limit),total:data.rows.length,page,pages:Math.ceil(data.rows.length/limit)});}));
router.get('/analytics',wrap(async(req,res)=>{requireSalesPage(req,analyticsPage(req));res.json(await analytics(req));}));
router.get('/analytics/export',wrap(async(req,res)=>{
  requireSalesPage(req,analyticsPage(req),'view');requireSalesPage(req,analyticsPage(req),'export');
  requirePermission(req,'deals','export');
  const data=await analytics(req);
  const rows=[...data.metrics,...data.rates,...Object.entries(data.revenue).filter(([key,value])=>typeof value==='number').map(([key,value])=>({label:key,value}))].map(row=>({name:row.label,value:row.value,currency:row.money?data.currency:''}));
  const format=req.query.format || 'xlsx';
  const fields=[{key:'name',label:'Metric'},{key:'value',label:'Value'},{key:'currency',label:'Currency'}];
  let buffer;
  if(format==='pdf')buffer=await tablePdf('Sales Analytics',fields,rows);
  else {const {default:ExcelJS}=await import('exceljs');const book=new ExcelJS.Workbook();const sheet=book.addWorksheet('Analytics');sheet.columns=fields.map(f=>({header:f.label,key:f.key,width:35}));sheet.addRows(rows);buffer=format==='csv'?await book.csv.writeBuffer():await book.xlsx.writeBuffer();}
  res.set('Content-Type',format==='pdf'?'application/pdf':format==='csv'?'text/csv':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');res.set('Content-Disposition','attachment; filename="sales-analytics.'+format+'"');res.send(Buffer.from(buffer));
}));
router.get('/references/:resource',wrap(async(req,res)=>{
  const resource=req.params.resource;
  if(!['companies','contacts','leads','deals','users','employees'].includes(resource))fail('Unknown reference',404);
  const q=escapeRegex(req.query.q || '');
  if(resource==='users'){res.json({items:await User.find({$and:[req.sales.root?{isActive:true,role:{$in:['super_admin','admin','employee']}}:{_id:req.user._id},q?{name:{$regex:q,$options:'i'}}:{}]}).select('name email').limit(50).lean()});return;}
  if(resource==='employees'){res.json({items:await Employee.find({$and:[req.sales.root?{}:{_id:req.user.linkedEmployee || null},q?{name:{$regex:q,$options:'i'}}:{}]}).select('name employeeId').limit(50).lean()});return;}
  requirePermission(req,resource,'view');res.json({items:await models[resource].find({$and:[await scope(req,resource),{name:{$regex:q,$options:'i'}}]}).select('name recordId company').limit(50).lean()});
}));
router.post('/invoices',wrap(async(req,res)=>{
  requirePermission(req,'deals','approve');
  const {deal,invoiceNumber,amount,amountPaid=0,currency,invoiceDate,dueDate,paymentReference}=req.body;
  const won=await getRecord(req,'deals',deal);
  if(won.stage!=='Won')fail('Client billing requires a won deal');
  const value=Number(amount),paid=Number(amountPaid);
  if(!invoiceNumber || !Number.isFinite(value) || value<=0 || !Number.isFinite(paid)||paid<0||paid>value)fail('Invoice number and valid invoice/payment amounts are required');
  if(currency!==won.currency)fail('Invoice currency must match the deal');
  if(paid>0 && !paymentReference?.trim())fail('A verified payment reference is required for collected payments');
  const company=await getRecord(req,'companies',won.company);
  const created=await transaction(async session=>{
    const [invoice]=await Invoice.create([{invoiceNumber:String(invoiceNumber).trim().slice(0,100),direction:'Receivable',salesDeal:won._id,project:won.project,payeeName:company.name,amount:value,amountPaid:paid,currency,paymentReference:paymentReference || undefined,paymentStatus:paid===value?'Paid':paid>0?'Partial':'Pending',invoiceDate:invoiceDate || new Date(),dueDate:dueDate || undefined}],{session});
    await writeSalesAudit(req,'deals',won,'record-client-invoice',null,session);
    return invoice;
  });res.status(201).json(created);
}));
router.patch('/invoices/:id/payment',wrap(async(req,res)=>{
  requirePermission(req,'deals','approve');
  const invoice=await Invoice.findOne({_id:req.params.id,direction:'Receivable'});if(!invoice)fail('Invoice not found',404);
  const won=await getRecord(req,'deals',invoice.salesDeal);
  const amount=Number(req.body.amountPaid);
  if(!Number.isFinite(amount)||amount<Number(invoice.amountPaid || 0)||amount>invoice.amount||!req.body.paymentReference?.trim())fail('Provide a verified payment reference and a valid cumulative collected amount');
  await transaction(async session=>{
    const current=await Invoice.findById(invoice._id).session(session);if(Number(current.amountPaid || 0)!==Number(invoice.amountPaid || 0))fail('Invoice changed; reload before recording payment',409);
    current.amountPaid=amount;current.paymentReference=String(req.body.paymentReference).slice(0,500);current.paymentStatus=amount===current.amount?'Paid':'Partial';current.paymentDate=new Date();await current.save({session});await writeSalesAudit(req,'deals',won,'record-client-payment',{invoiceId:current._id,amountPaid:invoice.amountPaid},session);
  });res.json({message:'Verified client payment recorded'});
}));
router.get('/:resource/export',wrap(async(req,res)=>{
  const resource=req.params.resource;requirePermission(req,resource,'export');
  const items=await populateQuery(models[resource].find(await listFilter(req,resource)).sort({createdAt:-1}).limit(10001),resource).lean();
  if(items.length>10000)fail('Filter the export to at most 10,000 records');
  const format=req.query.format || 'xlsx';if(!['xlsx','csv','pdf'].includes(format))fail('Unsupported export format');
  const buffer=format==='pdf'?await tablePdf(resources[resource].title,resources[resource].fields,items):await spreadsheet(resource,items,format);
  res.set('Content-Type',format==='pdf'?'application/pdf':format==='csv'?'text/csv':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');res.set('Content-Disposition','attachment; filename="sales-'+resource+'.'+format+'"');
  await SalesAudit.create({actor:req.user._id,createdBy:req.user._id,resource,record:req.user._id,action:'export-'+format,assignedTo:req.user._id,after:{count:items.length},ip:req.ip});
  res.send(Buffer.from(buffer));
}));
router.post('/:resource/import',wrap(async(req,res,next)=>{requirePermission(req,req.params.resource,'create');if(!['leads','contacts','research'].includes(req.params.resource))fail('Import is supported for leads, contacts and research');next();}),formUpload.single('file'),wrap(async(req,res)=>{
  const rows=await parseImport(req.params.resource,req.file);
  const results=[];
  for(const {row,data} of rows)try{
    for(const field of resources[req.params.resource].fields.filter(field=>field.type==='reference')) {
      const value=data[field.key];
      if(!value || mongoose.isValidObjectId(value))continue;
      let matches;
      if(field.ref==='users')matches=await User.find({$and:[req.sales.root?{isActive:true}:{_id:req.user._id},{$or:[{name:{$regex:'^'+escapeRegex(value)+'$',$options:'i'}},{email:value.toLowerCase()}]}]}).limit(2);
      else if(field.ref==='employees')matches=await Employee.find({$and:[req.sales.root?{}:{_id:req.user.linkedEmployee || null},{$or:[{name:{$regex:'^'+escapeRegex(value)+'$',$options:'i'}},{employeeId:value}]}]}).limit(2);
      else {requirePermission(req,field.ref,'view');matches=await models[field.ref].find({$and:[await scope(req,field.ref),{$or:[{name:{$regex:'^'+escapeRegex(value)+'$',$options:'i'}},{recordId:value}]}]}).limit(2);}
      if(matches.length!==1)fail(field.label+' must match one accessible record; use its ID for ambiguous names');
      data[field.key]=String(matches[0]._id);
    }
    const item=await transaction(session=>createRecord(req,req.params.resource,data,session));results.push({row,id:item._id,status:'Created'});}catch(error){results.push({row,status:'Rejected',message:error.code===11000?'Duplicate record':error.message});}
  res.json({created:results.filter(row=>row.status==='Created').length,rejected:results.filter(row=>row.status==='Rejected').length,results});
}));
router.post('/:resource/bulk',wrap(async(req,res)=>{
  const resource=req.params.resource;requirePermission(req,resource,'edit');
  if(!Array.isArray(req.body.items)||!req.body.items.length||req.body.items.length>100)fail('Select 1 to 100 records');
  const items=await transaction(async session=>{
    const result=[];for(const item of req.body.items)result.push(await updateRecord(req,resource,item.id,{...req.body.changes,version:item.version},session));return result;
  });res.json({items});
}));
router.get('/:resource/:id/pdf',wrap(async(req,res)=>{
  const resource=req.params.resource;if(resource!=='proposals')fail('PDF preview is supported for proposals',404);
  const item=await getRecord(req,resource,req.params.id);await item.populate({path:'company',select:'name'});
  const buffer=await quotationPdf(item);res.set('Content-Type','application/pdf').set('Content-Disposition','inline; filename="'+item.recordId+'.pdf"').send(buffer);
}));
function privateBucket(){return new mongoose.mongo.GridFSBucket(mongoose.connection.db,{bucketName:'sales_private_files'});}
function verifyFile(file) {
  const ext=path.extname(file.originalname).toLowerCase(), bytes=file.buffer;
  const rules={
    '.pdf':()=>bytes.subarray(0,5).toString()==='%PDF-',
    '.png':()=>bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a',
    '.jpg':()=>bytes[0]===255&&bytes[1]===216,
    '.jpeg':()=>bytes[0]===255&&bytes[1]===216,
    '.docx':()=>bytes[0]===80&&bytes[1]===75,
    '.xlsx':()=>bytes[0]===80&&bytes[1]===75,
    '.doc':()=>bytes.subarray(0,4).toString('hex')==='d0cf11e0',
    '.csv':()=>!bytes.includes(0),
  };
  if(!rules[ext]?.())fail('Unsupported file content. Upload PDF, Office, CSV, PNG or JPEG documents.');
  return {name:path.basename(file.originalname).replace(/[^\p{L}\p{N}._ -]/gu,'_').slice(0,150),mimeType:ext==='.pdf'?'application/pdf':'application/octet-stream'};
}
router.post('/:resource/:id/files',wrap(async(req,res,next)=>{requirePermission(req,req.params.resource,'edit');await getRecord(req,req.params.resource,req.params.id);next();}),formUpload.array('files',5),wrap(async(req,res)=>{
  if(!req.files?.length)fail('Select files');
  const uploads=[];const bucket=privateBucket();
  try {
    for(const file of req.files){
      const verified=verifyFile(file);const stream=bucket.openUploadStream(crypto.randomUUID(),{metadata:{resource:req.params.resource,record:req.params.id}});
      await new Promise((resolve,reject)=>{stream.on('finish',resolve);stream.on('error',reject);stream.end(file.buffer);});
      uploads.push({id:stream.id,...verified,size:file.size,uploadedBy:req.user._id,uploadedAt:new Date()});
    }
    const item=await transaction(async session=>{
      const record=await getRecord(req,req.params.resource,req.params.id,session);const before=record.toObject();
      if(['Sent','Accepted','Signed','Approved'].includes(record.status))fail('Create a revised record before attaching documents to approved or finalized records');
      if(req.params.resource==='emails' && [...record.files,...uploads].reduce((total,file)=>total+file.size,0)>25*1024*1024)fail('Email attachments must total at most 25 MB');
      if(record.files.length+uploads.length>20)fail('At most 20 files are allowed per record');
      record.files.push(...uploads);record.version++;await record.save({session});await writeSalesAudit(req,req.params.resource,record,'upload-private-files',before,session);return record;
    });res.status(201).json(item);
  }catch(error){for(const file of uploads)await bucket.delete(file.id).catch(()=>{});throw error;}
}));
router.get('/:resource/:id/files/:fileId',wrap(async(req,res)=>{
  const item=await getRecord(req,req.params.resource,req.params.id);
  const file=item.files.find(file=>String(file.id)===req.params.fileId);if(!file)fail('File not found',404);
  res.set('Cache-Control','private, no-store');res.set('X-Content-Type-Options','nosniff');res.set('Content-Type',file.mimeType || 'application/octet-stream');res.set('Content-Disposition',"attachment; filename*=UTF-8''"+encodeURIComponent(file.name));
  const stream=privateBucket().openDownloadStream(file.id);stream.on('error',error=>res.headersSent?res.destroy(error):res.status(404).json({message:'Document is unavailable'}));stream.pipe(res);
}));
router.post('/:resource/:id/actions/:action',wrap(async(req,res)=>{
  const {resource,id,action}=req.params;
  if(action==='send' && ['emails','proposals'].includes(resource)){
    requirePermission(req,resource,'edit');const item=await getRecord(req,resource,id);
    if(item.version!==Number(req.body.version))fail('Record changed; reload before sending',409);
    if(resource==='emails' && !['Draft','Failed'].includes(item.status))fail('Only draft or failed emails can be sent');
    if(resource==='proposals' && (!item.recipient || item.status!=='Approved'))fail('Set a recipient and approve the proposal before sending');
    res.json({item:await deliverEmail(item._id,req.user._id,resource,item.version)});return;
  }
  res.json(await transaction(session=>act(req,resource,id,action,req.body,session)));
}));
router.get('/:resource/:id',wrap(async(req,res)=>{
  const {resource,id}=req.params;const item=await getRecord(req,resource,id);

  for(const field of resources[resource].fields)if(['reference','references'].includes(field.type))await item.populate({path:field.key,select:field.ref==='users'?'name email':'name recordId'});
  await item.populate({path:'createdBy',select:'name email'});
  const history=await SalesAudit.find({resource,record:item._id}).sort({createdAt:-1}).limit(100).populate('actor','name').select('-ip -before -after').lean();
  const related={};
  if(['companies','leads','deals'].includes(resource)){
    const relation={companies:'company',leads:'lead',deals:'deal'}[resource];
    for(const [child,config] of Object.entries(resources))if(config.fields.some(field=>field.key===relation)&&permitted(req,child,'view'))related[child]=await models[child].find({$and:[{[relation]:id},await scope(req,child)]}).sort({createdAt:-1}).limit(30).select('-body -bcc -history').lean();
  }
  res.json({item,history,related});
}));
router.get('/:resource',wrap(async(req,res)=>{
  const resource=req.params.resource;requirePermission(req,resource,'view');
  const page=Math.max(1,Math.min(10000,Number(req.query.page)||1)),limit=Math.max(1,Math.min(100,Number(req.query.limit)||20));
  const fields=['createdAt','updatedAt','recordId',...resources[resource].fields.map(field=>field.key)];
  const sort=fields.includes(req.query.sort)?req.query.sort:'createdAt',order=req.query.order==='asc'?1:-1;
  const filter=await listFilter(req,resource);
  const [items,total]=await Promise.all([populateQuery(models[resource].find(filter).sort({[sort]:order,_id:order}).skip((page-1)*limit).limit(limit).select('-history'),resource).lean(),models[resource].countDocuments(filter)]);
  res.json({items,total,page,pages:Math.ceil(total/limit),limit});
}));
router.post('/:resource',wrap(async(req,res)=>{const item=await transaction(session=>createRecord(req,req.params.resource,req.body,session));res.status(201).json(item);}));
router.put('/:resource/:id',wrap(async(req,res)=>res.json(await transaction(session=>updateRecord(req,req.params.resource,req.params.id,req.body,session)))));
router.delete('/:resource/:id',wrap(async(req,res)=>{await transaction(session=>deleteRecord(req,req.params.resource,req.params.id,req.query.version,session));res.json({message:'Record deleted'});}));
export default router;
function analyticsPage(req){const page=String(req.query.salesPage || 'analytics');if(!['dashboard','analytics','team-performance','revenue','reports','targets'].includes(page))fail('Invalid analytics page');return page;}
