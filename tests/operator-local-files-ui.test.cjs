const {test}=require('node:test'),assert=require('node:assert/strict');
const {screen}=require('./helpers/roadfe-screen.cjs');
test('Cold file selector reuses retained bytes and selects new local copies without dispatch',async()=>{
 const selected=[];let copies=0,closed=0;
 const file={key:'saved',kind:'VIDEO',name:'flight.mp4',availability:'LOCAL_READY'};
 const s=screen('src/components/drone/OperatorLocalFiles.tsx',{exportName:'OperatorLocalFiles',props:{taskId:'task',onSelect:f=>selected.push(f)},modules:{
  '../../api/droneLocalFiles':{openLocalDroneFiles:async()=>({list:async()=>[file],rehash:async()=>file,preserve:async()=>{copies++;return{...file,key:'new'};},close:()=>closed++})},
  '../../store/auth':{useAuthStore:{subscribe:()=>()=>{}}},'expo-document-picker':{getDocumentAsync:async(options)=>{assert.equal(options.copyToCacheDirectory,false);assert.equal(options.multiple,false);return{canceled:false,assets:[{name:'flight.mp4',uri:'file:///picked'}]};}},
  '../Button':{Button:'Button'},'../../design-tokens':{typography:{},spacing:{},colors:{}}
 }});
 s.render();await s.flush();await s.tap('local-file-saved');await s.flush();assert.equal(selected[0].key,'saved');assert.equal(copies,0);
 await s.press('Thêm video MP4');await s.flush();assert.equal(selected[1].key,'new');assert.equal(copies,1);s.unmount();assert.equal(closed,1);
});

test('Retained files expose draft selection separately from availability and keep full accessible names',async()=>{
 const name='a-very-long-flight-recording-from-the-field.mp4';
 const s=screen('src/components/drone/OperatorLocalFiles.tsx',{exportName:'OperatorLocalFiles',props:{taskId:'task',selectedVideoKey:'chosen',onSelect(){}},modules:{
  '../../api/droneLocalFiles':{openLocalDroneFiles:async()=>({list:async()=>[
   {key:'chosen',kind:'VIDEO',name,availability:'LOCAL_READY',size:51449564},
   {key:'other',kind:'VIDEO',name:'other.mp4',availability:'LOCAL_READY',size:8},
  ],close(){}})},'../../store/auth':{useAuthStore:{subscribe:()=>()=>{}}},
  '../Button':{Button:'Button'},'../../design-tokens':{typography:{},spacing:{},colors:{}}
 }});
 s.render();await s.flush();
 const chosen=s.nodes().find(n=>n.props?.testID==='local-file-chosen');
 const other=s.nodes().find(n=>n.props?.testID==='local-file-other');
 assert.equal(chosen.props.accessibilityState.selected,true);
 assert.equal(other.props.accessibilityState.selected,false);
 assert.ok(chosen.props.accessibilityLabel.includes(name));
 assert.ok(s.nodes().some(n=>n.type==='Text'&&n.props.numberOfLines===1&&n.props.children.includes(name)));
 s.unmount();
});
test('Cold file picker ignores a selection completed after the account changes',async()=>{
 let changed,resolve,preserved=0;const selected=[];
 const s=screen('src/components/drone/OperatorLocalFiles.tsx',{exportName:'OperatorLocalFiles',props:{taskId:'task',onSelect:f=>selected.push(f)},modules:{
  '../../api/droneLocalFiles':{openLocalDroneFiles:async()=>({list:async()=>[],preserve:async()=>{preserved++;},close(){}})},
  '../../store/auth':{useAuthStore:{subscribe:f=>{changed=f;return()=>{};}}},
  'expo-document-picker':{getDocumentAsync:()=>new Promise(r=>resolve=r)},
  '../Button':{Button:'Button'},'../../design-tokens':{typography:{},spacing:{},colors:{}}
 }});
 s.render();await s.flush();const pending=s.press('Thêm tệp SRT');await Promise.resolve();changed();
 resolve({canceled:false,assets:[{name:'flight.srt',uri:'file:///picked'}]});await pending;await s.flush();
 assert.equal(preserved,0);assert.equal(selected.length,0);s.unmount();
});
