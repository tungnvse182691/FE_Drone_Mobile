import { apiClient } from './client';
import { getFieldInspectionTaskDetailReal, validateCrewTaskDetail, isCrewResourceId, isRepairItemVersion } from './crewApi';
import { crewReadGuard } from './crewSafetyWorkflow';
import { openOfflineJournal, type OfflineJournalRecord } from './crewOfflineJournal';
import type { QueueIdentity } from '../offline/upload-queue';
import { uuidv4 } from '../utils/uuid';

export interface ReviewResource {projectId:string;taskId:string;packageId:string;itemId:string}
interface ReviewReceipt {id:string;itemId:string;decisionId:string;actorId:string;role:string;reason:string;at:string;version:string}
const pathFor=(r:ReviewResource)=>`/projects/${r.projectId}/repair-packages/${r.packageId}/items/${r.itemId}/review-requests`;
export async function readReviewSource(identity:QueueIdentity,r:ReviewResource) {
  crewReadGuard(identity);
  if(![r.projectId,r.taskId,r.packageId,r.itemId].every(isCrewResourceId))throw Error('review_source_invalid');
  const response=await getFieldInspectionTaskDetailReal(r.projectId,r.taskId);crewReadGuard(identity);
  validateCrewTaskDetail(response.data,response.etag,r.projectId,r.taskId,identity.actor);
  const c=response.data.repairContext;
  if(!c||c.packageId!==r.packageId||c.itemId!==r.itemId||!isCrewResourceId(c.bindingId)||!isRepairItemVersion(c.itemVersion))throw Error('review_source_changed');
  return {context:c,assignmentId:response.data.assignmentId};
}
export async function prepareReviewRequest(identity:QueueIdentity,r:ReviewResource,decisionId:string,reason:string) {
  if(!isCrewResourceId(decisionId)||!reason.trim()||reason.length>2000)throw Error('review_form_invalid');
  const source=await readReviewSource(identity,r);
  if(source.context.finalDecision?.decisionId!==decisionId)throw Error('review_decision_changed');
  const journal=await openOfflineJournal(identity);crewReadGuard(identity);
  return journal.prepare({id:uuidv4(),identity,projectId:r.projectId,path:pathFor(r),key:uuidv4(),body:JSON.stringify({reason:reason.trim()}),
    proof:{kind:'review-request',resource:{...r},decisionId,bindingId:source.context.bindingId,assignmentId:source.assignmentId,
      ifMatch:`"${source.context.itemVersion}"`,versionSource:'REPAIR_ITEM'}});
}
function validateIntent(record:OfflineJournalRecord) {
  const p=record.proof,r=p.resource as ReviewResource,b=JSON.parse(record.body) as {reason:string};
  if(p.kind!=='review-request'||p.versionSource!=='REPAIR_ITEM'||!r||![r.projectId,r.taskId,r.packageId,r.itemId,p.decisionId,p.bindingId].every(x=>isCrewResourceId(String(x)))||
    record.projectId!==r.projectId||record.path!==pathFor(r)||typeof b.reason!=='string'||!b.reason.trim()||b.reason.length>2000||
    record.body!==JSON.stringify({reason:b.reason})||!/^"[A-Za-z0-9+/]{11}="$/.test(String(p.ifMatch)))throw Error('review_intent_invalid');
  return {resource:r,reason:b.reason};
}
export async function dispatchReviewRequest(record:OfflineJournalRecord) {
  crewReadGuard(record.identity);validateIntent(record);
  const j=await openOfflineJournal(record.identity),pending=await j.transition(record,'IN_FLIGHT');
  try {
    crewReadGuard(record.identity);
    const response=await apiClient.post<ReviewReceipt>(record.path,record.body,{headers:{'If-Match':String(record.proof.ifMatch),'Idempotency-Key':record.key,'Content-Type':'application/json'},transformRequest:[data=>data]});
    crewReadGuard(record.identity);return await j.transition(pending,'RECEIVED',response.data);
  }catch(e){try{
    crewReadGuard(record.identity);const r=(e as {response?:{status?:number;data?:{code?:unknown}}}).response;
    const status=r?.status,code=typeof r?.data?.code==='string'?r.data.code:'unknown';
    if(status===409||status===412)await j.transition(pending,'CONFLICT',{status,code});
    else if(status&&[400,403,404,422,428].includes(status))await j.transition(pending,'REJECTED',{status,code});
    else await j.transition(pending,'UNKNOWN_OUTCOME');
  }catch{/* Preserve the original owner's durable command. */}throw e;}
}
export async function reconcileReviewRequest(record:OfflineJournalRecord) {
  crewReadGuard(record.identity);const {resource:r,reason}=validateIntent(record),receipt=record.receipt as ReviewReceipt;
  if(record.phase!=='RECEIVED'||!receipt||!isCrewResourceId(receipt.id)||receipt.itemId!==r.itemId||receipt.actorId!==record.identity.actor||
    receipt.role!=='RepairCrew'||`"${receipt.version}"`!==record.proof.ifMatch||
    receipt.decisionId!==record.proof.decisionId||receipt.reason!==reason||!Number.isFinite(Date.parse(receipt.at)))throw Error('review_receipt_invalid');
  const source=await readReviewSource(record.identity,r);crewReadGuard(record.identity);
  if(source.context.bindingId!==record.proof.bindingId||source.assignmentId!==record.proof.assignmentId)throw Error('review_source_changed');
  if(!source.context.reviewRequests?.some(x=>x.requestId===receipt.id&&x.decisionId===receipt.decisionId&&x.reason===reason&&Date.parse(x.at)===Date.parse(receipt.at)))throw Error('review_readback_mismatch');
  return (await openOfflineJournal(record.identity)).transition(record,'RECONCILED',receipt);
}
