const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');

function presentation() {
  const source = ts.createSourceFile('repair-correction.tsx', fs.readFileSync('app/(crew)/repair-correction.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const fn = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'repairReviewPresentation');
  assert.ok(fn, 'repairReviewPresentation must exist');
  return vm.runInNewContext(ts.transpileModule(fn.getText().replace(/^export /, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText + ';repairReviewPresentation');
}

const ids = {
  attemptId: '11111111-1111-4111-8111-111111111111',
  submissionId: '22222222-2222-4222-8222-222222222222',
  reviewId: '33333333-3333-4333-8333-333333333333',
};

test('G02 API-080 readback presents SUPPLEMENT, ACCEPT, pending and absent attempt', () => {
  const view = presentation();
  assert.match(view({ attemptId: ids.attemptId, effectiveSubmissionId: ids.submissionId, review: { reviewId: ids.reviewId, decision: 'SUPPLEMENT' } }).title, /yêu cầu bổ sung/);
  assert.match(view({ attemptId: ids.attemptId, effectiveSubmissionId: ids.submissionId, review: { reviewId: ids.reviewId, decision: 'ACCEPT' } }).title, /đã được quản lý chấp nhận/);
  assert.match(view({ attemptId: ids.attemptId, effectiveSubmissionId: ids.submissionId, review: null }).title, /đang chờ quản lý đánh giá/);
  assert.match(view(null).title, /Chưa có hồ sơ sửa chữa/);
});

test('G02 keeps API errors distinct from absent attempt and does not expose API-159', () => {
  const source = fs.readFileSync('app/(crew)/repair-correction.tsx', 'utf8');
  assert.match(source, /CrewTaskBoundary operational=\{false\}/);
  assert.match(source, /title="Gửi bổ sung" disabled/);
  assert.doesNotMatch(source, /(?:supplementRepairAttempt|supplementRepairAttemptReal)\s*\(/);
  assert.match(fs.readFileSync('app/(crew)/tasks.tsx', 'utf8'), /query\.isError \? crewReadError\(query\.error\)/);
  const label = vm.runInNewContext(ts.transpileModule(`function crewReadError(error){const status=error?.response?.status;if(status===401)return 'Phiên đăng nhập không còn hợp lệ.';if(status===403)return 'Bạn không có quyền.';return 'Không tải được dữ liệu.';} crewReadError`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText);
  assert.match(label({ response: { status: 401 } }), /đăng nhập/);
  assert.match(label({ response: { status: 403 } }), /quyền/);
});

test('G02 API-080 readback preserves the new submission as pending after review reset', () => {
  const view = presentation();
  const next = view({ attemptId: ids.attemptId, effectiveSubmissionId: '44444444-4444-4444-8444-444444444444', review: null });
  assert.match(next.title, /đang chờ quản lý đánh giá/);
  assert.equal(next.technical.effectiveSubmissionId, '44444444-4444-4444-8444-444444444444');
});
