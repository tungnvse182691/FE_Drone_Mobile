/// <reference types="geojson" />
import { RoleCode, SyncStatus, IntegrationStatus, DefectStatus, Severity, RepairBatchStatus, FieldInspectionTaskStatus, MeasurementType, TaskMode, FastTrackEligibility, LocalState } from './enums';
import type { DefectTypeCode } from '../constants/defect-types';
import { isOfflineOperationKind, type OfflineOperationKind } from '../offline/operation-kind';

export interface User {
  id: string;
  role_code: RoleCode;
  full_name: string;
  phone_or_email: string;
  is_reporter?: boolean;
  employee_code: string;
  must_change_password: boolean;
  token: string;
  refresh_token: string;
}

export interface FastTrackPolicyVersion {
  id: string;
  version_code: string;           // FTP-2026-V1
  max_area_m2: number;            // 1.0 m2
  max_depth_cm: number;           // 5.0 cm
  max_length_m: number;           // 2.0 m
  allowed_defect_codes: string[]; // POTH_DEEP, EDGE_BRK, ...
  effective_from: string;
  effective_to?: string;
}

export interface RepairWorkOrder {
  id: string;
  title: string;
  task_mode: TaskMode;
  assigned_crew_id: string;
  route_code: string;
  section_name: string;
  target_defect_id: string;
  defect_type_code: string;
  due_at: string;
  instructions: string;
  target_coordinates: [number, number]; // WGS84 GeoJSON order: [longitude, latitude]
  fast_track_eligible?: FastTrackEligibility;
  status: string;
  created_at: string;
}

export interface SurveyDataVersion {
  id: string;
  survey_id: string;
  version_no: number;
  status: SyncStatus;
  integration_status: IntegrationStatus;
  checksum_sha256: string | null;
  files: SurveyFile[];
  server_confirmed_at: string | null;
}

export interface SurveyFile {
  video_id: string;
  srt_id: string | null;
  size_bytes: number;
}

export interface AccessPoint {
  name: string;
  terrain_description: string;
  coordinates: [number, number]; // WGS84 GeoJSON order: [longitude, latitude]
  safe_radius_m?: number;
}

export interface SurveyTask {
  id: string;
  code: string;
  title: string;
  project_id: string;
  route_code: string;
  section_name: string;
  location_desc: string;
  length_km: number;
  altitude_m: number;
  overlap_forward_ratio: number;
  overlap_side_ratio: number;
  format: string;
  sensor: string;
  post_processing: string;
  access_point: AccessPoint;
  assigned_pilot_id: string;
  status: string;
  due_at: string;
  instructions: string;
  pm_name: string;
  drone_serial?: string;
}

export interface FlightLog {
  id: string;
  survey_id: string;
  pilot_id: string;
  drone_serial: string;
  base_station?: string;
  departure_time: string;
  landing_time: string | null;
  duration_minutes?: number;
  weather_conditions: string;
  wind_speed_ms?: number;
  battery_start_pct?: number;
  battery_end_pct?: number;
  battery_cycles?: number;
  orthophoto_count?: number;
  checksum_sha256?: string;
  gps_log_path: string | null;
  status: SyncStatus;
}

export interface FileRecord {
  id: string;
  uri_local: string;
  checksum_sha256: string;
  status: SyncStatus;
  size_bytes: number;
}

export interface Defect {
  id: string;
  project_id: string;
  road_section_version_id: string;
  defect_type_code: string;
  cause_category_code?: string;
  severity: Severity;
  status: DefectStatus;
  geometry: GeoJSON.Geometry;
  reported_at: string;
  ai_detection_id?: string;
  notes?: string;
}

export interface FieldInspectionTask {
  id: string;
  defect_id: string;
  assigned_to: string;
  status: FieldInspectionTaskStatus;
  required_measurement_type: MeasurementType;
  due_at: string;
  instructions?: string;
}

export interface GroundTruthMeasurement {
  id: string;
  session_id: string;
  task_id: string;
  defect_id: string;
  measurement_type: MeasurementType;
  value: number;
  unit: string;
  instrument_name: string;
  measurement_method: string;
  measured_by: string;
  measured_at: string;
  location: { type: 'Point'; coordinates: [number, number] };
  evidence_file_id?: string;
  notes?: string;
}

export interface RepairItem {
  id: string;
  defect_id: string;
  // UD-06: bộ 3 thông số kỹ thuật thi công, tuyệt đối không có trường tiền tệ.
  technical_solution: string;
  damage_area_m2?: number;
  damage_depth_cm?: number;
  damage_length_m?: number;
  completion_deadline?: string;
  status: string;
  description?: string;
}

export interface RepairBatchVersion {
  id: string;
  batch_id: string;
  version_no: number;
  status: RepairBatchStatus;
  items: RepairItem[];
  submitted_at?: string;
  approved_at?: string;
  rejected_reason?: string;
}

export interface RepairEvidence {
  id: string;
  repair_item_id: string;
  kind: 'BEFORE' | 'AFTER';
  file_id: string;
  captured_at: string;
  is_reused_from_source?: 'REPORTER' | 'DRONE'; // BR-17
  synced: SyncStatus;
}

// ===========================================================================
// OFFLINE SYNC CONTRACTS (09_Frontend/09_Offline_App_Sync_Spec.md)
// ===========================================================================

export interface PendingItem {
  id: string;
  entity_id: string;
  action_type: string;
  table_name: string;
  json_payload: string;
  created_at: string;
}

export interface OutboxItem {
  id: string;
  kind: string;
  data_b64: string;
  checksum_sha256: string;
  status: string;
  attempt: number;
  max_attempts: number;
  last_error: string | null;
  created_at: string;
  updated_at?: string;
  partition_id?: string;
  task_id?: string | null;
  expected_version?: string | null;
}

/**
 * Canonical `SyncOperation` base — openapi.baseline.yaml#/components/schemas.
 * Mọi operation offline bắt buộc mang `operationId`, `kind`, `capturedAt`
 * và `expectedVersion` để server replay kiểm tra snapshot + quyền hiện hành.
 */
export interface SyncOperationBase {
  operationId: string;
  kind: string;
  expectedVersion: string;
  capturedAt: string;
}

/** `INSPECTION_SUBMIT` — SyncMeasurement */
export interface SyncMeasurement extends SyncOperationBase {
  kind: 'INSPECTION_SUBMIT';
  taskId: string;
  payload: Record<string, unknown>;
}

/** `REPAIR_START` — SyncStart */
export interface SyncStart extends SyncOperationBase {
  kind: 'REPAIR_START';
  taskId: string;
  payload: Record<string, unknown>;
}

/** `REPAIR_SUBMIT` — SyncAttemptSubmit (dùng attemptId, không có taskId) */
export interface SyncAttemptSubmit extends SyncOperationBase {
  kind: 'REPAIR_SUBMIT';
  attemptId: string;
  payload: Record<string, unknown>;
}

/**
 * `SyncBatch` request body — POST /sync/batches (syncOperations, CREW + OPERATOR).
 * `additionalProperties: false`, tối đa 100 operation, `deviceId` bắt buộc.
 */
export interface SyncBatch {
  deviceId: string;
  operations: SyncOperation[];
}

export type SyncOperation =
  | SyncMeasurement
  | SyncStart
  | SyncAttemptSubmit
  | SyncFastTrackEvaluate;

/**
 * Tập `kind` hợp lệ theo schema `SyncOperation`
 * (openapi.baseline.yaml#/components/schemas/SyncOperation).
 *
 * Dùng để chặn kind nội bộ (`submit_inspection`, `submit_repair`, `submit_dataset`,
 * `accept_survey_task`, …) lọt vào `SyncBatch` qua ép kiểu — `SyncOperation` là
 * discriminated union `additionalProperties: false`, kind sai sẽ vi phạm contract.
 */
export const CANONICAL_SYNC_OPERATION_KINDS = new Set<string>([
  'INSPECTION_SUBMIT',
  'REPAIR_START',
  'REPAIR_SUBMIT',
  'FAST_TRACK_EVALUATE',
]);

/**
 * `kind` được phép GỬI thật qua `POST /sync/batches` ở runtime.
 *
 * `FAST_TRACK_EVALUATE` có trong schema nhưng là "proposed contract extension"
 * (openapi.baseline.yaml:9509) và chưa có backend runtime, nên không được dispatch.
 * Fast Track vẫn hoạt động như quy trình nghiệm thu của PM sau khi crew gửi hồ sơ.
 */
export const RUNTIME_SYNC_OPERATION_KINDS = new Set<string>([
  'INSPECTION_SUBMIT',
  'REPAIR_START',
  'REPAIR_SUBMIT',
]);

/** `true` nếu `kind` có thể dựng thành `SyncOperation` canonical (kiểm tra schema). */
export function isCanonicalSyncOperationKind(kind: string): boolean {
  return CANONICAL_SYNC_OPERATION_KINDS.has(kind);
}

/** `true` nếu `kind` được phép đẩy lên máy chủ. Dùng chốt ở cả màn CREW và DRONE. */
export function isDispatchableSyncOperationKind(kind: string): boolean {
  return RUNTIME_SYNC_OPERATION_KINDS.has(kind);
}

// ---------------------------------------------------------------------------
// OFFLINE OPERATION KIND ⇄ WIRE KIND (Phần 5.3)
//
// Cột `kind` trong `local_draft` / `outbox` / `offline_pending` / `offline_outbox`
// lưu bộ 6 `OfflineOperationKind` canonical (`src/offline/operation-kind.ts`).
// `kind` wire gửi lên `POST /sync/batches` là tập khác (`SyncOperation`).
// Hai hàm dưới đây là cầu nối duy nhất giữa hai từ vựng.
// ---------------------------------------------------------------------------

/** Khoá `kind` CŨ đã từng được ghi trước Phần 5.3. Chỉ dùng để migrate on-read. */
export const LEGACY_OFFLINE_OPERATION_KIND_ALIASES: Record<string, OfflineOperationKind> = {
  DEFECT_REPORT: 'FIELD_SUBMISSION',
  REPAIR_SUBMIT: 'REPAIR_EXECUTION_FINISH',
  FIELD_VERIFICATION: 'FIELD_SUBMISSION',
  // Khoá viết thường từ `schema.sql` v1.
  defect_report: 'FIELD_SUBMISSION',
  reporter_report: 'FIELD_SUBMISSION',
  reporter_submission: 'FIELD_SUBMISSION',
  measurement: 'FIELD_SUBMISSION',
  evidence: 'FIELD_SUBMISSION',
  flight_log: 'FIELD_START',
  survey_upload: 'FIELD_SUBMISSION',
  repair_evidence: 'REPAIR_EXECUTION_FINISH',
  fast_track_completion: 'REPAIR_EXECUTION_FINISH',
};

/**
 * Chuẩn hoá khoá `kind` thô (canonical mới, alias cũ, hoặc rác) về `OfflineOperationKind`.
 * Trả `null` nếu không nhận diện được → tầng gọi phải FAIL CLOSED (không dispatch).
 */
export function normalizeOfflineOperationKind(rawKind: unknown): OfflineOperationKind | null {
  if (typeof rawKind !== 'string' || rawKind.length === 0) {
    return null;
  }
  if (isOfflineOperationKind(rawKind)) {
    return rawKind;
  }
  return LEGACY_OFFLINE_OPERATION_KIND_ALIASES[rawKind] ?? null;
}

/**
 * Ánh xạ `OfflineOperationKind` (local) → `kind` wire của `POST /sync/batches`.
 *
 * Chỉ 3 kind có wire tương ứng ở runtime hiện tại (xem `RUNTIME_SYNC_OPERATION_KINDS`);
 * `FIELD_ACCEPT` / `FIELD_START` / `REPAIR_ASSESSMENT` chưa có wire → trả `null` (fail closed).
 */
export function toSyncWireKind(kind: OfflineOperationKind): SyncOperation['kind'] | null {
  switch (kind) {
    case 'FIELD_SUBMISSION':
      return 'INSPECTION_SUBMIT';
    case 'REPAIR_EXECUTION_START':
      return 'REPAIR_START';
    case 'REPAIR_EXECUTION_FINISH':
      return 'REPAIR_SUBMIT';
    default:
      return null;
  }
}

/** Trạng thái server trả về cho từng operation trong `SyncResult`. */
export type SyncOutcomeStatus = 'APPLIED' | 'DUPLICATE' | 'CONFLICT' | 'REJECTED';

/** `SyncOutcome` — kết quả bền vững, chỉ sau khi server đã ghi durable mới được ACK. */
export interface SyncOutcome {
  operationId: string;
  status: SyncOutcomeStatus;
  resourceId: string | null;
  version: string | null;
  error: {
    code: string;
    message: string;
    details?: unknown;
    traceId?: string;
    retryable?: boolean;
  } | null;
}

/** `SyncResult` — response của POST /sync/batches. */
export interface SyncResult {
  results: SyncOutcome[];
}

/**
 * `SyncOutcome.status` → `LocalState`.
 *
 * `DUPLICATE` được coi là ACKED vì server đã báo bản ghi đích tồn tại bền vững
 * (idempotent replay), không phải thao tác mới đang chờ kết quả.
 */
export const SYNC_OUTCOME_TO_LOCAL_STATE: Record<SyncOutcomeStatus, LocalState> = {
  APPLIED: LocalState.ACKED,
  DUPLICATE: LocalState.ACKED,
  CONFLICT: LocalState.CONFLICT,
  REJECTED: LocalState.REJECTED,
};

/**
 * PROPOSED_DELTA_NOT_ENABLED — mirror của member FAST_TRACK_EVALUATE trong
 * draft canonical SyncOperation (09_Frontend/contracts/sync-evaluation.proposed.schema.json).
 * Runtime backend chưa bật; chỉ dùng làm local evaluation record offline.
 */
export interface SyncFastTrackEvaluate {
  operationId: string;
  kind: 'FAST_TRACK_EVALUATE';
  taskId: string;
  expectedVersion: string;
  measurementSessionId: string;
  localEvaluationId: string;
  capturedAt: string;
  payload: {
    sessionId: string;
    policyVersionId: string;
  };
}