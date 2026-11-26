const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),crypto=require('node:crypto');
function load(file,deps={}){if(!fs.existsSync(file))return {};const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:m,exports:m.exports,Date,require:n=>{if(!(n in deps))throw Error('unmocked '+n);return deps[n];}});return m.exports;}
const sha=async s=>crypto.createHash('sha256').update(s).digest('hex'),id=crypto.randomUUID;

function repairFixture(){
 const h=submissionFixture(),ctx={schemaVersion:1,packageId:id(),itemId:id(),bindingId:id(),itemVersion:'AAAAAAAAB9E=',taskId:h.h.task,assignmentId:h.h.snapshot.assignmentId,crewId:h.h.identity.actor,mode:'Normal',state:'Assigned',approvedBy:id(),approvedPlanHash:'a'.repeat(64),proposalPlanHash:'a'.repeat(64),originalCrewFirstStartId:h.origin,currentAssessmentId:null,currentExecutionStartId:null,currentExecutionFinishId:null,executeAuthority:'REVALIDATE_CURRENT_SOURCE_AT_ADMISSION'};
 h.draft.measurements[0].sampleId=id();let saved;
 const validator=load('src/api/crewRepairWorkflow.ts',new Proxy({'./crewApi':{isCrewResourceId:v=>typeof v==='string'&&/^[a-f0-9-]{36}$/.test(v)},'./crewRepairHistory':{timestamp:v=>typeof v==='string'&&Number.isFinite(Date.parse(v))}},{has:()=>true,get:(o,k)=>o[k]??{}}));
 const m=load('src/api/crewOfflineRepair.ts',{'./crewFieldDraft':load('src/api/crewFieldDraft.ts',new Proxy({},{has:()=>true,get:()=>({})})),'./crewOfflineField':{readOfflineCrewTask:async()=>({snapshot:h.h.snapshot,facts:{status:'InProgress',repair:ctx},registrationId:h.h.registration,deviceId:h.h.device})},'./crewOfflineWorkflow':{validateRepairSnapshot:()=>ctx},'./crewSafetyWorkflow':{crewReadGuard:()=>{}},'./crewApi':{isCrewResourceId:v=>typeof v==='string'&&/^[a-f0-9-]{36}$/.test(v)},'./crewRepairWorkflow':validator,'./crewRepairDraft':{repairAssessmentMatchesDraft:()=>true},'./crewOfflineJournal':{openOfflineJournal:async()=>({list:async()=>h.h.rows})},'./crewOfflineProtocol':load('src/api/crewOfflineProtocol.ts'),'../offline/crewSignedSync':{prepareSignedRepairBatch:async(...args)=>{saved=args[3];return {phase:'PREPARED'};}},'../offline/checksum':{generateChecksum:sha},'../utils/uuid':{uuidv4:id}});
 return {...h,ctx,m,get saved(){return saved;}};
}
test('signed REPAIR assessment freezes VERIFIED draft and preserves item identity',async()=>{
 const f=repairFixture();assert.equal(typeof f.m.prepareOfflineRepairAssessment,'function');
 const pending=f.m.prepareOfflineRepairAssessment(f.h.identity,f.h.project,f.h.task,f.draft);f.draft.measurements[0].value=99;
 await pending;const op=f.saved[0];assert.equal(op.kind,'REPAIR_ASSESSMENT');assert.equal(op.repair.resourceId,f.ctx.itemId);assert.equal(op.repair.assessment.measurements[0].value.decimal,'1.25');assert.equal(op.repair.assessment.fieldFirstStartId,f.origin);assert.equal(op.taskVersion,f.h.snapshot.taskVersion);
});
for(const fault of ['unverified','foreign','finish-exists'])test('signed REPAIR assessment rejects '+fault,async()=>{
 const f=repairFixture();assert.equal(typeof f.m.prepareOfflineRepairAssessment,'function');
 if(fault==='unverified')f.draft.captures[0].verified=false;
 if(fault==='foreign')f.draft.actor=id();
 if(fault==='finish-exists')f.ctx.currentExecutionFinishId=id();
 await assert.rejects(f.m.prepareOfflineRepairAssessment(f.h.identity,f.h.project,f.h.task,f.draft));assert.equal(f.saved,undefined);
});
test('signed REPAIR assessment refuses stale assessment and unresolved repair batch',async()=>{
 const stale=repairFixture();stale.ctx.currentAssessmentId=id();
 await assert.rejects(stale.m.prepareOfflineRepairAssessment(stale.h.identity,stale.h.project,stale.h.task,stale.draft));assert.equal(stale.saved,undefined);
 const pending=repairFixture();pending.h.rows.push({identity:pending.h.identity,projectId:pending.h.project,phase:'PREPARED',proof:{kind:'signed-field-batch'},body:JSON.stringify({operations:[{kind:'REPAIR_ASSESSMENT',taskId:pending.h.task,assignmentId:pending.h.snapshot.assignmentId,repair:{resourceId:pending.ctx.itemId}}]})});
 await assert.rejects(pending.m.prepareOfflineRepairAssessment(pending.h.identity,pending.h.project,pending.h.task,pending.draft));assert.equal(pending.saved,undefined);
});
test('signed REPAIR assessment does not sign twice from the same reconciled snapshot',async()=>{
 const f=repairFixture();
 f.h.rows.push({identity:f.h.identity,projectId:f.h.project,phase:'RECONCILED',proof:{kind:'signed-field-batch'},
  body:JSON.stringify({operations:[{kind:'REPAIR_ASSESSMENT',snapshotId:f.h.snapshot.id,taskId:f.h.task,
   assignmentId:f.h.snapshot.assignmentId,repair:{resourceId:f.ctx.itemId}}]})});
 await assert.rejects(f.m.prepareOfflineRepairAssessment(f.h.identity,f.h.project,f.h.task,f.draft),/snapshot_refresh_required/);
 assert.equal(f.saved,undefined);
});
for(const operation of ['start','finish'])test('signed REPAIR '+operation+' refuses absent canonical predecessor',async()=>{
 const f=repairFixture(),fn=operation==='start'?f.m.prepareOfflineRepairStart:f.m.prepareOfflineRepairFinish;assert.equal(typeof fn,'function');
 await assert.rejects(fn(f.h.identity,f.h.project,f.h.task,f.draft));assert.equal(f.saved,undefined);
});
function addReconciledRepair(f,kind,effectId,body,outcome){
 const origin=id(),op={schemaVersion:1,originId:origin,effectId,kind,taskId:f.h.task,assignmentId:f.h.snapshot.assignmentId,originalActorId:f.h.identity.actor,sourceDeviceId:f.h.device,repair:{resourceId:f.ctx.itemId,...body}};
 f.h.rows.push({identity:f.h.identity,projectId:f.h.project,phase:'RECONCILED',proof:{kind:'signed-field-batch',registrationId:f.h.registration,deviceId:f.h.device},body:JSON.stringify({operations:[op]}),verifiedItems:[{originId:origin,effectId,canonicalOriginId:origin,kind,state:'COMMITTED'}],receipt:{items:[{originId:origin,effectId,canonicalOriginId:origin,kind,durableAcknowledgment:true,outcome:{id:effectId,itemId:f.ctx.itemId,taskId:f.h.task,...outcome}}]}});
}
test('signed REPAIR start uses reconciled assessment and current approved source',async()=>{
 const f=repairFixture(),assessmentId=id();f.ctx.currentAssessmentId=assessmentId;
 addReconciledRepair(f,'REPAIR_ASSESSMENT',assessmentId,{assessment:{originId:id(),fieldFirstStartId:f.origin,measurements:f.draft.measurements.map(m=>({...m,value:{decimal:String(m.value)}})),evidence:f.draft.captures.map(c=>({captureOriginId:c.id,fileId:c.upload.fileId,purpose:c.purpose,checksumSha256:c.checksum,mediaType:c.mediaType,capturedAt:c.capturedAt})),locationProof:f.draft.locationProof,deviceId:f.h.device}},{readiness:'READY',stage:'PRE_EXECUTION',firstStartId:f.origin});
 await f.m.prepareOfflineRepairStart(f.h.identity,f.h.project,f.h.task,f.draft);
 assert.equal(f.saved[0].kind,'REPAIR_EXECUTION_START');assert.equal(f.saved[0].repair.start.assessmentId,assessmentId);
});
test('signed REPAIR finish uses reconciled execution start',async()=>{
 const f=repairFixture(),startId=id();f.ctx.state='InProgress';f.ctx.currentExecutionStartId=startId;
 addReconciledRepair(f,'REPAIR_EXECUTION_START',startId,{start:{originId:id(),fieldFirstStartId:f.origin,assessmentId:id(),claimedAt:'2026-11-25T00:00:00Z',deviceId:f.h.device}},{firstStartId:f.origin});
 await f.m.prepareOfflineRepairFinish(f.h.identity,f.h.project,f.h.task);
 assert.equal(f.saved[0].kind,'REPAIR_EXECUTION_FINISH');assert.equal(f.saved[0].repair.finish.executionStartId,startId);
});
function fixture(status='NewAssigned'){
 const identity={actor:id(),role:'REPAIR_CREW',environment:'http://fixture/api/v1',scope:'A',partition:'fixture'},project=id(),task=id(),device=id(),registration=id();
 const snapshot={id:id(),taskId:task,assignmentId:id(),originalActorId:identity.actor,deviceRegistrationId:registration,taskVersion:'AAAAAAAAB9E=',snapshot:{id:task,projectId:project,originalActorId:identity.actor,status,repair:null,location:{}}};snapshot.snapshot.assignmentId=snapshot.assignmentId;
 const protocol=load('src/api/crewOfflineProtocol.ts');let active=true,saved=null,calls=0;
 const rows=[{projectId:project,proof:{kind:'enrollment'},receipt:{id:registration}}];
 const guard=()=>{if(!active)throw Error('session_changed');};
let editorSource=null;
 const module=load('src/api/crewOfflineField.ts',{'./crewFieldDraft':load('src/api/crewFieldDraft.ts',new Proxy({},{has:()=>true,get:()=>({})})),'./crewSafetyWorkflow':{crewReadGuard:guard},'../offline/database':{openDatabase:()=>({getFirstAsync:async()=>editorSource?{payload:JSON.stringify({task:editorSource})}:null}),initDatabase:async()=>{}},'./crewOfflineDevice':{inspectOfflineDevice:async()=>({deviceId:device}),readLocalOfflineSources:async()=>({device:{id:registration},snapshots:[snapshot]})},'./crewOfflineWorkflow':{requireOfflineNativeAcceptance:guard},'./crewOfflineJournal':{openOfflineJournal:async()=>({list:async()=>rows}),sameOfflinePartition:(a,b)=>!!(a&&b&&a.actor===b.actor&&a.environment===b.environment&&a.partition===b.partition&&a.role===b.role)},'./crewOfflineProtocol':protocol,'../offline/crewSignedSync':{prepareSignedFieldBatch:async(...args)=>{guard();calls++;saved=args;return {phase:'PREPARED',body:await protocol.canonicalOfflineAttached(id(),registration,args[3],'test-only',sha)};}},'../offline/checksum':{generateChecksum:sha},'../utils/uuid':{uuidv4:id}});
 return {module,identity,project,task,snapshot,device,registration,rows,setEditor:v=>{editorSource=v;},get saved(){return saved;},get calls(){return calls;},switch:()=>active=false};
}

function submissionFixture(){
 const h=fixture('InProgress'),origin=id();
 const start={originId:origin,effectId:origin,kind:'FIELD_START',taskId:h.task,assignmentId:h.snapshot.assignmentId,originalActorId:h.identity.actor,sourceDeviceId:h.device};
 h.rows.push({identity:h.identity,projectId:h.project,phase:'RECONCILED',proof:{kind:'signed-field-batch',registrationId:h.registration,deviceId:h.device},body:JSON.stringify({operations:[start]}),verifiedItems:[{originId:origin,effectId:origin,canonicalOriginId:origin,kind:'FIELD_START',state:'COMMITTED',serverReceivedAt:'2026-11-25T00:00:00Z'}]});
 const draft={actor:h.identity.actor,scope:h.identity.scope,environment:h.identity.environment,projectId:h.project,taskId:h.task,locationProof:{kind:'GPS',longitude:106.5,latitude:10.5},measurements:[{sampleId:'depth',type:'DepressionDepth',value:1.25,state:'KNOWN',dimension:'LENGTH',unit:'cm',instrument:'ruler',method:'manual',longitude:106.5,latitude:10.5}],captures:[{id:id(),purpose:'BEFORE',checksum:'a'.repeat(64),mediaType:'image/jpeg',verified:true,upload:{id:id(),fileId:id(),status:'VERIFIED'},capturedAt:'2026-11-25T00:00:00Z'}]};
 return {h,draft,origin};
}
test('signed FIELD submission freezes real draft evidence, decimals and verified start lineage',async()=>{
 const {h,draft,origin}=submissionFixture();assert.equal(typeof h.module.prepareOfflineFieldSubmission,'function');
 const pending=h.module.prepareOfflineFieldSubmission(h.identity,h.project,h.task,draft);draft.measurements[0].value=99;draft.captures[0].checksum='b'.repeat(64);
 const saved=await pending,op=h.saved[3][0],body=JSON.parse(saved.body).operations[0];
 assert.equal(op.kind,'FIELD_SUBMISSION');assert.equal(op.fieldSubmission.startOriginId,origin);assert.equal(body.fieldSubmission.measurements[0].value,1.25);assert.equal(body.fieldSubmission.evidence[0].checksumSha256,'a'.repeat(64));assert.equal(body.fieldSubmission.evidence[0].fileId,draft.captures[0].upload.fileId);assert.equal(body.snapshotId,h.snapshot.id);assert.equal(body.fieldSubmission.captureType,'MEASUREMENT');
});
for(const change of ['unverified','foreign-draft','online-command','missing-receipt','foreign-start','repair','supplement','nonfinite','session-switch'])test('signed FIELD submission refuses '+change,async()=>{
 const {h,draft}=submissionFixture();
 if(change==='unverified')draft.captures[0].verified=false;
 if(change==='foreign-draft')draft.scope='other';
 if(change==='online-command')draft.command={key:id()};
 if(change==='missing-receipt')h.rows[1].verifiedItems=[];
 if(change==='foreign-start')h.rows[1].identity={...h.identity,scope:'other'};
 if(change==='repair')draft.repairClaim={};
 if(change==='supplement')draft.supplement={};
 if(change==='nonfinite'){draft.measurements[0].value=NaN;draft.measurements[0].state='UNKNOWN';draft.measurements[0].unknownReason='Chưa đo';}
 if(change==='session-switch'){const pending=h.module.prepareOfflineFieldSubmission(h.identity,h.project,h.task,draft);h.switch();await assert.rejects(pending,/session/);assert.equal(h.calls,0);return;}
 assert.equal(typeof h.module.prepareOfflineFieldSubmission,'function');await assert.rejects(h.module.prepareOfflineFieldSubmission(h.identity,h.project,h.task,draft));assert.equal(h.calls,0);
});
test('FIELD offline exposes an explicit producer from reconciled local snapshots',async()=>{const h=fixture();assert.equal(typeof h.module.prepareOfflineFieldStart,'function');const r=await h.module.prepareOfflineFieldStart(h.identity,h.project,h.task);assert.equal(r.phase,'PREPARED');const ops=h.saved[3];assert.deepEqual(Array.from(ops,x=>x.kind),['FIELD_ACCEPT','FIELD_START']);assert.equal(ops[1].dependencies[0],ops[0].originId);assert.equal(ops[1].fieldStart.originId,ops[1].originId);assert.equal(ops[1].fieldStart.deviceId,h.device);for(const op of ops){assert.equal(op.snapshotId,h.snapshot.id);assert.equal(op.taskVersion,h.snapshot.taskVersion);assert.equal(op.originalActorId,h.identity.actor);assert.equal(op.corePayloadHash,await sha('{"id":"'+h.task+'","input":'+(op.kind==='FIELD_ACCEPT'?r.body.match(/"fieldAction":(\{[^}]+\})/)[1]:JSON.stringify(op.fieldStart)).replace(/\.(\d*?)0+Z"/g,(_,f)=>(f?'.'+f:'')+'Z"').replace(/Z"/g,'+00:00"')+',"originalActorId":"'+h.identity.actor+'"}'));}});
test('accepted snapshot produces only start; never accepts twice',async()=>{const h=fixture('Accepted');assert.equal(typeof h.module.prepareOfflineFieldStart,'function');await h.module.prepareOfflineFieldStart(h.identity,h.project,h.task);assert.equal(h.saved[3].length,1);assert.equal(h.saved[3][0].kind,'FIELD_START');assert.equal(h.saved[3][0].dependencies.length,0);});
for(const state of ['InProgress','Submitted','Completed','SupplementRequired','Cancelled',null,'UNKNOWN'])test('offline start denies unsupported source status '+state,async()=>{const h=fixture(state);assert.equal(typeof h.module.prepareOfflineFieldStart,'function');await assert.rejects(h.module.prepareOfflineFieldStart(h.identity,h.project,h.task));assert.equal(h.calls,0);});
test('offline start refuses changed session before local reads/signing',async()=>{const h=fixture();assert.equal(typeof h.module.prepareOfflineFieldStart,'function');h.switch();await assert.rejects(h.module.prepareOfflineFieldStart(h.identity,h.project,h.task),/session/);assert.equal(h.calls,0);});

test('snapshot screen only prepares after explicit tap and prevents duplicate taps',async()=>{
 const {screen,deferred}=require('./helpers/roadfe-screen.cjs'),h=fixture(),wait=deferred();let prepared=0;
 const ui=screen('src/components/crew/CrewOfflineFieldTask.tsx',{exportName:'CrewOfflineFieldTask',props:{projectId:h.project,taskId:h.task},modules:{
  '../AppHeader':{AppHeader:'AppHeader'},'../SafeAreaScreen':{SafeAreaScreen:'SafeAreaScreen'},'../Card':{Card:'Card'},'../Button':{Button:'Button'},
  '../../offline/upload-queue':{currentQueueIdentity:()=>h.identity,sameQueueIdentity:()=>true},
  '../../api/crewOfflineField':{readOfflineCrewTask:async()=>({snapshot:{...h.snapshot,downloadedAt:'2026-11-25T00:00:00Z'},facts:h.snapshot.snapshot}),recordOfflineFieldStart:async()=>{prepared++;return wait.promise;}},
  '../../api/crewOfflineJournal':{openOfflineJournal:async()=>({list:async()=>[]})}
  ,'../../api/crewOfflinePreparation':{},'../../api/crewFieldDraft':{currentFieldContext:()=>null}
 }});ui.render();await ui.flush();assert.equal(prepared,0);
 const first=ui.press('Nhận và bắt đầu offline');ui.press('Nhận và bắt đầu offline');assert.equal(prepared,1);
 wait.resolve({phase:'PREPARED',body:JSON.stringify({operations:[{kind:'FIELD_START',taskId:h.task}]})});await first;await ui.flush();assert.ok(JSON.stringify(ui.nodes()).includes('chưa gửi tới máy chủ'));assert.ok(!ui.nodes().some(n=>n.type==='Button'&&n.props.title==='Nhận và bắt đầu offline'));ui.unmount();
});

test('offline snapshot can refresh an assigned task before any signed record exists',async()=>{
 const {screen}=require('./helpers/roadfe-screen.cjs'),h=fixture();let downloads=0;
 const source={snapshot:{...h.snapshot,downloadedAt:'2026-11-25T00:00:00Z'},facts:h.snapshot.snapshot};
 const ui=screen('src/components/crew/CrewOfflineFieldTask.tsx',{exportName:'CrewOfflineFieldTask',props:{projectId:h.project,taskId:h.task},modules:{
  '../AppHeader':{AppHeader:'AppHeader'},'../SafeAreaScreen':{SafeAreaScreen:'SafeAreaScreen'},'../Card':{Card:'Card'},'../Button':{Button:'Button'},
  '../../offline/upload-queue':{currentQueueIdentity:()=>h.identity,sameQueueIdentity:()=>true},
  '../../api/crewOfflineField':{readOfflineCrewTask:async()=>source},
  '../../api/crewOfflineJournal':{openOfflineJournal:async()=>({list:async()=>[]})},
  '../../api/crewOfflinePreparation':{downloadCrewOfflineTask:async()=>{downloads++;}}
 }});
 ui.render();await ui.flush();assert.equal(downloads,0);
 assert.ok(ui.nodes().some(n=>n.type==='Button'&&n.props.title==='Tải phiên bản mới'));
 await ui.press('Tải phiên bản mới');await ui.flush();assert.equal(downloads,1);
 assert.ok(JSON.stringify(ui.nodes()).includes('Đã tải và đối soát bản dữ liệu mới'));
 ui.unmount();
});

test('offline snapshot signs the persisted draft only after tap and retains one pending submission action',async()=>{
 const {screen,deferred}=require('./helpers/roadfe-screen.cjs'),{h,draft}=submissionFixture(),wait=deferred();let calls=0,read=0;
 const ui=screen('src/components/crew/CrewOfflineFieldTask.tsx',{exportName:'CrewOfflineFieldTask',props:{projectId:h.project,taskId:h.task},modules:{
  '../AppHeader':{AppHeader:'AppHeader'},'../SafeAreaScreen':{SafeAreaScreen:'SafeAreaScreen'},'../Card':{Card:'Card'},'../Button':{Button:'Button'},
  '../../offline/upload-queue':{currentQueueIdentity:()=>h.identity,sameQueueIdentity:()=>true},
  '../../api/crewOfflineField':{readOfflineCrewTask:async()=>({snapshot:{...h.snapshot,downloadedAt:'2026-11-25T00:00:00Z'},facts:h.snapshot.snapshot}),prepareOfflineFieldSubmission:async(...args)=>{calls++;assert.equal(args[3],draft);return wait.promise;}},
  '../../api/crewFieldDraft':{currentFieldContext:()=>draft,openFieldRuntime:async()=>({}),loadFieldDraft:async()=>{read++;return draft;}},
  '../../api/crewOfflineJournal':{openOfflineJournal:async()=>({list:async()=>h.rows.slice(1)})},'../../api/crewOfflinePreparation':{}
 }});ui.render();await ui.flush();assert.equal(calls,0);assert.equal(read,1);
 const first=ui.press('Ký hồ sơ từ nháp đã lưu');ui.press('Ký hồ sơ từ nháp đã lưu');await ui.flush();assert.equal(calls,1);assert.equal(read,2);
 wait.resolve({phase:'PREPARED',body:JSON.stringify({operations:[{kind:'FIELD_SUBMISSION',taskId:h.task}]})});await first;await ui.flush();
 assert.ok(!ui.nodes().some(n=>n.type==='Button'&&n.props.title==='Ký hồ sơ từ nháp đã lưu'));
 assert.ok(!ui.nodes().some(n=>n.type==='Button'&&n.props.title==='Mở Đồng bộ'));ui.unmount();
});

test('REPAIR snapshot exposes the assessed action and blocks duplicate taps while signing',async()=>{
 const {screen,deferred}=require('./helpers/roadfe-screen.cjs'),f=repairFixture(),wait=deferred();let calls=0;
 const source={snapshot:{...f.h.snapshot,downloadedAt:'2026-11-25T00:00:00Z'},facts:{...f.h.snapshot.snapshot,status:'InProgress',repair:f.ctx}};
 const ui=screen('src/components/crew/CrewOfflineFieldTask.tsx',{exportName:'CrewOfflineFieldTask',props:{projectId:f.h.project,taskId:f.h.task},modules:{
  '../AppHeader':{AppHeader:'AppHeader'},'../SafeAreaScreen':{SafeAreaScreen:'SafeAreaScreen'},'../Card':{Card:'Card'},'../Button':{Button:'Button'},
  '../../offline/upload-queue':{currentQueueIdentity:()=>f.h.identity,sameQueueIdentity:()=>true},
  '../../api/crewOfflineField':{readOfflineCrewTask:async()=>source},
  '../../api/crewOfflineRepair':{prepareOfflineRepairAssessment:async(...args)=>{calls++;assert.equal(args[3],f.draft);return wait.promise;}},
  '../../api/crewFieldDraft':{currentFieldContext:()=>f.draft,openFieldRuntime:async()=>({}),loadFieldDraft:async()=>f.draft},
  '../../api/crewOfflineJournal':{openOfflineJournal:async()=>({list:async()=>[]})},'../../api/crewOfflinePreparation':{}
 }});
 ui.render();await ui.flush();assert.equal(calls,0);
 const first=ui.press('Ký đánh giá hiện trường');ui.press('Ký đánh giá hiện trường');await ui.flush();assert.equal(calls,1);
 wait.resolve({phase:'PREPARED',body:JSON.stringify({operations:[{kind:'REPAIR_ASSESSMENT',taskId:f.h.task}]})});await first;await ui.flush();
 assert.ok(!ui.nodes().some(n=>n.type==='Button'&&n.props.title==='Ký đánh giá hiện trường'));
 assert.ok(JSON.stringify(ui.nodes()).includes('Đã lưu gói ký trên thiết bị'));ui.unmount();
});

for(const kind of ['FIELD','REPAIR'])test('signed '+kind+' preserves sealed local capture with null file and declared size',async()=>{
 const f=kind==='FIELD'?submissionFixture():repairFixture(),h=f.h,c=f.draft.captures[0];
 delete c.upload;c.verified=false;c.localOnly=true;c.size=68;c.uri='file:///original.png';
 c.createKey=id();c.parts=[];c.vault={id:id()};
 if(kind==='FIELD'){
  await h.module.prepareOfflineFieldSubmission(h.identity,h.project,h.task,f.draft);
  const e=h.saved[3][0].fieldSubmission.evidence[0];assert.equal(e.fileId,null);assert.equal(e.sizeBytes,68);
 }else{
  await f.m.prepareOfflineRepairAssessment(h.identity,h.project,h.task,f.draft);
  const e=f.saved[0].repair.assessment.evidence[0];assert.equal(e.fileId,null);assert.equal(e.sizeBytes,68);
 }
});

for(const status of ['NewAssigned','Accepted'])test('same outage FIELD signs dependency chain from persisted physical start '+status,async()=>{
 const f=submissionFixture(),h=f.h;h.rows.pop();h.snapshot.snapshot.status=status;
 await h.module.prepareOfflineFieldStart(h.identity,h.project,h.task);
 const operations=h.saved[3],claimedAt=operations.at(-1).fieldStart.claimedAt;
 f.draft.offlineStart={snapshotId:h.snapshot.id,registrationId:h.registration,deviceId:h.device,operations};
 await h.module.prepareOfflineFieldSubmission(h.identity,h.project,h.task,f.draft);
 const all=h.saved[3],submission=all.at(-1);
 assert.deepEqual(Array.from(all,o=>o.kind),status==='NewAssigned'?['FIELD_ACCEPT','FIELD_START','FIELD_SUBMISSION']:['FIELD_START','FIELD_SUBMISSION']);
 assert.equal(all.at(-2).fieldStart.claimedAt,claimedAt);
 assert.equal(submission.dependencies[0],all.at(-2).originId);
 assert.equal(submission.fieldSubmission.startOriginId,all.at(-2).originId);
 f.draft.offlineStart.operations.at(-1).taskVersion='changed';
 await assert.rejects(h.module.prepareOfflineFieldSubmission(h.identity,h.project,h.task,f.draft),/source_mismatch/);
});

test('cross-session RECONCILED FIELD_START requires session-confirm for same registration',async()=>{
 const f=submissionFixture(),h=f.h,oldStart=h.rows.at(-1);
 oldStart.identity={...h.identity,scope:'sid:previous'};
 await assert.rejects(h.module.prepareOfflineFieldSubmission(h.identity,h.project,h.task,f.draft),/offline_verified_field_start_required/);
 h.rows.push({id:id(),projectId:h.project,phase:'RECONCILED',identity:h.identity,path:`/projects/${h.project}/offline/devices/${h.registration}`,
  proof:{kind:'session-confirm',registrationId:h.registration,confirmedScope:h.identity.scope,snapshotIds:[h.snapshot.id]}});
 await h.module.prepareOfflineFieldSubmission(h.identity,h.project,h.task,f.draft);
 assert.equal(h.saved[3].at(-1).fieldSubmission.startOriginId,f.origin);
});

test('InProgress FIELD signs from matching retained editor firstStartOriginId when journal lacks FIELD_START',async()=>{
 const f=submissionFixture(),h=f.h,editorStart=id();
 h.rows.pop();
 await assert.rejects(h.module.prepareOfflineFieldSubmission(h.identity,h.project,h.task,f.draft),/offline_verified_field_start_required/);
 h.setEditor({detail:{version:'stale',assignmentId:h.snapshot.assignmentId,assignedToUserId:h.identity.actor,status:'InProgress',firstStartOriginId:editorStart}});
 await assert.rejects(h.module.prepareOfflineFieldSubmission(h.identity,h.project,h.task,f.draft),/offline_verified_field_start_required/);
 h.setEditor({detail:{version:h.snapshot.taskVersion,assignmentId:h.snapshot.assignmentId,assignedToUserId:h.identity.actor,status:'InProgress',firstStartOriginId:editorStart}});
 await h.module.prepareOfflineFieldSubmission(h.identity,h.project,h.task,f.draft);
 assert.equal(h.saved[3].at(-1).fieldSubmission.startOriginId,editorStart);
});
