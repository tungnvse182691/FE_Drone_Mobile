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
  return {geometry:geometry?.data??null,geometryUnavailable,history,defectTarget:before.data.defectTarget??null};
}
export interface SafetyView {
  id:string;projectId:string;defectId:string;formalObligationId:string;safetyObligationId:string;responsibleActorId:string;
  installedAt:string|null;firstCheckDueAt:string|null;currentCheckId:string|null;version:string;
  checks:{id:string;actorId:string;at:string;result:string;findings:string;evidenceLinkIds:string[]}[];
  warnings:{id:string;sourceCheckId:string;intendedActorId:string;serverReceivedAt:string;originalDueAt:string;reason:string}[];
  acknowledgements:{id:string;warningId:string;actorId:string;at:string;afterOriginalDue:boolean}[];
  eligibleEvidenceLinks?: {evidenceLinkId:string;fileId:string}[] | null;
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
  const links=v.eligibleEvidenceLinks;
  if(v.id!==r.measureId||v.projectId!==r.projectId||v.responsibleActorId!==identity.actor||!api.isRepairItemVersion(v.version)||
    etag!==`"${v.version}"`||!Array.isArray(v.checks)||!Array.isArray(v.warnings)||!Array.isArray(v.acknowledgements)||
    (links!=null&&(!Array.isArray(links)||links.some(l=>!api.isCrewResourceId(l.evidenceLinkId)||!api.isCrewResourceId(l.fileId))||
      new Set(links.map(l=>l.evidenceLinkId.toLowerCase())).size!==links.length)))throw Error('safety_readback_invalid');
  return {data:v,etag};
}

/** Crew-only discovery from f547f64. Empty means no currently assigned unresolved measure. */
export async function listCrewSafetyMeasures(identity:QueueIdentity,r:Omit<RepairSafetyResource,'measureId'>):Promise<string[]> {
  crewReadGuard(identity);
  const response=await apiClient.get<{measureIds:string[]}>(itemPath(r)+'/safety-measures');crewReadGuard(identity);
  const ids=response.data?.measureIds;
  if(!Array.isArray(ids)||!ids.every(api.isCrewResourceId)||new Set(ids.map(id=>id.toLowerCase())).size!==ids.length)throw Error('safety_list_invalid');
  return ids;
}

/** Read API080 twice: never attach monitoring or decisions to a replaced assignment/binding. */
export async function readAssignedRepairFacts(identity:QueueIdentity,projectId:string,taskId:string) {
  crewReadGuard(identity);
  const before=await api.getFieldInspectionTaskDetailReal(projectId,taskId);crewReadGuard(identity);
  api.validateCrewTaskDetail(before.data,before.etag,projectId,taskId,identity.actor);
  const context=before.data.repairContext;
  if(!context)return null;
  if(![context.packageId,context.itemId,context.bindingId].every(api.isCrewResourceId)||!api.isRepairItemVersion(context.itemVersion))throw Error('crew_repair_source_invalid');
  const source=JSON.stringify([before.etag,before.data.assignmentId,context]);
  const resource={projectId,packageId:context.packageId,itemId:context.itemId};
  const ids=await listCrewSafetyMeasures(identity,resource);
  const measures:Awaited<ReturnType<typeof readSafetyMeasure>>[]=[];
  for(const measureId of ids)measures.push(await readSafetyMeasure(identity,{...resource,measureId}));
  const after=await api.getFieldInspectionTaskDetailReal(projectId,taskId);crewReadGuard(identity);
  api.validateCrewTaskDetail(after.data,after.etag,projectId,taskId,identity.actor);
  if(source!==JSON.stringify([after.etag,after.data.assignmentId,after.data.repairContext]))throw Error('crew_repair_source_changed');
  return {context,measures};
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
export { currentQueueIdentity };
