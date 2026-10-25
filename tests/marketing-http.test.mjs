import assert from 'node:assert/strict';
const origin='http://localhost:3000';
const pending=['/'],seen=new Set();
while(pending.length){const path=pending.shift();if(seen.has(path))continue;seen.add(path);const response=await fetch(origin+path);assert.equal(response.status,200,path);const html=await response.text();assert.match(html,/<title>[^<]+<\/title>/,`Missing title: ${path}`);assert.equal((html.match(/<h1[ >]/g)||[]).length,1,`Expected exactly one h1: ${path}`);for(const match of html.matchAll(/href="(\/[^"#]*)"/g)){const next=match[1].split('?')[0];if(next.startsWith('//')||next.startsWith('/_next')||next.startsWith('/api')||next.includes('.'))continue;if(!seen.has(next)&&!pending.includes(next))pending.push(next)}assert.ok(seen.size<150,'Unexpected route loop')}
for(const path of ['/features/not-a-feature','/solutions/not-a-solution','/blog/not-an-article']){const r=await fetch(origin+path);assert.equal(r.status,404,path)}
console.log(`PASS: ${seen.size} linked pages return 200, have titles and one h1; unknown content returns 404`);
