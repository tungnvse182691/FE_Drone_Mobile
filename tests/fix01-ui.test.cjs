const {test} = require('node:test');
const assert = require('node:assert/strict');
const {screen,deferred} = require('./helpers/roadfe-screen.cjs');
const input={description:'Private fixture from guest A',photos:[{uri:'cache://guest-a.jpg',fileName:'fixture.jpg',mediaType:'image/jpeg',capturedAt:'2026-10-28T00:00:00Z'}],coords:{latitude:10,longitude:106,accuracyMeters:5}};
const token = h => ({user:{id:'B',role_code:'REPORTER'},accessToken:h.jwt('B')});

for(const method of ['login','otp'])test('RPT-01 real '+method+' screen restores only owned data, not guest A',async()=>{
  let s;
  s=screen(method==='login'?'app/(auth)/index.tsx':'app/(auth)/otp-verify.tsx',{
    login:async()=>token(s.h),api:{verifyReporterOtpReal:async()=>({email:'fixture@example.test',tokens:token(s.h)})},
  });
  await s.reporter.useReporterStore.getState().savePendingDraft(input);
  const before=JSON.stringify([...s.h.rows]);s.render();
  if(method==='login'){s.input('Email hoặc Số điện thoại','fixture@example.test');s.input('Mật khẩu','synthetic-only');}
  else{s.nodes().find(n=>n.type==='TextInput').props.onChangeText('123456');s.render();}
  await s.press(method==='login'?'Đăng nhập':'Xác nhận OTP');await s.flush();
  assert.equal(s.h.getAuth().user.id,'B');
  if(method==='login'){
    assert.deepEqual(s.nav,[],'login commits session; root owns restore/navigation');
    const segments=['(auth)'],router={replace:p=>s.nav.push(p)};
    const auth=Object.assign(f=>f(s.h.getAuth()),{getState:()=>s.h.getAuth()});
    const root=screen('app/_layout.tsx',{expose:'AuthGuard',exportName:'AuthGuard',props:{children:'Stack'},modules:{
      '../src/store/auth':{useAuthStore:auth},'../src/store/reporter':s.reporter,'../src/store/uploads':s.uploads,
      '../src/api/uploads':s.h.load('src/api/uploads.ts'),'expo-router':{useSegments:()=>segments,useRouter:()=>router},
      '@tanstack/react-query':{QueryClient:class{}},'expo-font':{},'expo-status-bar':{},'@expo-google-fonts/roboto':{},'react-native-gesture-handler':{},'../src/components/Toast':{Toast:'Toast'},
    }});root.render();await root.flush();root.unmount();
  }
  assert.equal(s.nav.at(-1),'/(reporter)/home');
  assert.equal(s.reporter.useReporterStore.getState().pendingDraft,null);
  assert.equal(JSON.stringify([...s.h.rows]),before);assert.equal(s.h.calls.length,0);
  if(method==='otp')assert.match(JSON.stringify(s.nodes()),/không tự chuyển/);
  else assert.doesNotMatch(JSON.stringify(s.nodes()),/không tự chuyển/);
  if(method==='login'){
    assert.equal(s.nodes().find(n=>n.type==='Image').props.style.width,104);
    assert.equal(s.nodes().find(n=>n.type==='ScrollView').props.contentContainerStyle.justifyContent,'center');
  }
  s.unmount();
});

for(const change of ['actor','logout','session','environment','aba','unmount'])test('late login response is fenced after '+change,async()=>{
  const pending=deferred(),s=screen('app/(auth)/index.tsx',{login:()=>pending.promise});s.render();
  s.input('Email hoặc Số điện thoại','fixture@example.test');s.input('Mật khẩu','synthetic-only');
  const request=s.press('Đăng nhập');
  if(change==='environment')s.h.client.defaults.baseURL='other-env';
  else if(change==='unmount')s.unmount();
  else if(change==='aba'){s.h.login();s.h.logout();}
  else if(change==='logout'){s.h.login();s.h.logout();}
  else s.h.login('REPORTER',change==='actor'?'other':'B');
  const current=s.h.getAuth();pending.resolve(token(s.h));await request;
  assert.equal(s.h.getAuth(),current);assert.equal(s.nav.length,0);
});

for(const file of ['report','report-supplement'])for(const change of ['actor','logout','session','environment','aba','unmount'])test(file+' queued autosave cannot cross '+change,async()=>{
  const s=screen(`app/(reporter)/${file}.tsx`);
  s.h.login();
  await s.reporter.useReporterStore.getState().savePendingDraft({...input,...(file==='report-supplement'?{targetReportId:'fixture-report',ifMatch:'v1'}:{})});
  s.render();await s.flush();
  const before=JSON.stringify([...s.h.rows]);
  s.input(file==='report'?'Mô tả hiện trạng':'Nội dung bổ sung','late private edit');
  if(change==='environment')s.h.client.defaults.baseURL='other-env';
  else if(change==='unmount')s.unmount();
  else if(change==='logout')s.h.logout();
  else if(change==='aba'){s.h.login('REPORTER','other');s.h.login();}
  else if(change==='session')s.h.changeAuth({status:'AUTHENTICATED',token:s.h.jwt('actor','different-session'),user:{id:'actor',role_code:'REPORTER'}});
  else s.h.login('REPORTER','other');
  // Drain the old continuation before a new render can reset its local state.
  await new Promise(r=>setImmediate(r));
  assert.equal(JSON.stringify([...s.h.rows]),before);
  assert.equal(s.h.calls.some(c=>c[0]==='report'||c[0]==='supplement'),false);
  if(change!=='unmount'){s.render();assert.doesNotMatch(JSON.stringify(s.nodes()),/late private edit|Private fixture from guest A/);s.unmount();}
});

for(const change of ['actor','environment','unmount'])test('supplement late GET readback does not populate '+change+' UI',async()=>{
  let reads=0;
  const pending=deferred(),s=screen('app/(reporter)/report-supplement.tsx',{api:{getOwnReportReal:()=>++reads===1?pending.promise:Promise.reject({status:403})}});
  s.h.login();s.render();
  if(change==='actor')s.h.login('REPORTER','B');else if(change==='environment')s.h.client.defaults.baseURL='other-env';else s.unmount();
  pending.resolve({report:{id:'fixture-report',description:'Private server data A'},etag:'v1'});
  if(change!=='unmount'){s.render();await s.flush();assert.doesNotMatch(JSON.stringify(s.nodes()),/Private server data A/);s.unmount();}
  else await new Promise(r=>setImmediate(r));
});

for(const file of ['report','report-supplement'])for(const change of ['actor','environment','unmount'])test(file+' late photo picker is ignored after '+change,async()=>{
  const pending=deferred(),s=screen(`app/(reporter)/${file}.tsx`,{pick:()=>pending.promise});s.h.login();
  s.render();await s.flush();
  const button=s.nodes().find(n=>n.props?.accessibilityLabel==='Chọn ảnh từ thư viện');
  assert.ok(button);const request=button.props.onPress();
  if(change==='actor')s.h.login('REPORTER','B');else if(change==='environment')s.h.client.defaults.baseURL='other-env';else s.unmount();
  pending.resolve({canceled:false,assets:[{uri:'cache://late-private.jpg',name:'private.jpg',mimeType:'image/jpeg'}]});await request;
  if(change!=='unmount'){s.render();await s.flush();assert.doesNotMatch(JSON.stringify(s.nodes()),/late-private/);s.unmount();}
});

test('RPT-02 queue delete control is disabled with explanation and direct handler retains row',async()=>{
  const s=screen('app/(reporter)/uploads.tsx');s.h.login();
  const queue=s.uploads.useUploadsStore;await queue.getState().hydrate();
  const id=await queue.getState().enqueuePhoto({uriLocal:'cache://fixture.jpg',fileName:'fixture.jpg',mediaType:'image/jpeg',sizeBytes:3,checksumSha256:'fixture-checksum'});
  s.render();await s.flush();
  const button=s.nodes().find(n=>n.props?.testID===`uploads-remove-${id}`);
  assert.equal(button.props.disabled,true);assert.match(JSON.stringify(s.nodes()),/khôi phục, xác minh và đối soát/);
  const before=JSON.stringify(s.h.rows.get(id));await button.props.onPress();assert.equal(JSON.stringify(s.h.rows.get(id)),before);
  s.unmount();
});

for(const source of ['camera','library'])for(const change of ['actor','session','environment','unmount'])test('capture '+source+' late result cannot enqueue after '+change,async()=>{
  const pending=deferred(),s=screen('app/(reporter)/capture.tsx',{[source]:()=>pending.promise});
  s.h.login();s.render();await s.flush();
  const operation=s.tap(source==='camera'?'capture-take-photo':'capture-pick-photo');
  // Allow permission await to reach the deferred native picker.
  await new Promise(r=>setImmediate(r));
  if(change==='unmount')s.unmount();else if(change==='environment')s.h.client.defaults.baseURL='other-env';
  else if(change==='session')s.h.changeAuth({status:'AUTHENTICATED',token:s.h.jwt('actor','s2'),user:{id:'actor',role_code:'REPORTER'}});
  else s.h.login('REPORTER','B');
  pending.resolve({canceled:false,assets:[{uri:'cache://late-native.jpg',fileName:'private.jpg',mimeType:'image/jpeg'}]});await operation;
  assert.equal(s.h.rows.size,0);assert.equal(s.h.calls.length,0);
  if(change!=='unmount'){s.render();await s.flush();assert.doesNotMatch(JSON.stringify(s.nodes()),/late-native|private.jpg/);s.unmount();}
});

for(const outcome of ['denied','exception','late-session','unmount'])test('capture GPS '+outcome+' never fabricates or leaks location',async()=>{
  const pending=deferred();let requests=0;
  const s=screen('app/(reporter)/capture.tsx',{gps:{Accuracy:{High:1},
    getForegroundPermissionsAsync:async()=>({status:outcome==='denied'?'denied':'granted'}),
    requestForegroundPermissionsAsync:async()=>({status:'denied'}),
    getCurrentPositionAsync:()=>{requests++;return outcome==='exception'||requests>1?Promise.reject(Error('fixture timeout')):pending.promise;}}});
  s.h.login();s.render();await s.flush();
  if(outcome==='late-session')s.h.login('REPORTER','B');else if(outcome==='unmount')s.unmount();
  pending.resolve({coords:{latitude:10.12345,longitude:106.12345,accuracy:5}});
  if(outcome!=='unmount'){s.render();await s.flush();assert.doesNotMatch(JSON.stringify(s.nodes()),/10.12345|106.12345/);s.unmount();}
  if(outcome==='denied')assert.equal(requests,0);
  assert.equal(s.h.rows.size,0);
});

test('uploads render hides old environment rows before hydration effect finishes',async()=>{
  const s=screen('app/(reporter)/uploads.tsx');s.h.login();await s.uploads.useUploadsStore.getState().hydrate();
  await s.uploads.useUploadsStore.getState().enqueuePhoto({uriLocal:'cache://private.jpg',fileName:'private-old-env.jpg',mediaType:'image/jpeg',sizeBytes:3,checksumSha256:'fixture'});
  s.h.client.defaults.baseURL='other-env';s.render();
  assert.doesNotMatch(JSON.stringify(s.nodes()),/private-old-env.jpg/);await s.flush();s.unmount();
});
