const test=require('node:test'),assert=require('node:assert/strict');
const {screen}=require('./helpers/roadfe-screen.cjs');
test('eligibility hides technical values and groups repeated handover reasons without dispatch',async()=>{
 let reads=0;
 const s=screen('src/components/crew/CrewFastTrackEligibility.tsx',{expose:'EligibilityRead',exportName:'EligibilityRead',props:{identity:{actor:'crew',role:'REPAIR_CREW'},projectId:'p',taskId:'t'},modules:{
  '../Button':{Button:'Button'},
  '../../offline/upload-queue':{sameQueueIdentity:()=>true},
  '../../api/crewFastTrackEligibility':{readAssignedFastTrackEligibility:async()=>{reads++;return {eligibility:{eligible:false,version:'h4-private-version',missingReasons:['COVERAGE_MAPPING_UNKNOWN','EXECUTION_ROADNOTHANDEDOVER','ROAD_HANDOVER_MAPPING_UNKNOWN']}};}},
 }});
 s.render();s.press('Kiểm tra điều kiện sửa nhanh');await s.flush();
 const text=()=>JSON.stringify(s.nodes().filter(n=>n.type==='Text').map(n=>n.props.children));
 assert.match(text(),/Chưa thể sửa nhanh/);assert.doesNotMatch(text(),/h4-private|MAPPING_UNKNOWN|Phiên bản điều kiện/);
 const disclosure=s.nodes().find(n=>n.props.accessibilityLabel==='Điều kiện còn thiếu');assert.ok(disclosure);
 assert.equal(disclosure.props.accessibilityState.expanded,false);
 disclosure.props.onPress();s.render();
 assert.match(text(),/phạm vi bảo hành/);
 assert.equal((text().match(/Chưa xác nhận bàn giao tuyến đường/g)||[]).length,1);
 assert.equal(reads,1);s.unmount();
});
