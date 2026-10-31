const test = require('node:test');
const assert = require('node:assert/strict');
const {screen, deferred} = require('./helpers/roadfe-screen.cjs');
const {mediaRuntime, png, jpeg} = require('./helpers/reporter-media.cjs');
const source = {uri:'content://test-provider/document/photo',fileName:'photo.png',mediaType:'image/png',capturedAt:'2026-10-31T00:00:00Z'};

test('B2.1 actual library handler reads granted content URI rather than inaccessible Expo Go global cache', async () => {
  const r = mediaRuntime(); r.files.set(source.uri, png);
  let options;
  const s = screen('app/(reporter)/report.tsx', {pick:async o => {
    options=o;
    return {canceled:false,assets:[{uri:o.copyToCacheDirectory?'file://host-global-cache/photo.png':source.uri,name:'photo.png',mimeType:'image/png',size:png.length}]};
  }, modules:{'../../src/api/reporterLocalMedia':r.load()}});
  s.render(); await s.flush(); await s.tap('pick-photo'); await s.flush();
  assert.equal(options.copyToCacheDirectory,false);
  const photo=s.reporter.useReporterStore.getState().pendingDraft?.photos[0];
  assert.ok(photo?.uri.includes('/documents/reporter-photos-v1/'));
  assert.deepEqual(r.files.get(photo.uri),png); assert.equal(s.h.calls.length,0); s.unmount();
});

test('B2.1 admission awaits asynchronous native move before checking private final and returning', async () => {
  const r=mediaRuntime(); r.files.set(source.uri,png);
  const Base=r.modules['expo-file-system'].File, gate=deferred();
  r.modules['expo-file-system'].File=class extends Base {async move(to){await gate.promise;super.move(to);}};
  let settled=false;
  const result=r.load().preserveReporterPhoto(source,()=>true).then(p=>{settled=true;return p;});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(settled,false); gate.resolve();
  const photo=await result; assert.deepEqual(r.files.get(photo.uri),png);
});

test('B2.1 read permission denied is distinct from a proven missing source', async () => {
  const r=mediaRuntime(); const Base=r.modules['expo-file-system'].File;
  r.modules['expo-file-system'].File=class extends Base {
    get exists(){return false;}
    info(){throw Object.assign(Error('read permission denied at sensitive native URI'),{code:'ERR_INVALID_PERMISSION'});}
  };
  await assert.rejects(r.load().preserveReporterPhoto(source,()=>true),e=>e.code==='photo_permission_denied'&&!JSON.stringify(e).includes('sensitive'));
  assert.ok(!r.events.includes('write'));
});

test('B2.1 invalid URI is rejected before native IO', async () => {
  const r=mediaRuntime();
  await assert.rejects(r.load().preserveReporterPhoto({...source,uri:'https://invalid.test/photo.png'},()=>true),e=>e.code==='photo_uri_invalid');
  assert.deepEqual(r.events,[]);
});

test('B2.1 missing source and native read exception retain distinct safe errors', async () => {
  const missing=mediaRuntime();
  await assert.rejects(missing.load().preserveReporterPhoto(source,()=>true),e=>e.code==='photo_source_missing');
  const unreadable=mediaRuntime({fail:'read'}); unreadable.files.set(source.uri,png);
  await assert.rejects(unreadable.load().preserveReporterPhoto(source,()=>true),e=>e.code==='photo_read_failed');
  assert.deepEqual(unreadable.files.get(source.uri),png);
  assert.ok(!missing.events.includes('write')&&!unreadable.events.includes('write'));
});

test('B2.1 rejected native move never admits a photo and retains source and partial', async () => {
  const r=mediaRuntime(); r.files.set(source.uri,png);
  const Base=r.modules['expo-file-system'].File;
  r.modules['expo-file-system'].File=class extends Base {async move(){throw Error('native move failure');}};
  await assert.rejects(r.load().preserveReporterPhoto(source,()=>true),e=>e.code==='photo_move_failed');
  assert.deepEqual(r.files.get(source.uri),png);
  assert.equal([...r.files.keys()].filter(k=>k.endsWith('.partial')).length,1);
});

test('B2.1 context switch during native move prevents late admission and preserves files', async () => {
  const r=mediaRuntime(); r.files.set(source.uri,jpeg); let current=true;
  const Base=r.modules['expo-file-system'].File, gate=deferred();
  r.modules['expo-file-system'].File=class extends Base {async move(to){await gate.promise;super.move(to);}};
  const result=r.load().preserveReporterPhoto({...source,fileName:'photo.jpg',mediaType:'image/jpeg'},()=>current);
  const rejected=assert.rejects(result,e=>e.code==='photo_context_changed');
  await new Promise(resolve=>setImmediate(resolve));current=false;gate.resolve();await rejected;
  assert.deepEqual(r.files.get(source.uri),jpeg);
  assert.equal([...r.files.keys()].filter(k=>k.endsWith('.jpg')).length,1);
});
