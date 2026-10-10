import mongoose from 'mongoose';
import crypto from 'node:crypto';
import { resources } from './config.js';

const fileSchema = new mongoose.Schema({ id: {type:mongoose.Schema.Types.ObjectId,required:true}, name:String, mimeType:String, size:Number, uploadedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'}, uploadedAt:Date }, {_id:false});
const referenceModel = (resource) => ({users:'User',employees:'Employee',companies:'Sales_companies',contacts:'Sales_contacts',leads:'Sales_leads',deals:'Sales_deals'}[resource]);
export const models = {};
for (const [resource, config] of Object.entries(resources)) {
  const definition = {
    dedupeKey:{type:String,unique:true,sparse:true},
    recordId:{type:String,unique:true,default:()=>resource.toUpperCase().slice(0,4)+'-'+crypto.randomUUID()},
    assignedTo:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:!['permissions','settings'].includes(resource),index:true},
    createdBy:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,immutable:true},
    sharedWith:[{type:mongoose.Schema.Types.ObjectId,ref:'User'}],
    files:[fileSchema], version:{type:Number,default:1},
    convertedLead:{type:mongoose.Schema.Types.ObjectId,ref:'Sales_leads'},
    convertedDeal:{type:mongoose.Schema.Types.ObjectId,ref:'Sales_deals'},
    project:{type:mongoose.Schema.Types.ObjectId,ref:'Project',index:true},
    total:{type:Number,min:0}, subtotal:{type:Number,min:0}, completion:{type:Number,min:0,max:100},
    providerId:String, providerAcceptedAt:Date, failure:String, sentAt:Date,
    receivedAt:Date, sendingStartedAt:Date, closedAt:Date,
    signatureVerifiedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'},
    signatureVerifiedAt:Date, signatureFile:{type:mongoose.Schema.Types.ObjectId},
    history:[{at:Date,actor:{type:mongoose.Schema.Types.ObjectId,ref:'User'},version:Number,snapshot:mongoose.Schema.Types.Mixed}],
  };
  for (const field of config.fields) {
    const base = {required:field.required,default:undefined};
    if (field.type === 'reference') definition[field.key]={...base,type:mongoose.Schema.Types.ObjectId,ref:referenceModel(field.ref),index:!(['handovers','onboarding'].includes(resource)&&field.key==='deal')&&!(['permissions','team'].includes(resource)&&field.key==='user')};
    else if (field.type === 'references') definition[field.key]=[{type:mongoose.Schema.Types.ObjectId,ref:referenceModel(field.ref)}];
    else if (field.type === 'number') definition[field.key]={...base,type:Number,min:0,...(['score','probability','tax'].includes(field.key)?{max:100}:{})};
    else if (field.type === 'checkbox') definition[field.key]={type:Boolean,default:field.key==='duplicateDetection'};
    else if (['date','datetime-local'].includes(field.type)) definition[field.key]={...base,type:Date};
    else if (field.type === 'json') definition[field.key]={type:mongoose.Schema.Types.Mixed};
    else definition[field.key]={...base,type:String,trim:true,maxlength:['textarea'].includes(field.type)?20000:1000,...(field.type==='email'?{lowercase:true,match:/^[^\s@]+@[^\s@]+\.[^\s@]+$/}:{})};
  }
  if (resource === 'settings') definition.singletonKey={type:String,default:'global',unique:true};
  if (resource === 'permissions') definition.grants={type:Map,of:new mongoose.Schema(Object.fromEntries(['view','create','edit','delete','export','assign','approve'].map(key=>[key,{type:Boolean,default:false}])),{_id:false})};
  const schema = new mongoose.Schema(definition,{timestamps:true,strict:'throw',optimisticConcurrency:true,collection:config.collection});
  schema.index({createdBy:1,createdAt:-1});
  schema.index({assignedTo:1,createdAt:-1});
  if (definition.company) schema.index({company:1,createdAt:-1});

  if (definition.status) schema.index({status:1,assignedTo:1});
  if (definition.stage) schema.index({stage:1,assignedTo:1});
  if (definition.dueDate) schema.index({dueDate:1,status:1});
  if (definition.expiryDate) schema.index({expiryDate:1,status:1});
  if (resource==='permissions' || resource==='team') schema.index({user:1},{unique:true});
  if (resource==='emails') schema.index({status:1,scheduledAt:1});
  if (resource==='handovers' || resource==='onboarding') schema.index({deal:1},{unique:true});
  if (['leads','companies','research'].includes(resource)) schema.index({name:1,website:1});
  models[resource]=mongoose.models['Sales_'+resource] || mongoose.model('Sales_'+resource,schema);
}
const auditSchema = new mongoose.Schema({
  createdBy:{type:mongoose.Schema.Types.ObjectId,ref:'User',index:true},
  actor:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
  resource:{type:String,required:true},record:{type:mongoose.Schema.Types.ObjectId,required:true},
  action:{type:String,required:true},company:{type:mongoose.Schema.Types.ObjectId,ref:'Sales_companies'},
  lead:{type:mongoose.Schema.Types.ObjectId,ref:'Sales_leads'},deal:{type:mongoose.Schema.Types.ObjectId,ref:'Sales_deals'},
  assignedTo:{type:mongoose.Schema.Types.ObjectId,ref:'User'}, sharedWith:[{type:mongoose.Schema.Types.ObjectId,ref:'User'}],
  before:mongoose.Schema.Types.Mixed,after:mongoose.Schema.Types.Mixed,ip:String,
},{timestamps:true,collection:'sales_audit_logs'});
auditSchema.index({record:1,createdAt:-1});
auditSchema.index({assignedTo:1,createdAt:-1});
export const SalesAudit = mongoose.models.SalesAudit || mongoose.model('SalesAudit',auditSchema);