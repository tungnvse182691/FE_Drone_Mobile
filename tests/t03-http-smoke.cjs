// Opt-in local Candidate3 smoke. Generates only local test actors; never logs credentials/capabilities.
const { randomUUID, createHash, randomBytes } = require('node:crypto');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
// Use production Axios/interceptors for authenticated operations; only native Platform is stubbed.
const cache = new Map();
function loadProduction(relative) {
  relative = relative.replace(/\\/g, '/');
  if (cache.has(relative)) return cache.get(relative).exports;
  const module = {exports:{}}; cache.set(relative,module);
  const js=ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',relative),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
  vm.runInNewContext(js,{module,exports:module.exports,process,setTimeout,Uint8Array,ArrayBuffer,require:name=>{
    if(name==='react-native')return {Platform:{select:o=>o.web}};
    if(name==='expo-crypto')return {randomUUID};
    if(name.startsWith('.'))return loadProduction(path.relative(path.join(__dirname,'..'),path.resolve(path.dirname(path.join(__dirname,'..',relative)),name))+'.ts');
    return require(name);
  }});return module.exports;
}
const production=loadProduction('src/api/client.ts');
const reporter=loadProduction('src/api/reporterApi.ts'), auth=loadProduction('src/api/authApi.ts');
let activePair=null;
production.configureAuthBridge({getAccessToken:()=>activePair?.accessToken??null,getRefreshToken:()=>activePair?.refreshToken??null,
  onTokenPair:pair=>{activePair=pair;},onSessionEnded:()=>{activePair=null;}});
const base = 'http://127.0.0.1:18081/api/v1';
production.apiClient.defaults.baseURL=base;production.bareClient.defaults.baseURL=base;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function request(label, path, { method = 'GET', body, token, key, match, expected = 200 } = {}) {
  if (token && token === activePair?.accessToken) {
    let result;
    try {
      result = await production.apiClient.request({ baseURL: base, url: path, method, data: body,
        headers: { ...(key ? { 'Idempotency-Key': key } : {}), ...(match ? { 'If-Match': match } : {}) } });
    } catch (error) {
      if (!error.response) throw new Error('Production client failed without HTTP response');
      result = error.response;
    }
    console.log(label + ': HTTP ' + result.status + ' (production Axios)');
    assert.ok((Array.isArray(expected) ? expected : [expected]).includes(result.status), label + ' unexpected HTTP status');
    return { data: result.data, etag: result.headers.get('etag'), status: result.status };
  }
  const response = await fetch(base + path, { method, signal: AbortSignal.timeout(20000), headers: {
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: 'Bearer ' + token } : {}),
    ...(key ? { 'Idempotency-Key': key } : {}), ...(match ? { 'If-Match': match } : {}),
  }, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json().catch(() => null);
  console.log(label + ': HTTP ' + response.status);
  if (!(Array.isArray(expected) ? expected : [expected]).includes(response.status)) {
    throw new Error(label + ' unexpected status ' + response.status + ', code=' + String(data?.code ?? 'none'));
  }
  return { data, etag: response.headers.get('etag'), status: response.status };
}
async function actor() {
  const email = 't03-' + randomUUID() + '@example.test';
  const password = 'T01!aA9-' + randomBytes(18).toString('hex');
  const registration = await request('registration', '/auth/reporter-registrations', {
    method: 'POST', body: { email, password, displayName: 'T03 Local Smoke', reporterType: 'CITIZEN' }, key: randomUUID(), expected: 202,
  });
  let otp;
  for (let i = 0; i < 20 && !otp; i++) {
    const list = await fetch('http://127.0.0.1:18026/api/v1/messages', { signal: AbortSignal.timeout(10000) }).then(r => r.json());
    const message = list.messages?.find(m => m.To?.some(to => to.Address?.toLowerCase() === email));
    if (message) {
      const detail = await fetch('http://127.0.0.1:18026/api/v1/message/' + encodeURIComponent(message.ID)).then(r => r.json());
      otp = (detail.Text || detail.HTML || '').match(/\b\d{6}\b/)?.[0];
    }
    if (!otp) await wait(500);
  }
  assert.ok(otp, 'own local OTP email must arrive');
  const verified = await request('OTP verify', '/auth/reporter-registrations/verify', {
    method: 'POST', body: { intentId: registration.data.intentId, otp }, key: randomUUID(),
  });
  assert.equal(verified.data.user.role, 'REPORTER');
  assert.ok(verified.data.accessToken);
  activePair = verified.data;
  await request('OTP bearer /me', '/me', { token: verified.data.accessToken });
  const login = await request('Android login', '/auth/android/login', { method: 'POST', body: { email, password } });
  assert.equal(login.data.user.role, 'REPORTER');
  activePair = login.data;
  return login.data.accessToken;
}
// Valid tiny PNG fixture, contains no private media.
const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jS1kAAAAASUVORK5CYII=', 'base64');
async function upload(token) {
  const checksumSha256 = createHash('sha256').update(image).digest('hex');
  const body = { fileName: 't03-local.png', mediaType: 'image/png', sizeBytes: image.length, checksumSha256 };
  const key = randomUUID();
  const created = await request('211 create', '/reporter-evidence/uploads', { method: 'POST', body, token, key, expected: 201 });
  const replay = await request('211 same-key replay', '/reporter-evidence/uploads', { method: 'POST', body, token, key, expected: 201 });
  assert.equal(created.data.id, replay.data.id);
  const path = '/reporter-evidence/uploads/' + created.data.id;
  const numbers = Array.from({ length: Math.ceil(image.length / created.data.partSizeBytes) }, (_, i) => i + 1);
  const urls = await request('214 part URLs', path + '/part-urls', { method: 'POST', body: { partNumbers: numbers }, token, key: randomUUID() });
  const parts = [];
  for (const part of urls.data.parts) {
    const offset = (part.partNumber - 1) * created.data.partSizeBytes;
    const response = await fetch(part.url, { method: 'PUT', headers: { 'Content-Type': 'image/png' },
      body: image.subarray(offset, offset + created.data.partSizeBytes), signal: AbortSignal.timeout(20000) });
    console.log('Storage PUT unchanged capability, no Bearer: HTTP ' + response.status);
    assert.ok(response.ok); assert.ok(response.headers.get('etag'));
    parts.push({ partNumber: part.partNumber, eTag: response.headers.get('etag') });
  }
  const session = await request('212 session', path, { token });
  const complete = { parts, checksumSha256 };
  await request('213 missing preconditions', path + '/complete', { method: 'POST', body: complete, token, expected: 428 });
  const completeKey = randomUUID();
  const match = session.etag || '"' + session.data.version + '"';
  await request('213 complete', path + '/complete', { method: 'POST', body: complete, token, key: completeKey, match, expected: 202 });
  await request('213 same-key replay', path + '/complete', { method: 'POST', body: complete, token, key: completeKey, match, expected: 202 });
  for (let i = 0; i < 90; i++) {
    const file = await request('208 metadata', '/reporter-evidence/files/' + created.data.fileId, { token });
    if (file.data.status === 'VERIFIED') {
      assert.equal(file.data.checksumSha256, checksumSha256); assert.equal(file.data.sizeBytes, image.length);
      assert.ok(file.data.version); console.log('File identity/checksum/size/version VERIFIED');
      return { fileId: file.data.id, fileVersion: file.data.version, locationSource: 'UNKNOWN' };
    }
    assert.notEqual(file.data.status, 'FAILED'); await wait(1000);
  }
  throw new Error('File verification timed out');
}
async function denied(label,action,statuses){
  try{await action();throw Error(label+' unexpectedly allowed');}
  catch(e){assert.ok(e.response,label+' expected HTTP denial');assert.ok(statuses.includes(e.response.status),label);console.log(label+': HTTP '+e.response.status);}
}
async function main(){
  assert.equal((await fetch('http://127.0.0.1:18081/ready')).status,200);console.log('/ready: HTTP 200');
  await request('anonymous API215','/reports',{expected:401});
  await request('anonymous profile','/profile',{expected:401});
  const token=await actor();const ownerPair=activePair;
  const profile=await auth.fetchProfile();assert.equal(profile.userId,ownerPair.user.id);assert.equal(profile.roleCode,'REPORTER');console.log('GET /profile: HTTP 200, authoritative owner/role');
  const evidence=await upload(token);
  const created=[];
  for(let i=0;i<3;i++){
    const r=await reporter.submitReportReal({description:'T03 private pagination fixture '+i,evidence:[evidence]},randomUUID());created.push(r.report.id);
  }
  let cursor=null;const ids=[];
  do{
    const page=await reporter.listMyReportsReal({pageSize:1,cursor});assert.equal(page.items.length,1);ids.push(page.items[0].id);cursor=page.nextCursor;
    assert.ok(ids.length<=3,'cursor terminates');
  }while(cursor);
  assert.equal(new Set(ids).size,3);assert.deepEqual([...ids].sort(),[...created].sort());console.log('API215: HTTP 200 x3; cursor pagination exact IDs, no duplicates');
  const detail=await reporter.getOwnReportReal(created[0]);assert.equal(detail.report.id,created[0]);assert.ok(detail.etag);assert.equal(detail.report.evidence[0].fileId,evidence.fileId);
  const evidenceId=detail.report.evidence[0].id;
  const uri=await reporter.downloadReportEvidenceReal(created[0],evidenceId);const downloaded=Buffer.from(uri.split(',')[1],'base64');assert.deepEqual(downloaded,image);console.log('API217/218: HTTP 200, ETag, exact private image bytes');
  await request('anonymous API217','/reports/'+created[0],{expected:401});
  await request('anonymous API218','/reports/'+created[0]+'/evidence/'+evidenceId+'/download',{expected:401});
  await actor();
  const empty=await reporter.listMyReportsReal();assert.equal(empty.items.length,0);console.log('API215 other owner: HTTP 200 empty');
  await denied('API217 wrong owner',()=>reporter.getOwnReportReal(created[0]),[403,404]);
  await denied('API218 wrong owner',()=>reporter.downloadReportEvidenceReal(created[0],evidenceId),[403,404]);
  // Cursors are bound to the owner by Candidate3.
  activePair=ownerPair;const first=await reporter.listMyReportsReal({pageSize:1});assert.ok(first.nextCursor);
  const ownerFresh=await production.bareClient.post('/auth/android/refresh',{refreshToken:ownerPair.refreshToken});activePair=ownerFresh.data;
  const reread=await reporter.getOwnReportReal(created[0]);assert.deepEqual(reread.report,detail.report);
  const rereadList=await reporter.listMyReportsReal({pageSize:1});assert.equal(rereadList.items[0].id,first.items[0].id);
  assert.deepEqual(Buffer.from((await reporter.downloadReportEvidenceReal(created[0],evidenceId)).split(',')[1],'base64'),image);
  console.log('After real token refresh: profile/list/detail/private download HTTP 200');
  assert.equal((await auth.fetchProfile()).userId,profile.userId);
  console.log('HTTP VERIFIED: profile/API215/API217/API218; anonymous, wrong-owner, pagination and real refresh. ANDROID E2E: NOT RUN.');
}
main().catch(()=>{console.error('T03 HTTP smoke FAIL (raw errors suppressed to protect credentials).');process.exitCode=1;});
