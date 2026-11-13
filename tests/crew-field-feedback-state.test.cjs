const {test}=require('node:test'),assert=require('node:assert/strict');
const {screen,deferred}=require('./helpers/roadfe-screen.cjs');
async function mounted(){
 const context={actor:'crew',scope:'session',environment:'test',projectId:'project',taskId:'task'};
 let focus,cleanup,failSave=false,waitSave=null;
 let draft={measurements:[{sampleId:'sample',type:'DepressionDepth',dimension:'LENGTH',unit:'cm',value:5,state:'KNOWN'}],captures:[{id:'photo',parts:[],size:3,uri:'file://photo'}],command:null};
 const s=screen('app/(crew)/field-review.tsx',{
 expose:'CrewFieldReviewScreenContent,fieldNoticeModel,safeFieldErrorDetail',exportName:'CrewFieldReviewScreenContent',
 props:{task:{id:'task',projectId:'project',task_mode:'MEASURE_ONLY'}},
 moduleFactories:{'expo-router':({react})=>({useLocalSearchParams:()=>({}),router:{push:()=>cleanup?.()},useFocusEffect:fn=>{focus=fn;react.useEffect(()=>{cleanup=fn();return()=>cleanup?.();},[fn]);}})},
 modules:{
 'expo-crypto':{randomUUID:()=> 'sample'},
 '../../src/components/AppHeader':{AppHeader:'AppHeader'},'../../src/components/Card':{Card:'Card'},'../../src/components/Chip':{Chip:'Chip'},'../../src/components/Toast':{Toast:'Toast'},
 './tasks':{useCrewIdentity:()=>({user:{id:'crew'},scope:'session'}),TASK_MODE_CHIP:{MEASURE_ONLY:{label:'Chỉ đo kiểm'}}},
 '../../src/api/crewApi':{fieldCapabilityBlock:()=>null,validateCrewTaskDetail(){},getFieldInspectionTaskDetailReal:async()=>({data:{status:'InProgress',requiredMeasurementType:1},etag:'version'})},
 '../../src/api/crewFieldDraft':{currentFieldContext:()=>context,openFieldRuntime:async()=>({}),loadFieldDraft:async()=>structuredClone(draft),measurementTemplate:()=>draft.measurements[0],fieldDraftPending:d=>d.command?.phase==='pending',fieldErrorMessage:e=>e.message,
 saveFieldMeasurements:async()=>{if(waitSave)await waitSave.promise;if(failSave)throw Error('Lưu chưa thành công');return structuredClone(draft);},acknowledgeFieldResult:async()=>({...draft,command:null}),
 },
 }});
 s.render();await s.flush();
 return {s,focus:async()=>{cleanup=focus();await s.flush();},setFailure:v=>failSave=v,setWait:d=>waitSave=d,setCommand:c=>draft.command=c,
 submit:()=>s.nodes().find(n=>n.type==='Button'&&n.props.title==='Gửi hồ sơ đo kiểm'),notice:()=>s.nodes().find(n=>typeof n.type==='function'&&n.type.name==='FieldNotice')};
}
test('FIELD camera navigation clears busy when returning to the editor',async()=>{
 const h=await mounted();h.s.press('Chụp / chọn ảnh');await h.s.flush();await h.focus();
 assert.equal(h.submit().props.loading,false);assert.equal(h.submit().props.disabled,false);h.s.unmount();
});
test('FIELD saving measurements never shows submit spinner and success drops old error details',async()=>{
 const h=await mounted();h.s.press('Chỉnh số đo');h.s.render();
 h.setFailure(true);h.s.press('Lưu nháp số đo');await h.s.flush();assert.ok(h.notice());
 h.setFailure(false);const waiting=deferred();h.setWait(waiting);h.s.press('Lưu nháp số đo');await h.s.flush();
 assert.equal(h.submit().props.loading,false);assert.equal(h.submit().props.disabled,true);
 waiting.resolve();await h.s.flush();assert.equal(h.notice().props.model.detail,'');h.s.unmount();
});
test('FIELD confirmed frozen command hides redundant disabled submit',async()=>{
 const h=await mounted();h.setCommand({phase:'confirmed'});await h.focus();
 assert.equal(h.submit(),undefined);assert.ok(h.s.nodes().some(n=>n.type==='Button'&&n.props.title==='Đã xem kết quả — tạo nháp mới'));h.s.unmount();
});
