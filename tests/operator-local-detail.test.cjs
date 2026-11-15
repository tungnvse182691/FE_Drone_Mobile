const {test}=require('node:test'),assert=require('node:assert/strict');
const {screen,deferred}=require('./helpers/roadfe-screen.cjs');
function fixture(){
 const listeners=new Set(),alerts=[],saved=[];let back,closed=0,returned=0;
 const gate=deferred();let persist=async value=>saved.push(value);
 const s=screen('src/components/OperatorLocalTasks.tsx',{expose:'OperatorLocalTaskDetail',exportName:'OperatorLocalTaskDetail',props:{task:{id:'task',cachedAt:'2026-11-15T00:00:00Z'},onBack:()=>returned++},
 moduleFactories:{'react-native':({modules})=>({...modules['react-native'],BackHandler:{addEventListener:(_,fn)=>{back=fn;return{remove(){}};}},Alert:{alert:(...args)=>alerts.push(args)}})},
 modules:{'./Button':{Button:'Button'},'../store/auth':{useAuthStore:{getState:()=>({operatorLocalReadScope:async()=>'scope'}),subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);}}},
 '../offline/operatorLocalTasks':{loadLocalOperatorWork:async()=>null},'../api/operatorUploadDraft':{openLocalOperatorUploadDraft:async()=>({read:async()=>({recordedAt:'old',timeOffset:'0',videoKey:'saved-video',telemetryKey:null}),save:value=>persist(value),close:()=>closed++})},
 '../api/operator-task-view':{operatorTaskDisplayCode:id=>id,operatorTaskStatusLabel:s=>s}}});
 return{s,saved,alerts,gate,edit(value){s.nodes().find(n=>n.props?.accessibilityLabel==='Thời gian ghi hình ngoại tuyến').props.onChangeText(value);s.render();},change(){listeners.forEach(fn=>fn());},pending(){persist=()=>gate.promise;},back:()=>back(),returned:()=>returned,closed:()=>closed};
}
test('cold local detail edits saved metadata, preserves file references and warns before discarding',async()=>{
 const f=fixture();f.s.render();await f.s.flush();f.edit('new');f.back();assert.equal(f.alerts.length,1);assert.equal(f.returned(),0);
 await f.s.press('Lưu nháp trên máy');await f.s.flush();assert.equal(f.saved[0].recordedAt,'new');assert.equal(f.saved[0].videoKey,'saved-video');
 f.back();assert.equal(f.returned(),1);f.s.unmount();assert.equal(f.closed(),1);
});
test('local save is single-flight and late account change cannot show a successful save',async()=>{
 const f=fixture();f.s.render();await f.s.flush();f.edit('new');f.pending();
 const first=f.s.press('Lưu nháp trên máy');const second=f.s.press('Lưu nháp trên máy');
 f.change();f.gate.resolve({});await Promise.all([first,second]);await f.s.flush();
 assert.ok(!f.s.nodes().some(n=>n.props?.children?.includes('Đã lưu nháp trên máy. Chưa gửi.')));f.s.unmount();
});

