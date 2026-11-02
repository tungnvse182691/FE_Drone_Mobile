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
const common={'../../src/components/Card':{Card:'Card'},'../../src/components/Chip':{Chip:'Chip'},'../../src/components/AppHeader':{AppHeader:'AppHeader'},'../../src/components/crew/CrewTaskFacts':{CrewTaskFacts:'CrewTaskFacts'}};
function repairOverview(context,history=[]){
 const identity={actor:'actor',scope:'scope',environment:'qa',projectId:'project',taskId:'task'};
 let mutations=0;
 const s=screen('app/(crew)/wo-detail.tsx',{exportName:'NormalRepairBootstrap',props:{task:{id:'task',projectId:'project',detail:{mode:'NORMAL'}},stage:'overview'},modules:{...common,
  '../../src/hooks/useRepairBootstrap':{useRepairBootstrap:()=>({status:'ready',repairContext:context,reload:async()=>{}})},
  '../../src/api/crewRepairDraft':{currentRepairIdentity:()=>identity,sameRepairIdentity:(a,b)=>a?.actor===b?.actor},
  '../../src/api/crewRepairWorkflow':{readRepairHistory:async()=>history,readRepairFieldDraft:async()=>null,dispatchRepair:async()=>{mutations++;},repairErrorMessage:()=>''},
  '../../src/api/crewFieldDraft':{},'expo-crypto':{},'../../src/offline/database':{},'../../src/api/authApi':{},'../../src/api/crewApi':{normalRepairBlock:()=>null},
  './tasks':{useCrewIdentity:()=>({scope:'scope',user:{id:'actor'}})},
 },moduleFactories:{'expo-router':({react})=>({useFocusEffect:fn=>react.useEffect(fn,[fn]),router:{push:()=>{}}})}});
 // Run the actual focus effect through the screen harness so persisted journal is loaded.
 return {s,get mutations(){return mutations;}};
}

for(const context of [null,{repairPlan:'Keep backend text',itemId:'item',bindingId:'binding',status:'Assigned'}])test('C3 repair overview retains valid links and visible pending recovery with context '+!!context,async()=>{
 const f=repairOverview(context,[{key:'stable',phase:'UNKNOWN_OUTCOME',operation:'start'}]);
 f.s.render();await f.s.flush();
 const titles=f.s.nodes().filter(n=>n.type==='Button').map(n=>n.props.title);
 for(const title of ['Theo dõi thi công','Hồ sơ hoàn tất thi công','Kiểm tra yêu cầu bổ sung sửa chữa'])assert.equal(titles.includes(title),!!context);
 assert.ok(titles.includes('Đối soát / gửi lại lệnh đã lưu'));
 assert.ok(!titles.includes('Bắt đầu thi công'));
 assert.equal(f.mutations,0);
 await f.s.press('Đối soát / gửi lại lệnh đã lưu');await f.s.flush();
 assert.ok(f.s.nodes().some(n=>n.props.accessibilityRole==='alert'));
 assert.ok(f.s.nodes().some(n=>n.props.title==='Xác nhận đối soát lệnh gốc'));
 assert.equal(f.mutations,0);f.s.unmount();
});
