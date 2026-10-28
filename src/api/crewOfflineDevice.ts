import { offlineNative, unavailableCapability } from '../../modules/roadguard-offline-crypto';
import { crewReadGuard } from './crewSafetyWorkflow';
import { getFieldInspectionTaskDetailReal, validateCrewTaskDetail, isCrewResourceId } from './crewApi';
import { offlineSigningPublicKey } from './crewOfflineCrypto';
import { openOfflineJournal } from './crewOfflineJournal';
import { offlineProjectPath, requireOfflineNativeAcceptance, readOfflineResource, validateDevice, validateSnapshot, type DeviceRegistration, type SourceSnapshot } from './crewOfflineWorkflow';
import type { OfflineJournalRecord } from './crewOfflineJournal';
import type { QueueIdentity } from '../offline/upload-queue';
import { uuidv4 } from '../utils/uuid';

export function deviceBinding(identity:QueueIdentity,deviceId:string):string {
  if(!isCrewResourceId(deviceId))throw Error('offline_device_id_invalid');
  return JSON.stringify([identity.actor,identity.environment,identity.role,deviceId]);
}
/** Read-only probe. Never creates keys/registration/snapshot or deletes old aliases on logout. */
export async function inspectOfflineDevice(identity:QueueIdentity) {
  crewReadGuard(identity);if(!offlineNative)return {capability:unavailableCapability,deviceId:null};
  const deviceId=await offlineNative.installationId();crewReadGuard(identity);
  const capability=await offlineNative.capability(deviceBinding(identity,deviceId));crewReadGuard(identity);
  return {deviceId,capability};
}
/** Explicit enrollment only. Existing journal (including old sessions) forbids silent regeneration after key loss. */
export async function prepareDeviceEnrollment(identity:QueueIdentity,projectId:string,taskId:string) {
  requireOfflineNativeAcceptance();crewReadGuard(identity);if(!offlineNative)throw Error('BLOCKED_NATIVE');
  const j=await openOfflineJournal(identity);
  if((await j.list()).length)throw Error('offline_existing_intent_reconciliation_required');
  const detail=await getFieldInspectionTaskDetailReal(projectId,taskId);crewReadGuard(identity);
  validateCrewTaskDetail(detail.data,detail.etag,projectId,taskId,identity.actor);
  if(!isCrewResourceId(detail.data.assignmentId))throw Error('offline_assignment_required');
  const deviceId=await offlineNative.installationId();crewReadGuard(identity);
  const binding=deviceBinding(identity,deviceId),cap=await offlineNative.createKeys(binding);crewReadGuard(identity);
  if(!cap.signingUsable||!cap.agreementUsable)throw Error('BLOCKED_NATIVE');
  const keys=await offlineNative.publicKeys(binding);crewReadGuard(identity);
  offlineSigningPublicKey(keys.signingPublicKey);offlineSigningPublicKey(keys.encryptionPublicKey);
  return j.prepare({id:uuidv4(),identity,projectId,path:offlineProjectPath(projectId)+'/devices',key:uuidv4(),
    body:JSON.stringify({deviceId,...keys}),proof:{kind:'enrollment',taskId,assignmentId:detail.data.assignmentId,taskVersion:detail.data.version}});
}
export async function prepareDeviceSnapshot(identity:QueueIdentity,projectId:string,taskId:string,registrationId:string) {
  requireOfflineNativeAcceptance();crewReadGuard(identity);
  const probe=await inspectOfflineDevice(identity);crewReadGuard(identity);
  if(!probe.deviceId||!probe.capability.signingUsable||!probe.capability.agreementUsable||!offlineNative)throw Error('BLOCKED_NATIVE');
  const device=await readOfflineResource<DeviceRegistration>(identity,projectId,'devices',registrationId);
  validateDevice(device,identity,registrationId,probe.deviceId);
  const keys=await offlineNative.publicKeys(deviceBinding(identity,probe.deviceId));crewReadGuard(identity);
  if(keys.signingPublicKey!==device.signingPublicKey||keys.encryptionPublicKey!==device.encryptionPublicKey)throw Error('offline_device_key_mismatch');
  const t=await getFieldInspectionTaskDetailReal(projectId,taskId);crewReadGuard(identity);
  validateCrewTaskDetail(t.data,t.etag,projectId,taskId,identity.actor);
  if(!isCrewResourceId(t.data.assignmentId)||!['NewAssigned','Accepted','InProgress','SupplementRequired'].includes(t.data.status??''))throw Error('offline_assignment_not_active');
  const j=await openOfflineJournal(identity);return j.prepare({id:uuidv4(),identity,projectId,path:offlineProjectPath(projectId)+'/snapshots',key:uuidv4(),
    body:JSON.stringify({deviceRegistrationId:registrationId,taskId}),proof:{kind:'snapshot',assignmentId:t.data.assignmentId,taskVersion:t.data.version}});
}

/** API118 is an explicit command, never called by logout. Existing receipts/keys are preserved. */
export async function prepareDeviceRevocation(identity:QueueIdentity,projectId:string,registrationId:string,reason:string) {
  requireOfflineNativeAcceptance();crewReadGuard(identity);
  if(typeof reason!=='string'||!reason.trim()||reason.length>2000)throw Error('offline_revocation_reason_required');
  const text=reason,device=await readOfflineResource<DeviceRegistration>(identity,projectId,'devices',registrationId);
  validateDevice(device,identity,registrationId);
  if(device.projectId!==projectId)throw Error('offline_revocation_source_invalid');
  const j=await openOfflineJournal(identity);return j.prepare({id:uuidv4(),identity,projectId,
    path:offlineProjectPath(projectId)+`/devices/${registrationId}/revoke`,key:uuidv4(),body:JSON.stringify({reason:text}),
    proof:{kind:'revocation',registrationId,deviceId:device.deviceId,signingPublicKey:device.signingPublicKey,encryptionPublicKey:device.encryptionPublicKey}});
}
/** Device/snapshot POST views are provisional until the own GET returns the same server source. */
export async function reconcileDeviceIntent(record:OfflineJournalRecord) {
  crewReadGuard(record.identity);
  if(record.phase!=='RECEIVED')throw Error('offline_receipt_required');
  const kind=record.proof.kind,body=JSON.parse(record.body),receipt=record.receipt as {id?:string};
  if(!isCrewResourceId(receipt?.id))throw Error('offline_server_receipt_required');
  if(kind==='enrollment'&&record.path===offlineProjectPath(record.projectId)+'/devices') {
    const actual=await readOfflineResource<DeviceRegistration>(record.identity,record.projectId,'devices',receipt.id);
    validateDevice(actual,record.identity,receipt.id,body.deviceId);
    if(actual.signingPublicKey!==body.signingPublicKey||actual.encryptionPublicKey!==body.encryptionPublicKey)throw Error('offline_device_key_mismatch');
    const j=await openOfflineJournal(record.identity);return j.transition(record,'RECONCILED',actual);
  }
  if(kind==='snapshot'&&record.path===offlineProjectPath(record.projectId)+'/snapshots') {
    const actual=await readOfflineResource<SourceSnapshot>(record.identity,record.projectId,'snapshots',receipt.id);
    validateSnapshot(actual,record.identity,{id:receipt.id,taskId:body.taskId,deviceRegistrationId:body.deviceRegistrationId,
      assignmentId:String(record.proof.assignmentId),taskVersion:String(record.proof.taskVersion)});
    const j=await openOfflineJournal(record.identity);return j.transition(record,'RECONCILED',actual);
  }
  if(kind==='revocation'&&record.path===offlineProjectPath(record.projectId)+`/devices/${record.proof.registrationId}/revoke`){
    const actual=await readOfflineResource<DeviceRegistration>(record.identity,record.projectId,'devices',receipt.id);crewReadGuard(record.identity);
    const matches=(v:DeviceRegistration)=>v.id===record.proof.registrationId&&v.projectId===record.projectId&&v.actorId===record.identity.actor&&
      v.role==='RepairCrew'&&v.deviceId===record.proof.deviceId&&isCrewResourceId(v.deviceId)&&
      typeof record.proof.signingPublicKey==='string'&&!!record.proof.signingPublicKey&&v.signingPublicKey===record.proof.signingPublicKey&&
      typeof record.proof.encryptionPublicKey==='string'&&!!record.proof.encryptionPublicKey&&v.encryptionPublicKey===record.proof.encryptionPublicKey&&
      typeof v.revokedAt==='string'&&Number.isFinite(Date.parse(v.revokedAt));
    // A pre-existing revoked GET alone does not attribute this command. Require its POST receipt too.
    if(!matches(record.receipt as DeviceRegistration)||!matches(actual)||actual.revokedAt!==(record.receipt as DeviceRegistration).revokedAt)throw Error('offline_revocation_readback_mismatch');
    const j=await openOfflineJournal(record.identity);return j.transition(record,'RECONCILED',actual);
  }
  throw Error('offline_reconciliation_source_not_supported');
}
