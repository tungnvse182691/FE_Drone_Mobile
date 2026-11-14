const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {screen,deferred}=require('./helpers/roadfe-screen.cjs');
const id=n=>`${String(n).padStart(8,'0')}-1111-4111-8111-111111111111`;
const task=n=>({id:id(n),operatorId:id(99),projectId:id(98),status:n%2?'ACCEPTED':'COMPLETED',scope:[],version:'v1'});
// These online screen cases exercise pagination/errors. SQLite fallback and
// session isolation are covered by operator-offline-cache.test.cjs.
const onlineSnapshots={readOperatorSnapshot:async(_resource,read)=>({...await read(),cachedAt:null}),operatorCachedNotice:()=>null};
function drone(file,api={},extra={}){
 let current=true;
 const capture=()=>()=>current;
 const readScope={useOperatorReadScope:()=>({key:current?'actor-A':null,capture})};
 const s=screen(file,{params:{taskId:id(1)},...extra,moduleFactories:{'../../src/hooks/useOperatorTaskPages':({react,modules})=>{
   const m={exports:{}};require('node:vm').runInNewContext(require('typescript').transpileModule(fs.readFileSync('src/hooks/useOperatorTaskPages.ts','utf8'),{compilerOptions:{module:1}}).outputText,{module:m,exports:m.exports,require:n=>n==='react'?react:n==='expo-router'?modules[n]:n==='./useOperatorReadScope'?readScope:n==='../api/operatorOfflineCache'?onlineSnapshots:{...api}});return m.exports;
 },...extra.moduleFactories},modules:{
  '../../src/hooks/useOperatorReadScope':readScope,
  '../../src/api/droneApi':api,
  '../../src/api/operatorOfflineCache':onlineSnapshots,
  '../../src/components/AppHeader':{AppHeader:'AppHeader'},'../../src/components/Card':{Card:'Card'},
  '../../src/components/drone/OperatorTaskRow':{OperatorTaskRow:'OperatorTaskRow',OperatorTaskSkeleton:'OperatorTaskSkeleton'},
  '../../src/components/Chip':{Chip:'Chip'},'../../src/components/EmptyState':{EmptyState:'EmptyState'},
  '../../src/components/AnimatedPressable':{AnimatedPressable:'AnimatedPressable'},
  '../../src/components/drone/DroneTaskCommandPanel':{DroneTaskCommandPanel:'DroneTaskCommandPanel'},
  ...extra.modules,
 }});return {s,switch:()=>{current=false;}};
}
const text=s=>s.nodes().filter(n=>n.type==='Text').map(n=>JSON.stringify(n.props.children)).join(' ');
test('W1-02 Requests offers page 2 even when current status filter is empty',async()=>{
 let calls=[];
 const f=drone('app/(drone)/requests.tsx',{listOperatorSurveyTasksReal:async(cursor)=>{calls.push(cursor);return cursor?{items:[task(51)],nextCursor:null}:{items:Array.from({length:50},(_,i)=>task(i+1)),nextCursor:'page2'};}});
 f.s.render();await f.s.flush();
 f.s.press('Tải thêm nhiệm vụ');await f.s.flush();assert.deepEqual(calls,[null,'page2']);
 assert.doesNotMatch(text(f.s),/tối đa 50/);assert.match(text(f.s),/Đã tải hết/);f.s.unmount();
});
test('W1-05 Requests preserves AppHeader with correct page title',async()=>{
 const f=drone('app/(drone)/requests.tsx',{listOperatorSurveyTasksReal:async()=>({items:[],nextCursor:null})});
 f.s.render();await f.s.flush();assert.equal(f.s.nodes().find(n=>n.type==='SafeAreaScreen').props.header.props.subtitle,'Nhiệm vụ khảo sát');f.s.unmount();
});
for(const [name,error,message] of [['403',{response:{status:403}},'không có quyền'],['404',{response:{status:404}},'Không tìm thấy gói'],['401',{response:{status:401}},'Phiên hết hạn'],['500',{response:{status:500}},'Chưa đọc được gói'],['timeout',Error('timeout'),'Chưa đọc được gói']])test('W1-03 WP '+name+' is distinct from absent point and retries only GET',async()=>{
 let bad=true,details=0,works=0;
 const f=drone('app/(drone)/request-detail.tsx',{
  getOperatorSurveyTaskDetailReal:async()=>{details++;return {data:task(1),etag:'"v1"'};},
  getOperatorWorkPackageReal:async()=>{works++;if(bad)throw error;return {data:{accessPoint:null}};},
 });f.s.render();await f.s.flush();assert.match(text(f.s),new RegExp(message));assert.doesNotMatch(text(f.s),/Máy chủ chưa cung cấp điểm tiếp cận cho nhiệm vụ này./);
 bad=false;f.s.press('Thử lại gói công việc');await f.s.flush();assert.equal(details,1);assert.equal(works,2);assert.match(text(f.s),/Máy chủ chưa cung cấp điểm tiếp cận cho nhiệm vụ này./);f.s.unmount();
});
for(const [name,point,expected] of [['null',null,'Máy chủ chưa cung cấp điểm tiếp cận cho nhiệm vụ này.'],['valid',{point:{latitude:10,longitude:106}},'Dẫn đường đến điểm tiếp cận'],['invalid',{point:{latitude:91,longitude:106}},'Tọa độ điểm tiếp cận không hợp lệ']])test('W1-03 point '+name,async()=>{
 const f=drone('app/(drone)/request-detail.tsx',{getOperatorSurveyTaskDetailReal:async()=>({data:task(1),etag:'"v1"'}),getOperatorWorkPackageReal:async()=>({data:{accessPoint:point}})});
 f.s.render();await f.s.flush();assert.match(text(f.s),new RegExp(expected));if(name!=='valid')assert.doesNotMatch(text(f.s),/Dẫn đường đến điểm tiếp cận/);f.s.unmount();
});
test('W1-03 late WP after session switch cannot render or enable Maps',async()=>{
 const d=deferred(),f=drone('app/(drone)/request-detail.tsx',{getOperatorSurveyTaskDetailReal:async()=>({data:task(1),etag:'"v1"'}),getOperatorWorkPackageReal:()=>d.promise});
 f.s.render();await f.s.flush();f.switch();d.resolve({data:{accessPoint:{point:{latitude:10,longitude:106}}}});await f.s.flush();f.s.render();assert.doesNotMatch(text(f.s),/Dẫn đường đến điểm tiếp cận/);f.s.unmount();
});
test('W1-04 integrity PASSED has its own label while coverage remains UNKNOWN',async()=>{
 for(const status of ['PASSED','FAIL','UNKNOWN','NEW_STATUS']){
 const s=screen('src/components/drone/DroneDatasetReadbackPanel.tsx',{exportName:'DatasetContent',expose:'DatasetContent',props:{scope:'A'},modules:{'../../api/droneDatasetWorkflow':{isDroneResourceId:()=>true,operatorDatasetScope:()=>'A',readOperatorDatasetReadback:async()=>({dataset:{id:id(1),integrityStatus:status,telemetryStatus:'MISSING'},coverage:{items:[{scope:{},overallCoverage:'UNKNOWN',positionCoverage:'UNKNOWN',qualityCoverage:'UNKNOWN'}]}})},'../Card':{Card:'Card'},'../Button':{Button:'Button'}}});
 s.render();s.press('Đọc bộ dữ liệu và phạm vi phủ');await s.flush();assert.match(text(s),new RegExp({PASSED:'Đạt kiểm tra toàn vẹn',FAIL:'Chưa đạt',UNKNOWN:'Chưa xác định',NEW_STATUS:'Chưa có nhãn trạng thái'}[status]));assert.match(text(s),/Thiếu dữ liệu/);assert.match(text(s),/Chưa xác định/);s.unmount();
 }
});
test('W1-06 accuracy is a position precision, including zero and unavailable values',async()=>{
 const source=fs.readFileSync('app/(drone)/work-package.tsx','utf8');assert.match(source,/Độ chính xác vị trí/);assert.doesNotMatch(source,/Bán kính an toàn|Theo quy định an toàn hiện trường/);
 for(const accuracyMeters of [0,3.5,null,-1,NaN]){
 const f=drone('app/(drone)/work-package.tsx',{getOperatorWorkPackageReal:async()=>({data:{task:task(1),geometryRefs:[],accessPoint:{point:{latitude:10,longitude:106},accuracyMeters}}})});
 f.s.render();await f.s.flush();assert.match(text(f.s),new RegExp(Number.isFinite(accuracyMeters)&&accuracyMeters>=0?String(accuracyMeters)+' m':'Chưa có dữ liệu độ chính xác'));f.s.unmount();
 }
});
function pagesHarness(read){
 let key='actor-A',epoch=0;
 const capture=()=>{const generation=epoch;return ()=>!!key&&generation===epoch;};
 const s=screen('src/hooks/useOperatorTaskPages.ts',{exportName:'useOperatorTaskPages',modules:{
  './useOperatorReadScope':{useOperatorReadScope:()=>({key,capture})},'../api/droneApi':{listOperatorSurveyTasksReal:read},
  '../api/operatorOfflineCache':onlineSnapshots,
 }});s.render();return {s,state:()=>s.nodes()[0],switch:k=>{key=k;epoch++;s.render();},bounce:()=>{epoch++;}};
}
test('W1-02 cursor pages 1/2/3 dedupe and stop without loading everything',async()=>{
 const calls=[],f=pagesHarness(async cursor=>{calls.push(cursor);return cursor==='p3'?{items:[task(51),task(52)],nextCursor:null}:cursor==='p2'?{items:[task(50),task(51)],nextCursor:'p3'}:{items:Array.from({length:50},(_,i)=>task(i+1)),nextCursor:'p2'};});
 await f.s.flush();assert.equal(f.state().tasks.length,50);assert.equal(calls.length,1);
 await f.state().loadMore();await f.s.flush();assert.equal(f.state().tasks.length,51);
 await f.state().loadMore();await f.s.flush();assert.equal(f.state().tasks.length,52);assert.equal(f.state().nextCursor,null);
 await f.state().loadMore();assert.deepEqual(calls,[null,'p2','p3']);f.s.unmount();
});
test('W1-02 page 2 failure retains page 1 and retries same cursor once even on double tap',async()=>{
 let fail=true;const calls=[],d=deferred(),f=pagesHarness(async cursor=>{calls.push(cursor);if(!cursor)return {items:[task(1)],nextCursor:'p2'};if(fail)throw Error('network');return d.promise;});
 await f.s.flush();await f.state().loadMore();await f.s.flush();assert.equal(f.state().tasks.length,1);assert.ok(f.state().error);
 fail=false;const send=f.state().loadMore();f.state().loadMore();await f.s.flush();assert.equal(f.state().loading,true);
 d.resolve({items:[task(2)],nextCursor:null});await send;await f.s.flush();assert.equal(f.state().tasks.length,2);assert.equal(f.state().error,null);assert.deepEqual(calls,[null,'p2','p2']);f.s.unmount();
});
test('Operator pagination removes displayed tasks after explicit access denial',async()=>{
 const f=pagesHarness(async cursor=>{if(cursor)throw {response:{status:403}};return {items:[task(1)],nextCursor:'p2'};});
 await f.s.flush();assert.equal(f.state().tasks.length,1);
 await f.state().loadMore();await f.s.flush();assert.equal(f.state().tasks.length,0);assert.equal(f.state().nextCursor,null);assert.match(f.state().error,/Không còn quyền/);f.s.unmount();
});
for(const nextCursor of ['p2','',undefined,42])test('W1-02 repeated or malformed cursor stops safe: '+String(nextCursor),async()=>{
 let calls=0;const f=pagesHarness(async cursor=>{calls++;return cursor?{items:[task(2)],nextCursor}:{items:[task(1)],nextCursor:'p2'};});
 await f.s.flush();await f.state().loadMore();await f.s.flush();assert.ok(f.state().error);
 if(nextCursor==='p2'){assert.equal(f.state().nextCursor,null);await f.state().loadMore();assert.equal(calls,2);}
 else assert.equal(f.state().tasks.length,1);f.s.unmount();
});
test('W1-02 refresh replaces pages and supersedes late page 2',async()=>{
 const d=deferred();let refreshes=0;
 const f=pagesHarness(async cursor=>cursor?d.promise:{items:[task(++refreshes)],nextCursor:'p2'});
 await f.s.flush();const pending=f.state().loadMore();await f.state().refresh();await f.s.flush();
 d.resolve({items:[task(99)],nextCursor:null});await pending;await f.s.flush();assert.equal(f.state().tasks.length,1);assert.equal(f.state().tasks[0].id,id(2));f.s.unmount();
});
test('W1-02 actor change and ABA bounce reject late page, no cross-session tasks',async()=>{
 for(const change of ['switch','bounce']){
 const d=deferred(),f=pagesHarness(()=>d.promise);if(change==='switch')f.switch(null);else f.bounce();
 d.resolve({items:[task(99)],nextCursor:'p2'});await f.s.flush();assert.equal(f.state().tasks.length,0);f.s.unmount();
 }
});
test('W1-02 Home marks first page and links to remaining tasks',async()=>{
 const f=drone('app/(drone)/home.tsx',{listOperatorSurveyTasksReal:async()=>({items:[task(1)],nextCursor:'p2'})});
 f.s.render();await f.s.flush();assert.match(text(f.s),/trang đầu/);assert.ok(f.s.nodes().some(n=>n.type==='AnimatedPressable'&&n.props.accessibilityLabel==='Xem tất cả nhiệm vụ khảo sát'));f.s.unmount();
});

test('W1-02 Log loads next page and refresh resets the loaded list',async()=>{
 const calls=[],f=drone('app/(drone)/log.tsx',{listOperatorSurveyTasksReal:async cursor=>{calls.push(cursor);return {items:[task(cursor?2:1)],nextCursor:cursor?null:'p2'};}},{exportName:'DroneLogContent',expose:'DroneLogContent',props:{scope:'actor-A'},modules:{
 '../../src/components/drone/DroneDatasetReadbackPanel':{DroneDatasetReadbackPanel:'DroneDatasetReadbackPanel'},
 '../../src/components/drone/DroneTaskCommandPanel':{DroneTaskRecoveryList:'DroneTaskRecoveryList'},
 }});
 f.s.render();await f.s.flush();f.s.press('Tải thêm nhiệm vụ');await f.s.flush();assert.equal(f.s.nodes().filter(n=>n.type==='OperatorTaskRow').length,2);assert.ok(!f.s.nodes().some(n=>n.props.title==='Tải thêm nhiệm vụ'));
 f.s.nodes().find(n=>n.props.accessibilityLabel==='Đọc lại danh sách').props.onPress();await f.s.flush();assert.deepEqual(calls,[null,'p2',null]);assert.ok(f.s.nodes().some(n=>n.props.title==='Tải thêm nhiệm vụ'));f.s.unmount();
});
