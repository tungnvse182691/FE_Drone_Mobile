const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const axios = require('axios');

// Unsigned synthetic JWTs only exercise continuity checks; the real server authenticates tokens.
const token = (sub, sid, generation = 1) => ['fixture', Buffer.from(JSON.stringify({ sub, sid, generation })).toString('base64url'), 'fixture'].join('.');
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return {promise,resolve,reject}; };
function harness() {
  const timers=[]; const calls=[]; const events=[]; let credentials;
  function login(sub='A', sid='session-A', generation=1) { credentials={access:token(sub,sid,generation),refresh:`fixture-${sid}-${generation}`}; }
  login();
  const modules=new Map();
  function load(relative) {
    if(modules.has(relative)) return modules.get(relative).exports;
    const module={exports:{}}; modules.set(relative,module);
    const js=ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',relative),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
    const context={module,exports:module.exports,process:{env:{}},setTimeout:callback=>{timers.push(callback);return timers.length;},require:name=>{
      if(name==='axios') return axios;
      if(name==='react-native') return {Platform:{select:options=>options.web}};
      if(name==='./problemDetails') return load('src/api/problemDetails.ts');
      throw new Error('Unexpected dependency '+name);
    }};
    vm.runInNewContext(js,context,{filename:relative}); return module.exports;
  }
  const client=load('src/api/client.ts');
  client.configureAuthBridge({getAccessToken:()=>credentials.access,getRefreshToken:()=>credentials.refresh,
    onRefreshStart:()=>events.push('refresh'),onTokenPair:pair=>{events.push('pair');credentials={access:pair.accessToken,refresh:pair.refreshToken};},
    onSessionEnded:()=>events.push('logout'),onPasswordChangeRequired:()=>events.push('password')});
  const ok=config=>({data:{ok:true},status:200,statusText:'OK',headers:{},config});
  const fail=(config,status,code)=>new axios.AxiosError('fixture failure',status?'ERR_BAD_RESPONSE':'ETIMEDOUT',config,{},status?{status,data:{code},headers:{'retry-after':'0'},config}:undefined);
  const record=config=>calls.push({url:config.url,method:config.method,body:config.data,auth:config.headers.get('Authorization'),key:config.headers.get('Idempotency-Key'),match:config.headers.get('If-Match')});
  async function until(predicate) {for(let i=0;i<60&&!predicate();i++)await new Promise(resolve=>setImmediate(resolve));assert.ok(predicate(),'expected async boundary reached');}
  return {...client,calls,events,timers,login,logout(){credentials={access:null,refresh:null};},get credentials(){return credentials;},ok,fail,record,until};
}

for(const failure of [503,undefined]) test(`POST ${failure??'timeout'} cannot retry A as B during backoff`,async()=>{
  const h=harness();h.apiClient.defaults.adapter=async c=>{h.record(c);if(h.calls.length===1)throw h.fail(c,failure);return h.ok(c);};
  const result=h.apiClient.post('/reports',{description:'fixture'},{headers:{'Idempotency-Key':'fixture-key'}}).catch(e=>e);
  await h.until(()=>h.timers.length===1);h.logout();h.login('B','session-B');h.timers.shift()();
  assert.ok(await result instanceof axios.AxiosError);assert.equal(h.calls.length,1);assert.deepEqual(h.events,[]);
});

for(const outcome of ['success','failure']) test(`old refresh ${outcome} cannot overwrite or logout new B`,async()=>{
  const h=harness(),gate=deferred();h.apiClient.defaults.adapter=async c=>{h.record(c);throw h.fail(c,401,'token_expired');};
  h.bareClient.defaults.adapter=c=>gate.promise.then(()=>outcome==='success'?{...h.ok(c),data:{accessToken:token('A','session-A',2),refreshToken:'fixture-rotated',user:{id:'A'}}}:Promise.reject(h.fail(c,401,'refresh_token_invalid')));
  const result=h.apiClient.get('/me').catch(e=>e);await h.until(()=>h.events.includes('refresh'));
  h.logout();h.login('B','session-B');gate.resolve();await result;
  assert.equal(h.credentials.access,token('B','session-B'));assert.deepEqual(h.events,['refresh']);assert.equal(h.calls.length,1);
});

test('same session refresh is single flight and preserves keyed POST body/preconditions',async()=>{
  const h=harness();let refreshes=0;
  h.apiClient.defaults.adapter=async c=>{h.record(c);if(c.headers.get('Authorization')===`Bearer ${token('A','session-A')}`)throw h.fail(c,401,'token_expired');return h.ok(c);};
  h.bareClient.defaults.adapter=async c=>{refreshes++;return {...h.ok(c),data:{accessToken:token('A','session-A',2),refreshToken:'fixture-rotated',user:{id:'A'}}};};
  const body={description:'fixture',evidence:[{fileId:'fixture-file',fileVersion:'fixture-version'}]};
  await Promise.all([h.apiClient.post('/reports',body,{headers:{'Idempotency-Key':'fixture-key','If-Match':'"fixture-version"'}}),h.apiClient.get('/me')]);
  assert.equal(refreshes,1);assert.equal(h.calls.length,4);assert.deepEqual(h.events,['refresh','pair']);
  const writes=h.calls.filter(c=>c.method==='post');assert.equal(writes[0].body,writes[1].body);assert.equal(writes[0].key,writes[1].key);assert.equal(writes[1].match,'"fixture-version"');assert.equal(writes[1].auth,`Bearer ${token('A','session-A',2)}`);
});

for(const [status,code] of [[401,'auth_session_revoked'],[401,'token_expired'],[403,'auth_password_change_required']]) test(`old ${status}/${code} has no new-session effects`,async()=>{
  const h=harness(),gate=deferred();h.apiClient.defaults.adapter=async c=>{h.record(c);await gate.promise;throw h.fail(c,status,code);};
  const result=h.apiClient.get('/me').catch(e=>e);await h.until(()=>h.calls.length===1);h.login('B','session-B');gate.resolve();await result;
  assert.deepEqual(h.events,[]);assert.equal(h.calls.length,1);
});

test('new login by same actor is a different session and cannot inherit retry',async()=>{
  const h=harness();h.apiClient.defaults.adapter=async c=>{h.record(c);if(h.calls.length===1)throw h.fail(c,503);return h.ok(c);};
  const result=h.apiClient.get('/me').catch(e=>e);await h.until(()=>h.timers.length===1);h.login('A','new-session-A');h.timers.shift()();await result;assert.equal(h.calls.length,1);
});

for(const url of ['/reports','/uncontracted-command']) test(`POST without proven idempotency is not automatically replayed: ${url}`,async()=>{
  const h=harness();h.apiClient.defaults.adapter=async c=>{h.record(c);throw h.fail(c,503);};
  const result=h.apiClient.post(url,{fixture:true},url==='/reports'?{}:{headers:{'Idempotency-Key':'fixture-key'}}).catch(e=>e);
  await h.until(()=>h.calls.length===1);await new Promise(resolve=>setImmediate(resolve));
  // Drain a buggy backoff too, so RED fails rather than hanging.
  while(h.timers.length){h.timers.shift()();await new Promise(resolve=>setImmediate(resolve));}
  await result;assert.equal(h.calls.length,1);assert.deepEqual(h.events,[]);
});

for(const [role,url] of [['REPORTER','/reports'],['REPAIR_CREW','/field-tasks'],['DRONE_OPERATOR','/survey-tasks']]) test(`${role} GET retry retains its session`,async()=>{
  const h=harness();h.login(role,`session-${role}`);h.apiClient.defaults.adapter=async c=>{h.record(c);if(h.calls.length===1)throw h.fail(c,503);return h.ok(c);};
  const result=h.apiClient.get(url);await h.until(()=>h.timers.length===1);h.timers.shift()();await result;
  assert.equal(h.calls.length,2);assert.deepEqual(h.calls[0],h.calls[1]);assert.deepEqual(h.events,[]);
});

test('logout keeps explicitly captured A bearer instead of injecting live B',async()=>{
  const h=harness();h.apiClient.defaults.adapter=async c=>{h.record(c);return h.ok(c);};const captured=h.credentials.access;h.logout();const request=h.apiClient.post('/auth/logout',null,{headers:{Authorization:`Bearer ${captured}`,'Idempotency-Key':'fixture-key'}});h.login('B','session-B');
  await request;assert.equal(h.calls[0].auth,`Bearer ${captured}`);assert.deepEqual(h.events,[]);
});

test('request binds A synchronously before immediate login B and drops late success',async()=>{
  const h=harness(),gate=deferred();h.apiClient.defaults.adapter=async c=>{h.record(c);await gate.promise;return h.ok(c);};
  const result=h.apiClient.get('/me').catch(e=>e);h.login('B','session-B');gate.resolve();
  assert.equal((await result).code,'auth_session_changed');assert.equal(h.calls[0].auth,`Bearer ${token('A','session-A')}`);
});

for(const role of ['REPAIR_CREW','DRONE_OPERATOR']) test(`${role} unsafe command refreshes session but does not replay`,async()=>{
  const h=harness();h.login(role,`session-${role}`);h.apiClient.defaults.adapter=async c=>{h.record(c);throw h.fail(c,401,'token_expired');};
  h.bareClient.defaults.adapter=async c=>({...h.ok(c),data:{accessToken:token(role,`session-${role}`,2),refreshToken:'fixture-rotated',user:{id:role}}});
  const result=await h.apiClient.post('/uncontracted-command',{fixture:true}).catch(e=>e);
  assert.ok(result instanceof axios.AxiosError);assert.equal(h.calls.length,1);assert.deepEqual(h.events,['refresh','pair']);
  assert.equal(h.credentials.access,token(role,`session-${role}`,2));
});

test('keyed POST transport replay preserves body, key and If-Match',async()=>{
  const h=harness();h.apiClient.defaults.adapter=async c=>{h.record(c);if(h.calls.length===1)throw h.fail(c,503);return h.ok(c);};
  const result=h.apiClient.post('/reports/fixture/supplements',{fixture:['unchanged']},{headers:{'Idempotency-Key':'fixture-key','If-Match':'"v1"'}});
  await h.until(()=>h.timers.length===1);h.timers.shift()();await result;assert.deepEqual(h.calls[0],h.calls[1]);
});

test('old refresh cannot share or clear new session refresh flight',async()=>{
  const h=harness(),old=deferred(),next=deferred();let count=0;
  h.bareClient.defaults.adapter=async c=>{count++;const isA=JSON.parse(c.data).refreshToken.includes('session-A');await(isA?old.promise:next.promise);return {...h.ok(c),data:{accessToken:token(isA?'A':'B',isA?'session-A':'session-B',2),refreshToken:'fixture-rotated',user:{id:isA?'A':'B'}}};};
  const a=h.refreshAccessToken();h.login('B','session-B');const b=h.refreshAccessToken();
  await h.until(()=>count===2);old.resolve();assert.equal(await a,null);
  const b2=h.refreshAccessToken();await new Promise(resolve=>setImmediate(resolve));assert.equal(count,2);
  next.resolve();assert.equal(await b,token('B','session-B',2));assert.equal(await b2,token('B','session-B',2));assert.deepEqual(h.events,['refresh','refresh','pair']);
});

test('late 401 from old A token uses already rotated same-session token without refreshing again',async()=>{
  const h=harness(),gate=deferred();h.apiClient.defaults.adapter=async c=>{h.record(c);if(h.calls.length===1){await gate.promise;throw h.fail(c,401,'token_expired');}return h.ok(c);};
  const result=h.apiClient.get('/me');await h.until(()=>h.calls.length===1);h.login('A','session-A',2);gate.resolve();await result;
  assert.equal(h.calls.length,2);assert.equal(h.calls[1].auth,`Bearer ${token('A','session-A',2)}`);assert.deepEqual(h.events,[]);
});

test('guest request does not gain bearer after login in backoff',async()=>{
  const h=harness();h.logout();h.apiClient.defaults.adapter=async c=>{h.record(c);throw h.fail(c,503);};
  const result=h.apiClient.get('/public-fixture').catch(e=>e);await h.until(()=>h.timers.length===1);h.login();h.timers.shift()();assert.equal((await result).code,'auth_session_changed');assert.equal(h.calls.length,1);
});

test('malformed JWT cannot issue authenticated request or trigger logout',async()=>{
  const h=harness();h.credentials.access='invalid-fixture';h.apiClient.defaults.adapter=async c=>{h.record(c);return h.ok(c);};
  const result=await h.apiClient.get('/me').catch(e=>e);assert.equal(result.code,'auth_session_changed');assert.equal(h.calls.length,0);assert.deepEqual(h.events,[]);
});

test('cancelled command is never automatically replayed',async()=>{
  const h=harness();h.apiClient.defaults.adapter=async c=>{h.record(c);throw new axios.CanceledError('fixture cancel',c);};
  await h.apiClient.post('/reports',{fixture:true},{headers:{'Idempotency-Key':'fixture-key'}}).catch(()=>{});assert.equal(h.calls.length,1);assert.equal(h.timers.length,0);
});

test('bare Auth login stays independent of authenticated interceptor and retries',async()=>{
  const h=harness();h.bareClient.defaults.adapter=async c=>{h.record(c);throw h.fail(c,503);};
  await h.bareClient.post('/auth/android/login',{fixture:true}).catch(()=>{});assert.equal(h.calls.length,1);assert.equal(h.calls[0].auth,undefined);assert.equal(h.timers.length,0);assert.deepEqual(h.events,[]);
});
