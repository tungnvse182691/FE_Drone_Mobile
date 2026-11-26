import type { QueueIdentity } from '../offline/upload-queue';
import { crewReadGuard } from './crewSafetyWorkflow';
import { inspectOfflineDevice, readLocalOfflineSources } from './crewOfflineDevice';
import { requireOfflineNativeAcceptance, validateRepairSnapshot } from './crewOfflineWorkflow';
import { openOfflineJournal, sameOfflinePartition } from './crewOfflineJournal';
import { fieldCoreHash, type OfflineRecord } from './crewOfflineProtocol';
import { prepareSignedFieldBatch } from '../offline/crewSignedSync';
import { generateChecksum } from '../offline/checksum';
import { uuidv4 } from '../utils/uuid';
import { validateFieldMeasurements, signedCaptureReady, currentFieldContext, openFieldRuntime, loadFieldDraft, type FieldDraft } from './crewFieldDraft';

/** Explicit local mode: never invoked as a fallback from a forbidden HTTP read.
 * Reconciled snapshot is a preparation source, not current server permission.
 */
export async function readOfflineCrewTask(identity:QueueIdentity,projectId:string,taskId:string) {
  requireOfflineNativeAcceptance(identity);crewReadGuard(identity);
  const j=await openOfflineJournal(identity),rows=await j.list();crewReadGuard(identity);
  const confirmedSnapshots=new Set(rows.filter(r=>r.projectId===projectId&&r.phase==='RECONCILED'&&r.proof.kind==='session-confirm'&&r.identity.scope===identity.scope&&r.identity.partition===identity.partition)
    .flatMap(r=>Array.isArray(r.proof.snapshotIds)?r.proof.snapshotIds.map(String):[]));
  const taskSnapshots=rows.filter(r=>r.projectId===projectId&&r.proof.kind==='snapshot'&&JSON.parse(r.body).taskId===taskId);
  const headSnapshot=taskSnapshots.at(-1);
  if(taskSnapshots.some(r=>r.phase!=='RECONCILED'||!sameOfflinePartition(r.identity,identity))||
    (headSnapshot&&(headSnapshot.identity.scope!==identity.scope||headSnapshot.identity.partition!==identity.partition)&&!confirmedSnapshots.has(headSnapshot.id)))throw Error('offline_snapshot_reconciliation_required');
  const registrations=rows.filter(r=>r.projectId===projectId&&r.proof.kind==='enrollment');
  if(registrations.length!==1)throw Error('offline_registration_reconciliation_required');
  const registrationId=(registrations[0].receipt as {id?:string})?.id;
  if(!registrationId)throw Error('offline_verified_device_not_downloaded');
  const probe=await inspectOfflineDevice(identity);crewReadGuard(identity);
  if(!probe.deviceId)throw Error('BLOCKED_NATIVE');
  const source=await readLocalOfflineSources(identity,projectId,registrationId,probe.deviceId);crewReadGuard(identity);
  const snapshots=source.snapshots.filter(s=>s.taskId===taskId);
  if(!snapshots.length)throw Error('offline_verified_snapshot_not_downloaded');
  const snapshot=snapshots.at(-1)!,facts=snapshot.snapshot as OfflineRecord;
  if(facts.repair!=null)validateRepairSnapshot(snapshot,identity);
  return {snapshot,facts,registrationId,deviceId:probe.deviceId};
}

export async function readOfflineFieldTask(identity:QueueIdentity,projectId:string,taskId:string) {
  const source=await readOfflineCrewTask(identity,projectId,taskId);
  // Do not interpret a repair snapshot as an independent FIELD capability.
  if(source.facts.repair!=null)throw Error('offline_field_repair_source_not_supported');
  return source;
}

/** One explicit local action, with typed accept -> start dependency when needed.
 * It only persists signed bytes. Dispatch and per-origin readback are separate.
 */
export async function prepareOfflineFieldStart(identity:QueueIdentity,projectId:string,taskId:string) {
  const source=await readOfflineFieldTask(identity,projectId,taskId);crewReadGuard(identity);
  if(!['NewAssigned','Accepted'].includes(String(source.facts.status)))throw Error('offline_field_start_not_available');
  const operations=await buildFieldStart(identity,taskId,source);
  return prepareSignedFieldBatch(identity,projectId,source.registrationId,operations,generateChecksum);
}

async function buildFieldStart(identity:QueueIdentity,taskId:string,source:Awaited<ReturnType<typeof readOfflineFieldTask>>) {
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
  return operations;
}

/** Persist the actual start tap; sign one combined packet when the draft is ready. */
export async function recordOfflineFieldStart(identity:QueueIdentity,projectId:string,taskId:string) {
  const source=await readOfflineFieldTask(identity,projectId,taskId);crewReadGuard(identity);
  if(!['NewAssigned','Accepted'].includes(String(source.facts.status)))throw Error('offline_field_start_not_available');
  const rows=await (await openOfflineJournal(identity)).list();crewReadGuard(identity);
  if(rows.some(r=>r.projectId===projectId&&r.proof.kind==='signed-field-batch'&&
    JSON.parse(r.body).operations.some((o:OfflineRecord)=>o.taskId===taskId)))throw Error('offline_field_packet_exists');
  const context=currentFieldContext(projectId,taskId);
  if(!context)throw Error('field_session_changed');
  const runtime=await openFieldRuntime(context),draft=await loadFieldDraft(context,runtime);crewReadGuard(identity);
  if(draft.command||draft.result||draft.supplement||draft.repairClaim)throw Error('field_command_pending');
  if(draft.offlineStart){validateLocalStart(draft,source,identity);return draft;}
  draft.offlineStart={snapshotId:source.snapshot.id,registrationId:source.registrationId,deviceId:source.deviceId,
    operations:await buildFieldStart(identity,taskId,source)};
  await runtime.write(draft);crewReadGuard(identity);return draft;
}
function validateLocalStart(draft:FieldDraft,source:Awaited<ReturnType<typeof readOfflineFieldTask>>,identity:QueueIdentity) {
  const local=draft.offlineStart,ops=local?.operations;
  if(!local||local.snapshotId!==source.snapshot.id||local.registrationId!==source.registrationId||local.deviceId!==source.deviceId||
    !ops||ops.length!==(source.facts.status==='NewAssigned'?2:1)||ops.at(-1)?.kind!=='FIELD_START'||
    (ops.length===2&&(ops[0].kind!=='FIELD_ACCEPT'||JSON.stringify(ops[1].dependencies)!==JSON.stringify([ops[0].originId])))||
    ops.some(o=>o.taskId!==draft.taskId||o.snapshotId!==source.snapshot.id||o.assignmentId!==source.snapshot.assignmentId||
      o.taskVersion!==source.snapshot.taskVersion||o.originalActorId!==identity.actor||o.sourceDeviceId!==source.deviceId)||
    !Number.isFinite(Date.parse(String((ops.at(-1)?.fieldStart as OfflineRecord)?.claimedAt))))throw Error('offline_local_start_source_mismatch');
  return ops;
}

/** Preserve original local evidence or already VERIFIED uploads.
 * The original draft remains intact; the signed journal owns immutable bytes.
 */
export async function prepareOfflineFieldSubmission(identity:QueueIdentity,projectId:string,taskId:string,input:FieldDraft) {
  // Snapshot before the first await so an editing screen cannot change signed facts.
  const draft=JSON.parse(JSON.stringify(input,(_key,value)=>{
    if(typeof value==='number'&&!Number.isFinite(value))throw Error('field_measurements_required');
    return value;
  })) as FieldDraft;
  crewReadGuard(identity);
  if(draft.actor!==identity.actor||draft.scope!==identity.scope||draft.environment!==identity.environment||
    draft.projectId!==projectId||draft.taskId!==taskId)throw Error('field_session_changed');
  if(draft.command||draft.result||draft.supplement||draft.repairClaim)throw Error('offline_field_submission_source_not_supported');
  validateFieldMeasurements(draft);
  if(!draft.captures.length||draft.captures.some(c=>!signedCaptureReady(c)))
    throw Error('field_evidence_not_verified');
  const source=await readOfflineFieldTask(identity,projectId,taskId);crewReadGuard(identity);
  const localOps=draft.offlineStart?validateLocalStart(draft,source,identity):[];
  if(!localOps.length&&source.facts.status!=='InProgress')throw Error('offline_field_submission_not_available');
  for(const o of localOps)if(o.corePayloadHash!==await fieldCoreHash(o,generateChecksum))throw Error('offline_local_start_source_mismatch');
  crewReadGuard(identity);
  const journal=await openOfflineJournal(identity),rows=await journal.list();crewReadGuard(identity);
  const starts:string[]=[];
  for(const row of rows) {
    if(row.projectId!==projectId||row.phase!=='RECONCILED'||row.proof.kind!=='signed-field-batch'||
      row.proof.registrationId!==source.registrationId||row.proof.deviceId!==source.deviceId||
      !row.identity||(['actor','scope','environment','partition','role'] as const).some(k=>row.identity[k]!==identity[k]))continue;
    const ops=JSON.parse(row.body).operations as OfflineRecord[];
    for(const op of ops) {
      if(op.kind!=='FIELD_START'||op.taskId!==taskId||op.assignmentId!==source.snapshot.assignmentId||
        op.originalActorId!==identity.actor||op.sourceDeviceId!==source.deviceId)continue;
      const receipt=row.verifiedItems?.find(i=>i.originId===op.originId&&i.effectId===op.effectId&&i.kind===op.kind&&
        ['COMMITTED','REPLAYED'].includes(i.state)&&Number.isFinite(Date.parse(i.serverReceivedAt)));
      if(receipt?.canonicalOriginId)starts.push(receipt.canonicalOriginId);
    }
  }
  if(localOps.length)starts.push(String(localOps.at(-1)!.originId));
  if(new Set(starts).size!==1)throw Error('offline_verified_field_start_required');
  const originId=uuidv4();
  const op:OfflineRecord={schemaVersion:1,originId,effectId:originId,kind:'FIELD_SUBMISSION',originalActorId:identity.actor,
    sourceDeviceId:source.deviceId,snapshotId:source.snapshot.id,taskId,assignmentId:source.snapshot.assignmentId,
    taskVersion:source.snapshot.taskVersion,corePayloadHash:'',dependencies:localOps.length?[localOps.at(-1)!.originId]:[],claimedFinishedAt:null,fieldAction:null,fieldStart:null,repair:null,
    fieldSubmission:{originId,startOriginId:starts[0],parentSubmissionId:null,
      measurements:draft.measurements.map(m=>({...m,value:m.value===null?null:{decimal:String(m.value)}})),
      evidence:draft.captures.map(c=>({captureOriginId:c.id,fileId:c.upload?.fileId??null,purpose:c.purpose,...(c.size!=null?{sizeBytes:c.size}:{}),
        checksumSha256:c.checksum,mediaType:c.mediaType,capturedAt:c.capturedAt,attemptChecklist:null})),
      locationProof:draft.locationProof,captureType:'MEASUREMENT',repaired:null,unrepairedReason:null,deviceId:source.deviceId}};
  op.corePayloadHash=await fieldCoreHash(op,generateChecksum);crewReadGuard(identity);
  return prepareSignedFieldBatch(identity,projectId,source.registrationId,[...localOps,op],generateChecksum);
}
