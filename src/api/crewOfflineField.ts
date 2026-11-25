import type { QueueIdentity } from '../offline/upload-queue';
import { crewReadGuard } from './crewSafetyWorkflow';
import { inspectOfflineDevice, readLocalOfflineSources } from './crewOfflineDevice';
import { requireOfflineNativeAcceptance } from './crewOfflineWorkflow';
import { openOfflineJournal } from './crewOfflineJournal';
import { fieldCoreHash, type OfflineRecord } from './crewOfflineProtocol';
import { prepareSignedFieldBatch } from '../offline/crewSignedSync';
import { generateChecksum } from '../offline/checksum';
import { uuidv4 } from '../utils/uuid';

/** Explicit local mode: never invoked as a fallback from a forbidden HTTP read.
 * Reconciled snapshot is a preparation source, not current server permission.
 */
export async function readOfflineFieldTask(identity:QueueIdentity,projectId:string,taskId:string) {
  requireOfflineNativeAcceptance(identity);crewReadGuard(identity);
  const j=await openOfflineJournal(identity),rows=await j.list();crewReadGuard(identity);
  const registrations=rows.filter(r=>r.projectId===projectId&&r.proof.kind==='enrollment');
  if(registrations.length!==1)throw Error('offline_registration_reconciliation_required');
  const registrationId=(registrations[0].receipt as {id?:string})?.id;
  if(!registrationId)throw Error('offline_verified_device_not_downloaded');
  const probe=await inspectOfflineDevice(identity);crewReadGuard(identity);
  if(!probe.deviceId)throw Error('BLOCKED_NATIVE');
  const source=await readLocalOfflineSources(identity,projectId,registrationId,probe.deviceId);crewReadGuard(identity);
  const snapshots=source.snapshots.filter(s=>s.taskId===taskId);
  if(snapshots.length!==1)throw Error('offline_verified_snapshot_not_downloaded');
  const snapshot=snapshots[0],facts=snapshot.snapshot as OfflineRecord;
  // Do not interpret a repair snapshot as an independent FIELD capability.
  if(facts.repair!=null)throw Error('offline_field_repair_source_not_supported');
  return {snapshot,facts,registrationId,deviceId:probe.deviceId};
}

/** One explicit local action, with typed accept -> start dependency when needed.
 * It only persists signed bytes. Dispatch and per-origin readback are separate.
 */
export async function prepareOfflineFieldStart(identity:QueueIdentity,projectId:string,taskId:string) {
  const source=await readOfflineFieldTask(identity,projectId,taskId);crewReadGuard(identity);
  if(!['NewAssigned','Accepted'].includes(String(source.facts.status)))throw Error('offline_field_start_not_available');
  const operations:OfflineRecord[]=[];
  const base=(kind:string):OfflineRecord=>{
    const originId=uuidv4();
    return {schemaVersion:1,originId,effectId:originId,kind,originalActorId:identity.actor,sourceDeviceId:source.deviceId,
      snapshotId:source.snapshot.id,taskId,assignmentId:source.snapshot.assignmentId,taskVersion:source.snapshot.taskVersion,
      corePayloadHash:'',dependencies:[],claimedFinishedAt:null,fieldAction:null,fieldStart:null,fieldSubmission:null,repair:null};
  };
  if(source.facts.status==='NewAssigned') {
    const accept=base('FIELD_ACCEPT');
    accept.fieldAction={reason:'Nhận nhiệm vụ hiện trường',assignedToUserId:null,handover:null};
    accept.corePayloadHash=await fieldCoreHash(accept,generateChecksum);crewReadGuard(identity);operations.push(accept);
  }
  const start=base('FIELD_START');start.dependencies=operations.map(o=>o.originId);
  start.fieldStart={originId:start.originId,claimedAt:new Date().toISOString(),deviceId:source.deviceId,
    monotonicMilliseconds:null,bootId:null,offlineProof:null};
  start.corePayloadHash=await fieldCoreHash(start,generateChecksum);crewReadGuard(identity);operations.push(start);
  return prepareSignedFieldBatch(identity,projectId,source.registrationId,operations,generateChecksum);
}
