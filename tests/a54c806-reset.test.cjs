const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(respond=async()=>({status:202,data:''})) {
 const calls=[],module={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/reporterPasswordReset.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports,require:n=>{
  if(n==='./client')return {bareClient:{post:async(...a)=>{calls.push(a);return respond(...a);}}};
  if(n==='./authApi')return {extractProblemCode:e=>e.response?.data?.code};
  throw Error(n);
 }});return {...module.exports,calls};
}
test('202 empty acknowledgment, anonymous headers, normalized email',async()=>{
 const h=load();await h.requestReporterReset(' Reporter@Example.test ');
 assert.equal(h.calls[0][0],'/auth/reporter/password-reset/request');
 assert.equal(h.calls[0][1].email,'reporter@example.test');
 assert.equal(h.calls[0][2].withCredentials,false);
 for(const key of ['Authorization','Cookie','X-CSRF-TOKEN','Idempotency-Key'])assert.equal(h.calls[0][2].headers[key],null);
 assert.equal(h.REPORTER_RESET_ACK,'Nếu tài khoản đủ điều kiện, mã sẽ được gửi về email đã đăng ký.');
});
test('confirm preserves leading zero; requires 204, never retries',async()=>{
 const h=load(async()=>({status:204}));await h.confirmReporterReset('a@example.test','012345','new-password');
 assert.equal(h.calls[0][1].otp,'012345');assert.equal(h.calls.length,1);
 await assert.rejects(h.confirmReporterReset('a@example.test','12345','password'));
 const unknown=load(async()=>{throw Error('network');});
 await assert.rejects(unknown.confirmReporterReset('a@example.test','012345','password'));assert.equal(unknown.calls.length,1);
});
for(const [status,code,part] of [[400,'invalid_reset_otp','hết hạn'],[400,'validation_error','Kiểm tra'],[422,'password_policy_failed','chính sách']])test(code,()=>{
 const h=load();assert.match(h.reporterResetError({response:{status,data:{code}}}),new RegExp(part));
});
test('cleanup is limited to same Reporter and matching email, preserves other identities',()=>{
 const h=load();let count=0;const owner={id:'A',role_code:'REPORTER',phone_or_email:'a@example.test'};
 const s={user:owner,token:'old',logout:()=>count++};
 assert.equal(h.clearResetReporterSession(s,s,'a@example.test'),true);assert.equal(count,1);
 for(const other of [{...s,user:{...owner,id:'B'}},{...s,user:{...owner,role_code:'REPAIR_CREW'}},{...s,token:'new'}])assert.equal(h.clearResetReporterSession(other,s,'a@example.test'),false);
 assert.equal(h.clearResetReporterSession(s,s,'b@example.test'),false);assert.equal(count,1);
});
test('real Axios fetch adapter omits inherited credentials and cookies',async()=>{
 const axios=require('axios');let sent;
 const bareClient=axios.create({baseURL:'https://fixture.test/api/v1',headers:{Authorization:'fixture-secret',Cookie:'fixture-cookie','X-CSRF-TOKEN':'fixture-csrf','Idempotency-Key':'fixture-key'},env:{fetch:async request=>{sent=request;return new Response(null,{status:202});},Request,Response}});
 const mod={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/reporterPasswordReset.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:mod,exports:mod.exports,require:n=>n==='./client'?{bareClient}:{extractProblemCode:()=>null}});
 await mod.exports.requestReporterReset('reporter@example.test');assert.equal(sent.credentials,'omit');
 for(const name of ['Authorization','Cookie','X-CSRF-TOKEN','Idempotency-Key'])assert.equal(sent.headers.has(name),false);
});
