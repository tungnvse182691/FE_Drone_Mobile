const test=require('node:test'),assert=require('node:assert/strict');
const {screen}=require('./helpers/roadfe-screen.cjs');
function layout(){const notices=[],nav=[];const s=screen('app/(reporter)/_layout.tsx',{modules:{
 'react-native':{View:'View',StyleSheet:{create:o=>o},Alert:{alert:(...args)=>notices.push(args)}},
 'expo-router':{Stack:'Stack',usePathname:()=>'/home',useRouter:()=>({push:p=>nav.push(p)})},
 '../../src/components/BottomNav':{BottomNav:'BottomNav'}
 }});s.render();const go=route=>s.nodes().find(n=>n.type==='BottomNav').props.onNavigate(route);return {s,nav,notices,go};}
for(const route of ['/(reporter)/uploads','/(reporter)/track'])test('C1 Guest '+route+' explains login, cancel stays and accept opens auth',()=>{
 const f=layout();f.go(route);assert.equal(f.notices.length,1);assert.deepEqual(f.nav,[]);
 assert.match(f.notices[0][1],/Đăng nhập/);const buttons=f.notices[0][2];buttons.find(b=>b.text==='Hủy').onPress?.();assert.deepEqual(f.nav,[]);
 buttons.find(b=>b.text==='Đăng nhập').onPress();assert.deepEqual(f.nav,['/(auth)']);assert.equal(f.s.h.calls.length,0);f.s.unmount();
});
test('C1 Reporter goes directly, Guest public pages remain reachable, session switches invalidate dialog',()=>{
 const f=layout();for(const page of ['home','report','account','capture'])f.go('/(reporter)/'+page);assert.equal(f.nav.length,4);assert.equal(f.notices.length,0);
 f.go('/(reporter)/track');const oldAccept=f.notices[0][2].find(b=>b.text==='Đăng nhập').onPress;
 f.s.h.login();oldAccept();assert.equal(f.nav.length,4);f.go('/(reporter)/track');f.go('/(reporter)/uploads');assert.deepEqual(f.nav.slice(-2),['/(reporter)/track','/(reporter)/uploads']);
 f.s.h.logout();f.go('/(reporter)/track');assert.equal(f.notices.length,2);assert.equal(f.s.h.calls.length,0);f.s.unmount();
});
for(const kind of ['restored','expired','crew','forced'])test('C1 '+kind+' cannot navigate directly to private Reporter tab',()=>{
 const f=layout();f.s.h.changeAuth({status:kind==='expired'?'SIGNED_OUT':'AUTHENTICATED',token:kind==='restored'?null:f.s.h.jwt('actor'),user:{id:'actor',role_code:kind==='crew'?'REPAIR_CREW':'REPORTER',must_change_password:kind==='forced'}});
 f.go('/(reporter)/uploads');assert.equal(f.nav.length,0);assert.equal(f.notices.length,1);f.s.unmount();
});
test('C1 real BottomNav delegates only when callback provided and keeps default push/active state',()=>{
 for(const custom of [false,true]){const nav=[],delegated=[];const s=screen('src/components/BottomNav.tsx',{exportName:'BottomNav',props:{tabs:[{label:'Ảnh',route:'/(reporter)/uploads',icon:'photo-library'}],activeRoute:'/(reporter)/uploads',...(custom?{onNavigate:r=>delegated.push(r)}:{})},modules:{'expo-router':{router:{push:r=>nav.push(r)}}}});
 s.render();const tab=s.nodes().find(n=>n.type==='Pressable');assert.equal(tab.props.accessibilityState.selected,true);tab.props.onPress();assert.deepEqual(nav,custom?[]:['/(reporter)/uploads']);assert.deepEqual(delegated,custom?['/(reporter)/uploads']:[]);s.unmount();}
});
test('C1 unchanged root guard protects direct URLs/expired session, public pages and cross-role',()=>{
 const f=layout(),guard=f.s.h.load('app/_layout.tsx').authGuardDestination;
 for(const page of ['uploads','track'])assert.equal(guard(f.s.h.getAuth(),['(reporter)',page]),'/(auth)');
 for(const page of ['home','report','account','capture'])assert.equal(guard(f.s.h.getAuth(),['(reporter)',page]),null);
 f.s.h.login('REPAIR_CREW');assert.equal(guard(f.s.h.getAuth(),['(reporter)','uploads']),'/(crew)/home');f.s.unmount();
});
