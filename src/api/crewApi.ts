/**
 * crewApi.ts — Gọi các endpoint Crew & Field Inspection thật của RoadGuard Backend.
 *
 * Paths đã xác minh từ code BE và đo thật bằng PowerShell:
 *   API-037 GET  /me/inspection-tasks
 *   API-078 GET  /projects/{projectId}/field-inspection-tasks
 *   API-080 GET  /projects/{projectId}/field-inspection-tasks/{taskId}
 *   API-081 POST /projects/{projectId}/field-inspection-tasks/{taskId}/accept
 *   API-091 POST /projects/{projectId}/field-inspection-tasks/{taskId}/reject
 *   API-093 POST /projects/{projectId}/field-inspection-tasks/{taskId}/start
 *   API-095 POST /projects/{projectId}/field-inspection-tasks/{taskId}/submissions
 *   API-096 GET  /projects/{projectId}/field-inspection-tasks/{taskId}/submissions/{submissionId}
 *   API-146 GET  /projects/{projectId}/repair-packages/{packageId}/items/{itemId}/eligibility
 *   API-156 POST /projects/{projectId}/repair-packages/{packageId}/items/{itemId}/tasks/{taskId}/assessment
 *   API-157 POST /projects/{projectId}/repair-packages/{packageId}/items/{itemId}/tasks/{taskId}/execution-start
 *   API-159 POST /projects/{projectId}/repair-packages/{packageId}/items/{itemId}/tasks/{taskId}/execution-finish
 *   API-160 POST /projects/{projectId}/repair-packages/{packageId}/items/{itemId}/tasks/{taskId}/attempts
 *   API-161 POST /projects/{projectId}/repair-packages/{packageId}/items/{itemId}/tasks/{taskId}/attempts/supplements
 *
 * Crew uploads (khác Reporter):
 *   POST /uploads                                    (tạo session với Purpose BEFORE/AFTER/MEASUREMENT)
 *   GET  /uploads/{uploadId}                         (lấy session & version mới)
 *   POST /uploads/{uploadId}/part-urls               (lấy presigned S3/MinIO URLs)
 *   PUT  <part-url>                                  (tải bytes trực tiếp lên storage)
 *   POST /uploads/{uploadId}/complete                (kèm parts + checksumSha256, If-Match = sessionVersion)
 *   GET  /files/{fileId}                             (kiểm tra file VERIFIED)
 *
 * Quy tắc If-Match:
 *   LUÔN gửi dạng strong ETag: `"${version}"`.
 *   409 hoặc 412 concurrency_conflict → bật conflict UI.
 *   400 validation_error → kiểm tra fallback (re-fetch detail, so sánh version).
 */

import axios, { type AxiosError } from 'axios';
import { apiClient } from './client';
import { parseProblemDetails, type ParsedProblemDetails } from './problemDetails';
import type { CrewFieldTaskCard } from './mock/field-tasks';
import type { TaskMode } from '../types/enums';

/** UI projection: unknown fields stay absent; never manufacture business facts. */
export type CrewTask = Omit<CrewFieldTaskCard, 'coordinates' | 'task_mode' | 'defect_type_code'> & {
  projectId: string; version: string; crewId: string; status: string; rawMode: string;
  task_mode: TaskMode | 'UNKNOWN'; defect_type_code: string;
  coordinates: { latitude: number; longitude: number } | null;
  detail?: FieldTaskViewFact; etag?: string;
};
export type OperationalCrewTask = CrewTask & CrewFieldTaskCard;
export function isCrewResourceId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) &&
    value !== '00000000-0000-0000-0000-000000000000';
}
export function validateCrewTaskIdentity(item: { id: string; projectId: string; crewId: string; version: string }, actorId: string): void {
  if (!isCrewResourceId(item.id) || !isCrewResourceId(item.projectId) || !isCrewResourceId(item.crewId) ||
      item.crewId.toLowerCase() !== actorId.toLowerCase() || !item.version?.trim()) throw new Error('crew_identity_invalid');
}
export function validateCrewTaskDetail(item: FieldTaskViewFact, etag: string, projectId: string, taskId: string, actorId: string): void {
  validateCrewTaskIdentity({ ...item, crewId: item.assignedToUserId ?? '', version: item.version ?? '' }, actorId);
  if (item.id.toLowerCase() !== taskId.toLowerCase() || item.projectId.toLowerCase() !== projectId.toLowerCase() ||
      !etag || etag !== `"${item.version}"`) throw new Error('crew_version_or_identity_invalid');
}
export function crewTaskFromWire(item: InspectionTaskResponseDto, detail?: FieldTaskViewFact, etag?: string): CrewTask {
  const rawMode = detail?.mode ?? item.mode;
  return {
    id: item.id, projectId: item.projectId, version: detail?.version ?? item.version, crewId: item.crewId,
    status: detail?.status ?? item.status, rawMode,
    task_mode: (['MEASURE_ONLY','INSPECT_AND_REPAIR','INSPECT_ONLY'].includes(rawMode) ? rawMode : 'UNKNOWN') as CrewTask['task_mode'],
    wo_code: '', title: '', defect_type_code: '', coordinates: null,
    route_code: '', section_name: '', chainage: '', locality: '', due_label: detail?.dueAt ?? '',
    due_urgency: 'normal', distance_label: '', defect_location: '', description: detail?.instructions ?? '',
    repair_method: '', safety_note: '', batch_size: item.defectIds.length, detail, etag,
  };
}
export function crewTaskIsComplete(task: { status: string }): boolean { return task.status.toUpperCase() === 'COMPLETED'; }
export function crewTaskActionBlock(task: CrewTask | null): string | null {
  if (!task || !task.projectId || !task.id || !task.version || !task.etag) return 'Chưa có định danh hoặc phiên bản nhiệm vụ hợp lệ.';
  if (!task.coordinates || !Number.isFinite(task.coordinates.latitude) || !Number.isFinite(task.coordinates.longitude) ||
      Math.abs(task.coordinates.latitude) > 90 || Math.abs(task.coordinates.longitude) > 180) return 'Máy chủ chưa cung cấp tọa độ hiện trường; chưa thể mở thao tác này.';
  if (task.task_mode === 'UNKNOWN' || !task.defect_type_code || !task.wo_code) return 'Chưa đủ dữ liệu tác nghiệp từ máy chủ. Chỉ có thể xem thông tin nhiệm vụ.';
  return null;
}
export function crewInboxOptions(scope: string) {
  return {
    queryKey: ['crew-inbox', scope], initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }: { pageParam: string | null; signal: AbortSignal }) => listCrewInspectionTasksReal(pageParam, 50, signal),
    getNextPageParam: (page: InspectionTaskPageResponseDto, _pages: InspectionTaskPageResponseDto[], _last: string | null, cursors: (string | null)[]) =>
      page.nextCursor && !cursors.includes(page.nextCursor) ? page.nextCursor : undefined,
    retry: false as const, gcTime: 0,
  };
}
/** API-078 uses an afterId UUID, not the API-037 opaque cursor. */
export async function listProjectCrewTasksReal(projectId: string, afterId?: string | null, limit = 50, signal?: AbortSignal): Promise<{ items: FieldTaskViewFact[]; nextCursor: string | null }> {
  if (!isCrewResourceId(projectId) || (afterId && !isCrewResourceId(afterId))) throw new Error('crew_identity_missing');
  const response = await apiClient.get(`/projects/${projectId}/field-inspection-tasks`, { params: { afterId: afterId || undefined, limit }, signal });
  return response.data;
}

// =============================================================================
// TYPES & DTOs
// =============================================================================

/** Item trả về từ GET /api/v1/me/inspection-tasks (API-037). */
export interface InspectionTaskResponseDto {
  id: string;
  projectId: string;
  defectIds: string[];
  mode: string;
  crewId: string;
  policyVersionId: string | null;
  status: string;
  version: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/** Phân trang từ GET /api/v1/me/inspection-tasks (API-037). */
export interface InspectionTaskPageResponseDto {
  items: InspectionTaskResponseDto[];
  nextCursor: string | null;
  asOf: string;
}

/** Ngữ cảnh sửa chữa gắn kèm nhiệm vụ kiểm tra hiện trường (nếu có). */
export interface CrewRepairContext {
  packageId: string;
  itemId: string;
  bindingId: string;
  mode: string;
  status: string;
  itemVersion: string;
  repairPlan: string;
  checklistVersion: string;
}

/** Chi tiết nhiệm vụ hiện trường từ GET /projects/{projectId}/field-inspection-tasks/{taskId} (API-080). */
export interface FieldTaskViewFact {
  id: string;
  projectId: string;
  defectId: string;
  surveyId: string | null;
  sourceKind: string | null;
  routeVersionId: string;
  segmentSetId: string | null;
  layoutRevisionId: string | null;
  slabId: string | null;
  purpose: string | null;
  mode: string | null;
  status: string | null;
  assignmentId: string | null;
  assignedToUserId: string | null;
  version: string | null;
  firstStartOriginId: string | null;
  latestSubmissionId: string | null;
  mapPublicationId: string | null;
  crsProfileRevisionId: string | null;
  requiredMeasurementType: number;
  measurementScope: string | null;
  instructions: string | null;
  dueAt: string | null;
  repairContext?: CrewRepairContext | null;
}

/** Input nhận/từ chối nhiệm vụ hiện trường (API-081/091). */
export interface FieldTaskActionInput {
  reason: string;
  assignedToUserId?: string | null;
  handover?: null;
}

/** Input bắt đầu nhiệm vụ hiện trường (API-093). */
export interface FieldStartInput {
  originId: string;
  claimedAt: string;
  deviceId?: string | null;
  monotonicMilliseconds?: number | null;
  bootId?: string | null;
  offlineProof?: string | null;
}

/** Kết quả bắt đầu nhiệm vụ hiện trường từ BE. */
export interface FieldTaskStartOrigin {
  id: string;
  taskId: string;
  assignmentId: string;
  originId: string;
  contentHash: string;
  claimedAt: string;
  serverReceivedAt: string;
  verifiedOriginalAt: string;
  timeProvenance: string;
}

/** Input đo đạc chi tiết cho FieldSubmission (API-095). */
export interface FieldMeasurementInput {
  sampleId: string;
  type: string;
  value: number | null;
  state: string;
  unknownReason?: string | null;
  dimension: string;
  unit: string;
  longitude?: number | null;
  latitude?: number | null;
  locationReason?: string | null;
  instrument: string;
  method: string;
  notes?: string | null;
}

/** Khai báo bằng chứng đính kèm submission (API-095). */
export interface FieldEvidenceDeclaration {
  captureOriginId: string;
  fileId?: string | null;
  purpose: 'BEFORE' | 'AFTER' | 'MEASUREMENT';
  checksumSha256: string;
  mediaType: string;
  capturedAt?: string | null;
  attemptChecklist?: string | null;
}

/** Minh chứng vị trí kiểm tra (API-095). */
export interface FieldPositionProofInput {
  kind: string;
  checklist?: string | null;
  longitude?: number | null;
  latitude?: number | null;
  observedSlabId?: string | null;
  observedSegmentId?: string | null;
  observedRouteVersionId?: string | null;
  observedChainageMeters?: number | null;
}

/** Body gửi hồ sơ hiện trường (API-095). */
export interface FieldSubmissionInput {
  originId: string;
  startOriginId: string;
  parentSubmissionId?: string | null;
  measurements?: FieldMeasurementInput[] | null;
  evidence?: FieldEvidenceDeclaration[] | null;
  locationProof?: FieldPositionProofInput | null;
  captureType: 'MEASUREMENT' | 'REPAIR_CLAIM';
  repaired?: boolean | null;
  unrepairedReason?: string | null;
  deviceId?: string | null;
}

/** DTO trả về từ API-095/096. */
export interface FieldSubmissionViewFact {
  id: string;
  taskId: string;
  rootId: string;
  parentId: string | null;
  revision: number;
  serverReceivedAt: string;
  originalReviewDueAt: string;
  readiness: string | null;
  missingReasons: string[] | null;
  contentHash: string | null;
  measurements: FieldMeasurementInput[] | null;
  evidence: FieldEvidenceDeclaration[] | null;
  captureType: string | null;
  repaired: boolean | null;
  unrepairedReason: string | null;
}

/** Kết quả đánh giá điều kiện Sửa Nhanh từ API-146. */
export interface RepairEligibilityReadView {
  eligible: boolean;
  activation: string;
  itemId: string;
  bindingId: string;
  policyRevisionId: string | null;
  policyContentHash: string | null;
  policyState: string;
  missingReasons: string[];
  version: string;
}

// -----------------------------------------------------------------------------
// DTOs cho các lệnh Sửa Chữa (API-156..161)
// -----------------------------------------------------------------------------

export interface RepairMeasurementAssessmentInput {
  originId: string;
  fieldFirstStartId: string;
  measurements?: FieldMeasurementInput[] | null;
  evidence?: FieldEvidenceDeclaration[] | null;
  locationProof?: FieldPositionProofInput | null;
  deviceId?: string | null;
  stopConditions?: Record<string, boolean | null> | null;
}

export interface RepairExecutionStartInput {
  originId: string;
  fieldFirstStartId: string;
  claimedAt: string;
  assessmentId: string;
  deviceId?: string | null;
  monotonicMilliseconds?: number | null;
  bootId?: string | null;
}

export interface RepairExecutionFinishInput {
  originId: string;
  executionStartId: string;
  claimedAt: string;
  deviceId?: string | null;
  monotonicMilliseconds?: number | null;
  bootId?: string | null;
}

export interface RepairAttemptSubmitInput {
  fieldSubmissionId: string;
  expectedContentHash: string;
  executionFinishId?: string | null;
}

export interface RepairAttemptSupplementInput {
  fieldSubmissionId: string;
  expectedContentHash: string;
}

export interface RepairAssessmentView {
  id: string;
  itemId: string;
  taskId: string;
  firstStartId: string;
  sessionId: string;
  stage: string;
  readiness: string;
  missingReasons: string[];
  locationState: string;
  contentHash: string;
}

export interface RepairExecutionStartView {
  id: string;
  itemId: string;
  taskId: string;
  assessmentId: string;
  firstStartId: string;
  claimedAt: string;
  serverReceivedAt: string;
  verifiedOriginalAt: string | null;
  timeProvenance: string;
}

export interface RepairExecutionFinishView {
  id: string;
  itemId: string;
  taskId: string;
  executionStartId: string;
  claimedAt: string;
  serverReceivedAt: string;
  verifiedOriginalAt: string | null;
  timeProvenance: string;
  syncClockId: string | null;
  originalSyncDueAt: string | null;
}

export interface RepairAttemptIntakeView {
  attemptId: string;
  linkId: string;
  itemId: string;
  submissionId: string;
  reviewClockId: string;
  originalReviewDueAt: string;
  intakeReadiness: string;
}

// -----------------------------------------------------------------------------
// DTOs Upload của Crew
// -----------------------------------------------------------------------------

export interface CrewUploadSessionDto {
  id: string;
  fileId: string;
  status: 'PENDING' | 'UPLOADING' | 'VERIFYING' | 'VERIFIED' | 'FAILED';
  partSizeBytes: number;
  expiresAt: string;
  version: string;
}

export interface CrewCompletedPartDto {
  partNumber: number;
  etag: string;
}

export interface CrewFileMetadataDto {
  id: string;
  status: string;
  checksumSha256: string;
  mediaType: string;
  sizeBytes: number;
  version: string;
}

// =============================================================================
// UTILITIES: ETAG & CONFLICT HELPERS
// =============================================================================

/** Chuẩn hóa If-Match thành strong ETag có dấu nháy kép theo yêu cầu BE: `"${clean}"`. */
export function formatStrongIfMatch(version?: string | null): string {
  if (!version) return '';
  const clean = version.trim().replace(/^"+|"+$/g, '');
  return `"${clean}"`;
}

/** Trích xuất ETag từ response headers hoặc trường version/contentHash. */
export function extractEtagFromResponse(response: { headers?: unknown; data?: unknown }): string {
  const headers = response.headers as Record<string, string | undefined> | undefined;
  const raw = headers?.['etag'] ?? headers?.['ETag'];
  if (raw && typeof raw === 'string') {
    return raw.trim().replace(/^"+|"+$/g, '');
  }
  const data = response.data as { version?: string; contentHash?: string } | undefined;
  if (data?.version) return data.version.trim().replace(/^"+|"+$/g, '');
  if (data?.contentHash) return data.contentHash.trim().replace(/^"+|"+$/g, '');
  return '';
}

/** Kiểm tra lỗi có phải do xung đột phiên bản (409 hoặc 412). */
export function isConcurrencyConflict(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const err = error as { status?: number; response?: { status?: number; data?: unknown } };
  const status = err.response?.status ?? err.status;
  if (status === 409 || status === 412) return true;
  const problem = parseProblemDetails(err.response?.data);
  return problem.code === 'concurrency_conflict';
}

/** Kiểm tra lỗi có phải do thiếu điều kiện tiên quyết (428). */
export function isPreconditionRequired(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const err = error as { status?: number; response?: { status?: number; data?: unknown } };
  const status = err.response?.status ?? err.status;
  if (status === 428) return true;
  const problem = parseProblemDetails(err.response?.data);
  return problem.code === 'precondition_required';
}

/** Tạo Idempotency-Key UUID an toàn trên React Native & Web. */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
}

// =============================================================================
// API FUNCTIONS: FIELD INSPECTION WORKFLOW
// =============================================================================

/**
 * API-037: GET /api/v1/me/inspection-tasks
 * Lấy danh sách nhiệm vụ được giao cho Crew đang đăng nhập.
 */
export async function listCrewInspectionTasksReal(
  cursor?: string | null,
  limit: number = 50,
  signal?: AbortSignal,
): Promise<InspectionTaskPageResponseDto> {
  const params: Record<string, unknown> = { limit };
  if (cursor) {
    params.cursor = cursor;
  }
  const response = await apiClient.get<InspectionTaskPageResponseDto>('/me/inspection-tasks', {
    params,
    signal,
  });
  return response.data;
}

/**
 * API-080: GET /api/v1/projects/{projectId}/field-inspection-tasks/{taskId}
 * Đọc chi tiết nhiệm vụ hiện trường kèm ETag mới nhất.
 */
export async function getFieldInspectionTaskDetailReal(
  projectId: string,
  taskId: string,
  signal?: AbortSignal,
): Promise<{ data: FieldTaskViewFact; etag: string }> {
  if (!isCrewResourceId(projectId) || !isCrewResourceId(taskId)) throw new Error('crew_identity_missing');
  const response = await apiClient.get<FieldTaskViewFact>(
    `/projects/${projectId}/field-inspection-tasks/${taskId}`,
    { signal },
  );
  // Read contract requires the actual strong ETag, not a generated fallback.
  const etag = String(response.headers['etag'] ?? '').trim();
  return { data: response.data, etag };
}

/**
 * API-081: POST /api/v1/projects/{projectId}/field-inspection-tasks/{taskId}/accept
 * Crew nhận việc hiện trường. Yêu cầu strong If-Match + Idempotency-Key.
 */
export async function acceptFieldTaskReal(
  projectId: string,
  taskId: string,
  reason: string,
  ifMatch: string,
  idempotencyKey: string = newIdempotencyKey(),
): Promise<{ data: FieldTaskViewFact; etag: string }> {
  const response = await apiClient.post<FieldTaskViewFact>(
    `/projects/${projectId}/field-inspection-tasks/${taskId}/accept`,
    { reason },
    {
      headers: {
        'If-Match': formatStrongIfMatch(ifMatch),
        'Idempotency-Key': idempotencyKey,
      },
    },
  );
  const etag = extractEtagFromResponse(response);
  return { data: response.data, etag };
}

/**
 * API-091: POST /api/v1/projects/{projectId}/field-inspection-tasks/{taskId}/reject
 * Crew từ chối việc hiện trường kèm lý do. Yêu cầu strong If-Match + Idempotency-Key.
 */
export async function rejectFieldTaskReal(
  projectId: string,
  taskId: string,
  reason: string,
  ifMatch: string,
  idempotencyKey: string = newIdempotencyKey(),
): Promise<{ data: FieldTaskViewFact; etag: string }> {
  const response = await apiClient.post<FieldTaskViewFact>(
    `/projects/${projectId}/field-inspection-tasks/${taskId}/reject`,
    { reason },
    {
      headers: {
        'If-Match': formatStrongIfMatch(ifMatch),
        'Idempotency-Key': idempotencyKey,
      },
    },
  );
  const etag = extractEtagFromResponse(response);
  return { data: response.data, etag };
}

/**
 * API-093: POST /api/v1/projects/{projectId}/field-inspection-tasks/{taskId}/start
 * Bắt đầu làm nhiệm vụ tại hiện trường. Yêu cầu strong If-Match + Idempotency-Key.
 */
export async function startFieldTaskReal(
  projectId: string,
  taskId: string,
  input: FieldStartInput,
  ifMatch: string,
  idempotencyKey: string = newIdempotencyKey(),
): Promise<{ data: FieldTaskStartOrigin; etag: string }> {
  const response = await apiClient.post<FieldTaskStartOrigin>(
    `/projects/${projectId}/field-inspection-tasks/${taskId}/start`,
    input,
    {
      headers: {
        'If-Match': formatStrongIfMatch(ifMatch),
        'Idempotency-Key': idempotencyKey,
      },
    },
  );
  const etag = extractEtagFromResponse(response);
  return { data: response.data, etag };
}

/**
 * API-095: POST /api/v1/projects/{projectId}/field-inspection-tasks/{taskId}/submissions
 * Nộp hồ sơ kết quả kiểm tra hiện trường (kèm số đo và minh chứng đã VERIFIED).
 */
export async function submitFieldTaskReal(
  projectId: string,
  taskId: string,
  input: FieldSubmissionInput,
  ifMatch: string,
  idempotencyKey: string = newIdempotencyKey(),
): Promise<{ data: FieldSubmissionViewFact; etag: string }> {
  const response = await apiClient.post<FieldSubmissionViewFact>(
    `/projects/${projectId}/field-inspection-tasks/${taskId}/submissions`,
    input,
    {
      headers: {
        'If-Match': formatStrongIfMatch(ifMatch),
        'Idempotency-Key': idempotencyKey,
      },
    },
  );
  const etag = extractEtagFromResponse(response);
  return { data: response.data, etag };
}

/**
 * API-096: GET /api/v1/projects/{projectId}/field-inspection-tasks/{taskId}/submissions/{submissionId}
 * Xem chi tiết hồ sơ nộp kết quả hiện trường (C-07 review).
 */
export async function getFieldSubmissionDetailReal(
  projectId: string,
  taskId: string,
  submissionId: string,
): Promise<{ data: FieldSubmissionViewFact; etag: string }> {
  const response = await apiClient.get<FieldSubmissionViewFact>(
    `/projects/${projectId}/field-inspection-tasks/${taskId}/submissions/${submissionId}`,
  );
  const etag = extractEtagFromResponse(response);
  return { data: response.data, etag };
}

// =============================================================================
// API FUNCTIONS: REPAIR ELIGIBILITY & EXECUTION
// =============================================================================

/**
 * API-146: GET /api/v1/projects/{projectId}/repair-packages/{packageId}/items/{itemId}/eligibility
 * Đọc điều kiện Sửa Nhanh (CHỈ HIỂN THỊ, không tính toán ở FE).
 * Lưu ý: nếu trả 403 cho Crew → gap P5-G02.
 */
export async function getRepairEligibilityReal(
  projectId: string,
  packageId: string,
  itemId: string,
): Promise<{ data: RepairEligibilityReadView; etag: string }> {
  const response = await apiClient.get<RepairEligibilityReadView>(
    `/projects/${projectId}/repair-packages/${packageId}/items/${itemId}/eligibility`,
  );
  const etag = extractEtagFromResponse(response);
  return { data: response.data, etag };
}

/**
 * API-156: POST .../tasks/{taskId}/assessment
 */
export async function submitRepairAssessmentReal(
  projectId: string,
  packageId: string,
  itemId: string,
  taskId: string,
  input: RepairMeasurementAssessmentInput,
  ifMatch: string,
  idempotencyKey: string = newIdempotencyKey(),
): Promise<{ data: RepairAssessmentView; etag: string }> {
  const response = await apiClient.post<RepairAssessmentView>(
    `/projects/${projectId}/repair-packages/${packageId}/items/${itemId}/tasks/${taskId}/assessment`,
    input,
    {
      headers: {
        'If-Match': formatStrongIfMatch(ifMatch),
        'Idempotency-Key': idempotencyKey,
      },
    },
  );
  return { data: response.data, etag: extractEtagFromResponse(response) };
}

/**
 * API-157: POST .../tasks/{taskId}/execution-start
 */
export async function startRepairExecutionReal(
  projectId: string,
  packageId: string,
  itemId: string,
  taskId: string,
  input: RepairExecutionStartInput,
  ifMatch: string,
  idempotencyKey: string = newIdempotencyKey(),
): Promise<{ data: RepairExecutionStartView; etag: string }> {
  const response = await apiClient.post<RepairExecutionStartView>(
    `/projects/${projectId}/repair-packages/${packageId}/items/${itemId}/tasks/${taskId}/execution-start`,
    input,
    {
      headers: {
        'If-Match': formatStrongIfMatch(ifMatch),
        'Idempotency-Key': idempotencyKey,
      },
    },
  );
  return { data: response.data, etag: extractEtagFromResponse(response) };
}

/**
 * API-159: POST .../tasks/{taskId}/execution-finish
 */
export async function finishRepairExecutionReal(
  projectId: string,
  packageId: string,
  itemId: string,
  taskId: string,
  input: RepairExecutionFinishInput,
  ifMatch: string,
  idempotencyKey: string = newIdempotencyKey(),
): Promise<{ data: RepairExecutionFinishView; etag: string }> {
  const response = await apiClient.post<RepairExecutionFinishView>(
    `/projects/${projectId}/repair-packages/${packageId}/items/${itemId}/tasks/${taskId}/execution-finish`,
    input,
    {
      headers: {
        'If-Match': formatStrongIfMatch(ifMatch),
        'Idempotency-Key': idempotencyKey,
      },
    },
  );
  return { data: response.data, etag: extractEtagFromResponse(response) };
}

/**
 * API-160: POST .../tasks/{taskId}/attempts
 */
export async function submitRepairAttemptReal(
  projectId: string,
  packageId: string,
  itemId: string,
  taskId: string,
  input: RepairAttemptSubmitInput,
  ifMatch: string,
  idempotencyKey: string = newIdempotencyKey(),
): Promise<{ data: RepairAttemptIntakeView; etag: string }> {
  const response = await apiClient.post<RepairAttemptIntakeView>(
    `/projects/${projectId}/repair-packages/${packageId}/items/${itemId}/tasks/${taskId}/attempts`,
    input,
    {
      headers: {
        'If-Match': formatStrongIfMatch(ifMatch),
        'Idempotency-Key': idempotencyKey,
      },
    },
  );
  return { data: response.data, etag: extractEtagFromResponse(response) };
}

/**
 * API-161: POST .../tasks/{taskId}/attempts/supplements
 */
export async function supplementRepairAttemptReal(
  projectId: string,
  packageId: string,
  itemId: string,
  taskId: string,
  input: RepairAttemptSupplementInput,
  ifMatch: string,
  idempotencyKey: string = newIdempotencyKey(),
): Promise<{ data: RepairAttemptIntakeView; etag: string }> {
  const response = await apiClient.post<RepairAttemptIntakeView>(
    `/projects/${projectId}/repair-packages/${packageId}/items/${itemId}/tasks/${taskId}/attempts/supplements`,
    input,
    {
      headers: {
        'If-Match': formatStrongIfMatch(ifMatch),
        'Idempotency-Key': idempotencyKey,
      },
    },
  );
  return { data: response.data, etag: extractEtagFromResponse(response) };
}

// =============================================================================
// CREW UPLOAD FLOW (/api/v1/uploads)
// =============================================================================

const storageClient = axios.create({ timeout: 120000 });

/** Tạo phiên tải lên của Crew với Purpose rõ ràng (BEFORE / AFTER / MEASUREMENT). */
export async function createCrewUploadSession(
  projectId: string,
  targetId: string,
  fileName: string,
  mediaType: string,
  sizeBytes: number,
  checksumSha256: string,
  purpose: 'BEFORE' | 'AFTER' | 'MEASUREMENT' = 'MEASUREMENT',
  idempotencyKey: string = newIdempotencyKey(),
): Promise<CrewUploadSessionDto> {
  const response = await apiClient.post<CrewUploadSessionDto>(
    '/uploads',
    {
      purpose,
      projectId,
      targetId,
      fileName,
      mediaType,
      sizeBytes,
      checksumSha256,
    },
    { headers: { 'Idempotency-Key': idempotencyKey } },
  );
  return response.data;
}

/** Lấy thông tin phiên tải lên (kèm version mới nhất). */
export async function getCrewUploadSession(uploadId: string): Promise<CrewUploadSessionDto> {
  const response = await apiClient.get<CrewUploadSessionDto>(`/uploads/${uploadId}`);
  return response.data;
}

/** Xin URL ký trước (presigned URLs) cho từng part. */
export async function requestCrewUploadPartUrls(
  uploadId: string,
  partNumbers: number[],
  idempotencyKey: string = newIdempotencyKey(),
): Promise<{ parts: { partNumber: number; url: string }[] }> {
  const response = await apiClient.post<{ parts: { partNumber: number; url: string }[] }>(
    `/uploads/${uploadId}/part-urls`,
    { partNumbers },
    { headers: { 'Idempotency-Key': idempotencyKey } },
  );
  return response.data;
}

/** Tải dữ liệu part trực tiếp lên MinIO/S3 (không inject bearer của app). */
export async function putCrewUploadPartBytes(
  presignedUrl: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<{ etag: string }> {
  const response = await storageClient.put(presignedUrl, bytes, {
    headers: { 'Content-Type': contentType },
  });
  const rawEtag =
    (response.headers as Record<string, string | undefined>)['etag'] ??
    (response.headers as Record<string, string | undefined>)['ETag'] ??
    '';
  return { etag: rawEtag.replace(/^"+|"+$/g, '') };
}

/** Báo hoàn tất tải lên; yêu cầu If-Match = sessionVersion mới nhất và checksumSha256. */
export async function completeCrewUpload(
  uploadId: string,
  parts: CrewCompletedPartDto[],
  checksumSha256: string,
  freshSessionVersion: string,
  idempotencyKey: string = newIdempotencyKey(),
): Promise<CrewUploadSessionDto> {
  const response = await apiClient.post<CrewUploadSessionDto>(
    `/uploads/${uploadId}/complete`,
    { parts, checksumSha256 },
    {
      headers: {
        'If-Match': formatStrongIfMatch(freshSessionVersion),
        'Idempotency-Key': idempotencyKey,
      },
    },
  );
  return response.data;
}

/** Đợi file chuyển sang trạng thái VERIFIED (tối đa timeoutMs, mặc định 45 giây). */
export async function pollCrewUploadVerified(
  uploadId: string,
  timeoutMs: number = 45000,
  intervalMs: number = 1500,
): Promise<CrewUploadSessionDto> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const session = await getCrewUploadSession(uploadId);
    if (session.status === 'VERIFIED') {
      return session;
    }
    if (session.status === 'FAILED') {
      throw new Error('Upload session failed verification');
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error('Upload verification timed out');
}

/** Lấy metadata của file đã VERIFIED. */
export async function getCrewFileMetadata(fileId: string): Promise<CrewFileMetadataDto> {
  const response = await apiClient.get<CrewFileMetadataDto>(`/files/${fileId}`);
  return response.data;
}
