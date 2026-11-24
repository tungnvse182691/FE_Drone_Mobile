const {test}=require('node:test');
const assert=require('node:assert/strict');
const {screen}=require('./helpers/roadfe-screen.cjs');
const components={'../../src/components/AppHeader':{AppHeader:'AppHeader'},'../../src/components/Card':{Card:'Card'}};

test('Crew defect summary opens submitted evidence for the same task',async()=>{
 let navigation;
 const s=screen('app/(crew)/report-defect.tsx',{
  expose:'CrewReportDefectScreenContent',exportName:'CrewReportDefectScreenContent',
  props:{task:{id:'task-a',projectId:'project-a',detail:{latestSubmissionId:'submission-a'}}},
  modules:{...components,'./tasks':{},'expo-router':{useRouter:()=>({push:value=>navigation=value})}},
 });
 s.render();await s.press('Xem hồ sơ đã nộp');
 assert.deepEqual(JSON.parse(JSON.stringify(navigation)),{pathname:'/(crew)/field-review',params:{id:'task-a',projectId:'project-a'}});
 s.unmount();
});

test('Crew defect summary does not claim a submitted record when none exists',()=>{
 const s=screen('app/(crew)/report-defect.tsx',{
  expose:'CrewReportDefectScreenContent',exportName:'CrewReportDefectScreenContent',
  props:{task:{id:'task-a',projectId:'project-a',detail:{}}},modules:{...components,'./tasks':{}},
 });
 s.render();assert.ok(!s.nodes().some(n=>n.props.title==='Xem hồ sơ đã nộp'));s.unmount();
});
