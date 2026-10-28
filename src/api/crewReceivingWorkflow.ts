import { randomUUID } from 'expo-crypto';
import { apiClient } from './client';
import { isCrewResourceId, isRepairItemVersion, listCrewProjectsReal } from './crewApi';
import { currentReceivingIdentity, sameReceivingIdentity, openReceivingJournal, type ReceivingIdentity } from './crewReceivingDraft';

export interface ReceivingView {
  id:string; projectId:string; kind:string; sourceKind:string; sourceId:string; sourceVersion:string;
  scopeId:string; responsibleActorId:string|null; responsibleRole:string; requestedAt:string;
  receivingState:string; waitingSeconds:number; acknowledgmentId:string|null; acknowledgedBy:string|null;
  acknowledgedAt:string|null; claimedDeviceAt:string|null; completedAt:string|null; version:string;
}
export interface ReceivingRuntime {
  current:()=>ReceivingIdentity|null; uuid:()=>string; http:Pick<typeof apiClient,'get'|'post'>;
  journal:(i:ReceivingIdentity)=>ReturnType<typeof openReceivingJournal>;
}
export function receivingRuntime(i:ReceivingIdentity):ReceivingRuntime {
  return {current:()=>currentReceivingIdentity(i.projectId),uuid:randomUUID,http:apiClient,journal:openReceivingJournal};
}
function guard(i:ReceivingIdentity,r:ReceivingRuntime) {if(!sameReceivingIdentity(i,r.current()))throw Error('receiving_session_changed');}
async function guarded<T>(i:ReceivingIdentity,r:ReceivingRuntime,fn:()=>Promise<T>) {guard(i,r);const v=await fn();guard(i,r);return v;}
function base(i:ReceivingIdentity) {if(!isCrewResourceId(i.projectId))throw Error('receiving_identity_invalid');return `/projects/${i.projectId}/receiving-requests`;}
export function validateReceiving(v:ReceivingView,i:ReceivingIdentity,id?:string):void {
  if(!v || !isCrewResourceId(v.id) || v.projectId!==i.projectId || (id && v.id!==id) ||
      v.responsibleActorId!==i.actor || v.responsibleRole!=='RepairCrew' || !isRepairItemVersion(v.version))throw Error('receiving_owner_or_version_invalid');
}
export async function discoverReceivingProjects(i:ReceivingIdentity,cursor?:string,r=receivingRuntime(i)) {
  return guarded(i,r,()=>listCrewProjectsReal({cursor,limit:25}));
}
export async function listReceiving(i:ReceivingIdentity,params:{scopeId?:string;after?:string;limit?:number}={},r=receivingRuntime(i)) {
  if((params.after&&!isCrewResourceId(params.after)) || (params.scopeId&&!isCrewResourceId(params.scopeId)) ||
      (params.limit!=null&&(!Number.isInteger(params.limit)||params.limit<1||params.limit>100)))throw Error('receiving_query_invalid');
  const response=await guarded(i,r,()=>r.http.get<{items:ReceivingView[];continuation:string|null}>(base(i),{params}));
  response.data.items.forEach(v=>validateReceiving(v,i));
  if(response.data.continuation!==null&&!isCrewResourceId(response.data.continuation))throw Error('receiving_cursor_invalid');
  return response.data;
}
export async function readReceiving(i:ReceivingIdentity,id:string,r=receivingRuntime(i)) {
  if(!isCrewResourceId(id))throw Error('receiving_identity_invalid');
  const response=await guarded(i,r,()=>r.http.get<ReceivingView>(`${base(i)}/${id}`));
  validateReceiving(response.data,i,id);
  if(response.headers.etag!==`"${response.data.version}"`)throw Error('receiving_etag_invalid');
  return response.data;
}
function confirmed(v:ReceivingView,i:ReceivingIdentity) {
  if(!isCrewResourceId(v.acknowledgmentId)||v.acknowledgedBy!==i.actor)throw Error('receiving_ack_unconfirmed');
  return v;
}
const busy=new Set<string>();
/** Explicit user intent only. Never regenerate a pending command, including after 409. */
export async function acknowledgeReceiving(i:ReceivingIdentity,id:string,r=receivingRuntime(i)) {
  const lock=JSON.stringify([i.environment,i.actor,i.projectId,id]);if(busy.has(lock))throw Error('receiving_busy');busy.add(lock);
  try {
    guard(i,r);const journal=await guarded(i,r,()=>r.journal(i));let command=await journal.read(id);guard(i,r);
    const view=await readReceiving(i,id,r);
    if(view.acknowledgmentId) {confirmed(view,i);if(command&&command.phase!=='CONFIRMED')await journal.confirm(command);guard(i,r);return view;}
    if(command?.phase==='CONFIRMED')throw Error('receiving_readback_inconsistent');
    if(!command) {
      if(view.completedAt)throw Error('receiving_request_closed');
      command=await journal.prepare({identity:i,requestId:id,key:r.uuid(),version:view.version,body:{claimedDeviceAt:null},phase:'PENDING'});guard(i,r);
    }
    // An explicit retry after relogin may reconcile the SAME actor's saved intent.
    // Journal ownership + fresh recipient read above prevent adopting another actor's work.
    // Live continuity still uses the current session on every await and before dispatch.
    let failure:unknown;
    try {await guarded(i,r,()=>r.http.post(`${base(i)}/${id}/ack`,command!.body,{headers:{'If-Match':`"${command!.version}"`,'Idempotency-Key':command!.key}}));}
    catch(error) {failure=error;guard(i,r);}
    const readback=await readReceiving(i,id,r);
    if(!readback.acknowledgmentId)throw failure??Error('receiving_ack_unconfirmed');
    confirmed(readback,i);await journal.confirm(command);guard(i,r);return readback;
  } finally {busy.delete(lock);}
}
