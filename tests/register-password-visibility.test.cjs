const {test}=require('node:test'),assert=require('node:assert/strict');
const {screen}=require('./helpers/roadfe-screen.cjs');
test('Registration password starts hidden and toggles without changing its value or dispatching',()=>{
 const s=screen('app/(auth)/register.tsx');s.render();
 const password=()=>s.nodes().find(n=>n.type==='InputField'&&n.props.label==='Mật khẩu');
 assert.equal(password().props.secureTextEntry,true);
 password().props.onChangeText('fixture-password');s.render();
 const toggle=()=>password().props.trailingAction;
 assert.equal(toggle().props.accessibilityLabel,'Hiện mật khẩu');toggle().props.onPress();s.render();
 assert.equal(password().props.secureTextEntry,false);assert.equal(password().props.value,'fixture-password');
 assert.equal(toggle().props.accessibilityLabel,'Ẩn mật khẩu');toggle().props.onPress();s.render();
 assert.equal(password().props.secureTextEntry,true);assert.equal(s.h.calls.length,0);s.unmount();
});
