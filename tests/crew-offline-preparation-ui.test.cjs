const {test}=require('node:test'),assert=require('node:assert/strict');
const {screen,deferred}=require('./helpers/roadfe-screen.cjs');
function fixture({blocked=false,editorReady=true,error=null}={}){
 const pending=deferred();let calls=0,reconciles=0,current=true;
 const s=screen('src/components/crew/CrewOfflinePreparation.tsx',{exportName:'CrewOfflinePreparation',props:{projectId:'project',taskId:'task'},modules:{
 '../Card':{Card:'Card'},'../Button':{Button:'Button'},
 '../../offline/upload-queue':{currentQueueIdentity:()=>({actor:'crew'}),sameQueueIdentity:()=>current},
 '../../api/crewOfflineWorkflow':{requireOfflineNativeAcceptance:()=>{if(blocked)throw Error('BLOCKED_NATIVE');}},
 '../../api/crewOfflinePreparation':{
   downloadCrewOfflineTaskDetailed:async()=>{calls++;await pending.promise;if(error)throw error;return {snapshot:{id:'snapshot'},editorReady};},
   reconcileDeviceSessionForProject:async()=>{reconciles++;return {id:'registration'};},
 },
 }});s.render();
 return {s,pending,calls:()=>calls,reconciles:()=>reconciles,switch:()=>current=false,button:()=>s.nodes().find(n=>n.type==='Button'),buttons:()=>s.nodes().filter(n=>n.type==='Button'),text:()=>JSON.stringify(s.nodes().filter(n=>n.type==='Text').map(n=>n.props.children))};
}
test('Preparation never mutates on mount, locks double tap and reports only confirmed download',async()=>{
 const h=fixture();assert.equal(h.calls(),0);h.button().props.onPress();h.button().props.onPress();h.s.render();assert.equal(h.calls(),1);assert.equal(h.button().props.disabled,true);assert.doesNotMatch(h.text(),/Đã lưu/);
 h.pending.resolve();await h.s.flush();assert.match(h.text(),/Đã lưu dữ liệu/);assert.equal(h.button().props.disabled,false);h.s.unmount();
});
test('Preparation does not claim editor ready when editorReady is false',async()=>{
 const h=fixture({editorReady:false});h.button().props.onPress();h.pending.resolve();await h.s.flush();
 assert.match(h.text(),/chưa tải đủ thông tin chi tiết/);assert.doesNotMatch(h.text(),/nguồn biểu mẫu đo kiểm/);h.s.unmount();
});
test('Preparation exposes explicit device session reconcile CTA only on session recovery error',async()=>{
 const h=fixture({error:Error('offline_session_recovery_required')});h.button().props.onPress();h.pending.resolve();await h.s.flush();
 assert.match(h.text(),/phiên đăng nhập trước/);assert.equal(h.buttons().length,2);h.s.unmount();
});
test('Preparation native gate disables action and retains drafts message',()=>{const h=fixture({blocked:true});assert.equal(h.button().props.disabled,true);assert.match(h.text(),/Nháp hiện có vẫn được giữ/);assert.equal(h.calls(),0);h.s.unmount();});
test('Preparation suppresses stale result after account switch',async()=>{const h=fixture();h.button().props.onPress();h.switch();h.pending.resolve();await h.s.flush();assert.doesNotMatch(h.text(),/Đã lưu dữ liệu/);h.s.unmount();});
