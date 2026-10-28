import { randomUUID } from 'expo-crypto';
import * as api from './crewApi';
import { currentRepairIdentity, sameRepairIdentity, openRepairJournal,
  type RepairIdentity, type RepairCommandIdentity, type RepairJournalRecord } from './crewRepairDraft';
import { openFieldRuntime, loadFieldDraft, validateRepairClaimReadback, type FieldDraft } from './crewFieldDraft';

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
function guard(identity: RepairIdentity,r: RepairRuntime) {
  if (!sameRepairIdentity(identity,r.current())) throw Error('repair_session_changed');
}
async function guarded<T>(i: RepairIdentity,r: RepairRuntime,f:()=>Promise<T>): Promise<T> {
  guard(i,r); const value=await f(); guard(i,r); return value;
}
function version(etag: string): string {
  if (!/^"[A-Za-z0-9+/]+=\"$/.test(etag) || !api.isRepairItemVersion(etag.slice(1,-1))) throw Error('repair_item_version_invalid');
  return etag.slice(1,-1);
}
function timestamp(value: unknown): value is string {
  return typeof value==='string' && /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));
}
async function fresh(i: RepairIdentity,r: RepairRuntime,expected?: RepairCommandIdentity) {
  const response=await guarded(i,r,()=>r.api.getFieldInspectionTaskDetailReal(i.projectId,i.taskId));
  r.api.validateCrewTaskDetail(response.data,response.etag,i.projectId,i.taskId,i.actor);
  const block=r.api.normalRepairBlock(response.data,response.etag,i.actor,'bootstrap');
  if(block)throw Error(block);
  const ctx=response.data.repairContext!;
  if(expected && (expected.assignmentId!==response.data.assignmentId || expected.packageId!==ctx.packageId ||
    expected.itemId!==ctx.itemId || expected.bindingId!==ctx.bindingId))throw Error('repair_binding_changed');
  return response;
}
async function firstStart(i: RepairIdentity,r: RepairRuntime,task: api.FieldTaskViewFact) {
  const first=await guarded(i,r,()=>r.api.getFieldTaskStartOriginReal(i.projectId,i.taskId));
  if(!api.isCrewResourceId(first.id) || first.id!==task.firstStartOriginId || first.taskId!==i.taskId ||
    first.assignmentId!==task.assignmentId)throw Error('repair_first_start_invalid');
  return first.id;
}
function commandIdentity(i: RepairIdentity,task: api.FieldTaskViewFact): RepairCommandIdentity {
  const ctx=task.repairContext!;
  return {...i,packageId:ctx.packageId,itemId:ctx.itemId,bindingId:ctx.bindingId,assignmentId:task.assignmentId!};
}
export function validateRepairInput(operation: 'assessment'|'start'|'finish'|'attempt',body: Record<string,unknown>): void {
  if(operation==='attempt') {
    if(!api.isCrewResourceId(body.fieldSubmissionId)||!api.isCrewResourceId(body.executionFinishId)||
      typeof body.expectedContentHash!=='string'||!/^[a-f0-9]{64}$/i.test(body.expectedContentHash))throw Error('repair_input_invalid');
    return;
  }
  if(!api.isCrewResourceId(body.originId)||(operation!=='finish'&&!api.isCrewResourceId(body.fieldFirstStartId))||
    (body.deviceId!=null&&!api.isCrewResourceId(body.deviceId)))throw Error('repair_input_invalid');
  if(operation==='start'||operation==='finish') {
    if(!api.isCrewResourceId(operation==='start'?body.assessmentId:body.executionStartId)||!timestamp(body.claimedAt)||
      (body.monotonicMilliseconds!=null&&(!Number.isSafeInteger(body.monotonicMilliseconds)||Number(body.monotonicMilliseconds)<0))||
      (body.bootId!=null&&(typeof body.bootId!=='string'||body.bootId.length>200)))throw Error('repair_input_invalid');
    return;
  }
  const measurements=body.measurements as api.FieldMeasurementInput[];
  const evidence=body.evidence as api.FieldEvidenceDeclaration[];
  if(!Array.isArray(measurements)||!measurements.length||measurements.length>200 || measurements.some(m=>
    !api.isCrewResourceId(m.sampleId)||!m.type||!m.dimension||!m.unit||!m.instrument?.trim()||!m.method?.trim()||
    (m.value===null?m.state!=='UNKNOWN'||!m.unknownReason?.trim():m.state!=='KNOWN'||!Number.isFinite(m.value)||m.value<0)||
    ((m.latitude==null||m.longitude==null)?!m.locationReason?.trim():!Number.isFinite(m.latitude)||!Number.isFinite(m.longitude)||Math.abs(m.latitude)>90||Math.abs(m.longitude)>180)))throw Error('repair_measurements_required');
  if(!Array.isArray(evidence)||!evidence.length||evidence.length>100 || evidence.some(e=>
    !api.isCrewResourceId(e.captureOriginId)||!api.isCrewResourceId(e.fileId)||!['BEFORE','MEASUREMENT'].includes(e.purpose)||
    !/^[a-f0-9]{64}$/i.test(e.checksumSha256)||!['image/jpeg','image/png'].includes(e.mediaType)||
    (e.capturedAt!=null&&!timestamp(e.capturedAt))))throw Error('repair_verified_evidence_required');
}
/** Uses only the current session's durable FIELD captures; complete is not VERIFIED. */
export async function prepareRepairAssessment(i: RepairIdentity,draft: FieldDraft,r=repairRuntime(i)) {
  guard(i,r);
  if(!sameRepairIdentity(i,draft))throw Error('repair_field_source_invalid');
  draft=JSON.parse(JSON.stringify(draft));
  const response=await fresh(i,r),task=response.data;
  const block=r.api.normalRepairBlock(task,response.etag,i.actor,'assessment');if(block)throw Error(block);
  const first=await firstStart(i,r,task);
  const captures=draft.captures.filter(c=>c.purpose!=='AFTER');
  const evidence: api.FieldEvidenceDeclaration[]=[];
  for(const c of captures){
    if(!c.verified||!c.upload||!api.isCrewResourceId(c.upload.id))throw Error('repair_verified_evidence_required');
    const upload=await guarded(i,r,()=>r.api.getCrewUploadSession(c.upload!.id));
    const file=await guarded(i,r,()=>r.api.getCrewFileMetadata(c.upload!.fileId));
    if(upload.id!==c.upload.id||upload.fileId!==c.upload.fileId||upload.status!=='VERIFIED'||
      file.id!==c.upload.fileId||file.status!=='VERIFIED'||file.checksumSha256!==c.checksum||file.mediaType!==c.mediaType||file.sizeBytes!==c.size)throw Error('repair_verified_evidence_required');
    evidence.push({captureOriginId:c.id,fileId:file.id,purpose:c.purpose,checksumSha256:c.checksum,mediaType:c.mediaType,capturedAt:c.capturedAt});
  }
  const payload={originId:r.uuid(),fieldFirstStartId:first,measurements:draft.measurements,evidence,locationProof:draft.locationProof,deviceId:null};
  validateRepairInput('assessment',payload);
  const j=await guarded(i,r,()=>r.journal(i));
  return guarded(i,r,()=>j.prepare({identity:commandIdentity(i,task),operation:'assessment',key:r.uuid(),itemVersion:task.repairContext!.itemVersion,payload}));
}
export async function prepareRepairStart(i: RepairIdentity,r=repairRuntime(i)) {
  const j=await guarded(i,r,()=>r.journal(i)),history=await guarded(i,r,()=>j.list());
  if(history.some(c=>!['CONFIRMED','REJECTED'].includes(c.phase)))throw Error('repair_unresolved_command');
  const assessment=history.filter(c=>c.operation==='assessment').at(-1);
  if(assessment?.phase!=='CONFIRMED'||assessment.receipt?.data.readiness!=='READY')throw Error('repair_assessment_required');
  if(!assessment?.receipt)throw Error('repair_assessment_required');
  validateRepairReceipt(assessment,assessment.receipt.data,`"${assessment.receipt.itemVersion}"`);
  const response=await fresh(i,r,assessment.identity),task=response.data;
  const block=r.api.normalRepairBlock(task,response.etag,i.actor,'start');if(block)throw Error(block);
  if(task.repairContext!.itemVersion!==assessment.receipt.itemVersion)throw Error('repair_stale_assessment');
  const first=await firstStart(i,r,task);
  if(first!==assessment.payload.fieldFirstStartId)throw Error('repair_first_start_invalid');
  const payload={originId:r.uuid(),fieldFirstStartId:first,assessmentId:assessment.receipt.data.id,claimedAt:r.now(),deviceId:null};
  validateRepairInput('start',payload);
  return guarded(i,r,()=>j.prepare({identity:commandIdentity(i,task),operation:'start',key:r.uuid(),itemVersion:task.repairContext!.itemVersion,payload}));
}
/** Finish is an explicit physical event following a confirmed execution-start receipt. */
export async function prepareRepairFinish(i: RepairIdentity,r=repairRuntime(i)) {
  const j=await guarded(i,r,()=>r.journal(i)),history=await readRepairHistory(i,r);
  const start=history.at(-1);
  if(start?.operation!=='start'||start.phase!=='CONFIRMED'||!start.receipt)throw Error('repair_start_required');
  const response=await fresh(i,r,start.identity),task=response.data;
  const block=r.api.normalRepairBlock(task,response.etag,i.actor,'finish');if(block)throw Error(block);
  if(task.repairContext!.itemVersion!==start.receipt.itemVersion)throw Error('repair_reconciliation_pending');
  if(await firstStart(i,r,task)!==start.payload.fieldFirstStartId)throw Error('repair_first_start_invalid');
  const payload={originId:r.uuid(),executionStartId:start.receipt.data.id,claimedAt:r.now(),deviceId:null};
  validateRepairInput('finish',payload);
  return guarded(i,r,()=>j.prepare({identity:commandIdentity(i,task),operation:'finish',key:r.uuid(),itemVersion:task.repairContext!.itemVersion,payload}));
}
/** Fresh API-096 readback is mandatory, including on exact replay of an unknown intake. */
async function attemptSource(i: RepairIdentity,r: RepairRuntime,task: api.FieldTaskViewFact,finish: RepairJournalRecord) {
  const draft=await guarded(i,r,()=>r.fieldDraft?r.fieldDraft():readRepairFieldDraft(i));
  const claim=draft.repairClaim,cmd=draft.command,ctx=task.repairContext!;
  if(!sameRepairIdentity(i,draft)||!claim||!cmd||cmd.phase!=='confirmed'||!finish.receipt||
    cmd.assignmentId!==task.assignmentId||claim.assignmentId!==task.assignmentId||claim.bindingId!==ctx.bindingId||
    claim.packageId!==ctx.packageId||claim.itemId!==ctx.itemId||claim.itemVersion!==finish.receipt.itemVersion||
    claim.finishId!==finish.receipt.data.id||claim.executionStartId!==finish.payload.executionStartId||
    claim.firstStartId!==task.firstStartOriginId||cmd.body.startOriginId!==task.firstStartOriginId||
    cmd.responseId!==task.latestSubmissionId||draft.result?.id!==cmd.responseId||!api.isCrewResourceId(cmd.responseId))throw Error('repair_claim_required');
  const read=await guarded(i,r,()=>r.api.getFieldSubmissionDetailReal(i.projectId,i.taskId,cmd.responseId!));
  validateRepairClaimReadback(read.data,cmd.body);
  if(read.data.id!==cmd.responseId||read.data.taskId!==i.taskId||read.data.contentHash!==draft.result.contentHash||
    finish.receipt.data.timeProvenance!=='SERVER_ONLINE'||!timestamp(finish.receipt.data.verifiedOriginalAt)||
    Date.parse(read.data.serverReceivedAt)<Date.parse(finish.receipt.data.verifiedOriginalAt))throw Error('repair_claim_readback_invalid');
  const after=(cmd.body.evidence??[]).filter(e=>e.purpose==='AFTER');
  if(!after.length||after.some(e=>e.attemptChecklist!=='POST_REPAIR_CAPTURE'||!e.capturedAt||
    !timestamp(finish.receipt!.data.verifiedOriginalAt)||Date.parse(e.capturedAt)<Date.parse(finish.receipt!.data.verifiedOriginalAt as string)))throw Error('repair_after_camera_required');
  for(const e of cmd.body.evidence??[]) {
    if(!api.isCrewResourceId(e.fileId))throw Error('repair_verified_evidence_required');
    const file=await guarded(i,r,()=>r.api.getFieldEvidenceReal(i.projectId,i.taskId,e.fileId!));
    if(file.fileId!==e.fileId||file.state!=='VERIFIED'||file.checksum!==e.checksumSha256||file.mediaType!==e.mediaType)throw Error('repair_verified_evidence_required');
  }
  return {fieldSubmissionId:read.data.id,expectedContentHash:read.data.contentHash,executionFinishId:claim.finishId};
}
export async function prepareRepairAttempt(i: RepairIdentity,r=repairRuntime(i)) {
  const j=await guarded(i,r,()=>r.journal(i)),history=await readRepairHistory(i,r),finish=history.at(-1);
  if(finish?.operation!=='finish'||finish.phase!=='CONFIRMED'||!finish.receipt)throw Error('repair_finish_required');
  const response=await fresh(i,r,finish.identity),task=response.data;
  const block=r.api.normalRepairBlock(task,response.etag,i.actor,'attempt');if(block)throw Error(block);
  if(ctxVersion(task)!==finish.receipt.itemVersion)throw Error('repair_reconciliation_pending');
  await firstStart(i,r,task);
  const payload=await attemptSource(i,r,task,finish);
  validateRepairInput('attempt',payload);
  return guarded(i,r,()=>j.prepare({identity:commandIdentity(i,task),operation:'attempt',key:r.uuid(),itemVersion:ctxVersion(task),payload}));
}
function ctxVersion(task: api.FieldTaskViewFact) {return task.repairContext!.itemVersion;}
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
const locks=new Set<string>();
/** Only explicit UI calls enter this dispatcher. No background/online listener sends commands. */
export async function dispatchRepair(i: RepairIdentity,key: string,r=repairRuntime(i)) {
  const lock=JSON.stringify([i.environment,i.actor,i.projectId,i.taskId]);
  if(locks.has(lock))throw Error('repair_busy');locks.add(lock);
  try {
    const j=await guarded(i,r,()=>r.journal(i));let c=await guarded(i,r,()=>j.read(key));
    if(!c||!['assessment','start','finish','attempt'].includes(c.operation))throw Error('repair_operation_disabled');
    if(c.phase==='CONFIRMED') {
      await readRepairHistory(i,r);
      return c;
    }
    if(c.phase==='REJECTED')return c;
    const response=await fresh(i,r,c.identity),task=response.data;
    const first=await firstStart(i,r,task);
    if(['assessment','start'].includes(c.operation)&&first!==c.payload.fieldFirstStartId)throw Error('repair_first_start_invalid');
    validateRepairInput(c.operation as 'assessment'|'start'|'finish'|'attempt',c.payload);
    if(c.operation==='start') {
      const previous=(await guarded(i,r,()=>j.list())).filter(row=>row.operation==='assessment').at(-1);
      if(!previous?.receipt || previous.phase!=='CONFIRMED' || previous.receipt.data.readiness!=='READY' ||
          previous.receipt.data.id!==c.payload.assessmentId || previous.receipt.itemVersion!==c.itemVersion)throw Error('repair_assessment_required');
      validateRepairReceipt(previous,previous.receipt.data,`"${previous.receipt.itemVersion}"`);
    }
    if(c.operation==='finish'||c.operation==='attempt') {
      const history=await guarded(i,r,()=>j.list());
      const previous=history.find(row=>row.operation===(c!.operation==='finish'?'start':'finish'));
      if(previous?.phase!=='CONFIRMED'||!previous.receipt||previous.receipt.data.id!==
        (c.operation==='finish'?c.payload.executionStartId:c.payload.executionFinishId)||
        previous.receipt.itemVersion!==c.itemVersion)throw Error('repair_history_requires_reconciliation');
      validateRepairReceipt(previous,previous.receipt.data,`"${previous.receipt.itemVersion}"`);
      const start=history.find(row=>row.operation==='start');
      if(start?.payload.fieldFirstStartId!==first)throw Error('repair_first_start_invalid');
      if(c.operation==='attempt') {
        const source=await attemptSource(i,r,task,previous);
        if(Object.entries(source).some(([k,v])=>c!.payload[k]!==v))throw Error('repair_claim_source_changed');
      }
    }
    if(c.phase==='PREPARED') {
      const block=r.api.normalRepairBlock(task,response.etag,i.actor,c.operation as 'assessment'|'start'|'finish'|'attempt');
      if(block)throw Error(block);
      if(task.repairContext!.itemVersion!==c.itemVersion)throw Error('repair_stale_assessment');
      c=await guarded(i,r,()=>j.transition(key,'PENDING'));
    }
    if(c.phase==='PENDING') {
      let response: {data: api.RepairAssessmentView|api.RepairExecutionStartView|api.RepairExecutionFinishView|api.RepairAttemptIntakeView;etag:string};
      const command=c;
      try {
        response=await guarded(i,r,async()=>command.operation==='assessment'?
          r.api.submitRepairAssessmentReal(i.projectId,command.identity.packageId,command.identity.itemId,i.taskId,
            command.payload as unknown as api.RepairMeasurementAssessmentInput,command.ifMatch,command.key):
          command.operation==='start'?r.api.startRepairExecutionReal(i.projectId,command.identity.packageId,command.identity.itemId,i.taskId,
            command.payload as unknown as api.RepairExecutionStartInput,command.ifMatch,command.key):
          command.operation==='finish'?r.api.finishRepairExecutionReal(i.projectId,command.identity.packageId,command.identity.itemId,i.taskId,
            command.payload as unknown as api.RepairExecutionFinishInput,command.ifMatch,command.key):
          r.api.submitRepairAttemptReal(i.projectId,command.identity.packageId,command.identity.itemId,i.taskId,
            command.payload as unknown as api.RepairAttemptSubmitInput,command.ifMatch,command.key));
      } catch(e) {
        guard(i,r);
        const error=e as {response?:{status?:number;data?:{code?:unknown}}};
        const status=error.response?.status;
        if(status&&[400,401,403,404,409,412,422,428].includes(status)) {
          const code=error.response?.data?.code;
          await guarded(i,r,()=>j.transition(key,'REJECTED',{rejection:{status,code:typeof code==='string'?code.slice(0,200):null}}));
        }
        throw e;
      }
      const receipt=validateRepairReceipt(c,{...response.data},response.etag);
      c=await guarded(i,r,()=>j.transition(key,'ACKNOWLEDGED',{receipt}));
    }
    if(c.phase==='ACKNOWLEDGED') {
      validateRepairReceipt(c,c.receipt!.data,`"${c.receipt!.itemVersion}"`);
      const read=(await fresh(i,r,c.identity)).data;
      if(read.repairContext!.itemVersion!==c.receipt!.itemVersion || read.repairContext!.status!==(c.operation==='assessment'?'Assigned':c.operation==='attempt'?'Submitted':'InProgress'))throw Error('repair_reconciliation_pending');
      c=await guarded(i,r,()=>j.transition(key,'CONFIRMED'));
    }
    return c;
  } finally {locks.delete(lock);}
}
export async function readRepairFieldDraft(i: RepairIdentity) {
  const runtime=await openFieldRuntime(i);return loadFieldDraft(i,runtime);
}
/** Restore receipts only after current actor/binding checks; no POST or invented readback. */
export async function readRepairHistory(i: RepairIdentity,r=repairRuntime(i)) {
  const j=await guarded(i,r,()=>r.journal(i)),rows=await guarded(i,r,()=>j.list());
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
export function repairErrorMessage(e: unknown): string {
  const status=(e as {response?:{status?:number}})?.response?.status;
  if(status===401||status===403)return 'Phiên hoặc quyền Crew không còn hợp lệ. Lệnh được giữ để đối soát.';
  if(status===409||status===412||status===428)return 'Máy chủ từ chối phiên bản hoặc điều kiện lệnh. Không đổi key để gửi lại.';
  const code=e instanceof Error?e.message:'';
  const messages: Record<string,string>={
    repair_measurements_required:'Cần số đo hoặc lý do chưa đo, dụng cụ, phương pháp và lý do thiếu GPS quan sát.',
    repair_verified_evidence_required:'Cần ảnh BEFORE/MEASUREMENT đúng nháp Crew và VERIFIED từ máy chủ, khớp checksum.',
    repair_first_start_invalid:'First-start không khớp nhiệm vụ hoặc assignment hiện tại. Đã khóa lệnh.',
    repair_binding_changed:'Binding hoặc assignment đã thay đổi. Giữ lịch sử để đối soát.',
    repair_stale_assessment:'Phiên bản hạng mục đã thay đổi sau assessment. Chưa được bắt đầu thi công.',
    repair_previous_session_unresolved:'Có lệnh chưa rõ kết quả thuộc phiên cũ. Cần đối soát, không gửi bằng phiên mới.',
    repair_history_requires_reconciliation:'Lịch sử sửa chữa cần đối soát trước khi tạo lệnh mới.',
    repair_session_changed:'Phiên Crew đã thay đổi. Đã dừng thao tác và giữ lệnh cũ.',
    repair_finish_required:'Cần biên nhận kết thúc thi công đã được đối soát trước khi lập và nộp hồ sơ.',
    repair_start_required:'Cần biên nhận bắt đầu thi công đã được đối soát trước khi kết thúc.',
    repair_claim_required:'Cần hồ sơ REPAIR_CLAIM gốc, đã xác nhận bằng GET, khớp phiên thi công hiện tại.',
    repair_claim_readback_invalid:'Hồ sơ đọc lại chưa khớp nguồn, nội dung hoặc thời điểm thi công. Đã khóa tiếp nhận.',
    repair_reconciliation_pending:'Phiên bản hoặc trạng thái máy chủ chưa khớp biên nhận. Giữ lệnh và đối soát.',
  };
  if(messages[code])return messages[code];
  return 'Chưa xác nhận được kết quả hoặc dữ liệu đầu vào. Lệnh đã lưu được giữ nguyên; tải lại và đối soát trước khi tiếp tục.';
}
