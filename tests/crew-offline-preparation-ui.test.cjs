const {test}=require('node:test'),assert=require('node:assert/strict');
const {screen,deferred}=require('./helpers/roadfe-screen.cjs');
function fixture({initialStatus='NOT_DOWNLOADED',afterStatus='READY',editorReady=true,error=null}={}){
 const pending=deferred();let calls=0,current=true,status=initialStatus,pushes=[];
 const s=screen('src/components/crew/CrewOfflinePreparation.tsx',{exportName:'CrewOfflinePreparation',props:{projectId:'project',taskId:'task'},modules:{
  'expo-router':{useFocusEffect:()=>{},useRouter:()=>({push:p=>pushes.push(p)})},
  '@expo/vector-icons':{MaterialIcons:'MaterialIcons'},
  '../Card':{Card:'Card'},'../Button':{Button:'Button'},
  '../../offline/upload-queue':{currentQueueIdentity:()=>({actor:'crew'}),sameQueueIdentity:()=>current},
  '../../api/crewOfflinePreparation':{
   inspectCrewOfflinePreparationState:async()=>({status,snapshot:status==='READY'||status==='PARTIAL'?{id:'snapshot'}:null,editorReady:status==='READY'}),
   recoverAndDownloadCrewOfflineTask:async()=>{calls++;await pending.promise;if(error)throw error;status=afterStatus;return {snapshot:{id:'snapshot'},editorReady};},
  },
 }});s.render();
 return {s,pending,calls:()=>calls,pushes:()=>pushes,button:()=>s.nodes().find(n=>n.type==='Button'),buttons:()=>s.nodes().filter(n=>n.type==='Button'),switch:()=>current=false,text:()=>JSON.stringify(s.nodes().filter(n=>n.type==='Text').map(n=>n.props.children))};
}
test('Preparation never mutates on mount, locks double tap and transitions to READY with single CTA',async()=>{
 const h=fixture();await h.s.flush();assert.equal(h.calls(),0);assert.equal(h.buttons().length,1);assert.equal(h.button().props.title,'Tải dữ liệu');
 h.button().props.onPress();h.button().props.onPress();h.s.render();assert.equal(h.calls(),1);assert.equal(h.button().props.disabled,true);assert.match(h.text(),/Đang chuẩn bị/);
 h.pending.resolve();await h.s.flush();assert.equal(h.buttons().length,1);assert.match(h.text(),/Sẵn sàng offline/);assert.equal(h.button().props.title,'Mở nhiệm vụ offline');
 h.button().props.onPress();assert.equal(h.pushes()[0].params.offline,'1');h.s.unmount();
});
test('Preparation does not claim ready when editorReady is false (PARTIAL state)',async()=>{
 const h=fixture({afterStatus:'PARTIAL',editorReady:false});await h.s.flush();h.button().props.onPress();h.pending.resolve();await h.s.flush();
 assert.match(h.text(),/Đã lưu nhưng chưa đủ dữ liệu/);assert.doesNotMatch(h.text(),/Sẵn sàng offline/);assert.equal(h.button().props.title,'Cập nhật dữ liệu');h.s.unmount();
});
test('Preparation keeps single CTA on NEEDS_CONFIRMATION without showing two buttons',async()=>{
 const h=fixture({error:Error('offline_session_recovery_required')});await h.s.flush();h.button().props.onPress();h.pending.resolve();await h.s.flush();
 assert.equal(h.buttons().length,1);assert.equal(h.button().props.title,'Kiểm tra và tiếp tục');assert.match(h.text(),/Cần xác nhận/);h.s.unmount();
});
test('Preparation native gate disables action and reports unavailable',async()=>{
 const h=fixture({initialStatus:'UNAVAILABLE'});await h.s.flush();
 assert.equal(h.button().props.disabled,true);assert.match(h.text(),/Không thể tải/);assert.equal(h.calls(),0);h.s.unmount();
});
test('Preparation suppresses stale result after account switch',async()=>{
 const h=fixture();await h.s.flush();h.button().props.onPress();h.switch();h.pending.resolve();await h.s.flush();
 assert.doesNotMatch(h.text(),/Sẵn sàng offline/);h.s.unmount();
});
