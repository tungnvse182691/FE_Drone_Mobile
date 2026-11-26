const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function harness(rows,afterRead=()=>{},detailRead=async()=>{throw Error('offline');},journalRows=[]) {
 const identity={actor:'actor',environment:'https://sandbox',scope:'session',role:'REPAIR_CREW',partition:'partition'};
 let current=identity,writes=0;
 const db={getAllAsync:async()=>{afterRead(()=>current=null);return rows;},runAsync:async()=>writes++};
 const comparator={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/crewRepairDraft.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:comparator,exports:comparator.exports,require:()=>({})});
 const module={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/crewLocalDrafts.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports,require:n=>({
  '../offline/database':{openDatabase:()=>db,initDatabase:async()=>{}},
  '../offline/upload-queue':{sameQueueIdentity:i=>i===current},
  './crewRepairDraft':comparator.exports,
  './crewOfflineJournal':{openOfflineJournal:async()=>({list:async()=>journalRows}),sameOfflinePartition:(a,b)=>a.actor===b.actor&&a.role===b.role&&a.environment===b.environment&&a.partition===b.partition},
  './crewApi':{isCrewResourceId:v=>['project','task'].includes(v),searchCrewTaskIdentityPage:detailRead},
 }[n]),AbortController});
 return {identity,m:module.exports,writes:()=>writes};
}
const draft={actor:'actor',environment:'https://sandbox',scope:'session',projectId:'project',taskId:'task',measurements:[{}],captures:[{uri:'private-file',verified:false},{uri:'private-file-2',verified:true}]};
test('Crew local draft index exposes counts, never private paths or command payloads and never writes',async()=>{
 const h=harness([{id:'row',payload:JSON.stringify(draft)}]),rows=await h.m.readCrewLocalDrafts(h.identity);
 assert.equal(rows[0].photos,2);assert.equal(rows[0].verifiedPhotos,1);assert.equal(rows[0].measurements,1);assert.equal(rows[0].currentSession,true);
 assert.ok(!JSON.stringify(rows).includes('private-file'));assert.equal(h.writes(),0);
});
test('Sync task code comes from the matching API037 task; offline or wrong identity gives no invented code',async()=>{
 const detail={id:'task',projectId:'project',crewId:'actor',taskCode:'REPAIR-real'};
 const h=harness([],undefined,async()=>({items:[detail]}));
 assert.equal(await h.m.readCrewLocalTaskCode(h.identity,draft), 'REPAIR-real');
 detail.id='wrong';assert.equal(await h.m.readCrewLocalTaskCode(h.identity,draft),null);
 detail.id='task';detail.crewId='other';assert.equal(await h.m.readCrewLocalTaskCode(h.identity,draft),null);
 const offline=harness([]);assert.equal(await offline.m.readCrewLocalTaskCode(offline.identity,draft),null);
});
test('Crew local draft index excludes other actors/environments and marks historical session',async()=>{
 const h=harness([draft,{...draft,actor:'other'},{...draft,environment:'other'},{...draft,scope:'old'}].map((d,i)=>({id:String(i),payload:JSON.stringify(d)})));
 const rows=await h.m.readCrewLocalDrafts(h.identity);assert.equal(rows.length,2);assert.equal(rows[1].currentSession,false);
});
test('Crew local draft index rejects results after session changes across SQLite await',async()=>{
 const h=harness([{id:'row',payload:JSON.stringify(draft)}],switchSession=>switchSession());
 await assert.rejects(()=>h.m.readCrewLocalDrafts(h.identity),/crew_session_changed/);
});
test('Crew local index groups retained generations by project and task without treating command history as sent',async()=>{
 const h=harness([
  {id:'new',updated_at:'2026-11-13T10:00:00.000Z',payload:JSON.stringify(draft)},
  {id:'old',payload:JSON.stringify({...draft,scope:'old',command:{phase:'acknowledged',body:{private:'secret'}}})},
 ]);
 const rows=await h.m.readCrewLocalDrafts(h.identity),groups=h.m.groupCrewLocalDrafts(rows);
 assert.equal(rows.length,2);assert.equal(groups.length,1);assert.equal(groups[0].versions,2);
 assert.equal(groups[0].latest.id,'new');assert.equal(groups[0].latest.updatedAt,'2026-11-13T10:00:00.000Z');
 assert.equal(groups[0].hasCommand,true);assert.equal(groups[0].latest.hasCommand,false);
 assert.ok(!JSON.stringify(groups).includes('secret'));assert.equal(h.writes(),0);
 assert.equal(h.m.groupCrewLocalDrafts([...rows,{...rows[0],projectId:'another'}]).length,2);
});

function assessmentFixture(change){
 const d={...draft,captures:[{id:'capture',uri:'private',verified:true,upload:{fileId:'file',status:'VERIFIED'},purpose:'BEFORE',checksum:'a'.repeat(64),mediaType:'image/jpeg',capturedAt:'2026-11-26T00:00:00Z'}],measurements:[{sampleId:'sample',kind:'DEPTH',value:3.5}],locationProof:{chainageMeters:50}},i={actor:d.actor,environment:d.environment,scope:d.scope,role:'REPAIR_CREW',partition:'partition'};
 const op={kind:'REPAIR_ASSESSMENT',originId:'origin',effectId:'effect',taskId:d.taskId,assignmentId:'assignment',snapshotId:'snapshot',taskVersion:'version',originalActorId:d.actor,sourceDeviceId:'device',repair:{resourceId:'item',assessment:{originId:'origin',fieldFirstStartId:'first',deviceId:'device',measurements:[{...d.measurements[0],value:{decimal:'3.5'}}],locationProof:d.locationProof,evidence:d.captures.map(c=>({captureOriginId:c.id,fileId:'file',purpose:c.purpose,checksumSha256:c.checksum,mediaType:c.mediaType,capturedAt:c.capturedAt}))}}};
 const item={originId:'origin',effectId:'effect',canonicalOriginId:'origin',kind:op.kind,state:'COMMITTED',durableAcknowledgment:true,outcome:{id:'effect',taskId:d.taskId,itemId:'item',stage:'PRE_EXECUTION',firstStartId:'first'}};
 const batch={id:'batch',identity:i,projectId:d.projectId,phase:'RECONCILED',proof:{kind:'signed-field-batch',registrationId:'registration',deviceId:'device'},body:JSON.stringify({operations:[op]}),verifiedItems:[{...item}],receipt:{items:[item]}};
 const snapshot={identity:i,projectId:d.projectId,phase:'RECONCILED',proof:{kind:'snapshot',assignmentId:'assignment'},body:JSON.stringify({taskId:d.taskId,deviceRegistrationId:'registration'}),receipt:{id:'snapshot',taskVersion:'version',taskId:d.taskId,assignmentId:'assignment',originalActorId:d.actor,deviceRegistrationId:'registration',snapshot:{repair:{itemId:'item'}}}};
 const h={d,batch,snapshot,op,item};change?.(h);batch.body=JSON.stringify({operations:[op]});
 return {h,api:harness([{id:'exact',payload:JSON.stringify(d)}],undefined,undefined,[batch,snapshot])};
}

test('exact assessment receipt marks only original draft source as confirmed, read-only',async()=>{
 const {api}=assessmentFixture();const rows=await api.m.readCrewLocalDrafts(api.identity);
 assert.equal(rows[0].assessmentConfirmed,true);assert.equal(api.writes(),0);
});
for(const [name,change] of Object.entries({
 actor:h=>h.batch.identity={...h.batch.identity,actor:'other'},environment:h=>h.batch.identity={...h.batch.identity,environment:'other'},partition:h=>h.batch.identity={...h.batch.identity,partition:'other'},
 project:h=>h.batch.projectId='other',task:h=>h.op.taskId='other',scope:h=>h.d.scope='new-draft',kind:h=>h.op.kind='FIELD_SUBMISSION',
 origin:h=>h.item.originId='other',effect:h=>h.item.effectId='other',canonical:h=>h.item.canonicalOriginId='other',durable:h=>h.item.durableAcknowledgment=false,
 checkpoint:h=>h.batch.verifiedItems=[],outcome:h=>h.item.outcome.itemId='other',assignment:h=>h.op.assignmentId='other',snapshot:h=>h.snapshot.receipt.id='other',taskVersion:h=>h.op.taskVersion='other',
 measurement:h=>h.d.measurements=[{...h.d.measurements[0],value:4}],capture:h=>h.d.captures=[{...h.d.captures[0],id:'new-capture'}],location:h=>h.d.locationProof={chainageMeters:51},
 incomplete:h=>h.batch.phase='RECEIVED',after:h=>h.d.captures.push({...h.d.captures[0],id:'after',purpose:'AFTER'}),
}))test('assessment draft status rejects unrelated or changed source '+name,async()=>{
 const {api}=assessmentFixture(change);const rows=await api.m.readCrewLocalDrafts(api.identity);assert.equal(rows[0].assessmentConfirmed,false);
});

test('assessment confirmed snapshot may be retained from an earlier session; draft still matches original signed scope',async()=>{
 const {api}=assessmentFixture(h=>h.snapshot.identity={...h.snapshot.identity,scope:'earlier'});
 assert.equal((await api.m.readCrewLocalDrafts(api.identity))[0].assessmentConfirmed,true);
});

test('local assessment status supports original local-media origin binding after verified admission mapping',async()=>{
 const {api}=assessmentFixture(h=>{
  h.op.repair.assessment.evidence[0].fileId=null;
  h.d.captures[0].offlineUpload={originId:h.op.originId};
 });
 assert.equal((await api.m.readCrewLocalDrafts(api.identity))[0].assessmentConfirmed,true);
 const wrong=assessmentFixture(h=>{h.op.repair.assessment.evidence[0].fileId=null;h.d.captures[0].offlineUpload={originId:'other'};});
 assert.equal((await wrong.api.m.readCrewLocalDrafts(wrong.api.identity))[0].assessmentConfirmed,false);
});

test('local panel labels exact assessment, keeps newer unsent draft separate from old command history and full navigation ID',async()=>{
 const {screen}=require('./helpers/roadfe-screen.cjs');
 const identity={actor:'actor',scope:'session',environment:'api'};
 const grouped=[{latest:{id:'confirmed',projectId:'project',taskId:'full-task-identifier',photos:1,measurements:1,currentSession:true,hasCommand:false,assessmentConfirmed:true},versions:1,hasCommand:false},
 {latest:{id:'new',projectId:'project',taskId:'new-task-identifier',photos:2,measurements:1,currentSession:true,hasCommand:false,assessmentConfirmed:false},versions:2,hasCommand:true}];
 const s=screen('src/components/crew/CrewLocalDraftPanel.tsx',{exportName:'CrewLocalDraftPanel',props:{identity},modules:{'../Card':{Card:'Card'},'../Button':{Button:'Button'},'../../offline/upload-queue':{sameQueueIdentity:()=>true},'../../api/crewLocalDrafts':{readCrewLocalDrafts:async()=>grouped.map(g=>g.latest),readCrewLocalTaskCode:async()=>('LONG-'.repeat(15)),groupCrewLocalDrafts:rows=>grouped.filter(g=>rows.some(r=>r.id===g.latest.id)).map(g=>({...g,latest:rows.find(r=>r.id===g.latest.id)}))}}});
 s.render();await s.flush();
 const value=s.nodes().filter(n=>n.type==='Text').map(n=>n.props.children.flat(Infinity).join('')).join('\n');
 assert.match(value,/Đánh giá trước sửa đã xác nhận/);assert.match(value,/Nháp chưa gửi/);assert.match(value,/Bản lưu cũ có lịch sử gửi/);assert.doesNotMatch(value,/Nhiệm vụ đã hoàn thành/);
 const codes=s.nodes().filter(n=>n.type==='Text'&&n.props.ellipsizeMode==='middle');assert.equal(codes.length,2);assert.equal(codes[0].props.numberOfLines,1);assert.ok(codes[0].props.accessibilityLabel.includes('LONG-'));
 const buttons=s.nodes().filter(n=>n.props.title==='Mở hồ sơ');buttons[0].props.onPress();assert.equal(s.nav[0].params.id,'full-task-identifier');s.unmount();
});
