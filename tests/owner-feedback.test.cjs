const {test}=require('node:test'),assert=require('node:assert/strict');
const {screen,harness}=require('./helpers/roadfe-screen.cjs');
const fix={latitude:10.5,longitude:106.25,accuracyMeters:9.00538441589668};
async function capture(s,uri){s.render();const c=s.nodes().find(n=>n.type==='CameraView');c.props.ref.current={takePictureAsync:async()=>({uri})};c.props.onCameraReady();s.render();await s.tap('camera-shutter');await s.flush();}
for(const page of ['report','report-supplement'])test('owner camera policy '+page+': primary GPS once, secondary null, durable restart and max2',async()=>{
 let gps=0,picks=0;
 const s=screen(`app/(reporter)/${page}.tsx`,{api:{getOwnReportReal:async()=>({report:{id:'fixture-report',evidence:[]},etag:'"v1"'})},pick:async()=>{picks++;return{canceled:true};},modules:{'../../src/api/photoLocation':{acquireReporterPhotoGps:async()=>{gps++;return fix;}}}});
 s.h.login();s.render();await s.flush();assert.equal(gps,0);
 assert.ok(!s.nodes().some(n=>n.props.testID==='pick-photo'||n.props.testID==='toggle-verified-photos'||n.props.accessibilityLabel==='Chọn ảnh từ thư viện'));
 await capture(s,'file://first.jpg');await capture(s,'file://second.jpg');
 assert.equal(gps,1);const draft=s.reporter.useReporterStore.getState().pendingDraft;
 assert.equal(draft.photos.length,2);assert.deepEqual(draft.photos[0].photoLocation,fix);assert.equal(draft.photos[1].photoLocation,null);assert.equal(draft.photos[1].locationSource,'UNKNOWN');
 await capture(s,'file://third.jpg');assert.equal(gps,1);assert.equal(s.reporter.useReporterStore.getState().pendingDraft.photos.length,2);assert.equal(picks,0);
 const restored=await s.reporter.useReporterStore.getState().restoreStartedCommand();assert.equal(restored.photos.length,2);assert.equal(gps,1);s.unmount();
});
test('owner legacy capture entry cannot acquire outside a report; queue remains visible',async()=>{
 let picks=0,cameras=0;const s=screen('app/(reporter)/capture.tsx',{library:async()=>{picks++;},camera:async()=>{cameras++;}});s.h.login();s.render();await s.flush();
 assert.ok(!s.nodes().some(n=>n.props.testID==='capture-pick-photo'));await s.tap('capture-take-photo');assert.equal(picks,0);assert.equal(cameras,0);assert.equal(s.nav.at(-1),'/(reporter)/report');s.unmount();
});
test('owner accuracy presentation uses vi-VN, finite nonnegative values, at most2 decimals without changing metadata',()=>{
 const h=harness(),m=h.load('src/utils/gpsAccuracy.ts');
 assert.equal(m.formatGpsAccuracy(9.00538441589668),'Khoảng 9,01 m');assert.equal(m.formatGpsAccuracy(12),'Khoảng 12 m');assert.equal(m.formatGpsAccuracy(0),'Khoảng 0 m');
 for(const v of [null,undefined,NaN,Infinity,-1,'12'])assert.equal(m.formatGpsAccuracy(v),'Chưa có thông tin');assert.equal(fix.accuracyMeters,9.00538441589668);
});
for(const page of ['report','report-supplement'])test('owner '+page+': delete primary retains secondary UNKNOWN, requires retake and acquires fresh GPS',async()=>{
 let gps=0;const s=screen(`app/(reporter)/${page}.tsx`,{api:{getOwnReportReal:async()=>({report:{id:'fixture-report',evidence:[]},etag:'"v1"'})},modules:{'../../src/api/photoLocation':{acquireReporterPhotoGps:async()=>({...fix,latitude:10.5+(gps++)/100})}}});
 s.h.login();s.render();await s.flush();await capture(s,'file://a.jpg');await capture(s,'file://b.jpg');
 const before=structuredClone(s.reporter.useReporterStore.getState().pendingDraft);await s.tap('remove-photo-0');await s.flush();
 let draft=s.reporter.useReporterStore.getState().pendingDraft;assert.equal(draft.coords,null);assert.equal(draft.photos[0].captureRole,'SECONDARY');assert.equal(draft.photos[0].photoLocation,null);
 s.input(page==='report'?'Mô tả hiện trạng':'Nội dung bổ sung','Mặt đường hư hại');await s.press(page==='report'?'Gửi phản ánh':'Gửi bổ sung');await s.flush();assert.equal(s.h.calls.length,0);
 await capture(s,'file://retake.jpg');draft=s.reporter.useReporterStore.getState().pendingDraft;assert.equal(gps,2);assert.equal(draft.photos[0].captureRole,'PRIMARY');assert.notDeepEqual(draft.photos[0].photoLocation,before.photos[0].photoLocation);assert.equal(draft.photos[1].photoLocation,null);
 assert.ok([...s.h.rows.values()].some(r=>r.payload&&JSON.parse(r.payload).photos?.some(p=>p.uri===before.photos[0].uri)));s.unmount();
});
for(const interruption of ['close','session','double-tap'])test('owner camera '+interruption+' does not append a stale/duplicate capture',async()=>{
 const {deferred,capturePhoto}=require('./helpers/roadfe-screen.cjs'),gate=deferred();let gps=0,pictures=0;
 const s=screen('app/(reporter)/report.tsx',{modules:{'../../src/api/photoLocation':{acquireReporterPhotoGps:async()=>{gps++;await gate.promise;return fix;}}}});s.h.login();s.render();await s.flush();
 const work=capturePhoto(s,'file://a.jpg',async()=>{pictures++;return {uri:'file://a.jpg'};});await new Promise(r=>setImmediate(r));
 if(interruption==='close')s.nodes().find(n=>n.type==='Modal').props.onRequestClose();
 if(interruption==='session')s.h.login('REPORTER','other');
 if(interruption==='double-tap')await s.tap('camera-shutter');gate.resolve();await work;await s.flush();
 assert.equal(gps,1);assert.equal(pictures,interruption==='double-tap'?1:0);assert.equal(s.reporter.useReporterStore.getState().pendingDraft?.photos.length??0,interruption==='double-tap'?1:0);s.unmount();
});
test('owner actual GPS timeout/denial is bounded UNKNOWN without EXIF substitution',async()=>{
 const {mediaRuntime}=require('./helpers/reporter-media.cjs');
 for(const denied of [true,false]){
  let removed=0;const h=harness({modules:{'expo-location':{Accuracy:{High:1},getForegroundPermissionsAsync:async()=>({status:denied?'denied':'granted'}),requestForegroundPermissionsAsync:async()=>({status:'denied'}),watchPositionAsync:async()=>({remove(){removed++;}})}}});
  const fix=await h.load('src/api/photoLocation.ts').acquireReporterPhotoGps(()=>true,5);assert.equal(fix,null);if(!denied)assert.equal(removed,1);
 }
 const r=mediaRuntime({autoSources:true});r.modules['../utils/photoGps']={extractGpsFromExif:()=>{throw Error('must not read EXIF');}};
 const p=await r.load().preserveReporterPhoto({uri:'file://a.jpg',fileName:'a.jpg',mediaType:'image/jpeg',capturedAt:'2026-11-27T00:00:00Z',captureRole:'SECONDARY',photoLocation:fix,locationSource:'CAPTURE'},()=>true);
 assert.equal(p.photoLocation,null);assert.equal(p.locationSource,'UNKNOWN');
});
test('owner new policy admission/submit rejects third/foreign/ambiguous role and preserves started legacy replay',async()=>{
 const {seedLegacyDraft}=require('./helpers/roadfe-screen.cjs'),h=harness();h.login();const st=h.load('src/store/reporter.ts').useReporterStore,validation=h.load('src/api/reporterValidation.ts');
 const photo={uri:'file://a.jpg',fileName:'a.jpg',mediaType:'image/jpeg',capturedAt:'2026-11-27T00:00:00Z',captureRole:'PRIMARY',photoLocation:null,locationSource:'UNKNOWN'};
 for(const photos of [[photo,photo,photo],[{...photo,captureRole:undefined}],[{...photo,captureRole:'FOREIGN'}],[{...photo,locationSource:'EXIF'}],[photo,{...photo,captureRole:'SECONDARY',photoLocation:fix}]])await assert.rejects(st.getState().savePendingDraft({description:'Ảnh hiện trường',photos,coords:null,capturePolicy:validation.REPORTER_CAPTURE_POLICY}),e=>e.code==='reporter_capture_invalid');
 await assert.rejects(st.getState().savePendingDraft({description:'Unmarked caller',photos:[photo],coords:null}),e=>e.code==='reporter_capture_invalid');
 const legacy=await seedLegacyDraft(h,{description:'old 3',photos:[0,1,2].map(i=>({...photo,captureRole:undefined,uri:`file://old${i}.jpg`})),coords:null,submitRequested:true});const before=JSON.stringify(legacy);
 const restored=await st.getState().restoreStartedCommand();assert.equal(JSON.stringify(restored),before);await st.getState().submitPendingDraft();assert.equal(h.calls.find(c=>c[0]==='report')[1].evidence.length,3);
});
test('owner second photo wire stays UNKNOWN with no location even with primary/screen GPS and restart exact replay',async()=>{
 const h=harness();h.login();const st=h.load('src/store/reporter.ts').useReporterStore;
 const photos=[{uri:'file://a.jpg',captureRole:'PRIMARY',photoLocation:fix,locationSource:'CAPTURE'},{uri:'file://b.jpg',captureRole:'SECONDARY',photoLocation:null,locationSource:'UNKNOWN'}].map(p=>({...p,fileName:'a.jpg',mediaType:'image/jpeg',capturedAt:'2026-11-27T00:00:00Z'}));
 await st.getState().savePendingDraft({description:'Mặt đường nứt',photos,coords:fix,capturePolicy:'CAMERA_FIRST_GPS_V1',submitRequested:true});
 h.api.submitReportReal=async(body,key)=>{h.calls.push(['uncertain',JSON.stringify(body),key]);throw {code:'ERR_NETWORK'};};await assert.rejects(st.getState().submitPendingDraft());
 const command=st.getState().pendingDraft;assert.equal(command.request.evidence[1].locationSource,'UNKNOWN');assert.equal('location' in command.request.evidence[1],false);
 const next=harness({rows:h.rows});next.login();const ns=next.load('src/store/reporter.ts').useReporterStore;await ns.getState().restoreStartedCommand();assert.equal(next.calls.length,0);await ns.getState().submitPendingDraft();const replay=next.calls.find(c=>c[0]==='report');assert.equal(JSON.stringify(replay[1]),JSON.stringify(command.request));assert.equal(replay[2],command.commandKey);
});
function feedbackFixture(){
 const api=harness().load('src/api/crewFastTrackFeedback.ts');
 const measurement={sampleId:'sample',type:'DepressionDepth',unit:'cm',dimension:'LENGTH',state:'KNOWN',value:3,instrument:'Thước',method:'Đo trực tiếp',latitude:null,longitude:null,locationReason:'Không có GPS'};
 const task={requiredMeasurementType:1,slabId:'slab',layoutRevisionId:'layout',routeVersionId:'route',segmentSetId:null};
 const draft={measurements:[measurement],captures:[{purpose:'BEFORE',verified:{fileId:'f'},upload:{status:'VERIFIED'}}],locationProof:{kind:'POSITION_CHECKLIST',checklist:'SLAB_MARKINGS_CONFIRMED',observedSlabId:'slab'}};
 const view={eligible:false,policyState:'CONFIGURED',policyRevisionId:'policy',policyContentHash:'hash',missingReasons:['ASSESSMENT_REQUIRED'],rules:[{code:'DepressionDepth',unit:'cm',minimum:1,maximum:5}]};
 return {api,measurement,task,draft,view};
}
test('owner FT unsubmitted draft checklist uses required task measurement and BE unit/range without changing numbers',()=>{
 const f=feedbackFixture(),{api,draft,task,view}=f;assert.deepEqual(api.fastTrackDraftIssues(draft,task,view),[]);assert.equal(view.eligible,false);
 for(const type of [1,2,3,4,5,6]){const issues=api.fastTrackDraftIssues({...draft,measurements:[]},{...task,requiredMeasurementType:type},null);assert.ok(issues.some(i=>i.message.includes('theo yêu cầu nhiệm vụ')));assert.ok(!issues.some(i=>/undefined/.test(i.message)));}
 const wrong={...f.measurement,unit:'m',value:10},before=JSON.stringify(wrong);let issues=api.fastTrackDraftIssues({...draft,measurements:[wrong]},task,view);assert.ok(issues.some(i=>i.message.includes('chính sách dùng cm')));assert.equal(JSON.stringify(wrong),before);
 issues=api.fastTrackDraftIssues({...draft,measurements:[{...wrong,unit:'cm'}]},task,view);assert.ok(issues.some(i=>i.message.includes('1–5 cm')));assert.ok(issues.some(i=>i.message.includes('Giữ số đo thật')));
 const changed={...view,rules:[{code:'Area',unit:'m2',minimum:0.1,maximum:1.5}]};issues=api.fastTrackDraftIssues(draft,task,changed);assert.ok(issues.some(i=>i.message.includes('Diện tích hư hại')));
});
test('owner FT validation identifies method/instrument/unknown reason and observation location; UNKNOWN declaration remains valid',()=>{
 const f=feedbackFixture(),{api,measurement}=f;
 for(const field of ['method','instrument','unit','dimension','locationReason']){const issues=api.measurementDraftIssues([{...measurement,[field]:''}]);assert.ok(issues.some(i=>i.invalid&&i.sampleId==='sample'));}
 let issues=api.measurementDraftIssues([{...measurement,state:'UNKNOWN',value:null,unknownReason:'Chưa thể đo an toàn'}]);assert.ok(issues.length);assert.ok(!issues.some(i=>i.invalid));
 issues=api.measurementDraftIssues([{...measurement,state:'UNKNOWN',value:null,unknownReason:''}]);assert.ok(issues.some(i=>i.invalid&&i.message.includes('lý do chưa đo')));
 for(const value of [NaN,Infinity,-1])assert.ok(api.measurementDraftIssues([{...measurement,value}]).some(i=>i.invalid));
});
test('owner FT evidence/location checklist explains exact remediation and never assumes policy safety flags',()=>{
 const {api,draft,task}=feedbackFixture();
 for(const proof of [null,{kind:'UNKNOWN'},{kind:'GPS_CAPTURE'},{kind:'POSITION_CHECKLIST',checklist:'SLAB_MARKINGS_CONFIRMED',observedSlabId:'another'}])assert.ok(api.fastTrackDraftIssues({...draft,locationProof:proof},task).some(i=>i.section==='position'));
 assert.ok(api.fastTrackDraftIssues({...draft,locationProof:{kind:'POSITION_CHECKLIST',checklist:'ROUTE_CHAINAGE_MARKINGS_CONFIRMED',observedChainageMeters:1,observedRouteVersionId:null}},{...task,slabId:null,routeVersionId:null}).some(i=>i.section==='position'));
 assert.ok(api.fastTrackDraftIssues({...draft,captures:[]},task).some(i=>i.section==='evidence'));
 for(const status of ['PENDING','UPLOADING','VERIFYING'])assert.ok(api.fastTrackDraftIssues({...draft,captures:[{purpose:'BEFORE',upload:{status}}]},task).some(i=>i.section==='evidence'&&i.message.includes('xác minh')));
 assert.ok(api.fastTrackDraftIssues({...draft,captures:[{purpose:'BEFORE',cancelState:'UNKNOWN'}]},task).some(i=>i.message.includes('đối soát hủy')));
 const segmentTask={...task,slabId:null,segmentSetId:'set'};
 assert.ok(api.fastTrackDraftIssues({...draft,locationProof:{kind:'POSITION_CHECKLIST',checklist:'SEGMENT_MARKINGS_CONFIRMED',observedSegmentId:'segment',observedChainageMeters:-1}},segmentTask).some(i=>i.section==='position'));
 assert.equal(api.fastTrackReason('STOP_CONDITION_OBSERVATION_UNKNOWN').owner,'server');
});
test('owner FT unavailable or contradictory policy never supplies invented ranges',()=>{
 const {api,draft,task,view}=feedbackFixture();
 for(const override of [{policyState:'UNAVAILABLE'},{policyRevisionId:null},{rules:[]},{rules:[{code:'Area',unit:'m2',minimum:3,maximum:1}]},{missingReasons:['PINNED_POLICY_SOURCE_MISMATCH']}])assert.ok(!api.fastTrackDraftIssues(draft,task,{...view,...override}).some(i=>i.message.includes('chính sách')));
});
test('owner FT maps every current policy/execution enum reason and leaves unknown safe trace code',()=>{
 const {api}=feedbackFixture();const enums=['NOTCONFIGURED','UNKNOWNMEASUREMENT','WRONGUNIT','THRESHOLDNOTMET','STOPCONDITION','MEASUREONLY','UNPROVENTIME','EXPIRED','SCOPEMISMATCH','CURRENTAUTHORITYDENIED','ROADNOTHANDEDOVER','COVERAGEUNKNOWN','COVERAGEDENIED','POLICYUNAVAILABLE','LOCATIONUNVERIFIED','CHECKLISTINCOMPLETE','REVOKED'];
 for(const prefix of ['POLICY_','EXECUTION_'])for(const code of enums)assert.ok(!api.fastTrackReason(prefix+code).message.includes('chưa có diễn giải'));
 for(const code of ['ASSESSMENT_REQUIRED','POLICY_UNAVAILABLE','COVERAGE_PARTIAL_OR_MISMATCH','COVERAGE_AMBIGUOUS','SOURCE_STALE'])assert.ok(!api.fastTrackReason(code).message.includes('chưa có diễn giải'));
 const unknown=api.fastTrackReason('FUTURE_<code>\n');assert.equal(unknown.code,'FUTURE_code');assert.match(unknown.message,/FUTURE_code/);assert.equal(unknown.owner,'server');assert.equal(api.fastTrackReason('ASSESSMENT_REQUIRED').owner,'crew');assert.equal(api.fastTrackReason('POLICY_UNAVAILABLE').owner,'server');
});
test('owner FT checklist CTA invokes the selected issue without providing execution authority',async()=>{
 let selected;const issue={section:'measurements',sampleId:'sample',message:'Độ sâu chỗ lõm: nhập dụng cụ đo thực tế.'};
 const s=screen('src/components/crew/CrewFastTrackEligibility.tsx',{exportName:'FastTrackDraftChecklist',props:{issues:[issue],onOpen:i=>selected=i},modules:{'../Button':{Button:'Button'},'../../offline/upload-queue':{},'../../api/crewFieldDraft':{},'../../api/crewFastTrackEligibility':{},'../../api/crewFastTrackFeedback':feedbackFixture().api}});s.render();
 const c=s.nodes().find(n=>n.type==='Pressable');assert.ok(c);c.props.onPress();assert.equal(selected,issue);assert.ok(!s.nodes().some(n=>n.props.title==='Bắt đầu thi công'));s.unmount();
});
