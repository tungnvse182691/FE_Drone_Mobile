import type { QueueIdentity } from '../offline/upload-queue';
import type { FieldDraft } from './crewFieldDraft';
import { readOfflineCrewTask } from './crewOfflineField';
import { validateRepairSnapshot } from './crewOfflineWorkflow';
import { crewReadGuard } from './crewSafetyWorkflow';
import { isCrewResourceId } from './crewApi';
import { validateRepairInput } from './crewRepairWorkflow';
import { repairAssessmentMatchesDraft } from './crewRepairDraft';
import { openOfflineJournal } from './crewOfflineJournal';
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
function freezeDraft(identity:QueueIdentity,projectId:string,taskId:string,input:FieldDraft):FieldDraft {
  const draft=JSON.parse(JSON.stringify(input,(_k,v)=>{if(typeof v==='number'&&!Number.isFinite(v))throw Error('repair_measurements_required');return v;})) as FieldDraft;
  if(draft.actor!==identity.actor||draft.scope!==identity.scope||draft.environment!==identity.environment||draft.projectId!==projectId||draft.taskId!==taskId||draft.command||draft.result||draft.supplement||draft.repairClaim)throw Error('repair_field_source_invalid');
  return draft;
}
async function previous(identity:QueueIdentity,projectId:string,s:Source,kind:string,effectId:unknown) {
  if(!isCrewResourceId(effectId))throw Error('offline_repair_predecessor_required');
  const rows=await (await openOfflineJournal(identity)).list();crewReadGuard(identity);
  const matches=[];
  for(const row of rows){
    if(row.projectId!==projectId||row.phase!=='RECONCILED'||row.proof.kind!=='signed-field-batch'||row.proof.registrationId!==s.registrationId||row.proof.deviceId!==s.deviceId||
      (['actor','scope','environment','partition','role'] as const).some(k=>row.identity?.[k]!==identity[k]))continue;
    const ops=JSON.parse(row.body).operations as OfflineRecord[];
    for(const op of ops){
      if(op.kind!==kind||op.effectId!==effectId||op.taskId!==s.snapshot.taskId||op.assignmentId!==s.snapshot.assignmentId||op.originalActorId!==identity.actor||op.sourceDeviceId!==s.deviceId||(op.repair as OfflineRecord)?.resourceId!==s.repair.itemId)continue;
      const verified=row.verifiedItems?.find(v=>v.originId===op.originId&&v.effectId===effectId&&v.canonicalOriginId===op.originId&&v.kind===kind&&['COMMITTED','REPLAYED'].includes(v.state));
      const receipt=(row.receipt as {items?:OfflineRecord[]})?.items?.find(v=>v.originId===op.originId&&v.effectId===effectId&&v.canonicalOriginId===op.originId&&v.kind===kind&&v.durableAcknowledgment===true);
      const outcome=receipt?.outcome as OfflineRecord|undefined;
      if(verified&&outcome?.id===effectId&&outcome.itemId===s.repair.itemId&&outcome.taskId===s.snapshot.taskId)matches.push({op,outcome});
    }
  }
  if(matches.length!==1)throw Error('offline_repair_predecessor_required');
  return matches[0];
}
async function prepare(identity:QueueIdentity,projectId:string,s:Source,kind:string,action:string,key:string,input:OfflineRecord) {
  const rows=await (await openOfflineJournal(identity)).list();crewReadGuard(identity);
  if(rows.some(row=>row.projectId===projectId&&row.phase==='RECONCILED'&&row.proof.kind==='signed-field-batch'&&
    (['actor','scope','environment','partition','role'] as const).every(k=>row.identity?.[k]===identity[k])&&
    (JSON.parse(row.body).operations as OfflineRecord[]).some(op=>op.kind===kind&&op.snapshotId===s.snapshot.id&&
      op.taskId===s.snapshot.taskId&&op.assignmentId===s.snapshot.assignmentId&&
      (op.repair as OfflineRecord|null)?.resourceId===s.repair.itemId)))throw Error('offline_repair_snapshot_refresh_required');
  if(rows.some(row=>row.projectId===projectId&&row.proof.kind==='signed-field-batch'&&row.phase!=='RECONCILED'&&
    (['actor','scope','environment','partition','role'] as const).every(k=>row.identity?.[k]===identity[k])&&
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
  if(captures.some(c=>!c.verified||c.upload?.status!=='VERIFIED'||c.cancelState))throw Error('repair_verified_evidence_required');
  const payload:OfflineRecord={originId:uuidv4(),fieldFirstStartId:s.repair.originalCrewFirstStartId,measurements:draft.measurements,
    evidence:captures.map(c=>({captureOriginId:c.id,fileId:c.upload?.fileId,purpose:c.purpose,checksumSha256:c.checksum,mediaType:c.mediaType,capturedAt:c.capturedAt})),
    locationProof:draft.locationProof,deviceId:s.deviceId};
  validateRepairInput('assessment',payload);
  payload.measurements=draft.measurements.map(m=>({...m,value:m.value===null?null:{decimal:String(m.value)}}));
  return prepare(identity,projectId,s,'REPAIR_ASSESSMENT','assessment','assessment',payload);
}
export async function prepareOfflineRepairStart(identity:QueueIdentity,projectId:string,taskId:string,input:FieldDraft) {
  const draft=freezeDraft(identity,projectId,taskId,input),s=await source(identity,projectId,taskId);crewReadGuard(identity);
  if(s.repair.mode!=='Normal')throw Error('offline_fasttrack_authority_source_required');
  if(s.repair.state!=='Assigned'||s.repair.currentExecutionStartId!=null||!isCrewResourceId(s.repair.approvedBy)||
    typeof s.repair.approvedPlanHash!=='string'||s.repair.approvedPlanHash!==s.repair.proposalPlanHash)throw Error('offline_repair_not_available');
  const a=await previous(identity,projectId,s,'REPAIR_ASSESSMENT',s.repair.currentAssessmentId);crewReadGuard(identity);
  const assessment=(a.op.repair as OfflineRecord).assessment as OfflineRecord;
  // Typed decimals are wire wrappers; comparison uses the original finite draft domain.
  const comparable={...assessment,measurements:(assessment.measurements as OfflineRecord[]).map(m=>({...m,value:m.value===null?null:Number((m.value as {decimal?:string})?.decimal??m.value)}))};
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
