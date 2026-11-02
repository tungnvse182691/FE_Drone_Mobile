const {test}=require('node:test'),assert=require('node:assert/strict');
const {screen}=require('./helpers/roadfe-screen.cjs');
const flatten=s=>Array.isArray(s)?Object.assign({},...s.filter(Boolean).map(flatten)):s??{};

test('Reporter header keeps the logo and uses the compact typography of other screens',()=>{
 const s=screen('src/components/ReporterHeader.tsx',{exportName:'ReporterHeader',props:{title:'Gửi phản ánh'}});s.render();
 assert.ok(s.nodes().some(n=>n.type==='Image'&&n.props.accessibilityLabel==='Logo Bê tông Hoàng Hải'));
 const title=s.nodes().find(n=>n.type==='Text'&&n.props.accessibilityRole==='header');
 const brand=s.nodes().find(n=>n.type==='Text'&&JSON.stringify(n.props.children).includes('BÊ TÔNG HOÀNG HẢI'));
 assert.equal(flatten(title.props.style).fontSize,12);assert.equal(flatten(brand.props.style).fontSize,16);s.unmount();
});

test('photo remove has a small white badge inside the image with a separate 48dp touch target',async()=>{
 const s=screen('app/(reporter)/report.tsx',{pick:async()=>({canceled:false,assets:[{uri:'content://qa/photo.png',name:'photo.png',mimeType:'image/png'}]})});s.render();await s.flush();await s.tap('pick-photo');await s.flush();
 const button=s.nodes().find(n=>n.props.testID==='remove-photo-0');const target=flatten(button.props.style);
 assert.equal(target.width,48);assert.equal(target.height,48);assert.equal(target.top,0);assert.equal(target.right,0);assert.ok(!target.backgroundColor||target.backgroundColor==='transparent');
 const badge=button.props.children.find(n=>n?.type==='View');assert.ok(badge,'visible badge must be separate from the touch area');
 const style=flatten(badge.props.style);assert.equal(style.width,24);assert.equal(style.height,24);assert.equal(style.backgroundColor,'#FFFFFF');
 await s.tap('remove-photo-0');await s.flush();assert.ok(!s.nodes().some(n=>n.props.testID==='remove-photo-0'));assert.equal(s.h.calls.length,0);s.unmount();
});

for(const file of ['uploads','capture'])test(`Reporter ${file} displays an image label instead of the stored technical filename`,async()=>{
 const s=screen(`app/(reporter)/${file}.tsx`);s.h.login();s.render();await s.flush();
 const partition=s.uploads.reporterContext().partition;
 s.uploads.useUploadsStore.setState({hydrated:true,partitionId:partition,items:[{id:'qa',partitionId:partition,mediaState:'VERIFIED',fileId:'f',verifiedVersion:'v',uriLocal:'file://safe.png',fileName:'private-uuid-123.png',sizeBytes:100,partSizeBytes:5242880,partETags:{}}]});s.render();await s.flush();
 const text=s.nodes().filter(n=>n.type==='Text').map(n=>n.props.children.flat(Infinity).join('')).join(' ');
 assert.doesNotMatch(text,/private-uuid/);assert.match(text,/Ảnh 1/);s.unmount();
});

test('UX01 verified evidence chooser is opt-in, hides filenames and keeps session filtering',async()=>{
 const s=screen('app/(reporter)/report.tsx');s.h.login();s.render();await s.flush();
 const partition=s.uploads.reporterContext().partition;
 const row={id:'qa-image',partitionId:partition,mediaState:'VERIFIED',fileId:'f',verifiedVersion:'v',uriLocal:'file://safe.png',fileName:'private-uuid.png'};
 s.uploads.useUploadsStore.setState({items:[row,{...row,id:'other',partitionId:'other-session',uriLocal:'file://other.png'}]});s.render();
 assert.ok(!s.nodes().some(n=>n.props.testID==='verified-photo-0'));
 await s.tap('toggle-verified-photos');await s.flush();
 assert.ok(s.nodes().some(n=>n.props.testID==='verified-photo-0'));
 assert.doesNotMatch(JSON.stringify(s.nodes()),/private-uuid|file:\/\/other/);
 await s.press('Chọn ảnh đã xác minh 1');await s.flush();
 assert.ok(s.nodes().some(n=>n.props.testID==='remove-photo-0'));assert.equal(s.h.calls.filter(c=>c[0]==='create').length,0);s.unmount();
});

test('UX03 five navigation labels retain readable case and grow beyond the minimum height',()=>{
 const labels=['Trang chủ','Phản ánh','Ảnh','Tra cứu','Tài khoản'];
 const s=screen('src/components/BottomNav.tsx',{exportName:'BottomNav',props:{tabs:labels.map((label,i)=>({label,icon:'home',route:'/(reporter)/'+i})),activeRoute:'/(reporter)/0'},modules:{'expo-router':{router:{push(){}}}}});s.render();
 const root=s.nodes()[0],style=flatten(root.props.style);
 assert.equal(style.height,undefined);assert.ok(style.minHeight>=64);
 assert.deepEqual(s.nodes().filter(n=>n.type==='Text').map(n=>n.props.children[0]),labels);
 for(const tab of s.nodes().filter(n=>n.type==='Pressable'))assert.ok(flatten(tab.props.style).minHeight>=48);
 s.unmount();
});
test('UX03 Reporter owns the bottom safe area without changing guarded navigation',()=>{
 const s=screen('app/(reporter)/_layout.tsx',{modules:{'expo-router':{Stack:'Stack',usePathname:()=>'/home',useRouter:()=>({push(){}})},'../../src/components/BottomNav':{BottomNav:'BottomNav'}}});s.render();
 assert.ok(s.nodes().some(n=>n.type==='SafeAreaView'&&n.props.edges?.includes('bottom')));s.unmount();
});
test('UX01/02 description scrolls into the resized viewport on focus and resize; text survives',async()=>{
 const s=screen('app/(reporter)/report.tsx');s.render();await s.flush();
 const scroll=s.nodes().find(n=>n.type==='ScrollView'),calls=[];assert.ok(scroll.props.ref,'form needs a scroll target for the focused description');scroll.props.ref.current={scrollTo:o=>calls.push(o)};
 s.nodes().find(n=>n.props.testID==='description-section').props.onLayout({nativeEvent:{layout:{y:340}}});
 const field=s.nodes().find(n=>n.type==='InputField'&&n.props.label==='Mô tả hiện trạng');field.props.onFocus();
 s.input('Mô tả hiện trạng','Nứt tấm bê tông');
 s.nodes().find(n=>n.type==='ScrollView').props.onLayout();
 assert.ok(calls.length>=2);assert.ok(calls.every(c=>c.y===324));
 assert.equal(s.nodes().find(n=>n.type==='InputField').props.value,'Nứt tấm bê tông');
 assert.equal(s.nodes().find(n=>n.type==='KeyboardAvoidingView').props.behavior,'height');
 s.unmount();
});
test('UX01 photo remove has 48dp target and the form presents a concise optional location',async()=>{
 const s=screen('app/(reporter)/report.tsx',{pick:async()=>({canceled:false,assets:[{uri:'content://qa/image.jpg',name:'image.jpg',mimeType:'image/jpeg'}]})});s.render();await s.flush();await s.tap('pick-photo');await s.flush();
 const style=flatten(s.nodes().find(n=>n.props.testID==='remove-photo-0').props.style);assert.ok(style.width>=48&&style.height>=48);
 const text=JSON.stringify(s.nodes());assert.match(text,/Vị trí \(không bắt buộc\)/);assert.match(text,/1.000/);
 await s.tap('remove-photo-0');await s.flush();assert.ok(!s.nodes().some(n=>n.props.testID==='remove-photo-0'));assert.equal(s.h.calls.length,0);s.unmount();
});
test('UX05 Login begins at a scroll-safe top and uses a single short credential placeholder',()=>{
 const s=screen('app/(auth)/index.tsx');s.render();const scroll=s.nodes().find(n=>n.type==='ScrollView');assert.notEqual(flatten(scroll.props.contentContainerStyle).justifyContent,'center');
 const field=s.nodes().find(n=>n.type==='InputField'&&n.props.label==='Email hoặc Số điện thoại');assert.equal(field.props.placeholder,'Email hoặc SĐT');s.unmount();
});

test('UX05 credential input disables word correction and uses an email-capable keyboard',()=>{
 const s=screen('app/(auth)/index.tsx');s.render();const field=s.nodes().find(n=>n.type==='InputField'&&n.props.label==='Email hoặc Số điện thoại');assert.equal(field.props.autoCorrect,false);assert.equal(field.props.keyboardType,'email-address');s.unmount();
});

for(const publication of [undefined,{id:'p',report:{id:'r'}}])test('UX04 preview reserves space through download/decode, handles failure and retries '+!!publication,async()=>{
 const query={isFetching:true,isError:false,data:undefined,refetch:async()=>{query.isFetching=true;}};
 const s=screen('app/(reporter)/report-detail.tsx',{expose:'EvidencePreview',exportName:'EvidencePreview',props:{scope:'a/s1',reportId:'r',evidenceId:'e',publication},modules:{'../../src/components/Card':{Card:'Card'},'@tanstack/react-query':{useQuery:()=>query}}});
 s.render();assert.equal(s.nodes().some(n=>n.props.testID==='evidence-preview-frame'),false);
 await s.press(publication?'Xem ảnh được chia sẻ':'Xem ảnh đính kèm');await s.flush();
 const frame=s.nodes().find(n=>n.props.testID==='evidence-preview-frame');assert.ok(frame,'preview needs a stable frame while downloading');
 assert.equal(flatten(frame.props.style).height,220);
 assert.match(JSON.stringify(s.nodes()),/Đang tải ảnh/);
 query.isFetching=false;query.data='data:image/png;base64,qa';s.render();
 assert.match(JSON.stringify(s.nodes()),/Đang tải ảnh/);
 s.nodes().find(n=>n.type==='Image').props.onLoad();await s.flush();assert.doesNotMatch(JSON.stringify(s.nodes()),/Đang tải ảnh/);
 s.nodes().find(n=>n.type==='Image').props.onError();await s.flush();assert.match(JSON.stringify(s.nodes()),/Không tải được/);
 assert.equal(s.nodes().some(n=>n.type==='Image'),false);
 await s.press(publication?'Xem ảnh được chia sẻ':'Xem ảnh đính kèm');await s.flush();assert.match(JSON.stringify(s.nodes()),/Đang tải ảnh/);
 s.blur();await s.flush();assert.equal(s.nodes().some(n=>n.props.testID==='evidence-preview-frame'),false);s.unmount();
});


test('UX01 pending verification shows one actionable status and never success',async()=>{
 const s=screen('app/(reporter)/report.tsx',{pick:async()=>({canceled:false,assets:[{uri:'content://qa/image.jpg',name:'image.jpg',mimeType:'image/jpeg'}]})});
 s.h.login();s.render();await s.flush();await s.tap('pick-photo');await s.flush();s.input('Mô tả hiện trạng','QA road');
 s.reporter.useReporterStore.getState().submitPendingDraft=async()=>{throw {code:'source_not_ready'};};
 await s.press('Gửi phản ánh');await s.flush();const text=JSON.stringify(s.nodes());
 assert.match(text,/Ảnh đang chờ xác minh/);assert.doesNotMatch(text,/Ảnh cần được xác minh trước/);assert.doesNotMatch(text,/Bấm gửi lại để kiểm tra kết quả/);
 assert.equal(s.nav.length,0);s.unmount();
});
