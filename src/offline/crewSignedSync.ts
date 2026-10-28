import type { QueueIdentity } from './upload-queue';
import { crewReadGuard } from '../api/crewSafetyWorkflow';
import { openOfflineJournal, type OfflineJournalRecord } from '../api/crewOfflineJournal';
import { canonicalOfflineAttached, canonicalOfflineManifest, describeOfflineOperation, type OfflineRecord, type Sha256 } from '../api/crewOfflineProtocol';
import { offlineP1363 } from '../api/crewOfflineCrypto';
import { readOfflineResource, validateDevice, validateSnapshot, validateBatch, offlineProjectPath, requireOfflineNativeAcceptance,
  type DeviceRegistration, type SourceSnapshot, type OfflineBatchReceipt } from '../api/crewOfflineWorkflow';
import { inspectOfflineDevice, deviceBinding } from '../api/crewOfflineDevice';
import { offlineNative } from '../../modules/roadguard-offline-crypto';
import { uuidv4 } from '../utils/uuid';

function snapshotOperations(input:OfflineRecord[]):OfflineRecord[] {
  let budget=100000;const seen=new Set<object>();
  const copy=(v:unknown,depth:number):unknown=>{
    if(--budget<0||depth>64)throw Error('offline_input_bound');
    if(v===null||v===undefined||['string','boolean'].includes(typeof v))return v;
    if(typeof v==='number'){if(!Number.isFinite(v))throw Error('offline_number_invalid');return v;}
    if(typeof v!=='object'||seen.has(v))throw Error('offline_input_invalid');seen.add(v);
    const result=Array.isArray(v)?v.map(x=>copy(x,depth+1)):Object.fromEntries(Object.entries(v).map(([k,x])=>[k,copy(x,depth+1)]));
    seen.delete(v);return result;
  };
  return copy(input,0) as OfflineRecord[];
}

/** Only explicit FIELD intents with authoritative snapshots. No legacy queue/T06 journal conversion. */
export async function prepareSignedFieldBatch(identity:QueueIdentity,projectId:string,registrationId:string,input:OfflineRecord[],sha:Sha256) {
  requireOfflineNativeAcceptance();crewReadGuard(identity);
  if(!offlineNative||input.length<1||input.length>1000)throw Error('offline_batch_invalid');
  // Freeze caller input before the first await; lexical decimals remain strings in their wrapper.
  const operations=snapshotOperations(input);
  const probe=await inspectOfflineDevice(identity);crewReadGuard(identity);
  if(!probe.deviceId||!probe.capability.signingUsable||!probe.capability.agreementUsable)throw Error('BLOCKED_NATIVE');
  const device=await readOfflineResource<DeviceRegistration>(identity,projectId,'devices',registrationId);
  validateDevice(device,identity,registrationId,probe.deviceId);
  const binding=deviceBinding(identity,probe.deviceId),keys=await offlineNative.publicKeys(binding);crewReadGuard(identity);
  if(keys.signingPublicKey!==device.signingPublicKey||keys.encryptionPublicKey!==device.encryptionPublicKey)throw Error('offline_key_mismatch');
  const descriptors:OfflineRecord[]=[];
  for(const o of operations) {
    if(!['FIELD_ACCEPT','FIELD_START','FIELD_SUBMISSION'].includes(String(o.kind))||o.originalActorId!==identity.actor||o.sourceDeviceId!==probe.deviceId)throw Error('offline_operation_source_invalid');
    const snapshot=await readOfflineResource<SourceSnapshot>(identity,projectId,'snapshots',String(o.snapshotId));
    validateSnapshot(snapshot,identity,{id:String(o.snapshotId),taskId:String(o.taskId),assignmentId:String(o.assignmentId),deviceRegistrationId:registrationId,taskVersion:String(o.taskVersion)});
    descriptors.push(await describeOfflineOperation(o,sha));crewReadGuard(identity);
  }
  const batchId=uuidv4(),manifest=canonicalOfflineManifest(projectId,batchId,registrationId,descriptors);
  const signature=await offlineNative.signManifest(binding,manifest);crewReadGuard(identity);offlineP1363(signature);
  if(!await offlineNative.verifyManifest(device.signingPublicKey,manifest,signature))throw Error('offline_signature_self_verify_failed');
  crewReadGuard(identity);
  const body=await canonicalOfflineAttached(batchId,registrationId,operations,signature,sha);crewReadGuard(identity);
  const journal=await openOfflineJournal(identity);
  return journal.prepare({id:uuidv4(),identity,projectId,path:offlineProjectPath(projectId)+'/sync',key:uuidv4(),body,
    proof:{kind:'signed-field-batch',sourceBatchId:batchId,registrationId,deviceId:probe.deviceId,manifest,descriptors}});
}

/** HTTP200 and even a durable POST receipt are not a verified batch. GET115 must agree per item. */
export function matchBatchReadback(record:OfflineJournalRecord,readback:OfflineBatchReceipt):boolean {
  const received=record.receipt as OfflineBatchReceipt;validateBatch(received);validateBatch(readback);
  const expected=record.proof.descriptors as OfflineRecord[];
  if(!Array.isArray(expected)||readback.batchId!==received.batchId||expected.length!==readback.items.length||received.items.length!==expected.length)return false;
  return expected.every(d=>{
    const a=received.items.find(i=>i.originId===d.originId),b=readback.items.find(i=>i.originId===d.originId);
    return !!a&&!!b&&a.kind===d.kind&&b.kind===d.kind&&a.durableAcknowledgment&&b.durableAcknowledgment&&
      ['COMMITTED','REPLAYED'].includes(a.state)&&['COMMITTED','REPLAYED'].includes(b.state)&&
      a.effectId===d.effectId&&b.effectId===d.effectId&&a.canonicalOriginId===d.originId&&b.canonicalOriginId===d.originId;
  });
}
export async function reconcileSignedBatch(record:OfflineJournalRecord):Promise<OfflineJournalRecord> {
  crewReadGuard(record.identity);
  if(record.phase!=='RECEIVED'||record.path!==offlineProjectPath(record.projectId)+'/sync'||record.proof.kind!=='signed-field-batch')throw Error('offline_batch_receipt_required');
  const received=record.receipt as OfflineBatchReceipt;validateBatch(received);
  const readback=await readOfflineResource<OfflineBatchReceipt>(record.identity,record.projectId,'batches',received.batchId);
  // Mixed/stale/conflicted results remain RECEIVED, bytes and evidence retained. No blanket ACK.
  if(!matchBatchReadback(record,readback))return record;
  const journal=await openOfflineJournal(record.identity);return journal.transition(record,'RECONCILED',readback);
}
/** API129 uses the SERVER batch receipt and only an exact FIELD_START member. */
export async function prepareStartReconciliation(record:OfflineJournalRecord,originId:string) {
  requireOfflineNativeAcceptance();crewReadGuard(record.identity);
  const receipt=record.receipt as OfflineBatchReceipt;validateBatch(receipt);
  const descriptors=record.proof.descriptors as OfflineRecord[];
  if(record.path!==offlineProjectPath(record.projectId)+'/sync'||!['RECEIVED','RECONCILED'].includes(record.phase)||
    !Array.isArray(descriptors)||!descriptors.some(d=>d.originId===originId&&d.kind==='FIELD_START')||
    !receipt.items.some(i=>i.originId===originId&&i.kind==='FIELD_START'))throw Error('offline_field_start_source_required');
  const j=await openOfflineJournal(record.identity);return j.prepare({id:uuidv4(),identity:record.identity,projectId:record.projectId,
    path:offlineProjectPath(record.projectId)+'/starts/reconcile',key:uuidv4(),body:JSON.stringify({batchId:receipt.batchId,originId}),
    proof:{kind:'start-reconciliation',sourceIntentId:record.id}});
}
