const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const {screen,deferred}=require('./helpers/roadfe-screen.cjs');
function functions(file,names,context={}){const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const code=names.map(name=>source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name).getText().replace(/^export /,'')).join('\n');return vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+';({'+names.join(',')+'})',context);}
const text=s=>s.nodes().filter(n=>n.type==='Text').map(n=>n.props.children.flat(Infinity).filter(v=>typeof v==='string'||typeof v==='number').join('')).join('\n');
const common={'../../src/components/AppHeader':{AppHeader:'AppHeader'},'../../src/components/Card':{Card:'Card'},'../../src/components/Toast':{Toast:'Toast'},'../../src/components/Chip':{Chip:'Chip'},'../../src/components/crew/CrewTaskFacts':{CrewTaskFacts:'CrewTaskFacts'}};
test('mixed terminal batch is actionable without a replay CTA; independent pending evidence remains visible',async()=>{
 const identity={actor:'A',scope:'S',environment:'E'},terminal={originId:'rejected',state:'REJECTED',code:'concurrency_conflict'};
 const record={id:'mixed',identity,phase:'RECEIVED',proof:{kind:'signed-field-batch'},terminalItems:[terminal],verifiedItems:[{originId:'committed'}],receipt:{items:[
  {originId:'committed',state:'COMMITTED',durableAcknowledgment:true},
  {originId:'rejected',state:'PENDING_DEPENDENCY',code:'evidence_upload_required',durableAcknowledgment:false}]}};
 const f=functions('src/components/crew/CrewOfflinePanel.tsx',['pendingEvidence','phaseLabel','evidenceLabel']);
 assert.equal(f.phaseLabel(record),'Cần xử lý');assert.equal(f.pendingEvidence(record),false);
 record.receipt.items.push({originId:'independent',state:'PENDING_DEPENDENCY',code:'evidence_verification_pending',durableAcknowledgment:false});
 assert.equal(f.pendingEvidence(record),true);record.receipt.items.pop();
 const s=screen('src/components/crew/CrewOfflinePanel.tsx',{exportName:'CrewOfflinePanel',props:{identity},modules:{'../Card':{Card:'Card'},'../Button':{Button:'Button'},'../../api/crewOfflineDevice':{inspectOfflineDevice:async()=>({})},'../../offline/crewSignedSync':{},'../../api/crewOfflineJournal':{openOfflineJournal:async()=>({list:async()=>[record]})},'../../../modules/roadguard-offline-crypto':{},'../../offline/upload-queue':{sameQueueIdentity:()=>true}}});
 s.render();await s.flush();assert.match(text(s),/Dữ liệu nguồn đã thay đổi/);
 const titles=s.nodes().filter(n=>n.type==='Button').map(n=>n.props.title);
 assert.ok(titles.includes('Đối soát kết quả'));assert.ok(!titles.some(t=>/Gửi|Tiếp tục/.test(t)));s.unmount();
});
for(const state of ['loading','empty','error','pages'])test('B5 profile prioritizes identity and retains scoped stats '+state,()=>{
 let reads=0;const inbox={enabled:true,tasks:state==='pages'?[{done:true},{done:false}]:[],error:state==='error'?'Không tải được thống kê':null,query:{isPending:state==='loading',isFetching:false,hasNextPage:state==='pages',refetch:()=>reads++}};
 const s=screen('app/(crew)/profile.tsx',{modules:{...common,'./tasks':{useCrewInbox:()=>inbox},'../../src/api/crewApi':{crewTaskIsComplete:t=>t.done},'expo-router':{useRouter:()=>({push(){},replace(){}})}}});
 s.render();const value=text(s);assert.doesNotMatch(value,/Nhiệm vụ được giao/);assert.ok(value.indexOf('Chưa có tên tài khoản')<value.indexOf('Tiến độ nhiệm vụ'));
 assert.equal((value.match(/Chỉ tính nhiệm vụ đã tải/g)||[]).length,1);
 if(state==='loading'||state==='error')assert.match(value,/—/);if(state==='empty')assert.match(value,/Chưa có nhiệm vụ được giao/);
 if(state==='pages'){
  assert.match(value,/Còn dữ liệu chưa tải/);
  const labels=s.nodes().filter(n=>n.type==='Text').map(n=>n.props.children.flat(Infinity).join(''));
  assert.ok(labels.includes('1'));assert.ok(labels.includes('2'));
 }else assert.match(value,/không phải toàn bộ lịch sử/);
 s.nodes().find(n=>n.props.accessibilityLabel==='Tải lại thống kê').props.onPress();assert.equal(reads,1);s.unmount();
});
test('B4 sync keeps unavailable capabilities out of the overview and diagnostics remain functional',async()=>{
 let reads=0;const identity={actor:'A',scope:'S',environment:'E'};
 const s=screen('src/components/crew/CrewOfflinePanel.tsx',{exportName:'CrewOfflinePanel',props:{identity},modules:{'../Card':{Card:'Card'},'../Button':{Button:'Button'},'../../api/crewOfflinePreparation':{},'../../api/crewApi':{},'../../api/crewOfflineDevice':{inspectOfflineDevice:async()=>{reads++;throw Error('private');}},'../../offline/crewSignedSync':{},'../../api/crewOfflineJournal':{openOfflineJournal:async()=>({list:async()=>[]})},'../../../modules/roadguard-offline-crypto':{NATIVE_ACCEPTANCE_VERIFIED:false},'../../offline/upload-queue':{sameQueueIdentity:()=>true}}});
 s.render();await s.flush();assert.equal(reads,1);for(const title of ['Đăng ký thiết bị','Tạo bản dữ liệu nhiệm vụ','Gửi dữ liệu đã ký'])assert.doesNotMatch(text(s),new RegExp(title));
 const diagnostics=s.nodes().find(n=>n.props?.accessibilityLabel==='Chi tiết kỹ thuật');assert.ok(diagnostics);diagnostics.props.onPress();s.render();
 const reread=s.nodes().find(n=>n.type==='Pressable'&&n.props?.onPress&&JSON.stringify(n.props.children).includes('Đọc lại nhật ký'));assert.ok(reread);reread.props.onPress();await s.flush();assert.equal(reads,2);assert.doesNotMatch(text(s),/Không đọc được/);assert.doesNotMatch(text(s),/private/);s.unmount();
});

test('Crew sync reads durable commands even when native inspection is unavailable',async()=>{
 let reads=0;const identity={actor:'A',scope:'S',environment:'E'};
 const records=[{id:'review',phase:'RECONCILED',proof:{kind:'review-request'}},{id:'safety',phase:'RECEIVED',proof:{kind:'safety',operation:'check'}}];
 const s=screen('src/components/crew/CrewOfflinePanel.tsx',{exportName:'CrewOfflinePanel',props:{identity},modules:{'../Card':{Card:'Card'},'../Button':{Button:'Button'},'../../api/crewOfflinePreparation':{},'../../api/crewApi':{},'../../api/crewOfflineDevice':{inspectOfflineDevice:async()=>{throw Error('native unavailable');}},'../../offline/crewSignedSync':{},'../../api/crewOfflineJournal':{openOfflineJournal:async()=>({list:async()=>{reads++;return records;}})},'../../../modules/roadguard-offline-crypto':{NATIVE_ACCEPTANCE_VERIFIED:false},'../../offline/upload-queue':{sameQueueIdentity:()=>true}}});
 s.render();await s.flush();assert.equal(reads,1);assert.doesNotMatch(text(s),/Yêu cầu xem xét lại/);assert.match(text(s),/An toàn hiện trường/);
 s.nodes().find(n=>n.props?.accessibilityLabel==='Lịch sử đã xác nhận').props.onPress();s.render();
 assert.match(text(s),/Yêu cầu xem xét lại/);assert.doesNotMatch(text(s),/native unavailable|Thao tác thiết bị/);assert.ok(!s.nodes().some(n=>n.props?.title==='Gửi dữ liệu đã ký'));s.unmount();
});


test('Crew sync preserves local journal failure guidance without leaking provider details',async()=>{
 const identity={actor:'A',scope:'S',environment:'E'};let probes=0;
 const s=screen('src/components/crew/CrewOfflinePanel.tsx',{exportName:'CrewOfflinePanel',props:{identity},modules:{'../Card':{Card:'Card'},'../Button':{Button:'Button'},'../../api/crewOfflinePreparation':{},'../../api/crewApi':{},'../../api/crewOfflineDevice':{inspectOfflineDevice:async()=>{probes++;return {}; }},'../../offline/crewSignedSync':{},'../../api/crewOfflineJournal':{openOfflineJournal:async()=>{throw Error('private sqlite failure');}},'../../../modules/roadguard-offline-crypto':{NATIVE_ACCEPTANCE_VERIFIED:false},'../../offline/upload-queue':{sameQueueIdentity:()=>true}}});
 s.render();await s.flush();assert.equal(probes,0);assert.match(text(s),/Không đọc được.*nhật ký.*dữ liệu được giữ nguyên/);assert.doesNotMatch(text(s),/private sqlite failure/);s.unmount();
});

test('old-session device recovery CTA calls task flow once and reloads confirmations, errors preserve guidance',async()=>{
 const {randomUUID:id}=require('node:crypto');
 for(const failing of [false,true]){
  const identity={actor:id(),scope:'new',environment:'E',role:'REPAIR_CREW',partition:'p'},old={...identity,scope:'old'},project=id(),task=id();
  let calls=0;const pending=deferred();let rows=[{id:id(),identity:old,projectId:project,phase:'UNKNOWN_OUTCOME',body:JSON.stringify({taskId:task}),proof:{kind:'snapshot'}}];
  const same=(a,b=identity)=>a.scope===b.scope&&a.actor===b.actor;
  const s=screen('src/components/crew/CrewOfflinePanel.tsx',{exportName:'CrewOfflinePanel',props:{identity},modules:{'../Card':{Card:'Card'},'../Button':{Button:'Button'},'../../api/crewApi':{isCrewResourceId:x=>typeof x==='string'&&x.length===36},'../../api/crewOfflinePreparation':{recoverAndDownloadCrewOfflineTask:async(i,p,t)=>{calls++;assert.equal(i,identity);assert.equal(p,project);assert.equal(t,task);await pending.promise;if(failing)throw Error('private response');rows=[{...rows[0],phase:'RECONCILED'}];}},'../../api/crewOfflineDevice':{inspectOfflineDevice:async()=>({capability:{}})},'../../offline/crewSignedSync':{},'../../api/crewOfflineJournal':{openOfflineJournal:async()=>({list:async()=>rows}),sameOfflinePartition:(a,b)=>a.actor===b.actor&&a.environment===b.environment},'../../../modules/roadguard-offline-crypto':{},'../../offline/upload-queue':{sameQueueIdentity:same}}});
  s.render();await s.flush();const button=s.nodes().find(n=>n.props.title==='Khôi phục dữ liệu từ lần đăng nhập trước');assert.ok(button);
  button.props.onPress();button.props.onPress();assert.equal(calls,1);pending.resolve();await s.flush();
  if(failing){assert.match(text(s),/Chưa khôi phục.*nhật ký gốc vẫn được giữ nguyên/);assert.doesNotMatch(text(s),/private response/);}
  else assert.ok(!s.nodes().some(n=>n.props.title==='Khôi phục dữ liệu từ lần đăng nhập trước'));
  s.unmount();
 }
});
