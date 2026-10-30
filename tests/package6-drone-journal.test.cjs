const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {DatabaseSync}=require('node:sqlite');const {randomUUID}=require('node:crypto');
const id=n=>`${String(n).padStart(8,'0')}-1111-4111-8111-111111111111`;
function fixture(){
 const dir=fs.mkdtempSync('.cache/drone-journal-'),file=dir+'/journal.db';let disk;
 const open=()=>{disk=new DatabaseSync(file);disk.exec('CREATE TABLE IF NOT EXISTS local_draft(id TEXT PRIMARY KEY,kind TEXT,payload TEXT,created_at TEXT,updated_at TEXT)');};open();
 const db={getAllAsync:async(sql,...args)=>disk.prepare(sql).all(...args),runAsync:async(sql,...args)=>disk.prepare(sql).run(...args),withExclusiveTransactionAsync:async fn=>{disk.exec('BEGIN');try{await fn(db);disk.exec('COMMIT');}catch(e){disk.exec('ROLLBACK');throw e;}}};
 let state={user:{id:id(1),role_code:'DRONE_OPERATOR'},status:'AUTHENTICATED',token:'sid-A'},env='https://fixture.test';const listeners=[];
 let task={id:id(2),projectId:id(3),operatorId:id(1),scope:[{routeVersionId:id(4),segmentSetId:id(5),segmentIds:[id(6)],targetBand:'SURFACE'}],status:'NEW_ASSIGNED',version:'AAAAAAAAAAE='};
 let send=async()=>({data:{...task,status:'ACCEPTED',version:'AAAAAAAAAAI='},headers:{etag:'"AAAAAAAAAAI="'}}),reads=0;const posts=[];
 const client={defaults:{get baseURL(){return env;}},post:async(path,body,config)=>{const saved=disk.prepare("SELECT payload FROM local_draft WHERE kind='DRONE_TASK_COMMAND'").all();assert.equal(saved.length,1,'command saved before POST');posts.push({path,body,config});return send();}};
 const deps={'../offline/database':{openDatabase:()=>db,initDatabase:async()=>{}},'../store/auth':{useAuthStore:{getState:()=>state,subscribe:f=>{listeners.push(f);return()=>listeners.splice(listeners.indexOf(f),1);}}},'./authApi':{passwordSessionIdentity:token=>token?JSON.stringify([state.user?.id,token]):null},'./client':{apiClient:client},'expo-crypto':{randomUUID},'./droneApi':{getOperatorSurveyTaskDetailReal:async()=>{reads++;return {data:task,etag:`"${task.version}"`};}}};
 const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/droneTaskJournal.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:mod,exports:mod.exports,require:n=>{if(!deps[n])throw Error(n);return deps[n];},Date});
 return {api:mod.exports,posts,db,file,task,send:f=>send=f,change:patch=>{state={...state,...patch};listeners.slice().forEach(f=>f());},env:v=>env=v,reopen:()=>{disk.close();open();},rows:()=>disk.prepare('SELECT * FROM local_draft ORDER BY id').all()};
}
test('Drone task command is durable before POST, exact on explicit replay after reopen/relogin',async()=>{
 const f=fixture(),r=await f.api.openDroneTaskJournal(id(2));const c=await r.prepare('accept');
 f.send(async()=>{throw Error('timeout');});await assert.rejects(r.dispatch(c.key,true));const original=f.rows().find(x=>x.kind==='DRONE_TASK_COMMAND').payload;r.close();f.reopen();f.change({token:'sid-B'});
 const next=await f.api.openDroneTaskJournal(id(2));assert.equal((await next.read()).phase,'UNKNOWN_OUTCOME');
 f.send(async()=>({data:{...f.task,status:'ACCEPTED',version:'AAAAAAAAAAI='},headers:{etag:'"AAAAAAAAAAI="'}}));
 await next.dispatch(c.key,true);assert.deepEqual(f.posts[0],f.posts[1]);assert.equal(f.rows().find(x=>x.kind==='DRONE_TASK_COMMAND').payload,original);assert.equal((await next.read()).phase,'RECEIPT');next.close();
});
test('Drone requires explicit confirmation and blocks new key or changed intent while pending',async()=>{
 const f=fixture(),r=await f.api.openDroneTaskJournal(id(2)),c=await r.prepare('decline','Cannot access');await assert.rejects(r.dispatch(c.key,false));assert.equal(f.posts.length,0);await assert.rejects(r.prepare('accept'));await assert.rejects(r.prepare('decline','Different'));r.close();
});
test('Drone account/environment change and late response cannot acknowledge a command',async()=>{
 for(const change of [f=>f.change({token:'sid-B'}),f=>f.env('https://other.test'),f=>f.change({user:{id:id(8),role_code:'DRONE_OPERATOR'}})]){
  const f=fixture(),r=await f.api.openDroneTaskJournal(id(2)),c=await r.prepare('accept');f.send(async()=>{change(f);return {data:{...f.task,status:'ACCEPTED',version:'AAAAAAAAAAI='},headers:{etag:'"AAAAAAAAAAI="'}};});await assert.rejects(r.dispatch(c.key,true));assert.ok(!f.rows().some(x=>x.payload.includes('RECEIPT')));r.close();
 }
});
test('Drone wrong owner, stale/malformed version, invalid scope and non-new task cannot prepare',async()=>{
 for(const patch of [{operatorId:id(7)},{version:'fake'}, {scope:[]},{status:'SUBMITTED'}]){const f=fixture();Object.assign(f.task,patch);const r=await f.api.openDroneTaskJournal(id(2));await assert.rejects(r.prepare('accept'));assert.equal(f.posts.length,0);r.close();}
});
test('Drone mismatched receipt and HTTP conflict stay unresolved and retain command',async()=>{
 for(const result of [async()=>({data:{id:id(8)},headers:{etag:'"AAAAAAAAAAI="'}}),async()=>{throw {response:{status:412}};}]){const f=fixture(),r=await f.api.openDroneTaskJournal(id(2)),c=await r.prepare('accept');f.send(result);await assert.rejects(r.dispatch(c.key,true));assert.equal((await r.read()).phase,'UNKNOWN_OUTCOME');await assert.rejects(r.prepare('accept'));r.close();}
});
const {screen,deferred}=require('./helpers/roadfe-screen.cjs');
const capture=()=>()=>true;
function panel(runtime){return screen('src/components/drone/DroneTaskCommandPanel.tsx',{exportName:'DroneTaskCommandPanel',props:{taskId:id(2),operation:'accept'},modules:{'../../api/droneTaskJournal':{openDroneTaskJournal:async()=>runtime},'../../hooks/useOperatorReadScope':{useOperatorReadScope:()=>({key:'scope',capture})},'../Button':{Button:'Button'},'../Card':{Card:'Card'},'../../design-tokens':{typography:{},spacing:{},colors:{}}}});}
test('Drone command panel saves intent first, sends only after explicit confirmation',async()=>{
 let sends=0,saved=null;const runtime={close(){},read:async()=>saved,prepare:async()=>{saved={command:{key:id(9),operation:'accept',payload:{}},phase:'PREPARED'};return saved.command;},dispatch:async(key,confirmed)=>{assert.equal(key,id(9));assert.equal(confirmed,true);sends++;saved={...saved,phase:'UNKNOWN_OUTCOME'};},readCurrent:async()=>({status:'NEW_ASSIGNED'})};
 const s=panel(runtime);s.render();await s.flush();await s.press('Chuẩn bị tiếp nhận nhiệm vụ');await s.flush();assert.equal(sends,0);
 await s.press('Xác nhận gửi lệnh đã lưu');await s.flush();assert.equal(sends,1);s.unmount();
});

test('Drone PREPARED survives crash/reopen without automatic dispatch; read is not receipt',async()=>{
 const f=fixture(),r=await f.api.openDroneTaskJournal(id(2)),c=await r.prepare('decline','Weather');r.close();f.reopen();
 const next=await f.api.openDroneTaskJournal(id(2));assert.equal((await next.read()).phase,'PREPARED');
 await next.readCurrent();assert.equal((await next.read()).phase,'PREPARED');assert.equal(f.posts.length,0);
 f.send(async()=>({data:{...f.task,status:'REJECTED',version:'AAAAAAAAAAI='},headers:{etag:'"AAAAAAAAAAI="'}}));
 await next.dispatch(c.key,true);const original=f.rows().find(x=>x.kind==='DRONE_TASK_COMMAND').payload;
 await assert.rejects(next.dispatch(c.key,true));assert.equal(f.posts.length,1);next.close();f.reopen();
 const last=await f.api.openDroneTaskJournal(id(2));assert.equal((await last.read()).phase,'RECEIPT');assert.equal(f.rows().find(x=>x.kind==='DRONE_TASK_COMMAND').payload,original);last.close();
});

test('Drone recovery discovery isolates actor/environment and validates retained outcomes',async()=>{
 const f=fixture(),r=await f.api.openDroneTaskJournal(id(2));await r.prepare('accept');r.close();
 let rows=await f.api.listDroneTaskCommands();assert.equal(rows.length,1);assert.equal(rows[0].taskId,id(2));
 f.env('https://other.test');assert.equal((await f.api.listDroneTaskCommands()).length,0);f.env('https://fixture.test');
 f.change({user:{id:id(8),role_code:'DRONE_OPERATOR'}});assert.equal((await f.api.listDroneTaskCommands()).length,0);
 f.change({user:{id:id(1),role_code:'DRONE_OPERATOR'},token:'sid-B'});assert.equal((await f.api.listDroneTaskCommands()).length,1);
 await f.db.runAsync("UPDATE local_draft SET payload = ? WHERE kind='DRONE_TASK_OUTCOME'",JSON.stringify({phase:'RECEIPT'}));
 await assert.rejects(f.api.listDroneTaskCommands());assert.equal(f.rows().length,2,'corrupt state is retained, not deleted');
});

test('Drone runtime rejects closed/actor-bounced instances and simultaneous changed intents',async()=>{
 const f=fixture(),r=await f.api.openDroneTaskJournal(id(2));
 const pending=r.prepare('accept');await assert.rejects(r.prepare('decline','Reason'));await pending;
 f.change({user:{id:id(8),role_code:'DRONE_OPERATOR'}});f.change({user:{id:id(1),role_code:'DRONE_OPERATOR'}});
 await assert.rejects(r.read());r.close();await assert.rejects(r.read());assert.equal(f.posts.length,0);
});

test('Drone panel drops a late journal read on unmount and never sends on mount',async()=>{
 const d=deferred();let closed=0,sends=0;
 const runtime={close(){closed++;},read:()=>d.promise,dispatch:()=>{sends++;}};
 const s=panel(runtime);s.render();await new Promise(r=>setImmediate(r));s.unmount();
 d.resolve({command:{key:id(9),payload:{reason:'private'},operation:'decline'},phase:'UNKNOWN_OUTCOME'});
 await new Promise(r=>setImmediate(r));assert.ok(closed>=1);assert.equal(sends,0);
});

test('Drone journal and shared panel runtime import graph has no cycle',()=>{
 const path=require('node:path'),edges=new Map();
 function visit(file){
  if(edges.has(file))return;
  const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}}).outputText;
  const deps=[...js.matchAll(/require\(["']([^"']+)["']\)/g)].map(m=>m[1]).filter(p=>p.startsWith('.')).map(p=>{
   const base=path.resolve(path.dirname(file),p);return [base+'.ts',base+'.tsx',path.join(base,'index.ts')].find(p=>fs.existsSync(p));
  }).filter(Boolean);edges.set(file,deps);deps.forEach(visit);
 }
 visit(path.resolve('src/components/drone/DroneTaskCommandPanel.tsx'));
  for (const file of ['app/(drone)/log.tsx','app/(drone)/sync.tsx','app/(drone)/upload.tsx','src/components/drone/DroneDatasetReadbackPanel.tsx']) visit(path.resolve(file));
 const done=new Set(),stack=new Set();
 function dfs(file){assert.ok(!stack.has(file),'runtime cycle at '+file);if(done.has(file))return;stack.add(file);(edges.get(file)||[]).forEach(dfs);stack.delete(file);done.add(file);}
 edges.forEach((_,file)=>dfs(file));
});

test('Drone command panel can reopen failed storage without dispatch or losing saved command',async()=>{
 let opens=0,sends=0;
 const s=screen('src/components/drone/DroneTaskCommandPanel.tsx',{exportName:'DroneTaskCommandPanel',props:{taskId:id(2),operation:'accept'},modules:{
 '../../api/droneTaskJournal':{openDroneTaskJournal:async()=>{if(++opens===1)throw Error('storage');return {close(){},read:async()=>({command:{key:id(9),operation:'accept',payload:{}},phase:'UNKNOWN_OUTCOME'}),dispatch:async()=>sends++};}},
 '../../hooks/useOperatorReadScope':{useOperatorReadScope:()=>({key:'scope',capture})},'../Button':{Button:'Button'},'../Card':{Card:'Card'},'../../design-tokens':{typography:{},spacing:{},colors:{}}
 }});
 s.render();await s.flush();await s.press('Thử mở lại lịch sử yêu cầu');await s.flush();assert.equal(opens,2);assert.equal(sends,0);assert.ok(s.nodes().some(n=>n.type==='Button'&&n.props.title==='Xác nhận gửi lệnh đã lưu'));s.unmount();
});

test('Drone HTTP failures never issue a new key or infer success from a task GET',async()=>{
 for(const status of [400,401,403,404,409,412,422,428,429,500,503]) {
  const f=fixture(),r=await f.api.openDroneTaskJournal(id(2)),c=await r.prepare('accept');
  const before=f.rows().find(row=>row.kind==='DRONE_TASK_COMMAND').payload;
  f.send(async()=>{throw {response:{status}};});await assert.rejects(r.dispatch(c.key,true));
  await r.readCurrent();assert.equal((await r.read()).phase,'UNKNOWN_OUTCOME');await assert.rejects(r.prepare('accept'));
  assert.equal(f.rows().find(row=>row.kind==='DRONE_TASK_COMMAND').payload,before);assert.equal(f.posts.length,1);r.close();
 }
});

test('Drone recovery list links owned stored tasks without UUID input or dispatch',async()=>{
 let calls=0;
 const s=screen('src/components/drone/DroneTaskCommandPanel.tsx',{exportName:'DroneTaskRecoveryList',modules:{
  '../../api/droneTaskJournal':{listDroneTaskCommands:async()=>{calls++;return [{taskId:id(2),operation:'decline',phase:'UNKNOWN_OUTCOME'}];}},
  '../../hooks/useOperatorReadScope':{useOperatorReadScope:()=>({key:'scope',capture})},'../Button':{Button:'Button'},'../Card':{Card:'Card'},'../../design-tokens':{typography:{},spacing:{},colors:{}}
 }});
 s.render();await s.flush();assert.equal(calls,1);
 const link=s.nodes().find(n=>n.type==='Button'&&n.props.title.includes('Chưa rõ kết quả'));assert.ok(link);
 link.props.onPress();assert.deepEqual(s.nav,[`/(drone)/request-detail?taskId=${id(2)}`]);
 assert.ok(!s.nodes().some(n=>n.type==='TextInput'));s.unmount();
});

test('Drone panel locks double confirmation while original POST is unresolved',async()=>{
 const d=deferred();let sends=0;
 const saved={command:{key:id(9),operation:'accept',payload:{}},phase:'UNKNOWN_OUTCOME'};
 const s=panel({close(){},read:async()=>saved,dispatch:async()=>{sends++;await d.promise;}});
 s.render();await s.flush();const first=s.press('Xác nhận gửi lệnh đã lưu');await s.press('Xác nhận gửi lệnh đã lưu');assert.equal(sends,1);
 d.resolve();await first;await s.flush();s.unmount();
});

test('Drone separate runtimes cannot replay while the original transport is still running',async()=>{
 const f=fixture(),first=await f.api.openDroneTaskJournal(id(2)),c=await first.prepare('accept');
 const second=await f.api.openDroneTaskJournal(id(2)),d=deferred();let started;
 const sending=new Promise(resolve=>{started=resolve;});
 f.send(async()=>{if(f.posts.length > 1) throw Error('duplicate_transport');started();return d.promise;});
 const pending=first.dispatch(c.key,true);await sending;
 // Closing a screen must not release a still-running transport lock.
 first.close();
 await assert.rejects(second.dispatch(c.key,true),/drone_command_busy/);
 assert.equal(f.posts.length,1);
 d.resolve({data:{...f.task,status:'ACCEPTED',version:'AAAAAAAAAAI='},headers:{etag:'"AAAAAAAAAAI="'}});
 await assert.rejects(pending,/drone_session_changed/);
 assert.equal((await second.read()).phase,'UNKNOWN_OUTCOME');
 f.send(async()=>({data:{...f.task,status:'ACCEPTED',version:'AAAAAAAAAAI='},headers:{etag:'"AAAAAAAAAAI="'}}));
 await second.dispatch(c.key,true);assert.equal(f.posts.length,2);assert.deepEqual(f.posts[0],f.posts[1]);second.close();
});
