const {test}=require('node:test'),assert=require('node:assert/strict');
const {screen}=require('./helpers/roadfe-screen.cjs');
const text=s=>s.nodes().filter(n=>n.type==='Text').map(n=>JSON.stringify(n.props.children)).join(' ');
test('UI06 account keeps security actions and profile route without employee-only identity',async()=>{
 const s=screen('app/(reporter)/account.tsx');s.h.login();s.render();await s.flush();
 assert.doesNotMatch(text(s),/Mã nhân sự|Không áp dụng|Tài khoản người dân phản ánh/);
 assert.match(text(s),/Người dân phản ánh/);
 assert.ok(s.nodes().some(n=>n.props.title==='Đổi mật khẩu'));
 assert.ok(s.nodes().some(n=>n.props.title==='Gửi yêu cầu khôi phục'));
 s.press('Xem hồ sơ phản ánh');assert.equal(s.nav.at(-1),'/(reporter)/profile');
 assert.equal(s.h.calls.length,0);s.unmount();
});
test('UI06 profile reports loaded-page statistics and offers no fabricated progress or support',async()=>{
 const reports={data:{pages:[{items:[{evidence:[{}],supplements:[]}]}]},isError:false,isFetching:false,refetch:async()=>{},hasNextPage:false};
 const s=screen('app/(reporter)/profile.tsx',{modules:{
  '@tanstack/react-query':{useInfiniteQuery:()=>reports,useQuery:()=>({data:{displayName:'Resident',email:'resident@example.test',status:'ACTIVE'},refetch:async()=>{}})},
  '../../src/api/authApi':{passwordSessionIdentity:()=> 'fixture-session'},
  '../../src/api/reporterApi':{reporterReportsOptions:()=>({}),reportItemsFromPages:p=>p?.flatMap(p=>p.items)??[],canShowReportPages:()=>true},
  '../../src/components/Card':{Card:'Card'},'../../src/components/Toast':{Toast:'Toast'},'../../src/components/AnimatedPressable':{AnimatedPressable:'AnimatedPressable'}
 }});
 s.h.login();s.render();await s.flush();
 assert.match(text(s),/không phải tổng toàn bộ lịch sử/);assert.match(text(s),/Phản ánh của tôi/);
 assert.doesNotMatch(text(s),/Tra cứu tiến độ|Hỗ trợ phản ánh|chưa có thông tin liên hệ/i);
 assert.ok(s.nodes().some(n=>n.props.title==='Làm mới hồ sơ'));assert.equal(s.h.calls.length,0);s.unmount();
});
