const {capturePhoto}=require('./helpers/roadfe-screen.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict');
const {screen,deferred}=require('./helpers/roadfe-screen.cjs');
for (const mediaState of ['SESSION_CREATED', 'FAILED']) test('retry shows activity while preserving the previous diagnostic: '+mediaState,()=>{
 const item={mediaState,lastErrorCode:'ERR_NETWORK'};
 const s=screen('src/components/reporter/PhotoUploadStatus.tsx',{exportName:'PhotoUploadStatus',props:{item,index:0,active:true},moduleFactories:{'react-native':({modules})=>({...modules['react-native'],AccessibilityInfo:{isReduceMotionEnabled:async()=>true,addEventListener:()=>({remove(){}})},Animated:{View:'AnimatedView',Value:class{setValue(){}stopAnimation(){}},timing:()=>({start(){},stop(){}})}})}});
 s.render();const root=s.nodes().find(n=>n.props.testID==='photo-state-0');
 assert.equal(root.props.accessibilityState.busy,true);assert.match(root.props.accessibilityLabel,/Đang tải/);assert.equal(item.lastErrorCode,'ERR_NETWORK');s.unmount();
});
for(const [phase,label] of [['uploading','Đang tải ảnh 1/2…'],['verifying','Đã tải ảnh · Đang xác minh 1/2…'],['verified','Đang chuẩn bị gửi…'],['submitting','Đang gửi…'],['readback','Đang xác nhận…']])test('submit button names the actual '+phase+' phase',async()=>{
 const gate=deferred();const s=screen('app/(reporter)/report.tsx',{pick:async()=>({canceled:false,assets:[{uri:'content://qa/progress.png',name:'progress.png',mimeType:'image/png'}]})});
 s.h.login();s.render();await s.flush();await capturePhoto(s);await s.flush();s.input('Mô tả hiện trạng','QA progress');
 s.reporter.useReporterStore.getState().submitPendingDraft=async options=>{options.onProgress({phase,index:1,total:2,elapsedMs:1000});await gate.promise;throw {code:'verification_timeout'};};
 const send=s.press('Gửi phản ánh');await s.flush();assert.equal(s.nodes().find(n=>n.type==='Button'&&n.props.loading).props.title,label);assert.equal(s.nodes().find(n=>n.type==='Button'&&n.props.loading).props.progressPercent,phase==='uploading'?undefined:100);gate.resolve();await send;await s.flush();s.unmount();
});

for(const [phase,label] of [['uploading','Đang tải ảnh 1/2…'],['verifying','Đã tải ảnh · Đang xác minh 1/2…'],['readback','Đang xác nhận…']])test('supplement button names the actual '+phase+' phase',async()=>{
 const gate=deferred();const s=screen('app/(reporter)/report-supplement.tsx',{api:{getOwnReportReal:async()=>({report:{id:'fixture-report',evidence:[],createdAt:'2026-10-30'},etag:'"v1"'})},pick:async()=>({canceled:false,assets:[{uri:'content://qa/supplement.png',name:'supplement.png',mimeType:'image/png'}]})});
 s.h.login();s.render();await s.flush();s.input('Nội dung bổ sung','QA progress');await capturePhoto(s);await s.flush();
 s.reporter.useReporterStore.getState().submitPendingDraft=async options=>{options.onProgress({phase,index:1,total:2,elapsedMs:1000});await gate.promise;throw {code:'verification_timeout'};};
 const send=s.press('Gửi bổ sung');await s.flush();assert.equal(s.nodes().find(n=>n.type==='Button'&&n.props.loading).props.title,label);assert.equal(s.nodes().find(n=>n.type==='Button'&&n.props.loading).props.progressPercent,phase==='uploading'?undefined:100);gate.resolve();await send;await s.flush();s.unmount();
});

test('frozen supplement presents a read-only summary without photo editing controls',async()=>{
 const s=screen('app/(reporter)/report-supplement.tsx',{api:{getOwnReportReal:async()=>({report:{id:'fixture-report',evidence:[],createdAt:'2026-10-30'},etag:'"v1"'})},pick:async()=>({canceled:false,assets:[{uri:'content://qa/supplement.png',name:'supplement.png',mimeType:'image/png'}]})});
 s.h.login();s.render();await s.flush();s.input('Nội dung bổ sung','QA retained content');await capturePhoto(s);await s.flush();
 s.reporter.useReporterStore.getState().submitPendingDraft=async()=>{throw {code:'ERR_NETWORK'};};
 await s.press('Gửi bổ sung');await s.flush();
 assert.ok(s.nodes().some(n=>n.props.testID==='supplement-frozen-content'));
 assert.equal(s.nodes().filter(n=>['add-photo','pick-photo','remove-photo-0'].includes(n.props.testID)).length,0);
 assert.ok(s.nodes().some(n=>n.type==='Text'&&[n.props.children].flat().includes('QA retained content')));s.unmount();
});
