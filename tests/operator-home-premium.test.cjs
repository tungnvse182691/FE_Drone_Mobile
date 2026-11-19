const {test}=require('node:test');
const assert=require('node:assert/strict');
const {drone,id,task}=require('./package45-drone.test.cjs');
const texts=s=>s.nodes().filter(n=>n.type==='Text').map(n=>n.props.children.flat(Infinity).join('')).join('\n');
const row=n=>n.type?.name==='OperatorTaskRow';

test('Premium Home preserves real first-five ordering, case-insensitive dedupe, KPI and exact route identity',async()=>{
 const routes=[];const items=Array.from({length:7},(_,i)=>({...task,id:id(i+2),status:i===0?'SUBMITTED':'ACCEPTED'}));
 const s=drone('home',{listOperatorSurveyTasksReal:async(cursor,size)=>{assert.equal(cursor,null);assert.equal(size,50);return {items:[...items,items[0]],nextCursor:'more'};}},
 {moduleFactories:{'expo-router':({modules})=>({...modules['expo-router'],router:{push:r=>routes.push(r)}})}});
 s.render();await s.flush();
 const cards=s.nodes().filter(row);assert.equal(cards.length,5);
 assert.deepEqual(cards.map(n=>n.props.task.id),items.slice(0,5).map(t=>t.id));
 for(const [key,value] of [['loaded',7],['ongoing',6],['submitted',1]])assert.equal(s.nodes().find(n=>n.props.testID===`operator-kpi-${key}`).props.children[0],value);
 cards[0].props.onPress();assert.equal(routes[0].pathname,'/(drone)/request-detail');assert.equal(routes[0].params.taskId,items[0].id);assert.equal(routes[0].params.code,'00000002');
 s.nodes().find(n=>n.props.accessibilityLabel==='Xem tất cả nhiệm vụ khảo sát').props.onPress();assert.equal(routes[1],'/(drone)/requests');s.unmount();
});

test('Premium Home preserves initial loading, empty and error retry without fabricated tasks',async()=>{
 for(const mode of ['loading','empty','error']){
  let calls=0;const s=drone('home',{listOperatorSurveyTasksReal:()=>{calls++;return mode==='loading'?new Promise(()=>{}):mode==='error'?Promise.reject(Error('offline')):Promise.resolve({items:[],nextCursor:null});}});
  s.render();await s.flush();assert.equal(s.nodes().filter(row).length,0);
  if(mode==='loading')assert.ok(s.nodes().some(n=>n.type==='OperatorTaskSkeleton'));
  else {const e=s.nodes().find(n=>n.type==='EmptyState');assert.equal(e.props.title,mode==='error'?'Không tải được dữ liệu':'Chưa có nhiệm vụ');e.props.onAction();await s.flush();assert.equal(calls,2);}
  s.unmount();
 }
});

test('Home-only card reads existing status/target helpers and invokes callback once without changing task',()=>{
 for(const status of ['SUBMITTED','IN_PROGRESS','SUPPLEMENT_REQUIRED','FUTURE']){
  let taps=0;let s;
  s=drone('home',{}, {exportName:'OperatorTaskRow',props:{task:{...task,status,scope:[{targetBand:'SURFACE',segmentIds:[id(6),id(7)]}]},onPress:()=>taps++},modules:{'../../src/components/drone/OperatorTaskRow':{operatorTaskVisual:()=>({background:'#F8F9FA',ink:'#2D3748',rail:'#2D3748'})}}});
  s.render();assert.match(texts(s),/Mặt đường/);assert.match(texts(s),/2 phân đoạn/);
  if(status==='SUBMITTED'){assert.match(texts(s),/Đã nộp/);assert.doesNotMatch(texts(s),/Hoàn tất/);}
  if(status==='FUTURE')assert.match(texts(s),/Đang cập nhật/);
  const p=s.nodes().find(n=>n.type==='AnimatedPressable');assert.equal(p.props.accessibilityRole,'button');p.props.onPress();assert.equal(taps,1);s.unmount();
 }
});
