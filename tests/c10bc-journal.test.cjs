const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),{randomUUID}=require('node:crypto'),{DatabaseSync}=require('node:sqlite');
function load(deps){const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/api/crewOfflineJournal.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:m,exports:m.exports,require:n=>deps[n],Date,URL});return m.exports;}
function fixture(filename=':memory:'){let raw=new DatabaseSync(filename);raw.exec('CREATE TABLE IF NOT EXISTS local_draft(id TEXT PRIMARY KEY,kind TEXT,payload TEXT,created_at TEXT,updated_at TEXT)');
 const db={getAllAsync:async(s,...p)=>raw.prepare(s).all(...p),getFirstAsync:async(s,...p)=>raw.prepare(s).get(...p),runAsync:async(s,...p)=>raw.prepare(s).run(...p),withExclusiveTransactionAsync:async f=>{raw.exec('BEGIN IMMEDIATE');try{await f(db);raw.exec('COMMIT');}catch(e){raw.exec('ROLLBACK');throw e;}}};
 const i={actor:randomUUID(),role:'REPAIR_CREW',environment:'http://fixture/api/v1',scope:'session-A',partition:'unused'};let current=i;
 const m=load({'../offline/database':{openDatabase:()=>db,initDatabase:async()=>{},saveDraft:async(tx,id,kind,payload)=>tx.runAsync('INSERT OR REPLACE INTO local_draft(id,kind,payload) VALUES (?,?,?)',id,kind,JSON.stringify(payload))},'../offline/upload-queue':{currentQueueIdentity:()=>current,sameQueueIdentity:(a,b=current)=>JSON.stringify(a)===JSON.stringify(b)}});
 const intent=()=>({id:randomUUID(),identity:i,projectId:randomUUID(),path:'/devices',key:randomUUID(),body:'{"deviceId":"synthetic"}',proof:{kind:'device'}});
 return {m,db,get raw(){return raw;},i,intent,restart:()=>{raw.close();raw=new DatabaseSync(filename);},current:()=>current,setCurrent:v=>current=v,switch:()=>current={...i,scope:'session-B'}};}

test('FIELD submission serializes online draft and signed intent in both directions across sessions',async()=>{
 for(const onlineFirst of [true,false]){
  const h=fixture(),j=await h.m.openOfflineJournal(h.i,h.db),base=h.intent(),task=randomUUID();
  const draft={actor:h.i.actor,scope:h.i.scope,environment:h.i.environment,projectId:base.projectId,taskId:task,captures:[],measurements:[],command:{key:randomUUID(),phase:'pending'}};
  const signed={...base,proof:{kind:'signed-field-batch'},body:JSON.stringify({operations:[{kind:'FIELD_SUBMISSION',taskId:task}]})};
  assert.equal(typeof h.m.writeOnlineFieldSubmissionDraft,'function');
  if(onlineFirst){await h.m.writeOnlineFieldSubmissionDraft(h.db,'field-fixture',draft);await assert.rejects(j.prepare(signed),/field_submission_pending/);}
  else {await j.prepare(signed);await assert.rejects(h.m.writeOnlineFieldSubmissionDraft(h.db,'field-fixture',draft),/field_submission_pending/);}
  h.switch();const newer=await h.m.openOfflineJournal(h.current(),h.db);
  await assert.rejects(newer.prepare({...signed,id:randomUUID(),key:randomUUID(),identity:h.current()}),/field_submission_pending/);
  assert.equal(h.raw.prepare('SELECT count(*) n FROM local_draft').get().n,1);h.raw.close();
 }
});
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

test('Safety journal blocks a second pending command for the same measure across sessions',async()=>{
 const h=fixture(),j=await h.m.openOfflineJournal(h.i,h.db),measureId=randomUUID();
 const first={...h.intent(),proof:{kind:'safety',resource:{measureId}}};await j.prepare(first);
 await assert.rejects(j.prepare({...first,id:randomUUID(),key:randomUUID()}),/safety_pending_command/);
 h.switch();const newer=await h.m.openOfflineJournal(h.current(),h.db);
 await assert.rejects(newer.prepare({...first,identity:h.current(),id:randomUUID(),key:randomUUID()}),/safety_pending_command/);
 assert.equal(h.raw.prepare('SELECT count(*) n FROM local_draft').get().n,1);h.raw.close();
});
test('C10BC journal rejects cyclic proof and rolled back write preserves row count',async()=>{const h=fixture(),j=await h.m.openOfflineJournal(h.i,h.db),proof={};proof.self=proof;await assert.rejects(j.prepare({...h.intent(),proof}),/invalid/);assert.equal(h.raw.prepare('SELECT count(*) n FROM local_draft').get().n,0);});

test('Review journal serializes pending requests per item across sessions and allows another item',async()=>{
 const h=fixture(),j=await h.m.openOfflineJournal(h.i,h.db),itemId=randomUUID();
 const first={...h.intent(),proof:{kind:'review-request',resource:{itemId}}};await j.prepare(first);
 await assert.rejects(j.prepare({...first,id:randomUUID(),key:randomUUID()}),/review_pending_command/);
 h.switch();const newer=await h.m.openOfflineJournal(h.current(),h.db);
 await assert.rejects(newer.prepare({...first,identity:h.current(),id:randomUUID(),key:randomUUID()}),/review_pending_command/);
 await newer.prepare({...first,identity:h.current(),id:randomUUID(),key:randomUUID(),proof:{kind:'review-request',resource:{itemId:randomUUID()}}});
 assert.equal(h.raw.prepare('SELECT count(*) n FROM local_draft').get().n,2);h.raw.close();
});

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

test('Enrollment and snapshot creation serialize durable resource identities across sessions',async()=>{
 const h=fixture(),j=await h.m.openOfflineJournal(h.i,h.db),base=h.intent();
 const enrollment={...base,proof:{kind:'enrollment'}};await j.prepare(enrollment);
 await assert.rejects(j.prepare({...enrollment,id:randomUUID(),key:randomUUID()}),/offline_existing_intent/);
 const snapshot={...base,id:randomUUID(),key:randomUUID(),proof:{kind:'snapshot'},body:JSON.stringify({taskId:randomUUID(),deviceRegistrationId:randomUUID()})};await j.prepare(snapshot);
 await assert.rejects(j.prepare({...snapshot,id:randomUUID(),key:randomUUID()}),/offline_existing_intent/);
 h.switch();const newer=await h.m.openOfflineJournal(h.current(),h.db);
 await assert.rejects(newer.prepare({...snapshot,identity:h.current(),id:randomUUID(),key:randomUUID()}),/offline_existing_intent/);
 await newer.prepare({...snapshot,identity:h.current(),id:randomUUID(),key:randomUUID(),body:JSON.stringify({...JSON.parse(snapshot.body),taskId:randomUUID()})});
 assert.equal(h.raw.prepare('SELECT count(*) n FROM local_draft').get().n,3);h.raw.close();
});

test('FIELD start producer cannot duplicate a task or bypass an uncertain online command',async()=>{
 const h=fixture(),j=await h.m.openOfflineJournal(h.i,h.db),base=h.intent(),task=randomUUID();
 const intent={...base,proof:{kind:'signed-field-batch',fieldStartTaskId:task}};
 const onlineId=`t05a-field:${h.i.actor}:${base.projectId}:${task}`;
 h.raw.prepare('INSERT INTO local_draft(id,kind,payload) VALUES (?,?,?)').run(onlineId,'T05A_FIELD_COMMAND',JSON.stringify({phase:'pending'}));
 await assert.rejects(j.prepare(intent),/reconciliation/);
 h.raw.prepare('UPDATE local_draft SET payload=? WHERE id=?').run(JSON.stringify({phase:'confirmed',readbackStatus:200}),onlineId);
 await j.prepare(intent);
 await assert.rejects(j.prepare({...intent,id:randomUUID(),key:randomUUID()}),/reconciliation/);
 h.raw.close();
});

test('online FIELD journal cannot bypass an offline intent in the shared SQLite transaction',async()=>{
 const h=fixture(),j=await h.m.openOfflineJournal(h.i,h.db),base=h.intent(),task=randomUUID();
 await j.prepare({...base,proof:{kind:'signed-field-batch',fieldStartTaskId:task}});
 const command={actorId:h.i.actor,scope:h.i.scope,projectId:base.projectId,taskId:task,phase:'pending'};
 await assert.rejects(h.m.writeOnlineFieldJournal(h.db,command),/field_command_pending/);
 assert.equal(h.raw.prepare('SELECT count(*) n FROM local_draft WHERE kind=?').get('T05A_FIELD_COMMAND').n,0);
 await h.m.writeOnlineFieldJournal(h.db,{...command,taskId:randomUUID()});
 await assert.rejects(h.m.writeOnlineFieldJournal(h.db,{...command,scope:'foreign'}),/session_changed/);
 h.raw.close();
});

test('snapshot refresh appends a verified version lineage without rewriting historical bytes',async()=>{
 const h=fixture(),j=await h.m.openOfflineJournal(h.i,h.db),base=h.intent(),task=randomUUID();
 let old=await j.prepare({...base,body:JSON.stringify({taskId:task,deviceRegistrationId:randomUUID()}),proof:{kind:'snapshot',taskVersion:'v1'}});
 old=await j.transition(old,'IN_FLIGHT');old=await j.transition(old,'RECEIVED',{id:randomUUID()});old=await j.transition(old,'RECONCILED');
 const before=JSON.stringify(old),next={...base,id:randomUUID(),key:randomUUID(),body:old.body,proof:{kind:'snapshot',taskVersion:'v2',previousSnapshotIntentId:old.id}};
 const refreshed=await j.prepare(next);assert.equal(refreshed.phase,'PREPARED');assert.equal(JSON.stringify((await j.list())[0]),before);
 await assert.rejects(j.prepare({...next,id:randomUUID(),key:randomUUID()}),/reconciliation/);
 h.raw.close();
});

for(const mode of ['pending-snapshot','same-version','wrong-parent','pending-batch','other-session'])test('snapshot refresh refuses '+mode,async()=>{
 const h=fixture(),j=await h.m.openOfflineJournal(h.i,h.db),base=h.intent(),task=randomUUID();
 let old=await j.prepare({...base,body:JSON.stringify({taskId:task,deviceRegistrationId:randomUUID()}),proof:{kind:'snapshot',taskVersion:'v1'}});
 if(mode!=='pending-snapshot'){old=await j.transition(old,'IN_FLIGHT');old=await j.transition(old,'RECEIVED',{id:randomUUID()});old=await j.transition(old,'RECONCILED');}
 if(mode==='pending-batch')await j.prepare({...base,id:randomUUID(),key:randomUUID(),body:JSON.stringify({operations:[{taskId:task,snapshotId:old.receipt.id}]}),proof:{kind:'signed-field-batch'}});
 if(mode==='other-session')h.switch();
 const current=await h.m.openOfflineJournal(h.current(),h.db);
 await assert.rejects(current.prepare({...base,identity:h.current(),id:randomUUID(),key:randomUUID(),body:old.body,proof:{kind:'snapshot',taskVersion:mode==='same-version'?'v1':'v2',previousSnapshotIntentId:mode==='wrong-parent'?randomUUID():old.id}}));
 assert.equal(JSON.stringify((await current.list())[0]),JSON.stringify(old));h.raw.close();
});

for(const online of [false,true])test('signed REPAIR blocks duplicate or online history atomically '+online,async()=>{
 const h=fixture(),j=await h.m.openOfflineJournal(h.i,h.db),base=h.intent(),task=randomUUID(),item=randomUUID();
 const intent={...base,proof:{kind:'signed-field-batch'},body:JSON.stringify({operations:[{kind:'REPAIR_ASSESSMENT',taskId:task,repair:{resourceId:item}}]})};
 if(online){h.raw.prepare('INSERT INTO local_draft(id,kind,payload) VALUES (?,?,?)').run('online','T06A_REPAIR_COMMAND',JSON.stringify({identity:{actor:h.i.actor,environment:h.i.environment,projectId:base.projectId,taskId:task,itemId:item},phase:'CONFIRMED'}));}
 else await j.prepare(intent);
 await assert.rejects(j.prepare({...intent,id:randomUUID(),key:randomUUID()}),/repair.*(pending|reconciliation)/);
 h.switch();const next=await h.m.openOfflineJournal(h.current(),h.db);
 await assert.rejects(next.prepare({...intent,identity:h.current(),id:randomUUID(),key:randomUUID()}),/repair.*(pending|reconciliation)/);
 assert.equal(h.raw.prepare('SELECT count(*) n FROM local_draft').get().n,1);h.raw.close();
});

for(const kind of ['REPAIR_ASSESSMENT','REPAIR_EXECUTION_START','REPAIR_EXECUTION_FINISH'])test('signed REPAIR rejects duplicate operation within one batch '+kind,async()=>{
 const h=fixture(),j=await h.m.openOfflineJournal(h.i,h.db),base=h.intent(),op={kind,taskId:randomUUID(),repair:{resourceId:randomUUID()}};
 await assert.rejects(j.prepare({...base,proof:{kind:'signed-field-batch'},body:JSON.stringify({operations:[op,{...op}]})}),/repair_signed_command_pending/);
 assert.equal(h.raw.prepare('SELECT count(*) n FROM local_draft').get().n,0);h.raw.close();
});

test('mixed REPAIR batch excludes online FIELD start using immutable body without metadata',async()=>{
 const h=fixture(),j=await h.m.openOfflineJournal(h.i,h.db),base=h.intent(),task=randomUUID(),otherTask=randomUUID();
 const body=JSON.stringify({operations:[{kind:'FIELD_START',taskId:task},{kind:'FIELD_START',taskId:otherTask},{kind:'REPAIR_ASSESSMENT',taskId:task,repair:{resourceId:randomUUID()}}]});
 const intent={...base,proof:{kind:'signed-field-batch'},body};await j.prepare(intent);
 for(const taskId of [task,otherTask])await assert.rejects(h.m.writeOnlineFieldJournal(h.db,{actorId:h.i.actor,scope:h.i.scope,projectId:base.projectId,taskId,phase:'pending'}),/field_command_pending/);
 await assert.rejects(j.prepare({...base,id:randomUUID(),key:randomUUID(),proof:{kind:'signed-field-batch'},body:JSON.stringify({operations:[{kind:'FIELD_START',taskId:otherTask}]})}),/reconciliation/);
 h.raw.close();
});

test('signed local media cannot be removed, replaced, cancelled or routed through normal create',async()=>{
 const h=fixture(),j=await h.m.openOfflineJournal(h.i,h.db),base=h.intent(),task=randomUUID(),capture=randomUUID();
 const e={captureOriginId:capture,fileId:null,purpose:'BEFORE',mediaType:'image/png',checksumSha256:'a'.repeat(64),sizeBytes:68};
 const draft={actor:h.i.actor,scope:h.i.scope,environment:h.i.environment,projectId:base.projectId,taskId:task,captures:[{id:capture,uri:'sealed',vault:{id:'vault'},purpose:e.purpose,mediaType:e.mediaType,checksum:e.checksumSha256,size:68,localOnly:true}]};
 await h.m.writeProtectedFieldDraft(h.db,'media-fixture','T05B_FIELD',draft,draft);
 await j.prepare({...base,proof:{kind:'signed-field-batch'},body:JSON.stringify({operations:[{kind:'FIELD_SUBMISSION',taskId:task,fieldSubmission:{evidence:[e]}}]})});
 await h.m.assertSignedFieldMediaPreserved(h.db,draft);
 for(const mutate of [d=>d.captures=[],d=>d.captures[0].checksum='b'.repeat(64),d=>d.captures[0].size++,d=>d.captures[0].cancelState='REQUESTED',d=>d.captures[0].uploadAttempt={key:'normal'}]){
  const changed=structuredClone(draft);mutate(changed);await assert.rejects(h.m.writeProtectedFieldDraft(h.db,'media-fixture','T05B_FIELD',changed,changed),/locked/);
  assert.equal(JSON.parse(h.raw.prepare("SELECT payload FROM local_draft WHERE id='media-fixture'").get().payload).captures[0].checksum,e.checksumSha256);
 }
 const progress=structuredClone(draft);progress.captures[0].offlineUpload={batchIntentId:base.id};progress.captures[0].uploadAttempt={key:'admission'};
 await h.m.assertSignedFieldMediaPreserved(h.db,progress);h.raw.close();
});

test('signing cannot race a previously removed local capture into the journal',async()=>{
 const h=fixture(),j=await h.m.openOfflineJournal(h.i,h.db),base=h.intent(),task=randomUUID();
 await assert.rejects(j.prepare({...base,proof:{kind:'signed-field-batch'},body:JSON.stringify({operations:[{kind:'FIELD_SUBMISSION',taskId:task,fieldSubmission:{evidence:[{captureOriginId:randomUUID(),fileId:null}]}}]})}),/signed_capture_locked/);
 assert.equal(h.raw.prepare('SELECT count(*) n FROM local_draft').get().n,0);h.raw.close();
});

test('cross-session signed-field-batch requires session-confirm for same registration and preserves old identity',async()=>{
 const h=fixture(),j1=await h.m.openOfflineJournal(h.i,h.db),base=h.intent(),regId=randomUUID(),task=randomUUID();
 const batch=await j1.prepare({...base,proof:{kind:'signed-field-batch',registrationId:regId},body:JSON.stringify({operations:[{kind:'FIELD_ACCEPT',taskId:task}]})});
 const received=await j1.transition(await j1.transition(batch,'IN_FLIGHT'),'RECEIVED',{batchId:randomUUID(),items:[],localQueueInstruction:'KEEP_UNACKNOWLEDGED_OR_CONFLICTED_ITEMS'});
 const nextIdentity={...h.i,scope:JSON.stringify([h.i.actor,'sid-2'])};
 const j2=await h.m.openOfflineJournal(nextIdentity,h.db,()=>nextIdentity);
 await assert.rejects(j2.transition(received,'IN_FLIGHT'),/offline_session_changed/);
 await j2.confirmSession({id:randomUUID(),identity:nextIdentity,projectId:base.projectId,path:`/projects/${base.projectId}/offline/devices/${regId}`,key:randomUUID(),
  body:JSON.stringify({registrationId:regId,confirmedScope:nextIdentity.scope,snapshotIds:[],revokedSnapshotIds:[]}),
  proof:{kind:'session-confirm',registrationId:regId,confirmedScope:nextIdentity.scope,snapshotIds:[],revokedSnapshotIds:[]}},{id:regId});
 const replayed=await j2.transition(received,'IN_FLIGHT');
 assert.equal(replayed.identity.scope,h.i.scope);
 const received2=await j2.transition(replayed,'RECEIVED',received.receipt);
 const reconciled=await j2.transition(received2,'RECONCILED',received.receipt);
 assert.equal(reconciled.identity.scope,h.i.scope);
 h.raw.close();
});

test('P1-A: 3-session A->B->C admission-upload prepare and transition require session-confirm and deny revoked device',async()=>{
 const h=fixture(),j1=await h.m.openOfflineJournal(h.i,h.db),base=h.intent(),regId=randomUUID(),task=randomUUID();
 const batch=await j1.prepare({...base,proof:{kind:'signed-field-batch',registrationId:regId},body:JSON.stringify({operations:[{kind:'FIELD_ACCEPT',taskId:task}]})});
 const sB={...h.i,scope:'session-B'},sC={...h.i,scope:'session-C'};
 h.setCurrent(sB);
 const jB=await h.m.openOfflineJournal(sB,h.db);
 const createId=randomUUID(),createKey=randomUUID(),createBody=JSON.stringify({admissionId:randomUUID(),captureOriginId:randomUUID()});
 const admProof={kind:'admission-upload',batchIntentId:batch.id,originId:randomUUID(),captureOriginId:randomUUID(),admissionId:randomUUID()};
 const admB=await jB.prepare({id:createId,identity:sB,projectId:base.projectId,path:'/offline/uploads',key:createKey,body:createBody,proof:admProof});
 h.setCurrent(sC);
 const jC=await h.m.openOfflineJournal(sC,h.db);
 await assert.rejects(jC.prepare({id:createId,identity:sC,projectId:base.projectId,path:'/offline/uploads',key:createKey,body:createBody,proof:admProof}),/immutable/);
 await assert.rejects(jC.transition(admB,'IN_FLIGHT'),/offline_session_changed/);
 await jC.confirmSession({id:randomUUID(),identity:sC,projectId:base.projectId,path:`/projects/${base.projectId}/offline/devices/${regId}`,key:randomUUID(),
  body:JSON.stringify({registrationId:regId,confirmedScope:sC.scope,snapshotIds:[],revokedSnapshotIds:[]}),
  proof:{kind:'session-confirm',registrationId:regId,confirmedScope:sC.scope,snapshotIds:[],revokedSnapshotIds:[]}},{id:regId});
 const reused=await jC.prepare({id:createId,identity:sC,projectId:base.projectId,path:'/offline/uploads',key:createKey,body:createBody,proof:admProof});
 assert.equal(reused.identity.scope,sB.scope);
 await assert.rejects(jC.prepare({id:createId,identity:sC,projectId:base.projectId,path:'/offline/uploads',key:createKey,body:'{"tampered":true}',proof:admProof}),/immutable/);
 const sent=await jC.transition(reused,'IN_FLIGHT');
 assert.equal(sent.identity.scope,sB.scope);
 await jC.prepare({id:randomUUID(),identity:sC,projectId:base.projectId,path:`/projects/${base.projectId}/offline/devices/${regId}/revoke`,key:randomUUID(),body:'{}',proof:{kind:'revocation',registrationId:regId}});
 await assert.rejects(jC.transition(sent,'UNKNOWN_OUTCOME'),/offline_session_changed/);
 h.raw.close();
});

test('P1-B: cross-session writeProtectedFieldDraft preserves keys/coords/binding/verified-upload and enforces CAS',async()=>{
 const h=fixture(),j1=await h.m.openOfflineJournal(h.i,h.db),base=h.intent(),regId=randomUUID(),task=randomUUID();
 const e={captureOriginId:randomUUID(),purpose:'BEFORE',mediaType:'image/jpeg',checksumSha256:'a'.repeat(64),sizeBytes:1024,fileId:null};
 const draft={actor:h.i.actor,scope:h.i.scope,environment:h.i.environment,projectId:base.projectId,taskId:task,measurements:[{code:'DEPTH',value:2.5}],
  captures:[{id:e.captureOriginId,uri:'file:///vault.rgc',vault:{id:randomUUID()},localOnly:true,createKey:'ck-1',completeKey:'cm-1',coordinates:{latitude:10.7,longitude:106.6},purpose:e.purpose,mediaType:e.mediaType,checksum:e.checksumSha256,size:e.sizeBytes,capturedAt:'2026-11-26T00:00:00Z'}]};
 await h.m.writeProtectedFieldDraft(h.db,'p1b-draft','T05B_FIELD',draft,draft);
 await j1.prepare({...base,proof:{kind:'signed-field-batch',registrationId:regId},body:JSON.stringify({operations:[{kind:'FIELD_SUBMISSION',taskId:task,fieldSubmission:{evidence:[e]}}]})});
 h.switch();
 const j2=await h.m.openOfflineJournal(h.current(),h.db);
 const progress=structuredClone(draft);progress.captures[0].offlineUpload={batchIntentId:base.id,originId:randomUUID(),admissionId:randomUUID(),createIntentId:randomUUID()};
 await assert.rejects(h.m.writeProtectedFieldDraft(h.db,'p1b-draft','T05B_FIELD',progress,progress),/offline_session_changed/);
 await j2.confirmSession({id:randomUUID(),identity:h.current(),projectId:base.projectId,path:`/projects/${base.projectId}/offline/devices/${regId}`,key:randomUUID(),
  body:JSON.stringify({registrationId:regId,confirmedScope:h.current().scope,snapshotIds:[],revokedSnapshotIds:[]}),
  proof:{kind:'session-confirm',registrationId:regId,confirmedScope:h.current().scope,snapshotIds:[],revokedSnapshotIds:[]}},{id:regId});
 await h.m.writeProtectedFieldDraft(h.db,'p1b-draft','T05B_FIELD',progress,progress);
 for(const tamper of [
  d=>{d.measurements[0].value=9.9;},
  d=>{d.captures[0].createKey='ck-2';},
  d=>{d.captures[0].completeKey='cm-2';},
  d=>{d.captures[0].coordinates={latitude:0,longitude:0};},
  d=>{d.captures[0].offlineUpload.admissionId=randomUUID();},
 ]){
  const bad=structuredClone(progress);tamper(bad);
  await assert.rejects(h.m.writeProtectedFieldDraft(h.db,'p1b-draft','T05B_FIELD',bad,bad),/locked/);
 }
 const verified=structuredClone(progress);verified.captures[0].completed=true;verified.captures[0].verified=true;
 verified.captures[0].upload={id:randomUUID(),fileId:randomUUID(),status:'VERIFIED',partSizeBytes:100,version:'v1'};
 await h.m.writeProtectedFieldDraft(h.db,'p1b-draft','T05B_FIELD',verified,verified);
 const overwrite=structuredClone(verified);overwrite.captures[0].verified=false;overwrite.captures[0].upload={...verified.captures[0].upload,status:'PENDING'};
 await assert.rejects(h.m.writeProtectedFieldDraft(h.db,'p1b-draft','T05B_FIELD',overwrite,overwrite),/locked/);
 h.raw.close();
});
