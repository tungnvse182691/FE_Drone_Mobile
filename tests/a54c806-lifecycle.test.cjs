const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {screen,deferred}=require('./helpers/roadfe-screen.cjs');
function resetFixture(api={}) {
 let completed=0;
 const ui=screen('src/components/ReporterPasswordReset.tsx',{exportName:'ReporterPasswordReset',props:{onComplete:()=>completed++},modules:{
  './Button':{Button:'Button'},'./InputField':{InputField:'InputField'},
  '../api/reporterPasswordReset':{requestReporterReset:async()=>{},confirmReporterReset:async()=>{},clearResetReporterSession:()=>{},REPORTER_RESET_ACK:'ACK',reporterResetError:()=> 'SAFE ERROR',...api},
 }});
 ui.render();ui.input('Email người phản ánh','reporter@example.test');
 return {...ui,completed:()=>completed};
}
test('Reporter request double tap is locked, cooldown blocks resend, no network auto retry',async()=>{
 const pending=deferred();let calls=0;
 const ui=resetFixture({requestReporterReset:()=>{calls++;return pending.promise;}});
 ui.press('Gửi mã OTP');ui.press('Gửi mã OTP');assert.equal(calls,1);
 pending.reject(Error('network'));await ui.flush();ui.press('Gửi lại sau 60s');assert.equal(calls,1);ui.unmount();
});
test('Reporter 422 retains OTP, explicit confirm succeeds and clears secrets',async()=>{
 let calls=0,cleanup=0;
 const ui=resetFixture({confirmReporterReset:async(email,otp)=>{assert.equal(otp,'012345');if(++calls===1)throw {response:{status:422}};},clearResetReporterSession:()=>cleanup++});
 ui.press('Gửi mã OTP');await ui.flush();ui.input('Mã đặt lại mật khẩu','012345');ui.input('Mật khẩu mới','fixture-password');
 ui.press('Đổi mật khẩu');await ui.flush();assert.equal(ui.nodes().find(n=>n.props?.label==='Mã đặt lại mật khẩu').props.value,'012345');
 ui.press('Đổi mật khẩu');await ui.flush();assert.equal(cleanup,1);assert.equal(ui.completed(),1);
 assert.equal(ui.nodes().find(n=>n.props?.label==='Mật khẩu mới').props.value,'');ui.unmount();
});
test('Reporter session switch and unmount suppress late confirmation',async()=>{
 for(const leave of ['session','unmount']){
  const pending=deferred();const ui=resetFixture({confirmReporterReset:()=>pending.promise});
  ui.press('Gửi mã OTP');await ui.flush();ui.input('Mã đặt lại mật khẩu','012345');ui.input('Mật khẩu mới','fixture-password');ui.press('Đổi mật khẩu');
  if(leave==='session')ui.h.changeAuth({...ui.h.getAuth(),token:'different-session'});else ui.unmount();
  pending.resolve();if(leave==='session'){await ui.flush();ui.unmount();}else await new Promise(r=>setImmediate(r));
  assert.equal(ui.completed(),0);
 }
});
function cacheFixture({status=200,size=5,denyAfter=false,freeBytes=16*1024**3}={}){
 const deleted=[],downloads=[],written=[];let reads=0;
 const file={fileId:'00000005-1111-4111-8111-111111111111',sizeBytes:size,checksumSha256:'fixture'};
 const mod={exports:{}};
 const deps={
  'expo-crypto':{randomUUID:()=> 'preview-fixture'},
  '../store/auth':{useAuthStore:{getState:()=>({token:'fixture-bearer'}),subscribe:()=>()=>{}}},
  './client':{apiClient:{defaults:{baseURL:'https://fixture.test/api/v1'}}},
  './operatorVideoReadback':{operatorVideoGuard:()=>({check(){},close(){}}),readOperatorVideos:async()=>{if(denyAfter&&++reads===2)throw {response:{status:403}};return {videos:[file]};}},
  'expo-file-system/legacy':{getFreeDiskStorageAsync:async()=>freeBytes,cacheDirectory:'file:///cache/',deleteAsync:async p=>deleted.push(p),makeDirectoryAsync:async()=>{},writeAsStringAsync:async(p,b)=>written.push([p,b]),getInfoAsync:async()=>({exists:true,isDirectory:false,size}),createDownloadResumable:(url,path,options,progress)=>{downloads.push({url,path,options});return {downloadAsync:async()=>{progress({totalBytesWritten:size,totalBytesExpectedToWrite:size});return {status,headers:{'Content-Type':'video/mp4'}};},cancelAsync:async()=>{}}}},
 };
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/operatorVideoCache.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:mod,exports:mod.exports,setTimeout,clearTimeout,require:n=>{if(!deps[n])throw Error(n);return deps[n];}});
 return {...mod.exports,file,deleted,downloads,written};
}
test('video uses Bearer header only, bounded dedicated cache and safe disposal',async()=>{
 const h=cacheFixture();const lease=await h.downloadOperatorVideo('scope','task','project','dataset',h.file.fileId,new AbortController().signal,()=>{});
 assert.equal(h.downloads[0].options.headers.Authorization,'Bearer fixture-bearer');assert.ok(!h.downloads[0].url.includes('fixture-bearer'));
 assert.ok(h.written.every(([,html])=>!html.includes('fixture-bearer')));await lease.dispose();await lease.dispose();
 assert.ok(h.deleted.every(p=>p.startsWith('file:///cache/roadguard-operator-video-preview-v1/')));
});
test('insufficient storage, aborted, denied and missing video never yields a player and cleans preview only',async()=>{
 for(const options of [{size:300*1024**2,freeBytes:100*1024**2},{status:401},{status:403},{status:404},{denyAfter:true},{abort:true}]){
  const h=cacheFixture(options),controller=new AbortController();if(options.abort)controller.abort();
  await assert.rejects(h.downloadOperatorVideo('scope','task','project','dataset',h.file.fileId,controller.signal,()=>{}));
  assert.equal(h.written.length,0);assert.ok(h.deleted.every(p=>p.startsWith('file:///cache/roadguard-operator-video-preview-v1/')));
 }
});
test('no-SRT MISSING receipt preserves exact journal request after timeout; SRT remains supported',async()=>{
 const prefix=fs.readFileSync('tests/package6-drone-dataset-replay.test.cjs','utf8').split("test('Drone dataset lost ACK")[0];
 const {loadWorkflow,journalRuntime,plan,payload,id}=new Function('require',prefix+';return {loadWorkflow,journalRuntime,plan,payload,id};')(require);
 for(const withSrt of [false,true]){
  const body=payload({telemetryFileIds:withSrt?[id(11)]:[],pairs:[{videoFileId:id(10),telemetryFileId:withSrt?id(11):null,timeOffsetMilliseconds:0}]});
  const runtime=journalRuntime('PREPARED',body),workflow=loadWorkflow(runtime.factory);let original,replayed;
  await assert.rejects(workflow.submitDroneDataset(plan({payload:body}),{submitDataset:async(...a)=>{original=a;throw Error('timeout');}}));
  assert.equal(runtime.intent.status,'DATASET_UNKNOWN');
  const result=await workflow.replayDroneDataset(plan({payload:body}),{submitDataset:async(...a)=>{replayed=a;return {data:{id:id(90),surveyTaskId:id(2),dataVersionId:id(91),integrityStatus:'VERIFIED',telemetryStatus:withSrt?'PRESENT':'MISSING',version:'dataset-v1'},etag:'"dataset-v1"'};}});
  assert.deepEqual(replayed,original);assert.equal(result.status,'DATASET_CONFIRMED');
 }
});
test('submitted video panel paginates, shows MISSING telemetry and drops data on blur',async()=>{
 let calls=0;
 const ui=screen('src/components/drone/OperatorSubmittedVideos.tsx',{exportName:'SubmittedVideos',expose:'SubmittedVideos',props:{scope:'owner',taskId:'task',projectId:'project'},modules:{
  'react-native':{Text:'Text',View:'View',StyleSheet:{create:styles=>styles},Platform:{OS:'android'},AppState:{addEventListener:()=>({remove(){}})}},
  './VideoPreview':{VideoPreview:'VideoPreview'},'../Button':{Button:'Button'},'../Card':{Card:'Card'},
  '../../api/droneDatasetWorkflow':{operatorDatasetScope:()=> 'owner'},
  '../../api/operatorVideoCache':{},
  '../../api/operatorVideoReadback':{operatorVideoError:()=> 'SAFE ERROR',listOperatorVideos:async()=>({items:[{id:String(++calls),versionNo:calls}],nextCursor:calls===1?'cursor':null}),readOperatorVideos:async()=>({videos:[],dataset:{telemetryStatus:'MISSING'}})},
 }});
 ui.render();assert.equal(calls,0);ui.press('Xem video đã gửi');await ui.flush();ui.press('Xem thêm lần nộp');await ui.flush();
 assert.equal(calls,2);ui.press('Lần nộp 1');await ui.flush();
 assert.ok(ui.nodes().some(n=>n.props?.children?.includes('Không kèm SRT/GPS. Video vẫn đã được nộp.')));
 ui.blur();ui.render();assert.ok(!ui.nodes().some(n=>n.props?.title==='Lần nộp 1'));ui.unmount();
});
