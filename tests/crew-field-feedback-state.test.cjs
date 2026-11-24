const {test}=require('node:test'),assert=require('node:assert/strict');
const {screen,deferred}=require('./helpers/roadfe-screen.cjs');
async function mounted(options={}){
 const context={actor:'crew',scope:'session',environment:'test',projectId:'project',taskId:'task'};
 const navigation=[];
 let focus,cleanup,failSave=false,waitSave=null,submitted=false,detailReads=0,readError=null;
 let draft={measurements:[{sampleId:'sample',type:'DepressionDepth',dimension:'LENGTH',unit:'cm',value:5,state:'KNOWN'}],captures:options.emptyCaptures?[]:[{id:'photo',parts:[],size:3,uri:'file://photo'}],command:null};
 const s=screen('app/(crew)/field-review.tsx',{
 expose:'CrewFieldReviewScreenContent,fieldNoticeModel,safeFieldErrorDetail',exportName:'CrewFieldReviewScreenContent',
 props:{task:{id:'task',projectId:'project',task_mode:'MEASURE_ONLY',detail:{status:'InProgress',mode:'MEASURE_ONLY',requiredMeasurementType:1},etag:'version'}},
 moduleFactories:{'expo-router':({react})=>({useLocalSearchParams:()=>({}),useRouter:()=>({push:p=>{navigation.push(p);cleanup?.();}}),useFocusEffect:fn=>{focus=fn;react.useEffect(()=>{cleanup=fn();return()=>cleanup?.();},[fn]);}})},
 modules:{
 'expo-crypto':{randomUUID:()=> 'sample'},
 '../../src/components/AppHeader':{AppHeader:'AppHeader'},'../../src/components/Card':{Card:'Card'},'../../src/components/Chip':{Chip:'Chip'},'../../src/components/Toast':{Toast:'Toast'},
 './tasks':{useCrewIdentity:()=>({user:{id:'crew'},scope:'session'}),TASK_MODE_CHIP:{MEASURE_ONLY:{label:'Chỉ đo kiểm'}}},
 '../../src/api/crewApi':{crewLocalReadUnavailable:e=>e?.code==='ERR_NETWORK'&&!e.response,fieldCapabilityBlock:()=>null,validateCrewTaskDetail(){},getFieldInspectionTaskDetailReal:async()=>{detailReads++;if(readError)throw readError;return {data:{status:options.completed?'Completed':submitted?'Submitted':options.previous?'SupplementRequired':'InProgress',mode:options.normal?'NORMAL':'MEASURE_ONLY',repairContext:options.repairContext,requiredMeasurementType:1,latestSubmissionId:submitted?'receipt':options.previous?'parent':null},etag:'version'};},getFieldSubmissionDetailReal:async()=>({data:{id:submitted?'receipt':'parent',taskId:'task',readiness:options.incomplete?'INCOMPLETE':'READY',missingReasons:options.incomplete?['AFTER_ATTEMPT_BINDING_UNAVAILABLE']:[],measurements:draft.measurements,evidence:options.previous?[{fileId:'retained-file',captureOriginId:'old-photo',purpose:'MEASUREMENT'}]:[]}})},
 '../../src/api/crewFieldDraft':{currentFieldContext:()=>context,openFieldRuntime:async()=>({}),loadFieldDraft:async()=>structuredClone(draft),measurementTemplate:()=>draft.measurements[0],fieldDraftPending:d=>d.command?.phase==='pending',fieldErrorMessage:e=>e.message,
 saveFieldMeasurements:async()=>{if(waitSave)await waitSave.promise;if(failSave)throw Error('Lưu chưa thành công');return structuredClone(draft);},acknowledgeFieldResult:async()=>({...draft,command:null}),
 uploadAndSubmitFieldDraft:async(d,r,onProgress)=>{
  if(options.transfer){
   draft.captures[0]={...draft.captures[0],upload:{status:'UPLOADING',partSizeBytes:3}};
   onProgress(structuredClone(draft),'photo',37);await options.transfer.promise;
   draft.captures[0]={...draft.captures[0],completed:true,parts:[{partNumber:1}],upload:{status:'VERIFYING',partSizeBytes:3}};
   onProgress(structuredClone(draft),'photo');await options.verification.promise;
  }
  submitted=true;draft={...draft,command:{phase:'confirmed'},result:{id:'receipt',taskId:'task',readiness:'READY'}};return structuredClone(draft);
 },
 },
 }});
 s.render();await s.flush();
 return {s,navigation,detailReads:()=>detailReads,setReadError:e=>readError=e,focus:async()=>{cleanup=focus();await s.flush();},setFailure:v=>failSave=v,setWait:d=>waitSave=d,setCommand:c=>draft.command=c,
 submit:()=>s.nodes().find(n=>n.type==='Button'&&n.props.title==='Gửi hồ sơ đo kiểm'),notice:()=>s.nodes().find(n=>typeof n.type==='function'&&n.type.name==='FieldNotice')};
}
test('FIELD camera navigation clears busy when returning to the editor',async()=>{
 const h=await mounted();h.s.press('Chụp / chọn ảnh');await h.s.flush();await h.focus();
 assert.equal(h.submit().props.loading,false);assert.equal(h.submit().props.disabled,false);h.s.unmount();
});

test('FIELD measurement rows keep value beside the edit action and opt into keyboard insets',async()=>{
 const h=await mounted();h.s.press('Chỉnh số đo');h.s.render();
 assert.ok(h.s.nodes().some(n=>n.type==='SafeAreaScreen'&&n.props.keyboardAware===true));
 const row=()=>h.s.nodes().find(n=>n.type==='Pressable'&&n.props.accessibilityLabel==='Sửa Độ sâu chỗ lõm');
 assert.ok(row());assert.equal(row().props.accessibilityState.expanded,false);
 assert.match(JSON.stringify(row().props.children),/5 cm/);
 row().props.onPress();h.s.render();assert.equal(row().props.accessibilityState.expanded,true);
 assert.ok(h.s.nodes().some(n=>n.type==='InputField'&&n.props.label==='Giá trị đo thực'));
 assert.ok(h.s.nodes().some(n=>n.type==='Button'&&n.props.title==='Xong số đo này'));
 h.s.unmount();
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
 assert.equal(h.s.nodes().some(n=>n.type==='Button'&&['Chỉnh số đo','Chỉnh vị trí','Chụp / chọn ảnh'].includes(n.props.title)),false);
 assert.equal(h.submit(),undefined);assert.ok(h.s.nodes().some(n=>n.type==='Button'&&n.props.title==='Đã xem kết quả — tạo nháp mới'));h.s.unmount();
});

test('FIELD supplement with retained server evidence does not claim there are no photos',async()=>{
 const h=await mounted({previous:true,emptyCaptures:true});
 const text=h.s.nodes().filter(n=>n.type==='Text').map(n=>JSON.stringify(n.props.children)).join(' ');
 assert.equal(text.includes('Chưa có ảnh. Thêm ảnh hiện trường để gửi hồ sơ.'),false);
 assert.ok(text.includes('Ảnh đã gửi sẽ được giữ trong bản bổ sung. Có thể thêm ảnh mới nếu cần.'));
 assert.ok(h.s.nodes().some(n=>n.type==='Button'&&n.props.title==='Gửi bổ sung đo kiểm'&&!n.props.disabled));h.s.unmount();
});

test('FIELD confirmed send refreshes task and receipt immediately without another user refresh',async()=>{
 const h=await mounted(),reads=h.detailReads();
 h.s.press('Gửi hồ sơ đo kiểm');await h.s.flush();
 assert.ok(h.detailReads()>reads,'must reload task after confirmed send');
 assert.ok(h.s.nodes().some(n=>n.type==='CrewTaskStatus'&&n.props.label==='Đã nộp'));
 assert.equal(h.s.nodes().some(n=>n.type==='Button'&&n.props.title==='Chỉnh số đo'),false);
 h.s.unmount();
});

test('FIELD final decision takes precedence over historical FIELD readiness without rewriting it',async()=>{
 const h=await mounted({previous:true,completed:true,incomplete:true,repairContext:{status:'Confirmed',finalDecision:{result:'CONFIRMED'}}});
 assert.ok(h.s.nodes().some(n=>n.type==='Chip'&&n.props.label==='Sửa chữa: Đã nghiệm thu'));
 assert.ok(h.s.nodes().some(n=>n.type==='Chip'&&n.props.label==='Kết quả lúc nộp: Chờ liên kết lượt sửa chữa'));
 const banner=h.s.nodes()[0].props.header.props.children[1];
 assert.equal(banner.props.model.title,'Đã nghiệm thu');
 assert.match(banner.props.model.detail,/Ảnh sau sửa chưa liên kết/);
 h.s.unmount();
});

test('FIELD Completed alone never implies final repair acceptance',async()=>{
 const h=await mounted({previous:true,completed:true,incomplete:true});
 assert.equal(h.s.nodes().some(n=>n.type==='Chip'&&n.props.label==='Sửa chữa: Đã nghiệm thu'),false);
 h.s.unmount();
});

test('FIELD a saved claim awaiting formal intake offers the existing closeout route without resubmitting',async()=>{
 const h=await mounted({previous:true,incomplete:true,repairContext:{status:'InProgress'}});
 const action=h.s.nodes().find(n=>n.type==='Button'&&n.props.title==='Tiếp tục hồ sơ hoàn tất');
 assert.ok(action);assert.equal(action.props.disabled,false);
 h.s.unmount();
});


test('FIELD current linked attempt replaces historical binding warning and opens closeout directly',async()=>{
 const h=await mounted({previous:true,incomplete:true,repairContext:{status:'Submitted',attempt:{attemptId:'attempt',effectiveSubmissionId:'parent',review:null}}});
 const banner=h.s.nodes()[0].props.header.props.children[1];
 assert.equal(banner.props.model.title,'Đã nộp hồ sơ sửa chữa');
 assert.equal(banner.props.model.summary,'Chờ quản lý đánh giá');
 assert.equal(banner.props.model.tone,'success');
 assert.ok(h.s.nodes().some(n=>n.type==='Chip'&&n.props.label==='Hồ sơ: Đã liên kết lượt sửa chữa'));
 const text=JSON.stringify(h.s.nodes().filter(n=>n.type==='Text').map(n=>n.props.children));
 assert.doesNotMatch(text,/Thông tin còn thiếu|Ảnh sau sửa chưa liên kết/);
 h.s.press('Xem hồ sơ hoàn tất');
 assert.equal(h.navigation.at(-1).pathname,'/(crew)/complete');
 assert.equal(h.navigation.at(-1).params.id,'task');
 h.s.unmount();
});

test('FIELD unrelated attempt cannot clear current submission binding warning',async()=>{
 const h=await mounted({previous:true,incomplete:true,repairContext:{status:'Submitted',attempt:{attemptId:'attempt',effectiveSubmissionId:'other',review:null}}});
 const banner=h.s.nodes()[0].props.header.props.children[1];
 assert.notEqual(banner?.props.model.title,'Đã nộp hồ sơ sửa chữa');
 h.s.unmount();
});

test('FIELD progress stays 100 during verification without claiming VERIFIED',()=>{
 const fs=require('node:fs'),vm=require('node:vm');const scope={require,setTimeout,clearTimeout,Uint8Array,AbortController,URL};
 vm.runInNewContext(fs.readFileSync('tests/t05b.test.cjs','utf8').split("test('T05B FIELD")[0]+";globalThis.e=load('app/(crew)/field-review.tsx',{'react-native':{StyleSheet:{create:x=>x}}});",scope);const e=scope.e;
 const c={parts:[{partNumber:1}],size:3,completed:true,upload:{status:'VERIFYING',partSizeBytes:3}};
 const feedback=e.fieldPhotoFeedback(c,true);
 assert.equal(feedback.percent,100);assert.equal(feedback.verified,false);
 assert.equal(e.fieldPhotoFeedback({...c,completed:false,parts:[],upload:{status:'UPLOADING',partSizeBytes:3}},true,37).percent,37);
});

test('FIELD labels submitted snapshot separately from unsent supplement',async()=>{
 const h=await mounted({previous:true});
 const text=h.s.nodes().filter(n=>n.type==='Text').map(n=>JSON.stringify(n.props.children)).join(' ');
 assert.match(text,/Thông tin bên dưới là bản bổ sung đang soạn/);
 h.s.unmount();
});

test('FIELD screen shows transport percent then keeps 100 while waiting for verification',async()=>{
 const transfer=deferred(),verification=deferred(),h=await mounted({transfer,verification});
 h.s.press('Gửi hồ sơ đo kiểm');await h.s.flush();
 const progress=()=>h.s.nodes().filter(n=>n.props?.accessibilityRole==='progressbar');
 assert.ok(progress().some(n=>n.props.accessibilityValue.now===37));
 transfer.resolve();await h.s.flush();
 assert.ok(progress().some(n=>n.props.accessibilityValue.now===100));
 assert.ok(h.s.nodes().some(n=>n.props?.accessibilityLabel==='Ảnh 1: Đang kiểm tra 100%'));
 assert.equal(h.s.nodes().some(n=>n.type==='Button'&&n.props.title==='Gửi hồ sơ đo kiểm'&&!n.props.disabled),false);
 verification.resolve();await h.s.flush();h.s.unmount();
});

test('FIELD long help is opt-in and each section expands independently',async()=>{
 const h=await mounted({normal:true,emptyCaptures:true});
 const copy=()=>JSON.stringify(h.s.nodes().filter(n=>n.type==='Text').map(n=>n.props.children));
 assert.doesNotMatch(copy(),/Ảnh chụp được lưu trên máy trước|Sau khi lưu số đo và tải ảnh/);
 const toggle=label=>h.s.nodes().find(n=>n.props.accessibilityLabel===label);
 assert.equal(toggle('Hướng dẫn ảnh bằng chứng').props.accessibilityState.expanded,false);
 toggle('Hướng dẫn ảnh bằng chứng').props.onPress();h.s.render();
 assert.match(copy(),/Ảnh chụp được lưu trên máy trước/);
 assert.doesNotMatch(copy(),/Sau khi lưu số đo và tải ảnh/);
 toggle('Hướng dẫn đánh giá trước sửa').props.onPress();h.s.render();
 assert.match(copy(),/Sau khi lưu số đo và tải ảnh/);
 toggle('Hướng dẫn ảnh bằng chứng').props.onPress();h.s.render();
 assert.doesNotMatch(copy(),/Ảnh chụp được lưu trên máy trước/);
 h.s.unmount();
});

 test('FIELD offline return restores local form and camera but never enables send or upload',async()=>{
 const h=await mounted();h.setReadError({code:'ERR_NETWORK'});await h.focus();
 const action=title=>h.s.nodes().find(n=>n.type==='Button'&&n.props.title===title);
 assert.ok(action('Chỉnh số đo'));assert.equal(action('Chụp / chọn ảnh').props.disabled,false);
 assert.equal(h.submit().props.disabled,true);assert.equal(action('Tải ảnh này lên'),undefined);
 assert.match(JSON.stringify(h.s.nodes().filter(n=>n.type==='Text').map(n=>n.props.children)),/Chỉ lưu nháp trên máy/);
 h.s.press('Chụp / chọn ảnh');await h.s.flush();assert.equal(h.navigation.at(-1).pathname,'/(crew)/viewfinder');h.s.unmount();
 });
 test('FIELD definitive denial cannot fall back to a snapshot on a later offline read',async()=>{
 const h=await mounted();h.setReadError({response:{status:403}});await h.focus();
 assert.equal(h.s.nodes().some(n=>n.type==='Button'&&n.props.title==='Chụp / chọn ảnh'),false);
 h.setReadError({code:'ERR_NETWORK'});await h.focus();
 assert.equal(h.s.nodes().some(n=>n.type==='Button'&&n.props.title==='Chụp / chọn ảnh'),false);h.s.unmount();
 });
