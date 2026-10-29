const {test}=require('node:test'); const assert=require('node:assert/strict');
const {screen,deferred}=require('./helpers/roadfe-screen.cjs');
const id=n=>`${String(n).padStart(8,'0')}-1111-4111-8111-111111111111`;
const task={id:id(2),projectId:id(3),operatorId:id(1),scope:[],status:'NEW_ASSIGNED',version:'v1'};
function drone(file,api={},extra={}) {
  const component=name=>({[name]:name});
  const s=screen(`app/(drone)/${file}.tsx`,{...extra,modules:{
    '../../src/components/AppHeader':component('AppHeader'), '../../src/components/Card':component('Card'),
    '../../src/components/Chip':component('Chip'),'../../src/components/EmptyState':component('EmptyState'),
    '../../src/components/AnimatedPressable':component('AnimatedPressable'), '../../src/components/Toast':component('Toast'),
    '../../src/components/drone/DroneDatasetReadbackPanel':component('DroneDatasetReadbackPanel'),
    '../../src/api/droneApi':api,...extra.modules,
  }}); s.h.login('DRONE_OPERATOR',id(1)); return s;
}
test('Drone profile keeps cards without fabricated pilot, hardware, statistics or cleanup success',async()=>{
  const s=drone('profile');s.render();await s.flush();
  const text=JSON.stringify(s.nodes());
  assert.doesNotMatch(text,/HH-2089|128h|M350-HH-02|142 MB|Đội Khảo sát Số 1/);
  assert.match(text,/Chưa có dữ liệu/);
  assert.ok(!s.nodes().some(n=>n.props?.accessibilityLabel==='Dọn dẹp cache máy')); s.unmount();
});
for(const file of ['home','requests']) test(`Drone ${file} discards late page after environment switch`,async()=>{
  const d=deferred();let calls=0;const s=drone(file,{listOperatorSurveyTasksReal:()=>++calls===1?d.promise:new Promise(()=>{})});s.render();
  s.h.client.defaults.baseURL='other-environment'; d.resolve({items:[task],nextCursor:null});await s.flush();
  assert.doesNotMatch(JSON.stringify(s.nodes()),/00000002/);s.unmount();
});
test('Drone upload discards picker response after logout and does not assert RTK match',async()=>{
  const d=deferred();const s=drone('upload',{}, {pick:()=>d.promise});s.render();await s.flush();
  const pending=s.nodes().find(n=>n.type==='Pressable'&&n.props.children?.some(c=>c?.props?.children?.includes('Chọn tệp SD'))).props.onPress();
  s.h.changeAuth({status:'SIGNED_OUT',user:null,token:null});d.resolve({canceled:false,assets:[{name:'private-video.mp4',uri:'private',size:200}]});await pending;await s.flush();
  assert.doesNotMatch(JSON.stringify(s.nodes()),/private-video|Khớp trạm RTK/);s.unmount();
});
module.exports={drone,id,task};

for(const file of ['request-detail','request-decline','work-package']) test(`Drone ${file} discards task after logout`,async()=>{
  const d=deferred(); const s=drone(file,{getOperatorSurveyTaskDetailReal:()=>d.promise,getOperatorWorkPackageReal:()=>d.promise},{params:{taskId:task.id}});
  s.render(); s.h.changeAuth({status:'SIGNED_OUT',user:null,token:null});
  d.resolve({data:file==='work-package'?{task,geometryRefs:[]}:task,etag:'"v1"'}); await s.flush();
  assert.doesNotMatch(JSON.stringify(s.nodes()),/00000002|00000003/); s.unmount();
});

test('Drone work package retains task when geometry read fails and hides invalid GPS',async()=>{
 const wp={task,geometryRefs:[{routeVersionId:id(4),segmentSetId:id(5),segmentIds:[id(6)]}],accessPoint:{point:{latitude:200,longitude:106},source:'PLANNED_RENDEZVOUS'}};
 const s=drone('work-package',{getOperatorWorkPackageReal:async()=>({data:wp}),getOperatorGeometryPackageReal:async()=>{throw Error('offline');}},{params:{taskId:task.id}});
 s.render(); await s.flush();const text=JSON.stringify(s.nodes());
 assert.match(text,/Thông tin nhiệm vụ vẫn được giữ/);assert.match(text,/NHIỆM VỤ/);assert.doesNotMatch(text,/200.000000/);s.unmount();
});
test('Drone sync local ACK is not a server receipt and raw payload/error is not rendered',()=>{
 const s=drone('sync',{}, {exportName:'describeItem',expose:'describeItem',props:{id:'local',kind:'submit_dataset',status:'ACKED',attempt:1,last_error:'private-backend-detail',payload_json:'{}',checksum_sha256:null},modules:{'expo-sqlite':{}}});
 s.render();const result=s.nodes()[0];
 // The exported formatter returns a data object, not an Android view.
 assert.match(result.statusText,/chưa xác minh/);assert.doesNotMatch(JSON.stringify(result),/private-backend-detail/);s.unmount();
});

test('Drone read survives refresh status changes in same sid but not actor bounce',async()=>{
 for(const bounce of [false,true]) {
  const d=deferred();let calls=0;const s=drone('home',{listOperatorSurveyTasksReal:()=>++calls===1?d.promise:new Promise(()=>{})});s.render();
  const initial=s.h.getAuth();
  if(bounce){s.h.login('DRONE_OPERATOR',id(7));s.h.changeAuth(initial);}
  else {s.h.changeAuth({...initial,status:'REFRESHING'});s.h.changeAuth(initial);}
  d.resolve({items:[task]});await s.flush();
  if(bounce) assert.doesNotMatch(JSON.stringify(s.nodes()),/00000002/);
  else assert.match(JSON.stringify(s.nodes()),/00000002/);
  s.unmount();
 }
});
