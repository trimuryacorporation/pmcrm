export function localDateTime(value,timeZone) {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value));
  const p=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return p.year+'-'+p.month+'-'+p.day+'T'+p.hour+':'+p.minute;
}
export function zonedDateTime(value,timeZone) {
  const desired=new Date(value+'Z').getTime();if(!Number.isFinite(desired))throw new Error('Invalid date and time');
  let guess=desired;
  for(let i=0;i<3;i++){const shown=new Date(localDateTime(guess,timeZone)+'Z').getTime();const delta=shown-desired;if(delta===0)return new Date(guess).toISOString();guess-=delta;}
  if(localDateTime(guess,timeZone)!==value)throw new Error('This time does not exist in the selected time zone. Choose another time.');
  return new Date(guess).toISOString();
}