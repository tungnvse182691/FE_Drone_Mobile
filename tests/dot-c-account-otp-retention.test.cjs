const test=require('node:test'),assert=require('node:assert/strict');
const {screen}=require('./helpers/roadfe-screen.cjs');
const text=s=>JSON.stringify(s.nodes());
const account=()=>{let requests=0;const s=screen('app/(reporter)/account.tsx',{modules:{'../../src/api/authApi':{requestPasswordRecoveryReal:async()=>{requests++;}}}});return {s,get requests(){return requests;}};};
for(const state of ['guest','restored','expired','crew','forced'])test('C2 account hides private identity and security actions for '+state,async()=>{
 const f=account(),s=f.s;
 if(state!=='guest')s.h.changeAuth({status:state==='expired'?'SIGNED_OUT':'AUTHENTICATED',token:state==='restored'?null:s.h.jwt('actor'),user:{id:'actor',full_name:'PRIVATE_IDENTITY',phone_or_email:'private@example.test',role_code:state==='crew'?'REPAIR_CREW':'REPORTER',must_change_password:state==='forced'}});
 s.render();await s.flush();
 for(const title of ['Đổi mật khẩu','Gửi yêu cầu khôi phục','Đăng xuất','Xem hồ sơ phản ánh'])assert.ok(!s.nodes().some(n=>n.props.title===title),title);
 assert.doesNotMatch(text(s),/PRIVATE_IDENTITY|private@example.test/);
 assert.ok(s.nodes().some(n=>n.props.title==='Đăng nhập'));assert.ok(s.nodes().some(n=>n.props.title==='Đăng ký'));
 await s.press('Đăng nhập');await s.press('Đăng ký');assert.deepEqual(s.nav,['/(auth)','/(auth)/register']);
 assert.equal(f.requests,0);assert.equal(s.h.calls.length,0);s.unmount();
});
test('C2 Reporter keeps security actions and stale recovery handler cannot run after logout',async()=>{
 const f=account(),s=f.s;s.h.login();s.render();
 s.input('Khôi phục mật khẩu qua email','fixture@example.test');
 const recover=s.nodes().find(n=>n.props.title==='Gửi yêu cầu khôi phục').props.onPress;
 assert.ok(s.nodes().some(n=>n.props.title==='Đăng xuất'));await recover();await s.flush();assert.equal(f.requests,1);
 s.h.logout();await recover();s.render();assert.equal(f.requests,1);assert.ok(!s.nodes().some(n=>n.props.title==='Đổi mật khẩu'));s.unmount();
});
// No safe guest-only boolean metadata reader exists. C3 uses the explicitly
// permitted fallback: omit the notice, never restore/read draft payload on OTP.
for(const scenario of ['none','guest-memory','foreign','other-environment','retired'])test('C3 OTP omits unproven guest notice without reading draft payload: '+scenario,async()=>{
 const s=screen('app/(auth)/otp-verify.tsx');let reads=0;
 s.reporter.useReporterStore.setState({restorePendingDraft:async()=>{reads++;throw Error('unexpected payload read');},pendingDraft:scenario==='none'?null:{ownerId:scenario==='foreign'?'other':null,provenance:{environment:scenario==='other-environment'?'other-env':'fixture-env',session:null},retired:scenario==='retired',description:'PRIVATE_DRAFT',photos:[]}});
 const before=JSON.stringify([...s.h.rows]);s.render();await s.flush();
 assert.ok(!s.nodes().some(n=>n.props.testID==='otp-guest-draft-notice'));
 assert.doesNotMatch(text(s),/PRIVATE_DRAFT/);assert.equal(reads,0);assert.equal(JSON.stringify([...s.h.rows]),before);assert.equal(s.h.calls.length,0);s.unmount();
});
for(const page of ['capture','uploads'])test('C5 '+page+' retains media with no delete affordance or remove callback',async()=>{
 const s=screen(`app/(reporter)/${page}.tsx`);s.h.login();const q=s.uploads.useUploadsStore;
 await q.getState().hydrate();const id=await q.getState().enqueuePhoto({uriLocal:'file://fixture.jpg',fileName:'fixture.jpg',mediaType:'image/jpeg',sizeBytes:3,checksumSha256:'fixture-checksum'});
 let removals=0;q.setState({removeItem:async()=>{removals++;throw Error('delete forbidden');}});
 const before=JSON.stringify([...s.h.rows]);s.render();await s.flush();
 assert.ok(!s.nodes().some(n=>n.props.testID===`${page}-remove-${id}`));
 assert.ok(!s.nodes().some(n=>/Xoá ảnh|Xóa ảnh/.test(n.props.accessibilityLabel??'')));
 assert.match(text(s),/khôi phục, xác minh và đối soát/);assert.equal(removals,0);assert.equal(JSON.stringify([...s.h.rows]),before);assert.equal(s.h.calls.length,0);s.unmount();
});
