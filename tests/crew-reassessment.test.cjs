const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {randomUUID}=require('node:crypto');
const prefix=fs.readFileSync('tests/t06b.test.cjs','utf8').split("test('T06B journal")[0];
const {harness,ids}=new Function('require',prefix+';return {harness,ids}')(require);
function fixture(options){
 const h=harness(options);let draft=h.draft();draft.measurements[0].value=23;
 h.runtime.fieldDraft=async()=>structuredClone(draft);
 return {...h,get raw(){return h.raw;},edit:value=>draft.measurements[0].value=value,current:()=>structuredClone(draft)};
}
async function assess(h){const c=await h.workflow.prepareRepairAssessment(h.identity,h.current(),h.runtime);return h.workflow.dispatchRepair(h.identity,c.key,h.runtime);}
test('changed local 23 -> 2 blocks start and allows a new READY assessment without changing the old receipt',async()=>{
 const h=fixture();try{
  const old=await assess(h),j=await h.runtime.journal(),snapshot=JSON.stringify(await j.read(old.key));h.edit(2);
  await assert.rejects(h.workflow.prepareRepairStart(h.identity,h.runtime),/repair_assessment_source_changed/);
  assert.equal(h.posts(),1);
  const send=h.runtime.api.submitRepairAssessmentReal,newId=randomUUID();
  h.runtime.api.submitRepairAssessmentReal=async(...args)=>{const r=await send(...args);r.data.id=newId;return r;};
  const revised=await assess(h);assert.notEqual(revised.key,old.key);assert.equal(revised.payload.measurements[0].value,2);
  assert.equal(JSON.stringify(await j.read(old.key)),snapshot);
  const start=await h.workflow.prepareRepairStart(h.identity,h.runtime);assert.equal(start.payload.assessmentId,newId);
  await assert.rejects(j.prepare({...start,key:randomUUID(),payload:{...start.payload,assessmentId:ids.assessment}}));
 }finally{h.raw.close();}
});
test('concurrent corrected assessments create one durable intent and retain the confirmed original',async()=>{
 const h=fixture();try{await assess(h);h.edit(2);
 const results=await Promise.allSettled([h.workflow.prepareRepairAssessment(h.identity,h.current(),h.runtime),h.workflow.prepareRepairAssessment(h.identity,h.current(),h.runtime)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await (await h.runtime.journal()).history()).length,2);assert.equal(h.posts(),1);
 }finally{h.raw.close();}
});
for(const kind of ['binding','version','session during draft read','already started','unknown assessment','rejected assessment'])test('corrected assessment preserves guards: '+kind,async()=>{
 const h=fixture();try{const old=await assess(h);h.edit(2);const j=await h.runtime.journal();
 if(kind==='binding')h.task.repairContext.bindingId=randomUUID();
 if(kind==='version')h.task.repairContext.itemVersion='AAAAAAAAB9M=';
 if(kind==='already started'){h.edit(23);const c=await h.workflow.prepareRepairStart(h.identity,h.runtime);await h.workflow.dispatchRepair(h.identity,c.key,h.runtime);h.edit(2);}
 if(kind==='unknown assessment'||kind==='rejected assessment'){
  const next=await h.workflow.prepareRepairAssessment(h.identity,h.current(),h.runtime);h.fail(kind==='unknown assessment'?Error('timeout'):{response:{status:422,data:{code:'fixture'}}});await assert.rejects(h.workflow.dispatchRepair(h.identity,next.key,h.runtime));h.edit(3);
 }
 const before=JSON.stringify(await j.history());
 if(kind==='session during draft read'){h.runtime.fieldDraft=async()=>{h.switch();return h.current();};await assert.rejects(h.workflow.prepareRepairStart(h.identity,h.runtime),/session/);}
 else await assert.rejects(h.workflow.prepareRepairAssessment(h.identity,h.current(),h.runtime));
 assert.equal(JSON.stringify(h.raw.prepare('SELECT payload FROM local_draft WHERE kind=? ORDER BY rowid').all('T06A_REPAIR_COMMAND').map(r=>JSON.parse(r.payload))),before);
 assert.equal((JSON.parse(before)[0]).key,old.key);
 }finally{h.raw.close();}
});
test('corrected READY receipt and original assessment persist across SQLite close/reopen',async()=>{
 const path=require('node:path'),folder=fs.mkdtempSync(path.resolve('.cache/reassessment-journal-'));
 const h=fixture({file:path.join(folder,'journal.db')});try{const old=await assess(h);h.edit(2);const next=await assess(h);
 const before=JSON.stringify(await (await h.runtime.journal()).history());h.reopen();const rows=await (await h.runtime.journal()).history();
 assert.equal(JSON.stringify(rows),before);assert.notEqual(rows[0].key,rows[1].key);assert.equal(rows[0].key,old.key);assert.equal(rows[1].key,next.key);
 assert.equal((await h.workflow.prepareRepairStart(h.identity,h.runtime)).payload.assessmentId,next.receipt.data.id);
 }finally{h.raw.close();}
});
test('READY assessment cannot be duplicated just by generating another origin/key',async()=>{
 const h=fixture();try{await assess(h);await assert.rejects(h.workflow.prepareRepairAssessment(h.identity,h.current(),h.runtime));assert.equal(h.posts(),1);}finally{h.raw.close();}
});
test('draft edit after preparing start blocks first dispatch but preserves original intent',async()=>{
 const h=fixture();try{await assess(h);const start=await h.workflow.prepareRepairStart(h.identity,h.runtime),j=await h.runtime.journal();h.edit(2);
 await assert.rejects(h.workflow.dispatchRepair(h.identity,start.key,h.runtime),/repair_assessment_source_changed/);
 assert.equal(h.posts(),1);assert.equal(JSON.stringify(await j.read(start.key)),JSON.stringify(start));
 }finally{h.raw.close();}
});
test('unknown start outcome replays exact original intent despite later draft edits',async()=>{
 const h=fixture();try{await assess(h);const start=await h.workflow.prepareRepairStart(h.identity,h.runtime);h.fail(Error('timeout'));
 await assert.rejects(h.workflow.dispatchRepair(h.identity,start.key,h.runtime));h.edit(2);h.fail(null);
 assert.equal((await h.workflow.dispatchRepair(h.identity,start.key,h.runtime)).phase,'CONFIRMED');assert.deepEqual(h.calls[1],h.calls[2]);
 }finally{h.raw.close();}
});
test('assessment source helper detects measurement/evidence/location changes, ignores AFTER and object key order',async()=>{
 const h=fixture();try{const c=await assess(h);const journal=new Function('require',prefix+';return load("src/api/crewRepairDraft.ts");')(require);
 const matches=d=>journal.repairAssessmentMatchesDraft(c.payload,d);
 const d=h.current();assert.equal(matches(d),true);d.measurements[0]=Object.fromEntries(Object.entries(d.measurements[0]).reverse());assert.equal(matches(d),true);
 d.captures.push({...d.captures[0],id:randomUUID(),purpose:'AFTER'});assert.equal(matches(d),true);
 for(const change of [d=>d.measurements[0].value=2,d=>d.captures[0].checksum='b'.repeat(64),d=>d.captures[0].verified=false,d=>d.locationProof={checklistVersion:'changed'}]){const v=h.current();change(v);assert.equal(matches(v),false);}
 }finally{h.raw.close();}
});
