const {test}=require('node:test'),assert=require('node:assert/strict');
const {drone,id}=require('./package45-drone.test.cjs');
const {deferred}=require('./helpers/roadfe-screen.cjs');
async function showFiles(s){const toggle=s.nodes().find(n=>n.props.testID==='saved-files-toggle');if(toggle&&!toggle.props.accessibilityState.expanded){toggle.props.onPress();await s.flush();}}
async function useSaved(s){await showFiles(s);return s.nodes().find(n=>n.props.accessibilityLabel==='Dùng tệp đã lưu: retained.mp4').props.onPress();}
const saved={key:id(8),kind:'VIDEO',name:'retained.mp4',size:4,uri:'file:///private/retained.mp4',availability:'LOCAL_READY',checksumSha256:'a'.repeat(64)};

test('Operator recovers an older interrupted upload whose draft never saved the video selection',async()=>{
 const file={...saved,taskId:id(2),projectId:id(3)};
 const intent={kind:'DRONE_UPLOAD_INTENT',taskId:id(2),projectId:id(3),localFileId:file.key,sizeBytes:file.size,checksumSha256:file.checksumSha256,purpose:'SURVEY_VIDEO',status:'VERIFY_PENDING',parts:[{}],body:{fileName:file.name}};
 const s=drone('upload',{}, {params:{taskId:id(2)},modules:{
  '../../src/api/operatorUploadDraft':{openOperatorUploadDraft:async()=>({read:async()=>({videoKey:null,telemetryKey:null,recordedAt:'',timeOffset:''}),close(){}})},
  '../../src/api/droneTaskJournal':{openDroneUploadJournal:async()=>({read:async kind=>kind==='upload'?[intent]:[],close(){}})},
  '../../src/api/droneLocalFiles':{openDroneLocalFiles:async()=>({list:async()=>[file],close(){}})},
 }});
 s.render();await s.flush();
 assert.match(JSON.stringify(s.nodes().filter(n=>n.props.testID==='selected-video')),/retained.mp4/);
 assert.doesNotMatch(JSON.stringify(s.nodes()),/Chọn video MP4 trước khi nộp/);
 assert.equal(s.nodes().find(n=>n.type==='RecordingDateTimeField').props.value,'');
 s.unmount();
});

for(const reason of ['checksum-mismatch','ambiguous','cancel-pending'])test('Operator does not guess a recovery source: '+reason,async()=>{
 const file={...saved,taskId:id(2),projectId:id(3)};
 const intent={taskId:id(2),projectId:id(3),localFileId:file.key,sizeBytes:file.size,
  checksumSha256:reason==='checksum-mismatch'?'b'.repeat(64):file.checksumSha256,
  purpose:'SURVEY_VIDEO',status:'VERIFY_PENDING',...(reason==='cancel-pending'?{cancelRequest:{phase:'UNKNOWN'}}:{})};
 const s=drone('upload',{}, {params:{taskId:id(2)},modules:{
  '../../src/api/operatorUploadDraft':{openOperatorUploadDraft:async()=>({read:async()=>null,close(){}})},
  '../../src/api/droneTaskJournal':{openDroneUploadJournal:async()=>({read:async kind=>kind==='upload'?(reason==='ambiguous'?[intent,{...intent}]:[intent]):[],close(){}})},
  '../../src/api/droneLocalFiles':{openDroneLocalFiles:async()=>({list:async()=>[file],close(){}})},
 }});
 s.render();await s.flush();assert.equal(s.nodes().filter(n=>n.props.testID==='selected-video').length,0);s.unmount();
});

test('Operator persists upload inputs before any transfer and restores them after same-account login',async()=>{
 const file={...saved,taskId:id(2),projectId:id(3)},calls=[];let draft=null;
 const task={id:id(2),projectId:id(3),operatorId:id(1),status:'ACCEPTED',scope:[],version:'version'};
 const s=drone('upload',{
  getOperatorSurveyTaskDetailReal:async()=>({data:task,etag:'"version"'}),
  listEligibleOperatorDronesReal:async()=>({items:[{id:id(7)}],nextCursor:null}),
 },{params:{taskId:id(2),projectId:id(3)},modules:{
  '../../src/api/operatorUploadDraft':{openOperatorUploadDraft:async()=>({read:async()=>draft,save:async value=>{calls.push('save');draft=value;},close(){}})},
  '../../src/api/droneSelectionJournal':{openDroneSelectionJournal:async()=>({read:async()=>({droneId:id(7)}),close(){}})},
  '../../src/api/droneTaskJournal':{openDroneUploadJournal:async()=>({read:async()=>[],close(){}})},
  '../../src/api/droneLocalFiles':{openDroneLocalFiles:async()=>({list:async()=>[file],close(){}})},
  '../../src/api/droneDatasetWorkflow':{orchestrateDroneUpload:async()=>{calls.push('transfer');throw Error('offline');}},
 }});
 s.render();await s.flush();await useSaved(s);await s.flush();
 s.nodes().find(n=>n.type==='RecordingDateTimeField').props.onChangeText('2026-11-14 08:30');await s.flush();
 s.press('Nộp bộ dữ liệu 4K RGB');await s.flush();
 assert.deepEqual(calls,['save','transfer']);assert.equal(draft.videoKey,file.key);
 s.h.logout();s.render();await s.flush();s.h.login('DRONE_OPERATOR',id(1));s.render();await s.flush();
 assert.match(JSON.stringify(s.nodes().filter(n=>n.props.testID==='selected-video')),/retained.mp4/);
 assert.equal(s.nodes().find(n=>n.type==='RecordingDateTimeField').props.value,'2026-11-14 08:30');
 s.unmount();
});

for(const stop of ['disk-failure','logout-during-save'])test('Operator never starts transfer after '+stop,async()=>{
 const file={...saved,taskId:id(2),projectId:id(3)},wait=deferred();let transfers=0,saves=0;
 const task={id:id(2),projectId:id(3),operatorId:id(1),status:'ACCEPTED',scope:[],version:'version'};
 const s=drone('upload',{
  getOperatorSurveyTaskDetailReal:async()=>({data:task,etag:'"version"'}),
  listEligibleOperatorDronesReal:async()=>({items:[{id:id(7)}],nextCursor:null}),
 },{params:{taskId:id(2),projectId:id(3)},modules:{
  '../../src/api/operatorUploadDraft':{openOperatorUploadDraft:async()=>({read:async()=>null,save:async()=>{saves++;if(stop==='disk-failure')throw Error('disk');await wait.promise;},close(){}})},
  '../../src/api/droneSelectionJournal':{openDroneSelectionJournal:async()=>({read:async()=>({droneId:id(7)}),close(){}})},
  '../../src/api/droneTaskJournal':{openDroneUploadJournal:async()=>({read:async()=>[],close(){}})},
  '../../src/api/droneLocalFiles':{openDroneLocalFiles:async()=>({list:async()=>[file],close(){}})},
  '../../src/api/droneDatasetWorkflow':{orchestrateDroneUpload:async()=>{transfers++;throw Error('must_not_send');}},
 }});
 s.render();await s.flush();await useSaved(s);await s.flush();
 s.nodes().find(n=>n.type==='RecordingDateTimeField').props.onChangeText('2026-11-14 08:30');await s.flush();
 s.press('Nộp bộ dữ liệu 4K RGB');await s.flush();assert.equal(saves,1);
 if(stop==='logout-during-save'){s.h.logout();s.render();await s.flush();wait.resolve();await s.flush();}
 assert.equal(transfers,0);s.unmount();
});

test('Operator verification polls retain completed byte progress without restarting upload UI',async()=>{
 const file={...saved,taskId:id(2),projectId:id(3)};
 const pending=deferred();let polls=0;
 const task={id:id(2),projectId:id(3),operatorId:id(1),status:'ACCEPTED',scope:[],version:'version'};
 const s=drone('upload',{
  getOperatorSurveyTaskDetailReal:async()=>({data:task,etag:'"version"'}),
  listEligibleOperatorDronesReal:async()=>({items:[{id:id(7)}],nextCursor:null}),
 },{params:{taskId:id(2),projectId:id(3)},modules:{
  '../../src/api/droneSelectionJournal':{openDroneSelectionJournal:async()=>({read:async()=>({droneId:id(7)}),close(){}})},
  '../../src/api/droneTaskJournal':{openDroneUploadJournal:async()=>({read:async()=>[],close(){}})},
  '../../src/api/droneLocalFiles':{openDroneLocalFiles:async()=>({list:async()=>[file],close(){}})},
  '../../src/api/droneDatasetWorkflow':{
   orchestrateDroneUpload:async plan=>{polls++;if(polls===1){plan.onProgress(4,4);throw Error('drone_upload_verify_pending');}await pending.promise;return {fileId:id(8)};},
   submitDroneDataset:async()=>({status:'DATASET_CONFIRMED',receipt:{datasetId:id(9)}}),
   operatorDatasetScope:()=> 'owner',
   readOperatorDatasetReadback:async()=>({dataset:{surveyTaskId:id(2)}}),
  }
 }});
 try {
  s.render();await s.flush();await useSaved(s);await s.flush();
  s.nodes().find(n=>n.type==='RecordingDateTimeField').props.onChangeText('2026-11-14 08:30');await s.flush();
  s.press('Nộp bộ dữ liệu 4K RGB');await s.flush();
  const progress=()=>s.nodes().find(n=>n.props.accessibilityRole==='progressbar');
  assert.equal(progress()?.props.accessibilityValue.now,100,'verification retains the completed upload bar');
  assert.match(JSON.stringify(s.nodes()),/Đã tải video/);
  await new Promise(resolve=>setTimeout(resolve,1100));await s.flush();
  assert.equal(polls,2);assert.equal(progress()?.props.accessibilityValue.now,100);
  assert.doesNotMatch(JSON.stringify(s.nodes()),/Đang tải video/);
  assert.match(JSON.stringify(s.nodes()),/Đang chờ máy chủ xác minh/);
 } finally {pending.resolve();await s.flush();s.unmount();}
});
test('Operator finishes interrupted checksum before selecting retained bytes and blocks duplicate actions',async()=>{
 const pending=deferred();let hashes=0;
 const file={...saved,availability:'LOCAL_UNHASHED',checksumSha256:null};
 const s=drone('upload',{}, {params:{taskId:id(2)},modules:{'../../src/api/droneLocalFiles':{openDroneLocalFiles:async()=>({list:async()=>[file],rehash:async key=>{assert.equal(key,file.key);hashes++;return pending.promise;},close(){}})}}});
 s.render();await s.flush();await showFiles(s);const button=s.nodes().find(n=>n.props.accessibilityLabel==='Dùng tệp đã lưu: retained.mp4');
 const restore=button.props.onPress();await s.flush();assert.equal(hashes,1);
 assert.doesNotMatch(JSON.stringify(s.nodes().filter(n=>n.props.testID==='selected-video')),/retained.mp4/);
 assert.match(JSON.stringify(s.nodes()),/Đang chọn hoặc sao lưu tệp/);
 await button.props.onPress();assert.equal(hashes,1);
 pending.resolve(saved);await restore;await s.flush();
 assert.match(JSON.stringify(s.nodes().filter(n=>n.props.testID==='selected-video')),/retained.mp4/);
 assert.match(JSON.stringify(s.nodes()),/Đã lưu trên thiết bị/);s.unmount();
});
test('Operator never publishes an interrupted checksum into a different session',async()=>{
 const pending=deferred();const file={...saved,availability:'LOCAL_UNHASHED',checksumSha256:null};
 const s=drone('upload',{}, {params:{taskId:id(2)},modules:{'../../src/api/droneLocalFiles':{openDroneLocalFiles:async()=>({list:async()=>[file],rehash:()=>pending.promise,close(){}})}}});
 s.render();await s.flush();await showFiles(s);const restore=s.nodes().find(n=>n.props.accessibilityLabel==='Dùng tệp đã lưu: retained.mp4').props.onPress();await s.flush();
 s.h.login('DRONE_OPERATOR',id(9));s.render();await s.flush();pending.resolve(saved);await restore;await s.flush();
 assert.doesNotMatch(JSON.stringify(s.nodes().filter(n=>n.props.testID==='selected-video')),/retained.mp4/);s.unmount();
});
for(const change of ['task','session','actor','environment','logout-relogin'])test('Drone copy stays visibly busy across '+change+' until old preservation settles',async()=>{
 const d=deferred(),params={taskId:id(2)};let copies=0,picks=0;
 const s=drone('upload',{}, {params,pick:async()=>{picks++;return {canceled:false,assets:[{name:'private-old.mp4',uri:'file:///source.mp4',size:4}]};},modules:{
 '../../src/api/droneLocalFiles':{openDroneLocalFiles:async()=>({list:async()=>[],preserve:()=>{copies++;return copies===1?d.promise:Promise.resolve(saved);},close(){}})}}});
 const picker=()=>s.nodes().find(n=>n.type==='Pressable'&&n.props.children?.some(c=>c?.props?.children?.includes('Chọn tệp')));
 s.render();await s.flush();const pending=picker().props.onPress();await s.flush();assert.equal(copies,1);
 const auth=s.h.getAuth();
 if(change==='task')params.taskId=id(9);
 else if(change==='environment')s.h.client.defaults.baseURL='https://other.example.test';
 else if(change==='session')s.h.changeAuth({...auth,token:s.h.jwt(id(1),'next-session')});
 else if(change==='actor')s.h.login('DRONE_OPERATOR',id(9));
 else {s.h.logout();s.render();await s.flush();s.h.changeAuth(auth);}
 s.render();await s.flush();
 assert.match(JSON.stringify(s.nodes()),/Đang chọn hoặc sao lưu tệp/);
 assert.equal(picker().props.disabled,true);
 await picker().props.onPress();assert.equal(picks,1,'old operation still owns lock');
 d.resolve({...saved,name:'private-old.mp4'});await pending;await s.flush();
 assert.doesNotMatch(JSON.stringify(s.nodes().filter(n=>n.props?.testID==='selected-video')),/private-old.mp4/);
 assert.equal(picker().props.disabled,false);
 await picker().props.onPress();await s.flush();assert.equal(picks,2);s.unmount();
});
test('Drone upload presents local preservation without a fake online/offline switch',async()=>{
 const s=drone('upload');s.render();await s.flush();
 assert.ok(!s.nodes().some(n=>n.props?.accessibilityRole==='radio'));
 assert.doesNotMatch(JSON.stringify(s.nodes()),/CHẾ ĐỘ ĐỒNG BỘ NGOẠI TUYẾN|Trực tuyến \(Wi-Fi\/4G\)/);
 assert.match(JSON.stringify(s.nodes()),/Tệp đã lưu/);assert.doesNotMatch(JSON.stringify(s.nodes()),/Đã tải lên thành công/);s.unmount();
});
test('Drone upload preserves picker bytes before displaying selection and reopens retained files explicitly',async()=>{
 let writes=0;const d=deferred();
 const s=drone('upload',{}, {params:{taskId:id(2)},pick:async()=>({canceled:false,assets:[{name:'new.mp4',uri:'file:///source.mp4',size:4}]}),modules:{
  '../../src/api/droneLocalFiles':{openDroneLocalFiles:async()=>({list:async()=>[saved],preserve:async()=>{writes++;return d.promise;},close(){}})}}});
 s.render();await s.flush();assert.doesNotMatch(JSON.stringify(s.nodes().filter(n=>n.props?.testID==='selected-video')),/retained.mp4/);
 const pending=s.nodes().find(n=>n.type==='Pressable'&&n.props.children?.some(c=>c?.props?.children?.includes('Chọn tệp'))).props.onPress();
 await s.flush();assert.equal(writes,1);assert.match(JSON.stringify(s.nodes()),/Đang chọn hoặc sao lưu tệp/);assert.doesNotMatch(JSON.stringify(s.nodes().filter(n=>n.props?.testID==='selected-video')),/new.mp4/);
 d.resolve({...saved,name:'new.mp4'});await pending;await s.flush();assert.match(JSON.stringify(s.nodes().filter(n=>n.props?.testID==='selected-video')),/new.mp4/);
 await useSaved(s);await s.flush();assert.match(JSON.stringify(s.nodes().filter(n=>n.props?.testID==='selected-video')),/retained.mp4/);s.unmount();
});
test('Drone upload retains prior selection when preservation fails and hides late preservation after logout',async()=>{
 for(const logout of [false,true]){
 const d=deferred();const s=drone('upload',{}, {params:{taskId:id(2)},pick:async()=>({canceled:false,assets:[{name:'new.mp4',uri:'file:///source.mp4',size:4}]}),modules:{
 '../../src/api/droneLocalFiles':{openDroneLocalFiles:async()=>({list:async()=>[saved],preserve:()=>d.promise,close(){}})}}});
 s.render();await s.flush();await useSaved(s);await s.flush();
 const pending=s.nodes().find(n=>n.type==='Pressable'&&n.props.children?.some(c=>c?.props?.children?.includes('Chọn tệp'))).props.onPress();await s.flush();
 if(logout){s.h.changeAuth({status:'SIGNED_OUT',user:null,token:null});s.render();}
 d.reject(Error('disk full'));await pending;await s.flush();
 const text=JSON.stringify(s.nodes());if(logout)assert.doesNotMatch(text,/retained.mp4|new.mp4/);else assert.match(text,/retained.mp4/);s.unmount();
 }
});
test('Drone sync reports read errors without success and can reopen storage after init failure',async()=>{
 let opens=0,reads=0,failInit=true,failRead=true;
 const identity={actor:id(1),environment:'fixture',session:'fixture',role:'DRONE_OPERATOR'};
 const s=drone('sync',{}, {exportName:'DroneSyncContent',expose:'DroneSyncContent',props:{identity},modules:{'expo-sqlite':{},
 '../../src/offline/database':{openDatabase:()=>{opens++;return{};},initDatabase:async()=>{if(failInit)throw Error('disk');}},
 '../../src/offline/upload-queue':{currentQueueIdentity:()=>identity,sameQueueIdentity:()=>true,createQueueReader:()=>({cancel(){},read:async()=>{reads++;if(failRead)throw Error('read');return[];}}),queueChecksumLabel:()=>''}}});
 s.render();await s.flush();failInit=false;
 const button=()=>s.nodes().find(n=>n.type==='Pressable'&&n.props.accessibilityLabel==='Đọc lại hàng đợi');assert.equal(button().props.disabled,false);
 await button().props.onPress();await s.flush();assert.ok(opens>=2);assert.ok(reads>0);assert.match(JSON.stringify(s.nodes()),/Không đọc được/);assert.doesNotMatch(JSON.stringify(s.nodes()),/Đã làm mới danh sách/);
 failRead=false;await button().props.onPress();await s.flush();assert.match(JSON.stringify(s.nodes()),/Đã làm mới danh sách/);s.unmount();
});

test('Drone log does not fetch duplicate task data across an actor bounce',async()=>{
 let sessionIdentity,reads=0; const props={scope:''},s=drone('log',{listOperatorSurveyTasksReal:async()=>{reads++;return {items:[],nextCursor:null};}},{exportName:'DroneLogContent',expose:'DroneLogContent',props,modules:{'../../src/api/authApi':{passwordSessionIdentity:t=>sessionIdentity(t)}}});
 // Use the actual exported scope from the running auth fixture.
 sessionIdentity=s.h.load('src/api/authApi.ts').passwordSessionIdentity;const current=s.h.getAuth();props.scope=JSON.stringify([null,sessionIdentity(current.token)]);
 s.render();s.h.login('DRONE_OPERATOR',id(9));s.h.changeAuth(current);
 await s.flush();assert.equal(reads,0);
 assert.ok(!s.nodes().some(n=>n.type==='Pressable'&&JSON.stringify(n).includes('00000002')));s.unmount();
});

test('Operator restores a hashed local file without mislabelling it missing',async()=>{
 const file={...saved,availability:'LOCAL_READY',checksumSha256:'a'.repeat(64)};
 const s=drone('upload',{}, {params:{taskId:id(2)},modules:{'../../src/api/droneLocalFiles':{openDroneLocalFiles:async()=>({list:async()=>[file],close(){}})}}});
 s.render();await s.flush();await showFiles(s);const button=s.nodes().find(n=>n.props.accessibilityLabel==='Dùng tệp đã lưu: retained.mp4');assert.equal(button.props.disabled,false);
 await button.props.onPress();await s.flush();assert.match(JSON.stringify(s.nodes().filter(n=>n.props.testID==='selected-video')),/retained.mp4/);assert.doesNotMatch(JSON.stringify(s.nodes()),/Không tìm thấy tệp/);s.unmount();
});

test('Operator one press transfers verified video then submits and reads the dataset receipt',async()=>{
 const file={...saved,taskId:id(2),projectId:id(3),availability:'LOCAL_READY',checksumSha256:'a'.repeat(64)};
 const calls=[],pending=deferred(),preflight=deferred();let receipt=null,holdPreflight=false;
 const task={id:id(2),projectId:id(3),operatorId:id(1),status:'ACCEPTED',scope:[{routeVersionId:id(5)}],version:'version'};
 const s=drone('upload',{
  getOperatorSurveyTaskDetailReal:async()=>{if(holdPreflight)await preflight.promise;return {data:task,etag:'"version"'};},
  listEligibleOperatorDronesReal:async()=>({items:[{id:id(7),serialNo:'QA'}],nextCursor:null}),
 },{params:{taskId:id(2),projectId:id(3)},modules:{
  '../../src/api/droneSelectionJournal':{openDroneSelectionJournal:async()=>({read:async()=>({droneId:id(7)}),close(){}})},
  '../../src/api/droneTaskJournal':{openDroneUploadJournal:async()=>({read:async()=>receipt?[receipt]:[],close(){}})},
  '../../src/api/droneLocalFiles':{openDroneLocalFiles:async()=>({list:async()=>[file],close(){}})},
  '../../src/api/droneDatasetWorkflow':{
   operatorDatasetScope:()=> 'owner',
   orchestrateDroneUpload:async plan=>{calls.push(['transfer',plan]);await pending.promise;return {fileId:id(8)};},
   submitDroneDataset:async plan=>{calls.push(['submit',plan]);return receipt={status:'DATASET_CONFIRMED',receipt:{datasetId:id(9)}};},
   readOperatorDatasetReadback:async(owner,datasetId)=>{calls.push(['read',owner,datasetId]);return {dataset:{surveyTaskId:id(2)}};},
  }
 }});
 s.render();await s.flush();await useSaved(s);await s.flush();
 s.nodes().find(n=>n.type==='RecordingDateTimeField').props.onChangeText('2026-11-14 08:30');await s.flush();
 const send=()=>s.nodes().find(n=>n.props.title==='Nộp bộ dữ liệu 4K RGB'||n.props.title==='Đang gửi dữ liệu…');
 assert.equal(send().props.disabled,false);holdPreflight=true;const submit=send().props.onPress;submit();await s.flush();
 assert.ok(s.nodes().some(n=>n.props.testID==='dataset-transfer-card'),'preflight must not leave a blank screen');
 assert.match(JSON.stringify(s.nodes()),/Đang chuẩn bị gửi/);
 assert.equal(s.nodes().filter(n=>n.type==='ActivityIndicator').length,1);
 preflight.resolve();await s.flush();
 assert.equal(send(),undefined);submit();await s.flush();assert.equal(calls.length,1);
 assert.ok(s.nodes().some(n=>n.props.testID==='dataset-transfer-card'));
 assert.ok(!s.nodes().some(n=>n.type==='RecordingDateTimeField'));
 assert.ok(!s.nodes().some(n=>n.props.accessibilityLabel==='Dùng tệp đã lưu: retained.mp4'));
 assert.equal(s.nodes().filter(n=>n.type==='ActivityIndicator').length,0,'byte progress must not show a second spinner');
 const progress=s.nodes().find(n=>n.props.accessibilityRole==='progressbar');assert.equal(progress.props.accessibilityValue.now,0);
 assert.ok(s.nodes().some(n=>n.props.accessibilityLiveRegion==='polite'));
 assert.ok(!s.nodes().some(n=>n.props.accessibilityRole==='status'),'unsupported Android role must not return');
 pending.resolve();await s.flush();
 assert.deepEqual(calls.map(c=>c[0]),['transfer','submit','read']);
 assert.deepEqual(Array.from(calls[1][1].payload.videoFileIds),[id(8)]);assert.equal(calls[1][1].payload.deviceId,id(7));
 assert.equal(calls[1][1].ifMatch,'"version"');
 assert.match(JSON.stringify(s.nodes()),/Máy chủ đã nhận bộ dữ liệu/);
 assert.ok(!s.nodes().some(n=>n.type==='RecordingDateTimeField'));
 assert.equal(s.nodes().filter(n=>n.type==='ActivityIndicator').length,0);s.unmount();
});
