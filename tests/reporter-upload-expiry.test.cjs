const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const prefix=fs.readFileSync(path.join(__dirname,'t01.test.cjs'),'utf8').split("test('restored user")[0];
const harness=new Function('require','__dirname',prefix+'\nreturn harness;')(require,__dirname);
async function setup(configure){const h=harness();h.login();configure?.(h);const store=h.load('src/store/uploads.ts').useUploadsStore;await store.getState().hydrate('reporter-actor');const id=await store.getState().enqueuePhoto({uriLocal:'cache://photo.jpg',fileName:'photo.jpg',mediaType:'image/jpeg',sizeBytes:3,checksumSha256:'a'.repeat(64)});return {h,store,id};}
test('expired URL for a later part replays exact key before rotating and preserves uploaded parts',async()=>{
 let requests=0,expiry;const {h,store,id}=await setup(h=>{h.transport.requestPartUrls=async(uploadId,body,key)=>{h.calls.push(['urls',body,key]);requests++;
  if(requests===2)throw {response:{status:409,data:{code:'upload_part_urls_expired',uploadId,partNumbers:body.partNumbers,expiresAt:expiry,serverTime:new Date().toISOString(),renewalAllowed:true,sessionStatus:'UPLOADING',reason:'receipt_expired'}}};
  expiry=new Date(Date.now()+(requests===1?80:60000)).toISOString();
  return {parts:body.partNumbers.map(n=>({partNumber:n,url:'signed',expiresAt:expiry}))};
 };const put=h.transport.putPart;h.transport.putPart=async(...args)=>{const result=await put(...args);if(args[0].partNumber===1)await new Promise(resolve=>setTimeout(resolve,Math.max(0,Date.parse(expiry)-Date.now())+5));return result;};});
 await store.getState().advanceItem(id);assert.equal(requests,3);assert.equal(store.getState().items[0].mediaState,'VERIFIED');assert.equal(h.calls.filter(c=>c[0]==='create').length,1);assert.deepEqual(h.calls.filter(c=>c[0]==='put').map(c=>c[1]),[[1,2],[3]]);
 const urls=h.calls.filter(c=>c[0]==='urls');assert.deepEqual(urls[0],urls[1]);assert.notEqual(urls[1][2],urls[2][2]);
 assert.equal(JSON.parse(store.getState().items[0].partETags._urlsHistory)[0].key,urls[0][2]);
});
test('storage rejection remains retryable and never means Reporter permission denied',async()=>{
 const {h,store,id}=await setup(h=>{h.transport.putPart=async()=>{throw {code:'ERR_BAD_REQUEST',response:{status:403}};};});await store.getState().advanceItem(id);const item=store.getState().items[0];assert.notEqual(item.mediaState,'FAILED');assert.equal(item.lastErrorStage,'upload_put');assert.doesNotMatch(item.lastErrorMessage,/không có quyền/);
 const label=h.load('src/store/reporter.ts').reporterFailureMessage({code:'ERR_BAD_REQUEST',status:403,stage:'upload_put'});assert.doesNotMatch(label,/không có quyền/);
});
test('legacy local FAILED from storage 403 recovers only after matching open session readback',async()=>{
 let first=true;const {h,store,id}=await setup(h=>{const put=h.transport.putPart;h.transport.putPart=async(...args)=>{if(first){first=false;throw {code:'ERR_BAD_REQUEST',response:{status:403}};}return put(...args);};});await store.getState().advanceItem(id);
 store.setState({items:store.getState().items.map(i=>({...i,mediaState:'FAILED'}))});await store.getState().retryItem(id);assert.equal(store.getState().items[0].mediaState,'VERIFIED');assert.equal(h.calls.filter(c=>c[0]==='create').length,1);assert.ok(h.calls.some(c=>c[0]==='session'));
});
for(const session of [{id:'wrong',fileId:'file',status:'UPLOADING'},{id:'session',fileId:'wrong',status:'UPLOADING'},{id:'session',fileId:'file',status:'FAILED'},{id:'session',fileId:'file',status:'UPLOADING',expiresAt:'2000-01-01T00:00:00Z'}])test('legacy storage rejection cannot resume mismatched, failed or expired session '+JSON.stringify(session),async()=>{
 const {h,store,id}=await setup(h=>{h.transport.putPart=async()=>{throw {code:'ERR_BAD_REQUEST',response:{status:403}};};h.transport.getSession=async()=>session;});await store.getState().advanceItem(id);store.setState({items:store.getState().items.map(i=>({...i,mediaState:'FAILED'}))});
 const before=h.calls.filter(c=>c[0]==='create'||c[0]==='urls'||c[0]==='complete').length;await store.getState().retryItem(id);assert.equal(store.getState().items[0].mediaState,'FAILED');assert.equal(h.calls.filter(c=>c[0]==='create'||c[0]==='urls'||c[0]==='complete').length,before);
});

test('a locally expired capability without server proof cannot rotate, send bytes or complete',async()=>{
 const {h,store,id}=await setup(h=>{h.transport.requestPartUrls=async(_,body,key)=>{h.calls.push(['urls',body,key]);return {parts:body.partNumbers.map(partNumber=>({partNumber,url:'expired',expiresAt:'2000-01-01T00:00:00Z'}))};};});
 await store.getState().advanceItem(id);
 const urls=h.calls.filter(c=>c[0]==='urls');assert.equal(urls.length,2);assert.deepEqual(urls[0],urls[1]);
 assert.equal(h.calls.filter(c=>c[0]==='put'||c[0]==='complete').length,0);
 assert.equal(store.getState().items[0].lastErrorCode,'upload_storage_unavailable');
 assert.notEqual(store.getState().items[0].mediaState,'VERIFIED');
});
