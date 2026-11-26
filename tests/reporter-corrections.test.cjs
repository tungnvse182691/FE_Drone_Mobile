const {cameraDraftFixture}=require('./helpers/reporter-capture-fixture.cjs');
const {capturePhoto}=require('./helpers/roadfe-screen.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {screen,harness,deferred,seedLegacyDraft}=require('./helpers/roadfe-screen.cjs');
test('A entering and leaving create form never writes a form draft',async()=>{
 const s=screen('app/(reporter)/report.tsx');s.render();await s.flush();
 s.input('Mô tả hiện trạng','unsent form');await s.flush();
 assert.equal(s.reporter.useReporterStore.getState().pendingDraft,null);assert.equal(s.h.rows.size,0);s.unmount();
});
test('A legacy unstarted form is not restored or overwritten',async()=>{
 const s=screen('app/(reporter)/report.tsx');s.h.login();const store=s.reporter.useReporterStore.getState();
 await seedLegacyDraft(s.h,{description:'legacy unsent',photos:[],coords:null});const before=JSON.stringify([...s.h.rows]);
 s.render();await s.flush();assert.equal(s.nodes().find(n=>n.props?.label==='Mô tả hiện trạng').props.value,'');
 assert.equal(JSON.stringify([...s.h.rows]),before);s.unmount();
});
test('B shared description validation matches BE UTF16 trimmed 1..1000',()=>{
 const h=harness(),{reportDescriptionError}=h.load('src/api/reporterValidation.ts');
 for(const value of ['a','123456789','1234567890','a'.repeat(1000),'😀'.repeat(500),' e\u0301 '])assert.equal(reportDescriptionError(value),null);
 for(const value of ['', ' \n\t', 'a'.repeat(1001),'😀'.repeat(501)])assert.ok(reportDescriptionError(value));
});
test('B create invalid long text never persists intent or calls upload',async()=>{
 const s=screen('app/(reporter)/report.tsx');s.h.login();s.render();await s.flush();
 s.input('Mô tả hiện trạng','a'.repeat(1001));await s.press('Gửi phản ánh');await s.flush();
 assert.equal(s.h.calls.length,0);assert.equal(s.h.rows.size,0);assert.match(JSON.stringify(s.nodes()),/1.000/);s.unmount();
});
function resetScreen(request){
 const s=screen('src/components/ReporterPasswordReset.tsx',{exportName:'ReporterPasswordReset',props:{onComplete:()=>{}},modules:{'./Button':{Button:'Button'},'./InputField':{InputField:'InputField'},'../api/reporterPasswordReset':{requestReporterReset:request,REPORTER_RESET_ACK:'Nếu tài khoản đủ điều kiện, mã sẽ được gửi về email đã đăng ký.',reporterResetError:()=> 'Chưa xác nhận được kết quả.'}}});
 s.render();s.input('Email người phản ánh','fixture@example.test');return s;
}
test('C Reporter recovery double tap only sends one explicit OTP request',async()=>{
 const d=deferred(),calls=[];const s=resetScreen(e=>{calls.push(e);return d.promise;});
 const first=s.press('Gửi mã OTP'),second=s.press('Gửi mã OTP');
 assert.equal(calls.length,1);d.resolve();await Promise.all([first,second]);await s.flush();
 assert.match(JSON.stringify(s.nodes()),/Nếu tài khoản đủ điều kiện/);assert.doesNotMatch(JSON.stringify(s.nodes()),/đã gửi.*link/i);s.unmount();
});

test('E private attachment label changes without changing protected API',()=>{
 const src=fs.readFileSync('app/(reporter)/report-detail.tsx','utf8');assert.ok(src.includes("'Xem ảnh đính kèm'"));assert.ok(!src.includes('Xem ảnh riêng tư'));
 assert.ok(src.includes('downloadReportEvidenceReal'));assert.ok(src.includes('Xem ảnh được chia sẻ'));
});
function recoveryFixture(){
 let context={ownerId:'actor',environment:'env',session:'new',epoch:0,partition:'new'},me={id:'actor',role:'REPORTER'},rows=[];const calls=[];
 const m={exports:{}};const code=ts.transpileModule(fs.readFileSync('src/store/reporterRecovery.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(code,{module:m,exports:m.exports,require:n=>{
 if(n==='./uploads')return{reporterContext:()=>({...context}),assertReporterContext:c=>{assert.deepEqual(c,context);}};
 if(n==='../api/authApi')return{fetchMe:async()=>{calls.push('me');return me;}};
 if(n==='../api/reporterApi')return{getOwnReportReal:async id=>{calls.push(['GET',id]);return{report:{id,evidence:[]}};}};
 if(n==='../offline/database')return{openDatabase:()=>({}),initDatabase:async()=>{},getDraftsByKind:async()=>rows};throw Error(n);
 }});
 return{api:m.exports,calls,setRows:r=>rows=r,setContext:c=>context={...context,...c},setMe:m=>me=m};
}
test('D history metadata requires live same owner/environment and never dispatches POST',async()=>{
 const h=recoveryFixture();h.setRows([{id:'old',payload:{id:'cmd',ownerId:'actor',provenance:{environment:'env',session:'old'},submitRequested:true,commandKey:'secret-key',description:'PII',photos:[{uri:'private'}],targetReportId:'report'}}]);
 const rows=await h.api.listHistoricalReporterCommands();assert.equal(rows.length,1);assert.ok(!JSON.stringify(rows).includes('PII'));assert.ok(!JSON.stringify(rows).includes('secret-key'));
 const result=await h.api.checkHistoricalReporterCommand(rows[0].id);assert.equal(result.status,'BE_RECEIPT_REQUIRED');assert.deepEqual(h.calls.filter(Array.isArray),[['GET','report']]);
 h.setMe({id:'other',role:'REPORTER'});await assert.rejects(h.api.listHistoricalReporterCommands());
});
test('D guest, other actor, environment and unsent-only history stay hidden',async()=>{
 const h=recoveryFixture();const p={id:'cmd',ownerId:'actor',provenance:{environment:'env',session:'old'},submitRequested:true};
 h.setRows([{id:'x',payload:{...p,ownerId:'other'}},{id:'y',payload:{...p,provenance:{environment:'other',session:'old'}}},{id:'z',payload:{...p,submitRequested:false}}]);assert.equal((await h.api.listHistoricalReporterCommands()).length,0);
 h.setContext({ownerId:null});await assert.rejects(h.api.listHistoricalReporterCommands());
});
const reportPage='app/(reporter)/report.tsx',supplementPage='app/(reporter)/report-supplement.tsx';
const fixtureOptions={api:{getOwnReportReal:async()=>({report:{id:'fixture-report',evidence:[]},etag:'"v1"'})},pick:async()=>({canceled:false,assets:[{uri:'content://test-provider/a.jpg',name:'a.jpg',mimeType:'image/jpeg'}]})};
for(const [page,label,button] of [[reportPage,'Mô tả hiện trạng','Gửi phản ánh'],[supplementPage,'Nội dung bổ sung','Gửi bổ sung']]){
 for(const count of [1,9,10,1000,1001])test(`B ${page} ${count} chars validates before Send intent/upload`,async()=>{
  const s=screen(page,fixtureOptions);s.h.login();s.render();await s.flush();s.input(label,'x'.repeat(count));await capturePhoto(s);await s.flush();
  assert.equal(s.reporter.useReporterStore.getState().pendingDraft.photos.length,1);
  let sends=0;s.reporter.useReporterStore.getState().submitPendingDraft=async()=>{sends++;throw {code:'ERR_NETWORK'};};
  await s.press(button);await s.flush();assert.equal(sends,count<=1000?1:0);
  const command=s.reporter.useReporterStore.getState().pendingDraft;
  if(count<=1000){assert.ok(command.submitRequested);assert.equal(command.description.length,count);const before=JSON.stringify(command);s.unmount();assert.equal(JSON.stringify(command),before);}
  else {assert.equal(command.submitRequested,false);assert.equal(command.description.length,count);assert.equal(s.h.calls.length,0);}
 });
 test(`A ${page} blur/return and cold mount restore camera draft without dispatch`,async()=>{
  const s=screen(page,fixtureOptions);s.h.login();s.render();await s.flush();s.input(label,'UNSENT');await capturePhoto(s);await s.flush();s.blur();s.unmount();
  assert.ok(s.h.rows.size>0);const next=screen(page,{...fixtureOptions,rows:s.h.rows});next.h.login();next.render();await next.flush();assert.equal(next.nodes().find(n=>n.props?.label===label).props.value,'UNSENT');assert.equal(next.reporter.useReporterStore.getState().pendingDraft.photos.length,1);assert.equal(next.h.calls.length,0);next.unmount();
 });
}
test('A SEND intent freezes text/key/photos before upload failure and restart, no automatic dispatch',async()=>{
 const h=harness();h.transport.createSession=async()=>{throw Error('network');};h.login();const st=h.load('src/store/reporter.ts').useReporterStore;
 const command=await st.getState().savePendingDraft(cameraDraftFixture({description:'x',photos:[{uri:'a.jpg',fileName:'a.jpg',mediaType:'image/jpeg',capturedAt:'fixture'}],coords:null,submitRequested:true}));
 await assert.rejects(st.getState().submitPendingDraft());
 await assert.rejects(st.getState().savePendingDraft(cameraDraftFixture({description:'changed',photos:command.photos,coords:null,submitRequested:true})),e=>e.code==='draft_locked');
 const other=harness({rows:h.rows});other.login();const restored=await other.load('src/store/reporter.ts').useReporterStore.getState().restoreStartedCommand();assert.equal(restored.commandKey,command.commandKey);assert.equal(restored.description,'x');assert.equal(other.calls.length,0);
});
for(const change of ['unmount','logout','environment'])test('C late Reporter recovery response cannot populate UI after '+change,async()=>{
 const d=deferred();const s=resetScreen(()=>d.promise);const work=s.press('Gửi mã OTP');
 if(change==='unmount')s.unmount();if(change==='logout')s.h.login();if(change==='environment')s.h.client.defaults.baseURL='other';d.resolve();await work;if(change!=='unmount')await s.flush();
 assert.doesNotMatch(JSON.stringify(s.nodes()),/Nếu tài khoản đủ điều kiện/);s.unmount();
});
test('C unknown Reporter recovery never automatically retries even on repeated tap',async()=>{
 let calls=0;const s=resetScreen(async()=>{calls++;throw Error('network');});await s.press('Gửi mã OTP');await s.flush();
 await s.press('Gửi lại sau 60s');assert.equal(calls,1);assert.match(JSON.stringify(s.nodes()),/Chưa xác nhận/);s.unmount();
});
