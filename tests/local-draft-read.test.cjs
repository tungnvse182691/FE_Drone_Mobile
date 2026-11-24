const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {DatabaseSync}=require('node:sqlite');
const identity={environment:'https://fixture.test',actor:'A',scope:JSON.stringify(['A','sid']),role:'REPAIR_CREW'};
const field={environment:identity.environment,actor:'A',scope:identity.scope,projectId:'project',taskId:'task',captures:[{uri:'private'}],measurements:[{}],command:{key:'not-for-view'}};
const fieldKey=d=>'t05b:'+JSON.stringify([d.environment,d.actor,d.projectId,d.taskId])+':'+JSON.stringify(d.scope);
const report={id:'report-local',ownerId:'A',provenance:{environment:identity.environment,session:identity.scope},description:'Saved description',photos:[{uri:'private'}],coords:null,submitRequested:true};
const reporterKey=d=>'reporter-pending-v3:reporter-v2:'+JSON.stringify([d.provenance.environment,d.ownerId,d.provenance.session]);
function harness(){
 const disk=new DatabaseSync(':memory:');disk.exec('CREATE TABLE local_draft(id TEXT PRIMARY KEY,kind TEXT,payload TEXT,updated_at TEXT)');let during=()=>{};
 const mod={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/offline/localDraftRead.ts','utf8'),{compilerOptions:{module:1}}).outputText,
 {module:mod,exports:mod.exports,require:()=>({openDatabase:()=>({getAllAsync:async(sql,...args)=>{during();return disk.prepare(sql).all(...args);}}),initDatabase:async()=>{}}),Date});
 return {disk,load:mod.exports.loadLocalDraftSummaries,during:fn=>during=fn,
 put:(id,kind,d)=>disk.prepare('INSERT OR REPLACE INTO local_draft VALUES(?,?,?,?)').run(id,kind,JSON.stringify(d),'2026-11-24T00:00:00Z')};
}
test('cold Crew reads only exact-owned field drafts and exposes no dispatch payload or private file URI',async()=>{
 const h=harness();h.put(fieldKey(field),'T05B_FIELD',field);
 for(const bad of [{...field,actor:'B'},{...field,environment:'other'},{...field,scope:JSON.stringify(['A','old'])}])h.put(fieldKey(bad),'T05B_FIELD',bad);
 h.put('forged','T05B_FIELD',{...field,taskId:'forged'});h.put('corrupt','T05B_FIELD',null);
 const before=h.disk.prepare('SELECT * FROM local_draft ORDER BY id').all();
 const rows=await h.load(identity,()=>true);assert.equal(rows.length,1);
 assert.equal(rows[0].reference,'task');assert.equal(rows[0].photoCount,1);assert.equal(rows[0].measurementCount,1);assert.equal(rows[0].hasCommand,true);
 assert.equal(rows[0].command,undefined);assert.equal(rows[0].scope,undefined);assert.equal(rows[0].uri,undefined);
 assert.deepEqual(h.disk.prepare('SELECT * FROM local_draft ORDER BY id').all(),before);
});
test('cold Reporter reads its pending and archived command keys but never guests or a different session',async()=>{
 const h=harness();h.put(reporterKey(report),'reporter_pending_v1',report);
 h.put('reporter-command-v1:'+reporterKey(report).slice('reporter-pending-v3:'.length)+':generation','reporter_pending_v1',{...report,id:'command'});
 for(const bad of [{...report,ownerId:null},{...report,ownerId:'B'},{...report,provenance:{...report.provenance,session:'old'}}])h.put(reporterKey(bad),'reporter_pending_v1',bad);
 h.put('forged','reporter_pending_v1',report);
 const rows=await h.load({...identity,role:'REPORTER'},()=>true);assert.equal(rows.length,2);assert.equal(rows[0].description,'Saved description');
 assert.equal(rows[0].photoCount,1);assert.equal(rows[0].hasCommand,true);assert.equal(rows[0].provenance,undefined);
});
test('local draft inspection fails on storage error or identity change during an await',async()=>{
 const h=harness();let active=true;h.during(()=>active=false);await assert.rejects(h.load(identity,()=>active),/local_session_changed/);
 const j=harness();j.disk.close();await assert.rejects(j.load(identity,()=>true));
 await assert.rejects(h.load({...identity,scope:JSON.stringify(['B','sid'])},()=>true),/local_identity_invalid/);
});
