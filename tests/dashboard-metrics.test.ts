import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardRange, dayKey, inDashboardRange, dashboardMetrics } from '../src/lib/dashboard-metrics';
import { createLocalWorkspace } from '../src/lib/local-workspace';
const now=new Date('2026-11-04T07:00:00Z');
test('dashboard calendar periods use workspace timezone and Monday weeks',()=>{
 assert.equal(dayKey('2026-11-03T20:00:00Z','Asia/Kolkata'),'2026-11-04');
 assert.deepEqual(dashboardRange('this-week','Asia/Kolkata',now),{from:'2026-11-02',through:'2026-11-08'});
 assert.deepEqual(dashboardRange('last-week','Asia/Kolkata',now),{from:'2026-10-26',through:'2026-11-01'});
 assert.deepEqual(dashboardRange('last-month','Asia/Kolkata',now),{from:'2026-10-01',through:'2026-10-31'});
 assert.deepEqual(dashboardRange('last-year','Asia/Kolkata',now),{from:'2025-01-01',through:'2025-12-31'});
});
test('dashboard handles leap years, year rollover and DST calendar boundaries',()=>{
 assert.deepEqual(dashboardRange('last-month','UTC',new Date('2024-03-01T12:00Z')),{from:'2024-02-01',through:'2024-02-29'});
 assert.deepEqual(dashboardRange('last-month','UTC',new Date('2026-01-01T12:00Z')),{from:'2025-12-01',through:'2025-12-31'});
 const range=dashboardRange('today','America/New_York',new Date('2026-03-08T16:00:00Z'));
 assert.equal(inDashboardRange('2026-03-08T04:59:59Z',range,'America/New_York'),false);
 assert.equal(inDashboardRange('2026-03-09T03:59:59Z',range,'America/New_York'),true);
 assert.equal(inDashboardRange('2026-03-09T04:00:00Z',range,'America/New_York'),false);
});
test('custom dates reject invalid and reversed values and include the whole final day',()=>{
 for(const [from,end] of [['',''],['2026-02-30','2026-03-01'],['2026-11-05','2026-11-04']])assert.ok(dashboardRange('custom','UTC',now,from,end).error);
 const range=dashboardRange('custom','UTC',now,'2026-11-01','2026-11-03');
 assert.equal(inDashboardRange('2026-11-03T23:59:59.999Z',range,'UTC'),true);
 assert.equal(inDashboardRange('invalid',range,'UTC'),false);
});
test('dashboard aggregates persisted simulations without counting drafts, duplicates or future events',()=>{
 const s=createLocalWorkspace();s.settings.timezone='UTC';s.messages=[];s.calls=[];s.activities=[];s.transactions=[];
 const base={contactId:'a',channel:'WhatsApp' as const,body:'Hello',at:'2026-11-03T12:00:00Z'};
 s.messages.push({...base,id:'m1',direction:'outbound',kind:'Simulation'},{...base,id:'draft',direction:'outbound',kind:'Local draft'},{...base,id:'future',direction:'outbound',kind:'Simulation',at:'2027-01-01T00:00:00Z'});
 s.activities.push(...['r1','r2'].map(id=>({id,contactId:'a',campaignId:'',kind:'inbound_reply' as const,channel:'WhatsApp' as const,description:'Reply',at:'2026-11-03T13:00:00Z'})));
 s.transactions.push({id:'usage',kind:'Simulation usage',credits:-4,at:base.at,reference:'m1'},{id:'topup',kind:'Sample top-up',credits:100,at:base.at,reference:''});
 const m=dashboardMetrics(s,dashboardRange('all','UTC',now),now);
 assert.equal(m.contacted,1);assert.equal(m.replied,1);assert.equal(m.replyRate,100);assert.equal(m.usage,4);assert.equal(m.channelMetrics[0].outbound,1);assert.equal(m.days.reduce((n,d)=>n+d.credits,0),4);
 const historic=dashboardMetrics(s,dashboardRange('custom','UTC',now,'2026-10-01','2026-10-03'),now);
 assert.equal(historic.days.at(-1)?.key,'2026-10-03');assert.equal(historic.usage,0);
});
