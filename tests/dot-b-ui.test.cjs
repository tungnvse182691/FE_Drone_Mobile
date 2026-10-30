const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const {screen,deferred}=require('./helpers/roadfe-screen.cjs');
function functions(file,names,context={}){const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const code=names.map(name=>source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name).getText().replace(/^export /,'')).join('\n');return vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+';({'+names.join(',')+'})',context);}
test('B2 timezone formatter handles offsets, midnight and invalid input without changing wire',()=>{
 const {crewDateTime}=functions('app/(crew)/tasks.tsx',['crewDateTime']);
 for(const input of ['2026-11-01T00:00:00+00:00','2026-11-01T07:00:00+07:00'])assert.match(crewDateTime(input),/07:00.*01\/11\/2026/);
 assert.match(crewDateTime('2026-10-31T17:00:00Z'),/00:00.*01\/11\/2026/);
 for(const input of [null,'','invalid'])assert.equal(crewDateTime(input),'Chưa có thời gian hợp lệ');
 for(const f of ['home','tasks','wo-detail'])assert.match(fs.readFileSync(`app/(crew)/${f}.tsx`,'utf8'),/crewDateTime\((?:task|fresh)\.due_label\)/);
});
for(const status of [401,403,404,409,412,428,undefined])test('B3 error notice distinguishes actual read and send phase '+status,()=>{
 const {fieldTaskActionMessage}=functions('app/(crew)/wo-detail.tsx',['fieldTaskActionMessage'],{isConcurrencyConflict:()=>false,isPreconditionRequired:()=>false});
 const error=status?{response:{status}}:Error('private storage path');
 for(const phase of ['journal','read','reconcile']){const result=fieldTaskActionMessage(error,phase);assert.match(result,/đọc|đối soát/i);assert.doesNotMatch(result,/Không gửi|private storage/);}
 for(const phase of ['send','replay'])assert.match(fieldTaskActionMessage(error,phase),/gửi|xác nhận/i);
});
test('B3 idempotency conflict preserves unresolved intent guidance before generic 409',()=>{
 const {fieldTaskActionMessage}=functions('app/(crew)/wo-detail.tsx',['fieldTaskActionMessage'],{isConcurrencyConflict:()=>false,isPreconditionRequired:()=>false});
 assert.match(fieldTaskActionMessage({response:{status:409,data:{code:'idempotency_key_reused'}}},'replay'),/lệnh cũ/);
});

const text=s=>s.nodes().filter(n=>n.type==='Text').map(n=>n.props.children.flat(Infinity).filter(v=>typeof v==='string'||typeof v==='number').join('')).join('\n');
const common={'../../src/components/AppHeader':{AppHeader:'AppHeader'},'../../src/components/Card':{Card:'Card'},'../../src/components/Toast':{Toast:'Toast'},'../../src/components/Chip':{Chip:'Chip'},'../../src/components/crew/CrewTaskFacts':{CrewTaskFacts:'CrewTaskFacts'}};
function fieldScreen(failRead=false){
 let dispatches=0,reads=0;const nav=[],record={phase:'pending',key:'immutable-key',scope:'["actor","session"]',payload:{unchanged:true}},original=JSON.stringify(record);
 const api={isConcurrencyConflict:()=>false,isPreconditionRequired:()=>false,fieldCommandBlock:()=> 'Không được thao tác',fieldCapabilityBlock:()=> 'Chưa sẵn sàng',executeFieldCommand:async(c,p,replay)=>{dispatches+=Number(replay);assert.equal(c.key,record.key);throw Error('timeout');}};
 const s=screen('app/(crew)/wo-detail.tsx',{expose:'CrewFieldActions',exportName:'CrewFieldActions',props:{task:{id:'task',projectId:'project',status:'Submitted',rawMode:'MEASURE_ONLY',version:'v1',detail:{mode:'MEASURE_ONLY'},coordinates:null}},modules:{...common,
 '../../src/hooks/useRepairBootstrap':{},'../../src/api/crewRepairDraft':{},'../../src/api/crewRepairWorkflow':{},'../../src/api/crewFieldDraft':{},'../../src/api/crewApi':api,
 '../../src/offline/database':{openDatabase:()=>({getFirstAsync:async()=>{reads++;if(failRead)throw Error('private path');return {payload:JSON.stringify({...record,actorId:'actor',projectId:'project',taskId:'task'})};}}),initDatabase:async()=>{},saveDraft:async()=>{throw Error('unexpected write');}},
 './tasks':{useCrewIdentity:()=>({scope:record.scope,user:{id:'actor'}}),crewStatusLabel:()=> 'Đã gửi kết quả',crewModeLabel:()=> 'Chỉ đo kiểm'},'../../src/api/authApi':{passwordSessionIdentity:()=>record.scope},'expo-crypto':{randomUUID:()=>{throw Error('unexpected key');}},'expo-router':{router:{replace:p=>nav.push(p)},useFocusEffect(){}}
 }});s.h.changeAuth({status:'AUTHENTICATED',user:{id:'actor',role_code:'REPAIR_CREW'},token:'fixture'});
 return {s,nav,record,original,get dispatches(){return dispatches;},get reads(){return reads;}};
}
test('B3 mounted safe-read errors keep immutable intent and fail closed without dispatch',async()=>{
 const f=fieldScreen(true);f.s.render();await f.s.flush();await f.s.press('Tải lại / đối soát');await f.s.flush();assert.match(text(f.s),/Không đọc được nhật ký/);assert.equal(f.dispatches,0);assert.equal(JSON.stringify(f.record),f.original);assert.equal(f.s.nodes().find(n=>n.props.title==='Nhận nhiệm vụ').props.disabled,true);f.s.unmount();
});
test('B3 reconciliation timeout preserves key and B6 local back replaces tasks route',async()=>{
 const f=fieldScreen();f.s.render();await f.s.flush();await f.s.press('Tải lại / đối soát');await f.s.flush();assert.match(text(f.s),/Không đối soát/);assert.equal(f.dispatches,0);assert.equal(JSON.stringify(f.record),f.original);
 const back=f.s.nodes().find(n=>n.props.testID==='crew-detail-back');assert.equal(back.props.style.minHeight,48);assert.equal(back.props.style.alignSelf,'flex-start');back.props.onPress();assert.equal(f.nav[0],'/(crew)/tasks');f.s.unmount();
});
