const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const id = n => `${String(n).padStart(8, '0')}-1111-4111-8111-111111111111`;
const clone = value => JSON.parse(JSON.stringify(value));
const taskId = id(2);
const payload = (overrides = {}) => ({
  videoFileIds: [id(10)],
  telemetryFileIds: [id(11)],
  recordedAt: '2026-11-06T00:00:00Z',
  deviceId: id(12),
  scope: [{ routeVersionId: id(4), segmentSetId: id(5), segmentIds: [id(6)], targetBand: 'SURFACE' }],
  ...overrides,
});
const plan = (overrides = {}) => ({ taskId, projectId: id(3), ifMatch: '"AAAAAAAAAAE="', payload: payload(), ...overrides });

function loadWorkflow(journalFactory) {
  const auth = { getState: () => ({ token: 'sid', status: 'AUTHENTICATED', user: { id: id(1), role_code: 'DRONE_OPERATOR' } }), subscribe: () => () => {} };
  const deps = {
    '../store/auth': { useAuthStore: auth },
    './authApi': { passwordSessionIdentity: token => token ? JSON.stringify([id(1), token]) : null },
    './client': { apiClient: { defaults: { baseURL: 'https://fixture.test' } } },
    './droneTaskJournal': { openDroneUploadJournal: journalFactory },
    './droneApi': {
      createOperatorUploadSessionReal: () => {}, getOperatorUploadSessionReal: () => {}, getOperatorUploadPartUrlsReal: () => {},
      putUploadPartBytesDirect: () => {}, completeOperatorUploadReal: () => {}, getOperatorFileMetadataReal: () => {},
      getOperatorDatasetReal: () => {}, getOperatorDatasetCoverageReal: () => {}, getOperatorSurveyTaskDetailReal: () => {},
      submitOperatorDatasetReal: () => {},
    },
  };
  const mod = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/droneDatasetWorkflow.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    module: mod, exports: mod.exports, require: name => { if (!deps[name]) throw Error(name); return deps[name]; },
    Date, Set, Map, JSON,
  });
  return mod.exports;
}

function journalRuntime(initialStatus = 'PREPARED', initialBody = payload(), initialKey = id(40), initialTaskId = taskId) {
  let intent = {
    schema: 1, key: initialKey, kind: 'DRONE_DATASET_INTENT', actor: id(1), environment: 'https://fixture.test', session: JSON.stringify([id(1), 'sid']),
    projectId: id(3), taskId: initialTaskId, body: clone(initialBody), uploadId: null, fileId: null, version: 'AAAAAAAAAAE=', ifMatch: '"AAAAAAAAAAE="',
    parts: [], status: initialStatus, updatedAt: '2026-11-06T00:00:00.000Z', receipt: null, error: null,
  };
  const updates = [];
  return {
    updates,
    get intent() { return clone(intent); },
    factory: async () => ({
      prepare: async () => clone(intent),
      read: async () => [clone(intent)],
      update: async (key, patch) => { assert.equal(key, intent.key); intent = { ...intent, ...clone(patch) }; updates.push(clone(patch)); return clone(intent); },
      close() {},
    }),
  };
}

test('Drone dataset lost ACK replays exact key/body/original If-Match and confirms the same dataset', async () => {
  const runtime = journalRuntime();
  const workflow = loadWorkflow(runtime.factory);
  let firstArgs;
  const firstTransport = { submitDataset: async (...args) => { firstArgs = args; throw Error('timeout'); }, readTask: async () => { throw Error('must not read'); } };
  await assert.rejects(workflow.submitDroneDataset(plan(), firstTransport));
  assert.equal(runtime.intent.status, 'DATASET_UNKNOWN');
  let replayArgs;
  const replayTransport = { submitDataset: async (...args) => { replayArgs = args; return { data: { id: id(90), surveyTaskId: taskId, dataVersionId: id(91), integrityStatus: 'VERIFIED', telemetryStatus: 'PRESENT', version: 'dataset-v1' }, etag: '"dataset-v1"' }; }, readTask: async () => { throw Error('must not read'); } };
  const result = await workflow.replayDroneDataset(plan(), replayTransport);
  assert.deepEqual(replayArgs, firstArgs);
  assert.equal(result.status, 'DATASET_CONFIRMED');
  assert.equal(result.receipt.datasetId, id(90));
  assert.equal(result.receipt.replayed, true);
});

test('Drone dataset replay with changed body surfaces 409 and never creates a new key or POST', async () => {
  const runtime = journalRuntime('DATASET_UNKNOWN');
  const workflow = loadWorkflow(runtime.factory);
  let posts = 0;
  const changed = plan({ payload: payload({ telemetryFileIds: [id(13)] }) });
  await assert.rejects(workflow.replayDroneDataset(changed, { submitDataset: async () => { posts++; }, readTask: async () => { throw Error('must not read'); } }), error => error.response?.status === 409);
  assert.equal(posts, 0);
  assert.equal(runtime.intent.key, id(40));
  assert.equal(runtime.intent.status, 'DATASET_UNKNOWN');
});

test('Drone old-version replay returns the retained dataset while a new stale mutation gets 412', async () => {
  const replayRuntime = journalRuntime('DATASET_UNKNOWN');
  const workflow = loadWorkflow(replayRuntime.factory);
  const replayed = await workflow.replayDroneDataset(plan({ ifMatch: '"AAAAAAAAAAI="' }), { submitDataset: async () => ({ data: { id: id(90), surveyTaskId: taskId, dataVersionId: id(91), integrityStatus: 'VERIFIED', telemetryStatus: 'PRESENT', version: 'dataset-v1' }, etag: '"dataset-v1"' }), readTask: async () => ({ data: {}, etag: '"AAAAAAAAAAI="' }) });
  assert.equal(replayed.receipt.datasetId, id(90));
  const freshRuntime = journalRuntime('PREPARED', payload(), id(40), id(7));
  const freshWorkflow = loadWorkflow(freshRuntime.factory);
  let reads = 0;
  await assert.rejects(freshWorkflow.submitDroneDataset(plan({ taskId: id(7) }), { submitDataset: async () => { throw { response: { status: 412 } }; }, readTask: async () => { reads++; return { data: {}, etag: '"AAAAAAAAAAI="' }; } }), error => error.response?.status === 412);
  assert.equal(reads, 1);
  assert.equal(freshRuntime.intent.status, 'CONFLICT');
});

test('Drone dataset submission rejects missing or invalid deviceId before network or journal', async () => {
  const workflow = loadWorkflow(async () => { throw Error('journal must not open'); });
  for (const deviceId of [null, 'not-a-uuid', '00000000-0000-0000-0000-000000000000']) {
    await assert.rejects(workflow.prepareDroneDatasetIntent(plan({ payload: payload({ deviceId }) })), /drone_dataset_plan_invalid/);
  }
});
