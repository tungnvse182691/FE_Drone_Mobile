const {cameraDraftFixture}=require('./helpers/reporter-capture-fixture.cjs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {harness,screen,deferred}=require('./helpers/roadfe-screen.cjs');
const crypto=require('node:crypto');
async function fixture(){
 const h=harness();h.login();const mod=h.load('src/store/uploads.ts'),q=mod.useUploadsStore;
 await q.getState().hydrate();const id=await q.getState().enqueuePhoto({uriLocal:'cache://photo.jpg',fileName:'photo.jpg',mediaType:'image/jpeg',sizeBytes:3,checksumSha256:crypto.createHash('sha256').update(Buffer.from([1,2,3])).digest('hex')});
 return {h,mod,q,id};
}
test('live byte progress preserves acknowledged resume parts and waits for PUT receipt before 100%',async()=>{
 const {h,mod,q,id}=await fixture();const values=[];
 q.setState({items:q.getState().items.map(i=>({...i,mediaState:'UPLOADING',uploadId:'session',fileId:'file',partSizeBytes:2,partETags:{1:'first'}}))});
 mod.uploadTransport.putPart=async(part,bytes,type,signal,onProgress)=>{
  assert.equal(part.partNumber,2);assert.ok(signal);assert.equal(typeof onProgress,'function');
  onProgress(bytes.length);assert.ok(values.at(-1)<3,'native 100% is not a PUT receipt');return {eTag:'last'};
 };
 await q.getState().advanceItem(id,'explicit',undefined,(loaded,total)=>{assert.equal(total,3);values.push(loaded);});
 assert.ok(values.some(n=>n===2));assert.ok(values.includes(3));assert.equal(q.getState().items[0].mediaState,'VERIFIED');
 assert.equal(h.calls.filter(c=>c[0]==='create').length,0);
});
test('late progress after account switch is ignored',async()=>{
 const {h,mod,q,id}=await fixture();let emit;const values=[];const gate=deferred();
 mod.uploadTransport.putPart=async(p,b,t,s,fn)=>{emit=fn;await gate.promise;return {eTag:'part'};};
 const pending=q.getState().advanceItem(id,'explicit',undefined,n=>values.push(n));
 for(let n=0;n<50&&!emit;n++)await new Promise(r=>setImmediate(r));assert.ok(emit);h.login('REPORTER','other');const before=values.length;
 emit(1);assert.equal(values.length,before);gate.resolve();await pending;
});
test('Reporter aggregates concurrent photo bytes and keeps verification separate',async()=>{
 const h=harness();h.login();const store=h.load('src/store/reporter.ts').useReporterStore;
 const mod=h.load('src/store/uploads.ts');const values=[];
 mod.uploadTransport.putPart=async(p,b,t,s,fn)=>{fn(b.length/2);return {eTag:'part'};};
 await store.getState().savePendingDraft(cameraDraftFixture({description:'QA byte progress',photos:[0,1].map(n=>({uri:`cache://${n}.jpg`,fileName:`${n}.jpg`,mediaType:'image/jpeg',capturedAt:'2026-11-15T00:00:00Z'})),coords:null,submitRequested:true}));
 await store.getState().submitPendingDraft({onProgress:p=>values.push(p)});
 assert.ok(values.some(p=>p.phase==='uploading'&&p.uploadPercent>0&&p.uploadPercent<100));
 assert.ok(values.some(p=>p.phase==='uploading'&&p.uploadPercent===100));
 assert.ok(values.some(p=>p.phase==='readback'));assert.equal(h.calls.filter(c=>c[0]==='report').length,1);
});
test('Reporter loading button renders a determinate circle instead of an endless spinner',()=>{
 const s=screen('src/components/reporter/Button.tsx',{exportName:'Button',props:{variant:'primary',title:'Đang tải ảnh 45%',onPress(){},loading:true,progressPercent:45}});s.render();
 assert.ok(!s.nodes().some(n=>n.type==='ActivityIndicator'));
 assert.equal(s.nodes().find(n=>n.props.accessibilityRole==='progressbar').props.accessibilityValue.now,45);s.unmount();
});
for(const code of ['ERR_NETWORK','submission_paused'])test('one explicit retry recovers '+code+' and waits for server verification without duplicate uploads',async()=>{
 let time=0;const real=harness().load('src/store/reporterVerification.ts');
 const h=harness({modules:{'./reporterVerification':{...real,waitForReporterVerification:options=>real.waitForReporterVerification({...options,clock:{now:()=>time,sleep:async ms=>{time+=ms;}}})}}});
 h.login();const store=h.load('src/store/reporter.ts').useReporterStore;
 const mod=h.load('src/store/uploads.ts');const original=mod.uploadTransport.putPart;let fail=true;
 mod.uploadTransport.putPart=async(...args)=>{if(fail){fail=false;throw {code};}return original(...args);};
 await store.getState().savePendingDraft(cameraDraftFixture({description:'QA reconnect',photos:[{uri:'cache://reconnect.jpg',fileName:'reconnect.jpg',mediaType:'image/jpeg',capturedAt:'2026-11-15T00:00:00Z'}],coords:null,submitRequested:true}));
 await assert.rejects(store.getState().submitPendingDraft(),e=>e.code===code);
 const retained=store.getState().pendingDraft;const item=mod.useUploadsStore.getState().items[0];
 const metadata=mod.uploadTransport.getFileMetadata;let reads=0;
 mod.uploadTransport.getFileMetadata=async(...args)=>({...await metadata(...args),...(++reads===1?{status:'PENDING'}:{})});
 assert.equal(await store.getState().submitPendingDraft(),'report');
 assert.equal(h.calls.filter(c=>c[0]==='create').length,1);assert.equal(h.calls.filter(c=>c[0]==='report').length,1);
 assert.equal(mod.useUploadsStore.getState().items[0].uploadId,item.uploadId);
 assert.equal(mod.useUploadsStore.getState().items[0].uriLocal,retained.photos[0].uri);
});
