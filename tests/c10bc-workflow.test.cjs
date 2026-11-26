const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),axios=require('axios'),{randomUUID}=require('node:crypto');
test('admission continuation binds every source identity and signed capture without rewriting the batch',()=>{
 const a=load('src/api/crewOfflineAdmission.ts',new Proxy({},{has:()=>true,get:()=>({})}));
 const identity={actor:randomUUID()},origin=randomUUID(),capture=randomUUID(),source=randomUUID(),registration=randomUUID();
 const op={originId:origin,kind:'FIELD_SUBMISSION',taskId:randomUUID(),assignmentId:randomUUID(),snapshotId:randomUUID(),originalActorId:identity.actor,
  fieldSubmission:{evidence:[{captureOriginId:capture,fileId:null,purpose:'BEFORE',mediaType:'image/jpeg',checksumSha256:'a'.repeat(64),sizeBytes:99}]}};
 const record={identity,projectId:randomUUID(),proof:{sourceBatchId:source,registrationId:registration},body:JSON.stringify({batchId:source,sourceDeviceRegistrationId:registration,operations:[op]}),receipt:{batchId:randomUUID()}};
 const admission={id:randomUUID(),projectId:record.projectId,batchId:record.receipt.batchId,sourceBatchId:source,sourceDeviceRegistrationId:registration,originId:origin,taskId:op.taskId,assignmentId:op.assignmentId,snapshotId:op.snapshotId,originalActorId:identity.actor,currentImporterId:identity.actor,grantId:null,status:'WAITING_UPLOAD',captures:[{captureOriginId:capture,fileId:null,uploadId:null,uploadStatus:'NOT_CREATED',purpose:'BEFORE',mediaType:'image/jpeg',checksumSha256:'a'.repeat(64),declaredSizeBytes:99,sizeBytes:null}]};
 const item={originId:origin,kind:op.kind,admission},before=record.body;
 assert.equal(a.validateAdmissionSource(record,item).operation.originId,origin);
 for(const field of ['projectId','batchId','sourceBatchId','sourceDeviceRegistrationId','originId','taskId','assignmentId','snapshotId','originalActorId','currentImporterId'])assert.throws(()=>a.validateAdmissionSource(record,{...item,admission:{...admission,[field]:randomUUID()}}),/admission/);
 for(const change of [{checksumSha256:'b'.repeat(64)},{declaredSizeBytes:100},{mediaType:'image/png'},{purpose:'AFTER'},{captureOriginId:randomUUID()},{fileId:randomUUID(),uploadId:null}])assert.throws(()=>a.validateAdmissionSource(record,{...item,admission:{...admission,captures:[{...admission.captures[0],...change}]}}),/admission/);
 for(const status of ['CONFLICT','REJECTED','STALE_SNAPSHOT','invented'])assert.throws(()=>a.validateAdmissionSource(record,{...item,admission:{...admission,status}}),/admission/);
 assert.equal(record.body,before);
});
function load(file,deps){const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,{module:m,exports:m.exports,require:n=>{if(!(n in deps))throw Error('unmocked '+n);return deps[n];},Date,URL});return m.exports;}
function setup(native=true){const project=randomUUID(),actor=randomUUID(),scope='session-A';const i={actor,role:'REPAIR_CREW',scope,environment:'http://fixture/api/v1',partition:'fixture'};let current=i,calls=[],error=null,switchDuring=false;
 const guard=x=>{if(x.actor!==current.actor||x.scope!==current.scope||x.role!=='REPAIR_CREW'||x.environment!==current.environment)throw Error('crew_session_changed');};
 const client=axios.create({baseURL:i.environment,adapter:async c=>{calls.push(c);if(switchDuring)current={...i,actor:randomUUID(),scope:'session-B'};if(error)throw error;return {status:200,data:{id:randomUUID()},headers:{},config:c};}});
 const phases=[];const journal={transition:async(r,p,receipt)=>{guard(r.identity);phases.push(p);return {...r,phase:p,...(receipt?{receipt}:{})};}};
 const api={isCrewResourceId:x=>typeof x==='string'&&/^[a-f0-9-]{36}$/i.test(x)&&!/^0+-0+-0+-0+-0+$/.test(x),isRepairItemVersion:x=>['AAAAAAAAB9E=','AAAAAAAAB9I='].includes(x)};
 const deps={'./client':{apiClient:client},'./crewSafetyWorkflow':{crewReadGuard:guard},'./crewApi':api,'./crewOfflineJournal':{openOfflineJournal:async()=>journal},'../../modules/roadguard-offline-crypto':{NATIVE_ACCEPTANCE_VERIFIED:native,offlineQaNativeFor:()=>null}};
 const w=load('src/api/crewOfflineWorkflow.ts',deps);
 const record={schema:1,phase:'PREPARED',id:randomUUID(),identity:i,projectId:project,path:`/projects/${project}/offline/devices`,key:randomUUID(),body:'{"deviceId":"synthetic-only"}',proof:{kind:'enrollment'}};
 return {w,i,project,record,phases,calls,deps,setError:e=>error=e,switchDuring:()=>switchDuring=true,switch:()=>current={...i,scope:'B'}};
}
test('C10BC native acceptance gate denies every POST before journal/network',async()=>{const h=setup(false);await assert.rejects(h.w.dispatchOfflineIntent(h.record),/BLOCKED_NATIVE/);assert.equal(h.calls.length,0);assert.equal(h.phases.length,0);});
test('C10BC offline transport preserves exact bytes and key after UNKNOWN_OUTCOME',async()=>{const h=setup();h.setError(Error('timeout'));await assert.rejects(h.w.dispatchOfflineIntent(h.record),/timeout/);assert.deepEqual(h.phases,['IN_FLIGHT','UNKNOWN_OUTCOME']);h.setError(null);const r=await h.w.dispatchOfflineIntent({...h.record,phase:'UNKNOWN_OUTCOME'});assert.equal(r.phase,'RECEIVED');assert.equal(h.calls[0].data,h.calls[1].data);assert.equal(h.calls[0].headers.get('Idempotency-Key'),h.record.key);assert.equal(h.calls[1].headers.get('Idempotency-Key'),h.record.key);});

test('FIELD sender reads latest durable row and rejects changed bytes or foreign kind before HTTP',async()=>{
 const h=setup();let row={...h.record,proof:{kind:'signed-field-batch'},path:`/projects/${h.project}/offline/sync`},sent=0;
 const module=load('src/offline/crewSignedSync.ts',{'../api/crewOfflineWorkflow':{...h.w,dispatchOfflineIntent:async()=>{sent++;throw Error('transport');}},'../api/crewOfflineJournal':{openOfflineJournal:async()=>({list:async()=>[row]})},'../api/crewSafetyWorkflow':{crewReadGuard:()=>{}},'../api/crewOfflineProtocol':{},'../api/crewOfflineCrypto':{},'../api/crewOfflineDevice':{},'../../modules/roadguard-offline-crypto':{},'../utils/uuid':{}});
 assert.equal(typeof module.sendSignedFieldIntent,'function');
 await assert.rejects(module.sendSignedFieldIntent({...row,body:'altered'}),/source/);assert.equal(sent,0);
 await assert.rejects(module.sendSignedFieldIntent({...row,proof:{kind:'snapshot'}}),/source/);assert.equal(sent,0);
 await assert.rejects(module.sendSignedFieldIntent(row),/transport/);assert.equal(sent,1);
});
for(const status of [401,403,404,409,412,428,429,503])test(`C10BC HTTP ${status} retains uncertain intent without fake ACK`,async()=>{const h=setup();h.setError(Object.assign(Error('http failure'),{response:{status}}));await assert.rejects(h.w.dispatchOfflineIntent(h.record));assert.deepEqual(h.phases,['IN_FLIGHT','UNKNOWN_OUTCOME']);assert.equal(h.calls.length,1);});
test('C10BC actor switch after response cannot write receipt to old/new journal',async()=>{const h=setup();h.switchDuring();await assert.rejects(h.w.dispatchOfflineIntent(h.record),/session/);assert.deepEqual(h.phases,['IN_FLIGHT']);});
test('C10BC old session cannot dispatch or read authenticated resource',async()=>{const h=setup();h.switch();await assert.rejects(h.w.dispatchOfflineIntent(h.record),/session/);await assert.rejects(h.w.readOfflineResource(h.i,h.project,'devices',randomUUID()),/session/);assert.equal(h.calls.length,0);});
test('C10BC whitelist excludes privileged grants/prepare and encrypted handover writes',async()=>{const h=setup();for(const suffix of ['/grants','/packages/prepare','/artifacts','/import','/packages/export'])await assert.rejects(h.w.dispatchOfflineIntent({...h.record,path:`/projects/${h.project}/offline${suffix}`}),/not_admitted/);assert.equal(h.calls.length,0);});
test('C10BC all seven read routes use authenticated Axios instance',async()=>{const h=setup();for(const kind of ['artifacts','batches','devices','grants','origins','packages','snapshots']){const id=randomUUID();await h.w.readOfflineResource(h.i,h.project,kind,id);assert.equal(h.calls.at(-1).url,`/projects/${h.project}/offline/${kind}/${id}`);}assert.equal(h.phases.length,0);});
test('C10BC revoked device/wrong owner and stale snapshot fail closed',()=>{const h=setup(),id=randomUUID(),device={id,deviceId:randomUUID(),actorId:h.i.actor,role:'RepairCrew',revokedAt:null,signingPublicKey:'public',encryptionPublicKey:'public'};h.w.validateDevice(device,h.i,id);for(const change of [{revokedAt:'2026-10-28'}, {actorId:randomUUID()},{role:'Supervisor'}])assert.throws(()=>h.w.validateDevice({...device,...change},h.i,id));assert.throws(()=>h.w.validateSnapshot({},h.i,{id,taskId:randomUUID()}));});
test('C10BC signed receipts never blanket-ACK mixed results or source batch IDs',()=>{const h=setup();const s=load('src/offline/crewSignedSync.ts',{'../api/crewOfflineWorkflow':h.w,'../api/crewOfflineJournal':{},'../api/crewSafetyWorkflow':{},'../api/crewOfflineProtocol':{},'../api/crewOfflineCrypto':{},'../api/crewOfflineDevice':{},'../../modules/roadguard-offline-crypto':{},'../utils/uuid':{}});
 const origin=randomUUID(),server=randomUUID(),item={originId:origin,effectId:origin,canonicalOriginId:origin,kind:'FIELD_START',state:'COMMITTED',durableAcknowledgment:true,serverReceivedAt:'2026-10-28T00:00:00Z'};
 const receipt={batchId:server,items:[item],localQueueInstruction:'KEEP_UNACKNOWLEDGED_OR_CONFLICTED_ITEMS'},record={receipt,proof:{descriptors:[{originId:origin,effectId:origin,kind:'FIELD_START'}]}};
 assert.equal(s.matchBatchReadback(record,receipt),true);
 for(const change of [{state:'PENDING_DEPENDENCY'},{state:'STALE_SNAPSHOT'},{state:'CONFLICT'},{durableAcknowledgment:false},{effectId:randomUUID()},{canonicalOriginId:randomUUID()}])assert.equal(s.matchBatchReadback(record,{...receipt,items:[{...item,...change}]}),false);
 assert.equal(s.matchBatchReadback(record,{...receipt,batchId:randomUUID()}),false);
});

test('C10BC signed FIELD preparation preserves negative zero, freezes source, journals exact signature before POST',async()=>{
 const h=setup(),crypto=require('node:crypto'),p=load('src/api/crewOfflineProtocol.ts',{}),sha=async s=>crypto.createHash('sha256').update(s).digest('hex');
 const device=randomUUID(),registration=randomUUID(),origin=randomUUID(),task=randomUUID(),assignment=randomUUID(),snapshot=randomUUID();let saved=null,signs=0;
 const op={schemaVersion:1,originId:origin,effectId:origin,kind:'FIELD_SUBMISSION',originalActorId:h.i.actor,sourceDeviceId:device,snapshotId:snapshot,taskId:task,assignmentId:assignment,taskVersion:'AAAAAAAAB9E=',corePayloadHash:'0'.repeat(64),dependencies:[],claimedFinishedAt:null,fieldStart:null,repair:null,fieldAction:null,
 fieldSubmission:{originId:origin,startOriginId:randomUUID(),deviceId:device,captureType:'BEFORE',locationProof:{kind:'GPS',longitude:-0,latitude:10}}};
 op.corePayloadHash=await p.fieldCoreHash(op,sha);
 const module=load('src/offline/crewSignedSync.ts',{'./upload-queue':{},'../api/crewSafetyWorkflow':{crewReadGuard:()=>{}},'../api/crewOfflineProtocol':p,'../api/crewOfflineCrypto':{offlineP1363:()=>{}},'../api/crewOfflineDevice':{crewOfflineNative:()=>({publicKeys:async()=>({signingPublicKey:'sign',encryptionPublicKey:'enc'}),signManifest:async()=>{signs++;return 'synthetic-public-signature';},verifyManifest:async()=>true}),inspectOfflineDevice:async()=>{op.fieldSubmission.locationProof.latitude=99;return {deviceId:device,capability:{signingUsable:true,agreementUsable:true}};},deviceBinding:()=> 'bound',readLocalOfflineSources:async()=>({device:{id:registration,deviceId:device,actorId:h.i.actor,role:'RepairCrew',revokedAt:null,signingPublicKey:'sign',encryptionPublicKey:'enc'},snapshots:[{id:snapshot,taskId:task,assignmentId:assignment,originalActorId:h.i.actor,deviceRegistrationId:registration,taskVersion:'AAAAAAAAB9E=',assignmentHash:'a'.repeat(64),contentHash:'b'.repeat(64),snapshot:{source:'server'}}]})},
 '../api/crewOfflineWorkflow':{...h.w,readOfflineResource:async()=>{throw Error('API unreachable: preparation must remain local');}},
 '../../modules/roadguard-offline-crypto':{offlineNative:{publicKeys:async()=>({signingPublicKey:'sign',encryptionPublicKey:'enc'}),signManifest:async()=>{signs++;return 'synthetic-public-signature';},verifyManifest:async()=>true}},'../api/crewOfflineJournal':{openOfflineJournal:async()=>({prepare:async r=>{saved=r;return {...r,phase:'PREPARED'};}})},'../utils/uuid':{uuidv4:randomUUID}});
 const r=await module.prepareSignedFieldBatch(h.i,h.project,registration,[op],sha);assert.equal(r.phase,'PREPARED');assert.match(saved.body,/"longitude":-0/);assert.match(saved.body,/"latitude":10/);assert.equal(signs,1);assert.equal(h.calls.length,0);
 op.originalActorId=randomUUID();await assert.rejects(module.prepareSignedFieldBatch(h.i,h.project,registration,[op],sha),/source/);assert.equal(signs,1);
});

test('REPAIR signer requires actual item version and binding, preserves typed hash',async()=>{
 const h=setup(),crypto=require('node:crypto'),p=load('src/api/crewOfflineProtocol.ts',{}),sha=async s=>crypto.createHash('sha256').update(s).digest('hex');
 const device=randomUUID(),registration=randomUUID(),task=randomUUID(),assignment=randomUUID(),origin=randomUUID(),item=randomUUID();let saved,signs=0;
 const repair={schemaVersion:1,packageId:randomUUID(),itemId:item,bindingId:randomUUID(),itemVersion:'AAAAAAAAB9I=',taskId:task,assignmentId:assignment,crewId:h.i.actor,mode:'Normal',state:'Assigned',executeAuthority:'REVALIDATE_CURRENT_SOURCE_AT_ADMISSION'};
 const snapshot={id:randomUUID(),taskId:task,assignmentId:assignment,originalActorId:h.i.actor,deviceRegistrationId:registration,taskVersion:'AAAAAAAAB9E=',assignmentHash:'a'.repeat(64),contentHash:'b'.repeat(64),snapshot:{repair}};
 const op={schemaVersion:1,originId:origin,effectId:origin,kind:'REPAIR_ASSESSMENT',originalActorId:h.i.actor,sourceDeviceId:device,snapshotId:snapshot.id,taskId:task,assignmentId:assignment,taskVersion:snapshot.taskVersion,dependencies:[],claimedFinishedAt:null,fieldStart:null,fieldSubmission:null,fieldAction:null,repair:{resourceId:item,action:'assessment',assessment:{originId:origin,fieldFirstStartId:randomUUID(),deviceId:device,measurements:[],evidence:[],locationProof:null}}};
 op.corePayloadHash=await p.repairCoreHash(op,sha);
 const native={publicKeys:async()=>({signingPublicKey:'sign',encryptionPublicKey:'enc'}),signManifest:async()=>{signs++;return 'test-only';},verifyManifest:async()=>true};
 const s=load('src/offline/crewSignedSync.ts',{'../api/crewOfflineWorkflow':{...h.w},'../api/crewOfflineProtocol':p,'../api/crewOfflineCrypto':{offlineP1363:()=>{}},'../api/crewSafetyWorkflow':{crewReadGuard:()=>{}},'../api/crewOfflineDevice':{crewOfflineNative:()=>native,inspectOfflineDevice:async()=>({deviceId:device,capability:{signingUsable:true,agreementUsable:true}}),deviceBinding:()=> 'binding',readLocalOfflineSources:async()=>({device:{id:registration,deviceId:device,actorId:h.i.actor,role:'RepairCrew',revokedAt:null,signingPublicKey:'sign',encryptionPublicKey:'enc'},snapshots:[snapshot]})},'../api/crewOfflineJournal':{openOfflineJournal:async()=>({prepare:async r=>{saved=r;return {...r,phase:'PREPARED'};}})},'../../modules/roadguard-offline-crypto':{},'../utils/uuid':{uuidv4:randomUUID}});
 assert.equal(typeof s.prepareSignedRepairBatch,'function');
 await s.prepareSignedRepairBatch(h.i,h.project,registration,[op],sha);assert.equal(signs,1);assert.equal(JSON.parse(saved.body).operations[0].repair.resourceId,item);
 for(const change of [{itemVersion:'task-etag'},{taskId:randomUUID()},{assignmentId:randomUUID()},{crewId:randomUUID()},{itemId:randomUUID()},{bindingId:null},{executeAuthority:null}]){
  snapshot.snapshot.repair={...repair,...change};await assert.rejects(s.prepareSignedRepairBatch(h.i,h.project,registration,[op],sha),/repair.*source/);
 }
 assert.equal(signs,1);snapshot.snapshot.repair=repair;
 const startOrigin=randomUUID(),start={...op,originId:startOrigin,effectId:startOrigin,kind:'FIELD_START',repair:null,fieldStart:{originId:startOrigin,claimedAt:'2026-11-25T00:00:00Z',deviceId:device}};
 start.corePayloadHash=await p.fieldCoreHash(start,sha);
 await s.prepareSignedRepairBatch(h.i,h.project,registration,[start,op],sha);
 assert.equal(saved.proof.fieldStartTaskId,task);

 await assert.rejects(s.prepareSignedFieldBatch(h.i,h.project,registration,[op],sha),/source/);
});

function admissionHarness(){
 const id=randomUUID,i={actor:id(),scope:'session-A',environment:'http://fixture/api/v1',role:'REPAIR_CREW',partition:'A'},project=id(),origin=id(),capture=id(),registration=id(),client=id(),server=id();let active=true,intent=null,sent=[],events=[];
 const op={originId:origin,kind:'FIELD_SUBMISSION',taskId:id(),assignmentId:id(),snapshotId:id(),originalActorId:i.actor,fieldSubmission:{evidence:[{captureOriginId:capture,fileId:null,purpose:'BEFORE',mediaType:'image/png',checksumSha256:'a'.repeat(64),sizeBytes:68}]}};
 const batch={id:id(),identity:i,projectId:project,phase:'RECEIVED',proof:{kind:'signed-field-batch',sourceBatchId:client,registrationId:registration},body:JSON.stringify({batchId:client,sourceDeviceRegistrationId:registration,operations:[op]}),receipt:{batchId:server}};
 const admission={id:id(),projectId:project,batchId:server,sourceBatchId:client,sourceDeviceRegistrationId:registration,originId:origin,taskId:op.taskId,assignmentId:op.assignmentId,snapshotId:op.snapshotId,originalActorId:i.actor,currentImporterId:i.actor,grantId:null,status:'WAITING_UPLOAD',captures:[{captureOriginId:capture,fileId:null,uploadId:null,purpose:'BEFORE',mediaType:'image/png',checksumSha256:'a'.repeat(64),declaredSizeBytes:68,sizeBytes:null}]};
 const item={originId:origin,kind:op.kind,state:'PENDING_DEPENDENCY',code:'evidence_upload_required',durableAcknowledgment:false,admission};
 const c={id:capture,purpose:'BEFORE',mediaType:'image/png',checksum:'a'.repeat(64),size:68,localOnly:true,createKey:id(),offlineUpload:{batchIntentId:batch.id,originId:origin,admissionId:admission.id,createIntentId:id()}};
 const draft={actor:i.actor,scope:i.scope,environment:i.environment,projectId:project,taskId:op.taskId,captures:[c]};
 const guard=()=>{if(!active)throw Error('session_changed');},upload={id:id(),fileId:id(),status:'PENDING',partSizeBytes:100,version:'v1'};
 const runtime={api:{getCrewUploadSession:async uploadId=>{assert.equal(uploadId,upload.id);events.push('session-get');return upload;}},write:async()=>events.push('persist-mapping')};
 const journal={list:async()=>[batch],prepare:async value=>{events.push('prepare');if(intent){assert.equal(value.body,intent.body);assert.equal(value.key,intent.key);return intent;}return intent={...value,phase:'PREPARED'};},transition:async(r,phase)=>{events.push(phase);return intent={...r,phase};}};
 const module=load('src/api/crewOfflineAdmission.ts',{'./crewOfflineJournal':{openOfflineJournal:async()=>journal},'./crewSafetyWorkflow':{crewReadGuard:guard},'../offline/upload-queue':{currentQueueIdentity:()=>i},'./crewFieldDraft':{assertFieldContext:guard},'../utils/uuid':{uuidv4:id},'./crewOfflineWorkflow':{readOfflineResource:async()=>{guard();events.push('origin-get');return item;},dispatchOfflineIntent:async r=>{assert.ok(intent);assert.equal(r.body,intent.body);assert.equal(r.key,c.createKey);events.push('dispatch');sent.push(r);admission.captures[0].uploadId=upload.id;admission.captures[0].fileId=upload.fileId;return intent={...r,phase:'RECEIVED',receipt:upload};}}});
 return {module,draft,c,runtime,upload,item,admission,batch,events,sent,get intent(){return intent;},uncertain:()=>intent={...intent,phase:'IN_FLIGHT'},switch:()=>active=false};
}
test('admission create persists exact body/key and replays uncertain create without changing signed null',async()=>{
 const h=admissionHarness(),bytes=h.batch.body;
 const transport=await h.module.admissionCaptureTransport(h.draft,h.c,h.runtime);
 assert.equal(h.sent.length,0);assert.ok(h.intent);assert.equal(JSON.parse(h.intent.body).admissionId,h.admission.id);
 const first=await transport.create();assert.equal(first.id,h.upload.id);h.uncertain();h.admission.captures[0].uploadId=null;h.admission.captures[0].fileId=null;
 const resumed=await h.module.admissionCaptureTransport(h.draft,h.c,h.runtime);await resumed.create();
 assert.equal(h.sent.length,2);assert.equal(h.sent[0].body,h.sent[1].body);assert.equal(h.sent[0].key,h.sent[1].key);
 assert.ok(h.events.includes('UNKNOWN_OUTCOME'));assert.equal(h.batch.body,bytes);assert.equal(JSON.parse(bytes).operations[0].fieldSubmission.evidence[0].fileId,null);
});
test('admission lost create response restores exact authenticated mapping without another POST',async()=>{
 const h=admissionHarness();h.admission.captures[0].uploadId=h.upload.id;h.admission.captures[0].fileId=h.upload.fileId;
 const transport=await h.module.admissionCaptureTransport(h.draft,h.c,h.runtime);await transport.create();
 assert.equal(h.sent.length,0);assert.equal(h.c.upload.id,h.upload.id);assert.ok(h.events.includes('persist-mapping'));
});
test('admission cached source cannot bypass fresh actor or stale mapping checks',async()=>{
 const h=admissionHarness(),t=await h.module.admissionCaptureTransport(h.draft,h.c,h.runtime);h.switch();
 await assert.rejects(t.create(),/session/);assert.equal(h.sent.length,0);
 const stale=admissionHarness();stale.c.upload={...stale.upload};
 await assert.rejects(stale.module.admissionCaptureTransport(stale.draft,stale.c,stale.runtime),/admission/);assert.equal(stale.sent.length,0);
 const wrongBinding=admissionHarness();wrongBinding.c.offlineUpload.admissionId=crypto.randomUUID();
 await assert.rejects(wrongBinding.module.admissionCaptureTransport(wrongBinding.draft,wrongBinding.c,wrongBinding.runtime),/admission/);assert.equal(wrongBinding.sent.length,0);
});
