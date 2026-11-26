import { initDatabase, openDatabase } from '../offline/database';
import { sameQueueIdentity, type QueueIdentity } from '../offline/upload-queue';
import { openOfflineJournal, sameOfflinePartition, type OfflineJournalRecord } from './crewOfflineJournal';
import { repairAssessmentMatchesDraft } from './crewRepairDraft';
import type { FieldDraft } from './crewFieldDraft';
import type { OfflineRecord } from './crewOfflineProtocol';
import { isCrewResourceId, searchCrewTaskIdentityPage } from './crewApi';

export interface CrewLocalDraftSummary {
  id:string; projectId:string; taskId:string; photos:number; verifiedPhotos:number;
  measurements:number; currentSession:boolean; hasCommand:boolean; assessmentConfirmed?:boolean; updatedAt:string|null; taskCode?:string|null;
}
/** Display-only identity lookup. Failure must not hide or modify a local draft. */
export async function readCrewLocalTaskCode(identity:QueueIdentity,row:Pick<CrewLocalDraftSummary,'projectId'|'taskId'>,signal?:AbortSignal):Promise<string|null> {
  try {
    if(identity.role!=='REPAIR_CREW'||!sameQueueIdentity(identity))return null;
    const result=await searchCrewTaskIdentityPage(null,100,signal??new AbortController().signal,{search:row.taskId},{
      actorId:identity.actor,
      assertCurrent:()=>{if(!sameQueueIdentity(identity))throw Error('crew_session_changed');},
    });
    if(!sameQueueIdentity(identity)||signal?.aborted)return null;
    const task=result.items.find(item=>item.id.toLowerCase()===row.taskId.toLowerCase()&&item.projectId.toLowerCase()===row.projectId.toLowerCase()&&item.crewId.toLowerCase()===identity.actor.toLowerCase());
    return task?.taskCode?.trim()||null;
  } catch {return null;}
}
/** Presentation only: exact retained source plus per-origin receipt/checkpoint.
 * This does not authorize start/finish or equate an assessment with completed work. */
function confirmedAssessment(draft:FieldDraft,identity:QueueIdentity,rows:OfflineJournalRecord[]):boolean {
  if(draft.command||draft.result||draft.supplement||draft.repairClaim||draft.captures.some(c=>c.purpose==='AFTER'))return false;
  let matches=0;
  for(const row of rows){
    if(row.projectId!==draft.projectId||row.phase!=='RECONCILED'||row.proof.kind!=='signed-field-batch'||
      row.identity.scope!==draft.scope||!sameOfflinePartition(row.identity,identity))continue;
    for(const op of (JSON.parse(row.body).operations??[]) as OfflineRecord[]){
      const repair=op.repair as OfflineRecord|undefined,assessment=repair?.assessment as OfflineRecord|undefined;
      if(op.kind!=='REPAIR_ASSESSMENT'||op.taskId!==draft.taskId||op.originalActorId!==draft.actor||
        op.sourceDeviceId!==row.proof.deviceId||!assessment||assessment.originId!==op.originId||assessment.deviceId!==op.sourceDeviceId)continue;
      const snapshot=rows.find(s=>s.projectId===draft.projectId&&s.phase==='RECONCILED'&&s.proof.kind==='snapshot'&&
        sameOfflinePartition(s.identity,identity)&&
        (s.receipt as {id?:unknown})?.id===op.snapshotId);
      if(!snapshot)continue;
      const source=snapshot.receipt as OfflineRecord,request=JSON.parse(snapshot.body);
      if(source.taskId!==op.taskId||source.assignmentId!==op.assignmentId||source.taskVersion!==op.taskVersion||source.originalActorId!==draft.actor||
        source.deviceRegistrationId!==row.proof.registrationId||request.taskId!==draft.taskId||request.deviceRegistrationId!==row.proof.registrationId||
        ((source.snapshot as OfflineRecord)?.repair as OfflineRecord)?.itemId!==repair?.resourceId)continue;
      const verified=row.verifiedItems?.find(v=>v.originId===op.originId&&v.effectId===op.effectId&&v.canonicalOriginId===op.originId&&
        v.kind===op.kind&&['COMMITTED','REPLAYED'].includes(v.state));
      const receipt=(row.receipt as {items?:OfflineRecord[]})?.items?.find(v=>v.originId===op.originId&&v.effectId===op.effectId&&v.canonicalOriginId===op.originId&&
        v.kind===op.kind&&v.durableAcknowledgment===true&&['COMMITTED','REPLAYED'].includes(String(v.state)));
      const outcome=receipt?.outcome as OfflineRecord|undefined;
      if(!verified||!outcome||outcome.id!==op.effectId||outcome.taskId!==draft.taskId||outcome.itemId!==repair?.resourceId||
        outcome.stage!=='PRE_EXECUTION'||outcome.firstStartId!==assessment.fieldFirstStartId)continue;
      try{
        const evidence=(assessment.evidence as OfflineRecord[]).map(e=>{
          const c=draft.captures.find(c=>c.id===e.captureOriginId);
          if(e.sizeBytes!=null&&e.sizeBytes!==c?.size)throw Error('assessment_source_changed');
          if(e.fileId===null&&(!c?.verified||c.upload?.status!=='VERIFIED'||!c.upload.fileId||c.offlineUpload?.originId!==op.originId||
            (e.sizeBytes!=null&&e.sizeBytes!==c.size)))throw Error('assessment_source_unconfirmed');
          const {sizeBytes,...original}=e;
          return {...original,fileId:e.fileId===null?c!.upload!.fileId:e.fileId};
        });
        const comparable={...assessment,evidence,measurements:(assessment.measurements as OfflineRecord[]).map(m=>({...m,
          value:m.value===null?null:Number((m.value as {decimal?:string})?.decimal??m.value)}))};
        if(repairAssessmentMatchesDraft(comparable,draft))matches++;
      }catch{/* Unknown or incomplete historical source stays unconfirmed. */}
    }
  }
  return matches===1;
}
/** Read-only index of FIELD storage with exact assessment receipt status. No payload or URI escapes. */
export async function readCrewLocalDrafts(identity:QueueIdentity):Promise<CrewLocalDraftSummary[]> {
  const guard=()=>{if(identity.role!=='REPAIR_CREW'||!sameQueueIdentity(identity))throw Error('crew_session_changed');};
  guard();const db=openDatabase();await initDatabase(db);guard();
  const prefix=`t05b:${JSON.stringify([identity.environment,identity.actor]).slice(0,-1)},`;
  const rows=await db.getAllAsync<{id:string;payload:string;updated_at?:string}>(
    'SELECT id, payload, updated_at FROM local_draft WHERE kind = ? AND substr(id, 1, ?) = ? ORDER BY updated_at DESC',
    'T05B_FIELD',prefix.length,prefix);
  guard();
  const journal=await openOfflineJournal(identity,db),journalRows=await journal.list();guard();
  const summaries:CrewLocalDraftSummary[]=[];
  for(const row of rows) {
    const d=JSON.parse(row.payload);
    if(d.actor!==identity.actor||d.environment!==identity.environment)continue;
    if(!isCrewResourceId(d.projectId)||!isCrewResourceId(d.taskId)||typeof d.scope!=='string'||
      !Array.isArray(d.captures)||!Array.isArray(d.measurements))throw Error('field_draft_invalid');
    if(!d.captures.length&&!d.measurements.length&&!d.command)continue;
    summaries.push({id:row.id,projectId:d.projectId,taskId:d.taskId,photos:d.captures.length,
      verifiedPhotos:d.captures.filter((c:{verified?:boolean})=>c.verified===true).length,
      measurements:d.measurements.length,currentSession:d.scope===identity.scope,hasCommand:!!d.command,
      assessmentConfirmed:confirmedAssessment(d,identity,journalRows),
      updatedAt:typeof row.updated_at==='string'&&Number.isFinite(Date.parse(row.updated_at))?row.updated_at:null});
  }
  guard();return summaries;
}

/** Group retained generations for display only. A command is history, not proof of pending or sent. */
export function groupCrewLocalDrafts(rows:CrewLocalDraftSummary[]) {
  const groups=new Map<string,{latest:CrewLocalDraftSummary;versions:number;hasCommand:boolean}>();
  for(const row of rows){
    const key=JSON.stringify([row.projectId,row.taskId]);
    const group=groups.get(key);
    if(group){group.versions++;group.hasCommand ||= row.hasCommand;}
    else groups.set(key,{latest:row,versions:1,hasCommand:row.hasCommand});
  }
  return [...groups.values()];
}
