const test=require('node:test'),assert=require('node:assert/strict');
const {mediaRuntime,jpeg,png}=require('./helpers/reporter-media.cjs');
const asset={uri:'file://cache/source.jpg',fileName:'source.jpg',mediaType:'image/jpeg',capturedAt:'2026-10-31T00:00:00.000Z'};
test('B2 admission preserves verified bytes in private final file before returning metadata',async()=>{
 const r=mediaRuntime();r.files.set(asset.uri,jpeg);const p=await r.load().preserveReporterPhoto(asset,()=>true);
 assert.match(p.uri,/^file:\/\/private\/documents\/reporter-photos-v1\/[a-f0-9-]+\.jpg$/);
 assert.deepEqual(r.files.get(p.uri),jpeg);assert.equal(p.capturedAt,asset.capturedAt);assert.equal(p.sizeBytes,jpeg.length);
 assert.equal(p.checksumSha256,require('node:crypto').createHash('sha256').update(jpeg).digest('hex'));
 assert.ok(r.files.has(asset.uri));assert.equal(r.events.at(-1),'hash');
});
for(const [name,bytes,meta,code] of [
 ['PNG',png,{fileName:'x.png',mediaType:'image/png'},null],
 ['HEIC',jpeg,{fileName:'x.heic',mediaType:'image/heic'},'photo_type_invalid'],
 ['WebP',Uint8Array.from([82,73,70,70]),{fileName:'x.webp',mediaType:'image/webp'},'photo_type_invalid'],
 ['empty',new Uint8Array(),{},'photo_size_invalid'],
 ['false MIME',jpeg,{mediaType:'image/png'},'photo_type_invalid'],
 ['false extension',jpeg,{fileName:'x.png'},'photo_type_invalid'],
 ['invalid magic',Uint8Array.from([1,2,3]),{},'photo_type_invalid'],
]) test('B2 admission '+name,async()=>{
 const r=mediaRuntime();r.files.set(asset.uri,bytes);const promise=r.load().preserveReporterPhoto({...asset,...meta},()=>true);
 if(code){await assert.rejects(promise,e=>e.code===code);assert.ok(!r.events.includes('write'));}else assert.equal((await promise).mediaType,'image/png');
});
test('B2 size precheck rejects oversized file without allocating bytes',async()=>{
 const r=mediaRuntime({size:20*1024*1024+1});r.files.set(asset.uri,jpeg);
 await assert.rejects(r.load().preserveReporterPhoto(asset,()=>true),e=>e.code==='photo_size_invalid');assert.deepEqual(r.events,[]);
});
for(const fail of ['read','directory','write','move']) test('B2 '+fail+' failure never admits partial file and retains source',async()=>{
 const r=mediaRuntime({fail});r.files.set(asset.uri,jpeg);
 await assert.rejects(r.load().preserveReporterPhoto(asset,()=>true),e=>e.code===('photo_'+(fail==='directory'?'write':fail)+'_failed'));
 assert.ok(r.files.has(asset.uri));assert.ok(![...r.files.keys()].some(k=>k.includes('reporter-photos-v1')&&!k.endsWith('.partial')));
});
test('B2 corrupt partial rejected by checksum; source remains',async()=>{
 const r=mediaRuntime({corrupt:true});r.files.set(asset.uri,png);
 await assert.rejects(r.load().preserveReporterPhoto({...asset,fileName:'source.png',mediaType:'image/png'},()=>true),e=>e.code==='photo_copy_mismatch');
 assert.ok(r.files.has(asset.uri));
});
for(const step of ['read','hash']) test('B2 late '+step+' after scope invalidation cannot return owned media',async()=>{
 let current=true;const r=mediaRuntime({[step]:async()=>{current=false;}});r.files.set(asset.uri,jpeg);
 await assert.rejects(r.load().preserveReporterPhoto(asset,()=>current),e=>e.code==='photo_context_changed');assert.ok(!r.events.includes('write'));
});
