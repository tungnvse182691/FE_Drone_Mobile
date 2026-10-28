const {test}=require('node:test'),assert=require('node:assert/strict');
const {screen,deferred}=require('./helpers/roadfe-screen.cjs');
function guardFixture(){
 const done=deferred(),nav=[],user={id:'reporter-A',role_code:'REPORTER',must_change_password:false};
 let state={user,token:'jwt-A',status:'AUTHENTICATED'},context={ownerId:user.id,session:'session-A',environment:'env-A'};
 const segments=['(auth)'];const router={replace:p=>nav.push(p)},auth=Object.assign(f=>f(state),{getState:()=>state});
 const store=Object.assign(f=>f({pendingDraft:null}),{getState:()=>({restorePendingDraft:()=>done.promise})});
 const props={children:'Stack remains mounted'};
 const s=screen('app/_layout.tsx',{expose:'AuthGuard',exportName:'AuthGuard',props,modules:{
  '../src/store/auth':{useAuthStore:auth},'../src/store/reporter':{useReporterStore:store},
  '../src/api/uploads':{hasAuthenticatedSession:s=>s.status==='AUTHENTICATED'&&!!s.token},
  '../src/store/uploads':{reporterContext:()=>({...context}),assertReporterContext:c=>{if(JSON.stringify(c)!==JSON.stringify(context))throw Error('changed');}},
  'expo-router':{useSegments:()=>segments,useRouter:()=>router},
  '@tanstack/react-query':{QueryClient:class{}},'expo-font':{},'expo-status-bar':{},'@expo-google-fonts/roboto':{},'react-native-gesture-handler':{},'../src/components/Toast':{Toast:'Toast'},
 }});
 const draft={ownerId:user.id,provenance:{environment:'env-A',session:'session-A'},id:'owned'};
 return {s,done,nav,draft,switch:()=>{state={...state,user:{...user,id:'reporter-B'},token:'jwt-B'};context={...context,ownerId:'reporter-B',session:'session-B'};}};
}
test('HARDEN Reporter auth guard awaits owned restore before navigating; no Home flash',async()=>{const f=guardFixture();f.s.render();assert.deepEqual(f.nav,[]);f.done.resolve(f.draft);await f.s.flush();assert.deepEqual(f.nav,['/(reporter)/report']);f.s.unmount();});
test('HARDEN Reporter delayed restore after account switch cannot navigate or adopt',async()=>{const f=guardFixture();f.s.render();f.switch();f.done.resolve(f.draft);await f.s.flush();assert.deepEqual(f.nav,[]);f.s.unmount();});
test('HARDEN Reporter guest or wrong-provenance draft is never resumed',async()=>{for(const change of [{ownerId:null},{ownerId:'foreign'},{provenance:{environment:'other',session:'session-A'}}]){const f=guardFixture();f.s.render();f.done.resolve({...f.draft,...change});await f.s.flush();assert.deepEqual(f.nav,['/(reporter)/home']);f.s.unmount();}});

test('HARDEN Reporter restore failure preserves navigation and exposes retry',async()=>{const f=guardFixture();f.s.render();f.done.reject(Error('disk unavailable'));await f.s.flush();assert.deepEqual(f.nav,[]);assert.ok(f.s.nodes().some(n=>n.props?.accessibilityLabel==='Thử khôi phục nháp'));f.s.unmount();});
