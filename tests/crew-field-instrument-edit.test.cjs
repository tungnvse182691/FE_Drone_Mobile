const test = require('node:test');
const assert = require('node:assert/strict');
const {screen} = require('./helpers/roadfe-screen.cjs');

// Executes the shipped screen hooks and handlers; native rendering is checked separately.
async function mounted(instrument, command = null) {
  const context = {actor:'crew', scope:'session', environment:'test', projectId:'project', taskId:'task'};
  const measurement = {sampleId:'sample', type:'Area', dimension:'AREA', unit:'m²', value:1,
    state:'KNOWN', instrument, method:'Quan sát', locationReason:'Chưa có GPS'};
  let saved = {measurements:[measurement], captures:[], locationProof:null, command};
  const calls = [];
  const s = screen('app/(crew)/field-review.tsx', {
    expose:'CrewFieldReviewScreenContent', exportName:'CrewFieldReviewScreenContent',
    props:{task:{id:'task',projectId:'project',task_mode:'MEASURE_ONLY',detail:{mode:'FIELD'}}},
    modules:{
      '../../src/components/AppHeader':{AppHeader:'AppHeader'},
      '../../src/components/Card':{Card:'Card'}, '../../src/components/Chip':{Chip:'Chip'},
      '../../src/components/Toast':{Toast:'Toast'}, 'expo-crypto':{randomUUID:()=> 'sample'},
      './tasks':{useCrewIdentity:()=>({user:{id:'crew'},scope:'session'}),TASK_MODE_CHIP:{MEASURE_ONLY:{label:'Chỉ đo kiểm'}}},
      '../../src/api/crewApi':{fieldCapabilityBlock:()=>null,validateCrewTaskDetail(){},
        getFieldInspectionTaskDetailReal:async()=>({data:{},etag:'version'})},
      '../../src/api/crewFieldDraft':{
        currentFieldContext:()=>context, openFieldRuntime:async()=>({}),
        loadFieldDraft:async()=>structuredClone(saved), measurementTemplate:()=>null,
        fieldDraftPending:d=>!!d.command, fieldErrorMessage:e=>e.message,
        saveFieldMeasurements:async(c,measurements,proof)=>{
          calls.push(structuredClone({context:c,measurements,proof}));
          saved={...saved,measurements:structuredClone(measurements),locationProof:proof};return saved;
        },
      },
    },
  });
  s.render(); await s.flush();
  return {s,calls,saved:()=>saved,input:()=>s.nodes().find(n=>n.type==='InputField'&&n.props.label==='Dụng cụ đo thực tế')};
}

for (const raw of ['RULER','Thước thép tại hiện trường','Backend custom instrument 42']) {
  test(`FIELD input displays and saves original free text: ${raw}`,async()=>{
    const h=await mounted(raw);
    assert.equal(h.input().props.value,raw);
    h.s.press('Lưu nháp số đo'); await h.s.flush();
    assert.equal(h.calls.length,1); assert.equal(h.calls[0].measurements[0].instrument,raw);
    h.s.unmount();
  });
}
test('FIELD actual onChangeText saves exactly what Crew types without translation',async()=>{
  const h=await mounted('RULER');
  for(const text of ['Thước đo thép 2 m','RULER','  dụng cụ riêng / A-2  ']) {
    h.s.input('Dụng cụ đo thực tế',text);
    assert.equal(h.input().props.value,text);
    h.s.press('Lưu nháp số đo'); await h.s.flush();
    assert.equal(h.calls.at(-1).measurements[0].instrument,text);
  }
  h.s.unmount();
});
test('FIELD pending command freezes edits and save even if handlers are invoked',async()=>{
  const command={phase:'pending',key:'immutable-key',version:'original-version',body:{measurements:[{instrument:'RULER'}]}};
  const h=await mounted('RULER',command), before=JSON.stringify(h.saved());
  h.s.input('Dụng cụ đo thực tế','Không được ghi');
  assert.equal(h.input().props.value,'RULER');
  assert.equal(h.s.nodes().find(n=>n.type==='Button'&&n.props.title==='Lưu nháp số đo').props.disabled,true);
  h.s.press('Lưu nháp số đo'); await h.s.flush();
  assert.equal(h.calls.length,0); assert.equal(JSON.stringify(h.saved()),before);
  h.s.unmount();
});
