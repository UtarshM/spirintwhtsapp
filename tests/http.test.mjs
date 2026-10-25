import assert from 'node:assert/strict';
const origin='http://localhost:3000';
const scenarios=[['/api/health',{},200],['/api/contacts',{},503],['/api/billing',{method:'POST',headers:{origin:'https://wrong.example','content-type':'application/json'},body:'{}'},403],['/api/webhooks/razorpay',{method:'POST',body:'{}'},401],['/api/webhooks/meta',{method:'POST',body:'{}'},401]];
for(const [path,options,expected] of scenarios){const r=await fetch(origin+path,options);assert.equal(r.status,expected,path);console.log(`PASS ${path}: ${expected}`)}
