const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function harness(){
 const ids={project:'11111111-1111-4111-8111-111111111111',task:'22222222-2222-4222-8222-222222222222',actor:'33333333-3333-4333-8333-333333333333'};
 const ctx={packageId:'44444444-4444-4444-8444-444444444444',itemId:'55555555-5555-4555-8555-555555555555',bindingId:'66666666-6666-4666-8666-666666666666',itemVersion:'AAAAAAAAB9E='};
 const identity={actor:ids.actor,role:'REPAIR_CREW'},calls=[];
 let valid=true,reads=0;
 const detail={id:ids.task,projectId:ids.project,assignedToUserId:ids.actor,version:'AAAAAAAAB9E=',repairContext:ctx};
 const view={eligible:false,activation:'INELIGIBLE',itemId:ctx.itemId,bindingId:ctx.bindingId,policyRevisionId:null,policyContentHash:null,policyState:'UNAVAILABLE',missingReasons:['ASSESSMENT_REQUIRED'],version:'h4-eligibility-v1-'+ 'a'.repeat(64)};
 const api={validateCrewTaskDetail:()=>calls.push('validate-task'),validateFastTrackRepairContext:()=>calls.push('validate-context'),
 getFieldInspectionTaskDetailReal:async()=>{calls.push('task');reads++;return {data:structuredClone(detail),etag:'"AAAAAAAAB9E="'};},
 getRepairEligibilityReal:async(...args)=>{calls.push(['eligibility',...args]);return {data:structuredClone(view),etag:'"'+view.version+'"'};}};
 const module={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/crewFastTrackEligibility.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,
 {module,exports:module.exports,require:n=>n==='./crewApi'?api:{crewReadGuard:()=>{if(!valid)throw Error('crew_session_changed');}}});
 return {m:module.exports,ids,ctx,identity,detail,view,calls,api,switch:()=>valid=false,read:()=>module.exports.readAssignedFastTrackEligibility(identity,ids.project,ids.task)};
}
test('FT reads eligibility only from validated current task and returns server reasons unchanged',async()=>{
 const h=harness(),r=await h.read();assert.equal(r.eligibility.eligible,false);assert.equal(r.eligibility.missingReasons[0],'ASSESSMENT_REQUIRED');
 assert.deepEqual(h.calls.find(x=>Array.isArray(x)),['eligibility',h.ids.project,h.ctx.packageId,h.ctx.itemId]);
 assert.equal(h.calls.filter(x=>x==='task').length,2);assert.equal(r.itemVersion,h.ctx.itemVersion);assert.notEqual(r.itemVersion,r.eligibility.version);
});
for(const field of ['itemId','bindingId'])test('FT rejects eligibility for another '+field,async()=>{
 const h=harness();h.view[field]='other';await assert.rejects(h.read,/fasttrack_eligibility_invalid/);
});
test('FT rejects inconsistent eligible flag and missing reasons',async()=>{const h=harness();h.view.eligible=true;h.view.activation='ELIGIBLE';await assert.rejects(h.read,/fasttrack_eligibility_invalid/);});
test('FT rejects unsupported eligibility version',async()=>{const h=harness();h.view.version=h.ctx.itemVersion;await assert.rejects(h.read,/fasttrack_eligibility_invalid/);});
test('FT actor change during eligibility read discards result',async()=>{const h=harness(),get=h.api.getRepairEligibilityReal;h.api.getRepairEligibilityReal=async(...args)=>{const r=await get(...args);h.switch();return r;};await assert.rejects(h.read,/crew_session_changed/);});
test('FT binding change during eligibility read discards result',async()=>{const h=harness(),get=h.api.getRepairEligibilityReal;h.api.getRepairEligibilityReal=async(...args)=>{const r=await get(...args);h.detail.repairContext={...h.ctx,bindingId:'changed'};return r;};await assert.rejects(h.read,/crew_task_changed/);});
test('FT missing bootstrap never requests eligibility',async()=>{const h=harness();h.api.validateFastTrackRepairContext=()=>{throw Error('fasttrack_context_missing');};await assert.rejects(h.read,/fasttrack_context_missing/);assert.ok(!h.calls.some(x=>Array.isArray(x)));});
