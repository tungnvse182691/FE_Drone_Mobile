const {seedLegacyDraft}=require('./helpers/roadfe-screen.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict');
const {screen,harness,deferred}=require('./helpers/roadfe-screen.cjs');
const {mediaRuntime,jpeg}=require('./helpers/reporter-media.cjs');
const {photo}=require('./helpers/photo-exif.cjs');
const fix={latitude:10.5,longitude:106.25,accuracyMeters:5};
test('gallery keeps original EXIF, missing metadata stays null; camera keeps its own fix',async()=>{
 const r=mediaRuntime(),m=r.load(),source={uri:'file://a.jpg',fileName:'a.jpg',capturedAt:'2026-11-23T00:00:00Z'};
 r.files.set(source.uri,photo());const saved=await m.preserveReporterPhoto(source,()=>true);
 assert.deepEqual(saved.photoLocation,{...fix,accuracyMeters:null});assert.equal(saved.locationSource,'EXIF');
 r.files.set(source.uri,jpeg);const missing=await m.preserveReporterPhoto(source,()=>true);
 assert.equal(missing.photoLocation,null);assert.equal(missing.locationSource,'UNKNOWN');
 const captured=await m.preserveReporterPhoto({...source,photoLocation:fix,locationSource:'CAPTURE'},()=>true);
 assert.deepEqual(captured.photoLocation,fix);assert.equal(captured.locationSource,'CAPTURE');
});
for(const close of [false,true])test('supplement capture retains own GPS or cancels when closed: '+close,async()=>{
 const d=deferred();let reads=0,captures=0;
 const s=screen('app/(reporter)/report-supplement.tsx',{
  api:{getOwnReportReal:async()=>({report:{id:'fixture-report',evidence:[]},etag:'"v1"'})},
  modules:{'../../src/api/photoLocation':{acquireReporterPhotoGps:async()=>{reads++;return d.promise;}}},
 });
 s.h.login();s.render();await s.flush();s.input('Nội dung bổ sung','GPS test');await s.tap('add-photo');s.render();
 const camera=s.nodes().find(n=>n.type==='CameraView');camera.props.ref.current={takePictureAsync:async()=>{captures++;return{uri:'file://camera.jpg'};}};camera.props.onCameraReady();s.render();
 const pending=s.tap('camera-shutter');await s.tap('camera-shutter');assert.equal(reads,1);
 if(close){s.render();s.nodes().find(n=>n.props?.accessibilityLabel==='Đóng camera').props.onPress();}
 d.resolve(fix);await pending;await s.flush();assert.equal(captures,close?0:1);
 if(!close){let draft;s.reporter.useReporterStore.getState().submitPendingDraft=async()=>{draft=s.reporter.useReporterStore.getState().pendingDraft;throw {code:'ERR_NETWORK'};};
 await s.press('Gửi bổ sung');await s.flush();assert.deepEqual(draft.photos[0].photoLocation,fix);assert.equal(draft.photos[0].locationSource,'CAPTURE');}
 s.unmount();
});
for(const location of [null,fix])test('enqueue uses per-photo GPS instead of shared coordinates: '+Boolean(location),async()=>{
 const h=harness();h.login();const st=h.load('src/store/reporter.ts').useReporterStore.getState();let input;
 h.load('src/store/uploads.ts').useUploadsStore.getState().enqueuePhoto=async value=>{input=value;throw {code:'fixture_stop'};};
 await seedLegacyDraft(h,{description:'test',coords:{latitude:1,longitude:2,accuracyMeters:9},photos:[{uri:'file://a.jpg',fileName:'a.jpg',mediaType:'image/jpeg',capturedAt:'2026-11-23T00:00:00Z',photoLocation:location,locationSource:location?'EXIF':'UNKNOWN'}],submitRequested:true});
 await assert.rejects(st.submitPendingDraft());assert.ok(input);assert.equal(input.latitude,location?.latitude);assert.equal(input.longitude,location?.longitude);assert.equal(input.locationSource,location?'EXIF':'UNKNOWN');
});
test('GPS ignores stale fixes and cleans subscription on success/timeout',async()=>{
 let cb,removed=0;const h=harness({modules:{'expo-location':{Accuracy:{High:4},getForegroundPermissionsAsync:async()=>({status:'granted'}),watchPositionAsync:async(_,f)=>{cb=f;return{remove(){removed++;}};}}}});
 const m=h.load('src/api/photoLocation.ts'),p=m.acquireReporterPhotoGps(()=>true,200);
 await new Promise(r=>setImmediate(r));cb({timestamp:Date.now()-60000,coords:fix});cb({timestamp:Date.now(),coords:{...fix,accuracy:5}});
 assert.deepEqual(await p,fix);assert.equal(removed,1);assert.equal(await m.acquireReporterPhotoGps(()=>true,5),null);assert.equal(removed,2);
});
test('GPS permission denial/session change never starts native watch',async()=>{
 let watches=0,current=true;const d=deferred();
 const h=harness({modules:{'expo-location':{Accuracy:{High:4},getForegroundPermissionsAsync:()=>d.promise,watchPositionAsync:async()=>{watches++;}}}});
 const p=h.load('src/api/photoLocation.ts').acquireReporterPhotoGps(()=>current,100);current=false;d.resolve({status:'granted'});assert.equal(await p,null);assert.equal(watches,0);
 const denied=harness({modules:{'expo-location':{getForegroundPermissionsAsync:async()=>({status:'denied'}),requestForegroundPermissionsAsync:async()=>({status:'denied'}),watchPositionAsync:async()=>{watches++;}}}});
 assert.equal(await denied.load('src/api/photoLocation.ts').acquireReporterPhotoGps(()=>true),null);assert.equal(watches,0);
});
