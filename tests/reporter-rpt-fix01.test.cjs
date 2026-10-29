const test=require('node:test');
const assert=require('node:assert/strict');
const {screen,harness,deferred}=require('./helpers/roadfe-screen.cjs');
const report='app/(reporter)/report.tsx';
const text=s=>JSON.stringify(s.nodes());
test('RPT restore failure is actionable, retry reads only and empty restore opens form',async()=>{
 const s=screen(report);let count=0;
 s.reporter.useReporterStore.getState().restorePendingDraft=async()=>{if(!count++)throw Error('private detail');return null;};
 s.render();await s.flush();assert.match(text(s),/Chưa khôi phục được nháp/);assert.doesNotMatch(text(s),/private detail/);
 await s.press('Thử khôi phục lại');await s.flush();assert.match(text(s),/reporter-description/);assert.equal(s.h.calls.length,0);
});
test('RPT optional denied GPS permits explicit guest save/login with photo',async()=>{
 const s=screen(report,{pick:async()=>({canceled:false,assets:[{uri:'cache://a.jpg',name:'a.jpg',mimeType:'image/jpeg'}]})});
 s.render();await s.flush();s.input('Mô tả hiện trạng','Hiện trạng hư hại mặt đường');await s.tap('pick-photo');await s.flush();
 await s.press('Gửi phản ánh');await s.flush();assert.deepEqual(s.nav,['/(auth)']);assert.equal(s.reporter.useReporterStore.getState().pendingDraft.coords,null);
});
test('RPT restore never automatically replays frozen uncertain command',async()=>{
 const s=screen(report);s.h.login();const st=s.reporter.useReporterStore.getState();
 await st.savePendingDraft({description:'Hiện trạng hư hại',photos:[{uri:'a.jpg',fileName:'a.jpg',mediaType:'image/jpeg',capturedAt:'2026-10-29'}],coords:{latitude:10,longitude:106,accuracyMeters:null},submitRequested:true});
 let sent=0;s.reporter.useReporterStore.getState().submitPendingDraft=async()=>{sent++;throw Error();};s.render();await s.flush();assert.equal(sent,0);
});

test('RPT draft database keeps one initialized handle and retries a failed initialization without clearing rows',async()=>{
 let opens=0,inits=0;const row={payload:'unchanged'};
 const h=harness({modules:{'../offline/database':{
  openDatabase:()=>{opens++;return {};},initDatabase:async()=>{if(++inits===1)throw Error('prepareAsync native failure');},
  getDraft:async()=>null,
 }}});
 h.rows.set('historical',row);const st=h.load('src/store/reporter.ts').useReporterStore.getState();
 await assert.rejects(st.restorePendingDraft());await st.restorePendingDraft();await st.restorePendingDraft();
 assert.equal(inits,2);assert.equal(opens,1);assert.equal(h.rows.get('historical'),row);
});
for(const file of ['capture','uploads'])test(`RPT ${file} hydrate failure has read-only retry`,async()=>{
 const s=screen(`app/(reporter)/${file}.tsx`);let count=0;s.uploads.useUploadsStore.getState().hydrate=async()=>{if(!count++)throw Error('private');};
 s.render();await s.flush();assert.match(text(s),/Chưa tải được hàng đợi/);await s.press('Thử tải lại');await s.flush();assert.equal(count,2);assert.equal(s.h.calls.length,0);
});
test('RPT queue selection is explicit VERIFIED owned and persisted without creating upload',async()=>{
 const s=screen(report);s.h.login();const q=s.uploads.useUploadsStore.getState();const id=await q.enqueuePhoto({uriLocal:'a.jpg',fileName:'a.jpg',mediaType:'image/jpeg',sizeBytes:3,checksumSha256:'a'.repeat(64)});
 s.uploads.useUploadsStore.setState({items:s.uploads.useUploadsStore.getState().items.map(i=>({...i,mediaState:'VERIFIED',fileId:'file',verifiedVersion:'fv'}))});
 // Hydration must preserve real ledger, so also update its stored verification values.
 const row=s.h.rows.get(id);row.media_state='VERIFIED';row.file_id='file';row.verified_version='fv';
 s.render();await s.flush();assert.equal(s.reporter.useReporterStore.getState().pendingDraft,null);
 await s.press('Chọn ảnh đã xác minh 1');await s.flush();assert.equal(s.reporter.useReporterStore.getState().pendingDraft.photos[0].itemId,id);assert.equal(s.h.calls.length,0);
});
test('RPT old restore completion cannot show private draft after account switch',async()=>{
 const s=screen(report);s.h.login();const d=deferred();let first=true;s.reporter.useReporterStore.getState().restorePendingDraft=()=>first?(first=false,d.promise):Promise.resolve(null);
 s.render();s.h.login('REPORTER','B');s.render();await s.flush();d.resolve({description:'PRIVATE_A',photos:[],coords:null});await s.flush();assert.doesNotMatch(text(s),/PRIVATE_A/);
});
test('RPT supplement 412 exposes GET review without rebasing command',async()=>{
 let reads=0;const s=screen('app/(reporter)/report-supplement.tsx',{api:{getOwnReportReal:async()=>{reads++;return {report:{id:'fixture-report',description:'server',createdAt:'2026-10-29',evidence:[]},etag:'"v2"'};}},pick:async()=>({canceled:false,assets:[{uri:'a.jpg',name:'a.jpg',mimeType:'image/jpeg'}]})});
 s.h.login();s.render();await s.flush();s.input('Nội dung bổ sung','Nội dung bổ sung');await s.tap('pick-photo');await s.flush();
 s.reporter.useReporterStore.getState().submitPendingDraft=async()=>{throw {response:{status:412}};};await s.press('Gửi bổ sung');await s.flush();assert.match(text(s),/Phát hiện xung đột/);
 const before=JSON.stringify(s.reporter.useReporterStore.getState().pendingDraft);await s.press('Tải bản mới nhất');await s.flush();assert.equal(reads,2);assert.equal(JSON.stringify(s.reporter.useReporterStore.getState().pendingDraft),before);
});

for(const page of ['report','report-supplement'])test(`RPT ${page} picker exception shows safe actionable error`,async()=>{
 const s=screen(`app/(reporter)/${page}.tsx`,{api:{getOwnReportReal:async()=>({report:{id:'fixture-report',evidence:[]},etag:'"v1"'})},pick:async()=>{throw Error('private path');}});
 s.h.login();s.render();await s.flush();await s.tap('pick-photo');await s.flush();
 assert.match(text(s),/Không mở được thư viện ảnh/);assert.doesNotMatch(text(s),/private path/);assert.equal(s.h.calls.length,0);
});

test('RPT supplement conflict blocks handler replay until a supported reconciliation decision',async()=>{
 const s=screen('app/(reporter)/report-supplement.tsx',{api:{getOwnReportReal:async()=>({report:{id:'fixture-report',evidence:[]},etag:'"v1"'})},pick:async()=>({canceled:false,assets:[{uri:'a.jpg',name:'a.jpg',mimeType:'image/jpeg'}]})});
 s.h.login();s.render();await s.flush();s.input('Nội dung bổ sung','Thông tin bổ sung');await s.tap('pick-photo');await s.flush();
 let posts=0;s.reporter.useReporterStore.getState().submitPendingDraft=async()=>{posts++;throw {status:412};};
 await s.press('Gửi bổ sung');await s.flush();await s.press('Gửi bổ sung');await s.flush();assert.equal(posts,1);
});

for(const coords of [null,{latitude:0,longitude:0,accuracyMeters:1},{latitude:100,longitude:106,accuracyMeters:1}])test(`RPT wire UNKNOWN omits invalid/absent GPS ${JSON.stringify(coords)}`,async()=>{
 const h=harness();h.login();const st=h.load('src/store/reporter.ts').useReporterStore;
 await st.getState().savePendingDraft({description:'Hiện trạng hư hại',photos:[{uri:'a.jpg',fileName:'a.jpg',mediaType:'image/jpeg',capturedAt:'2026-10-29'}],coords});
 await st.getState().submitPendingDraft();const evidence=h.calls.find(c=>c[0]==='report')[1].evidence[0];
 assert.equal(evidence.locationSource,'UNKNOWN');assert.equal('location' in evidence,false);
 const ledger=[...h.rows.values()].find(row=>row.location_source);assert.equal(ledger.location_source,'UNKNOWN');assert.equal(ledger.latitude??null,null);assert.equal(ledger.longitude??null,null);
});

test('RPT wire preserves selected ledger GPS rather than overwriting it from form',async()=>{
 const h=harness();h.login();const q=h.load('src/store/uploads.ts').useUploadsStore;
 const id=await q.getState().enqueuePhoto({uriLocal:'a.jpg',fileName:'a.jpg',mediaType:'image/jpeg',sizeBytes:3,checksumSha256:'a'.repeat(64),latitude:11,longitude:107,locationSource:'CAPTURE'});
 await q.getState().advanceItem(id);const st=h.load('src/store/reporter.ts').useReporterStore;
 await st.getState().savePendingDraft({description:'Hiện trạng hư hại',photos:[{uri:'a.jpg',fileName:'a.jpg',mediaType:'image/jpeg',capturedAt:'2026-10-29',itemId:id}],coords:{latitude:10,longitude:106,accuracyMeters:null}});
 await st.getState().submitPendingDraft();const e=h.calls.find(c=>c[0]==='report')[1].evidence[0];assert.equal(e.location.latitude,11);assert.equal(e.location.longitude,107);assert.equal(h.calls.filter(c=>c[0]==='create').length,1);
});

test('RPT linked upload must match exact owned URI and media before any dispatch',async()=>{
 const h=harness();h.login();const q=h.load('src/store/uploads.ts').useUploadsStore;
 const id=await q.getState().enqueuePhoto({uriLocal:'a.jpg',fileName:'a.jpg',mediaType:'image/jpeg',sizeBytes:3,checksumSha256:'a'.repeat(64)});
 const st=h.load('src/store/reporter.ts').useReporterStore;
 await st.getState().savePendingDraft({description:'Hiện trạng hư hại',photos:[{uri:'other.jpg',fileName:'a.jpg',mediaType:'image/jpeg',capturedAt:'2026-10-29',itemId:id}],coords:null});
 await assert.rejects(st.getState().submitPendingDraft(),e=>e.status===403);assert.equal(h.calls.length,0);assert.equal(h.rows.get(id).media_state,'LOCAL_READY');
});

for(const action of ['capture-take-photo','capture-pick-photo'])test(`RPT capture ${action} provider exception is actionable`,async()=>{
 const failure=async()=>{throw Error('private path');};const s=screen('app/(reporter)/capture.tsx',{camera:failure,library:failure});
 s.render();await s.flush();await s.tap(action);await s.flush();assert.match(text(s),/Không mở được/);assert.doesNotMatch(text(s),/private path/);assert.equal(s.h.calls.length,0);
});
test('RPT successful readback retains original draft command and evidence in archive',async()=>{
 const h=harness();h.login();const st=h.load('src/store/reporter.ts').useReporterStore;
 const original=await st.getState().savePendingDraft({description:'Hiện trạng hư hại',photos:[{uri:'a.jpg',fileName:'a.jpg',mediaType:'image/jpeg',capturedAt:'2026-10-29'}],coords:null});
 await st.getState().submitPendingDraft();
 const archived=[...h.rows.values()].filter(r=>r.payload).map(r=>JSON.parse(r.payload)).find(d=>d.id===original.id&&d.retired&&d.request);
 assert.ok(archived);assert.equal(archived.commandKey,original.commandKey);assert.equal(archived.resultReportId,'report');
 await st.getState().savePendingDraft({description:'Nháp tiếp theo',photos:[],coords:null});
 assert.ok([...h.rows.values()].some(r=>r.payload&&JSON.parse(r.payload).id===original.id));
});
test('RPT unknown POST survives store restart with identical body/key and no automatic replay',async()=>{
 const h=harness();h.login();const st=h.load('src/store/reporter.ts').useReporterStore;
 await st.getState().savePendingDraft({description:'Hiện trạng hư hại',photos:[{uri:'a.jpg',fileName:'a.jpg',mediaType:'image/jpeg',capturedAt:'2026-10-29'}],coords:null});
 h.api.submitReportReal=async(body,key)=>{h.calls.push(['uncertain',JSON.stringify(body),key]);throw {code:'ERR_NETWORK'};};
 await assert.rejects(st.getState().submitPendingDraft());const command=st.getState().pendingDraft;
 const restarted=harness({rows:h.rows});restarted.login();const next=restarted.load('src/store/reporter.ts').useReporterStore;
 await next.getState().restorePendingDraft();assert.equal(restarted.calls.length,0);assert.equal(next.getState().pendingDraft.commandKey,command.commandKey);
 await next.getState().submitPendingDraft();const replay=restarted.calls.find(c=>c[0]==='report');assert.equal(JSON.stringify(replay[1]),JSON.stringify(command.request));assert.equal(replay[2],command.commandKey);
});

for(const page of ['report','report-supplement'])test(`RPT ${page} duplicate local URI binds only one photo`,async()=>{
 const s=screen(`app/(reporter)/${page}.tsx`,{api:{getOwnReportReal:async()=>({report:{id:'fixture-report',evidence:[]},etag:'"v1"'})},pick:async()=>({canceled:false,assets:[{uri:'a.jpg',name:'a.jpg',mimeType:'image/jpeg'}]})});
 s.h.login();s.render();await s.flush();await s.tap('pick-photo');await s.flush();await s.tap('pick-photo');await s.flush();assert.equal(s.reporter.useReporterStore.getState().pendingDraft.photos.length,1);
});
for(const page of ['report','report-supplement'])test(`RPT ${page} camera permission exception is safely shown`,async()=>{
 const s=screen(`app/(reporter)/${page}.tsx`,{api:{getOwnReportReal:async()=>({report:{id:'fixture-report',evidence:[]},etag:'"v1"'})},modules:{'expo-camera':{CameraView:'CameraView',useCameraPermissions:()=>[{granted:false},async()=>{throw Error('private native error');}]}}});
 s.h.login();s.render();await s.flush();if(page==='report')await s.press('Cấp quyền');else await s.tap('add-photo');await s.flush();assert.match(text(s),/Không mở được camera/);assert.doesNotMatch(text(s),/private native error/);
});
