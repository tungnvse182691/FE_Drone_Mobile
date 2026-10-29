const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const base=fs.readFileSync('tests/t04.test.cjs','utf8').split("test('T04 absent")[0];
// Reuse the unchanged owner/session boundary harness, without running its tests.
const boundarySource=fs.readFileSync('tests/t04.test.cjs','utf8');
const boundaryHarness=boundarySource.slice(boundarySource.indexOf('function screenHarness'),boundarySource.indexOf("for(const file of ['report-defect'"));
const sandbox={require,console,process,Buffer,__dirname:__dirname};
vm.runInNewContext(base+boundaryHarness+';globalThis.screenHarness=screenHarness;',sandbox);
function render(file,exportName,task){
 const routes=[],effects=[],writes=[];
 const React={createElement:(type,props,...children)=>({type,props:{...props,children}}),
  useState:v=>[typeof v==='function'?v():v,()=>{}],useRef:v=>({current:v}),useCallback:f=>f,useMemo:f=>f(),useEffect:f=>effects.push(f)};
 const module={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,
 {module,exports:module.exports,require:n=>{
  if(n==='react')return React;
  if(n==='react-native')return {View:'View',Text:'Text',StyleSheet:{create:x=>x}};
  if(n==='expo-router')return {router:{push:r=>routes.push(r),replace:r=>routes.push(r)}};
  // Any accidental mutation/storage call fails this read-only screen test.
  if(/api|offline|hooks/.test(n))return new Proxy({},{get:(_,p)=>()=>{writes.push(p);throw Error('unexpected side effect '+String(p));}});
  return new Proxy({},{get:(_,p)=>String(p)});
 }});
 assert.equal(typeof module.exports[exportName],'function');
 const tree=module.exports[exportName]({task});
 const nodes=[],texts=[];function visit(x){if(Array.isArray(x))return x.forEach(visit);if(typeof x==='string')texts.push(x);if(x&&typeof x==='object'){nodes.push(x);visit(x.props?.children);}}visit(tree);
 return {tree,nodes,text:texts.join(' '),routes,effects,writes};
}
const task=()=>({id:'33333333-3333-4333-8333-333333333333',projectId:'22222222-2222-4222-8222-222222222222',
 status:'SupplementRequired',coordinates:null,wo_code:'',detail:{mode:'NORMAL',status:'SupplementRequired',repairContext:{status:'Submitted',itemVersion:'AAAAAAAAB9E='}}});
test('T06D correction deep link uses the real read boundary without GPS/WO operational gate',()=>{
 const h=sandbox.screenHarness('repair-correction');assert.equal(h.tree.type,h.shared.CrewTaskBoundary);assert.equal(h.tree.props.operational,false);
});
for(const state of ['AWAITING_PM_REVIEW','Submitted','SupplementRequired','Completed'])test('T06D '+state+' never substitutes for PM SUPPLEMENT proof',()=>{
 const t=task();t.status=state;t.detail.status=state;
 const h=render('app/(crew)/repair-correction.tsx','CorrectionReadOnly',t);
 assert.match(h.text,/chưa cung cấp.*quyết định PM/);assert.match(h.text,/current intake/);
 const submit=h.nodes.find(n=>n.props.title==='Gửi bổ sung sửa chữa');assert.equal(submit.props.disabled,true);submit.props.onPress();
 assert.equal(h.effects.length,0);assert.equal(h.writes.length,0);assert.equal(h.routes.length,0);
});
test('T06D correction read-only navigation preserves project/task and never enters repair execution',()=>{
 const t=task(),h=render('app/(crew)/repair-correction.tsx','CorrectionReadOnly',t);
 h.nodes.find(n=>n.props.title==='Về chi tiết nhiệm vụ').props.onPress();
 assert.equal(h.routes[0].pathname,'/(crew)/wo-detail');assert.equal(h.routes[0].params.id,t.id);assert.equal(h.routes[0].params.projectId,t.projectId);
 assert.equal(h.writes.length,0);
});
for(const scenario of ['no task','no project','guest','wrong role','session switch'])test('T06D boundary fails closed for '+scenario,async()=>{
 const h=sandbox.screenHarness('repair-correction',scenario==='no task'?{noTask:true}:scenario==='no project'?{params:{projectId:''}}:{});
 if(scenario==='guest')h.state.token=null;
 if(scenario==='wrong role')h.state.user.role_code='REPORTER';
 if(scenario==='session switch'){h.state.token='B';h.state.user={id:'44444444-4444-4444-8444-444444444444',role_code:'REPAIR_CREW'};}
 h.guard(false);
 if(scenario==='session switch')await assert.rejects(h.configs.at(-1).queryFn({}),/crew_identity_invalid/);
 else assert.equal(h.mounted,0);
});
test('T06DE task detail offers guarded correction inspection, never a correction command',()=>{
 const t=task(),h=render('app/(crew)/wo-detail.tsx','RepairContractStatus',t);
 h.nodes.find(n=>n.props.title==='Kiểm tra yêu cầu bổ sung sửa chữa').props.onPress();
 assert.equal(h.routes[0].pathname,'/(crew)/repair-correction');assert.equal(h.routes[0].params.projectId,t.projectId);assert.equal(h.routes[0].params.id,t.id);
 assert.equal(h.writes.length,0);assert.equal(h.effects.length,0);
});
for(const context of [null,{mode:'NORMAL',itemVersion:'AAAAAAAAB9E='},{mode:'CONDITIONAL_FT',itemVersion:'h4-eligibility-v1-example',eligible:true}])test('T06E FT remains blocked without a supported Crew bootstrap '+JSON.stringify(context),()=>{
 const t=task();t.detail.mode='CONDITIONAL_FT';t.detail.repairContext=context;
 const h=render('app/(crew)/wo-detail.tsx','RepairContractStatus',t);
 assert.match(h.text,/Sửa nhanh chưa sẵn sàng/);assert.match(h.text,/Chưa có đủ thông tin phân công/);assert.match(h.text,/hệ thống xác nhận đủ điều kiện/);
 assert.equal(h.nodes.find(n=>n.props.title==='Thi công FastTrack').props.disabled,true);
 h.nodes.find(n=>n.props.title==='Thi công FastTrack').props.onPress();
 assert.equal(h.writes.length,0);assert.equal(h.effects.length,0);
});
test('T06E NORMAL is not labelled FastTrack and no speculative eligibility request is sent',()=>{
 const h=render('app/(crew)/wo-detail.tsx','RepairContractStatus',task());
 assert.doesNotMatch(h.text,/Thi công FastTrack/);assert.equal(h.writes.length,0);
});
