const {test} = require('node:test');
const assert = require('node:assert/strict');
const {screen, deferred} = require('./helpers/roadfe-screen.cjs');
test('default Login omits guest draft notice and preserves approved centered layout', async () => {
  const s=screen('app/(auth)/index.tsx'); s.render(); await s.flush();
  const nodes=s.nodes();
  assert.doesNotMatch(JSON.stringify(nodes),/không tự chuyển|Nháp khách/);
  assert.match(JSON.stringify(nodes),/Đăng nhập tác nghiệp/);
  const scroll=nodes.find(n=>n.type==='ScrollView');
  assert.equal(scroll.props.contentContainerStyle.justifyContent,'center');
  assert.equal(scroll.props.contentContainerStyle.paddingHorizontal,20);
  const image=nodes.find(n=>n.type==='Image');
  assert.equal(image.props.style.width,104);
  assert.equal(image.props.style.height,104);
  const logo=nodes.find(n=>n.type==='View'&&n.props.style?.width===120);
  assert.equal(logo.props.style.height,120);
  assert.ok(nodes.some(n=>n.type==='InputField'&&n.props.placeholder==='Nhập email @hoanghai.vn hoặc SĐT...'));
  assert.match(JSON.stringify(nodes),/Xem cổng phản ánh · Đăng nhập để gửi/);
  s.unmount();
});
test('OTP new intent resets old code and uses the new server cooldown', async () => {
  const params={intentId:'first',email:'fixture@example.test',resendAfterSeconds:'0'};
  const s=screen('app/(auth)/otp-verify.tsx',{params}); s.render(); await s.flush();
  s.nodes().find(n=>n.props?.testID==='otp-input').props.onChangeText('123456'); s.render();
  params.intentId='second'; params.resendAfterSeconds='123'; s.render(); await s.flush();
  assert.equal(s.nodes().find(n=>n.props?.testID==='otp-input').props.value,'');
  assert.ok(s.nodes().some(n=>n.props?.title==='Gửi lại mã sau 123s'));
  s.unmount();
});
test('OTP rate limit gives a cooldown and does not claim wrong OTP', async () => {
  const s=screen('app/(auth)/otp-verify.tsx',{api:{resendReporterOtpReal:async()=>{throw{status:429,code:'validation_error',response:{status:429,headers:{'retry-after':'90'}}};}}});
  s.render(); await s.flush(); await s.press('Gửi lại mã xác thực'); await s.flush();
  assert.ok(s.nodes().some(n=>n.props?.title==='Gửi lại mã sau 90s'));
  assert.match(JSON.stringify(s.nodes()),/quá nhiều yêu cầu/); s.unmount();
});
test('registration ignores late reply even if auth returns to its initial snapshot', async () => {
  const d=deferred(); const s=screen('app/(auth)/register.tsx',{modules:{'../../src/utils/uuid':{uuidv4:()=> 'fixture-key'}},api:{registerReporterReal:()=>d.promise}});
  s.render(); await s.flush(); const initial={...s.h.getAuth()};
  s.input('Họ và tên','Fixture Name'); s.input('Email','fixture@example.test'); s.input('Mật khẩu','synthetic-value');
  const pending=s.press('Đăng ký và nhận mã xác thực');
  s.h.login(); s.h.changeAuth(initial);
  d.resolve({intentId:'late',resendAfterSeconds:0}); await pending; await s.flush();
  assert.equal(s.nav.length,0); s.unmount();
});
