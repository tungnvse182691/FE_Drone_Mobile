import { apiClient } from './client';
import { crewReadGuard, readSafetyMeasure, safetyRequest, type SafetyView, type SafetyCommand, type RepairSafetyResource } from './crewSafetyWorkflow';
import { openOfflineJournal, type OfflineJournalRecord } from './crewOfflineJournal';
import type { QueueIdentity } from '../offline/upload-queue';
import { uuidv4 } from '../utils/uuid';

/** No disposable safety fixture has been authorized/verified. UI mutations remain disabled. */
export const SAFETY_MUTATION_ACCEPTANCE_VERIFIED=false;
export async function prepareSafetyIntent(identity:QueueIdentity,resource:RepairSafetyResource,command:SafetyCommand) {
  crewReadGuard(identity);
  // API150 lacks Crew current-decision + request-head readback; API153 expects FIELD evidence-LINK IDs, not file IDs.
  if(command.kind==='review-request')throw Error('READBACK_GAP');
  if(command.kind==='check')throw Error('BE_EVIDENCE_LINK_SOURCE_GAP');
  const copy=JSON.parse(JSON.stringify(command)) as SafetyCommand,r={...resource};
  const before=await readSafetyMeasure(identity,r);crewReadGuard(identity);
  if(copy.kind==='installation'&&before.data.installedAt!==null)throw Error('safety_already_installed');
  if(copy.kind==='acknowledgement'&&(!before.data.warnings.some(w=>w.id===copy.warningId&&w.intendedActorId===identity.actor)||
    before.data.acknowledgements.some(a=>a.warningId===copy.warningId)))throw Error('safety_warning_not_current');
  const request=safetyRequest(r,copy),journal=await openOfflineJournal(identity);
  return journal.prepare({id:uuidv4(),identity,projectId:r.projectId,path:request.path,key:uuidv4(),body:JSON.stringify(request.body),
    proof:{kind:'safety',resource:r,command:copy,ifMatch:before.etag,versionSource:'SAFETY_MONITORING'}});
}
/** API154/155 exact transport. API150/153 stay source-blocked before journaling or POST. */
export async function dispatchSafetyIntent(record:OfflineJournalRecord) {
  crewReadGuard(record.identity);
  if(!SAFETY_MUTATION_ACCEPTANCE_VERIFIED)throw Error('BE_FIXTURE_BLOCKED');
  const c=record.proof.command as SafetyCommand,r=record.proof.resource as RepairSafetyResource;
  if(record.proof.kind!=='safety'||record.proof.versionSource!=='SAFETY_MONITORING'||c.kind==='review-request'||c.kind==='check')throw Error('safety_source_gap');
  const request=safetyRequest(r,c);
  if(record.projectId!==r.projectId||record.path!==request.path||record.body!==JSON.stringify(request.body)||!/^"[A-Za-z0-9+/]{11}="$/.test(String(record.proof.ifMatch)))throw Error('safety_intent_invalid');
  const j=await openOfflineJournal(record.identity),pending=await j.transition(record,'IN_FLIGHT');
  try {
    crewReadGuard(record.identity);
    const response=await apiClient.post(record.path,record.body,{headers:{'If-Match':String(record.proof.ifMatch),'Idempotency-Key':record.key,'Content-Type':'application/json'},transformRequest:[data=>data]});
    crewReadGuard(record.identity);
    return await j.transition(pending,'RECEIVED',response.data);
  }catch(e){try{crewReadGuard(record.identity);await j.transition(pending,'UNKNOWN_OUTCOME');}catch{/* Preserve old owner journal. */}throw e;}
}

export async function reconcileSafetyIntent(record:OfflineJournalRecord) {
  crewReadGuard(record.identity);
  if(record.phase!=='RECEIVED'||record.proof.kind!=='safety')throw Error('safety_receipt_required');
  const c=record.proof.command as SafetyCommand,r=record.proof.resource as RepairSafetyResource,receipt=record.receipt as SafetyView;
  const request=safetyRequest(r,c);
  if(record.path!==request.path||record.projectId!==r.projectId||record.body!==JSON.stringify(request.body)||receipt?.id!==r.measureId||receipt.responsibleActorId!==record.identity.actor)throw Error('safety_receipt_invalid');
  const actual=await readSafetyMeasure(record.identity,r);crewReadGuard(record.identity);
  if(c.kind==='installation') {
    if(!receipt.installedAt||actual.data.installedAt!==receipt.installedAt||!actual.data.firstCheckDueAt||
      Date.parse(actual.data.firstCheckDueAt)!==Date.parse(c.firstCheckDueAt))throw Error('safety_installation_readback_mismatch');
  }else if(c.kind==='acknowledgement') {
    const ack=receipt.acknowledgements?.find(a=>a.warningId===c.warningId&&a.actorId===record.identity.actor);
    if(!ack||!actual.data.acknowledgements.some(a=>a.id===ack.id&&a.warningId===c.warningId&&a.actorId===record.identity.actor))throw Error('safety_ack_readback_mismatch');
  }else throw Error('safety_source_gap');
  const j=await openOfflineJournal(record.identity);return j.transition(record,'RECONCILED',actual.data);
}
