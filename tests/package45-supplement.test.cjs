const { test } = require('node:test');
const assert = require('node:assert/strict');
const { harness, screen } = require('./helpers/roadfe-screen.cjs');
async function fixture() {
  const h = harness(); h.login(); const st = h.load('src/store/reporter.ts').useReporterStore;
  await st.getState().savePendingDraft({ description: 'Additional damage', photos: [{ uri: 'a.jpg', fileName: 'a.jpg', mediaType: 'image/jpeg', capturedAt: '2026-10-29' }], coords: null, targetReportId: 'report', ifMatch: 'v1' });
  return { h, st };
}
test('supplement definitive first 412 supports explicit new command after fresh absent-evidence readback; old key/body remain archived', async () => {
  const { h, st } = await fixture();
  h.api.submitReportSupplementReal = async () => { throw { status: 412, code: 'concurrency_conflict' }; };
  await assert.rejects(st.getState().submitPendingDraft());
  const old = structuredClone(st.getState().pendingDraft);
  assert.equal(old.commandOutcome, 'REJECTED');
  h.api.getOwnReportReal = async () => ({ report: { id: 'report', evidence: [] }, etag: '"v2"' });
  const fresh = await st.getState().renewSupplementDraft();
  assert.notEqual(fresh.commandKey, old.commandKey); assert.equal(fresh.ifMatch, '"v2"');
  assert.equal(fresh.request, undefined); assert.deepEqual(fresh.photos, old.photos);
  const archived = [...h.rows.values()].filter(r => r.payload).map(r => JSON.parse(r.payload)).find(d => d.id === old.id && d.retired);
  assert.equal(archived.commandKey, old.commandKey); assert.deepEqual(archived.request, old.request);
  const restarted = harness({ rows: h.rows }); restarted.login();
  const loaded = await restarted.load('src/store/reporter.ts').useReporterStore.getState().restorePendingDraft();
  assert.equal(loaded.commandKey, fresh.commandKey);
});
for (const status of [409, 503]) test(`supplement ${status} cannot mint a new command`, async () => {
  const { h, st } = await fixture();
  h.api.submitReportSupplementReal = async () => { throw { status, code: 'concurrency_conflict' }; };
  await assert.rejects(st.getState().submitPendingDraft());
  const old = JSON.stringify(st.getState().pendingDraft);
  await assert.rejects(st.getState().renewSupplementDraft());
  assert.equal(JSON.stringify(st.getState().pendingDraft), old);
});
test('timeout then late 412 remains uncertain; no replacement key', async () => {
  const { h, st } = await fixture(); let first = true;
  h.api.submitReportSupplementReal = async () => { if (first) { first = false; throw { code: 'ERR_NETWORK' }; } throw { status: 412, code: 'concurrency_conflict' }; };
  await assert.rejects(st.getState().submitPendingDraft()); await assert.rejects(st.getState().submitPendingDraft());
  assert.equal(st.getState().pendingDraft.commandOutcome, 'UNKNOWN_OUTCOME');
  await assert.rejects(st.getState().renewSupplementDraft());
});
test('rejection recovery requires matching report, absent sent evidence and stable session across GET', async () => {
  for (const variant of ['wrong-id', 'present-evidence', 'actor-switch']) {
    const { h, st } = await fixture();
    h.api.submitReportSupplementReal = async () => { throw { status: 412, code: 'concurrency_conflict' }; };
    await assert.rejects(st.getState().submitPendingDraft());
    const old = JSON.stringify(st.getState().pendingDraft);
    h.api.getOwnReportReal = async () => {
      if (variant === 'actor-switch') h.login('REPORTER', 'B');
      return { report: { id: variant === 'wrong-id' ? 'other' : 'report', evidence: variant === 'present-evidence' ? st.getState().pendingDraft.request.evidence : [] }, etag: '"v2"' };
    };
    await assert.rejects(st.getState().renewSupplementDraft());
    if (variant !== 'actor-switch') assert.equal(JSON.stringify(st.getState().pendingDraft), old);
    assert.ok([...h.rows.values()].some(r => r.payload === old));
  }
});
test('supplement UI explicitly renews a proven rejection without sending the new command', async () => {
  const read = async () => ({ report: { id: 'fixture-report', evidence: [], createdAt: '2026-10-29' }, etag: '"v2"' });
  const s = screen('app/(reporter)/report-supplement.tsx', { api: { getOwnReportReal: read }, pick: async () => ({ canceled: false, assets: [{ uri: 'a.jpg', name: 'a.jpg', mimeType: 'image/jpeg' }] }) });
  s.h.login(); let posts = 0;
  s.h.api.submitReportSupplementReal = async () => { posts++; throw { status: 412, code: 'concurrency_conflict' }; };
  s.h.api.getOwnReportReal = async () => ({ ...await read(), etag: '"v3"' });
  s.render(); await s.flush(); s.input('Nội dung bổ sung', 'Additional damage'); await s.tap('pick-photo'); await s.flush();
  await s.press('Gửi bổ sung'); await s.flush();
  const old = s.reporter.useReporterStore.getState().pendingDraft.commandKey;
  await s.press('Tạo bản bổ sung mới để xem lại'); await s.flush();
  assert.match(JSON.stringify(s.nodes()), /Đã lưu bản bổ sung mới/);
  assert.equal(posts, 1); assert.notEqual(s.reporter.useReporterStore.getState().pendingDraft.commandKey, old);
});
