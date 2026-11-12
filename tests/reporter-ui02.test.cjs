const {test}=require('node:test'),assert=require('node:assert/strict');
const {screen}=require('./helpers/roadfe-screen.cjs');
const text=s=>s.nodes().filter(n=>n.type==='Text').map(n=>n.props.children.flat(Infinity).join('')).join(' ');
test('UI02 form exposes secondary photo status without starting an upload',async()=>{
 const s=screen('app/(reporter)/report.tsx');s.h.login();s.render();await s.flush();
 await s.tap('open-photo-status');assert.equal(s.nav.at(-1),'/(reporter)/uploads');assert.equal(s.h.calls.length,0);s.unmount();
});
test('UI02 selected local photo has one honest state and removing it does not delete ledger',async()=>{
 const s=screen('app/(reporter)/report.tsx',{pick:async()=>({canceled:false,assets:[{uri:'content://qa/image.jpg',name:'image.jpg',mimeType:'image/jpeg'}]})});
 s.h.login();s.render();await s.flush();await s.tap('pick-photo');await s.flush();
 assert.match(text(s),/Chưa tải lên/);assert.doesNotMatch(text(s),/Đã xác minh/);
 await s.tap('remove-photo-0');await s.flush();assert.equal(s.h.calls.length,0);s.unmount();
});

test('UI02 Reporter button uses dark text on gold, wraps and blocks duplicate press while busy',()=>{
 const s=screen('src/components/reporter/Button.tsx',{exportName:'Button',props:{variant:'primary',title:'Gửi phản ánh',loading:true,onPress(){}}});s.render();
 const flatten=v=>Array.isArray(v)?Object.assign({},...v.filter(Boolean).map(flatten)):v??{};
 const button=s.nodes().find(n=>n.type==='Pressable');assert.equal(button.props.disabled,true);
 assert.equal(flatten(button.props.style({pressed:false})).backgroundColor,'#C9A227');
 const label=s.nodes().find(n=>n.type==='Text');assert.equal(flatten(label.props.style).color,'#1A1D20');assert.equal(flatten(label.props.style).flexShrink,1);s.unmount();
});

test('UI02 a separate upload does not lock a fresh description and VERIFYING is not VERIFIED',async()=>{
 const s=screen('app/(reporter)/report.tsx',{pick:async()=>({canceled:false,assets:[{uri:'content://qa/upload.jpg',name:'upload.jpg',mimeType:'image/jpeg'}]})});
 s.h.login();s.render();await s.flush();await s.tap('pick-photo');await s.flush();
 const uri=s.nodes().find(n=>n.type==='Image'&&n.props.accessibilityLabel==='Ảnh hiện trường 1').props.source.uri;
 s.uploads.useUploadsStore.setState({items:[{id:'external',partitionId:s.uploads.reporterContext().partition,uriLocal:uri,mediaState:'VERIFYING'}]});s.render();
 assert.equal(s.nodes().find(n=>n.props.testID==='description-section').props.pointerEvents,'auto');
 s.input('Mô tả hiện trạng','Nứt tấm bê tông');assert.match(text(s),/xác minh/);assert.doesNotMatch(text(s),/Đã xác minh/);
 assert.equal(s.nodes().find(n=>n.type==='InputField').props.value,'Nứt tấm bê tông');s.unmount();
});
