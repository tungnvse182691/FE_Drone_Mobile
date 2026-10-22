import { TaskMode } from '../../types/enums';
import type { DefectTypeCode } from '../../constants/defect-types';
import { throwMockApiError } from './errors';
import { fakeRowVersion, fakeSha256 } from './wire-ids';
import type { MockFieldTaskSeed } from './field-task-seed';
import { MOCK_FIELD_SUBMISSION_SEEDS, MOCK_FIELD_TASK_SEEDS } from './field-task-seed';

/**
 * FIELD inspection tasks (Workflow 04) — mock bám hợp đồng 17_10:
 *  - API-078 `GET /projects/{projectId}/field-inspection-tasks` → `{ items, nextCursor }`.
 *  - API-080 `GET .../field-inspection-tasks/{taskId}` → `FieldTaskViewFact` + ETag.
 *  - API-081 accept / API-091 reject: bắt buộc `Idempotency-Key` + `If-Match`.
 *  - API-095 submit / API-096 read submission.
 *
 * Dữ liệu demo (nội dung tiếng Việt cho màn C-02) nằm trong `field-task-seed.ts`;
 * mọi trạng thái/phiên bản dưới đây là state của MỘT phiên chạy app (mock, không bền vững).
 */

export const MOCK_CREW_PROJECT_ID = '4f6a2c1e-8b3d-4a5f-9c7e-1d2b3a4c5e6f';
export const MOCK_CREW_ACTOR_ID = 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e';

/** Trạng thái FIELD task theo chuỗi wire của BE; mock chỉ dùng tập con cần cho UI Crew. */
export type FieldTaskStatus =
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

const ACTIVE_STATUSES: FieldTaskStatus[] = ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'SUBMITTED'];

export function isActiveFieldTaskStatus(status: string): boolean {
  return (ACTIVE_STATUSES as string[]).includes(status);
}

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
  /** Rowversion NGOÀI của task — dùng cho If-Match của API-081/091/095. */
  version: string | null;
  firstStartOriginId: string | null;
  latestSubmissionId: string | null;
  mapPublicationId: string | null;
  crsProfileRevisionId: string | null;
  requiredMeasurementType: number;
  measurementScope: string | null;
  instructions: string | null;
  dueAt: string | null;
}

export interface FieldTaskActionInput {
  reason: string;
  assignedToUserId?: string | null;
  handover?: null;
}

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

export interface FieldEvidenceDeclaration {
  captureOriginId: string;
  fileId?: string | null;
  purpose: 'BEFORE' | 'AFTER' | 'MEASUREMENT';
  checksumSha256?: string | null;
  mediaType?: string | null;
  capturedAt?: string | null;
  attemptChecklist?: string | null;
}

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

/** `FieldSubmissionInput` — body API-095. */
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

/** `FieldSubmissionViewFact` — response API-095/096. KHÔNG có trường nhận xét của PM. */
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

/** Thẻ nhiệm vụ hiển thị ở C-02 (nội dung đọc được + id wire để điều hướng). */
export interface CrewFieldTaskCard {
  id: string;
  wo_code: string;
  title: string;
  task_mode: TaskMode;
  defect_type_code: DefectTypeCode;
  route_code: string;
  section_name: string;
  chainage: string;
  locality: string;
  due_label: string;
  due_urgency: 'normal' | 'urgent';
  distance_label: string;
  defect_location: string;
  description: string;
  repair_method: string;
  safety_note: string;
  batch_size: number;
  coordinates: { latitude: number; longitude: number };
  completedAt?: string;
}

interface MockFieldTaskState {
  seed: MockFieldTaskSeed;
  status: FieldTaskStatus;
  versionStep: number;
  latestSubmissionId: string | null;
  rejectReason: string | null;
}

const MOCK_FIELD_TASK_STATE: MockFieldTaskState[] = MOCK_FIELD_TASK_SEEDS.map((seed) => ({
  seed,
  status: seed.initialStatus,
  versionStep: 0,
  latestSubmissionId: seed.latestSubmissionId,
  rejectReason: null,
}));

const usedIdempotencyKeys = new Set<string>();
const MOCK_FIELD_SUBMISSIONS: FieldSubmissionViewFact[] = MOCK_FIELD_SUBMISSION_SEEDS.map(
  (submission) => ({ ...submission }),
);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function findState(taskId: string): MockFieldTaskState {
  const state = MOCK_FIELD_TASK_STATE.find((item) => item.seed.card.id === taskId);
  if (!state) {
    throwMockApiError('not_found', { message: 'Không tìm thấy nhiệm vụ hiện trường.' });
  }
  return state;
}

function taskVersion(state: MockFieldTaskState): string {
  return fakeRowVersion(`field-task:${state.seed.card.id}`, state.versionStep);
}

function bumpTaskVersion(state: MockFieldTaskState): void {
  state.versionStep += 1;
}

function toView(state: MockFieldTaskState): FieldTaskViewFact {
  const { seed } = state;
  return {
    id: seed.card.id,
    projectId: seed.projectId,
    defectId: seed.defectId,
    surveyId: seed.surveyId,
    sourceKind: seed.sourceKind,
    routeVersionId: seed.routeVersionId,
    segmentSetId: seed.segmentSetId,
    layoutRevisionId: seed.layoutRevisionId,
    slabId: seed.slabId,
    purpose: seed.purpose,
    mode: seed.card.task_mode,
    status: state.status,
    assignmentId: seed.assignmentId,
    assignedToUserId: seed.assignedToUserId,
    version: taskVersion(state),
    firstStartOriginId: seed.firstStartOriginId,
    latestSubmissionId: state.latestSubmissionId,
    mapPublicationId: seed.mapPublicationId,
    crsProfileRevisionId: seed.crsProfileRevisionId,
    requiredMeasurementType: seed.requiredMeasurementType,
    measurementScope: seed.measurementScope,
    instructions: seed.instructions,
    dueAt: seed.dueAt,
  };
}

/** ETag wire của task, đã kèm dấu nháy kép đúng `ETag` response. */
export function fieldTaskETag(state: MockFieldTaskState): string {
  return `"${taskVersion(state)}"`;
}

function normalizeIfMatch(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith('"') && trimmed.endsWith('"') ? trimmed.slice(1, -1) : trimmed;
}

function assertTaskIfMatch(state: MockFieldTaskState, ifMatch: string | undefined): void {
  if (!ifMatch || ifMatch.trim().length === 0) {
    throwMockApiError('precondition_required', {
      message: 'Thiếu phiên bản nhiệm vụ (If-Match). Vui lòng tải lại nhiệm vụ.',
    });
  }
  if (normalizeIfMatch(ifMatch) !== taskVersion(state)) {
    throwMockApiError('concurrency_conflict', {
      message: 'Nhiệm vụ vừa được cập nhật ở nơi khác. Vui lòng tải lại.',
    });
  }
}

function requireIdempotencyKey(value: string | undefined): string {
  const key = value?.trim();
  if (!key) {
    throwMockApiError('idempotency_key_required');
  }
  if (usedIdempotencyKeys.has(key)) {
    throwMockApiError('idempotency_key_reused');
  }
  usedIdempotencyKeys.add(key);
  return key;
}

/** Bản ghi rút gọn cho transport sửa chữa (C-04 bootstrap) — tránh phụ thuộc vòng. */
export interface FieldTaskRecord {
  id: string;
  projectId: string;
  defectId: string;
  mode: string;
  status: string;
  version: string;
}

export function fieldTaskRecord(taskId: string): FieldTaskRecord | null {
  const state = MOCK_FIELD_TASK_STATE.find((item) => item.seed.card.id === taskId);
  if (!state) {
    return null;
  }
  return {
    id: state.seed.card.id,
    projectId: state.seed.projectId,
    defectId: state.seed.defectId,
    mode: state.seed.card.task_mode,
    status: state.status,
    version: taskVersion(state),
  };
}

/** C-02 — danh sách nhiệm vụ FIELD (API-078). Chỉ trả thẻ của Crew đang đăng nhập (mock). */
export async function listFieldInspectionTasks(
  params: { afterId?: string; limit?: number } = {},
): Promise<{ items: FieldTaskViewFact[]; nextCursor: string | null }> {
  await delay(250);
  const limit = params.limit && params.limit > 0 ? params.limit : 50;
  const startIndex = params.afterId
    ? MOCK_FIELD_TASK_STATE.findIndex((item) => item.seed.card.id === params.afterId) + 1
    : 0;
  const slice = MOCK_FIELD_TASK_STATE.slice(startIndex);
  const page = slice.slice(0, limit);
  return {
    items: page.map((state) => toView(state)),
    nextCursor: slice.length > limit ? (page[page.length - 1]?.seed.card.id ?? null) : null,
  };
}

/** API-080 — chi tiết một nhiệm vụ FIELD kèm ETag mạnh để làm If-Match. */
export async function getFieldTask(taskId: string): Promise<{ data: FieldTaskViewFact; etag: string }> {
  await delay(200);
  const state = findState(taskId);
  return { data: toView(state), etag: fieldTaskETag(state) };
}

function transitionOrThrow(
  state: MockFieldTaskState,
  allowedFrom: FieldTaskStatus[],
  code: string,
): void {
  if (!allowedFrom.includes(state.status)) {
    throwMockApiError(code, {
      message: 'Nhiệm vụ không còn ở trạng thái cho phép thực hiện thao tác này.',
    });
  }
}

/** API-081 — Crew nhận nhiệm vụ. Bắt buộc `Idempotency-Key` + `If-Match`. */
export async function acceptFieldTask(
  taskId: string,
  _input: FieldTaskActionInput,
  headers: { 'Idempotency-Key'?: string; 'If-Match'?: string },
): Promise<{ data: FieldTaskViewFact; etag: string }> {
  await delay(450);
  const state = findState(taskId);
  requireIdempotencyKey(headers['Idempotency-Key']);
  assertTaskIfMatch(state, headers['If-Match']);
  transitionOrThrow(state, ['ASSIGNED', 'ACCEPTED'], 'invalid_state_transition');

  state.status = 'ACCEPTED';
  state.rejectReason = null;
  bumpTaskVersion(state);
  return { data: toView(state), etag: fieldTaskETag(state) };
}

/** API-091 — Crew từ chối nhiệm vụ; `reason` là bắt buộc nghiệp vụ. */
export async function rejectFieldTask(
  taskId: string,
  input: FieldTaskActionInput,
  headers: { 'Idempotency-Key'?: string; 'If-Match'?: string },
): Promise<{ data: FieldTaskViewFact; etag: string }> {
  await delay(450);
  const state = findState(taskId);
  requireIdempotencyKey(headers['Idempotency-Key']);
  const reason = input.reason?.trim();
  if (!reason) {
    throwMockApiError('validation_error', {
      message: 'Cần nêu lý do từ chối nhiệm vụ.',
      details: [{ field: 'reason', message: 'Lý do tối thiểu 1 ký tự.' }],
    });
  }
  assertTaskIfMatch(state, headers['If-Match']);
  transitionOrThrow(state, ['ASSIGNED', 'ACCEPTED'], 'invalid_state_transition');

  state.status = 'REJECTED';
  state.rejectReason = reason;
  bumpTaskVersion(state);
  return { data: toView(state), etag: fieldTaskETag(state) };
}

function submissionMissingReasons(input: FieldSubmissionInput): string[] {
  const reasons: string[] = [];
  if (input.captureType === 'MEASUREMENT' && (input.measurements ?? []).length === 0) {
    reasons.push('Thiếu số đo hiện trường');
  }
  if ((input.evidence ?? []).length === 0) {
    reasons.push('Thiếu ảnh bằng chứng hiện trường');
  }
  if (input.repaired === false && !input.unrepairedReason?.trim()) {
    reasons.push('Chưa nêu lý do chưa sửa tại chỗ');
  }
  return reasons;
}

/** API-095 — Crew gửi kết quả đo/sửa (hoặc gửi bổ sung với `parentSubmissionId`). */
export async function submitFieldSubmission(
  taskId: string,
  input: FieldSubmissionInput,
  headers: { 'Idempotency-Key'?: string; 'If-Match'?: string },
): Promise<{ data: FieldSubmissionViewFact; etag: string }> {
  await delay(500);
  const state = findState(taskId);
  requireIdempotencyKey(headers['Idempotency-Key']);

  if (!input.originId?.trim() || !input.startOriginId?.trim()) {
    throwMockApiError('validation_error', {
      message: 'Thiếu mã gốc hiện trường (originId/startOriginId).',
    });
  }
  if (input.captureType !== 'MEASUREMENT' && input.captureType !== 'REPAIR_CLAIM') {
    throwMockApiError('validation_error', {
      message: 'Loại ghi nhận hiện trường không hợp lệ.',
      details: [{ field: 'captureType', message: 'Chỉ nhận MEASUREMENT hoặc REPAIR_CLAIM.' }],
    });
  }
  assertTaskIfMatch(state, headers['If-Match']);
  transitionOrThrow(state, ['ACCEPTED', 'IN_PROGRESS', 'SUBMITTED'], 'invalid_state_transition');

  const parent = input.parentSubmissionId
    ? MOCK_FIELD_SUBMISSIONS.find((item) => item.id === input.parentSubmissionId)
    : null;
  if (input.parentSubmissionId && (!parent || parent.taskId !== taskId)) {
    throwMockApiError('submission_lineage_conflict', {
      message: 'Lượt gửi trước không thuộc nhiệm vụ này.',
    });
  }

  const missingReasons = submissionMissingReasons(input);
  const revision = parent ? parent.revision + 1 : 1;
  const submissionId = `sub-${fakeSha256(`field-submission:${taskId}:${revision}`).slice(0, 32)}`;
  const submission: FieldSubmissionViewFact = {
    id: submissionId,
    taskId,
    rootId: parent ? parent.rootId : submissionId,
    parentId: parent ? parent.id : null,
    revision,
    serverReceivedAt: new Date().toISOString(),
    originalReviewDueAt: '2026-09-29T17:00:00Z',
    readiness: missingReasons.length === 0 ? 'READY' : 'INCOMPLETE',
    missingReasons: missingReasons.length === 0 ? null : missingReasons,
    contentHash: fakeSha256(`submission-content:${submissionId}`),
    measurements: input.measurements ?? null,
    evidence: input.evidence ?? null,
    captureType: input.captureType,
    repaired: input.repaired ?? null,
    unrepairedReason: input.unrepairedReason?.trim() || null,
  };

  MOCK_FIELD_SUBMISSIONS.unshift(submission);
  state.latestSubmissionId = submissionId;
  if (state.status !== 'COMPLETED') {
    state.status = 'SUBMITTED';
  }
  bumpTaskVersion(state);

  return { data: { ...submission }, etag: fieldTaskETag(state) };
}

/** API-096 — đọc một lượt gửi của nhiệm vụ. */
export async function getFieldSubmission(
  taskId: string,
  submissionId: string,
): Promise<{ data: FieldSubmissionViewFact; etag: string }> {
  await delay(200);
  const state = findState(taskId);
  const submission = MOCK_FIELD_SUBMISSIONS.find(
    (item) => item.id === submissionId && item.taskId === taskId,
  );
  if (!submission) {
    throwMockApiError('not_found', { message: 'Không tìm thấy lượt gửi hiện trường.' });
  }
  return { data: { ...submission }, etag: fieldTaskETag(state) };
}

/** Lịch sử gửi của nhiệm vụ (dùng cho C-07 khi cần chọn lượt cần gửi bổ sung). */
export function listFieldSubmissionsForTask(taskId: string): FieldSubmissionViewFact[] {
  return MOCK_FIELD_SUBMISSIONS.filter((item) => item.taskId === taskId).map((item) => ({
    ...item,
  }));
}

/** Ghép view wire với nội dung hiển thị của seed để render C-02. */
export function crewFieldTaskCard(taskId: string): CrewFieldTaskCard | null {
  const state = MOCK_FIELD_TASK_STATE.find((item) => item.seed.card.id === taskId);
  return state ? { ...state.seed.card } : null;
}

/** Ảnh chụp đồng bộ cho các màn chỉ cần số đếm (home/profile) — vẫn đọc từ seed mock. */
export function listCrewFieldTaskCards(segment: 'active' | 'done'): CrewFieldTaskCard[] {
  return MOCK_FIELD_TASK_STATE.filter((state) =>
    segment === 'active'
      ? isActiveFieldTaskStatus(state.status)
      : state.status === 'COMPLETED',
  ).map((state) => ({ ...state.seed.card }));
}

/** Trạng thái hiện tại của một task (dùng cho badge ở danh sách). */
export function fieldTaskStatusOf(taskId: string): FieldTaskStatus | null {
  return MOCK_FIELD_TASK_STATE.find((item) => item.seed.card.id === taskId)?.status ?? null;
}
