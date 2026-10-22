import type { FastTrackPolicyVersion } from '../../types/domain';
import type { DefectTypeCode } from '../../constants/defect-types';
import { DEFECT_TYPE_CODES } from '../../constants/defect-types';
import { TaskMode } from '../../types/enums';
import { getReporterReportsSnapshot } from './reporter';
import { throwMockApiError } from './errors';

export const FAST_TRACK_POLICY_ID = 'FTP-2026-V1';

export const FAST_TRACK_POLICY: FastTrackPolicyVersion = {
  id: FAST_TRACK_POLICY_ID,
  version_code: FAST_TRACK_POLICY_ID,
  max_area_m2: 1.0,
  max_depth_cm: 5.0,
  max_length_m: 2.0,
  allowed_defect_codes: [
    DEFECT_TYPE_CODES.POTH_DEEP,
    DEFECT_TYPE_CODES.DEPR_POND,
    DEFECT_TYPE_CODES.EDGE_BRK,
    DEFECT_TYPE_CODES.SLAB_CRK,
    DEFECT_TYPE_CODES.SHLD_EROS,
  ],
  effective_from: '2026-01-01T00:00:00Z',
  effective_to: '2026-12-31T23:59:59Z',
};

export type EvidenceReuseSource = 'REPORTER' | 'DRONE' | 'CREW';

export const EVIDENCE_REUSE_LABELS: Record<EvidenceReuseSource, string> = {
  REPORTER: 'Ảnh tái sử dụng từ Phản ánh',
  DRONE: 'Ảnh tái sử dụng từ Drone',
  CREW: 'Ảnh hiện trạng chụp tại hiện trường',
};

export const EVIDENCE_REUSE_SOURCE_TAGS: Record<EvidenceReuseSource, string> = {
  REPORTER: 'Ảnh tái sử dụng từ Phản ánh',
  DRONE: 'Ảnh tái sử dụng từ Drone',
  CREW: 'Ảnh chụp tại hiện trường',
};

export interface BeforeEvidenceCandidate {
  id: string;
  source: EvidenceReuseSource;
  source_label: string;
  defect_type_code: DefectTypeCode;
  captured_at: string;
  coordinates: FieldCoordinates;
  local_uri: string | null;
}

export interface CrewFieldMeasurement {
  length_m: number | null;
  width_m: number | null;
  depth_cm: number | null;
}

export type FastTrackEvaluationCode = 'PENDING' | 'ELIGIBLE' | 'NOT_ELIGIBLE';

/**
 * Toạ độ WGS84 dùng trong phiên hiện trường.
 * `accuracyMeters` = bán kính sai số GPS (mét, 68%); `null`/thiếu = thiết bị không báo.
 * (Khớp trường `accuracyMeters` của `PositionDto`.)
 */
export interface FieldCoordinates {
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
}

export interface CrewFieldSession {
  task_id: string;
  work_order_code: string;
  task_mode: TaskMode;
  defect_type_code: DefectTypeCode;
  policy_id: string | null;
  measurement: CrewFieldMeasurement;
  area_m2: number | null;
  before_evidence_id: string | null;
  before_local_uri: string | null;
  before_source: EvidenceReuseSource | null;
  before_watermark: string | null;
  after_local_uri: string | null;
  after_watermark: string | null;
  coordinates: FieldCoordinates | null;
  evaluation_code: FastTrackEvaluationCode;
  attempt_id: string | null;
  submitted_at: string | null;
}

let activeSession: CrewFieldSession | null = null;
let attemptCounter = 0;
const crewCapturedBefore: BeforeEvidenceCandidate[] = [];

const DRONE_CAPTURE: BeforeEvidenceCandidate = {
  id: 'DRONE-RGB-882910-01',
  source: 'DRONE',
  source_label: 'Bay khảo sát 4K RGB + DSM (OpenDroneMap)',
  defect_type_code: DEFECT_TYPE_CODES.POTH_DEEP,
  captured_at: '2026-09-18T02:15:00.000Z',
  coordinates: { latitude: 10.783, longitude: 106.7001 },
  local_uri: null,
};

export function getReporterBeforeCandidates(defectTypeCode: DefectTypeCode): BeforeEvidenceCandidate[] {
  return getReporterReportsSnapshot()
    .filter(
      (report) =>
        report.defect_type === defectTypeCode && report.photo_uris.length > 0,
    )
    .map((report) => ({
      id: `REPORTER-${report.id}`,
      source: 'REPORTER' as const,
      source_label: `Phản ánh ${report.tracking_code}`,
      defect_type_code: report.defect_type as DefectTypeCode,
      captured_at: report.submitted_at,
      coordinates: {
        latitude: report.coordinates[1],
        longitude: report.coordinates[0],
      },
      local_uri: report.photo_uris[0],
    }));
}

export function getDroneBeforeCandidates(defectTypeCode: DefectTypeCode): BeforeEvidenceCandidate[] {
  return DRONE_CAPTURE.defect_type_code === defectTypeCode ? [DRONE_CAPTURE] : [];
}

export function getBeforeEvidenceCandidates(defectTypeCode: DefectTypeCode): BeforeEvidenceCandidate[] {
  return [
    ...crewCapturedBefore.filter(
      (candidate) => candidate.defect_type_code === defectTypeCode,
    ),
    ...getDroneBeforeCandidates(defectTypeCode),
    ...getReporterBeforeCandidates(defectTypeCode),
  ];
}

export function getCrewCapturedBefore(defectTypeCode: DefectTypeCode): BeforeEvidenceCandidate[] {
  return crewCapturedBefore.filter(
    (candidate) => candidate.defect_type_code === defectTypeCode,
  );
}

export function startCrewFieldSession(input: {
  task_id: string;
  work_order_code: string;
  task_mode: TaskMode;
  defect_type_code: DefectTypeCode;
  coordinates?: FieldCoordinates | null;
}): CrewFieldSession {
  activeSession = {
    task_id: input.task_id,
    work_order_code: input.work_order_code,
    task_mode: input.task_mode,
    defect_type_code: input.defect_type_code,
    // Policy revision do máy chủ cấp qua API-146; chưa đối chiếu thì để null.
    policy_id: null,
    measurement: { length_m: null, width_m: null, depth_cm: null },
    area_m2: null,
    before_evidence_id: null,
    before_local_uri: null,
    before_source: null,
    before_watermark: null,
    after_local_uri: null,
    after_watermark: null,
    coordinates: input.coordinates ?? null,
    evaluation_code: 'PENDING',
    attempt_id: null,
    submitted_at: null,
  };
  return activeSession;
}

export function getCrewFieldSession(): CrewFieldSession | null {
  return activeSession ? { ...activeSession } : null;
}

export function updateCrewMeasurement(patch: Partial<CrewFieldMeasurement>) {
  if (!activeSession) {
    return;
  }
  activeSession.measurement = { ...activeSession.measurement, ...patch };
  activeSession.area_m2 = computeArea(activeSession.measurement);
  // Máy chủ là nguồn sự thật về eligibility (API-146) — app KHÔNG tự đánh giá.
  // Mọi thay đổi kích thước đều đưa về PENDING cho tới khi đối chiếu lại với máy chủ.
  activeSession.evaluation_code = 'PENDING';
  activeSession.policy_id = null;
}

/** Ghi lại kết quả eligibility do máy chủ trả về (API-146) vào phiên hiện trường. */
export function applyEligibility(code: FastTrackEvaluationCode, policyRevisionId?: string | null) {
  if (!activeSession) {
    return;
  }
  activeSession.evaluation_code = code;
  activeSession.policy_id = policyRevisionId ?? null;
}

export function selectBeforeEvidence(candidate: BeforeEvidenceCandidate) {
  if (!activeSession) {
    return;
  }
  activeSession.before_evidence_id = candidate.id;
  activeSession.before_local_uri = candidate.local_uri;
  activeSession.before_source = candidate.source;
  activeSession.before_watermark = buildWatermark(candidate.captured_at, candidate.coordinates);
}

export function setBeforeCapture(
  photoUri: string,
  watermark: string,
  capturedAt: string,
  coords: FieldCoordinates,
) {
  if (!activeSession) {
    return;
  }
  const candidate: BeforeEvidenceCandidate = {
    id: `CREW-BEFORE-${Date.now()}`,
    source: 'CREW',
    source_label: 'Ảnh hiện trạng chụp tại hiện trường',
    defect_type_code: activeSession.defect_type_code,
    captured_at: capturedAt,
    coordinates: coords,
    local_uri: photoUri,
  };
  crewCapturedBefore.unshift(candidate);
  selectBeforeEvidence(candidate);
  activeSession.before_watermark = watermark;
  activeSession.coordinates = coords;
}

export function setAfterCapture(
  photoUri: string,
  watermark: string,
  coords?: FieldCoordinates | null,
) {
  if (!activeSession) {
    return;
  }
  activeSession.after_local_uri = photoUri;
  activeSession.after_watermark = watermark;
  if (coords) {
    activeSession.coordinates = coords;
  }
}

export function markAttemptStarted() {
  if (!activeSession) {
    return null;
  }
  attemptCounter += 1;
  activeSession.attempt_id = `RA-${activeSession.work_order_code}-${attemptCounter}`;
  return activeSession.attempt_id;
}

export function markSessionSubmitted() {
  if (!activeSession) {
    return null;
  }
  activeSession.submitted_at = new Date().toISOString();
  return activeSession;
}

export function computeArea(measurement: CrewFieldMeasurement): number | null {
  const { length_m, width_m } = measurement;
  if (length_m === null || width_m === null) {
    return null;
  }
  return Number((length_m * width_m).toFixed(2));
}

/**
 * Bản rút gọn của `RepairMeasurementRule` (API-146 trả về trong `rules`).
 * Đơn vị/ngưỡng do policy revision trên máy chủ quyết định; app chỉ hiển thị.
 */
export interface RepairEligibilityRuleDto {
  measurementCode: string;
  unit: string;
  minimum: number | null;
  maximum: number | null;
}

/**
 * Bản rút gọn của `RepairEligibilityReadView` (API-146).
 *
 * `missingReasons` là MÃ MÁY (UPPER_SNAKE) do máy chủ trả về, KHÔNG phải câu tiếng Việt.
 * UI phải map mã → câu tiếng Việt và fail closed với mã lạ.
 */
export interface RepairEligibilityReadView {
  eligible: boolean;
  activation: 'ELIGIBLE' | 'INELIGIBLE';
  itemId: string | null;
  bindingId: string | null;
  policyRevisionId: string | null;
  policyContentHash: string | null;
  policyState: string | null;
  rules: RepairEligibilityRuleDto[];
  assessmentId: string | null;
  measurementIds: string[];
  originalVerifiedStart: string | null;
  executionExpiresAt: string | null;
  sourceMapping: string | null;
  warrantySources: string[];
  handoverSources: string[];
  missingReasons: string[];
  version: string | null;
  coverageMapping: string | null;
}

export interface RepairEligibilityInput {
  /** Chỉ cần mã nhiệm vụ: máy chủ tự đọc dữ liệu hiện trường đã ghi nhận. */
  task_id: string;
}

export const ELIGIBILITY_FAIL_CLOSED_MESSAGE =
  'Không đối chiếu được điều kiện sửa nhanh với máy chủ. Tạm thời chuyển kết quả đo cho PM.';

const ELIGIBILITY_RULES: RepairEligibilityRuleDto[] = [
  { measurementCode: 'AREA_M2', unit: 'm2', minimum: null, maximum: FAST_TRACK_POLICY.max_area_m2 },
  { measurementCode: 'DEPTH_CM', unit: 'cm', minimum: null, maximum: FAST_TRACK_POLICY.max_depth_cm },
  { measurementCode: 'LENGTH_M', unit: 'm', minimum: null, maximum: FAST_TRACK_POLICY.max_length_m },
];

/**
 * Mock API-146 — điều kiện Sửa Nhanh do máy chủ đánh giá theo policy revision hiện hành.
 *
 * App KHÔNG giữ ngưỡng, KHÔNG tự suy ra `missingReasons`: mọi kết luận đến từ máy chủ.
 * Lỗi/abort ở tầng gọi phải fail closed ở phía màn hình.
 */
export async function fetchRepairEligibility(
  input: RepairEligibilityInput,
  signal?: AbortSignal,
): Promise<RepairEligibilityReadView> {
  await new Promise((resolve) => setTimeout(resolve, 450));
  if (signal?.aborted) {
    throw new Error('ELIGIBILITY_ABORTED');
  }
  const session = getCrewFieldSession();
  if (!session || session.task_id !== input.task_id) {
    throwMockApiError('not_found', {
      message: 'Chưa có dữ liệu hiện trường của nhiệm vụ này trên máy chủ.',
    });
  }

  const missingReasons: string[] = [];
  if (session.task_mode !== TaskMode.INSPECT_AND_REPAIR) {
    missingReasons.push('NORMAL_FLOW_REQUIRES_SUPERVISOR_APPROVAL');
  }
  if (!session.before_evidence_id && !session.before_local_uri) {
    missingReasons.push('ASSESSMENT_REQUIRED');
  }

  const { length_m, width_m, depth_cm } = session.measurement;
  const area = session.area_m2 ?? computeArea(session.measurement);

  if (area === null || length_m === null || depth_cm === null) {
    missingReasons.push('POLICY_UNKNOWNMEASUREMENT');
  } else {
    if (area > FAST_TRACK_POLICY.max_area_m2) {
      missingReasons.push('POLICY_THRESHOLDNOTMET');
    }
    if (length_m > FAST_TRACK_POLICY.max_length_m) {
      missingReasons.push('POLICY_THRESHOLDNOTMET');
    }
    if (depth_cm > FAST_TRACK_POLICY.max_depth_cm) {
      missingReasons.push('POLICY_THRESHOLDNOTMET');
    }
  }

  if (!FAST_TRACK_POLICY.allowed_defect_codes.includes(session.defect_type_code)) {
    missingReasons.push('POLICY_NOTCONFIGURED');
  }

  const uniqueReasons = Array.from(new Set(missingReasons));
  const eligible = uniqueReasons.length === 0;

  return {
    eligible,
    activation: eligible ? 'ELIGIBLE' : 'INELIGIBLE',
    itemId: session.task_id,
    bindingId: `${session.task_id}:${session.defect_type_code}`,
    policyRevisionId: FAST_TRACK_POLICY_ID,
    policyContentHash: `sha256:${FAST_TRACK_POLICY_ID}`,
    policyState: 'ACTIVE',
    rules: ELIGIBILITY_RULES,
    assessmentId: null,
    measurementIds: [],
    originalVerifiedStart: null,
    executionExpiresAt: null,
    sourceMapping: null,
    warrantySources: [],
    handoverSources: [],
    missingReasons: uniqueReasons,
    version: FAST_TRACK_POLICY_ID,
    coverageMapping: null,
  };
}

export function buildWatermark(capturedAt: string, coords: FieldCoordinates) {
  return `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)} • ${capturedAt}`;
}
