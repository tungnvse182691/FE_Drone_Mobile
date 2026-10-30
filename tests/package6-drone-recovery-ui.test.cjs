const {test}=require('node:test'),assert=require('node:assert/strict');
const {drone,id}=require('./package45-drone.test.cjs');
const {deferred}=require('./helpers/roadfe-screen.cjs');
const saved={key:id(8),kind:'VIDEO',name:'retained.mp4',size:4,uri:'file:///private/retained.mp4',availability:'LOCAL_UNHASHED'};
for(const change of ['task','session','actor','environment','logout-relogin'])test('Drone copy stays visibly busy across '+change+' until old preservation settles',async()=>{
 const d=deferred(),params={taskId:id(2)};let copies=0,picks=0;
 const s=drone('upload',{}, {params,pick:async()=>{picks++;return {canceled:false,assets:[{name:'private-old.mp4',uri:'file:///source.mp4',size:4}]};},modules:{
 '../../src/api/droneLocalFiles':{openDroneLocalFiles:async()=>({list:async()=>[],preserve:()=>{copies++;return copies===1?d.promise:Promise.resolve(saved);},close(){}})}}});
 const picker=()=>s.nodes().find(n=>n.type==='Pressable'&&n.props.children?.some(c=>c?.props?.children?.includes('Chọn tệp SD')));
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
 assert.match(JSON.stringify(s.nodes()),/Chưa xác minh kết nối mạng/);s.unmount();
});
test('Drone upload preserves picker bytes before displaying selection and reopens retained files explicitly',async()=>{
 let writes=0;const d=deferred();
 const s=drone('upload',{}, {params:{taskId:id(2)},pick:async()=>({canceled:false,assets:[{name:'new.mp4',uri:'file:///source.mp4',size:4}]}),modules:{
  '../../src/api/droneLocalFiles':{openDroneLocalFiles:async()=>({list:async()=>[saved],preserve:async()=>{writes++;return d.promise;},close(){}})}}});
 s.render();await s.flush();assert.doesNotMatch(JSON.stringify(s.nodes().filter(n=>n.props?.testID==='selected-video')),/retained.mp4/);
 const pending=s.nodes().find(n=>n.type==='Pressable'&&n.props.children?.some(c=>c?.props?.children?.includes('Chọn tệp SD'))).props.onPress();
 await s.flush();assert.equal(writes,1);assert.match(JSON.stringify(s.nodes()),/Đang chọn hoặc sao lưu tệp/);assert.doesNotMatch(JSON.stringify(s.nodes().filter(n=>n.props?.testID==='selected-video')),/new.mp4/);
 d.resolve({...saved,name:'new.mp4'});await pending;await s.flush();assert.match(JSON.stringify(s.nodes().filter(n=>n.props?.testID==='selected-video')),/new.mp4/);
 await s.press('Dùng tệp đã lưu: retained.mp4');await s.flush();assert.match(JSON.stringify(s.nodes().filter(n=>n.props?.testID==='selected-video')),/retained.mp4/);s.unmount();
});
test('Drone upload retains prior selection when preservation fails and hides late preservation after logout',async()=>{
 for(const logout of [false,true]){
 const d=deferred();const s=drone('upload',{}, {params:{taskId:id(2)},pick:async()=>({canceled:false,assets:[{name:'new.mp4',uri:'file:///source.mp4',size:4}]}),modules:{
 '../../src/api/droneLocalFiles':{openDroneLocalFiles:async()=>({list:async()=>[saved],preserve:()=>d.promise,close(){}})}}});
 s.render();await s.flush();await s.press('Dùng tệp đã lưu: retained.mp4');await s.flush();
 const pending=s.nodes().find(n=>n.type==='Pressable'&&n.props.children?.some(c=>c?.props?.children?.includes('Chọn tệp SD'))).props.onPress();await s.flush();
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
 const button=()=>s.nodes().find(n=>n.type==='Button'&&n.props.title==='Đọc lại hàng đợi');assert.equal(button().props.disabled,false);
 await button().props.onPress();await s.flush();assert.ok(opens>=2);assert.ok(reads>0);assert.match(JSON.stringify(s.nodes()),/Không đọc được/);assert.doesNotMatch(JSON.stringify(s.nodes()),/Đã đọc lại dữ liệu/);
 failRead=false;await button().props.onPress();await s.flush();assert.match(JSON.stringify(s.nodes()),/Đã đọc lại dữ liệu/);s.unmount();
});

test('Drone log rejects a late list after actor leaves and returns to the same session',async()=>{
 let sessionIdentity; const d=deferred(),props={scope:''},s=drone('log',{listOperatorSurveyTasksReal:()=>d.promise},{exportName:'DroneLogContent',expose:'DroneLogContent',props,modules:{'../../src/api/authApi':{passwordSessionIdentity:t=>sessionIdentity(t)}}});
 // Use the actual exported scope from the running auth fixture.
 sessionIdentity=s.h.load('src/api/authApi.ts').passwordSessionIdentity;const current=s.h.getAuth();props.scope=JSON.stringify([null,sessionIdentity(current.token)]);
 s.render();s.h.login('DRONE_OPERATOR',id(9));s.h.changeAuth(current);
 d.resolve({items:[{id:id(2),status:'ACCEPTED'}]});await s.flush();
 assert.ok(!s.nodes().some(n=>n.type==='Pressable'&&JSON.stringify(n).includes('00000002')));s.unmount();
});
