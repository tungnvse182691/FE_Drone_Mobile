// Read-only Candidate3 smoke. Credentials are read in memory from local handoff; never printed or persisted.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const {execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto'),cache=new Map();
function load(relative){relative=relative.replace(/\\/g,'/');if(cache.has(relative))return cache.get(relative).exports;
 const module={exports:{}};cache.set(relative,module);
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',relative),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,{module,exports:module.exports,process,setTimeout,require:n=>{
  if(n==='react-native')return {Platform:{select:o=>o.web}};if(n==='expo-crypto')return {randomUUID};
  if(n.startsWith('.'))return load(path.relative(path.join(__dirname,'..'),path.resolve(path.dirname(path.join(__dirname,'..',relative)),n))+'.ts');return require(n);
 }});return module.exports;
}
(async()=>{
 const ready=await fetch('http://127.0.0.1:18081/ready');assert.equal(ready.status,200);console.log('/ready: 200');
 const client=load('src/api/client.ts'),crew=load('src/api/crewApi.ts');let pair=null;
 client.apiClient.defaults.baseURL='http://127.0.0.1:18081/api/v1';client.bareClient.defaults.baseURL=client.apiClient.defaults.baseURL;
 client.configureAuthBridge({getAccessToken:()=>pair?.accessToken??null,getRefreshToken:()=>pair?.refreshToken??null,onTokenPair:p=>pair=p,onSessionEnded:()=>pair=null});
 const anonymous=await fetch(client.apiClient.defaults.baseURL+'/me/inspection-tasks');assert.equal(anonymous.status,401);console.log('API037 anonymous: 401');
 const fixtures=JSON.parse(execFileSync('docker',['exec','roadguard-fe-starter01-api-1','cat','/handoff/demo-accounts.json'],{encoding:'utf8'})).filter(a=>a.key==='crew-a'||a.key==='crew-b');assert.equal(fixtures.length,2);
 const saved=[];
 for(let i=0;i<fixtures.length;i++){
  const f=fixtures[i],r=await client.bareClient.post('/auth/android/login',{email:f.email,password:f.password});assert.equal(r.status,200);pair=r.data;
  assert.equal(pair.user.role,'CREW');const actorId=pair.user.id;let cursor=null,pages=0,items=[],seen=new Set();
  do {const page=await crew.listCrewInspectionTasksReal(cursor,1);pages++;for(const t of page.items){crew.validateCrewTaskIdentity(t,actorId);assert.ok(!seen.has(t.id));seen.add(t.id);items.push(t);}cursor=page.nextCursor;assert.ok(pages<100);}while(cursor);
  console.log('API037 Crew '+(i+1)+': 200; pages='+pages+'; assigned='+items.length);
  const refreshed=await crew.listCrewInspectionTasksReal(null,50);assert.ok(Array.isArray(refreshed.items));console.log('API037 Crew '+(i+1)+' refresh: 200');
  if(items.length){
   const t=items[0],list=await crew.listProjectCrewTasksReal(t.projectId,null,1);assert.ok(Array.isArray(list.items));console.log('API078: 200');
   if(list.nextCursor){const next=await crew.listProjectCrewTasksReal(t.projectId,list.nextCursor,1);assert.ok(!next.items.some(n=>list.items.some(p=>p.id===n.id)));console.log('API078 afterId page: 200; no duplicate');}
   for(const suffix of ['', '/'+t.id]){const denied=await fetch(client.apiClient.defaults.baseURL+'/projects/'+t.projectId+'/field-inspection-tasks'+suffix);assert.equal(denied.status,401);console.log('API'+(suffix?'080':'078')+' anonymous: 401');}
   const detail=await crew.getFieldInspectionTaskDetailReal(t.projectId,t.id);crew.validateCrewTaskDetail(detail.data,detail.etag,t.projectId,t.id,actorId);console.log('API080: 200; owner/version/strong ETag verified');saved.push(t);
   console.log('API080 metadata: repairContext='+!!detail.data.repairContext+'; GPS field='+('coordinates' in detail.data));
  }
 }
 if(saved.length){for(const t of saved){try{await crew.getFieldInspectionTaskDetailReal(t.projectId,t.id);console.log('API080 current-owner read: 200');}catch(e){assert.ok([403,404].includes(e.response?.status));console.log('API080 wrong-owner: '+e.response.status);}}}
 else console.log('API078/API080 assigned workflow: BE_FIXTURE_BLOCKED (no Crew assignments); no task/SQL mutation performed');
 console.log('ANDROID E2E: NOT RUN');
})().catch(e=>{console.error('HTTP smoke failed: status='+String(e.response?.status??'none')+'; type='+e.name);process.exitCode=1;});
