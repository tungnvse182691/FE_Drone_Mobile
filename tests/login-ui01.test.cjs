const {test}=require('node:test');
const assert=require('node:assert/strict');
const {screen,deferred}=require('./helpers/roadfe-screen.cjs');
const flat=s=>Array.isArray(s)?Object.assign({},...s.filter(Boolean).map(flat)):s??{};

test('Login password visibility preserves input and conceals again before dispatch or leaving',async()=>{
 const pending=deferred();let submitted;
 const s=screen('app/(auth)/index.tsx',{login:async(...args)=>{submitted=args;return pending.promise;}});
 s.render();await s.flush();s.input('Email hoặc Số điện thoại','fixture@example.test');s.input('Mật khẩu','synthetic-only');
 const password=()=>s.nodes().find(n=>n.type==='InputField'&&n.props.label==='Mật khẩu');
 const toggle=label=>password().props.trailingAction.props.accessibilityLabel===label&&password().props.trailingAction.props.onPress();
 assert.equal(password().props.secureTextEntry,true);
 assert.equal(password().props.trailingAction.props.accessibilityRole,'button');
 toggle('Hiện mật khẩu');await s.flush();assert.equal(password().props.secureTextEntry,false);assert.equal(password().props.value,'synthetic-only');
 toggle('Ẩn mật khẩu');await s.flush();assert.equal(password().props.secureTextEntry,true);
 toggle('Hiện mật khẩu');await s.flush();s.blur();await s.flush();assert.equal(password().props.secureTextEntry,true);
 toggle('Hiện mật khẩu');await s.flush();const login=s.press('Đăng nhập');await s.flush();
 assert.equal(password().props.secureTextEntry,true);assert.deepEqual(submitted,['fixture@example.test','synthetic-only']);
 pending.resolve({});await login;await s.flush();s.unmount();
});

test('LOGIN-UI-01 retains the card and passive decoration with LOGIN-BRAND-02 prominent branding',()=>{
 const s=screen('app/(auth)/index.tsx');s.render();
 assert.equal(flat(s.nodes()[0].props.style).backgroundColor,'#F8F9FA');
 const circles=s.nodes().filter(n=>n.props.pointerEvents==='none');assert.equal(circles.length,2);
 assert.ok(circles.every(n=>flat(n.props.style).position==='absolute'));
 const heading=s.nodes().find(n=>n.type==='Text'&&n.props.accessibilityRole==='header'&&n.props.children.includes('Đăng nhập'));
 assert.ok(heading);
 const card=s.nodes().find(n=>n.props.children?.includes(heading));const style=flat(card.props.style);
 assert.equal(style.backgroundColor,'#FFFFFF');assert.equal(style.borderRadius,20);assert.ok(style.paddingHorizontal>=16&&style.paddingHorizontal<=20);
 const scroll=s.nodes().find(n=>n.type==='ScrollView');assert.equal(scroll.props.contentContainerStyle.maxWidth,440);assert.equal(scroll.props.contentContainerStyle.height,undefined);
 const logo=s.nodes().find(n=>n.type==='Image');
 assert.equal(logo.props.style.width,104);assert.equal(logo.props.style.height,104);
 const circle=s.nodes().find(n=>n.props.children?.includes(logo));
 assert.equal(flat(circle.props.style).width,120);assert.equal(flat(circle.props.style).height,120);
 const brand=s.nodes().find(n=>n.type==='Text'&&n.props.children.includes('HOÀNG HẢI'));
 assert.equal(flat(brand.props.style).fontSize,30);assert.equal(flat(brand.props.style).lineHeight,42);
 const header=s.nodes().find(n=>n.props.children?.includes(brand));
 assert.equal(flat(header.props.style).alignItems,'center');
 for(const node of [circle,logo,brand,header,card]) {
  const st=flat(node.props.style);assert.notEqual(st.position,'absolute');assert.equal(st.transform,undefined);
  for(const [key,value] of Object.entries(st))if(key.startsWith('margin')&&typeof value==='number')assert.ok(value>=0);
 }
 assert.equal(scroll.props.keyboardShouldPersistTaps,'handled');
 const email=s.nodes().find(n=>n.type==='InputField');assert.equal(email.props.autoCapitalize,'none');assert.equal(email.props.autoCorrect,false);
 const register=s.nodes().find(n=>n.props.accessibilityLabel==='Đăng ký tài khoản người phản ánh');assert.ok(flat(register.props.style).minHeight>=48);
 s.unmount();
});

test('LOGIN-UI-01 invalid recovery remains local and can close without an auth request',async()=>{
 let writes=0;const s=screen('app/(auth)/index.tsx',{modules:{'../../src/api/authApi':{requestPasswordRecoveryReal:async()=>writes++}}});s.render();
 await s.press('Quên mật khẩu?');s.render();s.input('Email khôi phục','not-an-email');await s.press('Gửi yêu cầu khôi phục');await s.flush();
 assert.equal(writes,0);assert.match(JSON.stringify(s.nodes()),/Vui lòng nhập email hợp lệ/);
 const recovery=s.nodes().find(n=>n.type==='InputField'&&n.props.label==='Email khôi phục');assert.equal(recovery.props.autoCorrect,false);
 await s.press('Đóng');s.render();assert.equal(s.nodes().find(n=>n.type==='Modal').props.visible,false);s.unmount();
});

test('LOGIN-UI-01 recovery owns an opaque screen and avoids double Android keyboard resizing',async()=>{
 const s=screen('app/(auth)/index.tsx');s.render();await s.press('Quên mật khẩu?');s.render();
 const modal=s.nodes().find(n=>n.type==='Modal');assert.notEqual(modal.props.transparent,true);
 assert.equal(modal.props.statusBarTranslucent,true);
 const descendants=n=>!n?[]:Array.isArray(n)?n.flatMap(descendants):typeof n==='object'?[n,...descendants(n.props?.children)]:[];
 assert.equal(descendants(modal).find(n=>n.type==='KeyboardAvoidingView').props.behavior,undefined);
 s.unmount();
});

for(const role of ['REPAIR_CREW','DRONE_OPERATOR'])test('LOGIN-UI-01 preserves '+role+' routing and duplicate tap protection',async()=>{
 const d=deferred();let calls=0;const s=screen('app/(auth)/index.tsx',{login:()=>{calls++;return d.promise;}});s.render();await s.flush();
 s.input('Email hoặc Số điện thoại','fixture@example.test');s.input('Mật khẩu','synthetic-only');
 const first=s.press('Đăng nhập'),second=s.press('Đăng nhập');assert.equal(calls,1);
 d.resolve({user:{id:'actor',role_code:role},accessToken:'synthetic-token'});await Promise.all([first,second]);await s.flush();
 assert.equal(s.nav[0],role==='REPAIR_CREW'?'/(crew)/home':'/(drone)/home');s.unmount();
});

for(const change of ['blur','session','environment'])test('LOGIN-UI-01 rejects late login after '+change,async()=>{
 const d=deferred();const s=screen('app/(auth)/index.tsx',{login:()=>d.promise});s.render();await s.flush();
 s.input('Email hoặc Số điện thoại','fixture@example.test');s.input('Mật khẩu','synthetic-only');const pending=s.press('Đăng nhập');
 if(change==='blur')s.blur();else if(change==='session')s.h.login();else s.h.client.defaults.baseURL='https://changed.example.test';
 d.resolve({user:{id:'late',role_code:'REPAIR_CREW'},accessToken:'synthetic-token'});await pending;await s.flush();assert.equal(s.nav.length,0);assert.notEqual(s.h.getAuth().user?.id,'late');s.unmount();
});

test('LOGIN-UI-01 errors remain visible and public routes remain explicit',async()=>{
 const s=screen('app/(auth)/index.tsx',{login:async()=>{throw{code:'auth_invalid_credentials'};}});s.render();await s.flush();
 s.input('Email hoặc Số điện thoại','fixture@example.test');s.input('Mật khẩu','synthetic-only');await s.press('Đăng nhập');await s.flush();assert.match(JSON.stringify(s.nodes()),/Sai tài khoản hoặc mật khẩu/);
 for(const label of ['Mở cổng phản ánh dân sinh','Đăng ký tài khoản người phản ánh'])s.nodes().find(n=>n.props.accessibilityLabel===label).props.onPress();
 assert.deepEqual(s.nav,['/(reporter)/home','/(auth)/register']);s.unmount();
});
