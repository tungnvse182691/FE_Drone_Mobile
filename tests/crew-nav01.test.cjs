// CREW-NAV-01: Crew bottom-nav active mapping + bottom inset ownership.
// Harness executes the shipped layout with a hook shim; it is not Android E2E.
const {test}=require('node:test'),assert=require('node:assert/strict');
const {screen}=require('./helpers/roadfe-screen.cjs');

function mountCrewLayout(pathname){
  const s=screen('app/(crew)/_layout.tsx',{modules:{
    'react-native':{View:'View',StyleSheet:{create:o=>o}},
    'expo-router':{Stack:'Stack',usePathname:()=>pathname},
    'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},
    '../../src/components/BottomNav':{BottomNav:'BottomNav'},
  }});
  s.render();
  const nav=s.nodes().find(n=>n.type==='BottomNav');
  return {s,nav};
}

function crewTabs(pathname){
  const {s,nav}=mountCrewLayout(pathname);
  const shell=screen('src/components/BottomNav.tsx',{exportName:'BottomNav',props:nav.props});
  shell.render();
  const tabs=shell.nodes().filter(n=>n.props.accessibilityRole==='tab');
  const selected=tabs.filter(n=>n.props.accessibilityState.selected);
  const labels=selected.map(n=>n.props.children.flat(Infinity).find(c=>c?.type==='Text').props.children[0]);
  const out={labels,total:tabs.length,selected,activeRoute:nav.props.activeRoute};
  shell.unmount();s.unmount();
  return out;
}

const LABEL_BY_TAB={home:'Trang chủ',tasks:'Công việc',sync:'Đồng bộ',profile:'Hồ sơ'};
const ROUTES={
  home:'Trang chủ',
  tasks:'Công việc',
  'wo-detail':'Công việc',
  navigation:'Công việc',
  progress:'Công việc',
  'report-defect':'Công việc',
  viewfinder:'Công việc',
  'field-review':'Công việc',
  complete:'Công việc',
  'repair-correction':'Công việc',
  receiving:'Công việc',
  sync:'Đồng bộ',
  profile:'Hồ sơ',
};

for(const [route,label] of Object.entries(ROUTES))for(const prefix of ['/','/(crew)/']){
  test('C1-A '+prefix+route+' selects '+label,()=>{
    const result=crewTabs(prefix+route);
    assert.deepEqual(result.labels,[label]);
    assert.equal(result.total,4);
    assert.equal(result.selected.length,1);
    assert.equal(result.selected[0].props.accessibilityState.selected,true);
  });
}

for(const route of ['field-review-extra','field','tasks-extra','home-extra','sync-extra','profile-extra',
  'wo-detail-extra','receiving-extra','navigation-extra','crew','drone']){
  test('C1-A unknown/lookalike '+route+' never matches a tab',()=>{
    assert.deepEqual(crewTabs('/'+route).labels,[]);
  });
}

test('C1-B crew layout owns exactly one bottom inset around BottomNav',()=>{
  const {s,nav}=mountCrewLayout('/home');
  const safe=s.nodes().filter(n=>n.type==='SafeAreaView');
  assert.equal(safe.length,1,'crew layout must declare one SafeAreaView');
  assert.equal((safe[0].props.edges??[]).join(','),'bottom');
  assert.ok(safe[0].props.children.flat(Infinity).includes(nav),
    'BottomNav must be inside the bottom SafeAreaView');
  s.unmount();
});

test('C1-B shared SafeAreaScreen does not claim the bottom inset (no double padding)',()=>{
  const s=screen('src/components/SafeAreaScreen.tsx',{exportName:'SafeAreaScreen',props:{children:null}});
  s.render();
  const safe=s.nodes().find(n=>n.type==='SafeAreaView');
  assert.ok(!(safe.props.edges??[]).includes('bottom'),'SafeAreaScreen must not add a second bottom inset');
  s.unmount();
});

test('C1-B crew tab keeps a 48dp minimum touch target',()=>{
  const {s,nav}=mountCrewLayout('/tasks');
  const shell=screen('src/components/BottomNav.tsx',{exportName:'BottomNav',props:nav.props});
  shell.render();
  const tabs=shell.nodes().filter(n=>n.props.accessibilityRole==='tab');
  assert.equal(tabs.length,4);
  for(const tab of tabs)assert.ok((tab.props.style?.minHeight??0)>=48,'tab touch target below 48dp');
  shell.unmount();s.unmount();
});

test('Crew dock stays at the original viewport bottom during keyboard resize and restores after hide',()=>{
  const listeners={};let removed=0;
  const s=screen('app/(crew)/_layout.tsx',{exportName:'CrewScreenShell',props:{children:['stack','nav']},moduleFactories:{'react-native':({modules})=>({...modules['react-native'],Keyboard:{isVisible:()=>false,addListener:(event,fn)=>{listeners[event]=fn;return{remove(){removed++;}};}}})},modules:{'expo-router':{Stack:'Stack',usePathname:()=>'/field-review'},'../../src/components/BottomNav':{BottomNav:'BottomNav'}}});
  s.render();
  const layout=height=>{s.nodes()[0].props.onLayout({nativeEvent:{layout:{width:400,height}}});s.render();};
  layout(800);layout(500);
  let dock=s.nodes().find(n=>n.props.testID==='crew-navigation-dock');assert.equal(dock.props.style[1].height,800);
  listeners.keyboardDidShow();s.render();assert.ok(!s.nodes().some(n=>n.props.testID==='crew-navigation-dock'));
  listeners.keyboardDidHide();s.render();assert.ok(s.nodes().some(n=>n.props.testID==='crew-navigation-dock'));
  layout(850);layout(800);dock=s.nodes().find(n=>n.props.testID==='crew-navigation-dock');assert.equal(dock.props.style[1].height,850);
  s.unmount();assert.equal(removed,2);
});
