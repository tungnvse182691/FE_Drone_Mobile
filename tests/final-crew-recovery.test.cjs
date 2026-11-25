const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),{randomUUID:id}=require('node:crypto');
function load(file,deps={}){const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,{module:m,exports:m.exports,require:n=>deps[n]??{},Date,URL});return m.exports;}
const guid=x=>typeof x==='string'&&/^[a-f0-9-]{36}$/.test(x);
function fixture(kind='FIELD_START'){const actor=id(),project=id(),origin=id(),effect=id(),canonical=id(),batch=id(),task=id(),snapshot=id(),assignment=id(),registration=id();
 const i={actor,role:'REPAIR_CREW',environment:'https://example.test/api/v1',scope:'A'},d={originId:origin,effectId:effect,kind,taskId:task,snapshotId:snapshot,assignmentId:assignment};
 const item={originId:origin,effectId:effect,kind:d.kind,canonicalOriginId:canonical,state:'COMMITTED',durableAcknowledgment:true,serverReceivedAt:'2026-10-28T00:00:00Z'};
 const receipt={batchId:batch,items:[item],localQueueInstruction:'KEEP_UNACKNOWLEDGED_OR_CONFLICTED_ITEMS'};
 const record={id:id(),identity:i,projectId:project,phase:'RECEIVED',path:`/projects/${project}/offline/sync`,key:id(),body:JSON.stringify({batchId:id(),sourceDeviceRegistrationId:registration,operations:[{...d,originalActorId:actor,sourceDeviceId:id(),taskVersion:'AAAAAAAAB9E='}]}),proof:{kind:'signed-field-batch',descriptors:[d]},receipt};
 const phases=[],checkpoints=[],reads=[];let result=receipt,originResult=item;
 const journal={checkpoint:async(r,items)=>{checkpoints.push(items);return {...r,verifiedItems:items};},transition:async(r,phase,v)=>{phases.push(phase);return {...r,phase,receipt:v??r.receipt};}};
 const w=load('src/api/crewOfflineWorkflow.ts',{'./crewApi':{isCrewResourceId:guid,isRepairItemVersion:()=>true}});
 const deps={'../api/crewOfflineWorkflow':{...w,requireOfflineNativeAcceptance:()=>{},readOfflineResource:async(_i,_p,kind,resource)=>{reads.push({kind,resource});return kind==='batches'?result:originResult;}},'../api/crewSafetyWorkflow':{crewReadGuard:()=>{}},'../api/crewOfflineJournal':{openOfflineJournal:async()=>journal},'../utils/uuid':{uuidv4:id}};
 const s=load('src/offline/crewSignedSync.ts',deps);
 return {s,w,record,item,receipt,d,phases,checkpoints,reads,setBatch:v=>result=v,setOrigin:v=>originResult=v,deps};}

for(const status of [404,401,403,503])test(`FIELD recovery ${status} only treats explicit not_found as absent, never ACK`,async()=>{
 const h=fixture();h.record.phase='UNKNOWN_OUTCOME';
 h.deps['../api/crewOfflineWorkflow'].readOfflineResource=async()=>{throw {response:{status,data:{code:'not_found'}}};};
 if(status===404){const r=await h.s.recoverSignedOrigins(h.record);assert.equal(r.phase,'UNKNOWN_OUTCOME');assert.equal(h.checkpoints.length,0);}
 else await assert.rejects(h.s.recoverSignedOrigins(h.record));
 assert.equal(h.phases.length,0);
});
test('FIELD recovery does not treat generic route 404 as absent origin',async()=>{
 const h=fixture();h.record.phase='UNKNOWN_OUTCOME';
 h.deps['../api/crewOfflineWorkflow'].readOfflineResource=async()=>{throw {response:{status:404,data:'Not Found'}};};
 await assert.rejects(h.s.recoverSignedOrigins(h.record));
});
test('FIELD uncertain sender retains partial checkpoints before exact replay',async()=>{
 const h=fixture(),second={...h.d,originId:id(),effectId:id()};h.record.phase='IN_FLIGHT';
 h.record.proof.descriptors.push(second);const body=JSON.parse(h.record.body);body.operations.push({...body.operations[0],...second});h.record.body=JSON.stringify(body);
 let durable=h.record,sent=0;
 h.deps['../api/crewOfflineJournal'].openOfflineJournal=async()=>({list:async()=>[durable],checkpoint:async(r,items)=>durable={...r,verifiedItems:items},transition:async(r,phase)=>{assert.equal(r,durable);return durable={...r,phase};}});
 h.deps['../api/crewOfflineWorkflow'].readOfflineResource=async(_i,_p,_k,origin)=>{if(origin===second.originId)throw {response:{status:404,data:{code:'not_found'}}};return h.item;};
 h.deps['../api/crewOfflineWorkflow'].dispatchOfflineIntent=async r=>{sent++;assert.equal(r.body,h.record.body);assert.equal(r.key,h.record.key);assert.equal(r.verifiedItems[0].originId,h.d.originId);throw Error('replay reached');};
 await assert.rejects(h.s.sendSignedFieldIntent(h.record),/replay reached/);assert.equal(sent,1);
});
test('FINAL canonical origin is server record ID, not input origin; mismatched server record rejected',()=>{const h=fixture();assert.notEqual(h.item.canonicalOriginId,h.item.originId);assert.equal(h.s.matchBatchReadback(h.record,h.receipt),true);assert.equal(h.s.matchBatchReadback(h.record,{...h.receipt,items:[{...h.item,canonicalOriginId:id()}]}),false);});
test('FINAL mixed batch persists only individually verified origin outcomes; no blanket ACK',async()=>{const h=fixture(),second={...h.d,originId:id(),effectId:id()};h.record.proof.descriptors.push(second);const body=JSON.parse(h.record.body);body.operations.push({...body.operations[0],...second});h.record.body=JSON.stringify(body);
 h.record.receipt={...h.receipt,items:[h.item,{...h.item,...second,state:'CONFLICT',durableAcknowledgment:false,canonicalOriginId:null}]};h.setBatch(h.record.receipt);
 const r=await h.s.reconcileSignedBatch(h.record);assert.equal(r.phase,'RECEIVED');assert.equal(r.verifiedItems.length,1);assert.equal(r.verifiedItems[0].originId,h.item.originId);assert.equal(h.phases.length,0);assert.ok(h.reads.some(r=>r.kind==='origins'));});
test('FINAL unknown POST outcome recovers real origin without inventing a server batch ID',async()=>{const h=fixture();delete h.record.receipt;h.record.phase='UNKNOWN_OUTCOME';const r=await h.s.recoverSignedOrigins(h.record);assert.equal(r.phase,'UNKNOWN_OUTCOME');assert.equal(r.verifiedItems.length,1);assert.equal(r.verifiedItems[0].serverBatchId,null);assert.equal(h.phases.length,0);});
test('FINAL origin/effect mismatch cannot be counted as verified',async()=>{const h=fixture();h.setOrigin({...h.item,effectId:id()});await assert.rejects(h.s.reconcileSignedBatch(h.record),/origin_readback/);assert.equal(h.checkpoints.length,0);});
test('FINAL API129 rejects multi-operation batch before journal',async()=>{const h=fixture();h.record.proof.descriptors.push({...h.d,originId:id()});await assert.rejects(h.s.prepareStartReconciliation(h.record,h.d.originId),/field_start_source/);});
test('FINAL device revoke confirms own server resource, keys, project and revocation timestamp',async()=>{const h=fixture(),registration=id(),device=id(),revokedAt='2026-10-28T00:00:00Z';const v={id:registration,projectId:h.record.projectId,actorId:h.record.identity.actor,deviceId:device,role:'RepairCrew',signingPublicKey:'sign',encryptionPublicKey:'enc',revokedAt};let actual=v;
 const a=load('src/api/crewOfflineDevice.ts',{'./crewSafetyWorkflow':{crewReadGuard:()=>{}},'./crewApi':{isCrewResourceId:guid},'./crewOfflineWorkflow':{...h.w,readOfflineResource:async()=>actual},'./crewOfflineJournal':{openOfflineJournal:async()=>({transition:async(r,phase)=>({...r,phase})})}});
 const r={...h.record,path:`/projects/${h.record.projectId}/offline/devices/${registration}/revoke`,body:'{"reason":"Lost"}',proof:{kind:'revocation',registrationId:registration,deviceId:device,signingPublicKey:'sign',encryptionPublicKey:'enc'},receipt:v};
 assert.equal((await a.reconcileDeviceIntent(r)).phase,'RECONCILED');actual={...v,projectId:id()};await assert.rejects(a.reconcileDeviceIntent(r),/revocation/);actual={...v,revokedAt:null};await assert.rejects(a.reconcileDeviceIntent(r),/revocation/);
});

test('FINAL API129 lost response recovers with already-known SERVER batch and exact origin GET',async()=>{
 const h=fixture(),r={...h.record,phase:'UNKNOWN_OUTCOME',path:`/projects/${h.record.projectId}/offline/starts/reconcile`,body:JSON.stringify({batchId:h.receipt.batchId,originId:h.d.originId}),proof:{kind:'start-reconciliation',descriptors:[h.d],serverBatchId:h.receipt.batchId}};delete r.receipt;
 const actual=await h.s.reconcileStartIntent(r);assert.equal(actual.phase,'RECONCILED');assert.equal(actual.verifiedItems[0].serverBatchId,h.receipt.batchId);assert.deepEqual(h.phases,['RECEIVED','RECONCILED']);
});
test('FINAL API129 refuses substituted server batch and tampered receipt canonical ID',async()=>{
 const h=fixture(),r={...h.record,path:`/projects/${h.record.projectId}/offline/starts/reconcile`,body:JSON.stringify({batchId:h.receipt.batchId,originId:h.d.originId}),proof:{kind:'start-reconciliation',descriptors:[h.d],serverBatchId:id()}};
 await assert.rejects(h.s.reconcileStartIntent(r),/field_start_source/);r.proof.serverBatchId=h.receipt.batchId;r.receipt={...h.receipt,items:[{...h.item,canonicalOriginId:id()}]};await assert.rejects(h.s.reconcileStartIntent(r),/batch_readback/);assert.equal(h.phases.length,0);
});
test('FINAL recovery rejects descriptor/body actor or task substitution before network',async()=>{
 const h=fixture();h.record.phase='UNKNOWN_OUTCOME';h.record.proof.descriptors[0].taskId=id();await assert.rejects(h.s.recoverSignedOrigins(h.record),/source_invalid/);assert.equal(h.reads.length,0);
});
test('FINAL partial recovery checkpoints positive origin before later GET failure',async()=>{
 const h=fixture(),d2={...h.d,originId:id(),effectId:id()};h.record.phase='UNKNOWN_OUTCOME';h.record.proof.descriptors.push(d2);const body=JSON.parse(h.record.body);body.operations.push({...body.operations[0],...d2});h.record.body=JSON.stringify(body);
 // API123 supplies no result for the second member; the first must already be persisted.
 await assert.rejects(h.s.recoverSignedOrigins(h.record),/origin_readback/);assert.equal(h.checkpoints.length,1);assert.equal(h.checkpoints[0][0].originId,h.d.originId);assert.equal(h.phases.length,0);
});

for(const kind of ['REPAIR_ASSESSMENT','REPAIR_EXECUTION_START','REPAIR_EXECUTION_FINISH'])test('REPAIR receipt and unknown-outcome recovery require independent origin readback '+kind,async()=>{
 const h=fixture(kind);
 const reconciled=await h.s.reconcileSignedBatch(h.record);
 assert.equal(reconciled.phase,'RECONCILED');assert.equal(reconciled.verifiedItems[0].kind,kind);
 assert.ok(h.reads.some(r=>r.kind==='origins'&&r.resource===h.item.originId));
 const uncertain={...h.record,phase:'UNKNOWN_OUTCOME'};delete uncertain.receipt;
 const recovered=await h.s.recoverSignedOrigins(uncertain);
 assert.equal(recovered.phase,'UNKNOWN_OUTCOME');assert.equal(recovered.verifiedItems[0].serverBatchId,null);
 assert.equal(recovered.body,uncertain.body);assert.equal(recovered.key,uncertain.key);
 h.setOrigin({...h.item,durableAcknowledgment:false});await assert.rejects(h.s.reconcileSignedBatch(h.record),/origin_readback/);
});
