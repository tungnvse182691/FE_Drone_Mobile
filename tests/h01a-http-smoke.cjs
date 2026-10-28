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
 const anon=await fetch(client.apiClient.defaults.baseURL+'/projects');assert.equal(anon.status,401);console.log('API049 anonymous: 401');
 const fixtures=JSON.parse(execFileSync('docker',['exec','roadguard-fe-starter01-api-1','cat','/handoff/demo-accounts.json'],{encoding:'utf8'})).filter(a=>a.key==='crew-a'||a.key==='crew-b');assert.equal(fixtures.length,2);
 let projectsTotal=0,details=0,savedPath=null;
 for(const f of fixtures){pair=(await client.bareClient.post('/auth/android/login',{email:f.email,password:f.password})).data;
  let cursor=null,pages=0,projects=[];
  do{const page=await crew.listCrewProjectsReal({cursor:cursor??undefined,limit:1});projects.push(...page.items);cursor=page.nextCursor;assert.ok(++pages<100);}while(cursor);
  projectsTotal+=projects.length;console.log('API049 authorized: 200; pages='+pages+'; projects='+projects.length);
  for(const p of projects){let after=null,n=0;
   const path='/projects/'+p.projectId+'/receiving-requests';const denied=await fetch(client.apiClient.defaults.baseURL+path);assert.equal(denied.status,401);console.log('API135 anonymous: 401');
   do{const page=(await client.apiClient.get(path,{params:{limit:1,after:after??undefined}})).data;
    for(const v of page.items){assert.equal(v.projectId,p.projectId);assert.equal(v.responsibleActorId,pair.user.id);const detail=await client.apiClient.get(path+'/'+v.id);assert.equal(detail.data.id,v.id);savedPath=path+'/'+v.id;const deniedDetail=await fetch(client.apiClient.defaults.baseURL+savedPath);assert.equal(deniedDetail.status,401);console.log('API136 anonymous: 401');assert.equal(detail.headers.etag,'"'+detail.data.version+'"');details++;}
    after=page.continuation;assert.ok(++n<100);
   }while(after);console.log('API135 authorized: 200; pages='+n+'; API136 details='+details);
  }
 }
 if(savedPath){const denied=await client.apiClient.get(savedPath,{validateStatus:()=>true});assert.ok([403,404].includes(denied.status));console.log('API136 wrong-recipient: '+denied.status);}
 if(!projectsTotal)console.log('API135/136 positive: BE_FIXTURE_BLOCKED (no discoverable project)');
 if(!details)console.log('API136 positive/recipient negative: NOT RUN (no receiving request fixture)');
 console.log('API137 ACK: NOT RUN (shared fixture; no mutation authorization)');console.log('Discovery: PARTIAL / BE_DISCOVERY_GAP (active task/binding restriction)');console.log('ANDROID E2E: NOT RUN');
})().catch(e=>{console.error('HTTP smoke failed: status='+String(e.response?.status??'none')+'; type='+e.name);process.exitCode=1;});
