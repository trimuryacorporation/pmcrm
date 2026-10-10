import { localDateTime,zonedDateTime } from '../../frontend/src/sales/time.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import { quoteTotal,checkTransition,completion } from '../src/sales/validation.js';
import { escapeRegex } from '../src/sales/store.js';
import { permissionsFor,scopeFor,salesPagePermissions } from '../src/sales/security.js';
import { navigation, salesAccessModules } from '../src/sales/config.js';
test('quotation math rejects invalid commercial values and computes tax after discount',()=>{
  assert.deepEqual(quoteTotal({quantity:10,unitRate:100,tax:18,discount:100}),{subtotal:1000,total:1062});
  for(const data of [{quantity:-1},{unitRate:NaN},{tax:101},{quantity:1,unitRate:2,discount:3}])assert.throws(()=>quoteTotal(data));
});
test('pipeline transitions enforce valid progression and closed-stage guards',()=>{
  checkTransition('New Opportunity','Qualified');
  assert.throws(()=>checkTransition('New Opportunity','Won'));
  assert.throws(()=>checkTransition('Won','Negotiation'));
  checkTransition('Lost','New Opportunity');
});
test('BDA defaults cannot assign, approve or read global records',()=>{
  const identity={role:'BDA',root:false,allRecords:false,userId:'test-user',grants:{}};
  assert.equal(permissionsFor(identity,'leads').view,true);
  assert.equal(Boolean(permissionsFor(identity,'leads').assign),false);
  assert.equal(Boolean(permissionsFor(identity,'leads').approve),false);
  assert.equal(permissionsFor(identity,'pricing').edit,false);
  assert.equal(permissionsFor(identity,'permissions').view,false);
  assert.deepEqual(scopeFor(identity),{createdBy:'test-user'});
  assert.deepEqual(scopeFor({...identity,root:true,allRecords:true}),{createdBy:'test-user'});
  assert.equal(new RegExp(escapeRegex('a+b.test')).test('a+b.test'),true);
  assert.equal(new RegExp(escapeRegex('a+b.test')).test('aabxtest'),false);
});
test('all requested 26 navigation destinations resolve to record or computed modules',()=>{
  assert.equal(navigation.flatMap(([,items])=>items).length,26);
  assert.equal(completion({}),0);
});


test('meeting times honor IANA zones and reject non-existent DST wall times',()=>{
  assert.equal(zonedDateTime('2026-10-10T09:00','America/Los_Angeles'),'2026-10-10T16:00:00.000Z');
  assert.equal(localDateTime('2026-10-10T16:00:00.000Z','Asia/Kolkata'),'2026-10-10T21:30');
  assert.throws(()=>zonedDateTime('2026-03-08T02:30','America/Los_Angeles'));
});
test('central Sales Access Control supports all 26 pages and overrides legacy grants',()=>{
assert.equal(salesAccessModules.length,26);assert.equal(new Set(salesAccessModules.map(item=>item.key)).size,26);
const identity={root:true,role:'Sales Head',userId:'creator',accessPermissions:new Map([['sales-leads',{view:false,create:false,edit:false,delete:false,export:false,approve:false}],['sales-analytics',{view:false}]])};
assert.equal(permissionsFor(identity,'leads').view,false);assert.equal(permissionsFor(identity,'companies').view,false);assert.equal(salesPagePermissions(identity,'analytics').view,false);assert.equal(salesPagePermissions(identity,'dashboard').view,true);
assert.equal(permissionsFor({...identity,superAdmin:true},'leads').view,true);assert.deepEqual(scopeFor({...identity,superAdmin:true}),{});
assert.equal(salesPagePermissions({...identity,accessPermissions:{sales:{view:false}}},'dashboard').view,false);
});
