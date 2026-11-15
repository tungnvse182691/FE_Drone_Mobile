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
 s.render();await s.flush();await s.press('Dùng video: flight.mp4');await s.flush();assert.equal(selected[0].key,'saved');assert.equal(copies,0);
 await s.press('Thêm video MP4');await s.flush();assert.equal(selected[1].key,'new');assert.equal(copies,1);s.unmount();assert.equal(closed,1);
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
