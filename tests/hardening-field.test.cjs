const fs=require('node:fs'),assert=require('node:assert/strict'),{test}=require('node:test'),vm=require('node:vm');
const sandbox={require:n=>n==='node:test'?{test:()=>{}}:require(n),console,process,Buffer,__dirname:require('node:path').resolve('tests'),structuredClone,setTimeout,clearTimeout,URL,Uint8Array};
vm.runInNewContext(fs.readFileSync('tests/t06c.test.cjs','utf8')+';globalThis.fixtures={claimHarness,finishedForIntake,started,ids,load};',sandbox);
const {claimHarness}=sandbox.fixtures;
test('HARDEN explicit claim from confirmed old-session repair uses new empty FIELD, preserves old data',async()=>{
 const h=claimHarness(),old=JSON.stringify([h.ctx.actor,'old']),current=JSON.stringify([h.ctx.actor,'new']);
 h.ctx.scope=current;h.runtime.current=()=>h.ctx;
 h.rows.forEach(r=>r.identity={...r.identity,scope:old});
 const saved={...h.d,scope:old};await h.runtime.write(saved);
 const draft=await h.m.prepareFieldRepairClaim(h.ctx,h.runtime);
 assert.equal(draft.scope,current);assert.equal(draft.captures.length,0);assert.equal(draft.measurements.length,0);assert.ok(draft.repairClaim);assert.equal(saved.scope,old);
});
const path=require('node:path'),{DatabaseSync}=require('node:sqlite');
const folder=fs.mkdtempSync(path.resolve('.cache/harden02-field-'));
function durableField(context){
 const file=path.join(folder,require('node:crypto').randomUUID()+'.db');let current={...context},db=new DatabaseSync(file);
 db.exec('CREATE TABLE local_draft(id TEXT PRIMARY KEY,kind TEXT,payload TEXT,created_at TEXT,updated_at TEXT)');
 const port={getAllAsync:async(s,...a)=>db.prepare(s).all(...a),getFirstAsync:async(s,...a)=>db.prepare(s).get(...a)};
 const m=sandbox.fixtures.load('src/api/crewFieldDraft.ts',{'../store/auth':{useAuthStore:{getState:()=>({token:current.scope,user:{id:current.actor,role_code:'REPAIR_CREW'},status:'AUTHENTICATED'})}},'./authApi':{passwordSessionIdentity:t=>t},'./client':{apiClient:{defaults:{baseURL:context.environment}}},'./crewApi':{isCrewResourceId:x=>typeof x==='string'&&x.length===36},'../offline/database':{openDatabase:()=>port,initDatabase:async()=>{},saveDraft:async(_,id,kind,d)=>db.prepare('INSERT INTO local_draft(id,kind,payload) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').run(id,kind,JSON.stringify(d))}});
 return {m,set:c=>current=c,rows:()=>db.prepare('SELECT * FROM local_draft ORDER BY rowid').all(),seed:d=>db.prepare('INSERT INTO local_draft(id,kind,payload) VALUES(?,?,?)').run('t05b:'+JSON.stringify([d.environment,d.actor,d.projectId,d.taskId]),'T05B_FIELD',JSON.stringify(d)),reopen:()=>{db.close();db=new DatabaseSync(file);},close:()=>db.close()};
}
test('HARDEN disk FIELD preserves legacy bytes; historical read never adopts old photo into current draft',async()=>{
 const h=claimHarness(),old={...h.ctx,scope:JSON.stringify([h.ctx.actor,'old'])},now={...old,scope:JSON.stringify([h.ctx.actor,'new'])},d=durableField(old);
 const saved={...h.d,...old};d.seed(saved);const original=JSON.stringify(d.rows());
 let r=await d.m.openFieldRuntime(old);saved.measurements=[];await r.write(saved);assert.equal(d.rows().length,1,'same sid updates legacy row rather than making an ambiguous duplicate');
 const bytes=d.rows()[0].payload;d.reopen();d.set(now);r=await d.m.openFieldRuntime(now);await assert.rejects(d.m.loadFieldDraft(now,r),/previous_session/);
 const past=await d.m.readHistoricalFieldDraft(now,old.scope);assert.equal(past.captures.length,saved.captures.length);
 await r.write(d.m.newFieldDraft(now));assert.equal(d.rows().length,2);assert.equal(d.rows()[0].payload,bytes);assert.equal((await d.m.loadFieldDraft(now,r)).captures.length,0);assert.ok(original);d.close();
});
test('HARDEN historical attempt replay uses exact old FIELD, not new-session draft',async()=>{
 const h=await sandbox.fixtures.finishedForIntake(),c=await h.workflow.prepareRepairAttempt(h.identity,h.runtime);
 const d=durableField(h.identity);d.seed(h.claim);const old=d.rows()[0].payload;
 h.switch();const i=h.runtime.current();d.set(i);await (await d.m.openFieldRuntime(i)).write(d.m.newFieldDraft(i));
 const journal=sandbox.fixtures.load('src/api/crewRepairDraft.ts',{'./crewApi':h.api,'../offline/database':{openDatabase:()=>h.port,initDatabase:async()=>{}}});
 h.runtime.journal=x=>journal.openRepairJournal(x,h.runtime.current);delete h.runtime.fieldDraft;
 h.workflow=sandbox.fixtures.load('src/api/crewRepairWorkflow.ts',{'./crewApi':h.runtime.api,'./crewRepairDraft':journal,'./crewFieldDraft':d.m});
 assert.equal((await h.workflow.dispatchRepair(i,c.key,h.runtime)).phase,'CONFIRMED');
 assert.equal(h.attemptCalls.length,1);assert.equal(JSON.stringify(h.attemptCalls[0][4]),JSON.stringify(c.payload));assert.equal(h.attemptCalls[0][5],c.ifMatch);assert.equal(h.attemptCalls[0][6],c.key);assert.equal(d.rows()[0].payload,old);d.close();
});

for(const operation of ['start','finish'])test('HARDEN '+operation+' exact replay through new sid preserves original route/body/key/version',async()=>{
 const h=await sandbox.fixtures.started();
 // started() already has assessment/start receipts. Finish is prepared below; for start replay use its stored command.
 const j=await h.runtime.journal();let c;
 if(operation==='start')c=(await j.history()).find(c=>c.operation==='start');
 else c=await h.workflow.prepareRepairFinish(h.identity,h.runtime);
 if(operation==='start'){
   // Simulate lost durable ACK by replacing only this isolated test fixture with the original PENDING snapshot.
   const source={...c,phase:'PENDING'};delete source.receipt;
   h.raw.prepare('UPDATE local_draft SET payload=? WHERE kind=? AND payload LIKE ?').run(JSON.stringify(source),'T06A_REPAIR_COMMAND','%'+c.key+'%');
 }
 const originals=h.raw.prepare('SELECT payload FROM local_draft ORDER BY rowid').all();h.switch();const i=h.runtime.current();
 const journal=sandbox.fixtures.load('src/api/crewRepairDraft.ts',{'./crewApi':h.api,'../offline/database':{openDatabase:()=>h.port,initDatabase:async()=>{}}});
 h.runtime.journal=x=>journal.openRepairJournal(x,h.runtime.current);
 const send=h.runtime.api[operation==='start'?'startRepairExecutionReal':'finishRepairExecutionReal'];let args;
 h.runtime.api[operation==='start'?'startRepairExecutionReal':'finishRepairExecutionReal']=async(...a)=>{args=a;return send(...a);};
 assert.equal((await h.workflow.dispatchRepair(i,c.key,h.runtime)).phase,'CONFIRMED');
 assert.equal(JSON.stringify(args.slice(0,4)),JSON.stringify([c.identity.projectId,c.identity.packageId,c.identity.itemId,c.identity.taskId]));
 assert.equal(JSON.stringify(args[4]),JSON.stringify(c.payload));assert.equal(args[5],c.ifMatch);assert.equal(args[6],c.key);
 assert.equal(JSON.stringify(h.raw.prepare('SELECT payload FROM local_draft WHERE kind=? ORDER BY rowid').all('T06A_REPAIR_COMMAND')),JSON.stringify(originals));
});
