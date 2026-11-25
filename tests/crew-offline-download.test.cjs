const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm'),{randomUUID:id}=require('node:crypto');
const sameOfflinePartition=(a,b)=>a.actor===b.actor&&a.role===b.role&&a.environment===b.environment&&a.partition===b.partition;
function setup(){let active=true,rows=[],calls=[];const identity={actor:'actor',scope:'session',environment:'api',role:'REPAIR_CREW',partition:'own'},project='project',task='task';
 const guard=()=>{if(!active)throw Error('session_changed');};
 const prepare=async (kind,parent)=>{guard();calls.push('prepare:'+kind);const r={id:kind+':'+rows.length,identity,projectId:project,phase:'PREPARED',proof:{kind,...(parent?{previousSnapshotIntentId:parent}:{})},body:JSON.stringify(kind==='snapshot'?{taskId:task,deviceRegistrationId:'registration'}:{}),receipt:undefined};rows.push(r);return r;};
 const m={exports:{}};const deps={'./crewSafetyWorkflow':{crewReadGuard:guard},'./crewOfflineJournal':{openOfflineJournal:async()=>({list:async()=>rows}),sameOfflinePartition},'./crewOfflineDevice':{prepareDeviceEnrollment:()=>prepare('enrollment'),prepareDeviceSnapshot:(_i,_p,_t,_r,parent)=>prepare('snapshot',parent),reconcileDeviceIntent:async r=>{calls.push('GET:'+r.proof.kind);const next={...r,phase:'RECONCILED',receipt:r.proof.kind==='enrollment'?{id:'registration'}:{id:'snapshot',taskId:task}};rows=rows.map(x=>x.id===r.id?next:x);return next;}},'./crewOfflineWorkflow':{requireOfflineNativeAcceptance:()=>{},dispatchOfflineIntent:async r=>{calls.push('POST:'+r.proof.kind);const next={...r,phase:'RECEIVED',receipt:{id:r.proof.kind==='enrollment'?'registration':'snapshot'}};rows=rows.map(x=>x.id===r.id?next:x);return next;}},'./crewApi':{getFieldInspectionTaskDetailReal:async()=>{throw Error('no editor fixture');}},'./crewOfflineEditorSource':{retainCrewEditorSource:async()=>{throw Error('unexpected save');}},'../utils/uuid':{uuidv4:id}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/crewOfflinePreparation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:m,exports:m.exports,require:n=>deps[n]});
 return {run:(refresh=false)=>m.exports.downloadCrewOfflineTask(identity,project,task,refresh),calls,get rows(){return rows;},setRows:v=>rows=v,switch:()=>active=false,identity};
}
test('snapshot download retains only a matching API-080 editor source',async()=>{
 const text=fs.readFileSync('src/api/crewOfflinePreparation.ts','utf8');
 for(const match of [true,false]){
  const identity={actor:'crew',scope:'session',environment:'api',role:'REPAIR_CREW',partition:'own'};
  const snapshot={id:'snapshot',taskId:'task',assignmentId:'assignment',originalActorId:'crew',taskVersion:'version'};
  const detail={id:'task',projectId:'project',assignedToUserId:'crew',assignmentId:'assignment',version:match?'version':'stale',mode:'NORMAL',status:'InProgress',defectId:'defect'};
  let saved=0;const m={exports:{}};
  const deps={'./crewSafetyWorkflow':{crewReadGuard:()=>{}},'./crewOfflineJournal':{openOfflineJournal:async()=>({list:async()=>[{id:'enrollment',identity,projectId:'project',phase:'RECONCILED',proof:{kind:'enrollment'},receipt:{id:'registration'}},{id:'snapshot',identity,projectId:'project',phase:'RECONCILED',proof:{kind:'snapshot'},body:JSON.stringify({taskId:'task',deviceRegistrationId:'registration'}),receipt:snapshot}]}),sameOfflinePartition},'./crewOfflineDevice':{},'./crewOfflineWorkflow':{requireOfflineNativeAcceptance:()=>{}},'./crewApi':{getFieldInspectionTaskDetailReal:async()=>({data:detail,etag:'"version"'}),validateCrewTaskDetail:()=>{},crewTaskFromWire:(_item,data)=>({id:data.id,projectId:data.projectId,detail:data,etag:'"version"'})},'./crewOfflineEditorSource':{retainCrewEditorSource:async()=>{saved++;}},'../utils/uuid':{uuidv4:id}};
  vm.runInNewContext(ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:m,exports:m.exports,require:n=>deps[n]});
  assert.equal((await m.exports.downloadCrewOfflineTask(identity,'project','task')).id,'snapshot');
  assert.equal(saved,match?1:0);
 }
});
test('editor source survives a new module instance but rejects stale snapshot and foreign session',async()=>{
 const identity={actor:'crew',scope:'session',environment:'api',role:'REPAIR_CREW',partition:'own'};
 const task={id:'task',projectId:'project',etag:'"v1"',detail:{id:'task',projectId:'project',assignedToUserId:'crew',assignmentId:'assignment',version:'v1'}};
 const snapshot={taskVersion:'v1',assignmentId:'assignment',originalActorId:'crew'};
 const rows=new Map(),db={withExclusiveTransactionAsync:async fn=>fn({runAsync:async(_sql,key,_kind,payload)=>{rows.set(key,payload);}}),getFirstAsync:async(_sql,key)=>rows.has(key)?{payload:rows.get(key)}:null};
 let current=identity;
 const deps={'../offline/database':{openDatabase:()=>db,initDatabase:async()=>{}},'../offline/upload-queue':{sameQueueIdentity:(a,b=current)=>a.actor===b.actor&&a.scope===b.scope&&a.environment===b.environment&&a.partition===b.partition},'./crewApi':{isCrewResourceId:()=>true,validateCrewTaskDetail:()=>{}},'./crewOfflineField':{readOfflineCrewTask:async()=>({snapshot})}};
 const load=()=>{const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/crewOfflineEditorSource.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:m,exports:m.exports,require:n=>deps[n],Date,JSON});return m.exports;};
 await load().retainCrewEditorSource(identity,task);
 assert.equal((await load().readCrewEditorSource(identity,'project','task')).detail.version,'v1');
 snapshot.taskVersion='v2';await assert.rejects(load().readCrewEditorSource(identity,'project','task'),/snapshot_changed/);
 snapshot.taskVersion='v1';current={...identity,scope:'other'};
 await assert.rejects(load().readCrewEditorSource(identity,'project','task'),/session_changed/);
});
test('download performs enrollment POST/GET then snapshot POST/GET, second tap reuses receipts',async()=>{const h=setup();assert.equal((await h.run()).id,'snapshot');assert.deepEqual(h.calls,['prepare:enrollment','POST:enrollment','GET:enrollment','prepare:snapshot','POST:snapshot','GET:snapshot']);await h.run();assert.equal(h.calls.length,6);});
test('restart at RECEIVED reads existing registration, never repeats POST or generates new keys',async()=>{const h=setup();h.setRows([{id:'enrollment',identity:h.identity,projectId:'project',phase:'RECEIVED',proof:{kind:'enrollment'},body:'{}',receipt:{id:'registration'}}]);await h.run();assert.equal(h.calls.includes('POST:enrollment'),false);assert.equal(h.calls.includes('prepare:enrollment'),false);assert.equal(h.calls[0],'GET:enrollment');});
test('uncertain enrollment replays exact existing object',async()=>{const h=setup();h.setRows([{id:'enrollment',identity:h.identity,projectId:'project',phase:'UNKNOWN_OUTCOME',proof:{kind:'enrollment'},body:'{}'}]);await h.run();assert.equal(h.calls[0],'POST:enrollment');assert.equal(h.calls.includes('prepare:enrollment'),false);});
test('old session is preserved and blocks new registration rather than adoption',async()=>{const h=setup();h.setRows([{identity:{...h.identity,scope:'old'},projectId:'project',phase:'RECONCILED',proof:{kind:'enrollment'}}]);await assert.rejects(h.run(),/session_recovery/);assert.equal(h.calls.length,0);});
test('IN_FLIGHT requires reconciliation, not silent resubmission',async()=>{const h=setup();h.setRows([{identity:h.identity,projectId:'project',phase:'IN_FLIGHT',proof:{kind:'enrollment'}}]);await assert.rejects(h.run(),/uncertain/);assert.equal(h.calls.length,0);});

test('explicit refresh appends after confirmed head; restart resumes pending refresh without another prepare',async()=>{
 const h=setup();await h.run();const old=h.rows.at(-1);await h.run(true);
 assert.equal(h.rows.filter(r=>r.proof.kind==='snapshot').length,2);
 assert.equal(h.rows.at(-1).proof.previousSnapshotIntentId,old.id);
 const head=h.rows.at(-1);h.setRows(h.rows.map(r=>r.id===head.id?{...r,phase:'RECEIVED'}:r));
 const before=h.calls.filter(x=>x==='prepare:snapshot').length;await h.run(true);
 assert.equal(h.calls.filter(x=>x==='prepare:snapshot').length,before);assert.equal(h.calls.at(-1),'GET:snapshot');
});
test('broken snapshot lineage blocks transport and preserves records',async()=>{
 const h=setup();await h.run();const prior=h.rows.at(-1);h.setRows([...h.rows,{...prior,id:'bad',proof:{...prior.proof,previousSnapshotIntentId:'wrong'}}]);
 const count=h.calls.length;await assert.rejects(h.run(true),/reconciliation/);assert.equal(h.calls.length,count);
});
test('reconcileDeviceSessionForProject revalidates device and current snapshot via API-117/080/128 and rejects mismatch or stale auth',async()=>{
 const actor=id(),project=id(),task=id(),assignment=id(),deviceId=id(),regId=id(),snapId=id(),oldSnapRowId=id();
 const oldIdentity={actor,scope:'old-sid',environment:'http://api',role:'REPAIR_CREW',partition:'p'};
 const newIdentity={actor,scope:'new-sid',environment:'http://api',role:'REPAIR_CREW',partition:'p'};
 const device={id:regId,projectId:project,actorId:actor,deviceId,role:'RepairCrew',revokedAt:null,keyFingerprint:'fp1',signingPublicKey:'pk-sign',encryptionPublicKey:'pk-enc'};
 const snap={id:snapId,taskId:task,assignmentId:assignment,originalActorId:actor,deviceRegistrationId:regId,taskVersion:'v1',assignmentHash:'a'.repeat(64),contentHash:'b'.repeat(64),downloadedAt:new Date().toISOString(),snapshot:{id:task,projectId:project,assignmentId:assignment,originalActorId:actor,location:{coordinates:[106,10]}}};
 const makeSetup=(overrides={})=>{
  let confirms=0,active=true;
  const rows=[
   {id:id(),identity:overrides.oldIdentity??oldIdentity,projectId:project,phase:'RECONCILED',proof:{kind:'enrollment'},body:JSON.stringify({deviceId,signingPublicKey:'pk-sign',encryptionPublicKey:'pk-enc'}),receipt:{...device,...(overrides.oldDevice??{})}},
   {id:oldSnapRowId,identity:overrides.oldIdentity??oldIdentity,projectId:project,phase:'RECONCILED',proof:{kind:'snapshot',assignmentId:assignment,taskVersion:overrides.snapVersion??'v1'},body:JSON.stringify({taskId:task,deviceRegistrationId:regId}),receipt:{...snap,taskVersion:overrides.snapVersion??'v1'}},
  ];
  const m={exports:{}};
  const deps={
   './crewSafetyWorkflow':{crewReadGuard:()=>{if(!active)throw Error('offline_session_changed');}},
   './crewOfflineJournal':{sameOfflinePartition,openOfflineJournal:async()=>({list:async()=>rows,confirmSession:async(intent,receipt)=>{confirms++;const rec={...intent,schema:1,phase:'RECONCILED',receipt};rows.push(rec);return rec;}})},
   './crewOfflineDevice':{
    crewOfflineNative:()=>({publicKeys:async()=>overrides.keys??{signingPublicKey:'pk-sign',encryptionPublicKey:'pk-enc'}}),
    deviceBinding:()=>'bound',
    inspectOfflineDevice:async()=>({deviceId:overrides.deviceId??deviceId,capability:{signingUsable:true,agreementUsable:true}}),
    prepareDeviceEnrollment:async()=>{throw Error('unexpected_enroll');},
    prepareDeviceSnapshot:async(_i,_p,_t,_r,parent)=>({id:id(),identity:newIdentity,projectId:project,phase:'PREPARED',proof:{kind:'snapshot',previousSnapshotIntentId:parent},body:JSON.stringify({taskId:task,deviceRegistrationId:regId})}),
    reconcileDeviceIntent:async r=>({...r,phase:'RECONCILED',receipt:{...snap,id:id(),taskVersion:'v2'}}),
   },
   './crewOfflineWorkflow':{requireOfflineNativeAcceptance:()=>{},offlineProjectPath:(p)=>`/projects/${p}/offline`,readOfflineResource:async(_i,_p,kind)=>{if(overrides.httpErr)throw overrides.httpErr;return kind==='devices'?{...device,...(overrides.serverDevice??{})}:{...snap,taskVersion:overrides.snapVersion??'v1'};},validateDevice:()=>{if(overrides.serverDevice?.revokedAt)throw Error('offline_device_invalid_or_revoked');},validateSnapshot:()=>{},dispatchOfflineIntent:async r=>({...r,phase:'RECEIVED'})},
   './crewApi':{getFieldInspectionTaskDetailReal:async()=>({data:{id:task,projectId:project,assignedToUserId:overrides.assignedTo??actor,assignmentId:overrides.assignmentId??assignment,version:overrides.taskVersion??'v1',mode:'NORMAL',status:'InProgress',defectId:id()},etag:'"v1"'}),validateCrewTaskDetail:()=>{},crewTaskFromWire:(_a,d)=>({id:d.id,projectId:d.projectId,detail:d,etag:'"v1"'})},
   './crewOfflineEditorSource':{retainCrewEditorSource:async()=>{}},
   '../utils/uuid':{uuidv4:id},
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/crewOfflinePreparation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:m,exports:m.exports,require:n=>deps[n],JSON});
  return {api:m.exports,rows,confirms:()=>confirms,switchSession:()=>{active=false;}};
 };
 // 1. Valid same-actor new-sid confirms device & current snapshot, then download reuses without duplicate
 const ok=makeSetup();
 await ok.api.reconcileDeviceSessionForProject(newIdentity,project,task);
 assert.equal(ok.confirms(),1);
 const dl=await ok.api.downloadCrewOfflineTaskDetailed(newIdentity,project,task);
 assert.equal(dl.snapshot.id,snapId);
 assert.equal(dl.editorReady,true);
 // 2. Stale snapshot version does NOT confirm old snapshot, triggers fresh snapshot with previousSnapshotIntentId
 const stale=makeSetup({snapVersion:'v1',taskVersion:'v2'});
 await stale.api.reconcileDeviceSessionForProject(newIdentity,project,task);
 const confirmRec=stale.rows.find(r=>r.proof.kind==='session-confirm');
 assert.equal(confirmRec.proof.snapshotIds.length,0);
 const dlStale=await stale.api.downloadCrewOfflineTaskDetailed(newIdentity,project,task);
 assert.equal(dlStale.snapshot.taskVersion,'v2');
 // 3. Key mismatch, revoked device, different actor, 401/403, session switch all fail closed
 await assert.rejects(makeSetup({keys:{signingPublicKey:'other',encryptionPublicKey:'pk-enc'}}).api.reconcileDeviceSessionForProject(newIdentity,project,task),/key_mismatch/);
 await assert.rejects(makeSetup({serverDevice:{revokedAt:'2026-11-25T00:00:00Z'}}).api.reconcileDeviceSessionForProject(newIdentity,project,task),/invalid_or_revoked/);
 await assert.rejects(makeSetup({oldIdentity:{...oldIdentity,actor:id()}}).api.reconcileDeviceSessionForProject(newIdentity,project,task),/reconciliation_required/);
 await assert.rejects(makeSetup({httpErr:Object.assign(Error('401'),{response:{status:401}})}).api.reconcileDeviceSessionForProject(newIdentity,project,task),/401/);
 const sw=makeSetup();sw.switchSession();
 await assert.rejects(sw.api.reconcileDeviceSessionForProject(newIdentity,project,task),/session_changed/);
});
