const {test}=require('node:test');
const assert=require('node:assert/strict');
const {screen,deferred}=require('./helpers/roadfe-screen.cjs');
const {drone,id,task}=require('./package45-drone.test.cjs');
const text=s=>s.nodes().filter(n=>n.type==='Text').map(n=>n.props.children.flat(Infinity).join('')).join('\n');
const fixture=(status,n=2)=>({...task,id:id(n),status,scope:[{targetBand:'SURFACE',segmentIds:[id(6),id(7)]}]});
const rows=s=>s.nodes().filter(n=>n.type==='OperatorTaskRow');
const tap=async(s,label)=>{s.nodes().find(n=>n.props.accessibilityLabel===label).props.onPress();await s.flush();};

test('UI05 Home compact summary counts loaded statuses, removes email and duplicate shortcuts',async()=>{
 const s=drone('home',{listOperatorSurveyTasksReal:async()=>({items:[fixture('Submitted'),fixture('Accepted',3),fixture('InProgress',4)],nextCursor:'more'})});
 s.render();await s.flush();
 assert.match(text(s),/Đã tải/);assert.match(text(s),/Đã nộp/);
 for(const [name,count] of [['loaded',3],['ongoing',2],['submitted',1]]) {
  const n=s.nodes().find(n=>n.props.testID===`operator-kpi-${name}`);assert.ok(n);assert.equal(n.props.children[0],count);assert.equal(n.props.style.fontSize,28);
 }
 assert.doesNotMatch(text(s),/@|nhiệm vụ trong danh sách đã tải/);
 assert.ok(!s.nodes().some(n=>n.type==='AnimatedPressable'&&/Đồng bộ|Nhiệm vụ"/.test(JSON.stringify(n.props.children))));
 assert.equal(rows(s).length,3);assert.match(text(s),/trang đầu/);s.unmount();
});
test('UI05 Requests keeps loaded rows while refreshing and reports an honest filtered count',async()=>{
 const d=deferred();let calls=0;const routes=[];
 const s=drone('requests',{listOperatorSurveyTasksReal:()=>++calls===1?Promise.resolve({items:[fixture('Submitted'),fixture('Accepted',3)],nextCursor:'more'}):d.promise},
 {moduleFactories:{'expo-router':({modules})=>({...modules['expo-router'],router:{push:r=>routes.push(r)}})}});
 s.render();await s.flush();assert.match(text(s),/2 nhiệm vụ đã tải/);assert.doesNotMatch(text(s),/Trong 2/);
 await tap(s,'Lọc trạng thái: Tất cả trạng thái');await tap(s,'Đã nộp (1)');
 assert.match(text(s),/1 trong 2 nhiệm vụ đã tải/);assert.equal(rows(s).length,1);
 rows(s)[0].props.onPress();assert.equal(routes[0].params.taskId,id(2));
 await tap(s,'Làm mới nhiệm vụ');assert.equal(rows(s).length,1);
 assert.ok(s.nodes().some(n=>n.type==='ActivityIndicator'&&n.props.accessibilityLabel==='Đang tải nhiệm vụ'));
 assert.equal(s.nodes().find(n=>n.props.accessibilityLabel==='Làm mới nhiệm vụ').props.disabled,true);
 d.reject(Error('offline'));await s.flush();assert.equal(rows(s).length,1);assert.ok(s.nodes().some(n=>n.props.accessibilityRole==='alert'));s.unmount();
});
test('UI05 first loading, empty and failed reads remain distinct',async()=>{
 for(const mode of ['loading','empty','error']){
  const s=drone('requests',{listOperatorSurveyTasksReal:()=>mode==='loading'?new Promise(()=>{}):mode==='error'?Promise.reject(Error('offline')):Promise.resolve({items:[],nextCursor:null})});
  s.render();await s.flush();
  if(mode==='loading')assert.ok(s.nodes().some(n=>n.type==='OperatorTaskSkeleton'));
  else assert.equal(s.nodes().find(n=>n.type==='EmptyState').props.title,mode==='error'?'Không tải được nhiệm vụ':'Không có nhiệm vụ');
  s.unmount();
 }
});
test('UI05 shared row prioritizes real scope and status, retains exact navigation callback',()=>{
 let pressed=0;const t=fixture('Submitted');
 const s=screen('src/components/drone/OperatorTaskRow.tsx',{exportName:'OperatorTaskRow',props:{task:t,onPress:()=>pressed++},modules:{'../Card':{Card:'Card'}}});
 s.render();assert.match(text(s),/Mặt đường/);assert.match(text(s),/Đã nộp/);assert.match(text(s),/2 phân đoạn/);
 assert.doesNotMatch(text(s),new RegExp(t.projectId+'|'+t.id+'|Nhiệm vụ hiện tại|Chi tiết'));
 const p=s.nodes().find(n=>n.type==='Pressable');p.props.onPress();assert.equal(pressed,1);
 assert.ok(p.props.style.minHeight>=48);assert.equal(s.nodes().find(n=>n.type==='Card').props.style.borderRadius,12);s.unmount();
});
test('UI05 shared row handles unknown enums without invented scope, deadline or priority',()=>{
 const s=screen('src/components/drone/OperatorTaskRow.tsx',{exportName:'OperatorTaskRow',props:{task:{...task,status:'FUTURE',scope:[{targetBand:'FUTURE',segmentIds:[]}]},onPress(){}},modules:{'../Card':{Card:'Card'}}});
 s.render();assert.match(text(s),/Chưa xác định/);assert.match(text(s),/Đang cập nhật/);assert.doesNotMatch(text(s),/ĐH\.05|Ưu tiên|Hạn|Hiện tại/);s.unmount();
});
test('UI05 header removes fabricated notifications only in Operator compact variant',()=>{
 for(const variant of [undefined,'operatorCompact']){
  const s=screen('src/components/AppHeader.tsx',{exportName:'AppHeader',props:{subtitle:'Trang chủ',variant},modules:{'expo-router':{router:{push(){}}}}});
  s.h.login('DRONE_OPERATOR',id(1));s.h.changeAuth({...s.h.getAuth(),role:'DRONE_OPERATOR'});s.render();
  assert.equal(s.nodes().some(n=>n.props.accessibilityLabel==='Thông báo'),!variant);
  if(variant){const p=s.nodes().find(n=>n.props.accessibilityLabel==='Trang cá nhân');assert.ok(p.props.style({pressed:false}).some(v=>v?.width>=48));}
  s.unmount();
 }
});
