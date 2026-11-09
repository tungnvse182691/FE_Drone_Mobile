const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {randomUUID}=require('node:crypto');

const source=fs.readFileSync('tests/t05b.test.cjs','utf8').split("test('T05B upload verifies")[0];
const sandbox={require:name=>name==='node:test'?{test:()=>{}}:require(name),console,process,Buffer,structuredClone,setTimeout,clearTimeout,URL,Uint8Array,AbortController};
vm.runInNewContext(source+';globalThis.crewCancelFixtures={fieldHarness,load};',sandbox);
const {fieldHarness,load}=sandbox.crewCancelFixtures;
function capture(h){const d=h.draft();d.captures=[{id:randomUUID(),uri:'file://real',purpose:'BEFORE',mediaType:'image/jpeg',checksum:'a'.repeat(64),size:3,capturedAt:null,coordinates:null,
  createKey:'original-create',completeKey:'original-complete',parts:[],upload:{id:randomUUID(),fileId:randomUUID(),status:'UPLOADING',version:'v1',partSizeBytes:2}}];return d;}

test('Crew cancel persists intent before POST, confirms only matching receipt and preserves photo',async()=>{
  const h=fieldHarness(),d=capture(h);await h.runtime.write(d);
  h.runtime.api.cancelCrewUpload=async id=>{
    assert.equal(h.stored().captures[0].cancelState,'REQUESTED');
    assert.equal(id,d.captures[0].upload.id);
    return {...d.captures[0].upload,status:'FAILED',failureCode:'upload_cancelled'};
  };
  const result=await h.m.cancelFieldUpload(d,0,h.runtime);
  assert.equal(result.captures[0].cancelState,'CONFIRMED');
  assert.equal(h.stored().captures[0].uri,'file://real');
  assert.equal(h.stored().captures[0].createKey,'original-create');
  await assert.rejects(h.m.uploadFieldCapture(result,0,h.runtime),/cancel/);
});

test('Crew cancel timeout keeps same upload ID and explicit retry after reopen',async()=>{
  const h=fieldHarness(),d=capture(h);await h.runtime.write(d);
  h.runtime.api.cancelCrewUpload=async()=>{throw {code:'ERR_NETWORK'};};
  await h.m.cancelFieldUpload(d,0,h.runtime);
  assert.equal(h.stored().captures[0].cancelState,'UNKNOWN');
  const saved=await h.runtime.read(),calls=[];
  h.runtime.api.cancelCrewUpload=async id=>{calls.push(id);return {...saved.captures[0].upload,status:'FAILED',failureCode:'upload_cancelled'};};
  await h.m.cancelFieldUpload(saved,0,h.runtime);
  assert.deepEqual(calls,[d.captures[0].upload.id]);
  assert.equal(h.stored().captures[0].cancelState,'CONFIRMED');
});

test('Crew 409 cancel race uses GET, never claims cancelled, preserves VERIFIED evidence',async()=>{
  const h=fieldHarness(),d=capture(h);await h.runtime.write(d);
  h.runtime.api.cancelCrewUpload=async()=>{throw {response:{status:409}};};
  h.runtime.api.getCrewUploadSession=async()=>({...d.captures[0].upload,status:'VERIFIED'});
  h.runtime.api.getCrewFileMetadata=async id=>({id,status:'VERIFIED',checksumSha256:d.captures[0].checksum,mediaType:d.captures[0].mediaType,sizeBytes:d.captures[0].size});
  const result=await h.m.cancelFieldUpload(d,0,h.runtime);
  assert.equal(result.captures[0].cancelState,'BLOCKED');
  assert.equal(result.captures[0].verified,true);
  assert.equal(result.captures[0].upload.status,'VERIFIED');
});

test('Crew API cancel uses the common session route without a body or command headers',async()=>{
  let args;
  const api=load('src/api/crewApi.ts',{'./client':{apiClient:{post:async(...value)=>{args=value;return {data:{id:'session',status:'FAILED',failureCode:'upload_cancelled'}};}}},'./problemDetails':{parseProblemDetails:()=>({})}});
  const result=await api.cancelCrewUpload('session');
  assert.equal(result.failureCode,'upload_cancelled');
  assert.deepEqual(args,['/uploads/session/cancel']);
});

test('Crew cancel aborts an in-flight storage PUT and never completes the session',async()=>{
  const h=fieldHarness(),d=capture(h);await h.runtime.write(d);
  let entered;const putting=new Promise(resolve=>{entered=resolve;});
  let aborted=false,completed=0;
  h.runtime.api.putCrewUploadPartBytes=async(_url,_bytes,_type,signal)=>{
    entered(signal);
    return new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(Error('aborted'));},{once:true}));
  };
  h.runtime.api.completeCrewUpload=async()=>{completed++;};
  h.runtime.api.cancelCrewUpload=async id=>({...d.captures[0].upload,id,status:'FAILED',failureCode:'upload_cancelled'});
  const uploading=h.m.uploadFieldCapture(d,0,h.runtime);
  const signal=await putting;assert.equal(signal.aborted,false);
  const cancelled=await h.m.cancelFieldUpload(d,0,h.runtime);
  await assert.rejects(uploading);
  assert.equal(aborted,true);assert.equal(completed,0);
  assert.equal(cancelled.captures[0].cancelState,'CONFIRMED');
  assert.equal(h.stored().captures[0].uri,'file://real');
});

test('Crew duplicate upload cannot replace the active abort handle before cancel',async()=>{
  const h=fieldHarness(),d=capture(h);await h.runtime.write(d);
  let entered,release;
  const putting=new Promise(resolve=>{entered=resolve;});
  let aborted=false;
  h.runtime.api.putCrewUploadPartBytes=async(_url,_bytes,_type,signal)=>{
    entered(signal);
    return new Promise((_resolve,reject)=>{
      release=()=>reject(Error('test cleanup'));
      signal.addEventListener('abort',()=>{aborted=true;reject(Error('aborted'));},{once:true});
    });
  };
  h.runtime.api.cancelCrewUpload=async id=>({...d.captures[0].upload,id,status:'FAILED',failureCode:'upload_cancelled'});
  const first=h.m.uploadFieldCapture(d,0,h.runtime);
  await putting;
  await assert.rejects(h.m.uploadFieldCapture(d,0,h.runtime),/field_busy/);
  try {
    const result=await h.m.cancelFieldUpload(d,0,h.runtime);
    assert.equal(aborted,true);
    assert.equal(result.captures[0].cancelState,'CONFIRMED');
  } finally {
    release?.();
    await first.catch(()=>undefined);
  }
});

for(const status of [401,403,404])test('Crew cancel HTTP '+status+' keeps original session and blocks blind retry',async()=>{
  const h=fieldHarness(),d=capture(h);await h.runtime.write(d);
  h.runtime.api.cancelCrewUpload=async()=>{throw {response:{status}};};
  const result=await h.m.cancelFieldUpload(d,0,h.runtime);
  assert.equal(result.captures[0].cancelState,'BLOCKED');
  assert.equal(result.captures[0].upload.id,d.captures[0].upload.id);
  assert.equal(result.captures[0].uri,'file://real');
});

test('Crew session switch after durable cancel intent prevents cross-session POST',async()=>{
  const h=fieldHarness(),d=capture(h);await h.runtime.write(d);
  let posts=0;const write=h.runtime.write;
  h.runtime.write=async value=>{await write(value);if(value.captures[0].cancelState==='REQUESTED')h.switch();};
  h.runtime.api.cancelCrewUpload=async()=>{posts++;return {...d.captures[0].upload,status:'FAILED',failureCode:'upload_cancelled'};};
  await assert.rejects(()=>h.m.cancelFieldUpload(d,0,h.runtime),/field_session_changed/);
  assert.equal(posts,0);assert.equal(h.stored().captures[0].cancelState,'REQUESTED');
});
