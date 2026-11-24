const {test}=require('node:test');
const assert=require('node:assert/strict');
const {screen}=require('./helpers/roadfe-screen.cjs');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');

test('mounted runtime UI never imports the process-wide imperative router',()=>{
  const offenders=[];
  for(const root of ['app','src/components'])for(const file of fs.readdirSync(root,{recursive:true}).filter(f=>f.endsWith('.tsx'))){
    const target=path.join(root,file),source=ts.createSourceFile(target,fs.readFileSync(target,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    for(const n of source.statements)if(ts.isImportDeclaration(n)&&n.moduleSpecifier.text==='expo-router'&&n.importClause?.namedBindings?.elements?.some(e=>(e.propertyName??e.name).text==='router'))offenders.push(target);
  }
  assert.deepEqual(offenders,[],'use the routing queue of the rendering root in UI callbacks');
});

test('Crew profile sync row keeps navigating after global bridge cleanup',()=>{
  const calls=[];
  const s=screen('app/(crew)/profile.tsx',{modules:{
    './tasks':{useCrewInbox:()=>({enabled:true,tasks:[],error:null,query:{isPending:false,isFetching:false,hasNextPage:false}})},
    '../../src/api/crewApi':{crewTaskIsComplete:()=>false},
    '../../src/components/crew/CrewMotion':{CrewContentTransition:'CrewContentTransition',CrewPressable:'CrewPressable'},
    '../../src/components/AppHeader':{AppHeader:'AppHeader'},'../../src/components/Card':{Card:'Card'},
    'expo-router':{router:new Proxy({}, {get(){throw Error('global bridge unbound');}}),useRouter:()=>({push:r=>calls.push(r)})},
  }});
  s.render();const row=s.nodes().find(n=>n.type==='CrewPressable'&&JSON.stringify(n.props.children).includes('Cài đặt đồng bộ'));
  assert.ok(row);row.props.onPress();assert.deepEqual(calls,['/(crew)/sync']);s.unmount();
});

// A previous root's cleanup may unbind Expo Router's process-wide bridge while
// the current React tree still has a valid routing queue. Do not use that
// bridge from a mounted tab handler. Android recreation is verified separately.
test('mounted bottom tabs use the current tree router when global bridge is unbound',()=>{
  for(const custom of [false,true]) {
    const pushed=[],delegated=[];
    const s=screen('src/components/BottomNav.tsx',{exportName:'BottomNav',props:{
      tabs:[{icon:'home',label:'Trang chủ',route:'/(crew)/home'}],activeRoute:'/(crew)/home',
      ...(custom?{onNavigate:r=>delegated.push(r)}:{}),
    },modules:{'expo-router':{
      router:{push(){throw Error('The imperative router is unavailable before the first render has finished.');}},
      useRouter:()=>({push:r=>pushed.push(r)}),
    }}});
    s.render();
    const tab=s.nodes().find(n=>n.props.accessibilityRole==='tab');
    assert.equal(tab.props.accessibilityState.selected,true);
    tab.props.onPress();
    assert.deepEqual(pushed,custom?[]:['/(crew)/home']);
    assert.deepEqual(delegated,custom?['/(crew)/home']:[]);
    s.unmount();
  }
});

for (const canGoBack of [true,false]) test('mounted header back uses its root router and preserves fallback '+canGoBack,()=>{
  const calls=[];
  const s=screen('src/components/AppHeader.tsx',{exportName:'AppHeader',props:{subtitle:'Nhiệm vụ',showBack:true,fallbackRoute:'/(crew)/tasks'},modules:{
    'expo-router':{
      router:new Proxy({}, {get(){throw Error('global bridge unbound');}}),
      useRouter:()=>({canGoBack:()=>canGoBack,back:()=>calls.push('back'),replace:r=>calls.push(r)}),
    },
  }});
  s.render();s.nodes().find(n=>n.props.accessibilityLabel==='Quay lại').props.onPress();
  assert.deepEqual(calls,[canGoBack?'back':'/(crew)/tasks']);s.unmount();
});
