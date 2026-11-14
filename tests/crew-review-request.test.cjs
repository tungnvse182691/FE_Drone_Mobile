const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),{randomUUID}=require('node:crypto');
function load(file,deps){const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:m,exports:m.exports,Date,require:n=>deps[n]??{}});return m.exports;}
function fixture(){
 const identity={actor:randomUUID(),role:'REPAIR_CREW',scope:'session',environment:'http://fixture'},resource={projectId:randomUUID(),taskId:randomUUID(),packageId:randomUUID(),itemId:randomUUID()};
 let active=true,record,failure=null,context={...resource,bindingId:randomUUID(),itemVersion:'AAAAAAAAB9E=',finalDecision:{decisionId:randomUUID(),result:'CONFIRMED',at:new Date().toISOString()},reviewRequests:[]};
 const posts=[],detail=()=>({id:resource.taskId,projectId:resource.projectId,assignmentId:'assigned',repairContext:context});
 const journal={prepare:async i=>record={...i,phase:'PREPARED'},transition:async(r,phase,receipt)=>record={...r,phase,...(receipt?{receipt}:{})}};
 const a=load('src/api/crewReviewRequest.ts',{'./crewApi':{isCrewResourceId:x=>typeof x==='string'&&/^[a-f0-9-]{36}$/i.test(x),isRepairItemVersion:x=>x==='AAAAAAAAB9E=',getFieldInspectionTaskDetailReal:async()=>({data:detail(),etag:'"task-version"'}),validateCrewTaskDetail:()=>{}},'./crewSafetyWorkflow':{crewReadGuard:()=>{if(!active)throw Error('crew_session_changed');}},'./crewOfflineJournal':{openOfflineJournal:async()=>journal},'../utils/uuid':{uuidv4:randomUUID},'./client':{apiClient:{post:async(path,body,config)=>{posts.push({path,body,headers:config.headers});if(failure)throw failure;const receipt={id:randomUUID(),itemId:resource.itemId,decisionId:context.finalDecision.decisionId,actorId:identity.actor,role:'RepairCrew',reason:JSON.parse(body).reason,at:new Date().toISOString(),version:context.itemVersion};context={...context,reviewRequests:[{requestId:receipt.id,decisionId:receipt.decisionId,reason:receipt.reason,at:receipt.at}]};return {data:receipt};}}}});
 return {a,identity,resource,posts,get context(){return context;},setContext:v=>context=v,setFailure:v=>failure=v,setActive:v=>active=v,get record(){return record;}};
}
test('Review request uses item version and reconciles receipt id with own API080 history',async()=>{
 const h=fixture(),r=await h.a.prepareReviewRequest(h.identity,h.resource,h.context.finalDecision.decisionId,'QA review requested');assert.equal(h.posts.length,0);
 const received=await h.a.dispatchReviewRequest(r);assert.equal(h.posts[0].headers['If-Match'],'"AAAAAAAAB9E="');assert.ok(h.posts[0].path.endsWith('/review-requests'));
 assert.equal((await h.a.reconcileReviewRequest(received)).phase,'RECONCILED');
 h.setContext({...h.context,reviewRequests:[]});await assert.rejects(h.a.reconcileReviewRequest(received),/readback_mismatch/);
});
test('Review request refuses changed decision and binding without preparing a command',async()=>{
 const h=fixture(),id=h.context.finalDecision.decisionId;h.setContext({...h.context,finalDecision:{...h.context.finalDecision,decisionId:randomUUID()}});
 await assert.rejects(h.a.prepareReviewRequest(h.identity,h.resource,id,'QA reason'),/decision_changed/);assert.equal(h.record,undefined);
 h.setContext({...h.context,itemId:randomUUID()});await assert.rejects(h.a.prepareReviewRequest(h.identity,h.resource,id,'QA reason'),/source_changed/);
});
test('Review timeout keeps exact payload, key and version; account switch blocks replay',async()=>{
 const h=fixture(),r=await h.a.prepareReviewRequest(h.identity,h.resource,h.context.finalDecision.decisionId,'QA reason');h.setFailure(Error('timeout'));
 await assert.rejects(h.a.dispatchReviewRequest(r));assert.equal(h.record.phase,'UNKNOWN_OUTCOME');h.setFailure(null);await h.a.dispatchReviewRequest(h.record);assert.deepEqual(h.posts[0],h.posts[1]);
 h.setActive(false);await assert.rejects(h.a.dispatchReviewRequest(h.record),/session_changed/);assert.equal(h.posts.length,2);
});
test('Review history remains attached to original decision after correction; forged actor is rejected',async()=>{
 const h=fixture(),r=await h.a.prepareReviewRequest(h.identity,h.resource,h.context.finalDecision.decisionId,'QA reason'),received=await h.a.dispatchReviewRequest(r);
 h.setContext({...h.context,finalDecision:{...h.context.finalDecision,decisionId:randomUUID()}});assert.equal((await h.a.reconcileReviewRequest(received)).phase,'RECONCILED');
 await assert.rejects(h.a.reconcileReviewRequest({...received,receipt:{...received.receipt,actorId:randomUUID()}}),/receipt_invalid/);
});
