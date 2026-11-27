const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const {screen}=require('./helpers/roadfe-screen.cjs');
function styles(name,binding='styles'){
 const file=`app/(crew)/${name}.tsx`,ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let init;for(const n of ast.statements)if(ts.isVariableStatement(n))for(const d of n.declarationList.declarations)if(d.name.getText()===binding)init=d.initializer.getText();
 const t={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/design-tokens.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:t.exports,require:()=>({})});
 return vm.runInNewContext(`(${init})`,{StyleSheet:{create:x=>x},Platform:{select:x=>x.android??x.default},v2Palette:{navy:'#192D40',muted:'#5A6470',quiet:'#6E7A85'},...t.exports});
}
function flat(s){return Object.assign({},...[s].flat(Infinity).filter(Boolean));}
test('Crew tabs grow with font size; filter and refresh controls retain 48dp targets',()=>{
 const task=styles('tasks','v2');assert.equal(task.tabs.height,undefined);assert.ok(task.tab.minHeight>=48);assert.equal(task.tab.height,undefined);assert.equal(task.tab.flexShrink,1);assert.ok(task.chip.minHeight>=48);assert.ok(task.iconButton.width>=48);assert.ok(task.iconButton.height>=48);assert.ok(task.searchInput.minHeight>=48);
 const s=styles('sync');assert.ok(s.supportRow.minHeight>=48);assert.equal(s.supportRow.height,undefined);assert.equal(s.rowBody.flex,1);
 assert.ok(s.refresh.minWidth>=48);assert.ok(s.refresh.minHeight>=48);assert.equal(s.refresh.height,undefined);assert.equal(s.titleRow.flexWrap,'wrap');assert.ok(styles('navigation').floatingBack.width>=48);
});

test('Tasks retain gold segmented selection without duplicate KPI surfaces',()=>{
 const task=styles('tasks','v2');
 assert.equal(task.tabActive.backgroundColor,'#C9A227');assert.equal(task.tabTextActive.color,'#192D40');
 assert.equal(task.tabBadgeActive.backgroundColor,'#C9A227');
 assert.equal(task.tab.borderBottomWidth,undefined);assert.equal(task.tab.borderRightWidth,undefined);
 assert.equal(task.summary,undefined);assert.equal(task.summaryColumn,undefined);
 assert.ok(task.tabCount.fontVariant.includes('tabular-nums'));
});
test('Crew long badge/deadline rows wrap instead of forcing cards wider',()=>{
 for(const [name,rows] of [['home',['taskCardHeader','taskCardFooter','footerLeftMeta']],['receiving',['rowHeader','infoRow']]])for(const row of rows)assert.equal(styles(name)[row].flexWrap,'wrap',`${name}.${row}`);
 const task=styles('tasks','v2');for(const row of ['taskIdentity','taskCardHeader','taskCardFooter'])assert.equal(task[row].flexWrap,'wrap');assert.equal(task.codeText.flexShrink,1);assert.equal(task.acceptance.flexShrink,1);assert.equal(task.taskTitle.numberOfLines,undefined);assert.equal(styles('home').sectionTitle.flexShrink,1);
});

test('Tasks cards retain the approved Home typography, chip, deadline and footer dimensions',()=>{
 const task=styles('tasks','v2'),home=styles('home');
 for(const key of ['taskCardHeader','modeChip','modeChipText','dueWrap','dueText','dueTextUrgent','taskTitle','locationRow','locationText','taskCardFooter','footerLeftMeta','actionPrompt','actionPromptText'])assert.deepEqual(JSON.parse(JSON.stringify(task[key])),JSON.parse(JSON.stringify(home[key])),key);
 for(const key of ['backgroundColor','borderWidth','borderColor','borderRadius'])assert.equal(task.taskRow[key],home.taskCard[key]);
 assert.equal(task.taskBody.paddingHorizontal,home.taskCard.padding);assert.equal(task.taskRow.borderLeftWidth,2);assert.equal(task.taskRow.marginBottom,12);assert.ok(task.copyCode.minHeight>=48);
});
const task={id:'task',projectId:'project',status:'Submitted',task_mode:'MEASURE_ONLY',title:'Rất dài '.repeat(50),description:'Backend FIELD text',detail:{instructions:'Backend text'},coordinates:null};
const common={'../../src/components/AppHeader':{AppHeader:'AppHeader'},'../../src/components/Card':{Card:'Card'},'../../src/components/Chip':{Chip:'Chip'},'./tasks':{CrewTaskBoundary:'Boundary',crewStatusLabel:()=> 'Đã gửi hồ sơ',useCrewIdentity:()=>({})},'expo-router':{useRouter:()=>({back(){},replace(){}}),useFocusEffect:()=>{}}};
test('Crew defect read-only screen uses branded header and retains all backend free text',()=>{
 const s=screen('app/(crew)/report-defect.tsx',{expose:'CrewReportDefectScreenContent',exportName:'CrewReportDefectScreenContent',props:{task},modules:common});s.render();
 const safe=s.nodes().find(n=>n.type==='SafeAreaScreen');assert.equal(safe.props.header.type,'AppHeader');assert.equal(safe.props.header.props.showBack,true);
 assert.ok(JSON.stringify(s.nodes()).includes(task.title));assert.ok(!s.nodes().some(n=>n.type==='TextInput'));assert.equal(s.h.calls.length,0);s.unmount();
});
test('Crew profile does not offer a working avatar update; stats remain a loaded subset',()=>{
 const s=screen('app/(crew)/profile.tsx',{modules:{...common,'../../src/components/Toast':{Toast:'Toast'},'./tasks':{useCrewInbox:()=>({enabled:false,tasks:[],query:{}})}}});s.render();
 const text=JSON.stringify(s.nodes());assert.doesNotMatch(text,/Đổi ảnh đại diện/);assert.doesNotMatch(text,/Ảnh đại diện chưa hỗ trợ cập nhật/);assert.match(text,/không phải toàn bộ lịch sử/i);assert.ok(styles('profile').footer.marginBottom<96);s.unmount();
});
test('Crew FIELD header stays outside scroll padding and measurement cards retain spacing',()=>{
 const s=screen('app/(crew)/field-review.tsx',{expose:'CrewFieldReviewScreenContent',exportName:'CrewFieldReviewScreenContent',props:{task},modules:{...common,'./tasks':{useCrewIdentity:()=>({}),TASK_MODE_CHIP:{MEASURE_ONLY:{label:'Chỉ đo kiểm'}}},'../../src/api/crewFieldDraft':{currentFieldContext:()=>null},'../../src/api/crewApi':{},'expo-crypto':{},'../../src/components/Toast':{Toast:'Toast'}}});s.render();
 const safe=s.nodes().find(n=>n.type==='SafeAreaScreen');
 const headerChildren=[safe.props.header,...[safe.props.header.props.children].flat(Infinity)].filter(Boolean);
 assert.ok(headerChildren.some(n=>n.type==='AppHeader'),'branded header remains in the fixed header slot beside the compact notice');
 assert.ok(!s.nodes().some(n=>n.type==='AppHeader'),'header is not duplicated inside the scrolling content');
 assert.ok(styles('field-review').card.gap>0);s.unmount();
});
