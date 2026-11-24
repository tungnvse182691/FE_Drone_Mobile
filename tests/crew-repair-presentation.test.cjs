const test=require('node:test'),assert=require('node:assert/strict');
const {screen}=require('./helpers/roadfe-screen.cjs');
function correction(decision){
 return screen('app/(crew)/repair-correction.tsx',{exportName:'CorrectionReadOnly',props:{task:{id:'task-id',projectId:'project',status:'Completed',detail:{repairContext:{attempt:{attemptId:'attempt',effectiveSubmissionId:'submission',review:decision?{decision}:null}}}}},modules:{
  '../../src/components/AppHeader':{AppHeader:'AppHeader'},'../../src/components/Card':{Card:'Card'},'./tasks':{crewStatusLabel:()=> 'Hoàn thành nhiệm vụ',useCrewIdentity:()=>({scope:'fixture',user:{id:'actor'}})},
  '../../src/api/crewApi':{repairSupplementBlock:()=>null},
  '../../src/api/crewRepairDraft':{},'../../src/api/crewRepairWorkflow':{},
 },moduleFactories:{'expo-router':()=>({useRouter:()=>({push(){},back(){},replace(){}}),useFocusEffect(){}})}});
}
test('accepted repair shows one decision and hides irrelevant supplement actions and local history',()=>{
 const s=correction('ACCEPT');s.render();
 const text=JSON.stringify(s.nodes());
 assert.ok(!s.nodes().some(n=>n.type==='Button'&&n.props.title==='Gửi bổ sung'));
 assert.ok(!s.nodes().some(n=>typeof n.type==='function'&&n.type.name==='CrewRepairReceiptHistory'));
 assert.ok(!text.includes('Chưa đủ điều kiện tạo bản bổ sung'));
 assert.ok(!s.nodes().some(n=>['Về chi tiết nhiệm vụ','Danh sách nhiệm vụ'].includes(n.props.title)));
 const toggle=s.nodes().find(n=>n.props.accessibilityLabel==='Lịch sử và thông tin kỹ thuật');assert.ok(toggle);
 assert.equal(toggle.props.accessibilityState.expanded,false);
 toggle.props.onPress();s.render();
 assert.ok(s.nodes().some(n=>typeof n.type==='function'&&n.type.name==='CrewRepairReceiptHistory'));s.unmount();
});
test('server SUPPLEMENT still exposes the only authorized edit entry',()=>{
 const s=correction('SUPPLEMENT');s.render();
 const send=s.nodes().find(n=>n.type==='Button'&&n.props.title==='Gửi bổ sung');assert.ok(send);assert.ok(!send.props.disabled);s.unmount();
});
