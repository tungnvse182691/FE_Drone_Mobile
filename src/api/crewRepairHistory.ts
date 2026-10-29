import { randomUUID } from 'expo-crypto';
import * as api from './crewApi';
import { currentRepairIdentity, sameRepairIdentity, openRepairJournal,
  type RepairIdentity, type RepairCommandIdentity, type RepairJournalRecord } from './crewRepairDraft';
import type { FieldDraft } from './crewFieldDraft';

export interface RepairRuntime {
  current: () => RepairIdentity | null;
  uuid: () => string;
  now: () => string;
  api: typeof api;
  journal: (identity: RepairIdentity) => ReturnType<typeof openRepairJournal>;
  fieldDraft?: () => Promise<FieldDraft>;
}
export function repairRuntime(identity: RepairIdentity): RepairRuntime {
  return { current: () => currentRepairIdentity(identity.projectId,identity.taskId), uuid: randomUUID,
    now: () => new Date().toISOString(), api, journal: i => openRepairJournal(i) };
}
export function guard(identity: RepairIdentity,r: RepairRuntime) {
  if (!sameRepairIdentity(identity,r.current())) throw Error('repair_session_changed');
}
export async function guarded<T>(i: RepairIdentity,r: RepairRuntime,f:()=>Promise<T>): Promise<T> {
  guard(i,r); const value=await f(); guard(i,r); return value;
}
function version(etag: string): string {
  if (!/^"[A-Za-z0-9+/]+=\"$/.test(etag) || !api.isRepairItemVersion(etag.slice(1,-1))) throw Error('repair_item_version_invalid');
  return etag.slice(1,-1);
}
export function timestamp(value: unknown): value is string {
  return typeof value==='string' && /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));
}
export async function fresh(i: RepairIdentity,r: RepairRuntime,expected?: RepairCommandIdentity) {
  const response=await guarded(i,r,()=>r.api.getFieldInspectionTaskDetailReal(i.projectId,i.taskId));
  r.api.validateCrewTaskDetail(response.data,response.etag,i.projectId,i.taskId,i.actor);
  const block=r.api.normalRepairBlock(response.data,response.etag,i.actor,'bootstrap');
  if(block)throw Error(block);
  const ctx=response.data.repairContext!;
  if(expected && (expected.assignmentId!==response.data.assignmentId || expected.packageId!==ctx.packageId ||
    expected.itemId!==ctx.itemId || expected.bindingId!==ctx.bindingId))throw Error('repair_binding_changed');
  return response;
}
export function validateRepairReceipt(c: RepairJournalRecord,data: Record<string,unknown>,etag: string) {
  const itemVersion=version(etag);
  if(c.operation==='attempt') {
    if(![data.attemptId,data.linkId,data.reviewClockId].every(api.isCrewResourceId)||data.itemId!==c.identity.itemId||
      data.submissionId!==c.payload.fieldSubmissionId||!timestamp(data.originalReviewDueAt)||!['READY','INCOMPLETE'].includes(String(data.intakeReadiness)))throw Error('repair_receipt_invalid');
    return {data,itemVersion};
  }
  if(!api.isCrewResourceId(data.id)||data.itemId!==c.identity.itemId||data.taskId!==c.identity.taskId||
    (c.operation!=='finish'&&data.firstStartId!==c.payload.fieldFirstStartId))throw Error('repair_receipt_invalid');
  if(c.operation==='assessment') {
    if(!api.isCrewResourceId(data.sessionId)||data.stage!=='PRE_EXECUTION'||!['READY','INCOMPLETE'].includes(String(data.readiness))||
      !Array.isArray(data.missingReasons)||data.missingReasons.some(v=>typeof v!=='string')||
      (data.readiness==='READY'&&data.missingReasons.length!==0)||!['UNKNOWN','VERIFIED_CHECKLIST'].includes(String(data.locationState))||
      typeof data.contentHash!=='string'||!/^[a-f0-9]{64}$/i.test(data.contentHash))throw Error('repair_receipt_invalid');
  } else if(c.operation==='start'||c.operation==='finish') {
    if((c.operation==='start'?data.assessmentId!==c.payload.assessmentId:data.executionStartId!==c.payload.executionStartId)||!timestamp(data.claimedAt)||!timestamp(c.payload.claimedAt)||
      Date.parse(data.claimedAt)!==Date.parse(c.payload.claimedAt)||!timestamp(data.serverReceivedAt)||
      (data.verifiedOriginalAt!=null&&!timestamp(data.verifiedOriginalAt))||typeof data.timeProvenance!=='string'||!data.timeProvenance)throw Error('repair_receipt_invalid');
    if(c.operation==='finish'&&(!api.isCrewResourceId(data.syncClockId)||!timestamp(data.originalSyncDueAt)))throw Error('repair_receipt_invalid');
  } else throw Error('repair_operation_disabled');
  return {data,itemVersion};
}
/** Restore receipts only after current actor/binding checks; no POST or invented readback. */
export async function readRepairHistory(i: RepairIdentity,r=repairRuntime(i)) {
  await fresh(i,r);
  const j=await guarded(i,r,()=>r.journal(i)),rows=await guarded(i,r,()=>j.history());
  const latestConfirmed=rows.filter(row=>row.phase==='CONFIRMED').at(-1);
  for(const row of rows) {
    const read=await fresh(i,r,row.identity);
    if(row.receipt)validateRepairReceipt(row,row.receipt.data,`"${row.receipt.itemVersion}"`);
    // Historical start versions must not invalidate a later finish/intake receipt.
    // A pending later command may already have committed: preserve it for exact replay.
    if(row===latestConfirmed&&row.operation!=='assessment'&&rows.at(-1)===row&&
      (read.data.repairContext!.status!==(row.operation==='attempt'?'Submitted':'InProgress')||read.data.repairContext!.itemVersion!==row.receipt!.itemVersion))throw Error('repair_reconciliation_pending');
  }
  return rows;
}
