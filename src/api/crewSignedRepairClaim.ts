import type { QueueIdentity } from '../offline/upload-queue';
import type { FieldContext } from './crewFieldDraft';
import { readOfflineCrewTask } from './crewOfflineField';
import { readOfflineResource, validateRepairSnapshot, type OfflineItemReceipt } from './crewOfflineWorkflow';
import { crewReadGuard, currentQueueIdentity } from './crewSafetyWorkflow';
import { isCrewResourceId, type FieldTaskViewFact } from './crewApi';
import { openOfflineJournal, sameOfflinePartition } from './crewOfflineJournal';
import type { OfflineRecord } from './crewOfflineProtocol';

function failPredecessor(stage:string):never {
  const err=Error('offline_repair_predecessor_required');
  Object.assign(err,{repairDiagStage:stage});
  throw err;
}
export async function readSignedRepairPredecessor(identity:QueueIdentity,projectId:string,s:Awaited<ReturnType<typeof readOfflineCrewTask>>&{repair:ReturnType<typeof validateRepairSnapshot>},kind:string,effectId:unknown) {
  if(!isCrewResourceId(effectId))failPredecessor('invalid_effect_id');
  const rows=await (await openOfflineJournal(identity)).list();crewReadGuard(identity);
  if(rows.some(row=>row.projectId===projectId&&row.proof.kind==='revocation'&&row.proof.registrationId===s.registrationId))throw Error('offline_device_revocation_requires_online_check');
  const confirmed=rows.some(row=>row.projectId===projectId&&row.phase==='RECONCILED'&&row.proof.kind==='session-confirm'&&
    sameOfflinePartition(row.identity,identity)&&row.identity.scope===identity.scope&&row.proof.confirmedScope===identity.scope&&row.proof.registrationId===s.registrationId);
  const matches=[];
  let reason='no_reconciled_batch';
  for(const row of rows){
    if(row.projectId!==projectId||row.phase!=='RECONCILED'||row.proof.kind!=='signed-field-batch')continue;
    if(row.proof.registrationId!==s.registrationId||row.proof.deviceId!==s.deviceId||!sameOfflinePartition(row.identity,identity)){if(reason==='no_reconciled_batch')reason='reg_or_device_mismatch';continue;}
    if(row.identity.scope!==identity.scope&&!confirmed){reason='scope_unconfirmed';continue;}
    const ops=JSON.parse(row.body).operations as OfflineRecord[];
    for(const op of ops){
      if(op.kind!==kind||op.effectId!==effectId||op.taskId!==s.snapshot.taskId||op.assignmentId!==s.snapshot.assignmentId||op.originalActorId!==identity.actor||op.sourceDeviceId!==s.deviceId||(op.repair as OfflineRecord)?.resourceId!==s.repair.itemId){
        if(op.kind===kind&&op.taskId===s.snapshot.taskId)reason='op_mismatch';
        continue;
      }
      const verified=row.verifiedItems?.find(v=>v.originId===op.originId&&v.effectId===effectId&&v.canonicalOriginId===op.originId&&v.kind===kind&&['COMMITTED','REPLAYED'].includes(v.state));
      if(!verified){reason='verified_missing';continue;}
      const receipt=(row.receipt as {items?:OfflineRecord[]})?.items?.find(v=>v.originId===op.originId&&v.effectId===effectId&&v.canonicalOriginId===op.originId&&v.kind===kind&&v.durableAcknowledgment===true);
      if(!receipt){reason='receipt_missing';continue;}
      const outcome=receipt.outcome as OfflineRecord|undefined;
      if(outcome?.id===effectId&&outcome.itemId===s.repair.itemId&&outcome.taskId===s.snapshot.taskId)matches.push({op,outcome,scope:row.identity.scope});
      else reason='outcome_mismatch';
    }
  }
  if(matches.length!==1)failPredecessor(matches.length>1?'multiple_matches':reason);
  return matches[0];
}
/** Signed custody stays in its own journal. SERVER_RECEIVED is a conservative
 * bound for NEW AFTER capture, never a verified historical finish timestamp. */
export async function readSignedRepairClaim(identity:QueueIdentity,projectId:string,taskId:string,task:FieldTaskViewFact) {
  const s=await readOfflineCrewTask(identity,projectId,taskId);crewReadGuard(identity);
  const repair=validateRepairSnapshot(s.snapshot,identity),ctx=task.repairContext;
  if(!ctx||task.id!==taskId||task.projectId!==projectId||task.assignedToUserId!==identity.actor||
    task.assignmentId!==s.snapshot.assignmentId||task.firstStartOriginId!==repair.originalCrewFirstStartId||task.purpose!=='PostRepair'||
    ctx.packageId!==repair.packageId||ctx.itemId!==repair.itemId||ctx.bindingId!==repair.bindingId||
    ctx.mode!==(repair.mode==='Normal'?'NORMAL':'FAST_TRACK')||!['InProgress','Submitted','Reviewed','CorrectionRequired'].includes(ctx.status))throw Error('repair_finish_required');
  const source={...s,repair};
  const start=await readSignedRepairPredecessor(identity,projectId,source,'REPAIR_EXECUTION_START',repair.currentExecutionStartId);crewReadGuard(identity);
  const finish=await readSignedRepairPredecessor(identity,projectId,source,'REPAIR_EXECUTION_FINISH',repair.currentExecutionFinishId);crewReadGuard(identity);
  const input=(finish.op.repair as OfflineRecord).finish as OfflineRecord;
  const actual=await readOfflineResource<OfflineItemReceipt>(identity,projectId,'origins',String(finish.op.originId));crewReadGuard(identity);
  const outcome=actual.outcome as OfflineRecord;
  if(!actual.durableAcknowledgment||!['COMMITTED','REPLAYED'].includes(actual.state)||actual.kind!=='REPAIR_EXECUTION_FINISH'||
    actual.originId!==finish.op.originId||actual.effectId!==finish.op.effectId||actual.canonicalOriginId!==finish.op.originId||
    start.outcome.firstStartId!==task.firstStartOriginId||input.executionStartId!==start.op.effectId||
    outcome?.id!==finish.op.effectId||outcome.itemId!==ctx.itemId||outcome.taskId!==taskId||outcome.executionStartId!==start.op.effectId||
    (start.op.repair as OfflineRecord).start==null||((start.op.repair as OfflineRecord).start as OfflineRecord).fieldFirstStartId!==task.firstStartOriginId||
    outcome.serverReceivedAt!==finish.outcome.serverReceivedAt||outcome.verifiedOriginalAt!==null||outcome.timeProvenance!=='UNKNOWN'||
    typeof outcome.serverReceivedAt!=='string'||!Number.isFinite(Date.parse(outcome.serverReceivedAt)))throw Error('repair_finish_required');
  return {finishId:String(finish.op.effectId),executionStartId:String(start.op.effectId),firstStartId:task.firstStartOriginId!,
    finishAt:outcome.serverReceivedAt,packageId:ctx.packageId,itemId:ctx.itemId,bindingId:ctx.bindingId,assignmentId:task.assignmentId!,
    itemVersion:String(repair.itemVersion),signedFinishOriginId:String(finish.op.originId),timeBasis:'SERVER_RECEIVED' as const};
}

export async function readCurrentSignedRepairClaim(context:FieldContext,task:FieldTaskViewFact) {
  const identity=currentQueueIdentity();
  if(!identity||identity.actor!==context.actor||identity.scope!==context.scope||identity.environment!==context.environment)throw Error('repair_session_changed');
  return readSignedRepairClaim(identity,context.projectId,context.taskId,task);
}
