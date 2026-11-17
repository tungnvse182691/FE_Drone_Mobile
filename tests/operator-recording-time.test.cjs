const {test}=require('node:test'),assert=require('node:assert/strict');
const {screen}=require('./helpers/roadfe-screen.cjs');
function picker(os='ios',value='2026-11-14 08:30') {
 const changes=[],props={value,onChangeText:v=>changes.push(v)};
 const s=screen('src/components/drone/RecordingDateTimeField.tsx',{exportName:'RecordingDateTimeField',props,
  moduleFactories:{'react-native':({modules})=>({...modules['react-native'],Platform:{OS:os}})},
  modules:{'@react-native-community/datetimepicker':{__esModule:true,default:'DateTimePicker'}}});
 s.render();return {s,props,changes,native:()=>s.nodes().find(n=>n.type==='DateTimePicker')};
}
test('iOS calendar and time wheel stage changes until confirmed; cancel preserves original',async()=>{
 const {s,changes,native}=picker();await s.tap('recording-date');s.render();
 assert.equal(native().props.display,'inline');native().props.onValueChange({},new Date(2026,10,18));s.render();
 assert.deepEqual(changes,[]);await s.tap('recording-confirm');assert.deepEqual(changes,['2026-11-18 08:30']);
 s.render();await s.tap('recording-time');s.render();assert.equal(native().props.display,'spinner');
 native().props.onValueChange({},new Date(2026,0,1,16,45));s.render();await s.tap('recording-cancel');
 assert.equal(changes.length,1);s.render();assert.equal(native(),undefined);s.unmount();
});
test('Android time selection preserves local date and dismissal makes no change',async()=>{
 const {s,changes,native}=picker('android');await s.tap('recording-time');s.render();
 native().props.onDismiss();s.render();assert.deepEqual(changes,[]);
 await s.tap('recording-time');s.render();native().props.onValueChange({},new Date(2026,0,1,0,5));
 assert.deepEqual(changes,['2026-11-14 00:05']);s.unmount();
});
test('disabling an open picker prevents late confirmation',async()=>{
 const {s,props,changes,native}=picker();await s.tap('recording-date');s.render();const late=native().props.onValueChange;props.disabled=true;s.render();
 late({},new Date(2026,10,19));assert.equal(s.nodes().find(n=>n.type==='DateTimePicker'),undefined);assert.deepEqual(changes,[]);s.unmount();
});
test('confirmed wheel time keeps the selected day and an unmounted picker cannot change a draft',async()=>{
 const {s,changes,native}=picker();await s.tap('recording-time');s.render();
 native().props.onValueChange({},new Date(2026,0,1,23,59));s.render();await s.tap('recording-confirm');
 assert.deepEqual(changes,['2026-11-14 23:59']);s.render();await s.tap('recording-date');s.render();
 const late=native().props.onValueChange;s.unmount();late({},new Date(2026,11,1));assert.equal(changes.length,1);
});
