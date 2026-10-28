// Reuse the shipped deterministic native-boundary harness without registering its tests twice.
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const source=fs.readFileSync(require.resolve('./t01.test.cjs'),'utf8').split("test('restored user")[0];
const harness=new Function('require','__dirname',source+'\nreturn harness;')(require,__dirname);
const input={description:'fixture damage',photos:[{uri:'file:///fixture.jpg',fileName:'fixture.jpg',mediaType:'image/jpeg',capturedAt:'2026-10-28T00:00:00Z'}],coords:null};
function login(h,id='actor',sid='s1'){h.changeAuth({status:'AUTHENTICATED',token:h.jwt(id,sid),user:{id,role_code:'REPORTER',must_change_password:false}});}
for(const change of ['actor','session','environment'])test('draft partitions isolate '+change+' and retain old bytes/command',async()=>{const h=harness();login(h);const store=h.load('src/store/reporter.ts').useReporterStore;const saved=await store.getState().savePendingDraft(input);const before=JSON.stringify([...h.rows]);if(change==='environment')h.client.defaults.baseURL='other-env';else login(h,change==='actor'?'other':'actor',change==='session'?'s2':'s1');assert.equal(await store.getState().restorePendingDraft(),null);assert.equal(JSON.stringify([...h.rows]),before);assert.equal(saved.photos[0].uri,input.photos[0].uri);});
test('opaque or missing session claims fail closed',()=>{const h=harness();login(h);const api=h.load('src/store/uploads.ts');h.changeAuth({status:'AUTHENTICATED',token:'opaque',user:{id:'actor',role_code:'REPORTER'}});assert.throws(()=>api.reporterContext(),e=>e.status===401);});
test('legacy unprovenance draft and upload rows are quarantined without deletion',async()=>{const h=harness();login(h);h.rows.set('reporter-pending:actor',{payload:JSON.stringify({...input,id:'old',ownerId:'actor',commandKey:'old-command'})});h.rows.set('old-upload',{partition_id:'reporter-actor',uri_local:'file:///pending.jpg'});const before=JSON.stringify([...h.rows]);const store=h.load('src/store/reporter.ts').useReporterStore;assert.equal(await store.getState().restorePendingDraft(),null);const queue=h.load('src/store/uploads.ts').useUploadsStore;await queue.getState().hydrate('reporter-actor');assert.equal(queue.getState().items.length,0);assert.equal(JSON.stringify([...h.rows]),before);});
for(const change of ['actor','session','environment','aba'])test('upload async continuation stops on '+change+' change',async()=>{const h=harness();login(h);const original=h.transport.requestPartUrls;h.transport.requestPartUrls=async(...args)=>{const value=await original(...args);if(change==='environment')h.client.defaults.baseURL='other-env';else if(change==='aba'){login(h,'other');login(h);}else login(h,change==='actor'?'other':'actor',change==='session'?'s2':'s1');return value;};const queue=h.load('src/store/uploads.ts').useUploadsStore;await queue.getState().hydrate('reporter-actor');const id=await queue.getState().enqueuePhoto({...input.photos[0],uriLocal:input.photos[0].uri,sizeBytes:3,checksumSha256:'fixture-checksum'});await queue.getState().advanceItem(id);assert.equal(h.calls.filter(c=>c[0]==='put').length,0);assert.equal(h.calls.filter(c=>c[0]==='complete').length,0);assert.ok(h.rows.has(id));});
// The old four tests expected unproven guest adoption. Keep crash/restart/identity
// coverage with the corrected ownership policy; do not preserve the unsafe expectation.
test('owned draft recovers after interrupted autosave without another actor seeing it', async () => {
  const h=harness(); login(h); const store=h.load('src/store/reporter.ts').useReporterStore;
  const original=await store.getState().savePendingDraft(input);
  const write=h.rows.set.bind(h.rows); let fail=true;
  h.rows.set=(key,value)=>{if(fail){fail=false;throw Error('fixture disk interruption');}return write(key,value);};
  await assert.rejects(store.getState().savePendingDraft({...input,description:'interrupted edit'}));
  login(h,'other'); assert.equal(await store.getState().restorePendingDraft(),null);
  login(h); store.setState({pendingDraft:null});
  assert.deepEqual(await store.getState().restorePendingDraft(),JSON.parse(JSON.stringify(original)));
});
test('guest draft survives process restart but remains quarantined from every authenticated account', async () => {
  const h=harness(),store=h.load('src/store/reporter.ts').useReporterStore;
  const guest=await store.getState().savePendingDraft(input);
  const restarted=harness({rows:h.rows}); login(restarted);
  const next=restarted.load('src/store/reporter.ts').useReporterStore;
  assert.equal(await next.getState().bindPendingDraft(),null);
  restarted.logout(); assert.equal((await next.getState().restorePendingDraft()).id,guest.id);
});
test('successful owned submission never rewrites historical guest claim or resurrects owned command', async () => {
  const h=harness(),store=h.load('src/store/reporter.ts').useReporterStore;
  await store.getState().savePendingDraft(input);
  const guestKey=[...h.rows.keys()][0], original=h.rows.get(guestKey).payload;
  login(h); await store.getState().savePendingDraft({...input,description:'Owned fixture',photos:[{...input.photos[0],uri:'file:///owned.jpg'}]});
  assert.equal(await store.getState().submitPendingDraft(),'report');
  assert.equal(await store.getState().restorePendingDraft(),null);
  assert.equal(h.rows.get(guestKey).payload,original);
});
test('legacy claimed guest row cannot establish initial ownership even for its recorded actor/session', async () => {
  const h=harness(),store=h.load('src/store/reporter.ts').useReporterStore;
  await store.getState().savePendingDraft({...input,photos:[{...input.photos[0],itemId:'guest-item'}]});
  const key=[...h.rows.keys()][0]; login(h);
  const ctx=h.load('src/store/uploads.ts').reporterContext();
  const legacy=JSON.parse(h.rows.get(key).payload);legacy.ownerId=ctx.ownerId;legacy.provenance={environment:ctx.environment,session:ctx.session};
  h.rows.set(key,{payload:JSON.stringify(legacy)}); const before=JSON.stringify([...h.rows]);
  assert.equal(await store.getState().bindPendingDraft(),null);
  assert.equal(JSON.stringify([...h.rows]),before);
});
