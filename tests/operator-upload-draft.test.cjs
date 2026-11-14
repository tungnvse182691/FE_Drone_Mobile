const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {DatabaseSync}=require('node:sqlite');
const task='12345678-1111-4111-8111-111111111111';
function fixture(){
 const disk=new DatabaseSync(':memory:');disk.exec('CREATE TABLE local_draft(id TEXT PRIMARY KEY,kind TEXT,payload TEXT,created_at TEXT,updated_at TEXT)');
 let actor='actor-A',session='session-A',environment='https://fixture.test';const listeners=new Set();
 const db={runAsync:async(sql,...a)=>disk.prepare(sql).run(...a),getFirstAsync:async(sql,...a)=>disk.prepare(sql).get(...a)};
 const deps={'../offline/database':{openDatabase:()=>db,initDatabase:async()=>{}},'../hooks/useOperatorReadScope':{operatorReadScope:()=>session?JSON.stringify([environment,session]):null},'../store/auth':{useAuthStore:{getState:()=>({user:{id:actor}}),subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);}}},'./client':{apiClient:{defaults:{get baseURL(){return environment;}}}}};
 const load=()=>{const mod={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/operatorUploadDraft.ts','utf8'),{compilerOptions:{module:1}}).outputText,{module:mod,exports:mod.exports,require:n=>deps[n],Date});return mod.exports;};
 return {load,disk,change:(a=actor,s=session,e=environment)=>{actor=a;session=s;environment=e;listeners.forEach(fn=>fn());}};
}
const draft={recordedAt:'2026-11-14 08:30',timeOffset:'0',videoKey:task,telemetryKey:null};
test('Operator upload draft persists input and local file references across runtime and same-account relogin',async()=>{
 const f=fixture(),r=await f.load().openOperatorUploadDraft(task);const saved=await r.save(draft);r.close();
 f.change('actor-A','session-B');const next=await f.load().openOperatorUploadDraft(task),read=await next.read();
 assert.equal(read.recordedAt,draft.recordedAt);assert.equal(read.videoKey,task);assert.equal(read.savedAt,saved.savedAt);assert.ok(Date.parse(read.savedAt));assert.equal(read.status,undefined);next.close();
});
test('Operator upload draft is isolated by actor/environment/task and keeps original bytes after account bounce',async()=>{
 const f=fixture(),r=await f.load().openOperatorUploadDraft(task);await r.save(draft);const original=f.disk.prepare('SELECT payload FROM local_draft').get().payload;
 f.change('B','B');f.change('actor-A','session-A');await assert.rejects(r.save({...draft,timeOffset:'2'}));r.close();
 for(const [a,e,t] of [['B','https://fixture.test',task],['actor-A','https://other.test',task],['actor-A','https://fixture.test','87654321-1111-4111-8111-111111111111']]){
  f.change(a,'C',e);const next=await f.load().openOperatorUploadDraft(t);assert.equal(await next.read(),null);next.close();
 }
 assert.equal(f.disk.prepare('SELECT payload FROM local_draft').get().payload,original);
});
test('Operator draft rejects malformed file references and corrupt disk payload without deleting it',async()=>{
 const f=fixture(),r=await f.load().openOperatorUploadDraft(task);await assert.rejects(r.save({...draft,videoKey:'file:///unsafe'}));
 await r.save(draft);f.disk.exec("UPDATE local_draft SET payload='broken'");await assert.rejects(r.read());assert.equal(f.disk.prepare('SELECT count(*) AS n FROM local_draft').get().n,1);r.close();
});
