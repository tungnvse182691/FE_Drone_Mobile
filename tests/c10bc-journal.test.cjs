const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),{randomUUID}=require('node:crypto'),{DatabaseSync}=require('node:sqlite');
function load(deps){const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/crewOfflineJournal.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:m,exports:m.exports,require:n=>deps[n],Date,URL});return m.exports;}
function fixture(filename=':memory:'){let raw=new DatabaseSync(filename);raw.exec('CREATE TABLE IF NOT EXISTS local_draft(id TEXT PRIMARY KEY,kind TEXT,payload TEXT,created_at TEXT,updated_at TEXT)');
 const db={getAllAsync:async(s,...p)=>raw.prepare(s).all(...p),getFirstAsync:async(s,...p)=>raw.prepare(s).get(...p),runAsync:async(s,...p)=>raw.prepare(s).run(...p),withExclusiveTransactionAsync:async f=>{raw.exec('BEGIN IMMEDIATE');try{await f(db);raw.exec('COMMIT');}catch(e){raw.exec('ROLLBACK');throw e;}}};
 const i={actor:randomUUID(),role:'REPAIR_CREW',environment:'http://fixture/api/v1',scope:'session-A',partition:'unused'};let current=i;
 const m=load({'../offline/database':{openDatabase:()=>db,initDatabase:async()=>{}},'../offline/upload-queue':{currentQueueIdentity:()=>current,sameQueueIdentity:(a,b=current)=>JSON.stringify(a)===JSON.stringify(b)}});
 const intent=()=>({id:randomUUID(),identity:i,projectId:randomUUID(),path:'/devices',key:randomUUID(),body:'{"deviceId":"synthetic"}',proof:{kind:'device'}});
 return {m,db,get raw(){return raw;},i,intent,restart:()=>{raw.close();raw=new DatabaseSync(filename);},current:()=>current,setCurrent:v=>current=v,switch:()=>current={...i,scope:'session-B'}};}
test('C10BC immutable journal uses SQLite INSERT/CAS, rejects key reuse and altered bytes',async()=>{const h=fixture();assert.equal(typeof h.m.openOfflineJournal,'function');const j=await h.m.openOfflineJournal(h.i,h.db),i=h.intent();const a=await j.prepare(i);assert.equal(a.phase,'PREPARED');assert.equal((await j.prepare(i)).body,i.body);await assert.rejects(j.prepare({...i,body:'{}'}),/immutable/);const pending=await j.transition(a,'IN_FLIGHT');assert.equal((await j.list())[0].phase,'IN_FLIGHT');await assert.rejects(j.transition(a,'IN_FLIGHT'),/cas/);const unknown=await j.transition(pending,'UNKNOWN_OUTCOME');assert.equal(unknown.body,i.body);assert.equal(unknown.key,i.key);assert.equal((await (await h.m.openOfflineJournal(h.i,h.db)).list())[0].phase,'UNKNOWN_OUTCOME');});
test('C10BC journal preserves pending old session and denies old-session writes',async()=>{const h=fixture(),j=await h.m.openOfflineJournal(h.i,h.db),a=await j.prepare(h.intent());h.switch();await assert.rejects(j.transition(a,'IN_FLIGHT'),/session/);assert.equal(h.raw.prepare('SELECT count(*) n FROM local_draft').get().n,1);});
test('C10BC journal rejects credentials and never acknowledges without reconciliation',async()=>{const h=fixture(),j=await h.m.openOfflineJournal(h.i,h.db);await assert.rejects(j.prepare({...h.intent(),body:'{"password":"synthetic"}'}),/secret/);const a=await j.prepare(h.intent());await assert.rejects(j.transition(a,'COMMITTED_VERIFIED'),/transition/);});

test('C10BC SQLite close/reopen preserves IN_FLIGHT bytes/key and isolates actor/environment',async()=>{
 const path=require('node:path'),os=require('node:os'),filename=path.join(os.tmpdir(),'roadfe-c10bc-'+randomUUID()+'.sqlite');
 const h=fixture(filename),j=await h.m.openOfflineJournal(h.i,h.db),intent=h.intent();
 const prepared=await j.prepare(intent);await j.transition(prepared,'IN_FLIGHT');h.restart();
 const reopened=await h.m.openOfflineJournal(h.i,h.db),r=(await reopened.list())[0];assert.equal(r.phase,'IN_FLIGHT');assert.equal(r.body,intent.body);assert.equal(r.key,intent.key);
 for(const changed of [{...h.i,actor:randomUUID()},{...h.i,environment:'https://other.test/api/v1'}]){h.setCurrent(changed);assert.equal((await (await h.m.openOfflineJournal(changed,h.db)).list()).length,0);}
 h.setCurrent({...h.i,scope:'new-session'});const newer=await h.m.openOfflineJournal(h.current(),h.db);assert.equal((await newer.list())[0].phase,'IN_FLIGHT');await assert.rejects(newer.transition(r,'UNKNOWN_OUTCOME'),/session/);
 h.raw.close();fs.unlinkSync(filename);
});
test('C10BC journal rejects cyclic proof and rolled back write preserves row count',async()=>{const h=fixture(),j=await h.m.openOfflineJournal(h.i,h.db),proof={};proof.self=proof;await assert.rejects(j.prepare({...h.intent(),proof}),/invalid/);assert.equal(h.raw.prepare('SELECT count(*) n FROM local_draft').get().n,0);});

test('FINAL real SQLite checkpoints persist partial origins across reopen without modifying command or phase',async()=>{
 const path=require('node:path'),os=require('node:os'),filename=path.join(os.tmpdir(),'roadfe-checkpoint-'+randomUUID()+'.sqlite');
 const h=fixture(filename),j=await h.m.openOfflineJournal(h.i,h.db),intent=h.intent();
 const pending=await j.transition(await j.prepare(intent),'IN_FLIGHT');const unknown=await j.transition(pending,'UNKNOWN_OUTCOME');
 const fact={originId:randomUUID(),effectId:randomUUID(),canonicalOriginId:randomUUID(),kind:'FIELD_START',serverBatchId:null,state:'COMMITTED',serverReceivedAt:'2026-10-28T00:00:00Z'};
 const observed=await j.checkpoint(unknown,[fact]);assert.equal(observed.phase,'UNKNOWN_OUTCOME');assert.equal(observed.body,intent.body);assert.equal(observed.key,intent.key);
 await assert.rejects(j.checkpoint(unknown,[fact]),/cas/);await assert.rejects(j.checkpoint(observed,[{...fact,canonicalOriginId:randomUUID()}]),/conflict/);
 h.restart();const reopened=await h.m.openOfflineJournal(h.i,h.db),actual=(await reopened.list())[0];assert.equal(JSON.stringify(actual.verifiedItems),JSON.stringify([fact]));
 const withBatch=await reopened.checkpoint(actual,[{...fact,serverBatchId:randomUUID()}]);await assert.rejects(reopened.checkpoint(withBatch,[fact]),/conflict/);
 h.switch();await assert.rejects(reopened.checkpoint(withBatch,[fact]),/session/);assert.equal(h.raw.prepare('SELECT count(*) n FROM local_draft').get().n,1);
 h.raw.close();fs.unlinkSync(filename);
});
test('FINAL corrupt row identity cannot adopt another pending journal record',async()=>{
 const h=fixture(),j=await h.m.openOfflineJournal(h.i,h.db),r=await j.prepare(h.intent());
 h.raw.prepare('UPDATE local_draft SET payload=?').run(JSON.stringify({...r,id:randomUUID()}));await assert.rejects(j.list(),/owner_invalid/);assert.equal(h.raw.prepare('SELECT count(*) n FROM local_draft').get().n,1);h.raw.close();
});
test('FINAL duplicate command key with different identity/body rejects and retains original bytes',async()=>{
 const h=fixture(),j=await h.m.openOfflineJournal(h.i,h.db),intent=h.intent();await j.prepare(intent);
 await assert.rejects(j.prepare({...intent,id:randomUUID(),body:'{"deviceId":"other"}'}),/immutable/);assert.equal((await j.list())[0].body,intent.body);h.raw.close();
});
