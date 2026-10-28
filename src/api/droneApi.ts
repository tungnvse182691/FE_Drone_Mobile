/**
 * droneApi.ts — Gọi các endpoint Drone / Operator thật của RoadGuard Backend.
 *
 * Paths đã xác minh từ code BE và đo thật:
 *   API-038 GET  /api/v1/me/survey-tasks                                                      (Danh sách nhiệm vụ khảo sát của DroneOperator)
 *   API-226 GET  /api/v1/survey-tasks/{taskId}                                                (Chi tiết nhiệm vụ khảo sát)
 *   API-227 POST /api/v1/survey-tasks/{taskId}/accept                                         (Nhận nhiệm vụ)
 *   API-230 POST /api/v1/survey-tasks/{taskId}/decline                                        (Từ chối nhiệm vụ)
 *   API-225 GET  /api/v1/survey-tasks/{taskId}/work-package                                    (Gói công việc khảo sát)
 *   API-104 GET  /api/v1/projects/{projectId}/geometry-package?routeVersionId=...&segmentSetId=... (Gói hình học tuyến)
 *   API-229 POST /api/v1/survey-tasks/{taskId}/datasets                                       (Nộp bộ dữ liệu khảo sát)
 *   API-233 POST /api/v1/uploads                                                              (Tạo phiên upload SURVEY_VIDEO / TELEMETRY)
 *   API-234 GET  /api/v1/uploads/{uploadId}                                                   (GetSession — Đọc phiên upload)
 *   API-236 POST /api/v1/uploads/{uploadId}/part-urls                                         (GetPartUrls — Lấy presigned S3/MinIO URLs)
 *   API-235 POST /api/v1/uploads/{uploadId}/complete                                          (Hoàn tất upload kèm parts + checksumSha256)
 *   API-029 GET  /api/v1/files/{fileId}                                                       (GetFileMetadata — Kiểm tra file metadata & VERIFIED)
 *
 * Quy tắc If-Match:
 *   LUÔN gửi dạng strong ETag: `"${version}"`.
 *   409 hoặc 412 concurrency_conflict → bật conflict UI.
 *   400 validation_error → fallback kiểm tra version bằng cách gọi lại detail.
 */

import axios, { type AxiosError, type AxiosResponse } from 'axios';
import { apiClient } from './client';
import { parseProblemDetails, type ParsedProblemDetails } from './problemDetails';

// =============================================================================
// TYPES & DTOs
// =============================================================================

export interface BandScopeDto {
  routeVersionId: string;
  segmentSetId: string;
  segmentIds: string[];
  targetBand: string;
}

export interface PositionPointDto {
  latitude: number;
  longitude: number;
  altitudeMeters?: number | null;
}

export interface PositionDto {
  point: PositionPointDto;
  source: string;
  accuracyMeters?: number | null;
}

/** DTO trả về từ GET /api/v1/me/survey-tasks (API-038) & GET /api/v1/survey-tasks/{id} (API-226). */
export interface SurveyTaskV2ResponseDto {
  id: string;
  projectId: string;
  scope: BandScopeDto[];
  operatorId: string;
  status: string;
  version: string;
  supplementTaskId?: string | null;
}

export interface SurveyTaskPageV2ResponseDto {
  items: SurveyTaskV2ResponseDto[];
  nextCursor: string | null;
  asOf: string;
}

export interface SurveyGeometryRefDto {
  routeVersionId: string;
  segmentSetId: string;
  segmentIds: string[];
}

/** DTO trả về từ GET /api/v1/survey-tasks/{taskId}/work-package (API-225). */
export interface SurveyTaskWorkPackageDto {
  schemaVersion: string;
  task: SurveyTaskV2ResponseDto;
  dueAt?: string | null;
  accessPoint?: PositionDto | null;
  geometryRefs: SurveyGeometryRefDto[];
  scopeVersion: string;
}

export interface WidthProfileItemDto {
  stationMeters: number;
  widthMeters: number;
}

export interface GeometryShapeDto {
  geometryType: string;
  coordinates: unknown;
}

export interface RoadGeometryVersionViewDto {
  projectId: string;
  roadSectionId: string;
  routeVersionId: string;
  versionNo: number;
  isCurrent: boolean;
  effectiveFrom: string;
  sourceDraftId?: string | null;
  sourceCrs?: number | null;
  engineeringSrid: number;
  stationOriginMeters?: number | null;
  widthProfile?: WidthProfileItemDto[] | null;
  surveyWidthMeters?: number | null;
  metricCenterline?: GeometryShapeDto | null;
  wgs84Centerline?: GeometryShapeDto | null;
  lengthMeters: number;
  metadataStatus: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  geometryHash: string;
  routeKind?: string | null;
}

export interface SegmentGeometryViewDto {
  id: string;
  code: string;
  chainageStart: number;
  chainageEnd: number;
  lengthMeters: number;
}

export interface SegmentSetViewDto {
  id: string;
  routeVersionId: string;
  status: string;
  geometryHash?: string | null;
  segments: SegmentGeometryViewDto[];
  publishedBy?: string | null;
  publishedAt?: string | null;
  version: string;
  metadataStatus: string;
  missingMetadata?: string[];
}

/** DTO trả về từ GET /api/v1/projects/{projectId}/geometry-package (API-104). */
export interface GeometryPackageViewDto {
  schemaVersion: string;
  projectId: string;
  route: RoadGeometryVersionViewDto;
  segmentSet: SegmentSetViewDto;
}

export interface UploadSessionResponseDto {
  id: string;
  fileId: string;
  status: string;
  partSizeBytes: number;
  expiresAt: string;
  version: string;
}

export interface UploadPartUrlItemDto {
  partNumber: number;
  url: string;
  expiresAt: string;
}

export interface UploadPartUrlsResponseDto {
  parts: UploadPartUrlItemDto[];
}

export interface CompletedUploadPartDto {
  partNumber: number;
  etag: string;
}

export interface FileMetadataResponseDto {
  id: string;
  status: string;
  checksumSha256: string;
  mediaType: string;
  sizeBytes: number;
  version: string;
}

export interface DatasetPairDto {
  videoFileId: string;
  telemetryFileId?: string | null;
  timeOffsetMilliseconds: number;
}

export interface DatasetResponseDto {
  id: string;
  surveyTaskId: string;
  dataVersionId: string;
  integrityStatus: string;
  telemetryStatus: string;
  version: string;
}

/** API-026 returns DatasetDetailView, not the API-229 submission receipt. */
export interface DatasetDetailViewDto extends DatasetResponseDto {
  projectId: string;
  submittedBy: string | null;
  submittedAt: string | null;
  recordedAt: string | null;
  deviceId: string | null;
  scope: BandScopeDto[];
  sourceFiles: Array<{ fileId: string; checksumSha256: string; sizeBytes: number; mediaType: string; purpose: string }>;
  pairs: DatasetPairDto[];
}

export interface DatasetCoverageResponseDto {
  datasetId: string;
  items: Array<{
    scope: BandScopeDto;
    positionCoverage: string;
    qualityCoverage: string;
    overallCoverage: string;
    reasons: string[];
    coverageStatus?: string | null;
  }>;
  methodVersion: string;
  assessmentId?: string | null;
  version?: string | null;
}

export interface SubmitDatasetRequestDto {
  videoFileIds: string[];
  telemetryFileIds: string[];
  recordedAt: string;
  deviceId?: string | null;
  scope: BandScopeDto[];
  pairs?: DatasetPairDto[] | null;
}

export interface SurveyTaskDetailWithEtag {
  data: SurveyTaskV2ResponseDto;
  etag: string;
}

export interface SurveyWorkPackageWithEtag {
  data: SurveyTaskWorkPackageDto;
  etag: string;
}

export interface GeometryPackageWithEtag {
  data: GeometryPackageViewDto;
  etag: string;
}

// =============================================================================
// HELPERS
// =============================================================================

export function formatStrongIfMatch(version: string): string {
  const clean = version.trim().replace(/^"+|"+$/g, '');
  return `"${clean}"`;
}

export function extractEtagFromResponse(response: AxiosResponse): string {
  const raw = response.headers?.etag || response.headers?.ETag;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw.trim();
  }
  const bodyVersion = (response.data as { version?: string })?.version;
  if (typeof bodyVersion === 'string' && bodyVersion.trim().length > 0) {
    return formatStrongIfMatch(bodyVersion);
  }
  return '""';
}

export function isConcurrencyConflict(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  if (status === 409 || status === 412) return true;
  const pd = parseProblemDetails(error.response?.data);
  return pd.code === 'concurrency_conflict' || pd.code === 'auth_concurrency_conflict';
}

export function isPreconditionRequired(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  if (status === 428) return true;
  const pd = parseProblemDetails(error.response?.data);
  return pd.code === 'precondition_required';
}

// =============================================================================
// API CALLS (REAL)
// =============================================================================

/** API-026: authorized dataset read. Backend checks Operator ownership and project scope. */
export async function getOperatorDatasetReal(datasetId: string): Promise<{ data: DatasetDetailViewDto; etag: string }> {
  const res = await apiClient.get<DatasetDetailViewDto>(`/datasets/${encodeURIComponent(datasetId)}`);
  return { data: res.data, etag: extractEtagFromResponse(res) };
}

/** API-025: coverage is independent of upload integrity and dataset receipt. */
export async function getOperatorDatasetCoverageReal(datasetId: string): Promise<DatasetCoverageResponseDto> {
  const res = await apiClient.get<DatasetCoverageResponseDto>(`/datasets/${encodeURIComponent(datasetId)}/coverage`);
  return res.data;
}

/**
 * API-038: GET /api/v1/me/survey-tasks
 * Lấy danh sách nhiệm vụ khảo sát gán cho DroneOperator đang đăng nhập.
 */
export async function listOperatorSurveyTasksReal(
  cursor?: string | null,
  limit = 50,
): Promise<SurveyTaskPageV2ResponseDto> {
  const params: Record<string, string | number> = { limit: Math.min(100, Math.max(1, limit)) };
  if (cursor) params.cursor = cursor;

  const res = await apiClient.get<SurveyTaskPageV2ResponseDto>('/me/survey-tasks', { params });
  return res.data;
}

/**
 * API-226: GET /api/v1/survey-tasks/{taskId}
 * Đọc chi tiết nhiệm vụ khảo sát và ETag phiên bản hiện tại.
 */
export async function getOperatorSurveyTaskDetailReal(
  taskId: string,
): Promise<SurveyTaskDetailWithEtag> {
  const res = await apiClient.get<SurveyTaskV2ResponseDto>(`/survey-tasks/${encodeURIComponent(taskId)}`);
  return {
    data: res.data,
    etag: extractEtagFromResponse(res),
  };
}

/**
 * API-227: POST /api/v1/survey-tasks/{taskId}/accept
 * Tiếp nhận nhiệm vụ khảo sát (chuyển trạng thái sang ACCEPTED).
 */
export async function acceptOperatorSurveyTaskReal(
  taskId: string,
  ifMatch: string,
  idempotencyKey: string,
): Promise<SurveyTaskDetailWithEtag> {
  try {
    const res = await apiClient.post<SurveyTaskV2ResponseDto>(
      `/survey-tasks/${encodeURIComponent(taskId)}/accept`,
      {},
      {
        headers: {
          'Idempotency-Key': idempotencyKey,
          'If-Match': formatStrongIfMatch(ifMatch),
        },
      },
    );
    return {
      data: res.data,
      etag: extractEtagFromResponse(res),
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      try {
        const fresh = await getOperatorSurveyTaskDetailReal(taskId);
        const expected = ifMatch.trim().replace(/^"+|"+$/g, '');
        const current = fresh.etag.trim().replace(/^"+|"+$/g, '');
        if (expected && current && expected !== current) {
          const conflictErr = new Error('Phiên bản nhiệm vụ đã thay đổi.') as AxiosError;
          conflictErr.isAxiosError = true;
          conflictErr.response = {
            ...error.response,
            status: 412,
            data: {
              code: 'concurrency_conflict',
              title: 'Concurrency Conflict',
              detail: 'Phiên bản nhiệm vụ đã thay đổi.',
            },
          } as AxiosResponse;
          throw conflictErr;
        }
      } catch (fallbackError) {
        if (axios.isAxiosError(fallbackError) && fallbackError.response?.status === 412) {
          throw fallbackError;
        }
      }
    }
    throw error;
  }
}

/**
 * API-230: POST /api/v1/survey-tasks/{taskId}/decline
 * Từ chối nhiệm vụ khảo sát kèm lý do.
 */
export async function declineOperatorSurveyTaskReal(
  taskId: string,
  reason: string,
  ifMatch: string,
  idempotencyKey: string,
): Promise<SurveyTaskDetailWithEtag> {
  try {
    const res = await apiClient.post<SurveyTaskV2ResponseDto>(
      `/survey-tasks/${encodeURIComponent(taskId)}/decline`,
      { reason: reason.trim() },
      {
        headers: {
          'Idempotency-Key': idempotencyKey,
          'If-Match': formatStrongIfMatch(ifMatch),
        },
      },
    );
    return {
      data: res.data,
      etag: extractEtagFromResponse(res),
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      try {
        const fresh = await getOperatorSurveyTaskDetailReal(taskId);
        const expected = ifMatch.trim().replace(/^"+|"+$/g, '');
        const current = fresh.etag.trim().replace(/^"+|"+$/g, '');
        if (expected && current && expected !== current) {
          const conflictErr = new Error('Phiên bản nhiệm vụ đã thay đổi.') as AxiosError;
          conflictErr.isAxiosError = true;
          conflictErr.response = {
            ...error.response,
            status: 412,
            data: {
              code: 'concurrency_conflict',
              title: 'Concurrency Conflict',
              detail: 'Phiên bản nhiệm vụ đã thay đổi.',
            },
          } as AxiosResponse;
          throw conflictErr;
        }
      } catch (fallbackError) {
        if (axios.isAxiosError(fallbackError) && fallbackError.response?.status === 412) {
          throw fallbackError;
        }
      }
    }
    throw error;
  }
}

/**
 * API-225: GET /api/v1/survey-tasks/{taskId}/work-package
 * Đọc gói công việc khảo sát (phạm vi đã ghim, điểm tiếp cận, dueAt).
 */
export async function getOperatorWorkPackageReal(
  taskId: string,
): Promise<SurveyWorkPackageWithEtag> {
  const res = await apiClient.get<SurveyTaskWorkPackageDto>(
    `/survey-tasks/${encodeURIComponent(taskId)}/work-package`,
  );
  return {
    data: res.data,
    etag: extractEtagFromResponse(res),
  };
}

/**
 * API-104: GET /api/v1/projects/{projectId}/geometry-package?routeVersionId=...&segmentSetId=...
 * Đọc gói hình học tuyến (tọa độ, tim tuyến, phân đoạn).
 */
export async function getOperatorGeometryPackageReal(
  projectId: string,
  query: { routeVersionId: string; segmentSetId: string },
): Promise<GeometryPackageWithEtag> {
  const res = await apiClient.get<GeometryPackageViewDto>(
    `/projects/${encodeURIComponent(projectId)}/geometry-package`,
    {
      params: {
        routeVersionId: query.routeVersionId,
        segmentSetId: query.segmentSetId,
      },
    },
  );
  return {
    data: res.data,
    etag: extractEtagFromResponse(res),
  };
}

/**
 * API-233: POST /api/v1/uploads
 * Tạo phiên tải lên cho Drone Operator (purpose: SURVEY_VIDEO hoặc TELEMETRY).
 */
export async function createOperatorUploadSessionReal(
  payload: {
    purpose: 'SURVEY_VIDEO' | 'TELEMETRY';
    projectId: string;
    targetId: string;
    fileName: string;
    mediaType: string;
    sizeBytes: number;
    checksumSha256: string;
  },
  idempotencyKey: string,
): Promise<UploadSessionResponseDto> {
  const res = await apiClient.post<UploadSessionResponseDto>('/uploads', payload, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
  return res.data;
}

/**
 * API-234: GET /api/v1/uploads/{uploadId}
 * Đọc phiên tải lên (GetSession) để lấy version mới nhất hoặc kiểm tra trạng thái.
 */
export async function getOperatorUploadSessionReal(
  uploadId: string,
): Promise<UploadSessionResponseDto> {
  const res = await apiClient.get<UploadSessionResponseDto>(`/uploads/${encodeURIComponent(uploadId)}`);
  return res.data;
}

/**
 * API-236: POST /api/v1/uploads/{uploadId}/part-urls
 * Lấy presigned URLs (GetPartUrls) để PUT các phần của tệp.
 */
export async function getOperatorUploadPartUrlsReal(
  uploadId: string,
  partNumbers: number[],
  idempotencyKey: string,
): Promise<UploadPartUrlsResponseDto> {
  const res = await apiClient.post<UploadPartUrlsResponseDto>(
    `/uploads/${encodeURIComponent(uploadId)}/part-urls`,
    { partNumbers },
    { headers: { 'Idempotency-Key': idempotencyKey } },
  );
  return res.data;
}

/**
 * PUT bytes trực tiếp lên storage qua presigned URL (KHÔNG kèm Bearer token).
 */
export async function putUploadPartBytesDirect(
  url: string,
  bytes: ArrayBuffer | Blob | Uint8Array,
  mediaType: string,
): Promise<string> {
  const res = await axios.put(url, bytes, {
    headers: {
      'Content-Type': mediaType,
      'Content-Length': bytes instanceof ArrayBuffer ? bytes.byteLength : (bytes as Uint8Array).length,
    },
    transformRequest: [(data) => data],
  });
  const etag = res.headers?.etag || res.headers?.ETag;
  if (!etag) {
    throw new Error('Storage không trả về ETag sau khi tải phần tệp lên.');
  }
  return etag;
}

/**
 * API-235: POST /api/v1/uploads/{uploadId}/complete
 * Báo hoàn tất tải lên tất cả các phần để máy chủ kích hoạt worker xác minh toàn vẹn.
 */
export async function completeOperatorUploadReal(
  uploadId: string,
  payload: {
    parts: CompletedUploadPartDto[];
    checksumSha256: string;
  },
  ifMatch: string,
  idempotencyKey: string,
): Promise<UploadSessionResponseDto> {
  const res = await apiClient.post<UploadSessionResponseDto>(
    `/uploads/${encodeURIComponent(uploadId)}/complete`,
    payload,
    {
      headers: {
        'Idempotency-Key': idempotencyKey,
        'If-Match': formatStrongIfMatch(ifMatch),
      },
    },
  );
  return res.data;
}

/**
 * API-029: GET /api/v1/files/{fileId}
 * Đọc metadata tệp (GetFileMetadata) sau khi đã xác minh xong.
 */
export async function getOperatorFileMetadataReal(
  fileId: string,
): Promise<FileMetadataResponseDto> {
  const res = await apiClient.get<FileMetadataResponseDto>(`/files/${encodeURIComponent(fileId)}`);
  return res.data;
}

/**
 * API-229: POST /api/v1/survey-tasks/{taskId}/datasets
 * Nộp bộ dữ liệu khảo sát hoàn chỉnh gồm video và telemetry đã xác minh.
 */
export async function submitOperatorDatasetReal(
  taskId: string,
  payload: SubmitDatasetRequestDto,
  ifMatch: string,
  idempotencyKey: string,
): Promise<{ data: DatasetResponseDto; etag: string }> {
  try {
    const res = await apiClient.post<DatasetResponseDto>(
      `/survey-tasks/${encodeURIComponent(taskId)}/datasets`,
      payload,
      {
        headers: {
          'Idempotency-Key': idempotencyKey,
          'If-Match': formatStrongIfMatch(ifMatch),
        },
      },
    );
    return {
      data: res.data,
      etag: extractEtagFromResponse(res),
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      try {
        const fresh = await getOperatorSurveyTaskDetailReal(taskId);
        const expected = ifMatch.trim().replace(/^"+|"+$/g, '');
        const current = fresh.etag.trim().replace(/^"+|"+$/g, '');
        if (expected && current && expected !== current) {
          const conflictErr = new Error('Phiên bản nhiệm vụ đã thay đổi.') as AxiosError;
          conflictErr.isAxiosError = true;
          conflictErr.response = {
            ...error.response,
            status: 412,
            data: {
              code: 'concurrency_conflict',
              title: 'Concurrency Conflict',
              detail: 'Phiên bản nhiệm vụ đã thay đổi.',
            },
          } as AxiosResponse;
          throw conflictErr;
        }
      } catch (fallbackError) {
        if (axios.isAxiosError(fallbackError) && fallbackError.response?.status === 412) {
          throw fallbackError;
        }
      }
    }
    throw error;
  }
}
