const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const {screen}=require('./helpers/roadfe-screen.cjs');
function styles(name){
 const file=`app/(crew)/${name}.tsx`,ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let init;for(const n of ast.statements)if(ts.isVariableStatement(n))for(const d of n.declarationList.declarations)if(d.name.getText()==='styles')init=d.initializer.getText();
 const t={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/design-tokens.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:t.exports,require:()=>({})});
 return vm.runInNewContext(`(${init})`,{StyleSheet:{create:x=>x},Platform:{select:x=>x.android??x.default},...t.exports});
}
function flat(s){return Object.assign({},...[s].flat(Infinity).filter(Boolean));}
test('Crew tabs grow with font size; filter and refresh controls retain 48dp targets',()=>{
 for(const name of ['tasks','sync']){const s=styles(name);assert.equal(s.segments.height,undefined);assert.ok(s.segment.minHeight>=48);assert.equal(s.segment.height,undefined);assert.equal(s.segmentLabel.flexShrink,1);}
 assert.ok(styles('tasks').modeFilter.minHeight>=48);assert.ok(styles('sync').iconBtn.width>=48);assert.ok(styles('navigation').floatingBack.width>=48);
});
test('Crew long badge/deadline rows wrap instead of forcing cards wider',()=>{
 for(const [name,rows] of [['tasks',['taskHeader','taskFooter']],['home',['taskCardHeader','taskCardFooter','footerLeftMeta']],['receiving',['rowHeader','infoRow']]])for(const row of rows)assert.equal(styles(name)[row].flexWrap,'wrap',`${name}.${row}`);
 assert.equal(styles('tasks').taskDue.flexShrink,1);assert.equal(styles('home').sectionTitle.flexShrink,1);
});
const task={id:'task',projectId:'project',status:'Submitted',task_mode:'MEASURE_ONLY',title:'Rất dài '.repeat(50),description:'Backend FIELD text',detail:{instructions:'Backend text'},coordinates:null};
const common={'../../src/components/AppHeader':{AppHeader:'AppHeader'},'../../src/components/Card':{Card:'Card'},'../../src/components/Chip':{Chip:'Chip'},'./tasks':{CrewTaskBoundary:'Boundary',crewStatusLabel:()=> 'Đã gửi hồ sơ',useCrewIdentity:()=>({})},'expo-router':{router:{back(){},replace(){}},useFocusEffect:()=>{}}};
test('Crew defect read-only screen uses branded header and retains all backend free text',()=>{
 const s=screen('app/(crew)/report-defect.tsx',{expose:'CrewReportDefectScreenContent',exportName:'CrewReportDefectScreenContent',props:{task},modules:common});s.render();
 const safe=s.nodes().find(n=>n.type==='SafeAreaScreen');assert.equal(safe.props.header.type,'AppHeader');assert.equal(safe.props.header.props.showBack,true);
 assert.ok(JSON.stringify(s.nodes()).includes(task.title));assert.ok(!s.nodes().some(n=>n.type==='TextInput'));assert.equal(s.h.calls.length,0);s.unmount();
});
test('Crew profile does not offer a working avatar update; stats remain a loaded subset',()=>{
 const s=screen('app/(crew)/profile.tsx',{modules:{...common,'../../src/components/Toast':{Toast:'Toast'},'./tasks':{useCrewInbox:()=>({enabled:false,tasks:[],query:{}})}}});s.render();
 const text=JSON.stringify(s.nodes());assert.doesNotMatch(text,/Đổi ảnh đại diện/);assert.doesNotMatch(text,/Ảnh đại diện chưa hỗ trợ cập nhật/);assert.match(text,/Không phải toàn bộ lịch sử/);assert.ok(styles('profile').footer.marginBottom<96);s.unmount();
});
test('Crew FIELD header stays outside scroll padding and measurement cards retain spacing',()=>{
 const s=screen('app/(crew)/field-review.tsx',{expose:'CrewFieldReviewScreenContent',exportName:'CrewFieldReviewScreenContent',props:{task},modules:{...common,'./tasks':{useCrewIdentity:()=>({}),TASK_MODE_CHIP:{MEASURE_ONLY:{label:'Chỉ đo kiểm'}}},'../../src/api/crewFieldDraft':{currentFieldContext:()=>null},'../../src/api/crewApi':{},'expo-crypto':{},'../../src/components/Toast':{Toast:'Toast'}}});s.render();
 const safe=s.nodes().find(n=>n.type==='SafeAreaScreen');
 const headerChildren=[safe.props.header,...[safe.props.header.props.children].flat(Infinity)].filter(Boolean);
 assert.ok(headerChildren.some(n=>n.type==='AppHeader'),'branded header remains in the fixed header slot beside the compact notice');
 assert.ok(!s.nodes().some(n=>n.type==='AppHeader'),'header is not duplicated inside the scrolling content');
 assert.ok(styles('field-review').card.gap>0);s.unmount();
});
