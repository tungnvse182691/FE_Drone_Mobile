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
 {module:mod,exports:mod.exports,require:name=>{
  if(name==='../api/crewOfflineJournal'){
   const journal={exports:{}};
   vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/crewOfflineJournal.ts','utf8'),{compilerOptions:{module:1}}).outputText,
    {module:journal,exports:journal.exports,require:()=>({}),Date});
   return journal.exports;
  }
  return {openDatabase:()=>({getAllAsync:async(sql,...args)=>{during();return disk.prepare(sql).all(...args);}}),initDatabase:async()=>{}};
 },Date});
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

test('cold Crew inventories signed journals with exact ownership, without leaking or replaying commands',async()=>{
 const h=harness(),actor='11111111-1111-4111-8111-111111111111';
 const owner={...identity,actor,scope:JSON.stringify([actor,'sid'])};
 const i={...owner,partition:'h01:'+JSON.stringify([owner.environment,actor,owner.role])};
 const record={schema:1,id:'22222222-2222-4222-8222-222222222222',identity:i,
  projectId:'33333333-3333-4333-8333-333333333333',path:'/projects/fixture/offline/sync',
  key:'private-command-key',body:JSON.stringify({privateEvidence:'not-for-view'}),proof:{kind:'signed-batch'},phase:'UNKNOWN_OUTCOME'};
 const key=d=>'c10bc:'+JSON.stringify([d.identity.environment,d.identity.actor,d.identity.role])+':'+d.id;
 h.put(key(record),'C10BC_IMMUTABLE_COMMAND_V1',record);
 for(const [n,change] of [{actor:'44444444-4444-4444-8444-444444444444'},{environment:'https://other.test'},{scope:'old'},{role:'DRONE_OPERATOR'}].entries()){
  const d={...record,id:`55555555-5555-4555-8555-55555555555${n}`,identity:{...i,...change}};
  h.put(key(d),'C10BC_IMMUTABLE_COMMAND_V1',d);
 }
 for(const [n,change] of [{phase:'ACKED'},{phase:'RECONCILED'},{schema:2},{body:'not-json'},{body:JSON.stringify({password:'forbidden'})}].entries()){
  const d={...record,id:`66666666-6666-4666-8666-66666666666${n}`,...change};h.put(key(d),'C10BC_IMMUTABLE_COMMAND_V1',d);
 }
 h.put('forged','C10BC_IMMUTABLE_COMMAND_V1',record);
 // Legacy online commands have no environment provenance: preserve, never adopt.
 h.put('t05a-field:'+actor+':project:task','T05A_FIELD_COMMAND',{actorId:actor,scope:owner.scope,projectId:'project',taskId:'task',phase:'pending'});
 const before=h.disk.prepare('SELECT * FROM local_draft ORDER BY id').all();
 const rows=await h.load(owner,()=>true);assert.equal(rows.length,1);
 assert.equal(rows[0].reference,record.id);assert.equal(rows[0].referenceLabel,'Lệnh đồng bộ');
 assert.equal(rows[0].hasCommand,true);assert.equal(rows[0].photoCount,0);
 const exposed=JSON.stringify(rows);for(const secret of ['private-command-key','privateEvidence','UNKNOWN_OUTCOME','/projects/fixture','proof','receipt'])assert.ok(!exposed.includes(secret));
 assert.deepEqual(h.disk.prepare('SELECT * FROM local_draft ORDER BY id').all(),before);
 assert.equal((await h.load({...owner,role:'REPORTER'},()=>true)).length,0);
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

test('Crew inventories owned repair and receiving commands without exposing payloads or changing originals',async()=>{
 const h=harness();
 const repair={schema:1,identity:{...identity,projectId:'project',taskId:'repair-task',itemId:'item'},operation:'supplement',key:'command-key',phase:'PENDING',payload:{evidence:[{uri:'private'}],measurements:[{}]}};
 const repairKey=d=>'t06a:'+JSON.stringify([d.identity.environment,d.identity.actor,d.identity.projectId,d.identity.taskId])+':'+JSON.stringify([d.identity.scope,d.identity.itemId,d.key]);
 const receiving={identity:{...identity,projectId:'project'},requestId:'receiving-request',phase:'PENDING',body:{claimedDeviceAt:null}};
 const receivingKey=d=>'h01ack:'+JSON.stringify([d.identity.environment,d.identity.actor,d.identity.projectId,d.requestId]);
 h.put(repairKey(repair),'T06A_REPAIR_COMMAND',repair);h.put(receivingKey(receiving),'H01_RECEIVING_ACK',receiving);
 h.put(repairKey(repair)+':recovery','HARDEN02_REPAIR_RECOVERY',{record:repair});
 for(const change of [{actor:'B'},{environment:'other'},{scope:'old'}]){
  const bad={...repair,identity:{...repair.identity,...change}};h.put(repairKey(bad),'T06A_REPAIR_COMMAND',bad);
  const ack={...receiving,requestId:'other-'+Object.keys(change)[0],identity:{...receiving.identity,...change}};h.put(receivingKey(ack),'H01_RECEIVING_ACK',ack);
 }
 h.put('forged','T06A_REPAIR_COMMAND',repair);h.put('forged-ack','H01_RECEIVING_ACK',receiving);
 const before=h.disk.prepare('SELECT * FROM local_draft ORDER BY id').all();
 const rows=await h.load(identity,()=>true);assert.equal(rows.length,2);
 assert.ok(rows.some(r=>r.reference==='repair-task'&&r.hasCommand&&r.photoCount===1));
 assert.ok(rows.some(r=>r.reference==='receiving-request'&&r.referenceLabel==='Yêu cầu tiếp nhận'&&r.hasCommand));
 for(const r of rows){assert.equal(r.payload,undefined);assert.equal(r.identity,undefined);assert.equal(r.command,undefined);}
 assert.deepEqual(h.disk.prepare('SELECT * FROM local_draft ORDER BY id').all(),before);
});
