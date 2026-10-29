const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {randomUUID}=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
function load(file,deps={}) {const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,{module,exports:module.exports,console,require:n=>deps[n]??(n==='./crewRepairHistory'?load('src/api/crewRepairHistory.ts',deps):n==='axios'?require('axios'):new Proxy({},{get:()=>()=>{}}))});return module.exports;}
const ids=Object.fromEntries(['actor','projectId','taskId','packageId','itemId','bindingId','assignmentId','first','assessment','start','sample','capture','file','upload'].map(k=>[k,randomUUID()]));
const version='AAAAAAAAB9E=',next='AAAAAAAAB9I=';
const measurement=()=>({sampleId:ids.sample,type:'Area',value:2,state:'KNOWN',dimension:'AREA',unit:'M2',instrument:'Measuring tape',method:'Field measurement',locationReason:'GPS denied'});
const evidence=()=>({captureOriginId:ids.capture,fileId:ids.file,purpose:'BEFORE',checksumSha256:'a'.repeat(64),mediaType:'image/jpeg',capturedAt:null});
function harness(){
 const identity={actor:ids.actor,scope:JSON.stringify([ids.actor,'A']),environment:'http://fixture/api/v1',projectId:ids.projectId,taskId:ids.taskId};
 let current=identity,posts=0,fail=null,saveFail=false;
 const raw=new DatabaseSync(':memory:');raw.exec('CREATE TABLE local_draft(id TEXT PRIMARY KEY,kind TEXT,payload TEXT,created_at TEXT,updated_at TEXT)');
 const port={getAllAsync:async(s,...a)=>raw.prepare(s).all(...a),runAsync:async(s,...a)=>{if(saveFail&&s.startsWith('UPDATE'))throw Error('disk');return raw.prepare(s).run(...a);},withExclusiveTransactionAsync:async f=>{raw.exec('BEGIN');try{await f(port);raw.exec('COMMIT');}catch(e){raw.exec('ROLLBACK');throw e;}}};
 const api=load('src/api/crewApi.ts');
 const journal=load('src/api/crewRepairDraft.ts',{'./crewApi':api,'../offline/database':{openDatabase:()=>port,initDatabase:async()=>{}},'./authApi':{},'./client':{}});
 const task={id:ids.taskId,projectId:ids.projectId,assignedToUserId:ids.actor,assignmentId:ids.assignmentId,mode:'NORMAL',status:'InProgress',version,firstStartOriginId:ids.first,repairContext:{packageId:ids.packageId,itemId:ids.itemId,bindingId:ids.bindingId,mode:'NORMAL',status:'Assigned',itemVersion:version,repairPlan:'Approved',checklistVersion:'v1'}};
 const calls=[];
 const runtime={current:()=>current,uuid:randomUUID,now:()=>new Date().toISOString(),api:{...api,
  getFieldInspectionTaskDetailReal:async()=>({data:structuredClone(task),etag:`"${task.version}"`}),
  getFieldTaskStartOriginReal:async()=>({id:ids.first,taskId:ids.taskId,assignmentId:ids.assignmentId}),
  getCrewUploadSession:async()=>({id:ids.upload,fileId:ids.file,status:'VERIFIED'}),
  getCrewFileMetadata:async()=>({id:ids.file,status:'VERIFIED',checksumSha256:'a'.repeat(64),mediaType:'image/jpeg',sizeBytes:12}),
  submitRepairAssessmentReal:async(...args)=>{posts++;calls.push(structuredClone(args));if(fail)throw fail;task.repairContext.itemVersion=next;return {etag:`"${next}"`,data:{id:ids.assessment,itemId:ids.itemId,taskId:ids.taskId,firstStartId:ids.first,sessionId:randomUUID(),stage:'PRE_EXECUTION',readiness:'READY',missingReasons:[],locationState:'VERIFIED_CHECKLIST',contentHash:'a'.repeat(64)}};},
  startRepairExecutionReal:async(...args)=>{posts++;calls.push(structuredClone(args));if(fail)throw fail;task.repairContext.status='InProgress';return {etag:`"${next}"`,data:{id:ids.start,itemId:ids.itemId,taskId:ids.taskId,assessmentId:ids.assessment,firstStartId:ids.first,claimedAt:args[4].claimedAt,serverReceivedAt:new Date().toISOString(),verifiedOriginalAt:null,timeProvenance:'SERVER_RECEIVED'}};},
 },journal:()=>journal.openRepairJournal(identity,()=>current)};
 const workflow=load('src/api/crewRepairWorkflow.ts',{'./crewApi':runtime.api,'./crewRepairDraft':journal,'expo-crypto':{randomUUID}});
 const command=()=>({identity:{...identity,packageId:ids.packageId,itemId:ids.itemId,bindingId:ids.bindingId,assignmentId:ids.assignmentId},key:randomUUID(),operation:'assessment',itemVersion:version,payload:{originId:randomUUID(),fieldFirstStartId:ids.first,measurements:[measurement()],evidence:[evidence()]}});
 const draft=()=>({...identity,measurements:[measurement()],locationProof:null,captures:[{id:ids.capture,uri:'file:///fixture.jpg',purpose:'BEFORE',verified:true,upload:{id:ids.upload,fileId:ids.file},checksum:'a'.repeat(64),mediaType:'image/jpeg',size:12,capturedAt:null}]});
 return {identity,raw,port,api,runtime,workflow,task,command,draft,calls,posts:()=>posts,switch:()=>current={...identity,scope:JSON.stringify([ids.actor,'B'])},fail:e=>fail=e,saveFail:v=>saveFail=v};
}
test('T06B journal records history and allows start only after confirmed READY assessment',async()=>{
 const h=harness(),j=await h.runtime.journal(),c=h.command();await j.prepare(c);
 assert.equal((await j.list()).length,1);
 await assert.rejects(j.prepare({...c,key:randomUUID(),operation:'start'}));
 const confirmed=await h.workflow.dispatchRepair(c.identity,c.key,h.runtime);
 assert.equal(confirmed.phase,'CONFIRMED');assert.equal(h.posts(),1);
 const start=await h.workflow.prepareRepairStart(h.identity,h.runtime);
 assert.equal(start.payload.assessmentId,ids.assessment);assert.equal(start.itemVersion,next);
 assert.equal((await j.list()).length,2);assert.equal((await j.read(c.key)).receipt.data.id,ids.assessment);
 const done=await h.workflow.dispatchRepair(start.identity,start.key,h.runtime);
 assert.equal(done.phase,'CONFIRMED');assert.equal(done.receipt.data.id,ids.start);
});
test('T06B prepares real FIELD inputs durably, nullable device and item If-Match independent of task',async()=>{
 const h=harness(),d=h.draft(),c=await h.workflow.prepareRepairAssessment(h.identity,d,h.runtime);
 assert.equal(h.posts(),0);assert.equal(c.phase,'PREPARED');assert.equal(c.payload.deviceId,null);assert.equal(c.ifMatch,`"${version}"`);
 d.measurements[0].value=999;assert.equal((await (await h.runtime.journal()).read(c.key)).payload.measurements[0].value,2);
});
for(const [name,change] of [
 ['null context',h=>h.task.repairContext=null],['FT',h=>h.task.mode='CONDITIONAL_FT'],
 ['owner',h=>h.task.assignedToUserId=randomUUID()],['assignment',h=>h.task.assignmentId=null],
 ['first start',h=>h.task.firstStartOriginId=null],['item version',h=>h.task.repairContext.itemVersion='task-fake'],
 ['wrong item state',h=>h.task.repairContext.status='InProgress'],['task not started',h=>h.task.status='Accepted'],
])test('T06B fails closed before prepare: '+name,async()=>{const h=harness();change(h);await assert.rejects(h.workflow.prepareRepairAssessment(h.identity,h.draft(),h.runtime));assert.equal(h.posts(),0);assert.equal(h.raw.prepare('SELECT COUNT(*) AS n FROM local_draft').get().n,0);});
for(const [name,change] of [
 ['other actor',d=>d.actor=randomUUID()],['other session',d=>d.scope=JSON.stringify([ids.actor,'other'])],
 ['other task',d=>d.taskId=randomUUID()],['not verified',d=>d.captures[0].verified=false],
 ['checksum',d=>d.captures[0].checksum='b'.repeat(64)],['file ID',d=>d.captures[0].upload.fileId=randomUUID()],
 ['empty measurements',d=>d.measurements=[]],['unknown without reason',d=>{d.measurements[0].value=null;d.measurements[0].state='UNKNOWN';}],
 ['instrument',d=>d.measurements[0].instrument=''],['GPS invalid',d=>{d.measurements[0].latitude=100;d.measurements[0].longitude=106;}],
 ['only AFTER',d=>d.captures[0].purpose='AFTER'],
])test('T06B rejects FIELD source: '+name,async()=>{const h=harness(),d=h.draft();change(d);await assert.rejects(h.workflow.prepareRepairAssessment(h.identity,d,h.runtime));assert.equal(h.posts(),0);});
test('T06B PRE_EXECUTION excludes AFTER without relabeling the capture',async()=>{const h=harness(),d=h.draft();d.captures.push({...d.captures[0],id:randomUUID(),purpose:'AFTER'});const c=await h.workflow.prepareRepairAssessment(h.identity,d,h.runtime);assert.equal(c.payload.evidence.length,1);assert.equal(d.captures[1].purpose,'AFTER');});
test('T06B complete/VERIFYING is not verified',async()=>{const h=harness();h.runtime.api.getCrewUploadSession=async()=>({id:ids.upload,fileId:ids.file,status:'VERIFYING'});await assert.rejects(h.workflow.prepareRepairAssessment(h.identity,h.draft(),h.runtime));});
for(const status of [401,403,409,412,428])test('T06B HTTP '+status+' retains exact command and blocks replacement',async()=>{
 const h=harness(),j=await h.runtime.journal(),c=await j.prepare(h.command());h.fail({response:{status,data:{code:'fixture_error'}}});
 await assert.rejects(h.workflow.dispatchRepair(h.identity,c.key,h.runtime));const row=await j.read(c.key);
 assert.equal(row.phase,status===401?'PENDING':'REJECTED');assert.equal(row.key,c.key);assert.deepEqual(row.payload,c.payload);
 if(status!==401)assert.equal(row.rejection.status,status);
 await assert.rejects(j.prepare(h.command()));
 if(status===401){h.fail(null);assert.equal((await h.workflow.dispatchRepair(h.identity,c.key,h.runtime)).phase,'CONFIRMED');assert.deepEqual(h.calls[0],h.calls[1]);assert.equal(h.posts(),2);}
 else{await h.workflow.dispatchRepair(h.identity,c.key,h.runtime);assert.equal(h.posts(),1);}
});
for(const name of ['timeout before commit','timeout after commit'])test('T06B '+name+' survives restart and exact replay',async()=>{
 const h=harness(),j=await h.runtime.journal(),c=await j.prepare(h.command());h.fail(Error('timeout'));
 await assert.rejects(h.workflow.dispatchRepair(h.identity,c.key,h.runtime));assert.equal((await j.read(c.key)).phase,'PENDING');
 if(name.includes('after'))h.task.repairContext.itemVersion=next;
 h.fail(null);const row=await h.workflow.dispatchRepair(h.identity,c.key,h.runtime);
 assert.equal(row.phase,'CONFIRMED');assert.deepEqual(h.calls[0],h.calls[1]);assert.equal(row.payload.originId,c.payload.originId);
});
test('T06B ACK disk failure keeps pending command and permits exact replay',async()=>{
 const h=harness(),j=await h.runtime.journal(),c=await j.prepare(h.command()),send=h.runtime.api.submitRepairAssessmentReal;
 h.runtime.api.submitRepairAssessmentReal=async(...args)=>{const response=await send(...args);h.saveFail(true);return response;};
 await assert.rejects(h.workflow.dispatchRepair(h.identity,c.key,h.runtime));assert.equal((await j.read(c.key)).phase,'PENDING');
 h.saveFail(false);h.runtime.api.submitRepairAssessmentReal=send;assert.equal((await h.workflow.dispatchRepair(h.identity,c.key,h.runtime)).phase,'CONFIRMED');assert.deepEqual(h.calls[0],h.calls[1]);
});
test('T06B failed reconciliation retains ACK and next explicit reconciliation sends no POST',async()=>{
 const h=harness(),j=await h.runtime.journal(),c=await j.prepare(h.command()),read=h.runtime.api.getFieldInspectionTaskDetailReal;let reads=0;
 h.runtime.api.getFieldInspectionTaskDetailReal=async()=>{if(++reads===2)throw Error('offline read');return read();};
 await assert.rejects(h.workflow.dispatchRepair(h.identity,c.key,h.runtime));assert.equal((await j.read(c.key)).phase,'ACKNOWLEDGED');
 h.runtime.api.getFieldInspectionTaskDetailReal=read;assert.equal((await h.workflow.dispatchRepair(h.identity,c.key,h.runtime)).phase,'CONFIRMED');assert.equal(h.posts(),1);
});
test('T06B session switch during POST never stores old response in new session',async()=>{
 const h=harness(),j=await h.runtime.journal(),c=await j.prepare(h.command()),send=h.runtime.api.submitRepairAssessmentReal;
 h.runtime.api.submitRepairAssessmentReal=async(...args)=>{const result=await send(...args);h.switch();return result;};
 await assert.rejects(h.workflow.dispatchRepair(h.identity,c.key,h.runtime));const stored=JSON.parse(h.raw.prepare('SELECT payload FROM local_draft').get().payload);assert.equal(stored.phase,'PENDING');assert.equal(stored.receipt,undefined);
});
test('T06B double dispatch lock allows one POST',async()=>{
 const h=harness(),j=await h.runtime.journal(),c=await j.prepare(h.command());let release;const original=h.runtime.api.submitRepairAssessmentReal;
 const paused=new Promise(resolve=>release=resolve);h.runtime.api.submitRepairAssessmentReal=async(...args)=>{await paused;return original(...args);};
 const first=h.workflow.dispatchRepair(h.identity,c.key,h.runtime);await assert.rejects(h.workflow.dispatchRepair(h.identity,c.key,h.runtime),/repair_busy/);release();await first;assert.equal(h.posts(),1);
});
test('T06B missing or forged receipt never confirms success',async()=>{
 for(const change of [d=>d.id='fake',d=>d.taskId=randomUUID(),d=>d.firstStartId=randomUUID(),d=>d.stage='POST_EXECUTION',d=>d.contentHash='fake',d=>d.readiness='invented']){
 const h=harness(),j=await h.runtime.journal(),c=await j.prepare(h.command()),send=h.runtime.api.submitRepairAssessmentReal;
 h.runtime.api.submitRepairAssessmentReal=async(...args)=>{const response=await send(...args);change(response.data);return response;};
 await assert.rejects(h.workflow.dispatchRepair(h.identity,c.key,h.runtime));assert.equal((await j.read(c.key)).phase,'PENDING');}
});
test('T06B incomplete assessment is confirmed as incomplete, blocks start, preserves history for corrected assessment',async()=>{
 const h=harness(),j=await h.runtime.journal(),c=await j.prepare(h.command()),send=h.runtime.api.submitRepairAssessmentReal;
 h.runtime.api.submitRepairAssessmentReal=async(...args)=>{const response=await send(...args);response.data.readiness='INCOMPLETE';response.data.missingReasons=['LOCATION_UNKNOWN'];return response;};
 const row=await h.workflow.dispatchRepair(h.identity,c.key,h.runtime);assert.equal(row.phase,'CONFIRMED');assert.equal(row.receipt.data.missingReasons[0],'LOCATION_UNKNOWN');
 await assert.rejects(h.workflow.prepareRepairStart(h.identity,h.runtime));
 const nextCommand=await h.workflow.prepareRepairAssessment(h.identity,h.draft(),h.runtime);assert.notEqual(nextCommand.key,c.key);assert.equal((await j.list()).length,2);
});
test('T06B stale assessment version and replaced binding cannot start',async()=>{
 for(const change of [h=>h.task.repairContext.itemVersion=version,h=>h.task.repairContext.bindingId=randomUUID(),h=>h.task.assignmentId=randomUUID()]){
 const h=harness(),j=await h.runtime.journal(),c=await j.prepare(h.command());await h.workflow.dispatchRepair(h.identity,c.key,h.runtime);change(h);await assert.rejects(h.workflow.prepareRepairStart(h.identity,h.runtime));assert.equal(h.posts(),1);}
});
test('T06B restored history with changed binding never displays success',async()=>{
 const h=harness(),j=await h.runtime.journal(),c=await j.prepare(h.command());await h.workflow.dispatchRepair(h.identity,c.key,h.runtime);h.task.repairContext.bindingId=randomUUID();await assert.rejects(h.workflow.readRepairHistory(h.identity,h.runtime));assert.equal(h.posts(),1);
});
test('T06B input validation accepts nullable/valid device, rejects empty GUID and invalid start timestamps',()=>{
 const h=harness(),body=h.command().payload;h.workflow.validateRepairInput('assessment',{...body,deviceId:null});h.workflow.validateRepairInput('assessment',{...body,deviceId:randomUUID()});
 assert.throws(()=>h.workflow.validateRepairInput('assessment',{...body,deviceId:'00000000-0000-0000-0000-000000000000'}));
 const start={originId:randomUUID(),fieldFirstStartId:ids.first,assessmentId:ids.assessment,claimedAt:new Date().toISOString()};
 for(const change of [{claimedAt:'yesterday'},{assessmentId:'origin'},{monotonicMilliseconds:-1},{deviceId:''}])assert.throws(()=>h.workflow.validateRepairInput('start',{...start,...change}));
 h.workflow.validateRepairInput('start',{...start,deviceId:null});
});
test('T06B BE timestamp normalization preserves the same claimed instant',async()=>{
 const h=harness(),j=await h.runtime.journal(),c=await j.prepare(h.command());await h.workflow.dispatchRepair(h.identity,c.key,h.runtime);
 const start=await h.workflow.prepareRepairStart(h.identity,h.runtime),send=h.runtime.api.startRepairExecutionReal;
 h.runtime.api.startRepairExecutionReal=async(...args)=>{const response=await send(...args);response.data.claimedAt=response.data.claimedAt.replace('Z','+00:00');return response;};
 assert.equal((await h.workflow.dispatchRepair(h.identity,start.key,h.runtime)).phase,'CONFIRMED');
});
test('T06B PREPARED version change blocks POST, while PENDING keeps original replay version',async()=>{
 const h=harness(),j=await h.runtime.journal(),c=await j.prepare(h.command());h.task.repairContext.itemVersion=next;
 await assert.rejects(h.workflow.dispatchRepair(h.identity,c.key,h.runtime));assert.equal(h.posts(),0);assert.equal((await j.read(c.key)).phase,'PREPARED');
});
test('T06B mount/remount only reads; detail actions never navigate into legacy execution',async()=>{
 const h=harness();let mutations=0,reads=0;const routes=[];
 const react={createElement:(type,props,...children)=>({type,props,children}),useState:value=>[value,()=>{}],useRef:value=>({current:value}),useCallback:f=>f};
 const m=load('app/(crew)/wo-detail.tsx',{
  react,'react-native':{StyleSheet:{create:x=>x},Platform:{select:x=>x.default}},'expo-router':{useFocusEffect:f=>f(),router:{push:r=>routes.push(r)}},
  '../../src/design-tokens':{colors:{},radius:{},spacing:{},typography:{}},
  '../../src/hooks/useRepairBootstrap':{useRepairBootstrap:()=>({status:'ready',repairContext:h.task.repairContext,reload:async()=>{reads++;}})},
  './tasks':{useCrewIdentity:()=>({user:{id:ids.actor},scope:h.identity.scope})},
  '../../src/api/crewRepairDraft':{currentRepairIdentity:()=>h.identity,sameRepairIdentity:()=>true},
  '../../src/api/crewRepairWorkflow':{readRepairHistory:async()=>{reads++;return [];},readRepairFieldDraft:async()=>h.draft(),repairErrorMessage:()=>'',prepareRepairAssessment:async()=>{mutations++;},prepareRepairStart:async()=>{mutations++;},dispatchRepair:async()=>{mutations++;}},
 });
 const task={id:ids.taskId,projectId:ids.projectId,detail:h.task};
 for(let i=0;i<2;i++){m.NormalRepairBootstrap({task});await new Promise(resolve=>setImmediate(resolve));}
 assert.equal(mutations,0);assert.equal(reads,2);assert.equal(routes.length,0);
});
test('T06B changed key/body cannot overwrite a pending payload, even after restart',async()=>{
 const h=harness(),j=await h.runtime.journal(),c=await j.prepare(h.command());await j.transition(c.key,'PENDING');
 await assert.rejects((await h.runtime.journal()).prepare({...c,payload:{...c.payload,originId:randomUUID()}}));
 assert.deepEqual((await j.read(c.key)).payload,c.payload);
});
test('T06B transition cannot manufacture CONFIRMED without ACK or replace an immutable receipt',async()=>{
 const h=harness(),j=await h.runtime.journal(),c=await j.prepare(h.command());await assert.rejects(j.transition(c.key,'CONFIRMED'));
 await assert.rejects(j.transition(c.key,'ACKNOWLEDGED'));await j.transition(c.key,'PENDING');
 await assert.rejects(j.transition(c.key,'ACKNOWLEDGED',{receipt:{data:{id:'fake'},itemVersion:next}}));
 assert.equal((await j.read(c.key)).phase,'PENDING');
});
test('T06B actual API156/161 wrappers preserve body, stable key and strong RepairItem If-Match',async()=>{
 const calls=[],client={post:async(...args)=>{calls.push(args);return {data:{id:ids.assessment},headers:{etag:`"${next}"`}};}};
 const a=load('src/api/crewApi.ts',{'./client':{apiClient:client}}),body={originId:randomUUID(),fieldFirstStartId:ids.first,deviceId:null};
 for(const [name,method] of [['assessment',a.submitRepairAssessmentReal],['execution-start',a.startRepairExecutionReal]]){
 const response=await method(ids.projectId,ids.packageId,ids.itemId,ids.taskId,body,version,'stable-key');
 const call=calls.at(-1);assert.equal(call[0],`/projects/${ids.projectId}/repair-packages/${ids.packageId}/items/${ids.itemId}/tasks/${ids.taskId}/${name}`);
 assert.equal(call[1],body);assert.equal(call[2].headers['If-Match'],`"${version}"`);assert.equal(call[2].headers['Idempotency-Key'],'stable-key');assert.equal(response.etag,`"${next}"`);
 }
});
test('T06B actual repair wrappers reject missing/weak ETag instead of data version/hash fallback',async()=>{
 for(const etag of [undefined,`W/"${next}"`]){
 const a=load('src/api/crewApi.ts',{'./client':{apiClient:{post:async()=>({data:{version:next,contentHash:next},headers:{etag}})}}});
 await assert.rejects(a.submitRepairAssessmentReal(ids.projectId,ids.packageId,ids.itemId,ids.taskId,{},version,'stable'));
 await assert.rejects(a.startRepairExecutionReal(ids.projectId,ids.packageId,ids.itemId,ids.taskId,{},version,'stable'));
 }
});
test('T06B failed initial SQLite save makes no POST',async()=>{
 const h=harness();h.raw.exec('DROP TABLE local_draft');await assert.rejects(h.workflow.prepareRepairAssessment(h.identity,h.draft(),h.runtime));assert.equal(h.posts(),0);
});
test('T06B missing receipt ETag or content hash cannot substitute RepairItem version',async()=>{
 for(const etag of ['', 'W/"'+next+'"', '"'+'a'.repeat(64)+'"']){
 const h=harness(),j=await h.runtime.journal(),c=await j.prepare(h.command()),send=h.runtime.api.submitRepairAssessmentReal;
 h.runtime.api.submitRepairAssessmentReal=async(...args)=>({...await send(...args),etag});
 await assert.rejects(h.workflow.dispatchRepair(h.identity,c.key,h.runtime));assert.equal((await j.read(c.key)).phase,'PENDING');}
});
test('T06B start receipt without matching assessment never confirms success',async()=>{
 const h=harness(),j=await h.runtime.journal(),c=await j.prepare(h.command());await h.workflow.dispatchRepair(h.identity,c.key,h.runtime);
 const start=await h.workflow.prepareRepairStart(h.identity,h.runtime),send=h.runtime.api.startRepairExecutionReal;
 h.runtime.api.startRepairExecutionReal=async(...args)=>{const response=await send(...args);response.data.assessmentId=randomUUID();return response;};
 await assert.rejects(h.workflow.dispatchRepair(h.identity,start.key,h.runtime));assert.equal((await j.read(start.key)).phase,'PENDING');
});
test('T06B confirmed restore and replay require current binding and InProgress context',async()=>{
 const h=harness(),j=await h.runtime.journal(),c=await j.prepare(h.command());await h.workflow.dispatchRepair(h.identity,c.key,h.runtime);
 const start=await h.workflow.prepareRepairStart(h.identity,h.runtime);await h.workflow.dispatchRepair(h.identity,start.key,h.runtime);
 assert.equal((await h.workflow.readRepairHistory(h.identity,h.runtime)).length,2);
 h.task.repairContext.status='Cancelled';await assert.rejects(h.workflow.readRepairHistory(h.identity,h.runtime));await assert.rejects(h.workflow.dispatchRepair(h.identity,start.key,h.runtime));assert.equal(h.posts(),2);
});
