const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness,deferred}=require('./helpers/roadfe-screen.cjs');
const input={description:'QA verification',photos:[{uri:'file://qa.png',fileName:'qa.png',mediaType:'image/png',capturedAt:'2026-11-02T00:00:00Z'}],coords:null,submitRequested:true};
function setup(){
 let time=0;const sleeps=[];let h;
 const real=harness().load('src/store/reporterVerification.ts');
 h=harness({modules:{'./reporterVerification':{...real,waitForReporterVerification:(options)=>real.waitForReporterVerification({...options,clock:{now:()=>time,sleep:async ms=>{sleeps.push(ms);time+=ms;}}})}}});
 h.login();const store=h.load('src/store/reporter.ts').useReporterStore;
 h.load('src/store/uploads.ts').uploadTransport.getFileMetadata=(...args)=>h.transport.getFileMetadata(...args);
 return {h,sleeps,store};
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
