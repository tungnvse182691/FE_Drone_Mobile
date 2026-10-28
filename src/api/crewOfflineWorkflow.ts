import { apiClient } from './client';
import { crewReadGuard } from './crewSafetyWorkflow';
import { isCrewResourceId, isRepairItemVersion } from './crewApi';
import type { QueueIdentity } from '../offline/upload-queue';
import { openOfflineJournal, type OfflineJournalRecord } from './crewOfflineJournal';
import { NATIVE_ACCEPTANCE_VERIFIED } from '../../modules/roadguard-offline-crypto';

export interface DeviceRegistration {
  id:string;projectId?:string;actorId:string;deviceId:string;revision:number;role:string;
  encryptionPublicKey:string;signingPublicKey:string;keyFingerprint:string;registeredAt:string;revokedAt:string|null;
}
export interface SourceSnapshot {
  id:string;taskId:string;assignmentId:string;originalActorId:string;deviceRegistrationId:string;taskVersion:string;
  assignmentHash:string;contentHash:string;downloadedAt:string;snapshot:unknown;
}
export interface OfflineItemReceipt {
  originId:string;kind:string;state:string;code:string|null;effectId:string|null;canonicalOriginId:string|null;
  durableAcknowledgment:boolean;serverReceivedAt:string;outcome:unknown;
}
export interface OfflineBatchReceipt {batchId:string;items:OfflineItemReceipt[];localQueueInstruction:string}
export type OfflineReadKind='artifacts'|'batches'|'devices'|'grants'|'origins'|'packages'|'snapshots';
const reads:OfflineReadKind[]=['artifacts','batches','devices','grants','origins','packages','snapshots'];
export function offlineProjectPath(projectId:string):string {
  if(!isCrewResourceId(projectId))throw Error('offline_project_source_required');
  return `/projects/${projectId}/offline`;
}
/** API-114/115/117/120/123/124/128. No public URLs and no privileged discovery fallback. */
export async function readOfflineResource<T=unknown>(identity:QueueIdentity,projectId:string,kind:OfflineReadKind,id:string):Promise<T> {
  crewReadGuard(identity);if(!reads.includes(kind)||!isCrewResourceId(id))throw Error('offline_resource_source_required');
  const r=await apiClient.get<T>(`${offlineProjectPath(projectId)}/${kind}/${id}`);crewReadGuard(identity);return r.data;
}
export function validateDevice(v:DeviceRegistration,identity:QueueIdentity,registrationId:string,deviceId?:string):void {
  if(!v||v.id!==registrationId||!isCrewResourceId(v.deviceId)||v.actorId!==identity.actor||v.role!=='RepairCrew'||
    v.revokedAt!==null||(deviceId!==undefined&&v.deviceId!==deviceId)||typeof v.signingPublicKey!=='string'||typeof v.encryptionPublicKey!=='string')throw Error('offline_device_invalid_or_revoked');
}
export function validateSnapshot(v:SourceSnapshot,identity:QueueIdentity,expected:{id:string;taskId:string;assignmentId:string;deviceRegistrationId:string;taskVersion:string}):void {
  if(!v||Object.entries(expected).some(([k,x])=>(v as unknown as Record<string,unknown>)[k]!==x)||v.originalActorId!==identity.actor||
    !isRepairItemVersion(v.taskVersion)||!v.snapshot||!isCrewResourceId(v.id)||!isCrewResourceId(v.assignmentId)||
    !/^[a-f0-9]{64}$/i.test(v.assignmentHash)||!/^[a-f0-9]{64}$/i.test(v.contentHash))throw Error('offline_snapshot_invalid');
}
export function validateBatch(v:OfflineBatchReceipt):void {
  if(!v||!isCrewResourceId(v.batchId)||v.localQueueInstruction!=='KEEP_UNACKNOWLEDGED_OR_CONFLICTED_ITEMS'||!Array.isArray(v.items)||
    v.items.length===0||new Set(v.items.map(i=>i.originId)).size!==v.items.length||v.items.some(i=>!isCrewResourceId(i.originId)||typeof i.state!=='string'||
      typeof i.kind!=='string'||typeof i.durableAcknowledgment!=='boolean'||!Number.isFinite(Date.parse(i.serverReceivedAt))))throw Error('offline_batch_receipt_invalid');
}
/** Production write gate. Logic tests cannot be substituted for Android custody/interop evidence. */
export function requireOfflineNativeAcceptance():void {if(!NATIVE_ACCEPTANCE_VERIFIED)throw Error('BLOCKED_NATIVE');}

/** Exact durable bytes only, no body reconstruction or automatic adoption after login. */
export async function dispatchOfflineIntent(record:OfflineJournalRecord):Promise<OfflineJournalRecord> {
  requireOfflineNativeAcceptance();crewReadGuard(record.identity);
  const base=offlineProjectPath(record.projectId);
  if(!['/devices','/snapshots','/sync','/starts/reconcile'].some(s=>record.path===base+s)&&
    !new RegExp('^'+base+'/devices/[a-fA-F0-9-]{36}/revoke$').test(record.path))throw Error('offline_write_not_admitted');
  const journal=await openOfflineJournal(record.identity);
  // CAS before transport makes concurrent taps fail closed; IN_FLIGHT after crash requires explicit reconciliation.
  const pending=await journal.transition(record,'IN_FLIGHT');
  try {
    crewReadGuard(record.identity);
    const r=await apiClient.post(record.path,record.body,{headers:{'Content-Type':'application/json','Idempotency-Key':record.key},transformRequest:[data=>data]});
    crewReadGuard(record.identity);
    return await journal.transition(pending,'RECEIVED',r.data);
  } catch(e) {
    // Even 4xx may be after a previous uncertain attempt. Never invent rejection or discard bytes.
    try {crewReadGuard(record.identity);await journal.transition(pending,'UNKNOWN_OUTCOME');}catch{/* Old owner retains IN_FLIGHT for read-only reconciliation. */}
    throw e;
  }
}

export const HANDOVER_GATE='BLOCKED_CRYPTO_CONTRACT: KDF/AES-GCM/encrypted-package chưa có native proof; API-113/122/125 không phát lệnh.';
