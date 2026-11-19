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
 assert.match(h.text(),/0–10 cm/);assert.match(h.text(),/chưa xác nhận đủ điều kiện/);
 assert.match(h.text(),/Giữ số đo thực tế/);assert.equal(h.reads(),1);
 h.props.measurement.value=23;h.s.render();assert.match(h.text(),/ngoài khoảng/);assert.equal(h.reads(),1);
 assert.equal(h.s.nodes().some(n=>n.type==='Button'&&/thi công/i.test(n.props.title)),false);h.s.unmount();
});
test('bounds are inclusive, units exact, empty or invalid measurements do not appear in range',async()=>{
 const h=mount();h.s.render();await h.s.flush();
 for(const value of [0,10]){h.props.measurement.value=value;h.s.render();assert.match(h.text(),/chưa xác nhận đủ điều kiện/);}
 for(const value of [null,NaN,-Infinity]){h.props.measurement.value=value;h.s.render();assert.doesNotMatch(h.text(),/Trong khoảng số đo/);}
 h.props.measurement.value=2;h.props.measurement.unit='mm';h.s.render();assert.match(h.text(),/Chính sách dùng cm/);assert.doesNotMatch(h.text(),/Trong khoảng số đo/);h.s.unmount();
});
test('each code uses its own server range and never borrows another rule',async()=>{
 const v=policy();v.rules.push({code:'Area',unit:'m²',minimum:0.1,maximum:1.75});
 const h=mount(v);h.s.render();await h.s.flush();h.props.measurement={type:'Area',unit:'m²',value:1};h.s.render();
 assert.match(h.text(),/0,1–1,75 m²/);assert.doesNotMatch(h.text(),/0–10/);
 h.props.measurement.type='DepressionWidth';h.s.render();assert.match(h.text(),/chưa trả ngưỡng/);assert.doesNotMatch(h.text(),/0,1–1,75/);h.s.unmount();
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
