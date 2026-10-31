const test=require('node:test'),assert=require('node:assert/strict');
const {screen,harness}=require('./helpers/roadfe-screen.cjs');
const actor='00000000-0000-4000-8000-000000000001',projectId='00000000-0000-4000-8000-000000000002';
function fixture(){
 const api=harness().load('src/api/crewApi.ts');
 const rows=[['Completed','MEASURE_ONLY'],['Completed','INSPECT_AND_REPAIR'],['Completed','FUTURE'],['Submitted','MEASURE_ONLY'],['Assigned','INSPECT_AND_REPAIR']].map(([status,mode],i)=>({id:`00000000-0000-4000-8000-00000000001${i}`,projectId,crewId:actor,mode,status,version:'v1',defectIds:[]}));
 const query={data:{pages:[{items:rows.slice(0,2)},{items:rows.slice(2)}]},isPending:false,isFetching:false,isError:false,hasNextPage:true,refetch(){},fetchNextPage(){}};
 const s=screen('app/(crew)/tasks.tsx',{modules:{
  '@tanstack/react-query':{useInfiniteQuery:()=>query},
  'expo-router':{router:{push(){throw Error('unexpected navigation');}},useFocusEffect(){},usePathname:()=>'/tasks'},
  '../../src/api/authApi':{passwordSessionIdentity:t=>t?'["'+actor+'","s1"]':null},
  '../../src/api/client':{apiClient:{defaults:{baseURL:'fixture-env'}}},
  '../../src/api/crewApi':api,
  ...Object.fromEntries(['AppHeader','Card','Chip','EmptyState','FAB'].map(n=>['../../src/components/'+n,{[n]:n}]))
 }});s.h.login('REPAIR_CREW',actor);
 const tap=label=>{const node=s.nodes().find(n=>n.type==='Pressable'&&n.props.children.flat(Infinity).some(c=>c?.type==='Text'&&c.props.children.flat(Infinity).includes(label)));assert.ok(node,label);node.props.onPress();s.render();};
 const ids=()=>s.nodes().filter(n=>n.type==='Pressable'&&rows.some(r=>r.id===n.props.key)).map(n=>n.props.key);
 s.render();return {s,query,rows,tap,ids};
}
test('C4 completed uses same mode filters, retains selection and unfiltered loaded counts',()=>{
 const f=fixture();assert.equal(f.ids().length,2);f.tap('Chỉ đo kiểm');assert.deepEqual(f.ids(),[f.rows[3].id]);f.tap('Hoàn thành');
 assert.ok(f.s.nodes().some(n=>n.type==='Pressable'&&n.props.children.flat(Infinity).some(c=>c?.props?.children?.includes('Chỉ đo kiểm'))));
 assert.deepEqual(f.ids(),[f.rows[0].id]);f.tap('Đo kiểm, xét điều kiện sửa');assert.deepEqual(f.ids(),[f.rows[1].id]);
 f.tap('Chưa hoàn thành');assert.deepEqual(f.ids(),[f.rows[4].id]);f.tap('Hoàn thành');f.tap('Tất cả');assert.equal(f.ids().length,3);
 assert.ok(f.s.nodes().some(n=>n.type==='Text'&&n.props.children.includes(3))); // count before filter across loaded pages
 f.s.unmount();
});
test('C4 filtered empty state, cached transient error and foreign-owner protection remain',()=>{
 const f=fixture();f.tap('Hoàn thành');f.tap('Chỉ đo kiểm');f.query.data.pages[0].items.shift();f.s.render();
 assert.ok(f.s.nodes().some(n=>n.props.title==='Không có công việc trong bộ lọc này'));
 f.query.isError=true;f.query.error={response:{status:503}};f.tap('Tất cả');assert.equal(f.ids().length,2);
 f.query.data.pages[0].items[0].crewId='foreign';f.s.render();assert.equal(f.ids().length,0);assert.match(JSON.stringify(f.s.nodes()),/không khớp/);assert.equal(f.s.h.calls.length,0);f.s.unmount();
});
