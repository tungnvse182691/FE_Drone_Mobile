const {test}=require('node:test'),assert=require('node:assert/strict');
const {screen}=require('./helpers/roadfe-screen.cjs');
function layout(pathname){
 const s=screen('app/(reporter)/_layout.tsx',{modules:{'expo-router':{Stack:'Stack',usePathname:()=>pathname,useRouter:()=>({push(){}})},'../../src/components/BottomNav':{BottomNav:'BottomNav'}}});s.render();
 const props=s.nodes().find(n=>n.type==='BottomNav').props;
 const nav=screen('src/components/BottomNav.tsx',{exportName:'BottomNav',props});nav.render();
 const selected=nav.nodes().filter(n=>n.props.accessibilityRole==='tab'&&n.props.accessibilityState.selected);
 const labels=selected.map(n=>n.props.children.flat(Infinity).find(c=>c?.type==='Text').props.children[0]);
 nav.unmount();s.unmount();return labels;
}
const routes={home:'Trang chủ',report:'Phản ánh','report-detail':'Tra cứu','report-supplement':'Tra cứu',track:'Tra cứu',feedback:'Tra cứu',uploads:'Ảnh',capture:'Ảnh',account:'Tài khoản',profile:'Tài khoản'};
for(const [route,label] of Object.entries(routes))for(const prefix of ['/','/(reporter)/'])test('NAV-01 exact '+prefix+route+' selects '+label,()=>assert.deepEqual(layout(prefix+route),[label]));
for(const route of ['report-detail-extra','reporter','track-extra','profile-extra','uploads-extra'])test('NAV-01 unknown lookalike '+route+' never matches a tab',()=>assert.deepEqual(layout('/'+route),[]));
for(const group of ['crew','drone'])test('NAV-01 shared BottomNav preserves every declared '+group+' route exactly',()=>{
 const s=screen('app/('+group+')/_layout.tsx',{modules:{'expo-router':{Stack:'Stack',usePathname:()=>'/home'},'../../src/components/BottomNav':{BottomNav:'BottomNav'}}});s.render();
 const {tabs}=s.nodes().find(n=>n.type==='BottomNav').props;
 for(const tab of tabs)for(const activeRoute of tab.activeRoutes??tab.activePrefixes??[tab.route]){
  const nav=screen('src/components/BottomNav.tsx',{exportName:'BottomNav',props:{tabs,activeRoute}});nav.render();
  const nodes=nav.nodes().filter(n=>n.props.accessibilityRole==='tab');assert.equal(nodes.filter(n=>n.props.accessibilityState.selected).length,1);assert.equal(nodes[tabs.indexOf(tab)].props.accessibilityState.selected,true);nav.unmount();
 }s.unmount();
});
