import { initDatabase, openDatabase } from '../offline/database';
import { sameQueueIdentity, type QueueIdentity } from '../offline/upload-queue';
import { isCrewResourceId } from './crewApi';

export interface CrewLocalDraftSummary {
  id:string; projectId:string; taskId:string; photos:number; verifiedPhotos:number;
  measurements:number; currentSession:boolean; hasCommand:boolean; updatedAt:string|null;
}
/** Read-only index of FIELD storage, separate from signed-sync receipts. No payload or URI escapes. */
export async function readCrewLocalDrafts(identity:QueueIdentity):Promise<CrewLocalDraftSummary[]> {
  const guard=()=>{if(identity.role!=='REPAIR_CREW'||!sameQueueIdentity(identity))throw Error('crew_session_changed');};
  guard();const db=openDatabase();await initDatabase(db);guard();
  const prefix=`t05b:${JSON.stringify([identity.environment,identity.actor]).slice(0,-1)},`;
  const rows=await db.getAllAsync<{id:string;payload:string;updated_at?:string}>(
    'SELECT id, payload, updated_at FROM local_draft WHERE kind = ? AND substr(id, 1, ?) = ? ORDER BY updated_at DESC',
    'T05B_FIELD',prefix.length,prefix);
  guard();
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
