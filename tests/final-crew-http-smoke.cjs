// Read-only resource smoke: private credentials remain in memory, login is the only POST.
const {execFileSync}=require('node:child_process'),assert=require('node:assert/strict'),{randomUUID:id}=require('node:crypto');
const root=process.env.ROADFE_HTTP_BASE??'http://127.0.0.1:18081',base=root+'/api/v1';
async function main(){
 assert.equal((await fetch(root+'/ready')).status,200);console.log('/ready 200');
 const fixtures=JSON.parse(execFileSync('docker',['exec','roadguard-fe-starter01-api-1','cat','/handoff/demo-accounts.json'],{encoding:'utf8'})).filter(x=>['crew-a','crew-b'].includes(x.key));
 assert.equal(fixtures.length,2);const observations=[];
 for(const f of fixtures){
  const login=await fetch(base+'/auth/android/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:f.email,password:f.password})});assert.equal(login.status,200);
  const session=await login.json(),headers={Authorization:'Bearer '+session.accessToken};
  const list=await fetch(base+'/me/inspection-tasks?limit=50',{headers});assert.equal(list.status,200);const page=await list.json();assert.ok(Array.isArray(page.items));console.log('API037 200; items='+page.items.length);
  for(const t of page.items){
   const path=`/projects/${t.projectId}/field-inspection-tasks/${t.id}`,detail=await fetch(base+path,{headers});assert.equal(detail.status,200);const task=await detail.json();assert.equal(task.assignedToUserId,session.user.id);assert.equal(detail.headers.get('etag'),`"${task.version}"`);
   console.log('API080 200; own actor and ETag match; repairContext='+Boolean(task.repairContext));
   const history=await fetch(base+path+'/history',{headers});assert.equal(history.status,200);const facts=await history.json();assert.ok(Array.isArray(facts.events));assert.ok(Array.isArray(facts.assignments));console.log('API088 200; assignments='+facts.assignments.length+'; events='+facts.events.length);
   const geometry=await fetch(base+path+'/geometry',{headers});assert.ok([200,409].includes(geometry.status));if(geometry.status===409){const problem=await geometry.json();assert.equal(problem.code,'source_not_ready');console.log('API087 409 source_not_ready; positive BE_FIXTURE_BLOCKED');}else console.log('API087 200; source-backed fixture read (native NOT_RUN)');
   assert.equal((await fetch(base+path+'/history')).status,401);assert.equal((await fetch(base+path+'/geometry')).status,401);console.log('API087/088 anonymous401');
   observations.push({path,headers});
  }
 }
 if(observations.length>1){const denial=await fetch(base+observations[0].path,{headers:observations.at(-1).headers});assert.ok([403,404].includes(denial.status));console.log('API080 wrong-owner '+denial.status);}
 const path=`/projects/${id()}/offline`;for(const kind of ['batches','devices','origins','snapshots'])assert.equal((await fetch(base+path+'/'+kind+'/'+id())).status,401);
 console.log('API115/117/123/128 anonymous401; positive fixture NOT_RUN');console.log('Repair/offline/safety/receiving mutation: NOT_RUN; shared fixture not authorized');console.log('Android E2E: NOT_RUN');
}
main().catch(()=>{console.error('Read-only Crew smoke FAILED (details suppressed to protect auth/private data)');process.exitCode=1;});
