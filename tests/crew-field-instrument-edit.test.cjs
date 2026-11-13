const test = require('node:test');
const assert = require('node:assert/strict');
const {screen} = require('./helpers/roadfe-screen.cjs');
const fs=require('node:fs'),vm=require('node:vm');
const templateScope={require,setTimeout,clearTimeout,Uint8Array,AbortController,URL};
vm.runInNewContext(fs.readFileSync('tests/t05b.test.cjs','utf8').split("test('T05B FIELD")[0]+";globalThis.template=load('src/api/crewFieldDraft.ts').measurementTemplate;",templateScope);

// Executes the shipped screen hooks and handlers; native rendering is checked separately.
async function mounted(instrument, command = null, initial = {}, status, submission) {
  const context = {actor:'crew', scope:'session', environment:'test', projectId:'project', taskId:'task'};
  const measurement = {sampleId:'sample', type:'Area', dimension:'AREA', unit:'m²', value:1,
    state:'KNOWN', instrument, method:'Quan sát', locationReason:'Chưa có GPS', ...initial};
  let saved = {measurements:[measurement], captures:[], locationProof:null, command};
  const calls = [];let nextId=0;
  const s = screen('app/(crew)/field-review.tsx', {
    expose:'CrewFieldReviewScreenContent', exportName:'CrewFieldReviewScreenContent',
    props:{task:{id:'task',projectId:'project',task_mode:'MEASURE_ONLY',detail:{mode:'FIELD'}}},
    modules:{
      '../../src/components/AppHeader':{AppHeader:'AppHeader'},
      '../../src/components/Card':{Card:'Card'}, '../../src/components/Chip':{Chip:'Chip'},
      '../../src/components/Toast':{Toast:'Toast'}, 'expo-crypto':{randomUUID:()=> `new-sample-${++nextId}`},
      './tasks':{useCrewIdentity:()=>({user:{id:'crew'},scope:'session'}),TASK_MODE_CHIP:{MEASURE_ONLY:{label:'Chỉ đo kiểm'}}},
      '../../src/api/crewApi':{fieldCapabilityBlock:()=>null,validateCrewTaskDetail(){},
        getFieldInspectionTaskDetailReal:async()=>({data:{status,requiredMeasurementType:4,latestSubmissionId:submission?.id},etag:'version'}),
        getFieldSubmissionDetailReal:async()=>({data:submission})},
      '../../src/api/crewFieldDraft':{
        currentFieldContext:()=>context, openFieldRuntime:async()=>({}),
        loadFieldDraft:async()=>structuredClone(saved), measurementTemplate:templateScope.template,
        fieldDraftPending:d=>!!d.command, fieldErrorMessage:e=>e.message,
        saveFieldMeasurements:async(c,measurements,proof)=>{
          calls.push(structuredClone({context:c,measurements,proof}));
          saved={...saved,measurements:structuredClone(measurements),locationProof:proof};return saved;
        },
      },
    },
  });
  s.render(); await s.flush();
  if(status!=='Submitted') {s.press('Chỉnh số đo');s.render();s.press(`Sửa ${{DepressionDepth:'Độ sâu chỗ lõm'}[initial.type]??'Diện tích hư hại'}`);s.render();}
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
    h.s.press('Chỉnh số đo');h.s.render();h.s.press('Sửa Diện tích hư hại');h.s.render();
  }
  h.s.unmount();
});

test('FIELD adds optional length and width with unique samples and preserves the required area',async()=>{
 const h=await mounted('Thước');
 for(const label of ['Chiều dài chỗ lõm','Chiều rộng chỗ lõm']) {h.s.press('Thêm số đo');h.s.render();h.s.press(label);h.s.render();}
 h.s.press('Lưu nháp số đo');await h.s.flush();
 assert.deepEqual(h.calls.at(-1).measurements.map(m=>m.type),['Area','DepressionLength','DepressionWidth']);
 assert.equal(new Set(h.calls.at(-1).measurements.map(m=>m.sampleId)).size,3);
 assert.equal(h.s.nodes().some(n=>n.props.accessibilityLabel==='Bỏ Diện tích hư hại'),false);
 h.s.press('Chỉnh số đo');h.s.render();h.s.press('Sửa Chiều rộng chỗ lõm');h.s.render();
 const remove=h.s.nodes().find(n=>n.props.accessibilityLabel==='Bỏ Chiều rộng chỗ lõm');remove.props.onPress();
 h.s.render();h.s.press('Lưu nháp số đo');await h.s.flush();
 assert.deepEqual(h.calls.at(-1).measurements.map(m=>m.type),['Area','DepressionLength']);
 h.s.unmount();
});

test('FIELD submitted page shows server measurements once and no editable draft or new-draft action',async()=>{
  const submission={id:'receipt',taskId:'task',revision:2,readiness:'INCOMPLETE',missingReasons:['LOCATION_UNKNOWN'],
    measurements:[{sampleId:'server',type:'DepressionDepth',value:4,unit:'cm',instrument:'Thước máy chủ',method:'Đo trực tiếp'}],evidence:[]};
  const h=await mounted('Nháp không phải kết quả', {phase:'confirmed'}, {}, 'Submitted', submission);
  const nodes=h.s.nodes(),text=nodes.filter(n=>n.type==='Text').flatMap(n=>n.props.children).join(' ');
  assert.match(text,/Thước máy chủ/);
  assert.doesNotMatch(text,/Số đo lượt trước|Số đo đang chỉnh|Nháp không phải kết quả/);
  assert.equal(nodes.some(n=>n.type==='InputField'),false);
  assert.equal(nodes.some(n=>n.type==='Button'&&n.props.title==='Đã xem kết quả — tạo nháp mới'),false);
  h.s.unmount();
});

test('FIELD typing a measurement does not move instrument and method into the reason slot',async()=>{
  const h=await mounted('Thước',null,{value:null,state:'UNKNOWN',unknownReason:'Chưa đo'});
  const labels=()=>h.s.nodes().filter(n=>n.type==='InputField').map(n=>n.props.label);
  const before=labels();
  h.s.input('Giá trị đo thực','4');
  assert.equal(labels().indexOf('Dụng cụ đo thực tế'),before.indexOf('Dụng cụ đo thực tế'));
  assert.equal(labels().indexOf('Phương pháp đo thực tế'),before.indexOf('Phương pháp đo thực tế'));
  h.s.unmount();
});

test('FIELD DepressionDepth is displayed as depth, never as length merely because dimension is LENGTH',async()=>{
  const h=await mounted('Thước',null,{type:'DepressionDepth',dimension:'LENGTH',unit:'cm'});
  const text=h.s.nodes().filter(n=>n.type==='Text').flatMap(n=>n.props.children).join(' ');
  assert.match(text,/Độ sâu/);assert.doesNotMatch(text,/Chiều dài/);
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

test('FIELD choosing a length unit retains the entered value and sample identity',async()=>{
  const h=await mounted('Thước',null,{type:'DepressionDepth',dimension:'LENGTH',unit:'cm',value:4});
  h.s.press('mm');h.s.render();
  h.s.press('Lưu nháp số đo');await h.s.flush();
  const m=h.calls.at(-1).measurements[0];
  assert.equal(m.unit,'mm');assert.equal(m.value,4);assert.equal(m.sampleId,'sample');
  h.s.unmount();
});
