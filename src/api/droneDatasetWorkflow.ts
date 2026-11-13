import { useAuthStore } from '../store/auth';
import { apiClient } from './client';
import { passwordSessionIdentity } from './authApi';
import { cancelOperatorUploadReal, completeOperatorUploadReal, createOperatorUploadSessionReal, getOperatorUploadPartUrlsReal, getOperatorUploadSessionReal, getOperatorFileMetadataReal, putUploadPartBytesDirect, getOperatorDatasetReal, getOperatorDatasetCoverageReal, getOperatorSurveyTaskDetailReal, submitOperatorDatasetReal, type BandScopeDto, type UploadSessionResponseDto, type UploadPartUrlsResponseDto, type FileMetadataResponseDto, type SubmitDatasetRequestDto } from './droneApi';
import { openDroneUploadJournal, type DroneUploadIntent } from './droneTaskJournal';

// Neither a seed ID nor a user-entered UUID proves an active aircraft assignment.
// Also requires immutable durable upload/dataset commands before reopening writes.
export const DRONE_TASK_COMMAND_BLOCK_REASON = 'Tạm khóa nhận/từ chối nhiệm vụ vì chưa có cơ chế lưu bền vững yêu cầu và đối soát kết quả sau gián đoạn. Bạn vẫn có thể đọc nhiệm vụ và gói công việc.';

export const DRONE_DATASET_BLOCK_REASON = 'Chưa có nguồn thiết bị bay đang hoạt động và cơ chế khôi phục yêu cầu nộp dữ liệu. Chức năng tải lên/nộp dữ liệu đang tạm khóa; tệp đã chọn vẫn ở thiết bị.';

export const isDroneResourceId = (value: unknown): value is string => typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) && value !== '00000000-0000-0000-0000-000000000000';

/** Continuity check only; server independently grants reads. No persisted tokens/PII. */
export function operatorDatasetScope(): string | null {
  const state = useAuthStore.getState();
  const identity = passwordSessionIdentity(state.token);
  if (!identity || !isDroneResourceId(state.user?.id) || JSON.parse(identity)[0] !== state.user.id ||
      state.user.role_code !== 'DRONE_OPERATOR' || state.user.must_change_password ||
      !['AUTHENTICATED', 'REFRESHING'].includes(state.status)) return null;
  return JSON.stringify([apiClient.defaults.baseURL, identity]);
}

function requireScope(scope: string) {
  if (!scope || operatorDatasetScope() !== scope) throw Error('operator_session_changed');
}
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
function scopeKeys(scopes: BandScopeDto[]): string[] {
  if (!Array.isArray(scopes) || scopes.length === 0) throw Error('dataset_scope_missing');
  const keys = scopes.flatMap(s => {
    if (!s || !isDroneResourceId(s.routeVersionId) || !isDroneResourceId(s.segmentSetId) ||
        !['SURFACE', 'LEFT_EDGE', 'RIGHT_EDGE'].includes(s.targetBand) ||
        !Array.isArray(s.segmentIds) || s.segmentIds.length === 0 || !s.segmentIds.every(isDroneResourceId)) throw Error('dataset_scope_invalid');
    return s.segmentIds.map(segment => JSON.stringify([s.routeVersionId, s.segmentSetId, segment, s.targetBand]));
  });
  if (new Set(keys).size !== keys.length) throw Error('dataset_scope_duplicate');
  return keys.sort();
}

/** O-07/O-08 explicit GET readback. Never treats receipt/integrity as coverage PASS. */
export async function readOperatorDatasetReadback(scope: string, datasetId: string) {
  requireScope(scope);
  if (!isDroneResourceId(datasetId)) throw Error('invalid_dataset_id');
  let invalidated = false;
  const unsubscribe = useAuthStore.subscribe(() => { if (operatorDatasetScope() !== scope) invalidated = true; });
  const guard = () => { if (invalidated) throw Error('operator_session_changed'); requireScope(scope); };
  try {
  const first = await getOperatorDatasetReal(datasetId);
  guard();
  const dataset = first.data;
  const actorId = useAuthStore.getState().user?.id;
  if (!dataset || dataset.id !== datasetId || !isDroneResourceId(dataset.surveyTaskId) ||
      !isDroneResourceId(dataset.projectId) || !isDroneResourceId(dataset.dataVersionId) ||
      dataset.submittedBy !== actorId || !text(dataset.version) || first.etag !== `"${dataset.version}"` ||
      !text(dataset.integrityStatus) || !text(dataset.telemetryStatus)) throw Error('dataset_source_mismatch');
  const pins = scopeKeys(dataset.scope);
  const task = await getOperatorSurveyTaskDetailReal(dataset.surveyTaskId);
  guard();
  if (task.data?.id !== dataset.surveyTaskId || task.data.operatorId !== actorId ||
      task.data.projectId !== dataset.projectId || !text(task.data.version) || task.etag !== `"${task.data.version}"` ||
      !pins.every(pin => scopeKeys(task.data.scope).includes(pin))) throw Error('dataset_task_mismatch');
  const coverage = await getOperatorDatasetCoverageReal(datasetId);
  guard();
  if (!coverage || coverage.datasetId !== datasetId || !text(coverage.methodVersion) ||
      !Array.isArray(coverage.items) || !coverage.items.length ||
      coverage.items.some(item => !item || !text(item.positionCoverage) || !text(item.qualityCoverage) ||
        !text(item.overallCoverage) || !Array.isArray(item.reasons) || !item.reasons.every(text)) ||
      JSON.stringify(scopeKeys(coverage.items.map(item => item.scope))) !== JSON.stringify(pins)) throw Error('coverage_source_mismatch');
  const final = await getOperatorDatasetReal(datasetId);
  guard();
  if (final.data?.id !== datasetId || final.data.version !== dataset.version || final.etag !== first.etag ||
      final.data.projectId !== dataset.projectId || final.data.surveyTaskId !== dataset.surveyTaskId ||
      final.data.submittedBy !== actorId || JSON.stringify(scopeKeys(final.data.scope)) !== JSON.stringify(pins)) throw Error('dataset_source_changed');
  return { dataset, coverage };
  } finally { unsubscribe(); }
}

export type DroneUploadPartInput = { partNumber: number; sizeBytes: number; read: () => Promise<Uint8Array> };
export type DroneUploadTransport = {
  readTask: typeof getOperatorSurveyTaskDetailReal;
  createSession: typeof createOperatorUploadSessionReal;
  getSession: typeof getOperatorUploadSessionReal;
  getPartUrls: typeof getOperatorUploadPartUrlsReal;
  putPart: typeof putUploadPartBytesDirect;
  complete: typeof completeOperatorUploadReal;
  getMetadata: typeof getOperatorFileMetadataReal;
};
export type DroneUploadPlan = {
  taskId: string; projectId: string; targetId: string; file: { id: string; uri: string; name: string; sizeBytes: number; checksumSha256: string; purpose: 'SURVEY_VIDEO'|'TELEMETRY'; mediaType: 'video/mp4'|'application/x-subrip' };
  taskVersion: string; parts?: DroneUploadPartInput[];
  readRange?: (offset: number, length: number) => Promise<Uint8Array>;
  onProgress?: (sent: number, total: number) => void;
};
const realDroneUploadTransport: DroneUploadTransport = { readTask: getOperatorSurveyTaskDetailReal, createSession: createOperatorUploadSessionReal, getSession: getOperatorUploadSessionReal, getPartUrls: getOperatorUploadPartUrlsReal, putPart: putUploadPartBytesDirect, complete: completeOperatorUploadReal, getMetadata: getOperatorFileMetadataReal };
const uploadErrorStatus = (error: unknown): number | undefined => typeof error === 'object' && error !== null && 'response' in error && typeof (error as { response?: { status?: unknown } }).response?.status === 'number' ? (error as { response: { status: number } }).response.status : undefined;
const isUncertain = (error: unknown) => uploadErrorStatus(error) === undefined || (uploadErrorStatus(error) ?? 0) >= 500 || [408,429].includes(uploadErrorStatus(error) ?? 0);
function ensureStatus(status: string, allowed: string[]): void { if (!allowed.includes(status)) throw Error(`drone_upload_state_${status}`); }

const activeUploads = new Set<string>();
/** Foreground multipart transfer; all commands are retained before sending. */
export async function orchestrateDroneUpload(plan: DroneUploadPlan, transport: DroneUploadTransport = realDroneUploadTransport): Promise<DroneUploadIntent> {
  if (!isDroneResourceId(plan.taskId) || !isDroneResourceId(plan.projectId) || plan.targetId !== plan.taskId || !text(plan.taskVersion) || !isDroneResourceId(plan.file.id) || !text(plan.file.uri) || !text(plan.file.name) || !Number.isSafeInteger(plan.file.sizeBytes) || plan.file.sizeBytes <= 0 || !/^[a-f0-9]{64}$/.test(plan.file.checksumSha256) || !(plan.file.purpose === 'SURVEY_VIDEO' ? plan.file.mediaType === 'video/mp4' : plan.file.purpose === 'TELEMETRY' && plan.file.mediaType === 'application/x-subrip') || (!plan.readRange && !plan.parts?.length)) throw Error('drone_upload_plan_invalid');
  const scope = operatorDatasetScope(); if (!scope) throw Error('operator_session_invalid');
  let invalid = false;
  const unsubscribe = useAuthStore.subscribe(() => { if (operatorDatasetScope() !== scope) invalid = true; });
  const guard = () => { if (invalid) throw Error('operator_session_changed'); requireScope(scope); };
  const lock = JSON.stringify([scope, plan.taskId]);
  if (activeUploads.has(lock)) { unsubscribe(); throw Error('drone_upload_busy'); }
  activeUploads.add(lock);
  let journal: Awaited<ReturnType<typeof openDroneUploadJournal>> | undefined;
  try {
    const currentTask = await transport.readTask(plan.taskId); guard();
    const actorId = useAuthStore.getState().user?.id;
    if (currentTask.data?.id !== plan.taskId || currentTask.data.operatorId !== actorId || currentTask.data.projectId !== plan.projectId || !['ACCEPTED','IN_PROGRESS'].includes(currentTask.data.status) || currentTask.data.version !== plan.taskVersion || currentTask.etag !== `"${plan.taskVersion}"`) throw Error('drone_upload_assignment_changed');
    journal = await openDroneUploadJournal(plan.taskId); guard();
    const body = { projectId: plan.projectId, targetId: plan.targetId, fileName: plan.file.name, mediaType: plan.file.mediaType, sizeBytes: plan.file.sizeBytes, checksumSha256: plan.file.checksumSha256 };
    let intent = await journal.prepare({ kind: 'upload', projectId: plan.projectId, localFileId: plan.file.id, localUri: plan.file.uri, sizeBytes: plan.file.sizeBytes, checksumSha256: plan.file.checksumSha256, purpose: plan.file.purpose, mimeType: plan.file.mediaType, version: plan.taskVersion, ifMatch: `"${plan.taskVersion}"`, body }); guard();
    ensureStatus(intent.status, ['PREPARED','SESSION_CREATED','PARTS_IN_PROGRESS','COMPLETE_UNKNOWN','VERIFY_PENDING','VERIFIED']);
    const update = async (patch: Parameters<NonNullable<typeof journal>['update']>[1]) => { guard(); intent = await journal!.update(intent.key, patch); guard(); return intent; };
    // A lost create can be recovered only by replaying its original key/body.
    if (!intent.uploadId) {
      try {
        const created = await transport.createSession({ purpose: plan.file.purpose, ...body }, intent.key); guard();
        if (!isDroneResourceId(created.id) || !isDroneResourceId(created.fileId) || !text(created.version) || created.status === 'FAILED') throw Error('drone_upload_session_invalid');
        await update({ status: 'SESSION_CREATED', uploadId: created.id, fileId: created.fileId, version: created.version, ifMatch: `"${created.version}"`, error: null });
      } catch (error) { guard(); await update({ status: isUncertain(error) ? 'COMPLETE_UNKNOWN' : 'FAILED', error: { status: uploadErrorStatus(error), code: isUncertain(error) ? 'transport_unknown' : 'upload_session_rejected' } }); throw error; }
    }
    const readSession = async () => {
      const value = await transport.getSession(intent.uploadId!); guard();
      if (value.id !== intent.uploadId || value.fileId !== intent.fileId || !text(value.version)) throw Error('drone_upload_session_invalid');
      if (value.status === 'FAILED') { await update({status:'FAILED',error:{code:value.failureCode ?? 'upload_failed'}}); throw Error('drone_upload_failed'); }
      return value;
    };
    let session = await readSession();
    // A completion was prepared before POST: never upload its bytes again.
    if (!['VERIFIED','VERIFYING'].includes(session.status) && intent.completeRequest) {
      const command = intent.completeRequest;
      try { guard(); await transport.complete(intent.uploadId!, {parts:command.parts,checksumSha256:command.checksumSha256}, command.version, intent.key); guard(); await update({status:'VERIFY_PENDING'}); }
      catch (error) { guard(); await update({status:isUncertain(error)?'COMPLETE_UNKNOWN':'FAILED',error:{status:uploadErrorStatus(error),code:'complete_transport_unknown'}}); throw error; }
      session = await readSession();
    } else if (!['VERIFIED','VERIFYING'].includes(session.status)) {
      if (intent.status === 'VERIFY_PENDING' || intent.status === 'VERIFIED' || (intent.status === 'COMPLETE_UNKNOWN' && intent.error?.code === 'complete_transport_unknown')) throw Error('drone_upload_completion_requires_review');
      const partSize = session.partSizeBytes;
      if (!Number.isSafeInteger(partSize) || partSize <= 0 || partSize > 64 * 1024 ** 2) throw Error('drone_upload_part_size_invalid');
      const count = Math.ceil(plan.file.sizeBytes / partSize);
      if (count > 10000) throw Error('drone_upload_parts_invalid');
      const parts: DroneUploadPartInput[] = Array.from({length:count}, (_,i) => {
        const offset=i*partSize, sizeBytes=Math.min(partSize,plan.file.sizeBytes-offset);
        const given=plan.parts?.find(p=>p.partNumber===i+1);
        if (!plan.readRange && (!given || given.sizeBytes!==sizeBytes)) throw Error('drone_upload_parts_invalid');
        return {partNumber:i+1,sizeBytes,read:()=>plan.readRange ? plan.readRange(offset,sizeBytes) : given!.read()};
      });
      // URL admission can initialize multipart storage and advance its version.
      const urls = await transport.getPartUrls(intent.uploadId!, parts.map(p=>p.partNumber), intent.key); guard();
      const byNumber = new Map(urls.parts.map(p=>[p.partNumber,p]));
      if (byNumber.size !== parts.length || urls.parts.length !== parts.length) throw Error('drone_upload_part_url_invalid');
      const uploaded: typeof intent.parts = [];
      for (const part of parts) {
        guard(); const url=byNumber.get(part.partNumber);
        if (!url || !/^https?:\/\//.test(url.url) || !text(url.expiresAt)) throw Error('drone_upload_part_url_invalid');
        const bytes=await part.read(); guard();
        if (bytes.byteLength!==part.sizeBytes) throw Error('drone_upload_part_size_changed');
        try {
          const etag=await transport.putPart(url.url,bytes,plan.file.mediaType); guard();
          if (!text(etag)) throw Error('drone_upload_part_etag_missing');
          uploaded.push({partNumber:part.partNumber,sizeBytes:part.sizeBytes,etag});
          await update({status:'PARTS_IN_PROGRESS',parts:[...uploaded]});
          plan.onProgress?.(uploaded.reduce((n,p)=>n+p.sizeBytes,0),plan.file.sizeBytes);
        } catch(error) { guard(); await update({status:isUncertain(error)?'COMPLETE_UNKNOWN':'FAILED',error:{status:uploadErrorStatus(error),code:'part_transport_unknown'}}); throw error; }
      }
      session=await readSession();
      const completeRequest={version:session.version,parts:uploaded.map(({partNumber,etag})=>({partNumber,etag})),checksumSha256:plan.file.checksumSha256};
      await update({status:'COMPLETE_UNKNOWN',completeRequest,version:session.version,ifMatch:`"${session.version}"`});
      try { guard(); await transport.complete(intent.uploadId!,{parts:completeRequest.parts,checksumSha256:completeRequest.checksumSha256},completeRequest.version,intent.key); guard(); await update({status:'VERIFY_PENDING'}); }
      catch(error) { guard(); await update({status:isUncertain(error)?'COMPLETE_UNKNOWN':'FAILED',error:{status:uploadErrorStatus(error),code:'complete_transport_unknown'}}); throw error; }
      session=await readSession();
    }
    if (session.status!=='VERIFIED') { await update({status:'VERIFY_PENDING'}); throw Error('drone_upload_verify_pending'); }
    const metadata=await transport.getMetadata(intent.fileId!); guard();
    if (metadata.id!==intent.fileId || metadata.status!=='VERIFIED' || metadata.checksumSha256!==plan.file.checksumSha256 || metadata.sizeBytes!==plan.file.sizeBytes || metadata.mediaType!==plan.file.mediaType) throw Error('drone_upload_metadata_mismatch');
    return await update({status:'VERIFIED',receipt:{uploadId:session.id,fileId:metadata.id,status:metadata.status,checksumSha256:metadata.checksumSha256},error:null});
  } finally { journal?.close(); unsubscribe(); activeUploads.delete(lock); }
}

export type DroneUploadCancelTransport = {
  cancel: typeof cancelOperatorUploadReal;
  getSession: typeof getOperatorUploadSessionReal;
};
const realDroneUploadCancelTransport: DroneUploadCancelTransport = {
  cancel: cancelOperatorUploadReal,
  getSession: getOperatorUploadSessionReal,
};

/**
 * Explicit Operator recovery action. It only cancels an existing durable
 * upload identity; it never creates a replacement session or changes its key.
 */
export async function cancelOperatorUploadSession(
  taskId: string,
  uploadId: string,
  transport: DroneUploadCancelTransport = realDroneUploadCancelTransport,
): Promise<DroneUploadIntent> {
  if (!isDroneResourceId(taskId) || !isDroneResourceId(uploadId)) throw Error('drone_upload_cancel_input_invalid');
  if (!operatorDatasetScope()) throw Error('operator_session_invalid');
  const journal = await openDroneUploadJournal(taskId);
  try {
    const items = await journal.read('upload');
    const intent = items.find(item => item.uploadId === uploadId);
    if (!intent) throw Error('drone_upload_cancel_intent_missing');
    try {
      const receipt = await transport.cancel(uploadId);
      if (receipt.id !== uploadId || receipt.status !== 'FAILED' || receipt.failureCode !== 'upload_cancelled') throw Error('drone_upload_cancel_receipt_invalid');
      return journal.update(intent.key, { status: 'FAILED', error: { status: 200, code: 'upload_cancelled' } });
    } catch (error) {
      const status = uploadErrorStatus(error);
      if (status === 409) {
        const observed = await transport.getSession(uploadId);
        const nextStatus = observed.status === 'VERIFIED' ? 'VERIFY_PENDING' : intent.status;
        const next = await journal.update(intent.key, { status: nextStatus, error: { status, code: 'upload_not_cancellable' } });
        throw Object.assign(new Error('upload_not_cancellable'), { response: { status, data: { code: 'upload_not_cancellable' } }, intent: next });
      }
      const code = status === 401 ? 'cancel_auth_required' : status === 403 ? 'cancel_access_forbidden' : status === 404 ? 'upload_session_not_found' : isUncertain(error) ? 'cancel_unknown' : 'cancel_rejected';
      await journal.update(intent.key, { error: { status, code } });
      throw error;
    }
  } finally {
    journal.close();
  }
}

export type DroneDatasetPlan = { taskId: string; projectId: string; ifMatch: string; payload: SubmitDatasetRequestDto };
export type DroneDatasetTransport = {
  submitDataset: typeof submitOperatorDatasetReal;
  readTask: typeof getOperatorSurveyTaskDetailReal;
};
const realDroneDatasetTransport: DroneDatasetTransport = { submitDataset: submitOperatorDatasetReal, readTask: getOperatorSurveyTaskDetailReal };
const strongIfMatch = (value: string): string => `"${value.trim().replace(/^"+|"+$/g, '')}"`;
const sameJson = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function validateDatasetPlan(plan: DroneDatasetPlan): void {
  if (!isDroneResourceId(plan.taskId) || !isDroneResourceId(plan.projectId) || !text(plan.ifMatch) ||
      !plan.payload || !Array.isArray(plan.payload.videoFileIds) || !plan.payload.videoFileIds.length || !plan.payload.videoFileIds.every(isDroneResourceId) ||
      !Array.isArray(plan.payload.telemetryFileIds) || !plan.payload.telemetryFileIds.every(isDroneResourceId) || !text(plan.payload.recordedAt) ||
      !isDroneResourceId(plan.payload.deviceId) || !Array.isArray(plan.payload.scope) || !plan.payload.scope.length) throw Error('drone_dataset_plan_invalid');
  scopeKeys(plan.payload.scope);
}
function datasetIntentInput(plan: DroneDatasetPlan) {
  return { kind: 'dataset' as const, projectId: plan.projectId, version: plan.ifMatch.trim().replace(/^"+|"+$/g, ''), ifMatch: strongIfMatch(plan.ifMatch), body: plan.payload as unknown as Record<string, unknown> };
}
function datasetResponseError(status: number, code: string): Error & { response: { status: number; data: { code: string } } } {
  const error = new Error(code) as Error & { response: { status: number; data: { code: string } } };
  error.response = { status, data: { code } };
  return error;
}
async function sendDatasetIntent(journal: Awaited<ReturnType<typeof openDroneUploadJournal>>, intent: DroneUploadIntent, transport: DroneDatasetTransport, replay: boolean): Promise<DroneUploadIntent> {
  if (intent.kind !== 'DRONE_DATASET_INTENT' || (replay ? intent.status !== 'DATASET_UNKNOWN' : !['PREPARED', 'DATASET_UNKNOWN'].includes(intent.status))) throw Error('drone_dataset_intent_not_dispatchable');
  if (!intent.ifMatch || !intent.body || !isDroneResourceId(intent.projectId)) throw Error('drone_dataset_intent_invalid');
  try {
    const response = await transport.submitDataset(intent.taskId, intent.body as unknown as SubmitDatasetRequestDto, intent.ifMatch, intent.key);
    if (!response?.data || !isDroneResourceId(response.data.id) || response.data.surveyTaskId !== intent.taskId || !text(response.etag)) throw Error('drone_dataset_receipt_invalid');
    return journal.update(intent.key, { status: 'DATASET_CONFIRMED', receipt: { datasetId: response.data.id, surveyTaskId: response.data.surveyTaskId, etag: response.etag, replayed: replay } });
  } catch (error) {
    const status = uploadErrorStatus(error);
    if (status === 409) { await journal.update(intent.key, { status: 'CONFLICT', error: { status, code: 'idempotency_key_reused' } }); throw error; }
    if (status === 412) {
      try { await transport.readTask(intent.taskId); } catch { /* readback is evidence only; keep the original 412 */ }
      await journal.update(intent.key, { status: 'CONFLICT', error: { status, code: 'task_version_changed' } }); throw error;
    }
    const uncertain = isUncertain(error);
    await journal.update(intent.key, { status: uncertain ? 'DATASET_UNKNOWN' : 'FAILED', error: { status, code: uncertain ? 'dataset_transport_unknown' : 'dataset_submission_rejected' } });
    throw error;
  }
}

/** Persist the immutable dataset body/key/version. This function does not call the network. */
export async function prepareDroneDatasetIntent(plan: DroneDatasetPlan): Promise<DroneUploadIntent> {
  validateDatasetPlan(plan);
  if (!operatorDatasetScope()) throw Error('operator_session_invalid');
  const journal = await openDroneUploadJournal(plan.taskId);
  try { return await journal.prepare(datasetIntentInput(plan)); } finally { journal.close(); }
}

/** Initial dataset submission path for tests/future wiring; UI remains blocked in Part 1. */
export async function submitDroneDataset(plan: DroneDatasetPlan, transport: DroneDatasetTransport = realDroneDatasetTransport): Promise<DroneUploadIntent> {
  validateDatasetPlan(plan);
  if (!operatorDatasetScope()) throw Error('operator_session_invalid');
  const journal = await openDroneUploadJournal(plan.taskId);
  try {
    const intent = await journal.prepare(datasetIntentInput(plan));
    return await sendDatasetIntent(journal, intent, transport, false);
  } finally { journal.close(); }
}

/** Explicit replay only: uses the stored dataset body, key and original If-Match. */
export async function replayDroneDataset(plan: DroneDatasetPlan, transport: DroneDatasetTransport = realDroneDatasetTransport): Promise<DroneUploadIntent> {
  validateDatasetPlan(plan);
  if (!operatorDatasetScope()) throw Error('operator_session_invalid');
  const journal = await openDroneUploadJournal(plan.taskId);
  try {
    const intents = await journal.read('dataset');
    if (intents.length !== 1) throw Error('drone_dataset_intent_missing');
    const intent = intents[0];
    // Replay always uses the stored original If-Match. The caller may have read a newer task version after the lost ACK.
    if (intent.projectId !== plan.projectId || !sameJson(intent.body, plan.payload)) throw datasetResponseError(409, 'idempotency_key_reused');
    return await sendDatasetIntent(journal, intent, transport, true);
  } finally { journal.close(); }
}
