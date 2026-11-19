const test = require('node:test');
const assert = require('node:assert/strict');
const {screen, deferred} = require('./helpers/roadfe-screen.cjs');
const identity={actor:'crew',role:'REPAIR_CREW',environment:'sandbox',scope:'session',partition:'crew'};
const policy=()=>({policyState:'CONFIGURED',policyRevisionId:'revision',policyContentHash:'hash',missingReasons:['ASSESSMENT_REQUIRED'],rules:[{code:'DepressionDepth',unit:'cm',minimum:0,maximum:10}]});
function mount(view=policy(),extra={}) {
  const props={identity,projectId:'project',taskId:'task',measurement:{type:'DepressionDepth',value:2,unit:'cm'}};
  let current=identity,reads=0;
  const s=screen('src/components/crew/CrewFastTrackMeasurementGuide.tsx',{
    expose:'MeasurementPolicyRead,measurementPolicyGuide',exportName:'MeasurementPolicyRead',props,
    modules:{'../../api/crewFastTrackEligibility':{readAssignedFastTrackEligibility:async(...args)=>{reads++;assert.deepEqual(args,[identity,'project','task']);return extra.read?extra.read():{eligibility:view};}},
      '../../offline/upload-queue':{currentQueueIdentity:()=>current,sameQueueIdentity:i=>i===current}},
  });
  const text=()=>s.nodes().filter(n=>n.type==='Text').flatMap(n=>n.props.children).join(' ');
  return {s,props,text,reads:()=>reads,switchSession:()=>{current={...identity,scope:'other'};}};
}
test('guide reads the assigned policy and never claims eligibility from a matching number',async()=>{
 const h=mount();h.s.render();assert.match(h.text(),/Đang đọc/);await h.s.flush();
 assert.match(h.text(),/0–10 cm/);assert.doesNotMatch(h.text(),/chưa xác nhận đủ điều kiện/);
 h.s.nodes().find(n=>n.props.accessibilityLabel==='Chi tiết ngưỡng sửa nhanh').props.onPress();h.s.render();
 assert.match(h.text(),/Giữ số đo thực tế/);assert.equal(h.reads(),1);
 h.props.measurement.value=23;h.s.render();assert.match(h.text(),/ngoài khoảng/);assert.equal(h.reads(),1);
 assert.equal(h.s.nodes().some(n=>n.type==='Button'&&/thi công/i.test(n.props.title)),false);h.s.unmount();
});
test('bounds are inclusive, units exact, empty or invalid measurements do not appear in range',async()=>{
 const h=mount();h.s.render();await h.s.flush();
 h.s.nodes().find(n=>n.props.accessibilityLabel==='Chi tiết ngưỡng sửa nhanh').props.onPress();h.s.render();
 for(const value of [0,10]){h.props.measurement.value=value;h.s.render();assert.match(h.text(),/chưa xác nhận đủ điều kiện/);}
 for(const value of [null,NaN,-Infinity]){h.props.measurement.value=value;h.s.render();assert.doesNotMatch(h.text(),/Trong khoảng số đo/);}
 h.props.measurement.value=2;h.props.measurement.unit='mm';h.s.render();assert.match(h.text(),/Chính sách dùng cm/);assert.doesNotMatch(h.text(),/Trong khoảng số đo/);h.s.unmount();
});
test('each code uses its own server range and never borrows another rule',async()=>{
 const v=policy();v.rules.push({code:'Area',unit:'m²',minimum:0.1,maximum:1.75});
 const h=mount(v);h.s.render();await h.s.flush();h.props.measurement={type:'Area',unit:'m²',value:1};h.s.render();
 assert.match(h.text(),/0,1–1,75 m²/);assert.doesNotMatch(h.text(),/0–10/);
 h.props.measurement.type='DepressionWidth';h.s.render();assert.equal(h.s.nodes().length,0);h.s.unmount();
});

test('valid policy without a rule hides guidance for all five additional measurement types',async()=>{
 const h=mount();h.s.render();await h.s.flush();
 for(const type of ['SlabFaultingHeight','Area','ShoulderErosionExtent','DepressionLength','DepressionWidth']){
  h.props.measurement={type,unit:type==='Area'?'m²':'cm',value:2};h.s.render();
  assert.equal(h.s.nodes().length,0,type);assert.equal(h.props.measurement.value,2);
 }
 assert.equal(h.reads(),1);
 h.props.measurement={type:'DepressionDepth',unit:'cm',value:2};h.s.render();
 assert.match(h.text(),/0–10 cm/);h.s.unmount();
});

test('absent rule must not hide read failures or untrusted policy',async()=>{
 for(const change of [v=>v.policyState='REVOKED',v=>v.rules=undefined,v=>v.rules=[],v=>v.rules[0].maximum=NaN,v=>v.missingReasons.push('PINNED_POLICY_SOURCE_MISMATCH')]){
  const v=policy();change(v);const h=mount(v);h.props.measurement.type='Area';h.s.render();await h.s.flush();
  assert.match(h.text(),/Chưa xác định/);assert.ok(h.s.nodes().find(n=>n.props.accessibilityLabel==='Đọc lại ngưỡng sửa nhanh'));h.s.unmount();
 }
 const h=mount(policy(),{read:async()=>{throw Error('offline');}});h.props.measurement.type='Area';h.s.render();await h.s.flush();
 assert.match(h.text(),/Chưa đọc được/);assert.equal(h.props.measurement.value,2);h.s.unmount();
});
for(const change of [v=>v.policyState='REVOKED',v=>v.policyRevisionId=null,v=>v.policyContentHash=null,v=>v.rules=undefined,v=>v.rules[0].maximum=NaN,v=>v.rules[0].minimum=11,v=>v.rules[0].minimum=-1,v=>v.rules.push({...v.rules[0]}),v=>v.rules[0].maximum='10',v=>v.missingReasons.push('PINNED_POLICY_SOURCE_MISMATCH')]){
 test('unusable policy never displays a numerical threshold: '+change,async()=>{const v=policy();change(v);const h=mount(v);h.s.render();await h.s.flush();assert.doesNotMatch(h.text(),/0–10 cm/);assert.match(h.text(),/Chưa xác định/);h.s.unmount();});
}
test('failure has a bounded retry, without clearing or editing measurements',async()=>{
 let fail=true;const h=mount(policy(),{read:async()=>{if(fail)throw Error('offline');return {eligibility:policy()};}});
 h.s.render();await h.s.flush();assert.match(h.text(),/Chưa đọc được/);fail=false;
 const retry=h.s.nodes().find(n=>n.props.accessibilityLabel==='Đọc lại ngưỡng sửa nhanh');retry.props.onPress();retry.props.onPress();
 await h.s.flush();assert.match(h.text(),/0–10 cm/);assert.equal(h.reads(),2);assert.equal(h.props.measurement.value,2);h.s.unmount();
});
test('late result after a session change or unmount cannot publish policy',async()=>{
 for(const unmount of [false,true]){const d=deferred(),h=mount(policy(),{read:()=>d.promise});h.s.render();
 if(unmount)h.s.unmount();else h.switchSession();d.resolve({eligibility:policy()});await h.s.flush();
 assert.doesNotMatch(h.text(),/0–10 cm/);if(!unmount)h.s.unmount();}
});

test('guide starts with only the range, expands details accessibly, and toggling never refetches',async()=>{
 const h=mount();h.s.render();await h.s.flush();
 const toggle=()=>h.s.nodes().find(n=>n.props.accessibilityLabel==='Chi tiết ngưỡng sửa nhanh');
 assert.ok(toggle(),'policy header must toggle details');
 assert.equal(toggle().props.accessibilityState.expanded,false);
 assert.doesNotMatch(h.text(),/gồm cả hai mốc/);
 assert.doesNotMatch(h.text(),/Trong khoảng số đo/);
 toggle().props.onPress();h.s.render();
 assert.equal(toggle().props.accessibilityState.expanded,true);
 assert.match(h.text(),/gồm cả hai mốc/);assert.match(h.text(),/Giữ số đo thực tế/);
 toggle().props.onPress();h.s.render();
 h.props.measurement.value=23;h.s.render();assert.doesNotMatch(h.text(),/ngoài khoảng/);
 toggle().props.onPress();h.s.render();assert.match(h.text(),/ngoài khoảng/);
 h.props.measurement.unit='mm';h.s.render();assert.match(h.text(),/Chính sách dùng cm/);
 assert.equal(h.reads(),1);assert.equal(h.props.measurement.value,23);h.s.unmount();
});

test('reference range follows selected length unit without rounding or changing server unit validation',async()=>{
 const h=mount();h.s.render();await h.s.flush();
 for(const [unit,range] of [['mm','0–100 mm'],['cm','0–10 cm'],['m','0–0,1 m']]){
  h.props.measurement.unit=unit;h.s.render();assert.ok(h.text().includes(range));
 }
 assert.equal(h.reads(),1);assert.equal(h.props.measurement.value,2);
 h.s.nodes().find(n=>n.props.accessibilityLabel==='Chi tiết ngưỡng sửa nhanh').props.onPress();h.s.render();
 assert.match(h.text(),/Chính sách dùng cm/);assert.match(h.text(),/chính sách gốc: 0–10 cm/);h.s.unmount();
 const v=policy();v.rules[0].maximum=0.10000000000000002;
 const precise=mount(v);precise.props.measurement.unit='mm';precise.s.render();await precise.s.flush();
 assert.match(precise.text(),/0–1,0000000000000002 mm/);precise.s.unmount();
});
