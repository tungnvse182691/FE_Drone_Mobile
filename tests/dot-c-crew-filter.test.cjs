const test=require('node:test'),assert=require('node:assert/strict');
const {screen,harness}=require('./helpers/roadfe-screen.cjs');
const actor='00000000-0000-4000-8000-000000000001',projectId='00000000-0000-4000-8000-000000000002';
function fixture(modes,cache,motion=true){
 const copied=[];
 const api=harness().load('src/api/crewApi.ts');
 const rows=(modes??[['Completed','MEASURE_ONLY'],['Completed','INSPECT_AND_REPAIR'],['Completed','FUTURE'],['Submitted','MEASURE_ONLY'],['Assigned','INSPECT_AND_REPAIR']]).map(([status,mode],i)=>({id:'00000000-0000-4000-8000-00000000001'+i,assignmentId:'00000000-0000-4000-8000-00000000001'+i,assignmentStatus:'ACTIVE',projectId,crewId:actor,mode,status,version:'v1',defectIds:[]}));
 const query={data:{pages:[{items:rows.slice(0,2)},{items:rows.slice(2)}]},isPending:false,isFetching:false,isError:false,hasNextPage:true,refetch(){},fetchNextPage(){}};
 const listeners=new Map();
 const s=screen('app/(crew)/tasks.tsx',{moduleFactories:{'react-native':({modules})=>({...modules['react-native'],Keyboard:{...modules['react-native'].Keyboard,dismiss(){}},Clipboard:{setString(value){copied.push(value);}},AccessibilityInfo:{announceForAccessibility(){},isReduceMotionEnabled:()=>Promise.resolve(motion),addEventListener:(name,fn)=>{listeners.set(name,fn);return {remove:()=>listeners.delete(name)};}}})},modules:{
  '../../src/components/crew/CrewHomeTaskPressable':{CrewHomeTaskPressable:'Pressable'},
  '@tanstack/react-query':{useQueryClient:()=>({resetQueries(){},getQueryData(key){if(!cache)return undefined;assert.equal(key[0],'crew-inbox');assert.equal(key[1],'["'+actor+'","s1"]');assert.equal(key[3],'fixture-env');assert.equal(key[2].statusGroup,undefined);assert.equal(key[2].mode,undefined);return {pages:[{items:cache(rows),asOf:'2026-11-23T02:30:00Z'}]};}}),useInfiniteQuery:options=>{
    const f=options.queryKey[2],selected=query.data.pages.flatMap(p=>p.items).filter(r=>(!f.mode||r.mode===f.mode)&&(!f.statusGroup|| (f.statusGroup==='COMPLETED'?r.status.toUpperCase()==='COMPLETED':f.statusGroup==='INCOMPLETE'?r.status.toUpperCase()!=='COMPLETED':false)));
    return {...query,data:{pages:[{items:selected}]}};
  }},
  'expo-router':{router:{push(){throw Error('unexpected navigation');}},useFocusEffect(){},usePathname:()=>'/tasks'},
  '../../src/api/authApi':{passwordSessionIdentity:t=>t?'["'+actor+'","s1"]':null},
  '../../src/api/client':{apiClient:{defaults:{baseURL:'fixture-env'}}},
  '../../src/api/crewApi':api,
  ...Object.fromEntries(['AppHeader','Card','Chip','EmptyState','FAB'].map(n=>['../../src/components/'+n,{[n]:n}]))
 }});s.h.login('REPAIR_CREW',actor);
 const baseNodes=s.nodes;
 const walk=n=>!n?[]:Array.isArray(n)?n.flatMap(walk):typeof n==='object'?[n,...walk(n.props?.children)]:[];
 s.nodes=()=>{const nodes=baseNodes();return [...nodes,...nodes.filter(n=>n.props?.header).flatMap(n=>walk(n.props.header))];};
 const tap=label=>{
  const isFilter=['Tất cả','Sửa chữa theo kế hoạch','Sửa chữa nhanh có điều kiện','Chỉ đo kiểm','Tất cả tiếp nhận','Chờ tiếp nhận','Đã nhận','Đã từ chối'].includes(label);
  if(isFilter&&!s.nodes().some(n=>n.type==='Modal')){s.nodes().find(n=>n.props.accessibilityLabel==='Bộ lọc').props.onPress();s.render();}
  const node=s.nodes().find(n=>n.type==='Pressable'&&n.props.accessibilityLabel===label);assert.ok(node,label);node.props.onPress();s.render();
 };
 const ids=()=>s.nodes().filter(n=>n.type==='View'&&rows.some(r=>r.id===n.props.key)).map(n=>n.props.key);
 s.render();return {s,query,rows,tap,ids,copied,listeners};
}

test('Sheet slides only after OS permits motion, follows changes and removes subscription',async()=>{
 const f=fixture(undefined,undefined,false);f.tap('Bộ lọc');
 const modal=()=>f.s.nodes().find(n=>n.type==='Modal');
 assert.equal(modal().props.animationType,'none');
 await Promise.resolve();f.s.render();assert.equal(modal().props.animationType,'slide');
 f.listeners.get('reduceMotionChanged')(true);f.s.render();assert.equal(modal().props.animationType,'none');
 f.s.unmount();assert.equal(f.listeners.size,0);
});

test('Cached summary uses exact session/environment key, deduplicates and excludes foreign assignments',()=>{
 const f=fixture(undefined,rows=>[...rows,rows[0],{...rows[0],assignmentId:'00000000-0000-4000-8000-000000000099',crewId:'foreign'}]);
 const summary=()=>f.s.nodes().find(n=>n.props.accessibilityLabel==='Thống kê trong các nhiệm vụ đã tải');
 const text=n=>n==null?'':Array.isArray(n)?n.map(text).join(''):typeof n==='object'?text(n.props?.children):String(n);
 assert.equal(text(summary()),'2đang mở5đã tải lúc 09:303đã xong');
 f.tap('Chỉ đo kiểm');assert.equal(text(summary()),'2đang mở5đã tải lúc 09:303đã xong');
 f.s.unmount();
});

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
 assert.equal(f.s.nodes().find(n=>n.props.accessibilityLabel==='Chỉ đo kiểm').props.accessibilityState.selected,true);
 assert.deepEqual(f.ids(),[f.rows[0].id]);
 assert.ok(!f.s.nodes().some(n=>n.type==='Text'&&n.props.children.includes('Đo kiểm và xem xét sửa chữa')));
 f.tap('Tất cả');assert.equal(f.ids().length,3);f.tap('Chưa hoàn thành');assert.equal(f.ids().length,2);f.tap('Hoàn thành');assert.equal(f.ids().length,3);
 assert.ok(f.s.nodes().some(n=>n.type==='Text'&&n.props.children.includes(3))); // loaded subset, not a server total
 f.s.unmount();
});
test('C4 filtered empty state, cached transient error and foreign-owner protection remain',()=>{
 const f=fixture();f.tap('Hoàn thành');f.tap('Chỉ đo kiểm');f.query.data.pages[0].items.shift();f.s.render();
 assert.ok(f.s.nodes().some(n=>n.props.title==='Không có công việc trong bộ lọc này'));
 f.query.isError=true;f.query.error={response:{status:503}};f.tap('Tất cả');assert.equal(f.ids().length,2);
 f.query.data.pages[0].items[0].crewId='foreign';f.s.render();assert.equal(f.ids().length,0);assert.match(JSON.stringify(f.s.nodes()),/không khớp/);assert.equal(f.s.h.calls.length,0);f.s.unmount();
});

test('Selected acceptance is white on navy; unselected chips retain navy text',()=>{
 const f=fixture();f.tap('Đã nhận');
 const flat=s=>Object.assign({},...s.flat(Infinity).filter(Boolean));
 for(const [label,foreground,background] of [['Đã nhận','#FFFFFF','#192D40'],['Tất cả tiếp nhận','#192D40','#F8F9FA']]){
  const chip=f.s.nodes().find(n=>n.props.accessibilityLabel===label);
  assert.equal(flat(chip.props.style).backgroundColor,background);
  assert.equal(flat(chip.props.children[0].props.style).color,foreground);
 }
 f.s.unmount();
});

test('Summary replaces disclosure while refresh, warnings and pagination remain reachable',()=>{
 const f=fixture();let refreshes=0,pages=0;
 f.query.refetch=()=>{refreshes++;};f.query.fetchNextPage=()=>{pages++;};f.s.render();
 f.s.nodes().find(n=>n.props.accessibilityLabel==='Tải lại nhiệm vụ').props.onPress();
 f.s.nodes().find(n=>n.type==='Button'&&n.props.title==='Tải thêm').props.onPress();
 assert.equal(refreshes,1);assert.equal(pages,1);
 assert.ok(!f.s.nodes().some(n=>n.props.accessibilityLabel==='Dữ liệu danh sách nhiệm vụ'));
 assert.ok(f.s.nodes().some(n=>n.props.accessibilityLabel==='Thống kê trong các nhiệm vụ đã tải'));
 f.query.isError=true;f.query.error={response:{status:503}};f.s.render();
 assert.match(JSON.stringify(f.s.nodes()),/Đang hiển thị danh sách đã tải trước đó/);
 assert.equal(f.s.nodes().some(n=>n.type==='Button'&&n.props.title==='Tải thêm'),false);f.s.unmount();
});

test('Rejected history keeps tabs and both filter groups; clear and close do not navigate',()=>{
 const f=fixture();f.tap('Đã từ chối');
 assert.match(JSON.stringify(f.s.nodes()),/Lịch sử phân công đã từ chối/);
 for(const label of ['Chưa hoàn thành','Hoàn thành','Khác','Chỉ đo kiểm','Tất cả tiếp nhận'])assert.ok(f.s.nodes().some(n=>n.props.accessibilityLabel===label));
 f.tap('Chỉ đo kiểm');assert.equal(f.s.nodes().find(n=>n.props.accessibilityLabel==='Chỉ đo kiểm').props.accessibilityState.selected,true);
 f.tap('Xóa lọc');
 for(const label of ['Tất cả','Tất cả tiếp nhận'])assert.equal(f.s.nodes().find(n=>n.props.accessibilityLabel===label).props.accessibilityState.selected,true);
 f.tap('Hoàn tất');assert.equal(f.s.nodes().some(n=>n.type==='Modal'),false);
 assert.equal(f.s.h.calls.length,0);f.s.unmount();
});

test('Initial loading shows row skeletons; refresh keeps loaded rows',()=>{
 const f=fixture();const before=f.ids();f.query.isFetching=true;f.s.render();assert.deepEqual(f.ids(),before);
 f.query.isPending=true;f.query.data.pages=[];f.s.render();
 assert.ok(f.s.nodes().some(n=>n.props.accessibilityLabel==='Đang tải nhiệm vụ'&&n.props.accessibilityState.busy));
 assert.equal(f.s.nodes().filter(n=>n.props.importantForAccessibility==='no-hide-descendants').length,3);
 assert.ok(!JSON.stringify(f.s.nodes()).includes('Không có công việc trong bộ lọc này'));f.s.unmount();
});

test('Copy is a separate target from navigation and uses the full original code',()=>{
 const f=fixture();
 const copy=f.s.nodes().find(n=>n.props.accessibilityLabel?.startsWith('Sao chép mã nhiệm vụ'));
 assert.ok(copy);copy.props.onPress();assert.equal(f.copied[0],f.rows[3].id);
 assert.equal(f.s.h.calls.length,0);f.s.unmount();
});

test('Home-style card keeps rejected history disabled while the original code remains copyable',()=>{
 const f=fixture();f.tap('Đã từ chối');
 f.rows.splice(0,f.rows.length,{...f.rows[0],isHistory:true,assignmentStatus:'REJECTED',acceptanceOutcome:'REJECTED',status:null,mode:null,version:'',defectIds:[],woCode:'FIELD-original-code-not-shortened',rejectedAt:'2026-11-22T03:00:00Z'});
 f.query.data.pages=[{items:f.rows}];f.s.render();
 const open=f.s.nodes().find(n=>n.props.accessibilityLabel?.startsWith('Mở nhiệm vụ'));
 assert.ok(open);assert.equal(open.props.disabled,true);assert.equal(open.props.accessibilityState.disabled,true);
 open.props.onPress();assert.equal(f.s.h.calls.length,0);
 const copy=f.s.nodes().find(n=>n.props.accessibilityLabel?.startsWith('Sao chép mã nhiệm vụ'));
 copy.props.onPress();assert.equal(f.copied.length,1);
 const status=f.s.nodes().find(n=>n.type==='CrewTaskStatus');assert.equal(status.props.status,'REJECTED');assert.equal(status.props.label,'Phân công đã từ chối');
 f.s.unmount();
});
