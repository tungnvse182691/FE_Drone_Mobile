const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {randomUUID}=require('node:crypto');
function load(file,deps={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,{module,exports:module.exports,Uint8Array,AbortController,setTimeout,require:n=>deps[n]??(n==='axios'?require(n):{})});return module.exports;}
function fixture(){
 const ids=Object.fromEntries(['actor','projectId','taskId','assignment','first','package','item','binding','attempt','review','root','finish','start','file','upload'].map(k=>[k,randomUUID()]));
 const context={actor:ids.actor,projectId:ids.projectId,taskId:ids.taskId,environment:'isolated-test',scope:JSON.stringify([ids.actor,'sid'])};
 const api=load('src/api/crewApi.ts'),version='AAAAAAAAB9E=';
 const task={id:ids.taskId,projectId:ids.projectId,assignedToUserId:ids.actor,assignmentId:ids.assignment,firstStartOriginId:ids.first,version,mode:'NORMAL',purpose:'PostRepair',status:'SupplementRequired',latestSubmissionId:ids.root,
 repairContext:{packageId:ids.package,itemId:ids.item,bindingId:ids.binding,mode:'NORMAL',status:'Submitted',itemVersion:version,repairPlan:'Approved plan',checklistVersion:'v1',attempt:{attemptId:ids.attempt,effectiveSubmissionId:ids.root,review:{reviewId:ids.review,decision:'SUPPLEMENT'}}}};
 const measurement={sampleId:randomUUID(),type:'Area',value:1,state:'KNOWN',dimension:'AREA',unit:'m²',instrument:'Tape',method:'Measure',locationReason:'No GPS'};
 const evidence={captureOriginId:randomUUID(),fileId:ids.file,purpose:'AFTER',checksumSha256:'a'.repeat(64),mediaType:'image/jpeg',capturedAt:'2026-11-20T02:00:00Z',attemptChecklist:'POST_REPAIR_CAPTURE'};
 const root={id:ids.root,taskId:ids.taskId,rootId:ids.root,parentId:null,revision:1,serverReceivedAt:'2026-11-20T02:10:00Z',captureType:'REPAIR_CLAIM',repaired:true,unrepairedReason:null,contentHash:'b'.repeat(64),readiness:'READY',missingReasons:[],measurements:[measurement],evidence:[evidence]};
 const claim={finishId:ids.finish,executionStartId:ids.start,firstStartId:ids.first,finishAt:'2026-11-20T01:00:00Z',packageId:ids.package,itemId:ids.item,bindingId:ids.binding,assignmentId:ids.assignment,itemVersion:version};
 const l1={...context,captures:[],measurements:[measurement],locationProof:null,repairClaim:claim,result:root,command:{key:randomUUID(),body:{originId:randomUUID(),startOriginId:ids.first,parentSubmissionId:null,captureType:'REPAIR_CLAIM',repaired:true,unrepairedReason:null,measurements:[measurement],evidence:[evidence]},ifMatch:`"${version}"`,assignmentId:ids.assignment,phase:'confirmed',responseId:ids.root}};
 let stored=structuredClone(l1),current=context,posted=null;const rows=[structuredClone(l1)],calls=[],submissions=new Map([[ids.root,root]]);
 const m=load('src/api/crewFieldDraft.ts',{'./crewApi':api});
 const identity={...context,packageId:ids.package,itemId:ids.item,bindingId:ids.binding,assignmentId:ids.assignment};
 const history=[{identity,operation:'finish',phase:'CONFIRMED',payload:{executionStartId:ids.start},receipt:{data:{id:ids.finish,verifiedOriginalAt:claim.finishAt}}},{identity,operation:'attempt',phase:'CONFIRMED',payload:{fieldSubmissionId:ids.root},receipt:{data:{attemptId:ids.attempt}}}];
 const runtime={current:()=>current,uuid:randomUUID,read:async()=>structuredClone(stored),write:async d=>{stored=structuredClone(d);rows.push(structuredClone(d));},repairHistory:async()=>history,api:{...api,
 getFieldInspectionTaskDetailReal:async()=>{calls.push('080');return {data:structuredClone(task),etag:`"${version}"`};},getFieldTaskStartOriginReal:async()=>({id:ids.first,taskId:ids.taskId,assignmentId:ids.assignment}),
 getFieldSubmissionDetailReal:async(p,t,id)=>{calls.push('096');return {data:structuredClone(submissions.get(id))};},
 getFieldEvidenceReal:async(p,t,id)=>({fileId:id,state:'VERIFIED',checksum:'a'.repeat(64),mediaType:'image/jpeg',sizeBytes:3}),
 submitFieldTaskReal:async(p,t,body,etag,key)=>{calls.push('095');posted={body:structuredClone(body),etag,key};const id=randomUUID(),parent=submissions.get(body.parentSubmissionId);const read={...root,id,parentId:parent.id,rootId:parent.rootId,revision:parent.revision+1,evidence:body.evidence,measurements:body.measurements,contentHash:'c'.repeat(64),serverReceivedAt:'2026-11-23T03:00:00Z'};submissions.set(id,read);task.status='Submitted';task.latestSubmissionId=id;return {data:{id,taskId:ids.taskId}};},
 }};
 return {ids,context,api,m,runtime,task,l1,root,rows,calls,history,submissions,stored:()=>stored,posted:()=>posted,switch:()=>current=null};
}
test('T3 explicit supplement archives L1 and confirms a separate FIELD revision',async()=>{
 const h=fixture(),original=JSON.stringify(h.l1);
 const d=await h.m.prepareFieldRepairSupplement(h.context,h.runtime);
 assert.equal(d.command,undefined);assert.equal(d.supplement.parentId,h.root.id);assert.equal(d.repairClaim.finishId,h.l1.repairClaim.finishId);
 const done=await h.m.submitFieldDraft(d,h.runtime);
 assert.equal(done.command.phase,'confirmed');assert.equal(done.result.revision,2);assert.equal(done.result.rootId,h.root.id);assert.equal(done.result.parentId,h.root.id);
 assert.notEqual(done.command.key,h.l1.command.key);assert.notEqual(done.command.body.originId,h.l1.command.body.originId);
 assert.equal(JSON.stringify(h.rows[0]),original);assert.equal(done.command.body.startOriginId,h.ids.first);assert.ok(h.calls.indexOf('096')<h.calls.indexOf('095'));
});
for(const [name,change] of [
 ['pending L1',h=>h.l1.command.phase='pending'],['rejected L1',h=>h.l1.command.phase='rejected'],
 ['no review',h=>h.task.repairContext.attempt.review=null],['final',h=>h.task.repairContext.status='Confirmed'],
 ['assignment',h=>h.task.assignmentId=randomUUID()],['wrong actor',h=>h.task.assignedToUserId=randomUUID()],
 ['stale parent',h=>h.task.latestSubmissionId=randomUUID()],['FastTrack',h=>h.task.mode='CONDITIONAL_FT'],
])test('T3 refuses new revision: '+name,async()=>{const h=fixture();change(h);h.runtime.read=async()=>structuredClone(h.l1);await assert.rejects(h.m.prepareFieldRepairSupplement(h.context,h.runtime));assert.ok(!h.calls.includes('095'));assert.equal(h.rows.length,1);});
test('T3 PM review race blocks first send without rewriting L1',async()=>{const h=fixture(),d=await h.m.prepareFieldRepairSupplement(h.context,h.runtime);h.task.repairContext.attempt.review.reviewId=randomUUID();await assert.rejects(h.m.submitFieldDraft(d,h.runtime));assert.ok(!h.calls.includes('095'));});
test('T3 root-only REPAIR_CLAIM guard remains enforced',async()=>{const h=fixture();await assert.rejects(h.m.submitFieldDraft({...h.l1,command:undefined,result:undefined},h.runtime),/repair_finish_required|repair_claim_root_required/);});
function workflowFixture(h){
 const history=load('src/api/crewRepairHistory.ts',{'./crewApi':h.api,'./crewRepairDraft':{sameRepairIdentity:(a,b)=>!!b&&['actor','scope','environment','projectId','taskId'].every(k=>a[k]===b[k])}});
 const records=[];
 const journal={prepare:async c=>{if(records.some(v=>v.phase!=='CONFIRMED'))throw Error('repair_unresolved_command');const r={...structuredClone(c),phase:'PREPARED',ifMatch:`"${c.itemVersion}"`};records.push(r);return structuredClone(r);},historicalRead:async key=>structuredClone(records.find(c=>c.key===key)),transition:async(key,phase,data={})=>{const c=records.find(c=>c.key===key);Object.assign(c,{phase},structuredClone(data));return structuredClone(c);}};
 const r={...h.runtime,now:()=>new Date().toISOString(),fieldDraft:async()=>structuredClone(h.stored()),journal:async()=>journal};
 const w=load('src/api/crewRepairWorkflow.ts',{'./crewApi':h.api,'./crewFieldDraft':h.m,'./crewRepairHistory':history,'./crewRepairDraft':{sameRepairIdentity:(a,b)=>!!b&&['actor','scope','environment','projectId','taskId'].every(k=>a[k]===b[k])}});
 r.api.supplementRepairAttemptReal=async(p,pack,item,t,payload,etag,key)=>{h.calls.push('159');h.task.repairContext.attempt.effectiveSubmissionId=payload.fieldSubmissionId;h.task.repairContext.attempt.review=null;return {etag:'"AAAAAAAAB9I="',data:{attemptId:h.ids.attempt,linkId:randomUUID(),itemId:h.ids.item,submissionId:payload.fieldSubmissionId,reviewClockId:randomUUID(),originalReviewDueAt:'2026-11-24T00:00:00Z',intakeReadiness:'READY'}};};
 return {w,r,records};
}
test('T3 API095 / fresh096 / item-version159 / fresh080 confirms only actual L2',async()=>{
 const h=fixture(),d=await h.m.prepareFieldRepairSupplement(h.context,h.runtime),done=await h.m.submitFieldDraft(d,h.runtime),f=workflowFixture(h);
 const c=await f.w.prepareRepairSupplement(h.context,done,f.r);assert.equal(c.ifMatch,'"'+h.task.repairContext.itemVersion+'"');
 assert.equal(c.payload.expectedContentHash,done.result.contentHash);assert.notEqual(c.key,done.command.key);
 const out=await f.w.dispatchRepair(h.context,c.key,f.r);assert.equal(out.phase,'CONFIRMED');assert.equal(h.task.repairContext.attempt.effectiveSubmissionId,done.result.id);assert.equal(h.task.repairContext.attempt.review,null);
});
for(const [name,change] of [['hash', (h,d)=>d.result.contentHash='d'.repeat(64)],['root',(h,d)=>d.supplement.rootId=randomUUID()],['review',(h,d)=>h.task.repairContext.attempt.review.reviewId=randomUUID()],['assignment',(h,d)=>d.repairClaim.assignmentId=randomUUID()],['unverified',(h,d)=>h.runtime.api.getFieldEvidenceReal=async()=>({state:'VERIFYING'})]])test('T3 API159 rejects '+name+' before journal or POST',async()=>{
 const h=fixture(),d=await h.m.prepareFieldRepairSupplement(h.context,h.runtime),done=await h.m.submitFieldDraft(d,h.runtime);change(h,done);const f=workflowFixture(h);
 await assert.rejects(f.w.prepareRepairSupplement(h.context,done,f.r));assert.equal(f.records.length,0);assert.ok(!h.calls.includes('159'));
});
for(const status of [401,403,409,412])test('T3 FIELD '+status+' preserves saved command and L1',async()=>{
 const h=fixture(),d=await h.m.prepareFieldRepairSupplement(h.context,h.runtime);h.runtime.api.submitFieldTaskReal=async()=>{throw {response:{status}};};
 await assert.rejects(h.m.submitFieldDraft(d,h.runtime));const c=structuredClone(h.stored().command);assert.ok(c.key);assert.equal(h.rows[0].command.key,h.l1.command.key);
 if(status!==403){await assert.rejects(h.m.submitFieldDraft(h.stored(),h.runtime,true));assert.deepEqual(h.stored().command,c);}
});
test('T3 lost FIELD ACK replays immutable key/body/version',async()=>{
 const h=fixture(),d=await h.m.prepareFieldRepairSupplement(h.context,h.runtime),post=h.runtime.api.submitFieldTaskReal;let ack,first=true;const calls=[];
 h.runtime.api.submitFieldTaskReal=async(...args)=>{calls.push(structuredClone(args));if(first){first=false;ack=await post(...args);throw Error('timeout');}return ack;};
 await assert.rejects(h.m.submitFieldDraft(d,h.runtime));const saved=structuredClone(h.stored()),done=await h.m.submitFieldDraft(saved,h.runtime,true);
 assert.equal(done.command.phase,'confirmed');assert.deepEqual(calls[0],calls[1]);assert.equal(h.rows[0].command.key,h.l1.command.key);
});
test('T3 double tap cannot dispatch another FIELD command',async()=>{
 const h=fixture(),d=await h.m.prepareFieldRepairSupplement(h.context,h.runtime),post=h.runtime.api.submitFieldTaskReal;
 let release,entered;const ready=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
 h.runtime.api.submitFieldTaskReal=async(...args)=>{entered();await gate;return post(...args);};
 const first=h.m.submitFieldDraft(d,h.runtime);await ready;
 await assert.rejects(h.m.submitFieldDraft(structuredClone(d),h.runtime),/busy/);
 release();await first;assert.equal(h.calls.filter(c=>c==='095').length,1);
});
test('T3 repeated SUPPLEMENT creates L3 with same root and physical finish',async()=>{
 const h=fixture(),d=await h.m.prepareFieldRepairSupplement(h.context,h.runtime),l2=await h.m.submitFieldDraft(d,h.runtime),original=JSON.stringify(l2);
 h.task.status='SupplementRequired';h.task.repairContext.attempt.effectiveSubmissionId=l2.result.id;h.task.repairContext.attempt.review.reviewId=randomUUID();
 h.history.push({...structuredClone(h.history[1]),operation:'supplement',payload:{fieldSubmissionId:l2.result.id}});
 const next=await h.m.prepareFieldRepairSupplement(h.context,h.runtime),l3=await h.m.submitFieldDraft(next,h.runtime);
 assert.equal(l3.result.revision,3);assert.equal(l3.result.parentId,l2.result.id);assert.equal(l3.result.rootId,h.root.id);
 assert.equal(l3.repairClaim.finishId,h.l1.repairClaim.finishId);assert.equal(JSON.stringify(l2),original);
 assert.notEqual(l3.command.key,l2.command.key);assert.notEqual(l3.command.body.originId,l2.command.body.originId);
});
test('T3 SQLite generation append survives reopen and preserves L1 bytes',async()=>{
 const scope={require:n=>n==='node:test'?{test:()=>{}}:require(n),console,process,Buffer,__dirname:require('node:path').resolve('tests'),structuredClone,setTimeout,clearTimeout,URL,Uint8Array,AbortController};
 vm.runInNewContext(fs.readFileSync('tests/hardening-field.test.cjs','utf8')+';globalThis.fieldFixtures={durableField};',scope);
 const h=fixture(),disk=scope.fieldFixtures.durableField(h.context,h.runtime.api);disk.seed(h.l1);
 const before=disk.rows()[0].payload;
 const runtime=await disk.m.openFieldRuntime(h.context);runtime.repairHistory=h.runtime.repairHistory;
 const next=await h.m.prepareFieldRepairSupplement(h.context,runtime);
 assert.equal(disk.rows().length,2);assert.equal(disk.rows()[0].payload,before);
 disk.reopen();const restored=await disk.m.loadFieldDraft(h.context,await disk.m.openFieldRuntime(h.context));
 assert.equal(restored.supplement.parentId,h.root.id);assert.equal(restored.command,undefined);
 assert.equal(disk.rows()[0].payload,before);assert.equal(next.repairClaim.finishId,restored.repairClaim.finishId);disk.close();
});
for(const change of ['actor','session','project','environment'])test('T3 '+change+' change stops supplemental send',async()=>{
 const h=fixture(),d=await h.m.prepareFieldRepairSupplement(h.context,h.runtime);h.runtime.current=()=>({...h.context,[change==='session'?'scope':change==='project'?'projectId':change]:randomUUID()});
 await assert.rejects(h.m.submitFieldDraft(d,h.runtime));assert.ok(!h.calls.includes('095'));
});
