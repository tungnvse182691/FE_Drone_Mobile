const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const scope={require:n=>n==='node:test'?{test(){}}:require(n),structuredClone,setTimeout,clearTimeout,Uint8Array,AbortController,URL};
vm.runInNewContext(fs.readFileSync('tests/t05b.test.cjs','utf8').split("test('T05B initial submission")[0]+';globalThis.fixtures={fieldHarness,measured};',scope);
const {fieldHarness,measured}=scope.fixtures;
function photo(h){const d=measured(h);d.captures[0]={...d.captures[0],upload:undefined,verified:false,parts:[],createKey:'create',completeKey:'complete'};return d;}

function delayedVerification(h,readyAfter){
 const read=h.runtime.api.getCrewUploadSession;let waits=0;
 h.runtime.wait=async()=>{waits++;};
 h.runtime.api.getCrewUploadSession=async id=>{const s=await read(id);return s.status==='VERIFIED'&&waits<readyAfter?{...s,status:'VERIFYING'}:s;};
 return ()=>waits;
}
test('FIELD one send survives two 30-second server verification rounds without reuploading',async()=>{
 const h=fieldHarness(),d=photo(h),waits=delayedVerification(h,60);let puts=0,completes=0;
 const put=h.runtime.api.putCrewUploadPartBytes,complete=h.runtime.api.completeCrewUpload;
 h.runtime.api.putCrewUploadPartBytes=async(...args)=>{puts++;return put(...args);};
 h.runtime.api.completeCrewUpload=async(...args)=>{completes++;return complete(...args);};
 const result=await h.m.uploadAndSubmitFieldDraft(d,h.runtime);
 assert.equal(waits(),60);assert.equal(result.command.phase,'confirmed');
 assert.equal(h.calls.filter(c=>c==='submit').length,1);assert.equal(h.calls.filter(c=>c==='create').length,1);
 assert.equal(puts,2);assert.equal(completes,1);assert.equal(h.stored().captures[0].completeKey,'complete');
});
test('FIELD verification remains bounded and preserves pending upload without submitting',async()=>{
 const h=fieldHarness(),d=photo(h),waits=delayedVerification(h,Infinity);
 await assert.rejects(()=>h.m.uploadAndSubmitFieldDraft(d,h.runtime),/field_verification_pending/);
 assert.ok(waits()>=60&&waits()<120);assert.ok(!h.calls.includes('submit'));
 assert.equal(h.stored().captures[0].upload.status,'VERIFYING');assert.equal(h.stored().captures[0].verified,false);
 assert.equal(h.stored().captures[0].completeKey,'complete');
});
test('FIELD session change while waiting for verification stops without submitting',async()=>{
 const h=fieldHarness(),d=photo(h);delayedVerification(h,Infinity);
 h.runtime.wait=async()=>{h.switch();};
 await assert.rejects(()=>h.m.uploadAndSubmitFieldDraft(d,h.runtime),/field_session_changed/);
 assert.ok(!h.calls.includes('submit'));
});
test('FIELD one send uploads, verifies then submits and reads back the real receipt',async()=>{
 const h=fieldHarness(),d=photo(h),states=[];
 const result=await h.m.uploadAndSubmitFieldDraft(d,h.runtime,(updated,id)=>states.push({id,parts:updated.captures[0].parts.length,verified:updated.captures[0].verified}));
 assert.equal(result.command.phase,'confirmed');assert.equal(h.calls.filter(c=>c==='submit').length,1);
 assert.ok(states.some(s=>s.parts===1));assert.ok(states.some(s=>s.verified));
});
test('FIELD invalid measurements do not start uploads',async()=>{
 const h=fieldHarness(),d=photo(h);d.measurements[0].instrument='';
 await assert.rejects(()=>h.m.uploadAndSubmitFieldDraft(d,h.runtime),/field_measurements_required/);
 assert.ok(!h.calls.includes('create'));assert.ok(!h.calls.includes('submit'));
});
test('FIELD failed upload never submits and preserves the upload intent for recovery',async()=>{
 const h=fieldHarness(),d=photo(h);h.runtime.api.putCrewUploadPartBytes=async()=>{throw Error('offline');};
 await assert.rejects(()=>h.m.uploadAndSubmitFieldDraft(d,h.runtime),/offline/);
 assert.ok(h.stored().captures[0].upload.id);assert.equal(h.stored().captures[0].createKey,'create');assert.ok(!h.calls.includes('submit'));
});
test('FIELD one-send action cannot replay an unresolved command',async()=>{
 const h=fieldHarness(),d=photo(h);d.command={phase:'pending',key:'original'};
 await assert.rejects(()=>h.m.uploadAndSubmitFieldDraft(d,h.runtime),/field_command_pending/);
 assert.ok(!h.calls.includes('create'));assert.ok(!h.calls.includes('submit'));
});
test('FIELD supplement replaces an unlinked declaration with verified photos and preserves parent lineage',async()=>{
 const h=fieldHarness(),d=photo(h),parent='11111111-1111-4111-8111-111111111111';
 const getTask=h.runtime.api.getFieldInspectionTaskDetailReal,getSubmission=h.runtime.api.getFieldSubmissionDetailReal;
 const placeholder={captureOriginId:'22222222-2222-4222-8222-222222222222',fileId:null};
 h.runtime.api.getFieldInspectionTaskDetailReal=async()=>{const r=await getTask();return {...r,data:{...r.data,status:'SupplementRequired',latestSubmissionId:parent}};};
 h.runtime.api.getFieldSubmissionDetailReal=async(p,t,id)=>id===parent?{data:{id:parent,taskId:d.taskId,evidence:[placeholder]}}:getSubmission(p,t,id);
 const result=await h.m.uploadAndSubmitFieldDraft(d,h.runtime);
 assert.equal(result.command.phase,'confirmed');assert.equal(result.command.body.parentSubmissionId,parent);
 assert.equal(result.command.body.evidence.length,1);assert.ok(result.command.body.evidence[0].fileId);
 assert.equal(placeholder.fileId,null);assert.equal(h.calls.filter(c=>c==='submit').length,1);
});
