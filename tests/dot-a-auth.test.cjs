const {test} = require('node:test');
const assert = require('node:assert/strict');
const {screen, deferred} = require('./helpers/roadfe-screen.cjs');
const title = 'Đăng ký và nhận mã xác thực';
function registration(api) {
  let nextKey = 0;
  const s = screen('app/(auth)/register.tsx', {api, modules: {
    '../../src/utils/uuid': {uuidv4: () => `synthetic-registration-${++nextKey}`},
  }});
  s.render();
  s.input('Họ và tên', 'Fixture Name'); s.input('Email', 'fixture@example.test');
  s.input('Mật khẩu', 'synthetic-value');
  return s;
}
for (const [status, code] of [[400,'validation_error'],[409,'duplicate_request'],[409,'identity_email_conflict'],
  [429,'validation_error'],[404,'not_found'],[503,'internal_error']]) {
  test(`A2 timeout then ${status}/${code} retains exact registration key and body`, async () => {
    const calls=[];
    const s=registration({registerReporterReal:async(input,key)=>{
      calls.push({input:JSON.stringify(input),key});
      if(calls.length===1) throw Error('synthetic transport timeout');
      if(calls.length===2) throw {code,response:{status}};
      return {intentId:'synthetic-intent',resendAfterSeconds:10};
    }});
    await s.flush(); await s.press(title); await s.flush();
    await s.press(title); await s.flush();
    const message = s.nodes().filter(n=>n.type==='Text').flatMap(n=>n.props.children).filter(x=>typeof x==='string').join(' ');
    await s.press(title); await s.flush();
    assert.equal(calls.length,3);
    assert.equal(calls[2].key,calls[0].key);
    assert.equal(calls[2].input,calls[0].input);
    assert.match(message,/chưa.*xác nhận|chưa rõ/i);
    assert.equal(s.nav.length,1);
    assert.equal(s.nav[0].params.intentId,'synthetic-intent');
    assert.ok(!JSON.stringify(s.nav).includes('synthetic-value'));
    s.unmount();
  });
}
for (const [status,code] of [[400,'validation_error'],[409,'identity_email_conflict']]) {
  test(`A2 first definitive ${status}/${code} permits corrected input with new key`, async () => {
    const calls=[];
    const s=registration({registerReporterReal:async(input,key)=>{
      calls.push({input:{...input},key});
      if(calls.length===1) throw {code,response:{status}};
      return {intentId:'corrected',resendAfterSeconds:0};
    }});
    await s.flush(); await s.press(title); await s.flush();
    s.input('Email','corrected@example.test'); await s.press(title); await s.flush();
    assert.equal(calls.length,2); assert.notEqual(calls[1].key,calls[0].key);
    s.unmount();
  });
}
test('A2 double tap, changed input/environment, and stale 202 cannot replace an uncertain attempt', async()=>{
  const d=deferred(), calls=[];
  const s=registration({registerReporterReal:(input,key)=>{calls.push({input,key});return d.promise;}});
  await s.flush();
  const first=s.press(title); const second=s.press(title);
  assert.equal(calls.length,1);
  s.h.login(); d.resolve({intentId:'old-session',resendAfterSeconds:0});
  await Promise.all([first,second]); await s.flush(); assert.equal(s.nav.length,0);
  s.input('Email','other@example.test'); await s.press(title); await s.flush();
  assert.equal(calls.length,1);
  s.input('Email','fixture@example.test'); s.h.client.defaults.baseURL='https://other.example.test/api/v1';
  await s.press(title); await s.flush(); assert.equal(calls.length,1);
  assert.match(JSON.stringify(s.nodes()),/chưa được xác nhận/); s.unmount();
});
