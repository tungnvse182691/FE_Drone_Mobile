const {test}=require('node:test');
const assert=require('node:assert/strict');
const {screen}=require('./helpers/roadfe-screen.cjs');
const fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');

test('Crew completion summary shows actual units and distinguishes local verified media from server acceptance',()=>{
 const file='app/(crew)/wo-detail.tsx';
 const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const fn=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='RepairFieldSummary');assert.ok(fn);
 const code=ts.transpileModule(fn.getText().replace(/^export /,''),{compilerOptions:{jsx:ts.JsxEmit.React}}).outputText;
 const render=vm.runInNewContext(code+';RepairFieldSummary',{React:{createElement:(type,props,...children)=>({type,props,children})},Card:'Card',View:'View',Text:'Text',typography:{},styles:{},spacing:{}});
 const draft={measurements:[{sampleId:'m1',dimension:'AREA',type:'Area',value:2.5,state:'KNOWN',unit:'m²'},{sampleId:'m2',dimension:'DEPTH',value:null,state:'UNKNOWN',unit:'cm',unknownReason:'Chưa đo'}],captures:[{purpose:'BEFORE',verified:true,upload:{fileId:'f1'}},{purpose:'AFTER',verified:false,upload:{fileId:'f2'}}]};
 const output=JSON.stringify(render({draft}));assert.match(output,/2.5/);assert.match(output,/m²/);assert.match(output,/Chưa đo/);assert.match(output,/Trước sửa: 1/);assert.match(output,/Sau sửa: 0/);assert.match(output,/chưa thay cho hồ sơ được máy chủ tiếp nhận/i);assert.doesNotMatch(output,/Image|PM đã duyệt|100%/);
 assert.match(JSON.stringify(render({draft:null})),/Chưa có số đo/);
});

test('Supplement camera places shutter at bottom inside safe area with accessible close target',async()=>{
 const s=screen('app/(reporter)/report-supplement.tsx',{api:{getOwnReportReal:async()=>({report:{id:'fixture-report',evidence:[]},etag:'"v1"'})}});
 s.h.login();s.render();await s.flush();
 const controls=s.nodes().find(n=>n.props?.testID==='camera-controls');assert.ok(controls);assert.equal(controls.type,'SafeAreaView');
 assert.deepEqual(Array.from(controls.props.edges),['top','bottom']);
 const footer=s.nodes().find(n=>n.props?.testID==='camera-footer');assert.equal(footer.props.style.marginTop,'auto');
 const close=s.nodes().find(n=>n.props?.accessibilityLabel==='Đóng camera');assert.ok(close.props.style.width>=48);assert.ok(close.props.style.height>=48);
 assert.equal(s.h.calls.length,0);s.unmount();
});

test('Recovery retains Login card and offers scroll/keyboard handling for every action',async()=>{
 const s=screen('app/(auth)/index.tsx');s.render();await s.press('Quên mật khẩu?');s.render();
 const modal=s.nodes().find(n=>n.type==='Modal'&&n.props.visible);
 const descendants=n=>!n?[]:Array.isArray(n)?n.flatMap(descendants):typeof n==='object'?[n,...descendants(n.props?.children)]:[];
 const nodes=descendants(modal);assert.ok(nodes.some(n=>n.type==='KeyboardAvoidingView'));
 const scroll=nodes.find(n=>n.type==='ScrollView');assert.ok(scroll);assert.equal(scroll.props.keyboardShouldPersistTaps,'handled');
 assert.ok(scroll.props.contentContainerStyle.paddingHorizontal>=16);
 const close=nodes.find(n=>n.type==='Button'&&n.props.title==='Đóng');close.props.onPress();s.render();assert.equal(s.nodes().find(n=>n.type==='Modal').props.visible,false);s.unmount();
});
