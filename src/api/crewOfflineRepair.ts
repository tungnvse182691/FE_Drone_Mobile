import type { QueueIdentity } from '../offline/upload-queue';
import { signedCaptureReady, currentFieldContext, readHistoricalFieldDraft, type FieldDraft } from './crewFieldDraft';
import { readOfflineCrewTask } from './crewOfflineField';
import { validateRepairSnapshot } from './crewOfflineWorkflow';
import { readSignedRepairPredecessor as previous } from './crewSignedRepairClaim';
import { crewReadGuard } from './crewSafetyWorkflow';
import { isCrewResourceId } from './crewApi';
import { validateRepairInput, validateSignedRepairAssessment } from './crewRepairWorkflow';
import { repairAssessmentMatchesDraft } from './crewRepairDraft';
import { openOfflineJournal, sameOfflinePartition } from './crewOfflineJournal';
import { repairCoreHash, type OfflineRecord } from './crewOfflineProtocol';
import { prepareSignedRepairBatch } from '../offline/crewSignedSync';
import { generateChecksum } from '../offline/checksum';
import { uuidv4 } from '../utils/uuid';

/** Physical events are explicit, independent actions. Never convert online history
 * or infer canonical effects from locally ACKed transport. Snapshot refresh is
 * required between these bounded operations; pending packets remain immutable. */
async function source(identity:QueueIdentity,projectId:string,taskId:string) {
  const s=await readOfflineCrewTask(identity,projectId,taskId);crewReadGuard(identity);
  const repair=validateRepairSnapshot(s.snapshot,identity);
  if(s.facts.status!=='InProgress'||repair.currentExecutionFinishId!=null)throw Error('offline_repair_not_available');
  return {...s,repair};
}
type Source=Awaited<ReturnType<typeof source>>;
function freezeDraft(identity:QueueIdentity,projectId:string,taskId:string,input:FieldDraft,historical=false):FieldDraft {
  const draft=JSON.parse(JSON.stringify(input,(_k,v)=>{if(typeof v==='number'&&!Number.isFinite(v))throw Error('repair_measurements_required');return v;})) as FieldDraft;
  if(draft.actor!==identity.actor||(!historical&&draft.scope!==identity.scope)||draft.environment!==identity.environment||draft.projectId!==projectId||draft.taskId!==taskId||draft.command||draft.result||draft.supplement||draft.repairClaim)throw Error('repair_field_source_invalid');
  return draft;
}
async function prepare(identity:QueueIdentity,projectId:string,s:Source,kind:string,action:string,key:string,input:OfflineRecord) {
  const rows=await (await openOfflineJournal(identity)).list();crewReadGuard(identity);
  if(rows.some(row=>row.projectId===projectId&&row.phase==='RECONCILED'&&row.proof.kind==='signed-field-batch'&&
    sameOfflinePartition(row.identity,identity)&&
    (JSON.parse(row.body).operations as OfflineRecord[]).some(op=>op.kind===kind&&op.snapshotId===s.snapshot.id&&
      op.taskId===s.snapshot.taskId&&op.assignmentId===s.snapshot.assignmentId&&
      (op.repair as OfflineRecord|null)?.resourceId===s.repair.itemId)))throw Error('offline_repair_snapshot_refresh_required');
  if(rows.some(row=>row.projectId===projectId&&row.proof.kind==='signed-field-batch'&&row.phase!=='RECONCILED'&&
    sameOfflinePartition(row.identity,identity)&&
    (JSON.parse(row.body).operations as OfflineRecord[]).some(op=>String(op.kind).startsWith('REPAIR_')&&
      op.taskId===s.snapshot.taskId&&op.assignmentId===s.snapshot.assignmentId&&
      (op.repair as OfflineRecord|null)?.resourceId===s.repair.itemId)))throw Error('offline_repair_pending_reconciliation');
  const op:OfflineRecord={schemaVersion:1,originId:input.originId,effectId:input.originId,kind,originalActorId:identity.actor,sourceDeviceId:s.deviceId,
    snapshotId:s.snapshot.id,taskId:s.snapshot.taskId,assignmentId:s.snapshot.assignmentId,taskVersion:s.snapshot.taskVersion,
    dependencies:[],claimedFinishedAt:null,fieldAction:null,fieldStart:null,fieldSubmission:null,
    repair:{resourceId:s.repair.itemId,action,start:null,finish:null,assessment:null,[key]:input}};
  op.corePayloadHash=await repairCoreHash(op,generateChecksum);crewReadGuard(identity);
  return prepareSignedRepairBatch(identity,projectId,s.registrationId,[op],generateChecksum);
}
export async function prepareOfflineRepairAssessment(identity:QueueIdentity,projectId:string,taskId:string,input:FieldDraft) {
  const draft=freezeDraft(identity,projectId,taskId,input),s=await source(identity,projectId,taskId);crewReadGuard(identity);
  if(s.repair.state!=='Assigned'||s.repair.currentAssessmentId!=null||s.repair.currentExecutionStartId!=null)throw Error('offline_repair_not_available');
  if(!isCrewResourceId(s.repair.originalCrewFirstStartId))throw Error('offline_repair_first_start_required');
  const captures=draft.captures.filter(c=>c.purpose!=='AFTER');
  if(captures.some(c=>!signedCaptureReady(c)))throw Error('repair_verified_evidence_required');
  const payload:OfflineRecord={originId:uuidv4(),fieldFirstStartId:s.repair.originalCrewFirstStartId,measurements:draft.measurements,
    evidence:captures.map(c=>({captureOriginId:c.id,fileId:c.upload?.fileId??null,purpose:c.purpose,...(c.size!=null?{sizeBytes:c.size}:{}),checksumSha256:c.checksum,mediaType:c.mediaType,capturedAt:c.capturedAt})),
    locationProof:draft.locationProof,deviceId:s.deviceId};
  validateSignedRepairAssessment(payload);
  payload.measurements=draft.measurements.map(m=>({...m,value:m.value===null?null:{decimal:String(m.value)}}));
  return prepare(identity,projectId,s,'REPAIR_ASSESSMENT','assessment','assessment',payload);
}
export async function prepareOfflineRepairStart(identity:QueueIdentity,projectId:string,taskId:string,input?:FieldDraft) {
  const supplied=input?freezeDraft(identity,projectId,taskId,input,true):null,s=await source(identity,projectId,taskId);crewReadGuard(identity);
  if(s.repair.mode!=='Normal')throw Error('offline_fasttrack_authority_source_required');
  if(s.repair.state!=='Assigned'||s.repair.currentExecutionStartId!=null||!isCrewResourceId(s.repair.approvedBy)||
    typeof s.repair.approvedPlanHash!=='string'||s.repair.approvedPlanHash!==s.repair.proposalPlanHash)throw Error('offline_repair_not_available');
  const a=await previous(identity,projectId,s,'REPAIR_ASSESSMENT',s.repair.currentAssessmentId);crewReadGuard(identity);
  const context=supplied?null:currentFieldContext(projectId,taskId);
  if(!supplied&&!context)throw Error('field_session_changed');
  const draft=supplied??freezeDraft(identity,projectId,taskId,await readHistoricalFieldDraft(context!,a.scope),true);crewReadGuard(identity);
  if(draft.scope!==identity.scope&&draft.scope!==a.scope)throw Error('repair_field_source_invalid');
  const assessment=(a.op.repair as OfflineRecord).assessment as OfflineRecord;
  // Typed decimals are wire wrappers; comparison uses the original finite draft domain.
  const evidence=(assessment.evidence as OfflineRecord[]).map(e=>{
    const c=draft.captures.find(c=>c.id===e.captureOriginId);
    if(e.fileId===null&&(!c?.verified||c.upload?.status!=='VERIFIED'||!c.upload.fileId||
      c.offlineUpload?.originId!==a.op.originId||(e.sizeBytes!=null&&e.sizeBytes!==c.size)))throw Error('repair_assessment_source_changed');
    const {sizeBytes,...original}=e;
    return {...original,fileId:e.fileId===null?c!.upload!.fileId:e.fileId};
  });
  const comparable={...assessment,evidence,measurements:(assessment.measurements as OfflineRecord[]).map(m=>({...m,value:m.value===null?null:Number((m.value as {decimal?:string})?.decimal??m.value)}))};
  if(a.outcome.readiness!=='READY'||a.outcome.stage!=='PRE_EXECUTION'||a.outcome.firstStartId!==s.repair.originalCrewFirstStartId||
    assessment.fieldFirstStartId!==s.repair.originalCrewFirstStartId||!repairAssessmentMatchesDraft(comparable,draft))throw Error('repair_assessment_source_changed');
  const payload={originId:uuidv4(),fieldFirstStartId:s.repair.originalCrewFirstStartId,assessmentId:s.repair.currentAssessmentId,claimedAt:new Date().toISOString(),deviceId:s.deviceId,monotonicMilliseconds:null,bootId:null};
  validateRepairInput('start',payload);return prepare(identity,projectId,s,'REPAIR_EXECUTION_START','execution-start','start',payload);
}
export async function prepareOfflineRepairFinish(identity:QueueIdentity,projectId:string,taskId:string) {
  const s=await source(identity,projectId,taskId);crewReadGuard(identity);
  if(s.repair.state!=='InProgress')throw Error('offline_repair_not_available');
  const start=await previous(identity,projectId,s,'REPAIR_EXECUTION_START',s.repair.currentExecutionStartId);crewReadGuard(identity);
  if(start.outcome.firstStartId!==s.repair.originalCrewFirstStartId)throw Error('offline_repair_first_start_required');
  const payload={originId:uuidv4(),executionStartId:s.repair.currentExecutionStartId,claimedAt:new Date().toISOString(),deviceId:s.deviceId,monotonicMilliseconds:null,bootId:null};
  validateRepairInput('finish',payload);return prepare(identity,projectId,s,'REPAIR_EXECUTION_FINISH','execution-finish','finish',payload);
}
