import type { QueueIdentity } from '../offline/upload-queue';
import { crewReadGuard } from './crewSafetyWorkflow';
import { openOfflineJournal, sameOfflinePartition, type OfflineJournalRecord } from './crewOfflineJournal';
import { crewOfflineNative, deviceBinding, inspectOfflineDevice, prepareDeviceEnrollment, prepareDeviceSnapshot, reconcileDeviceIntent, recoverInterruptedDeviceIntent } from './crewOfflineDevice';
import { dispatchOfflineIntent, offlineProjectPath, readOfflineResource, requireOfflineNativeAcceptance, validateDevice, validateSnapshot, type DeviceRegistration, type SourceSnapshot } from './crewOfflineWorkflow';
import { getFieldInspectionTaskDetailReal, crewTaskFromWire, validateCrewTaskDetail } from './crewApi';
import { retainCrewEditorSource, readCrewEditorSource } from './crewOfflineEditorSource';
import { uuidv4 } from '../utils/uuid';

export type CrewOfflinePreparationStatus =
  | 'UNAVAILABLE'
  | 'NOT_DOWNLOADED'
  | 'NEEDS_CONFIRMATION'
  | 'NEEDS_UPDATE'
  | 'PARTIAL'
  | 'READY';

export interface CrewOfflinePreparationState {
  status: CrewOfflinePreparationStatus;
  snapshot: SourceSnapshot | null;
  editorReady: boolean;
}

export interface OfflineTaskDownloadResult {
  snapshot: SourceSnapshot;
  editorReady: boolean;
}

/** Explicit task-scoped action. Persist each step before transport; resume the same
 * bytes/key after response loss. A session change never adopts an earlier command.
 */
export async function downloadCrewOfflineTask(identity:QueueIdentity,projectId:string,taskId:string,refresh=false):Promise<SourceSnapshot> {
  return (await downloadCrewOfflineTaskDetailed(identity,projectId,taskId,refresh)).snapshot;
}

export async function downloadCrewOfflineTaskDetailed(identity:QueueIdentity,projectId:string,taskId:string,refresh=false):Promise<OfflineTaskDownloadResult> {
  requireOfflineNativeAcceptance(identity);crewReadGuard(identity);
  const journal=await openOfflineJournal(identity);
  const owned=(r:OfflineJournalRecord)=>r.identity.actor===identity.actor&&r.identity.role===identity.role&&
    r.identity.environment===identity.environment&&r.identity.scope===identity.scope&&r.identity.partition===identity.partition;
  const rows=await journal.list();crewReadGuard(identity);
  const sessionConfirms=rows.filter(r=>r.projectId===projectId&&owned(r)&&r.phase==='RECONCILED'&&r.proof.kind==='session-confirm');
  const confirmedRegistrations=new Set(sessionConfirms.map(r=>String(r.proof.registrationId)));
  const confirmedSnapshots=new Set(sessionConfirms.flatMap(r=>Array.isArray(r.proof.snapshotIds)?r.proof.snapshotIds.map(String):[]));
  const registrations=rows.filter(r=>r.projectId===projectId&&r.proof.kind==='enrollment');
  if(registrations.some(r=>!owned(r)&&!(r.phase==='RECONCILED'&&sameOfflinePartition(r.identity,identity)&&confirmedRegistrations.has(String((r.receipt as {id?:string})?.id)))))throw Error('offline_session_recovery_required');
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
  if(snapshots.some(r=>!sameOfflinePartition(r.identity,identity)))throw Error('offline_session_recovery_required');
  if(snapshots.some(r=>r.phase!=='RECONCILED'&&!owned(r)))throw Error('offline_snapshot_reconciliation_required');
  if(snapshots.some((r,index)=>index===0?!!r.proof.previousSnapshotIntentId:r.proof.previousSnapshotIntentId!==snapshots[index-1].id||snapshots[index-1].phase!=='RECONCILED'))throw Error('offline_snapshot_reconciliation_required');
  const head=snapshots.at(-1);
  // A pending refresh resumes the same intent; confirmed history is immutable.
  const headConfirmed=!!head&&(owned(head)||confirmedSnapshots.has(head.id));
  const next=(refresh||!headConfirmed)&&head?.phase==='RECONCILED'
    ?await prepareDeviceSnapshot(identity,projectId,taskId,device.id,head.id)
    :head??await prepareDeviceSnapshot(identity,projectId,taskId,device.id);
  const downloaded=await finish(next);
  const snapshot=downloaded.receipt as SourceSnapshot;
  // The editor needs fields absent from the signed snapshot. Keep the official
  // snapshot as signing authority and save API-080 only when both sources match.
  let editorReady=false;
  try {
    const detail=await getFieldInspectionTaskDetailReal(projectId,taskId);
    crewReadGuard(identity);
    validateCrewTaskDetail(detail.data,detail.etag,projectId,taskId,identity.actor);
    if(detail.data.version===snapshot.taskVersion&&detail.data.assignmentId===snapshot.assignmentId&&
       detail.data.assignedToUserId===snapshot.originalActorId){
      const task=crewTaskFromWire({id:taskId,projectId,crewId:identity.actor,mode:detail.data.mode??'',
        status:detail.data.status??'',version:detail.data.version!,defectIds:[detail.data.defectId],policyVersionId:null},detail.data,detail.etag);
      await retainCrewEditorSource(identity,task);
      editorReady=true;
    }
  } catch { /* Snapshot remains usable for signed commands; editor source stays unavailable. */ }
  crewReadGuard(identity);
  return {snapshot,editorReady};
}

/** Explicit online re-verification of an existing RECONCILED device registration after re-login. */
export async function reconcileDeviceSessionForProject(identity:QueueIdentity,projectId:string,taskId:string):Promise<DeviceRegistration> {
  requireOfflineNativeAcceptance(identity);crewReadGuard(identity);
  const native=crewOfflineNative(identity);
  const probe=await inspectOfflineDevice(identity);crewReadGuard(identity);
  if(!native||!probe.deviceId||!probe.capability.signingUsable||!probe.capability.agreementUsable)throw Error('BLOCKED_NATIVE');
  const journal=await openOfflineJournal(identity),rows=await journal.list();crewReadGuard(identity);
  const registrations=rows.filter(r=>r.projectId===projectId&&r.proof.kind==='enrollment');
  if(registrations.length!==1)throw Error('offline_registration_reconciliation_required');
  const enrollment=registrations[0];
  if(enrollment.phase!=='RECONCILED'||!sameOfflinePartition(enrollment.identity,identity))throw Error('offline_registration_reconciliation_required');
  const oldDevice=enrollment.receipt as DeviceRegistration;
  if(!oldDevice?.id||rows.some(r=>r.projectId===projectId&&r.proof.kind==='revocation'&&r.proof.registrationId===oldDevice.id))throw Error('offline_device_revocation_requires_online_check');
  const keys=await native.publicKeys(deviceBinding(identity,probe.deviceId));crewReadGuard(identity);
  if(keys.signingPublicKey!==oldDevice.signingPublicKey||keys.encryptionPublicKey!==oldDevice.encryptionPublicKey)throw Error('offline_device_key_mismatch');
  const actual=await readOfflineResource<DeviceRegistration>(identity,projectId,'devices',oldDevice.id);
  validateDevice(actual,identity,oldDevice.id,probe.deviceId);
  if(actual.projectId!==projectId||actual.keyFingerprint!==oldDevice.keyFingerprint||
    actual.signingPublicKey!==keys.signingPublicKey||actual.encryptionPublicKey!==keys.encryptionPublicKey||actual.revokedAt!==null)throw Error('offline_device_key_mismatch');
  const detail=await getFieldInspectionTaskDetailReal(projectId,taskId);crewReadGuard(identity);
  validateCrewTaskDetail(detail.data,detail.etag,projectId,taskId,identity.actor);
  const taskSnapshots=rows.filter(r=>r.projectId===projectId&&r.proof.kind==='snapshot'&&
    (JSON.parse(r.body) as {taskId?:string;deviceRegistrationId?:string}).taskId===taskId&&
    (JSON.parse(r.body) as {deviceRegistrationId?:string}).deviceRegistrationId===actual.id);
  if(taskSnapshots.some(r=>!sameOfflinePartition(r.identity,identity)))throw Error('offline_snapshot_reconciliation_required');
  const reconciledSnapshots=taskSnapshots.filter(r=>r.phase==='RECONCILED');
  if(reconciledSnapshots.some((r,index)=>index===0?!!r.proof.previousSnapshotIntentId:r.proof.previousSnapshotIntentId!==reconciledSnapshots[index-1].id))throw Error('offline_snapshot_reconciliation_required');
  const confirmedSnapshotIds:string[]=[];
  const revokedSnapshotIds:string[]=taskSnapshots.map(s=>s.id);
  const head=reconciledSnapshots.at(-1);
  if(head&&head.id===taskSnapshots.at(-1)?.id&&head.identity.scope!==identity.scope){
    const snapReceipt=head.receipt as SourceSnapshot;
    const snapActual=await readOfflineResource<SourceSnapshot>(identity,projectId,'snapshots',snapReceipt.id);
    validateSnapshot(snapActual,identity,{id:snapReceipt.id,taskId,assignmentId:String(head.proof.assignmentId),deviceRegistrationId:actual.id,taskVersion:String(head.proof.taskVersion)});
    if(detail.data.version===snapActual.taskVersion&&detail.data.assignmentId===snapActual.assignmentId&&
      detail.data.assignedToUserId===identity.actor&&['NewAssigned','Accepted','InProgress','SupplementRequired'].includes(detail.data.status??'')){
      confirmedSnapshotIds.push(head.id);
      revokedSnapshotIds.splice(revokedSnapshotIds.indexOf(head.id),1);
    }
  }
  await journal.confirmSession({
    id:uuidv4(),identity,projectId,
    path:offlineProjectPath(projectId)+'/devices/'+actual.id,
    key:uuidv4(),
    body:JSON.stringify({registrationId:actual.id,confirmedScope:identity.scope,snapshotIds:confirmedSnapshotIds,revokedSnapshotIds}),
    proof:{kind:'session-confirm',registrationId:actual.id,confirmedScope:identity.scope,snapshotIds:confirmedSnapshotIds,revokedSnapshotIds},
  },actual);
  return actual;
}

/** Read-only persisted state inspection for CrewOfflinePreparation. Never mutates or dispatches. */
export async function inspectCrewOfflinePreparationState(
  identity: QueueIdentity,
  projectId: string,
  taskId: string,
  serverVersion?: string,
): Promise<CrewOfflinePreparationState> {
  try {
    requireOfflineNativeAcceptance(identity);
    crewReadGuard(identity);
  } catch {
    return { status: 'UNAVAILABLE', snapshot: null, editorReady: false };
  }
  const owned = (r: OfflineJournalRecord) =>
    r.identity.actor === identity.actor && r.identity.role === identity.role &&
    r.identity.environment === identity.environment && r.identity.scope === identity.scope && r.identity.partition === identity.partition;
  const journal = await openOfflineJournal(identity);
  const rows = await journal.list();
  crewReadGuard(identity);

  const sessionConfirms = rows.filter(r => r.projectId === projectId && owned(r) && r.phase === 'RECONCILED' && r.proof.kind === 'session-confirm');
  const confirmedRegistrations = new Set(sessionConfirms.map(r => String(r.proof.registrationId)));
  const confirmedSnapshots = new Set(sessionConfirms.flatMap(r => Array.isArray(r.proof.snapshotIds) ? r.proof.snapshotIds.map(String) : []));

  const registrations = rows.filter(r => r.projectId === projectId && r.proof.kind === 'enrollment');
  if (registrations.some(r => !sameOfflinePartition(r.identity, identity))) {
    return { status: 'NEEDS_CONFIRMATION', snapshot: null, editorReady: false };
  }
  const reg = registrations[0];
  if (reg) {
    if (reg.phase !== 'RECONCILED') {
      return { status: 'NEEDS_CONFIRMATION', snapshot: null, editorReady: false };
    }
    const regId = String((reg.receipt as { id?: string } | undefined)?.id ?? '');
    if (rows.some(r => r.projectId === projectId && r.proof.kind === 'revocation' && r.proof.registrationId === regId)) {
      return { status: 'UNAVAILABLE', snapshot: null, editorReady: false };
    }
    if (!owned(reg) && !confirmedRegistrations.has(regId)) {
      return { status: 'NEEDS_CONFIRMATION', snapshot: null, editorReady: false };
    }
  }

  const snapshots = rows.filter(
    r => r.projectId === projectId && r.proof.kind === 'snapshot' && (JSON.parse(r.body) as { taskId?: string }).taskId === taskId,
  );
  if (snapshots.some(r => !sameOfflinePartition(r.identity, identity))) {
    return { status: 'NEEDS_CONFIRMATION', snapshot: null, editorReady: false };
  }
  if (snapshots.some(r => r.phase !== 'RECONCILED')) {
    return { status: 'NEEDS_CONFIRMATION', snapshot: null, editorReady: false };
  }
  const head = snapshots.at(-1);
  if (!head) {
    return { status: 'NOT_DOWNLOADED', snapshot: null, editorReady: false };
  }
  const snapshot = head.receipt as SourceSnapshot;
  const headAuthorized = owned(head) || confirmedSnapshots.has(head.id);
  if (!headAuthorized) {
    if (serverVersion && snapshot?.taskVersion && snapshot.taskVersion !== serverVersion) {
      return { status: 'NEEDS_UPDATE', snapshot, editorReady: false };
    }
    return { status: 'NEEDS_CONFIRMATION', snapshot, editorReady: false };
  }
  if (serverVersion && snapshot?.taskVersion && snapshot.taskVersion !== serverVersion) {
    return { status: 'NEEDS_UPDATE', snapshot, editorReady: false };
  }
  let editorReady = false;
  try {
    const editor = await readCrewEditorSource(identity, projectId, taskId);
    editorReady = !!editor.detail &&
      editor.detail.version === snapshot.taskVersion &&
      editor.detail.assignmentId === snapshot.assignmentId &&
      editor.detail.assignedToUserId === snapshot.originalActorId;
  } catch {
    editorReady = false;
  }
  return {
    status: editorReady ? 'READY' : 'PARTIAL',
    snapshot,
    editorReady,
  };
}

/** Single user-initiated flow: recovers interrupted intents with current device authority, revalidates cross-session device authority if needed, and downloads/refreshes snapshot + editor source. */
export async function recoverAndDownloadCrewOfflineTask(
  identity: QueueIdentity,
  projectId: string,
  taskId: string,
  serverVersion?: string,
): Promise<OfflineTaskDownloadResult> {
  requireOfflineNativeAcceptance(identity);
  crewReadGuard(identity);
  const owned = (r: OfflineJournalRecord) =>
    r.identity.actor === identity.actor && r.identity.role === identity.role &&
    r.identity.environment === identity.environment && r.identity.scope === identity.scope && r.identity.partition === identity.partition;

  const journal = await openOfflineJournal(identity);
  const rows = await journal.list();
  crewReadGuard(identity);

  // 1. Recover enrollment first, then task snapshots, retaining exact identity/key/body.
  for (const r of [...rows].sort((a,b)=>Number(a.proof.kind==='snapshot')-Number(b.proof.kind==='snapshot'))) {
    if (r.projectId !== projectId || !sameOfflinePartition(r.identity,identity) || !['enrollment', 'snapshot'].includes(String(r.proof.kind))) continue;
    if (r.proof.kind === 'snapshot' && (JSON.parse(r.body) as { taskId?: string }).taskId !== taskId) continue;
    if (!owned(r)&&['PREPARED','UNKNOWN_OUTCOME','IN_FLIGHT','RECEIVED'].includes(r.phase)) {
      if(r.proof.kind==='snapshot')await reconcileDeviceSessionForProject(identity,projectId,taskId);
      await recoverInterruptedDeviceIntent(r,identity);
      continue;
    }
    if (r.phase === 'IN_FLIGHT') {
      const next = r.receipt && typeof (r.receipt as { id?: string }).id === 'string'
        ? await journal.transition(r, 'RECEIVED', r.receipt)
        : await journal.transition(r, 'UNKNOWN_OUTCOME');
      if (next.phase === 'UNKNOWN_OUTCOME') {
        const received = await dispatchOfflineIntent(next);
        await reconcileDeviceIntent(received);
      } else if (next.phase === 'RECEIVED') {
        await reconcileDeviceIntent(next);
      }
    } else if (r.phase === 'UNKNOWN_OUTCOME') {
      const received = await dispatchOfflineIntent(r);
      await reconcileDeviceIntent(received);
    } else if (r.phase === 'RECEIVED') {
      await reconcileDeviceIntent(r);
    }
  }

  // 2. Re-check if cross-session device/snapshot confirmation is needed.
  const latestRows = await journal.list();
  crewReadGuard(identity);
  const confirms = latestRows.filter(r => r.projectId === projectId && owned(r) && r.phase === 'RECONCILED' && r.proof.kind === 'session-confirm');
  const confirmedRegs = new Set(confirms.map(r => String(r.proof.registrationId)));
  const confirmedSnaps = new Set(confirms.flatMap(r => Array.isArray(r.proof.snapshotIds) ? r.proof.snapshotIds.map(String) : []));
  const reg = latestRows.find(r => r.projectId === projectId && r.proof.kind === 'enrollment');
  const taskSnapshots = latestRows.filter(
    r => r.projectId === projectId && r.proof.kind === 'snapshot' && (JSON.parse(r.body) as { taskId?: string }).taskId === taskId,
  );
  const head = taskSnapshots.at(-1);
  const regNeedsConfirm = !!reg && reg.phase === 'RECONCILED' && sameOfflinePartition(reg.identity, identity) &&
    !owned(reg) && !confirmedRegs.has(String((reg.receipt as { id?: string } | undefined)?.id ?? ''));
  const headNeedsConfirm = !!head && head.phase === 'RECONCILED' && sameOfflinePartition(head.identity, identity) &&
    !owned(head) && !confirmedSnaps.has(head.id);

  if (regNeedsConfirm || headNeedsConfirm) {
    await reconcileDeviceSessionForProject(identity, projectId, taskId);
  }

  const headReceipt = head?.receipt as SourceSnapshot | undefined;
  const shouldRefresh = !!head && head.phase === 'RECONCILED' && !!serverVersion && !!headReceipt?.taskVersion && headReceipt.taskVersion !== serverVersion;
  return downloadCrewOfflineTaskDetailed(identity, projectId, taskId, shouldRefresh);
}
