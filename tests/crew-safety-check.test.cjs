const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),{randomUUID}=require('node:crypto');
function load(file,deps){const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:m,exports:m.exports,Date,require:n=>deps[n]??{}});return m.exports;}
function fixture(){
 const identity={actor:randomUUID(),role:'REPAIR_CREW',scope:'session',environment:'http://fixture'},resource={projectId:randomUUID(),packageId:randomUUID(),itemId:randomUUID(),measureId:randomUUID()};
 const link=randomUUID(),file=randomUUID();let record,active=true,failure=null;
 let view={id:resource.measureId,projectId:resource.projectId,responsibleActorId:identity.actor,installedAt:new Date().toISOString(),checks:[],warnings:[],acknowledgements:[],eligibleEvidenceLinks:[{evidenceLinkId:link,fileId:file}]};
 const posts=[],wire=load('src/api/crewSafetyWorkflow.ts',{'./crewApi':{isCrewResourceId:x=>typeof x==='string'&&/^[a-f0-9-]{36}$/i.test(x)}});
 const j={prepare:async i=>record={...i,phase:'PREPARED'},transition:async(r,phase,receipt)=>record={...r,phase,...(receipt?{receipt}:{})}};
 const a=load('src/api/crewSafetyDraft.ts',{'./crewSafetyWorkflow':{...wire,crewReadGuard:()=>{if(!active)throw Error('crew_session_changed');},readSafetyMeasure:async()=>({data:view,etag:'"AAAAAAAAB9E="'})},'./crewOfflineJournal':{openOfflineJournal:async()=>j},'../utils/uuid':{uuidv4:randomUUID},'./client':{apiClient:{post:async(path,body,config)=>{posts.push({path,body,headers:config.headers});if(failure)throw failure;const c=JSON.parse(body);view={...view,checks:[...view.checks,{id:randomUUID(),actorId:identity.actor,at:new Date().toISOString(),result:c.result,findings:c.findings,evidenceLinkIds:c.evidenceIds}]};return {data:JSON.parse(JSON.stringify(view))};}}}});
 return {a,identity,resource,link,file,posts,get record(){return record;},get view(){return view;},setView:v=>view=v,setFailure:v=>failure=v,setActive:v=>active=v,command:()=>({kind:'check',result:'Safe',findings:'QA barriers intact',evidenceIds:[link]})};
}
test('Safety check requires installed state and current eligible distinct files before journaling',async()=>{
 const h=fixture();h.setView({...h.view,installedAt:null});await assert.rejects(h.a.prepareSafetyIntent(h.identity,h.resource,h.command()),/safety_installation_required/);
 h.setView({...h.view,installedAt:new Date().toISOString()});await assert.rejects(h.a.prepareSafetyIntent(h.identity,h.resource,{...h.command(),evidenceIds:[randomUUID()]}),/safety_evidence_not_current/);
 const second=randomUUID();h.setView({...h.view,eligibleEvidenceLinks:[...h.view.eligibleEvidenceLinks,{evidenceLinkId:second,fileId:h.file}]});
 await assert.rejects(h.a.prepareSafetyIntent(h.identity,h.resource,{...h.command(),evidenceIds:[h.link,second]}),/safety_duplicate_file/);assert.equal(h.record,undefined);
});
test('Safety check journals immutable monitoring version and verifies exact new check readback',async()=>{
 const h=fixture(),prepared=await h.a.prepareSafetyIntent(h.identity,h.resource,h.command());assert.equal(h.posts.length,0);
 const received=await h.a.dispatchSafetyIntent(prepared);assert.ok(h.posts[0].path.endsWith('/checks'));assert.equal(h.posts[0].headers['If-Match'],'"AAAAAAAAB9E="');
 assert.equal((await h.a.reconcileSafetyIntent(received)).phase,'RECONCILED');
 h.setView({...h.view,checks:h.view.checks.map(c=>({...c,evidenceLinkIds:[randomUUID()]}))});await assert.rejects(h.a.reconcileSafetyIntent(received),/safety_check_readback_mismatch/);
});
test('Safety check cannot reconcile an older matching check or another actor',async()=>{
 const h=fixture(),old={id:randomUUID(),actorId:h.identity.actor,at:new Date().toISOString(),result:'Safe',findings:h.command().findings,evidenceLinkIds:[h.link]};h.setView({...h.view,checks:[old]});
 const prepared=await h.a.prepareSafetyIntent(h.identity,h.resource,h.command()),received=await h.a.dispatchSafetyIntent(prepared);
 const forged={...received,receipt:{...received.receipt,checks:[old]}};await assert.rejects(h.a.reconcileSafetyIntent(forged),/safety_check_readback_mismatch/);
 h.setView({...h.view,checks:h.view.checks.map(c=>({...c,actorId:randomUUID()}))});await assert.rejects(h.a.reconcileSafetyIntent(received),/safety_check_readback_mismatch/);
});
test('Safety check timeout retry retains bytes/key/version and rejects changed session',async()=>{
 const h=fixture(),r=await h.a.prepareSafetyIntent(h.identity,h.resource,h.command());h.setFailure(Error('timeout'));await assert.rejects(h.a.dispatchSafetyIntent(r));assert.equal(h.record.phase,'UNKNOWN_OUTCOME');
 h.setFailure(null);await h.a.dispatchSafetyIntent(h.record);assert.deepEqual(h.posts[0],h.posts[1]);h.setActive(false);await assert.rejects(h.a.dispatchSafetyIntent(h.record),/session_changed/);assert.equal(h.posts.length,2);
});
