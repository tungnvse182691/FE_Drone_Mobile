const {test}=require('node:test'),assert=require('node:assert/strict');
const {screen}=require('./helpers/roadfe-screen.cjs');
const malicious='</script><img src=x onerror=alert(1)>\u2028\u2029';
function map(props={}){const hits=[];const s=screen('src/components/map/RoadGuardMapLibre.tsx',{exportName:'RoadGuardMapLibre',props:{markers:[{id:"x'\"",title:malicious,label:malicious,coordinate:[106,10]}],onMarkerPress:id=>hits.push(id),...props},modules:{'react-native-webview':{WebView:'WebView'}}});s.render();return {s,hits,web:s.nodes().find(n=>n.type==='WebView').props};}
test('HARDEN map hostile text cannot terminate script or create markup',()=>{const {web}=map();assert.ok(!web.source.html.includes(malicious));assert.ok(!web.source.html.includes('setHTML('));assert.ok(!web.source.html.includes('innerHTML'));assert.ok(web.source.html.includes('textContent'));});
test('HARDEN map bridge accepts only current marker and trusted local document',()=>{const {web,hits}=map();const send=(data,url='about:blank')=>web.onMessage({nativeEvent:{data:JSON.stringify(data),url}});send({type:'MARKER_CLICK',id:'foreign'});send({type:'MARKER_CLICK',id:"x'\""},'https://evil.example');send({type:'MARKER_CLICK',id:"x'\""});assert.deepEqual(hits,["x'\""]);web.onMessage({nativeEvent:{data:'{broken',url:'about:blank'}});});
test('HARDEN map top level navigation never opens arbitrary external URLs',()=>{const {web}=map();assert.equal(typeof web.onShouldStartLoadWithRequest,'function');for(const url of ['https://evil.example','javascript:alert(1)','file:///secret','https://unpkg.com/'])assert.equal(web.onShouldStartLoadWithRequest({url,isTopFrame:true}),false);assert.equal(web.onShouldStartLoadWithRequest({url:'about:blank',isTopFrame:true}),true);});
test('HARDEN map ignores invalid coordinates and reports unavailable honest fallback',()=>{const {s,web}=map({markers:[{id:'bad',title:'bad',coordinate:[NaN,100]}]});assert.ok(!web.source.html.includes('"id":"bad"'));web.onError();s.render();assert.ok(!JSON.stringify(s.nodes()).includes('Cầu Bà Lát'));});
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
test('HARDEN installed WebView whitelist wrapper never calls Linking for rejected navigation',async()=>{
 const {web}=map(),opened=[],decisions=[];const module={exports:{}};
 const source=ts.transpileModule(fs.readFileSync('node_modules/react-native-webview/src/WebViewShared.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
 vm.runInNewContext(source,{module,exports:module.exports,console,require:n=>n==='escape-string-regexp'?require(n):n==='react-native'?{Linking:{canOpenURL:async u=>{opened.push(u);return true;},openURL:u=>opened.push(u)}}:{}});
 const handler=module.exports.createOnShouldStartLoadWithRequest((ok,url)=>decisions.push([ok,url]),web.originWhitelist,web.onShouldStartLoadWithRequest);
 for(const url of ['https://evil.example','javascript:alert(1)','file:///private','intent://app','about:blank'])handler({nativeEvent:{url,lockIdentifier:1,isTopFrame:true}});
 await new Promise(r=>setImmediate(r));assert.deepEqual(opened,[]);assert.deepEqual(decisions.map(d=>d[0]),[false,false,false,false,true]);
});
