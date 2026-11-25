const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),crypto=require('node:crypto');
function load(file,deps={}){if(!fs.existsSync(file))return {};const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:m,exports:m.exports,Date,require:n=>{if(!(n in deps))throw Error('unmocked '+n);return deps[n];}});return m.exports;}
const sha=async s=>crypto.createHash('sha256').update(s).digest('hex'),id=crypto.randomUUID;
function fixture(status='NewAssigned'){
 const identity={actor:id(),role:'REPAIR_CREW',environment:'http://fixture/api/v1',scope:'A',partition:'fixture'},project=id(),task=id(),device=id(),registration=id();
 const snapshot={id:id(),taskId:task,assignmentId:id(),originalActorId:identity.actor,deviceRegistrationId:registration,taskVersion:'AAAAAAAAB9E=',snapshot:{id:task,projectId:project,originalActorId:identity.actor,status,repair:null,location:{}}};snapshot.snapshot.assignmentId=snapshot.assignmentId;
 const protocol=load('src/api/crewOfflineProtocol.ts');let active=true,saved=null,calls=0;
 const rows=[{projectId:project,proof:{kind:'enrollment'},receipt:{id:registration}}];
 const guard=()=>{if(!active)throw Error('session_changed');};
 const module=load('src/api/crewOfflineField.ts',{'./crewFieldDraft':load('src/api/crewFieldDraft.ts',new Proxy({},{has:()=>true,get:()=>({})})),'./crewSafetyWorkflow':{crewReadGuard:guard},'./crewOfflineDevice':{inspectOfflineDevice:async()=>({deviceId:device}),readLocalOfflineSources:async()=>({device:{id:registration},snapshots:[snapshot]})},'./crewOfflineWorkflow':{requireOfflineNativeAcceptance:guard},'./crewOfflineJournal':{openOfflineJournal:async()=>({list:async()=>rows})},'./crewOfflineProtocol':protocol,'../offline/crewSignedSync':{prepareSignedFieldBatch:async(...args)=>{guard();calls++;saved=args;return {phase:'PREPARED',body:await protocol.canonicalOfflineAttached(id(),registration,args[3],'test-only',sha)};}},'../offline/checksum':{generateChecksum:sha},'../utils/uuid':{uuidv4:id}});
 return {module,identity,project,task,snapshot,device,registration,rows,get saved(){return saved;},get calls(){return calls;},switch:()=>active=false};
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
  '../../api/crewOfflineField':{readOfflineFieldTask:async()=>({snapshot:{...h.snapshot,downloadedAt:'2026-11-25T00:00:00Z'},facts:h.snapshot.snapshot}),prepareOfflineFieldStart:async()=>{prepared++;return wait.promise;}},
  '../../api/crewOfflineJournal':{openOfflineJournal:async()=>({list:async()=>[]})}
  ,'../../api/crewOfflinePreparation':{}
 }});ui.render();await ui.flush();assert.equal(prepared,0);
 const first=ui.press('Nhận và bắt đầu offline');ui.press('Nhận và bắt đầu offline');assert.equal(prepared,1);
 wait.resolve({phase:'PREPARED',body:JSON.stringify({operations:[{kind:'FIELD_START',taskId:h.task}]})});await first;await ui.flush();assert.ok(JSON.stringify(ui.nodes()).includes('Chưa gửi tới máy chủ'));assert.ok(!ui.nodes().some(n=>n.type==='Button'&&n.props.title==='Nhận và bắt đầu offline'));ui.unmount();
});

test('offline snapshot signs the persisted draft only after tap and retains one pending submission action',async()=>{
 const {screen,deferred}=require('./helpers/roadfe-screen.cjs'),{h,draft}=submissionFixture(),wait=deferred();let calls=0,read=0;
 const ui=screen('src/components/crew/CrewOfflineFieldTask.tsx',{exportName:'CrewOfflineFieldTask',props:{projectId:h.project,taskId:h.task},modules:{
  '../AppHeader':{AppHeader:'AppHeader'},'../SafeAreaScreen':{SafeAreaScreen:'SafeAreaScreen'},'../Card':{Card:'Card'},'../Button':{Button:'Button'},
  '../../offline/upload-queue':{currentQueueIdentity:()=>h.identity,sameQueueIdentity:()=>true},
  '../../api/crewOfflineField':{readOfflineFieldTask:async()=>({snapshot:{...h.snapshot,downloadedAt:'2026-11-25T00:00:00Z'},facts:h.snapshot.snapshot}),prepareOfflineFieldSubmission:async(...args)=>{calls++;assert.equal(args[3],draft);return wait.promise;}},
  '../../api/crewFieldDraft':{currentFieldContext:()=>draft,openFieldRuntime:async()=>({}),loadFieldDraft:async()=>{read++;return draft;}},
  '../../api/crewOfflineJournal':{openOfflineJournal:async()=>({list:async()=>h.rows.slice(1)})},'../../api/crewOfflinePreparation':{}
 }});ui.render();await ui.flush();assert.equal(calls,0);assert.equal(read,0);
 const first=ui.press('Ký hồ sơ từ nháp đã lưu');ui.press('Ký hồ sơ từ nháp đã lưu');await ui.flush();assert.equal(calls,1);assert.equal(read,1);
 wait.resolve({phase:'PREPARED',body:JSON.stringify({operations:[{kind:'FIELD_SUBMISSION',taskId:h.task}]})});await first;await ui.flush();
 assert.ok(!ui.nodes().some(n=>n.type==='Button'&&n.props.title==='Ký hồ sơ từ nháp đã lưu'));
 ui.press('Mở Đồng bộ');assert.equal(ui.nav.at(-1),'/(crew)/sync');ui.unmount();
});
