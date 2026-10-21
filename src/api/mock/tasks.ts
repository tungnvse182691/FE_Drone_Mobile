import { RepairWorkOrder } from '../../types/domain';
import { TaskMode, FastTrackEligibility } from '../../types/enums';
import { DEFECT_TYPE_CODES } from '../../constants/defect-types';
import { throwMockApiError } from './errors';
import { FAST_TRACK_POLICY } from './crew-inspection';

export const MOCK_WORK_ORDERS: RepairWorkOrder[] = [
  {
    id: 'WO-01',
    title: 'Đổ bù ổ gà sâu vỡ tấm bê tông Km02+150',
    task_mode: TaskMode.INSPECT_AND_REPAIR,
    assigned_crew_id: 'HH-RC-084',
    route_code: 'ĐH.05',
    section_name: 'Cầu Bà Lát',
    target_defect_id: 'DEF-001',
    defect_type_code: DEFECT_TYPE_CODES.POTH_DEEP,
    due_at: '2026-09-27T17:00:00Z',
    instructions:
      'Đục tẩy toàn bộ mảng bê tông vỡ vụn, quét hồ dầu xi măng liên kết, đổ bù bê tông TCVN 10380:2014. Đủ điều kiện Fast Track sửa nhanh tại chỗ nếu diện tích <= 1.0m2.',
    target_coordinates: [106.7001, 10.7830],
    fast_track_eligible: FastTrackEligibility.ELIGIBLE,
    status: 'ASSIGNED',
    created_at: '2026-09-27T07:30:00Z',
  },
  {
    id: 'WO-02',
    title: 'Khảo sát đợt gom nứt tấm bê tông Km01+850',
    task_mode: TaskMode.MEASURE_ONLY,
    assigned_crew_id: 'HH-RC-084',
    route_code: 'ĐH.05',
    section_name: 'Vĩnh Lộc B',
    target_defect_id: 'DEF-002',
    defect_type_code: DEFECT_TYPE_CODES.SLAB_CRK,
    due_at: '2026-09-27T12:00:00Z',
    instructions:
      'Đợt gom 5 điểm khuyết tật trên tuyến. Bắt buộc CHỈ ĐO ĐẠC hiện trường theo US-35/BR-09, TUYỆT ĐỐI CẤM tự ý sửa tại chỗ.',
    target_coordinates: [106.7050, 10.7875],
    fast_track_eligible: FastTrackEligibility.LOCKED_BY_PM,
    status: 'ASSIGNED',
    created_at: '2026-09-27T08:00:00Z',
  },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** ETag giả lập của từng nhiệm vụ: đổi mỗi khi trạng thái nhiệm vụ thay đổi. */
const WORK_ORDER_ETAGS = new Map<string, string>([['WO-01', 'W/"1"'], ['WO-02', 'W/"1"']]);

/**
 * Idempotency-Key đã dùng → response đã trả trước đó. Khóa tái sử dụng bị server từ chối
 * bằng `idempotency_key_reused` (spec 03), không phải âm thầm trả kết quả cũ.
 */
const usedIdempotencyKeys = new Set<string>();

export async function listWorkOrders(params: { crew_id?: string; mode?: string } = {}) {
  await delay(300);
  let items = [...MOCK_WORK_ORDERS];
  if (params.crew_id) {
    items = items.filter((w) => w.assigned_crew_id === params.crew_id);
  }
  if (params.mode) {
    items = items.filter((w) => w.task_mode === params.mode);
  }
  return { data: { items, total: items.length } };
}

export async function getWorkOrder(id: string) {
  await delay(200);
  const found = MOCK_WORK_ORDERS.find((w) => w.id === id);
  if (!found) {
    throwMockApiError('not_found', { message: 'Không tìm thấy nhiệm vụ' });
  }
  return { data: found };
}

/** Trả về true nếu kích thước đo thực tế nằm trong ngưỡng Fast Track của policy đang chạy. */
function geometryWithinPolicy(payload: {
  actual_length_m: number;
  actual_width_m: number;
  actual_depth_cm: number;
}): boolean {
  const { actual_length_m: length, actual_width_m: width, actual_depth_cm: depth } = payload;
  if (length <= 0 || width <= 0 || depth < 0) {
    return false;
  }
  return (
    length <= FAST_TRACK_POLICY.max_length_m &&
    depth <= FAST_TRACK_POLICY.max_depth_cm &&
    length * width <= FAST_TRACK_POLICY.max_area_m2
  );
}

export async function completeFastTrack(
  workOrderId: string,
  payload: {
    before_evidence_file_id: string;
    after_evidence_file_id: string;
    actual_length_m: number;
    actual_width_m: number;
    actual_depth_cm: number;
    repair_method_code: string;
    notes?: string;
  },
  headers?: { 'Idempotency-Key'?: string; 'If-Match'?: string },
) {
  await delay(500);

  const idempotencyKey = headers?.['Idempotency-Key'];
  if (idempotencyKey) {
    if (usedIdempotencyKeys.has(idempotencyKey)) {
      throwMockApiError('idempotency_key_reused');
    }
    usedIdempotencyKeys.add(idempotencyKey);
  }

  const found = MOCK_WORK_ORDERS.find((w) => w.id === workOrderId);
  if (!found) {
    throwMockApiError('not_found', { message: 'Không tìm thấy nhiệm vụ' });
  }

  const expectedEtag = WORK_ORDER_ETAGS.get(workOrderId);
  const ifMatch = headers?.['If-Match'];
  if (ifMatch && ifMatch !== expectedEtag) {
    throwMockApiError('concurrency_conflict');
  }

  if (found.task_mode !== TaskMode.INSPECT_AND_REPAIR) {
    throwMockApiError('invalid_state_transition');
  }

  if (found.fast_track_eligible === FastTrackEligibility.LOCKED_BY_PM) {
    throwMockApiError('access_forbidden');
  }

  if (!FAST_TRACK_POLICY.allowed_defect_codes.includes(found.defect_type_code)) {
    throwMockApiError('precondition_required');
  }

  if (!payload.before_evidence_file_id.trim()) {
    throwMockApiError('validation_error');
  }

  if (!payload.after_evidence_file_id.trim()) {
    throwMockApiError('source_not_ready');
  }

  if (!geometryWithinPolicy(payload)) {
    throwMockApiError('precondition_required');
  }

  found.status = 'COMPLETED';
  WORK_ORDER_ETAGS.set(workOrderId, 'W/"2"');

  return {
    data: {
      work_order_id: workOrderId,
      status: 'COMPLETED',
      fast_track_acknowledged: true,
      pm_review_pending: true,
    },
  };
}

/* ============================================================================
 * PHẦN 3 — Hợp đồng Crew: C04 bootstrap (API-080), C-08 (API-096/API-159),
 * C-09 lệnh thi công (API-156/157/160/161), C-11 nhận việc ACK (API-135/136/137).
 * ---------------------------------------------------------------------------
 * Khác `listWorkOrders`/`completeFastTrack` (bọc `{ data }`), các hàm dưới trả về
 * THÂN response đã bóc `data` để tầng transport trong `src/hooks/useRepairBootstrap.ts`
 * dùng chung cho cả nhánh mock lẫn nhánh HTTP thật.
 *
 * `itemVersion` là rowversion SQL 8 byte ở dạng Base64 (12 ký tự, kết thúc `=`) của
 * RepairItem — KHÁC `version` (rowversion NGOÀI của task). Mọi lệnh sửa chữa phải gửi
 * `If-Match: "<itemVersion>"` (kèm dấu nháy kép) và server chốt lại sau mỗi lệnh.
 * ========================================================================== */

/** Project mẫu cho luồng Crew (app Crew đang chạy dữ liệu mock, chưa nối BE thật). */
export const MOCK_CREW_PROJECT_ID = '4f6a2c1e-8b3d-4a5f-9c7e-1d2b3a4c5e6f';
export const MOCK_CREW_PACKAGE_ID = '3c4d5e6f-7a8b-4c9d-8e1f-2a3b4c5d6e7f';
/** Người nhận việc hiện tại (responsibleActorId) trong dữ liệu mock C-11. */
export const MOCK_CREW_ACTOR_ID = 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e';

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Sinh rowversion giả 8 byte → Base64 12 ký tự kết thúc `=` (đúng shape wire BE). */
function fakeRowVersion(seed: string, step = 0): string {
  let state = (hashSeed(seed) + step * 2654435761) >>> 0;
  let out = '';
  for (let i = 0; i < 11; i += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    out += B64_ALPHABET[state % 64];
  }
  return `${out}=`;
}

function fakeSha256(seed: string): string {
  let state = hashSeed(seed) || 1;
  let out = '';
  for (let i = 0; i < 64; i += 1) {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    out += (state % 16).toString(16);
  }
  return out;
}

/** Ngữ cảnh sửa chữa (nhánh nullable `repairContext` của API-080 cho Crew NORMAL). */
export interface CrewRepairContext {
  packageId: string;
  itemId: string;
  bindingId: string;
  mode: string;
  status: string;
  itemVersion: string;
  repairPlan: string | null;
  checklistVersion: string | null;
}

export interface CrewFieldTaskViewFact {
  id: string;
  projectId: string;
  defectId: string;
  mode: string;
  status: string;
  /** Rowversion NGOÀI của task (dùng cho API-095), KHÔNG dùng cho lệnh sửa chữa. */
  version: string;
  repairContext: CrewRepairContext | null;
}

/** Bản xem trước FIELD submission (API-096) để C-08 chọn lượt sửa cần đính chính. */
export interface CrewFieldSubmissionView {
  id: string;
  itemId: string;
  taskId: string;
  projectId: string;
  contentHash: string;
  stage: string;
  submissionOrdinal: number;
  submittedAt: string;
  correctionOfSubmissionId: string | null;
}

export interface RepairAssessmentView {
  id: string;
  itemId: string;
  taskId: string;
  firstStartId: string;
  sessionId: string;
  stage: string | null;
  readiness: string | null;
  missingReasons: string[] | null;
  locationState: string | null;
  contentHash: string | null;
}

export interface RepairAttemptIntakeView {
  attemptId: string;
  linkId: string;
  itemId: string;
  submissionId: string;
  reviewClockId: string;
  originalReviewDueAt: string;
  intakeReadiness: string | null;
}

export interface RepairExecutionStartView {
  id: string;
  itemId: string;
  taskId: string;
  assessmentId: string;
  firstStartId: string;
  claimedAt: string;
  serverReceivedAt: string;
  timeProvenance: string | null;
}

export interface RepairExecutionFinishView {
  id: string;
  itemId: string;
  taskId: string;
  executionStartId: string;
  claimedAt: string;
  serverReceivedAt: string;
  timeProvenance: string | null;
}

export interface BusinessDutyView {
  id: string;
  projectId: string;
  kind: string | null;
  sourceKind: string | null;
  sourceId: string;
  sourceVersion: string | null;
  scopeId: string;
  responsibleActorId: string | null;
  responsibleRole: string | null;
  requestedAt: string;
  receivingState: string | null;
  waitingSeconds: number;
  acknowledgmentId: string | null;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  claimedDeviceAt: string | null;
  clockId: string | null;
  originalDueAt: string | null;
  currentDueAt: string | null;
  completedAt: string | null;
  version: string | null;
  appointments: unknown[];
}

export interface BusinessRequestAckInput {
  claimedDeviceAt?: string | null;
}

/** Hồ sơ mặt hàng sửa chữa mock — 1 item / 1 task INSPECT_AND_REPAIR. */
interface MockRepairItem {
  taskId: string;
  itemId: string;
  bindingId: string;
  defectId: string;
  status: string;
  repairPlan: string;
  checklistVersion: string;
}

const MOCK_REPAIR_ITEMS: MockRepairItem[] = [
  {
    taskId: 'task-wo-01',
    itemId: '7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f',
    bindingId: '9e2f3a4b-5c6d-4e7f-8a9b-0c1d2e3f4a5b',
    defectId: 'DEF-001',
    status: 'AWAITING_REVIEW',
    repairPlan:
      'Đục tẩy toàn bộ mảng bê tông vỡ vụn, quét hồ dầu xi măng liên kết, đổ bù bê tông TCVN 10380:2014.',
    checklistVersion: 'CL-POTH-2026-V1',
  },
  {
    taskId: 'task-wo-03',
    itemId: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
    bindingId: '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e',
    defectId: 'DEF-003',
    status: 'IN_PROGRESS',
    repairPlan: 'Gia cố vai đường bằng đá dăm lu lèn chặt theo TCVN 10380:2014.',
    checklistVersion: 'CL-EROS-2026-V1',
  },
];

/** Bước rowversion của RepairItem theo task — tăng sau mỗi lệnh sửa chữa thành công. */
const REPAIR_ITEM_STEPS = new Map<string, number>();

function findRepairItem(taskId: string): MockRepairItem | undefined {
  return MOCK_REPAIR_ITEMS.find((item) => item.taskId === taskId);
}

function currentItemVersion(taskId: string): string {
  return fakeRowVersion(`item:${taskId}`, REPAIR_ITEM_STEPS.get(taskId) ?? 0);
}

function bumpItemVersion(taskId: string): void {
  REPAIR_ITEM_STEPS.set(taskId, (REPAIR_ITEM_STEPS.get(taskId) ?? 0) + 1);
}

const MOCK_FIELD_SUBMISSIONS: CrewFieldSubmissionView[] = [
  {
    id: '5d6e7f8a-9b0c-4d1e-8f2a-3b4c5d6e7f80',
    itemId: '7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f',
    taskId: 'task-wo-01',
    projectId: MOCK_CREW_PROJECT_ID,
    contentHash: fakeSha256('submission:task-wo-01:1'),
    stage: 'ACCEPTED',
    submissionOrdinal: 1,
    submittedAt: '2026-09-27T03:20:00Z',
    correctionOfSubmissionId: null,
  },
  {
    id: '6e7f8a9b-0c1d-4e2f-9a3b-4c5d6e7f8091',
    itemId: '7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f',
    taskId: 'task-wo-01',
    projectId: MOCK_CREW_PROJECT_ID,
    contentHash: fakeSha256('submission:task-wo-01:2'),
    stage: 'AWAITING_PM_REVIEW',
    submissionOrdinal: 2,
    submittedAt: '2026-09-27T05:05:00Z',
    correctionOfSubmissionId: null,
  },
  {
    id: '8a9b0c1d-2e3f-4a4b-8c5d-6e7f8091a2b3',
    itemId: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
    taskId: 'task-wo-03',
    projectId: MOCK_CREW_PROJECT_ID,
    contentHash: fakeSha256('submission:task-wo-03:1'),
    stage: 'AWAITING_PM_REVIEW',
    submissionOrdinal: 1,
    submittedAt: '2026-09-27T06:40:00Z',
    correctionOfSubmissionId: null,
  },
];

const RECEIVING_REQUEST_VERSIONS = new Map<string, number>();
const RECEIVING_ACKNOWLEDGEMENTS = new Map<string, string>();

const MOCK_RECEIVING_REQUESTS: BusinessDutyView[] = [
  {
    id: 'a0b1c2d3-e4f5-4a6b-8c7d-9e0f1a2b3c4d',
    projectId: MOCK_CREW_PROJECT_ID,
    kind: 'REPAIR_REVIEW_REQUEST',
    sourceKind: 'REPAIR_ATTEMPT',
    sourceId: '6e7f8a9b-0c1d-4e2f-9a3b-4c5d6e7f8091',
    sourceVersion: 'W/"2"',
    scopeId: '7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f',
    responsibleActorId: MOCK_CREW_ACTOR_ID,
    responsibleRole: 'REPAIR_CREW',
    requestedAt: '2026-09-27T05:06:00Z',
    receivingState: 'PENDING',
    waitingSeconds: 4200,
    acknowledgmentId: null,
    acknowledgedBy: null,
    acknowledgedAt: null,
    claimedDeviceAt: null,
    clockId: 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f',
    originalDueAt: '2026-09-27T09:06:00Z',
    currentDueAt: '2026-09-27T09:06:00Z',
    completedAt: null,
    version: 'W/"1"',
    appointments: [],
  },
  {
    id: 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e',
    projectId: MOCK_CREW_PROJECT_ID,
    kind: 'FIELD_VERIFICATION',
    sourceKind: 'FIELD_SUBMISSION',
    sourceId: '8a9b0c1d-2e3f-4a4b-8c5d-6e7f8091a2b3',
    sourceVersion: 'W/"1"',
    scopeId: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
    responsibleActorId: MOCK_CREW_ACTOR_ID,
    responsibleRole: 'REPAIR_CREW',
    requestedAt: '2026-09-27T06:41:00Z',
    receivingState: 'PENDING',
    waitingSeconds: 360,
    acknowledgmentId: null,
    acknowledgedBy: null,
    acknowledgedAt: null,
    claimedDeviceAt: null,
    clockId: null,
    originalDueAt: null,
    currentDueAt: null,
    completedAt: null,
    version: 'W/"1"',
    appointments: [],
  },
  {
    id: 'c2d3e4f5-a6b7-4c8d-9e0f-1a2b3c4d5e6f',
    projectId: MOCK_CREW_PROJECT_ID,
    kind: 'HANDOVER_RECEIPT',
    sourceKind: 'REPAIR_HANDOVER',
    sourceId: 'd3e4f5a6-b7c8-4d9e-8f0a-1b2c3d4e5f60',
    sourceVersion: 'W/"1"',
    scopeId: MOCK_CREW_PACKAGE_ID,
    responsibleActorId: MOCK_CREW_ACTOR_ID,
    responsibleRole: 'REPAIR_CREW',
    requestedAt: '2026-09-26T23:10:00Z',
    receivingState: 'ACKNOWLEDGED',
    waitingSeconds: 0,
    acknowledgmentId: 'e4f5a6b7-c8d9-4e0f-8a1b-2c3d4e5f6071',
    acknowledgedBy: MOCK_CREW_ACTOR_ID,
    acknowledgedAt: '2026-09-26T23:42:00Z',
    claimedDeviceAt: '2026-09-26T23:42:00Z',
    clockId: null,
    originalDueAt: null,
    currentDueAt: null,
    completedAt: null,
    version: 'W/"2"',
    appointments: [],
  },
];

function currentReceivingVersion(requestId: string, base: string | null): string {
  const step = RECEIVING_REQUEST_VERSIONS.get(requestId) ?? 0;
  return step === 0 ? (base ?? 'W/"1"') : `W/"${step + 1}"`;
}

function guardIdempotency(scope: string, key: string | undefined): void {
  if (!key) {
    return;
  }
  const composite = `${scope}:${key}`;
  if (usedIdempotencyKeys.has(composite)) {
    throwMockApiError('idempotency_key_reused');
  }
  usedIdempotencyKeys.add(composite);
}

/** Chốt If-Match của RepairItem: thiếu → 428, lệch → 409 (đúng quy tắc spec 05). */
function assertItemIfMatch(taskId: string, ifMatch: string | undefined): void {
  if (!ifMatch) {
    throwMockApiError('precondition_required');
  }
  if (ifMatch !== `"${currentItemVersion(taskId)}"`) {
    throwMockApiError('concurrency_conflict');
  }
}

/**
 * Fixture nhiệm vụ Crew cho API-080. Dùng id `task-wo-xx` của màn Công việc
 * (`app/(crew)/tasks.tsx`) — KHÁC `MOCK_WORK_ORDERS` (id `WO-xx`) của luồng cũ.
 */
const MOCK_CREW_TASK_FIXTURES: { id: string; mode: TaskMode; status: string; defectId: string }[] = [
  { id: 'task-wo-01', mode: TaskMode.INSPECT_AND_REPAIR, status: 'ASSIGNED', defectId: 'DEF-001' },
  { id: 'task-wo-02', mode: TaskMode.MEASURE_ONLY, status: 'ASSIGNED', defectId: 'DEF-002' },
  { id: 'task-wo-03', mode: TaskMode.INSPECT_AND_REPAIR, status: 'ASSIGNED', defectId: 'DEF-003' },
  { id: 'task-wo-04', mode: TaskMode.INSPECT_AND_REPAIR, status: 'COMPLETED', defectId: 'DEF-002' },
  { id: 'task-wo-05', mode: TaskMode.INSPECT_AND_REPAIR, status: 'COMPLETED', defectId: 'DEF-004' },
];

/** API-080 — chi tiết task + `repairContext` (null với MEASURE_ONLY / ngoài phân công). */
export async function getCrewFieldTaskView(taskId: string): Promise<CrewFieldTaskViewFact> {
  await delay(250);
  const fixture = MOCK_CREW_TASK_FIXTURES.find((t) => t.id === taskId);
  if (!fixture) {
    throwMockApiError('not_found', { message: 'Không tìm thấy nhiệm vụ' });
  }
  const item = findRepairItem(taskId);
  return {
    id: taskId,
    projectId: MOCK_CREW_PROJECT_ID,
    defectId: item?.defectId ?? fixture.defectId,
    mode: fixture.mode,
    status: fixture.status,
    version: fakeRowVersion(`task:${taskId}`, 0),
    repairContext: item
      ? {
          packageId: MOCK_CREW_PACKAGE_ID,
          itemId: item.itemId,
          bindingId: item.bindingId,
          mode: 'NORMAL',
          status: item.status,
          itemVersion: currentItemVersion(taskId),
          repairPlan: item.repairPlan,
          checklistVersion: item.checklistVersion,
        }
      : null,
  };
}

/** API-096 — danh sách FIELD submission của mặt hàng (C-08 chọn lượt cần đính chính). */
export async function listCrewFieldSubmissions(
  taskId: string,
): Promise<CrewFieldSubmissionView[]> {
  await delay(200);
  return MOCK_FIELD_SUBMISSIONS.filter((submission) => submission.taskId === taskId).map(
    (submission) => ({ ...submission }),
  );
}

/** API-159 — đính chính (supplement) một lượt sửa đã gửi. */
export async function supplementRepairAttempt(
  taskId: string,
  input: { fieldSubmissionId: string; expectedContentHash: string },
  headers?: { 'Idempotency-Key'?: string; 'If-Match'?: string },
): Promise<RepairAttemptIntakeView> {
  await delay(450);
  guardIdempotency('API-159', headers?.['Idempotency-Key']);
  const item = findRepairItem(taskId);
  if (!item) {
    throwMockApiError('not_found', { message: 'Nhiệm vụ không có mặt hàng sửa chữa' });
  }
  assertItemIfMatch(taskId, headers?.['If-Match']);

  const submission = MOCK_FIELD_SUBMISSIONS.find((s) => s.id === input.fieldSubmissionId);
  if (!submission || submission.itemId !== item.itemId) {
    throwMockApiError('not_found', { message: 'Không tìm thấy lượt sửa cần đính chính' });
  }
  if (submission.stage === 'SUPPLEMENTED') {
    throwMockApiError('invalid_state_transition');
  }
  if (submission.contentHash !== input.expectedContentHash) {
    throwMockApiError('submission_lineage_conflict');
  }

  submission.stage = 'SUPPLEMENTED';
  bumpItemVersion(taskId);

  return {
    attemptId: fakeSha256(`attempt:${submission.id}`).slice(0, 32),
    linkId: fakeSha256(`link:${submission.id}`).slice(0, 32),
    itemId: item.itemId,
    submissionId: submission.id,
    reviewClockId: 'f5a6b7c8-d9e0-4f1a-8b2c-3d4e5f607182',
    originalReviewDueAt: '2026-09-27T13:05:00Z',
    intakeReadiness: 'READY',
  };
}

/** API-156 — gửi đánh giá/measurement sửa chữa (C-09). */
export async function submitRepairAssessment(
  taskId: string,
  input: Record<string, unknown>,
  headers?: { 'Idempotency-Key'?: string; 'If-Match'?: string },
): Promise<RepairAssessmentView> {
  await delay(400);
  guardIdempotency('API-156', headers?.['Idempotency-Key']);
  const item = findRepairItem(taskId);
  if (!item) {
    throwMockApiError('not_found', { message: 'Nhiệm vụ không có mặt hàng sửa chữa' });
  }
  assertItemIfMatch(taskId, headers?.['If-Match']);
  bumpItemVersion(taskId);
  return {
    id: 'a6b7c8d9-e0f1-4a2b-8c3d-4e5f60718293',
    itemId: item.itemId,
    taskId,
    firstStartId: String(input.fieldFirstStartId ?? ''),
    sessionId: 'b7c8d9e0-f1a2-4b3c-8d4e-5f60718293a4',
    stage: 'ASSESSED',
    readiness: 'READY',
    missingReasons: null,
    locationState: 'VERIFIED',
    contentHash: fakeSha256(`assessment:${taskId}`),
  };
}

/** API-157 — nộp lượt sửa (attempt) cho PM duyệt (C-09). */
export async function submitRepairAttempt(
  taskId: string,
  input: Record<string, unknown>,
  headers?: { 'Idempotency-Key'?: string; 'If-Match'?: string },
): Promise<RepairAttemptIntakeView> {
  await delay(400);
  guardIdempotency('API-157', headers?.['Idempotency-Key']);
  const item = findRepairItem(taskId);
  if (!item) {
    throwMockApiError('not_found', { message: 'Nhiệm vụ không có mặt hàng sửa chữa' });
  }
  assertItemIfMatch(taskId, headers?.['If-Match']);
  bumpItemVersion(taskId);
  return {
    attemptId: 'c8d9e0f1-a2b3-4c4d-8e5f-60718293a4b5',
    linkId: 'd9e0f1a2-b3c4-4d5e-8f60-718293a4b5c6',
    itemId: item.itemId,
    submissionId: String(input.fieldSubmissionId ?? ''),
    reviewClockId: 'e0f1a2b3-c4d5-4e6f-8071-8293a4b5c6d7',
    originalReviewDueAt: '2026-09-27T13:05:00Z',
    intakeReadiness: 'READY',
  };
}

/** API-161 — bắt đầu thi công sửa chữa (C-09). */
export async function startRepairExecution(
  taskId: string,
  input: Record<string, unknown>,
  headers?: { 'Idempotency-Key'?: string; 'If-Match'?: string },
): Promise<RepairExecutionStartView> {
  await delay(400);
  guardIdempotency('API-161', headers?.['Idempotency-Key']);
  const item = findRepairItem(taskId);
  if (!item) {
    throwMockApiError('not_found', { message: 'Nhiệm vụ không có mặt hàng sửa chữa' });
  }
  assertItemIfMatch(taskId, headers?.['If-Match']);
  bumpItemVersion(taskId);
  return {
    id: 'f1a2b3c4-d5e6-4f70-8192-a3b4c5d6e7f8',
    itemId: item.itemId,
    taskId,
    assessmentId: String(input.assessmentId ?? ''),
    firstStartId: String(input.fieldFirstStartId ?? ''),
    claimedAt: String(input.claimedAt ?? new Date().toISOString()),
    serverReceivedAt: new Date().toISOString(),
    timeProvenance: 'DEVICE_MONOTONIC',
  };
}

/** API-160 — kết thúc thi công sửa chữa (C-09). */
export async function finishRepairExecution(
  taskId: string,
  input: Record<string, unknown>,
  headers?: { 'Idempotency-Key'?: string; 'If-Match'?: string },
): Promise<RepairExecutionFinishView> {
  await delay(400);
  guardIdempotency('API-160', headers?.['Idempotency-Key']);
  const item = findRepairItem(taskId);
  if (!item) {
    throwMockApiError('not_found', { message: 'Nhiệm vụ không có mặt hàng sửa chữa' });
  }
  assertItemIfMatch(taskId, headers?.['If-Match']);
  bumpItemVersion(taskId);
  return {
    id: 'a2b3c4d5-e6f7-4a81-92b3-c4d5e6f70819',
    itemId: item.itemId,
    taskId,
    executionStartId: String(input.executionStartId ?? ''),
    claimedAt: String(input.claimedAt ?? new Date().toISOString()),
    serverReceivedAt: new Date().toISOString(),
    timeProvenance: 'DEVICE_MONOTONIC',
  };
}

/** API-135 — danh sách yêu cầu nhận việc (C-11, bước 1). */
export async function listReceivingRequests(
  params: { scopeId?: string; after?: string; limit?: number } = {},
): Promise<{ items: BusinessDutyView[]; continuation: string | null }> {
  await delay(300);
  const limit = Math.min(Math.max(params.limit ?? 25, 1), 100);
  let items = MOCK_RECEIVING_REQUESTS.map((request) => ({ ...request }));
  if (params.scopeId) {
    items = items.filter((request) => request.scopeId === params.scopeId);
  }
  if (params.after) {
    const index = items.findIndex((request) => request.id === params.after);
    items = index >= 0 ? items.slice(index + 1) : items;
  }
  return { items: items.slice(0, limit), continuation: null };
}

/** API-136 — chi tiết yêu cầu nhận việc (C-11, bước 2). */
export async function getReceivingRequest(requestId: string): Promise<BusinessDutyView> {
  await delay(250);
  const found = MOCK_RECEIVING_REQUESTS.find((request) => request.id === requestId);
  if (!found) {
    throwMockApiError('not_found', { message: 'Không tìm thấy yêu cầu nhận việc' });
  }
  return { ...found, version: currentReceivingVersion(requestId, found.version) };
}

/**
 * API-137 — ACK nhận việc (C-11, bước 3). ACK đầu tiên là bất biến: version đổi sau
 * ACK, nên If-Match cũ → 409 `concurrency_conflict`, còn ACK lại trên bản ghi đã nhận
 * → 409 `request_source_stale` (server chốt người nhận đầu tiên, không reset đồng hồ).
 */
export async function ackReceivingRequest(
  requestId: string,
  input: BusinessRequestAckInput,
  headers?: { 'Idempotency-Key'?: string; 'If-Match'?: string },
): Promise<BusinessDutyView> {
  await delay(400);
  guardIdempotency('API-137', headers?.['Idempotency-Key']);
  const found = MOCK_RECEIVING_REQUESTS.find((request) => request.id === requestId);
  if (!found) {
    throwMockApiError('not_found', { message: 'Không tìm thấy yêu cầu nhận việc' });
  }

  const ifMatch = headers?.['If-Match'];
  if (!ifMatch) {
    throwMockApiError('precondition_required');
  }
  if (ifMatch !== currentReceivingVersion(requestId, found.version)) {
    throwMockApiError('concurrency_conflict');
  }
  if (found.acknowledgmentId) {
    throwMockApiError('request_source_stale');
  }

  const step = RECEIVING_REQUEST_VERSIONS.get(requestId) ?? 0;
  RECEIVING_REQUEST_VERSIONS.set(requestId, step + 1);
  const ackId = `ack-${fakeSha256(`ack:${requestId}`).slice(0, 32)}`;
  RECEIVING_ACKNOWLEDGEMENTS.set(requestId, ackId);

  found.receivingState = 'ACKNOWLEDGED';
  found.acknowledgmentId = ackId;
  found.acknowledgedBy = MOCK_CREW_ACTOR_ID;
  found.acknowledgedAt = new Date().toISOString();
  found.claimedDeviceAt = input.claimedDeviceAt ?? null;
  found.waitingSeconds = 0;

  return {
    ...found,
    version: currentReceivingVersion(requestId, found.version),
  };
}

export function getMockReceivingAcknowledgementId(requestId: string): string | undefined {
  return RECEIVING_ACKNOWLEDGEMENTS.get(requestId);
}
