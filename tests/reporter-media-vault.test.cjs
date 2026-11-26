const {cameraDraftFixture}=require('./helpers/reporter-capture-fixture.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const {createHash,randomUUID}=require('node:crypto');
const {harness}=require('./helpers/roadfe-screen.cjs');
const actor='72f84201-a001-4000-8000-000000000008';
const bytes=Uint8Array.from([255,216,255,224,1,2,255,217]);
const checksumSha256=createHash('sha256').update(bytes).digest('hex');
function fixture(){
 const state={failSeal:false,failRead:false,onRead:null,plainReads:0},vaults=new Map();
 const modules={
  'expo-crypto':{randomUUID,CryptoDigestAlgorithm:{SHA256:'sha256'},digest:async(_,input)=>Uint8Array.from(createHash('sha256').update(input).digest()).buffer},
  '../../modules/roadguard-offline-crypto':{offlineNative:{
   prepareMediaKey:async()=>({available:true,securityLevel:'SOFTWARE'}),
   sealMedia:async(binding,assetId)=>{if(state.failSeal)throw Error('seal_failed');vaults.set(assetId,bytes);return{version:1,assetId,sizeBytes:bytes.length,checksumSha256};},
   readMediaRange:async(binding,id,offset,length)=>{state.onRead?.();if(state.failRead)throw Error('read_failed');return Buffer.from(vaults.get(id).subarray(offset,offset+length)).toString('base64');}
  }},
  'expo-file-system':{File:class{get exists(){return true;}get size(){return bytes.length;}async arrayBuffer(){state.plainReads++;return bytes.buffer;}}},
 };
 const h=harness({modules});h.client.defaults.baseURL='http://localhost:18181/api/v1';h.login('REPORTER',actor);
 h.transport.getFileMetadata=async()=>({id:'file',status:'VERIFIED',version:'fv',checksumSha256,sizeBytes:bytes.length});
 return {h,state,api:()=>h.load('src/api/reporterMediaVault.ts')};
}
test('Reporter sealed photo reads its authenticated bytes after session restart without plaintext fallback',async()=>{
 const f=fixture(),api=f.api(),photo={uri:'file:///private/documents/reporter-photos-v1/a.jpg',sizeBytes:bytes.length,checksumSha256};
 const vault=await api.sealReporterPhoto(photo,()=>true);assert.equal(vault.role,'REPORTER');
 f.h.logout();f.h.login('REPORTER',actor);
 assert.deepEqual(await api.readReporterPhotoBytes({...photo,vault}),bytes);assert.equal(f.state.plainReads,0);
 f.state.failRead=true;await assert.rejects(api.readReporterPhotoBytes({...photo,vault}),/read_failed/);assert.equal(f.state.plainReads,0);
});
test('Reporter media fails closed on native seal failure, foreign binding or session change',async()=>{
 const f=fixture(),api=f.api(),photo={uri:'file:///private/documents/reporter-photos-v1/a.jpg',sizeBytes:bytes.length,checksumSha256};
 f.state.failSeal=true;await assert.rejects(api.sealReporterPhoto(photo,()=>true),/seal_failed/);f.state.failSeal=false;
 const vault=await api.sealReporterPhoto(photo,()=>true);
 for(const patch of [{actor:'72f84201-a001-4000-8000-000000000009'},{checksumSha256:'ab'.repeat(32)},{sizeBytes:9}])
  await assert.rejects(api.readReporterPhotoBytes({...photo,vault:{...vault,...patch}}),/reference_invalid/);
 f.state.onRead=()=>f.h.logout();await assert.rejects(api.readReporterPhotoBytes({...photo,vault}),/session_changed/);assert.equal(f.state.plainReads,0);
});
test('Reporter queue durably retains the vault reference across hydrate before uploading authenticated bytes',async()=>{
 const f=fixture(),photo={uri:'file:///private/documents/reporter-photos-v1/a.jpg',sizeBytes:bytes.length,checksumSha256};
 const vault=await f.api().sealReporterPhoto(photo,()=>true);
 const store=f.h.load('src/store/uploads.ts').useUploadsStore;
 const id=await store.getState().enqueuePhoto({uriLocal:'file:///private/documents/reporter-photos-v1/a.jpg',fileName:'a.jpg',mediaType:'image/jpeg',sizeBytes:bytes.length,checksumSha256,vault});
 await store.getState().hydrate();assert.deepEqual(store.getState().items.find(i=>i.id===id).vault,vault);
 await store.getState().advanceItem(id);
 assert.equal(store.getState().items.find(i=>i.id===id).mediaState,'VERIFIED');
 assert.deepEqual(f.h.calls.filter(c=>c[0]==='put').flatMap(c=>c[1]),[...bytes]);
 assert.equal(f.state.plainReads,0);
});

test('Reporter draft restores its sealed photo and submits the same authenticated bytes',async()=>{
 const f=fixture(),photo={uri:'file:///private/documents/reporter-photos-v1/a.jpg',fileName:'a.jpg',mediaType:'image/jpeg',capturedAt:'2026-11-25T00:00:00Z',sizeBytes:bytes.length,checksumSha256};
 photo.vault=await f.api().sealReporterPhoto(photo,()=>true);
 const store=f.h.load('src/store/reporter.ts').useReporterStore;
 await store.getState().savePendingDraft(cameraDraftFixture({description:'Test concrete slab damage',photos:[photo],coords:null}));
 store.setState({pendingDraft:null});await store.getState().restorePendingDraft();
 assert.deepEqual(store.getState().pendingDraft.photos[0].vault,photo.vault);
 await store.getState().submitPendingDraft();
 assert.deepEqual(f.h.calls.filter(c=>c[0]==='put').flatMap(c=>c[1]),[...bytes]);
 assert.equal(f.h.calls.filter(c=>c[0]==='report').length,1);assert.equal(f.state.plainReads,0);
});

