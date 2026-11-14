const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');

const ids = {
  task: '11111111-1111-4111-8111-111111111111',
  project: '22222222-2222-4222-8222-222222222222',
  assignment: '33333333-3333-4333-8333-333333333333',
  package: '44444444-4444-4444-8444-444444444444',
  item: '55555555-5555-4555-8555-555555555555',
  binding: '66666666-6666-4666-8666-666666666666',
  actor: '77777777-7777-4777-8777-777777777777',
};
const version = 'AAAAAAAAB/o=';
function extract(name) {
  const source = fs.readFileSync('src/api/crewApi.ts', 'utf8');
  const sf = ts.createSourceFile('crewApi.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const fn = sf.statements.find(n => (ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n)) && n.name?.text === name);
  assert.ok(fn, `${name} must exist`);
  const text = fn.getText().replace(/^export /, '').replace(/^async /, '');
  const scope = {
    isCrewResourceId: v => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
    isRepairItemVersion: v => typeof v === 'string' && /^[A-Za-z0-9+/]{10}[AEIMQUYcgkosw048]=$/.test(v),
  };
  if (name === 'fastTrackRepairBlock') scope.validateFastTrackRepairContext = extract('validateFastTrackRepairContext');
  return vm.runInNewContext(ts.transpileModule(text + `;${name}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText + `;${name}`, scope);
}
function context(overrides = {}) { return { packageId: ids.package, itemId: ids.item, bindingId: ids.binding, mode: 'FAST_TRACK', status: 'Assigned', itemVersion: version, repairPlan: 'conditional plan', checklistVersion: 'nd01-checklist', ...overrides }; }
function task(overrides = {}) { return { id: ids.task, projectId: ids.project, assignmentId: ids.assignment, assignedToUserId: ids.actor, version: 'AAAAAAAAB/E=', mode: 'CONDITIONAL_FT', repairContext: context(), ...overrides }; }

test('G03 validates a real FastTrack read context and keeps task/item versions separate', () => {
  const validate = extract('validateFastTrackRepairContext');
  assert.doesNotThrow(() => validate(task(), ids.project, ids.task, ids.actor));
  assert.throws(() => validate(task({ mode: 'NORMAL' }), ids.project, ids.task, ids.actor));
  assert.throws(() => validate(task({ repairContext: context({ mode: 'NORMAL' }) }), ids.project, ids.task, ids.actor));
  assert.throws(() => validate(task({ repairContext: context({ itemVersion: 'h4-eligibility-v1' }) }), ids.project, ids.task, ids.actor));
  assert.throws(() => validate(task({ repairContext: context({ bindingId: 'placeholder' }) }), ids.project, ids.task, ids.actor));
});

test('G03 FastTrack block is read-only and rejects missing context without inferring eligibility', () => {
  const block = extract('fastTrackRepairBlock');
  assert.equal(block(task(), ids.project, ids.task, ids.actor), null);
  assert.match(block(task({ repairContext: null }), ids.project, ids.task, ids.actor), /chưa có ngữ cảnh/i);
  assert.match(block(task({ repairContext: context({ mode: 'NORMAL' }) }), ids.project, ids.task, ids.actor), /không hợp lệ/i);
});

test('G03 detail mounts explicit online workflow only after validating FastTrack context', () => {
  const source = fs.readFileSync('app/(crew)/wo-detail.tsx', 'utf8');
  assert.match(source, /Sửa chữa nhanh, có điều kiện/);
  assert.match(source, /Phương án xử lý/);
  assert.match(source, /Phiên bản bộ kiểm tra/);
  assert.match(source, /Phiên bản hạng mục/);
  assert.match(source, /Chưa có ngữ cảnh sửa chữa nhanh hiện hành/);
  assert.match(source, /<NormalRepairBootstrap task=\{task\} stage="overview"/);
  assert.match(source, /chưa có đủ thông tin phân công hạng mục/i);
});

test('G03 does not replace task ETag with repair item version or add repair mutation', () => {
  const source = fs.readFileSync('src/hooks/useRepairBootstrap.ts', 'utf8');
  assert.match(source, /taskVersion: view\.version/);
  assert.match(source, /repairContext: view\.repairContext/);
  assert.match(source, /repair_execution_not_enabled/);
});
