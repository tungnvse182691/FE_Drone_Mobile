const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm'),cp=require('node:child_process');
const read=p=>fs.readFileSync(p,'utf8');
function fn(file,name){const s=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);return s.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);}
function pure(name){const n=fn('app/(crew)/tasks.tsx',name);assert.ok(n,`${name} exists`);const code=ts.transpileModule(n.getText().replace(/^export /,''),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;return vm.runInNewContext(code+`;${name}`);}
test('Crew UI localizes real states and preserves unknown state visibility',()=>{const label=pure('crewStatusLabel');assert.equal(label('Submitted'),'Đã gửi kết quả');assert.equal(label('Assigned'),'Chờ nhận nhiệm vụ');assert.equal(label('Completed'),'Hoàn thành');assert.equal(label('FutureState'),'Trạng thái chưa được hỗ trợ');});
test('Crew UI distinguishes NORMAL/FastTrack from missing field mode',()=>{const label=pure('crewModeLabel');assert.equal(label('NORMAL'),'Sửa chữa theo kế hoạch');assert.equal(label('CONDITIONAL_FT'),'Kiểm tra điều kiện sửa nhanh');assert.equal(label('MEASURE_ONLY'),'Chỉ đo kiểm');assert.equal(label('UNKNOWN'),'Chưa có thông tin chế độ');});
test('Crew navigation shell supports null coordinates without operational assertion or fake center',()=>{const s=read('app/(crew)/navigation.tsx');assert.match(s,/CrewTaskBoundary operational=\{false\}/);assert.doesNotMatch(s,/OperationalCrewTask/);assert.match(s,/task\.coordinates \?/);assert.match(s,/disabled=\{!task\.coordinates\}/);assert.match(s,/projectId: task.projectId/);});
test('Crew technical WKT is opt-in, Submitted detail retains task and readable cards',()=>{assert.match(read('src/components/crew/CrewTaskFacts.tsx'),/showGeometry\s*&&/);const s=read('app/(crew)/wo-detail.tsx');assert.match(s,/Thông tin nhiệm vụ/);assert.match(s,/Chi tiết kỹ thuật/);assert.match(s,/crewStatusLabel\(fresh.status\)/);});
test('Crew original UI-only checkpoint did not modify journal/workflow/API/bootstrap sources',()=>{const names=cp.execFileSync('git',['diff','--name-only','635e367..8199cbe'],{encoding:'utf8'}).trim().split(/\r?\n/);assert.ok(!names.some(p=>/^src\/(api|offline|hooks)\//.test(p)));for(const name of ['fieldJournal','currentCrewScope','currentCrewActor']){const file='app/(crew)/wo-detail.tsx';const old=cp.execFileSync('git',['show',`HEAD:${file}`],{encoding:'utf8'});const s=ts.createSourceFile(file,old,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const n=s.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert.equal(fn(file,name).getText().replace(/\r\n/g,'\n'),n.getText().replace(/\r\n/g,'\n'));}});

// Execute shipped TSX with the existing hook harness. No native renderer / HTTP evidence.
const {screen}=require('./helpers/roadfe-screen.cjs');
const actor='11111111-1111-4111-8111-111111111111',project='22222222-2222-4222-8222-222222222222',taskId='33333333-3333-4333-8333-333333333333';
const assignment='44444444-4444-4444-8444-444444444444';
const version='AAAAAAAAAAE=';
function crewApi(){const module={exports:{}};vm.runInNewContext(ts.transpileModule(read('src/api/crewApi.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,{module,exports:module.exports,require:n=>n==='axios'?require('axios'):n==='./problemDetails'?{}:{apiClient:{get(){throw Error('unexpected HTTP');},post(){throw Error('unexpected mutation');}}}});return module.exports;}
const api=crewApi();
function task(status='Submitted'){const detail={id:taskId,projectId:project,assignedToUserId:actor,assignmentId:assignment,version,status,mode:'MEASURE_ONLY',firstStartOriginId:assignment,instructions:'Đo kiểm vị trí được giao',defectId:assignment};return api.crewTaskFromWire({id:taskId,projectId:project,crewId:actor,status,version,mode:'MEASURE_ONLY',defectIds:[assignment]},detail,`"${version}"`);}
const labels={crewStatusLabel:pure('crewStatusLabel'),crewModeLabel:pure('crewModeLabel')};
const uiModules={
 '../../src/components/AppHeader':{AppHeader:'AppHeader'},'../../src/components/Card':{Card:'Card'},'../../src/components/Chip':{Chip:'Chip'},
 '../../src/components/crew/CrewTaskFacts':{CrewTaskFacts:'CrewTaskFacts'},
 '../../src/hooks/useRepairBootstrap':{},'../../src/api/crewRepairDraft':{},'../../src/api/crewRepairWorkflow':{},'../../src/api/crewFieldDraft':{},
 '../../src/api/crewApi':api,'expo-crypto':{randomUUID(){throw Error('no command expected');}},
 '../../src/offline/database':{openDatabase:()=>({getFirstAsync:async()=>null}),initDatabase:async()=>{},saveDraft:async()=>{throw Error('no write expected');}},
};
function detailScreen(t){const nav=[];const s=screen('app/(crew)/wo-detail.tsx',{expose:'CrewFieldActions',exportName:'CrewFieldActions',props:{task:t},modules:{...uiModules,
 './tasks':{...labels,CrewTaskBoundary:'Boundary',useCrewIdentity:()=>({scope:'fixture-scope',user:{id:actor},enabled:true})},
 '../../src/api/authApi':{passwordSessionIdentity:()=>null},
 'expo-router':{router:{push:p=>nav.push(p),replace:p=>nav.push(p)},useFocusEffect:()=>{}},
 }});return {s,nav};}
const textNodes=s=>s.nodes().filter(n=>n.type==='Text').map(n=>n.props.children.flat(Infinity).filter(v=>typeof v==='string'||typeof v==='number').join('')).join('\n');
test('Crew Submitted detail renders instructions with null GPS, hidden technical IDs and no commands',async()=>{
 const {s}=detailScreen(task());s.render();await s.flush();assert.match(textNodes(s),/Thông tin nhiệm vụ|Đo kiểm vị trí được giao/);assert.doesNotMatch(textNodes(s),new RegExp(taskId));
 const buttons=s.nodes().filter(n=>n.type==='Button');assert.equal(buttons.find(n=>n.props.title==='Dẫn đường').props.disabled,true);assert.equal(buttons.find(n=>n.props.title==='Nhận nhiệm vụ').props.disabled,true);
 assert.equal(s.h.calls.length,0);const toggle=s.nodes().find(n=>n.type==='Pressable'&&n.props.accessibilityState?.expanded===false);toggle.props.onPress();s.render();assert.match(textNodes(s),new RegExp(taskId));s.unmount();
});
for(const [status,expected] of [[401,/đăng nhập/],[403,/quyền/],[409,/thay đổi/],[412,/thay đổi/]])test(`Crew read ${status} remains actionable without granting capability`,()=>{
 const label=pure('crewReadError');assert.match(label({response:{status}}),expected);
});
test('Crew missing GPS does not block valid accept/start API guards; Submitted retains review only',()=>{
 for(const state of ['NewAssigned','Accepted','Submitted']){const t=task(state);assert.equal(t.coordinates,null);assert.equal(api.fieldCommandBlock(t.detail,t.etag,actor,state==='Accepted'?'start':'accept')===null,state!=='Submitted');assert.ok(api.fieldCommandBlock(t.detail,t.etag,project,'accept'));}
 const t=task();assert.equal(api.fieldCapabilityBlock(t.detail,t.etag,actor,'review'),null);assert.ok(api.fieldCapabilityBlock(t.detail,t.etag,actor,'capture'));
});
function navigation(t){const nav=[],urls=[];
 const native={View:'View',Text:'Text',Pressable:'Pressable',StyleSheet:{create:o=>o,absoluteFill:{}},Animated:{View:'AnimatedView',Value:class{setValue(){}},spring:()=>({start(){}})},PanResponder:{create:()=>({panHandlers:{}})}};
 const s=screen('app/(crew)/navigation.tsx',{expose:'CrewNavigationScreenContent',exportName:'CrewNavigationScreenContent',props:{task:t},modules:{
 'react-native':native,'expo-linking':{openURL:u=>{urls.push(u);return Promise.resolve();}},'expo-router':{router:{push:p=>nav.push(p),back(){}},useLocalSearchParams:()=>({})},
 './tasks':{CrewTaskBoundary:'Boundary',TASK_MODE_CHIP:{MEASURE_ONLY:{variant:'measure-only',label:'Chỉ đo kiểm'}}},
 '../../src/components/Chip':{Chip:'Chip'},'../../src/components/map/RoadGuardMapLibre':{RoadGuardMapLibre:'Map'},
 }});return {s,nav,urls};
}
test('Crew null GPS navigation keeps layout, no map or URL, and returns with project/task identity',()=>{
 const {s,nav,urls}=navigation(task());s.render();assert.match(textNodes(s),/Chưa có vị trí dẫn đường/);assert.ok(!s.nodes().some(n=>n.type==='Map'));
 const map=s.nodes().find(n=>n.type==='Button'&&n.props.title==='Mở Google Maps');assert.equal(map.props.disabled,true);map.props.onPress();assert.equal(urls.length,0);
 s.press('Xem nhiệm vụ');assert.equal(nav[0].params.id,taskId);assert.equal(nav[0].params.projectId,project);s.unmount();
});
test('Crew valid server coordinates alone provide map destination; opening it does not claim arrival',()=>{
 const {s,urls}=navigation({...task(),coordinates:{latitude:10.75,longitude:106.6}});s.render();s.press('Mở Google Maps');assert.match(urls[0],/destination=10.75,106.6$/);assert.ok(s.nodes().some(n=>n.type==='Map'));assert.ok(!s.nodes().some(n=>n.props.title==='Đã đến nơi'));s.unmount();
});
test('Crew unchanged FIELD preparation callbacks retain baseline execution source',()=>{
 const file='app/(crew)/wo-detail.tsx',old=cp.execFileSync('git',['show',`HEAD:${file}`],{encoding:'utf8'});
 function declaration(source,name){const s=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let found;function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText()===name)found=n.getText().replace(/\r\n/g,'\n').replace('Đã lưu biên nhận máy chủ và đối chiếu hạng mục.','Đã lưu receipt máy chủ và đối chiếu ngữ cảnh hạng mục.');ts.forEachChild(n,visit);}visit(s);return found;}
 for(const name of ['openField','blocked'])assert.equal(declaration(read(file),name),declaration(old,name),name);
});


test('Crew inbox renders loading, empty and HTTP failures with safe retry and cursor controls',()=>{
 const node=fn('app/(crew)/tasks.tsx','CrewInboxState');
 const code=ts.transpileModule(node.getText().replace(/^export /,''),{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS}}).outputText;
 const render=vm.runInNewContext(code+';CrewInboxState',{crewDateTime:pure('crewDateTime'),React:{createElement:(type,props,...children)=>({type,props,children})},Card:'Card',View:'View',Text:'Text',Button:'Button',MaterialIcons:'MaterialIcons',colors:{},spacing:{},typography:{}});
 const walk=x=>!x?[]:Array.isArray(x)?x.flatMap(walk):typeof x==='object'?[x,...walk(x.children)]:[];
 for(const scenario of [{pending:true,expected:/Đang tải nhiệm vụ/},{expected:/Chưa có nhiệm vụ được giao/},{error:pure('crewReadError')({response:{status:403}}),expected:/không có quyền/},{error:pure('crewReadError')({response:{status:409}}),expected:/vừa thay đổi/}]){
  let reads=0,more=0;const tree=render({inbox:{enabled:true,tasks:[],error:scenario.error,query:{isPending:!!scenario.pending,isFetching:false,hasNextPage:!scenario.error&&!scenario.pending,refetch:()=>reads++,fetchNextPage:()=>more++}}});
  assert.match(JSON.stringify(tree),scenario.expected);const nodes=walk(tree);nodes.find(n=>n.props?.title==='Tải lại').props.onPress();assert.equal(reads,1);
  const next=nodes.find(n=>n.props?.title==='Tải thêm');if(scenario.error)assert.equal(next,undefined);else if(next){next.props.onPress();assert.equal(more,1);}
 }
});


test('Patch11 actual detail action reasons track loading, busy, pending and retain rejection text',()=>{
 const {s}=detailScreen(task('NewAssigned'));s.render();assert.ok(!s.nodes().some(n=>n.type==='InputField'));assert.match(textNodes(s),/Nhận nhiệm vụ: Đang kiểm tra/);
 s.slots[2]=true;s.render();const input=s.nodes().find(n=>n.type==='InputField');assert.ok(input);input.props.onChangeText('Lý do đã nhập');s.render();assert.equal(s.nodes().find(n=>n.type==='InputField').props.value,'Lý do đã nhập');
 s.slots[3]=true;s.render();assert.ok(!s.nodes().some(n=>n.type==='InputField'));assert.match(textNodes(s),/Từ chối nhiệm vụ: Đang xử lý/);
 s.slots[3]=false;s.slots[1]={phase:'pending',scope:'fixture-scope'};s.render();assert.ok(!s.nodes().some(n=>n.type==='InputField'));assert.match(textNodes(s),/Bắt đầu nhiệm vụ: Cần đối soát/);
 s.slots[1]=null;s.render();assert.equal(s.nodes().find(n=>n.type==='InputField').props.value,'Lý do đã nhập');assert.equal(s.h.calls.length,0);s.unmount();
});
