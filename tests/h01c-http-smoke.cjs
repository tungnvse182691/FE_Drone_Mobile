// Read-only operations; credentials remain in memory, never printed or persisted.
const assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),{randomUUID}=require('node:crypto');
const base='http://127.0.0.1:18081/api/v1';
(async()=>{
 assert.equal((await fetch('http://127.0.0.1:18081/ready')).status,200);console.log('/ready: 200');
 for(const path of ['/me/survey-tasks','/survey-tasks/'+randomUUID(),'/uploads/'+randomUUID()])assert.equal((await fetch(base+path)).status,401);
 console.log('API038/226/234 anonymous: 401');
 const fixtures=JSON.parse(execFileSync('docker',['exec','roadguard-fe-starter01-api-1','cat','/handoff/demo-accounts.json'],{encoding:'utf8'})).filter(f=>/^operator-[ab]$/.test(f.key));assert.equal(fixtures.length,2);
 let sample=null,details=0;
 for(const fixture of fixtures){
  const auth=await fetch(base+'/auth/android/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:fixture.email,password:fixture.password})});assert.equal(auth.status,200);const pair=await auth.json();
  const headers={Authorization:'Bearer '+pair.accessToken};let cursor=null,pages=0;
  do{const response=await fetch(base+'/me/survey-tasks?limit=1'+(cursor?'&cursor='+encodeURIComponent(cursor):''),{headers});assert.equal(response.status,200);const page=await response.json();
   for(const task of page.items){const detailResponse=await fetch(base+'/survey-tasks/'+task.id,{headers});assert.equal(detailResponse.status,200);const detail=await detailResponse.json();assert.equal(detail.id,task.id);assert.equal(detail.operatorId,pair.user.id);assert.equal(detail.projectId,task.projectId);assert.equal(detailResponse.headers.get('etag'),'"'+detail.version+'"');if(!sample)sample={id:task.id,owner:pair.user.id};details++;}
   cursor=page.nextCursor;assert.ok(++pages<100);
  }while(cursor);console.log('API038 authorized: 200; pages='+pages);
  if(sample&&sample.owner!==pair.user.id){const denied=await fetch(base+'/survey-tasks/'+sample.id,{headers});assert.ok([403,404].includes(denied.status));console.log('API226 wrong-operator: '+denied.status);}
 }
 console.log('API226 positive: '+(details?'HTTP_VERIFIED; details='+details:'BE_FIXTURE_BLOCKED (no assigned task)'));
 console.log('API234 positive: NOT RUN (no verified existing upload-session fixture; no upload mutation)');
 console.log('No ACK, dataset/upload mutation or offline batch sent. ANDROID E2E: NOT RUN');
})().catch(e=>{console.error('HTTP smoke failed: '+e.name);process.exitCode=1;});
