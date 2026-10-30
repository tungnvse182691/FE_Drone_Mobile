const {test}=require('node:test'),assert=require('node:assert/strict');
const {drone,id}=require('./package45-drone.test.cjs');
const {deferred}=require('./helpers/roadfe-screen.cjs');
const saved={key:id(8),kind:'VIDEO',name:'retained.mp4',size:4,uri:'file:///private/retained.mp4',availability:'LOCAL_UNHASHED'};
test('Drone upload preserves picker bytes before displaying selection and reopens retained files explicitly',async()=>{
 let writes=0;const d=deferred();
 const s=drone('upload',{}, {params:{taskId:id(2)},pick:async()=>({canceled:false,assets:[{name:'new.mp4',uri:'file:///source.mp4',size:4}]}),modules:{
  '../../src/api/droneLocalFiles':{openDroneLocalFiles:async()=>({list:async()=>[saved],preserve:async()=>{writes++;return d.promise;},close(){}})}}});
 s.render();await s.flush();assert.doesNotMatch(JSON.stringify(s.nodes().filter(n=>n.props?.testID==='selected-video')),/retained.mp4/);
 const pending=s.nodes().find(n=>n.type==='Pressable'&&n.props.children?.some(c=>c?.props?.children?.includes('Chọn tệp SD'))).props.onPress();
 await s.flush();assert.equal(writes,1);assert.doesNotMatch(JSON.stringify(s.nodes().filter(n=>n.props?.testID==='selected-video')),/new.mp4/);
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
