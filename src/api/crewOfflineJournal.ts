import type { SQLiteDatabase } from 'expo-sqlite';
import { openDatabase, initDatabase } from '../offline/database';
import { currentQueueIdentity, sameQueueIdentity, type QueueIdentity } from '../offline/upload-queue';

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
function decode(payload:string):OfflineJournalRecord {
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
