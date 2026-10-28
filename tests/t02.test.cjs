const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm'), ts=require('typescript');
const {randomUUID}=require('node:crypto');
function load(relative, stubs={}) {
  const module={exports:{}};
  const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',relative),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
  vm.runInNewContext(code,{module,exports:module.exports,React:stubs.react,crypto:{randomUUID},require:name=>{
    if(name in stubs)return stubs[name];
    if(name.startsWith('.'))return load(path.relative(path.join(__dirname,'..'),path.resolve(path.dirname(path.join(__dirname,'..',relative)),name))+'.ts',stubs);
    return require(name);
  }});return module.exports;
}
function apiHarness() {
  const calls=[];let status=204, failure=null;
  const client=label=>({post:async(...args)=>{calls.push({label,args});if(failure)throw failure;return {status,data:null};}});
  const api=load('src/api/authApi.ts',{'./client':{bareClient:client('bare'),apiClient:client('auth')},'../utils/uuid':{uuidv4:randomUUID}});
  return {api,calls,status:n=>{status=n;},fail:e=>{failure=e;}};
}
test('API004 sends exact DTO with captured Bearer and stable caller key',async()=>{
  const h=apiHarness();await h.api.changePasswordReal('fixture-token','old','new','fixture-key');
  const c=h.calls[0];assert.equal(c.label,'auth');assert.equal(c.args[0],'/auth/change-password');
  assert.equal(JSON.stringify(c.args[1]),JSON.stringify({currentPassword:'old',newPassword:'new'}));
  assert.equal(c.args[2].headers.Authorization,'Bearer fixture-token');assert.equal(c.args[2].headers['Idempotency-Key'],'fixture-key');
});
test('API005 sends anonymous DTO and preserves operationId',async()=>{
  const h=apiHarness();const body={username:'fixture@example.test',currentPassword:'old',newPassword:'new',confirmPassword:'new',operationId:randomUUID()};
  await h.api.forcedChangePasswordReal(body);const c=h.calls[0];assert.equal(c.label,'bare');assert.equal(c.args[0],'/auth/forced-password-change');assert.equal(JSON.stringify(c.args[1]),JSON.stringify(body));assert.equal(c.args[2],undefined);
});
test('API008 requires 202 and sends normalized email without bearer',async()=>{
  const h=apiHarness();h.status(202);await h.api.requestPasswordRecoveryReal(' Fixture@Example.Test ');
  assert.equal(h.calls[0].label,'bare');assert.equal(h.calls[0].args[0],'/auth/password-recovery-requests');assert.equal(h.calls[0].args[1].email,'fixture@example.test');
  h.status(200);await assert.rejects(h.api.requestPasswordRecoveryReal('fixture@example.test'));
});
test('password attempt preserves identity/key only for identical payload',()=>{
  const {api}=apiHarness();const input={identity:'actor-a/session-a',username:'fixture@example.test',currentPassword:'old',newPassword:'new',confirmPassword:'new',mode:'session'};
  const a=api.preparePasswordAttempt(null,input);assert.equal(api.preparePasswordAttempt(a,{...input}).key,a.key);
  for(const field of ['identity','username','currentPassword','newPassword','confirmPassword','mode'])assert.notEqual(api.preparePasswordAttempt(a,{...input,[field]:'changed'}).key,a.key);
});
const jwt=(sub,sid,extra={})=>'fixture.'+Buffer.from(JSON.stringify({sub,sid,...extra})).toString('base64url')+'.unsigned';
test('password command session identity survives refresh but separates logins',()=>{
  const {api}=apiHarness();const first=api.passwordSessionIdentity(jwt('a','s1'));
  assert.ok(first);assert.equal(first,api.passwordSessionIdentity(jwt('a','s1',{exp:9})));
  assert.notEqual(first,api.passwordSessionIdentity(jwt('a','s2')));assert.notEqual(first,api.passwordSessionIdentity(jwt('b','s1')));assert.equal(api.passwordSessionIdentity('bad'),null);
});
test('password form validation rejects empty/mismatch/reuse/oversized values',()=>{
  const {api}=apiHarness();for(const values of [['','newpass','newpass'],['old','newpass','other'],['samepass','samepass','samepass'],['old','x'.repeat(1025),'x'.repeat(1025)]])assert.ok(api.passwordValidationMessage(...values));
  assert.equal(api.passwordValidationMessage('old','newpass','newpass'),null);
});
for(const status of [401,400,409,503,undefined])test(`password errors ${status??'timeout'} keep original failure and never auto retry`,async()=>{
  const h=apiHarness(),failure={response:status?{status,data:{code:'unknown'}}:undefined};h.fail(failure);
  await assert.rejects(h.api.changePasswordReal('token','old','new','key'),e=>e===failure);assert.equal(h.calls.length,1);
  const message=h.api.passwordFailureMessage(failure);assert.equal(typeof message,'string');if(!status||status===503)assert.match(message,/Chưa xác nhận/);
});

function screenHarness(relative, initial, methods={}) {
  const slots=[],calls=[],navigations=[];let index=0,tree;
  const auth={status:'AUTHENTICATED',token:jwt('a','s1'),user:{id:'a',phone_or_email:'fixture@example.test',role_code:'REPORTER',must_change_password:false},forcedChangeUsername:null,...initial};
  auth.logout=()=>{calls.push('logout');auth.token=null;auth.user=null;auth.status='SIGNED_OUT';auth.forcedChangeUsername=null;};
  auth.login=(user,pair)=>{calls.push('login');auth.user=user;auth.token=pair?.accessToken;auth.status='AUTHENTICATED';};
  auth.beginForcedPasswordChange=username=>{auth.forcedChangeUsername=username;};
  const hook=selector=>selector(auth);hook.getState=()=>auth;
  const react={createElement:(type,props,...children)=>({type,props:{...props,children}}),
    useState:initial=>{const i=index++;if(!(i in slots))slots[i]=initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},
    useRef:initial=>{const i=index++;if(!(i in slots))slots[i]={current:initial};return slots[i];},useCallback:fn=>fn,useEffect:()=>{}};
  const api={...apiHarness().api,changePasswordReal:async(...a)=>calls.push(['004',...a]),forcedChangePasswordReal:async(...a)=>calls.push(['005',...a]),requestPasswordRecoveryReal:async(...a)=>calls.push(['008',...a]),...methods};
  const native={Platform:{OS:'android',select:o=>o.default},StyleSheet:{create:o=>o},Text:'Text',View:'View',Image:'Image',Pressable:'Pressable'};
  const stubs={react,'react-native':native,'react-native-safe-area-context':{SafeAreaView:'SafeAreaView'},'@expo/vector-icons':{},
    'expo-router':{useRouter:()=>({replace:p=>navigations.push(p),back:()=>navigations.push('back'),canGoBack:()=>true}),useLocalSearchParams:()=>({}),useFocusEffect:()=>{}},
    '../../src/api/client':{bareClient:{defaults:{baseURL:'fixture-env'}}},
    '../../src/components/Button':{Button:'Button'},'../../src/components/InputField':{InputField:'InputField'},'../../src/components/SafeAreaScreen':{SafeAreaScreen:'SafeAreaScreen'},
    '../../src/store/auth':{useAuthStore:hook,buildUserFromActor:(actor,email,must)=>({...auth.user,id:actor.id,phone_or_email:email,must_change_password:must})},
    '../../src/store/reporter':{useReporterStore:selector=>selector({pendingDraft:null})},'../../src/api/uploads':{isReporterSession:()=>false},
    '../../src/api/authApi':api,'../../src/api/mock/auth':{changePassword:async()=>calls.push(['mock']),forcedChangePassword:async()=>calls.push(['mock']),requestPasswordRecovery:async()=>calls.push(['mock'])},
    '../../src/api/idempotency':{getOrCreateCommandKey:randomUUID,clearCommandKey:()=>{}},'expo-crypto':{randomUUID},'../../src/utils/uuid':{uuidv4:randomUUID},'../../assets/logo_hoanghai.png':0,'../../assets/logo_hoanghai_icon.png':0};
  const screen=load(relative,stubs).default;
  const render=()=>{index=0;tree=screen();};
  function nodes(node=tree,result=[]){if(!node||typeof node!=='object')return result;result.push(node);for(const child of node.props?.children?.flat(Infinity)??[])if(child!=null)nodes(child,result);return result;}
  const input=(label,value)=>{nodes().find(n=>n.type==='InputField'&&n.props.label===label).props.onChangeText(value);render();};
  const press=title=>nodes().find(n=>n.type==='Button'&&n.props.title===title).props.onPress();
  render();return {auth,calls,navigations,render,input,press,nodes};
}
function fill(h){h.input('Mật khẩu cũ','oldpass');h.input('Mật khẩu mới','newpass');h.input('Xác nhận mật khẩu mới','newpass');}
test('session password success logs out and requires login, never reuses old token',async()=>{
  const h=screenHarness('app/(auth)/force-change-password.tsx');fill(h);await h.press('Đổi mật khẩu');
  assert.equal(h.calls[0][0],'004');assert.ok(h.calls.includes('logout'));assert.ok(!h.calls.includes('login'));assert.ok(h.navigations.length);
});
test('anonymous forced flow uses username context and operationId',async()=>{
  const h=screenHarness('app/(auth)/force-change-password.tsx',{user:null,token:null,status:'SIGNED_OUT',forcedChangeUsername:'fixture@example.test'});fill(h);await h.press('Đổi mật khẩu');
  assert.equal(h.calls[0][0],'005');assert.equal(h.calls[0][1].username,'fixture@example.test');assert.ok(h.calls[0][1].operationId);
});
test('timeout manual retry keeps body/key; editing payload creates fresh command',async()=>{
  const calls=[];const h=screenHarness('app/(auth)/force-change-password.tsx',{}, {changePasswordReal:async(...args)=>{calls.push(args);throw {code:'ECONNABORTED'};}});fill(h);
  await h.press('Đổi mật khẩu');h.render();await h.press('Đổi mật khẩu');assert.equal(JSON.stringify(calls[0]),JSON.stringify(calls[1]));
  h.input('Mật khẩu mới','otherpass');h.input('Xác nhận mật khẩu mới','otherpass');await h.press('Đổi mật khẩu');assert.notEqual(calls[1][3],calls[2][3]);assert.ok(!h.calls.includes('logout'));
});
test('password completion from A never logs out newly signed in B',async()=>{
  let resolve;const pending=new Promise(r=>resolve=r);const h=screenHarness('app/(auth)/force-change-password.tsx',{}, {changePasswordReal:()=>pending});fill(h);
  const request=h.press('Đổi mật khẩu');h.auth.token='b-token';h.auth.user={id:'b'};resolve();await request;assert.ok(!h.calls.includes('logout'));assert.equal(h.navigations.length,0);
});
test('recovery 202 message acknowledges request without promise of reset/email',async()=>{
  const h=screenHarness('app/(reporter)/account.tsx');await h.press('Gửi yêu cầu khôi phục');await new Promise(r=>setImmediate(r));h.render();assert.equal(h.calls[0][0],'008');
  const text=JSON.stringify(h.nodes());assert.match(text,/Đã ghi nhận/);assert.doesNotMatch(text,/Vui lòng kiểm tra email để tiếp tục/);
});
test('recovery timeout blocks repeated writes instead of reporting failure or success',async()=>{
  let count=0;const h=screenHarness('app/(reporter)/account.tsx',{}, {requestPasswordRecoveryReal:async()=>{count++;throw {code:'ECONNABORTED'};}});
  await h.press('Gửi yêu cầu khôi phục');await new Promise(r=>setImmediate(r));h.render();await h.press('Gửi yêu cầu khôi phục');assert.equal(count,1);
  assert.equal(h.nodes().find(n=>n.type==='Button'&&n.props.title==='Gửi yêu cầu khôi phục').props.disabled,true);
  assert.match(JSON.stringify(h.nodes()),/Chưa xác nhận/);
});
test('login 200 mustChangePassword uses issued session then forced screen',async()=>{
  const h=screenHarness('app/(auth)/index.tsx',{user:null,token:null,status:'SIGNED_OUT'}, {loginReal:async()=>({user:{id:'a'},accessToken:jwt('a','s1'),mustChangePassword:true})});
  h.input('Email hoặc Số điện thoại','fixture@example.test');h.input('Mật khẩu','oldpass');await h.press('Đăng nhập');
  assert.ok(h.calls.includes('login'));assert.equal(h.auth.user.must_change_password,true);assert.equal(h.navigations[0],'/(auth)/force-change-password');
});
test('explicit login 403 opens anonymous forced context without retaining password',async()=>{
  const h=screenHarness('app/(auth)/index.tsx',{user:null,token:null,status:'SIGNED_OUT'}, {loginReal:async()=>{throw {response:{status:403,data:{code:'auth_password_change_required'}}};}});
  h.input('Email hoặc Số điện thoại','fixture@example.test');h.input('Mật khẩu','oldpass');await h.press('Đăng nhập');h.render();
  assert.equal(h.auth.forcedChangeUsername,'fixture@example.test');assert.equal(h.auth.token,null);assert.equal(h.navigations[0],'/(auth)/force-change-password');
  assert.equal(h.nodes().find(n=>n.type==='InputField'&&n.props.label==='Mật khẩu').props.value,'');
});
test('AuthGuard admits password form for valid session or explicit forced context only',()=>{
  function fn(file,name){const source=ts.createSourceFile(file,fs.readFileSync(path.join(__dirname,'..',file),'utf8'),ts.ScriptTarget.Latest,true);return source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name).getText(source).replace(/^export /,'');}
  const constants=load('src/constants/routes.ts');
  const js=ts.transpileModule(fn('src/api/uploads.ts','hasAuthenticatedSession')+'\n'+fn('app/_layout.tsx','authGuardDestination')+'\nmodule.exports=authGuardDestination;', {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const module={exports:{}};vm.runInNewContext(js,{module,...constants});const guard=module.exports;
  const guest={user:null,token:null,status:'SIGNED_OUT'},valid={user:{role_code:'REPORTER'},token:'fixture',status:'AUTHENTICATED'};
  assert.equal(guard(valid,['(auth)','force-change-password']),null);
  assert.equal(guard(guest,['(auth)','force-change-password']),'/(auth)');
  assert.equal(guard(guest,['(auth)','force-change-password'],true),null);
  assert.equal(guard(guest,['(reporter)','report-detail'],true),'/(auth)');
});
