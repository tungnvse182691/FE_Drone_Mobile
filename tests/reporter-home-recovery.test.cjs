const {test} = require('node:test');
const assert = require('node:assert/strict');
const {screen, deferred} = require('./helpers/roadfe-screen.cjs');

function fixture(check = async () => ({resourceReadable:true})) {
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
      checkHistoricalReporterCommand:async id=>{calls.push(id);return check();},
    },
  }});
  s.h.login();
  const text = () => s.nodes().filter(n=>n.type==='Text').map(n=>JSON.stringify(n.props.children)).join(' ');
  return {s,calls,text,switchSession:()=>{scope='session-b';s.h.login('REPORTER','other');s.render();}};
}

test('Reporter historical entries stay collapsed until requested; check result stays inside the card',async()=>{
  const f=fixture(),{s}=f;s.render();await s.flush();
  assert.ok(s.nodes().some(n=>n.props?.testID==='reporter-recovery-toggle'));
  assert.ok(!s.nodes().some(n=>n.props?.testID==='reporter-recovery-old-create'));
  assert.doesNotMatch(f.text(),/Lệnh gửi|Kiểm tra lệnh/);
  s.tap('reporter-recovery-toggle');s.render();
  await s.tap('reporter-recovery-old-create');await s.flush();
  assert.deepEqual(f.calls,['old-create']);
  assert.match(f.text(),/Chưa xác nhận/);
  const card=s.nodes().find(n=>n.type==='Card'&&JSON.stringify(n.props.children).includes('reporter-recovery-result'));
  assert.ok(card,'feedback belongs to the recovery card');
  s.tap('reporter-recovery-toggle');s.render();
  assert.ok(!s.nodes().some(n=>n.props?.testID==='reporter-recovery-result'));
});

test('An old check finishing after account switch cannot expose its result',async()=>{
  const pending=deferred(),f=fixture(()=>pending.promise),{s}=f;
  s.render();await s.flush();s.tap('reporter-recovery-toggle');s.render();
  const task=s.tap('reporter-recovery-old-supplement');
  f.switchSession();pending.resolve({resourceReadable:true});await task;await s.flush();
  assert.ok(!s.nodes().some(n=>n.props?.testID==='reporter-recovery-toggle'));
  assert.ok(!s.nodes().some(n=>n.props?.testID==='reporter-recovery-result'));
});
