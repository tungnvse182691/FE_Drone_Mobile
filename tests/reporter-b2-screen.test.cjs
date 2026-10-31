const test=require('node:test'),assert=require('node:assert/strict');
const {screen,deferred}=require('./helpers/roadfe-screen.cjs');
const {mediaRuntime,jpeg}=require('./helpers/reporter-media.cjs');
const page='app/(reporter)/report.tsx';
function setup(options={}){const r=mediaRuntime(options);r.files.set('file://cache/a.jpg',jpeg);
 const s=screen(page,{pick:options.pick??(async()=>({canceled:false,assets:[{uri:'file://cache/a.jpg',name:'a.jpg',mimeType:'image/jpeg'}]})),modules:{'../../src/api/reporterLocalMedia':r.load()}});return {s,r};}
test('B2 actual picker commits private final metadata; double tap only opens once',async()=>{
 const d=deferred();let count=0;const {s,r}=setup({pick:()=>{count++;return d.promise;}});s.render();await s.flush();
 const a=s.tap('pick-photo'),b=s.tap('pick-photo');assert.equal(count,1);
 d.resolve({canceled:false,assets:[{uri:'file://cache/a.jpg',name:'a.jpg',mimeType:'image/jpeg'}]});await Promise.all([a,b]);await s.flush();
 const p=s.reporter.useReporterStore.getState().pendingDraft.photos[0];assert.ok(p.uri.includes('/documents/reporter-photos-v1/'));assert.deepEqual(r.files.get(p.uri),jpeg);assert.ok(p.checksumSha256);assert.equal(s.h.calls.length,0);s.unmount();
});
test('B2 failed media copy keeps previous draft and shows bounded error',async()=>{
 const {s}=setup({fail:'write'});const st=s.reporter.useReporterStore.getState();await st.savePendingDraft({description:'previous draft',photos:[{uri:'old.jpg',fileName:'old.jpg',mediaType:'image/jpeg',capturedAt:'old'}],coords:null});
 s.render();await s.flush();await s.tap('pick-photo');await s.flush();
 const p=s.reporter.useReporterStore.getState().pendingDraft;assert.deepEqual(p.photos.map(p=>p.uri),['old.jpg']);assert.match(JSON.stringify(s.nodes()),/Chưa lưu được bản ảnh bền vững/);assert.doesNotMatch(JSON.stringify(s.nodes()),/private native path/);s.unmount();
});
for(const change of ['logout','account','session','environment'])test('B2 picker delayed after '+change+' cannot add media to new scope',async()=>{
 const d=deferred();const {s}=setup({read:()=>d.promise});s.h.login();s.render();await s.flush();const work=s.tap('pick-photo');await Promise.resolve();
 if(change==='logout')s.h.logout();if(change==='account')s.h.login('REPORTER','other');if(change==='session')s.h.changeAuth({...s.h.getAuth(),token:s.h.jwt('actor','next')});if(change==='environment')s.h.client.defaults.baseURL='next-env';
 d.resolve();await work;s.render();await s.flush();assert.equal(s.reporter.useReporterStore.getState().pendingDraft,null);assert.equal(s.h.calls.length,0);s.unmount();
});

test('B2 durable selection survives store reopen without changing media identity or adopting guest draft',async()=>{
 const {s,r}=setup();s.render();await s.flush();await s.tap('pick-photo');await s.flush();
 const original=s.reporter.useReporterStore.getState().pendingDraft;
 const again=require('./helpers/roadfe-screen.cjs').harness({rows:s.h.rows});const st=again.load('src/store/reporter.ts');
 assert.deepEqual(await st.useReporterStore.getState().restorePendingDraft(),JSON.parse(JSON.stringify(original)));assert.deepEqual(r.files.get(original.photos[0].uri),jpeg);
 again.login('REPORTER','other');assert.equal(await st.useReporterStore.getState().restorePendingDraft(),null);assert.equal(again.calls.length,0);s.unmount();
});

test('B2 max three existing photos never opens picker or changes old selections',async()=>{
 let calls=0;const {s}=setup({pick:async()=>{calls++;return {canceled:true};}});
 const photos=[1,2,3].map(i=>({uri:'old-'+i+'.jpg',fileName:i+'.jpg',mediaType:'image/jpeg',capturedAt:'old'}));
 await s.reporter.useReporterStore.getState().savePendingDraft({description:'preserved',photos,coords:null});s.render();await s.flush();
 // Invoke the actual handler retained in the rendered button; it must guard even stale/direct events.
 const picker=s.nodes().find(n=>n.props?.testID==='pick-photo');if(picker)await picker.props.onPress();
 assert.equal(calls,0);assert.deepEqual(s.reporter.useReporterStore.getState().pendingDraft.photos,photos.map(p=>({...p,itemId:undefined})));s.unmount();
});

test('B2 camera admission blocks picker until durable copy completes',async()=>{
 const d=deferred();let picks=0;const {s,r}=setup({read:()=>d.promise,pick:async()=>{picks++;return {canceled:true};}});
 r.files.set('file://cache/camera.jpg',jpeg);s.render();await s.flush();const camera=s.nodes().find(n=>n.type==='CameraView');
 camera.props.ref.current={takePictureAsync:async()=>({uri:'file://cache/camera.jpg'})};camera.props.onCameraReady();s.render();
 const work=s.tap('camera-shutter');await Promise.resolve();await s.tap('pick-photo');assert.equal(picks,0);
 d.resolve();await work;await s.flush();const p=s.reporter.useReporterStore.getState().pendingDraft.photos[0];assert.deepEqual(r.files.get(p.uri),jpeg);assert.ok(p.checksumSha256);assert.equal(s.h.calls.length,0);s.unmount();
});
