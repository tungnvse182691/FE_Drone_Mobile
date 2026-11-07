const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {randomUUID}=require('node:crypto');

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
  const calls=[];let first=true;
  h.runtime.api.supplementRepairAttemptReal=async(...args)=>{
    calls.push(structuredClone(args));
    if(first){first=false;throw Error('timeout');}
    h.task.repairContext.attempt.effectiveSubmissionId=revision;
    h.task.repairContext.attempt.review=null;
    return {etag:`"${fixtures.next}"`,data:supplementReceipt(h,revision)};
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

test('G02B journal allows a new supplement after a confirmed repair record without replacing history',async()=>{
  const h=fixtures.harness(),j=await h.runtime.journal();
  const previous=await j.prepare({identity:{...h.identity,packageId:fixtures.ids.packageId,itemId:fixtures.ids.itemId,bindingId:fixtures.ids.bindingId,assignmentId:fixtures.ids.assignmentId},
    operation:'supplement',key:'supplement-history',itemVersion:fixtures.version,
    payload:{fieldSubmissionId:fixtures.ids.assessment,parentSubmissionId:fixtures.ids.assessment,expectedContentHash:'a'.repeat(64)}});
  await j.transition(previous.key,'PENDING');
  await j.transition(previous.key,'ACKNOWLEDGED',{receipt:{data:supplementReceipt(h,fixtures.ids.assessment),itemVersion:fixtures.version}});
  await j.transition(previous.key,'CONFIRMED');
  supplementContext(h,'SUPPLEMENT',fixtures.ids.assessment);
  const next=await j.prepare({identity:{...h.identity,packageId:fixtures.ids.packageId,itemId:fixtures.ids.itemId,bindingId:fixtures.ids.bindingId,assignmentId:fixtures.ids.assignmentId},
    operation:'supplement',key:'supplement-after-attempt',itemVersion:fixtures.version,
    payload:{fieldSubmissionId:fixtures.ids.file,expectedContentHash:'d'.repeat(64)}});
  assert.equal(next.phase,'PREPARED');
  assert.deepEqual((await j.history()).map(row=>row.operation),['supplement','supplement']);
  await assert.rejects(j.prepare({...next,key:'supplement-duplicate',payload:{...next.payload}}),/repair_unresolved_command/);
});
