const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const {screen} = require('./helpers/roadfe-screen.cjs');

// Inspect presentation literals only: wire identifiers, comments and backend text are excluded.
test('Crew FE-owned notices and disabled reasons do not expose internal English terms', () => {
  const files = ['app/(crew)/viewfinder.tsx','app/(crew)/wo-detail.tsx',
    'src/components/crew/CrewOfflinePanel.tsx','src/api/crewApi.ts',
    'src/api/crewFieldDraft.ts','src/api/crewRepairWorkflow.ts'];
  const offenders = [];
  for (const file of files) {
    const ast = ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    function visit(n) {
      if ((ts.isStringLiteral(n) || ts.isJsxText(n)) && /[À-ỹ]/.test(n.text) &&
          /\b(Crew|FIELD|NORMAL|FastTrack|GET|POST|upload|Checklist|assignment|binding|bootstrap|assessment|First-start|first-start|VERIFIED|BEFORE|AFTER|MEASUREMENT|REPAIR_CLAIM|Assigned|InProgress|PostRepair|HTTP)\b/.test(n.text)) {
        offenders.push(file+': '+n.text);
      }
      ts.forEachChild(n,visit);
    }
    visit(ast);
  }
  assert.deepEqual(offenders,[]);
});

async function detail(instructions, description, readError) {
  const scope=JSON.stringify(['actor']);
  const task={id:'task',projectId:'project',status:'Submitted',rawMode:'MEASURE_ONLY',description,
    detail:{status:'Submitted',instructions},etag:'version'};
  let mutations=0;
  const s=screen('app/(crew)/wo-detail.tsx',{
    expose:'CrewFieldActions',exportName:'CrewFieldActions',props:{task},
    modules:{
      '../../src/hooks/useRepairBootstrap':{},'../../src/api/crewRepairDraft':{},
      '../../src/api/crewRepairWorkflow':{},'../../src/api/crewFieldDraft':{},'expo-crypto':{},
      '../../src/components/Card':{Card:'Card'},'../../src/components/Chip':{Chip:'Chip'},
      '../../src/components/AppHeader':{AppHeader:'AppHeader'},
      '../../src/components/crew/CrewTaskFacts':{CrewTaskFacts:'CrewTaskFacts'},
      './tasks':{useCrewIdentity:()=>({scope,user:{id:'actor'}}),crewStatusLabel:()=> 'Đã gửi hồ sơ',crewModeLabel:()=> 'Chỉ đo kiểm'},
      '../../src/store/auth':{useAuthStore:{getState:()=>({user:{id:'actor',role_code:'REPAIR_CREW'},token:'test',status:'AUTHENTICATED'})}},
      '../../src/api/authApi':{passwordSessionIdentity:()=>scope},
      '../../src/offline/database':{openDatabase:()=>({getFirstAsync:async()=>null}),initDatabase:async()=>{}},
      '../../src/api/crewApi':{fieldCapabilityBlock:()=>null,fieldCommandBlock:()=>null,
        isConcurrencyConflict:()=>false,isPreconditionRequired:()=>false,
        getFieldInspectionTaskDetailReal:async()=>{throw readError??Error('Network Error');},
        executeFieldCommand:async()=>{mutations++;}},
    },
  });
  s.render();await s.flush();
  return {s,get mutations(){return mutations;}};
}
const text = s => s.nodes().filter(n=>n.type==='Text').flatMap(n=>n.props.children).filter(v=>typeof v==='string');

for(const raw of ['Test field inspection task','FIELD NORMAL custom user note','X'.repeat(4000)]) {
  test('Detail preserves full backend instructions without translation or truncation: '+raw.slice(0,35),async()=>{
    const f=await detail(raw,'fallback');
    assert.ok(text(f.s).includes(raw));
    f.s.unmount();
  });
}
test('Detail keeps backend description fallback unchanged',async()=>{
  const f=await detail(null,'Custom backend description');
  assert.ok(text(f.s).includes('Custom backend description'));f.s.unmount();
});
test('Opening FIELD review maps transport errors to Vietnamese without exposing raw error or sending commands',async()=>{
  const f=await detail('Original instructions','',Error('Network Error'));
  await f.s.press('Xem hồ sơ đã gửi');await f.s.flush();
  assert.ok(text(f.s).some(v=>/Không đọc được dữ liệu nhiệm vụ/.test(v)));
  assert.ok(!text(f.s).includes('Network Error'));assert.equal(f.mutations,0);f.s.unmount();
});

test('Error mappers localize known codes and keep unknown outcomes uncertain',()=>{
  for(const [file,name,codes] of [
    ['src/api/crewRepairWorkflow.ts','repairErrorMessage',['repair_verified_evidence_required','repair_first_start_invalid','repair_binding_changed','repair_stale_assessment','repair_previous_session_unresolved','repair_session_changed','repair_claim_required']],
    ['src/api/crewFieldDraft.ts','fieldErrorMessage',['repair_claim_root_required','repair_after_camera_required','repair_finish_required','field_session_changed','field_verified_evidence_required']],
  ]) {
    const ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
    const n=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);
    const fn=vm.runInNewContext(ts.transpileModule(n.getText().replace(/^export /,''),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+';'+name,{Error});
    for(const code of codes)assert.match(fn(Error(code)),/[À-ỹ]/);
    assert.doesNotMatch(fn(Error('unknown_code')),/thành công|hoàn thành|đã xác nhận/);
  }
});
