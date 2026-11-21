const test=require('node:test'),assert=require('node:assert/strict');
const {screen}=require('./helpers/roadfe-screen.cjs');
function fixture(fail=false){
 const calls=[],nav=[],identity={actor:'actor',scope:'scope'};
 const facts={history:{events:Array.from({length:6},(_,i)=>({id:`event-${i}`,kind:i===4?'SUPPLEMENT':'SUBMITTED',occurredAt:'2026-11-15T00:00:00Z',reason:i===4?'Keep complete backend reason':null}))},defectTarget:null};
 const s=screen('src/components/crew/CrewTaskFacts.tsx',{exportName:'CrewTaskFacts',props:{projectId:'original-project',taskId:'original-task'},modules:{
  '../Card':{Card:'Card'},'../Button':{Button:'Button'},
  '../../api/crewSafetyWorkflow':{currentQueueIdentity:()=>identity,crewReadGuard:()=>{},readAssignedFieldFacts:async(...args)=>{calls.push(args);if(fail)throw {response:{status:403}};return facts;}},
  '../../offline/upload-queue':{sameQueueIdentity:()=>true},'../../utils/crew-map-geometry':{crewDefectCoordinates:()=>null},
  '../../constants/routes':{CREW_TASK_MAP:'/(crew)/task-map'},'expo-router':{router:{push:p=>nav.push(p)}},
 }});s.render();return {s,calls,nav};
}
const words=s=>JSON.stringify(s.nodes().filter(n=>n.type==='Text').map(n=>n.props.children));
test('Taste D history remains explicit read, initially three events, expandable and collapsible without new requests',async()=>{
 const {s,calls,nav}=fixture();assert.equal(calls.length,0);
 s.press('Xem vị trí / lịch sử');await s.flush();assert.equal(calls.length,1);
 assert.deepEqual(calls[0].slice(1),['original-project','original-task']);
 assert.ok(!words(s).includes('Keep complete backend reason'));
 const more=s.nodes().find(n=>n.props.accessibilityState?.expanded===false&&JSON.stringify(n).includes('Xem thêm 3'));
 assert.ok(more);more.props.onPress();s.render();assert.ok(words(s).includes('Keep complete backend reason'));
 s.press('Mở bản đồ');assert.equal(nav.length,1);assert.equal(nav[0].pathname,'/(crew)/task-map');assert.equal(nav[0].params.id,'original-task');assert.equal(nav[0].params.projectId,'original-project');
 s.nodes().find(n=>n.props.accessibilityLabel==='Thu gọn hồ sơ').props.onPress();s.render();assert.ok(!words(s).includes('Keep complete backend reason'));
 s.nodes().find(n=>n.props.accessibilityLabel==='Xem hồ sơ đã tải').props.onPress();s.render();assert.ok(words(s).includes('Keep complete backend reason'));assert.equal(calls.length,1);s.unmount();
});
test('Taste D failed explicit read retains permission error and retry; no map/history fabricated',async()=>{
 const {s,calls}=fixture(true);s.press('Xem vị trí / lịch sử');await s.flush();
 assert.equal(calls.length,1);assert.match(words(s),/Không có quyền đọc nhiệm vụ/);
 assert.ok(s.nodes().some(n=>n.props.title==='Xem vị trí / lịch sử'&&!n.props.disabled));
 assert.ok(!s.nodes().some(n=>n.props.title==='Mở bản đồ'));s.unmount();
});
