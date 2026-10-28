const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
// Reuse the existing production-module harness without registering its test suite twice.
const prefix = fs.readFileSync(require.resolve('./t01.test.cjs'), 'utf8').split("test('restored user")[0];
const harness = new Function('require', '__dirname', prefix + '\nreturn harness;')(require, __dirname);
const input = { description: 'Private guest fixture', coords: null,
  photos: [{ uri: 'cache://private-guest.jpg', fileName: 'fixture.jpg', mediaType: 'image/jpeg', capturedAt: '2026-10-28T00:00:00Z' }] };
const settle = async () => { for (let n = 0; n < 5; n++) await new Promise(r => setImmediate(r)); };

test('RPT-01 unrelated Reporter cannot restore, bind or submit guest content; original bytes/key retained', async () => {
  const h = harness(), store = h.load('src/store/reporter.ts').useReporterStore;
  await store.getState().savePendingDraft(input);
  const durable = JSON.stringify([...h.rows]);
  h.login('REPORTER', 'unrelated');
  assert.equal(await store.getState().restorePendingDraft(), null);
  assert.equal(await store.getState().bindPendingDraft(), null);
  await assert.rejects(store.getState().submitPendingDraft());
  assert.deepEqual(h.calls, []);
  assert.equal(JSON.stringify([...h.rows]), durable);
});

for (const state of ['LOCAL_READY', 'SESSION_CREATED', 'UPLOADING', 'COMPLETE_REQUESTED', 'VERIFYING', 'VERIFIED', 'FAILED', 'UNKNOWN_OUTCOME']) {
  test('RPT-02 durable ' + state + ' ledger cannot be physically removed', async () => {
    const h = harness(); h.login();
    const queue = h.load('src/store/uploads.ts').useUploadsStore;
    await queue.getState().hydrate();
    const id = await queue.getState().enqueuePhoto({ uriLocal: input.photos[0].uri, fileName: 'fixture.jpg', mediaType: 'image/jpeg', sizeBytes: 3, checksumSha256: 'fixture-checksum' });
    const row = h.rows.get(id);
    Object.assign(row, { media_state: state, upload_id: 'fixture-upload', file_id: 'fixture-file', session_version: 'fixture-version', part_etags: '{"1":"fixture-etag"}' });
    const durable = JSON.stringify(row);
    queue.setState({ items: queue.getState().items.map(item => ({ ...item, mediaState: state })) });
    await queue.getState().removeItem(id);
    assert.equal(JSON.stringify(h.rows.get(id)), durable);
    assert.equal(queue.getState().items.length, 1);
    await queue.getState().hydrate();
    assert.equal(queue.getState().items[0].id, id);
  });
}
