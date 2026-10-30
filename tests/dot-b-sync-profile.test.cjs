const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const {screen,deferred}=require('./helpers/roadfe-screen.cjs');
function functions(file,names,context={}){const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const code=names.map(name=>source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name).getText().replace(/^export /,'')).join('\n');return vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+';({'+names.join(',')+'})',context);}
const text=s=>s.nodes().filter(n=>n.type==='Text').map(n=>n.props.children.flat(Infinity).filter(v=>typeof v==='string'||typeof v==='number').join('')).join('\n');
const common={'../../src/components/AppHeader':{AppHeader:'AppHeader'},'../../src/components/Card':{Card:'Card'},'../../src/components/Toast':{Toast:'Toast'},'../../src/components/Chip':{Chip:'Chip'},'../../src/components/crew/CrewTaskFacts':{CrewTaskFacts:'CrewTaskFacts'}};
for(const state of ['loading','empty','error','pages'])test('B5 profile prioritizes identity and retains scoped stats '+state,()=>{
 let reads=0;const inbox={enabled:true,tasks:state==='pages'?[{done:true},{done:false}]:[],error:state==='error'?'Không tải được thống kê':null,query:{isPending:state==='loading',isFetching:false,hasNextPage:state==='pages',refetch:()=>reads++}};
 const s=screen('app/(crew)/profile.tsx',{modules:{...common,'./tasks':{useCrewInbox:()=>inbox},'../../src/api/crewApi':{crewTaskIsComplete:t=>t.done},'expo-router':{router:{push(){},replace(){}}}}});
 s.render();const value=text(s);assert.doesNotMatch(value,/Nhiệm vụ được giao/);assert.ok(value.indexOf('Chưa có tên tài khoản')<value.indexOf('Thống kê trong nhiệm vụ đã tải'));
 assert.match(value,/Không phải toàn bộ lịch sử/);if(state==='loading'||state==='error')assert.match(value,/—/);if(state==='empty')assert.match(value,/Chưa có nhiệm vụ được giao/);if(state==='pages')assert.match(value,/Còn nhiệm vụ chưa tải/);
 s.nodes().find(n=>n.props.accessibilityLabel==='Tải lại thống kê').props.onPress();assert.equal(reads,1);s.unmount();
});
test('B4 capability statuses are text while read/diagnostics remain functional and failure is truthful',async()=>{
 let reads=0;const identity={actor:'A',scope:'S',environment:'E'};
 const s=screen('src/components/crew/CrewOfflinePanel.tsx',{exportName:'CrewOfflinePanel',props:{identity},modules:{'../Card':{Card:'Card'},'../Button':{Button:'Button'},'../../api/crewOfflineDevice':{inspectOfflineDevice:async()=>{reads++;throw Error('private');}},'../../offline/crewSignedSync':{},'../../api/crewOfflineJournal':{},'../../../modules/roadguard-offline-crypto':{NATIVE_ACCEPTANCE_VERIFIED:false},'../../offline/upload-queue':{sameQueueIdentity:()=>true}}});
 s.render();assert.equal(reads,0);for(const title of ['Đăng ký thiết bị','Tạo bản dữ liệu nhiệm vụ','Gửi dữ liệu đã ký']){assert.match(text(s),new RegExp(title));assert.ok(!s.nodes().some(n=>n.type==='Button'&&n.props.title===title));}
 await s.press('Kiểm tra thiết bị / đọc nhật ký');await s.flush();assert.equal(reads,1);assert.match(text(s),/Không đọc được.*dữ liệu được giữ nguyên/);assert.doesNotMatch(text(s),/private/);s.unmount();
});
