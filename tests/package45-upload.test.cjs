const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const prefix = fs.readFileSync(require.resolve('./t01.test.cjs'), 'utf8').split("test('restored user")[0];
const harness = new Function('require', '__dirname', prefix + '\nreturn harness;')(require, __dirname);
async function fixture() {
  const h = harness(); h.login();
  const mod = h.load('src/store/uploads.ts'), q = mod.useUploadsStore;
  await q.getState().hydrate();
  const id = await q.getState().enqueuePhoto({ uriLocal: 'cache://photo.jpg', fileName: 'photo.jpg', mediaType: 'image/jpeg', sizeBytes: 3,
    checksumSha256: require('node:crypto').createHash('sha256').update(Buffer.from([1,2,3])).digest('hex') });
  return { h, mod, q, id };
}
test('upload FAILED recovery reads real metadata, retains identity and never resends a rejected mutation', async () => {
  const { h, mod, q, id } = await fixture();
  q.setState({ items: q.getState().items.map(i => ({ ...i, mediaState: 'FAILED', uploadId: 'session', fileId: 'file', sessionVersion: 'frozen', partETags: { 1: 'original' } })) });
  await q.getState().retryItem(id);
  const item = q.getState().items[0];
  assert.equal(item.mediaState, 'VERIFIED');
  assert.equal(item.sessionVersion, 'frozen'); assert.deepEqual(item.partETags, { 1: 'original' });
  assert.deepEqual(h.calls.map(c => c[0]), ['metadata']);
  assert.equal(h.rows.get(id).verified_version, 'fv');
});
test('FAILED metadata pending or terminal remains blocked without fabricating completion', async () => {
  for (const status of ['PENDING', 'FAILED']) {
    const { h, mod, q, id } = await fixture();
    const original = mod.uploadTransport.getFileMetadata;
    mod.uploadTransport.getFileMetadata = async () => ({ ...await original(), status });
    q.setState({ items: q.getState().items.map(i => ({ ...i, mediaState: 'FAILED', fileId: 'file' })) });
    await q.getState().retryItem(id);
    assert.equal(q.getState().items[0].mediaState, 'FAILED');
    assert.deepEqual(h.calls.map(c => c[0]), ['metadata']);
  }
});
test('foreground observation never replays an uncertain upload completion', async () => {
  const { h, mod, q, id } = await fixture();
  const original = mod.uploadTransport.getFileMetadata;
  mod.uploadTransport.getFileMetadata = async () => ({ ...await original(), status: 'PENDING' });
  q.setState({ items: q.getState().items.map(i => ({ ...i, mediaState: 'COMPLETE_REQUESTED', uploadId: 'session', fileId: 'file', sessionVersion: 'frozen', partETags: { 1: 'a', 2: 'b' } })) });
  await q.getState().advanceAll('observe');
  assert.deepEqual(h.calls.map(c => c[0]), ['metadata']);
  assert.equal(q.getState().items[0].sessionVersion, 'frozen');
  assert.equal(h.rows.get(id).part_etags, '{"1":"a","2":"b"}');
});
test('FAILED reconciliation late response cannot appear in another actor session', async () => {
  const { h, mod, q, id } = await fixture();
  const original = mod.uploadTransport.getFileMetadata;
  mod.uploadTransport.getFileMetadata = async () => { const result = await original(); h.login('REPORTER', 'other'); return result; };
  q.setState({ items: q.getState().items.map(i => ({ ...i, mediaState: 'FAILED', fileId: 'file' })) });
  await q.getState().retryItem(id);
  assert.deepEqual(q.getState().items, []);
  assert.equal(h.rows.get(id).verified_version, null);
});
test('upload progress measures acknowledged bytes including partial last part', async () => {
  const { mod, q } = await fixture();
  assert.equal(mod.uploadedRatio({ ...q.getState().items[0], partSizeBytes: 2, partETags: { 1: 'etag' } }), 2 / 3);
});
const { screen } = require('./helpers/roadfe-screen.cjs');
test('retained failed ledger does not prevent adding replacement or selecting verified evidence', async () => {
  const s = screen('app/(reporter)/capture.tsx', { library: async () => ({ canceled: false, assets: [{ uri: 'new.jpg', fileName: 'new.jpg', mimeType: 'image/jpeg' }] }) });
  s.h.login();
  for (let i = 0; i < 3; i++) {
    const id = await s.uploads.useUploadsStore.getState().enqueuePhoto({ uriLocal: `old-${i}.jpg`, fileName: 'old.jpg', mediaType: 'image/jpeg', sizeBytes: 3, checksumSha256: 'a'.repeat(64) });
    s.h.rows.get(id).media_state = 'FAILED';
  }
  const before = JSON.stringify([...s.h.rows]);
  s.render(); await s.flush();
  assert.ok(s.nodes().some(n => n.props?.testID === 'capture-pick-photo'));
  await s.tap('capture-pick-photo'); await s.flush();
  assert.equal(s.uploads.useUploadsStore.getState().items.length, 4);
  assert.equal(JSON.stringify([...s.h.rows].slice(0, 3)), before);
});
