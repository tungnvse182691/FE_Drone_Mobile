const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const id=n=>`${String(n).padStart(8,'0')}-1111-4111-8111-111111111111`;
function fixture(){
 let scope='owner',respond;const calls=[],listeners=new Set();
 const task={id:id(1),projectId:id(2),operatorId:id(3),version:'v1'};
 const dataset={id:id(4),surveyTaskId:task.id,projectId:task.projectId,sourceFiles:[{fileId:id(5),purpose:'SURVEY_VIDEO',mediaType:'video/mp4',sizeBytes:5},{fileId:id(6),purpose:'TELEMETRY'}]};
 respond=async path=>({data:path.includes('/datasets?')?{items:[{id:id(4),surveyTaskId:task.id,version:'v1'}],nextCursor:'a+/='}:dataset});
 const mod={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/operatorVideoReadback.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:mod,exports:mod.exports,require:n=>{
  if(n==='./client')return {apiClient:{defaults:{baseURL:'https://fixture.test/api/v1'},get:async p=>{calls.push(p);return respond(p);}}};
  if(n==='./droneDatasetWorkflow')return {operatorDatasetScope:()=>scope,isDroneResourceId:v=>typeof v==='string'&&/^[0-9a-f-]{36}$/i.test(v)};
  if(n==='../store/auth')return {useAuthStore:{getState:()=>({user:{id:id(3)}}),subscribe:f=>{listeners.add(f);return()=>listeners.delete(f);}}};
  if(n==='./droneApi')return {getOperatorSurveyTaskDetailReal:async()=>({data:task,etag:'"v1"'})};
  throw Error(n);
 }});
 return {api:mod.exports,calls,task,dataset,respond:f=>respond=f,bounce:()=>{scope='other';listeners.forEach(f=>f());scope='owner';},listeners};
}
test('dataset pagination encodes opaque cursor, validates task, filters real video sourceFiles',async()=>{
 const h=fixture();const page=await h.api.listOperatorVideos('owner',id(1),id(2),'a+/=');
 assert.match(h.calls[0],/limit=25&cursor=a%2B%2F%3D$/);assert.equal(page.nextCursor,'a+/=');
 const detail=await h.api.readOperatorVideos('owner',id(1),id(2),id(4));assert.equal(detail.videos.length,1);assert.equal(detail.videos[0].fileId,id(5));assert.equal(h.listeners.size,0);
});
test('stale session bounce, wrong task/project and malformed sources fail closed',async()=>{
 const h=fixture();h.respond(async()=>{h.bounce();return {data:{items:[],nextCursor:null}};});
 await assert.rejects(h.api.listOperatorVideos('owner',id(1),id(2)),/session/);
 for(const mutate of [d=>d.projectId=id(8),d=>d.surveyTaskId=id(8),d=>d.sourceFiles[0].fileId='fake']){
  const h=fixture();mutate(h.dataset);await assert.rejects(h.api.readOperatorVideos('owner',id(1),id(2),id(4)));
 }
});
for(const status of [401,403,404])test(`read preserves HTTP ${status} and message`,async()=>{
 const h=fixture();h.respond(async()=>{throw {response:{status}};});
 await assert.rejects(h.api.listOperatorVideos('owner',id(1),id(2)),e=>e.response.status===status);
 assert.ok(h.api.operatorVideoError({response:{status}}).length>0);
});
