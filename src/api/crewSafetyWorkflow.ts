import * as api from './crewApi';
import { currentQueueIdentity, sameQueueIdentity, type QueueIdentity } from '../offline/upload-queue';
import { apiClient } from './client';

export function crewReadGuard(identity:QueueIdentity):void {
  if(identity.role!=='REPAIR_CREW'||!sameQueueIdentity(identity))throw Error('crew_session_changed');
}
export async function readAssignedFieldFacts(identity:QueueIdentity,projectId:string,taskId:string) {
  crewReadGuard(identity);
  const before=await api.getFieldInspectionTaskDetailReal(projectId,taskId);crewReadGuard(identity);
  api.validateCrewTaskDetail(before.data,before.etag,projectId,taskId,identity.actor);
  let geometry:Awaited<ReturnType<typeof api.getFieldTaskGeometryReal>>|null=null;
  let geometryUnavailable=false;
  try {geometry=await api.getFieldTaskGeometryReal(projectId,taskId);}
  catch(e) {crewReadGuard(identity);if((e as {response?:{status?:number}})?.response?.status!==409)throw e;geometryUnavailable=true;}
  crewReadGuard(identity);
  const pins=['routeVersionId','segmentSetId','layoutRevisionId','slabId','mapPublicationId','crsProfileRevisionId'] as const;
  if(geometry&&(geometry.etag!==before.etag||pins.some(k=>geometry!.data[k]!==before.data[k])))throw Error('geometry_source_changed');
  const history=await api.getFieldTaskHistoryReal(projectId,taskId);crewReadGuard(identity);
  const after=await api.getFieldInspectionTaskDetailReal(projectId,taskId);crewReadGuard(identity);
  api.validateCrewTaskDetail(after.data,after.etag,projectId,taskId,identity.actor);
  if(after.etag!==before.etag||after.data.assignmentId!==before.data.assignmentId)throw Error('crew_task_changed');
  return {geometry:geometry?.data??null,geometryUnavailable,history};
}
export interface SafetyView {
  id:string;projectId:string;defectId:string;formalObligationId:string;safetyObligationId:string;responsibleActorId:string;
  installedAt:string|null;firstCheckDueAt:string|null;currentCheckId:string|null;version:string;
  checks:{id:string;actorId:string;at:string;result:string;findings:string;evidenceLinkIds:string[]}[];
  warnings:{id:string;sourceCheckId:string;intendedActorId:string;serverReceivedAt:string;originalDueAt:string;reason:string}[];
  acknowledgements:{id:string;warningId:string;actorId:string;at:string;afterOriginalDue:boolean}[];
}
export interface RepairSafetyResource {projectId:string;packageId:string;itemId:string;measureId:string}
function itemPath(r:{projectId:string;packageId:string;itemId:string}):string {
  if(![r.projectId,r.packageId,r.itemId].every(api.isCrewResourceId))throw Error('crew_resource_invalid');
  return `/projects/${r.projectId}/repair-packages/${r.packageId}/items/${r.itemId}`;
}
function measurePath(r:RepairSafetyResource):string {
  if(!api.isCrewResourceId(r.measureId))throw Error('safety_measure_source_required');
  return itemPath(r)+'/safety-measures/'+r.measureId;
}
/** API-152: monitoring ETag, distinct from task AND RepairItem rowversion. No PM discovery fallback. */
export async function readSafetyMeasure(identity:QueueIdentity,r:RepairSafetyResource) {
  crewReadGuard(identity);const response=await apiClient.get<SafetyView>(measurePath(r));crewReadGuard(identity);
  const v=response.data,etag=String(response.headers.etag??'');
  if(v.id!==r.measureId||v.projectId!==r.projectId||v.responsibleActorId!==identity.actor||!api.isRepairItemVersion(v.version)||
    etag!==`"${v.version}"`||!Array.isArray(v.checks)||!Array.isArray(v.warnings)||!Array.isArray(v.acknowledgements))throw Error('safety_readback_invalid');
  return {data:v,etag};
}
export type SafetyCommand = {kind:'review-request';reason:string} | {kind:'installation';firstCheckDueAt:string;reason:string} |
  {kind:'check';result:'Safe'|'NeedsReplacement'|'Danger';findings:string;evidenceIds:string[]} | {kind:'acknowledgement';warningId:string;reason:string};
export function safetyRequest(r:RepairSafetyResource,c:SafetyCommand) {
  const text=(s:string)=>{if(typeof s!=='string'||!s.trim()||s.length>2000)throw Error('crew_text_invalid');return s;};
  if(c.kind==='review-request')return {path:itemPath(r)+'/review-requests',body:{reason:text(c.reason)}};
  const path=measurePath(r);
  if(c.kind==='installation') {
    if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?(?:Z|[+-]\d{2}:\d{2})$/.test(c.firstCheckDueAt)||!Number.isFinite(Date.parse(c.firstCheckDueAt)))throw Error('safety_due_date_required');
    return {path:path+'/installation',body:{firstCheckDueAt:c.firstCheckDueAt,reason:text(c.reason)}};
  }
  if(c.kind==='check') {
    if(!['Safe','NeedsReplacement','Danger'].includes(c.result)||!Array.isArray(c.evidenceIds)||c.evidenceIds.length<1||c.evidenceIds.length>20||
      !c.evidenceIds.every(api.isCrewResourceId)||new Set(c.evidenceIds.map(x=>x.toLowerCase())).size!==c.evidenceIds.length)throw Error('safety_verified_evidence_required');
    return {path:path+'/checks',body:{result:c.result,findings:text(c.findings),evidenceIds:[...c.evidenceIds]}};
  }
  if(!api.isCrewResourceId(c.warningId))throw Error('safety_warning_source_required');
  return {path:path+`/warnings/${c.warningId}/acknowledgement`,body:{reason:text(c.reason)}};
}
/** There is no Crew measure list or current decision/review-request read head in audited bootstrap. */
export const CREW_REVIEW_GATE='READBACK_GAP: chưa có nguồn quyết định hiện hành và GET review request cho Crew.';
export const CREW_SAFETY_GATE='BE_DISCOVERY_GAP: chưa có danh sách measure/warning từ nguồn Crew. Cần định danh máy chủ đã xác nhận.';
export { currentQueueIdentity };
