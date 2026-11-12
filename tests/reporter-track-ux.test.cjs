const {test}=require('node:test');
const assert=require('node:assert/strict');
const {QueryClient,InfiniteQueryObserver}=require('@tanstack/react-query');
const {screen,deferred}=require('./helpers/roadfe-screen.cjs');

// Executes shipped screens and API helpers with deterministic query/native boundaries.
// These are logic tests, not Android rendering or HTTP verification.
const id='89e9b452-1111-4111-8111-123456789abc';
const report=(patch={})=>({id,description:'Nứt tấm bê tông gần cầu',createdAt:'2026-11-12T03:00:00Z',
 version:'v1',routingStatus:'ASSIGNED',evidence:[{id:'e1'}],supplements:[],publicUpdates:[],...patch});
const text=s=>s.nodes().filter(n=>n.type==='Text').map(n=>n.props.children.flat(Infinity).join('')).join(' ');
const cards=s=>s.nodes().filter(n=>n.type==='Pressable'&&n.props.accessibilityLabel?.startsWith('Xem chi tiết phản ánh'));
function fixture(file='track',patch={}){
 let s,configs=[],refreshes=0,more=0;
 const result={data:file==='track'?{pages:[{items:[report()],nextCursor:null}]}:{report:report()},
  isPending:false,isError:false,isFetching:false,isFetchingNextPage:false,hasNextPage:false,
  refetch:async()=>{refreshes++;},fetchNextPage:async()=>{more++;},...patch};
 const actual=()=>s.h.load('src/api/reporterApi.ts');
 const hook=config=>{configs.push(config);return result;};
 s=screen(`app/(reporter)/${file}.tsx`,{params:{reportId:id},api:{
  reporterReportsOptions:(...args)=>actual().reporterReportsOptions(...args),
  reportItemsFromPages:(...args)=>actual().reportItemsFromPages(...args),
  canShowReportPages:(...args)=>actual().canShowReportPages(...args),
 },modules:{'@tanstack/react-query':{useInfiniteQuery:hook,useQuery:hook},
 '../../src/components/EmptyState':{EmptyState:'EmptyState'},
 '../../src/components/Card':{Card:'Card'},
 '../../src/api/authApi':{passwordSessionIdentity:token=>s.h.load('src/api/authApi.ts').passwordSessionIdentity(token)}}});
 s.h.login();s.render();
 return {s,result,configs,actual,refreshes:()=>refreshes,more:()=>more};
}

test('own-report cards show bounded description, date, evidence count and routing only',()=>{
 const {s}=fixture();
 assert.match(text(s),/Nứt tấm bê tông gần cầu/);
 assert.match(text(s),/12\/11\/2026/);assert.match(text(s),/1 ảnh hiện trường/);
 assert.match(text(s),/Đã phân tuyến/);
 const description=s.nodes().find(n=>n.type==='Text'&&n.props.children.includes('Nứt tấm bê tông gần cầu'));
 assert.equal(description.props.numberOfLines,2);
 assert.doesNotMatch(text(s),/#HH-|89e9b452|%|hoàn thành|tiến độ/i);
 assert.equal(s.nodes().filter(n=>n.type==='InputField'||n.type==='TextInput').length,0);s.unmount();
});
for(const [routingStatus,label] of [['ASSIGNED','Đã phân tuyến'],['UNASSIGNED','Chưa phân tuyến'],['FUTURE','Chưa có thông tin phân tuyến'],[undefined,'Chưa có thông tin phân tuyến']]){
 test(`card routing stays neutral for ${routingStatus}`,()=>{
  const {s}=fixture('track',{data:{pages:[{items:[report({routingStatus})],nextCursor:null}]}});
  assert.match(text(s),new RegExp(label));assert.doesNotMatch(text(s),/FUTURE|hoàn thành|đang sửa/i);s.unmount();
 });
}
test('card opens real UUID and refresh/pagination remain explicit actions',async()=>{
 const f=fixture('track',{hasNextPage:true});const {s}=f;
 assert.equal(f.more(),0);cards(s)[0].props.onPress();
 assert.equal(s.nav[0].pathname,'/(reporter)/report-detail');assert.equal(s.nav[0].params.reportId,id);
 const header=s.nodes().find(n=>n.type==='ReporterHeader');const refresh=()=>header.props.rightAction;
 assert.equal(refresh().props.testID,'refresh-reports');assert.equal(refresh().props.accessibilityLabel,'Làm mới phản ánh');
 assert.doesNotMatch(text(s),/Các phản ánh bạn đã gửi/);
 const before=f.refreshes();refresh().props.onPress();assert.equal(f.refreshes(),before+1);
 await s.press('Tải thêm phản ánh');assert.equal(f.more(),1);
 f.result.isFetching=true;s.render();assert.equal(s.nodes().find(n=>n.props.title==='Tải thêm phản ánh').props.disabled,true);
 const busy=s.nodes().find(n=>n.type==='ReporterHeader').props.rightAction;
 assert.equal(busy.props.disabled,true);assert.equal(busy.props.accessibilityState.busy,true);
 s.unmount();
});
test('all loaded pages render once per real ID without implicit loading',()=>{
 const f=fixture('track',{hasNextPage:true,data:{pages:[{items:[report()],nextCursor:'next'},
  {items:[report(),report({id:'second',description:'Vỡ mép tấm'})],nextCursor:'last'}]}});
 assert.equal(cards(f.s).length,2);assert.match(text(f.s),/Vỡ mép tấm/);assert.equal(f.more(),0);f.s.unmount();
});
test('empty success offers new report; errors and pending do not claim empty success',()=>{
 const empty=fixture('track',{data:{pages:[{items:[],nextCursor:null}]}});
 const state=empty.s.nodes().find(n=>n.type==='EmptyState');assert.ok(state);state.props.onAction();
 assert.equal(empty.s.nav[0],'/(reporter)/report');empty.s.unmount();
 for(const patch of [{isError:true,data:undefined},{isPending:true,data:undefined}]){
  const {s}=fixture('track',patch);assert.ok(!s.nodes().some(n=>n.type==='EmptyState'));
  if(patch.isError)assert.match(text(s),/Không tải được danh sách/);s.unmount();
 }
});
for(const status of [401,403,404])test(`list/detail hide stale content on ${status}`,()=>{
 for(const file of ['track','report-detail']){
  const {s}=fixture(file,{isError:true,error:{response:{status}},isFetchNextPageError:true});
  assert.doesNotMatch(text(s),/Nứt tấm|Đã phân tuyến/);assert.equal(cards(s).length,0);
  assert.ok(!s.nodes().some(n=>n.props.title==='Bổ sung thông tin'));s.unmount();
 }
});
test('transient next-page failure retains authorized loaded cards and retry',async()=>{
 const f=fixture('track',{isError:true,isFetchNextPageError:true,error:{response:{status:503}},hasNextPage:true});
 assert.equal(cards(f.s).length,1);assert.match(text(f.s),/Không tải thêm được/);
 await f.s.press('Tải thêm phản ánh');assert.equal(f.more(),1);f.s.unmount();
});
test('logout disables reads, refresh and private content on both screens',async()=>{
 for(const file of ['track','report-detail']){
  const f=fixture(file);f.s.h.logout();f.s.render();
  assert.equal(f.configs.at(-1).enabled,false);assert.doesNotMatch(text(f.s),/Nứt tấm|Đã phân tuyến/);
  const before=f.refreshes();const scroll=f.s.nodes().find(n=>n.type==='ScrollView');
  scroll.props.refreshControl.props.onRefresh();assert.equal(f.refreshes(),before);f.s.unmount();
 }
});
test('screen query keys partition both list and detail on account/session change',()=>{
 for(const file of ['track','report-detail']){
  const f=fixture(file);const first=JSON.stringify(f.configs.at(-1).queryKey);
  f.result.data=undefined;f.s.h.login('REPORTER','actor-b');f.s.render();
  assert.notEqual(JSON.stringify(f.configs.at(-1).queryKey),first);assert.doesNotMatch(text(f.s),/Nứt tấm/);f.s.unmount();
 }
});
test('real API215 pagination and late results stay in their original query partition',async()=>{
 const f=fixture(),calls=[],pending=deferred();const api=f.actual();
 f.s.h.client.get=async(path,options)=>{calls.push([path,options.params]);
  if(options.params.cursor)return pending.promise;
  return {data:{items:[report()],nextCursor:'opaque-next'}};
 };
 const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
 const observer=new InfiniteQueryObserver(client,api.reporterReportsOptions('actor-a/session-a'));
 const unsubscribe=observer.subscribe(()=>{});
 try{
  await observer.refetch();const next=observer.fetchNextPage();
  observer.setOptions({...api.reporterReportsOptions('actor-b/session-b'),enabled:false});
  pending.resolve({data:{items:[report({id:'old-session-page'})],nextCursor:null}});await next;
  assert.equal(observer.getCurrentResult().data,undefined);
  assert.ok(calls.every(([path])=>path==='/reports'));assert.equal(calls[1][1].cursor,'opaque-next');
 }finally{unsubscribe();client.clear();f.s.unmount();}
});
test('detail presents only published BE updates and retains supplement/evidence context',async()=>{
 const update={id:'publication-id',summary:'Ban quản lý đã công bố thông tin khảo sát',publishedAt:'2026-11-12T04:00:00Z',evidenceIds:['public-evidence']};
 const f=fixture('report-detail',{data:{report:report({publicUpdates:[update],supplements:[{id:'s',description:'Bổ sung vị trí',createdAt:'2026-11-12T04:00:00Z'}]})}});
 assert.match(text(f.s),/Cập nhật từ Ban quản lý dự án/);assert.match(text(f.s),/Công bố lúc/);
 const descriptions=f.s.nodes().filter(n=>typeof n.type==='function'&&n.type.name==='ExpandableDescription');
 assert.deepEqual(descriptions.map(n=>n.props.value),['Nứt tấm bê tông gần cầu','Bổ sung vị trí',update.summary]);
 const preview=f.s.nodes().find(n=>n.props.publication);
 assert.equal(preview.props.publication.id,update.id);assert.equal(preview.props.reportId,id);assert.equal(preview.props.evidenceId,'public-evidence');
 await f.s.press('Bổ sung thông tin');assert.equal(f.s.nav[0].params.reportId,id);
 const before=f.refreshes();f.s.nodes().find(n=>n.type==='ReporterHeader').props.rightAction.props.onPress();assert.equal(f.refreshes(),before+1);f.s.unmount();
 const empty=fixture('report-detail');assert.doesNotMatch(text(empty.s),/Cập nhật từ Ban quản lý dự án|Công bố lúc/);empty.s.unmount();
});
