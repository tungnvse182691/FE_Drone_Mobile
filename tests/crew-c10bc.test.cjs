const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),{randomUUID}=require('node:crypto');
function load(file,deps={}) {const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,{module:m,exports:m.exports,require:n=>deps[n]??(n==='axios'?require('axios'):{}),Date,URL,Uint8Array});return m.exports;}
const project=randomUUID(),task=randomUUID(),actor=randomUUID(),version='AAAAAAAAB9E=';
test('C10BC geometry/history real transport paths and response contracts',async()=>{
 const calls=[];const a=load('src/api/crewApi.ts',{'./client':{apiClient:{get:async path=>{calls.push(path);return {data:path.endsWith('geometry')?{schemaVersion:1,taskId:task,projectId:project,segments:[],route:{wkt:'LINESTRING EMPTY',spatialSrid:4326}}:{assignments:[],events:[]},headers:{etag:`"${version}"`}};}}}});
 assert.equal(typeof a.getFieldTaskGeometryReal,'function');await a.getFieldTaskGeometryReal(project,task);await a.getFieldTaskHistoryReal(project,task);
 assert.deepEqual(calls,[`/projects/${project}/field-inspection-tasks/${task}/geometry`,`/projects/${project}/field-inspection-tasks/${task}/history`]);
 await assert.rejects(a.getFieldTaskGeometryReal('fake',task));
});
test('C10BC assigned read refuses account switch and stale geometry version',async()=>{
 let current={actor,role:'REPAIR_CREW',scope:'session',environment:'http://fixture',partition:'crew'};
 const identity={...current};let switched=false;
 const detail={id:task,projectId:project,assignedToUserId:actor,version,assignmentId:randomUUID(),routeVersionId:randomUUID(),segmentSetId:null,layoutRevisionId:null,slabId:null,mapPublicationId:null,crsProfileRevisionId:null};
 const a=load('src/api/crewSafetyWorkflow.ts',{'../offline/upload-queue':{currentQueueIdentity:()=>current,sameQueueIdentity:(i)=>JSON.stringify(i)===JSON.stringify(current)},'./crewApi':{validateCrewTaskDetail:()=>{},getFieldInspectionTaskDetailReal:async()=>({data:detail,etag:`"${version}"`}),getFieldTaskGeometryReal:async()=>{if(switched)current={...current,actor:randomUUID()};return {data:{...detail,taskId:task,schemaVersion:1},etag:'"stale"'};},getFieldTaskHistoryReal:async()=>({assignments:[],events:[]})}});
 assert.equal(typeof a.readAssignedFieldFacts,'function');await assert.rejects(a.readAssignedFieldFacts(identity,project,task),/geometry_source_changed/);
 switched=true;await assert.rejects(a.readAssignedFieldFacts(identity,project,task),/session_changed/);
});

test('C10BC unavailable geometry does not suppress authorized empty history',async()=>{
 const i={actor,role:'REPAIR_CREW'},detail={assignmentId:randomUUID()};let history=0;
 const a=load('src/api/crewSafetyWorkflow.ts',{'../offline/upload-queue':{sameQueueIdentity:()=>true},'./crewApi':{
 validateCrewTaskDetail:()=>{},getFieldInspectionTaskDetailReal:async()=>({data:detail,etag:'same'}),
 getFieldTaskGeometryReal:async()=>{throw {response:{status:409}};},getFieldTaskHistoryReal:async()=>{history++;return {events:[],assignments:[]};}}});
 const r=await a.readAssignedFieldFacts(i,project,task);assert.equal(r.geometry,null);assert.equal(r.geometryUnavailable,true);assert.equal(r.history.events.length,0);assert.equal(history,1);
});
test('C10BC safety accepts monitoring ETag only, rejects wrong responsible actor',async()=>{
 let body={id:randomUUID(),projectId:project,responsibleActorId:actor,version,checks:[],warnings:[],acknowledgements:[]},tag=`"${version}"`;
 const i={actor,role:'REPAIR_CREW'},r={projectId:project,packageId:randomUUID(),itemId:randomUUID(),measureId:body.id},calls=[];
 const a=load('src/api/crewSafetyWorkflow.ts',{'../offline/upload-queue':{sameQueueIdentity:()=>true},'./crewApi':{isCrewResourceId:x=>/^[a-f0-9-]{36}$/.test(x),isRepairItemVersion:x=>x===version},'./client':{apiClient:{get:async p=>{calls.push(p);return {data:body,headers:{etag:tag}};}}}});
 assert.equal((await a.readSafetyMeasure(i,r)).etag,tag);assert.ok(calls[0].endsWith('/safety-measures/'+r.measureId));
 tag='"task-version"';await assert.rejects(a.readSafetyMeasure(i,r),/invalid/);tag=`"${version}"`;body={...body,responsibleActorId:randomUUID()};await assert.rejects(a.readSafetyMeasure(i,r),/invalid/);
});
test('C10BC safety DTO validates exact kinds, evidence-link IDs, dates and warning source',()=>{
 const a=load('src/api/crewSafetyWorkflow.ts',{'./crewApi':{isCrewResourceId:x=>typeof x==='string'&&/^[a-f0-9-]{36}$/.test(x)}}),r={projectId:project,packageId:randomUUID(),itemId:randomUUID(),measureId:randomUUID()};
 assert.equal(a.safetyRequest(r,{kind:'review-request',reason:'Please review'}).path.endsWith('/review-requests'),true);
 assert.equal(a.safetyRequest(r,{kind:'installation',firstCheckDueAt:'2026-10-29T10:00:00Z',reason:'Installed'}).body.reason,'Installed');
 assert.throws(()=>a.safetyRequest(r,{kind:'installation',firstCheckDueAt:'invalid',reason:'x'}));
 assert.throws(()=>a.safetyRequest(r,{kind:'check',result:'Safe',findings:'x',evidenceIds:[]}));
 const id=randomUUID();assert.throws(()=>a.safetyRequest(r,{kind:'check',result:'Safe',findings:'x',evidenceIds:[id,id]}));
 assert.throws(()=>a.safetyRequest(r,{kind:'acknowledgement',warningId:'fake',reason:'x'}));
});

test('C10BC safety source gaps and fixture gate never POST or prepare a substitute command',async()=>{
 let writes=0;
 const a=load('src/api/crewSafetyDraft.ts',{'./crewSafetyWorkflow':{crewReadGuard:()=>{}},'./client':{apiClient:{post:async()=>writes++}},'./crewOfflineJournal':{openOfflineJournal:async()=>{writes++;}}});
 await assert.rejects(a.prepareSafetyIntent({}, {}, {kind:'review-request'}),/READBACK_GAP/);
 await assert.rejects(a.prepareSafetyIntent({}, {}, {kind:'check'}),/BE_EVIDENCE_LINK_SOURCE_GAP/);
 await assert.rejects(a.dispatchSafetyIntent({identity:{}}),/BE_FIXTURE_BLOCKED/);
 assert.equal(writes,0);
});

test('C10BC safety acknowledgement requires matching server readback before reconciliation',async()=>{
 const i={actor},r={projectId:project,measureId:randomUUID()},warningId=randomUUID(),ackId=randomUUID();
 const command={kind:'acknowledgement',warningId,reason:'Read'},body={warningId,reason:'Read'};
 let transitions=0,actual={acknowledgements:[]};
 const record={identity:i,phase:'RECEIVED',projectId:project,path:'/safe',body:JSON.stringify(body),proof:{kind:'safety',resource:r,command},receipt:{id:r.measureId,responsibleActorId:actor,acknowledgements:[{id:ackId,warningId,actorId:actor}]}};
 const a=load('src/api/crewSafetyDraft.ts',{'./crewSafetyWorkflow':{crewReadGuard:()=>{},safetyRequest:()=>({path:'/safe',body}),readSafetyMeasure:async()=>({data:actual})},'./crewOfflineJournal':{openOfflineJournal:async()=>({transition:async(rec,phase)=>{transitions++;assert.equal(phase,'RECONCILED');return {...rec,phase};}})}});
 await assert.rejects(a.reconcileSafetyIntent(record),/readback_mismatch/);assert.equal(transitions,0);
 actual={acknowledgements:[{id:ackId,warningId,actorId:actor}]};assert.equal((await a.reconcileSafetyIntent(record)).phase,'RECONCILED');
 actual={acknowledgements:[{id:ackId,warningId,actorId:randomUUID()}]};await assert.rejects(a.reconcileSafetyIntent(record),/readback_mismatch/);assert.equal(transitions,1);
});
