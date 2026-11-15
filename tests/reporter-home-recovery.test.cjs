const {test} = require('node:test');
const assert = require('node:assert/strict');
const {screen, deferred} = require('./helpers/roadfe-screen.cjs');

function fixture(check = async () => ({kind:'create',isCurrent:()=>true})) {
  let scope = 'session-a';
  const calls = [];
  const query = {isPending:false,isError:false,refetch:async()=>{},data:{pages:[]}};
  const s = screen('app/(reporter)/home.tsx', {modules:{
    '@tanstack/react-query':{useInfiniteQuery:()=>query},
    '../../src/api/authApi':{passwordSessionIdentity:()=>scope},
    '../../src/api/reporterApi':{reporterReportsOptions:()=>({}),canShowReportPages:()=>true,reportItemsFromPages:()=>[]},
    '../../src/components/AnimatedPressable':{AnimatedPressable:'AnimatedPressable'},
    '../../src/components/Card':{Card:'Card'},
    '../../src/store/reporter':{useReporterDraftScope:()=>({key:scope,capture:()=>{const captured=scope;return ()=>captured===scope;}})},
    '../../src/store/reporterRecovery':{
      listHistoricalReporterCommands:async()=>scope==='session-a'?[{id:'old-create',kind:'create'},{id:'old-supplement',kind:'supplement'}]:[],
      openHistoricalReporterCommand:async (id,isCurrent)=>{calls.push(id);const result=await check();return {...result,isCurrent:()=>isCurrent() && (result.isCurrent?.() ?? true)};},
    },
  }});
  s.h.login();
  const text = () => s.nodes().filter(n=>n.type==='Text').map(n=>JSON.stringify(n.props.children)).join(' ');
  return {s,calls,text,switchSession:()=>{scope='session-b';s.h.login('REPORTER','other');s.render();}};
}

test('Reporter historical entry opens the original form only after explicit choice',async()=>{
  const f=fixture(),{s}=f;s.render();await s.flush();
  assert.ok(s.nodes().some(n=>n.props?.testID==='reporter-recovery-toggle'));
  assert.ok(!s.nodes().some(n=>n.props?.testID==='reporter-recovery-old-create'));
  s.tap('reporter-recovery-toggle');s.render();
  await s.tap('reporter-recovery-old-create');await s.flush();
  assert.deepEqual(f.calls,['old-create']);
  assert.ok(JSON.stringify(s.nav).includes('/(reporter)/report'));
});

test('An old check finishing after account switch cannot expose its result',async()=>{
  const pending=deferred(),f=fixture(()=>pending.promise),{s}=f;
  s.render();await s.flush();s.tap('reporter-recovery-toggle');s.render();
  const task=s.tap('reporter-recovery-old-supplement');
  f.switchSession();pending.resolve({resourceReadable:true});await task;await s.flush();
  assert.ok(!s.nodes().some(n=>n.props?.testID==='reporter-recovery-toggle'));
  assert.ok(!s.nodes().some(n=>n.props?.testID==='reporter-recovery-result'));
});
