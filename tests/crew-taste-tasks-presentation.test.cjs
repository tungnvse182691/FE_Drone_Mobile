const test=require('node:test'),assert=require('node:assert/strict');
const {screen}=require('./helpers/roadfe-screen.cjs');
const flat=s=>Object.assign({},...[s].flat(Infinity).filter(Boolean));
function setup(presentation,overrides={},inboxOverrides={}){
 const calls=[];
 const inbox={enabled:true,tasks:[{}],refresh:()=>calls.push('refresh'),query:{isPending:false,isFetching:false,hasNextPage:true,data:{pages:[{asOf:'2026-11-20T07:02:00Z'}]},refetch:()=>calls.push('refresh'),fetchNextPage:()=>calls.push('more'),...overrides},...inboxOverrides};
 const s=screen('app/(crew)/tasks.tsx',{exportName:'CrewInboxState',props:{inbox,...(presentation?{presentation}:{})},modules:{'../../src/components/crew/CrewHomeTaskPressable':{CrewHomeTaskPressable:'Pressable'},'@tanstack/react-query':{},...Object.fromEntries(['AppHeader','Card','Chip','EmptyState','FAB','Button'].map(n=>['../../src/components/'+n,{[n]:n}])),'../../src/components/crew/CrewMotion':{CrewPressable:'CrewPressable'}}});
 s.render();return {s,calls};
}
test('Tasks inbox presentation is opt-in; default Home/boundary retains its framed surface',()=>{
 const normal=setup(),tasks=setup('tasks');
 assert.equal(flat(normal.s.nodes().find(n=>n.type==='Card').props.style).borderWidth,1);
 assert.equal(flat(tasks.s.nodes().find(n=>n.type==='Card').props.style).borderWidth,0);
 for(const {s,calls} of [normal,tasks]){
  const text=JSON.stringify(s.nodes());assert.ok(text.includes('Thống kê trong các nhiệm vụ đã tải.'));assert.ok(text.includes('giờ Việt Nam'));
  s.nodes().find(n=>n.props.accessibilityLabel==='Tải lại nhiệm vụ').props.onPress();
  s.press('Tải thêm');assert.deepEqual(calls,['refresh','more']);s.unmount();
 }
});
test('Tasks variant preserves loading and pagination availability',()=>{
 const busy=setup('tasks',{isFetching:true,isFetchingNextPage:true});
 assert.equal(busy.s.nodes().find(n=>n.props.accessibilityLabel==='Tải lại nhiệm vụ').props.disabled,true);
 assert.equal(busy.s.nodes().find(n=>n.type==='Button').props.loading,true);busy.s.unmount();
 const end=setup('tasks',{hasNextPage:false});assert.equal(end.s.nodes().some(n=>n.type==='Button'&&n.props.title==='Tải thêm'),false);end.s.unmount();
});

test('Tasks presentation retains stale/error/empty messages and never offers pagination on error',()=>{
 for(const presentation of [undefined,'tasks','home']){
  const stale=setup(presentation,{}, {stale:true,error:'Không tải được dữ liệu nhiệm vụ.'});
  const text=JSON.stringify(stale.s.nodes());
  assert.ok(text.includes('Đang hiển thị danh sách đã tải trước đó.'));
  assert.ok(text.includes('Không tải được dữ liệu nhiệm vụ.'));
  assert.equal(stale.s.nodes().some(n=>n.type==='Button'&&n.props.title==='Tải thêm'),false);
  assert.equal(stale.s.nodes().find(n=>n.props.accessibilityLiveRegion==='polite').type,'Text');
  stale.s.unmount();
  const empty=setup(presentation,{hasNextPage:false},{tasks:[]});
  assert.ok(JSON.stringify(empty.s.nodes()).includes('Chưa có nhiệm vụ được giao.'));empty.s.unmount();
  const pending=setup(presentation,{isPending:true},{tasks:[]});
  const pendingText=JSON.stringify(pending.s.nodes());assert.ok(pendingText.includes('Đang tải nhiệm vụ…'));
  assert.equal(pendingText.includes('Chưa có nhiệm vụ được giao.'),false);pending.s.unmount();
 }
});

test('Home inbox groups one timestamp with refresh and retains pagination without repeating headings',()=>{
 const {s,calls}=setup('home');
 const text=JSON.stringify(s.nodes());
 assert.ok(!text.includes('Nhiệm vụ được giao'));
 assert.ok(!text.includes('Thống kê trong các nhiệm vụ đã tải'));
 assert.equal(s.nodes().filter(n=>n.type==='Text'&&String(n.props.children).includes('giờ Việt Nam')).length,1);
 assert.equal(flat(s.nodes().find(n=>n.type==='Card').props.style).borderWidth,0);
 s.nodes().find(n=>n.props.accessibilityLabel==='Tải lại nhiệm vụ').props.onPress();
 s.press('Tải thêm');assert.deepEqual(calls,['refresh','more']);s.unmount();
 const busy=setup('home',{isFetching:true});
 assert.equal(busy.s.nodes().find(n=>n.props.accessibilityLabel==='Tải lại nhiệm vụ').props.disabled,true);busy.s.unmount();
});
