const {cameraDraftFixture}=require('./helpers/reporter-capture-fixture.cjs');
const {capturePhoto}=require('./helpers/roadfe-screen.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
const {screen,deferred,seedLegacyDraft}=require('./helpers/roadfe-screen.cjs');
const {mediaRuntime,jpeg}=require('./helpers/reporter-media.cjs');
const selected=s=>s.slots.filter(slot=>slot?.current?.values).flatMap(slot=>[...slot.current.values()]).filter(p=>p?.uri);
const page='app/(reporter)/report.tsx';
function setup(options={}){const r=mediaRuntime(options);r.files.set('file://cache/a.jpg',jpeg);
 const s=screen(page,{pick:options.pick??(async()=>({canceled:false,assets:[{uri:'file://cache/a.jpg',name:'a.jpg',mimeType:'image/jpeg'}]})),modules:{'../../src/api/reporterLocalMedia':r.load()}});return {s,r};}
test('B2 camera commits private final metadata; double tap takes one picture',async()=>{
 const d=deferred();let count=0;const {s,r}=setup();s.render();await s.flush();
 const take=()=>{count++;return d.promise;};const a=capturePhoto(s,undefined,take),b=capturePhoto(s,undefined,take);await new Promise(r=>setImmediate(r));assert.equal(count,1);
 d.resolve({uri:'file://cache/a.jpg'});await Promise.all([a,b]);await s.flush();
 const p=selected(s)[0];assert.ok(p.uri.includes('/documents/reporter-photos-v1/'));assert.deepEqual(r.files.get(p.uri),jpeg);assert.ok(p.checksumSha256);assert.equal(s.h.calls.length,0);s.unmount();
});
test('B2 failed media copy keeps previous draft and shows bounded error',async()=>{
 const {s}=setup({fail:'write'});const st=s.reporter.useReporterStore.getState();await st.savePendingDraft(cameraDraftFixture({description:'previous draft',photos:[{uri:'old.jpg',fileName:'old.jpg',mediaType:'image/jpeg',capturedAt:'old'}],coords:null}));
 const previous=structuredClone(s.reporter.useReporterStore.getState().pendingDraft);s.render();await s.flush();await capturePhoto(s);await s.flush();
 assert.equal(JSON.stringify(s.reporter.useReporterStore.getState().pendingDraft),JSON.stringify(previous));assert.ok([...s.h.rows.values()].some(row=>row.payload&&JSON.parse(row.payload).photos?.[0]?.uri==='old.jpg'));assert.match(JSON.stringify(s.nodes()),/Chưa lưu được bản ảnh bền vững/);assert.doesNotMatch(JSON.stringify(s.nodes()),/private native path/);s.unmount();
});
for(const change of ['logout','account','session','environment'])test('B2 picker delayed after '+change+' cannot add media to new scope',async()=>{
 const d=deferred();const {s}=setup({read:()=>d.promise});s.h.login();s.render();await s.flush();const work=capturePhoto(s);await Promise.resolve();
 if(change==='logout')s.h.logout();if(change==='account')s.h.login('REPORTER','other');if(change==='session')s.h.changeAuth({...s.h.getAuth(),token:s.h.jwt('actor','next')});if(change==='environment')s.h.client.defaults.baseURL='next-env';
 d.resolve();await work;s.render();await s.flush();assert.equal(s.reporter.useReporterStore.getState().pendingDraft,null);assert.equal(s.h.calls.length,0);s.unmount();
});

test('B2 camera draft and durable image survive restart without adoption by another actor',async()=>{
 const {s,r}=setup();s.render();await s.flush();await capturePhoto(s);await s.flush();
 const original=selected(s)[0];
 const again=require('./helpers/roadfe-screen.cjs').harness({rows:s.h.rows});const st=again.load('src/store/reporter.ts');
 assert.equal((await st.useReporterStore.getState().restoreStartedCommand()).photos[0].uri,original.uri);assert.deepEqual(r.files.get(original.uri),jpeg);
 again.login('REPORTER','other');assert.equal(await st.useReporterStore.getState().restorePendingDraft(),null);assert.equal(again.calls.length,0);s.unmount();
});

test('B2 camera continuation after blur cannot update invalidated form',async()=>{
 const d=deferred();const {s}=setup();s.h.login();s.render();await s.flush();
 const work=capturePhoto(s,undefined,()=>d.promise);await new Promise(r=>setImmediate(r));
 s.blur();s.render();await s.flush();
 d.resolve({uri:'file://cache/a.jpg'});
 await work;await s.flush();
 assert.equal(selected(s).length,0);s.unmount();
});

test('B2 max three existing photos never opens picker or changes old selections',async()=>{
 let calls=0;const {s}=setup({pick:async()=>{calls++;return {canceled:true};}});
 const photos=[1,2,3].map(i=>({uri:'old-'+i+'.jpg',fileName:i+'.jpg',mediaType:'image/jpeg',capturedAt:'old'}));
 await seedLegacyDraft(s.h,{description:'preserved',photos,coords:null,submitRequested:true});s.render();await s.flush();
 // Invoke the actual handler retained in the rendered button; it must guard even stale/direct events.
 const picker=s.nodes().find(n=>n.props?.testID==='pick-photo');if(picker)await picker.props.onPress();
 assert.equal(calls,0);assert.deepEqual(s.reporter.useReporterStore.getState().pendingDraft.photos,photos);s.unmount();
});

test('B2 camera admission blocks picker until durable copy completes',async()=>{
 const d=deferred();let picks=0;const {s,r}=setup({read:()=>d.promise,pick:async()=>{picks++;return {canceled:true};}});
 r.files.set('file://cache/camera.jpg',jpeg);s.render();await s.flush();const camera=s.nodes().find(n=>n.type==='CameraView');
 camera.props.ref.current={takePictureAsync:async()=>({uri:'file://cache/camera.jpg'})};camera.props.onCameraReady();s.render();
 const work=s.tap('camera-shutter');await Promise.resolve();await capturePhoto(s);assert.equal(picks,0);
 d.resolve();await work;await s.flush();const p=selected(s)[0];assert.deepEqual(r.files.get(p.uri),jpeg);assert.ok(p.checksumSha256);assert.equal(s.h.calls.length,0);s.unmount();
});
