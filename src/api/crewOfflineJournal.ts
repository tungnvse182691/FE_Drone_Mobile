import type { SQLiteDatabase } from 'expo-sqlite';
import { openDatabase, initDatabase } from '../offline/database';
import { currentQueueIdentity, sameQueueIdentity, type QueueIdentity } from '../offline/upload-queue';
import type { FieldCommandRecord } from './crewApi';
import { saveDraft } from '../offline/database';

/** Serialize online FIELD writes against offline preparation in the same DB.
 * Neither path may create an independent command while the other is pending.
 */
export async function writeOnlineFieldJournal(db:SQLiteDatabase,record:FieldCommandRecord) {
  const owner=currentQueueIdentity();
  if(!owner||owner.actor!==record.actorId||owner.scope!==record.scope)throw Error('offline_session_changed');
  await db.withExclusiveTransactionAsync(async tx=>{
    const rows=await (await openOfflineJournal(owner,tx)).list();
    if(rows.some(r=>r.projectId===record.projectId&&r.proof.fieldStartTaskId===record.taskId&&r.phase!=='RECONCILED'))throw Error('field_command_pending');
    if(!sameQueueIdentity(owner))throw Error('offline_session_changed');
    await saveDraft(tx,`t05a-field:${record.actorId}:${record.projectId}:${record.taskId}`,'T05A_FIELD_COMMAND',{...record});
    if(!sameQueueIdentity(owner))throw Error('offline_session_changed');
  });
}

export type OfflinePhase='PREPARED'|'IN_FLIGHT'|'UNKNOWN_OUTCOME'|'RECEIVED'|'RECONCILED'|'REJECTED'|'CONFLICT';
export interface OfflineIntent {
  id:string;identity:QueueIdentity;projectId:string;path:string;key:string;body:string;proof:Record<string,unknown>;
}
export interface VerifiedOfflineItem {originId:string;effectId:string;canonicalOriginId:string;kind:string;serverBatchId:string|null;state:string;serverReceivedAt:string}
export interface OfflineJournalRecord extends OfflineIntent {schema:1;phase:OfflinePhase;receipt?:unknown;verifiedItems?:VerifiedOfflineItem[]}
const KIND='C10BC_IMMUTABLE_COMMAND_V1';
const guid=(v:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)&&v!=='00000000-0000-0000-0000-000000000000';
function safe(value:unknown,depth=0,seen=new Set<object>()):void {
  if(depth>64)throw Error('offline_journal_invalid');
  if(value===null||['string','boolean'].includes(typeof value))return;
  if(typeof value==='number'&&Number.isFinite(value))return;
  if(value&&typeof value==='object'){if(seen.has(value))throw Error('offline_journal_invalid');seen.add(value);}
  if(Array.isArray(value)){value.forEach(v=>safe(v,depth+1,seen));seen.delete(value);return;}
  if(value&&typeof value==='object') {for(const [k,v] of Object.entries(value)) {
    if(/password|authorization|token|private.?key|presigned|signedurl/i.test(k))throw Error('offline_secret_forbidden');safe(v,depth+1,seen);
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
  if(['RECEIVED','RECONCILED','REJECTED','CONFLICT'].includes(r.phase)&&r.receipt===undefined)throw Error('offline_receipt_missing');
  if(r.receipt!==undefined)safe(r.receipt);
  if(r.verifiedItems!==undefined){
    if(!Array.isArray(r.verifiedItems)||new Set(r.verifiedItems.map(i=>i.originId)).size!==r.verifiedItems.length||r.verifiedItems.some(i=>
      !guid(i.originId)||!guid(i.effectId)||!guid(i.canonicalOriginId)||(i.serverBatchId!==null&&!guid(i.serverBatchId))||
      !['COMMITTED','REPLAYED'].includes(i.state)||!['FIELD_ACCEPT','FIELD_START','FIELD_SUBMISSION'].includes(i.kind)||!Number.isFinite(Date.parse(i.serverReceivedAt))))throw Error('offline_checkpoint_invalid');
    safe(r.verifiedItems);
  }return r;
}
const decode=decodeOfflineJournalRecord;
function partition(i:QueueIdentity):string {return 'c10bc:'+JSON.stringify([i.environment,i.actor,i.role])+':';}
/** Additive use of existing table. Never REPLACE, migrate, delete or adopt historical queues. */
export async function openOfflineJournal(identity:QueueIdentity,connection?:SQLiteDatabase,current= currentQueueIdentity) {
  const owner=JSON.parse(JSON.stringify(identity)) as QueueIdentity;
  const guard=()=>{if(owner.role!=='REPAIR_CREW'||!sameQueueIdentity(owner,current()))throw Error('offline_session_changed');};
  guard();const db=connection??openDatabase();if(!connection)await initDatabase(db);guard();
  const prefix=partition(owner);
  const rows=async(tx:SQLiteDatabase)=>{
    const r=await tx.getAllAsync<{id:string;payload:string}>('SELECT id,payload FROM local_draft WHERE kind=? AND substr(id,1,?)=? ORDER BY rowid',KIND,prefix.length,prefix);
    guard();return r.map(x=>{const r=decode(x.payload);if(partition(r.identity)!==prefix||x.id!==prefix+r.id)throw Error('offline_owner_invalid');return r;});
  };
  return {
    async list(){guard();return rows(db);},
    /** Append authenticated per-origin observations without ACKing the batch or changing its immutable bytes. */
    async checkpoint(old:OfflineJournalRecord,items:VerifiedOfflineItem[]):Promise<OfflineJournalRecord>{
      guard();if(!sameQueueIdentity(old.identity,owner))throw Error('offline_session_changed');
      if(!['IN_FLIGHT','UNKNOWN_OUTCOME','RECEIVED'].includes(old.phase))throw Error('offline_checkpoint_phase');
      const merged=new Map((old.verifiedItems??[]).map(i=>[i.originId,i]));
      for(const item of items){const prior=merged.get(item.originId);
        if(prior&&(prior.effectId!==item.effectId||prior.canonicalOriginId!==item.canonicalOriginId||prior.kind!==item.kind||
          (prior.serverBatchId!==null&&prior.serverBatchId!==item.serverBatchId)))throw Error('offline_checkpoint_conflict');
        merged.set(item.originId,item);
      }
      const next=decode(JSON.stringify({...old,verifiedItems:[...merged.values()]}));
      await db.withExclusiveTransactionAsync(async tx=>{
        guard();const result=await tx.runAsync('UPDATE local_draft SET payload=?,updated_at=? WHERE id=? AND kind=? AND payload=?',JSON.stringify(next),new Date().toISOString(),prefix+old.id,KIND,JSON.stringify(old));
        guard();if(result.changes!==1)throw Error('offline_journal_cas_failed');
      });guard();return next;
    },
    async prepare(intent:OfflineIntent):Promise<OfflineJournalRecord> {
      guard();const copy=immutable(intent);
      if(!sameQueueIdentity(copy.identity,owner))throw Error('offline_session_changed');
      let result:OfflineJournalRecord={...copy,schema:1,phase:'PREPARED'};
      await db.withExclusiveTransactionAsync(async tx=>{
        guard();const records=await rows(tx),old=records.find(r=>r.id===copy.id||r.key===copy.key);
        if(old){if(immutableBytes(old)!==immutableBytes(copy))throw Error('offline_immutable_conflict');result=old;return;}
        // Resource uniqueness is checked inside the SQLite transaction, across sessions.
        if(copy.proof.kind==='enrollment'&&records.some(r=>r.projectId===copy.projectId&&r.proof.kind==='enrollment'))throw Error('offline_existing_intent_reconciliation_required');
        if(copy.proof.kind==='snapshot'){
          const source=JSON.parse(copy.body);
          if(records.some(r=>r.projectId===copy.projectId&&r.proof.kind==='snapshot'&&
            JSON.parse(r.body).taskId===source.taskId&&JSON.parse(r.body).deviceRegistrationId===source.deviceRegistrationId))throw Error('offline_existing_intent_reconciliation_required');
        }
        if(copy.proof.kind==='signed-field-batch'&&copy.proof.fieldStartTaskId){
          if(records.some(r=>r.projectId===copy.projectId&&r.proof.fieldStartTaskId===copy.proof.fieldStartTaskId))throw Error('offline_existing_intent_reconciliation_required');
          const online=await tx.getFirstAsync<{payload:string}>('SELECT payload FROM local_draft WHERE id=?',`t05a-field:${copy.identity.actor}:${copy.projectId}:${copy.proof.fieldStartTaskId}`);guard();
          if(online){const command=JSON.parse(online.payload);if(!['confirmed','rejected'].includes(command.phase)||command.readbackStatus!==200)throw Error('offline_online_command_reconciliation_required');}
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
    async transition(old:OfflineJournalRecord,phase:OfflinePhase,receipt?:unknown):Promise<OfflineJournalRecord> {
      guard();if(!sameQueueIdentity(old.identity,owner))throw Error('offline_session_changed');
      const transitions:Record<OfflinePhase,OfflinePhase[]>={PREPARED:['IN_FLIGHT'],IN_FLIGHT:['UNKNOWN_OUTCOME','RECEIVED','REJECTED','CONFLICT'],
        UNKNOWN_OUTCOME:['IN_FLIGHT','RECEIVED','CONFLICT'],RECEIVED:['RECONCILED','IN_FLIGHT'],RECONCILED:[],REJECTED:[],CONFLICT:[]};
      if(!transitions[old.phase]?.includes(phase))throw Error('offline_transition_invalid');
      const next=decode(JSON.stringify({...old,phase,...(receipt===undefined?{}:{receipt})}));
      await db.withExclusiveTransactionAsync(async tx=>{
        guard();const row=await tx.getFirstAsync<{payload:string}>('SELECT payload FROM local_draft WHERE id=? AND kind=?',prefix+old.id,KIND);guard();
        if(!row||row.payload!==JSON.stringify(old))throw Error('offline_journal_cas_failed');
        const result=await tx.runAsync('UPDATE local_draft SET payload=?,updated_at=? WHERE id=? AND kind=? AND payload=?',JSON.stringify(next),new Date().toISOString(),prefix+old.id,KIND,row.payload);
        guard();if(result.changes!==1)throw Error('offline_journal_cas_failed');
      });guard();return next;
    },
  };
}
