import { channels, type LocalWorkspace } from './local-workspace';
export const dashboardPeriods = [
 ['all','All'], ['today','Today'], ['yesterday','Yesterday'], ['this-week','This Week'],
 ['last-week','Last Week'], ['this-month','This Month'], ['last-month','Last Month'],
 ['this-year','This Year'], ['last-year','Last Year'], ['custom','Custom'],
] as const;
export type DashboardPeriod = typeof dashboardPeriods[number][0];
export type DateRange = { from: string; through: string; error?: string };
export function dayKey(at: string | Date, timezone: string): string {
 const value = at instanceof Date ? at : new Date(at);
 if (!Number.isFinite(value.getTime())) return '';
 const parts = new Intl.DateTimeFormat('en-US', {timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(value);
 const get = (type:string) => parts.find(p => p.type===type)?.value;
 return `${get('year')}-${get('month')}-${get('day')}`;
}
function shift(key:string, amount:number) { const d=new Date(`${key}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+amount);return d.toISOString().slice(0,10); }
function validDay(key:string) { return /^\d{4}-\d{2}-\d{2}$/.test(key) && Number.isFinite(Date.parse(key)) && new Date(key).toISOString().slice(0,10)===key; }
export function dashboardRange(period:DashboardPeriod, timezone:string, now=new Date(), from='', through=''):DateRange {
 const today=dayKey(now,timezone), year=Number(today.slice(0,4));
 const monthStart=today.slice(0,7)+'-01';
 const weekday=(new Date(`${today}T12:00:00Z`).getUTCDay()+6)%7;
 const weekStart=shift(today,-weekday);
 switch(period) {
  case 'all': return {from:'',through:''};
  case 'today': return {from:today,through:today};
  case 'yesterday': return {from:shift(today,-1),through:shift(today,-1)};
  case 'this-week': return {from:weekStart,through:shift(weekStart,6)};
  case 'last-week': return {from:shift(weekStart,-7),through:shift(weekStart,-1)};
  case 'this-month': return {from:monthStart,through:shift(new Date(Date.UTC(year,Number(today.slice(5,7)),1)).toISOString().slice(0,10),-1)};
  case 'last-month': {const last=shift(monthStart,-1);return {from:last.slice(0,7)+'-01',through:last};}
  case 'this-year': return {from:`${year}-01-01`,through:`${year}-12-31`};
  case 'last-year': return {from:`${year-1}-01-01`,through:`${year-1}-12-31`};
  case 'custom': return {from,through,...(!validDay(from)||!validDay(through)?{error:'Choose valid start and end dates.'}:from>through?{error:'End date must be on or after start date.'}:{})};
 }
}
export function inDashboardRange(at:string, range:DateRange, timezone:string) {
 if(range.error) return false;
 const key=dayKey(at,timezone);
 return !!key && (!range.from||key>=range.from) && (!range.through||key<=range.through);
}
export function dashboardMetrics(s:LocalWorkspace, range:DateRange, now=new Date()) {
 const timezone=s.settings.timezone;
 const included=(at:string)=>inDashboardRange(at,range,timezone) && Date.parse(at)<=now.getTime();
 const messages=s.messages.filter(m=>included(m.at)&&m.kind==='Simulation');
 const calls=s.calls.filter(c=>included(c.at));
 const activity=s.activities.filter(a=>included(a.at)).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
 const contacted=new Set([...messages.filter(m=>m.direction==='outbound').map(m=>m.contactId),...calls.map(c=>c.contactId)]);
 const replied=new Set(activity.filter(a=>a.kind==='inbound_reply'&&contacted.has(a.contactId)).map(a=>a.contactId));
 const transactions=s.transactions.filter(t=>t.kind==='Simulation usage'&&included(t.at));
 const usage=transactions.reduce((n,t)=>n+Math.max(0,-t.credits),0);
 const today=dayKey(now,timezone);
 const chartEnd=range.through&&range.through<today?range.through:today;
 const days=Array.from({length:7},(_,i)=>{const key=shift(chartEnd,i-6);return {key,credits:transactions.filter(t=>dayKey(t.at,timezone)===key).reduce((n,t)=>n+Math.max(0,-t.credits),0)};});
 return {activity,usage,days,contacted:contacted.size,replied:replied.size,replyRate:contacted.size?replied.size/contacted.size*100:0,
  channelMetrics:channels.map(channel=>({channel,outbound:channel==='AI calling'?calls.length:messages.filter(m=>m.channel===channel&&m.direction==='outbound').length,
   replies:new Set(activity.filter(a=>a.channel===channel&&a.kind==='inbound_reply').map(a=>a.contactId)).size,
   qualified:channel==='AI calling'?calls.filter(c=>c.outcome==='Qualified').length:undefined,
   duration:channel==='AI calling'?calls.reduce((n,c)=>n+c.duration,0):undefined,
  }))};
}
