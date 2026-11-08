const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');
const vm = require('node:vm');

function pure(file, names) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations = names.map(name => {
    const node = source.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === name);
    assert.ok(node, `${name} must remain exported`);
    return node.getText().replace(/^export /, '');
  }).join('\n');
  const output = ts.transpileModule(declarations, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return vm.runInNewContext(`${output};({${names.join(',')}})`);
}

test('FIELD measurement validation reports errors without changing the entered value', () => {
  const { measurementValidationMessage } = pure('app/(crew)/field-review.tsx', ['measurementValidationMessage']);
  assert.equal(measurementValidationMessage('12,5'), null);
  assert.equal(measurementValidationMessage('  '), null);
  assert.match(measurementValidationMessage('-1'), /từ 0 trở lên/);
  assert.match(measurementValidationMessage('abc'), /từ 0 trở lên/);
});

test('FIELD evidence and submission statuses distinguish local, pending and server verified states', () => {
  const { fieldEvidenceStatus, fieldSubmissionReadinessLabel } = pure('app/(crew)/field-review.tsx', ['fieldEvidenceStatus', 'fieldSubmissionReadinessLabel']);
  assert.equal(fieldEvidenceStatus({}).label, 'Đã lưu trên thiết bị');
  assert.equal(fieldEvidenceStatus({}).variant, 'status-pending');
  assert.equal(fieldEvidenceStatus({ upload: { fileId: 'local' }, completed: true }).label, 'Đã tải lên, chờ xác minh');
  assert.equal(fieldEvidenceStatus({ verified: true, completed: true }).variant, 'approved');
  assert.equal(fieldSubmissionReadinessLabel('READY'), 'Đủ thông tin theo máy chủ');
  assert.equal(fieldSubmissionReadinessLabel('INCOMPLETE'), 'Cần bổ sung thông tin');
  assert.equal(fieldSubmissionReadinessLabel('UNKNOWN'), 'Chưa xác nhận độ đầy đủ');
});

test('API-080 correction presentation keeps technical IDs behind an explicit state and blocks without SUPPLEMENT', () => {
  const { repairReviewPresentation } = pure('app/(crew)/repair-correction.tsx', ['repairReviewPresentation']);
  const pending = repairReviewPresentation({ attemptId: 'attempt-1', effectiveSubmissionId: 'submission-1', review: null });
  assert.equal(pending.canSupplement, false);
  assert.equal(pending.statusLabel, 'Đang chờ đánh giá');
  assert.match(pending.blockReason, /quyết định bổ sung/);
  const supplement = repairReviewPresentation({ attemptId: 'attempt-1', effectiveSubmissionId: 'submission-1', review: { decision: 'SUPPLEMENT' } });
  assert.equal(supplement.canSupplement, true);
  assert.equal(supplement.statusLabel, 'Cần bổ sung hồ sơ');
});

function loadCommonJs(file, deps = {}, globals = {}) {
  const module = { exports: {} };
  const source = fs.readFileSync(file, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(output, {
    module,
    exports: module.exports,
    require: name => deps[name] ?? require(name),
    setTimeout,
    clearTimeout,
    Uint8Array,
    Date,
    JSON,
    ...globals,
  });
  return module.exports;
}

test('FIELD evidence capture persists camera and gallery provenance only for an eligible task', async () => {
  const actor = '11111111-1111-4111-8111-111111111111';
  const project = '22222222-2222-4222-8222-222222222222';
  const taskId = '33333333-3333-4333-8333-333333333333';
  const assignment = '44444444-4444-4444-8444-444444444444';
  const start = '55555555-5555-4555-8555-555555555555';
  const scope = JSON.stringify([actor, 'session-a']);
  let uuidCounter = 0;
  const nextUuid = () => `66666666-6666-4666-8666-${String(++uuidCounter).padStart(12, '0')}`;
  const bytes = new Map([
    ['file://camera.jpg', Uint8Array.from([255, 216, 255, 1])],
    ['file://gallery.png', Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 1])],
  ]);
  const files = new Map();
  class FakeDirectory {
    constructor(parent, name) { this.uri = `${parent.uri ?? parent}/${name}`; }
    create() {}
  }
  class FakeFile {
    constructor(parent, name) {
      this.uri = name === undefined ? parent : `${parent.uri ?? parent}/${name}`;
    }
    async arrayBuffer() { return bytes.get(this.uri) ?? new Uint8Array([1]).buffer; }
    write(value) { files.set(this.uri, Uint8Array.from(value)); }
    bytesSync() { return files.get(this.uri) ?? new Uint8Array(); }
    move(target) { files.set(target.uri, files.get(this.uri) ?? new Uint8Array()); files.delete(this.uri); this.uri = target.uri; }
  }
  const Paths = { document: { uri: 'file://documents' }, cache: { uri: 'file://cache' } };
  let stored = null;
  const storageId = `t05b:${JSON.stringify(['https://test.local', actor, project, taskId])}`;
  const database = {
    async getAllAsync() { return stored ? [{ id: storageId, payload: JSON.stringify(stored) }] : []; },
    async getFirstAsync() { return null; },
  };
  const saveDraft = async (_db, _id, _kind, draft) => { stored = structuredClone(draft); };
  const crew = loadCommonJs('src/api/crewApi.ts', {
    './client': { apiClient: { defaults: { baseURL: 'https://test.local' } } },
    './problemDetails': { parseProblemDetails: () => ({}) },
  });
  const task = {
    id: taskId, projectId: project, assignedToUserId: actor, assignmentId: assignment,
    version: 'AAAAAAAAB9E=', firstStartOriginId: start, status: 'InProgress',
    purpose: 'DefectVerification', requiredMeasurementType: 1,
  };
  const auth = { useAuthStore: { getState: () => ({ user: { id: actor, role_code: 'REPAIR_CREW' }, token: 'token', status: 'AUTHENTICATED' }) } };
  const field = loadCommonJs('src/api/crewFieldDraft.ts', {
    'expo-crypto': { randomUUID: nextUuid },
    'expo-file-system': { Directory: FakeDirectory, File: FakeFile, Paths },
    '../offline/database': { openDatabase: () => database, initDatabase: async () => {}, saveDraft },
    '../store/auth': auth,
    './authApi': { passwordSessionIdentity: () => scope },
    './client': { apiClient: { defaults: { baseURL: 'https://test.local' } } },
    './uploads': { sha256HexOfBytes: async () => 'a'.repeat(64) },
    './crewApi': { ...crew, getFieldInspectionTaskDetailReal: async () => ({ data: task, etag: '"AAAAAAAAB9E="' }) },
    './crewRepairHistory': { readRepairHistory: async () => [] },
    './crewRepairDraft': {},
    '../components/ViewFinder': {},
  });
  const context = { actor, scope, environment: 'https://test.local', projectId: project, taskId };
  const cameraDraft = await field.captureFieldPhoto(context, 'file://camera.jpg', 'BEFORE', 'image/jpeg', { latitude: 10, longitude: 106 }, true);
  assert.equal(cameraDraft.captures.length, 1);
  assert.equal(cameraDraft.captures[0].capturedAt !== null, true);
  assert.deepEqual(cameraDraft.captures[0].coordinates, { latitude: 10, longitude: 106 });
  const galleryDraft = await field.captureFieldPhoto(context, 'file://gallery.png', 'BEFORE', 'image/png', { latitude: 10, longitude: 106 }, false);
  assert.equal(galleryDraft.captures.length, 2);
  assert.equal(galleryDraft.captures[1].capturedAt, null);
  assert.equal(galleryDraft.captures[1].coordinates, null);
  assert.equal(stored.captures.length, 2);

  const blockedTask = { ...task, status: 'Completed' };
  const blockedUuid = () => '77777777-7777-4777-8777-777777777777';
  const blockedField = loadCommonJs('src/api/crewFieldDraft.ts', {
    'expo-crypto': { randomUUID: blockedUuid },
    'expo-file-system': { Directory: FakeDirectory, File: FakeFile, Paths },
    '../offline/database': { openDatabase: () => database, initDatabase: async () => {}, saveDraft },
    '../store/auth': auth,
    './authApi': { passwordSessionIdentity: () => scope },
    './client': { apiClient: { defaults: { baseURL: 'https://test.local' } } },
    './uploads': { sha256HexOfBytes: async () => 'a'.repeat(64) },
    './crewApi': { ...crew, getFieldInspectionTaskDetailReal: async () => ({ data: blockedTask, etag: '"AAAAAAAAB9E="' }) },
    './crewRepairHistory': { readRepairHistory: async () => [] },
    './crewRepairDraft': {},
    '../components/ViewFinder': {},
  });
  await assert.rejects(() => blockedField.captureFieldPhoto(context, 'file://camera.jpg', 'BEFORE', 'image/jpeg', null, true), /Trạng thái nhiệm vụ/);
});
