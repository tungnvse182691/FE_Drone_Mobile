const {test}=require('node:test'),assert=require('node:assert/strict');
const {screen}=require('./helpers/roadfe-screen.cjs');

function fixture(){
 let disposed=0,downloads=0,background,scope='owner';const subscribers=new Set();
 const lease={videoUri:'file:///private/preview/video.mp4',dispose:async()=>{disposed++;}};
 const auth=()=>null;auth.subscribe=fn=>{subscribers.add(fn);return()=>subscribers.delete(fn);};
 const ui=screen('src/components/drone/OperatorSubmittedVideos.tsx',{exportName:'SubmittedVideos',expose:'SubmittedVideos',props:{scope:'owner',taskId:'task',projectId:'project'},modules:{
  'react-native':{Text:'Text',View:'View',Modal:'Modal',Pressable:'Pressable',StyleSheet:{create:s=>s},Platform:{OS:'android'},AppState:{addEventListener:(_,fn)=>{background=fn;return{remove(){}};}}},
  './VideoPreview':{VideoPreview:'VideoPreview'},'../Button':{Button:'Button'},'../Card':{Card:'Card'},
  'react-native-safe-area-context':{SafeAreaProvider:'SafeAreaProvider',SafeAreaView:'SafeAreaView'},
  '../../store/auth':{useAuthStore:auth},'../../api/droneDatasetWorkflow':{operatorDatasetScope:()=>scope},
  '../../api/operatorVideoCache':{downloadOperatorVideo:async(...args)=>{downloads++;assert.deepEqual(args.slice(0,5),['owner','task','project','dataset','video']);return lease;}},
  '../../api/operatorVideoReadback':{operatorVideoError:()=> 'SAFE ERROR',listOperatorVideos:async()=>({items:[{id:'dataset',versionNo:1}],nextCursor:null}),readOperatorVideos:async()=>({videos:[{fileId:'video',sizeBytes:1048576}],dataset:{telemetryStatus:'MISSING'}})},
 }});
 ui.render();
 return {...ui,disposed:()=>disposed,downloads:()=>downloads,background:()=>background('background'),invalidate:()=>{scope='other';subscribers.forEach(fn=>fn());}};
}
async function open(ui){ui.press('Xem video đã gửi');await ui.flush();ui.press('Lần nộp 1');await ui.flush();ui.press('Mở video 1 · 1.0 MB');await ui.flush();}
test('authorized preview opens a dedicated full-screen viewer; Android Back closes only viewer',async()=>{
 const ui=fixture();try{
  await open(ui);assert.equal(ui.downloads(),1);
  const modal=ui.nodes().find(n=>n.type==='Modal');assert.ok(modal);assert.equal(modal.props.visible,true);assert.equal(modal.props.presentationStyle,'fullScreen');
  const safeRoot=ui.nodes().find(n=>n.type==='SafeAreaProvider');assert.ok(safeRoot,'native Modal needs its own safe-area measurement root');
  assert.match(JSON.stringify(safeRoot.props.children),/SafeAreaView/);
  assert.ok(ui.nodes().some(n=>n.type==='Text'&&JSON.stringify(n.props.children).includes('Phóng to')),'expansion action must have a visible label outside native player controls');
  const player=ui.nodes().filter(n=>n.type==='VideoPreview');assert.equal(player.length,1);assert.equal(player[0].props.expanded,true);assert.equal(player[0].props.immersive,false);
  assert.ok(ui.nodes().some(n=>n.props.accessibilityLabel==='Đóng video, quay lại chi tiết nhiệm vụ'));
  assert.match(JSON.stringify(ui.nodes()),/Video 1 · 1.0 MB/);
  ui.nodes().find(n=>n.props.accessibilityLabel==='Xem toàn màn hình').props.onPress();await ui.flush();
  assert.equal(ui.nodes().find(n=>n.type==='VideoPreview').props.immersive,true);assert.equal(ui.downloads(),1);assert.equal(ui.disposed(),0);
  ui.nodes().find(n=>n.props.accessibilityLabel==='Thoát toàn màn hình').props.onPress();await ui.flush();
  assert.equal(ui.nodes().find(n=>n.type==='VideoPreview').props.immersive,false);
  modal.props.onRequestClose();await ui.flush();assert.equal(ui.disposed(),1);assert.ok(!ui.nodes().some(n=>n.type==='Modal'));
  assert.ok(ui.nodes().some(n=>n.props.title==='Mở video 1 · 1.0 MB'));assert.equal(ui.nav.length,0);
 }finally{ui.unmount();await new Promise(resolve=>setImmediate(resolve));}
});
for(const close of ['header','blur','background','invalidate'])test('viewer closes and disposes authorized lease on '+close,async()=>{
 const ui=fixture();try{
  await open(ui);
  if(close==='header')ui.nodes().find(n=>n.props.accessibilityLabel==='Đóng video, quay lại chi tiết nhiệm vụ').props.onPress();
  else ui[close]();
  await ui.flush();assert.equal(ui.disposed(),1);assert.ok(!ui.nodes().some(n=>n.type==='Modal'));
 }finally{ui.unmount();await new Promise(resolve=>setImmediate(resolve));}
});
