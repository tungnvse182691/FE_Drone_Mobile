import type { SQLiteDatabase } from 'expo-sqlite';
import { openDatabase, initDatabase } from '../offline/database';
import { currentQueueIdentity, sameQueueIdentity, type QueueIdentity } from '../offline/upload-queue';
import type { FieldCommandRecord } from './crewApi';
import { saveDraft } from '../offline/database';
import type { FieldDraft } from './crewFieldDraft';

function containsSubmission(record:OfflineJournalRecord,projectId:string,taskId:string):boolean {
  return record.projectId===projectId&&record.proof.kind==='signed-field-batch'&&
    (JSON.parse(record.body).operations??[]).some((o:{kind?:string;taskId?:string})=>o.kind==='FIELD_SUBMISSION'&&o.taskId===taskId);
}

/** A signed local capture remains available until its immutable source is retained.
 * Transport progress may change; deletion, cancellation and replacement may not. */
export async function assertSignedFieldMediaPreserved(db:SQLiteDatabase,draft:FieldDraft) {
  const owner=currentQueueIdentity();
  if(!owner||owner.role!=='REPAIR_CREW'||owner.actor!==draft.actor||owner.environment!==draft.environment)throw Error('offline_session_changed');
  const rows=await (await openOfflineJournal(owner,db)).list();
  let recoveryConfirmed=owner.scope===draft.scope;
  for(const row of rows){
    if(row.projectId!==draft.projectId||row.proof.kind!=='signed-field-batch')continue;
    if(!recoveryConfirmed&&sameOfflinePartition(row.identity,owner)&&row.identity.scope===draft.scope){
      const regId=String(row.proof.registrationId??'');
      const hasTask=(JSON.parse(row.body).operations??[]).some((o:{taskId?:string})=>o.taskId===draft.taskId);
      if(hasTask&&regId&&!rows.some(r=>r.projectId===row.projectId&&r.proof.kind==='revocation'&&r.proof.registrationId===regId)&&
        rows.some(r=>r.projectId===row.projectId&&r.phase==='RECONCILED'&&r.proof.kind==='session-confirm'&&sameQueueIdentity(r.identity,owner)&&r.proof.registrationId===regId))
        recoveryConfirmed=true;
    }
    if(row.identity.scope!==draft.scope)continue;
    for(const op of JSON.parse(row.body).operations??[]){
      if(op.taskId!==draft.taskId)continue;
      const evidence=op.fieldSubmission?.evidence??op.repair?.assessment?.evidence??[];
      for(const e of evidence){
        if(e.fileId!=null)continue;
        const c=draft.captures.find(c=>c.id===e.captureOriginId);
        if(!c||c.cancelState||!c.uri||!c.vault||(c.uploadAttempt&&!c.offlineUpload)||c.checksum!==e.checksumSha256||c.mediaType!==e.mediaType||c.purpose!==e.purpose||
          (e.sizeBytes!=null&&c.size!==e.sizeBytes))throw Error('field_signed_capture_locked');
      }
    }
  }
  if(!recoveryConfirmed||!sameQueueIdentity(owner))throw Error('offline_session_changed');
}

function sameDraftSourceForTransport(prev:FieldDraft,next:FieldDraft):boolean {
  if(prev.actor!==next.actor||prev.scope!==next.scope||prev.environment!==next.environment||
    prev.projectId!==next.projectId||prev.taskId!==next.taskId||
    JSON.stringify(prev.measurements)!==JSON.stringify(next.measurements)||
    JSON.stringify(prev.locationProof)!==JSON.stringify(next.locationProof)||
    JSON.stringify(prev.command)!==JSON.stringify(next.command)||
    JSON.stringify(prev.result)!==JSON.stringify(next.result)||
    JSON.stringify(prev.supplement)!==JSON.stringify(next.supplement)||
    JSON.stringify(prev.repairClaim)!==JSON.stringify(next.repairClaim)||
    JSON.stringify(prev.offlineStart)!==JSON.stringify(next.offlineStart)||
    prev.captures.length!==next.captures.length)return false;
  return prev.captures.every((a,i)=>{const b=next.captures[i];
    if(a.id!==b.id||a.uri!==b.uri||a.checksum!==b.checksum||a.mediaType!==b.mediaType||a.purpose!==b.purpose||
      a.size!==b.size||a.capturedAt!==b.capturedAt||JSON.stringify(a.coordinates)!==JSON.stringify(b.coordinates)||
      JSON.stringify(a.vault)!==JSON.stringify(b.vault)||a.createKey!==b.createKey||a.completeKey!==b.completeKey||
      a.postRepairCapture!==b.postRepairCapture||a.cancelState!==b.cancelState)return false;
    if(a.offlineUpload&&JSON.stringify(a.offlineUpload)!==JSON.stringify(b.offlineUpload))return false;
    if((a.verified||a.upload?.status==='VERIFIED')&&(!b.verified||JSON.stringify(a.upload)!==JSON.stringify(b.upload)||a.completed!==b.completed))return false;
    if(a.completed&&!b.completed)return false;
    if(a.upload&&(!b.upload||b.upload.id!==a.upload.id||b.upload.fileId!==a.upload.fileId))return false;
    if((a.parts??[]).some(part=>!(b.parts??[]).some(next=>next.partNumber===part.partNumber&&next.etag===part.etag)))return false;
    if(a.complete&&JSON.stringify(a.complete)!==JSON.stringify(b.complete))return false;
    return true;
  });
}

/** Serialize draft updates with signed journal insertion. */
export async function writeProtectedFieldDraft(db:SQLiteDatabase,id:string,kind:string,payload:Record<string,unknown>,draft:FieldDraft,expectedPayload?:string) {
  const owner=currentQueueIdentity();
  if(!owner)throw Error('offline_session_changed');
  await db.withExclusiveTransactionAsync(async tx=>{
    if(!sameQueueIdentity(owner))throw Error('offline_session_changed');
    if(expectedPayload!==undefined){
      const previous=await tx.getFirstAsync<{payload:string}>('SELECT payload FROM local_draft WHERE id=? AND kind=?',id,kind);
      if(previous?.payload!==expectedPayload)throw Error('offline_journal_cas_failed');
    }
    await assertSignedFieldMediaPreserved(tx,draft);
    if(owner.scope!==draft.scope){
      if(kind!=='T05B_FIELD')throw Error('offline_session_changed');
      const existing=await tx.getFirstAsync<{payload:string}>('SELECT payload FROM local_draft WHERE id=? AND kind=?',id,kind);
      if(!existing||!sameDraftSourceForTransport(JSON.parse(existing.payload) as FieldDraft,draft))throw Error('field_signed_capture_locked');
      const res=await tx.runAsync('UPDATE local_draft SET payload=?,updated_at=? WHERE id=? AND kind=? AND payload=?',
        JSON.stringify(payload),new Date().toISOString(),id,kind,existing.payload);
      if(!sameQueueIdentity(owner))throw Error('offline_session_changed');
      if(res.changes!==1)throw Error('offline_journal_cas_failed');
      return;
    }
    await saveDraft(tx,id,kind,payload);
    if(!sameQueueIdentity(owner))throw Error('offline_session_changed');
  });
}

function fieldStartTasks(record:OfflineIntent):string[] {
  if(record.proof.kind!=='signed-field-batch')return [];
  const tasks=(JSON.parse(record.body).operations??[])
    .filter((o:{kind?:string})=>o.kind==='FIELD_START').map((o:{taskId:string})=>o.taskId);
  if(typeof record.proof.fieldStartTaskId==='string')tasks.push(record.proof.fieldStartTaskId);
  return [...new Set<string>(tasks)];
}

/** The online command and signed submission share one durable exclusion gate.
 * Check the immutable operation, not optional presentation metadata. */
export async function writeOnlineFieldSubmissionDraft(db:SQLiteDatabase,id:string,draft:FieldDraft) {
  const owner=currentQueueIdentity();
  const guard=()=>{if(!owner||owner.role!=='REPAIR_CREW'||owner.actor!==draft.actor||owner.scope!==draft.scope||
    owner.environment!==draft.environment||!sameQueueIdentity(owner))throw Error('offline_session_changed');};
  guard();
  await db.withExclusiveTransactionAsync(async tx=>{
    guard();const rows=await (await openOfflineJournal(owner!,tx)).list();guard();
    if(rows.some(r=>containsSubmission(r,draft.projectId,draft.taskId)))throw Error('field_submission_pending');
    await assertSignedFieldMediaPreserved(tx,draft);
    await saveDraft(tx,id,'T05B_FIELD',{...draft});guard();
  });guard();
}

/** Serialize online FIELD writes against offline preparation in the same DB.
 * Neither path may create an independent command while the other is pending.
 */
export async function writeOnlineFieldJournal(db:SQLiteDatabase,record:FieldCommandRecord) {
  const owner=currentQueueIdentity();
  if(!owner||owner.actor!==record.actorId||owner.scope!==record.scope)throw Error('offline_session_changed');
  await db.withExclusiveTransactionAsync(async tx=>{
    const rows=await (await openOfflineJournal(owner,tx)).list();
    if(rows.some(r=>r.projectId===record.projectId&&fieldStartTasks(r).includes(record.taskId)&&r.phase!=='RECONCILED'))throw Error('field_command_pending');
    if(!sameQueueIdentity(owner))throw Error('offline_session_changed');
    await saveDraft(tx,`t05a-field:${record.actorId}:${record.projectId}:${record.taskId}`,'T05A_FIELD_COMMAND',{...record});
    if(!sameQueueIdentity(owner))throw Error('offline_session_changed');
  });
}

export interface DeviceRecoveryBinding {deviceId:string;signingPublicKey:string;encryptionPublicKey:string}

export type OfflinePhase='PREPARED'|'IN_FLIGHT'|'UNKNOWN_OUTCOME'|'RECEIVED'|'RECONCILED'|'REJECTED'|'CONFLICT';
export interface OfflineIntent {
  id:string;identity:QueueIdentity;projectId:string;path:string;key:string;body:string;proof:Record<string,unknown>;
}
export interface VerifiedOfflineItem {originId:string;effectId:string;canonicalOriginId:string;kind:string;serverBatchId:string|null;state:string;serverReceivedAt:string}
export interface TerminalOfflineItem {originId:string;kind:string;serverBatchId:string;state:'REJECTED'|'CONFLICT'|'STALE_SNAPSHOT';code:string|null;serverReceivedAt:string}
export interface OfflineJournalRecord extends OfflineIntent {schema:1;phase:OfflinePhase;receipt?:unknown;verifiedItems?:VerifiedOfflineItem[];terminalItems?:TerminalOfflineItem[]}
const KIND='C10BC_IMMUTABLE_COMMAND_V1';
const ARTIFACT_KIND='C10BC_HANDOVER_ARTIFACT_V1';
const rowKind=(r:OfflineIntent)=>r.proof.kind==='handover-artifact'?ARTIFACT_KIND:KIND;
const guid=(v:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)&&v!=='00000000-0000-0000-0000-000000000000';
function safe(value:unknown,depth=0,seen=new Set<object>()):void {
  if(depth>64)throw Error('offline_journal_invalid');
  if(value===null||['string','boolean'].includes(typeof value))return;
  if(typeof value==='number'&&Number.isFinite(value))return;
  if(value&&typeof value==='object'){if(seen.has(value))throw Error('offline_journal_invalid');seen.add(value);}
  if(Array.isArray(value)){value.forEach(v=>safe(v,depth+1,seen));seen.delete(value);return;}
  if(value&&typeof value==='object') {for(const [k,v] of Object.entries(value)) {
    if(/password|authorization(?!Id$)|token|private.?key|presigned|signedurl/i.test(k))throw Error('offline_secret_forbidden');safe(v,depth+1,seen);
  }seen.delete(value);return;}
  throw Error('offline_journal_invalid');
}
function immutable(i:OfflineIntent):OfflineIntent {
  if(!guid(i.id)||!guid(i.projectId)||!guid(i.identity.actor)||i.identity.role!=='REPAIR_CREW'||!i.identity.scope||
    !/^https?:\/\/[^@?#\s]+$/.test(i.identity.environment)||!/^\/[a-zA-Z0-9/-]+$/.test(i.path)||
    !/^[\x21-\x7e]{1,150}$/.test(i.key)||typeof i.body!=='string'||i.body.length>24*1024*1024)throw Error('offline_intent_invalid');
  safe(JSON.parse(i.body));safe(i.proof);
  return JSON.parse(JSON.stringify({id:i.id,identity:i.identity,projectId:i.projectId,path:i.path,key:i.key,body:i.body,proof:i.proof}));
}
const immutableBytes=(i:OfflineIntent)=>JSON.stringify(immutable(i));
/** Shared strict reader for read-only recovery; does not grant dispatch authority. */
export function decodeOfflineJournalRecord(payload:string):OfflineJournalRecord {
  const r=JSON.parse(payload) as OfflineJournalRecord;immutable(r);
  if(r.schema!==1||!['PREPARED','IN_FLIGHT','UNKNOWN_OUTCOME','RECEIVED','RECONCILED','REJECTED','CONFLICT'].includes(r.phase))throw Error('offline_journal_invalid');
  if(r.proof.kind==='session-confirm'){
    if(r.phase!=='RECONCILED'||!guid(String(r.proof.registrationId))||typeof r.proof.confirmedScope!=='string'||r.proof.confirmedScope!==r.identity.scope||
      !Array.isArray(r.proof.snapshotIds)||r.proof.snapshotIds.some(id=>typeof id!=='string'||!guid(id))||
      (r.proof.revokedSnapshotIds!==undefined&&(!Array.isArray(r.proof.revokedSnapshotIds)||r.proof.revokedSnapshotIds.some(id=>typeof id!=='string'||!guid(id))))||
      r.path!==`/projects/${r.projectId}/offline/devices/${r.proof.registrationId}`)throw Error('offline_journal_invalid');
  }
  if(['RECEIVED','RECONCILED','REJECTED','CONFLICT'].includes(r.phase)&&r.receipt===undefined)throw Error('offline_receipt_missing');
  if(r.receipt!==undefined)safe(r.receipt);
  if(r.verifiedItems!==undefined){
    if(!Array.isArray(r.verifiedItems)||new Set(r.verifiedItems.map(i=>i.originId)).size!==r.verifiedItems.length||r.verifiedItems.some(i=>
      !guid(i.originId)||!guid(i.effectId)||!guid(i.canonicalOriginId)||(i.serverBatchId!==null&&!guid(i.serverBatchId))||
      !['COMMITTED','REPLAYED'].includes(i.state)||!['FIELD_ACCEPT','FIELD_START','FIELD_SUBMISSION','REPAIR_ASSESSMENT','REPAIR_EXECUTION_START','REPAIR_EXECUTION_FINISH'].includes(i.kind)||!Number.isFinite(Date.parse(i.serverReceivedAt))))throw Error('offline_checkpoint_invalid');
    safe(r.verifiedItems);
  }
  if(r.terminalItems!==undefined){
    const descriptors=r.proof.descriptors as {originId:string;kind:string}[];
    if(!['signed-field-batch','handover-import'].includes(String(r.proof.kind))||!Array.isArray(descriptors)||!Array.isArray(r.terminalItems)||
      new Set(r.terminalItems.map(i=>i.originId)).size!==r.terminalItems.length||r.terminalItems.some(i=>
        !guid(i.originId)||!guid(i.serverBatchId)||!['REJECTED','CONFLICT','STALE_SNAPSHOT'].includes(i.state)||
        !(i.code===null||typeof i.code==='string')||!Number.isFinite(Date.parse(i.serverReceivedAt))||
        !descriptors.some(d=>d.originId===i.originId&&d.kind===i.kind)||(r.verifiedItems??[]).some(v=>v.originId===i.originId)))throw Error('offline_terminal_checkpoint_invalid');
    safe(r.terminalItems);
  }return r;
}
const decode=decodeOfflineJournalRecord;
function partition(i:QueueIdentity):string {return 'c10bc:'+JSON.stringify([i.environment,i.actor,i.role])+':';}
export function sameOfflinePartition(a:QueueIdentity,b:QueueIdentity):boolean {
  return a.actor===b.actor&&a.role===b.role&&a.environment===b.environment&&a.partition===b.partition;
}
/** Additive use of existing table. Never REPLACE, migrate, delete or adopt historical queues. */
export async function openOfflineJournal(identity:QueueIdentity,connection?:SQLiteDatabase,current= currentQueueIdentity) {
  const owner=JSON.parse(JSON.stringify(identity)) as QueueIdentity;
  const guard=()=>{if(owner.role!=='REPAIR_CREW'||!sameQueueIdentity(owner,current()))throw Error('offline_session_changed');};
  guard();const db=connection??openDatabase();if(!connection)await initDatabase(db);guard();
  const prefix=partition(owner);
  const canActOnRecord=async(tx:SQLiteDatabase,old:OfflineJournalRecord):Promise<boolean>=>{
    if(sameQueueIdentity(old.identity,owner))return true;
    if(!sameOfflinePartition(old.identity,owner))return false;
    const all=await rows(tx);
    let regId='';
    if(['signed-field-batch','handover-export','handover-import','handover-artifact'].includes(String(old.proof.kind)))regId=String(old.proof.registrationId??'');
    else if(old.proof.kind==='admission-upload'){
      const parent=all.find(r=>r.id===old.proof.batchIntentId&&r.projectId===old.projectId&&
        ['signed-field-batch','handover-import'].includes(String(r.proof.kind))&&sameOfflinePartition(r.identity,owner));
      regId=String(parent?.proof.registrationId??'');
    }else return false;
    if(!regId)return false;
    if(all.some(r=>r.projectId===old.projectId&&r.proof.kind==='revocation'&&r.proof.registrationId===regId))return false;
    return all.some(r=>r.projectId===old.projectId&&r.phase==='RECONCILED'&&r.proof.kind==='session-confirm'&&
      sameQueueIdentity(r.identity,owner)&&r.proof.registrationId===regId);
  };
  const rows=async(tx:SQLiteDatabase)=>{
    const r=await tx.getAllAsync<{id:string;payload:string}>('SELECT id,payload FROM local_draft WHERE kind=? AND substr(id,1,?)=? ORDER BY rowid',KIND,prefix.length,prefix);
    guard();return r.map(x=>{const r=decode(x.payload);if(partition(r.identity)!==prefix||x.id!==prefix+r.id)throw Error('offline_owner_invalid');return r;});
  };
  const validateDeviceRecovery=async(tx:SQLiteDatabase,old:OfflineJournalRecord,binding:DeviceRecoveryBinding)=>{
    if(!sameOfflinePartition(old.identity,owner)||!['enrollment','snapshot'].includes(String(old.proof.kind))||
      !guid(binding.deviceId)||typeof binding.signingPublicKey!=='string'||!binding.signingPublicKey||typeof binding.encryptionPublicKey!=='string'||!binding.encryptionPublicKey)throw Error('offline_device_recovery_source_invalid');
    const records=await rows(tx),base=`/projects/${old.projectId}/offline`;
    const enrollments=records.filter(r=>r.projectId===old.projectId&&r.proof.kind==='enrollment');
    if(enrollments.length!==1)throw Error('offline_registration_reconciliation_required');
    const enrollment=enrollments[0],request=JSON.parse(enrollment.body);
    if(!sameOfflinePartition(enrollment.identity,owner)||enrollment.path!==base+'/devices'||
      Object.entries(binding).some(([k,v])=>request[k]!==v))throw Error('offline_device_key_mismatch');
    const regId=String((enrollment.receipt as {id?:string})?.id??'');
    // An uncertain revocation must be resolved separately; recovery never undoes it.
    if(records.some(r=>r.projectId===old.projectId&&r.proof.kind==='revocation'&&(!regId||r.proof.registrationId===regId)))throw Error('offline_device_revocation_requires_online_check');
    if(old.proof.kind==='enrollment'){
      if(old.id!==enrollment.id||old.path!==base+'/devices')throw Error('offline_device_recovery_source_invalid');
    }else{
      const body=JSON.parse(old.body),device=enrollment.receipt as DeviceRecoveryBinding;
      if(old.path!==base+'/snapshots'||!guid(body.taskId)||!guid(regId)||body.deviceRegistrationId!==regId||
        enrollment.phase!=='RECONCILED'||Object.entries(binding).some(([k,v])=>device[k as keyof DeviceRecoveryBinding]!==v)||
        (!sameQueueIdentity(old.identity,owner)&&!records.some(r=>r.projectId===old.projectId&&r.proof.kind==='session-confirm'&&r.phase==='RECONCILED'&&sameQueueIdentity(r.identity,owner)&&r.proof.registrationId===regId)))throw Error('offline_session_recovery_required');
    }
  };
  const transitionRecord=async(old:OfflineJournalRecord,phase:OfflinePhase,receipt?:unknown,binding?:DeviceRecoveryBinding):Promise<OfflineJournalRecord>=>{
      guard();if(!sameOfflinePartition(old.identity,owner))throw Error('offline_session_changed');
      const transitions:Record<OfflinePhase,OfflinePhase[]>={PREPARED:['IN_FLIGHT'],IN_FLIGHT:['UNKNOWN_OUTCOME','RECEIVED','REJECTED','CONFLICT'],
        UNKNOWN_OUTCOME:['IN_FLIGHT','RECEIVED','CONFLICT'],RECEIVED:['RECONCILED','IN_FLIGHT'],RECONCILED:[],REJECTED:[],CONFLICT:[]};
      if(!transitions[old.phase]?.includes(phase))throw Error('offline_transition_invalid');
      if((old.proof.kind==='signed-field-batch'||(old.proof.kind==='handover-import'&&phase==='IN_FLIGHT'))&&old.terminalItems?.length)throw Error('offline_terminal_batch_retained');
      const next=decode(JSON.stringify({...old,phase,...(receipt===undefined?{}:{receipt})}));
      await db.withExclusiveTransactionAsync(async tx=>{
        guard();if(binding)await validateDeviceRecovery(tx,old,binding);
        else if(!await canActOnRecord(tx,old))throw Error('offline_session_changed');
        const row=await tx.getFirstAsync<{payload:string}>('SELECT payload FROM local_draft WHERE id=? AND kind=?',prefix+old.id,rowKind(old));guard();
        if(!row||row.payload!==JSON.stringify(old))throw Error('offline_journal_cas_failed');
        const result=await tx.runAsync('UPDATE local_draft SET payload=?,updated_at=? WHERE id=? AND kind=? AND payload=?',JSON.stringify(next),new Date().toISOString(),prefix+old.id,rowKind(old),row.payload);
        guard();if(result.changes!==1)throw Error('offline_journal_cas_failed');
      });guard();return next;
  };
  return {
    async list(){guard();return rows(db);},
    async readArtifact(id:string){
      guard();if(!guid(id))throw Error('offline_intent_invalid');
      const row=await db.getFirstAsync<{payload:string}>('SELECT payload FROM local_draft WHERE id=? AND kind=?',prefix+id,ARTIFACT_KIND);guard();
      if(!row)return null;
      const record=decode(row.payload);
      if(record.id!==id||rowKind(record)!==ARTIFACT_KIND||!sameOfflinePartition(record.identity,owner))throw Error('offline_owner_invalid');
      return record;
    },
    async prepareArtifacts(source:OfflineJournalRecord,intents:OfflineIntent[]){
      guard();if(!intents.length||intents.length>32)throw Error('offline_intent_invalid');
      await db.withExclusiveTransactionAsync(async tx=>{
        const row=await tx.getFirstAsync<{payload:string}>('SELECT payload FROM local_draft WHERE id=? AND kind=?',prefix+source.id,KIND);guard();
        if(row?.payload!==JSON.stringify(source)||source.proof.kind!=='handover-export'||source.phase!=='RECONCILED'||!await canActOnRecord(tx,source))throw Error('handover_export_source_changed');
        const now=new Date().toISOString();
        for(const intent of intents){
          const copy=immutable(intent);
          if(!sameQueueIdentity(copy.identity,owner)||copy.projectId!==source.projectId||rowKind(copy)!==ARTIFACT_KIND||
            copy.proof.exportIntentId!==source.id||copy.proof.registrationId!==source.proof.registrationId||
            copy.path!==`/projects/${source.projectId}/offline/artifacts`)throw Error('offline_intent_invalid');
          const record:OfflineJournalRecord={...copy,schema:1,phase:'PREPARED'};
          await tx.runAsync('INSERT INTO local_draft (id,kind,payload,created_at,updated_at) VALUES (?,?,?,?,?)',prefix+record.id,ARTIFACT_KIND,JSON.stringify(record),now,now);guard();
        }
      });guard();
    },
    /** Only the signed-batch reconciler supplies authenticated batch + origin GET facts. */
    async checkpointTerminal(old:OfflineJournalRecord,item:TerminalOfflineItem):Promise<OfflineJournalRecord>{
      guard();if(old.phase!=='RECEIVED'||!['signed-field-batch','handover-import'].includes(String(old.proof.kind))||!sameOfflinePartition(old.identity,owner))throw Error('offline_checkpoint_phase');
      if((old.receipt as {batchId?:string})?.batchId!==item.serverBatchId)throw Error('offline_terminal_checkpoint_invalid');
      const merged=new Map((old.terminalItems??[]).map(i=>[i.originId,i])),prior=merged.get(item.originId);
      if(prior&&JSON.stringify(prior)!==JSON.stringify(item))throw Error('offline_checkpoint_conflict');
      merged.set(item.originId,item);
      const next=decode(JSON.stringify({...old,terminalItems:[...merged.values()]}));
      await db.withExclusiveTransactionAsync(async tx=>{
        guard();if(!await canActOnRecord(tx,old))throw Error('offline_session_changed');
        const result=await tx.runAsync('UPDATE local_draft SET payload=?,updated_at=? WHERE id=? AND kind=? AND payload=?',JSON.stringify(next),new Date().toISOString(),prefix+old.id,KIND,JSON.stringify(old));
        guard();if(result.changes!==1)throw Error('offline_journal_cas_failed');
      });guard();return next;
    },
    /** Append authenticated per-origin observations without ACKing the batch or changing its immutable bytes. */
    async checkpoint(old:OfflineJournalRecord,items:VerifiedOfflineItem[]):Promise<OfflineJournalRecord>{
      guard();if(!sameOfflinePartition(old.identity,owner))throw Error('offline_session_changed');
      if(!['IN_FLIGHT','UNKNOWN_OUTCOME','RECEIVED'].includes(old.phase))throw Error('offline_checkpoint_phase');
      const merged=new Map((old.verifiedItems??[]).map(i=>[i.originId,i]));
      for(const item of items){const prior=merged.get(item.originId);
        if(prior&&(prior.effectId!==item.effectId||prior.canonicalOriginId!==item.canonicalOriginId||prior.kind!==item.kind||
          (prior.serverBatchId!==null&&prior.serverBatchId!==item.serverBatchId)))throw Error('offline_checkpoint_conflict');
        merged.set(item.originId,item);
      }
      const next=decode(JSON.stringify({...old,verifiedItems:[...merged.values()]}));
      await db.withExclusiveTransactionAsync(async tx=>{
        guard();if(!await canActOnRecord(tx,old))throw Error('offline_session_changed');
        const result=await tx.runAsync('UPDATE local_draft SET payload=?,updated_at=? WHERE id=? AND kind=? AND payload=?',JSON.stringify(next),new Date().toISOString(),prefix+old.id,KIND,JSON.stringify(old));
        guard();if(result.changes!==1)throw Error('offline_journal_cas_failed');
      });guard();return next;
    },
    async prepare(intent:OfflineIntent):Promise<OfflineJournalRecord> {
      guard();const copy=immutable(intent);
      if(!sameQueueIdentity(copy.identity,owner))throw Error('offline_session_changed');
      let result:OfflineJournalRecord={...copy,schema:1,phase:'PREPARED'};
      await db.withExclusiveTransactionAsync(async tx=>{
        guard();const records=await rows(tx),old=records.find(r=>r.id===copy.id||r.key===copy.key);
        if(old){
          const crossAdmission=old.proof.kind==='admission-upload'&&copy.proof.kind==='admission-upload'&&
            immutableBytes({...old,identity:copy.identity})===immutableBytes(copy)&&await canActOnRecord(tx,old);
          if(!crossAdmission&&immutableBytes(old)!==immutableBytes(copy))throw Error('offline_immutable_conflict');
          result=old;return;
        }
        if(copy.proof.kind==='handover-import'||copy.proof.kind==='handover-export'){
          const previous=records.find(r=>r.projectId===copy.projectId&&r.proof.kind===copy.proof.kind&&
            (copy.proof.kind==='handover-import'?r.proof.sourceBatchId===copy.proof.sourceBatchId&&
              r.proof.sourceDeviceRegistrationId===copy.proof.sourceDeviceRegistrationId:
              r.proof.sourceBatchIntentId===copy.proof.sourceBatchIntentId&&JSON.stringify(r.proof.recipientFingerprints)===JSON.stringify(copy.proof.recipientFingerprints)));
          if(previous){
            if(!await canActOnRecord(tx,previous)||previous.proof.registrationId!==copy.proof.registrationId||
              (copy.proof.kind==='handover-import'&&(previous.proof.packageId!==copy.proof.packageId||previous.proof.grantId!==copy.proof.grantId||
                previous.proof.payloadHash!==copy.proof.payloadHash)))throw Error('handover_previous_intent_requires_reconciliation');
            result=previous;return;
          }
        }
        // Resource uniqueness is checked inside the SQLite transaction, across sessions.
        if(copy.proof.kind==='enrollment'&&records.some(r=>r.projectId===copy.projectId&&r.proof.kind==='enrollment'))throw Error('offline_existing_intent_reconciliation_required');
        if(copy.proof.kind==='snapshot'){
          const source=JSON.parse(copy.body);
          const history=records.filter(r=>r.projectId===copy.projectId&&r.proof.kind==='snapshot'&&
            JSON.parse(r.body).taskId===source.taskId&&JSON.parse(r.body).deviceRegistrationId===source.deviceRegistrationId);
          const previous=history.at(-1);
          if(previous){
            const confirmedDevice=records.some(r=>r.projectId===copy.projectId&&r.phase==='RECONCILED'&&r.proof.kind==='session-confirm'&&sameQueueIdentity(r.identity,owner)&&r.proof.registrationId===source.deviceRegistrationId);
            // Historical lineage only requires RECONCILED snapshots in the same partition once the device is confirmed for this session.
            if(history.some(r=>r.phase!=='RECONCILED'||(!sameQueueIdentity(r.identity,owner)&&!(sameOfflinePartition(r.identity,owner)&&confirmedDevice)))||
              copy.proof.previousSnapshotIntentId!==previous.id||!copy.proof.taskVersion)throw Error('offline_existing_intent_reconciliation_required');
            if(records.some(r=>r.projectId===copy.projectId&&r.proof.kind==='signed-field-batch'&&r.phase!=='RECONCILED'&&
              (JSON.parse(r.body).operations??[]).some((o:{taskId?:string})=>o.taskId===source.taskId)))throw Error('offline_pending_batch_reconciliation_required');
            const online=await tx.getFirstAsync<{payload:string}>('SELECT payload FROM local_draft WHERE id=?',`t05a-field:${owner.actor}:${copy.projectId}:${source.taskId}`);guard();
            if(online){const c=JSON.parse(online.payload);if(!['confirmed','rejected'].includes(c.phase)||c.readbackStatus!==200)throw Error('offline_online_command_reconciliation_required');}
          }else if(copy.proof.previousSnapshotIntentId)throw Error('offline_snapshot_source_mismatch');
        }
        for(const taskId of fieldStartTasks(copy)){
          if(records.some(r=>r.projectId===copy.projectId&&fieldStartTasks(r).includes(taskId)))throw Error('offline_existing_intent_reconciliation_required');
          const online=await tx.getFirstAsync<{payload:string}>('SELECT payload FROM local_draft WHERE id=?',`t05a-field:${copy.identity.actor}:${copy.projectId}:${taskId}`);guard();
          if(online){const command=JSON.parse(online.payload);if(!['confirmed','rejected'].includes(command.phase)||command.readbackStatus!==200)throw Error('offline_online_command_reconciliation_required');}
        }
        if(copy.proof.kind==='signed-field-batch'){
          const repairOperations=new Set<string>();
          for(const op of JSON.parse(copy.body).operations??[]){
            if(['REPAIR_ASSESSMENT','REPAIR_EXECUTION_START','REPAIR_EXECUTION_FINISH'].includes(op.kind)){
              const operationKey=JSON.stringify([op.kind,op.taskId,op.repair?.resourceId]);
              if(repairOperations.has(operationKey))throw Error('repair_signed_command_pending');
              repairOperations.add(operationKey);
              // Independent online history cannot be adopted into a signed lineage.
              const online=await tx.getAllAsync<{payload:string}>('SELECT payload FROM local_draft WHERE kind=?','T06A_REPAIR_COMMAND');guard();
              if(online.some(row=>{const c=JSON.parse(row.payload),i=c.identity;return i?.actor===owner.actor&&i.environment===owner.environment&&
                i.projectId===copy.projectId&&i.taskId===op.taskId&&i.itemId===op.repair?.resourceId;}))throw Error('repair_online_history_reconciliation_required');
              if(records.some(r=>r.projectId===copy.projectId&&r.proof.kind==='signed-field-batch'&&
                (JSON.parse(r.body).operations??[]).some((old:{kind?:string;taskId?:string;repair?:{resourceId?:string}})=>
                  old.kind===op.kind&&old.taskId===op.taskId&&old.repair?.resourceId===op.repair?.resourceId)))throw Error('repair_signed_command_pending');
            }
            if(op.kind==='FIELD_SUBMISSION'){
              if(records.some(r=>containsSubmission(r,copy.projectId,op.taskId)))throw Error('field_submission_pending');
              const drafts=await tx.getAllAsync<{payload:string}>('SELECT payload FROM local_draft WHERE kind=?','T05B_FIELD');guard();
              // Do not adopt an online root/revision or an uncertain historical command.
              if(drafts.some(row=>{const d=JSON.parse(row.payload);return d.actor===owner.actor&&d.environment===owner.environment&&
                d.projectId===copy.projectId&&d.taskId===op.taskId&&d.command;}))throw Error('field_submission_pending');
            }
            const localEvidence=(op.fieldSubmission?.evidence??op.repair?.assessment?.evidence??[]).filter((e:{fileId?:string|null})=>e.fileId==null);
            if(localEvidence.length){
              const drafts=await tx.getAllAsync<{payload:string}>('SELECT payload FROM local_draft WHERE kind=?','T05B_FIELD');guard();
              const candidates=drafts.map(row=>JSON.parse(row.payload) as FieldDraft).filter(d=>d.actor===owner.actor&&d.environment===owner.environment&&
                d.scope===owner.scope&&d.projectId===copy.projectId&&d.taskId===op.taskId);
              if(!candidates.some(d=>localEvidence.every((e:{captureOriginId:string;purpose:string;mediaType:string;checksumSha256:string;sizeBytes?:number})=>
                d.captures.some(c=>c.id===e.captureOriginId&&!c.cancelState&&c.uri&&c.vault&&c.localOnly===true&&!c.upload&&!c.uploadAttempt&&
                  c.purpose===e.purpose&&c.mediaType===e.mediaType&&c.checksum===e.checksumSha256&&(e.sizeBytes==null||c.size===e.sizeBytes)))))throw Error('field_signed_capture_locked');
            }
            const confirmedSnapshots=new Set(records.filter(r=>r.projectId===copy.projectId&&r.phase==='RECONCILED'&&r.proof.kind==='session-confirm'&&sameQueueIdentity(r.identity,owner))
              .flatMap(r=>Array.isArray(r.proof.snapshotIds)?r.proof.snapshotIds.map(String):[]));
            const head=records.filter(r=>r.projectId===copy.projectId&&r.proof.kind==='snapshot'&&JSON.parse(r.body).taskId===op.taskId).at(-1);
            if(head&&(head.phase!=='RECONCILED'||(!sameQueueIdentity(head.identity,owner)&&!(sameOfflinePartition(head.identity,owner)&&confirmedSnapshots.has(head.id)))||(head.receipt as {id?:string})?.id!==op.snapshotId))throw Error('offline_current_snapshot_required');
          }
        }
        // Serialize safety writes per measure inside the durable transaction, including older sessions.
        if(copy.proof.kind==='safety'&&records.some(r=>r.proof.kind==='safety'&&
          (r.proof.resource as {measureId?:string})?.measureId===(copy.proof.resource as {measureId?:string})?.measureId&&
          !['RECONCILED','REJECTED','CONFLICT'].includes(r.phase)))throw Error('safety_pending_command');
        if(copy.proof.kind==='review-request'&&records.some(r=>r.proof.kind==='review-request'&&
          (r.proof.resource as {itemId?:string})?.itemId===(copy.proof.resource as {itemId?:string})?.itemId&&
          !['RECONCILED','REJECTED','CONFLICT'].includes(r.phase)))throw Error('review_pending_command');
        const now=new Date().toISOString();
        await tx.runAsync('INSERT INTO local_draft (id,kind,payload,created_at,updated_at) VALUES (?,?,?,?,?)',prefix+copy.id,KIND,JSON.stringify(result),now,now);guard();
      });guard();return result;
    },
    async confirmSession(intent:OfflineIntent,deviceReceipt:unknown):Promise<OfflineJournalRecord> {
      guard();const copy=immutable(intent);
      if(!sameQueueIdentity(copy.identity,owner)||copy.proof.kind!=='session-confirm')throw Error('offline_session_changed');
      let saved!:OfflineJournalRecord;
      await db.withExclusiveTransactionAsync(async tx=>{
        guard();const records=await rows(tx);
        if(records.some(r=>r.projectId===copy.projectId&&r.proof.kind==='revocation'&&r.proof.registrationId===copy.proof.registrationId))throw Error('offline_device_revocation_requires_online_check');
        const existing=records.find(r=>r.projectId===copy.projectId&&r.phase==='RECONCILED'&&r.proof.kind==='session-confirm'&&
          sameQueueIdentity(r.identity,owner)&&r.proof.registrationId===copy.proof.registrationId);
        const latestByTask=new Map<string,string>();
        for(const r of records){
          if(r.projectId===copy.projectId&&r.phase==='RECONCILED'&&r.proof.kind==='snapshot'){
            const body=JSON.parse(r.body) as {taskId?:string;deviceRegistrationId?:string};
            if(body.deviceRegistrationId===copy.proof.registrationId&&body.taskId)latestByTask.set(body.taskId,r.id);
          }
        }
        const activeHeadIds=new Set(latestByTask.values());
        const revokedIds=new Set(Array.isArray(copy.proof.revokedSnapshotIds)?copy.proof.revokedSnapshotIds.map(String):[]);
        const retainedIds=(Array.isArray(existing?.proof.snapshotIds)?existing.proof.snapshotIds.map(String):[])
          .filter(id=>activeHeadIds.has(id)&&!revokedIds.has(id));
        const copyIds=(Array.isArray(copy.proof.snapshotIds)?copy.proof.snapshotIds.map(String):[])
          .filter(id=>activeHeadIds.has(id)&&!revokedIds.has(id));
        const mergedIds=[...new Set([...retainedIds,...copyIds])];
        const nextIntent=existing?{...existing,body:JSON.stringify({registrationId:copy.proof.registrationId,confirmedScope:owner.scope,snapshotIds:mergedIds}),
          proof:{kind:'session-confirm',registrationId:copy.proof.registrationId,confirmedScope:owner.scope,snapshotIds:mergedIds}}:
          {...copy,body:JSON.stringify({registrationId:copy.proof.registrationId,confirmedScope:owner.scope,snapshotIds:mergedIds}),
          proof:{kind:'session-confirm',registrationId:copy.proof.registrationId,confirmedScope:owner.scope,snapshotIds:mergedIds}};
        saved=decode(JSON.stringify({...nextIntent,schema:1,phase:'RECONCILED',receipt:deviceReceipt}));
        const now=new Date().toISOString();
        if(existing){
          const res=await tx.runAsync('UPDATE local_draft SET payload=?,updated_at=? WHERE id=? AND kind=? AND payload=?',JSON.stringify(saved),now,prefix+existing.id,KIND,JSON.stringify(existing));
          guard();if(res.changes!==1)throw Error('offline_journal_cas_failed');
        }else{
          await tx.runAsync('INSERT INTO local_draft (id,kind,payload,created_at,updated_at) VALUES (?,?,?,?,?)',prefix+saved.id,KIND,JSON.stringify(saved),now,now);guard();
        }
      });guard();return saved;
    },
    transition:(old:OfflineJournalRecord,phase:OfflinePhase,receipt?:unknown)=>transitionRecord(old,phase,receipt),
    // Dedicated recovery only; ordinary dispatch authority remains unchanged.
    transitionDeviceRecovery:(old:OfflineJournalRecord,phase:OfflinePhase,binding:DeviceRecoveryBinding,receipt?:unknown)=>transitionRecord(old,phase,receipt,binding),
  };
}
