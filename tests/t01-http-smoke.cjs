// Opt-in local Candidate3 smoke. Generates only local test actors; never logs credentials/capabilities.
const { randomUUID, createHash, randomBytes } = require('node:crypto');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
// Use production Axios/interceptors for authenticated operations; only native Platform is stubbed.
function loadProduction(relative) {
  const module = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  vm.runInNewContext(js, { module, exports: module.exports, process, setTimeout, require: name => {
    if (name === 'react-native') return { Platform: { select: options => options.web } };
    if (name === './problemDetails') return loadProduction('src/api/problemDetails.ts');
    return require(name);
  } }, { filename: relative });
  return module.exports;
}
const production = loadProduction('src/api/client.ts');
let activePair = null;
production.configureAuthBridge({ getAccessToken: () => activePair?.accessToken ?? null,
  getRefreshToken: () => activePair?.refreshToken ?? null, onTokenPair: pair => { activePair = pair; },
  onSessionEnded: () => { activePair = null; } });
const base = 'http://127.0.0.1:18081/api/v1';
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
  const email = 't01-' + randomUUID() + '@example.test';
  const password = 'T01!aA9-' + randomBytes(18).toString('hex');
  const registration = await request('registration', '/auth/reporter-registrations', {
    method: 'POST', body: { email, password, displayName: 'T01 Local Smoke', reporterType: 'CITIZEN' }, key: randomUUID(), expected: 202,
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
  const body = { fileName: 't01-local.png', mediaType: 'image/png', sizeBytes: image.length, checksumSha256 };
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
async function main() {
  const ready = await fetch('http://127.0.0.1:18081/ready'); assert.equal(ready.status, 200); console.log('/ready: HTTP 200');
  await request('anonymous report denied', '/reports', { expected: 401 });
  await request('bad bearer denied', '/reports', { token: 'invalid', expected: 401 });
  const token = await actor();
  const evidence = await upload(token);
  const body = { description: 'T01 local HTTP verification of concrete slab evidence', evidence: [evidence] };
  const key = randomUUID();
  const created = await request('216 create report', '/reports', { method: 'POST', body, token, key, expected: 201 });
  const replay = await request('216 same-key replay', '/reports', { method: 'POST', body, token, key, expected: 201 });
  assert.equal(created.data.id, replay.data.id);
  const path = '/reports/' + created.data.id;
  const found = await request('217 readback', path, { token });
  assert.ok(found.data.evidence.some(p => p.fileId === evidence.fileId && p.fileVersion === evidence.fileVersion));
  const extra = await upload(token);
  const supplement = { description: 'T01 local supplement', evidence: [extra] };
  await request('219 malformed If-Match', path + '/supplements', { method: 'POST', body: supplement, token, key: randomUUID(), match: 'malformed', expected: 400 });
  const supplementKey = randomUUID();
  await request('219 supplement', path + '/supplements', { method: 'POST', body: supplement, token, key: supplementKey, match: found.etag });
  await request('219 same-key replay', path + '/supplements', { method: 'POST', body: supplement, token, key: supplementKey, match: found.etag });
  await request('219 stale version', path + '/supplements', { method: 'POST', body: supplement, token, key: randomUUID(), match: found.etag, expected: [409, 412] });
  const final = await request('217 supplement readback', path, { token });
  assert.ok(final.data.evidence.some(p => p.fileId === extra.fileId && p.fileVersion === extra.fileVersion));
  assert.equal(final.data.supplements.filter(p => p.description === supplement.description).length, 1);
  console.log('HTTP VERIFIED: real upload/create/supplement/readback and replay. ANDROID E2E NOT RUN. Wrong-role HTTP NOT RUN (no generated non-Reporter fixture).');
}
main().catch(error => { console.error('SMOKE FAILED: ' + (error.name === 'AssertionError' ? 'assertion failed' : error.message?.replace(/https?:\/\/\S+/g, '[redacted URL]'))); process.exitCode = 1; });
