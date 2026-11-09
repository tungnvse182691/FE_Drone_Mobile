const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const id = n => `${String(n).padStart(8, '0')}-1111-4111-8111-111111111111`;

function loadDroneApi() {
  const calls = [];
  const module = { exports: {} };
  const apiClient = {
    get: async (...args) => { calls.push(['get', ...args]); return { data: { items: [{ id: id(2), serialNo: 'DRONE-002' }], nextCursor: 'opaque-next' } }; },
    post: async (...args) => { calls.push(['post', ...args]); return { data: { id: id(5), fileId: id(4), status: 'FAILED', failureCode: 'upload_cancelled', version: 'v2' } }; },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/droneApi.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    module,
    exports: module.exports,
    require: name => name === './client' ? { apiClient } : name === './problemDetails' ? { parseProblemDetails: () => ({ code: null }) } : {},
  });
  return { api: module.exports, calls };
}

test('eligible drone GET preserves opaque cursor and bounded limit', async () => {
  const h = loadDroneApi();
  const result = await h.api.listEligibleOperatorDronesReal(id(1), 'cursor%2Ftwo', 25);
  assert.equal(result.items[0].serialNo, 'DRONE-002');
  assert.equal(h.calls[0][0], 'get');
  assert.equal(h.calls[0][1], `/survey-tasks/${id(1)}/eligible-drones`);
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0][2])), { params: { limit: 25, cursor: 'cursor%2Ftwo' } });
});

test('operator upload cancel uses shared upload route with no body or mutation headers', async () => {
  const h = loadDroneApi();
  const result = await h.api.cancelOperatorUploadReal(id(5));
  assert.equal(result.status, 'FAILED');
  assert.deepEqual(h.calls[0], ['post', `/uploads/${id(5)}/cancel`]);
});

test('eligible drone GET rejects invalid task ids and unsafe limits before HTTP', async () => {
  const h = loadDroneApi();
  await assert.rejects(h.api.listEligibleOperatorDronesReal('not-a-uuid'), /invalid_task_id/);
  await assert.rejects(h.api.listEligibleOperatorDronesReal(id(1), null, 101), /invalid_limit/);
  assert.equal(h.calls.length, 0);
});

function loadCancelWorkflow({ cancel, getSession, intent }) {
  let updated;
  const module = { exports: {} };
  const actor = id(10);
  const taskId = id(11);
  const journal = {
    read: async () => intent ? [intent] : [],
    update: async (_key, patch) => { updated = patch; return { ...intent, ...patch }; },
    close: () => {},
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/droneDatasetWorkflow.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    module,
    exports: module.exports,
    Error,
    JSON,
    Set,
    Map,
    Date,
    require: name => {
      if (name === '../store/auth') return { useAuthStore: { getState: () => ({ token: 'sid', status: 'AUTHENTICATED', user: { id: actor, role_code: 'DRONE_OPERATOR' } }), subscribe: () => () => {} } };
      if (name === './authApi') return { passwordSessionIdentity: token => token ? JSON.stringify([actor, token]) : null };
      if (name === './client') return { apiClient: { defaults: { baseURL: 'https://fixture.test' } } };
      if (name === './droneTaskJournal') return { openDroneUploadJournal: async () => journal };
      if (name === './droneApi') return {
        cancelOperatorUploadReal: cancel,
        getOperatorUploadSessionReal: getSession,
        getOperatorSurveyTaskDetailReal: async () => ({ data: { id: taskId, operatorId: actor, projectId: id(12), version: 'v1' }, etag: '"v1"' }),
      };
      throw Error(`unexpected ${name}`);
    },
  });
  return { api: module.exports, actor, taskId, journal, getUpdated: () => updated };
}

test('operator cancel marks only the matching upload journal as cancelled', async () => {
  const h = loadCancelWorkflow({
    cancel: async uploadId => ({ id: uploadId, status: 'FAILED', failureCode: 'upload_cancelled' }),
    getSession: async () => ({ status: 'UPLOADING' }),
    intent: { key: id(20), kind: 'DRONE_UPLOAD_INTENT', taskId: id(11), uploadId: id(5), status: 'PARTS_IN_PROGRESS' },
  });
  const result = await h.api.cancelOperatorUploadSession(h.taskId, id(5));
  assert.equal(result.status, 'FAILED');
  assert.deepEqual(JSON.parse(JSON.stringify(h.getUpdated())), { status: 'FAILED', error: { status: 200, code: 'upload_cancelled' } });
});

test('operator cancel 409 reads the session and never claims cancellation', async () => {
  let cancelCalls = 0, readCalls = 0;
  const h = loadCancelWorkflow({
    cancel: async () => { cancelCalls++; const error = new Error('race'); error.response = { status: 409 }; throw error; },
    getSession: async uploadId => { readCalls++; return { id: uploadId, status: 'VERIFYING' }; },
    intent: { key: id(20), kind: 'DRONE_UPLOAD_INTENT', taskId: id(11), uploadId: id(5), status: 'PARTS_IN_PROGRESS' },
  });
  await assert.rejects(h.api.cancelOperatorUploadSession(h.taskId, id(5)), /upload_not_cancellable/);
  assert.equal(cancelCalls, 1); assert.equal(readCalls, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(h.getUpdated())), { status: 'PARTS_IN_PROGRESS', error: { status: 409, code: 'upload_not_cancellable' } });
});
