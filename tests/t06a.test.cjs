const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const { randomUUID } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
function load(file, deps = {}) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText,
    { module, exports: module.exports, console, require: n => deps[n] ?? (n === 'axios' ? require('axios') : new Proxy({}, { get: () => () => {} })) });
  return module.exports;
}
const actor = randomUUID(), projectId = randomUUID(), taskId = randomUUID(), bindingId = randomUUID(), itemId = randomUUID(), packageId = randomUUID();
const version = 'AAAAAAAAB9E=', taskVersion = 'AAAAAAAAB9I=';
const context = () => ({ actor, scope: JSON.stringify([actor, 'session-A']), environment: 'http://fixture/api/v1', projectId, taskId });
const detail = () => ({ id: taskId, projectId, assignedToUserId: actor, assignmentId: randomUUID(), mode: 'NORMAL', status: 'Accepted', version: taskVersion,
  repairContext: { packageId, itemId, bindingId, mode: 'NORMAL', status: 'Assigned', itemVersion: version, repairPlan: 'Approved plan', checklistVersion: 'revision-1' } });
function api() { return load('src/api/crewApi.ts', { './client': { apiClient: {} } }); }

test('T06A NORMAL bootstrap works without GPS, WO or first-start; item version is independent', () => {
  const d = detail(), a = api();
  assert.equal(a.normalRepairBlock(d, `"${taskVersion}"`, actor, 'bootstrap'), null);
  assert.equal(d.repairContext.itemVersion, 'AAAAAAAAB9E=');
  for (const capability of ['assessment', 'start', 'finish', 'attempt', 'supplement']) assert.ok(a.normalRepairBlock(d, `"${taskVersion}"`, actor, capability));
});
for (const [name, change] of [
  ['null context', d => d.repairContext = null], ['FT', d => d.mode = 'CONDITIONAL_FT'],
  ['wrong owner', d => d.assignedToUserId = projectId], ['missing assignment', d => d.assignmentId = null],
  ['missing binding', d => d.repairContext.bindingId = 'fake'], ['invalid item version', d => d.repairContext.itemVersion = 'h4-eligibility-v1-hash'],
  ['wrong context mode', d => d.repairContext.mode = 'FastTrack'], ['missing item', d => d.repairContext.itemId = null],
]) test('T06A bootstrap rejects ' + name, () => { const d = detail(); change(d); assert.ok(api().normalRepairBlock(d, `"${taskVersion}"`, actor, 'bootstrap')); });
test('T06A cached item version/binding must match expected anchor', () => {
  const a = api(), d = detail();
  assert.ok(a.normalRepairBlock(d, `"${taskVersion}"`, actor, 'bootstrap', { ...d.repairContext, bindingId: randomUUID() }));
  assert.ok(a.normalRepairBlock(d, `"${taskVersion}"`, actor, 'bootstrap', { ...d.repairContext, itemVersion: 'AAAAAAAAB9M=' }));
});
test('T06A legacy repair screen guard remains closed even with complete presentation data', () => {
  const a = api(), d = detail();
  const t = { ...a.crewTaskFromWire({ id: taskId, projectId, crewId: actor, mode: 'NORMAL', status: 'InProgress', version: taskVersion, defectIds: [] }, d, `"${taskVersion}"`),
    coordinates: { latitude: 10, longitude: 106 }, wo_code: 'actual', defect_type_code: 'POTH_DEEP', task_mode: 'INSPECT_AND_REPAIR' };
  assert.ok(a.crewTaskActionBlock(t));
});

function sqlite() {
  const raw = new DatabaseSync(':memory:');
  raw.exec('CREATE TABLE local_draft(id TEXT PRIMARY KEY, kind TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)');
  const port = {
    getFirstAsync: async (sql, ...args) => raw.prepare(sql).get(...args) ?? null,
    getAllAsync: async (sql, ...args) => raw.prepare(sql).all(...args),
    runAsync: async (sql, ...args) => raw.prepare(sql).run(...args),
    withExclusiveTransactionAsync: async f => { raw.exec('BEGIN IMMEDIATE'); try { await f(port); raw.exec('COMMIT'); } catch (e) { raw.exec('ROLLBACK'); throw e; } },
  };
  return { raw, port };
}
function journal() {
  const db = sqlite(); let current = context();
  const a = api();
  const m = load('src/api/crewRepairDraft.ts', { './crewApi': a, '../offline/database': { openDatabase: () => db.port, initDatabase: async () => {} } });
  const open = c => m.openRepairJournal(c ?? context(), () => current);
  const command = () => ({ identity: { ...context(), packageId, itemId, bindingId, assignmentId: detail().assignmentId }, operation: 'assessment', key: randomUUID(),
    itemVersion: version, payload: { originId: randomUUID(), fieldFirstStartId: randomUUID(), measurements: [], evidence: [] } });
  return { ...db, m, open, command, switch: c => current = c };
}
test('T06A journal persists exact immutable intent in real SQLite and reloads it', async () => {
  const h = journal(), j = await h.open(), c = h.command();
  const stored = await j.prepare(c); c.payload.measurements.push({ value: 99 });
  const next = await (await h.open()).read(stored.key);
  assert.equal(JSON.stringify(next), JSON.stringify(stored)); assert.equal(next.payload.measurements.length, 0);
  assert.equal(next.ifMatch, '"AAAAAAAAB9E="'); assert.equal(next.phase, 'PREPARED');
  await assert.rejects(j.prepare(c)); assert.equal((await j.read(c.key)).payload.measurements.length, 0);
});
test('T06A pending command blocks a new key and cannot be overwritten after relogin', async () => {
  const h = journal(), j = await h.open(), c = h.command(); await j.prepare(c);
  await assert.rejects(j.prepare(h.command()));
  const next = { ...context(), scope: JSON.stringify([actor, 'session-B']) }; h.switch(next);
  const newJournal = await h.open(next);
  await assert.rejects(newJournal.prepare({ ...h.command(), identity: { ...c.identity, scope: next.scope } }));
  assert.equal(h.raw.prepare('SELECT COUNT(*) AS n FROM local_draft').get().n, 1);
});
test('T06A journal rejects actor/environment/session change and storage failure', async () => {
  for (const change of [{ actor: projectId }, { environment: 'http://other' }, { scope: 'other-session' }]) {
    const h = journal(), j = await h.open(); h.switch({ ...context(), ...change });
    await assert.rejects(j.prepare(h.command())); assert.equal(h.raw.prepare('SELECT COUNT(*) AS n FROM local_draft').get().n, 0);
  }
  const h = journal(), j = await h.open(); h.raw.exec('DROP TABLE local_draft'); await assert.rejects(j.prepare(h.command()));
});
test('T06A journal rejects invalid version, corrupt row and changed binding', async () => {
  const h = journal(), j = await h.open(), c = h.command();
  await assert.rejects(j.prepare({ ...c, itemVersion: '0' }));
  await j.prepare(c); await assert.rejects(j.prepare({ ...c, identity: { ...c.identity, bindingId: randomUUID() } }));
  h.raw.prepare('UPDATE local_draft SET payload = ?').run('{broken'); await assert.rejects(j.read(c.key));
});
for (const [kind, payload] of [['REPAIR_EXECUTION_FINISH', {}], ['REPAIR_START', {}], ['repair_evidence', {}], ['FIELD_SUBMISSION', { kind: 'REPAIR_SUBMIT' }], ['fast_track_completion', {}]]) {
  test('T06A quarantine catches repair row/alias ' + kind + JSON.stringify(payload), () => assert.equal(api().isLegacyRepairQueueEntry(kind, payload), true));
}
test('T06A quarantine does not block an independent FIELD submission', () => assert.equal(api().isLegacyRepairQueueEntry('FIELD_SUBMISSION', { kind: 'INSPECTION_SUBMIT' }), false));

function bootstrapHarness() {
  let identity = context(), response = { data: detail(), etag: `"${taskVersion}"` }, calls = 0;
  const a = api();
  const h = load('src/hooks/useRepairBootstrap.ts', {
    '../api/crewApi': { ...a, getFieldInspectionTaskDetailReal: async () => { calls++; return typeof response === 'function' ? response() : response; } },
    '../api/crewRepairDraft': { currentRepairIdentity: () => identity, sameRepairIdentity: (a,b) => !!b && ['actor','scope','environment','projectId','taskId'].every(k => a[k] === b[k]) },
    '../utils/uuid': { uuidv4: randomUUID },
  });
  return { h, setIdentity: i => identity = i, respond: r => response = r, calls: () => calls };
}
test('T06A actual bootstrap reads owner-scoped API080; never substitutes task version', async () => {
  const h = bootstrapHarness(), b = await h.h.readRepairBootstrap(taskId,projectId);
  assert.equal(b.repairContext.itemVersion,'AAAAAAAAB9E='); assert.equal(b.taskVersion,'AAAAAAAAB9I=');
  assert.equal(b.identity.actor,actor); assert.equal(h.calls(),1);
});
test('T06A null context stays null, while malformed binding is rejected', async () => {
  const h = bootstrapHarness(); h.respond({data:{...detail(),repairContext:null},etag:`"${taskVersion}"`});
  assert.equal((await h.h.readRepairBootstrap(taskId,projectId)).repairContext,null);
  const d = detail(); d.repairContext.bindingId = 'placeholder'; h.respond({data:d,etag:`"${taskVersion}"`});
  await assert.rejects(h.h.readRepairBootstrap(taskId,projectId));
});
test('T06A bootstrap stops old actor response after session switch', async () => {
  const h = bootstrapHarness();
  h.respond(() => { h.setIdentity({...context(),scope:JSON.stringify([actor,'session-B'])});return {data:detail(),etag:`"${taskVersion}"`}; });
  await assert.rejects(h.h.readRepairBootstrap(taskId,projectId));
});
test('T06A anonymous bootstrap does not call API; missing project has no mock fallback', async () => {
  const h = bootstrapHarness(); h.setIdentity(null);
  await assert.rejects(h.h.readRepairBootstrap(taskId,projectId));
  await assert.rejects(h.h.readRepairBootstrap(taskId)); assert.equal(h.calls(),0);
});
test('T06A legacy callback cannot send a repair mutation through helper', async () => {
  const h = bootstrapHarness(); let executed = false;
  await assert.rejects(h.h.withFreshItemVersion(taskId,async () => { executed = true; },{projectId}));
  assert.equal(executed,false);assert.equal(h.calls(),0);
});
function syncHarness() {
  const a = api();
  return load('app/(crew)/sync.tsx', {
    '../../src/api/crewApi': a,
    '../../src/offline/upload-queue': { decodeOutboxPayload: row => Buffer.from(row.data_b64,'base64').toString('utf8') },
    '../../src/types/enums': load('src/types/enums.ts'),
    'react-native':{StyleSheet:{create:x=>x},Platform:{select:x=>x.default}},
    '../../src/design-tokens':{colors:{},spacing:{},typography:{},radius:{}},
  });
}
test('T06A real SQLite quarantine preserves bytes/key/IDs and never claims ACK', async () => {
  const {raw,port} = sqlite(), m = syncHarness();
  raw.exec('CREATE TABLE offline_outbox(id TEXT PRIMARY KEY, kind TEXT, payload_b64 TEXT, idempotency_key TEXT, local_state TEXT, last_error TEXT, updated_at TEXT)');
  const body=Buffer.from(JSON.stringify({kind:'REPAIR_SUBMIT',attemptId:'legacy-fake',expectedVersion:'0'})).toString('base64');
  raw.prepare('INSERT INTO offline_outbox VALUES(?,?,?,?,?,?,?)').run('old','FIELD_SUBMISSION',body,'old-key','ACKED',null,'old');
  const field=Buffer.from('{"kind":"INSPECTION_SUBMIT"}').toString('base64');
  raw.prepare('INSERT INTO offline_outbox VALUES(?,?,?,?,?,?,?)').run('field','FIELD_SUBMISSION',field,'field-key','READY',null,'old');
  await m.quarantineLegacyRepairQueue(port);
  const r=raw.prepare('SELECT * FROM offline_outbox WHERE id=?').get('old');
  assert.equal(r.local_state,'BLOCKED_CONTRACT');assert.equal(r.payload_b64,body);assert.equal(r.idempotency_key,'old-key');
  assert.equal(raw.prepare('SELECT local_state FROM offline_outbox WHERE id=?').get('field').local_state,'READY');
  assert.throws(()=>m.crewSyncPayload({kind:r.kind,data_b64:r.payload_b64}));
  assert.equal(m.crewSyncPayload({kind:'FIELD_SUBMISSION',data_b64:field}).kind,'INSPECTION_SUBMIT');
  await m.quarantineLegacyRepairQueue(port);assert.equal(raw.prepare('SELECT COUNT(*) AS n FROM offline_outbox').get().n,2);
});
test('T06A malformed durable payload is quarantined, not dispatched or deleted', async () => {
  const {raw,port}=sqlite(),m=syncHarness();
  raw.exec('CREATE TABLE offline_outbox(id TEXT PRIMARY KEY, kind TEXT, payload_b64 TEXT, local_state TEXT, last_error TEXT, updated_at TEXT)');
  raw.prepare('INSERT INTO offline_outbox VALUES(?,?,?,?,?,?)').run('corrupt','FIELD_SUBMISSION','AAAA','READY',null,'old');
  await m.quarantineLegacyRepairQueue(port);assert.equal(raw.prepare('SELECT local_state FROM offline_outbox').get().local_state,'BLOCKED_CONTRACT');
});
test('T06A journal session switch during SQLite write rolls back durable intent', async () => {
  const h=journal(),j=await h.open(),original=h.port.runAsync;
  h.port.runAsync=async (...args)=>{const value=await original(...args);h.switch({...context(),scope:'switched'});return value;};
  await assert.rejects(j.prepare(h.command()));assert.equal(h.raw.prepare('SELECT COUNT(*) AS n FROM local_draft').get().n,0);
});
test('T06A same actor in another environment cannot see or replace an intent', async () => {
  const h=journal(),j=await h.open(),c=h.command();await j.prepare(c);
  const other={...context(),environment:'http://isolated/api/v1'};h.switch(other);const second=await h.open(other);
  assert.equal(await second.read(c.key),null);
  await second.prepare({...h.command(),identity:{...c.identity,...other}});
  assert.equal(h.raw.prepare('SELECT COUNT(*) AS n FROM local_draft').get().n,2);
});
test('T06A credentials and invalid JSON data cannot enter the repair journal', async () => {
  for(const payload of [{accessToken:'secret'},{password:'secret'},{value:NaN},{value:undefined}]){
    const h=journal(),j=await h.open();await assert.rejects(j.prepare({...h.command(),payload}));
    assert.equal(h.raw.prepare('SELECT COUNT(*) AS n FROM local_draft').get().n,0);
  }
});

test('T06A correction and cancelled contexts remain readable without enabling commands', () => {
  for (const status of ['CorrectionRequired', 'Cancelled']) {
    const d = detail(), a = api(); d.repairContext.status = status;
    assert.equal(a.normalRepairBlock(d, `"${taskVersion}"`, actor, 'bootstrap'), null);
    assert.ok(a.normalRepairBlock(d, `"${taskVersion}"`, actor, 'start'));
  }
});

test('T06A corrupt journal in another partition cannot block current actor/task/environment', async () => {
  for (const change of [
    { actor: randomUUID() }, { taskId: randomUUID() }, { environment: 'http://other/api/v1' },
  ]) {
    const h = journal(), c = h.command();
    const other = { ...context(), ...change };
    other.scope = JSON.stringify([other.actor, 'other-session']); h.switch(other);
    await (await h.open(other)).prepare({ ...c, identity: { ...c.identity, ...other } });
    h.raw.prepare('UPDATE local_draft SET payload=?').run('{broken');
    h.switch(context()); const j = await h.open();
    assert.equal(await j.read(c.key), null);
    await j.prepare(c);
    assert.equal(h.raw.prepare('SELECT COUNT(*) AS n FROM local_draft').get().n, 2);
    assert.equal(h.raw.prepare('SELECT COUNT(*) AS n FROM local_draft WHERE payload=?').get('{broken').n, 1);
  }
});

test('T06A deep links to legacy execution screens never mount even with complete task data', () => {
  const a = api();
  const task = { id: taskId, projectId, version, etag: `"${version}"`,
    rawMode: 'INSPECT_AND_REPAIR', task_mode: 'INSPECT_AND_REPAIR',
    coordinates: { latitude: 10, longitude: 106 }, wo_code: 'server-WO', defect_type_code: 'POTH_DEEP' };
  assert.equal(a.crewTaskActionBlock(task), null); // Presentation guard alone would allow it.
  let pathname = '/progress', mounted = 0;
  const react = { createElement: (type, props, ...children) => ({type, props, children}), useCallback: f => f };
  const m = load('app/(crew)/tasks.tsx', {
    react,
    'react-native': { StyleSheet: { create: x => x }, Platform: { select: x => x.default } },
    'expo-router': { usePathname: () => pathname, useLocalSearchParams: () => ({ id: taskId, projectId }), useFocusEffect() {} },
    '@tanstack/react-query': { useInfiniteQuery: () => ({data:{pages:[]}}), useQuery: () => ({data:task}) },
    '../../src/api/crewApi': a,
    '../../src/store/auth': {useAuthStore: f => f({user:{id:actor,role_code:'REPAIR_CREW'},token:'fixture',status:'AUTHENTICATED'})},
    '../../src/api/authApi': {passwordSessionIdentity: () => context().scope},
    '../../src/types/enums': load('src/types/enums.ts'),
    '../../src/design-tokens': {colors:{},radius:{},spacing:{},typography:{}},
  });
  for (const route of ['progress', 'complete', 'repair-correction']) {
    for (const prefix of ['', '/(crew)']) {
      pathname = `${prefix}/${route}`;
      m.CrewTaskBoundary({children: () => { mounted++; }});
    }
  }
  assert.equal(mounted, 0);
  m.CrewTaskBoundary({operational:false,children:()=>{mounted++;}});
  assert.equal(mounted, 1); // Read-only detail capability remains independent.
});
