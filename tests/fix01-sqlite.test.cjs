const {test}=require('node:test');
const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto');
const {harness,deferred}=require('./helpers/roadfe-screen.cjs');
fs.mkdirSync(path.resolve(__dirname,'../.cache'),{recursive:true});
const folder=fs.mkdtempSync(path.resolve(__dirname,'../.cache/fix01-sqlite-'));
// Isolated files are retained for inspection; never open the app's database.
function runtime(file){
  const sqlite=new DatabaseSync(file);
  const db={execAsync:async sql=>sqlite.exec(sql),
    runAsync:async(sql,...args)=>sqlite.prepare(sql).run(...args),
    getAllAsync:async(sql,...args)=>sqlite.prepare(sql).all(...args),
    getFirstAsync:async(sql,...args)=>sqlite.prepare(sql).get(...args)??null};
  const modules={'expo-sqlite':{openDatabaseSync:()=>db}};
  const h=harness({db,modules});
  const transport={...h.transport};
  for(const name of Object.keys(transport))h.transport[name]=(...args)=>transport[name](...args);
  modules['../offline/database']=h.load('src/offline/database.ts');
  return {h,sqlite,transport,store:h.load('src/store/reporter.ts').useReporterStore,
    queue:h.load('src/store/uploads.ts').useUploadsStore};
}
const photo={uriLocal:'cache://private-fixture.jpg',fileName:'fixture.jpg',mediaType:'image/jpeg',sizeBytes:3,
  checksumSha256:createHash('sha256').update(Buffer.from([1,2,3])).digest('hex')};
const input={description:'Owned fixture',coords:null,photos:[{uri:photo.uriLocal,fileName:photo.fileName,mediaType:photo.mediaType,capturedAt:'2026-10-28T00:00:00Z'}]};
const row=(s,id)=>s.sqlite.prepare('SELECT * FROM upload_ledger WHERE id=?').get(id);

test('SQLite crash/reopen preserves linked draft and every unresolved upload receipt; exact replay after timeout',async()=>{
  const file=path.join(folder,'timeout-restart.db');let s=runtime(file);s.h.login();
  await s.queue.getState().hydrate();const id=await s.queue.getState().enqueuePhoto(photo);
  const saved=await s.store.getState().savePendingDraft({...input,photos:[{...input.photos[0],itemId:id}]});
  const originalComplete=s.transport.completeUpload;
  s.transport.completeUpload=async(...args)=>{await originalComplete(...args);throw {code:'ECONNABORTED'};};
  await s.queue.getState().advanceItem(id);
  const pending=row(s,id),command=structuredClone(s.h.calls.find(c=>c[0]==='complete'));
  assert.equal(pending.media_state,'COMPLETE_REQUESTED');
  assert.ok(pending.upload_id&&pending.file_id&&pending.session_version&&pending.part_etags);
  assert.equal(await s.queue.getState().removeItem(id),false);
  assert.deepEqual(row(s,id),pending);s.sqlite.close();

  s=runtime(file);s.h.login('REPORTER','other');await s.queue.getState().hydrate();
  assert.equal(s.queue.getState().items.length,0);assert.equal(await s.store.getState().restorePendingDraft(),null);
  assert.equal(await s.queue.getState().removeItem(id),false);assert.deepEqual(row(s,id),pending);
  s.h.login();await s.queue.getState().hydrate();
  assert.deepEqual(JSON.parse(JSON.stringify(await s.store.getState().restorePendingDraft())),JSON.parse(JSON.stringify(saved)));
  // A server session may still be UPLOADING: replay must retain key, checksum,
  // part ETags and version, with no second upload session or part PUT.
  s.transport.getFileMetadata=async()=>({id:'file',status:'UPLOADING'});
  await s.queue.getState().advanceItem(id);
  assert.deepEqual(s.h.calls.find(c=>c[0]==='complete'),command);
  assert.equal(s.h.calls.some(c=>['create','put'].includes(c[0])),false);
  assert.equal(row(s,id).upload_id,pending.upload_id);
  assert.equal(row(s,id).part_etags,pending.part_etags);
  s.sqlite.close();
});

for(const state of ['VERIFYING','COMPLETE_REQUESTED','VERIFIED','FAILED','UNKNOWN_OUTCOME'])test('SQLite '+state+' survives missing memory row, deletion, and reopen with draft reference',async()=>{
  const file=path.join(folder,state+'.db');let s=runtime(file);s.h.login();await s.queue.getState().hydrate();
  const id=await s.queue.getState().enqueuePhoto(photo);
  await s.store.getState().savePendingDraft({...input,photos:[{...input.photos[0],itemId:id}]});
  s.sqlite.prepare('UPDATE upload_ledger SET media_state=?,upload_id=?,file_id=?,session_version=?,part_etags=?,verified_version=? WHERE id=?')
    .run(state,'fixture-upload','fixture-file','fixture-version','{"1":"fixture-etag"}','fixture-file-version',id);
  const original=row(s,id);s.queue.setState({items:[]});
  assert.equal(await s.queue.getState().removeItem(id),false);assert.deepEqual(row(s,id),original);s.sqlite.close();
  s=runtime(file);s.h.login();await s.queue.getState().hydrate();assert.equal(s.queue.getState().items[0].id,id);
  assert.deepEqual(row(s,id),original);assert.equal((await s.store.getState().restorePendingDraft()).photos[0].itemId,id);s.sqlite.close();
});

test('SQLite late upload-complete response after actor switch cannot update B or erase A recovery record',async()=>{
  const s=runtime(path.join(folder,'late-complete.db'));s.h.login();await s.queue.getState().hydrate();
  const id=await s.queue.getState().enqueuePhoto(photo),pending=deferred(),started=deferred();
  s.transport.completeUpload=async()=>{started.resolve();return pending.promise;};
  const operation=s.queue.getState().advanceItem(id);await started.promise;
  const before=row(s,id);s.h.login('REPORTER','B');await s.queue.getState().hydrate();
  assert.equal(await s.queue.getState().removeItem(id),false);
  pending.resolve({version:'late-version',status:'VERIFYING'});await operation;
  assert.deepEqual(row(s,id),before);assert.deepEqual(s.queue.getState().items,[]);s.sqlite.close();
});

test('SQLite guest bytes and command survive reopen and unrelated login/OTP account restoration',async()=>{
  const file=path.join(folder,'guest.db');let s=runtime(file);
  await s.store.getState().savePendingDraft(input);
  const original=s.sqlite.prepare('SELECT * FROM local_draft').all();s.sqlite.close();
  s=runtime(file);s.h.login('REPORTER','B');
  assert.equal(await s.store.getState().bindPendingDraft(),null);assert.equal(await s.store.getState().restorePendingDraft(),null);
  assert.deepEqual(s.sqlite.prepare('SELECT * FROM local_draft').all(),original);
  s.h.logout();assert.equal((await s.store.getState().restorePendingDraft()).commandKey,JSON.parse(original[0].payload).commandKey);s.sqlite.close();
});
