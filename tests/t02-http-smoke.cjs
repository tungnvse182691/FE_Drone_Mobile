// Opt-in Candidate3 HTTP evidence. Only a newly registered disposable Reporter is mutated.
// Credentials/OTP/tokens stay in memory. Never print raw errors/config/body.
const assert=require('node:assert/strict');
const {randomUUID,randomBytes}=require('node:crypto');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const cache=new Map();
function load(relative){
  relative=relative.replace(/\\/g,'/');
  if(cache.has(relative))return cache.get(relative).exports;
  const module={exports:{}};cache.set(relative,module);
  const js=ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',relative),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
  vm.runInNewContext(js,{module,exports:module.exports,setTimeout,process,crypto:{randomUUID},require:name=>{
    if(name==='react-native')return {Platform:{select:o=>o.web}};
    if(name==='expo-crypto')return {randomUUID};
    if(name.startsWith('.'))return load(path.relative(path.join(__dirname,'..'),path.resolve(path.dirname(path.join(__dirname,'..',relative)),name))+'.ts');
    return require(name);
  }});return module.exports;
}
const client=load('src/api/client.ts'),api=load('src/api/authApi.ts');
const base='http://127.0.0.1:18081/api/v1';
client.apiClient.defaults.baseURL=base;client.bareClient.defaults.baseURL=base;
let pair=null;
client.configureAuthBridge({getAccessToken:()=>pair?.accessToken??null,getRefreshToken:()=>pair?.refreshToken??null,onTokenPair:p=>{pair=p;},onSessionEnded:()=>{pair=null;}});
async function expect(label,status,action){
  let result;
  try{result=await action();assert.ok(status>=200&&status<300,label+' expected failure');}
  catch(e){if(!e.response){console.log(label+': no HTTP response; client code='+String(e.code??'assertion'));throw new Error(label+' failed without expected HTTP response');}console.log(label+': HTTP '+e.response.status);assert.equal(e.response.status,status,label);return e.response;}
  if(result?.status!==undefined)assert.equal(result.status,status,label);
  console.log(label+': HTTP '+status);return result;
}
async function main(){
  const ready=await fetch('http://127.0.0.1:18081/ready');assert.equal(ready.status,200);console.log('/ready: HTTP 200');
  const email='t02-'+randomUUID()+'@example.test',old='T02!aA9-'+randomBytes(18).toString('hex'),next='T02!bB8-'+randomBytes(18).toString('hex');
  const reg=await expect('register own Reporter',202,()=>client.bareClient.post('/auth/reporter-registrations',{email,password:old,displayName:'T02 Local Smoke',reporterType:'CITIZEN'},{headers:{'Idempotency-Key':randomUUID()}}));
  let otp;
  for(let i=0;i<20&&!otp;i++){
    const list=await fetch('http://127.0.0.1:18026/api/v1/messages').then(r=>r.json());
    const message=list.messages?.find(m=>m.To?.some(to=>to.Address?.toLowerCase()===email));
    if(message){const detail=await fetch('http://127.0.0.1:18026/api/v1/message/'+encodeURIComponent(message.ID)).then(r=>r.json());otp=(detail.Text||detail.HTML||'').match(/\b\d{6}\b/)?.[0];}
    if(!otp)await new Promise(r=>setTimeout(r,500));
  }
  assert.ok(otp,'own OTP fixture required');
  await expect('verify own OTP',200,()=>client.bareClient.post('/auth/reporter-registrations/verify',{intentId:reg.data.intentId,otp},{headers:{'Idempotency-Key':randomUUID()}}));
  pair=await api.loginReal(email,old);assert.equal(pair.mustChangePassword,false);console.log('own login: HTTP 200, mustChangePassword=false');
  await expect('API008 accepted',202,()=>api.requestPasswordRecoveryReal(email));
  await expect('API008 invalid email',400,()=>api.requestPasswordRecoveryReal('invalid'));
  await expect('API005 invalid DTO',400,()=>client.bareClient.post('/auth/forced-password-change',{}));
  await expect('API005 wrong credentials',401,()=>api.forcedChangePasswordReal({username:email,currentPassword:randomUUID(),newPassword:next,confirmPassword:next,operationId:randomUUID()}));
  await expect('API005 not required for own Reporter',409,()=>api.forcedChangePasswordReal({username:email,currentPassword:old,newPassword:next,confirmPassword:next,operationId:randomUUID()}));
  await expect('API004 wrong current password',401,()=>api.changePasswordReal(pair.accessToken,randomUUID(),next,randomUUID()));
  await expect('API004 policy validation',400,()=>api.changePasswordReal(pair.accessToken,old,'x',randomUUID()));
  const key=randomUUID(),oldToken=pair.accessToken;
  await expect('API004 change own password',204,()=>api.changePasswordReal(oldToken,old,next,key));
  // Candidate3 explicitly admits a committed same-key replay on a revoked session.
  await expect('API004 committed replay with old bearer',204,()=>api.changePasswordReal(oldToken,old,next,key));
  await expect('API004 revoked session new command',401,()=>api.changePasswordReal(oldToken,old,next,randomUUID()));
  await expect('old password login',401,()=>api.loginReal(email,old));
  pair=await api.loginReal(email,next);assert.equal(pair.mustChangePassword,false);console.log('new password login: HTTP 200');
  const replay=await expect('API004 same command authenticated replay',204,()=>api.changePasswordReal(pair.accessToken,old,next,key));
  assert.equal(replay,undefined);
  await expect('API004 reused key changed payload',409,()=>api.changePasswordReal(pair.accessToken,next,'T02!cC7-'+randomBytes(18).toString('hex'),key));
  console.log('API005 forced-success and mustChangePassword=true login: NOT RUN (no private forced fixture).');
  console.log('ANDROID E2E: NOT RUN. HTTP smoke PASS; only own Reporter credentials changed.');
}
main().catch(()=>{console.error('T02 HTTP smoke FAIL (details suppressed to protect credentials).');process.exitCode=1;});
