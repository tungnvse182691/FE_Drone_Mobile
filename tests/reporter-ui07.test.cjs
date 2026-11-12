const {test}=require('node:test'),assert=require('node:assert/strict');
const {screen}=require('./helpers/roadfe-screen.cjs');
const withHeaders=n=>!n?[]:Array.isArray(n)?n.flatMap(withHeaders):typeof n==='object'?[n,...withHeaders(n.props?.header),...withHeaders(n.props?.children)]:[];
test('UI07 four primary destinations retain photo routes as secondary form screens',()=>{
 const s=screen('app/(reporter)/_layout.tsx',{modules:{'expo-router':{Stack:'Stack',usePathname:()=>'/uploads',useRouter:()=>({push(){}})},'../../src/components/BottomNav':{BottomNav:'BottomNav'}}});s.render();
 const {tabs}=s.nodes().find(n=>n.type==='BottomNav').props;
 assert.equal(tabs.length,4);assert.deepEqual(Array.from(tabs,t=>t.label),['Trang chủ','Gửi phản ánh','Phản ánh của tôi','Tài khoản']);
 assert.ok(!tabs.some(t=>t.route==='/(reporter)/uploads'));
 const form=tabs.find(t=>t.route==='/(reporter)/report');for(const route of ['report','uploads','capture'])assert.ok(form.activeRoutes.includes('/(reporter)/'+route));s.unmount();
});
test('UI07 secondary header has an accessible 48dp back control',()=>{
 let calls=0;const s=screen('src/components/ReporterHeader.tsx',{exportName:'ReporterHeader',props:{title:'Trạng thái ảnh',onBack:()=>calls++}});s.render();
 const back=s.nodes().find(n=>n.props.testID==='reporter-header-back');assert.equal(back.props.accessibilityLabel,'Quay lại');assert.ok(back.props.style.width>=48&&back.props.style.minHeight>=48);
 back.props.onPress();assert.equal(calls,1);s.unmount();
});
for(const [file,fallback] of [['uploads','report'],['capture','report'],['report-detail','track'],['report-supplement','report-detail'],['profile','account'],['feedback','track']])for(const history of [true,false])test(`UI07 ${file} back respects history=${history} and grouped deep-link fallback`,async()=>{
 const nav=[];const s=screen('app/(reporter)/'+file+'.tsx',{modules:{
  'expo-router':{useRouter:()=>({canGoBack:()=>history,back:()=>nav.push('back'),replace:p=>nav.push(p)}),useLocalSearchParams:()=>({reportId:'fixture-report'}),useFocusEffect:()=>{}},
  '@tanstack/react-query':{useInfiniteQuery:()=>({refetch:async()=>{}}),useQuery:()=>({refetch:async()=>{}})},
  '../../src/api/authApi':{passwordSessionIdentity:()=> 'fixture-session'},
  '../../src/api/reporterApi':{reporterReportsOptions:()=>({}),reportItemsFromPages:()=>[],canShowReportPages:()=>false,getOwnReportReal:async()=>({etag:'v1',report:{id:'fixture-report',createdAt:'2026-11-12T00:00:00Z'}})},
  '../../src/components/Card':{Card:'Card'},'../../src/components/Toast':{Toast:'Toast'},'../../src/components/AnimatedPressable':{AnimatedPressable:'AnimatedPressable'}
 }});s.h.login();s.render();await s.flush();s.nodes().flatMap(withHeaders).find(n=>n.type==='ReporterHeader').props.onBack();
 if(history)assert.equal(nav[0],'back');else if(file==='report-supplement'){assert.equal(nav[0].pathname,'/(reporter)/report-detail');assert.equal(nav[0].params.reportId,'fixture-report');}else assert.equal(nav[0],'/(reporter)/'+fallback);
 assert.equal(s.h.calls.length,0);s.unmount();
});
