const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const {StackRouter,StackActions}=require('../node_modules/expo-router/build/react-navigation/routers/StackRouter');
const CommonActions=require('../node_modules/expo-router/build/react-navigation/routers/CommonActions');
function load(){
  const module={exports:{}};
  const code=ts.transpileModule(fs.readFileSync('src/navigation/operatorTabNavigation.ts','utf8'),{compilerOptions:{module:1}}).outputText;
  vm.runInNewContext(code,{module,exports:module.exports,require:n=>{
    assert.equal(n,'expo-router/react-navigation');return {CommonActions};
  }});return module.exports;
}
const names=['home','requests','sync','profile','request-detail','work-package','upload','log'];
const route=(name,key,params={})=>({name,key,params});
const initial=()=>({key:'operator',index:1,routeKeySeq:10,routeNames:names,stale:false,type:'stack',routes:[route('home','home'),route('requests','list')]});
const router=StackRouter({});
const options={routeNames:names,routeGetIdList:{}};
function apply(state,action){const r=router.getStateForAction(state,action,options);assert.ok(r?.state,`Unhandled ${action.type}`);return r.state;}
function select(state,tab){const action=load().operatorTabAction(state,`/(drone)/${tab}`);return action?apply(state,action):state;}
test('Operator leaves nested A history on tab selection, then B Back returns to the same list',()=>{
 let state=initial();const list=state.routes[1];
 state=apply(state,StackActions.push('request-detail',{taskId:'A',code:'code-A'}));
 state=apply(state,StackActions.push('work-package',{taskId:'A'}));
 // The former default push reproduces the audited stale Work Package history.
 const old=apply(state,StackActions.push('requests'));
 assert.equal(apply(old,CommonActions.goBack()).routes.at(-1).name,'work-package');
 state=select(state,'requests');
 assert.deepEqual(Array.from(state.routes,r=>r.name),['home','requests']);
 assert.equal(state.routes[1],list);
 state=apply(state,StackActions.push('request-detail',{taskId:'B',code:'code-B'}));
 assert.deepEqual(state.routes.at(-1).params,{taskId:'B',code:'code-B'});
 state=apply(state,CommonActions.goBack());assert.equal(state.routes.at(-1).key,'list');
 state=apply(state,CommonActions.goBack());assert.equal(state.routes.at(-1).name,'home');
});
test('Operator reuses tab keys, deduplicates legacy lists, and active tab is a no-op',()=>{
 let state=initial();const list=state.routes[1];
 for(const tab of ['sync','profile','requests','sync','requests'])state=select(state,tab);
 assert.equal(state.routes.length,2);assert.equal(state.routes.at(-1),list);
 assert.equal(load().operatorTabAction(state,'/(drone)/requests'),null);
 state={...state,index:state.routes.length+1,routes:[...state.routes,route('requests','duplicate'),route('upload','upload',{taskId:'A'})]};
 state=select(state,'requests');assert.equal(state.routes.length,2);assert.equal(state.routes.at(-1),list);
 assert.ok(!state.routes.some(r=>r.name==='upload'));
 state=select(state,'home');assert.equal(state.routes.length,1);assert.equal(state.routes[0].key,'home');
});
test('Operator selection rejects other role routes and undeclared targets',()=>{
 for(const path of ['/(crew)/tasks','/(reporter)/home','/(drone)/request-detail','/requests'])assert.equal(load().operatorTabAction(initial(),path),null);
 assert.equal(load().operatorTabAction({...initial(),routeNames:['home']},'/(drone)/sync'),null);
});
test('Only Operator layout overrides BottomNav default',()=>{
 const layout=fs.readFileSync('app/(drone)/_layout.tsx','utf8');
 assert.match(layout,/onNavigate=\{navigateOperatorTab\}/);
 const shared=fs.readFileSync('src/components/BottomNav.tsx','utf8');
 assert.match(shared,/onNavigate\s*\?\s*onNavigate\(tab.route\)\s*:\s*router.push\(tab.route\)/);
});
test('Mounted Operator dock reads the latest child state and dispatches only to that navigator',()=>{
 const {screen}=require('./helpers/roadfe-screen.cjs');
 let child=initial();let calls=0;
 const root=()=>({key:'auth-root',routes:[{name:'(drone)',key:'role',state:child}]});
 const s=screen('app/(drone)/_layout.tsx',{modules:{
  'expo-router':{Stack:'Stack',usePathname:()=>'/requests',useNavigation:()=>({getState:root,dispatchSync:action=>{assert.equal(action.target,'operator');child=apply(child,action);calls++;}})},
  '../../src/components/BottomNav':{BottomNav:'BottomNav'},
  '../../src/navigation/operatorTabNavigation':load(),
 }});
 s.render();const dock=s.nodes().find(n=>n.type==='BottomNav');
 dock.props.onNavigate('/(drone)/requests');assert.equal(calls,0);
 child=apply(child,StackActions.push('work-package',{taskId:'A'}));
 dock.props.onNavigate('/(drone)/requests');assert.equal(calls,1);
 assert.equal(child.routes.at(-1).key,'list');assert.equal(child.routes.length,2);
 dock.props.onNavigate('/(drone)/sync');assert.equal(child.routes.at(-1).name,'sync');
 dock.props.onNavigate('/(drone)/sync');assert.equal(calls,2);
 s.unmount();
});
