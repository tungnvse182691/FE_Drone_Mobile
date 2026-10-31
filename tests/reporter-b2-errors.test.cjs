const test=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./helpers/roadfe-screen.cjs');
const input={description:'valid description',photos:[{uri:'cache://old.jpg',fileName:'old.jpg',mediaType:'image/jpeg',capturedAt:'2026-10-31'}],coords:null};
for(const [method,stage] of [['createSession','upload_create'],['requestPartUrls','upload_part_urls'],['putPart','upload_put'],['completeUpload','upload_complete'],['getFileMetadata','upload_verify']])test('B2 '+method+' failure records safe stage across reopen and never POSTs report',async()=>{
 const h=harness();h.login();h.transport[method]=async()=>{throw {code:'ERR_NETWORK'};};
 const st=h.load('src/store/reporter.ts'),q=h.load('src/store/uploads.ts');await st.useReporterStore.getState().savePendingDraft(input);
 let error;try{await st.useReporterStore.getState().submitPendingDraft();}catch(e){error=e;}
 assert.ok(error);assert.equal(error.stage,stage);assert.equal(error.code,'ERR_NETWORK');assert.equal(h.calls.some(c=>c[0]==='report'),false);
 const rows=h.rows;const reopened=harness({rows});reopened.login();const qs=reopened.load('src/store/uploads.ts').useUploadsStore;await qs.getState().hydrate();const item=qs.getState().items[0];assert.equal(item.lastErrorStage,stage);assert.equal(item.lastErrorCode,'ERR_NETWORK');
 const msg=st.reporterFailureMessage(error);assert.match(msg,method==='putPart'?/Không kết nối được dịch vụ lưu ảnh/:/ảnh/);assert.doesNotMatch(msg,/bấm gửi lại để kiểm tra với cùng khóa lệnh/);
});
test('B2 ProblemDetails code takes precedence over Axios generic error code without altering status',async()=>{
 const h=harness();const api=h.load('src/api/uploads.ts');assert.equal(api.uploadErrorCode({code:'ERR_BAD_REQUEST',response:{status:412,data:{code:'concurrency_conflict'}}}),'concurrency_conflict');
});
for(const target of [undefined,'target'])test('B2 '+(target?'supplement':'report')+' POST network timeout stays unknown with original command after reopen',async()=>{
 const h=harness();h.login();const st=h.load('src/store/reporter.ts');const s=st.useReporterStore.getState();await s.savePendingDraft({...input,targetReportId:target,ifMatch:target?'"v1"':undefined});
 h.api[target?'submitReportSupplementReal':'submitReportReal']=async()=>{throw {code:'ERR_NETWORK'};};
 await assert.rejects(s.submitPendingDraft(),e=>{assert.equal(e.stage,target?'submitSupplement':'submitReport');assert.match(st.reporterFailureMessage(e),/Chưa xác nhận kết quả gửi/);assert.doesNotMatch(st.reporterFailureMessage(e),/Chưa gửi phản ánh|dịch vụ lưu ảnh/);return true;});
 const old=st.useReporterStore.getState().pendingDraft;const again=harness({rows:h.rows});again.login();const restored=await again.load('src/store/reporter.ts').useReporterStore.getState().restorePendingDraft();assert.deepEqual(restored,old);assert.ok(restored.request);assert.equal(again.calls.length,0);
});
test('B2 GET readback source mismatch cannot say report was not sent',async()=>{
 const h=harness();h.login();h.api.getOwnReportReal=async()=>({report:{id:'wrong',evidence:[]}});const st=h.load('src/store/reporter.ts');await st.useReporterStore.getState().savePendingDraft(input);
 await assert.rejects(st.useReporterStore.getState().submitPendingDraft(),e=>{assert.equal(e.stage,'readback');assert.doesNotMatch(st.reporterFailureMessage(e),/Chưa gửi phản ánh/);return true;});
 assert.ok(st.useReporterStore.getState().pendingDraft.resultReportId);
});
test('B2 local native read exception is not classified as proven deletion and keeps old draft unchanged',async()=>{
 const h=harness({modules:{'expo-file-system':{File:class{get exists(){return true;}async arrayBuffer(){throw Error('private native failure');}}}}});h.login();const st=h.load('src/store/reporter.ts');await st.useReporterStore.getState().savePendingDraft(input);const old=JSON.stringify(st.useReporterStore.getState().pendingDraft);
 await assert.rejects(st.useReporterStore.getState().submitPendingDraft(),e=>e.code==='local_photo_read_failed'&&e.stage==='local_read');assert.equal(JSON.stringify(st.useReporterStore.getState().pendingDraft),old);assert.equal(h.calls.length,0);
});

for(const status of [409,412,428])test('B2 HTTP '+status+' retains original status/code across ledger reopen',async()=>{
 const h=harness();h.login();h.transport.putPart=async()=>{throw {code:'ERR_BAD_REQUEST',response:{status,data:{code:'fixture_conflict'}}};};
 const st=h.load('src/store/reporter.ts');await st.useReporterStore.getState().savePendingDraft(input);
 await assert.rejects(st.useReporterStore.getState().submitPendingDraft(),e=>e.status===status&&e.code==='fixture_conflict'&&e.stage==='upload_put');
 const reopened=harness({rows:h.rows});reopened.login();const q=reopened.load('src/store/uploads.ts').useUploadsStore;await q.getState().hydrate();
 assert.equal(q.getState().items[0].lastErrorStatus,status);assert.equal(q.getState().items[0].lastErrorCode,'fixture_conflict');assert.equal(reopened.calls.length,0);
});

test('B2 server FAILED metadata is diagnosed as verification, never stale PUT failure',async()=>{
 const h=harness();h.login();const put=h.transport.putPart;let fail=true;h.transport.putPart=async(...args)=>{if(fail)throw {code:'ERR_NETWORK'};return put(...args);};
 h.transport.getFileMetadata=async()=>({id:'file',status:'FAILED'});
 const st=h.load('src/store/reporter.ts');await st.useReporterStore.getState().savePendingDraft(input);await assert.rejects(st.useReporterStore.getState().submitPendingDraft());
 fail=false;
 await assert.rejects(st.useReporterStore.getState().submitPendingDraft(),e=>{
  assert.match(st.reporterFailureMessage(e),/Máy chủ từ chối/);return e.code==='upload_validation_failed'&&e.stage==='upload_verify';
 });
 assert.equal(h.calls.some(c=>c[0]==='report'),false);
});
