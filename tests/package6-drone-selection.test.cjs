const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');
const { randomUUID } = require('node:crypto');

const id = n => `${String(n).padStart(8, '0')}-1111-4111-8111-111111111111`;

function fixture() {
  const dir = fs.mkdtempSync('.cache/drone-selection-');
  const file = `${dir}/selection.db`;
  let disk;
  const open = () => {
    disk = new DatabaseSync(file);
    disk.exec('CREATE TABLE IF NOT EXISTS local_draft(id TEXT PRIMARY KEY, kind TEXT, payload TEXT, created_at TEXT, updated_at TEXT)');
  };
  open();
  const db = {
    getAllAsync: async (sql, ...args) => disk.prepare(sql).all(...args),
    runAsync: async (sql, ...args) => disk.prepare(sql).run(...args),
    withExclusiveTransactionAsync: async fn => { disk.exec('BEGIN'); try { await fn(db); disk.exec('COMMIT'); } catch (error) { disk.exec('ROLLBACK'); throw error; } },
  };
  let state = { user: { id: id(1), role_code: 'DRONE_OPERATOR' }, status: 'AUTHENTICATED', token: 'sid-A' };
  let environment = 'https://fixture.test';
  const listeners = [];
  const deps = {
    '../offline/database': { openDatabase: () => db, initDatabase: async () => {} },
    '../store/auth': { useAuthStore: { getState: () => state, subscribe: fn => { listeners.push(fn); return () => listeners.splice(listeners.indexOf(fn), 1); } } },
    './authApi': { passwordSessionIdentity: token => token ? JSON.stringify([state.user?.id, token]) : null },
    './client': { apiClient: { defaults: { get baseURL() { return environment; } } } },
    'expo-crypto': { randomUUID },
  };
  const module = { exports: {} };
  const load = () => {
    vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/droneSelectionJournal.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
      module, exports: module.exports, require: name => { if (!deps[name]) throw Error(`unexpected ${name}`); return deps[name]; }, Date, JSON, Set,
    });
    return module.exports;
  };
  return {
    api: load(), db, reopen: () => { disk.close(); open(); },
    change: patch => { state = { ...state, ...patch }; listeners.slice().forEach(fn => fn()); },
    env: value => { environment = value; },
    rows: () => disk.prepare('SELECT * FROM local_draft ORDER BY id').all(),
  };
}

const selection = (overrides = {}) => ({
  droneId: id(20), serialNo: 'DRONE-020', ...overrides,
});

test('drone selection survives remount and is scoped to actor, session, environment, project and task', async () => {
  const f = fixture();
  const first = await f.api.openDroneSelectionJournal(id(2), id(3));
  await first.save(selection());
  assert.deepEqual(JSON.parse(JSON.stringify(await first.read())), selection());
  first.close();
  f.reopen();
  const second = await f.api.openDroneSelectionJournal(id(2), id(3));
  assert.deepEqual(JSON.parse(JSON.stringify(await second.read())), selection());
  f.change({ token: 'sid-B' });
  await assert.rejects(second.read(), /drone_selection_session_changed/);
  second.close();
  f.change({ token: 'sid-A' });
  f.env('https://other.test');
  const otherEnvironment = await f.api.openDroneSelectionJournal(id(2), id(3));
  assert.equal(await otherEnvironment.read(), null);
  otherEnvironment.close();
  assert.equal(f.rows().length, 1);
});

test('drone selection rejects wrong task or project and clears stale eligible choice explicitly', async () => {
  const f = fixture();
  const runtime = await f.api.openDroneSelectionJournal(id(2), id(3));
  await runtime.save(selection());
  await assert.rejects(runtime.save(selection({ droneId: 'not-a-uuid' })), /drone_selection_invalid/);
  const otherTask = await f.api.openDroneSelectionJournal(id(4), id(3));
  assert.equal(await otherTask.read(), null);
  otherTask.close();
  await runtime.clear();
  assert.equal(await runtime.read(), null);
  runtime.close();
});
