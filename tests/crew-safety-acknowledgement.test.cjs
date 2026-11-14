const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),{randomUUID}=require('node:crypto');
function load(file,deps){const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:m,exports:m.exports,Date,require:n=>deps[n]??{}});return m.exports;}
function fixture(){
 const identity={actor:randomUUID(),role:'REPAIR_CREW',scope:'session',environment:'http://fixture'},resource={projectId:randomUUID(),packageId:randomUUID(),itemId:randomUUID(),measureId:randomUUID()},warningId=randomUUID();
 let record,active=true,failure=null,view={id:resource.measureId,projectId:resource.projectId,responsibleActorId:identity.actor,warnings:[{id:warningId,intendedActorId:identity.actor}],acknowledgements:[]};
 const posts=[],wire=load('src/api/crewSafetyWorkflow.ts',{'./crewApi':{isCrewResourceId:x=>typeof x==='string'&&/^[a-f0-9-]{36}$/i.test(x)}});
 const j={prepare:async i=>record={...i,phase:'PREPARED'},transition:async(r,phase,receipt)=>record={...r,phase,...(receipt?{receipt}:{})}};
 const a=load('src/api/crewSafetyDraft.ts',{'./crewSafetyWorkflow':{...wire,crewReadGuard:()=>{if(!active)throw Error('crew_session_changed');},readSafetyMeasure:async()=>({data:view,etag:'"AAAAAAAAB9E="'})},'./crewOfflineJournal':{openOfflineJournal:async()=>j},'../utils/uuid':{uuidv4:randomUUID},'./client':{apiClient:{post:async(path,body,config)=>{posts.push({path,body,headers:config.headers});if(failure)throw failure;view={...view,acknowledgements:[{id:randomUUID(),warningId,actorId:identity.actor,at:new Date().toISOString(),afterOriginalDue:false}]};return {data:JSON.parse(JSON.stringify(view))};}}}});
 return {a,identity,resource,warningId,posts,get record(){return record;},get view(){return view;},setView:v=>view=v,setFailure:v=>failure=v,setActive:v=>active=v,command:()=>({kind:'acknowledgement',warningId,reason:'QA received simulated warning'})};
}
test('Acknowledgement journals before POST, uses monitoring version and reconciles exact receipt',async()=>{
 const h=fixture(),r=await h.a.prepareSafetyIntent(h.identity,h.resource,h.command());assert.equal(h.posts.length,0);
 const received=await h.a.dispatchSafetyIntent(r);assert.ok(h.posts[0].path.endsWith(`/warnings/${h.warningId}/acknowledgement`));assert.equal(h.posts[0].headers['If-Match'],'"AAAAAAAAB9E="');assert.deepEqual(JSON.parse(h.posts[0].body),{reason:h.command().reason});
 assert.equal((await h.a.reconcileSafetyIntent(received)).phase,'RECONCILED');
 h.setView({...h.view,acknowledgements:h.view.acknowledgements.map(a=>({...a,actorId:randomUUID()}))});await assert.rejects(h.a.reconcileSafetyIntent(received),/safety_ack_readback_mismatch/);
});
test('Acknowledgement rejects missing, wrong actor and already acknowledged warning before journaling',async()=>{
 const h=fixture();h.setView({...h.view,warnings:[]});await assert.rejects(h.a.prepareSafetyIntent(h.identity,h.resource,h.command()),/safety_warning_not_current/);
 h.setView({...h.view,warnings:[{id:h.warningId,intendedActorId:randomUUID()}]});await assert.rejects(h.a.prepareSafetyIntent(h.identity,h.resource,h.command()),/safety_warning_not_current/);
 h.setView({...h.view,warnings:[{id:h.warningId,intendedActorId:h.identity.actor}],acknowledgements:[{warningId:h.warningId}]});await assert.rejects(h.a.prepareSafetyIntent(h.identity,h.resource,h.command()),/safety_warning_not_current/);assert.equal(h.record,undefined);
});
test('Acknowledgement timeout preserves exact replay and account switch blocks transport',async()=>{
 const h=fixture(),r=await h.a.prepareSafetyIntent(h.identity,h.resource,h.command());h.setFailure(Error('timeout'));await assert.rejects(h.a.dispatchSafetyIntent(r));assert.equal(h.record.phase,'UNKNOWN_OUTCOME');
 h.setFailure(null);await h.a.dispatchSafetyIntent(h.record);assert.deepEqual(h.posts[0],h.posts[1]);h.setActive(false);await assert.rejects(h.a.dispatchSafetyIntent(h.record),/session_changed/);assert.equal(h.posts.length,2);
});
test('Acknowledgement rejected by concurrency stays conflict without reconciled receipt',async()=>{
 const h=fixture(),r=await h.a.prepareSafetyIntent(h.identity,h.resource,h.command());h.setFailure({response:{status:409,data:{code:'safety_warning_not_current'}}});await assert.rejects(h.a.dispatchSafetyIntent(r));assert.equal(h.record.phase,'CONFLICT');await assert.rejects(h.a.reconcileSafetyIntent(h.record),/receipt_required/);
});
