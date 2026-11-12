const {test}=require('node:test'),assert=require('node:assert/strict');
const {screen}=require('./helpers/roadfe-screen.cjs');
test('UI05 supplement is grouped and explains the disabled CTA without sending',async()=>{
 const s=screen('app/(reporter)/report-supplement.tsx',{api:{getOwnReportReal:async()=>({etag:'v1',report:{id:'fixture-report',description:'Mô tả gốc',createdAt:'2026-11-12T00:00:00Z'}})}});
 s.h.login();s.render();await s.flush();
 assert.equal(s.nodes().find(n=>n.props.title==='Gửi bổ sung').props.disabled,true);
 assert.match(JSON.stringify(s.nodes().find(n=>n.props.testID==='supplement-disabled-reason')),/Nhập nội dung/);
 s.input('Nội dung bổ sung','Vị trí gần cầu');await s.flush();
 assert.match(JSON.stringify(s.nodes().find(n=>n.props.testID==='supplement-disabled-reason')),/ít nhất một ảnh/);
 const add=s.nodes().find(n=>n.props.testID==='add-photo');assert.ok(add.props.style({pressed:false})[0].minHeight>=48);
 assert.ok(s.nodes().some(n=>n.type==='KeyboardAvoidingView'));assert.equal(s.h.calls.length,0);s.unmount();
});
