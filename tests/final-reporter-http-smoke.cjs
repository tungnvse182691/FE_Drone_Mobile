// GET-only resource probes. Login is the sole POST, using an existing handoff fixture if present.
// No registration, OTP, report, upload or shared-fixture mutation. Never print credentials/IDs/bodies.
const assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),{randomUUID}=require('node:crypto');
const base='http://127.0.0.1:18081/api/v1';
(async()=>{
 const report=randomUUID(),evidence=randomUUID(),publication=randomUUID();
 const paths=[['210',`/reporter-evidence/publications/${publication}/reports/${report}/evidence/${evidence}/content`],['215','/reports'],['217',`/reports/${report}`],['218',`/reports/${report}/evidence/${evidence}/download`]];
 for(const [id,path] of paths){assert.equal((await fetch(base+path)).status,401);console.log(`API${id} anonymous:401`);}
 const accounts=JSON.parse(execFileSync('docker',['exec','roadguard-fe-starter01-api-1','cat','/handoff/demo-accounts.json'],{encoding:'utf8'}));
 const fixture=accounts.find(a=>typeof a.key==='string'&&/^reporter(?:-|$)/i.test(a.key));
 if(!fixture){console.log('Reporter positive reads: BE_FIXTURE_BLOCKED (no existing Reporter handoff fixture; no account created)');return;}
 const login=await fetch(base+'/auth/android/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:fixture.email,password:fixture.password})});assert.equal(login.status,200);
 const pair=await login.json(),headers={Authorization:'Bearer '+pair.accessToken};
 for(const [id,path] of paths){const response=await fetch(base+path,{headers});if(id==='215'){assert.equal(response.status,200);assert.ok(Array.isArray((await response.json()).items));console.log('API215 authorized list:200 (positive evidence/private bytes NOT_RUN)');}else {assert.equal(response.status,404);console.log(`API${id} authorized absent resource:404 (positive NOT_RUN)`);}}
 console.log('Reporter OTP/upload/report/supplement mutations and Android:NOT_RUN');
})().catch(()=>{console.error('Reporter GET smoke FAILED; sensitive details suppressed');process.exitCode=1;});
