import Notification from '../models/Notification.js';
import { models } from './models.js';
import { settingsFor } from './validation.js';
export async function publishSalesReminders() {
  const settings=await settingsFor();
  const now=new Date(),day=now.toISOString().slice(0,10),preferences=settings?.notificationPreferences || {};
  const notify=async(resource,item,title,message)=>{
    if(!item.createdBy)return;
    const key=resource+':'+item._id+':'+item.createdBy+':'+day;
    await Notification.updateOne({salesKey:key},{$setOnInsert:{salesKey:key,user:item.createdBy,title,message,type:'Deadline',link:'/sales/'+(resource==='followups'?'follow-ups':'contracts')+'?record='+item._id}},{upsert:true});
  };
  if(preferences.followups!==false){
    const due=await models.followups.find({status:'Pending',dueDate:{$lt:now}}).sort({dueDate:1}).limit(500);
    for(const item of due)await notify('followups',item,'Overdue Sales Follow-up',item.name+' was due '+item.dueDate.toISOString());
  }
  if(preferences.contractExpiry!==false){
    const until=new Date(now.getTime()+Number(settings?.followupRules?.contractReminderDays ?? 30)*86400000);
    const expiring=await models.contracts.find({status:{$nin:['Rejected','Expired']},expiryDate:{$gte:now,$lte:until}}).sort({expiryDate:1}).limit(500);
    for(const item of expiring)await notify('contracts',item,'Sales Contract Expiry',item.name+' expires '+item.expiryDate.toISOString().slice(0,10));
  }
}