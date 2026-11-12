const {test}=require('node:test'),assert=require('node:assert/strict');
const {screen}=require('./helpers/roadfe-screen.cjs');
test('UI03 queue shows local thumbnails, KB and one retention; only byte upload gets progress',async()=>{
 const s=screen('app/(reporter)/uploads.tsx');s.h.login();s.render();await s.flush();
 const partition=s.uploads.reporterContext().partition;
 s.uploads.useUploadsStore.setState({hydrated:true,partitionId:partition,items:['UPLOADING','VERIFYING','VERIFIED','FAILED'].map((mediaState,i)=>({id:String(i),partitionId:partition,mediaState,uriLocal:'file://qa/'+i,sizeBytes:512,partSizeBytes:512,partETags:{}}))});s.render();
 assert.equal(s.nodes().filter(n=>n.type==='Image').length,4);
 assert.equal(s.nodes().filter(n=>n.props.testID?.startsWith('uploads-progress-')).length,1);
 assert.equal(s.nodes().filter(n=>n.props.testID==='uploads-retention').length,1);
 assert.match(JSON.stringify(s.nodes()),/1 KB/);assert.equal(s.h.calls.length,0);
 await s.tap('uploads-recovery-toggle');await s.flush();assert.match(JSON.stringify(s.nodes()),/cùng thông tin tải lên/);s.unmount();
});
test('UI03 initial hydration displays informative loading without starting transfer',()=>{
 const s=screen('app/(reporter)/uploads.tsx');s.h.login();s.render();
 assert.ok(s.nodes().some(n=>n.type==='ActivityIndicator'));assert.match(JSON.stringify(s.nodes()),/vẫn được giữ/);assert.equal(s.h.calls.length,0);s.unmount();
});
