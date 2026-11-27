const {test}=require('node:test'),assert=require('node:assert/strict');
const {screen}=require('./helpers/roadfe-screen.cjs');
const same=(a,b)=>!b||['actor','scope','environment','role'].every(key=>a[key]===b[key]);
async function mount(rows,read=async()=>rows,subscribe){
 const identity={actor:'crew',scope:'session',environment:'test',role:'REPAIR_CREW'};
 const s=screen('app/(crew)/sync.tsx',{expose:'CrewSyncContent',exportName:'CrewSyncContent',props:{identity},modules:{
  'expo-sqlite':{},
  '../../src/components/AppHeader':{AppHeader:'AppHeader'},'../../src/components/Card':{Card:'Card'},
  '../../src/offline/database':{openDatabase:()=>({}),initDatabase:async()=>{}},
  '../../src/offline/upload-queue':{createQueueReader:()=>({read,cancel(){}}),sameQueueIdentity:same},
  '../../src/api/crewApi':{},'../../src/store/auth':{},
  '../../src/components/crew/CrewLocalDraftPanel':{CrewLocalDraftPanel:'CrewLocalDraftPanel'},
  '../../src/components/crew/CrewOfflinePanel':{CrewOfflinePanel:'CrewOfflinePanel'},
  '../../src/store/crewHandoverRefresh':{subscribeToCrewHandoverChange:subscribe??(()=>()=>{})},
  '../../src/components/Toast':{Toast:'Toast'},
 }});s.render();await s.flush();return Object.assign(s,{identity});
}
test('empty legacy queue does not display unrelated zero totals above current FIELD records',async()=>{
 const s=await mount([]);
 assert.equal(s.nodes().filter(n=>n.props.accessibilityRole==='tab').length,0);
 assert.ok(s.nodes().some(n=>n.type==='CrewLocalDraftPanel'));
 assert.ok(s.nodes().some(n=>n.type==='CrewOfflinePanel'));
 s.unmount();
});
test('retained legacy commands remain visible without granting send or ACK authority',async()=>{
 const s=await mount([{id:'old',kind:'FIELD_SUBMISSION',status:'ACKED',attempt:1,max_attempts:3}]);
 const toggle=s.nodes().find(n=>n.props.accessibilityLabel==='Hồ sơ cũ cần đối soát');
 assert.ok(toggle);assert.equal(toggle.props.accessibilityState.expanded,false);
 toggle.props.onPress();s.render();
 const text=JSON.stringify(s.nodes());
 assert.match(text,/Phản hồi cũ chưa được đối soát/);
 assert.doesNotMatch(text,/Đã xác nhận|Đồng bộ ngay|Lần thử/);
 assert.ok(!s.nodes().some(n=>n.type==='CrewHandoverPanel'));
 assert.equal(s.nodes().filter(n=>n.props.accessibilityLabel==='Bàn giao hồ sơ').length,1);
 s.unmount();
});

test('refresh labels follow the real pending read, retain content and prevent duplicate taps',async()=>{
 let release,reads=0;
 const s=await mount([],()=>{reads++;return reads===1?Promise.resolve([]):new Promise(resolve=>{release=resolve;});});
 const button=()=>s.nodes().find(n=>n.props.accessibilityLabel==='Tải lại trạng thái đồng bộ');
 const text=()=>s.nodes().filter(n=>n.type==='Text').map(n=>JSON.stringify(n.props.children)).join(' ');
 assert.match(text(),/Tải lại/);
 const pending=button().props.onPress();s.render();
 assert.equal(button().props.disabled,true);assert.equal(button().props.accessibilityState.busy,true);
 assert.match(text(),/Đang đọc…/);assert.doesNotMatch(text(),/Đồng bộ thành công/);
 assert.ok(s.nodes().some(n=>n.type==='CrewLocalDraftPanel'));
 await button().props.onPress();assert.equal(reads,2);
 release([]);await pending;await s.flush();
 assert.equal(button().props.disabled,false);assert.match(text(),/Tải lại/);
 s.unmount();
});

test('handover journal completion refreshes the focused Sync screen only for the active session', async()=>{
 let reads=0,listener;
 const s=await mount([],async()=>{reads++;return [];},notify=>{listener=notify;return()=>{listener=undefined;};});
 const panel=type=>s.nodes().find(n=>n.type===type).props;
 const start=panel('CrewOfflinePanel').refreshSignal;
 listener({...s.identity,scope:'old'});
 await s.flush();assert.equal(reads,1);
 listener(s.identity);
 await s.flush();
 assert.equal(reads,2);
 assert.equal(panel('CrewOfflinePanel').refreshSignal,start+1);
 assert.equal(panel('CrewLocalDraftPanel').refreshSignal,start+1);
 s.blur();assert.equal(listener,undefined);
 s.unmount();
});
