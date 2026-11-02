const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const scope={require:n=>n==='node:test'?{test:()=>{}}:require(n),console,process,Buffer,__dirname:require('node:path').resolve('tests'),structuredClone,setTimeout,clearTimeout,URL,Uint8Array};
vm.runInNewContext(fs.readFileSync('tests/t06c.test.cjs','utf8')+';globalThis.f={harness,started,finishedForIntake,load};',scope);
const {harness,started,finishedForIntake,load}=scope.f;

const mountedCode=fs.readFileSync('tests/crew-flow-recovery.test.cjs','utf8').split("const {screen:mount,deferred}=")[1].split("for(const stage of ['progress','closeout'])")[0];
function reviewedScreen(stage,rows){
 const code='const {screen:mount,deferred}='+mountedCode.replace('const h=harness();let current=',"const h=harness();h.task.repairContext.status='Reviewed';let current=");
 return new Function('harness','require',code+';return normalScreen;')(harness,require)(stage,rows);
}
test('W1-01 restored history reaches Progress/Complete without authorizing new start after PM review',async()=>{
 for(const stage of ['progress','closeout']){
 const f=reviewedScreen(stage,[{key:'assessment',operation:'assessment',phase:'CONFIRMED',receipt:{data:{readiness:'READY'}}}]);
 f.s.render();await f.s.flush();assert.ok(JSON.stringify(f.s.nodes()).includes('Biên nhận máy chủ đã lưu.'));
 if(stage==='progress')assert.equal(f.s.nodes().find(n=>n.props.title==='Bắt đầu thi công').props.disabled,true);
 assert.equal(f.posts(),0);f.s.unmount();
 }
});
test('W1-07 FIELD submitted is distinct from construction and PM acceptance',()=>{
 const {crewStatusLabel}=load('app/(crew)/tasks.tsx',{'react-native':{Platform:{select:()=>({})},StyleSheet:{create:v=>v}}});
 assert.equal(crewStatusLabel('SUBMITTED'),'Đã gửi hồ sơ');
 assert.equal(crewStatusLabel('InProgress'),'Đang thực hiện');
 assert.equal(crewStatusLabel('SupplementRequired'),'Cần bổ sung');
 assert.equal(crewStatusLabel('Rejected'),'Đã từ chối');
 assert.doesNotMatch(fs.readFileSync('app/(crew)/tasks.tsx','utf8'),/Đã gửi kết quả/);
 assert.match(fs.readFileSync('app/(crew)/wo-detail.tsx','utf8'),/Đã gửi hồ sơ đo kiểm/);
});
async function confirmed(op){
 const h=op==='assessment'||op==='start'?harness():op==='finish'?await started():await finishedForIntake();
 const j=await h.runtime.journal();
 if(op==='start'){const a=await j.prepare(h.command());await h.workflow.dispatchRepair(h.identity,a.key,h.runtime);}
 const c=op==='assessment'?await j.prepare(h.command()):await h.workflow[{start:'prepareRepairStart',finish:'prepareRepairFinish',attempt:'prepareRepairAttempt'}[op]](h.identity,h.runtime);
 await h.workflow.dispatchRepair(h.identity,c.key,h.runtime);return h;
}
for(const op of ['assessment','start','finish','attempt'])for(const state of ['Reviewed','Confirmed','CorrectionRequired'])test(`W1-01 ${op} history survives ${state} with immutable journal and no writes`,async()=>{
 const h=await confirmed(op),before=JSON.stringify(h.raw.prepare('SELECT * FROM local_draft').all());
 h.task.repairContext.status=state;h.task.repairContext.itemVersion='AAAAAAAAAAQ=';
 const rows=await h.workflow.readRepairHistory(h.identity,h.runtime);
 assert.equal(rows.at(-1).phase,'CONFIRMED');assert.equal(rows.at(-1).operation,op);
 assert.equal(JSON.stringify(h.raw.prepare('SELECT * FROM local_draft').all()),before);
 await assert.rejects(h.workflow.prepareRepairAssessment(h.identity,h.draft(),h.runtime));h.raw.close();
});
for(const change of ['binding','assignment','actor','environment','scope','revoked','receipt','network','403','cancelled'])test(`W1-01 history fails closed for ${change} without erasing journal`,async()=>{
 const h=await confirmed('start'),before=JSON.stringify(h.raw.prepare('SELECT * FROM local_draft').all());
 if(change==='binding')h.task.repairContext.bindingId=require('node:crypto').randomUUID();
 if(change==='assignment')h.task.assignmentId=require('node:crypto').randomUUID();
 if(change==='revoked')h.task.repairContext=null;
 if(change==='cancelled')h.task.repairContext.status='Cancelled';
 if(['actor','environment','scope'].includes(change))h.runtime.current=()=>({...h.identity,[change]:'changed'});
 if(change==='receipt'){const j=await h.runtime.journal(),history=j.history.bind(j);h.runtime.journal=async()=>({...j,history:async()=>{const rows=await history();rows.at(-1).receipt.data.itemId=require('node:crypto').randomUUID();return rows;}});}
 if(['network','403'].includes(change))h.runtime.api.getFieldInspectionTaskDetailReal=async()=>{throw change==='403'?{response:{status:403}}:Error('network');};
 await assert.rejects(h.workflow.readRepairHistory(h.identity,h.runtime));assert.equal(JSON.stringify(h.raw.prepare('SELECT * FROM local_draft').all()),before);h.raw.close();
});
test('W1-01 UNKNOWN remains pending across read with exact key/body/version',async()=>{
 const h=harness(),j=await h.runtime.journal(),c=await j.prepare(h.command());h.fail(Error('timeout'));
 await assert.rejects(h.workflow.dispatchRepair(h.identity,c.key,h.runtime));
 const before=JSON.stringify(h.raw.prepare('SELECT * FROM local_draft').all());
 h.task.repairContext.status='Reviewed';h.task.repairContext.itemVersion='AAAAAAAAAAQ=';
 assert.equal((await h.workflow.readRepairHistory(h.identity,h.runtime))[0].phase,'PENDING');
 assert.equal(JSON.stringify(h.raw.prepare('SELECT * FROM local_draft').all()),before);assert.equal(h.posts(),1);h.raw.close();
});

test('W1-01 disk reopen after PM review restores immutable CONFIRMED receipt without POST',async()=>{
 const file=require('node:path').resolve('.cache','wave1-restart-'+require('node:crypto').randomUUID()+'.db');
 const h=harness({file}),j=await h.runtime.journal(),c=await j.prepare(h.command());
 await h.workflow.dispatchRepair(h.identity,c.key,h.runtime);
 const before=JSON.stringify(h.raw.prepare('SELECT * FROM local_draft').all());
 h.reopen();h.task.repairContext.status='Reviewed';h.task.repairContext.itemVersion='AAAAAAAAAAQ=';
 assert.equal((await h.workflow.readRepairHistory(h.identity,h.runtime))[0].phase,'CONFIRMED');
 assert.equal(JSON.stringify(h.raw.prepare('SELECT * FROM local_draft').all()),before);assert.equal(h.posts(),1);h.raw.close();
});
