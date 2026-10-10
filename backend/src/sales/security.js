import mongoose from 'mongoose';
import User from '../models/User.js';
import { models } from './models.js';
import { actions, resources, salesAccessModules, salesAccessActions, salesResourceAccessKey } from './config.js';
export function fail(message,status=400) {const error=new Error(message);error.statusCode=status;throw error;}
export function validId(id) {if(!mongoose.isValidObjectId(id)) fail('Invalid record ID');return id;}
export function rolePermissions(role) {
  if (['Sales Head','Sales Manager'].includes(role)) return Object.fromEntries(actions.map(a=>[a,a!=='assign']));
  if (role==='Read-only Auditor') return {view:true,export:true};
  return {view:true,create:true,edit:true,export:true};
}
export async function salesIdentity(req,res,next) {
  try {
    if(req.user.isApiKey){
      const key=req.user,owner=await User.findById(key._id).select('-password');
      if(!owner || !owner.isActive)fail('API key owner is not authorized',403);
      const rank=['employee','admin','super_admin'];
      const role=rank[Math.min(rank.indexOf(owner.role),rank.indexOf(key.role))];
      req.user={...owner.toObject(),role,isApiKey:true,apiKeyId:key.apiKeyId};
    }
    if (!['super_admin','admin','employee'].includes(req.user.role)) fail('Sales access denied',403);
    const permission = await models.permissions.findOne({user:req.user._id}).lean();
    const member=await models.team.findOne({user:req.user._id}).lean();
    if(member?.status==='Inactive' && req.user.role!=='super_admin') fail('Sales account is inactive',403);
    const root=['super_admin','admin'].includes(req.user.role);
    const grants=permission?.grants || {};
    req.sales={role:root?'Sales Head':permission?.salesRole || 'BDA',root,allRecords:req.user.role==='super_admin',grants, userId:String(req.user._id),superAdmin:req.user.role==='super_admin',accessPermissions:req.user.accessPermissions};
    if(!salesPagePermissions(req.sales,'dashboard').sectionView)fail('Sales access denied',403);
    next();
  } catch(error){next(error);}
}
function basePermissions(identity,resource) {
  if(identity.root) return Object.fromEntries(actions.map(a=>[a,a!=='assign']));
  if(['permissions','settings'].includes(resource)) return {view:resource==='settings'};
  const defaults=rolePermissions(identity.role);
  const explicit=identity.grants instanceof Map ? identity.grants.get(resource):identity.grants?.[resource];
  if(['pricing','team','targets'].includes(resource) && !['Sales Head','Sales Manager'].includes(identity.role)) return {...defaults,create:false,edit:false,delete:false,approve:false,...explicit,assign:false};
  return {...defaults,...explicit,assign:false};
}
export function permitted(req,resource,action) {return Boolean(permissionsFor(req.sales,resource)[action]);}
export function requirePermission(req,resource,action) {if(!Object.hasOwn(resources,resource))fail('Unknown Sales module',404);if(resource==='pricing' && !['view','export'].includes(action) && !req.sales.root && !['Sales Head','Sales Manager'].includes(req.sales.role))fail('Official pricing changes require a Sales manager',403);if(!permitted(req,resource,action))fail('You do not have '+action+' access for this module',403);}
export function scopeFor(identity) {return identity.superAdmin?{}:{createdBy:identity.userId};}
export async function scope(req,resource) {
  if(resource==='settings')return {};
  if(resource==='permissions')return req.sales.root?{}:{user:req.sales.userId};
  return scopeFor(req.sales);
}
export async function getRecord(req,resource,id,session) {
  requirePermission(req,resource,'view');validId(id);
  const item=await models[resource].findOne({$and:[{_id:id},await scope(req,resource)]}).session(session || null);
  if(!item)fail('Record not found or access denied',404);
  return item;
}
const windows = new Map();
setInterval(()=>{const now=Date.now();for(const [key,value] of windows)if(value.until<now)windows.delete(key);},60000).unref();
export function salesRateLimit(req,res,next) {
  const key=String(req.user._id);
  const now=Date.now();
  let value=windows.get(key);
  if(!value || value.until<=now){value={count:0,until:now+60000};windows.set(key,value);}
  if(++value.count>Number(process.env.SALES_RATE_LIMIT || 180)){res.set('Retry-After','60');return res.status(429).json({message:'Too many Sales requests. Try again shortly.'});}
  next();
}
const accessEntry=(identity,key)=>identity.accessPermissions?.get?identity.accessPermissions.get(key):identity.accessPermissions?.[key];
function applyAccess(identity,key,defaults) {
  if(identity.superAdmin)return defaults;
  const section=accessEntry(identity,'sales'),entry=accessEntry(identity,key);
  return Object.fromEntries(salesAccessActions.map(action=>[action,Boolean((entry?.[action] ?? defaults[action]) && section?.view!==false && section?.[action]!==false)]));
}
export function permissionsFor(identity,resource) {
  const defaults=basePermissions(identity,resource),permission=applyAccess(identity,salesResourceAccessKey(resource),defaults);
  if(['permissions','settings'].includes(resource)&&!identity.root)for(const action of salesAccessActions)permission[action]=Boolean(permission[action]&&defaults[action]);
  return {...permission,assign:false};
}
export function salesPagePermissions(identity,page) {
  const module=salesAccessModules.find(item=>item.page===page),sectionView=identity.superAdmin || accessEntry(identity,'sales')?.view!==false;
  if(!module)return {view:false,sectionView};
  const computed=['dashboard','analytics','team-performance','revenue','reports'].includes(page);
  const defaults=computed?basePermissions(identity,'leads'):permissionsFor(identity,module.resource),permissions=applyAccess(identity,module.key,defaults);
  return {...permissions,view:Boolean(permissions.view && defaults.view),sectionView};
}
export function requireSalesPage(req,page,action='view') {if(!salesPagePermissions(req.sales,page)[action])fail('You do not have '+action+' access for this Sales page',403);}
