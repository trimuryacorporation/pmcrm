import { analytics } from './analytics.js';
import { resources } from './config.js';
import { models } from './models.js';
import { listFilter,populateQuery } from './store.js';
import { requirePermission,fail } from './security.js';
export const reportResources={daily:'activities',weekly:'deals',monthly:'deals',sources:'leads',followups:'followups',conversion:'leads',deals:'deals',revenue:'deals',employees:'leads'};
export async function salesReport(req,exporting=false) {
  const kind=String(req.query.type || 'daily'),resource=reportResources[kind];
  if(!resource)fail('Unknown Sales report');
  requirePermission(req,resource,exporting?'export':'view');
  if(['weekly','monthly','employees','revenue','conversion','sources'].includes(kind)) {
    const data=await analytics(req);
    if(['weekly','monthly','employees'].includes(kind)) {
      const User=(await import('../models/User.js')).default;
      const names=await User.find({_id:{$in:data.team.map(row=>row.user)}}).select('name').lean();
      return {title:kind==='employees'?'Employee Performance Report':kind==='weekly'?'Weekly Sales Report':'Monthly Sales Report',resource,fields:[{key:'employee',label:'Employee'},...['leadsAssigned','leadsContacted','qualifiedLeads','emailsSent','callsLogged','meetingsCompleted','proposalsSent','dealsWon','revenueGenerated','conversionRate'].map(key=>({key,label:key.replace(/[A-Z]/g,letter=>' '+letter.toLowerCase())})),{key:'currency',label:'Currency'}],rows:data.team.map(row=>({...row,employee:names.find(user=>String(user._id)===row.user)?.name || row.user,currency:data.currency}))};
    }
    if(kind==='revenue')return {title:'Revenue Report',resource,fields:[{key:'name',label:'Revenue Measure'},{key:'value',label:'Amount'},{key:'currency',label:'Currency'}],rows:Object.entries(data.revenue).filter(([,value])=>typeof value==='number').map(([key,value])=>({name:key,value,currency:data.currency}))};
    if(kind==='conversion')return {title:'Conversion Report',resource,fields:[{key:'name',label:'Measure'},{key:'value',label:'Value'},{key:'unit',label:'Unit'}],rows:data.rates.map(row=>({name:row.label,value:row.value,unit:row.unit || (row.money?data.currency:'')}))};
    if(kind==='sources')return {title:'Lead Source Report',resource,fields:[{key:'name',label:'Lead Source'},{key:'value',label:'Leads'}],rows:data.charts.sources};
  }
  const rows=await populateQuery(models[resource].find(await listFilter(req,resource)).sort({createdAt:-1}).limit(10001),resource).lean();
  if(rows.length>10000)fail('Narrow the report filters to at most 10,000 records');
  return {title:{daily:'Daily BDA Activity Report',followups:'Follow-up Report',deals:'Deal Report'}[kind],resource,fields:[{key:'recordId',label:'Record ID'},...resources[resource].fields,{key:'createdAt',label:'Created Date'}],rows};
}