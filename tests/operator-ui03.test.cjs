const {test}=require('node:test');
const assert=require('node:assert/strict');
const {screen,deferred}=require('./helpers/roadfe-screen.cjs');
const {drone,id,task}=require('./package45-drone.test.cjs');
const text=s=>s.nodes().filter(n=>n.type==='Text').map(n=>n.props.children.flat(Infinity).join('')).join('\n');
function panel(row, options={}) {
 let posts=0,opened=0;const props={taskId:task.id,operation:'accept',collapsed:true,onExpand:()=>opened++};
 const scope={key:'scope-a',capture:()=>{const key=scope.key;return()=>key===scope.key;}};
 const s=screen('src/components/drone/DroneTaskCommandPanel.tsx',{exportName:'DroneTaskCommandPanel',props,modules:{
  '../../hooks/useOperatorReadScope':{useOperatorReadScope:()=>scope},
  '../../api/operator-task-view':{operatorTaskStatusLabel:v=>v},
  '../../api/droneTaskJournal':{openDroneTaskJournal:options.open??(async()=>({read:async()=>row,readCurrent:async()=>task,close(){},prepare:async()=>posts++,dispatch:async()=>posts++}))},
  '../Card':{Card:'Card'},'../Button':{Button:'Button'},
  '../../design-tokens':{spacing:{sm:8,md:16},colors:{border:'gray'},typography:{}},
 }});
 return Object.assign(s,{props,scope,posts:()=>posts,opened:()=>opened});
}
for(const phase of ['PREPARED','UNKNOWN_OUTCOME']) test('UI03 collapsed recovery exposes '+phase+' without sending',async()=>{
 const row={phase,command:{operation:'accept',key:id(8),payload:{}}};const s=panel(row);s.render();await s.flush();
 const alert=s.nodes().find(n=>n.props?.testID==='command-recovery-notice');assert.ok(alert);
 assert.match(text(s),phase==='PREPARED'?/Đã lưu lệnh, chưa gửi/:/Chưa rõ kết quả/);
 assert.equal(s.posts(),0);await s.press('Xem lệnh cần đối soát');assert.equal(s.opened(),1);assert.equal(s.posts(),0);s.unmount();
});
for(const row of [null,{phase:'RECEIPT',command:{operation:'accept',payload:{}}}]) test('UI03 no false pending alert for '+(row?.phase??'empty'),async()=>{
 const s=panel(row);s.render();await s.flush();assert.ok(!s.nodes().some(n=>n.props?.testID==='command-recovery-notice'));s.unmount();
});
test('UI03 collapsed journal read failure remains visible and retryable',async()=>{
 const s=panel(null,{open:async()=>{throw Error('storage');}});s.render();await s.flush();assert.ok(s.nodes().some(n=>n.props?.testID==='command-recovery-notice'));assert.match(text(s),/Không đọc được/);assert.equal(s.posts(),0);s.unmount();
});
test('UI03 scope change hides previous pending before new journal resolves',async()=>{
 const d=deferred();let calls=0;const s=panel(null,{open:async()=>({read:()=>++calls===1?Promise.resolve({phase:'PREPARED',command:{operation:'accept',payload:{}}}):d.promise,close(){}})});
 s.render();await s.flush();s.scope.key='scope-b';s.render();await s.flush();assert.doesNotMatch(text(s),/Đã lưu lệnh, chưa gửi/);d.resolve(null);await s.flush();s.unmount();
});
test('UI03 Submitted detail delegates collapsed rendering to live command panel',async()=>{
 const s=drone('request-detail',{getOperatorSurveyTaskDetailReal:async()=>({data:{...task,status:'SUBMITTED'}}),getOperatorWorkPackageReal:async()=>({data:{task,geometryRefs:[]}})},{params:{taskId:task.id}});
 s.render();await s.flush();const p=s.nodes().find(n=>n.type==='DroneTaskCommandPanel');assert.equal(p.props.collapsed,true);p.props.onExpand();await s.flush();assert.equal(s.nodes().find(n=>n.type==='DroneTaskCommandPanel').props.collapsed,false);s.unmount();
});
test('UI03 multi-ref package counts only displayed pinned geometry and identifies its version',async()=>{
 const ref={routeVersionId:id(4),segmentSetId:id(5),segmentIds:[id(6)]};
 const other={routeVersionId:id(7),segmentSetId:id(8),segmentIds:[id(9),id(10)]};let queries=[];
 const geometry={projectId:task.projectId,route:{routeVersionId:id(4),versionNo:7,isCurrent:false,effectiveFrom:null},segmentSet:{id:id(5),routeVersionId:id(4),segments:[{id:id(6),code:'PINNED',lengthMeters:100},{id:id(9),code:'OUTSIDE'}]}};
 const s=drone('work-package',{getOperatorWorkPackageReal:async()=>({data:{task,geometryRefs:[ref,other]}}),getOperatorGeometryPackageReal:async(project,query)=>{queries.push(query);return{data:geometry};}},{params:{taskId:task.id}});
 s.render();await s.flush();assert.match(JSON.stringify(s.nodes().find(n=>n.props?.testID==='displayed-segment-count')),/"1"/);
 assert.match(text(s),/Gói hình học 1\/2/);assert.match(text(s),/Phiên bản tuyến: 7/);assert.doesNotMatch(text(s),/OUTSIDE/);assert.equal(queries.length,1);assert.equal(queries[0].routeVersionId,ref.routeVersionId);s.unmount();
});
