const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs');
const prefix=fs.readFileSync('tests/t06b.test.cjs','utf8').split("test('T06B journal")[0];
const {harness,ids,version,next}=new Function('require',prefix+';return {harness,ids,version,next}')(require);
function relogin(h){h.switch();const i=h.runtime.current();h.runtime.journal=identity=>h.journal.openRepairJournal(identity, h.runtime.current);return i;}
// Expose production journal through the existing SQLite harness, without replacing its implementation.
function fixture(){const h=harness();const ts=require('typescript'),vm=require('node:vm'),module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/crewRepairDraft.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports,require:n=>({'./crewApi':h.api,'../offline/database':{openDatabase:()=>h.port,initDatabase:async()=>{}}}[n]??{})});h.journal=module.exports;return h;}
for(const phase of ['PREPARED','PENDING','ACKNOWLEDGED','CONFIRMED','REJECTED'])test('HARDEN recovery immutable original '+phase,async()=>{
 const h=fixture(),j=await h.runtime.journal(),c=await j.prepare(h.command());
 if(phase!=='PREPARED')await j.transition(c.key,'PENDING');
 if(['ACKNOWLEDGED','CONFIRMED'].includes(phase)){
 const r=await h.runtime.api.submitRepairAssessmentReal(c.identity.projectId,c.identity.packageId,c.identity.itemId,c.identity.taskId,c.payload,c.ifMatch,c.key);
 await j.transition(c.key,'ACKNOWLEDGED',{receipt:{data:r.data,itemVersion:next}});if(phase==='CONFIRMED')await j.transition(c.key,'CONFIRMED');
 } else if(phase==='REJECTED')await j.transition(c.key,'REJECTED',{rejection:{status:401,code:'expired'}});
 const original=h.raw.prepare('SELECT payload FROM local_draft WHERE kind=?').get('T06A_REPAIR_COMMAND').payload;
 const i=relogin(h),history=await h.workflow.readRepairHistory(i,h.runtime);
 assert.equal(history.length,1);assert.equal(history[0].identity.scope,c.identity.scope);
 if(phase!=='CONFIRMED')assert.equal((await h.workflow.dispatchRepair(i,c.key,h.runtime)).phase,'CONFIRMED');
 assert.equal(h.raw.prepare('SELECT payload FROM local_draft WHERE kind=?').get('T06A_REPAIR_COMMAND').payload,original);
 if(phase==='CONFIRMED'){const start=await h.workflow.prepareRepairStart(i,h.runtime);assert.equal(start.payload.assessmentId,ids.assessment);assert.equal(start.identity.scope,i.scope);}
});
test('HARDEN 401 remains unresolved without terminal business rejection',async()=>{const h=fixture(),j=await h.runtime.journal(),c=await j.prepare(h.command());h.fail({response:{status:401}});await assert.rejects(h.workflow.dispatchRepair(h.identity,c.key,h.runtime));assert.equal((await j.read(c.key)).phase,'PENDING');});
const path=require('node:path'),{DatabaseSync}=require('node:sqlite');
fs.mkdirSync('.cache',{recursive:true});const diskFolder=fs.mkdtempSync(path.resolve('.cache/harden02-repair-'));
function diskFixture(file){
 const h=fixture();let db=new DatabaseSync(file);db.exec('CREATE TABLE IF NOT EXISTS local_draft(id TEXT PRIMARY KEY,kind TEXT,payload TEXT,created_at TEXT,updated_at TEXT)');
 h.port.getAllAsync=async(s,...a)=>db.prepare(s).all(...a);h.port.runAsync=async(s,...a)=>db.prepare(s).run(...a);
 h.port.withExclusiveTransactionAsync=async f=>{db.exec('BEGIN');try{await f(h.port);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}};
 h.originals=()=>db.prepare('SELECT * FROM local_draft WHERE kind=?').all('T06A_REPAIR_COMMAND');
 h.reopen=()=>{db.close();db=new DatabaseSync(file);};h.close=()=>{db.close();h.raw.close();};return h;
}
for(const phase of ['PREPARED','PENDING','ACKNOWLEDGED','CONFIRMED','REJECTED'])test('HARDEN disk close/reopen and new sid preserves original '+phase,async()=>{
 const h=diskFixture(path.join(diskFolder,phase+'.db')),j=await h.runtime.journal(),c=await j.prepare(h.command());
 if(phase!=='PREPARED')await j.transition(c.key,'PENDING');
 if(['ACKNOWLEDGED','CONFIRMED'].includes(phase)){const r=await h.runtime.api.submitRepairAssessmentReal(c.identity.projectId,c.identity.packageId,c.identity.itemId,c.identity.taskId,c.payload,c.ifMatch,c.key);await j.transition(c.key,'ACKNOWLEDGED',{receipt:{data:r.data,itemVersion:next}});if(phase==='CONFIRMED')await j.transition(c.key,'CONFIRMED');}
 if(phase==='REJECTED')await j.transition(c.key,'REJECTED',{rejection:{status:401,code:'expired'}});
 const bytes=JSON.stringify(h.originals());h.reopen();const i=relogin(h);
 const history=await h.workflow.readRepairHistory(i,h.runtime);assert.equal(history.length,1);assert.equal(h.posts(),['ACKNOWLEDGED','CONFIRMED'].includes(phase)?1:0);
 if(phase!=='CONFIRMED')await h.workflow.dispatchRepair(i,c.key,h.runtime);
 assert.equal(JSON.stringify(h.originals()),bytes);h.reopen();assert.equal((await h.workflow.readRepairHistory(i,h.runtime))[0].phase,'CONFIRMED');assert.equal(JSON.stringify(h.originals()),bytes);h.close();
});
for(const [name,change] of [
 ['actor',h=>h.runtime.current=()=>({...h.identity,actor:ids.first})],['environment',h=>h.runtime.current=()=>({...h.identity,environment:'http://other/api'})],
 ['project',h=>h.runtime.current=()=>({...h.identity,projectId:ids.first})],['task',h=>h.runtime.current=()=>({...h.identity,taskId:ids.first})],['logout/role',h=>h.runtime.current=()=>null],
 ['binding',h=>h.task.repairContext.bindingId=ids.first],['assignment revoked',h=>h.task.assignmentId=null],['owner revoked',h=>h.task.assignedToUserId=ids.first]
])test('HARDEN relogin recovery rejects '+name,async()=>{const h=fixture(),j=await h.runtime.journal(),c=await j.prepare(h.command()),i=relogin(h);change(h);await assert.rejects(h.workflow.readRepairHistory(i,h.runtime));await assert.rejects(h.workflow.dispatchRepair(i,c.key,h.runtime));assert.equal(h.posts(),0);});
for(const status of [403,409,412])test('HARDEN old sid rejection '+status+' retains original bytes',async()=>{const h=fixture(),j=await h.runtime.journal(),c=await j.prepare(h.command());const bytes=h.raw.prepare('SELECT payload FROM local_draft').get().payload;const i=relogin(h);h.fail({response:{status}});await assert.rejects(h.workflow.dispatchRepair(i,c.key,h.runtime));assert.equal((await h.workflow.readRepairHistory(i,h.runtime))[0].phase,'REJECTED');assert.equal(h.raw.prepare('SELECT payload FROM local_draft WHERE kind=?').get('T06A_REPAIR_COMMAND').payload,bytes);});
test('HARDEN old sid double tap and late logout response preserve pending recovery',async()=>{const h=fixture(),j=await h.runtime.journal(),c=await j.prepare(h.command()),i=relogin(h);let release;const wait=new Promise(r=>release=r),send=h.runtime.api.submitRepairAssessmentReal;h.runtime.api.submitRepairAssessmentReal=async(...a)=>{await wait;const r=await send(...a);h.runtime.current=()=>null;return r;};const first=h.workflow.dispatchRepair(i,c.key,h.runtime);await assert.rejects(h.workflow.dispatchRepair(i,c.key,h.runtime),/repair_busy/);release();await assert.rejects(first);h.runtime.current=()=>i;assert.equal((await h.workflow.readRepairHistory(i,h.runtime))[0].phase,'PENDING');assert.equal(h.posts(),1);});
test('HARDEN corrupt recovery overlay is not accepted as receipt',async()=>{const h=fixture(),j=await h.runtime.journal(),c=await j.prepare(h.command()),i=relogin(h);await h.workflow.dispatchRepair(i,c.key,h.runtime);h.raw.prepare('UPDATE local_draft SET payload=? WHERE kind=?').run('{}','HARDEN02_REPAIR_RECOVERY');await assert.rejects(h.workflow.readRepairHistory(i,h.runtime),/repair_journal_invalid/);});
const {screen}=require('./helpers/roadfe-screen.cjs');
function recoveryUI(){
 const h=fixture(),identity={...h.identity},scope=identity.scope;let current=identity,posts=0;
 const row={...h.command(),key:'persisted-command',phase:'PENDING'};
 const journalModule={currentRepairIdentity:()=>current,sameRepairIdentity:(a,b)=>!!b&&JSON.stringify(a)===JSON.stringify(b)};
 const s=screen('app/(crew)/wo-detail.tsx',{exportName:'NormalRepairBootstrap',props:{task:{id:identity.taskId,projectId:identity.projectId,detail:h.task,etag:'"'+version+'"'}},modules:{
  'expo-crypto':{randomUUID:require('node:crypto').randomUUID},'../../src/offline/database':{},'./tasks':{useCrewIdentity:()=>({scope:current?.scope,user:{id:current?.actor}})},
  '../../src/hooks/useRepairBootstrap':{useRepairBootstrap:()=>({status:'ready',repairContext:h.task.repairContext,reload:async()=>{}})},
  '../../src/api/crewApi':h.api,'../../src/api/crewRepairDraft':journalModule,
  '../../src/api/crewRepairWorkflow':{readRepairHistory:async()=>[row],readRepairFieldDraft:async()=>{throw Error('old FIELD retained');},repairErrorMessage:e=>e.message,dispatchRepair:async()=>{posts++;return {...row,phase:'CONFIRMED'};}},
  '../../src/api/crewFieldDraft':{},'../../src/components/Card':{Card:'Card'},'../../src/components/crew/CrewTaskFacts':{CrewTaskFacts:'CrewTaskFacts'},
 }});return {s,posts:()=>posts,switch:()=>current=null};
}
test('HARDEN mounted recovery retains history when old FIELD is unavailable; no POST until warning confirmation',async()=>{
 const f=recoveryUI();f.s.render();await f.s.flush();assert.equal(f.posts(),0);
 assert.ok(f.s.nodes().some(n=>n.type==='Button'&&n.props.title==='Đối soát / replay lệnh đã lưu'));
 f.s.press('Đối soát / replay lệnh đã lưu');f.s.render();assert.equal(f.posts(),0);
 assert.ok(JSON.stringify(f.s.nodes()).includes('thực thi lần đầu'));
 const confirm=f.s.nodes().find(n=>n.type==='Button'&&n.props.title==='Xác nhận đối soát lệnh gốc').props.onPress;
 confirm();confirm();await f.s.flush();assert.equal(f.posts(),1);f.s.unmount();
});
test('HARDEN account switch after replay warning hides prior history and cannot dispatch',async()=>{
 const f=recoveryUI();f.s.render();await f.s.flush();f.s.press('Đối soát / replay lệnh đã lưu');f.s.render();
 const confirm=f.s.nodes().find(n=>n.type==='Button'&&n.props.title==='Xác nhận đối soát lệnh gốc').props.onPress;
 f.switch();f.s.render();await confirm();assert.equal(f.posts(),0);assert.ok(!f.s.nodes().some(n=>n.props?.title==='Xác nhận đối soát lệnh gốc'));f.s.unmount();
});
test('HARDEN corrupt journal storage ID cannot silently transition a different row',async()=>{const h=fixture(),j=await h.runtime.journal(),c=await j.prepare(h.command());h.raw.prepare('UPDATE local_draft SET id=id||?').run(':corrupt');const i=relogin(h);await assert.rejects(h.workflow.readRepairHistory(i,h.runtime),/repair_journal_invalid/);assert.equal(h.posts(),0);});
