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
 const loadFile=(file,extra={})=>{const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:m,exports:m.exports,require:n=>extra[n]??deps[n],Date,JSON});return m.exports;};
 const storage=loadFile('src/api/crewOfflineEditorStorage.ts');
 const load=()=>loadFile('src/api/crewOfflineEditorSource.ts',{'./crewOfflineEditorStorage':storage});
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

test('integration: real SQLite journal + real prepareDeviceSnapshot + mocked transport handle authorizationId, stale historical snapshot, and confirmSession revocation',async()=>{
 const {DatabaseSync}=require('node:sqlite');
 const raw=new DatabaseSync(':memory:');
 raw.exec('CREATE TABLE IF NOT EXISTS local_draft(id TEXT PRIMARY KEY,kind TEXT,payload TEXT,created_at TEXT,updated_at TEXT)');
 const db={getAllAsync:async(s,...p)=>raw.prepare(s).all(...p),getFirstAsync:async(s,...p)=>raw.prepare(s).get(...p),runAsync:async(s,...p)=>raw.prepare(s).run(...p),withExclusiveTransactionAsync:async f=>{raw.exec('BEGIN IMMEDIATE');try{await f(db);raw.exec('COMMIT');}catch(e){raw.exec('ROLLBACK');throw e;}}};
 const actor=id(),project=id(),task=id(),assignment=id(),deviceId=id(),regId=id(),authId=id();
 const oldIdentity={actor,scope:'old-sid',environment:'http://fixture.test/api/v1',role:'REPAIR_CREW',partition:'p'};
 const newIdentity={actor,scope:'new-sid',environment:'http://fixture.test/api/v1',role:'REPAIR_CREW',partition:'p'};
 let current=oldIdentity,taskVersion='v1',serverRevokedAt=null;
 const device={id:regId,projectId:project,actorId:actor,deviceId,revision:1,role:'RepairCrew',encryptionPublicKey:'pk-enc',signingPublicKey:'pk-sign',keyFingerprint:'fp1',registeredAt:new Date().toISOString(),revokedAt:null};
 const makeSnap=(snapId,ver)=>({id:snapId,taskId:task,assignmentId:assignment,originalActorId:actor,deviceRegistrationId:regId,taskVersion:ver,assignmentHash:'a'.repeat(64),contentHash:'b'.repeat(64),downloadedAt:new Date().toISOString(),snapshot:{id:task,projectId:project,assignmentId:assignment,originalActorId:actor,location:{coordinates:[106,10]},repair:{authorizationId:authId,mode:'NORMAL'}}});
 const snapV1=makeSnap(id(),'v1'),snapV2=makeSnap(id(),'v2');
 const isUuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
 const sameQueue=(a,b=current)=>a.actor===b.actor&&a.role===b.role&&a.environment===b.environment&&a.scope===b.scope&&a.partition===b.partition;
 const loadMod=(file,deps)=>{const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:m,exports:m.exports,require:n=>deps[n],Date,URL,JSON});return m.exports;};
 const journalMod=loadMod('src/api/crewOfflineJournal.ts',{'../offline/database':{openDatabase:()=>db,initDatabase:async()=>{},saveDraft:async()=>{}},'../offline/upload-queue':{currentQueueIdentity:()=>current,sameQueueIdentity:sameQueue}});
 const deviceMod=loadMod('src/api/crewOfflineDevice.ts',{
  '../utils/uuid':{uuidv4:id},
  '../offline/upload-queue':{sameQueueIdentity:sameQueue},
  './crewApi':{getFieldInspectionTaskDetailReal:async()=>({data:{id:task,projectId:project,assignedToUserId:actor,assignmentId:assignment,version:taskVersion,mode:'NORMAL',status:'InProgress',defectId:id()},etag:`"${taskVersion}"`}),isCrewResourceId:isUuid,validateCrewTaskDetail:()=>{}},
  './crewSafetyWorkflow':{crewReadGuard:()=>{}},
  './crewOfflineWorkflow':{
   crewOfflineNative:()=>({installationId:async()=>deviceId,capability:async()=>({signingUsable:true,agreementUsable:true}),createKeys:async()=>({signingUsable:true,agreementUsable:true}),publicKeys:async()=>({signingPublicKey:'pk-sign',encryptionPublicKey:'pk-enc'})}),
   deviceBinding:()=>'bound',
   inspectOfflineDevice:async()=>({deviceId,capability:{signingUsable:true,agreementUsable:true}}),
   offlineProjectPath:p=>`/projects/${p}/offline`,
   offlineSigningPublicKey:()=>{},
   readOfflineResource:async(_i,_p,kind,rid)=>kind==='devices'?{...device,revokedAt:serverRevokedAt}:(rid===snapV1.id?snapV1:snapV2),
   requireOfflineNativeAcceptance:()=>{},
   validateDevice:()=>{if(serverRevokedAt)throw Error('offline_device_invalid_or_revoked');},
   validateSnapshot:()=>{},
  },
  './crewOfflineCrypto':{offlineSigningPublicKey:()=>{}},
  './crewOfflineJournal':journalMod,
  '../../modules/roadguard-offline-crypto':{offlineQaNativeFor:()=>null,offlineNative:{installationId:async()=>deviceId,capability:async()=>({signingUsable:true,agreementUsable:true}),createKeys:async()=>({signingUsable:true,agreementUsable:true}),publicKeys:async()=>({signingPublicKey:'pk-sign',encryptionPublicKey:'pk-enc'})}},
 });
 const prepMod=loadMod('src/api/crewOfflinePreparation.ts',{
  '../utils/uuid':{uuidv4:id},
  './crewApi':{getFieldInspectionTaskDetailReal:async()=>({data:{id:task,projectId:project,assignedToUserId:actor,assignmentId:assignment,version:taskVersion,mode:'NORMAL',status:'InProgress',defectId:id()},etag:`"${taskVersion}"`}),validateCrewTaskDetail:()=>{},crewTaskFromWire:(_a,d)=>({id:d.id,projectId:d.projectId,detail:d,etag:`"${d.version}"`})},
  './crewOfflineDevice':deviceMod,
  './crewOfflineEditorSource':{retainCrewEditorSource:async()=>{}},
  './crewOfflineJournal':journalMod,
  './crewOfflineWorkflow':{
   dispatchOfflineIntent:async r=>{const j=await journalMod.openOfflineJournal(current,db);const p=await j.transition(r,'IN_FLIGHT');const body=JSON.parse(r.body);const rec=r.proof.kind==='enrollment'?device:(body.taskId===task&&taskVersion==='v1'?snapV1:snapV2);return j.transition(p,'RECEIVED',rec);},
   offlineProjectPath:p=>`/projects/${p}/offline`,
   readOfflineResource:async(_i,_p,kind,rid)=>kind==='devices'?{...device,revokedAt:serverRevokedAt}:(rid===snapV1.id?snapV1:snapV2),
   requireOfflineNativeAcceptance:()=>{},
   validateDevice:()=>{if(serverRevokedAt)throw Error('offline_device_invalid_or_revoked');},
   validateSnapshot:()=>{},
  },
  './crewSafetyWorkflow':{crewReadGuard:()=>{}},
 });
 // 1. Initial download in old-sid succeeds even with repair.authorizationId in snapshot receipt, while real secrets remain forbidden
 const first=await prepMod.downloadCrewOfflineTaskDetailed(oldIdentity,project,task);
 assert.equal(first.snapshot.id,snapV1.id);
 const jOld=await journalMod.openOfflineJournal(oldIdentity,db);
 await assert.rejects(jOld.prepare({id:id(),identity:oldIdentity,projectId:project,path:'/devices',key:id(),body:'{"authorization":"Bearer secret"}',proof:{kind:'device'}}),/offline_secret_forbidden/);
 // 2. Switch to new-sid while v1 is still current -> confirmSession confirms S1
 current=newIdentity;
 await prepMod.reconcileDeviceSessionForProject(newIdentity,project,task);
 const jNew=await journalMod.openOfflineJournal(newIdentity,db);
 const c1=(await jNew.list()).find(r=>r.proof.kind==='session-confirm');
 assert.equal(c1.proof.snapshotIds.length,1);
 // 3. Server advances to v2 -> reconcile strips stale S1 from session-confirm, and download prepares S2 chaining S1 without deadlock
 taskVersion='v2';
 await prepMod.reconcileDeviceSessionForProject(newIdentity,project,task);
 const c2=(await jNew.list()).find(r=>r.proof.kind==='session-confirm');
 assert.equal(c2.proof.snapshotIds.length,0);
 const second=await prepMod.downloadCrewOfflineTaskDetailed(newIdentity,project,task);
 assert.equal(second.snapshot.id,snapV2.id);
 const snaps=(await jNew.list()).filter(r=>r.proof.kind==='snapshot');
 assert.equal(snaps.length,2);
 assert.equal(snaps[1].proof.previousSnapshotIntentId,snaps[0].id);
 // 4. readLocalOfflineSources preserves lineage across stale S1 -> S2 without offline_snapshot_lineage_invalid
 const localSources=await deviceMod.readLocalOfflineSources(newIdentity,project,regId,deviceId);
 assert.equal(localSources.snapshots.length,1);
 assert.equal(localSources.snapshots[0].id,snapV2.id);
 // 5. Local revocation record blocks confirmSession
 await jNew.prepare({id:id(),identity:newIdentity,projectId:project,path:`/projects/${project}/offline/devices/${regId}/revoke`,key:id(),body:'{}',proof:{kind:'revocation',registrationId:regId}});
 await assert.rejects(jNew.confirmSession({id:id(),identity:newIdentity,projectId:project,path:`/projects/${project}/offline/devices/${regId}`,key:id(),body:JSON.stringify({registrationId:regId,confirmedScope:newIdentity.scope,snapshotIds:[]}),proof:{kind:'session-confirm',registrationId:regId,confirmedScope:newIdentity.scope,snapshotIds:[]}},device),/revocation/);
 raw.close();
});

test('real device preparation creates a fresh snapshot at the same taskVersion and preserves the old command',async()=>{
 const h=interruptedDeviceFixture();
 try{
  const j=await h.journal.openOfflineJournal(h.old);
  for(const kind of ['enrollment','snapshot']){
   let r=await h.prepare(kind);r=await j.transition(r,'IN_FLIGHT');r=await j.transition(r,'RECEIVED',kind==='enrollment'?h.device:h.snapshot);await j.transition(r,'RECONCILED');
  }
  const old=(await j.list()).at(-1),bytes=JSON.stringify(old);
  const fresh=await h.api.prepareDeviceSnapshot(h.old,h.project,h.task,h.device.id,old.id);
  assert.notEqual(fresh.id,old.id);assert.notEqual(fresh.key,old.key);assert.equal(fresh.phase,'PREPARED');
  assert.equal(fresh.proof.taskVersion,old.proof.taskVersion);assert.equal(fresh.proof.previousSnapshotIntentId,old.id);
  assert.equal(JSON.stringify((await j.list()).find(r=>r.id===old.id)),bytes);
  await assert.rejects(h.api.prepareDeviceSnapshot(h.old,h.project,h.task,h.device.id,old.id),/reconciliation/);
 }finally{h.close();}
});

function interruptedDeviceFixture(){
 const {DatabaseSync}=require('node:sqlite'),raw=new DatabaseSync(':memory:');
 raw.exec('CREATE TABLE local_draft(id TEXT PRIMARY KEY,kind TEXT,payload TEXT,created_at TEXT,updated_at TEXT)');
 const db={getAllAsync:async(s,...p)=>raw.prepare(s).all(...p),getFirstAsync:async(s,...p)=>raw.prepare(s).get(...p),runAsync:async(s,...p)=>raw.prepare(s).run(...p),withExclusiveTransactionAsync:async f=>{raw.exec('BEGIN IMMEDIATE');try{await f(db);raw.exec('COMMIT');}catch(e){raw.exec('ROLLBACK');throw e;}}};
 const old={actor:id(),role:'REPAIR_CREW',environment:'http://fixture/api/v1',scope:'old',partition:'p'},owner={...old,scope:'current'},project=id(),task=id(),assignment=id(),deviceId=id(),regId=id(),snapshotId=id();
 let current=old,keys={signingPublicKey:'sign',encryptionPublicKey:'enc'},onPost=null,onRead=null;
 const calls=[],device={id:regId,projectId:project,actorId:old.actor,deviceId,role:'RepairCrew',revokedAt:null,...keys};
 const snapshot={id:snapshotId,taskId:task,assignmentId:assignment,originalActorId:old.actor,deviceRegistrationId:regId,taskVersion:'AAAAAAAAB9E=',assignmentHash:'a'.repeat(64),contentHash:'b'.repeat(64),snapshot:{id:task},downloadedAt:new Date().toISOString()};
 const same=(a,b=current)=>a.actor===b.actor&&a.role===b.role&&a.environment===b.environment&&a.scope===b.scope&&a.partition===b.partition;
 const guard=i=>{if(!same(i))throw Error('offline_session_changed');};
 const load=(file,deps)=>{const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:m,exports:m.exports,require:n=>deps[n],Date,JSON});return m.exports;};
 const journal=load('src/api/crewOfflineJournal.ts',{'../offline/database':{openDatabase:()=>db,initDatabase:async()=>{}},'../offline/upload-queue':{currentQueueIdentity:()=>current,sameQueueIdentity:same}});
 const client={get:async path=>{calls.push({method:'GET',path});if(onRead)await onRead();return {data:path.includes('/devices/')?device:snapshot};},post:async(path,body,config)=>{calls.push({method:'POST',path,body,config});if(onPost)await onPost();return {data:path.endsWith('/devices')?device:snapshot};}};
 const workflow=load('src/api/crewOfflineWorkflow.ts',{'./client':{apiClient:client},'./crewSafetyWorkflow':{crewReadGuard:guard},'./crewApi':{isCrewResourceId:x=>typeof x==='string'&&/^[a-f0-9-]{36}$/i.test(x),isRepairItemVersion:x=>x===snapshot.taskVersion},'./crewOfflineJournal':journal,'../../modules/roadguard-offline-crypto':{NATIVE_ACCEPTANCE_VERIFIED:true}});
 const taskApi={getFieldInspectionTaskDetailReal:async()=>({data:{id:task,projectId:project,assignedToUserId:old.actor,assignmentId:assignment,version:snapshot.taskVersion,status:'InProgress',mode:'INSPECT_AND_REPAIR',defectId:id()},etag:'etag'}),validateCrewTaskDetail:()=>{},crewTaskFromWire:(_r,d)=>({id:task,projectId:project,detail:d}),isCrewResourceId:x=>typeof x==='string'&&/^[a-f0-9-]{36}$/i.test(x)};
 const api=load('src/api/crewOfflineDevice.ts',{'../utils/uuid':{uuidv4:id},'./client':{apiClient:client},'./crewSafetyWorkflow':{crewReadGuard:guard},'./crewApi':taskApi,'./crewOfflineCrypto':{offlineSigningPublicKey:()=>{}},'./crewOfflineJournal':journal,'./crewOfflineWorkflow':workflow,'../../modules/roadguard-offline-crypto':{offlineNative:{installationId:async()=>deviceId,capability:async()=>({signingUsable:true,agreementUsable:true}),publicKeys:async()=>keys},offlineQaNativeFor:()=>null}});
 const preparation=load('src/api/crewOfflinePreparation.ts',{'./crewOfflineDevice':api,'./crewOfflineWorkflow':workflow,'./crewOfflineJournal':journal,'./crewSafetyWorkflow':{crewReadGuard:guard},'./crewApi':taskApi,'./crewOfflineEditorSource':{retainCrewEditorSource:async()=>{}},'../utils/uuid':{uuidv4:id}});
 const prepare=async(kind)=>{const j=await journal.openOfflineJournal(old);return j.prepare({id:id(),identity:old,projectId:project,path:`/projects/${project}/offline/${kind==='enrollment'?'devices':'snapshots'}`,key:id(),body:JSON.stringify(kind==='enrollment'?{deviceId,...keys}:{deviceRegistrationId:regId,taskId:task}),proof:{kind,taskId:task,assignmentId:assignment,taskVersion:snapshot.taskVersion}});};
 return {api,preparation,journal,workflow,old,owner,project,task,device,snapshot,prepare,calls,close:()=>raw.close(),set current(v){current=v;},set keys(v){keys=v;},set onPost(v){onPost=v;},set onRead(v){onRead=v;}};
}

test('device recovery: old enrollment exact replay, lost response, same receipt readback; generic dispatch still rejects',async()=>{
 const h=interruptedDeviceFixture();try{
  const j=await h.journal.openOfflineJournal(h.old),original=await h.prepare('enrollment');
  let pending=await j.transition(original,'IN_FLIGHT');h.current=h.owner;
  await assert.rejects(h.workflow.dispatchOfflineIntent(pending,h.owner),/session_changed|transition_invalid/);
  h.onPost=()=>{throw Error('response_lost');};
  await assert.rejects(h.api.recoverInterruptedDeviceIntent(pending,h.owner),/response_lost/);
  const current=await h.journal.openOfflineJournal(h.owner);pending=(await current.list())[0];
  assert.equal(pending.phase,'UNKNOWN_OUTCOME');h.onPost=null;
  const done=await h.api.recoverInterruptedDeviceIntent(pending,h.owner);
  assert.equal(done.phase,'RECONCILED');assert.equal(done.identity.scope,h.old.scope);
  assert.equal(done.body,original.body);assert.equal(done.key,original.key);
  const posts=h.calls.filter(c=>c.method==='POST');assert.equal(posts.length,2);
  for(const post of posts){assert.equal(post.path,original.path);assert.equal(post.body,original.body);assert.equal(post.config.headers['Idempotency-Key'],original.key);assert.equal(post.config.transformRequest[0](original.body),original.body);}
  assert.equal((await current.list()).length,1);
 }finally{h.close();}
});

for(const mode of ['received','receipt-in-flight','keys','session-post','session-read','revoked','no-confirm','snapshot'])test(`device recovery fail-closed/readback ${mode}`,async()=>{
 const h=interruptedDeviceFixture();try{
  const j=await h.journal.openOfflineJournal(h.old);let enrollment=await h.prepare('enrollment');
  enrollment=await j.transition(enrollment,'IN_FLIGHT');
  if(mode!=='receipt-in-flight')enrollment=await j.transition(enrollment,'RECEIVED',h.device);
  else enrollment=await j.transition(enrollment,'UNKNOWN_OUTCOME',h.device),enrollment=await j.transition(enrollment,'IN_FLIGHT');
  let record=enrollment;
  if(['revoked','no-confirm','snapshot'].includes(mode)){
   enrollment=await j.transition(enrollment,'RECONCILED',h.device);record=await h.prepare('snapshot');record=await j.transition(record,'IN_FLIGHT');
  }
  h.current=h.owner;
  const current=await h.journal.openOfflineJournal(h.owner);
  if(mode==='snapshot'||mode==='revoked')await current.confirmSession({id:id(),identity:h.owner,projectId:h.project,path:`/projects/${h.project}/offline/devices/${h.device.id}`,key:id(),body:'{}',proof:{kind:'session-confirm',registrationId:h.device.id,snapshotIds:[]}},h.device);
  if(mode==='keys')h.keys={signingPublicKey:'changed',encryptionPublicKey:'enc'};
  if(mode==='revoked')h.device.revokedAt=new Date().toISOString();
  if(mode==='session-post'){
   // UNKNOWN with no receipt must POST, then session change must prevent acknowledgment.
   h.current=h.old;record=await j.transition(enrollment,'IN_FLIGHT');record=await j.transition(record,'UNKNOWN_OUTCOME');h.current=h.owner;
   h.onPost=()=>{h.current={...h.owner,scope:'other'};};
  }
  if(mode==='session-read')h.onRead=()=>{h.current={...h.owner,scope:'other'};};
  if(['keys','session-post','session-read','revoked','no-confirm'].includes(mode))await assert.rejects(h.api.recoverInterruptedDeviceIntent(record,h.owner));
  else {const done=await h.api.recoverInterruptedDeviceIntent(record,h.owner);assert.equal(done.phase,'RECONCILED');assert.equal(done.identity.scope,'old');}
  assert.equal(h.calls.filter(c=>c.method==='POST').length,['snapshot','session-post'].includes(mode)?1:0);
 }finally{h.close();}
});

test('recovery download flow confirms device before old pending snapshot, then confirms recovered snapshot without duplicate',async()=>{
 const h=interruptedDeviceFixture();try{
  const j=await h.journal.openOfflineJournal(h.old);
  let enrollment=await h.prepare('enrollment');enrollment=await j.transition(enrollment,'IN_FLIGHT');enrollment=await j.transition(enrollment,'RECEIVED',h.device);await j.transition(enrollment,'RECONCILED',h.device);
  const snapshot=await h.prepare('snapshot');await j.transition(snapshot,'IN_FLIGHT');h.current=h.owner;
  const result=await h.preparation.recoverAndDownloadCrewOfflineTask(h.owner,h.project,h.task);
  assert.equal(result.snapshot.id,h.snapshot.id);assert.equal(result.editorReady,true);
  const rows=await (await h.journal.openOfflineJournal(h.owner)).list();
  assert.equal(rows.filter(r=>r.proof.kind==='snapshot').length,1);
  assert.equal(rows.find(r=>r.id===snapshot.id).identity.scope,'old');
  assert.ok(rows.find(r=>r.proof.kind==='session-confirm').proof.snapshotIds.includes(snapshot.id));
  assert.equal(h.calls.filter(c=>c.method==='POST').length,1);
 }finally{h.close();}
});
