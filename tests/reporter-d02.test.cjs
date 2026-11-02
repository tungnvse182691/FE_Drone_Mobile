const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness,deferred}=require('./helpers/roadfe-screen.cjs');
const input={description:'QA verification',photos:[{uri:'file://qa.png',fileName:'qa.png',mediaType:'image/png',capturedAt:'2026-11-02T00:00:00Z'}],coords:null,submitRequested:true};
function setup(opts={}){
 let time=0;const sleeps=[];let h;
 const real=harness().load('src/store/reporterVerification.ts');
 h=harness({modules:{'./reporterVerification':{...real,waitForReporterVerification:(options)=>real.waitForReporterVerification({...options,clock:{now:()=>time,sleep:async ms=>{sleeps.push(ms);time+=ms;}}})}, ...(opts.modules??{})}});
 h.login();const store=h.load('src/store/reporter.ts').useReporterStore;
 const uploads=h.load('src/store/uploads.ts');
 uploads.uploadTransport.getFileMetadata=(...args)=>h.transport.getFileMetadata(...args);
 return {h,sleeps,store,uploads};
}
test('D02 one explicit submit observes pending with bounded GET backoff, then dispatches and reads back once',async()=>{
 const {h,sleeps,store}=setup();const metadata=h.transport.getFileMetadata;let reads=0;
 h.transport.getFileMetadata=async()=>({...await metadata(),status:++reads<4?'VERIFYING':'VERIFIED'});
 await store.getState().savePendingDraft(input);const progress=[];
 assert.equal(await store.getState().submitPendingDraft({onProgress:p=>progress.push(p.phase)}),'report');
 assert.ok(sleeps.length>=2);assert.ok(sleeps.every(ms=>ms<=20000));assert.equal(h.calls.filter(c=>c[0]==='report').length,1);assert.equal(h.calls.filter(c=>c[0]==='complete').length,1);
 assert.ok(progress.includes('verifying'));assert.ok(progress.includes('submitting'));assert.ok(progress.includes('readback'));
});
test('D02 permanent pending times out without creating a report; retains immutable identity',async()=>{
 const {h,sleeps,store}=setup();const metadata=h.transport.getFileMetadata;h.transport.getFileMetadata=async()=>({...await metadata(),status:'VERIFYING'});
 await store.getState().savePendingDraft(input);const key=store.getState().pendingDraft.commandKey;
 await assert.rejects(store.getState().submitPendingDraft(),e=>e.code==='verification_timeout');
 assert.equal(h.calls.filter(c=>c[0]==='report').length,0);assert.ok(sleeps.length<=16);assert.equal(store.getState().pendingDraft.commandKey,key);assert.ok(store.getState().pendingDraft.photos[0].itemId);
});
for(const status of [401,403,412])test('D02 GET '+status+' stops polling without a report mutation',async()=>{
 const {h,store}=setup();h.transport.getFileMetadata=async()=>{throw {status,code:'fixture'};};await store.getState().savePendingDraft(input);
 await assert.rejects(store.getState().submitPendingDraft(),e=>e.status===status);assert.equal(h.calls.filter(c=>c[0]==='report').length,0);
});
test('D02 verification FAILED is distinct from waiting and no report is dispatched',async()=>{
 const {h,store}=setup();const metadata=h.transport.getFileMetadata;h.transport.getFileMetadata=async()=>({...await metadata(),status:'FAILED'});await store.getState().savePendingDraft(input);
 await assert.rejects(store.getState().submitPendingDraft(),e=>e.code==='upload_validation_failed');assert.equal(h.calls.filter(c=>c[0]==='report').length,0);
});
test('D02 leaving during GET cannot continue a submission, even if GET eventually verifies',async()=>{
 const {h,store}=setup();const d=deferred(),metadata=h.transport.getFileMetadata;let active=true;
 h.transport.getFileMetadata=async()=>{await d.promise;return metadata();};await store.getState().savePendingDraft(input);
 const promise=store.getState().submitPendingDraft({isCurrent:()=>active});await new Promise(r=>setImmediate(r));active=false;d.resolve();
 await assert.rejects(promise,e=>e.code==='submission_paused');assert.equal(h.calls.filter(c=>c[0]==='report').length,0);
});
test('D02 account switch while waiting cannot dispatch or update the new account',async()=>{
 const {h,store}=setup();const d=deferred(),metadata=h.transport.getFileMetadata;h.transport.getFileMetadata=async()=>{await d.promise;return metadata();};await store.getState().savePendingDraft(input);
 const promise=store.getState().submitPendingDraft();await new Promise(r=>setImmediate(r));h.login('REPORTER','other');d.resolve();await assert.rejects(promise);
 assert.equal(h.calls.filter(c=>c[0]==='report').length,0);assert.equal(store.getState().pendingDraft,null);
});
test('D02 background then foreground during GET never resumes a mutation',async()=>{
 let listener;const native={AppState:{currentState:'active',addEventListener:(_,fn)=>{listener=fn;return {remove(){listener=null;}};}}};
 const h=harness({modules:{'react-native':native}});h.login();
 const d=deferred(),metadata=h.transport.getFileMetadata;
 h.transport.getFileMetadata=async()=>{await d.promise;return metadata();};
 const store=h.load('src/store/reporter.ts').useReporterStore;await store.getState().savePendingDraft(input);
 const promise=store.getState().submitPendingDraft();await new Promise(r=>setImmediate(r));
 listener('background');listener('active');d.resolve();
 await assert.rejects(promise,e=>e.code==='submission_paused');
 assert.equal(h.calls.filter(c=>c[0]==='report').length,0);assert.ok(store.getState().pendingDraft);assert.equal(listener,null);
});
test('D02 0 photos rejects with validation_error and never calls report mutation',async()=>{
 const {h,store}=setup();
 await store.getState().savePendingDraft({...input,photos:[]});
 await assert.rejects(store.getState().submitPendingDraft(),e=>e.code==='validation_error'&&e.status===400);
 assert.equal(h.calls.filter(c=>c[0]==='report').length,0);
});
test('D02 1, 2, and 3 photos are verified and bound to report request evidence',async()=>{
 for(const count of [1,2,3]){
  const {h,store}=setup();
  const photos=Array.from({length:count},(_,i)=>({uri:`file://photo_${i}.png`,fileName:`photo_${i}.png`,mediaType:'image/png',capturedAt:'2026-11-02T00:00:00Z'}));
  await store.getState().savePendingDraft({...input,photos});
  const reportId=await store.getState().submitPendingDraft();
  assert.equal(reportId,'report');
  const reportCalls=h.calls.filter(c=>c[0]==='report');
  assert.equal(reportCalls.length,1);
  assert.equal(reportCalls[0][1].evidence.length,count);
 }
});
test('D02 local photo missing rejects with local_photo_missing and retains draft identity',async()=>{
 class MissingFile{constructor(uri){this.uri=uri;this.exists=false;}info(){return {exists:false};}}
 const {h,store}=setup({modules:{'expo-file-system':{File:MissingFile}}});
 await store.getState().savePendingDraft(input);const key=store.getState().pendingDraft.commandKey;
 await assert.rejects(store.getState().submitPendingDraft(),e=>e.code==='local_photo_missing'&&e.stage==='local_read');
 assert.equal(h.calls.filter(c=>c[0]==='report').length,0);
 assert.equal(store.getState().pendingDraft.commandKey,key);
});
test('D02 local photo unreadable rejects with local_photo_read_failed and retains draft',async()=>{
 class UnreadableFile{constructor(uri){this.uri=uri;this.exists=true;}info(){return {exists:true};}async arrayBuffer(){throw new Error('EIO: i/o error reading file');}}
 const {h,store}=setup({modules:{'expo-file-system':{File:UnreadableFile}}});
 await store.getState().savePendingDraft(input);const key=store.getState().pendingDraft.commandKey;
 await assert.rejects(store.getState().submitPendingDraft(),e=>e.code==='local_photo_read_failed'&&e.stage==='local_read');
 assert.equal(h.calls.filter(c=>c[0]==='report').length,0);
 assert.equal(store.getState().pendingDraft.commandKey,key);
});
test('D02 complete upload does not imply VERIFIED; polling must confirm before report mutation',async()=>{
 const {h,store}=setup();const metadata=h.transport.getFileMetadata;let reads=0;let checkedBeforeVerified=false;
 h.transport.getFileMetadata=async()=>{
  reads++;const meta=await metadata();
  if(reads===1){
   assert.equal(h.calls.filter(c=>c[0]==='complete').length,1);
   assert.equal(h.calls.filter(c=>c[0]==='report').length,0,'Must NOT dispatch report upon complete alone');
   checkedBeforeVerified=true;
   return {...meta,status:'VERIFYING'};
  }
  return {...meta,status:'VERIFIED'};
 };
 await store.getState().savePendingDraft(input);
 const reportId=await store.getState().submitPendingDraft();
 assert.equal(reportId,'report');
 assert.ok(checkedBeforeVerified,'Must check pending status between complete and report dispatch');
 assert.equal(h.calls.filter(c=>c[0]==='report').length,1,'Dispatches report only after VERIFIED');
});
test('D02 upload part failure stops submission without dispatching report and preserves commandKey',async()=>{
 const {h,store,uploads}=setup();
 uploads.uploadTransport.requestPartUrls=async()=>{throw {code:'upload_urls_failed',status:500};};
 await store.getState().savePendingDraft(input);const key=store.getState().pendingDraft.commandKey;
 await assert.rejects(store.getState().submitPendingDraft(),e=>e.code==='upload_urls_failed');
 assert.equal(h.calls.filter(c=>c[0]==='report').length,0);
 assert.equal(store.getState().pendingDraft.commandKey,key);
});
test('D02 POST report network timeout retains frozen body and commandKey, does not auto-retry or mint new key',async()=>{
 const {h,store}=setup();let calls=0;
 h.api.submitReportReal=async(body,key)=>{calls++;throw {code:'ERR_NETWORK',stage:'submitReport'};};
 await store.getState().savePendingDraft(input);const key=store.getState().pendingDraft.commandKey;
 await assert.rejects(store.getState().submitPendingDraft(),e=>e.code==='ERR_NETWORK');
 assert.equal(calls,1,'Must attempt exactly once and not auto-retry');
 assert.equal(store.getState().pendingDraft.commandKey,key,'Must preserve identical commandKey');
 assert.ok(store.getState().pendingDraft.request,'Must preserve frozen request body');
});
for(const status of [401,403,409])test('D02 POST report '+status+' retains draft without creating duplicate mutation',async()=>{
 const {h,store}=setup();
 h.api.submitReportReal=async()=>{throw {status,code:'fixture_error'};};
 await store.getState().savePendingDraft(input);const key=store.getState().pendingDraft.commandKey;
 await assert.rejects(store.getState().submitPendingDraft(),e=>e.status===status);
 assert.equal(store.getState().pendingDraft.commandKey,key);
});
test('D02 supplement 412 records concurrency conflict without minting second command',async()=>{
 const {h,store}=setup();
 h.api.submitReportSupplementReal=async()=>{throw {status:412,code:'concurrency_conflict'};};
 await store.getState().savePendingDraft({...input,targetReportId:'rep-1',ifMatch:'"etag-1"'});
 const key=store.getState().pendingDraft.commandKey;
 await assert.rejects(store.getState().submitPendingDraft(),e=>e.status===412);
 assert.equal(store.getState().pendingDraft.commandKey,key);
 assert.equal(store.getState().pendingDraft.commandOutcome,'REJECTED');
 assert.equal(store.getState().pendingDraft.rejection?.code,'concurrency_conflict');
});
test('D02 GET readback failure preserves commandKey and resultReportId for reconciliation',async()=>{
 const {h,store}=setup();
 h.api.getOwnReportReal=async()=>{throw {code:'ERR_READBACK_TIMEOUT',status:504};};
 await store.getState().savePendingDraft(input);const key=store.getState().pendingDraft.commandKey;
 await assert.rejects(store.getState().submitPendingDraft(),e=>e.stage==='readback');
 assert.equal(h.calls.filter(c=>c[0]==='report').length,1);
 assert.equal(store.getState().pendingDraft.commandKey,key);
 assert.equal(store.getState().pendingDraft.resultReportId,'report');
 assert.equal(store.getState().pendingDraft.retired,undefined,'Must not retire draft until readback succeeds');
});
test('D02 GET readback with un-correlated evidence rejects with source_not_ready and does not confirm',async()=>{
 const {h,store}=setup();
 h.api.getOwnReportReal=async(id)=>({report:{id,evidence:[{fileId:'unrelated_file',fileVersion:'wrong_version'}]}});
 await store.getState().savePendingDraft(input);const key=store.getState().pendingDraft.commandKey;
 await assert.rejects(store.getState().submitPendingDraft(),e=>e.code==='source_not_ready'&&e.stage==='readback');
 assert.equal(store.getState().pendingDraft.commandKey,key);
 assert.notEqual(store.getState().pendingDraft,null,'Must not mark as finished without correlation');
});
test('D02 synthetic store re-read restores frozen draft without auto-dispatching POST mutation (native cold restart NOT_RUN)',async()=>{
 const {h,store}=setup();
 await store.getState().savePendingDraft(input);const key=store.getState().pendingDraft.commandKey;
 const newStore=h.load('src/store/reporter.ts').useReporterStore;
 const restored=await newStore.getState().restoreStartedCommand();
 assert.equal(restored.commandKey,key);
 assert.equal(restored.description,input.description);
 assert.equal(h.calls.filter(c=>c[0]==='report').length,0,'Cold restart must never auto-POST');
});
