import { apiClient } from './client';
import { crewReadGuard, readSafetyMeasure, safetyRequest, type SafetyView, type SafetyCommand, type RepairSafetyResource } from './crewSafetyWorkflow';
import { openOfflineJournal, type OfflineJournalRecord } from './crewOfflineJournal';
import type { QueueIdentity } from '../offline/upload-queue';
import { uuidv4 } from '../utils/uuid';

export async function prepareSafetyIntent(identity:QueueIdentity,resource:RepairSafetyResource,command:SafetyCommand) {
  crewReadGuard(identity);
  // Current BE has these sources; their dedicated command flows are separate checkpoints.
  if(command.kind==='review-request')throw Error('review_request_not_integrated');
  const copy=JSON.parse(JSON.stringify(command)) as SafetyCommand,r={...resource};
  const before=await readSafetyMeasure(identity,r);crewReadGuard(identity);
  if(copy.kind==='check') {
    if(!before.data.installedAt)throw Error('safety_installation_required');
    // Validate syntax before looking up the server-owned evidence link mapping.
    safetyRequest(r,copy);
    const files=copy.evidenceIds.map(id=>before.data.eligibleEvidenceLinks?.find(l=>l.evidenceLinkId.toLowerCase()===id.toLowerCase())?.fileId.toLowerCase());
    if(files.some(id=>!id))throw Error('safety_evidence_not_current');
    if(new Set(files).size!==files.length)throw Error('safety_duplicate_file');
  }
  if(copy.kind==='installation'&&before.data.installedAt!==null)throw Error('safety_already_installed');
  if(copy.kind==='installation'&&(!Number.isFinite(Date.parse(copy.firstCheckDueAt))||Date.parse(copy.firstCheckDueAt)<=Date.now()||
    Date.parse(copy.firstCheckDueAt)>Date.now()+24*3600000))throw Error('safety_due_date_range');
  if(copy.kind==='acknowledgement'&&(!before.data.warnings.some(w=>w.id===copy.warningId&&w.intendedActorId===identity.actor)||
    before.data.acknowledgements.some(a=>a.warningId===copy.warningId)))throw Error('safety_warning_not_current');
  const request=safetyRequest(r,copy),journal=await openOfflineJournal(identity);
  return journal.prepare({id:uuidv4(),identity,projectId:r.projectId,path:request.path,key:uuidv4(),body:JSON.stringify(request.body),
    proof:{kind:'safety',resource:r,command:copy,ifMatch:before.etag,versionSource:'SAFETY_MONITORING',
      ...(copy.kind==='check'?{priorCheckIds:before.data.checks.map(c=>c.id)}:{})}});
}
/** Exact API153/154 transport. Other mutation UIs are delivered in separate checkpoints. */
export async function dispatchSafetyIntent(record:OfflineJournalRecord) {
  crewReadGuard(record.identity);
  if(!['installation','check'].includes((record.proof?.command as SafetyCommand|undefined)?.kind??''))throw Error('BE_FIXTURE_BLOCKED');
  const c=record.proof.command as SafetyCommand,r=record.proof.resource as RepairSafetyResource;
  if(record.proof.kind!=='safety'||record.proof.versionSource!=='SAFETY_MONITORING'||c.kind==='review-request')throw Error('safety_source_gap');
  const request=safetyRequest(r,c);
  if(record.projectId!==r.projectId||record.path!==request.path||record.body!==JSON.stringify(request.body)||!/^"[A-Za-z0-9+/]{11}="$/.test(String(record.proof.ifMatch)))throw Error('safety_intent_invalid');
  const j=await openOfflineJournal(record.identity),pending=await j.transition(record,'IN_FLIGHT');
  try {
    crewReadGuard(record.identity);
    const response=await apiClient.post(record.path,record.body,{headers:{'If-Match':String(record.proof.ifMatch),'Idempotency-Key':record.key,'Content-Type':'application/json'},transformRequest:[data=>data]});
    crewReadGuard(record.identity);
    return await j.transition(pending,'RECEIVED',response.data);
  }catch(e){try{
    crewReadGuard(record.identity);
    const response=(e as {response?:{status?:number;data?:{code?:unknown}}}).response;
    const status=response?.status,code=typeof response?.data?.code==='string'?response.data.code:'unknown';
    if(status===409||status===412)await j.transition(pending,'CONFLICT',{status,code});
    else if(status&&[400,403,404,422,428].includes(status))await j.transition(pending,'REJECTED',{status,code});
    else await j.transition(pending,'UNKNOWN_OUTCOME');
  }catch{/* Preserve old owner journal. */}throw e;}
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
  }else if(c.kind==='check') {
    const prior=record.proof.priorCheckIds;
    const sameEvidence=(ids:string[])=>Array.isArray(ids)&&ids.length===c.evidenceIds.length&&
      [...ids].map(id=>id.toLowerCase()).sort().join(',')===c.evidenceIds.map(id=>id.toLowerCase()).sort().join(',');
    const matches=(check:SafetyView['checks'][number])=>check.actorId===record.identity.actor&&check.result===c.result&&
      check.findings===c.findings&&sameEvidence(check.evidenceLinkIds);
    const candidates=Array.isArray(prior)?receipt.checks?.filter(check=>!prior.includes(check.id)&&matches(check)):[];
    if(candidates?.length!==1||!actual.data.checks.some(check=>check.id===candidates[0].id&&matches(check)))throw Error('safety_check_readback_mismatch');
  }else if(c.kind==='acknowledgement') {
    const ack=receipt.acknowledgements?.find(a=>a.warningId===c.warningId&&a.actorId===record.identity.actor);
    if(!ack||!actual.data.acknowledgements.some(a=>a.id===ack.id&&a.warningId===c.warningId&&a.actorId===record.identity.actor))throw Error('safety_ack_readback_mismatch');
  }else throw Error('safety_source_gap');
  const j=await openOfflineJournal(record.identity);return j.transition(record,'RECONCILED',actual.data);
}
