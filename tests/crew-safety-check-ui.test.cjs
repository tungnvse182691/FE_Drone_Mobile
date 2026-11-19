const {test}=require('node:test'),assert=require('node:assert/strict');
const {screen,deferred}=require('./helpers/roadfe-screen.cjs');
// Isolated shipped-handler harness, not native evidence or a real safety send.
function fixture(options={}){
 const identity={actor:'crew',scope:'session',environment:'test'},resource={measureId:'measure',projectId:'project'};
 let records=options.records??[],closed=0,saved=0,prepared=0,dispatched=0;
 const command={kind:'check',result:'Safe',findings:'Barriers intact',evidenceIds:['link']};
 const record={identity,phase:'UNKNOWN_OUTCOME',proof:{kind:'safety',resource,command}};
 const s=screen('src/components/crew/CrewSafetyCheck.tsx',{exportName:'CrewSafetyCheck',props:{identity,resource,taskId:'task',onClose:()=>closed++,onSaved:()=>saved++},modules:{
  '../Button':{Button:'Button'},'../InputField':{InputField:'InputField'},
  '../../api/crewSafetyWorkflow':{crewReadGuard(){},readSafetyMeasure:async()=>{if(options.read)await options.read.promise;if(options.error)throw Error('offline');return {data:{installedAt:options.uninstalled?null:'installed',eligibleEvidenceLinks:options.empty?[]:[{fileId:'file',evidenceLinkId:'link'}]}};}},
  '../../api/crewOfflineJournal':{openOfflineJournal:async()=>({list:async()=>records,transition:async(r,phase)=>({...r,phase})})},
  '../../api/crewSafetyDraft':{prepareSafetyIntent:async()=>{prepared++;return record;},dispatchSafetyIntent:async r=>{dispatched++;return {...r,phase:'RECEIVED'};},reconcileSafetyIntent:async()=>{if(options.receipt)await options.receipt.promise;}},
  '../../offline/upload-queue':{sameQueueIdentity:(a,b)=>!b||a.actor===b.actor},
  '../../api/crewApi':{},'../../utils/base64':{},
 }});
 s.render();
 return {s,record,setRecords:r=>records=r,counts:()=>({closed,saved,prepared,dispatched}),text:()=>s.nodes().filter(n=>n.type==='Text').map(n=>JSON.stringify(n.props.children)).join(' '),button:t=>s.nodes().find(n=>n.type==='Button'&&n.props.title===t)};
}
test('Safety loading explains read and retains busy close/send guards',async()=>{
 const read=deferred(),h=fixture({read});await h.s.flush();
 assert.match(h.text(),/Đang tải trạng thái kiểm tra/);
 assert.equal(h.button('Đóng').props.disabled,true);assert.equal(h.button('Gửi kiểm tra').props.loading,true);
 read.resolve();await h.s.flush();assert.equal(h.button('Đóng').props.disabled,false);h.s.unmount();
});
test('Safety initial result and evidence selection retain shipped handlers',async()=>{
 const h=fixture();await h.s.flush();
 const radio=h.s.nodes().find(n=>n.props.accessibilityRole==='radio');radio.props.onPress();h.s.render();
 assert.equal(h.s.nodes().find(n=>n.props.accessibilityRole==='radio').props.accessibilityState.checked,true);
 h.s.nodes().find(n=>n.props.accessibilityRole==='checkbox').props.onPress();h.s.render();assert.match(h.text(),/Ảnh kiểm tra · .*1/);
 h.s.nodes().find(n=>n.props.accessibilityRole==='checkbox').props.onPress();h.s.render();
 assert.equal(h.s.nodes().find(n=>n.props.accessibilityRole==='checkbox').props.accessibilityState.checked,false);
 assert.deepEqual(h.counts(),{closed:0,saved:0,prepared:0,dispatched:0});h.s.unmount();
});
for(const options of [{uninstalled:true},{error:true},{empty:true}])test('Safety unavailable input keeps reason and disabled send '+JSON.stringify(options),async()=>{
 const h=fixture(options);await h.s.flush();assert.equal(h.button('Gửi kiểm tra').props.disabled,true);
 assert.match(h.text(),options.uninstalled?/Xác nhận lắp đặt/:options.error?/Chưa tải được trạng thái/:/Chưa có ảnh hiện trường đủ điều kiện/);
 h.s.press('Đóng');assert.equal(h.counts().closed,1);assert.equal(h.counts().dispatched,0);h.s.unmount();
});
test('Safety pending stays distinct from done until readback resolves; done offers close without resend',async()=>{
 const receipt=deferred(),h=fixture({receipt});h.setRecords([h.record]);await h.s.flush();
 assert.match(h.text(),/Chờ đối soát lần gửi/);assert.equal(h.button('Gửi kiểm tra'),undefined);
 h.s.press('Đối soát lần gửi');await h.s.flush();assert.equal(h.counts().saved,0);assert.equal(h.button('Đóng kiểm tra'),undefined);
 receipt.resolve();await h.s.flush();assert.equal(h.counts().saved,1);assert.equal(h.counts().prepared,0);
 assert.equal(h.button('Đối soát lần gửi'),undefined);assert.equal(h.button('Gửi kiểm tra'),undefined);
 assert.match(h.text(),/không phải xác nhận hoàn tất sửa chữa/);
 h.s.press('Đóng kiểm tra');assert.equal(h.counts().closed,1);assert.equal(h.counts().dispatched,1);h.s.unmount();
});
test('Safety other actor pending remains blocked with original content',async()=>{
 const h=fixture();h.setRecords([{...h.record,identity:{actor:'other'}}]);await h.s.flush();
 assert.equal(h.button('Đối soát lần gửi').props.disabled,true);assert.match(h.text(),/Có lần gửi khác/);assert.match(h.text(),/Barriers intact/);
 assert.equal(h.counts().dispatched,0);h.s.unmount();
});
