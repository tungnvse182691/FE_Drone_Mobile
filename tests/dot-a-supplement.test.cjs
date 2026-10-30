const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const vm = require('node:vm'), ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');
const { harness, screen } = require('./helpers/roadfe-screen.cjs');
const input = { description: 'Supplement fixture', photos: [{ uri: 'a.jpg', fileName: 'a.jpg', mediaType: 'image/jpeg', capturedAt: '2026-10-30' }], coords: null, targetReportId: 'report', ifMatch: '"v1"' };
async function fixture(h = harness()) {
  h.login(); const st = h.load('src/store/reporter.ts').useReporterStore;
  await st.getState().savePendingDraft(input); return { h, st };
}
for (const [status, code, outcome] of [
  [409, 'idempotency_key_reused', 'UNKNOWN_OUTCOME'], [409, 'source_not_ready', 'UNKNOWN_OUTCOME'],
  [412, 'concurrency_conflict', 'REJECTED'], [412, 'source_not_ready', 'UNKNOWN_OUTCOME'],
  [428, 'precondition_required', 'UNKNOWN_OUTCOME'], [403, 'access_forbidden', 'UNKNOWN_OUTCOME'],
  [404, 'not_found', 'UNKNOWN_OUTCOME'], [503, 'internal_error', 'UNKNOWN_OUTCOME'],
]) test(`A3 ${status}/${code} retains immutable supplement and distinguishes only proven first rejection`, async () => {
  const { h, st } = await fixture(); const sends = [];
  h.api.submitReportSupplementReal = async (...args) => { sends.push(structuredClone(args)); throw { response: { status, data: { code } } }; };
  await assert.rejects(st.getState().submitPendingDraft());
  const old = structuredClone(st.getState().pendingDraft);
  assert.equal(old.commandOutcome, outcome);
  if (outcome !== 'REJECTED') {
    await assert.rejects(st.getState().renewSupplementDraft());
    await assert.rejects(st.getState().submitPendingDraft());
    assert.deepEqual(sends[0], sends[1]);
  }
  assert.equal(st.getState().pendingDraft.commandKey, old.commandKey);
  assert.deepEqual(st.getState().pendingDraft.request, old.request);
  assert.equal(st.getState().pendingDraft.ifMatch, old.ifMatch);
});

for (const failure of [{ status: 409, code: 'source_not_ready' }, { status: 412, code: 'concurrency_conflict' }, { code: 'ERR_NETWORK' }])
test(`A3 restored unknown and ${failure.code} UI never claim definitive rejection or unsent command`, async () => {
  const read = async () => ({ report: { id: 'fixture-report', evidence: [{ fileId: 'file', fileVersion: 'fv' }], createdAt: '2026-10-30' }, etag: '"v1"' });
  const s = screen('app/(reporter)/report-supplement.tsx', { api: { getOwnReportReal: read }, pick: async () => ({ canceled: false, assets: [{ uri: 'a.jpg', name: 'a.jpg', mimeType: 'image/jpeg' }] }) });
  s.h.login(); let sends = 0;
  s.h.api.submitReportSupplementReal = async () => { sends++; throw { code: 'ERR_NETWORK' }; };
  s.render(); await s.flush(); s.input('Nội dung bổ sung', 'Supplement fixture'); await s.tap('pick-photo'); await s.flush();
  await s.press('Gửi bổ sung'); await s.flush();
  const old = structuredClone(s.reporter.useReporterStore.getState().pendingDraft);
  assert.match(JSON.stringify(s.nodes()), /Kết quả gửi chưa được xác nhận/);
  s.h.api.submitReportSupplementReal = async () => { sends++; throw failure; };
  await s.press('Gửi bổ sung'); await s.flush();
  const ui = JSON.stringify(s.nodes());
  assert.match(ui, /đã giữ lệnh/i); assert.doesNotMatch(ui, /Phát hiện xung đột phiên bản|Chưa gửi phản ánh/);
  assert.ok(!s.nodes().some(n => n.props?.title === 'Tạo bản bổ sung mới để xem lại'));
  await s.press('Tải bản mới nhất'); await s.flush();
  assert.match(JSON.stringify(s.nodes()), /không xác nhận kết quả lệnh/);
  assert.equal(sends, 2); assert.deepEqual(s.reporter.useReporterStore.getState().pendingDraft, old);
  s.unmount();
  const restored = screen('app/(reporter)/report-supplement.tsx', { rows: s.h.rows, api: { getOwnReportReal: read } });
  restored.h.login(); restored.render(); await restored.flush();
  assert.match(JSON.stringify(restored.nodes()), /Kết quả gửi chưa được xác nhận/);
  assert.equal(restored.h.calls.some(c => c[0] === 'supplement' || c[0] === 'report'), false);
  assert.equal(sends, 2); restored.unmount();
});

test('A3 POST response for a different report cannot become a correlated supplement receipt', async () => {
  const { h, st } = await fixture();
  h.api.submitReportSupplementReal = async () => ({ report: { id: 'other-report' } });
  h.api.getOwnReportReal = async id => ({ report: { id, evidence: st.getState().pendingDraft.request.evidence } });
  await assert.rejects(st.getState().submitPendingDraft());
  assert.equal(st.getState().pendingDraft.resultReportId, undefined);
  assert.equal(st.getState().pendingDraft.commandOutcome, 'UNKNOWN_OUTCOME');
});

test('A3 previously saved result for another report cannot retire the original supplement on GET', async () => {
  const { h, st } = await fixture();
  h.api.submitReportSupplementReal = async () => { throw { code: 'ERR_NETWORK' }; };
  await assert.rejects(st.getState().submitPendingDraft());
  // Seed only this isolated fixture with an old incorrectly correlated response.
  const row = [...h.rows.values()].find(r => r.payload && JSON.parse(r.payload).targetReportId === 'report');
  const saved = JSON.parse(row.payload); saved.resultReportId = 'other-report'; row.payload = JSON.stringify(saved);
  h.api.getOwnReportReal = async id => ({ report: { id, evidence: saved.request.evidence } });
  await assert.rejects(st.getState().submitPendingDraft());
  assert.equal(st.getState().pendingDraft.retired, undefined);
  assert.equal(row.payload, JSON.stringify(saved));
});

function diskHarness(file) {
  const native = new DatabaseSync(file);
  const db = { execAsync: async sql => native.exec(sql), getAllAsync: async (sql, ...args) => native.prepare(sql).all(...args),
    getFirstAsync: async (sql, ...args) => native.prepare(sql).get(...args) ?? null,
    runAsync: async (sql, ...args) => native.prepare(sql).run(...args) };
  const m = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/offline/database.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
    { module: m, exports: m.exports, require: () => ({ openDatabaseSync: () => db }), Date });
  return { h: harness({ db, modules: { '../offline/database': m.exports } }), native };
}
test('A3 disk reopen preserves unknown command; GET matching evidence and new actor/session do not retire it', async () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'roadfe-a3-')), 'fixture.db');
  let f = diskHarness(file), { h, st } = await fixture(f.h);
  h.api.submitReportSupplementReal = async () => { throw { code: 'ERR_NETWORK' }; };
  await assert.rejects(st.getState().submitPendingDraft());
  const old = structuredClone(st.getState().pendingDraft);
  const rows = f.native.prepare('SELECT * FROM local_draft ORDER BY id').all(); f.native.close();
  f = diskHarness(file); h = f.h; h.login('REPORTER', 'other'); st = h.load('src/store/reporter.ts').useReporterStore;
  assert.equal(await st.getState().restorePendingDraft(), null);
  h.changeAuth({ status: 'AUTHENTICATED', user: { id: 'actor', role_code: 'REPORTER' }, token: h.jwt('actor', 'new-session') });
  assert.equal(await st.getState().restorePendingDraft(), null);
  h.login(); assert.deepEqual(structuredClone(await st.getState().restorePendingDraft()), old);
  let reads = 0, posts = 0;
  h.api.getOwnReportReal = async () => { reads++; return { report: { id: 'report', evidence: old.request.evidence }, etag: '"v2"' }; };
  await assert.rejects(st.getState().renewSupplementDraft());
  assert.equal(reads, 0); // UNKNOWN cannot even enter renewal readback.
  h.api.submitReportSupplementReal = async (...args) => { posts++; assert.deepEqual(structuredClone(args), ['report', old.request, old.commandKey, old.ifMatch]); throw { status: 412, code: 'concurrency_conflict' }; };
  await assert.rejects(st.getState().submitPendingDraft());
  assert.equal(posts, 1); assert.equal(st.getState().pendingDraft.commandOutcome, 'UNKNOWN_OUTCOME');
  const immutable = values => values.map(({ id, kind, payload }) => ({ id, kind, payload }));
  assert.deepEqual(immutable(f.native.prepare('SELECT * FROM local_draft ORDER BY id').all()), immutable(rows));
  f.native.close();
});
