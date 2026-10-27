const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { randomUUID, createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');

// Execute the shipped TypeScript with native boundaries replaced (no React Native runtime in Node).
function harness() {
  const rows = new Map(), cache = new Map(), calls = [];
  let auth = { status: 'SIGNED_OUT', token: null, user: null };
  const db = {
    execAsync: async () => {},
    getAllAsync: async (sql, partition) => sql.includes('PRAGMA') ? [{ name: 'accuracy_meters' }]
      : [...rows.values()].filter(r => r.partition_id === partition),
    getFirstAsync: async (sql, id) => rows.get(id) ?? null,
    runAsync: async (sql, ...args) => {
      if (sql.includes('DELETE')) { rows.delete(args[0]); return; }
      if (sql.includes('upload_ledger')) {
        const keys = sql.match(/\(([\s\S]+?)\)\s*VALUES/)[1].split(',').map(s => s.trim());
        rows.set(args[0], Object.fromEntries(keys.map((k, i) => [k, args[i]])));
      }
    },
  };
  const store = init => {
    let state;
    const set = patch => { state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }; };
    const get = () => state;
    state = init(set, get);
    const hook = select => select(state);
    hook.getState = get; hook.setState = set;
    return hook;
  };
  const transport = {
    async createSession(body, key) { calls.push(['create', body, key]); return { id: 'session', fileId: 'file', status: 'UPLOADING', version: 'v1', partSizeBytes: 2 }; },
    async getSession() { calls.push(['session']); return { id: 'session', fileId: 'file', status: 'UPLOADING', version: 'v2', partSizeBytes: 2 }; },
    async requestPartUrls(id, body, key) { calls.push(['urls', body, key]); return { parts: body.partNumbers.map(partNumber => ({ partNumber, url: 'signed' })) }; },
    async putPart(part, bytes) { calls.push(['put', [...bytes]]); return { eTag: 'etag' + part.partNumber }; },
    async completeUpload(id, body, version, key) { calls.push(['complete', body, version, key]); return { version: 'v3', status: 'VERIFYING' }; },
    async getFileMetadata() { calls.push(['metadata']); return { id: 'file', status: 'VERIFIED', version: 'fv', checksumSha256: createHash('sha256').update(Buffer.from([1,2,3])).digest('hex'), sizeBytes: 3 }; },
  };
  const api = {
    async submitReportReal(body, key) { calls.push(['report', body, key]); return { report: { id: 'report' } }; },
    async getOwnReportReal(id) { calls.push(['readback', id]); return { report: { id, evidence: [{ fileId: 'file', fileVersion: 'fv' }] } }; },
    async submitReportSupplementReal(id, body, key, version) { calls.push(['supplement', body, key, version]); return { report: { id } }; },
  };
  function load(relative) {
    const file = path.resolve(root, relative);
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} }; cache.set(file, mod);
    const req = name => {
      if (name === 'zustand') return { create: init => init ? store(init) : store };
      if (name === 'zustand/middleware') return { persist: init => init };
      if (name === 'react-native') return { AppState: { currentState: 'active' }, Platform: { select: x => x.default }, StyleSheet: { create: x => x } };
      if (name === 'expo-file-system') return { File: class { async arrayBuffer() { return Uint8Array.from([1,2,3]).buffer; } } };
      if (name === 'expo-crypto') return { CryptoDigestAlgorithm: { SHA256: 'sha256' }, digest: async (_, bytes) => Uint8Array.from(createHash('sha256').update(bytes).digest()).buffer };
      if (name === 'axios') return { __esModule: true, default: { create: () => ({}) } };
      if (name.endsWith('/auth') && name.includes('store')) return { useAuthStore: { getState: () => auth } };
      if (name === './auth') return { useAuthStore: { getState: () => auth } };
      if (name.endsWith('/database')) return {
        openDatabase: () => db, initDatabase: async () => {},
        saveDraft: async (_, id, kind, payload) => rows.set(id, { payload: JSON.stringify(payload) }),
        getDraft: async (_, id) => rows.has(id) ? JSON.parse(rows.get(id).payload) : null,
        deleteDraft: async (_, id) => rows.delete(id),
      };
      if (name.endsWith('/uuid')) return { uuidv4: randomUUID };
      if (name === './storage') return { appStorage: {} };
      if (name.endsWith('/reporterApi')) return api;
      if (name === './client') return { apiClient: {} };
      if (name === 'react') return { useEffect() {}, useState() {}, default: {} };
      if (name === 'react-native-gesture-handler' || name === 'expo-status-bar' || name === 'expo-font' || name === 'expo-router' || name === '@tanstack/react-query' || name === '@expo-google-fonts/roboto') return { QueryClient: class {} };
      let resolved = path.resolve(path.dirname(file), name);
      if (!path.extname(resolved)) resolved = ['.ts', '.tsx'].map(ext => resolved + ext).find(p => fs.existsSync(p));
      if (!resolved || !fs.existsSync(resolved)) return {};
      return load(path.relative(root, resolved));
    };
    const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
    vm.runInThisContext('(function(require,module,exports){' + js + '\n})', { filename: file })(req, mod, mod.exports);
    if (relative.replaceAll('\\', '/') === 'src/api/uploads.ts') Object.assign(mod.exports.httpUploadTransport, transport);
    return mod.exports;
  }
  return { load, calls, rows, transport, api, login(role = 'REPORTER', id = 'actor') { auth = { status: 'AUTHENTICATED', token: 'private', user: { id, role_code: role, must_change_password: false } }; }, logout() { auth = { status: 'SIGNED_OUT', token: null, user: null }; } };
}

test('restored user without token stays in auth; valid sessions route by role; public draft remains public', () => {
  const h = harness();
  const { authGuardDestination: route } = h.load('app/_layout.tsx');
  const restored = { status: 'VERIFIED_NEEDS_LOGIN', token: null, user: { role_code: 'REPORTER' } };
  assert.equal(route(restored, ['(auth)']), null);
  assert.equal(route(restored, ['(reporter)', 'report-detail']), '/(auth)');
  assert.equal(route(restored, ['(reporter)', 'report']), null);
  for (const [role, group] of [['REPORTER','reporter'],['REPAIR_CREW','crew'],['DRONE_OPERATOR','drone']]) {
    const auth = { status: 'AUTHENTICATED', token: 'token', user: { role_code: role } };
    assert.equal(route(auth, ['(auth)']), `/(${group})/home`);
    assert.equal(route(auth, [`(${group})`, 'home']), null);
  }
  assert.equal(route({ status: 'AUTHENTICATED', token: 'token', user: { role_code: 'REPORTER', must_change_password: true } }, ['(reporter)', 'report-detail']), '/(auth)/force-change-password');
});

test('guest upload and stale local verification cannot reach the HTTP transport', async () => {
  const h = harness(); const { useUploadsStore } = h.load('src/store/uploads.ts');
  const s = useUploadsStore.getState();
  const id = await s.enqueuePhoto({ uriLocal: 'cache://photo.jpg', fileName: 'photo.jpg', mediaType: 'image/jpeg', sizeBytes: 3, checksumSha256: 'a'.repeat(64) });
  await s.advanceItem(id);
  assert.deepEqual(h.calls, []);
  assert.equal(useUploadsStore.getState().items[0].mediaState, 'LOCAL_READY');
});

test('real upload respects part size, refreshes version, and preserves identity on uncertain complete', async () => {
  const h = harness(); h.login();
  let once = true; const complete = h.transport.completeUpload;
  h.transport.completeUpload = async (...args) => { const result = await complete(...args); if (once) { once = false; throw { code: 'ERR_NETWORK' }; } return result; };
  const { useUploadsStore } = h.load('src/store/uploads.ts'); const s = useUploadsStore.getState();
  await s.hydrate('reporter-actor');
  const id = await s.enqueuePhoto({ uriLocal: 'cache://photo.jpg', fileName: 'photo.jpg', mediaType: 'image/jpeg', sizeBytes: 3, checksumSha256: 'a'.repeat(64) });
  await s.advanceItem(id);
  await s.retryItem(id);
  await s.advanceItem(id);
  assert.deepEqual(h.calls.filter(c => c[0] === 'put').map(c => c[1]), [[1,2],[3]]);
  assert.equal(h.calls.filter(c => c[0] === 'create').length, 1);
  assert.equal(h.calls.find(c => c[0] === 'complete')[2], 'v2');
  assert.equal(useUploadsStore.getState().items[0].mediaState, 'VERIFIED');
});

test('OTP 1 is invalid and never transformed', () => {
  const h = harness(); const { isValidReporterOtp } = h.load('src/api/uploads.ts');
  assert.equal(isValidReporterOtp('1'), false);
  assert.equal(isValidReporterOtp('123456'), true);
  assert.equal(isValidReporterOtp('abcdef'), false);
});

module.exports = { harness };

test('pending draft, URIs and command survive store restart; wrong account cannot submit', async () => {
  const h = harness();
  const store = h.load('src/store/reporter.ts').useReporterStore;
  await store.getState().savePendingDraft({ description: 'Broken concrete slab', photos: [{ uri: 'cache://photo.jpg', fileName: 'photo.jpg', mediaType: 'image/jpeg', capturedAt: '2026-10-27T00:00:00Z' }], coords: null });
  const original = structuredClone(store.getState().pendingDraft);
  store.setState({ pendingDraft: null });
  await store.getState().restorePendingDraft();
  assert.deepEqual(store.getState().pendingDraft, JSON.parse(JSON.stringify(original)));
  h.login('REPAIR_CREW');
  await assert.rejects(store.getState().submitPendingDraft());
  assert.deepEqual(h.calls, []);
});

test('production OTP screen rejects shortcut and auth screens do not directly create reports', () => {
  const otp = fs.readFileSync(path.join(root, 'app/(auth)/otp-verify.tsx'), 'utf8');
  assert.equal(otp.includes("code === '1'"), false);
  assert.equal(otp.includes("setCode('111111')"), false);
  for (const screen of ['index', 'otp-verify']) {
    const source = fs.readFileSync(path.join(root, 'app/(auth)/' + screen + '.tsx'), 'utf8');
    assert.equal(source.includes('await submitReportReal('), false);
  }
});

async function pending(h) {
  h.login(); const store = h.load('src/store/reporter.ts').useReporterStore;
  await store.getState().savePendingDraft({description:'Concrete slab damaged',photos:[{uri:'cache://photo.jpg',fileName:'photo.jpg',mediaType:'image/jpeg',capturedAt:'2026-10-27T00:00:00Z'}],coords:null});
  return store;
}
for (const status of ['VERIFYING','FAILED']) test(status + ' metadata never creates report', async () => {
  const h=harness();const original=h.transport.getFileMetadata;
  h.transport.getFileMetadata=async()=>({...await original(),status});
  const store=await pending(h);
  await assert.rejects(store.getState().submitPendingDraft());
  assert.equal(h.calls.some(c=>c[0]==='report'),false);
  assert.ok(store.getState().pendingDraft);
});
for (const status of [400,401,403,409,412,428,503]) test('HTTP '+status+' preserves report command with no false success',async()=>{
  const h=harness();const store=await pending(h);const sent=[];
  h.api.submitReportReal=async(body,key)=>{sent.push([JSON.stringify(body),key]);throw {response:{status,data:{code:'unknown'}}};};
  await assert.rejects(store.getState().submitPendingDraft());
  const draft=JSON.stringify(store.getState().pendingDraft);
  await assert.rejects(store.getState().submitPendingDraft());
  assert.deepEqual(sent[0],sent[1]);assert.equal(JSON.stringify(store.getState().pendingDraft),draft);
  assert.equal(h.calls.some(c=>c[0]==='readback'),false);
});
test('uncertain report response recovers same key after restart and readback',async()=>{
  const h=harness();const store=await pending(h);const original=h.api.submitReportReal;let first=true;
  h.api.submitReportReal=async(...args)=>{const result=await original(...args);if(first){first=false;throw {code:'ERR_NETWORK'};}return result;};
  await assert.rejects(store.getState().submitPendingDraft());
  const saved=store.getState().pendingDraft;store.setState({pendingDraft:null});h.logout();h.login();
  await store.getState().restorePendingDraft();
  assert.equal(store.getState().pendingDraft.commandKey,saved.commandKey);
  assert.equal(await store.getState().submitPendingDraft(),'report');
  const writes=h.calls.filter(c=>c[0]==='report');assert.equal(writes.length,2);assert.deepEqual(writes[0],writes[1]);
  assert.equal(store.getState().pendingDraft,null);assert.equal(h.calls.at(-1)[0],'readback');
});
test('account switch during upload cannot issue next request as new actor',async()=>{
  const h=harness();h.login();const original=h.transport.requestPartUrls;
  h.transport.requestPartUrls=async(...args)=>{const result=await original(...args);h.login('REPORTER','other');return result;};
  const store=await pending(h);await assert.rejects(store.getState().submitPendingDraft());
  assert.equal(h.calls.some(c=>c[0]==='put'||c[0]==='report'),false);
});
test('frozen report cannot change content or be adopted by a different actor',async()=>{
  const h=harness();const store=await pending(h);h.api.submitReportReal=async()=>{throw {status:503};};
  await assert.rejects(store.getState().submitPendingDraft());const draft=store.getState().pendingDraft;
  await assert.rejects(store.getState().savePendingDraft({...draft,description:'different'}));
  h.logout();h.login('REPORTER','other');assert.equal(await store.getState().restorePendingDraft(),null);
});

test('concurrent autosaves retain one draft identity and command key',async()=>{
  const h=harness();const store=h.load('src/store/reporter.ts').useReporterStore;
  const input={description:'one',photos:[],coords:null};
  const [first,second]=await Promise.all([store.getState().savePendingDraft(input),store.getState().savePendingDraft({...input,description:'two'})]);
  assert.equal(first.id,second.id);assert.equal(first.commandKey,second.commandKey);
});

test('empty create draft does not block supplement while meaningful draft stays protected',async()=>{
  const h=harness();h.login();const store=h.load('src/store/reporter.ts').useReporterStore;
  await store.getState().savePendingDraft({description:'',photos:[],coords:{latitude:10,longitude:106,accuracyMeters:null}});
  store.setState({pendingDraft:null});
  assert.equal(await store.getState().restorePendingDraft(),null);
  const supplement=await store.getState().savePendingDraft({description:'Additional evidence',photos:[],coords:null,targetReportId:'existing',ifMatch:'v1'});
  await assert.rejects(store.getState().savePendingDraft({...supplement,targetReportId:'other'}));
  assert.equal(store.getState().pendingDraft.targetReportId,'existing');
});
