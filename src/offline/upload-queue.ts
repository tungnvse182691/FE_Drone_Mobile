import type * as SQLite from 'expo-sqlite';
import { generateChecksum } from './checksum';
import { LocalState } from '../types/enums';
import { uuidv4 } from '../utils/uuid';
import { decodeBase64Utf8, encodeBase64Utf8 } from '../utils/base64';
import type { OutboxItem } from '../types/domain';
import { useAuthStore } from '../store/auth';
import { passwordSessionIdentity } from '../api/authApi';
import { apiClient } from '../api/client';
export type { OutboxItem };

export interface QueueIdentity { actor:string; role:string; environment:string; scope:string; partition:string }
/** Stable account partition; the live session is separately checked across every await. */
export function currentQueueIdentity():QueueIdentity|null {
  const s=useAuthStore.getState(), scope=passwordSessionIdentity(s.token),environment=apiClient.defaults.baseURL??'';
  if(!s.user||!scope||JSON.parse(scope)[0]!==s.user.id||s.user.must_change_password||
    !['AUTHENTICATED','REFRESHING'].includes(s.status)||!['REPAIR_CREW','DRONE_OPERATOR'].includes(s.user.role_code)||
    (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.user.id)||s.user.id==='00000000-0000-0000-0000-000000000000')||!/^https?:\/\/[^@?#\s]+$/.test(environment))return null;
  const actor=s.user.id,role=s.user.role_code;
  return {actor,role,environment,scope,partition:'h01:'+JSON.stringify([environment,actor,role])};
}
export function sameQueueIdentity(i:QueueIdentity,current=currentQueueIdentity()):boolean {
  return !!current&&(['actor','role','environment','scope','partition'] as const).every(k=>i[k]===current[k]);
}
function requireIdentity(partition?:string):QueueIdentity {
  const i=currentQueueIdentity();if(!i||(partition!==undefined&&partition!==i.partition))throw Error('queue_session_or_partition_invalid');return i;
}
function guard(i:QueueIdentity) {if(!sameQueueIdentity(i))throw Error('queue_session_changed');}
export function getActivePartition():string {return requireIdentity().partition;}
/** Compatibility entrypoint cannot adopt a legacy or caller-invented partition. */
export function setActivePartition(partitionId:string):void {requireIdentity(partitionId);}
export interface OutboxEnqueueOptions { partitionId?:string;initialStatus?:string;taskId?:string|null;expectedVersion?:string|null;idempotencyKey?:string }
export interface OperationReceipt {operationId:string;localState:string;resourceId?:string|null;resourceVersion?:string|null;errorCode?:string|null;errorMessage?:string|null;traceId?:string|null}
export type OperationUploader=(item:OutboxItem)=>Promise<OperationReceipt[]|void>;
export const QUEUE_CONTRACT_NOTICE='BLOCKED_CONTRACT: đồng bộ ký API-130 chưa được triển khai; dữ liệu được giữ để đối soát, không gửi mạng.';
export function decodeOutboxPayload(item:OutboxItem):string {return decodeBase64Utf8(item.data_b64);}
export function queueChecksumLabel(value:unknown):string {
  return typeof value==='string'&&/^[a-f0-9]{64}$/i.test(value)?`SHA-256 ${value.slice(0,12)}…`:'SHA-256 chưa hợp lệ';
}
/** New intents have proven account ownership but remain blocked until signed admission exists. */
export async function enqueue(db:SQLite.SQLiteDatabase,kind:string,payload:string,options:OutboxEnqueueOptions={}):Promise<string> {
  const i=requireIdentity(options.partitionId),id=uuidv4(),key=options.idempotencyKey??uuidv4();
  const checksum=await generateChecksum(payload);guard(i);
  if(!/^[a-f0-9]{64}$/i.test(checksum))throw Error('queue_checksum_invalid');
  const now=new Date().toISOString();
  await db.withExclusiveTransactionAsync(async tx=>{
    guard(i);
    await tx.runAsync(`INSERT INTO offline_outbox (id,partition_id,kind,payload_b64,checksum_sha256,idempotency_key,task_id,expected_version,local_state,attempt,next_attempt_at,last_error,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,0,NULL,?,?,?)`,id,i.partition,kind,encodeBase64Utf8(payload),checksum,key,options.taskId??null,options.expectedVersion??null,LocalState.BLOCKED_CONTRACT,QUEUE_CONTRACT_NOTICE,now,now);guard(i);
    await tx.runAsync('INSERT INTO idempotency_keys (key,operation_id,request_hash,response_status,created_at,updated_at) VALUES (?,?,?,NULL,?,?)',key,id,checksum,now,now);guard(i);
  });guard(i);return id;
}
export async function enqueuePayload(db:SQLite.SQLiteDatabase,kind:string,payload:Record<string,unknown>,options:OutboxEnqueueOptions={}):Promise<string> {
  return enqueue(db,kind,JSON.stringify(payload),options);
}
/** Never touches local/unproven ownership, other accounts, media, or T06 journals. */
export async function quarantineQueue(db:SQLite.SQLiteDatabase,identity=requireIdentity()):Promise<void> {
  guard(identity);
  await db.withExclusiveTransactionAsync(async tx=>{
    guard(identity);
    const rows=await tx.getAllAsync<{id:string;status:string;last_error:string|null}>('SELECT id,local_state AS status,last_error FROM offline_outbox WHERE partition_id = ?',identity.partition);guard(identity);
    for(const row of rows) {
      if(row.status===LocalState.BLOCKED_CONTRACT)continue;
      await tx.runAsync('UPDATE offline_outbox SET local_state = ?, last_error = ?, updated_at = ? WHERE id = ? AND partition_id = ?',
        LocalState.BLOCKED_CONTRACT,`${QUEUE_CONTRACT_NOTICE} Trạng thái cũ: ${row.status}. ${row.last_error??''}`,new Date().toISOString(),row.id,identity.partition);guard(identity);
    }
  });guard(identity);
}
export async function readQueue(db:SQLite.SQLiteDatabase,identity=requireIdentity()):Promise<OutboxItem[]> {
  guard(identity);await quarantineQueue(db,identity);guard(identity);
  const rows=await db.getAllAsync<OutboxItem>(`SELECT id,kind,payload_b64 AS data_b64,checksum_sha256,local_state AS status,
    attempt,5 AS max_attempts,last_error,created_at,updated_at,partition_id,task_id,expected_version FROM offline_outbox WHERE partition_id = ? ORDER BY created_at DESC`,identity.partition);
  guard(identity);return rows;
}
/** A monotonically ordered reader prevents older reloads replacing newer UI results. */
export function createQueueReader(identity:QueueIdentity) {
  let sequence=0;
  return {cancel:()=>{sequence++;},async read(db:SQLite.SQLiteDatabase):Promise<OutboxItem[]|null> {
    const n=++sequence,rows=await readQueue(db,identity);guard(identity);return n===sequence?rows:null;
  }};
}
/** Unsupported work must never reach a caller-supplied uploader, even through legacy callers. */
export async function dequeue(db:SQLite.SQLiteDatabase):Promise<OutboxItem|null> {await quarantineQueue(db);return null;}
export async function processQueue(db:SQLite.SQLiteDatabase,_uploader:OperationUploader):Promise<void> {await quarantineQueue(db);}
export async function updateOutboxState(db:SQLite.SQLiteDatabase,id:string,status:string,_error:string|null=null):Promise<void> {
  if(status!==LocalState.BLOCKED_CONTRACT)throw Error('queue_contract_unavailable');
  const i=requireIdentity();await quarantineQueue(db,i);guard(i);
}
export async function retry(db:SQLite.SQLiteDatabase,_itemId:string):Promise<void> {await quarantineQueue(db);}
export async function recoverInFlight(db:SQLite.SQLiteDatabase,partitionId?:string):Promise<number> {
  const i=requireIdentity(partitionId);let changes=0;
  await db.withExclusiveTransactionAsync(async tx=>{guard(i);const result=await tx.runAsync('UPDATE offline_outbox SET local_state = ?, updated_at = ? WHERE partition_id = ? AND local_state = ?',
    LocalState.UNKNOWN_OUTCOME,new Date().toISOString(),i.partition,LocalState.IN_FLIGHT);guard(i);changes=result.changes??0;});guard(i);return changes;
}
export async function countByState(db:SQLite.SQLiteDatabase,partitionId?:string):Promise<Record<string,number>> {
  const i=requireIdentity(partitionId);const rows=await db.getAllAsync<{local_state:string;total:number}>('SELECT local_state,COUNT(*) AS total FROM offline_outbox WHERE partition_id = ? GROUP BY local_state',i.partition);guard(i);
  return rows.reduce<Record<string,number>>((a,r)=>{a[r.local_state]=r.total;return a;},{});
}
/** Historical receipts can be read only by their account; no new receipts are manufactured. */
export async function getReceipts(db:SQLite.SQLiteDatabase,envelopeKey:string):Promise<OperationReceipt[]> {
  const i=requireIdentity();const rows=await db.getAllAsync<{operation_id:string;local_state:string;resource_id:string|null;resource_version:string|null;error_code:string|null;error_message:string|null;trace_id:string|null}>(
    'SELECT operation_id,local_state,resource_id,resource_version,error_code,error_message,trace_id FROM wire_command WHERE envelope_key = ? AND partition_id = ?',envelopeKey,i.partition);guard(i);
  return rows.map(r=>({operationId:r.operation_id,localState:r.local_state,resourceId:r.resource_id,resourceVersion:r.resource_version,errorCode:r.error_code,errorMessage:r.error_message,traceId:r.trace_id}));
}
