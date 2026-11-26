const {cameraDraftFixture}=require('./helpers/reporter-capture-fixture.cjs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {harness,screen,deferred}=require('./helpers/roadfe-screen.cjs');

function fixture(){
 let h;
 const database={openDatabase:()=>h.db,initDatabase:async()=>{},
  saveDraft:async(_,id,kind,payload)=>h.rows.set(id,{payload:JSON.stringify(payload)}),
  getDraft:async(_,id)=>h.rows.has(id)?JSON.parse(h.rows.get(id).payload):null,
  getDraftsByKind:async()=>[...h.rows].filter(([,r])=>r.payload).map(([id,r])=>({id,payload:JSON.parse(r.payload)}))};
 h=harness({modules:{'../offline/database':database}});h.login();
 h.load('src/api/authApi.ts').fetchMe=async()=>({id:'actor',role:'REPORTER'});
 const uploads=h.load('src/store/uploads.ts');
 const store=h.load('src/store/reporter.ts').useReporterStore;
 const recovery=h.load('src/store/reporterRecovery.ts');
 return {h,uploads,store,recovery};
}
const input={description:'Concrete slab',photos:[{uri:'cache://photo.jpg',fileName:'photo.jpg',mediaType:'image/jpeg',capturedAt:'fixture'}],coords:null,submitRequested:true};
function relogin(h,id='actor',sid='new-session'){
 h.logout();h.changeAuth({status:'AUTHENTICATED',token:h.jwt(id,sid),user:{id,role_code:'REPORTER',must_change_password:false}});
}

test('explicit historical recovery opens original draft and resumes same upload, parts and command key',async()=>{
 const {h,uploads,store,recovery}=fixture();
 const original=await store.getState().savePendingDraft(cameraDraftFixture(input));
 const put=uploads.uploadTransport.putPart;let fail=true;
 uploads.uploadTransport.putPart=async(...args)=>{if(args[0].partNumber===2&&fail){fail=false;throw {code:'ERR_NETWORK'};}return put(...args);};
 await assert.rejects(store.getState().submitPendingDraft());
 const before=JSON.stringify([...h.rows]);const oldContext=uploads.reporterContext();
 relogin(h);
 assert.equal(await store.getState().restoreStartedCommand(),null,'never auto adopt on login');
 const listed=await recovery.listHistoricalReporterCommands();assert.equal(listed.length,1);
 const opened=await recovery.openHistoricalReporterCommand(original.id);
 assert.equal(opened.kind,'create');assert.equal(JSON.stringify([...h.rows]),before,'opening never rewrites data');
 const restored=await store.getState().restoreStartedCommand();
 assert.equal(restored.commandKey,original.commandKey);assert.equal(restored.provenance.session,oldContext.session);
 assert.notEqual(uploads.reporterContext().session,oldContext.session,'authentication remains current');
 assert.equal(uploads.reporterContext().partition,oldContext.partition,'original storage identity retained');
 assert.equal(h.calls.filter(c=>c[0]==='report').length,0,'opening never dispatches');
 assert.equal(await store.getState().submitPendingDraft(),'report');
 assert.equal(h.calls.filter(c=>c[0]==='create').length,1);
 assert.deepEqual(h.calls.filter(c=>c[0]==='put').map(c=>c[1]),[[1,2],[3]]);
 assert.equal(h.calls.find(c=>c[0]==='report')[2],original.commandKey);
});

test('unknown report response is replayed unchanged after explicit same-account recovery',async()=>{
 const {h,store,recovery}=fixture();await store.getState().savePendingDraft(cameraDraftFixture(input));
 const post=h.api.submitReportReal;let first=true;
 h.api.submitReportReal=async(...args)=>{const r=await post(...args);if(first){first=false;throw {code:'ERR_NETWORK'};}return r;};
 await assert.rejects(store.getState().submitPendingDraft());relogin(h);
 const [entry]=await recovery.listHistoricalReporterCommands();await recovery.openHistoricalReporterCommand(entry.id);
 assert.equal(await store.getState().submitPendingDraft(),'report');
 const calls=h.calls.filter(c=>c[0]==='report');assert.equal(calls.length,2);assert.deepEqual(calls[0],calls[1]);
 assert.equal(h.calls.filter(c=>c[0]==='create').length,1);
});

test('recovery requires live same owner and cannot authorize a late result after session switch',async()=>{
 const {h,store,recovery,uploads}=fixture();const draft=await store.getState().savePendingDraft(cameraDraftFixture(input));relogin(h);
 const pending=deferred();h.load('src/api/authApi.ts').fetchMe=()=>pending.promise;
 const opening=recovery.openHistoricalReporterCommand(draft.id);relogin(h,'other');pending.resolve({id:'actor',role:'REPORTER'});
 await assert.rejects(opening);assert.equal(uploads.reporterContext().ownerId,'other');
 assert.equal(await store.getState().restoreStartedCommand(),null);
});

test('recovery access is revoked after logout and account ABA; disk remains unchanged',async()=>{
 const {h,store,recovery,uploads}=fixture();const d=await store.getState().savePendingDraft(cameraDraftFixture(input));relogin(h);
 await recovery.openHistoricalReporterCommand(d.id);const captured=uploads.reporterContext();const before=JSON.stringify([...h.rows]);
 relogin(h,'other');relogin(h);
 assert.throws(()=>uploads.assertReporterContext(captured));assert.equal(await store.getState().restoreStartedCommand(),null);
 assert.equal(JSON.stringify([...h.rows]),before);
});

test('a fresh form never restores or overwrites a historical or current pending command',async()=>{
 const {h,store,recovery,uploads}=fixture();
 const old=await store.getState().savePendingDraft(cameraDraftFixture(input));relogin(h);
 await recovery.openHistoricalReporterCommand(old.id);
 const before=JSON.stringify([...h.rows]);
 uploads.startNewReporterForm();
 assert.equal(await store.getState().restoreStartedCommand(),null);
 assert.equal(JSON.stringify([...h.rows]),before);
 const next=await store.getState().savePendingDraft(cameraDraftFixture({...input,description:'New report'}));
 assert.notEqual(next.commandKey,old.commandKey);
 const nextBytes=JSON.stringify([...h.rows]);uploads.startNewReporterForm();
 assert.equal(await store.getState().restoreStartedCommand(),null);
 assert.equal(JSON.stringify([...h.rows]),nextBytes,'new form does not delete or rewrite older attempts');
 const entries=await recovery.listHistoricalReporterCommands();
 assert.deepEqual(new Set(entries.map(e=>e.id)),new Set([old.id,next.id]));
 await recovery.openHistoricalReporterCommand(next.id);
 assert.equal((await store.getState().restoreStartedCommand()).commandKey,next.commandKey);
 await recovery.openHistoricalReporterCommand(old.id);
 assert.equal((await store.getState().restoreStartedCommand()).commandKey,old.commandKey);
});

test('fresh-form pending selections survive cold restart and require explicit opening',async()=>{
 const f=fixture();f.uploads.startNewReporterForm();const draft=await f.store.getState().savePendingDraft(cameraDraftFixture(input));
 const next=fixture();for(const [key,value] of f.h.rows)next.h.rows.set(key,value);
 assert.equal(await next.store.getState().restoreStartedCommand(),null);
 const entries=await next.recovery.listHistoricalReporterCommands();assert.equal(entries.length,1);
 await next.recovery.openHistoricalReporterCommand(draft.id);
 assert.equal((await next.store.getState().restoreStartedCommand()).commandKey,draft.commandKey);
});

test('bottom Send tab selects a fresh form, preserving the old pending entry on disk',async()=>{
 const nav=[];const s=screen('app/(reporter)/_layout.tsx',{modules:{
  'expo-router':{Stack:'Stack',usePathname:()=>'/home',useRouter:()=>({push:r=>nav.push(r)})},
  '../../src/components/BottomNav':{BottomNav:'BottomNav'}
 }});s.h.login();await s.reporter.useReporterStore.getState().savePendingDraft(cameraDraftFixture(input));
 const before=JSON.stringify([...s.h.rows]);s.render();
 s.nodes().find(n=>n.type==='BottomNav').props.onNavigate('/(reporter)/report');
 assert.equal(await s.reporter.useReporterStore.getState().restoreStartedCommand(),null);
 assert.equal(JSON.stringify([...s.h.rows]),before);assert.deepEqual(nav,['/(reporter)/report']);s.unmount();
});

test('environment ABA revokes a selected same-session draft slot',async()=>{
 const {h,uploads}=fixture();uploads.startNewReporterForm();const context=uploads.reporterContext();
 h.client.defaults.baseURL='other';uploads.reporterContext();h.client.defaults.baseURL=context.environment;
 assert.throws(()=>uploads.assertReporterContext(context));
});
