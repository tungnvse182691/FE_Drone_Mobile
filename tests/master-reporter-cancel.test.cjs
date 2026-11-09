const {test}=require('node:test');
const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const fs=require('node:fs');
const path=require('node:path');
const {harness,deferred,screen}=require('./helpers/roadfe-screen.cjs');

fs.mkdirSync(path.resolve(__dirname,'../.cache'),{recursive:true});
const folder=fs.mkdtempSync(path.resolve(__dirname,'../.cache/reporter-cancel-'));
function runtime(file, beforeWrite){
  const sqlite=new DatabaseSync(file);
  const db={execAsync:async sql=>sqlite.exec(sql),runAsync:async(sql,...args)=>{await beforeWrite?.(sql,args);return sqlite.prepare(sql).run(...args);},
    getAllAsync:async(sql,...args)=>sqlite.prepare(sql).all(...args),
    getFirstAsync:async(sql,...args)=>sqlite.prepare(sql).get(...args)??null};
  const h=harness({db,modules:{'expo-sqlite':{openDatabaseSync:()=>db}}});
  const uploads=h.load('src/store/uploads.ts'),queue=uploads.useUploadsStore;
  return {sqlite,h,uploads,queue,row:id=>sqlite.prepare('SELECT * FROM upload_ledger WHERE id=?').get(id)};
}
const photo={uriLocal:'cache://cancel-fixture.jpg',fileName:'fixture.jpg',mediaType:'image/jpeg',sizeBytes:3,checksumSha256:'fixture-checksum'};

test('Reporter cancel freezes active PUT, persists intent before POST, and keeps local photo',async()=>{
  const s=runtime(path.join(folder,'active.db'));s.h.login();await s.queue.getState().hydrate();
  assert.equal(typeof s.queue.getState().cancelItem,'function');
  const id=await s.queue.getState().enqueuePhoto(photo),started=deferred(),putDone=deferred();
  s.uploads.uploadTransport.putPart=async(_part,_bytes,_type,signal)=>{started.resolve(signal);return putDone.promise;};
  let cancelCalls=0;
  s.uploads.uploadTransport.cancelUpload=async uploadId=>{
    cancelCalls++;assert.equal(uploadId,'session');
    assert.equal(s.row(id).cancel_state,'REQUESTED','intent is durable before POST');
    return {id:uploadId,status:'FAILED',failureCode:'upload_cancelled'};
  };
  const advancing=s.queue.getState().advanceItem(id);const signal=await started.promise;
  assert.equal(signal.aborted,false);
  await s.queue.getState().cancelItem(id);
  assert.equal(signal.aborted,true);
  putDone.resolve({eTag:'late-etag'});await advancing;
  assert.equal(cancelCalls,1);
  assert.equal(s.row(id).cancel_state,'CONFIRMED');
  assert.equal(s.row(id).upload_id,'session');
  assert.equal(s.row(id).uri_local,photo.uriLocal);
  assert.equal(s.h.calls.some(c=>c[0]==='complete'),false);
  await s.queue.getState().advanceItem(id);
  assert.equal(s.h.calls.filter(c=>c[0]==='create').length,1);
  s.sqlite.close();
});

test('Reporter cancel intent survives an upload write already in flight',async()=>{
  const writing=deferred(),release=deferred();let pause=false;
  const s=runtime(path.join(folder,'persist-race.db'),async(sql,args)=>{
    if(pause && sql.includes('upload_ledger') && args[7]==='UPLOADING'){
      pause=false;writing.resolve();await release.promise;
    }
  });
  s.h.login();await s.queue.getState().hydrate();
  const id=await s.queue.getState().enqueuePhoto(photo);
  s.uploads.uploadTransport.putPart=async()=>({partNumber:1,eTag:'etag'});
  let cancelPosted=false;
  s.uploads.uploadTransport.cancelUpload=async uploadId=>{cancelPosted=true;return {id:uploadId,status:'FAILED',failureCode:'upload_cancelled'};};
  pause=true;
  const advancing=s.queue.getState().advanceItem(id);
  await writing.promise;
  const cancelling=s.queue.getState().cancelItem(id);
  await new Promise(resolve=>setTimeout(resolve,30));
  assert.equal(cancelPosted,false,'cancel POST must wait for earlier durable write');
  release.resolve();await Promise.all([advancing,cancelling]);
  assert.equal(s.row(id).cancel_state,'CONFIRMED');
  assert.equal(s.row(id).uri_local,photo.uriLocal);
  assert.equal(s.h.calls.some(c=>c[0]==='complete'),false);
  s.sqlite.close();
});

test('Reporter cancel timeout survives restart and explicit retry uses same uploadId',async()=>{
  const file=path.join(folder,'timeout.db');let s=runtime(file);s.h.login();await s.queue.getState().hydrate();
  assert.equal(typeof s.queue.getState().cancelItem,'function');
  const id=await s.queue.getState().enqueuePhoto(photo);
  s.sqlite.prepare('UPDATE upload_ledger SET upload_id=?,file_id=?,media_state=? WHERE id=?').run('session-old','file-old','SESSION_CREATED',id);
  await s.queue.getState().hydrate();
  s.uploads.uploadTransport.cancelUpload=async()=>{throw {code:'ERR_NETWORK'};};
  await s.queue.getState().cancelItem(id);
  assert.equal(s.row(id).cancel_state,'UNKNOWN');s.sqlite.close();
  s=runtime(file);s.h.login();await s.queue.getState().hydrate();
  assert.equal(s.queue.getState().items[0].cancelState,'UNKNOWN');
  const calls=[];s.uploads.uploadTransport.cancelUpload=async uploadId=>{calls.push(uploadId);return {id:uploadId,status:'FAILED',failureCode:'upload_cancelled'};};
  await s.queue.getState().cancelItem(id);
  assert.deepEqual(calls,['session-old']);
  assert.equal(s.row(id).cancel_state,'CONFIRMED');
  assert.equal(s.h.calls.some(c=>c[0]==='create'||c[0]==='urls'),false);
  s.sqlite.close();
});

test('Reporter 409 cancel race reads session and never reports cancelled',async()=>{
  const s=runtime(path.join(folder,'race.db'));s.h.login();await s.queue.getState().hydrate();
  assert.equal(typeof s.queue.getState().cancelItem,'function');
  const id=await s.queue.getState().enqueuePhoto(photo);
  s.sqlite.prepare('UPDATE upload_ledger SET upload_id=?,file_id=?,media_state=? WHERE id=?').run('session-race','file-race','UPLOADING',id);
  await s.queue.getState().hydrate();
  s.uploads.uploadTransport.cancelUpload=async()=>{throw {status:409,code:'upload_not_cancellable'};};
  s.uploads.uploadTransport.getSession=async uploadId=>{assert.equal(uploadId,'session-race');return {id:uploadId,status:'VERIFYING',fileId:'file-race'};};
  await s.queue.getState().cancelItem(id);
  assert.equal(s.row(id).cancel_state,'BLOCKED');
  assert.equal(s.row(id).server_status,'VERIFYING');
  assert.notEqual(s.queue.getState().items[0].mediaState,'FAILED');
  s.sqlite.close();
});

test('Reporter 409 readback recognizes the same session already cancelled',async()=>{
  const s=runtime(path.join(folder,'already-cancelled.db'));s.h.login();await s.queue.getState().hydrate();
  const id=await s.queue.getState().enqueuePhoto(photo);
  s.sqlite.prepare('UPDATE upload_ledger SET upload_id=?,file_id=?,media_state=? WHERE id=?').run('session-old','file-old','UPLOADING',id);
  await s.queue.getState().hydrate();
  s.uploads.uploadTransport.cancelUpload=async()=>{throw {status:409,code:'upload_not_cancellable'};};
  s.uploads.uploadTransport.getSession=async()=>({id:'session-old',status:'FAILED',failureCode:'upload_cancelled'});
  await s.queue.getState().cancelItem(id);
  assert.equal(s.row(id).cancel_state,'CONFIRMED');
  s.sqlite.close();
});

test('Reporter blocked cancel readback is GET-only and keeps server verification distinct',async()=>{
  const s=runtime(path.join(folder,'blocked-readback.db'));s.h.login();await s.queue.getState().hydrate();
  const id=await s.queue.getState().enqueuePhoto(photo);
  s.sqlite.prepare('UPDATE upload_ledger SET upload_id=?,file_id=?,media_state=?,cancel_state=? WHERE id=?')
    .run('session-old','file-old','UPLOADING','BLOCKED',id);
  await s.queue.getState().hydrate();
  let gets=0;s.uploads.uploadTransport.getSession=async()=>{gets++;return {id:'session-old',status:'VERIFYING'};};
  s.uploads.uploadTransport.cancelUpload=async()=>{assert.fail('readback must not POST cancel again');};
  await s.queue.getState().cancelItem(id);
  assert.equal(gets,1);assert.equal(s.row(id).cancel_state,'BLOCKED');
  assert.equal(s.row(id).server_status,'VERIFYING');
  s.sqlite.close();
});

test('Reporter readback cannot verify a different file from the same session response',async()=>{
  const s=runtime(path.join(folder,'wrong-file.db'));s.h.login();await s.queue.getState().hydrate();
  const id=await s.queue.getState().enqueuePhoto(photo);
  s.sqlite.prepare('UPDATE upload_ledger SET upload_id=?,file_id=?,media_state=?,cancel_state=? WHERE id=?')
    .run('session-old','file-old','UPLOADING','BLOCKED',id);
  await s.queue.getState().hydrate();
  s.uploads.uploadTransport.getSession=async()=>({id:'session-old',status:'VERIFIED',fileId:'different-file'});
  s.uploads.uploadTransport.getFileMetadata=async()=>assert.fail('unbound file metadata must not be read');
  await s.queue.getState().cancelItem(id);
  assert.notEqual(s.row(id).media_state,'VERIFIED');
  s.sqlite.close();
});

test('Reporter cancel sends only session id to Reporter route without body or command headers',async()=>{
  const h=harness();let seen;
  h.client.post=async(...args)=>{seen=args;return {data:{id:'session-id',status:'FAILED',failureCode:'upload_cancelled'}};};
  const result=await h.load('src/api/uploads.ts').httpUploadTransport.cancelUpload('session-id');
  assert.equal(result.failureCode,'upload_cancelled');
  assert.deepEqual(seen,['/reporter-evidence/uploads/session-id/cancel']);
});

for(const status of [401,403,404])test(`Reporter cancel ${status} preserves session and photo without blind retry`,async()=>{
  const s=runtime(path.join(folder,`status-${status}.db`));s.h.login();await s.queue.getState().hydrate();
  const id=await s.queue.getState().enqueuePhoto(photo);
  s.sqlite.prepare('UPDATE upload_ledger SET upload_id=?,file_id=?,media_state=? WHERE id=?').run('owned-session','owned-file','SESSION_CREATED',id);
  await s.queue.getState().hydrate();let calls=0;
  s.uploads.uploadTransport.cancelUpload=async()=>{calls++;throw {status,code:'fixture-error'};};
  await s.queue.getState().cancelItem(id);
  assert.equal(s.row(id).cancel_state,'BLOCKED');
  assert.equal(s.row(id).upload_id,'owned-session');
  assert.equal(s.row(id).uri_local,photo.uriLocal);
  await s.queue.getState().advanceAll();
  assert.equal(calls,1);assert.equal(s.h.calls.some(c=>c[0]==='create'),false);
  s.sqlite.close();
});

test('Reporter cancel UI requires explicit confirmation and keeps original upload visible',async()=>{
  let prompt;const s=screen('app/(reporter)/uploads.tsx',{alert:(...args)=>{prompt=args;}});
  s.h.login();await s.uploads.useUploadsStore.getState().hydrate();
  const id=await s.uploads.useUploadsStore.getState().enqueuePhoto(photo);
  s.render();await s.flush();
  s.uploads.useUploadsStore.setState(state=>({items:state.items.map(item=>item.id===id?{...item,uploadId:'session-ui',mediaState:'UPLOADING'}:item)}));
  s.render();
  s.tap(`uploads-cancel-${id}`);
  assert.match(prompt[0],/Hủy phiên tải ảnh/);
  assert.equal(s.h.calls.some(c=>c[0]==='cancel'),false,'opening confirmation is read-only');
  assert.match(JSON.stringify(s.nodes()),/Hủy tải lên/);
  s.unmount();
});
