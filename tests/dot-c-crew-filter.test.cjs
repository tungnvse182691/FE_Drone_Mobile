const test=require('node:test'),assert=require('node:assert/strict');
const {screen,harness}=require('./helpers/roadfe-screen.cjs');
const actor='00000000-0000-4000-8000-000000000001',projectId='00000000-0000-4000-8000-000000000002';
function fixture(modes){
 const api=harness().load('src/api/crewApi.ts');
 const rows=(modes??[['Completed','MEASURE_ONLY'],['Completed','INSPECT_AND_REPAIR'],['Completed','FUTURE'],['Submitted','MEASURE_ONLY'],['Assigned','INSPECT_AND_REPAIR']]).map(([status,mode],i)=>({id:'00000000-0000-4000-8000-00000000001'+i,assignmentId:'00000000-0000-4000-8000-00000000001'+i,assignmentStatus:'ACTIVE',projectId,crewId:actor,mode,status,version:'v1',defectIds:[]}));
 const query={data:{pages:[{items:rows.slice(0,2)},{items:rows.slice(2)}]},isPending:false,isFetching:false,isError:false,hasNextPage:true,refetch(){},fetchNextPage(){}};
 const s=screen('app/(crew)/tasks.tsx',{modules:{
  '../../src/components/crew/CrewHomeTaskPressable':{CrewHomeTaskPressable:'Pressable'},
  '@tanstack/react-query':{useQueryClient:()=>({resetQueries(){}}),useInfiniteQuery:options=>{
    const f=options.queryKey[2],selected=query.data.pages.flatMap(p=>p.items).filter(r=>(!f.mode||r.mode===f.mode)&&(!f.statusGroup|| (f.statusGroup==='COMPLETED'?r.status.toUpperCase()==='COMPLETED':f.statusGroup==='INCOMPLETE'?r.status.toUpperCase()!=='COMPLETED':false)));
    return {...query,data:{pages:[{items:selected}]}};
  }},
  'expo-router':{router:{push(){throw Error('unexpected navigation');}},useFocusEffect(){},usePathname:()=>'/tasks'},
  '../../src/api/authApi':{passwordSessionIdentity:t=>t?'["'+actor+'","s1"]':null},
  '../../src/api/client':{apiClient:{defaults:{baseURL:'fixture-env'}}},
  '../../src/api/crewApi':api,
  ...Object.fromEntries(['AppHeader','Card','Chip','EmptyState','FAB'].map(n=>['../../src/components/'+n,{[n]:n}]))
 }});s.h.login('REPAIR_CREW',actor);
 const tap=label=>{
  const group=['Tất cả','Sửa chữa theo kế hoạch','Sửa chữa nhanh có điều kiện','Chỉ đo kiểm'].includes(label)?'Bộ lọc loại công việc':['Tất cả tiếp nhận','Chờ tiếp nhận','Đã nhận','Đã từ chối'].includes(label)?'Bộ lọc tiếp nhận':null;
  if(group){const selector=s.nodes().find(n=>n.props.accessibilityLabel===group);if(!selector.props.accessibilityState.expanded){selector.props.onPress();s.render();}}
  const node=s.nodes().find(n=>n.type==='Pressable'&&n.props.children.flat(Infinity).some(c=>c?.type==='Text'&&c.props.children.flat(Infinity).includes(label)));assert.ok(node,label);node.props.onPress();s.render();
 };
 const ids=()=>s.nodes().filter(n=>n.type==='Pressable'&&rows.some(r=>r.id===n.props.key)).map(n=>n.props.key);
 s.render();return {s,query,rows,tap,ids};
}

test('Current repair modes filter independently in open and completed tabs',()=>{
 const f=fixture([['Completed','NORMAL'],['Completed','CONDITIONAL_FT'],['Completed','FUTURE'],['Assigned','NORMAL'],['InProgress','CONDITIONAL_FT']]);
 f.tap('Sửa chữa theo kế hoạch');assert.deepEqual(f.ids(),[f.rows[3].id]);
 f.tap('Hoàn thành');assert.deepEqual(f.ids(),[f.rows[0].id]);
 f.tap('Sửa chữa nhanh có điều kiện');assert.deepEqual(f.ids(),[f.rows[1].id]);
 f.tap('Chưa hoàn thành');assert.deepEqual(f.ids(),[f.rows[4].id]);
 f.tap('Tất cả');assert.equal(f.ids().length,2);f.tap('Hoàn thành');assert.equal(f.ids().length,3);
 f.s.unmount();
});
test('C4 completed uses same mode filters, retains selection and unfiltered loaded counts',()=>{
 const f=fixture();assert.equal(f.ids().length,2);f.tap('Chỉ đo kiểm');assert.deepEqual(f.ids(),[f.rows[3].id]);f.tap('Hoàn thành');
 assert.ok(JSON.stringify(f.s.nodes().find(n=>n.props.accessibilityLabel==='Bộ lọc loại công việc')).includes('Chỉ đo kiểm'));
 assert.deepEqual(f.ids(),[f.rows[0].id]);
 assert.ok(!f.s.nodes().some(n=>n.type==='Text'&&n.props.children.includes('Đo kiểm và xem xét sửa chữa')));
 f.tap('Tất cả');assert.equal(f.ids().length,3);f.tap('Chưa hoàn thành');assert.equal(f.ids().length,2);f.tap('Hoàn thành');assert.equal(f.ids().length,3);
 f.s.nodes().find(n=>n.props.accessibilityLabel==='Dữ liệu danh sách nhiệm vụ').props.onPress();f.s.render();
 assert.ok(f.s.nodes().some(n=>n.type==='Text'&&n.props.children.includes(3))); // loaded subset, not a server total
 f.s.unmount();
});
test('C4 filtered empty state, cached transient error and foreign-owner protection remain',()=>{
 const f=fixture();f.tap('Hoàn thành');f.tap('Chỉ đo kiểm');f.query.data.pages[0].items.shift();f.s.render();
 assert.ok(f.s.nodes().some(n=>n.props.title==='Không có công việc trong bộ lọc này'));
 f.query.isError=true;f.query.error={response:{status:503}};f.tap('Tất cả');assert.equal(f.ids().length,2);
 f.query.data.pages[0].items[0].crewId='foreign';f.s.render();assert.equal(f.ids().length,0);assert.match(JSON.stringify(f.s.nodes()),/không khớp/);assert.equal(f.s.h.calls.length,0);f.s.unmount();
});

test('FE1 selected acceptance keeps readable navy foreground on the selector',()=>{
 const f=fixture();
 const label=f.s.nodes().find(n=>n.type==='Text'&&n.props.children.includes('Tất cả tiếp nhận'));
 const style=Object.assign({},...label.props.style.flat(Infinity).filter(Boolean));
 assert.equal(style.color,'#192D40');f.s.unmount();
});

test('Task metadata is disclosed on demand while refresh, warnings and pagination remain reachable',()=>{
 const f=fixture();
 let refreshes=0,pages=0;
 f.query.refetch=()=>{refreshes++;};f.query.fetchNextPage=()=>{pages++;};f.s.render();
 f.s.nodes().find(n=>n.props.accessibilityLabel==='Tải lại nhiệm vụ').props.onPress();
 f.s.nodes().find(n=>n.type==='Button'&&n.props.title==='Tải thêm').props.onPress();
 assert.equal(refreshes,1);assert.equal(pages,1);
 const disclosure=()=>f.s.nodes().find(n=>n.props.accessibilityLabel==='Dữ liệu danh sách nhiệm vụ');
 assert.ok(disclosure());assert.equal(disclosure().props.accessibilityState.expanded,false);
 assert.ok(!JSON.stringify(f.s.nodes()).includes('Thống kê trong các nhiệm vụ đã tải.'));
 const before=f.ids();disclosure().props.onPress();f.s.render();
 assert.equal(disclosure().props.accessibilityState.expanded,true);
 assert.ok(JSON.stringify(f.s.nodes()).includes('Thống kê trong các nhiệm vụ đã tải.'));
 assert.deepEqual(f.ids(),before);
 disclosure().props.onPress();f.s.render();
 f.query.isError=true;f.query.error={response:{status:503}};f.s.render();
 assert.match(JSON.stringify(f.s.nodes()),/Đang hiển thị danh sách đã tải trước đó/);
 assert.equal(f.s.nodes().some(n=>n.type==='Button'&&n.props.title==='Tải thêm'),false);
 f.s.unmount();
});
