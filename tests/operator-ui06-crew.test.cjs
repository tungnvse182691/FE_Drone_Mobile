const {test}=require('node:test');
const assert=require('node:assert/strict');
const {screen}=require('./helpers/roadfe-screen.cjs');
const {drone,id,task}=require('./package45-drone.test.cjs');
const text=s=>s.nodes().filter(n=>n.type==='Text').map(n=>n.props.children.flat(Infinity).join('')).join('\n');
for(const [status,rail,label] of [
 ['NEW_ASSIGNED','#F59E0B','Mới giao'],['Reassigned','#F59E0B','Được giao lại'],
 ['Accepted','#8C6D1F','Đã nhận'],['IN_PROGRESS','#8C6D1F','Đang thực hiện'],
 ['Submitted','#2D3748','Đã nộp'],['COMPLETED','#2F9E44','Hoàn tất'],
 ['SUPPLEMENT_REQUIRED','#F59E0B','Cần bổ sung'],['Rejected','#E5484D','Đã từ chối'],
 ['CANCELLED','#E5484D','Đã huỷ'],['POSTPONED','#F59E0B','Tạm hoãn'],['FUTURE','#2D3748','Đang cập nhật']
])test('UI06 Crew row maps server status '+status+' to rail, dot and readable label',()=>{
 const t={...task,status};let taps=0;
 const s=screen('src/components/drone/OperatorTaskRow.tsx',{exportName:'OperatorTaskRow',props:{task:t,onPress:()=>taps++},modules:{'../Card':{Card:'Card'}}});s.render();
 const card=s.nodes().find(n=>n.type==='Card');assert.equal(card.props.style.borderLeftWidth,4);assert.equal(card.props.style.borderLeftColor,rail);
 const dot=s.nodes().find(n=>n.props.testID==='operator-status-dot');assert.equal(dot.props.style.width,6);assert.equal(dot.props.style.backgroundColor,rail);
 assert.match(text(s),new RegExp(label));s.nodes().find(n=>n.type==='Pressable').props.onPress();assert.equal(taps,1);assert.equal(t.status,status);s.unmount();
});

test('UI06 Detail keeps raw identities and versions in expanded technical content only',async()=>{
 const s=drone('request-detail',{getOperatorSurveyTaskDetailReal:async()=>({data:task,etag:'"v1"'}),getOperatorWorkPackageReal:async()=>({data:{task,geometryRefs:[],scopeVersion:'raw-scope-version',accessPoint:null}})},{params:{taskId:task.id}});
 s.render();await s.flush();assert.doesNotMatch(text(s),/raw-scope-version/);assert.ok(!text(s).includes(task.id));
 assert.match(text(s),/Máy chủ chưa cung cấp điểm tiếp cận cho nhiệm vụ này\./);
 s.nodes().find(n=>n.props.accessibilityLabel==='Thông tin kỹ thuật').props.onPress();await s.flush();
 assert.ok(text(s).includes(task.id));assert.match(text(s),/raw-scope-version/);s.unmount();
});

test('UI06 Upload has honest local evidence placeholders and an explanation without enabling submission',async()=>{
 const s=drone('upload',{}, {params:{taskId:task.id}});s.render();await s.flush();
 assert.match(text(s),/Chưa có ảnh xem trước/);assert.match(text(s),/Chưa được máy chủ xác minh/);
 assert.match(text(s),/Thời gian ghi hình: Chưa có dữ liệu/);assert.match(text(s),/Tọa độ ghi hình: Chưa có dữ liệu/);
 assert.ok(s.nodes().some(n=>n.props.testID==='dataset-disabled-reason'));
 const submit=s.nodes().find(n=>n.type==='Button'&&n.props.title==='Nộp bộ dữ liệu 4K RGB');assert.equal(submit.props.disabled,true);assert.equal(submit.props.style.backgroundColor,'#C9A227');assert.equal(submit.props.disabledTextStyle.color,'#1A1D20');
 assert.ok(!s.nodes().some(n=>n.type==='MaterialIcons'&&n.props.name==='check-circle'));s.unmount();
});

for(const [operation,status,reason] of [['accept','SUBMITTED','máy chủ xác nhận'],['decline','NEW_ASSIGNED','Cần nhập lý do thực tế']])test('UI06 command lock explains '+operation+' condition without preparing or dispatching',async()=>{
 let mutations=0;
 const s=screen('src/components/drone/DroneTaskCommandPanel.tsx',{exportName:'DroneTaskCommandPanel',props:{taskId:task.id,operation},modules:{
 '../../hooks/useOperatorReadScope':{useOperatorReadScope:()=>({key:'scope',capture:()=>()=>true})},
 '../../api/droneTaskJournal':{openDroneTaskJournal:async()=>({read:async()=>null,readCurrent:async()=>({...task,status}),prepare:async()=>mutations++,dispatch:async()=>mutations++,close(){}})},'../Card':{Card:'Card'},'../Button':{Button:'Button'}
 }});s.render();await s.flush();assert.ok(s.nodes().some(n=>n.props.testID==='command-disabled-reason'));assert.match(text(s),new RegExp(reason));
 const button=s.nodes().find(n=>n.type==='Button'&&/Chuẩn bị tiếp nhận|Lưu yêu cầu từ chối/.test(n.props.title));assert.equal(button.props.disabled,true);assert.equal(mutations,0);s.unmount();
});
