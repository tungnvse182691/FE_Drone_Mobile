import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { openDatabase, initDatabase, saveDraft } from '../offline/database';
import { useAuthStore } from '../store/auth';
import { passwordSessionIdentity } from './authApi';
import { apiClient } from './client';
import { sha256HexOfBytes } from './uploads';
import * as crew from './crewApi';
import type { Coords } from '../components/ViewFinder';
import { type RepairJournalRecord } from './crewRepairDraft';
import { readRepairHistory } from './crewRepairHistory';

export interface FieldContext { actor: string; scope: string; environment: string; projectId: string; taskId: string }
export interface FieldCapture {
  id: string; uri: string; purpose: 'BEFORE' | 'AFTER' | 'MEASUREMENT'; mediaType: string;
  checksum: string; size: number; capturedAt: string | null; coordinates: Coords | null;
  createKey: string; completeKey: string; parts: crew.CrewCompletedPartDto[];
  upload?: crew.CrewUploadSessionDto; complete?: { version: string; parts: crew.CrewCompletedPartDto[] };
  completed?: boolean; verified?: boolean;
  partCommands?: Record<number, { key: string; partNumbers: number[] }>;
  retiredPartCommands?: { key: string; partNumbers: number[]; status: number }[];
  postRepairCapture?: boolean;
  /** Explicit proof that no upload intent has ever been issued for this capture. */
  localOnly?: boolean;
  /** Durable marker written before any create-session request. */
  uploadAttempt?: { key: string; stage: 'CREATE_INTENT' | 'CREATE_UNKNOWN' | 'SESSION_CREATED'; startedAt: string };
  /** Local outcome for the server cancel request; never a Backend upload status. */
  cancelState?: 'REQUESTED' | 'UNKNOWN' | 'CONFIRMED' | 'BLOCKED';
}
export interface FieldDraft extends FieldContext {
  captures: FieldCapture[]; measurements: crew.FieldMeasurementInput[];
  locationProof: crew.FieldPositionProofInput | null;
  command?: { key: string; body: crew.FieldSubmissionInput; ifMatch: string; assignmentId: string;
    phase: 'pending' | 'acknowledged' | 'confirmed' | 'rejected'; responseId?: string; rejectionStatus?: number };
  result?: crew.FieldSubmissionViewFact;
  repairClaim?: { finishId: string; executionStartId: string; firstStartId: string; finishAt: string;
    packageId: string; itemId: string; bindingId: string; assignmentId: string; itemVersion: string };
}
export interface FieldRuntime {
  current: () => FieldContext | null;
  read: () => Promise<FieldDraft | null>; write: (draft: FieldDraft) => Promise<void>;
  uuid: () => string; bytes: (uri: string) => Promise<Uint8Array>; hash: (bytes: Uint8Array) => Promise<string>;
  wait: () => Promise<void>; api: typeof crew;
  repairHistory?: () => Promise<RepairJournalRecord[]>;
  recoveryRead?: () => Promise<FieldDraft|null>;
  historicalRead?: (scope:string) => Promise<FieldDraft|null>;
}
export function newFieldDraft(context: FieldContext): FieldDraft {
  return { ...context, captures: [], measurements: [], locationProof: null };
}
function sameContext(a: FieldContext, b: FieldContext | null): boolean {
  return !!b && ['actor','scope','environment','projectId','taskId'].every(k => a[k as keyof FieldContext] === b[k as keyof FieldContext]);
}
export function assertFieldContext(draft: FieldContext, runtime: FieldRuntime): void {
  if (!sameContext(draft, runtime.current())) throw new Error('field_session_changed');
}
async function guarded<T>(draft: FieldContext, runtime: FieldRuntime, action: () => Promise<T>): Promise<T> {
  assertFieldContext(draft, runtime); const value = await action(); assertFieldContext(draft, runtime); return value;
}
async function persist(draft: FieldDraft, runtime: FieldRuntime): Promise<void> {
  await guarded(draft, runtime, () => runtime.write(draft));
}
const locks = new Set<string>();
const cancelGates = new Set<string>();
const activeUploads = new Map<string, { controller: AbortController; done: Promise<FieldDraft> }>();
function captureKey(context: FieldContext, captureId: string): string {
  return JSON.stringify([context.environment, context.actor, context.scope, context.projectId, context.taskId, captureId]);
}
async function exclusive<T>(context: FieldContext, action: () => Promise<T>): Promise<T> {
  const key = JSON.stringify([context.environment, context.actor, context.projectId, context.taskId]);
  if (locks.has(key)) throw new Error('field_busy');
  locks.add(key); try { return await action(); } finally { locks.delete(key); }
}
export function fieldDraftPending(draft: FieldDraft): boolean {
  return !!draft.command && ['pending','acknowledged'].includes(draft.command.phase);
}
function fieldCancelPending(draft: FieldDraft): boolean {
  return draft.captures.some(c => c.cancelState === 'REQUESTED' || c.cancelState === 'UNKNOWN' ||
    (c.cancelState === 'BLOCKED' && !(c.verified && c.upload?.status === 'VERIFIED')));
}
export function currentFieldContext(projectId: string, taskId: string): FieldContext | null {
  const s = useAuthStore.getState(), scope = passwordSessionIdentity(s.token);
  if (!scope || !s.user || s.user.role_code !== 'REPAIR_CREW' || s.user.must_change_password ||
      !['AUTHENTICATED','REFRESHING'].includes(s.status) || JSON.parse(scope)[0] !== s.user.id ||
      !crew.isCrewResourceId(projectId) || !crew.isCrewResourceId(taskId)) return null;
  return { actor: s.user.id, scope, environment: apiClient.defaults.baseURL ?? '', projectId, taskId };
}
/** Separate session keys preserve every legacy FIELD row and its media/command. */
export async function openFieldRuntime(context: FieldContext): Promise<FieldRuntime> {
  const current=()=>currentFieldContext(context.projectId,context.taskId);
  const check=()=>{if(!sameContext(context,current()))throw Error('field_session_changed');};
  check();const db = openDatabase(); await initDatabase(db);check();
  const key = `t05b:${JSON.stringify([context.environment,context.actor,context.projectId,context.taskId])}`;
  const scoped=(scope:string)=>key+':'+JSON.stringify(scope);
  const stored=async()=>{
    check();const rows=await db.getAllAsync<{id:string;payload:string}>(
      'SELECT id, payload FROM local_draft WHERE kind = ? AND (id = ? OR substr(id, 1, ?) = ?) ORDER BY rowid',
      'T05B_FIELD',key,key.length+1,key+':');check();
    const drafts=rows.map(row=>{
      const draft=decodeFieldDraft(row.payload);
      if(!sameResource(draft,context)||row.id!==key&&row.id!==scoped(draft.scope)&&!row.id.startsWith(scoped(draft.scope)+':'))throw Error('field_draft_invalid');
      return draft;
    });
    const recovered:FieldDraft[]=[];
    for(const original of drafts){
      const overlay=await db.getFirstAsync<{payload:string}>('SELECT payload FROM local_draft WHERE id = ? AND kind = ?',recoveryKey(original),'CREW_FIELD_RECOVERY');check();
      if(overlay){const record=JSON.parse(overlay.payload);if(record.source!==JSON.stringify(original))throw Error('field_draft_invalid');
        const result=decodeFieldDraft(JSON.stringify(record.draft));validateRecovery(original,result);recovered.push(result);
      }else recovered.push(normalizeFieldOutcome(original));
    }
    return recovered;
  };
  return {
    current,
    recoveryRead:async()=>{const drafts=await stored();check();const pending=drafts.filter(d=>fieldDraftPending(d)||fieldCancelPending(d));if(pending.length>1)throw Error('field_multiple_unresolved');return pending[0]??drafts.filter(d=>sameContext(d,context)).at(-1)??drafts.at(-1)??null;},
    read: async () => {
      const drafts=await stored();check();
      // Never hide another session's unresolved write behind a new empty draft.
      if(drafts.some(d=>!sameContext(d,context)&&(fieldDraftPending(d)||fieldCancelPending(d))))throw Error('field_previous_session_requires_reconciliation');
      return drafts.filter(d=>sameContext(d,context)).at(-1)??drafts.at(-1)??null;
    },
    historicalRead:async scope=>{
      const drafts=await stored();check();
      const matches=drafts.filter(d=>d.scope===scope);
      return matches.at(-1)??null;
    },
    write: async draft=>{
      check();if(!sameContext(draft,context))throw Error('field_session_changed');
      const rows=await db.getAllAsync<{id:string;payload:string}>(
        'SELECT id, payload FROM local_draft WHERE kind = ? AND (id = ? OR substr(id, 1, ?) = ?) ORDER BY rowid',
        'T05B_FIELD',key,key.length+1,key+':');check();
      const row=rows.filter(r=>sameContext(decodeFieldDraft(r.payload),context)).at(-1);
      const source=row?decodeFieldDraft(row.payload):null;
      if(source?.command&&draft.command?.key===source.command.key){
        validateRecovery(source,draft);
        const previous=(await stored()).find(d=>d.scope===source.scope&&d.command?.key===source.command!.key);check();
        if(!previous)throw Error('field_draft_invalid');validateFieldTransition(previous,draft);
        await saveDraft(db,recoveryKey(source),'CREW_FIELD_RECOVERY',{source:JSON.stringify(source),draft});check();return;
      }
      let target=row?.id??scoped(context.scope);
      if(source?.command){
        const effective=(await stored()).find(d=>d.scope===source.scope&&d.command?.key===source.command!.key);check();
        if(draft.command||!effective?.command||!['confirmed','rejected'].includes(effective.command.phase))throw Error('field_command_pending');
        // Append a generation; the original intent and recovery overlay remain byte-for-byte intact.
        target=scoped(context.scope)+':'+randomUUID();
      }
      await saveDraft(db,target,'T05B_FIELD',{...draft});check();}, uuid: randomUUID,
    bytes: async uri => new Uint8Array(await new File(uri).arrayBuffer()), hash: sha256HexOfBytes,
    wait: () => new Promise(resolve => setTimeout(resolve,1000)), api: crew,
  };
}
/** Old sid is provenance, never current mutation authority. */
function sameResource(a:FieldContext,b:FieldContext):boolean {
  if(!['actor','environment','projectId','taskId'].every(k=>a[k as keyof FieldContext]===b[k as keyof FieldContext]))return false;
  if(a.scope===b.scope)return true;
  try{const claims=JSON.parse(a.scope);return Array.isArray(claims)&&claims.length===2&&claims[0]===b.actor&&typeof claims[1]==='string'&&!!claims[1];}catch{return false;}
}
export async function readHistoricalFieldDraft(context:FieldContext,scope:string):Promise<FieldDraft> {
  const runtime=await openFieldRuntime(context);
  const draft=await guarded(context,runtime,()=>runtime.historicalRead!(scope));
  if(!draft||draft.scope!==scope||!sameResource(draft,context))throw Error('field_draft_invalid');
  return draft;
}
function recoveryKey(d:FieldDraft):string {return 'crew-field-recovery:'+JSON.stringify([d.environment,d.actor,d.projectId,d.taskId,d.scope,d.command?.key]);}
function normalizeFieldOutcome(d:FieldDraft):FieldDraft {
  const copy=JSON.parse(JSON.stringify(d)) as FieldDraft;
  if(copy.command?.phase==='rejected'&&[401,409,412].includes(copy.command.rejectionStatus??0)){
    copy.command.phase='pending';delete copy.command.rejectionStatus;
  }return copy;
}
function validateRecovery(source:FieldDraft,result:FieldDraft):void {
  if(!source.command||!result.command)throw Error('field_draft_invalid');
  const immutable=(d:FieldDraft)=>{const {phase,responseId,rejectionStatus,...command}=d.command!;const {result,...rest}=d;return JSON.stringify({...rest,command});};
  if(immutable(source)!==immutable(result)||!['pending','acknowledged','confirmed','rejected'].includes(result.command.phase)||
     (['acknowledged','confirmed'].includes(result.command.phase)&&!crew.isCrewResourceId(result.command.responseId))||
     (result.command.phase==='rejected'&&![400,403,404,422,428].includes(result.command.rejectionStatus??0)))throw Error('field_draft_invalid');
  const before=normalizeFieldOutcome(source).command!;
  const reachable={pending:['pending','acknowledged','confirmed','rejected'],acknowledged:['acknowledged','confirmed'],confirmed:['confirmed'],rejected:['rejected']};
  if(!reachable[before.phase].includes(result.command.phase)||before.responseId&&before.responseId!==result.command.responseId)throw Error('field_draft_invalid');
}
function validateFieldTransition(previous:FieldDraft,next:FieldDraft):void {
  const before=normalizeFieldOutcome(previous).command!,after=next.command!;
  const allowed={pending:['pending','acknowledged','rejected'],acknowledged:['acknowledged','confirmed'],confirmed:['confirmed'],rejected:['rejected']};
  if(!allowed[before.phase].includes(after.phase)||before.responseId&&before.responseId!==after.responseId)throw Error('field_draft_invalid');
}
/** Read/reconcile historical intent with current rights; never adopts old-session media into a new draft.
 * Recovery updates are separate from the immutable original row, including its sid and rejection.
 */
export async function readFieldRecovery(context:FieldContext):Promise<{draft:FieldDraft;runtime:FieldRuntime}> {
  const base=await openFieldRuntime(context);
  const selected=await guarded(context,base,()=>base.recoveryRead!());
  if(!selected||!selected.command||!sameResource(selected,context))throw Error('field_previous_session_requires_reconciliation');
  const originalContext:FieldContext={actor:selected.actor,scope:selected.scope,environment:selected.environment,projectId:selected.projectId,taskId:selected.taskId};
  const check=()=>assertFieldContext(context,base);
  const db=openDatabase();await initDatabase(db);check();
  const key='t05b:'+JSON.stringify([context.environment,context.actor,context.projectId,context.taskId]);
  const sources=await db.getAllAsync<{payload:string}>('SELECT payload FROM local_draft WHERE kind = ? AND (id = ? OR substr(id, 1, ?) = ?)','T05B_FIELD',key,key.length+1,key+':');check();
  const source=sources.map(row=>decodeFieldDraft(row.payload)).find(d=>d.scope===selected.scope&&d.command?.key===selected.command?.key);
  if(!source)throw Error('field_draft_invalid');validateRecovery(source,normalizeFieldOutcome(selected));
  const fresh=await guarded(context,base,()=>crew.getFieldInspectionTaskDetailReal(context.projectId,context.taskId));
  crew.validateCrewTaskDetail(fresh.data,fresh.etag,context.projectId,context.taskId,context.actor);
  if(fresh.data.assignmentId!==selected.command.assignmentId||fresh.data.firstStartOriginId!==selected.command.body.startOriginId)throw Error('field_assignment_changed');
  let previous=JSON.parse(JSON.stringify(normalizeFieldOutcome(selected))) as FieldDraft;
  const runtime:FieldRuntime={...base,current:()=>{check();return originalContext;},repairHistory:()=>readRepairHistory(context),
    read:async()=>{check();return selected;},write:async result=>{
      check();validateRecovery(source,result);validateFieldTransition(previous,result);
      await guarded(context,base,()=>saveDraft(db,recoveryKey(source),'CREW_FIELD_RECOVERY',{source:JSON.stringify(source),draft:result}));
      previous=JSON.parse(JSON.stringify(result));
    }};
  return {draft:normalizeFieldOutcome(selected),runtime};
}
/** GET-only recovery. A pending intent without a server ID cannot be proved by latest status alone. */
export async function reconcileFieldDraft(context:FieldContext,replay=false,expectedKey?:string):Promise<FieldDraft>{
  const recovery=await readFieldRecovery(context);
  if(expectedKey&&recovery.draft.command?.key!==expectedKey)throw Error('field_command_changed');
  if(recovery.draft.command?.phase==='pending'&&!replay)throw Error('field_unknown_outcome_use_reconcile');
  return submitFieldDraft(recovery.draft,recovery.runtime,replay);
}
export function decodeFieldDraft(payload:string): FieldDraft {
  try {
    const value=JSON.parse(payload);
    if (!value || typeof value!=='object' || !Array.isArray(value.captures) || !Array.isArray(value.measurements)) throw Error();
    return value;
  } catch { throw new Error('field_draft_invalid'); }
}
export async function loadFieldDraft(context: FieldContext, runtime: FieldRuntime): Promise<FieldDraft> {
  const saved = await guarded(context,runtime,() => runtime.read());
  if (!saved) return newFieldDraft(context);
  if (!sameContext(saved,context)) throw new Error('field_previous_session_requires_reconciliation');
  if (!Array.isArray(saved.captures) || !Array.isArray(saved.measurements)) throw new Error('field_draft_invalid');
  return saved;
}
/** Start an empty draft for the current login after an explicit user decision.
 * Historical rows are retained. An unresolved command, corrupt store, or stale
 * server assignment prevents this transition. */
export async function startNewFieldSessionDraft(context: FieldContext): Promise<FieldDraft> {
  const runtime = await openFieldRuntime(context);
  const previous = await guarded(context, runtime, () => runtime.read());
  if (previous && sameContext(previous, context)) throw Error('field_current_draft_exists');
  if (previous && (fieldDraftPending(previous) || fieldCancelPending(previous))) throw Error('field_command_pending');
  const detail = await guarded(context, runtime, () => crew.getFieldInspectionTaskDetailReal(context.projectId, context.taskId));
  crew.validateCrewTaskDetail(detail.data, detail.etag, context.projectId, context.taskId, context.actor);
  const reason = crew.fieldCapabilityBlock(detail.data, detail.etag, context.actor, 'capture');
  if (reason) throw Error(reason);
  const next = newFieldDraft(context);
  await guarded(context, runtime, () => runtime.write(next));
  return next;
}
/** Native bytes closed by arrayBuffer; hash durable temp, rename, then commit its URI in SQLite. */
export async function captureFieldPhoto(context: FieldContext, uri: string, purpose: FieldCapture['purpose'],
  mediaType: string, coordinates: Coords | null, camera: boolean, postRepairCapture=false): Promise<FieldDraft> {
  return exclusive(context, async () => {
    let captureStage='read_draft';
    try {
    const runtime = await openFieldRuntime(context), draft = await loadFieldDraft(context,runtime);
    if (draft.command) throw new Error('field_command_pending');
    const detail = await guarded(context,runtime,() => crew.getFieldInspectionTaskDetailReal(context.projectId,context.taskId));
    const reason = crew.fieldCapabilityBlock(detail.data,detail.etag,context.actor,'capture');
    if (reason) throw new Error(reason);
    if (purpose === 'AFTER' && detail.data.purpose !== 'PostRepair') throw new Error('Ảnh sau sửa chỉ hợp lệ với nhiệm vụ sau sửa chữa.');
    if (purpose==='AFTER'&&detail.data.mode==='NORMAL') {
      await verifyRepairClaim(draft,detail.data,runtime);
      if(!camera||!postRepairCapture)throw Error('repair_after_camera_required');
    }
    captureStage='read_photo';
    const bytes = await guarded(context,runtime,() => runtime.bytes(uri));
    const isJpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const isPng = bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v);
    const actualType = isJpeg ? 'image/jpeg' : isPng ? 'image/png' : null;
    if (!actualType || !bytes.length || bytes.length > 20 * 1024 * 1024 || (mediaType && mediaType !== actualType)) throw new Error('Chỉ nhận JPEG/PNG tối đa 20 MiB, đúng định dạng thực.');
    captureStage='write_photo';
    const id = runtime.uuid(), directory = new Directory(Paths.document,'crew-field');
    directory.create({ idempotent: true, intermediates: true });
    const temp = new File(directory,`${id}.tmp`);
    await guarded(context,runtime,() => temp.write(bytes));
    captureStage='hash_photo';
    const checksum = await guarded(context,runtime,() => runtime.hash(new Uint8Array(temp.bytesSync())));
    const file = new File(directory,`${id}.${isJpeg ? 'jpg' : 'png'}`);
    captureStage='move_photo';
    await guarded(context,runtime,async () => { await temp.move(file); });
    draft.captures.push({ id,uri:file.uri,purpose,mediaType:actualType,checksum,size:bytes.length,
      capturedAt:camera ? new Date().toISOString() : null, coordinates:camera ? coordinates : null,
      createKey:runtime.uuid(),completeKey:runtime.uuid(),parts:[],localOnly:true,
      postRepairCapture:purpose==='AFTER'&&camera&&postRepairCapture });
    captureStage='save_draft';
    await persist(draft,runtime); return draft;
    } catch(error) {
      if(typeof error==='object'&&error!==null&&Object.isExtensible(error))Object.assign(error,{fieldCaptureStage:captureStage});
      throw error;
    }
  });
}
async function claimSource(context: FieldContext,task: crew.FieldTaskViewFact,runtime: FieldRuntime) {
  const history=await guarded(context,runtime,async()=>runtime.repairHistory ? runtime.repairHistory() : readRepairHistory(context));
  const finish=history.at(-1),start=history.find(row=>row.operation==='start');
  const ctx=task.repairContext;
  if(!ctx||task.mode!=='NORMAL'||ctx.mode!=='NORMAL'||ctx.status!=='InProgress'||task.purpose!=='PostRepair'||
    !start?.receipt||!finish?.receipt||start.phase!=='CONFIRMED'||finish.phase!=='CONFIRMED'||finish.operation!=='finish'||
    history.some(row=>row.phase!=='CONFIRMED')||
    !sameResource(finish.identity,context)||!sameResource(start.identity,context)||
    [start,finish].some(row=>row.identity.packageId!==ctx.packageId||row.identity.itemId!==ctx.itemId||
      row.identity.bindingId!==ctx.bindingId||row.identity.assignmentId!==task.assignmentId)||
    finish.receipt.itemVersion!==ctx.itemVersion||
    !crew.isCrewResourceId(finish.receipt.data.id)||!crew.isCrewResourceId(start.receipt.data.id)||
    finish.payload.executionStartId!==start.receipt.data.id||finish.receipt.data.executionStartId!==start.receipt.data.id||
    finish.receipt.data.itemId!==ctx.itemId||finish.receipt.data.taskId!==task.id||
    start.payload.fieldFirstStartId!==task.firstStartOriginId||start.receipt.data.firstStartId!==task.firstStartOriginId||
    finish.receipt.data.timeProvenance!=='SERVER_ONLINE'||typeof finish.receipt.data.verifiedOriginalAt!=='string'||
    !Number.isFinite(Date.parse(finish.receipt.data.verifiedOriginalAt)))throw Error('repair_finish_required');
  return {finishId:finish.receipt.data.id,executionStartId:start.receipt.data.id,firstStartId:task.firstStartOriginId!,
    finishAt:finish.receipt.data.verifiedOriginalAt,packageId:ctx.packageId,itemId:ctx.itemId,bindingId:ctx.bindingId,
    assignmentId:task.assignmentId!,itemVersion:ctx.itemVersion};
}
async function verifyRepairClaim(draft: FieldDraft,task: crew.FieldTaskViewFact,runtime: FieldRuntime) {
  const source=await claimSource(draft,task,runtime);
  if(!draft.repairClaim||Object.entries(source).some(([key,value])=>draft.repairClaim![key as keyof typeof source]!==value))throw Error('repair_claim_source_changed');
  return source;
}
/** Explicitly select NORMAL claim while keeping all pre-execution evidence and measurements. */
export async function prepareFieldRepairClaim(context: FieldContext,runtime?: FieldRuntime): Promise<FieldDraft> {
  const r=runtime??await openFieldRuntime(context);
  return exclusive(context,async()=>{
    const saved=await guarded(context,r,()=>r.read());
    if(saved&&!sameResource(saved,context))throw Error('field_previous_session_requires_reconciliation');
    if(saved&&!sameContext(saved,context)&&saved.command)throw Error('field_previous_session_requires_reconciliation');
    // Explicit claim can create an empty current-session draft, never adopt old photos/measurements.
    const draft=saved&&sameContext(saved,context)?saved:newFieldDraft(context);
    if(draft.command)throw Error('field_command_pending');
    const fresh=await freshTask(draft,r,'capture');
    if(fresh.data.latestSubmissionId)throw Error('repair_claim_root_required');
    draft.repairClaim=await claimSource(context,fresh.data,r);
    await persist(draft,r);return draft;
  });
}
async function freshTask(draft: FieldDraft,runtime: FieldRuntime,capability: 'capture'|'review'|'submit') {
  const response = await guarded(draft,runtime,() => runtime.api.getFieldInspectionTaskDetailReal(draft.projectId,draft.taskId));
  const reason = runtime.api.fieldCapabilityBlock(response.data,response.etag,draft.actor,capability);
  if (reason) throw new Error(reason);
  const origin = await guarded(draft,runtime,() => runtime.api.getFieldTaskStartOriginReal(draft.projectId,draft.taskId));
  if (origin.id !== response.data.firstStartOriginId || origin.taskId !== draft.taskId || !runtime.api.isCrewResourceId(origin.id)) throw new Error('field_start_origin_invalid');
  return response;
}
async function uploadCapture(draft: FieldDraft,index: number,runtime: FieldRuntime,controller: AbortController,onSession?: (draft: FieldDraft) => void): Promise<FieldDraft> {
  assertFieldContext(draft,runtime);
  const c = draft.captures[index]; if (!c) throw new Error('field_capture_missing');
  const key = captureKey(draft,c.id);
  const checkCancel = () => { if (cancelGates.has(key) || controller.signal.aborted || c.cancelState) throw Error('field_upload_cancel_pending'); };
  checkCancel();
  const response = await freshTask(draft,runtime,'capture');
  checkCancel();
  if (c.purpose === 'AFTER' && response.data.purpose !== 'PostRepair') throw new Error('field_after_not_allowed');
  if(draft.repairClaim)await verifyRepairClaim(draft,response.data,runtime);
  if(c.purpose==='AFTER'&&response.data.mode==='NORMAL'&&!draft.repairClaim)throw Error('repair_finish_required');
  const bytes = await guarded(draft,runtime,() => runtime.bytes(c.uri));
  if (bytes.length !== c.size || await guarded(draft,runtime,() => runtime.hash(bytes)) !== c.checksum) throw new Error('field_checksum_mismatch');
  checkCancel();
  if (!c.upload) {
    // The request may commit remotely even when the client sees a timeout. Persist
    // an immutable marker before sending so local deletion fails closed afterwards.
    c.localOnly = false;
    c.uploadAttempt = { key: c.createKey, stage: 'CREATE_INTENT', startedAt: new Date().toISOString() };
    await persist(draft,runtime);
    try {
      c.upload = await guarded(draft,runtime,() => runtime.api.createCrewUploadSession(draft.projectId,draft.taskId,
        `${c.id}.${c.mediaType === 'image/png' ? 'png' : 'jpg'}`,c.mediaType,c.size,c.checksum,c.purpose,c.createKey));
    } catch (error) {
      c.uploadAttempt.stage = 'CREATE_UNKNOWN';
      await persist(draft,runtime);
      throw error;
    }
    if (!runtime.api.isCrewResourceId(c.upload.id) || !runtime.api.isCrewResourceId(c.upload.fileId)) throw new Error('field_upload_identity_invalid');
    c.uploadAttempt.stage = 'SESSION_CREATED';
    await persist(draft,runtime);
  }
  onSession?.(JSON.parse(JSON.stringify(draft)) as FieldDraft);
  checkCancel();
  let session = await guarded(draft,runtime,() => runtime.api.getCrewUploadSession(c.upload!.id));
  checkCancel();
  if (session.id !== c.upload.id || session.fileId !== c.upload.fileId) throw new Error('field_upload_identity_invalid');
  if (!['VERIFYING','VERIFIED'].includes(session.status)) {
    if (session.status === 'FAILED') { c.upload=session; c.verified=false; await persist(draft,runtime); throw new Error('field_upload_failed'); }
    if (!Number.isSafeInteger(session.partSizeBytes) || session.partSizeBytes <= 0) throw new Error('field_part_size_invalid');
    const count = Math.ceil(bytes.length/session.partSizeBytes);
    for (let part=1;part<=count;part++) if (!c.parts.some(p=>p.partNumber===part)) {
      checkCancel();
      // Persist issuance intent before POST; never persist the signed capability URL.
      c.partCommands ??= {};
      c.partCommands[part] ??= { key: runtime.uuid(), partNumbers: [part] };
      await persist(draft,runtime);
      const issuance = c.partCommands[part];
      let urls: Awaited<ReturnType<typeof crew.requestCrewUploadPartUrls>>;
      try {
        urls = await guarded(draft,runtime,() => runtime.api.requestCrewUploadPartUrls(session.id,issuance.partNumbers,issuance.key));
      } catch(error) {
        // URL issuance is a renewable capability, not a submission or completion.
        // Only a definitive 409 retires this intent; ambiguous transport errors retain it.
        if ((error as {response?:{status?:number}})?.response?.status===409) {
          const latest=await guarded(draft,runtime,()=>runtime.api.getCrewUploadSession(session.id));
          if(latest.id===session.id && latest.fileId===c.upload.fileId && latest.status==='UPLOADING') {
            c.retiredPartCommands??=[];c.retiredPartCommands.push({...issuance,status:409});
            c.partCommands[part]={key:runtime.uuid(),partNumbers:[part]};await persist(draft,runtime);
          }
        }
        throw error;
      }
      const url = urls.parts.find(p=>p.partNumber===part)?.url;
      if (!url) throw new Error('field_part_url_missing');
      checkCancel();
      let result: Awaited<ReturnType<typeof runtime.api.putCrewUploadPartBytes>>;
      try {
        result = await guarded(draft,runtime,() => runtime.api.putCrewUploadPartBytes(url,bytes.slice((part-1)*session.partSizeBytes,part*session.partSizeBytes),c.mediaType,controller.signal));
      } catch (error) {
        // Keep the original transport error and annotate only the failed stage.
        // The signed URL, checksum, journal key and replay identity remain unchanged.
        if (typeof error === 'object' && error !== null && Object.isExtensible(error)) {
          Object.assign(error, { uploadStage: 'upload_put' as const });
        }
        throw error;
      }
      checkCancel();
      if (!result.etag) throw new Error('field_part_etag_missing');
      c.parts.push({partNumber:part,etag:result.etag}); await persist(draft,runtime);
      onSession?.(JSON.parse(JSON.stringify(draft)) as FieldDraft);
    }
    if (!c.complete) {
      session = await guarded(draft,runtime,() => runtime.api.getCrewUploadSession(session.id));
      c.complete = {version:session.version,parts:c.parts.map(p=>({...p}))}; await persist(draft,runtime);
    }
    // On timeout, replay retains this original version/body/key, never a newly assembled command.
    checkCancel();
    await guarded(draft,runtime,() => runtime.api.completeCrewUpload(session.id,c.complete!.parts,c.checksum,c.complete!.version,c.completeKey));
    checkCancel();
    c.completed = true; await persist(draft,runtime);
    onSession?.(JSON.parse(JSON.stringify(draft)) as FieldDraft);
  }
  // The BE verification worker processes one upload per 30-second round.
  // Allow three rounds at the runtime's one-second cadence before leaving the
  // durable session pending. Completed bytes and command keys stay unchanged.
  const verificationPolls = 91;
  for (let poll=0;poll<verificationPolls;poll++) {
    checkCancel();
    session = await guarded(draft,runtime,() => runtime.api.getCrewUploadSession(c.upload!.id));
    checkCancel();
    if (session.id !== c.upload.id || session.fileId !== c.upload.fileId) throw new Error('field_upload_identity_invalid');
    c.upload=session; await persist(draft,runtime);
    onSession?.(JSON.parse(JSON.stringify(draft)) as FieldDraft);
    if (session.status === 'VERIFIED') break;
    if (session.status === 'FAILED') { c.upload=session; c.verified=false; await persist(draft,runtime); throw new Error('field_upload_failed'); }
    if (poll < verificationPolls-1) await guarded(draft,runtime,() => runtime.wait());
  }
  if (session.status !== 'VERIFIED') throw new Error('field_verification_pending');
  const file = await guarded(draft,runtime,() => runtime.api.getCrewFileMetadata(session.fileId));
  if (file.id !== session.fileId || file.status !== 'VERIFIED' || file.checksumSha256 !== c.checksum || file.mediaType !== c.mediaType || file.sizeBytes !== c.size) throw new Error('field_file_not_verified');
  c.upload = session; c.verified = true; await persist(draft,runtime);
  onSession?.(JSON.parse(JSON.stringify(draft)) as FieldDraft); return draft;
}
export async function uploadFieldCapture(draft: FieldDraft,index: number,runtime: FieldRuntime,onSession?: (draft: FieldDraft) => void): Promise<FieldDraft> {
  const capture = draft.captures[index]; if (!capture) throw Error('field_capture_missing');
  const key = captureKey(draft,capture.id),controller = new AbortController();
  if (cancelGates.has(key) || capture.cancelState) throw Error('field_upload_cancel_pending');
  if (activeUploads.has(key)) throw Error('field_busy');
  const done = exclusive(draft,()=>uploadCapture(draft,index,runtime,controller,onSession));
  activeUploads.set(key,{controller,done});
  try { return await done; }
  finally { if (activeUploads.get(key)?.done === done) activeUploads.delete(key); }
}

/** Explicit cancel only. Preserve capture origin, local bytes and every upload command. */
export async function cancelFieldUpload(draft: FieldDraft,index: number,runtime: FieldRuntime): Promise<FieldDraft> {
  assertFieldContext(draft,runtime);
  const original = draft.captures[index];
  if (!original?.upload?.id || !runtime.api.isCrewResourceId(original.upload.id)) throw Error('field_upload_session_missing');
  const key = captureKey(draft,original.id);
  cancelGates.add(key);
  const active = activeUploads.get(key);
  active?.controller.abort();
  if (active) await active.done.catch(() => undefined);
  try { return await exclusive(draft,async()=>{
    const current = await loadFieldDraft(draft,runtime);
    const capture = current.captures.find(c=>c.id===original.id);
    if (!capture?.upload?.id || capture.upload.id!==original.upload!.id || current.command) throw Error('field_upload_identity_invalid');
    if (capture.cancelState==='CONFIRMED') return current;
    if (!capture.cancelState && !['PENDING','UPLOADING'].includes(capture.upload.status)) throw Error('field_upload_not_cancellable');
    const save=async()=>{await persist(current,runtime);};
    const readback=async()=>{
      const observed=await guarded(current,runtime,()=>runtime.api.getCrewUploadSession(capture.upload!.id));
      if(observed.id!==capture.upload!.id||observed.fileId!==capture.upload!.fileId)throw Error('field_upload_identity_invalid');
      capture.upload=observed;
      if(observed.status==='FAILED'&&observed.failureCode==='upload_cancelled'){
        capture.cancelState='CONFIRMED';capture.verified=false;
      }else{
        capture.cancelState='BLOCKED';
        if(observed.status==='VERIFIED'){
          const metadata=await guarded(current,runtime,()=>runtime.api.getCrewFileMetadata(observed.fileId));
          capture.verified=metadata.id===observed.fileId&&metadata.status==='VERIFIED'&&
            metadata.checksumSha256===capture.checksum&&metadata.sizeBytes===capture.size&&metadata.mediaType===capture.mediaType;
        }else capture.verified=false;
      }
      await save();return current;
    };
    if(capture.cancelState==='BLOCKED') return readback();
    capture.cancelState='REQUESTED';
    await save(); // Durable before the POST; a failed write must never send cancel.
    try{
      const result=await guarded(current,runtime,()=>runtime.api.cancelCrewUpload(capture.upload!.id));
      if(result.id!==capture.upload.id||result.status!=='FAILED'||result.failureCode!=='upload_cancelled')throw Error('field_cancel_receipt_invalid');
      capture.upload=result;capture.cancelState='CONFIRMED';capture.verified=false;
      await save();return current;
    }catch(error){
      const status=(error as {response?:{status?:number};status?:number}).response?.status??(error as {status?:number}).status;
      if(status===409){
        try{return await readback();}catch{capture.cancelState='BLOCKED';await save();return current;}
      }
      capture.cancelState=[401,403,404].includes(status??0)?'BLOCKED':'UNKNOWN';
      await save();return current;
    }
  }); } catch (error) {
    // If no intent was persisted, the server was not called and this process gate
    // may be released. Durable or uncertain intents remain closed across retries.
    const saved = await runtime.read().catch(() => null);
    const capture = saved?.captures.find(c => c.id === original.id);
    if (!capture?.cancelState) cancelGates.delete(key);
    throw error;
  }
}
export async function saveFieldMeasurements(context: FieldContext,measurements: crew.FieldMeasurementInput[],
  locationProof: crew.FieldPositionProofInput | null): Promise<FieldDraft> {
  return exclusive(context,async()=>{
    const runtime = await openFieldRuntime(context), draft = await loadFieldDraft(context,runtime);
    if (draft.command) throw new Error('field_command_pending');
    draft.measurements=JSON.parse(JSON.stringify(measurements));draft.locationProof=locationProof;
    await persist(draft,runtime);return draft;
  });
}

/** Remove only an unsubmitted local capture. Upload sessions and pending commands are immutable. */
export async function removeLocalFieldCapture(context: FieldContext, captureId: string): Promise<FieldDraft> {
  return exclusive(context, async () => {
    const runtime = await openFieldRuntime(context);
    const draft = await loadFieldDraft(context, runtime);
    if (draft.command) throw new Error('field_command_pending');
    const capture = draft.captures.find(item => item.id === captureId);
    if (!capture) return draft;
    if (capture.localOnly !== true || capture.uploadAttempt || capture.upload || capture.completed || capture.verified || capture.partCommands || capture.parts.length) throw new Error('field_capture_locked');
    draft.captures = draft.captures.filter(item => item.id !== captureId);
    await persist(draft, runtime);
    return draft;
  });
}
export async function acknowledgeFieldResult(context: FieldContext): Promise<FieldDraft> {
  return exclusive(context,async()=>{
    const runtime=await openFieldRuntime(context);
    let draft:FieldDraft;try{draft=await loadFieldDraft(context,runtime);}catch{draft=(await readFieldRecovery(context)).draft;}
    if (!draft.command || !['confirmed','rejected'].includes(draft.command.phase)) throw new Error('field_unknown_outcome');
    if(draft.repairClaim)throw Error('repair_claim_retained_for_intake');
    const fresh=await guarded(context,runtime,()=>runtime.api.getFieldInspectionTaskDetailReal(context.projectId,context.taskId));
    runtime.api.validateCrewTaskDetail(fresh.data,fresh.etag,context.projectId,context.taskId,context.actor);
    if(fresh.data.assignmentId!==draft.command.assignmentId||fresh.data.firstStartOriginId!==draft.command.body.startOriginId)throw Error('field_assignment_changed');
    // Archive the exact terminal command before explicitly preparing another revision.
    const db=openDatabase();await initDatabase(db);
    await guarded(context,runtime,()=>saveDraft(db,`t05b-receipt:${draft.command!.key}`,'T05B_FIELD_RECEIPT',{...draft}));
    // A definitive rejection can be corrected without orphaning its images or measurements.
    // A confirmed revision starts empty; retained server evidence is loaded by API-096.
    const next=draft.command.phase==='rejected'&&sameContext(draft,context)?{...draft,command:undefined,result:undefined}:newFieldDraft(context);
    await persist(next,runtime);return next;
  });
}
export function measurementTemplate(type: number, sampleId: string): crew.FieldMeasurementInput | null {
  const names = ['','DepressionDepth','SlabFaultingHeight','ShoulderErosionExtent','Area','DepressionLength','DepressionWidth'];
  if (!names[type]) return null;
  return {sampleId,type:names[type],value:null,state:'UNKNOWN',unknownReason:'Chưa đo tại hiện trường',
    dimension:type===4?'AREA':'LENGTH',unit:type===4?'m²':type>=5?'m':'cm',instrument:'',method:'',locationReason:'Chưa có tọa độ quan sát'};
}
function validateFieldMeasurements(draft: FieldDraft): void {
  if (!draft.measurements.length || draft.measurements.some(m=>!m.instrument.trim() || !m.method.trim() ||
    (m.value === null ? m.state!=='UNKNOWN' || !m.unknownReason?.trim() : m.state!=='KNOWN' || !Number.isFinite(m.value) || m.value < 0) ||
    ((m.latitude == null || m.longitude == null) ? !m.locationReason?.trim() :
      !Number.isFinite(m.latitude) || !Number.isFinite(m.longitude) || Math.abs(m.latitude)>90 || Math.abs(m.longitude)>180))) throw new Error('field_measurements_required');
}
/** A new user intent only. Never replays an existing submission or skips VERIFIED readback. */
export async function uploadAndSubmitFieldDraft(draft: FieldDraft,runtime: FieldRuntime,onProgress?: (draft: FieldDraft,captureId: string) => void): Promise<FieldDraft> {
  assertFieldContext(draft,runtime);
  if(draft.command)throw Error('field_command_pending');
  validateFieldMeasurements(draft);
  // Sequential uploads preserve the durable per-draft journal and cancellation lock.
  for(let index=0;index<draft.captures.length;index++) {
    assertFieldContext(draft,runtime);
    const capture=draft.captures[index];
    if(capture.verified)continue;
    onProgress?.(JSON.parse(JSON.stringify(draft)) as FieldDraft,capture.id);
    draft=await uploadFieldCapture(draft,index,runtime,updated=>onProgress?.(updated,capture.id));
  }
  assertFieldContext(draft,runtime);
  return submitFieldDraft(draft,runtime);
}
export async function submitFieldDraft(draft: FieldDraft,runtime: FieldRuntime,replay=false): Promise<FieldDraft> {
  return exclusive(draft,async()=>{
    assertFieldContext(draft,runtime);
    let cmd = draft.command;
    if (cmd?.phase === 'confirmed') return draft;
    if (cmd?.phase === 'rejected') throw new Error('field_command_rejected');
    if (!cmd) {
      const fresh = await freshTask(draft,runtime,'submit');
      if(draft.repairClaim) {
        const source=await verifyRepairClaim(draft,fresh.data,runtime);
        if(fresh.data.latestSubmissionId)throw Error('repair_claim_root_required');
        const after=draft.captures.filter(c=>c.purpose==='AFTER');
        if(!after.length||after.some(c=>!c.postRepairCapture||!c.capturedAt||!Number.isFinite(Date.parse(c.capturedAt))||
          Date.parse(c.capturedAt)<Date.parse(source.finishAt)||Date.parse(c.capturedAt)>Date.now()))throw Error('repair_after_camera_required');
      }
      validateFieldMeasurements(draft);
      if (draft.captures.some(c=>!c.verified || !c.upload?.fileId)) throw new Error('field_verified_evidence_required');
      for (const capture of draft.captures) {
        if(draft.repairClaim) {
          if(!capture.upload?.id)throw Error('field_verified_evidence_required');
          const session=await guarded(draft,runtime,()=>runtime.api.getCrewUploadSession(capture.upload!.id));
          if(session.id!==capture.upload.id||session.fileId!==capture.upload.fileId||session.status!=='VERIFIED')throw Error('field_file_not_verified');
        }
        const file = await guarded(draft,runtime,()=>runtime.api.getCrewFileMetadata(capture.upload!.fileId));
        if (file.status !== 'VERIFIED' || file.id !== capture.upload!.fileId || file.checksumSha256 !== capture.checksum || file.mediaType !== capture.mediaType || file.sizeBytes !== capture.size) throw new Error('field_file_not_verified');
      }
      let retained: crew.FieldEvidenceDeclaration[] = [];
      if (fresh.data.latestSubmissionId) {
        const previous=await guarded(draft,runtime,()=>runtime.api.getFieldSubmissionDetailReal(draft.projectId,draft.taskId,fresh.data.latestSubmissionId!));
        if (previous.data.id !== fresh.data.latestSubmissionId || previous.data.taskId !== draft.taskId) throw new Error('field_lineage_invalid');
        // A revision carries actual files. Unlinked declarations remain in the
        // immutable parent; carrying them forward would prevent replacing missing evidence.
        retained=(previous.data.evidence??[]).filter(e=>e.fileId!=null);
        for (const e of retained) {
          if (!e.fileId) throw new Error('field_verified_evidence_required');
          const file=await guarded(draft,runtime,()=>runtime.api.getFieldEvidenceReal(draft.projectId,draft.taskId,e.fileId!));
          if (file.state!=='VERIFIED' || file.fileId!==e.fileId || file.checksum!==e.checksumSha256 || file.mediaType!==e.mediaType) throw new Error('field_file_not_verified');
        }
      }
      if (!retained.length && !draft.captures.length) throw new Error('field_verified_evidence_required');
      const body: crew.FieldSubmissionInput = {
        originId:runtime.uuid(),startOriginId:fresh.data.firstStartOriginId!,parentSubmissionId:fresh.data.latestSubmissionId??null,
        measurements:JSON.parse(JSON.stringify(draft.measurements)),locationProof:draft.locationProof,
        evidence:[...retained,...draft.captures.map(c=>({captureOriginId:c.id,fileId:c.upload!.fileId,purpose:c.purpose,checksumSha256:c.checksum,
          mediaType:c.mediaType,capturedAt:c.capturedAt,attemptChecklist:draft.repairClaim&&c.purpose==='AFTER'&&c.postRepairCapture?'POST_REPAIR_CAPTURE':null}))],
        captureType:draft.repairClaim?'REPAIR_CLAIM':'MEASUREMENT',repaired:draft.repairClaim?true:null,unrepairedReason:null,
      };
      cmd = {key:runtime.uuid(),body:JSON.parse(JSON.stringify(body)),ifMatch:fresh.etag,assignmentId:fresh.data.assignmentId!,phase:'pending'};
      draft.command = cmd; await persist(draft,runtime);
    } else if (cmd.phase === 'pending' && !replay) throw new Error('field_unknown_outcome_use_reconcile');
    if (cmd.phase === 'pending') {
      // Revalidate current assignment, but never replace the saved payload/If-Match on replay.
      const fresh = await guarded(draft,runtime,()=>runtime.api.getFieldInspectionTaskDetailReal(draft.projectId,draft.taskId));
      runtime.api.validateCrewTaskDetail(fresh.data,fresh.etag,draft.projectId,draft.taskId,draft.actor);
      if (fresh.data.assignmentId !== cmd.assignmentId) throw new Error('field_assignment_changed');
      if(cmd.body.captureType==='REPAIR_CLAIM')await verifyRepairClaim(draft,fresh.data,runtime);
      try {
        const result = await guarded(draft,runtime,()=>runtime.api.submitFieldTaskReal(draft.projectId,draft.taskId,cmd!.body,cmd!.ifMatch,cmd!.key));
        if (!runtime.api.isCrewResourceId(result.data.id) || result.data.taskId !== draft.taskId) throw new Error('field_submission_identity_invalid');
        cmd.responseId = result.data.id; cmd.phase = 'acknowledged'; await persist(draft,runtime);
      } catch (error) {
        // A first request with a definitive rejection may be edited only after explicit acknowledgement.
        const status = (error as {response?:{status?:number}})?.response?.status;
        if (!replay && status && [400,403,404,422,428].includes(status)) {
          cmd.phase='rejected';cmd.rejectionStatus=status;await persist(draft,runtime);
        }
        throw error;
      }
    }
    const read = await guarded(draft,runtime,()=>runtime.api.getFieldSubmissionDetailReal(draft.projectId,draft.taskId,cmd!.responseId!));
    if (read.data.id !== cmd.responseId || read.data.taskId !== draft.taskId || !read.data.contentHash ||
        (read.data.parentId??null) !== (cmd.body.parentSubmissionId??null)) throw new Error('field_readback_mismatch');
    if(cmd.body.captureType==='REPAIR_CLAIM')validateRepairClaimReadback(read.data,cmd.body);
    for (const evidence of cmd.body.evidence??[]) if (!(read.data.evidence??[]).some(e=>e.captureOriginId===evidence.captureOriginId && e.fileId===evidence.fileId && e.checksumSha256===evidence.checksumSha256 && e.purpose===evidence.purpose)) throw new Error('field_readback_mismatch');
    for (const measurement of cmd.body.measurements??[]) if (!(read.data.measurements??[]).some(m=>Object.entries(measurement).every(([key,value])=>(m[key as keyof crew.FieldMeasurementInput]??null)===(value??null)))) throw new Error('field_readback_mismatch');
    for (const c of draft.captures) {
      const e = await guarded(draft,runtime,()=>runtime.api.getFieldEvidenceReal(draft.projectId,draft.taskId,c.upload!.fileId));
      if (e.fileId !== c.upload!.fileId || e.state !== 'VERIFIED' || e.checksum !== c.checksum || e.mediaType !== c.mediaType || e.sizeBytes !== c.size) throw new Error('field_evidence_readback_mismatch');
    }
    const latest = await guarded(draft,runtime,()=>runtime.api.getFieldInspectionTaskDetailReal(draft.projectId,draft.taskId));
    runtime.api.validateCrewTaskDetail(latest.data,latest.etag,draft.projectId,draft.taskId,draft.actor);
    if(latest.data.assignmentId!==cmd.assignmentId)throw Error('field_assignment_changed');
    if(cmd.body.captureType==='REPAIR_CLAIM'&&(latest.data.latestSubmissionId!==read.data.id||latest.data.status!=='Submitted'))throw Error('field_readback_mismatch');
    if(cmd.body.captureType==='REPAIR_CLAIM')await verifyRepairClaim(draft,latest.data,runtime);
    cmd.phase='confirmed';draft.result=read.data;await persist(draft,runtime);return draft;
  });
}
/** Only real API-096 root claim is eligible for formal API-157 intake. */
export function validateRepairClaimReadback(read: crew.FieldSubmissionViewFact,body: crew.FieldSubmissionInput): void {
  if(!crew.isCrewResourceId(read.id)||read.rootId!==read.id||read.parentId!==null||read.revision!==1||
    body.captureType!=='REPAIR_CLAIM'||body.repaired!==true||body.unrepairedReason!=null||body.parentSubmissionId!=null||
    read.captureType!=='REPAIR_CLAIM'||read.repaired!==true||read.unrepairedReason!=null||
    typeof read.contentHash!=='string'||!/^[a-f0-9]{64}$/i.test(read.contentHash)||
    !Number.isFinite(Date.parse(read.serverReceivedAt))||!Array.isArray(read.missingReasons)||
    !['READY','INCOMPLETE'].includes(String(read.readiness)))throw Error('repair_claim_readback_invalid');
  const norm=(v:unknown)=>JSON.stringify(v??null);
  if((read.evidence??[]).length!==(body.evidence??[]).length||
    (body.evidence??[]).some(e=>!(read.evidence??[]).some(actual=>
      ['captureOriginId','fileId','purpose','checksumSha256','mediaType','attemptChecklist'].every(k=>
        norm(actual[k as keyof typeof e])===norm(e[k as keyof typeof e]))&&
      (actual.capturedAt==null?e.capturedAt==null:!!e.capturedAt&&Date.parse(actual.capturedAt)===Date.parse(e.capturedAt))))||
    (read.measurements??[]).length!==(body.measurements??[]).length||
    (body.measurements??[]).some(m=>!(read.measurements??[]).some(actual=>Object.entries(m).every(([k,v])=>norm(actual[k as keyof typeof m])===norm(v)))))throw Error('repair_claim_readback_invalid');
}

export function fieldErrorMessage(error: unknown): string {
  const status = (error as {response?:{status?:number}})?.response?.status;
  const code = (error as {code?:unknown})?.code;
  const uploadStage = (error as {uploadStage?:unknown})?.uploadStage;
  if (uploadStage === 'upload_put' && status === 403) return 'Dịch vụ lưu ảnh từ chối đường tải. Cần kiểm tra chữ ký, thời hạn và cấu hình endpoint; ảnh và phiên tải cũ được giữ.';
  if (status === 401) return 'Phiên đăng nhập hết hiệu lực. Lệnh cũ được giữ để đối soát.';
  if (status === 403) return 'Không còn quyền trên nhiệm vụ hoặc bằng chứng này.';
  if (status === 409 || status === 412) return 'Dữ liệu hoặc phiên bản đã thay đổi. Tải lại và đối soát lệnh cũ.';
  if (uploadStage === 'upload_put' && (code === 'ERR_NETWORK' || code === 'ECONNABORTED')) {
    return 'Không kết nối được dịch vụ lưu ảnh. Ảnh chưa xác minh; nháp vẫn được giữ. Kiểm tra mạng rồi đối soát trước khi thử lại.';
  }
  const message=(error as Error)?.message;
  if (message === 'field_upload_failed') return 'Máy chủ không xác minh được ảnh. Ảnh và phiên tải cũ được giữ; cần kiểm tra trước khi tạo lần tải khác.';
  const repairMessages: Record<string,string>={
    repair_finish_required:'Cần biên nhận kết thúc thi công đã đối soát đúng nhiệm vụ, liên kết phân công và phiên bản.',
    repair_claim_root_required:'Nhiệm vụ đã có lượt hồ sơ hiện trường trước đó; chưa thể dùng lượt đo kiểm hoặc bổ sung làm hồ sơ sửa chữa gốc. Cần đối soát với điều phối.',
    repair_claim_source_changed:'Nguồn thi công hoặc phiên bản đã thay đổi. Giữ nháp và đối soát trước khi gửi.',
    repair_after_camera_required:'Cần ảnh sau sửa chụp trực tiếp sau thời điểm kết thúc được máy chủ xác nhận và xác nhận hiện trạng sau sửa.',
    repair_claim_retained_for_intake:'Hồ sơ sửa chữa được giữ cho bước tiếp nhận; không tạo nháp thay thế.',
    repair_claim_readback_invalid:'Dữ liệu đọc lại chưa khớp hồ sơ sửa chữa gốc. Chưa xác nhận gửi thành công.',
  };
  if(repairMessages[message])return repairMessages[message];
  const messages: Record<string,string>={field_previous_session_requires_reconciliation:'Có nháp thuộc phiên đăng nhập cũ. Đã khóa gửi lại để tránh ghi trùng; cần đối soát hồ sơ cũ.',field_session_changed:'Phiên đội sửa chữa đã thay đổi. Đã dừng thao tác.',field_verified_evidence_required:'Cần ảnh đã được máy chủ xác minh trước khi gửi.',field_measurements_required:'Nhập số đo hoặc lý do chưa đo, dụng cụ, phương pháp và lý do thiếu GPS.',field_verification_pending:'Máy chủ đang xác minh ảnh. Tải lại trạng thái; chưa được gửi hồ sơ.',field_command_rejected:'Lệnh đã bị từ chối. Xem lỗi, tải lại rồi xác nhận tạo nháp mới.',field_unknown_outcome_use_reconcile:'Kết quả lệnh cũ chưa xác định. Dùng đối soát hoặc gửi lại đúng lệnh đã lưu.',field_upload_cancel_pending:'Đang hủy hoặc đối soát phiên tải ảnh. Ảnh cục bộ vẫn được giữ.',field_upload_not_cancellable:'Phiên ảnh không còn ở trạng thái cho phép hủy. Đọc lại trạng thái máy chủ.',field_upload_session_missing:'Ảnh chưa có phiên tải để hủy.',field_cancel_receipt_invalid:'Biên nhận hủy không khớp phiên ảnh. Cần đối soát trước khi thao tác tiếp.'};
  if (messages[message]) return messages[message];
  if (message && /[À-ỹ]/.test(message)) return message;
  const captureStage=(error as {fieldCaptureStage?:string})?.fieldCaptureStage;
  const captureErrors:Record<string,string>={read_photo:'Không đọc được ảnh đã chọn.',write_photo:'Không ghi được ảnh vào bộ nhớ ứng dụng.',hash_photo:'Không kiểm tra được dữ liệu ảnh đã lưu.',move_photo:'Không hoàn tất được tệp ảnh trên thiết bị.',save_draft:'Không thêm được ảnh vào hồ sơ nháp.'};
  if(captureStage&&captureErrors[captureStage])return captureErrors[captureStage]+' Ảnh và nháp cũ vẫn được giữ.';
  return 'Chưa xác nhận được thao tác. Nháp và lệnh đã lưu được giữ nguyên; tải lại hoặc đối soát trước khi gửi mới.';
}
export async function downloadFieldPhoto(context: FieldContext,fileId: string): Promise<string> {
  const runtime=await openFieldRuntime(context);
  const metadata=await guarded(context,runtime,()=>crew.getFieldEvidenceReal(context.projectId,context.taskId,fileId));
  if(metadata.fileId!==fileId || metadata.state!=='VERIFIED' || !['image/jpeg','image/png'].includes(metadata.mediaType))throw new Error('field_file_not_verified');
  const bytes=await guarded(context,runtime,()=>crew.downloadFieldEvidenceReal(context.projectId,context.taskId,fileId));
  if(bytes.length!==metadata.sizeBytes || await guarded(context,runtime,()=>runtime.hash(bytes))!==metadata.checksum)throw new Error('field_checksum_mismatch');
  const file=new File(Paths.cache,`field-private-${randomUUID()}.${metadata.mediaType==='image/png'?'png':'jpg'}`);
  await guarded(context,runtime,() => file.write(bytes));
  return file.uri;
}
