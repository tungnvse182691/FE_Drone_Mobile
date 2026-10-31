const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const {screen,deferred}=require('./helpers/roadfe-screen.cjs');
function functions(file,names,context={}){const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const code=names.map(name=>source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name).getText().replace(/^export /,'')).join('\n');return vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+';({'+names.join(',')+'})',context);}
test('B1 camera footer stays at bottom inside safe area and close is 48dp',async()=>{
 const s=screen('app/(reporter)/report.tsx',{expose:'styles'});s.render();await s.flush();
 const footer=s.nodes().find(n=>n.props?.testID==='camera-controls');assert.ok(footer);assert.equal(footer.type,'SafeAreaView');
 const shutter=s.nodes().find(n=>n.props?.testID==='camera-shutter');assert.equal(shutter.props.disabled,true);
 const close=s.nodes().find(n=>n.props?.accessibilityLabel==='Đóng camera');assert.ok(close.props.style.width>=48);close.props.onPress();
 const bottom=s.nodes().find(n=>n.props?.testID==='camera-footer');assert.equal(bottom.props.style.marginTop,'auto');s.unmount();
});
test('B1 capture serializes double tap and retains one local photo without POST',async()=>{
 const s=screen('app/(reporter)/report.tsx');s.render();await s.flush();const d=deferred();let calls=0;
 const camera=s.nodes().find(n=>n.type==='CameraView');camera.props.ref.current={takePictureAsync:()=>{calls++;return d.promise;}};camera.props.onCameraReady();s.render();
 const tap=s.nodes().find(n=>n.props?.testID==='camera-shutter').props.onPress;const a=tap(),b=tap();assert.equal(calls,1);d.resolve({uri:'sandbox-camera.jpg'});await Promise.all([a,b]);await s.flush();
 assert.equal(s.nodes().filter(n=>n.type==='Image'&&n.props.source?.uri?.includes('/documents/reporter-photos-v1/')).length,1);assert.equal(s.h.calls.length,0);s.unmount();
});
