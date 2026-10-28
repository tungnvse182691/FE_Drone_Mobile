const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs');
const {screen}=require('./helpers/roadfe-screen.cjs');
const text=s=>JSON.stringify(s.nodes().map(n=>n.props.children));
test('HARDEN02 mounted Drone home has unknown safety, keeps real list fetch',async()=>{
 let reads=0;const s=screen('app/(drone)/home.tsx',{modules:{
  '../../src/api/droneApi':{listOperatorSurveyTasksReal:async()=>{reads++;return {items:[]};}},
  '../../src/api/operator-task-view':{operatorTaskDisplayCode:id=>id,operatorTaskStatusLabel:()=>''},
  '../../src/components/AppHeader':{AppHeader:'AppHeader'},'../../src/components/Card':{Card:'Card'},
  '../../src/components/Chip':{Chip:'Chip'},'../../src/components/EmptyState':{EmptyState:'EmptyState'},
  '../../src/components/AnimatedPressable':{AnimatedPressable:'AnimatedPressable'},
 }});s.render();await s.flush();assert.equal(reads,1);
 assert.doesNotMatch(text(s),/Sẵn sàng bay|Thời tiết: An toàn bay|Thiết bị: Sẵn sàng/);
 assert.match(text(s),/Chưa có dữ liệu/);s.unmount();
});
for(const route of ['progress','complete'])test('HARDEN02 locked '+route+' has no dormant mutations or mock dependencies',()=>{
 const code=fs.readFileSync('app/(crew)/'+route+'.tsx','utf8');
 assert.doesNotMatch(code,/startRepairExecutionReal|finishRepairExecutionReal|submitRepairAttemptReal|stableUuid|api\/mock|enqueue\(/);
 const s=screen('app/(crew)/'+route+'.tsx',{modules:{'./tasks':{CrewTaskBoundary:'Boundary'}}});s.render();
 assert.match(text(s),/khóa|chưa được mở/);assert.equal(s.h.calls.length,0);s.unmount();
});
test('HARDEN02 live task labels never load seed or invented HH prefix',()=>{
 const {harness}=require('./helpers/roadfe-screen.cjs'),h=harness();
 const view=h.load('src/api/operator-task-view.ts');
 assert.doesNotMatch(fs.readFileSync('src/api/operator-task-view.ts','utf8'),/import.*mock/);
 assert.equal(view.operatorTaskDisplayCode('12345678-aaaa-bbbb-cccc-123456789abc'),'12345678');
});
test('HARDEN02 bootstrap has no dormant mock transport',()=>{
 assert.doesNotMatch(fs.readFileSync('src/hooks/useRepairBootstrap.ts','utf8'),/from ['"].*mock|mockCrewRepairTransport|USE_MOCK_CREW_REPAIR/);
});
test('HARDEN02 unused Drone upload pipelines cannot expose fake or unjournalled dispatch',()=>{
 assert.equal(fs.existsSync('src/api/operator-uploads.ts'),false);
 assert.doesNotMatch(fs.readFileSync('src/api/droneApi.ts','utf8'),/export async function uploadOperatorFileReal/);
});
