const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const prefix=fs.readFileSync('tests/t06b.test.cjs','utf8').split("test('T06B journal")[0];
const {harness,ids}=new Function('require',prefix+';return {harness,ids}')(require);
const closeout=new Function('require','__dirname',fs.readFileSync('tests/t06c.test.cjs','utf8')+';return {claimHarness,finishedForIntake};')(
  name=>name==='node:test'?{test:()=>{}}:require(name),__dirname);

function fixture(){
  const h=harness();
  h.task.mode='CONDITIONAL_FT';h.task.repairContext.mode='FAST_TRACK';
  let eligible=true,reads=0;
  h.runtime.api.getRepairEligibilityReal=async()=>{
    reads++;
    return {etag:'"h4-eligibility-v1-'+ 'a'.repeat(64)+'"',data:{
      itemId:ids.itemId,bindingId:ids.bindingId,assessmentId:ids.assessment,
      eligible,activation:eligible?'ELIGIBLE':'INELIGIBLE',missingReasons:eligible?[]:['POLICY_UNAVAILABLE'],
      policyRevisionId:ids.first,policyContentHash:'b'.repeat(64),policyState:'CONFIGURED',
      version:'h4-eligibility-v1-'+ 'a'.repeat(64),
    }};
  };
  return {...h,eligibilityReads:()=>reads,deny:()=>eligible=false};
}
async function assess(h){
  const c=await h.workflow.prepareRepairAssessment(h.identity,h.draft(),h.runtime);
  return h.workflow.dispatchRepair(h.identity,c.key,h.runtime);
}
test('FT online assessment uses current FastTrack binding, immutable journal and item version',async()=>{
  const h=fixture();try{
    const c=await h.workflow.prepareRepairAssessment(h.identity,h.draft(),h.runtime);
    assert.equal(h.posts(),0);assert.equal(c.identity.bindingId,ids.bindingId);
    assert.equal((await h.workflow.dispatchRepair(h.identity,c.key,h.runtime)).phase,'CONFIRMED');
    assert.equal(h.eligibilityReads(),0); // Assessment must be possible before eligibility is satisfied.
  }finally{h.raw.close();}
});
test('FT start requires fresh API146 and retains item If-Match, never eligibility ETag',async()=>{
  const h=fixture();try{
    await assess(h);
    const start=await h.workflow.prepareRepairStart(h.identity,h.runtime);
    assert.equal(h.eligibilityReads(),1);assert.equal(start.ifMatch,'"'+h.task.repairContext.itemVersion+'"');
    assert.equal((await h.workflow.dispatchRepair(h.identity,start.key,h.runtime)).phase,'CONFIRMED');
    assert.equal(h.eligibilityReads(),2);
  }finally{h.raw.close();}
});
test('FT revoked eligibility blocks a prepared start before POST without changing its payload or key',async()=>{
  const h=fixture();try{
    await assess(h);const c=await h.workflow.prepareRepairStart(h.identity,h.runtime),before=JSON.stringify(c);
    h.deny();await assert.rejects(h.workflow.dispatchRepair(h.identity,c.key,h.runtime),/fasttrack/);
    assert.equal(h.posts(),1);assert.equal(JSON.stringify(await (await h.runtime.journal()).read(c.key)),before);
  }finally{h.raw.close();}
});
test('FT eligibility for another assessment or binding never prepares a start',async()=>{
  for(const field of ['assessmentId','bindingId']){
    const h=fixture();try{
      await assess(h);const read=h.runtime.api.getRepairEligibilityReal;
      h.runtime.api.getRepairEligibilityReal=async()=>{const v=await read();v.data[field]=ids.projectId;return v;};
      await assert.rejects(h.workflow.prepareRepairStart(h.identity,h.runtime),/fasttrack/);
      assert.equal((await (await h.runtime.journal()).list()).length,1);
    }finally{h.raw.close();}
  }
});
test('FT task authority cannot be constructed from a NORMAL context or another actor',async()=>{
  for(const change of [h=>h.task.repairContext.mode='NORMAL',h=>h.task.assignedToUserId=ids.projectId]){
    const h=fixture();try{change(h);await assert.rejects(h.workflow.prepareRepairAssessment(h.identity,h.draft(),h.runtime));assert.equal(h.posts(),0);}finally{h.raw.close();}
  }
});

test('FT unknown start replays its original command even if eligibility is revoked afterwards',async()=>{
  const h=fixture();try{
    await assess(h);const c=await h.workflow.prepareRepairStart(h.identity,h.runtime);
    h.fail(Error('timeout'));await assert.rejects(h.workflow.dispatchRepair(h.identity,c.key,h.runtime));
    assert.equal((await (await h.runtime.journal()).read(c.key)).phase,'PENDING');
    h.deny();h.fail(null);
    assert.equal((await h.workflow.dispatchRepair(h.identity,c.key,h.runtime)).phase,'CONFIRMED');
    assert.deepEqual(h.calls[1],h.calls[2]);assert.equal(h.eligibilityReads(),2);
  }finally{h.raw.close();}
});

test('FT session or binding change during eligibility cannot prepare a command',async()=>{
  for(const change of [h=>h.switch(),h=>h.task.repairContext.bindingId=ids.projectId]){
    const h=fixture();try{
      await assess(h);const read=h.runtime.api.getRepairEligibilityReal;
      h.runtime.api.getRepairEligibilityReal=async()=>{const v=await read();change(h);return v;};
      await assert.rejects(h.workflow.prepareRepairStart(h.identity,h.runtime));assert.equal(h.posts(),1);
    }finally{h.raw.close();}
  }
});

test('FT malformed policy or eligibility version fails closed',async()=>{
  for(const change of [r=>r.etag='"task-version"',r=>r.data.policyContentHash='bad',r=>r.data.policyState='UNKNOWN',r=>r.data.missingReasons=['STOP_CONDITION_OBSERVATION_UNKNOWN']]){
    const h=fixture();try{
      await assess(h);const read=h.runtime.api.getRepairEligibilityReal;
      h.runtime.api.getRepairEligibilityReal=async()=>{const v=await read();change(v);return v;};
      await assert.rejects(h.workflow.prepareRepairStart(h.identity,h.runtime),/fasttrack/);assert.equal(h.posts(),1);
    }finally{h.raw.close();}
  }
});

test('FT closeout requires a confirmed finish and preserves API095/096 claim readback',async()=>{
  const h=closeout.claimHarness();h.task.mode='CONDITIONAL_FT';h.task.repairContext.mode='FAST_TRACK';
  await h.runtime.write(h.d);
  const d=await h.m.prepareFieldRepairClaim(h.ctx,h.runtime);
  const sent=await h.m.submitFieldDraft(d,h.runtime);
  assert.equal(sent.command.phase,'confirmed');assert.equal(h.posted().captureType,'REPAIR_CLAIM');
  assert.equal(h.posted().evidence[0].attemptChecklist,'POST_REPAIR_CAPTURE');
});

test('FT intake reuses confirmed finish and verified claim rather than a local completion flag',async()=>{
  const h=await closeout.finishedForIntake();try{
    h.task.mode='CONDITIONAL_FT';h.task.repairContext.mode='FAST_TRACK';
    const c=await h.workflow.prepareRepairAttempt(h.identity,h.runtime);
    const done=await h.workflow.dispatchRepair(h.identity,c.key,h.runtime);
    assert.equal(done.phase,'CONFIRMED');assert.equal(h.attemptCalls.length,1);
    assert.equal(c.payload.fieldSubmissionId,h.submissionId);
  }finally{h.raw.close();}
});

test('FT acknowledgement cannot confirm under a changed binding or owner',async()=>{
  for(const change of [h=>h.task.assignedToUserId=ids.projectId,h=>h.task.repairContext.bindingId=ids.projectId]){
    const h=fixture();try{
      const c=await h.workflow.prepareRepairAssessment(h.identity,h.draft(),h.runtime),send=h.runtime.api.submitRepairAssessmentReal;
      h.runtime.api.submitRepairAssessmentReal=async(...args)=>{const r=await send(...args);change(h);return r;};
      await assert.rejects(h.workflow.dispatchRepair(h.identity,c.key,h.runtime));
      assert.equal((await (await h.runtime.journal()).read(c.key)).phase,'ACKNOWLEDGED');
    }finally{h.raw.close();}
  }
});
