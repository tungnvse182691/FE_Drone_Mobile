const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const jwt=(id,sid='session')=>'fixture.'+Buffer.from(JSON.stringify({sub:id,sid})).toString('base64url')+'.fixture';
const pair=(id='A')=>({accessToken:jwt(id),refreshToken:'fixture-'+id,tokenType:'Bearer',expiresIn:900,mustChangePassword:false,user:{id,displayName:'Fixture',role:'REPORTER',version:'fixture'}});
function harness(disk={value:null},refresh=async()=>pair()) {
 const cache=new Map(),calls=[];let bridge;
 function load(file) {
  if(cache.has(file))return cache.get(file).exports;
  const mod={exports:{}};cache.set(file,mod);
  const req=name=>{
   if(name==='zustand')return require('zustand');
   if(name==='zustand/middleware')return {persist:init=>init};
   if(name==='expo-secure-store')return {isAvailableAsync:async()=>true,getItemAsync:async()=>disk.value,setItemAsync:async(_,v)=>{disk.value=v;},deleteItemAsync:async()=>{disk.value=null;}};
   if(name==='./storage')return {appStorage:{}};
   if(name.endsWith('/client'))return {API_BASE_URL:'fixture-env',configureAuthBridge:b=>{bridge=b;},bareClient:{post:async(url,body,config)=>{calls.push({url,body,config});return {data:await refresh()};}}};
   if(name==='expo-crypto')return {randomUUID:require('node:crypto').randomUUID};
   if(name==='../api/authApi')return {logoutReal:async()=>{},passwordSessionIdentity:t=>{try {const c=JSON.parse(Buffer.from(t.split('.')[1],'base64url'));return JSON.stringify([c.sub,c.sid]);}catch{return null;}}};
   const target=path.resolve(path.dirname(file),name)+'.ts';return load(target);
  };
  const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(js,{module:mod,exports:mod.exports,require:req});return mod.exports;
 }
 const store=load(path.resolve('src/store/auth.ts')).useAuthStore;
 const login=(id='A')=>store.getState().login({id,full_name:'Fixture',role_code:'REPORTER',token:'',phone_or_email:'fixture@example.test'},pair(id));
 return {store,login,disk,calls,get bridge(){return bridge;}};
}
test('actual auth store restores same session from SecureStore without SQLite token',async()=>{
 const disk={value:null},first=harness(disk);first.login();await new Promise(r=>setImmediate(r));
 const cold=harness(disk);cold.store.setState({user:first.store.getState().user,role:'REPORTER'});
 await cold.store.getState().restoreRefreshToken();
 assert.equal(cold.store.getState().token,jwt('A'));assert.equal(cold.store.getState().authReady,true);
 assert.equal(cold.calls.length,1);assert.ok(cold.calls[0].config.headers['Idempotency-Key']);
});
test('cold timeout holds recovery UI and exact key for explicit retry',async()=>{
 let fail=true;const h=harness({value:null},async()=>{if(fail)throw Error('timeout');return pair();});h.login();await new Promise(r=>setImmediate(r));
 h.store.setState({token:null,status:'VERIFIED_NEEDS_LOGIN'});await h.store.getState().restoreRefreshToken();
 assert.equal(h.store.getState().authReady,false);assert.equal(h.store.getState().authRestoreError,true);
 fail=false;await h.store.getState().restoreRefreshToken();assert.equal(h.store.getState().authReady,true);
 assert.equal(h.calls[0].config.headers['Idempotency-Key'],h.calls[1].config.headers['Idempotency-Key']);
});
test('logout during actual cold bootstrap ignores late response',async()=>{
 let resolve;const h=harness({value:null},()=>new Promise(r=>resolve=r));h.login();await new Promise(r=>setImmediate(r));h.store.setState({token:null});
 const pending=h.store.getState().restoreRefreshToken();while(!resolve)await new Promise(r=>setImmediate(r));
 h.store.getState().logout();h.login('B');resolve(pair());await pending;await new Promise(r=>setImmediate(r));
 assert.equal(h.store.getState().user.id,'B');assert.equal(JSON.parse(h.disk.value).actor,'B');
});
