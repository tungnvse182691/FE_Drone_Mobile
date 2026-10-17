import type { FastTrackPolicyVersion } from '../../types/domain';
import type { DefectTypeCode } from '../../constants/defect-types';
import { DEFECT_TYPE_CODES } from '../../constants/defect-types';
import { TaskMode } from '../../types/enums';
import { getReporterReportsSnapshot } from './reporter';

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

export interface FastTrackEvaluation {
  area_m2: number | null;
  hasAllDimensions: boolean;
  passesArea: boolean;
  passesDepth: boolean;
  passesLength: boolean;
  passesDefectCode: boolean;
  code: FastTrackEvaluationCode;
}

/**
 * Bộ luật Fast Track phía MÁY CHỦ (mock). App KHÔNG gọi hàm này trực tiếp —
 * chỉ `fetchRepairEligibility` (tương đương API-146) dùng, mô phỏng server là authority.
 */
function evaluateFastTrack(
  taskMode: TaskMode,
  measurement: CrewFieldMeasurement,
  defectTypeCode: DefectTypeCode,
): FastTrackEvaluation {
  const area = computeArea(measurement);
  const { length_m, width_m, depth_cm } = measurement;
  const hasAllDimensions = length_m !== null && width_m !== null && depth_cm !== null;

  const pending: FastTrackEvaluation = {
    area_m2: area,
    hasAllDimensions,
    passesArea: false,
    passesDepth: false,
    passesLength: false,
    passesDefectCode: false,
    code: 'PENDING',
  };

  if (taskMode !== TaskMode.INSPECT_AND_REPAIR || !hasAllDimensions) {
    return pending;
  }

  const passesArea = area !== null && area <= FAST_TRACK_POLICY.max_area_m2;
  const passesDepth = depth_cm <= FAST_TRACK_POLICY.max_depth_cm;
  const passesLength = length_m <= FAST_TRACK_POLICY.max_length_m;
  const passesDefectCode = FAST_TRACK_POLICY.allowed_defect_codes.includes(defectTypeCode);

  return {
    area_m2: area,
    hasAllDimensions,
    passesArea,
    passesDepth,
    passesLength,
    passesDefectCode,
    code: passesArea && passesDepth && passesLength && passesDefectCode ? 'ELIGIBLE' : 'NOT_ELIGIBLE',
  };
}

export interface RepairEligibilityInput {
  task_id: string;
  task_mode: TaskMode;
  defect_type_code: DefectTypeCode;
  measurement: CrewFieldMeasurement;
}

export interface RepairEligibility {
  eligible: boolean;
  policyRevisionId: string | null;
  policyContentHash: string | null;
  /** Lý do không đạt (tiếng Việt) — hiển thị thẳng cho Crew; rỗng khi đạt. */
  missingReasons: string[];
  rules: FastTrackEvaluation;
}

export const ELIGIBILITY_FAIL_CLOSED_MESSAGE =
  'Không đối chiếu được điều kiện sửa nhanh với máy chủ. Tạm thời chuyển kết quả đo cho PM.';

function buildEligibilityReasons(
  taskMode: TaskMode,
  measurement: CrewFieldMeasurement,
  evaluation: FastTrackEvaluation,
): string[] {
  if (taskMode !== TaskMode.INSPECT_AND_REPAIR) {
    return ['Nhiệm vụ không ở chế độ đo-kiểm-và-sửa.'];
  }
  if (!evaluation.hasAllDimensions) {
    return ['Chưa nhập đủ 3 kích thước: chiều dài, chiều rộng, độ sâu.'];
  }
  const reasons: string[] = [];
  if (!evaluation.passesDefectCode) {
    reasons.push('Loại khuyết tật không thuộc danh mục áp dụng sửa nhanh.');
  }
  if (!evaluation.passesArea) {
    reasons.push(
      `Diện tích vượt ngưỡng sửa nhanh (policy hiện hành: tối đa ${FAST_TRACK_POLICY.max_area_m2.toFixed(1)} m²).`,
    );
  }
  if (!evaluation.passesLength) {
    reasons.push(
      `Chiều dài vượt ngưỡng sửa nhanh (policy hiện hành: tối đa ${FAST_TRACK_POLICY.max_length_m.toFixed(1)} m).`,
    );
  }
  if (!evaluation.passesDepth) {
    reasons.push(
      `Độ sâu vượt ngưỡng sửa nhanh (policy hiện hành: tối đa ${FAST_TRACK_POLICY.max_depth_cm.toFixed(1)} cm).`,
    );
  }
  return reasons;
}

/**
 * Mock API-146 — điều kiện Sửa Nhanh do máy chủ đánh giá theo policy revision hiện hành.
 * KHÔNG hardcode ngưỡng ở client; lỗi/abort ở tầng gọi phải fail closed (coi như không đủ điều kiện).
 */
export async function fetchRepairEligibility(
  input: RepairEligibilityInput,
  signal?: AbortSignal,
): Promise<RepairEligibility> {
  await new Promise((resolve) => setTimeout(resolve, 450));
  if (signal?.aborted) {
    throw new Error('ELIGIBILITY_ABORTED');
  }
  const evaluation = evaluateFastTrack(
    input.task_mode,
    input.measurement,
    input.defect_type_code,
  );
  const missingReasons = buildEligibilityReasons(input.task_mode, input.measurement, evaluation);
  const resolved = evaluation.code !== 'PENDING';
  return {
    eligible: evaluation.code === 'ELIGIBLE',
    policyRevisionId: resolved ? FAST_TRACK_POLICY_ID : null,
    policyContentHash: resolved ? `sha256:${FAST_TRACK_POLICY_ID}` : null,
    missingReasons,
    rules: evaluation,
  };
}

export function buildWatermark(capturedAt: string, coords: FieldCoordinates) {
  return `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)} • ${capturedAt}`;
}
