const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {randomUUID}=require('node:crypto');
const {screen:mount}=require('./helpers/roadfe-screen.cjs');

const source=fs.readFileSync('tests/t06b.test.cjs','utf8');
const fixtures=new Function('require',source.split("test('T06B journal")[0]+';return {harness,ids,version,next};')(require);

function supplementContext(h, review='SUPPLEMENT', effective=fixtures.ids.assessment) {
  h.task.repairContext.attempt={attemptId:fixtures.ids.start,effectiveSubmissionId:effective,
    review:review?{reviewId:fixtures.ids.capture,decision:review}:null};
}
function supplementReceipt(h, submission) {
  return {attemptId:fixtures.ids.start,linkId:fixtures.ids.upload,itemId:fixtures.ids.itemId,
    submissionId:submission,reviewClockId:fixtures.ids.file,originalReviewDueAt:'2026-11-07T10:00:00Z',intakeReadiness:'READY'};
}

test('G02B recovery replays the exact API-159 intent after commit lost ACK and API-080 review reset',async()=>{
  const h=fixtures.harness(),j=await h.runtime.journal();
  const revision=fixtures.ids.capture,hash='b'.repeat(64),command=await j.prepare({
    identity:{...h.identity,packageId:fixtures.ids.packageId,itemId:fixtures.ids.itemId,bindingId:fixtures.ids.bindingId,assignmentId:fixtures.ids.assignmentId},
    operation:'supplement',key:'supplement-lost-ack',itemVersion:fixtures.version,
    payload:{fieldSubmissionId:revision,expectedContentHash:hash},
  });
  supplementContext(h,'SUPPLEMENT',fixtures.ids.assessment);
  const calls=[];let first=true,serverReceipt;
  h.runtime.api.supplementRepairAttemptReal=async(...args)=>{
    calls.push(structuredClone(args));
    if(first){
      first=false;
      h.task.repairContext.attempt.effectiveSubmissionId=revision;
      h.task.repairContext.attempt.review=null;
      serverReceipt={etag:`"${fixtures.next}"`,data:supplementReceipt(h,revision)};
      throw Error('timeout-after-server-commit');
    }
    return serverReceipt;
  };
  await assert.rejects(h.workflow.dispatchRepair(h.identity,command.key,h.runtime));
  assert.equal((await j.read(command.key)).phase,'PENDING');
  supplementContext(h,null,revision);
  const done=await h.workflow.dispatchRepair(h.identity,command.key,h.runtime);
  assert.equal(done.phase,'CONFIRMED');
  assert.deepEqual(calls[0],calls[1]);
  assert.equal(calls[0][5],`"${fixtures.version}"`);
  assert.equal(calls[0][6],command.key);
});

test('G02B timeout before server commit keeps the original command pending without receipt',async()=>{
  const h=fixtures.harness(),j=await h.runtime.journal(),command=await j.prepare({
    identity:{...h.identity,packageId:fixtures.ids.packageId,itemId:fixtures.ids.itemId,bindingId:fixtures.ids.bindingId,assignmentId:fixtures.ids.assignmentId},
    operation:'supplement',key:'supplement-before-commit',itemVersion:fixtures.version,
    payload:{fieldSubmissionId:fixtures.ids.capture,expectedContentHash:'a'.repeat(64)},
  });
  supplementContext(h,'SUPPLEMENT',fixtures.ids.assessment);
  let posts=0;h.runtime.api.supplementRepairAttemptReal=async()=>{posts++;throw Error('timeout-before-server-commit');};
  await assert.rejects(h.workflow.dispatchRepair(h.identity,command.key,h.runtime),/timeout-before-server-commit/);
  const pending=await j.read(command.key);assert.equal(posts,1);assert.equal(pending.phase,'PENDING');assert.equal(pending.receipt,undefined);
});

test('G02B unresolved supplement with an unrelated review-null submission stays pending and does not POST',async()=>{
  const h=fixtures.harness(),j=await h.runtime.journal(),command=await j.prepare({
    identity:{...h.identity,packageId:fixtures.ids.packageId,itemId:fixtures.ids.itemId,bindingId:fixtures.ids.bindingId,assignmentId:fixtures.ids.assignmentId},
    operation:'supplement',key:'supplement-uncertain',itemVersion:fixtures.version,
    payload:{fieldSubmissionId:fixtures.ids.capture,expectedContentHash:'c'.repeat(64)},
  });
  supplementContext(h,null,fixtures.ids.file);
  let posts=0;h.runtime.api.supplementRepairAttemptReal=async()=>{posts++;throw Error('must-not-post');};
  await assert.rejects(h.workflow.dispatchRepair(h.identity,command.key,h.runtime),/repair_supplement_not_allowed/);
  assert.equal(posts,0);assert.equal((await j.read(command.key)).phase,'PREPARED');
});

test('G02B journal accepts V2 supplement after V0 attempt/V1 receipt and a second PM revision',async()=>{
  const h=fixtures.harness(),j=await h.runtime.journal();
  const identity={...h.identity,packageId:fixtures.ids.packageId,itemId:fixtures.ids.itemId,bindingId:fixtures.ids.bindingId,assignmentId:fixtures.ids.assignmentId};
  const v0=fixtures.version,v1='AAAAAAAAB9I=',v2='AAAAAAAAB9M=',v3='AAAAAAAAB9Q=',v4='AAAAAAAAB9U=';
  const receipt=(id,extra={})=>({data:{id,itemId:fixtures.ids.itemId,taskId:fixtures.ids.taskId,firstStartId:fixtures.ids.first,...extra},itemVersion:v0});
  const assessment=await j.prepare({identity,operation:'assessment',key:'assessment-history',itemVersion:v0,payload:{fieldFirstStartId:fixtures.ids.first}});
  await j.transition(assessment.key,'PENDING');await j.transition(assessment.key,'ACKNOWLEDGED',{receipt:receipt(fixtures.ids.assessment,{stage:'PRE_EXECUTION',readiness:'READY',missingReasons:[],locationState:'VERIFIED_CHECKLIST',contentHash:'a'.repeat(64),sessionId:fixtures.ids.file}),itemVersion:v0});await j.transition(assessment.key,'CONFIRMED');
  const start=await j.prepare({identity,operation:'start',key:'start-history',itemVersion:v0,payload:{fieldFirstStartId:fixtures.ids.first,assessmentId:fixtures.ids.assessment}});
  await j.transition(start.key,'PENDING');await j.transition(start.key,'ACKNOWLEDGED',{receipt:receipt(fixtures.ids.start,{assessmentId:fixtures.ids.assessment}),itemVersion:v0});await j.transition(start.key,'CONFIRMED');
  const finish=await j.prepare({identity,operation:'finish',key:'finish-history',itemVersion:v0,payload:{executionStartId:fixtures.ids.start}});
  await j.transition(finish.key,'PENDING');await j.transition(finish.key,'ACKNOWLEDGED',{receipt:receipt(fixtures.ids.file,{executionStartId:fixtures.ids.start,syncClockId:fixtures.ids.capture,originalSyncDueAt:'2026-11-07T10:00:00Z',claimedAt:'2026-11-07T09:00:00Z',serverReceivedAt:'2026-11-07T09:00:01Z',timeProvenance:'SERVER_ONLINE'}),itemVersion:v0});await j.transition(finish.key,'CONFIRMED');
  const attempt=await j.prepare({identity,operation:'attempt',key:'attempt-history',itemVersion:v0,payload:{fieldSubmissionId:fixtures.ids.assessment,executionFinishId:fixtures.ids.file,expectedContentHash:'a'.repeat(64)}});
  await j.transition(attempt.key,'PENDING');await j.transition(attempt.key,'ACKNOWLEDGED',{receipt:{data:supplementReceipt(h,fixtures.ids.assessment),itemVersion:v1}});await j.transition(attempt.key,'CONFIRMED');
  const first=await j.prepare({identity,operation:'supplement',key:'supplement-v2',itemVersion:v2,payload:{fieldSubmissionId:fixtures.ids.capture,expectedContentHash:'d'.repeat(64)}});
  assert.equal(first.phase,'PREPARED');await j.transition(first.key,'PENDING');await j.transition(first.key,'ACKNOWLEDGED',{receipt:{data:supplementReceipt(h,fixtures.ids.capture),itemVersion:v3}});await j.transition(first.key,'CONFIRMED');
  const second=await j.prepare({identity,operation:'supplement',key:'supplement-v4',itemVersion:v4,payload:{fieldSubmissionId:fixtures.ids.file,expectedContentHash:'e'.repeat(64)}});
  assert.equal(second.phase,'PREPARED');assert.deepEqual((await j.history()).map(row=>row.operation),['assessment','start','finish','attempt','supplement','supplement']);
  await assert.rejects(j.prepare({...second,key:'supplement-duplicate',payload:{...second.payload}}),/repair_unresolved_command/);
  await j.transition(second.key,'PENDING');await j.transition(second.key,'ACKNOWLEDGED',{receipt:{data:supplementReceipt(h,fixtures.ids.file),itemVersion:v4}});await j.transition(second.key,'CONFIRMED');
  await assert.rejects(j.prepare({identity:{...identity,bindingId:fixtures.ids.first},operation:'supplement',key:'supplement-wrong-parent',itemVersion:v4,payload:{fieldSubmissionId:fixtures.ids.capture,expectedContentHash:'f'.repeat(64)}}),/repair_history_requires_reconciliation/);
});

test('G02B correction screen exposes durable supplement recovery after restart without posting',async()=>{
  const h=fixtures.harness(),i=h.identity;let current=i,posts=0;
  const s=mount('app/(crew)/repair-correction.tsx',{exportName:'CrewRepairRecoveryEntry',props:{task:{id:i.taskId,projectId:i.projectId}},modules:{
    '../../src/components/SafeAreaScreen':{SafeAreaScreen:'SafeAreaScreen'},
    '../../src/components/AppHeader':{AppHeader:'AppHeader'},
    '../../src/components/Card':{Card:'Card'},
    '../../src/components/Button':{Button:'Button'},
    'expo-router':{router:{push:p=>s?.nav?.push(p)},useFocusEffect:fn=>fn()},
    './tasks':{useCrewIdentity:()=>({scope:i.scope,user:{id:i.actor}})},
    '../../src/api/crewRepairDraft':{currentRepairIdentity:()=>current,sameRepairIdentity:(a,b)=>!!b&&a.scope===b.scope&&a.actor===b.actor&&a.taskId===b.taskId&&a.projectId===b.projectId},
    '../../src/api/crewRepairWorkflow':{readRepairHistory:async()=>[{key:'saved-supplement',operation:'supplement',phase:'PENDING',identity:{...i,packageId:fixtures.ids.packageId,itemId:fixtures.ids.itemId,bindingId:fixtures.ids.bindingId,assignmentId:fixtures.ids.assignmentId},itemVersion:fixtures.version,payload:{fieldSubmissionId:fixtures.ids.capture},receipt:undefined}],repairErrorMessage:e=>e.message},
  }});
  s.render();await s.flush();const entry=s.nodes().find(n=>n.type==='Button'&&n.props.title==='Đối soát bổ sung đã lưu');assert.ok(entry);entry.props.onPress();assert.equal(s.nav[0].pathname,'/(crew)/field-review');assert.equal(s.nav[0].params.supplement,'1');assert.equal(posts,0);current=null;s.unmount();
});
