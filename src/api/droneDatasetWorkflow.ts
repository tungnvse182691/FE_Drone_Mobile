import { useAuthStore } from '../store/auth';
import { apiClient } from './client';
import { passwordSessionIdentity } from './authApi';
import { completeOperatorUploadReal, createOperatorUploadSessionReal, getOperatorUploadPartUrlsReal, getOperatorUploadSessionReal, getOperatorFileMetadataReal, putUploadPartBytesDirect, getOperatorDatasetReal, getOperatorDatasetCoverageReal, getOperatorSurveyTaskDetailReal, submitOperatorDatasetReal, type BandScopeDto, type UploadSessionResponseDto, type UploadPartUrlsResponseDto, type FileMetadataResponseDto, type SubmitDatasetRequestDto } from './droneApi';
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
  taskVersion: string; parts: DroneUploadPartInput[];
};
const realDroneUploadTransport: DroneUploadTransport = { readTask: getOperatorSurveyTaskDetailReal, createSession: createOperatorUploadSessionReal, getSession: getOperatorUploadSessionReal, getPartUrls: getOperatorUploadPartUrlsReal, putPart: putUploadPartBytesDirect, complete: completeOperatorUploadReal, getMetadata: getOperatorFileMetadataReal };
const uploadErrorStatus = (error: unknown): number | undefined => typeof error === 'object' && error !== null && 'response' in error && typeof (error as { response?: { status?: unknown } }).response?.status === 'number' ? (error as { response: { status: number } }).response.status : undefined;
const isUncertain = (error: unknown) => uploadErrorStatus(error) === undefined || (uploadErrorStatus(error) ?? 0) >= 500 || [408,429].includes(uploadErrorStatus(error) ?? 0);
function ensureStatus(status: string, allowed: string[]): void { if (!allowed.includes(status)) throw Error(`drone_upload_state_${status}`); }

/** Isolated upload state machine. It is intentionally not called by upload.tsx or any UI/network hook. */
export async function orchestrateDroneUpload(plan: DroneUploadPlan, transport: DroneUploadTransport = realDroneUploadTransport): Promise<DroneUploadIntent> {
  if (!isDroneResourceId(plan.taskId) || !isDroneResourceId(plan.projectId) || !isDroneResourceId(plan.targetId) || !text(plan.taskVersion) || !isDroneResourceId(plan.file.id) || !text(plan.file.uri) || !text(plan.file.name) || !Number.isSafeInteger(plan.file.sizeBytes) || plan.file.sizeBytes <= 0 || !/^[a-f0-9]{64}$/.test(plan.file.checksumSha256) || !['SURVEY_VIDEO', 'TELEMETRY'].includes(plan.file.purpose) || !['video/mp4', 'application/x-subrip'].includes(plan.file.mediaType) || !plan.parts.length || plan.parts.some(part => !Number.isSafeInteger(part.partNumber) || part.partNumber < 1 || !Number.isSafeInteger(part.sizeBytes) || part.sizeBytes <= 0)) throw Error('drone_upload_plan_invalid');
  const orderedParts = [...plan.parts].sort((a, b) => a.partNumber - b.partNumber);
  if (orderedParts.some((part, index) => part.partNumber !== index + 1) || orderedParts.reduce((sum, part) => sum + part.sizeBytes, 0) !== plan.file.sizeBytes) throw Error('drone_upload_parts_invalid');
  if (!operatorDatasetScope()) throw Error('operator_session_invalid');
  const currentTask = await transport.readTask(plan.taskId);
  const actorId = useAuthStore.getState().user?.id;
  if (!currentTask || currentTask.data?.id !== plan.taskId || currentTask.data.operatorId !== actorId || currentTask.data.projectId !== plan.projectId || currentTask.data.version !== plan.taskVersion || currentTask.etag !== `"${plan.taskVersion}"`) throw Error('drone_upload_assignment_changed');
  const journal = await openDroneUploadJournal(plan.taskId);
  try {
    const body = { projectId: plan.projectId, targetId: plan.targetId, fileName: plan.file.name, mediaType: plan.file.mediaType, sizeBytes: plan.file.sizeBytes, checksumSha256: plan.file.checksumSha256 };
    let intent = await journal.prepare({ kind: 'upload', projectId: plan.projectId, localFileId: plan.file.id, localUri: plan.file.uri, sizeBytes: plan.file.sizeBytes, checksumSha256: plan.file.checksumSha256, purpose: plan.file.purpose, mimeType: plan.file.mediaType, version: plan.taskVersion, ifMatch: `"${plan.taskVersion}"`, body });
    ensureStatus(intent.status, ['PREPARED','SESSION_CREATED','PARTS_IN_PROGRESS','COMPLETE_UNKNOWN','VERIFY_PENDING']);
    if (intent.status === 'COMPLETE_UNKNOWN' && !intent.uploadId) throw Error('drone_upload_session_unknown');
    if (intent.status === 'PREPARED') {
      let session: UploadSessionResponseDto;
      try { session = await transport.createSession({ purpose: plan.file.purpose, projectId: plan.projectId, targetId: plan.targetId, fileName: plan.file.name, mediaType: plan.file.mediaType, sizeBytes: plan.file.sizeBytes, checksumSha256: plan.file.checksumSha256 }, intent.key); }
      catch (error) { await journal.update(intent.key, { status: isUncertain(error) ? 'COMPLETE_UNKNOWN' : 'FAILED', error: { status: uploadErrorStatus(error), code: isUncertain(error) ? 'transport_unknown' : 'upload_session_rejected' } }); throw error; }
      if (!session.id || !session.fileId || !text(session.version) || session.status === 'FAILED') throw Error('drone_upload_session_invalid');
      intent = await journal.update(intent.key, { status: 'SESSION_CREATED', uploadId: session.id, fileId: session.fileId, version: session.version, ifMatch: `"${session.version}"` });
    }
    const session = await transport.getSession(intent.uploadId!); if (!session.id || session.id !== intent.uploadId || !text(session.version)) throw Error('drone_upload_session_invalid');
    const partNumbers = orderedParts.map(part => part.partNumber);
    const urls: UploadPartUrlsResponseDto = await transport.getPartUrls(intent.uploadId!, partNumbers, intent.key);
    const byNumber = new Map(urls.parts.map(part => [part.partNumber, part])); const uploaded = [] as Array<{ partNumber: number; etag: string }>;
    for (const planPart of orderedParts) {
      const partUrl = byNumber.get(planPart.partNumber); if (!partUrl || !text(partUrl.url) || !text(partUrl.expiresAt)) throw Error('drone_upload_part_url_invalid');
      const bytes = await planPart.read(); if (bytes.byteLength !== planPart.sizeBytes) throw Error('drone_upload_part_size_changed');
      try { const etag = await transport.putPart(partUrl.url, bytes, plan.file.mediaType); if (!etag.trim()) throw Error('drone_upload_part_etag_missing'); uploaded.push({ partNumber: planPart.partNumber, etag }); intent = await journal.update(intent.key, { status: 'PARTS_IN_PROGRESS', parts: [...uploaded].map(part => ({ ...part, sizeBytes: plan.parts.find(p => p.partNumber === part.partNumber)!.sizeBytes })) }); }
      catch (error) { await journal.update(intent.key, { status: isUncertain(error) ? 'COMPLETE_UNKNOWN' : 'FAILED', error: { status: uploadErrorStatus(error), code: isUncertain(error) ? 'part_transport_unknown' : 'part_upload_failed' } }); throw error; }
    }
    let completed: UploadSessionResponseDto;
    try { completed = await transport.complete(intent.uploadId!, { parts: uploaded, checksumSha256: plan.file.checksumSha256 }, intent.version!, intent.key); }
    catch (error) { await journal.update(intent.key, { status: isUncertain(error) ? 'COMPLETE_UNKNOWN' : 'FAILED', error: { status: uploadErrorStatus(error), code: isUncertain(error) ? 'complete_transport_unknown' : 'complete_rejected' } }); throw error; }
    intent = await journal.update(intent.key, { status: completed.status === 'VERIFIED' ? 'VERIFY_PENDING' : 'COMPLETE_UNKNOWN' });
    if (intent.status === 'COMPLETE_UNKNOWN') intent = await journal.update(intent.key, { status: 'VERIFY_PENDING' });
    const observed = await transport.getSession(intent.uploadId!); if (observed.status !== 'VERIFIED') throw Error('drone_upload_verify_pending');
    const metadata: FileMetadataResponseDto = await transport.getMetadata(intent.fileId!);
    if (metadata.id !== intent.fileId || metadata.status !== 'VERIFIED' || metadata.checksumSha256 !== plan.file.checksumSha256 || metadata.sizeBytes !== plan.file.sizeBytes || metadata.mediaType !== plan.file.mediaType) throw Error('drone_upload_metadata_mismatch');
    return journal.update(intent.key, { status: 'VERIFIED', receipt: { uploadId: observed.id, fileId: metadata.id, status: metadata.status, checksumSha256: metadata.checksumSha256 } });
  } finally { journal.close(); }
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
