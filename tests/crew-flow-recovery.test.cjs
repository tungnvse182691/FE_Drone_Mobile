const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {harness}=new Function('require',fs.readFileSync('tests/t06b.test.cjs','utf8').split("test('T06B journal")[0]+';return {harness}')(require);
for(const status of [409,412])test('Crew recovery keeps HTTP '+status+' unresolved and replays exact intent',async()=>{
 const h=harness(),j=await h.runtime.journal(),c=await j.prepare(h.command());h.fail({response:{status}});
 await assert.rejects(h.workflow.dispatchRepair(h.identity,c.key,h.runtime));
 assert.equal((await j.read(c.key)).phase,'PENDING');await assert.rejects(j.prepare(h.command()));
 h.fail(null);assert.equal((await h.workflow.dispatchRepair(h.identity,c.key,h.runtime)).phase,'CONFIRMED');assert.deepEqual(h.calls[0],h.calls[1]);
});
test('Crew NORMAL replay rejection cannot prove an earlier timed-out command had no effect',async()=>{
 const h=harness(),j=await h.runtime.journal(),c=await j.prepare(h.command());h.fail(Error('timeout'));
 await assert.rejects(h.workflow.dispatchRepair(h.identity,c.key,h.runtime));
 h.fail({response:{status:403}});await assert.rejects(h.workflow.dispatchRepair(h.identity,c.key,h.runtime));
 assert.equal((await j.read(c.key)).phase,'PENDING');await assert.rejects(j.prepare(h.command()));
});
test('Crew restore truthful labels and shared specialized NORMAL screens',()=>{
 const read=p=>fs.readFileSync(p,'utf8');assert.match(read('app/(crew)/sync.tsx'),/done: 'Đã xác nhận'/);
 for(const p of ['progress','complete']){const s=read('app/(crew)/'+p+'.tsx');assert.match(s,/NormalRepairPanel/);assert.match(s,/CrewTaskBoundary operational=\{false\}/);assert.doesNotMatch(s,/dispatchRepair|useEffect|LockedRepairScreen/);}
 for(const p of ['home','tasks']){const s=read('app/(crew)/'+p+'.tsx');assert.match(s,/task.wo_code \|\| `ID nhiệm vụ:/);assert.doesNotMatch(s,/Chưa có mã công việc/);}
});
const vm=require('node:vm'),path=require('node:path');
test('Crew specialized routes and recovery modules have no runtime import cycle',()=>{
 const ts=require('typescript'),done=new Set(),stack=[];
 function visit(file){file=path.resolve(file);if(stack.includes(file))assert.fail(stack.concat(file).map(p=>path.relative(process.cwd(),p)).join(' -> '));if(done.has(file))return;
  stack.push(file);const ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
  for(const n of ast.statements){if(!(ts.isImportDeclaration(n)||ts.isExportDeclaration(n))||!n.moduleSpecifier||n.isTypeOnly||n.importClause?.isTypeOnly)continue;
   const spec=n.moduleSpecifier.text;if(!spec.startsWith('.'))continue;const base=path.resolve(path.dirname(file),spec),next=['.ts','.tsx','/index.ts','/index.tsx'].map(ext=>base+ext).find(p=>fs.existsSync(p));if(next)visit(next);
  }stack.pop();done.add(file);
 }
 for(const entry of ['app/(crew)/progress.tsx','app/(crew)/complete.tsx','src/api/crewFieldDraft.ts','src/api/crewRepairWorkflow.ts'])visit(entry);
});
const scope={require:n=>n==='node:test'?{test:()=>{}}:require(n),console,process,Buffer,__dirname:path.resolve('tests'),structuredClone,setTimeout,clearTimeout,URL,Uint8Array,AbortController};
vm.runInNewContext(fs.readFileSync('tests/hardening-field.test.cjs','utf8')+';globalThis.fieldFixtures={durableField,claimHarness};',scope);
const {durableField,claimHarness}=scope.fieldFixtures;
test('Crew FIELD starts a fresh session draft only after old resolved data and fresh task authorization',async()=>{
 const h=claimHarness(),old={...h.ctx,scope:JSON.stringify([h.ctx.actor,'old'])},now={...old,scope:JSON.stringify([h.ctx.actor,'new'])};
 let authorized=true,gets=0;
 const d=durableField(old,{validateCrewTaskDetail:()=>{},fieldCapabilityBlock:()=>authorized?null:'field_not_in_progress',
  getFieldInspectionTaskDetailReal:async()=>{gets++;return {data:{id:now.taskId,projectId:now.projectId},etag:'"fresh"'};}});
 const source={...old,captures:[{id:'old-photo'}],measurements:[],locationProof:null};d.seed(source);
 const bytes=d.rows()[0].payload;d.reopen();d.set(now);
 await assert.rejects(d.m.loadFieldDraft(now,await d.m.openFieldRuntime(now)),/previous_session/);
 authorized=false;await assert.rejects(d.m.startNewFieldSessionDraft(now),/field_not_in_progress/);assert.equal(d.rows().length,1);
 authorized=true;const fresh=await d.m.startNewFieldSessionDraft(now);
 assert.equal(fresh.scope,now.scope);assert.equal(fresh.captures.length,0);assert.equal(d.rows()[0].payload,bytes);assert.equal(gets,2);
 await assert.rejects(d.m.startNewFieldSessionDraft(now),/field_current_draft_exists/);
 d.reopen();assert.equal((await d.m.loadFieldDraft(now,await d.m.openFieldRuntime(now))).captures.length,0);d.close();
});
test('Crew FIELD cannot start a new draft while an old command is unresolved',async()=>{
 const h=claimHarness(),old={...h.ctx,scope:JSON.stringify([h.ctx.actor,'old'])},now={...old,scope:JSON.stringify([h.ctx.actor,'new'])};
 const source={...old,captures:[],measurements:[],locationProof:null,command:{key:'original',phase:'pending'}};
 const d=durableField(old);d.seed(source);const bytes=d.rows()[0].payload;d.set(now);
 await assert.rejects(d.m.startNewFieldSessionDraft(now),/previous_session/);
 assert.equal(d.rows().length,1);assert.equal(d.rows()[0].payload,bytes);d.close();
});
test('Crew FIELD old-session uncertain upload cancel survives SQLite reopen and blocks a new draft',async()=>{
 const h=claimHarness(),old={...h.ctx,scope:JSON.stringify([h.ctx.actor,'old-cancel'])},now={...old,scope:JSON.stringify([h.ctx.actor,'new-cancel'])};
 const source={...old,captures:[{id:'photo',uri:'file://kept',parts:[],upload:{id:'old-upload',status:'UPLOADING'},cancelState:'UNKNOWN'}],measurements:[],locationProof:null};
 const d=durableField(old);d.seed(source);const bytes=d.rows()[0].payload;d.reopen();d.set(now);
 await assert.rejects(d.m.loadFieldDraft(now,await d.m.openFieldRuntime(now)),/previous_session/);
 await assert.rejects(d.m.startNewFieldSessionDraft(now),/previous_session/);
 assert.equal(d.rows()[0].payload,bytes);assert.equal(d.rows()[0].payload.includes('file://kept'),true);d.close();
});
for(const status of [401,409,412])test('Crew FIELD old sid '+status+' exact replay is additive and survives reopen',async()=>{
 const h=claimHarness(),old={...h.ctx,scope:JSON.stringify([h.ctx.actor,'old'])},now={...old,scope:JSON.stringify([h.ctx.actor,'new'])};
 const submission=require('node:crypto').randomUUID(),body={originId:require('node:crypto').randomUUID(),startOriginId:require('node:crypto').randomUUID(),parentSubmissionId:null,evidence:[],measurements:[]};
 const source={...old,captures:[],measurements:[],locationProof:null,command:{key:'exact-key',body,assignmentId:require('node:crypto').randomUUID(),ifMatch:'"AAAAAAAAB9E="',phase:'rejected',rejectionStatus:status}};
 const task={id:old.taskId,projectId:old.projectId,assignedToUserId:old.actor,assignmentId:source.command.assignmentId,firstStartOriginId:body.startOriginId};let posts=0;
 const api={validateCrewTaskDetail:()=>{},getFieldInspectionTaskDetailReal:async()=>({data:task,etag:source.command.ifMatch}),
 submitFieldTaskReal:async(...args)=>{posts++;assert.equal(JSON.stringify(args),JSON.stringify([old.projectId,old.taskId,body,source.command.ifMatch,'exact-key']));return {data:{id:submission,taskId:old.taskId}};},
 getFieldSubmissionDetailReal:async()=>({data:{id:submission,taskId:old.taskId,contentHash:'real-readback',parentId:null}})};
 const d=durableField(old,api);d.seed(source);const original=d.rows()[0].payload;d.reopen();d.set(now);
 await assert.rejects(d.m.reconcileFieldDraft(now),/unknown_outcome/);assert.equal(posts,0);
 const done=await d.m.reconcileFieldDraft(now,true);assert.equal(done.command.phase,'confirmed');assert.equal(d.rows()[0].payload,original);assert.equal(posts,1);
 d.reopen();assert.equal((await d.m.readFieldRecovery(now)).draft.command.phase,'confirmed');
 const next=await d.m.acknowledgeFieldResult(now);assert.equal(next.scope,now.scope);assert.equal(next.captures.length,0);assert.equal(d.rows()[0].payload,original);d.reopen();assert.equal((await d.m.loadFieldDraft(now,await d.m.openFieldRuntime(now))).command,undefined);d.close();
});
test('Crew FIELD same-session confirmed intent is never overwritten by next revision',async()=>{
 const h=claimHarness(),c={...h.ctx,scope:JSON.stringify([h.ctx.actor,'same'])},source={...h.d,...c};
 source.command={key:'saved-key',body:{startOriginId:'first'},assignmentId:'assigned',ifMatch:'"AAAAAAAAB9E="',phase:'confirmed',responseId:require('node:crypto').randomUUID()};
 const d=durableField(c,{validateCrewTaskDetail:()=>{},getFieldInspectionTaskDetailReal:async()=>({data:{assignmentId:'assigned',firstStartOriginId:'first'},etag:'"AAAAAAAAB9E="'})});
 delete source.repairClaim;d.seed(source);const bytes=d.rows()[0].payload;
 await d.m.acknowledgeFieldResult(c);assert.equal(d.rows()[0].payload,bytes);assert.equal(d.rows().filter(r=>r.kind==='T05B_FIELD').length,2);d.reopen();assert.equal((await d.m.loadFieldDraft(c,await d.m.openFieldRuntime(c))).command,undefined);d.close();
});
test('Crew FIELD durable overlay preserves pending source and rejects rollback or changed command',async()=>{
 const h=claimHarness(),c={...h.ctx,scope:JSON.stringify([h.ctx.actor,'same'])};
 const source={...c,captures:[],measurements:[],locationProof:null,command:{key:'durable',body:{originId:require('node:crypto').randomUUID()},assignmentId:'assignment',ifMatch:'"AAAAAAAAB9E="',phase:'pending'}};
 const d=durableField(c);d.seed(source);const original=d.rows()[0].payload;
 let r=await d.m.openFieldRuntime(c);const ack=structuredClone(source);ack.command.phase='acknowledged';ack.command.responseId=require('node:crypto').randomUUID();await r.write(ack);
 assert.equal(d.rows()[0].payload,original);d.reopen();r=await d.m.openFieldRuntime(c);assert.equal((await r.read()).command.phase,'acknowledged');
 await assert.rejects(r.write(source),/field_draft_invalid/);
 const changed=structuredClone(ack);changed.command.ifMatch='"AAAAAAAAB9I="';await assert.rejects(r.write(changed),/field_draft_invalid/);
 const confirmed=structuredClone(ack);confirmed.command.phase='confirmed';await r.write(confirmed);d.reopen();assert.equal((await (await d.m.openFieldRuntime(c)).read()).command.phase,'confirmed');assert.equal(d.rows()[0].payload,original);
 d.set({...c,actor:require('node:crypto').randomUUID()});await assert.rejects(r.read(),/field_session_changed/);d.close();
});

test('Crew definitive rejection requires explicit verified resolution before a new assessment',async()=>{
 const h=harness(),j=await h.runtime.journal(),c=await j.prepare(h.command());h.fail({response:{status:422,data:{code:'repair_input_invalid'}}});
 await assert.rejects(h.workflow.dispatchRepair(h.identity,c.key,h.runtime));const bytes=h.raw.prepare('SELECT payload FROM local_draft WHERE kind=?').get('T06A_REPAIR_COMMAND').payload;
 await assert.rejects(h.workflow.prepareRepairAssessment(h.identity,h.draft(),h.runtime));
 await h.workflow.resolveRepairRejection(h.identity,c.key,h.runtime);
 const replacement=await h.workflow.prepareRepairAssessment(h.identity,h.draft(),h.runtime);
 assert.notEqual(replacement.key,c.key);assert.equal(h.raw.prepare('SELECT payload FROM local_draft WHERE kind=? ORDER BY rowid').all('T06A_REPAIR_COMMAND')[0].payload,bytes);
 assert.equal((await j.history())[0].phase,'REJECTED');assert.equal((await j.history())[0].rejectionResolved,true);
});
for(const change of ['unknown','legacy','version','binding','session'])test('Crew rejection resolution fails closed for '+change,async()=>{
 const h=harness(),j=await h.runtime.journal(),c=await j.prepare(h.command());h.fail(change==='unknown'?Error('timeout'):{response:{status:403}});
 await assert.rejects(h.workflow.dispatchRepair(h.identity,c.key,h.runtime));
 if(change==='legacy')h.raw.prepare('DELETE FROM local_draft WHERE kind=?').run('CREW_REPAIR_REJECTION_PROOF');
 if(change==='version')h.task.repairContext.itemVersion='AAAAAAAAAAM=';
 if(change==='binding')h.task.repairContext.bindingId=require('node:crypto').randomUUID();
 if(change==='session')h.switch();
 await assert.rejects(h.workflow.resolveRepairRejection(h.identity,c.key,h.runtime));await assert.rejects(j.prepare(h.command()));
});
vm.runInNewContext(';globalThis.repairFixtures=sandbox.fixtures;',scope);
const repairFixtures=scope.repairFixtures;
for(const op of ['start','finish','attempt'])test('Crew explicit definitive '+op+' recovery keeps original bytes and permits one corrected intent',async()=>{
 const h=op==='start'?harness():op==='finish'?await repairFixtures.started():await repairFixtures.finishedForIntake();
 if(op==='start'){const j=await h.runtime.journal(),a=await j.prepare(h.command());await h.workflow.dispatchRepair(h.identity,a.key,h.runtime);}
 const prepare=()=>h.workflow[op==='start'?'prepareRepairStart':op==='finish'?'prepareRepairFinish':'prepareRepairAttempt'](h.identity,h.runtime);
 const method=op==='start'?'startRepairExecutionReal':op==='finish'?'finishRepairExecutionReal':'submitRepairAttemptReal';
 const command=await prepare(),send=h.runtime.api[method];h.runtime.api[method]=async()=>{throw {response:{status:422}};};
 await assert.rejects(h.workflow.dispatchRepair(h.identity,command.key,h.runtime));
 const j=await h.runtime.journal(),before=(await j.historicalRead(command.key)),bytes=JSON.stringify(before);
 await assert.rejects(prepare());await h.workflow.resolveRepairRejection(h.identity,command.key,h.runtime);
 const replacement=await prepare();assert.notEqual(replacement.key,command.key);h.runtime.api[method]=send;
 assert.equal((await h.workflow.dispatchRepair(h.identity,replacement.key,h.runtime)).phase,'CONFIRMED');
 const after=await j.historicalRead(command.key);delete after.rejectionResolved;assert.equal(JSON.stringify(after),bytes);
 assert.equal((await h.workflow.readRepairHistory(h.identity,h.runtime)).filter(c=>c.operation===op).length,1);
});
test('Crew rejection proof/resolution survive SQLite close/reopen and require new session confirmation until consumed',async()=>{
 const folder=fs.mkdtempSync(path.resolve('.cache/crew-rejection-')),file=path.join(folder,'journal.db');
 const h=harness({file}),j=await h.runtime.journal(),c=await j.prepare(h.command());h.fail({response:{status:422}});
 await assert.rejects(h.workflow.dispatchRepair(h.identity,c.key,h.runtime));const original=h.raw.prepare('SELECT payload FROM local_draft WHERE kind=?').get('T06A_REPAIR_COMMAND').payload;
 h.reopen();await h.workflow.resolveRepairRejection(h.identity,c.key,h.runtime);h.reopen();assert.equal((await (await h.runtime.journal()).history())[0].rejectionResolved,true);
 const i=h.switch();h.runtime.journal=identity=>h.runtime.current()&&jFactory(identity);
 // Reuse the real journal module with the reopened SQLite port and current identity.
 const jFactory=identity=>repairFixtures.load('src/api/crewRepairDraft.ts',{'./crewApi':h.api,'../offline/database':{openDatabase:()=>h.port,initDatabase:async()=>{}},'./authApi':{},'./client':{}}).openRepairJournal(identity,h.runtime.current);
 assert.equal((await (await h.runtime.journal(i)).history())[0].rejectionResolved,undefined);
 await assert.rejects(h.workflow.prepareRepairAssessment(i,{...h.draft(),...i},h.runtime));
 await h.workflow.resolveRepairRejection(i,c.key,h.runtime);const replacement=await h.workflow.prepareRepairAssessment(i,{...h.draft(),...i},h.runtime);
 h.fail(null);await h.workflow.dispatchRepair(i,replacement.key,h.runtime);h.reopen();
 assert.equal(h.raw.prepare('SELECT payload FROM local_draft WHERE kind=? ORDER BY rowid').all('T06A_REPAIR_COMMAND')[0].payload,original);
 const third={...i,scope:JSON.stringify([i.actor,'C'])};h.runtime.current=()=>third;
 const next=await h.workflow.prepareRepairStart(third,h.runtime);assert.equal(next.operation,'start');h.raw.close();
});
test('Crew timeout then late HTTP rejection never creates definitive proof or replacement key',async()=>{
 const h=harness(),j=await h.runtime.journal(),c=await j.prepare(h.command());let reject;
 const late=new Promise((_,r)=>reject=r);h.runtime.api.submitRepairAssessmentReal=()=>late;
 const pending=h.workflow.dispatchRepair(h.identity,c.key,h.runtime);await new Promise(r=>setImmediate(r));h.switch();reject({response:{status:422}});await assert.rejects(pending);
 assert.equal(h.raw.prepare('SELECT COUNT(*) AS n FROM local_draft WHERE kind=?').get('CREW_REPAIR_REJECTION_PROOF').n,0);
 assert.equal(JSON.parse(h.raw.prepare('SELECT payload FROM local_draft WHERE kind=?').get('T06A_REPAIR_COMMAND').payload).phase,'PENDING');
});
const {screen:mount,deferred}=require('./helpers/roadfe-screen.cjs');
function normalScreen(stage,rows=[],extra={}){
 const h=harness();let current=h.identity,history=rows,posts=0,resolutions=0;
 const journal={currentRepairIdentity:()=>current,sameRepairIdentity:(a,b)=>!!a&&!!b&&['actor','scope','environment','taskId','projectId'].every(k=>a[k]===b[k])};
 const s=mount('app/(crew)/wo-detail.tsx',{exportName:'NormalRepairBootstrap',props:{stage,task:{id:h.identity.taskId,projectId:h.identity.projectId,detail:h.task,etag:'"'+h.task.version+'"'}},modules:{
  'expo-crypto':{randomUUID:require('node:crypto').randomUUID},'../../src/offline/database':{},'./tasks':{useCrewIdentity:()=>({scope:current?.scope,user:current?{id:current.actor}:null})},
  '../../src/hooks/useRepairBootstrap':{useRepairBootstrap:()=>({status:'ready',repairContext:h.task.repairContext,reload:async()=>{}})},
  '../../src/api/crewApi':h.api,'../../src/api/crewRepairDraft':journal,
  '../../src/api/crewRepairWorkflow':{readRepairHistory:async()=>history,readRepairFieldDraft:async()=>h.draft(),repairErrorMessage:e=>e.message,
   resolveRepairRejection:async()=>{resolutions++;history=history.map(c=>({...c,rejectionResolved:true}));},dispatchRepair:async()=>{posts++;return {phase:'CONFIRMED'};},...extra},
  '../../src/components/AppHeader':{AppHeader:'AppHeader'},'../../src/components/Chip':{Chip:'Chip'},'../../src/api/crewFieldDraft':{},'../../src/components/Card':{Card:'Card'},'../../src/components/crew/CrewTaskFacts':{CrewTaskFacts:'CrewTaskFacts'},
 }});return {s,posts:()=>posts,resolutions:()=>resolutions,switch:()=>current=null};
}
for(const stage of ['progress','closeout'])test('Crew mounted '+stage+' filters actual action groups without a second dispatcher',async()=>{
 const f=normalScreen(stage);f.s.render();await f.s.flush();const titles=f.s.nodes().filter(n=>n.type==='Button').map(n=>n.props.title);
 for(const title of ['Gửi đánh giá trước sửa','Bắt đầu thi công','Kết thúc thi công'])assert.equal(titles.includes(title),stage==='progress');
 for(const title of ['Chụp ảnh sau sửa / lập hồ sơ sửa chữa','Nộp hồ sơ chờ quản lý đánh giá'])assert.equal(titles.includes(title),stage==='closeout');
 assert.equal(f.posts(),0);f.s.unmount();
});
test('Crew mounted definitive recovery requires explicit confirmation and cannot POST or survive actor switch',async()=>{
 const f=normalScreen('progress',[{key:'rejected',operation:'assessment',phase:'REJECTED'}]);f.s.render();await f.s.flush();
 f.s.press('Kiểm tra để chuẩn bị lại thao tác bị từ chối');f.s.render();assert.equal(f.resolutions(),0);
 const confirm=f.s.nodes().find(n=>n.props.title==='Xác nhận giải quyết lệnh bị từ chối').props.onPress;f.switch();await confirm();assert.equal(f.resolutions(),0);assert.equal(f.posts(),0);f.s.unmount();
 const g=normalScreen('progress',[{key:'rejected',operation:'assessment',phase:'REJECTED'}]);g.s.render();await g.s.flush();g.s.press('Kiểm tra để chuẩn bị lại thao tác bị từ chối');g.s.render();g.s.press('Xác nhận giải quyết lệnh bị từ chối');await g.s.flush();assert.equal(g.resolutions(),1);assert.equal(g.posts(),0);g.s.unmount();
});
function fieldScreen(phase,responseId){
 const h=harness(),c=h.identity;let reconciles=[];
 const draft={...c,captures:[],measurements:[],locationProof:null,command:{key:'immutable',phase,responseId}};
 const s=mount('app/(crew)/field-review.tsx',{expose:'CrewFieldReviewScreenContent',exportName:'CrewFieldReviewScreenContent',props:{task:{id:c.taskId,projectId:c.projectId,task_mode:'NORMAL',detail:h.task}},modules:{
  'expo-crypto':{randomUUID:require('node:crypto').randomUUID},'./tasks':{useCrewIdentity:()=>({scope:c.scope,user:{id:c.actor}}),TASK_MODE_CHIP:{NORMAL:{label:'Theo kế hoạch'}}},
  '../../src/api/crewApi':{fieldCapabilityBlock:()=>null,validateCrewTaskDetail:()=>{},getFieldInspectionTaskDetailReal:async()=>({data:h.task,etag:'"'+h.task.version+'"'})},
  '../../src/api/crewFieldDraft':{currentFieldContext:()=>c,openFieldRuntime:async()=>({}),loadFieldDraft:async()=>draft,measurementTemplate:()=>null,fieldDraftPending:d=>['pending','acknowledged'].includes(d.command?.phase),reconcileFieldDraft:async(...args)=>{reconciles.push(args);return draft;}},
  '../../src/components/AppHeader':{AppHeader:'AppHeader'},'../../src/components/Card':{Card:'Card'},'../../src/components/Chip':{Chip:'Chip'},'../../src/components/Toast':{Toast:'Toast'},
 }});return {s,reconciles};
}
test('Crew FIELD supplement saves local edits before camera and carries mode without remote mutation',async()=>{
 const h=harness(),c=h.identity,nav=[],events=[];let posts=0;
 const draft={...c,captures:[],measurements:[],locationProof:null};
 const s=mount('app/(crew)/field-review.tsx',{expose:'CrewFieldReviewScreenContent',exportName:'CrewFieldReviewScreenContent',props:{task:{id:c.taskId,projectId:c.projectId,task_mode:'NORMAL',detail:h.task}},
  moduleFactories:{'expo-router':({react})=>({router:{push:value=>{events.push('navigate');nav.push(value);}},useLocalSearchParams:()=>({supplement:'1'}),useFocusEffect:fn=>react.useEffect(fn,[fn])})},
  modules:{'expo-crypto':{randomUUID:require('node:crypto').randomUUID},'./tasks':{useCrewIdentity:()=>({scope:c.scope,user:{id:c.actor}}),TASK_MODE_CHIP:{NORMAL:{label:'Theo kế hoạch'}}},
   '../../src/api/crewApi':{fieldCapabilityBlock:()=>null,validateCrewTaskDetail:()=>{},getFieldInspectionTaskDetailReal:async()=>({data:h.task,etag:'"fresh"'})},
   '../../src/api/crewFieldDraft':{currentFieldContext:()=>c,openFieldRuntime:async()=>({}),loadFieldDraft:async()=>draft,saveFieldMeasurements:async()=>{events.push('save');return draft;},measurementTemplate:()=>null,fieldDraftPending:()=>false,submitFieldDraft:async()=>{posts++;}},
   '../../src/api/crewRepairDraft':{currentRepairIdentity:()=>null},'../../src/components/AppHeader':{AppHeader:'AppHeader'},'../../src/components/Card':{Card:'Card'},'../../src/components/Chip':{Chip:'Chip'},'../../src/components/Toast':{Toast:'Toast'}}});
 s.render();await s.flush();assert.deepEqual(events,[]);s.press('Chụp / chọn ảnh');await s.flush();assert.deepEqual(events,['save','navigate']);assert.equal(nav[0].pathname,'/(crew)/viewfinder');assert.equal(nav[0].params.supplement,'1');assert.equal(posts,0);s.unmount();
});
for(const phase of ['pending','acknowledged'])test('Crew mounted FIELD '+phase+' exposes only the applicable recovery action',async()=>{
 const f=fieldScreen(phase,phase==='acknowledged'?'server-submission':undefined);f.s.render();await f.s.flush();
 const read=f.s.nodes().find(n=>n.props.title==='Chỉ đọc lại kết quả — không gửi');assert.equal(read.props.disabled,phase==='pending');
 const replay=f.s.nodes().find(n=>n.props.title==='Đối soát / gửi lại đúng lệnh đã lưu');assert.equal(!!replay,phase==='pending');
 if(phase==='acknowledged'){f.s.press('Chỉ đọc lại kết quả — không gửi');await f.s.flush();assert.equal(f.reconciles.length,1);assert.equal(f.reconciles[0][1],false);}
 else{f.s.press('Đối soát / gửi lại đúng lệnh đã lưu');f.s.render();assert.equal(f.reconciles.length,0);f.s.press('Xác nhận gửi lại lệnh gốc');await f.s.flush();assert.equal(f.reconciles[0][1],true);assert.equal(f.reconciles[0][2],'immutable');}
 f.s.unmount();
});
for(const phase of ['none','pending','acknowledged'])test('Crew mounted FIELD old-session '+phase+' offers only safe recovery and keeps GET read-only',async()=>{
 const h=harness(),c=h.identity,old={...c,scope:JSON.stringify([c.actor,'old'])};let posts=0,news=0,reads=0,created=false;
 const historical={...old,captures:[],measurements:[],locationProof:null,...(phase==='none'?{}:{command:{key:'original',phase,...(phase==='acknowledged'?{responseId:'response'}:{})}})};
 const s=mount('app/(crew)/field-review.tsx',{expose:'CrewFieldReviewScreenContent',exportName:'CrewFieldReviewScreenContent',props:{task:{id:c.taskId,projectId:c.projectId,task_mode:'NORMAL',detail:h.task}},modules:{
  'expo-crypto':{randomUUID:require('node:crypto').randomUUID},'./tasks':{useCrewIdentity:()=>({scope:c.scope,user:{id:c.actor}}),TASK_MODE_CHIP:{NORMAL:{label:'Theo kế hoạch'}}},
  '../../src/api/crewApi':{fieldCapabilityBlock:()=>null,validateCrewTaskDetail:()=>{},getFieldInspectionTaskDetailReal:async()=>({data:h.task,etag:'"fresh"'})},
  '../../src/api/crewFieldDraft':{currentFieldContext:()=>c,openFieldRuntime:async()=>({recoveryRead:async()=>historical}),loadFieldDraft:async()=>{if(created)return {...c,captures:[],measurements:[]};throw Error('field_previous_session_requires_reconciliation');},fieldErrorMessage:e=>e.message,measurementTemplate:()=>null,fieldDraftPending:d=>['pending','acknowledged'].includes(d.command?.phase),startNewFieldSessionDraft:async()=>{news++;created=true;},reconcileFieldDraft:async()=>{posts++;}},
  '../../src/components/AppHeader':{AppHeader:'AppHeader'},'../../src/components/Card':{Card:'Card'},'../../src/components/Chip':{Chip:'Chip'},'../../src/components/Toast':{Toast:'Toast'},
 }});s.render();await s.flush();
 const titles=s.nodes().filter(n=>n.type==='Button').map(n=>n.props.title);
 assert.equal(titles.includes('Tạo nháp trống cho phiên này'),phase==='none');
 const displayed=s.nodes().filter(n=>n.type==='Text').flatMap(n=>n.props.children).join(' ');
 assert.match(displayed,phase==='none'?/Có nháp từ lần đăng nhập trước/:/Hồ sơ cần kiểm tra kết quả/);
 assert.doesNotMatch(displayed,/Đã khóa gửi lại để tránh ghi trùng/);
 assert.equal(titles.includes('Đối soát lệnh gốc'),phase==='pending');
 assert.equal(titles.includes('Đọc lại kết quả đã lưu'),phase==='acknowledged');
 assert.equal(titles.includes('Lưu nháp số đo'),false);assert.equal(posts,0);assert.equal(news,0);assert.equal(reads,0);
 assert.equal(s.nodes().filter(n=>typeof n.type==='function'&&n.type.name==='FieldErrorPanel').length,0,'recovery card already explains the old-session block');
 if(phase==='none') {
  s.press('Tạo nháp trống cho phiên này');s.render();
  assert.ok(!s.nodes().some(n=>n.props.title==='Tạo nháp trống cho phiên này'),'confirmation replaces the initial action instead of stacking it');
  assert.equal(news,0,'opening confirmation does not create a draft');
  s.press('Hủy');s.render();
  assert.equal(news,0,'cancel keeps the historical draft untouched');
  assert.ok(s.nodes().some(n=>n.props.title==='Tạo nháp trống cho phiên này'));
  assert.ok(!s.nodes().some(n=>n.props.title==='Xác nhận tạo nháp trống'));
  s.press('Tạo nháp trống cho phiên này');s.render();s.press('Xác nhận tạo nháp trống');await s.flush();
  assert.equal(news,1);assert.equal(posts,0);
  assert.ok(!JSON.stringify(s.nodes()).includes('field_previous_session_requires_reconciliation'),'successful new draft clears the stale recovery notice');
 }
 s.unmount();
});
test('Crew FIELD refresh preserves local editor until GET fails, then fails closed without false empty state',async()=>{
 const h=harness(),c=h.identity;let requests=0,post=0,fail=false;
 const draft={...c,captures:[],measurements:[],locationProof:null};
 const s=mount('app/(crew)/field-review.tsx',{expose:'CrewFieldReviewScreenContent',exportName:'CrewFieldReviewScreenContent',props:{task:{id:c.taskId,projectId:c.projectId,task_mode:'NORMAL',detail:h.task}},modules:{
  'expo-crypto':{randomUUID:require('node:crypto').randomUUID},'./tasks':{useCrewIdentity:()=>({scope:c.scope,user:{id:c.actor}}),TASK_MODE_CHIP:{NORMAL:{label:'Theo kế hoạch'}}},
  '../../src/api/crewApi':{fieldCapabilityBlock:()=>null,validateCrewTaskDetail:()=>{},getFieldInspectionTaskDetailReal:async()=>{requests++;if(fail)throw Error('GET failed');return {data:h.task,etag:'"fresh"'};}},
  '../../src/api/crewFieldDraft':{currentFieldContext:()=>c,openFieldRuntime:async()=>({}),loadFieldDraft:async()=>draft,fieldErrorMessage:e=>e.message,measurementTemplate:()=>null,fieldDraftPending:()=>false,submitFieldDraft:async()=>{post++;}},
  '../../src/components/AppHeader':{AppHeader:'AppHeader'},'../../src/components/Card':{Card:'Card'},'../../src/components/Chip':{Chip:'Chip'},'../../src/components/Toast':{Toast:'Toast'},
 }});s.render();await s.flush();assert.equal(requests,1);
 assert.ok(s.nodes().some(n=>n.props.title==='Lưu nháp số đo'));
 fail=true;const refresh=s.nodes().find(n=>n.props.accessibilityLabel==='Tải lại hồ sơ hiện trường');await refresh.props.onPress();await s.flush();
 assert.equal(requests,2);assert.equal(post,0);assert.ok(!s.nodes().some(n=>n.props.title==='Lưu nháp số đo'));
 assert.ok(!JSON.stringify(s.nodes()).includes('Chưa có lượt gửi từ máy chủ.'));s.unmount();
});
test('Crew FIELD cancel is per-photo, requires confirmation and never POSTs on mount',async()=>{
 const h=harness(),c=h.identity;let posts=0,selected=null;
 const first={id:'first',uri:'file://first',purpose:'BEFORE',coordinates:null,parts:[],size:3,upload:{id:'session-first',fileId:'file-first',status:'UPLOADING'}};
 const second={id:'second',uri:'file://second',purpose:'BEFORE',coordinates:null,parts:[],size:3,upload:{id:'session-second',fileId:'file-second',status:'VERIFIED'},verified:true};
 let draft={...c,captures:[first,second],measurements:[],locationProof:null};
 const s=mount('app/(crew)/field-review.tsx',{expose:'CrewFieldReviewScreenContent',exportName:'CrewFieldReviewScreenContent',props:{task:{id:c.taskId,projectId:c.projectId,task_mode:'NORMAL',detail:h.task}},modules:{
  'expo-crypto':{randomUUID:require('node:crypto').randomUUID},'./tasks':{useCrewIdentity:()=>({scope:c.scope,user:{id:c.actor}}),TASK_MODE_CHIP:{NORMAL:{label:'Theo kế hoạch'}}},
  '../../src/api/crewApi':{fieldCapabilityBlock:()=>null,validateCrewTaskDetail:()=>{},getFieldInspectionTaskDetailReal:async()=>({data:h.task,etag:'"fresh"'})},
  '../../src/api/crewFieldDraft':{currentFieldContext:()=>c,openFieldRuntime:async()=>({}),loadFieldDraft:async()=>draft,measurementTemplate:()=>null,fieldDraftPending:()=>false,
   cancelFieldUpload:async(_saved,index)=>{posts++;selected=index;draft={...draft,captures:draft.captures.map((photo,i)=>i===index?{...photo,cancelState:'CONFIRMED',upload:{...photo.upload,status:'FAILED',failureCode:'upload_cancelled'}}:photo)};return draft;}},
  '../../src/components/AppHeader':{AppHeader:'AppHeader'},'../../src/components/Card':{Card:'Card'},'../../src/components/Chip':{Chip:'Chip'},'../../src/components/Toast':{Toast:'Toast'},
 }});
 s.render();await s.flush();assert.equal(posts,0);
 assert.equal(s.nodes().filter(n=>n.props.title==='Hủy tải lên').length,1);
 s.press('Hủy tải lên');s.render();assert.equal(posts,0);
 s.press('Xác nhận');await s.flush();
 assert.equal(posts,1);assert.equal(selected,0);assert.equal(draft.captures[1].upload.status,'VERIFIED');
 assert.ok(JSON.stringify(s.nodes()).includes('Đã hủy phiên tải'));s.unmount();
});
test('Crew correction displays only reconciled local receipts and hides late history after session switch',async()=>{
 const h=harness(),read=deferred();let current=h.identity,reads=0;
 const s=mount('app/(crew)/repair-correction.tsx',{exportName:'CrewRepairReceiptHistory',props:{task:{id:h.identity.taskId,projectId:h.identity.projectId}},modules:{
  './tasks':{useCrewIdentity:()=>({scope:current?.scope,user:current?{id:current.actor}:null})},
  '../../src/api/crewRepairDraft':{currentRepairIdentity:()=>current,sameRepairIdentity:(a,b)=>!!b&&a.scope===b.scope},
  '../../src/api/crewRepairWorkflow':{readRepairHistory:async()=>{reads++;return read.promise;},repairErrorMessage:e=>e.message},
  '../../src/components/AppHeader':{AppHeader:'AppHeader'},'../../src/components/Card':{Card:'Card'},
 }});s.render();await s.flush();assert.equal(reads,1);current=null;s.render();read.resolve([{key:'receipt',operation:'attempt',phase:'CONFIRMED',receipt:{data:{intakeReadiness:'READY'}}}]);await s.flush();assert.ok(!JSON.stringify(s.nodes()).includes('Hồ sơ đủ thông tin tiếp nhận'));s.unmount();
});
