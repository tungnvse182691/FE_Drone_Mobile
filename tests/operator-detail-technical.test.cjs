const {test}=require('node:test');
const assert=require('node:assert/strict');
const {drone,task}=require('./package45-drone.test.cjs');

test('Detail technical presentation retains exact IDs, distinct versions and existing command panel across toggles',async()=>{
 const t={...task,status:'SUBMITTED',version:'AAAA+task/=='};
 const pkg={task:t,scopeVersion:'BBBB+scope/==',geometryRefs:[]};
 const original=JSON.stringify(pkg);
 const s=drone('request-detail',{
  getOperatorSurveyTaskDetailReal:async()=>({data:t,etag:`"${t.version}"`}),
  getOperatorWorkPackageReal:async()=>({data:pkg})
 },{params:{taskId:t.id}});
 s.render();await s.flush();
 const tap=async label=>{const n=s.nodes().find(n=>n.props.accessibilityLabel===label);assert.ok(n,label);n.props.onPress();await s.flush();};
 const texts=()=>s.nodes().filter(n=>n.type==='Text').map(n=>n.props.children.flat(Infinity).join(''));
 const panel=()=>s.nodes().find(n=>n.type==='DroneTaskCommandPanel');
 const before=panel();assert.ok(before);
 await tap('Thông tin kỹ thuật');
 assert.ok(texts().includes(`${t.id.slice(0,8)}…${t.id.slice(-8)}`));
 for(const v of ['Phiên bản nhiệm vụ','AAAA+task/==','Phiên bản phạm vi','BBBB+scope/=='])assert.ok(texts().includes(v),v);
 await tap('Xem mã máy chủ đầy đủ');
 assert.ok(s.nodes().some(n=>n.type==='Text'&&n.props.selectable===true&&n.props.children[0]===t.id));
 await tap('Thu gọn mã máy chủ');
 assert.ok(!texts().includes(t.id));
 await tap('Thông tin kỹ thuật');
 assert.ok(!texts().includes('Phiên bản nhiệm vụ'));
 assert.equal(panel().props.taskId,before.props.taskId);
 assert.equal(panel().props.operation,before.props.operation);
 assert.equal(panel().props.collapsed,before.props.collapsed);
 assert.equal(JSON.stringify(pkg),original);
 s.unmount();
});
