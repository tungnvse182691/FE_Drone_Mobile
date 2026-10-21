import { SurveyDataVersion, SurveyTask } from '../../types/domain';
import { SyncStatus, IntegrationStatus } from '../../types/enums';
import type { UploadSessionResponseDto } from '../uploads';
import { throwMockApiError } from './errors';

/**
 * Tuyến khảo nghiệm chính ĐH.05 theo spec canonical: Vĩnh Lộc B, Cầu Bà Lát
 * (Km01+850), Tân Kiên (Km03+100). Toạ độ WGS84 theo thứ tự [longitude, latitude].
 */
export const MOCK_SURVEY_TASKS: SurveyTask[] = [
  {
    id: 'ST-001',
    code: '#HH-409-VL-B',
    title: 'Khảo sát tuyến Vĩnh Lộc B - Km00+000 đến Km01+600',
    project_id: 'P001',
    route_code: 'ĐH.05',
    section_name: 'Vĩnh Lộc B',
    location_desc: 'Tuyến ĐH.05, Vĩnh Lộc B, huyện Bình Chánh, TP.HCM',
    length_km: 1.6,
    altitude_m: 60,
    overlap_forward_ratio: 0.8,
    overlap_side_ratio: 0.7,
    format: 'DJI/4K RGB',
    sensor: '4K RGB + DSM (OpenDroneMap)',
    post_processing: 'Mosaic + DSM, tuyệt đối KHÔNG dùng LiDAR',
    access_point: {
      name: 'AP-Vĩnh Lộc B-Đầu tuyến',
      terrain_description: 'Bãi đất trống cạnh lề đường, cách mặt đường 25m',
      coordinates: [106.6980, 10.7890],
      safe_radius_m: 20,
    },
    assigned_pilot_id: 'HH-2089',
    status: 'ASSIGNED',
    due_at: '2026-09-27T12:00:00Z',
    instructions: 'Bay theo hướng Km tăng dần, giữ cao độ 60m, chụp 4K RGB + quét DSM.',
    pm_name: 'Nguyễn Văn A',
    drone_serial: 'M350-HH-02',
  },
  {
    id: 'ST-002',
    code: '#HH-409-CBL',
    title: 'Khảo sát cầu Bà Lát - Km01+850',
    project_id: 'P001',
    route_code: 'ĐH.05',
    section_name: 'Cầu Bà Lát',
    location_desc: 'Km01+850, cầu Bà Lát, huyện Bình Chánh, TP.HCM',
    length_km: 0.4,
    altitude_m: 55,
    overlap_forward_ratio: 0.8,
    overlap_side_ratio: 0.7,
    format: 'DJI/4K RGB',
    sensor: '4K RGB + DSM (OpenDroneMap)',
    post_processing: 'Mosaic + DSM, tuyệt đối KHÔNG dùng LiDAR',
    access_point: {
      name: 'AP-Cầu Bà Lát-Nhánh hạ nguồn',
      terrain_description: 'Khoảng trống trên bờ cầu phía hạ nguồn, cách lan can 15m',
      coordinates: [106.7001, 10.7830],
      safe_radius_m: 15,
    },
    assigned_pilot_id: 'HH-2089',
    status: 'ASSIGNED',
    due_at: '2026-09-27T14:00:00Z',
    instructions: 'Giữ an toàn trên nhánh cầu, tránh bay sát lan can, ưu tiên góc chụp nghiêng.',
    pm_name: 'Nguyễn Văn A',
    drone_serial: 'M350-HH-02',
  },
  {
    id: 'ST-003',
    code: '#HH-409-TK',
    title: 'Khảo sát Tân Kiên - Km03+100',
    project_id: 'P001',
    route_code: 'ĐH.05',
    section_name: 'Tân Kiên',
    location_desc: 'Km03+100, Tân Kiên, huyện Bình Chánh, TP.HCM',
    length_km: 1.2,
    altitude_m: 60,
    overlap_forward_ratio: 0.8,
    overlap_side_ratio: 0.7,
    format: 'DJI/4K RGB',
    sensor: '4K RGB + DSM (OpenDroneMap)',
    post_processing: 'Mosaic + DSM, tuyệt đối KHÔNG dùng LiDAR',
    access_point: {
      name: 'AP-Tân Kiên-Đầu hướng',
      terrain_description: 'Bãi đất cạnh đường giao nhánh, cách mặt đường 20m',
      coordinates: [106.7050, 10.7875],
      safe_radius_m: 20,
    },
    assigned_pilot_id: 'HH-2089',
    status: 'ASSIGNED',
    due_at: '2026-09-27T16:00:00Z',
    instructions: 'Kiểm tra khu vực lún võng đọng nước, chụp chi tiết mặt nước tích tụ.',
    pm_name: 'Nguyễn Văn A',
    drone_serial: 'M350-HH-02',
  },
];

const MOCK_SURVEYS: SurveyDataVersion[] = [
  {
    id: 'SDV-001',
    survey_id: 'SUR-001',
    version_no: 1,
    status: SyncStatus.LOCAL,
    integration_status: IntegrationStatus.INTACT,
    checksum_sha256: null,
    files: [
      { video_id: 'VID-001', srt_id: 'SRT-001', size_bytes: 104857600 },
    ],
    server_confirmed_at: null,
  },
  {
    id: 'SDV-002',
    survey_id: 'SUR-002',
    version_no: 1,
    status: SyncStatus.SERVER_CONFIRMED,
    integration_status: IntegrationStatus.INTACT,
    // Không có tệp thật trong mock nên không ghi checksum bịa; để null cho tới khi
    // upload thật và băm SHA-256, tránh giá trị giả bị hiểu là đã đối chiếu.
    checksum_sha256: null,
    files: [
      { video_id: 'VID-002', srt_id: null, size_bytes: 52428800 },
      { video_id: 'VID-003', srt_id: 'SRT-002', size_bytes: 26214400 },
    ],
    server_confirmed_at: '2024-09-15T10:30:00Z',
  },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function listSurveyTasks(params: { route_code?: string; status?: string } = {}) {
  await delay(300);
  let items = [...MOCK_SURVEY_TASKS];
  if (params.route_code) {
    items = items.filter((t) => t.route_code === params.route_code);
  }
  if (params.status) {
    items = items.filter((t) => t.status === params.status);
  }
  return { data: { items, total: items.length } };
}

export async function listSurveys(params: { status?: string; period?: string } = {}) {
  await delay(300);
  let items = [...MOCK_SURVEYS];
  if (params.status) {
    items = items.filter((s) => s.status === params.status);
  }
  return { data: { items, total: items.length } };
}

export async function getSurvey(id: string) {
  await delay(200);
  const item = MOCK_SURVEYS.find((s) => s.id === id);
  if (!item) {
    throwMockApiError('not_found', { message: 'Không tìm thấy yêu cầu khảo sát' });
  }
  return { data: item };
}

export async function uploadSurvey(id: string, checksum: string) {
  await delay(800);
  const item = MOCK_SURVEYS.find((s) => s.id === id);
  if (!item) {
    throwMockApiError('not_found', { message: 'Không tìm thấy yêu cầu khảo sát' });
  }
  if (!/^[a-f0-9]{64}$/i.test(checksum.trim())) {
    throwMockApiError('upload_validation_failed');
  }
  const confirmedAt = new Date().toISOString();
  item.status = SyncStatus.SERVER_CONFIRMED;
  item.checksum_sha256 = checksum.trim().toLowerCase();
  item.server_confirmed_at = confirmedAt;
  return {
    data: {
      status: SyncStatus.SERVER_CONFIRMED,
      server_confirmed_at: confirmedAt,
    },
  };
}

// =============================================================================
// OPERATOR (DRONE) — mock cho O-02 → O-08
//
// Nguồn hợp đồng: docs/specs/04_API-Contracts/02_Full-API-Catalog.md
//   API-226 GET  /api/v1/survey-tasks/{taskId}
//   API-225 GET  /api/v1/survey-tasks/{id}/work-package
//   API-104 GET  /api/v1/projects/{projectId}/geometry-package
//   API-230 POST /api/v1/survey-tasks/{taskId}/decline   (Idempotency-Key + If-Match)
//   API-234 GET  /api/v1/uploads/{uploadId}
//
// Quy tắc 409/412/428: docs/specs/04_API-Contracts/05_Idempotency-Concurrency-and-Errors.md
// Ma trận 401/403/404/409/412/428/429/5xx: Operator/03_Task-Dataset-and-Error-Handling.md
// =============================================================================

/** Trạng thái nhiệm vụ khảo sát do máy chủ làm authority (canonical). */
export type OperatorTaskStatus =
  | 'NewAssigned'
  | 'Accepted'
  | 'InProgress'
  | 'Submitted'
  | 'SupplementRequired'
  | 'Completed'
  | 'Rejected'
  | 'Cancelled'
  | 'Postponed';

/** ## Schema PointDto — toạ độ wire luôn [longitude, latitude]. */
export interface OperatorPointDto {
  longitude: number;
  latitude: number;
}

/** ## Schema PositionDto — required `point`, `source`. */
export interface OperatorPositionDto {
  point: OperatorPointDto;
  source: string;
  accuracyMeters?: number | null;
  capturedAt?: string | null;
}

/** ## Schema BandScopeDto — required `targetBand`. */
export interface OperatorBandScopeDto {
  routeVersionId: string;
  segmentSetId: string;
  segmentIds: string[];
  targetBand: string;
}

/** ## Schema SurveyGeometryRefDto. */
export interface OperatorSurveyGeometryRefDto {
  routeVersionId: string;
  segmentSetId: string;
  segmentIds: string[];
}

/** ## Schema SurveyTaskV2ResponseDto (rút gọn trường UI cần). */
export interface OperatorSurveyTaskV2Dto {
  id: string;
  projectId: string;
  operatorId: string;
  status: OperatorTaskStatus;
  scope: OperatorBandScopeDto[];
  rejectionReason?: string | null;
}

/** ## Schema SurveyTaskWorkPackage (API-225). */
export interface OperatorSurveyTaskWorkPackageDto {
  schemaVersion: string;
  task: OperatorSurveyTaskV2Dto;
  dueAt: string;
  accessPoint: OperatorPositionDto;
  geometryRefs: OperatorSurveyGeometryRefDto[];
  scopeVersion: string;
}

/** ## Schema WidthProfileItem (rút gọn trường UI cần). */
export interface OperatorWidthProfileItemDto {
  stationMeters: number;
  halfWidthMeters: number;
}

/** ## Schema RoadGeometryVersionView (rút gọn trường UI cần). */
export interface OperatorRoadGeometryVersionDto {
  projectId: string;
  roadSectionId: string;
  routeVersionId: string;
  versionNo: number;
  isCurrent: boolean;
  effectiveFrom: string;
  sourceCrs: number;
  engineeringSrid: number;
  stationOriginMeters: number;
  widthProfile: OperatorWidthProfileItemDto[];
  surveyWidthMeters: number;
  lengthMeters: number;
  metadataStatus: string;
  approvedAt: string | null;
  geometryHash: string;
  routeKind: string;
}

/** ## Schema SegmentSetView (rút gọn trường UI cần). */
export interface OperatorSegmentSetDto {
  segmentSetId: string;
  projectId: string;
  segmentCount: number;
  lengthMeters: number;
}

/** ## Schema GeometryPackageView (API-104). */
export interface OperatorGeometryPackageViewDto {
  schemaVersion: string;
  projectId: string;
  route: OperatorRoadGeometryVersionDto;
  segmentSet: OperatorSegmentSetDto;
}

/** Trạng thái một lệnh đã gửi, dùng cho O-08 (history/recovery). */
export type OperatorCommandState =
  | 'ACKED'
  | 'REJECTED'
  | 'CONFLICT'
  | 'UNKNOWN_OUTCOME'
  | 'PAUSED_RETRY';

/** Một dòng sổ lệnh (wire_command) hiển thị ở màn O-08. */
export interface OperatorCommandRecord {
  commandId: string;
  apiId: string;
  label: string;
  taskId: string | null;
  taskCode: string | null;
  uploadId: string | null;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  state: OperatorCommandState;
  httpStatus: number | null;
  resultCode: string | null;
  message: string;
  createdAt: string;
}

/** Kết quả đọc API-226 kèm ETag (phiên bản mới nhất để gửi If-Match). */
export interface OperatorSurveyTaskDetailView {
  task: OperatorSurveyTaskV2Dto;
  etag: string;
  code: string;
  title: string;
  routeTitle: string;
  location: string;
  droneModel: string;
  droneSerial: string;
  dueAt: string;
  scopeVersion: string;
  targetBand: string;
  segmentIds: string[];
  accessPointName: string;
  terrain: string;
  accessPoint: OperatorPointDto;
  safeRadiusM: number;
}

interface OperatorTaskFixture {
  taskId: string;
  uuid: string;
  code: string;
  title: string;
  routeTitle: string;
  location: string;
  droneModel: string;
  droneSerial: string;
  status: OperatorTaskStatus;
  projectId: string;
  routeVersionId: string;
  segmentSetId: string;
  targetBand: string;
  segmentIds: string[];
  scopeVersion: string;
  accessPointName: string;
  terrain: string;
  longitude: number;
  latitude: number;
  safeRadiusM: number;
  dueAt: string;
  operatorId: string;
}

const OPERATOR_ROUTE_VERSION_ID = '9f1c2b3a-4d5e-4f60-8a1b-2c3d4e5f6071';
const OPERATOR_SEGMENT_SET_ID = '7a2b3c4d-5e6f-4071-8b9c-0d1e2f304152';
const OPERATOR_ROAD_SECTION_ID = '5c1d2e3f-4a5b-4061-8c7d-9e0f1a2b3c4d';
const OPERATOR_PROJECT_ID = '4f6a2c1e-8b3d-4a5f-9c7e-1d2b3a4c5e6f';
const OPERATOR_ACTOR_ID = '2b3c4d5e-6f70-4182-9a3b-4c5d6e7f8091';

const OPERATOR_TASK_FIXTURES: OperatorTaskFixture[] = [
  {
    taskId: '10000000-0000-4000-8000-000000000089',
    uuid: OPERATOR_PROJECT_ID,
    code: '#HH-KS-089',
    title: 'Khảo sát tuyến Vĩnh Lộc B - Km00+000 đến Km01+600',
    routeTitle: 'Tuyến ĐH.05 — Vĩnh Lộc B',
    location: 'Km00+000 → Km01+600, Vĩnh Lộc B, huyện Bình Chánh, TP.HCM',
    droneModel: 'DJI M350 RTK',
    droneSerial: 'M350-HH-02',
    status: 'NewAssigned',
    projectId: OPERATOR_PROJECT_ID,
    routeVersionId: OPERATOR_ROUTE_VERSION_ID,
    segmentSetId: OPERATOR_SEGMENT_SET_ID,
    targetBand: '4K RGB + DSM',
    segmentIds: [
      '20000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000002',
      '20000000-0000-4000-8000-000000000003',
    ],
    scopeVersion: 'rv-2026.09.27-3',
    accessPointName: 'AP-Vĩnh Lộc B-Đầu tuyến',
    terrain: 'Bãi đất trống cạnh lề đường, cách mặt đường 25m',
    longitude: 106.698,
    latitude: 10.789,
    safeRadiusM: 20,
    dueAt: '2026-09-27T12:00:00Z',
    operatorId: OPERATOR_ACTOR_ID,
  },
  {
    taskId: '10000000-0000-4000-8000-000000000090',
    uuid: OPERATOR_PROJECT_ID,
    code: '#HH-KS-090',
    title: 'Khảo sát cầu Bà Lát - Km01+850',
    routeTitle: 'Tuyến ĐH.05 — Cầu Bà Lát',
    location: 'Km01+850, cầu Bà Lát, huyện Bình Chánh, TP.HCM',
    droneModel: 'DJI M350 RTK',
    droneSerial: 'M350-HH-02',
    status: 'Accepted',
    projectId: OPERATOR_PROJECT_ID,
    routeVersionId: OPERATOR_ROUTE_VERSION_ID,
    segmentSetId: OPERATOR_SEGMENT_SET_ID,
    targetBand: '4K RGB + DSM',
    segmentIds: ['20000000-0000-4000-8000-000000000004'],
    scopeVersion: 'rv-2026.09.27-3',
    accessPointName: 'AP-Cầu Bà Lát-Nhánh hạ nguồn',
    terrain: 'Khoảng trống trên bờ cầu phía hạ nguồn, cách lan can 15m',
    longitude: 106.7001,
    latitude: 10.783,
    safeRadiusM: 15,
    dueAt: '2026-09-27T14:00:00Z',
    operatorId: OPERATOR_ACTOR_ID,
  },
  {
    taskId: '10000000-0000-4000-8000-000000000088',
    uuid: OPERATOR_PROJECT_ID,
    code: '#HH-KS-088',
    title: 'Khảo sát Tân Kiên - Km03+100',
    routeTitle: 'Tuyến ĐH.05 — Tân Kiên',
    location: 'Km03+100, Tân Kiên, huyện Bình Chánh, TP.HCM',
    droneModel: 'DJI M350 RTK',
    droneSerial: 'M350-HH-02',
    status: 'NewAssigned',
    projectId: OPERATOR_PROJECT_ID,
    routeVersionId: OPERATOR_ROUTE_VERSION_ID,
    segmentSetId: OPERATOR_SEGMENT_SET_ID,
    targetBand: '4K RGB + DSM',
    segmentIds: ['20000000-0000-4000-8000-000000000005'],
    scopeVersion: 'rv-2026.09.27-3',
    accessPointName: 'AP-Tân Kiên-Đầu hướng',
    terrain: 'Bãi đất cạnh đường giao nhánh, cách mặt đường 20m',
    longitude: 106.705,
    latitude: 10.7875,
    safeRadiusM: 20,
    dueAt: '2026-09-27T16:00:00Z',
    operatorId: OPERATOR_ACTOR_ID,
  },
];

const OPERATOR_VERSION_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function operatorHashSeed(value: string): number {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

/** Sinh rowversion giả dạng Base64 12 ký tự kết `=`, khớp pattern `^"[A-Za-z0-9+/]{11}="$`. */
function operatorRowVersion(seed: string, step = 0): string {
  let state = (operatorHashSeed(seed) + step * 2654435761) >>> 0;
  let out = '';
  for (let i = 0; i < 11; i += 1) {
    state = Math.imul(state ^ (state >>> 13), 2246822519) >>> 0;
    out += OPERATOR_VERSION_ALPHABET[state % 64];
  }
  return `${out}=`;
}

const OPERATOR_TASK_STEPS = new Map<string, number>();
const OPERATOR_TASK_STATUS = new Map<string, OperatorTaskStatus>(
  OPERATOR_TASK_FIXTURES.map((fixture) => [fixture.taskId, fixture.status]),
);

function findOperatorTask(taskIdOrCode: string): OperatorTaskFixture | undefined {
  return OPERATOR_TASK_FIXTURES.find(
    (fixture) => fixture.taskId === taskIdOrCode || fixture.code === taskIdOrCode,
  );
}

function currentOperatorTaskVersion(taskId: string): string {
  return operatorRowVersion(`survey-task:${taskId}`, OPERATOR_TASK_STEPS.get(taskId) ?? 0);
}

function bumpOperatorTaskVersion(taskId: string): void {
  OPERATOR_TASK_STEPS.set(taskId, (OPERATOR_TASK_STEPS.get(taskId) ?? 0) + 1);
}

function operatorTaskStatus(taskId: string): OperatorTaskStatus {
  return OPERATOR_TASK_STATUS.get(taskId) ?? 'NewAssigned';
}

const OPERATOR_COMMAND_LEDGER: OperatorCommandRecord[] = [];
const OPERATOR_IDEMPOTENCY = new Map<string, { status: number; body: unknown }>();

function seedOperatorLedger(): void {
  OPERATOR_COMMAND_LEDGER.push({
    commandId: 'cmd-seed-decline-089',
    apiId: 'API-230',
    label: 'Từ chối nhiệm vụ khảo sát',
    taskId: '10000000-0000-4000-8000-000000000089',
    taskCode: '#HH-KS-089',
    uploadId: null,
    idempotencyKey: 'API-230:seed-089',
    payload: { kind: 'decline', reason: 'Trùng tuyến với nhiệm vụ khác, đề nghị PM gộp chuyến.' },
    state: 'UNKNOWN_OUTCOME',
    httpStatus: null,
    resultCode: null,
    message: 'Mất kết nối khi gửi — chưa xác nhận được máy chủ đã nhận lệnh.',
    createdAt: '2026-09-26T23:40:00Z',
  });
  OPERATOR_COMMAND_LEDGER.push({
    commandId: 'cmd-seed-upload-complete-02',
    apiId: 'API-235',
    label: 'Hoàn tất tải lên video 4K',
    taskId: '10000000-0000-4000-8000-000000000090',
    taskCode: '#HH-KS-090',
    uploadId: '30000000-0000-4000-8000-000000000002',
    idempotencyKey: 'API-235:seed-upload-02',
    payload: { kind: 'upload_complete', uploadId: '30000000-0000-4000-8000-000000000002' },
    state: 'ACKED',
    httpStatus: 200,
    resultCode: null,
    message: 'Máy chủ đã nhận; tệp đang chờ xác minh (chưa VERIFIED).',
    createdAt: '2026-09-26T22:05:00Z',
  });
}

seedOperatorLedger();

function appendOperatorCommand(
  record: Omit<OperatorCommandRecord, 'commandId' | 'createdAt'>,
): OperatorCommandRecord {
  const entry: OperatorCommandRecord = {
    ...record,
    commandId: `cmd-${operatorHashSeed(`${record.apiId}:${record.idempotencyKey}`).toString(16)}`,
    createdAt: new Date().toISOString(),
  };
  OPERATOR_COMMAND_LEDGER.unshift(entry);
  return entry;
}

function patchOperatorCommand(
  commandId: string,
  patch: Partial<OperatorCommandRecord>,
): OperatorCommandRecord | undefined {
  const index = OPERATOR_COMMAND_LEDGER.findIndex((item) => item.commandId === commandId);
  if (index < 0) {
    return undefined;
  }
  const next = { ...OPERATOR_COMMAND_LEDGER[index], ...patch };
  OPERATOR_COMMAND_LEDGER[index] = next;
  return next;
}

function requireOperatorIdempotencyKey(key: string | undefined): string {
  if (!key || key.trim().length === 0) {
    throwMockApiError('precondition_required', {
      message: 'Thiếu Idempotency-Key cho lệnh ghi.',
    });
  }
  return key.trim();
}

function assertOperatorIfMatch(taskId: string, ifMatch: string | undefined): void {
  if (!ifMatch || ifMatch.trim().length === 0) {
    throwMockApiError('precondition_required', {
      message: 'Thiếu If-Match (phiên bản nhiệm vụ) cho lệnh ghi.',
    });
  }
  const current = `"${currentOperatorTaskVersion(taskId)}"`;
  if (ifMatch.trim() !== current) {
    throwMockApiError('concurrency_conflict', {
      message: 'Nhiệm vụ đã thay đổi trên máy chủ, cần đọc lại phiên bản mới nhất.',
    });
  }
}

/** API-226 — đọc chi tiết nhiệm vụ khảo sát (kèm ETag phiên bản để gửi If-Match). */
export async function getOperatorSurveyTask(
  taskIdOrCode: string,
): Promise<{ data: OperatorSurveyTaskDetailView }> {
  await delay(250);
  const fixture = findOperatorTask(taskIdOrCode);
  if (!fixture) {
    throwMockApiError('not_found', { message: 'Không tìm thấy nhiệm vụ khảo sát.' });
  }
  const status = operatorTaskStatus(fixture.taskId);
  const task: OperatorSurveyTaskV2Dto = {
    id: fixture.taskId,
    projectId: fixture.projectId,
    operatorId: fixture.operatorId,
    status,
    scope: [
      {
        routeVersionId: fixture.routeVersionId,
        segmentSetId: fixture.segmentSetId,
        segmentIds: [...fixture.segmentIds],
        targetBand: fixture.targetBand,
      },
    ],
  };
  return {
    data: {
      task,
      etag: `"${currentOperatorTaskVersion(fixture.taskId)}"`,
      code: fixture.code,
      title: fixture.title,
      routeTitle: fixture.routeTitle,
      location: fixture.location,
      droneModel: fixture.droneModel,
      droneSerial: fixture.droneSerial,
      dueAt: fixture.dueAt,
      scopeVersion: fixture.scopeVersion,
      targetBand: fixture.targetBand,
      segmentIds: [...fixture.segmentIds],
      accessPointName: fixture.accessPointName,
      terrain: fixture.terrain,
      accessPoint: { longitude: fixture.longitude, latitude: fixture.latitude },
      safeRadiusM: fixture.safeRadiusM,
    },
  };
}

/** API-225 — gói công việc đã ghim (chỉ đọc). */
export async function getOperatorWorkPackage(
  taskIdOrCode: string,
): Promise<{ data: OperatorSurveyTaskWorkPackageDto }> {
  await delay(250);
  const fixture = findOperatorTask(taskIdOrCode);
  if (!fixture) {
    throwMockApiError('not_found', { message: 'Không tìm thấy gói công việc.' });
  }
  const status = operatorTaskStatus(fixture.taskId);
  return {
    data: {
      schemaVersion: '1.0',
      task: {
        id: fixture.taskId,
        projectId: fixture.projectId,
        operatorId: fixture.operatorId,
        status,
        scope: [
          {
            routeVersionId: fixture.routeVersionId,
            segmentSetId: fixture.segmentSetId,
            segmentIds: [...fixture.segmentIds],
            targetBand: fixture.targetBand,
          },
        ],
      },
      dueAt: fixture.dueAt,
      accessPoint: {
        point: { longitude: fixture.longitude, latitude: fixture.latitude },
        source: 'PLANNED_RENDEZVOUS',
        accuracyMeters: null,
        capturedAt: null,
      },
      geometryRefs: [
        {
          routeVersionId: fixture.routeVersionId,
          segmentSetId: fixture.segmentSetId,
          segmentIds: [...fixture.segmentIds],
        },
      ],
      scopeVersion: fixture.scopeVersion,
    },
  };
}

/** API-104 — gói hình học/hình học tuyến của dự án (chỉ đọc, phạm vi ghim). */
export async function getOperatorGeometryPackage(
  projectId: string,
  params: { routeVersionId?: string; segmentSetId?: string } = {},
): Promise<{ data: OperatorGeometryPackageViewDto; etag: string }> {
  await delay(250);
  if (!projectId || projectId.trim().length === 0) {
    throwMockApiError('validation_error', { message: 'Thiếu projectId.' });
  }
  if (projectId !== OPERATOR_PROJECT_ID) {
    throwMockApiError('project_not_found', { message: 'Không tìm thấy dự án.' });
  }
  const fixture = OPERATOR_TASK_FIXTURES[0];
  const routeVersionId = params.routeVersionId ?? fixture.routeVersionId;
  const segmentSetId = params.segmentSetId ?? fixture.segmentSetId;
  if (routeVersionId !== fixture.routeVersionId) {
    throwMockApiError('road_section_version_not_found', {
      message: 'Không tìm thấy phiên bản tuyến.',
    });
  }
  if (segmentSetId !== fixture.segmentSetId) {
    throwMockApiError('segment_set_not_found', { message: 'Không tìm thấy tập phân đoạn.' });
  }
  const totalLengthMeters = fixture.segmentIds.length * 400;
  return {
    data: {
      schemaVersion: '1.0',
      projectId,
      route: {
        projectId,
        roadSectionId: OPERATOR_ROAD_SECTION_ID,
        routeVersionId,
        versionNo: 3,
        isCurrent: true,
        effectiveFrom: '2026-09-20T00:00:00Z',
        sourceCrs: 4326,
        engineeringSrid: 3405,
        stationOriginMeters: 0,
        widthProfile: [
          { stationMeters: 0, halfWidthMeters: 1.75 },
          { stationMeters: 800, halfWidthMeters: 1.75 },
        ],
        surveyWidthMeters: 3.5,
        lengthMeters: totalLengthMeters,
        metadataStatus: 'Approved',
        approvedAt: '2026-09-21T08:30:00Z',
        geometryHash: 'sha256:9f2c1b3a4d5e6f708192a3b4c5d6e7f8',
        routeKind: 'BTXM_TCVN10380',
      },
      segmentSet: {
        segmentSetId,
        projectId,
        segmentCount: fixture.segmentIds.length,
        lengthMeters: totalLengthMeters,
      },
    },
    etag: `"${operatorRowVersion(`geometry:${projectId}`, 0)}"`,
  };
}

/** API-234 — trạng thái phiên tải lên (dùng cho O-06/O-08). */
export async function getOperatorUploadSession(
  uploadId: string,
): Promise<{ data: UploadSessionResponseDto; etag: string }> {
  await delay(200);
  if (!uploadId || uploadId.trim().length === 0) {
    throwMockApiError('validation_error', { message: 'Thiếu uploadId.' });
  }
  if (uploadId !== '30000000-0000-4000-8000-000000000002') {
    throwMockApiError('upload_session_not_found', {
      message: 'Không tìm thấy phiên tải lên.',
    });
  }
  return {
    data: {
      id: uploadId,
      fileId: '40000000-0000-4000-8000-000000000002',
      status: 'verifying',
      partSizeBytes: 8 * 1024 * 1024,
      expiresAt: '2026-09-27T22:05:00Z',
      version: operatorRowVersion(`upload:${uploadId}`, 0),
    },
    etag: `"${operatorRowVersion(`upload:${uploadId}`, 0)}"`,
  };
}

export interface OperatorDeclineInput {
  reason: string;
  idempotencyKey: string;
  ifMatch: string;
}

export interface OperatorDeclineResult {
  taskId: string;
  status: OperatorTaskStatus;
  state: OperatorCommandState;
  at: string;
}

/**
 * API-230 — từ chối nhiệm vụ khảo sát. Yêu cầu Idempotency-Key + If-Match.
 * Cùng key + cùng payload ⇒ phát lại kết quả đã lưu (KHÔNG tạo lệnh mới).
 */
export async function declineOperatorSurveyTask(
  taskIdOrCode: string,
  input: OperatorDeclineInput,
): Promise<{ data: OperatorDeclineResult }> {
  await delay(600);
  const fixture = findOperatorTask(taskIdOrCode);
  if (!fixture) {
    throwMockApiError('not_found', { message: 'Không tìm thấy nhiệm vụ khảo sát.' });
  }
  const key = requireOperatorIdempotencyKey(input.idempotencyKey);
  if (!input.reason || input.reason.trim().length === 0) {
    throwMockApiError('validation_error', {
      message: 'Cần nêu lý do từ chối.',
      details: [{ field: 'reason', message: 'Lý do tối thiểu 1 ký tự.' }],
    });
  }
  assertOperatorIfMatch(fixture.taskId, input.ifMatch);

  const payload = { kind: 'decline', reason: input.reason.trim() };
  const cached = OPERATOR_IDEMPOTENCY.get(key);
  if (cached) {
    const cachedPayload = (cached.body as { payload?: Record<string, unknown> } | null)?.payload;
    if (cachedPayload && cachedPayload.reason === payload.reason) {
      return { data: cached.body as OperatorDeclineResult };
    }
    throwMockApiError('idempotency_key_reused', {
      message: 'Khoá idempotency đã dùng cho một lệnh khác.',
    });
  }

  const status: OperatorTaskStatus = 'Rejected';
  OPERATOR_TASK_STATUS.set(fixture.taskId, status);
  bumpOperatorTaskVersion(fixture.taskId);
  const result: OperatorDeclineResult = {
    taskId: fixture.taskId,
    status,
    state: 'ACKED',
    at: new Date().toISOString(),
  };
  OPERATOR_IDEMPOTENCY.set(key, { status: 200, body: { ...result, payload } });
  appendOperatorCommand({
    apiId: 'API-230',
    label: 'Từ chối nhiệm vụ khảo sát',
    taskId: fixture.taskId,
    taskCode: fixture.code,
    uploadId: null,
    idempotencyKey: key,
    payload,
    state: 'ACKED',
    httpStatus: 200,
    resultCode: null,
    message: 'Máy chủ đã ghi nhận từ chối; nhiệm vụ chuyển sang Rejected.',
  });
  return { data: result };
}

/** O-08 — liệt kê lệnh đã gửi kèm trạng thái/kết quả (mới nhất trước). */
export async function listOperatorCommands(
  filter: { taskId?: string } = {},
): Promise<{ data: { items: OperatorCommandRecord[] } }> {
  await delay(200);
  let items = [...OPERATOR_COMMAND_LEDGER];
  if (filter.taskId) {
    items = items.filter((item) => item.taskId === filter.taskId);
  }
  return { data: { items } };
}

export interface OperatorReplayResult {
  commandId: string;
  replayed: boolean;
  state: OperatorCommandState;
  httpStatus: number | null;
  message: string;
}

/**
 * O-08 — phát lại MỘT lệnh với ĐÚNG Idempotency-Key và payload gốc.
 * Không bao giờ sinh khoá mới; chỉ áp dụng cho lệnh kết cục chưa xác định.
 */
export async function replayOperatorCommand(
  commandId: string,
  options: { ifMatch?: string } = {},
): Promise<{ data: OperatorReplayResult }> {
  await delay(500);
  const record = OPERATOR_COMMAND_LEDGER.find((item) => item.commandId === commandId);
  if (!record) {
    throwMockApiError('not_found', { message: 'Không tìm thấy lệnh trong sổ.' });
  }
  if (record.state === 'ACKED' || record.state === 'REJECTED') {
    return {
      data: {
        commandId,
        replayed: false,
        state: record.state,
        httpStatus: record.httpStatus,
        message: 'Lệnh đã có kết quả cuối, không cần phát lại.',
      },
    };
  }
  if (record.payload.kind !== 'decline' || !record.taskId) {
    throwMockApiError('invalid_state_transition', {
      message: 'Chỉ phát lại được lệnh từ chối; các lệnh khác cần đối chiếu qua máy chủ.',
    });
  }

  const replayedKey = record.idempotencyKey;
  try {
    await declineOperatorSurveyTask(record.taskId, {
      reason: String(record.payload.reason ?? ''),
      idempotencyKey: replayedKey,
      ifMatch: options.ifMatch ?? `"${currentOperatorTaskVersion(record.taskId)}"`,
    });
    patchOperatorCommand(commandId, {
      state: 'ACKED',
      httpStatus: 200,
      resultCode: null,
      message: 'Phát lại cùng khoá: máy chủ đã nhận lệnh từ chối.',
    });
    return {
      data: {
        commandId,
        replayed: true,
        state: 'ACKED',
        httpStatus: 200,
        message: 'Máy chủ đã nhận lệnh từ chối (phát lại cùng khoá idempotency).',
      },
    };
  } catch (error) {
    const envelope = (error as { response?: { data?: { code?: string; message?: string } } })
      .response?.data;
    const code = envelope?.code ?? null;
    const message = envelope?.message ?? 'Không phát lại được lệnh.';
    if (code === 'concurrency_conflict') {
      patchOperatorCommand(commandId, {
        state: 'CONFLICT',
        httpStatus: 409,
        resultCode: code,
        message: 'Phiên bản nhiệm vụ đã đổi — cần đọc lại rồi đối chiếu.',
      });
    }
    throw error;
  }
}

/**
 * O-08 — đối chiếu lệnh với trạng thái nhiệm vụ thật (API-226). Dùng cho 409/412.
 */
export async function reconcileOperatorCommand(
  commandId: string,
): Promise<{ data: { state: OperatorCommandState; status: OperatorTaskStatus; message: string } }> {
  await delay(350);
  const record = OPERATOR_COMMAND_LEDGER.find((item) => item.commandId === commandId);
  if (!record) {
    throwMockApiError('not_found', { message: 'Không tìm thấy lệnh trong sổ.' });
  }
  if (!record.taskId) {
    throwMockApiError('invalid_state_transition', {
      message: 'Lệnh không gắn nhiệm vụ nên không đối chiếu được.',
    });
  }
  const { data } = await getOperatorSurveyTask(record.taskId);
  const status = data.task.status;
  const state: OperatorCommandState =
    record.payload.kind === 'decline'
      ? status === 'Rejected'
        ? 'ACKED'
        : 'REJECTED'
      : 'ACKED';
  const message =
    state === 'ACKED'
      ? 'Máy chủ đã áp dụng lệnh; trạng thái nhiệm vụ khớp với yêu cầu.'
      : 'Máy chủ chưa áp dụng lệnh; cần gửi lại với phiên bản mới.';
  patchOperatorCommand(commandId, { state, message, httpStatus: 200, resultCode: null });
  return { data: { state, status, message } };
}

export const OPERATOR_MOCK_IDS = {
  projectId: OPERATOR_PROJECT_ID,
  routeVersionId: OPERATOR_ROUTE_VERSION_ID,
  segmentSetId: OPERATOR_SEGMENT_SET_ID,
  uploadId: '30000000-0000-4000-8000-000000000002',
  actorId: OPERATOR_ACTOR_ID,
};