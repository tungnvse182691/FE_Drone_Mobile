const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function harness(disk={value:null}, options={}) {
  const module={exports:{}};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/store/secureSession.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports});
  const calls=[];let next=0;
  const manager=module.exports.createSecureSession({
    read:async()=>disk.value,write:async value=>{if(options.write)await options.write(value);disk.value=value;},
    identity:token=>JSON.stringify(token.split(':').slice(0,2)),key:()=>`key-${++next}`,
    refresh:async(token,key)=>{calls.push({token,key,before:JSON.parse(disk.value)});return options.refresh?options.refresh(token,key):{accessToken:'A:session:2',refreshToken:'rotated',user:{id:'A'}};},
  });return {manager,disk,calls,diagnostic:module.exports.sessionRestoreDiagnostic};
}
const pair={accessToken:'A:session:1',refreshToken:'original',user:{id:'A'}};

test('restore diagnostics expose only allowlisted category and HTTP status',()=>{
 const {diagnostic}=harness();
 assert.equal(diagnostic({message:'secret-token',code:'ERR_NETWORK',config:{password:'private'}}),'network');
 assert.equal(diagnostic({response:{status:409,data:{refreshToken:'private'}}}),'http-409');
 assert.equal(diagnostic(Error('auth_credential_mismatch')),'credential-continuity');
 assert.equal(diagnostic(Error('arbitrary private detail')),'local-or-response');
 assert.equal(diagnostic(null),'local-or-response');
});
test('local read identity uses secure actor/environment continuity without rotating credentials',async()=>{
 const h=harness();await h.manager.save(pair,'env');const before=h.disk.value;
 assert.equal(await h.manager.localIdentity('env','A'),JSON.stringify(['A','session']));
 assert.equal(await h.manager.localIdentity('other','A'),null);
 assert.equal(await h.manager.localIdentity('env','B'),null);
 assert.equal(h.calls.length,0);assert.equal(h.disk.value,before);
 await h.manager.clear();assert.equal(await h.manager.localIdentity('env','A'),null);
});
test('cold refresh persists key before HTTP and rotates credential before returning',async()=>{
 const h=harness();await h.manager.save(pair,'env');
 const next=await h.manager.restore('env','A');
 assert.equal(next.accessToken,'A:session:2');assert.equal(h.calls[0].before.pendingKey,h.calls[0].key);
 assert.equal(JSON.parse(h.disk.value).refreshToken,'rotated');assert.equal(JSON.parse(h.disk.value).pendingKey,null);
 assert.ok(!h.disk.value.includes('accessToken'));
});
test('unknown refresh survives restart with exact body and key',async()=>{
 const disk={value:null};const a=harness(disk,{refresh:async()=>{throw Error('timeout');}});
 await a.manager.save(pair,'env');await assert.rejects(a.manager.restore('env','A'));
 const b=harness(disk);await b.manager.restore('env','A');
 assert.equal(a.calls[0].key,b.calls[0].key);assert.equal(a.calls[0].token,b.calls[0].token);
});
test('environment, actor, legacy secret and changed sid fail closed',async()=>{
 const h=harness();await h.manager.save(pair,'env');
 assert.equal(await h.manager.restore('other','A'),null);assert.equal(await h.manager.restore('env','B'),null);assert.equal(h.calls.length,0);
 h.disk.value='legacy-raw-secret';assert.equal(await h.manager.restore('env','A'),null);
 const b=harness({value:null},{refresh:async()=>({...pair,accessToken:'A:other:2'})});await b.manager.save(pair,'env');
 await assert.rejects(b.manager.restore('env','A'));assert.equal(JSON.parse(b.disk.value).refreshToken,'original');
});
test('logout during refresh cannot restore old session or overwrite new login',async()=>{
 let resolve;const h=harness({value:null},{refresh:()=>new Promise(r=>resolve=r)});
 await h.manager.save(pair,'env');const pending=h.manager.restore('env','A');
 while(!resolve)await new Promise(r=>setImmediate(r));
 await h.manager.clear();await h.manager.save({...pair,accessToken:'B:session:1',user:{id:'B'},refreshToken:'B-secret'},'env');
 resolve({...pair,accessToken:'A:session:2'});assert.equal(await pending,null);
 assert.equal(JSON.parse(h.disk.value).actor,'B');
});
test('secure write failure prevents refresh POST',async()=>{
 let fail=false;const h=harness({value:null},{write:async()=>{if(fail)throw Error('disk');}});
 await h.manager.save(pair,'env');fail=true;
 await assert.rejects(h.manager.restore('env','A'));assert.equal(h.calls.length,0);
});

