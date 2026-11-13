const {test}=require('node:test');
const assert=require('node:assert/strict');
const {drone,id,task}=require('./package45-drone.test.cjs');
const text=s=>JSON.stringify(s.nodes().filter(n=>n.type==='Text'));
const walk=n=>!n?[]:Array.isArray(n)?n.flatMap(walk):typeof n==='object'?[n,...walk(n.props?.children)]:[];
test('02C Profile wraps menus, preserves queue route and avoids empty fake KPI cards',async()=>{
 const routes=[];const s=drone('profile',{}, {moduleFactories:{'expo-router':({modules})=>({...modules['expo-router'],router:{push:r=>routes.push(r)}})}});
 s.render();await s.flush();
 assert.equal(s.nodes().find(n=>n.type==='SafeAreaScreen').props.header?.props.subtitle,'Hồ sơ');
 assert.doesNotMatch(text(s),/Giờ bay|Sự cố/);
 const queue=s.nodes().find(n=>n.type==='Pressable'&&JSON.stringify(n.props.children).includes('Hàng đợi trên thiết bị'));
 const menuStyle=queue.props.style({pressed:false});assert.ok(menuStyle.some(v=>v?.minHeight>=48));assert.ok(queue.props.style({pressed:true}).some(v=>v?.backgroundColor));queue.props.onPress();assert.equal(routes.at(-1),'/(drone)/sync');
 assert.ok(s.nodes().some(n=>n.type==='Pressable'&&JSON.stringify(n.props.children).includes('Đăng xuất tài khoản')));s.unmount();
});
test('02C Sync gives queue priority and keeps UNKNOWN and local ACK distinct without replay',async()=>{
 const identity={actor:id(1),environment:'fixture',session:'fixture',role:'DRONE_OPERATOR'};
 const rows=['UNKNOWN_OUTCOME','ACKED'].map((status,i)=>({id:String(i),kind:'submit_dataset',status,attempt:1,checksum_sha256:null}));
 const s=drone('sync',{}, {expose:'DroneSyncContent',exportName:'DroneSyncContent',props:{identity},modules:{'expo-sqlite':{},'../../src/components/drone/DroneTaskCommandPanel':{DroneTaskRecoveryList:'DroneTaskRecoveryList'},'../../src/offline/database':{openDatabase:()=>({}),initDatabase:async()=>{}},'../../src/offline/upload-queue':{currentQueueIdentity:()=>identity,sameQueueIdentity:()=>true,createQueueReader:()=>({cancel(){},read:async()=>rows}),queueChecksumLabel:()=>''}}});
 s.render();await s.flush();
 const nodes=s.nodes();assert.ok(nodes.findIndex(n=>n.type==='Button')<nodes.findIndex(n=>n.type==='DroneTaskRecoveryList'));
 assert.match(text(s),/Chưa rõ kết quả/);
 const tabs=()=>s.nodes().filter(n=>n.type==='Pressable'&&n.props.accessibilityRole==='tab');
 assert.equal(tabs().length,2);for(const t of tabs())assert.ok(t.props.style.some(v=>v?.minHeight>=48));
 tabs()[1].props.onPress();await s.flush();assert.match(text(s),/chưa xác minh biên nhận/);
 assert.ok(!s.nodes().some(n=>n.type==='MaterialIcons'&&n.props.name==='check-circle'));s.unmount();
});
test('02C Work Package shows only pinned segments, truthful revision and collapsed technical metadata',async()=>{
 const ref={routeVersionId:id(4),segmentSetId:id(5),segmentIds:[id(6)]};
 const geometry={projectId:task.projectId,route:{routeVersionId:id(4),versionNo:7,isCurrent:false,effectiveFrom:null,surveyWidthMeters:4,lengthMeters:100,metadataStatus:'PARTIAL'},segmentSet:{id:id(5),routeVersionId:id(4),segments:[{id:id(6),code:'',chainageStart:0,chainageEnd:100,lengthMeters:100},{id:id(7),code:'OUTSIDE-SCOPE'}]}};
 const s=drone('work-package',{getOperatorWorkPackageReal:async()=>({data:{task,geometryRefs:[ref]}}),getOperatorGeometryPackageReal:async()=>({data:geometry})},{params:{taskId:task.id}});
 s.render();await s.flush();assert.match(text(s),/Phân đoạn chưa có mã/);assert.doesNotMatch(text(s),/OUTSIDE-SCOPE/);
 assert.ok(!s.nodes().some(n=>n.type==='Chip'&&n.props.label==='Bản hiện hành'));
 assert.match(text(s),/chưa cung cấp điểm tiếp cận cho nhiệm vụ này/);assert.doesNotMatch(text(s),/DSM|OpenDroneMap|SfM/);
 const toggle=()=>s.nodes().find(n=>n.props.accessibilityLabel==='Thông tin kỹ thuật');
 assert.ok(toggle());assert.equal(toggle().props.accessibilityState.expanded,false);toggle().props.onPress();await s.flush();assert.match(text(s),new RegExp(id(4)));
 const back=walk(s.nodes().find(n=>n.type==='SafeAreaScreen').props.header).find(n=>n.props.accessibilityLabel==='Quay lại');assert.ok(back.props.style({pressed:false})[0].width>=48);s.unmount();
});
