import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { openDatabase, initDatabase, saveDraft } from '../offline/database';
import { useAuthStore } from '../store/auth';
import { passwordSessionIdentity } from './authApi';
import { apiClient } from './client';
import { sha256HexOfBytes } from './uploads';
import * as crew from './crewApi';
import type { Coords } from '../components/ViewFinder';

export interface FieldContext { actor: string; scope: string; environment: string; projectId: string; taskId: string }
export interface FieldCapture {
  id: string; uri: string; purpose: 'BEFORE' | 'AFTER' | 'MEASUREMENT'; mediaType: string;
  checksum: string; size: number; capturedAt: string | null; coordinates: Coords | null;
  createKey: string; completeKey: string; parts: crew.CrewCompletedPartDto[];
  upload?: crew.CrewUploadSessionDto; complete?: { version: string; parts: crew.CrewCompletedPartDto[] };
  completed?: boolean; verified?: boolean;
  partCommands?: Record<number, { key: string; partNumbers: number[] }>;
  retiredPartCommands?: { key: string; partNumbers: number[]; status: number }[];
}
export interface FieldDraft extends FieldContext {
  captures: FieldCapture[]; measurements: crew.FieldMeasurementInput[];
  locationProof: crew.FieldPositionProofInput | null;
  command?: { key: string; body: crew.FieldSubmissionInput; ifMatch: string; assignmentId: string;
    phase: 'pending' | 'acknowledged' | 'confirmed' | 'rejected'; responseId?: string; rejectionStatus?: number };
  result?: crew.FieldSubmissionViewFact;
}
export interface FieldRuntime {
  current: () => FieldContext | null;
  read: () => Promise<FieldDraft | null>; write: (draft: FieldDraft) => Promise<void>;
  uuid: () => string; bytes: (uri: string) => Promise<Uint8Array>; hash: (bytes: Uint8Array) => Promise<string>;
  wait: () => Promise<void>; api: typeof crew;
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
async function exclusive<T>(context: FieldContext, action: () => Promise<T>): Promise<T> {
  const key = JSON.stringify([context.environment, context.actor, context.projectId, context.taskId]);
  if (locks.has(key)) throw new Error('field_busy');
  locks.add(key); try { return await action(); } finally { locks.delete(key); }
}
export function fieldDraftPending(draft: FieldDraft): boolean {
  return !!draft.command && ['pending','acknowledged'].includes(draft.command.phase);
}
export function currentFieldContext(projectId: string, taskId: string): FieldContext | null {
  const s = useAuthStore.getState(), scope = passwordSessionIdentity(s.token);
  if (!scope || !s.user || s.user.role_code !== 'REPAIR_CREW' || s.user.must_change_password ||
      !['AUTHENTICATED','REFRESHING'].includes(s.status) || JSON.parse(scope)[0] !== s.user.id ||
      !crew.isCrewResourceId(projectId) || !crew.isCrewResourceId(taskId)) return null;
  return { actor: s.user.id, scope, environment: apiClient.defaults.baseURL ?? '', projectId, taskId };
}
/** Key partitions actor/environment/task; old-sid unresolved work cannot be replaced after relogin. */
export async function openFieldRuntime(context: FieldContext): Promise<FieldRuntime> {
  const db = openDatabase(); await initDatabase(db);
  const key = `t05b:${JSON.stringify([context.environment,context.actor,context.projectId,context.taskId])}`;
  return {
    current: () => currentFieldContext(context.projectId, context.taskId),
    read: async () => {
      const row=await db.getFirstAsync<{payload:string}>('SELECT payload FROM local_draft WHERE id = ?',key);
      return row ? decodeFieldDraft(row.payload) : null;
    },
    write: draft => saveDraft(db,key,'T05B_FIELD', { ...draft }), uuid: randomUUID,
    bytes: async uri => new Uint8Array(await new File(uri).arrayBuffer()), hash: sha256HexOfBytes,
    wait: () => new Promise(resolve => setTimeout(resolve,1000)), api: crew,
  };
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
/** Native bytes closed by arrayBuffer; hash durable temp, rename, then commit its URI in SQLite. */
export async function captureFieldPhoto(context: FieldContext, uri: string, purpose: FieldCapture['purpose'],
  mediaType: string, coordinates: Coords | null, camera: boolean): Promise<FieldDraft> {
  return exclusive(context, async () => {
    const runtime = await openFieldRuntime(context), draft = await loadFieldDraft(context,runtime);
    if (draft.command) throw new Error('field_command_pending');
    const detail = await guarded(context,runtime,() => crew.getFieldInspectionTaskDetailReal(context.projectId,context.taskId));
    const reason = crew.fieldCapabilityBlock(detail.data,detail.etag,context.actor,'capture');
    if (reason) throw new Error(reason);
    if (purpose === 'AFTER' && detail.data.purpose !== 'PostRepair') throw new Error('AFTER chỉ hợp lệ với nhiệm vụ PostRepair.');
    const bytes = await guarded(context,runtime,() => runtime.bytes(uri));
    const isJpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const isPng = bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v);
    const actualType = isJpeg ? 'image/jpeg' : isPng ? 'image/png' : null;
    if (!actualType || !bytes.length || bytes.length > 20 * 1024 * 1024 || (mediaType && mediaType !== actualType)) throw new Error('Chỉ nhận JPEG/PNG tối đa 20 MiB, đúng định dạng thực.');
    const id = runtime.uuid(), directory = new Directory(Paths.document,'crew-field');
    directory.create({ idempotent: true, intermediates: true });
    const temp = new File(directory,`${id}.tmp`); temp.write(bytes);
    const checksum = await guarded(context,runtime,() => runtime.hash(new Uint8Array(temp.bytesSync())));
    const file = new File(directory,`${id}.${isJpeg ? 'jpg' : 'png'}`); temp.move(file);
    draft.captures.push({ id,uri:file.uri,purpose,mediaType:actualType,checksum,size:bytes.length,
      capturedAt:camera ? new Date().toISOString() : null, coordinates:camera ? coordinates : null,
      createKey:runtime.uuid(),completeKey:runtime.uuid(),parts:[] });
    await persist(draft,runtime); return draft;
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
async function uploadCapture(draft: FieldDraft,index: number,runtime: FieldRuntime): Promise<FieldDraft> {
  assertFieldContext(draft,runtime);
  const c = draft.captures[index]; if (!c) throw new Error('field_capture_missing');
  const response = await freshTask(draft,runtime,'capture');
  if (c.purpose === 'AFTER' && response.data.purpose !== 'PostRepair') throw new Error('field_after_not_allowed');
  const bytes = await guarded(draft,runtime,() => runtime.bytes(c.uri));
  if (bytes.length !== c.size || await guarded(draft,runtime,() => runtime.hash(bytes)) !== c.checksum) throw new Error('field_checksum_mismatch');
  if (!c.upload) {
    await persist(draft,runtime); // immutable create intent already has its stable key
    c.upload = await guarded(draft,runtime,() => runtime.api.createCrewUploadSession(draft.projectId,draft.taskId,
      `${c.id}.${c.mediaType === 'image/png' ? 'png' : 'jpg'}`,c.mediaType,c.size,c.checksum,c.purpose,c.createKey));
    if (!runtime.api.isCrewResourceId(c.upload.id) || !runtime.api.isCrewResourceId(c.upload.fileId)) throw new Error('field_upload_identity_invalid');
    await persist(draft,runtime);
  }
  let session = await guarded(draft,runtime,() => runtime.api.getCrewUploadSession(c.upload!.id));
  if (session.id !== c.upload.id || session.fileId !== c.upload.fileId) throw new Error('field_upload_identity_invalid');
  if (!['VERIFYING','VERIFIED'].includes(session.status)) {
    if (session.status === 'FAILED') throw new Error('field_upload_failed');
    if (!Number.isSafeInteger(session.partSizeBytes) || session.partSizeBytes <= 0) throw new Error('field_part_size_invalid');
    const count = Math.ceil(bytes.length/session.partSizeBytes);
    for (let part=1;part<=count;part++) if (!c.parts.some(p=>p.partNumber===part)) {
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
      const result = await guarded(draft,runtime,() => runtime.api.putCrewUploadPartBytes(url,bytes.slice((part-1)*session.partSizeBytes,part*session.partSizeBytes),c.mediaType));
      if (!result.etag) throw new Error('field_part_etag_missing');
      c.parts.push({partNumber:part,etag:result.etag}); await persist(draft,runtime);
    }
    if (!c.complete) {
      session = await guarded(draft,runtime,() => runtime.api.getCrewUploadSession(session.id));
      c.complete = {version:session.version,parts:c.parts.map(p=>({...p}))}; await persist(draft,runtime);
    }
    // On timeout, replay retains this original version/body/key, never a newly assembled command.
    await guarded(draft,runtime,() => runtime.api.completeCrewUpload(session.id,c.complete!.parts,c.checksum,c.complete!.version,c.completeKey));
    c.completed = true; await persist(draft,runtime);
  }
  for (let poll=0;poll<12;poll++) {
    session = await guarded(draft,runtime,() => runtime.api.getCrewUploadSession(c.upload!.id));
    if (session.id !== c.upload.id || session.fileId !== c.upload.fileId) throw new Error('field_upload_identity_invalid');
    if (session.status === 'VERIFIED') break;
    if (session.status === 'FAILED') throw new Error('field_upload_failed');
    await guarded(draft,runtime,() => runtime.wait());
  }
  if (session.status !== 'VERIFIED') throw new Error('field_verification_pending');
  const file = await guarded(draft,runtime,() => runtime.api.getCrewFileMetadata(session.fileId));
  if (file.id !== session.fileId || file.status !== 'VERIFIED' || file.checksumSha256 !== c.checksum || file.mediaType !== c.mediaType || file.sizeBytes !== c.size) throw new Error('field_file_not_verified');
  c.upload = session; c.verified = true; await persist(draft,runtime); return draft;
}
export async function uploadFieldCapture(draft: FieldDraft,index: number,runtime: FieldRuntime): Promise<FieldDraft> {
  return exclusive(draft,()=>uploadCapture(draft,index,runtime));
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
export async function acknowledgeFieldResult(context: FieldContext): Promise<FieldDraft> {
  return exclusive(context,async()=>{
    const runtime=await openFieldRuntime(context),draft=await loadFieldDraft(context,runtime);
    if (!draft.command || !['confirmed','rejected'].includes(draft.command.phase)) throw new Error('field_unknown_outcome');
    await freshTask(draft,runtime,'review');
    // Archive the exact terminal command before explicitly preparing another revision.
    const db=openDatabase();await initDatabase(db);
    await guarded(context,runtime,()=>saveDraft(db,`t05b-receipt:${draft.command!.key}`,'T05B_FIELD_RECEIPT',{...draft}));
    const next=newFieldDraft(context);await persist(next,runtime);return next;
  });
}
export function measurementTemplate(type: number, sampleId: string): crew.FieldMeasurementInput | null {
  const names = ['','DepressionDepth','SlabFaultingHeight','ShoulderErosionExtent','Area'];
  if (!names[type]) return null;
  return {sampleId,type:names[type],value:null,state:'UNKNOWN',unknownReason:'Chưa đo tại hiện trường',
    dimension:type===4?'AREA':'LENGTH',unit:type===4?'m²':'cm',instrument:'',method:'',locationReason:'Chưa có tọa độ quan sát'};
}
export async function submitFieldDraft(draft: FieldDraft,runtime: FieldRuntime,replay=false): Promise<FieldDraft> {
  return exclusive(draft,async()=>{
    assertFieldContext(draft,runtime);
    let cmd = draft.command;
    if (cmd?.phase === 'confirmed') return draft;
    if (cmd?.phase === 'rejected') throw new Error('field_command_rejected');
    if (!cmd) {
      const fresh = await freshTask(draft,runtime,'submit');
      if (!draft.measurements.length || draft.measurements.some(m=>!m.instrument.trim() || !m.method.trim() ||
        (m.value === null ? m.state!=='UNKNOWN' || !m.unknownReason?.trim() : m.state!=='KNOWN' || !Number.isFinite(m.value) || m.value < 0) ||
        ((m.latitude == null || m.longitude == null) ? !m.locationReason?.trim() :
          !Number.isFinite(m.latitude) || !Number.isFinite(m.longitude) || Math.abs(m.latitude)>90 || Math.abs(m.longitude)>180))) throw new Error('field_measurements_required');
      if (draft.captures.some(c=>!c.verified || !c.upload?.fileId)) throw new Error('field_verified_evidence_required');
      for (const capture of draft.captures) {
        const file = await guarded(draft,runtime,()=>runtime.api.getCrewFileMetadata(capture.upload!.fileId));
        if (file.status !== 'VERIFIED' || file.id !== capture.upload!.fileId || file.checksumSha256 !== capture.checksum || file.mediaType !== capture.mediaType || file.sizeBytes !== capture.size) throw new Error('field_file_not_verified');
      }
      let retained: crew.FieldEvidenceDeclaration[] = [];
      if (fresh.data.latestSubmissionId) {
        const previous=await guarded(draft,runtime,()=>runtime.api.getFieldSubmissionDetailReal(draft.projectId,draft.taskId,fresh.data.latestSubmissionId!));
        if (previous.data.id !== fresh.data.latestSubmissionId || previous.data.taskId !== draft.taskId) throw new Error('field_lineage_invalid');
        retained=previous.data.evidence??[];
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
          mediaType:c.mediaType,capturedAt:c.capturedAt,attemptChecklist:null}))],
        captureType:'MEASUREMENT',repaired:null,unrepairedReason:null,
      };
      cmd = {key:runtime.uuid(),body:JSON.parse(JSON.stringify(body)),ifMatch:fresh.etag,assignmentId:fresh.data.assignmentId!,phase:'pending'};
      draft.command = cmd; await persist(draft,runtime);
    } else if (cmd.phase === 'pending' && !replay) throw new Error('field_unknown_outcome_use_reconcile');
    if (cmd.phase === 'pending') {
      // Revalidate current assignment, but never replace the saved payload/If-Match on replay.
      const fresh = await guarded(draft,runtime,()=>runtime.api.getFieldInspectionTaskDetailReal(draft.projectId,draft.taskId));
      runtime.api.validateCrewTaskDetail(fresh.data,fresh.etag,draft.projectId,draft.taskId,draft.actor);
      if (fresh.data.assignmentId !== cmd.assignmentId) throw new Error('field_assignment_changed');
      try {
        const result = await guarded(draft,runtime,()=>runtime.api.submitFieldTaskReal(draft.projectId,draft.taskId,cmd!.body,cmd!.ifMatch,cmd!.key));
        if (!runtime.api.isCrewResourceId(result.data.id) || result.data.taskId !== draft.taskId) throw new Error('field_submission_identity_invalid');
        cmd.responseId = result.data.id; cmd.phase = 'acknowledged'; await persist(draft,runtime);
      } catch (error) {
        // A first request with a definitive rejection may be edited only after explicit acknowledgement.
        const status = (error as {response?:{status?:number}})?.response?.status;
        if (!replay && status && [400,401,403,404,412,422,428].includes(status)) {
          cmd.phase='rejected';cmd.rejectionStatus=status;await persist(draft,runtime);
        }
        throw error;
      }
    }
    const read = await guarded(draft,runtime,()=>runtime.api.getFieldSubmissionDetailReal(draft.projectId,draft.taskId,cmd!.responseId!));
    if (read.data.id !== cmd.responseId || read.data.taskId !== draft.taskId || !read.data.contentHash ||
        (read.data.parentId??null) !== (cmd.body.parentSubmissionId??null)) throw new Error('field_readback_mismatch');
    for (const evidence of cmd.body.evidence??[]) if (!(read.data.evidence??[]).some(e=>e.captureOriginId===evidence.captureOriginId && e.fileId===evidence.fileId && e.checksumSha256===evidence.checksumSha256 && e.purpose===evidence.purpose)) throw new Error('field_readback_mismatch');
    for (const measurement of cmd.body.measurements??[]) if (!(read.data.measurements??[]).some(m=>Object.entries(measurement).every(([key,value])=>(m[key as keyof crew.FieldMeasurementInput]??null)===(value??null)))) throw new Error('field_readback_mismatch');
    for (const c of draft.captures) {
      const e = await guarded(draft,runtime,()=>runtime.api.getFieldEvidenceReal(draft.projectId,draft.taskId,c.upload!.fileId));
      if (e.fileId !== c.upload!.fileId || e.state !== 'VERIFIED' || e.checksum !== c.checksum || e.mediaType !== c.mediaType || e.sizeBytes !== c.size) throw new Error('field_evidence_readback_mismatch');
    }
    const latest = await guarded(draft,runtime,()=>runtime.api.getFieldInspectionTaskDetailReal(draft.projectId,draft.taskId));
    runtime.api.validateCrewTaskDetail(latest.data,latest.etag,draft.projectId,draft.taskId,draft.actor);
    cmd.phase='confirmed';draft.result=read.data;await persist(draft,runtime);return draft;
  });
}

export function fieldErrorMessage(error: unknown): string {
  const status = (error as {response?:{status?:number}})?.response?.status;
  if (status === 401) return 'Phiên đăng nhập hết hiệu lực. Lệnh cũ được giữ để đối soát.';
  if (status === 403) return 'Không còn quyền trên nhiệm vụ hoặc bằng chứng này.';
  if (status === 409 || status === 412) return 'Dữ liệu hoặc phiên bản đã thay đổi. Tải lại và đối soát lệnh cũ.';
  const message=(error as Error)?.message;
  const messages: Record<string,string>={field_previous_session_requires_reconciliation:'Có nháp thuộc phiên đăng nhập cũ. Đã khóa gửi lại để tránh ghi trùng; cần đối soát hồ sơ cũ.',field_session_changed:'Phiên Crew đã thay đổi. Đã dừng thao tác.',field_verified_evidence_required:'Cần ảnh đã VERIFIED thực từ máy chủ trước khi gửi.',field_measurements_required:'Nhập số đo hoặc lý do chưa đo, dụng cụ, phương pháp và lý do thiếu GPS.',field_verification_pending:'Máy chủ đang xác minh ảnh. Tải lại trạng thái; chưa được gửi hồ sơ.',field_command_rejected:'Lệnh đã bị từ chối. Xem lỗi, tải lại rồi xác nhận tạo nháp mới.',field_unknown_outcome_use_reconcile:'Kết quả lệnh cũ chưa xác định. Dùng đối soát hoặc gửi lại đúng lệnh đã lưu.'};
  if (messages[message]) return messages[message];
  if (message && /[À-ỹ]/.test(message)) return message;
  return 'Chưa xác nhận được thao tác. Nháp và lệnh đã lưu được giữ nguyên; tải lại hoặc đối soát trước khi gửi mới.';
}
export async function downloadFieldPhoto(context: FieldContext,fileId: string): Promise<string> {
  const runtime=await openFieldRuntime(context);
  const metadata=await guarded(context,runtime,()=>crew.getFieldEvidenceReal(context.projectId,context.taskId,fileId));
  if(metadata.fileId!==fileId || metadata.state!=='VERIFIED' || !['image/jpeg','image/png'].includes(metadata.mediaType))throw new Error('field_file_not_verified');
  const bytes=await guarded(context,runtime,()=>crew.downloadFieldEvidenceReal(context.projectId,context.taskId,fileId));
  if(bytes.length!==metadata.sizeBytes || await guarded(context,runtime,()=>runtime.hash(bytes))!==metadata.checksum)throw new Error('field_checksum_mismatch');
  const file=new File(Paths.cache,`field-private-${randomUUID()}.${metadata.mediaType==='image/png'?'png':'jpg'}`);
  assertFieldContext(context,runtime);file.write(bytes);return file.uri;
}
