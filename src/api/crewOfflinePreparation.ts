import type { QueueIdentity } from '../offline/upload-queue';
import { crewReadGuard } from './crewSafetyWorkflow';
import { openOfflineJournal, type OfflineJournalRecord } from './crewOfflineJournal';
import { prepareDeviceEnrollment, prepareDeviceSnapshot, reconcileDeviceIntent } from './crewOfflineDevice';
import { dispatchOfflineIntent, requireOfflineNativeAcceptance, type DeviceRegistration, type SourceSnapshot } from './crewOfflineWorkflow';

/** Explicit task-scoped action. Persist each step before transport; resume the same
 * bytes/key after response loss. A session change never adopts an earlier command.
 */
export async function downloadCrewOfflineTask(identity:QueueIdentity,projectId:string,taskId:string,refresh=false):Promise<SourceSnapshot> {
  requireOfflineNativeAcceptance(identity);crewReadGuard(identity);
  const journal=await openOfflineJournal(identity);
  const owned=(r:OfflineJournalRecord)=>r.identity.actor===identity.actor&&r.identity.role===identity.role&&
    r.identity.environment===identity.environment&&r.identity.scope===identity.scope&&r.identity.partition===identity.partition;
  const rows=await journal.list();crewReadGuard(identity);
  const registrations=rows.filter(r=>r.projectId===projectId&&r.proof.kind==='enrollment');
  if(registrations.some(r=>!owned(r)))throw Error('offline_session_recovery_required');
  if(registrations.length>1)throw Error('offline_registration_reconciliation_required');
  const finish=async(record:OfflineJournalRecord)=>{
    crewReadGuard(identity);
    let next=record;
    if(['PREPARED','UNKNOWN_OUTCOME'].includes(next.phase))next=await dispatchOfflineIntent(next);
    if(next.phase==='RECEIVED')next=await reconcileDeviceIntent(next);
    crewReadGuard(identity);
    if(next.phase!=='RECONCILED')throw Error('offline_uncertain_command_requires_reconciliation');
    return next;
  };
  const registration=await finish(registrations[0]??await prepareDeviceEnrollment(identity,projectId,taskId));
  const device=registration.receipt as DeviceRegistration;
  if(rows.some(r=>r.projectId===projectId&&r.proof.kind==='revocation'&&r.proof.registrationId===device.id))throw Error('offline_device_revocation_requires_online_check');
  const snapshots=rows.filter(r=>r.projectId===projectId&&r.proof.kind==='snapshot'&&JSON.parse(r.body).taskId===taskId&&JSON.parse(r.body).deviceRegistrationId===device.id);
  if(snapshots.some(r=>!owned(r)))throw Error('offline_session_recovery_required');
  if(snapshots.some((r,index)=>index===0?!!r.proof.previousSnapshotIntentId:r.proof.previousSnapshotIntentId!==snapshots[index-1].id||snapshots[index-1].phase!=='RECONCILED'))throw Error('offline_snapshot_reconciliation_required');
  const head=snapshots.at(-1);
  // A pending refresh resumes the same intent; confirmed history is immutable.
  const next=refresh&&head?.phase==='RECONCILED'
    ?await prepareDeviceSnapshot(identity,projectId,taskId,device.id,head.id)
    :head??await prepareDeviceSnapshot(identity,projectId,taskId,device.id);
  const downloaded=await finish(next);
  return downloaded.receipt as SourceSnapshot;
}
