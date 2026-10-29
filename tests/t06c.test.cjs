const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
// Reuse the real SQLite/runtime harness without executing or changing T06B tests.
const prefix=fs.readFileSync(path.join(__dirname,'t06b.test.cjs'),'utf8').split("test('T06B journal")[0];
const sandbox={require,console,process,Buffer,__dirname,structuredClone,setTimeout,clearTimeout,URL,Uint8Array};
vm.runInNewContext(prefix+';globalThis.fixture={harness,ids,version,next,load};',sandbox);
const {harness,ids,version,next,load}=sandbox.fixture;
const fieldSandbox={...sandbox,require:n=>n==='node:test'?{test:()=>{}}:require(n)};
vm.runInNewContext(fs.readFileSync('tests/t05b.test.cjs','utf8')+';globalThis.fieldFixture={fieldHarness,measured};',fieldSandbox);
const {fieldHarness,measured}=fieldSandbox.fieldFixture;
test('T06C mounted detail no longer imports unreachable legacy mutation code',()=>{
 const text=fs.readFileSync('app/(crew)/wo-detail.tsx','utf8');
 assert.doesNotMatch(text,/CrewWoDetailContent|api\/mock\/crew-inspection|stableUuid/);
 assert.match(text,/export function NormalRepairBootstrap/);
});
async function started(){
 const h=harness(),j=await h.runtime.journal();
 const c=await j.prepare(h.command());await h.workflow.dispatchRepair(h.identity,c.key,h.runtime);
 const s=await h.workflow.prepareRepairStart(h.identity,h.runtime);await h.workflow.dispatchRepair(h.identity,s.key,h.runtime);
 h.task.purpose='PostRepair';
 h.finishCalls=[];
 h.runtime.api.finishRepairExecutionReal=async(...args)=>{
  h.finishCalls.push(structuredClone(args));
  h.task.repairContext.itemVersion='AAAAAAAAAAM=';
  return {etag:'"AAAAAAAAAAM="',data:{id:'11111111-1111-4111-8111-111111111111',itemId:ids.itemId,taskId:ids.taskId,
   executionStartId:ids.start,claimedAt:args[4].claimedAt,serverReceivedAt:new Date().toISOString(),
   verifiedOriginalAt:new Date().toISOString(),timeProvenance:'SERVER_ONLINE',syncClockId:ids.first,originalSyncDueAt:new Date().toISOString()}};
 };
 return h;
}
test('T06C finish uses confirmed server start, persists intent and reconciles without claiming submission',async()=>{
 const h=await started();
 assert.equal(typeof h.workflow.prepareRepairFinish,'function');
 const c=await h.workflow.prepareRepairFinish(h.identity,h.runtime);
 assert.equal(c.payload.executionStartId,ids.start);assert.equal(c.phase,'PREPARED');
 assert.equal(c.payload.fieldFirstStartId,undefined);
 const done=await h.workflow.dispatchRepair(h.identity,c.key,h.runtime);
 assert.equal(done.phase,'CONFIRMED');assert.equal(h.task.repairContext.status,'InProgress');
 assert.equal(h.finishCalls.length,1);
 assert.equal((await h.workflow.readRepairHistory(h.identity,h.runtime)).length,3);
});
for(const state of ['timeout before','timeout after','ACK disk'])test('T06C finish '+state+' exact replay survives restart',async()=>{
 const h=await started(),c=await h.workflow.prepareRepairFinish(h.identity,h.runtime),send=h.runtime.api.finishRepairExecutionReal;
 let old;
 h.runtime.api.finishRepairExecutionReal=async(...args)=>{old=structuredClone(args);if(state!=='timeout before')await send(...args);if(state==='ACK disk'){h.saveFail(true);return send(...args);}throw Error('timeout');};
 await assert.rejects(h.workflow.dispatchRepair(h.identity,c.key,h.runtime));h.saveFail(false);
 assert.equal((await (await h.runtime.journal()).read(c.key)).phase,'PENDING');
 h.runtime.api.finishRepairExecutionReal=async(...args)=>{assert.equal(JSON.stringify(args),JSON.stringify(old));return send(...args);};
 assert.equal((await h.workflow.dispatchRepair(h.identity,c.key,h.runtime)).phase,'CONFIRMED');
});
for(const status of [401,403,409,412,428])test('T06C finish rejection '+status+' never unlocks replacement',async()=>{
 const h=await started(),c=await h.workflow.prepareRepairFinish(h.identity,h.runtime);
 h.runtime.api.finishRepairExecutionReal=async()=>{throw {response:{status}};};
 await assert.rejects(h.workflow.dispatchRepair(h.identity,c.key,h.runtime));
 assert.equal((await (await h.runtime.journal()).read(c.key)).phase,[401,409,412].includes(status)?'PENDING':'REJECTED');
 await assert.rejects(h.workflow.prepareRepairFinish(h.identity,h.runtime));
});
test('T06C finish stale version and wrong start receipt fail closed',async()=>{
 const h=await started();h.task.repairContext.itemVersion=version;
 await assert.rejects(h.workflow.prepareRepairFinish(h.identity,h.runtime));
 h.task.repairContext.itemVersion=next;
 const c=await h.workflow.prepareRepairFinish(h.identity,h.runtime),send=h.runtime.api.finishRepairExecutionReal;
 h.runtime.api.finishRepairExecutionReal=async(...args)=>{const r=await send(...args);r.data.executionStartId=ids.first;return r;};
 await assert.rejects(h.workflow.dispatchRepair(h.identity,c.key,h.runtime));
 assert.equal((await (await h.runtime.journal()).read(c.key)).phase,'PENDING');
});
test('T06C finish session switch cannot persist receipt or dispatch under new actor',async()=>{
 const h=await started(),c=await h.workflow.prepareRepairFinish(h.identity,h.runtime),send=h.runtime.api.finishRepairExecutionReal;
 h.runtime.api.finishRepairExecutionReal=async(...args)=>{const r=await send(...args);h.switch();return r;};
 await assert.rejects(h.workflow.dispatchRepair(h.identity,c.key,h.runtime));
 const rows=h.raw.prepare('SELECT payload FROM local_draft').all().map(r=>JSON.parse(r.payload));
 assert.equal(rows.at(-1).phase,'PENDING');assert.equal(rows.at(-1).receipt,undefined);
});
function claimHarness(){
 const h=fieldHarness(),d=measured(h),finishId=require('node:crypto').randomUUID(),startId=require('node:crypto').randomUUID();
 const at='2026-10-28T01:00:00Z';
 const task={id:h.ctx.taskId,projectId:h.ctx.projectId,assignedToUserId:h.ctx.actor,assignmentId:ids.assignmentId,
  version,firstStartOriginId:ids.first,status:'InProgress',purpose:'PostRepair',mode:'NORMAL',
  repairContext:{packageId:ids.packageId,itemId:ids.itemId,bindingId:ids.bindingId,mode:'NORMAL',status:'InProgress',itemVersion:next,repairPlan:'Approved',checklistVersion:'v1'}};
 const identity={...h.ctx,packageId:ids.packageId,itemId:ids.itemId,bindingId:ids.bindingId,assignmentId:ids.assignmentId};
 const rows=[{identity,operation:'start',phase:'CONFIRMED',payload:{fieldFirstStartId:ids.first},receipt:{data:{id:startId,itemId:ids.itemId,taskId:h.ctx.taskId,firstStartId:ids.first},itemVersion:version}},
  {identity,operation:'finish',phase:'CONFIRMED',payload:{executionStartId:startId},receipt:{data:{id:finishId,itemId:ids.itemId,taskId:h.ctx.taskId,executionStartId:startId,verifiedOriginalAt:at,timeProvenance:'SERVER_ONLINE'},itemVersion:next}}];
 let posted;
 h.runtime.repairHistory=async()=>structuredClone(rows);
 h.runtime.api.getFieldInspectionTaskDetailReal=async()=>({data:structuredClone(task),etag:`"${version}"`});
 h.runtime.api.getFieldTaskStartOriginReal=async()=>({id:ids.first,taskId:h.ctx.taskId,assignmentId:ids.assignmentId});
 const submissionId=require('node:crypto').randomUUID();
 h.runtime.api.submitFieldTaskReal=async(p,t,b,e,k)=>{posted=structuredClone(b);assert.equal(h.stored().command.key,k);task.status='Submitted';task.latestSubmissionId=submissionId;return {data:{id:submissionId,taskId:t}};};
 h.runtime.api.getFieldSubmissionDetailReal=async()=>({data:{...posted,id:submissionId,taskId:h.ctx.taskId,rootId:submissionId,parentId:null,revision:1,contentHash:'b'.repeat(64),serverReceivedAt:'2026-10-28T02:00:00Z',readiness:'INCOMPLETE',missingReasons:['AFTER_ATTEMPT_BINDING_UNAVAILABLE']}});
 h.runtime.api.getFieldEvidenceReal=async(p,t,id)=>({fileId:id,state:'VERIFIED',checksum:'a'.repeat(64),mediaType:'image/jpeg',sizeBytes:3});
 d.captures[0].purpose='AFTER';d.captures[0].capturedAt='2026-10-28T01:01:00Z';
 d.captures[0].upload.id=ids.upload;d.captures[0].postRepairCapture=true;
 h.runtime.api.getCrewUploadSession=async id=>({id,fileId:d.captures[0].upload.fileId,status:'VERIFIED'});
 return {...h,d,task,rows,at,posted:()=>posted,submissionId};
}
test('T06C claim is explicit and needs confirmed finish; exact root payload and GET readback',async()=>{
 const h=claimHarness();await h.runtime.write(h.d);
 assert.equal(typeof h.m.prepareFieldRepairClaim,'function');
 const draft=await h.m.prepareFieldRepairClaim(h.ctx,h.runtime);
 const result=await h.m.submitFieldDraft(draft,h.runtime);
 assert.equal(result.command.phase,'confirmed');assert.equal(result.command.body.captureType,'REPAIR_CLAIM');
 assert.equal(result.command.body.repaired,true);assert.equal(result.command.body.parentSubmissionId,null);
 assert.equal(result.command.body.evidence[0].attemptChecklist,'POST_REPAIR_CAPTURE');
 assert.equal(result.result.contentHash,'b'.repeat(64));
});
for(const [label,change] of [
 ['pending finish',h=>h.rows[1].phase='PENDING'],['wrong binding',h=>h.rows[1].identity.bindingId=ids.first],
 ['old measurement root',h=>h.task.latestSubmissionId=ids.first],['FT',h=>h.task.mode='CONDITIONAL_FT'],
 ['stale item',h=>h.task.repairContext.itemVersion=version],['old session',h=>h.rows[1].identity.scope='other'],
])test('T06C claim preparation blocks '+label,async()=>{const h=claimHarness();await h.runtime.write(h.d);change(h);await assert.rejects(h.m.prepareFieldRepairClaim(h.ctx,h.runtime));assert.equal(h.posted(),undefined);});
for(const [label,change] of [
 ['no AFTER',d=>d.captures[0].purpose='BEFORE'],['library unknown timestamp',d=>d.captures[0].capturedAt=null],
 ['before finish',d=>d.captures[0].capturedAt='2026-10-28T00:00:00Z'],['no attestation',d=>d.captures[0].postRepairCapture=false],
 ['not VERIFIED',d=>d.captures[0].verified=false],
])test('T06C claim rejects '+label,async()=>{const h=claimHarness();await h.runtime.write(h.d);const draft=await h.m.prepareFieldRepairClaim(h.ctx,h.runtime);change(draft);await assert.rejects(h.m.submitFieldDraft(draft,h.runtime));assert.equal(h.posted(),undefined);});
test('T06C claim timeout retains body/key/version even if mutable draft changes',async()=>{
 const h=claimHarness();await h.runtime.write(h.d);const d=await h.m.prepareFieldRepairClaim(h.ctx,h.runtime),send=h.runtime.api.submitFieldTaskReal;let original;
 h.runtime.api.submitFieldTaskReal=async(...args)=>{original=JSON.stringify(args);throw Error('timeout');};
 await assert.rejects(h.m.submitFieldDraft(d,h.runtime));const saved=h.stored();saved.measurements[0].value=222;
 h.runtime.api.submitFieldTaskReal=async(...args)=>{assert.equal(JSON.stringify(args),original);return send(...args);};
 assert.equal((await h.m.submitFieldDraft(saved,h.runtime,true)).command.phase,'confirmed');
});
for(const [label,change] of [
 ['hash',s=>s.contentHash='fake'],['measurement',s=>s.captureType='MEASUREMENT'],['repaired',s=>s.repaired=false],
 ['parent',s=>s.parentId=ids.first],['root',s=>s.rootId=ids.first],['revision',s=>s.revision=2],
 ['checklist',s=>s.evidence[0].attemptChecklist=null],
])test('T06C claim GET mismatch '+label+' stays acknowledged',async()=>{
 const h=claimHarness();await h.runtime.write(h.d);const d=await h.m.prepareFieldRepairClaim(h.ctx,h.runtime),read=h.runtime.api.getFieldSubmissionDetailReal;
 h.runtime.api.getFieldSubmissionDetailReal=async()=>{const r=await read();change(r.data);return r;};
 await assert.rejects(h.m.submitFieldDraft(d,h.runtime));assert.equal(h.stored().command.phase,'acknowledged');
});
async function finishedForIntake(){
 const h=await started(),finish=await h.workflow.prepareRepairFinish(h.identity,h.runtime);
 await h.workflow.dispatchRepair(h.identity,finish.key,h.runtime);
 const field=claimHarness().m;
 h.workflow=load('src/api/crewRepairWorkflow.ts',{'./crewApi':h.runtime.api,'./crewRepairDraft':load('src/api/crewRepairDraft.ts',{'./crewApi':h.api,'../offline/database':{openDatabase:()=>h.port,initDatabase:async()=>{}}}),'./crewFieldDraft':field,'expo-crypto':{randomUUID:require('node:crypto').randomUUID}});
 const submissionId=require('node:crypto').randomUUID(),finishAt=new Date().toISOString();
 const body={originId:ids.first,startOriginId:ids.first,parentSubmissionId:null,captureType:'REPAIR_CLAIM',repaired:true,unrepairedReason:null,
  measurements:h.draft().measurements,evidence:[{captureOriginId:ids.capture,fileId:ids.file,purpose:'AFTER',checksumSha256:'a'.repeat(64),mediaType:'image/jpeg',capturedAt:finishAt,attemptChecklist:'POST_REPAIR_CAPTURE'}],locationProof:null};
 const claim={...h.identity,captures:[],measurements:body.measurements,repairClaim:{finishId:finish.receipt?.data.id??'11111111-1111-4111-8111-111111111111',executionStartId:ids.start,firstStartId:ids.first,finishAt,packageId:ids.packageId,itemId:ids.itemId,bindingId:ids.bindingId,assignmentId:ids.assignmentId,itemVersion:'AAAAAAAAAAM='},command:{key:require('node:crypto').randomUUID(),body,phase:'confirmed',assignmentId:ids.assignmentId,responseId:submissionId},result:{id:submissionId,contentHash:'b'.repeat(64)}};
 h.task.status='Submitted';h.task.latestSubmissionId=submissionId;
 h.runtime.fieldDraft=async()=>structuredClone(claim);
 h.runtime.api.getFieldSubmissionDetailReal=async()=>({data:{...structuredClone(body),id:submissionId,taskId:ids.taskId,rootId:submissionId,parentId:null,revision:1,contentHash:'b'.repeat(64),serverReceivedAt:new Date().toISOString(),readiness:'INCOMPLETE',missingReasons:['AFTER_ATTEMPT_BINDING_UNAVAILABLE']}});
 h.runtime.api.getFieldEvidenceReal=async()=>({fileId:ids.file,state:'VERIFIED',checksum:'a'.repeat(64),mediaType:'image/jpeg',sizeBytes:12});
 h.attemptCalls=[];
 h.runtime.api.submitRepairAttemptReal=async(...args)=>{h.attemptCalls.push(structuredClone(args));h.task.repairContext.status='Submitted';h.task.repairContext.itemVersion='AAAAAAAAAAQ=';return {etag:'"AAAAAAAAAAQ="',data:{attemptId:ids.assessment,linkId:ids.start,reviewClockId:ids.first,itemId:ids.itemId,submissionId,originalReviewDueAt:new Date().toISOString(),intakeReadiness:'INCOMPLETE'}};};
 return {...h,claim,body,submissionId};
}
test('T06C attempt uses confirmed root claim GET hash and finish receipt, never claims PM acceptance',async()=>{
 const h=await finishedForIntake(),c=await h.workflow.prepareRepairAttempt(h.identity,h.runtime);
 assert.equal(c.phase,'PREPARED');assert.equal(c.payload.expectedContentHash,'b'.repeat(64));assert.equal(c.payload.fieldSubmissionId,h.submissionId);
 assert.equal(c.payload.executionFinishId,'11111111-1111-4111-8111-111111111111');
 const result=await h.workflow.dispatchRepair(h.identity,c.key,h.runtime);assert.equal(result.phase,'CONFIRMED');assert.equal(result.receipt.data.intakeReadiness,'INCOMPLETE');assert.equal(h.task.repairContext.status,'Submitted');
});
for(const [label,change] of [
 ['MEASUREMENT',h=>h.claim.command.body.captureType='MEASUREMENT'],['wrong hash',h=>h.claim.result.contentHash='c'.repeat(64)],
 ['wrong binding',h=>h.task.repairContext.bindingId=ids.first],['not submitted',h=>h.task.status='InProgress'],
 ['wrong actor',h=>h.claim.actor=ids.first],['unconfirmed FIELD',h=>h.claim.command.phase='acknowledged'],
 ['old root',h=>h.task.latestSubmissionId=ids.first],['missing finish',h=>h.claim.repairClaim.finishId=ids.first],
])test('T06C attempt blocks '+label,async()=>{const h=await finishedForIntake();change(h);await assert.rejects(h.workflow.prepareRepairAttempt(h.identity,h.runtime));assert.equal(h.attemptCalls.length,0);});
for(const status of [401,403,409,412,428])test('T06C attempt rejection '+status+' keeps command',async()=>{
 const h=await finishedForIntake(),c=await h.workflow.prepareRepairAttempt(h.identity,h.runtime);
 h.runtime.api.submitRepairAttemptReal=async()=>{throw {response:{status}};};await assert.rejects(h.workflow.dispatchRepair(h.identity,c.key,h.runtime));
 assert.equal((await (await h.runtime.journal()).read(c.key)).phase,[401,409,412].includes(status)?'PENDING':'REJECTED');await assert.rejects(h.workflow.prepareRepairAttempt(h.identity,h.runtime));
});
for(const state of ['timeout before','timeout after','ACK disk'])test('T06C attempt '+state+' exact replay after restart',async()=>{
 const h=await finishedForIntake(),c=await h.workflow.prepareRepairAttempt(h.identity,h.runtime),send=h.runtime.api.submitRepairAttemptReal;let original;
 h.runtime.api.submitRepairAttemptReal=async(...args)=>{original=JSON.stringify(args);if(state!=='timeout before'){const response=await send(...args);if(state==='ACK disk'){h.saveFail(true);return response;}}throw Error('timeout');};
 await assert.rejects(h.workflow.dispatchRepair(h.identity,c.key,h.runtime));h.saveFail(false);
 h.runtime.api.submitRepairAttemptReal=async(...args)=>{assert.equal(JSON.stringify(args),original);return send(...args);};
 assert.equal((await h.workflow.dispatchRepair(h.identity,c.key,h.runtime)).phase,'CONFIRMED');
});
test('T06C attempt switched session and wrong receipt stay unconfirmed',async()=>{
 for(const mode of ['session','receipt']){const h=await finishedForIntake(),c=await h.workflow.prepareRepairAttempt(h.identity,h.runtime),send=h.runtime.api.submitRepairAttemptReal;
 h.runtime.api.submitRepairAttemptReal=async(...args)=>{const response=await send(...args);if(mode==='session')h.switch();else response.data.submissionId=ids.first;return response;};
 await assert.rejects(h.workflow.dispatchRepair(h.identity,c.key,h.runtime));
 assert.equal(JSON.parse(h.raw.prepare("SELECT payload FROM local_draft WHERE payload LIKE '%\"operation\":\"attempt\"%'").get().payload).phase,'PENDING');}
});
function screen(file,name,states,overrides={}){
 let slot=0;const routes=[],calls=[];
 const React={createElement:(type,props,...children)=>({type,props:{...props,children}}),useState:v=>[slot<states.length?states[slot++]:v,()=>{}],useRef:v=>({current:v}),useCallback:f=>f,useEffect:()=>{}};
 const identity={actor:ids.actor,scope:'session',projectId:ids.projectId,taskId:ids.taskId,environment:'fixture'};
 const draft={...identity,captures:[],measurements:[]};
 const deps={react:React,'react-native':{StyleSheet:{create:v=>v}},'expo-router':{router:{push:v=>routes.push(v)},useFocusEffect:f=>f(),useLocalSearchParams:()=>({mode:'AFTER'})},
 '../../src/design-tokens':{colors:{},radius:{},spacing:{},typography:{}},'./tasks':{useCrewIdentity:()=>({user:{id:ids.actor},scope:'session'})},
 '../../src/api/crewApi':{normalRepairBlock:()=>null,fieldCapabilityBlock:()=>null},
 '../../src/hooks/useRepairBootstrap':{useRepairBootstrap:()=>({status:'ready',repairContext:{status:'InProgress'},reload:async()=>{}})},
 '../../src/api/crewRepairDraft':{currentRepairIdentity:()=>identity,sameRepairIdentity:()=>true},
 '../../src/api/crewFieldDraft':{prepareFieldRepairClaim:async()=>{calls.push('claim');return draft;},currentFieldContext:()=>identity,openFieldRuntime:async()=>({}),loadFieldDraft:async()=>draft},
 '../../src/api/crewRepairWorkflow':{readRepairHistory:async()=>states[0]??[],readRepairFieldDraft:async()=>draft,repairErrorMessage:()=>'',
 prepareRepairFinish:async()=>{calls.push('finish');return {key:'finish'};},prepareRepairAttempt:async()=>{calls.push('attempt');return {key:'attempt'};},dispatchRepair:async()=>{calls.push('POST');return {phase:'CONFIRMED'};}},...overrides};
 const ts=require('typescript'),module={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8')+(name==='NormalRepairBootstrap'?'':'\nexport { '+name+' };'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,{module,exports:module.exports,require:n=>deps[n]??new Proxy({},{get:(_,p)=>String(p)})});
 const rendered=module.exports[name]({task:{id:ids.taskId,projectId:ids.projectId,detail:{mode:'NORMAL',purpose:'PostRepair',firstStartOriginId:ids.first}}});
 const nodes=[];function visit(x){if(Array.isArray(x))return x.forEach(visit);if(x&&typeof x==='object'){nodes.push(x);visit(x.props?.children);}}visit(rendered);
 return {nodes,routes,calls};
}
for(const operation of ['finish','attempt','claim'])test('T06C UI explicit '+operation+' works through detail and never opens legacy repair',async()=>{
 const history=[{key:'start',operation:'start',phase:'CONFIRMED'}];if(operation!=='finish')history.push({key:'finish',operation:'finish',phase:'CONFIRMED'});
 const draft={captures:[],measurements:[],...(operation==='attempt'?{repairClaim:{},command:{phase:'confirmed'}}:{})};
 const h=screen('app/(crew)/wo-detail.tsx','NormalRepairBootstrap',[history,draft,'',false,true]);
 assert.equal(h.calls.length,0);
 const title={finish:'Kết thúc thi công',attempt:'Nộp hồ sơ chờ PM đánh giá',claim:'Chụp AFTER / lập hồ sơ sửa chữa'}[operation];
 const button=h.nodes.find(n=>n.props.title===title);assert.equal(!!button.props.disabled,false);button.props.onPress();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.calls[0],operation);if(operation!=='claim')assert.equal(h.calls[1],'POST');else {assert.equal(h.routes[0].pathname,'/(crew)/viewfinder');assert.equal(h.routes[0].params.mode,'AFTER');}
 assert.ok(!h.routes.some(r=>/complete|progress|repair-correction/.test(r.pathname)));
});
for(const phase of ['PENDING','ACKNOWLEDGED','REJECTED'])test('T06C UI '+phase+' cannot open finish or claim replacement',()=>{
 const h=screen('app/(crew)/wo-detail.tsx','NormalRepairBootstrap',[[{key:'x',operation:'start',phase}],{captures:[],measurements:[]},'',false,true]);
 for(const title of ['Kết thúc thi công','Chụp AFTER / lập hồ sơ sửa chữa','Nộp hồ sơ chờ PM đánh giá'])assert.equal(h.nodes.find(n=>n.props.title===title).props.disabled,true);
});
for(const [label,claim,attestation] of [['missing finish',false,false],['no attestation',true,false],['confirmed source',true,true]])test('T06C camera AFTER '+label+' nullable GPS stays real',()=>{
 const draft={captures:[],...(claim?{repairClaim:{}}:{})};
 const h=screen('app/(crew)/viewfinder.tsx','CrewViewfinderScreenContent',['after',false,'back',null,draft,false,'',true,attestation]);
 const camera=h.nodes.find(n=>n.props.onCapture);assert.equal(camera.props.disabled,!claim||!attestation);
 assert.equal(camera.props.leftControl.props.disabled,true);
});
test('T06C AFTER upload revalidates VERIFIED without creating a duplicate session',async()=>{
 const h=claimHarness();await h.runtime.write(h.d);let d=await h.m.prepareFieldRepairClaim(h.ctx,h.runtime);
 for(let n=0;n<2;n++)d=await h.m.uploadFieldCapture(d,0,h.runtime);
 assert.equal(d.captures[0].verified,true);assert.equal(h.calls.filter(c=>c==='create').length,0);
});
test('T06C claim wrong-owner file prevents FIELD POST and preserves draft',async()=>{
 const h=claimHarness();await h.runtime.write(h.d);const d=await h.m.prepareFieldRepairClaim(h.ctx,h.runtime);
 h.runtime.api.getCrewFileMetadata=async()=>{throw {response:{status:403}};};
 await assert.rejects(h.m.submitFieldDraft(d,h.runtime));assert.equal(h.posted(),undefined);assert.equal(h.stored().command,undefined);
});
test('T06C claim timeout after server commit recovers same root using exact replay',async()=>{
 const h=claimHarness();await h.runtime.write(h.d);const d=await h.m.prepareFieldRepairClaim(h.ctx,h.runtime),send=h.runtime.api.submitFieldTaskReal;let original;
 h.runtime.api.submitFieldTaskReal=async(...args)=>{original=JSON.stringify(args);await send(...args);throw Error('timeout after commit');};
 await assert.rejects(h.m.submitFieldDraft(d,h.runtime));assert.equal(h.stored().command.phase,'pending');assert.equal(h.task.status,'Submitted');
 h.runtime.api.submitFieldTaskReal=async(...args)=>{assert.equal(JSON.stringify(args),original);return send(...args);};
 assert.equal((await h.m.submitFieldDraft(h.stored(),h.runtime,true)).command.phase,'confirmed');
});
test('T06C claim ACK readback with replaced binding cannot confirm',async()=>{
 const h=claimHarness();await h.runtime.write(h.d);const d=await h.m.prepareFieldRepairClaim(h.ctx,h.runtime),read=h.runtime.api.getFieldSubmissionDetailReal;
 h.runtime.api.getFieldSubmissionDetailReal=async()=>{const r=await read();h.task.repairContext.bindingId=ids.first;return r;};
 await assert.rejects(h.m.submitFieldDraft(d,h.runtime));assert.equal(h.stored().command.phase,'acknowledged');
});
test('T06C attempt claim received before finish is never journaled or sent',async()=>{
 const h=await finishedForIntake(),read=h.runtime.api.getFieldSubmissionDetailReal;
 h.runtime.api.getFieldSubmissionDetailReal=async()=>{const r=await read();r.data.serverReceivedAt='2000-01-01T00:00:00Z';return r;};
 await assert.rejects(h.workflow.prepareRepairAttempt(h.identity,h.runtime));assert.equal(h.attemptCalls.length,0);
});
