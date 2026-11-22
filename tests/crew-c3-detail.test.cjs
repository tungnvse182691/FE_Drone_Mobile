const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
function presentation(){
 const source=ts.createSourceFile('detail.tsx',fs.readFileSync('app/(crew)/wo-detail.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const fn=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='crewDetailPresentation');
 assert.ok(fn,'detail must have a pure presentation model');
 return vm.runInNewContext(ts.transpileModule(fn.getText().replace(/^export /,''),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+';crewDetailPresentation');
}
test('C3 exact states select relevant commands, while existing guard remains authority',()=>{
 const model=presentation();
 for(const [state,actions] of [['NewAssigned',['accept','reject']],['Accepted',['start']],['InProgress',[]],['Submitted',[]],['SupplementRequired',[]],['Completed',[]],['Rejected',[]],['Cancelled',[]],['SUBMITTED',[]],['unrecognised',[]],[null,[]]]){
  assert.deepEqual(Array.from(model(state,()=>null,null).commands),actions);
  assert.deepEqual(Array.from(model(state,()=> 'blocked','blocked').commands),[]);
 }
});
test('C3 FIELD review is state-specific and never granted by presentation when guard blocks',()=>{
 const model=presentation();
 for(const state of ['InProgress','Submitted','SupplementRequired','Completed']){
  assert.ok(model(state,()=>null,null).fieldLabel);
  assert.equal(model(state,()=>null,'missing first-start').fieldLabel,null);
 }
 for(const state of ['NewAssigned','Accepted','Rejected','Cancelled','unknown'])assert.equal(model(state,()=>null,null).fieldLabel,null);
 assert.match(model('Submitted',()=>null,null).summary,/chưa.*hoàn tất sửa chữa/i);
 assert.match(model('SupplementRequired',()=>null,null).summary,/bổ sung/i);
 assert.match(model('unknown',()=>null,null).summary,/chưa.*xác nhận/i);
});

const {screen}=require('./helpers/roadfe-screen.cjs');
test('C3 closeout distinguishes all three depression dimensions without treating LENGTH as depth',()=>{
 const source=ts.createSourceFile('detail.tsx',fs.readFileSync('app/(crew)/wo-detail.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const fn=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='RepairFieldSummary');
 const render=vm.runInNewContext(ts.transpileModule(fn.getText().replace(/^export /,''),{compilerOptions:{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText+';RepairFieldSummary',{
  React:{createElement:(_type,_props,...children)=>children.flat(Infinity).join('')},View:'View',Text:'Text',Card:'Card',styles:{},spacing:{},typography:{},
 });
 const result=render({draft:{captures:[],measurements:[
  {sampleId:'length',type:'DepressionLength',dimension:'LENGTH',state:'KNOWN',value:2,unit:'m'},
  {sampleId:'width',type:'DepressionWidth',dimension:'LENGTH',state:'KNOWN',value:50,unit:'cm'},
  {sampleId:'depth',type:'DepressionDepth',dimension:'LENGTH',state:'UNKNOWN',value:null,unit:'mm',unknownReason:'Có nước đọng'},
 ]}});
 for(const text of ['Chiều dài chỗ lõm: 2 m','Chiều rộng chỗ lõm: 50 cm','Độ sâu chỗ lõm: Có nước đọng'])assert.ok(result.includes(text),text);
});
const common={'../../src/components/Card':{Card:'Card'},'../../src/components/Chip':{Chip:'Chip'},'../../src/components/AppHeader':{AppHeader:'AppHeader'},'../../src/components/crew/CrewTaskFacts':{CrewTaskFacts:'CrewTaskFacts'}};
function repairOverview(context,history=[],stage='overview'){
 const identity={actor:'actor',scope:'scope',environment:'qa',projectId:'project',taskId:'task'};
 let mutations=0;
 const s=screen('app/(crew)/wo-detail.tsx',{exportName:'NormalRepairBootstrap',props:{task:{id:'task',projectId:'project',detail:{mode:'NORMAL'}},stage},modules:{...common,
  '../../src/hooks/useRepairBootstrap':{useRepairBootstrap:()=>({status:'ready',repairContext:context,reload:async()=>{}})},
  '../../src/api/crewRepairDraft':{currentRepairIdentity:()=>identity,sameRepairIdentity:(a,b)=>a?.actor===b?.actor},
  '../../src/api/crewRepairWorkflow':{readRepairHistory:async()=>history,readRepairFieldDraft:async()=>null,dispatchRepair:async()=>{mutations++;},repairErrorMessage:()=>''},
  '../../src/api/crewFieldDraft':{},'expo-crypto':{},'../../src/offline/database':{},'../../src/api/authApi':{},'../../src/api/crewApi':{repairExecutionBlock:()=>null},
  './tasks':{useCrewIdentity:()=>({scope:'scope',user:{id:'actor'}})},
 },moduleFactories:{'expo-router':({react})=>({useFocusEffect:fn=>react.useEffect(fn,[fn]),router:{push:()=>{}}})}});
 // Run the actual focus effect through the screen harness so persisted journal is loaded.
 return {s,get mutations(){return mutations;}};
}

test('C3 ongoing construction keeps finish visible and collapses preparation evidence',async()=>{
 const f=repairOverview({status:'InProgress'},[{key:'start',phase:'CONFIRMED',operation:'start'}],'progress');
 f.s.render();await f.s.flush();
 assert.ok(f.s.nodes().some(n=>n.props.title==='Kết thúc thi công'&&!n.props.disabled));
 let text=JSON.stringify(f.s.nodes().filter(n=>n.type==='Text').map(n=>n.props.children));
 assert.match(text,/Đang thi công/);
 assert.doesNotMatch(text,/Số đo đã lưu|Ảnh đã xác minh|Đã bắt đầu thi công\. Chỉ bấm/);
 const disclosure=f.s.nodes().find(n=>n.props.accessibilityLabel==='Hồ sơ trước sửa');assert.ok(disclosure);
 assert.equal(disclosure.props.accessibilityState.expanded,false);
 disclosure.props.onPress();f.s.render();
 text=JSON.stringify(f.s.nodes().filter(n=>n.type==='Text').map(n=>n.props.children));
 assert.match(text,/Số đo đã lưu/);assert.equal(f.mutations,0);f.s.unmount();
});

for(const context of [null,{repairPlan:'Keep backend text',itemId:'item',bindingId:'binding',status:'Assigned'}])test('C3 repair overview retains valid links and visible pending recovery with context '+!!context,async()=>{
 const f=repairOverview(context,[{key:'stable',phase:'UNKNOWN_OUTCOME',operation:'start'}]);
 f.s.render();await f.s.flush();
 const titles=f.s.nodes().filter(n=>n.type==='Button'||n.props.accessibilityRole==='button').map(n=>n.props.title??n.props.accessibilityLabel);
 for(const title of ['Theo dõi thi công','Hồ sơ hoàn tất thi công','Kiểm tra yêu cầu bổ sung sửa chữa'])assert.equal(titles.includes(title),!!context);
 assert.ok(titles.includes('Đối soát / gửi lại lệnh đã lưu'));
 assert.ok(!titles.includes('Bắt đầu thi công'));
 assert.equal(f.mutations,0);
 await f.s.press('Đối soát / gửi lại lệnh đã lưu');await f.s.flush();
 assert.ok(f.s.nodes().some(n=>n.props.accessibilityRole==='alert'));
 assert.ok(f.s.nodes().some(n=>n.props.title==='Xác nhận đối soát lệnh gốc'));
 assert.equal(f.mutations,0);f.s.unmount();
});


test('C3 closeout uses current final confirmation rather than stale intake',async()=>{
 const f=repairOverview({status:'Confirmed',finalDecision:{decisionId:'decision',result:'CONFIRMED',at:'2026-11-15T00:00:00Z'},attempt:{review:{decision:'ACCEPT'}}},[
  {key:'finish',phase:'CONFIRMED',operation:'finish',receipt:{data:{id:'finish'}}},
  {key:'intake',phase:'CONFIRMED',operation:'attempt',receipt:{data:{attemptId:'attempt',intakeReadiness:'INCOMPLETE'}}},
 ],'closeout');
 f.s.render();await f.s.flush();
 const text=JSON.stringify(f.s.nodes().filter(n=>n.type==='Text').map(n=>n.props.children));
 assert.match(text,/Đã nghiệm thu/);
 assert.doesNotMatch(text,/Hồ sơ chưa được quản lý xác nhận|Đang chờ quản lý đánh giá; chưa được quản lý xác nhận/);
 assert.equal(f.mutations,0);f.s.unmount();
});


test('C3 closeout reads submitted server attempt without a journal from another device',async()=>{
 const f=repairOverview({status:'Submitted',attempt:{attemptId:'attempt',effectiveSubmissionId:'submission',review:null}},[],'closeout');
 f.s.render();await f.s.flush();
 const text=JSON.stringify(f.s.nodes().filter(n=>n.type==='Text').map(n=>n.props.children));
 assert.match(text,/Đã gửi hồ sơ/);assert.match(text,/Đang chờ quản lý đánh giá/);
 assert.doesNotMatch(text,/Chưa kết thúc thi công|0 ảnh đã xác minh|Chưa có số đo/);
 for(const title of ['Chụp ảnh sau sửa','Gửi hồ sơ hoàn tất'])assert.equal(f.s.nodes().some(n=>n.props.title===title),false);
 assert.equal(f.mutations,0);f.s.unmount();
});

for(const context of [null,{status:'Confirmed',finalDecision:null},{status:'Submitted',attempt:{review:{decision:'ACCEPT'}}}])test('C3 never infers final confirmation from intake or PM review: '+JSON.stringify(context),async()=>{
 const f=repairOverview(context,[{key:'intake',phase:'CONFIRMED',operation:'attempt',receipt:{data:{intakeReadiness:'INCOMPLETE'}}}],'closeout');
 f.s.render();await f.s.flush();
 const text=JSON.stringify(f.s.nodes().filter(n=>n.type==='Text').map(n=>n.props.children));
 assert.doesNotMatch(text,/Đã nghiệm thu/);
 if(context?.attempt)assert.match(text,/PM đã chấp nhận hồ sơ/);
 assert.equal(f.mutations,0);f.s.unmount();
});

test('FE3 corrected submission and reopened context supersede old final intake without mutation',async()=>{
 for(const context of [
  {status:'Submitted',attempt:{attemptId:'attempt',effectiveSubmissionId:'new-submission',review:null}},
  {status:'Assigned',attempt:null,finalDecision:null},
 ]){
  const f=repairOverview(context,[{key:'old',phase:'CONFIRMED',operation:'attempt',receipt:{data:{intakeReadiness:'READY'}}}],'closeout');
  f.s.render();await f.s.flush();const text=JSON.stringify(f.s.nodes().filter(n=>n.type==='Text').map(n=>n.props.children));
  assert.doesNotMatch(text,/Đã nghiệm thu|PM đã chấp nhận hồ sơ/);assert.equal(f.mutations,0);f.s.unmount();
 }
});
