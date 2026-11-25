const test=require('node:test'),assert=require('node:assert/strict');
const {createHash,randomUUID}=require('node:crypto');
const {harness}=require('./helpers/roadfe-screen.cjs');
const actor='72f84201-a001-4000-8000-000000000008';
const bytes=Uint8Array.from([255,216,255,224,1,2,255,217]);
const checksum=createHash('sha256').update(bytes).digest('hex');
function fixture(){
 const state={failSeal:false,failRead:false,onRead:null,plainReads:0},vaults=new Map(),files=new Map([['file:///camera.jpg',bytes]]),rows=new Map();
 class File{constructor(parent,name){this.uri=name===undefined?parent:`${parent.uri}/${name}`;}async arrayBuffer(){state.plainReads++;return files.get(this.uri).slice().buffer;}write(value){files.set(this.uri,value.slice());}bytesSync(){return files.get(this.uri);}move(target){files.set(target.uri,files.get(this.uri));files.delete(this.uri);this.uri=target.uri;}}
 const h=harness({rows,db:{async withExclusiveTransactionAsync(f){await f(this);},getAllAsync:async(sql,kind)=>[...rows.entries()].filter(([id,r])=>!kind||(kind==='T05B_FIELD'?id.startsWith('t05b:'):r.kind===kind)).map(([id,r])=>({id,...r})),getFirstAsync:async()=>null},modules:{
  'expo-crypto':{randomUUID,CryptoDigestAlgorithm:{SHA256:'sha256'},digest:async(_,input)=>Uint8Array.from(createHash('sha256').update(input).digest()).buffer},
  'expo-file-system':{File,Directory:class{constructor(parent,name){this.uri=`${parent.uri}/${name}`;}create(){}},Paths:{document:{uri:'file:///documents'}}},
  '../../modules/roadguard-offline-crypto':{offlineNative:{prepareMediaKey:async()=>({available:true,securityLevel:'SOFTWARE'}),sealMedia:async(binding,id,uri)=>{if(state.failSeal)throw Error('seal_failed');vaults.set(id,files.get(uri).slice());return{version:1,assetId:id,sizeBytes:bytes.length,checksumSha256:checksum};},readMediaRange:async(binding,id,offset,length)=>{state.onRead?.();if(state.failRead)throw Error('read_failed');return Buffer.from(vaults.get(id).subarray(offset,offset+length)).toString('base64');}}}
 }});h.client.defaults.baseURL='http://localhost:18181/api/v1';h.login('REPAIR_CREW',actor);
 const context={actor,scope:JSON.stringify([actor,'fixture-session']),environment:h.client.defaults.baseURL,projectId:randomUUID(),taskId:randomUUID()};
 return {h,state,files,context,api:()=>h.load('src/api/crewMediaVault.ts')};
}
test('Crew sealed capture reopens for the same account after login without plaintext fallback',async()=>{
 const f=fixture(),api=f.api(),photo={uri:'file:///camera.jpg',size:bytes.length,checksum};
 const vault=await api.sealCrewPhoto(f.context,photo,()=>true);assert.equal(vault.role,'REPAIR_CREW');
 f.h.logout();f.h.login('REPAIR_CREW',actor);
 assert.deepEqual(await api.readCrewPhotoBytes(f.context,{...photo,vault},()=>true),bytes);assert.equal(f.state.plainReads,0);
 f.state.failRead=true;await assert.rejects(api.readCrewPhotoBytes(f.context,{...photo,vault},()=>true),/read_failed/);assert.equal(f.state.plainReads,0);
});
test('Crew vault rejects altered binding, hash, size, session and native seal failure',async()=>{
 const f=fixture(),api=f.api(),photo={uri:'file:///camera.jpg',size:bytes.length,checksum};
 f.state.failSeal=true;await assert.rejects(api.sealCrewPhoto(f.context,photo,()=>true),/seal_failed/);f.state.failSeal=false;
 const vault=await api.sealCrewPhoto(f.context,photo,()=>true);
 for(const patch of [{actor:randomUUID()},{checksumSha256:'ab'.repeat(32)},{sizeBytes:9}])await assert.rejects(api.readCrewPhotoBytes(f.context,{...photo,vault:{...vault,...patch}},()=>true),/reference_invalid/);
 f.state.onRead=()=>{f.h.logout();f.h.login('REPAIR_CREW',actor);};await assert.rejects(api.readCrewPhotoBytes(f.context,{...photo,vault},()=>true),/session_changed/);
 assert.equal(f.state.plainReads,0);
});
test('Crew capture persists the sealed reference before exposing a photo and retains GPS and shutter time',async()=>{
 const f=fixture(),field=f.h.load('src/api/crewFieldDraft.ts'),crew=f.h.load('src/api/crewApi.ts');
 const task={id:f.context.taskId,projectId:f.context.projectId,assignedToUserId:actor,assignmentId:randomUUID(),version:'AAAAAAAAB9E=',firstStartOriginId:randomUUID(),status:'InProgress',purpose:'DefectVerification',requiredMeasurementType:1};
 const snapshot={...f.context,data:task,etag:'"AAAAAAAAB9E="'},coords={latitude:10.5,longitude:106.25},time='2026-11-25T00:00:00Z';
 const draft=await field.captureFieldPhoto(f.context,'file:///camera.jpg','BEFORE','image/jpeg',coords,true,false,time,snapshot);
 assert.equal(draft.captures[0].vault.role,'REPAIR_CREW');assert.deepEqual(draft.captures[0].coordinates,coords);assert.equal(draft.captures[0].capturedAt,time);
 const restored=await field.loadFieldDraft(f.context,await field.openFieldRuntime(f.context));assert.deepEqual(restored.captures[0].vault,draft.captures[0].vault);
 const previous=JSON.stringify(restored);f.state.failSeal=true;
 await assert.rejects(field.captureFieldPhoto(f.context,'file:///camera.jpg','BEFORE','image/jpeg',coords,true,false,time,snapshot),/seal_failed/);
 assert.equal(JSON.stringify(await field.loadFieldDraft(f.context,await field.openFieldRuntime(f.context))),previous);
 f.state.failSeal=false;
 const runtime=await field.openFieldRuntime(f.context),capture=restored.captures[0],uploadId=randomUUID(),fileId=randomUUID(),puts=[];
 let complete=false,creates=0;
 runtime.api={...crew,getFieldInspectionTaskDetailReal:async()=>({data:task,etag:snapshot.etag}),getFieldTaskStartOriginReal:async()=>({id:task.firstStartOriginId,taskId:task.id,assignmentId:task.assignmentId}),
  createCrewUploadSession:async()=>{creates++;return{id:uploadId,fileId,status:'UPLOADING',version:'AAAAAAAAB9E=',partSizeBytes:3};},
  getCrewUploadSession:async()=>({id:uploadId,fileId,status:complete?'VERIFIED':'UPLOADING',version:'AAAAAAAAB9E=',partSizeBytes:3}),
  requestCrewUploadPartUrls:async(id,ns)=>({parts:ns.map(partNumber=>({partNumber,url:'fixture-url'}))}),
  putCrewUploadPartBytes:async(url,part)=>{puts.push(...part);return{etag:'etag'};},completeCrewUpload:async()=>{complete=true;},
  getCrewFileMetadata:async()=>({id:fileId,status:'VERIFIED',checksumSha256:checksum,sizeBytes:bytes.length,mediaType:'image/jpeg'})};
 f.state.failRead=true;const reads=f.state.plainReads;
 await assert.rejects(field.uploadFieldCapture(restored,0,runtime),/read_failed/);assert.equal(creates,0);assert.equal(f.state.plainReads,reads);
 f.state.failRead=false;await field.uploadFieldCapture(restored,0,runtime);
 assert.deepEqual(puts,[...bytes]);assert.equal(restored.captures[0].verified,true);assert.equal(creates,1);assert.equal(f.state.plainReads,reads);
});
