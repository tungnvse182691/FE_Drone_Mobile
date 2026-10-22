import { ReporterReport, TrackingTimelineEvent } from '../../types/domain';
import { ReporterReportStatus } from '../../types/enums';
import { DEFECT_TYPE_CODES, DefectTypeCode } from '../../constants/defect-types';
import type { ReportEvidenceLocationDto, ReportLocationSource } from '../../types/position';
import { throwMockApiError } from './errors';
import {
  registerReporter,
  resendReporterOtp as resendReporterOtpApi,
  verifyReporterOtp as verifyReporterOtpApi,
} from './reporter-registration';
import {
  MAX_PHOTO_BYTES,
  PART_SIZE_BYTES,
  PRESIGNED_URL_TTL_MINUTES,
  SESSION_TTL_HOURS,
  isSupportedPhotoMediaType,
  isValidChecksumSha256,
} from '../uploads';
import type {
  CompletedUploadPartDto,
  FileMetadataResponseDto,
  ReporterEvidenceCreateRequestDto,
  StoredPartResult,
  UploadCompleteRequestDto,
  UploadPartUrlResponseDto,
  UploadPartUrlsRequestDto,
  UploadPartUrlsResponseDto,
  UploadSessionResponseDto,
  UploadTransport,
} from '../uploads';

export interface ReporterRegistrationIntent {
  intentId: string;
  email: string;
  otp: string;
  expiresInSeconds: number;
}

export interface ReportCreate {
  reporter_email: string;
  route_hint?: string;
  description: string;
  photo_uris: string[];
  coordinates: [number, number];
  defect_type?: DefectTypeCode;
  /** Nguồn tọa độ ảnh — khớp `ReportEvidenceInputDto.locationSource`. */
  location_source?: ReportLocationSource;
  /** Khối vị trí kèm sai số GPS — khớp `ReportEvidenceLocationDto`. */
  location?: ReportEvidenceLocationDto | null;
}

const MOCK_OTP = '111111';
const OTP_TTL_SECONDS = 300;
const TRACKING_SEED = 882920;
const MAX_PHOTOS = 3;

const DEFECT_CODE_VALUES = Object.values(DEFECT_TYPE_CODES);

function isDefectTypeCode(value: string): value is DefectTypeCode {
  return (DEFECT_CODE_VALUES as string[]).includes(value);
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const intents = new Map<string, ReporterRegistrationIntent>();
const reports = new Map<string, ReporterReport>();
const idempotencyCache = new Map<string, unknown>();
let trackingCounter = 0;

function nextTrackingCode(): string {
  trackingCounter += 1;
  return `#HH-${TRACKING_SEED + trackingCounter - 1}`;
}

function seedReports(): void {
  const seeds: ReporterReport[] = [
    {
      id: 'RPT-SEED-882910',
      tracking_code: '#HH-882910',
      reporter_email: 'nguoidan.binhchanh@gmail.com',
      route_hint: 'Tuyến ĐH.05 - Cầu Bà Lát (Km01+850), làn xe buýt hướng Vĩnh Lộc B',
      description:
        'Ổ gà sâu vỡ tấm bê tông trên làn xe buýt, đo được khoảng 1 tấm bê tông bị vỡ. Nguy cơ rất cao, xe máy đi qua có thể sụp lún.',
      photo_uris: [],
      coordinates: [106.7001, 10.783],
      defect_type: DEFECT_TYPE_CODES.POTH_DEEP,
      status: ReporterReportStatus.COMPLETED,
      submitted_at: '2026-09-18T02:15:00.000Z',
    },
    {
      id: 'RPT-SEED-104928',
      tracking_code: '#HH-104928',
      reporter_email: 'nguoidan.binhchanh@gmail.com',
      route_hint: 'Tuyến ĐH.05 - Vĩnh Lộc B, đoạn trước cầu Bà Lát về hướng Tân Kiên',
      description:
        'Nứt tấm bê tông lan rộng khoảng 1,5m, nước đọng lại sau mưa. Vị trí nằm sát mép tảm, xe tải trọng đi qua rất dễ vỡ thêm.',
      photo_uris: [],
      coordinates: [106.705, 10.7875],
      defect_type: DEFECT_TYPE_CODES.SLAB_CRK,
      status: ReporterReportStatus.INSPECTING,
      submitted_at: '2026-09-25T07:40:00.000Z',
    },
    {
      id: 'RPT-SEED-772910',
      tracking_code: '#HH-772910',
      reporter_email: 'dan.nguyen@gmail.com',
      route_hint: 'Tuyến ĐH.05 - Km02+100 gần ngã ba liên ấp',
      description:
        'Mặt đường bê tông bị bong tróc bề mặt lớn, tạo hố lõm sâu khoảng 6cm, gây nguy hiểm cho người đi xe gắn máy.',
      photo_uris: [],
      coordinates: [106.7012, 10.7845],
      defect_type: DEFECT_TYPE_CODES.POTH_DEEP,
      status: ReporterReportStatus.COMPLETED,
      submitted_at: '2026-09-20T03:30:00.000Z',
    },
    {
      id: 'RPT-SEED-664928',
      tracking_code: '#HH-664928',
      reporter_email: 'dan.nguyen@gmail.com',
      route_hint: 'Tuyến ĐH.05 - Cầu Bà Lát hướng về chợ Vĩnh Lộc',
      description:
        'Lún sụt khe co giãn giữa hai tấm đan, xe cộ qua lại bị dằn xóc mạnh.',
      photo_uris: [],
      coordinates: [106.7035, 10.786],
      defect_type: DEFECT_TYPE_CODES.SLAB_CRK,
      status: ReporterReportStatus.INSPECTING,
      submitted_at: '2026-09-26T08:15:00.000Z',
    },
  ];

  for (const seed of seeds) {
    reports.set(seed.tracking_code, seed);
  }
}

seedReports();

// RFC 5322 dot-atom: KHONG cho dot dau/cuoi/hai lien tie trong local-part,
// domain label khong bat dau/bang dau gach, TLD la chu cai >= 2.
// KHONG khoang trang giua. Chap nhan MOI nha cung cap email (khong khoang han Gmail) - Quyet dinh D25.
const EMAIL_REGEX =
  /^[A-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?\.)+[A-Z]{2,}$/i;

function isValidEmail(email: string): boolean {
  const normalized = email.trim();
  if (normalized.length > 254) return false;
  return EMAIL_REGEX.test(normalized);
}

function isValidLonLat(coords: [number, number]): boolean {
  if (!Array.isArray(coords) || coords.length !== 2) return false;
  const [lon, lat] = coords;
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return false;
  if (lon < -180 || lon > 180) return false;
  if (lat < -90 || lat > 90) return false;
  return true;
}

function withIdempotency<T>(key: string | undefined, produce: () => T): T {
  if (!key) {
    return produce();
  }
  const cached = idempotencyCache.get(key);
  if (cached !== undefined) {
    return cached as T;
  }
  const result = produce();
  idempotencyCache.set(key, result);
  return result;
}

/**
 * API-010 — đăng ký người phản ánh. Trả intent của BE (KHÔNG trả OTP); màn OTP đọc
 * `activeIntentId` từ intent này.
 */
export async function registerReporterEmail(
  email: string,
  idempotencyKey?: string,
): Promise<ReporterRegistrationIntent> {
  await delay(400);
  const normalized = email.trim().toLowerCase();
  if (!isValidEmail(normalized)) {
    throw new Error('EMAIL_INVALID');
  }
  const intent = await registerReporter(
    {
      email: normalized,
      password: `Reporter@${idempotencyKey?.slice(-6) ?? '2026'}`,
      displayName: normalized.split('@')[0] || 'Người dân',
      reporterType: 'Citizen',
    },
    { idempotencyKey },
  ).catch((error) => {
    const code = (error as { response?: { data?: { code?: string } } }).response?.data?.code;
    if (code === 'identity_email_conflict') {
      throw new Error('EMAIL_IN_USE');
    }
    if (code === 'duplicate_request') {
      throw new Error('EMAIL_IN_USE');
    }
    throw error;
  });
  const registration: ReporterRegistrationIntent = {
    intentId: intent.intentId,
    email: normalized,
    otp: '',
    expiresInSeconds: OTP_TTL_SECONDS,
  };
  intents.set(intent.intentId, registration);
  return registration;
}

/** API-011 — gửi lại mã cho intent đã tạo (KHÔNG tạo intent mới). */
export async function resendReporterRegistration(
  intentId: string,
  idempotencyKey?: string,
): Promise<ReporterRegistrationIntent> {
  await delay(300);
  const intent = await resendReporterOtpApi(intentId, { idempotencyKey });
  return {
    intentId: intent.intentId,
    email: '',
    otp: '',
    expiresInSeconds: intent.resendAfterSeconds,
  };
}

/**
 * API-012 — xác thực OTP; BE trả `AuthTokenResponseDto`. UI hiện tại chỉ cần email đã xác thực
 * nên vẫn giữ shape cũ, nhưng danh tính lấy từ token trả về (không phải chuỗi người dùng gõ).
 */
export async function verifyReporterIntent(
  intentId: string,
  otp: string,
  idempotencyKey?: string,
): Promise<{ email: string }> {
  await delay(350);
  try {
    await verifyReporterOtpApi({ intentId, otp }, { idempotencyKey });
    const intent = intents.get(intentId);
    return { email: intent?.email ?? '' };
  } catch (error) {
    const code = (error as { response?: { data?: { code?: string } } }).response?.data?.code;
    if (code === 'not_found') {
      throw new Error('INTENT_NOT_FOUND');
    }
    if (code === 'validation_error') {
      throw new Error('OTP_INVALID');
    }
    throw error;
  }
}

export async function submitReport(
  payload: ReportCreate,
  idempotencyKey?: string,
): Promise<{ report: ReporterReport }> {
  await delay(600);
  if (!payload.description.trim()) {
    throw new Error('DESCRIPTION_REQUIRED');
  }
  if (!isValidEmail(payload.reporter_email)) {
    throw new Error('EMAIL_INVALID');
  }
  if (!isValidLonLat(payload.coordinates)) {
    throw new Error('COORDINATES_INVALID');
  }
  if (payload.photo_uris.length > MAX_PHOTOS) {
    throw new Error('TOO_MANY_PHOTOS');
  }
  if (payload.defect_type !== undefined && !isDefectTypeCode(payload.defect_type)) {
    throw new Error('DEFECT_TYPE_INVALID');
  }

  return withIdempotency(idempotencyKey, () => {
    const trackingCode = nextTrackingCode();
    const report: ReporterReport = {
      id: `RPT-${trackingCounter}`,
      tracking_code: trackingCode,
      reporter_email: payload.reporter_email.trim().toLowerCase(),
      route_hint: payload.route_hint,
      description: payload.description.trim(),
      photo_uris: payload.photo_uris,
      coordinates: payload.coordinates,
      defect_type: payload.defect_type,
      status: ReporterReportStatus.SUBMITTED,
      submitted_at: new Date().toISOString(),
    };
    reports.set(trackingCode, report);
    return { report };
  });
}

export async function getReportByTracking(
  trackingCode: string,
): Promise<{ report: ReporterReport | null }> {
  await delay(300);
  const normalized = normalizeTrackingCode(trackingCode);
  return { report: reports.get(normalized) ?? null };
}

export function getReporterReportsSnapshot(): ReporterReport[] {
  return [...reports.values()];
}

export async function listMyReports(email: string): Promise<{ items: ReporterReport[] }> {
  await delay(300);
  const normalized = email.trim().toLowerCase();
  const items = [...reports.values()]
    .filter((report) => report.reporter_email === normalized)
    .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
  return { items };
}

export async function submitFeedback(
  trackingCode: string,
  rating: number,
  feedbackNotes: string,
): Promise<{ report: ReporterReport }> {
  await delay(400);
  const normalized = normalizeTrackingCode(trackingCode);
  const report = reports.get(normalized);
  if (!report) {
    throw new Error('REPORT_NOT_FOUND');
  }
  if (rating < 1 || rating > 5) {
    throw new Error('RATING_INVALID');
  }
  const updated: ReporterReport = {
    ...report,
    rating,
    feedback_notes: feedbackNotes.trim() || undefined,
    status: ReporterReportStatus.COMPLETED,
  };
  reports.set(normalized, updated);
  return { report: updated };
}

export function advanceReportStatus(trackingCode: string, status: ReporterReportStatus): void {
  const normalized = normalizeTrackingCode(trackingCode);
  const report = reports.get(normalized);
  if (!report) {
    return;
  }
  reports.set(normalized, { ...report, status });
}

export function normalizeTrackingCode(input: string): string {
  const trimmed = input.trim().toUpperCase();
  if (!trimmed) {
    return '';
  }
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

export function buildTrackingTimeline(
  status: ReporterReportStatus,
  submittedAt: string,
): TrackingTimelineEvent[] {
  const rejected = status === ReporterReportStatus.REJECTED;
  const order: ReporterReportStatus[] = [
    ReporterReportStatus.SUBMITTED,
    ReporterReportStatus.RECEIVED,
    ReporterReportStatus.INSPECTING,
    ReporterReportStatus.REPAIRING,
    ReporterReportStatus.COMPLETED,
  ];
  const labels: Record<ReporterReportStatus, string> = {
    [ReporterReportStatus.SUBMITTED]: 'Đã gửi phản ánh',
    [ReporterReportStatus.RECEIVED]: 'Đã tiếp nhận',
    [ReporterReportStatus.INSPECTING]: 'Đang khảo sát / đo đạc',
    [ReporterReportStatus.REPAIRING]: 'Đang sửa chữa',
    [ReporterReportStatus.COMPLETED]: 'Hoàn thành nghiệm thu',
    [ReporterReportStatus.REJECTED]: 'Không hợp lệ',
  };
  const descriptions: Record<ReporterReportStatus, string> = {
    [ReporterReportStatus.SUBMITTED]: 'Hệ thống đã ghi nhận phản ánh của bạn',
    [ReporterReportStatus.RECEIVED]: 'Ban QLDA đã tiếp nhận hồ sơ',
    [ReporterReportStatus.INSPECTING]: 'Đội khảo sát hiện trường đang kiểm tra vị trí hư hại',
    [ReporterReportStatus.REPAIRING]: 'Đội sửa chữa đang khắc phục khiếm khuyết',
    [ReporterReportStatus.COMPLETED]: 'Đã sửa chữa xong và nghiệm thu đạt yêu cầu',
    [ReporterReportStatus.REJECTED]: 'Phản ánh không thuộc phạm vi tuyến đường bê tông phụ trách',
  };

  if (rejected) {
    return [
      {
        step: ReporterReportStatus.SUBMITTED,
        label: labels[ReporterReportStatus.SUBMITTED],
        description: descriptions[ReporterReportStatus.SUBMITTED],
        occurred_at: submittedAt,
        completed: true,
      },
      {
        step: ReporterReportStatus.REJECTED,
        label: labels[ReporterReportStatus.REJECTED],
        description: descriptions[ReporterReportStatus.REJECTED],
        completed: true,
      },
    ];
  }

  const currentIndex = order.indexOf(status);
  const base = new Date(submittedAt).getTime() || Date.now();
  const stepGapMs = 1000 * 60 * 60 * 12;

  return order.map((step, index) => {
    const completed = currentIndex >= index;
    return {
      step,
      label: labels[step],
      description: descriptions[step],
      occurred_at: completed ? new Date(base + index * stepGapMs).toISOString() : undefined,
      completed,
    };
  });
}

export { MOCK_OTP };

// =============================================================================
// UPLOAD ẢNH PRIVATE (API-211 / API-212 / API-213 / API-214 / API-208)
// Mock giữ ĐÚNG shape envelope của BE (kể cả lỗi), nhưng thay presigned URL thật
// bằng URL giả `storage.mock.roadguard.local` và giả lập verify sau vài lần poll.
// =============================================================================

const UPLOAD_STORAGE_HOST = 'https://storage.mock.roadguard.local';
/** Số lần poll API-208 trước khi file chuyển VERIFIED (mock). */
const VERIFY_POLLS_REQUIRED = 3;

interface MockUploadSession {
  id: string;
  fileId: string;
  status: string;
  partSizeBytes: number;
  expiresAt: string;
  version: string;
  checksumSha256: string;
  sizeBytes: number;
  mediaType: string;
  fileName: string;
  partsTotal: number;
  eTags: Map<number, string>;
}

interface MockEvidenceFile {
  id: string;
  status: string;
  checksumSha256: string;
  mediaType: string;
  sizeBytes: number;
  version: string;
  polls: number;
}

const uploadSessions = new Map<string, MockUploadSession>();
const evidenceFiles = new Map<string, MockEvidenceFile>();
const uploadIdempotency = new Map<string, { uploadId: string; fingerprint: string }>();
const partUrlIdempotency = new Map<string, UploadPartUrlsResponseDto>();
const completeIdempotency = new Map<
  string,
  { uploadId: string; fingerprint: string; response: UploadSessionResponseDto }
>();
let uploadCounter = 0;

/** Row-version dạng ETag có dấu ngoặc kép — dùng cho `If-Match` (session) và `version` (file). */
function mockRowVersion(seed: number): string {
  return `"${seed.toString(16).toUpperCase().padStart(16, '0')}="`;
}

function nextUploadIdentifiers(): { uploadId: string; fileId: string } {
  uploadCounter += 1;
  const suffix = uploadCounter.toString().padStart(6, '0');
  return { uploadId: `UP-${suffix}`, fileId: `FILE-${suffix}` };
}

function requireSession(uploadId: string): MockUploadSession {
  const session = uploadSessions.get(uploadId);
  if (!session) {
    throwMockApiError('upload_session_not_found', {
      message: 'Phiên tải ảnh không tồn tại hoặc đã hết hạn.',
    });
  }
  return session;
}

function requireFile(fileId: string): MockEvidenceFile {
  const file = evidenceFiles.get(fileId);
  if (!file) {
    throwMockApiError('file_not_found', { message: 'Không tìm thấy tệp bằng chứng.' });
  }
  return file;
}

function sessionView(session: MockUploadSession): UploadSessionResponseDto {
  return {
    id: session.id,
    fileId: session.fileId,
    status: session.status,
    partSizeBytes: session.partSizeBytes,
    expiresAt: session.expiresAt,
    version: session.version,
  };
}

function normalizeMediaType(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Bộ transport mock — `src/store/uploads.ts` chọn bộ này khi chưa có BE thật. */
/** 211/213 đều khai báo `Idempotency-Key` bắt buộc — thiếu ⇒ 428. */
function requireUploadKey(idempotencyKey: string | undefined): string {
  const key = idempotencyKey?.trim();
  if (!key) {
    throwMockApiError('idempotency_key_required', {
      message: 'Thiếu Idempotency-Key cho lệnh tải ảnh.',
    });
  }
  return key;
}

function evidenceFingerprint(
  request: ReporterEvidenceCreateRequestDto,
  mediaType: string,
): string {
  return [
    request.fileName.trim(),
    mediaType,
    request.sizeBytes,
    request.checksumSha256.toLowerCase(),
  ].join('|');
}

function completeFingerprint(request: UploadCompleteRequestDto): string {
  const parts = (Array.isArray(request.parts) ? request.parts : [])
    .map((part) => `${part.partNumber}:${part.eTag}`)
    .sort()
    .join(',');
  return `${request.checksumSha256.toLowerCase()}|${parts}`;
}

export function createMockUploadTransport(): UploadTransport {
  return {
    async createSession(
      request: ReporterEvidenceCreateRequestDto,
      idempotencyKey: string,
    ): Promise<UploadSessionResponseDto> {
      await delay(350);
      const key = requireUploadKey(idempotencyKey);

      const fileName = request.fileName?.trim();
      if (!fileName) {
        throwMockApiError('validation_error', { message: 'Thiếu tên tệp ảnh.' });
      }
      const mediaType = normalizeMediaType(request.mediaType ?? '');
      if (!isSupportedPhotoMediaType(mediaType)) {
        throwMockApiError('unsupported_media_type', {
          message: 'Chỉ chấp nhận ảnh JPEG hoặc PNG.',
        });
      }
      if (!Number.isFinite(request.sizeBytes) || request.sizeBytes <= 0) {
        throwMockApiError('upload_validation_failed', { message: 'Kích thước ảnh không hợp lệ.' });
      }
      if (request.sizeBytes > MAX_PHOTO_BYTES) {
        throwMockApiError('upload_validation_failed', {
          message: 'Ảnh vượt quá 20 MiB. Vui lòng chọn ảnh nhỏ hơn.',
        });
      }
      if (!isValidChecksumSha256(request.checksumSha256 ?? '')) {
        throwMockApiError('upload_validation_failed', {
          message: 'Mã kiểm tra toàn vẹn SHA-256 không hợp lệ.',
        });
      }

      const cached = uploadIdempotency.get(key);
      if (cached) {
        if (cached.fingerprint !== evidenceFingerprint(request, mediaType)) {
          throwMockApiError('duplicate_request', {
            message: 'Khoá idempotency đã dùng cho một yêu cầu tải ảnh khác.',
          });
        }
        const cachedSession = uploadSessions.get(cached.uploadId);
        if (cachedSession) {
          return sessionView(cachedSession);
        }
      }

      const { uploadId, fileId } = nextUploadIdentifiers();
      const now = Date.now();
      const session: MockUploadSession = {
        id: uploadId,
        fileId,
        status: 'PENDING',
        partSizeBytes: PART_SIZE_BYTES,
        expiresAt: new Date(now + SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString(),
        version: mockRowVersion(1),
        checksumSha256: request.checksumSha256,
        sizeBytes: request.sizeBytes,
        mediaType,
        fileName,
        partsTotal: Math.max(1, Math.ceil(request.sizeBytes / PART_SIZE_BYTES)),
        eTags: new Map<number, string>(),
      };
      uploadSessions.set(uploadId, session);
      uploadIdempotency.set(key, {
        uploadId,
        fingerprint: evidenceFingerprint(request, mediaType),
      });
      evidenceFiles.set(fileId, {
        id: fileId,
        status: 'PENDING',
        checksumSha256: request.checksumSha256,
        mediaType,
        sizeBytes: request.sizeBytes,
        version: mockRowVersion(1),
        polls: 0,
      });
      return sessionView(session);
    },

    async getSession(uploadId: string): Promise<UploadSessionResponseDto> {
      await delay(200);
      return sessionView(requireSession(uploadId));
    },

    async requestPartUrls(
      uploadId: string,
      request: UploadPartUrlsRequestDto,
      idempotencyKey: string,
    ): Promise<UploadPartUrlsResponseDto> {
      await delay(250);
      const session = requireSession(uploadId);
      const partNumbers = Array.isArray(request.partNumbers) ? request.partNumbers : [];
      if (partNumbers.length === 0) {
        throwMockApiError('validation_error', { message: 'Danh sách part rỗng.' });
      }

      const cached = partUrlIdempotency.get(idempotencyKey);
      if (cached) {
        return cached;
      }

      const expiresAt = new Date(Date.now() + PRESIGNED_URL_TTL_MINUTES * 60 * 1000).toISOString();
      const parts: UploadPartUrlResponseDto[] = partNumbers.map((partNumber) => ({
        partNumber,
        url: `${UPLOAD_STORAGE_HOST}/${session.fileId}/part-${partNumber}?X-Amz-Expires=900&mock=1`,
        expiresAt,
      }));
      const response: UploadPartUrlsResponseDto = { parts };
      partUrlIdempotency.set(idempotencyKey, response);
      return response;
    },

    async putPart(
      part: UploadPartUrlResponseDto,
      _bytes: Uint8Array,
      _contentType: string,
    ): Promise<StoredPartResult> {
      await delay(250);
      if (!part.url || typeof part.partNumber !== 'number' || !part.url.startsWith(UPLOAD_STORAGE_HOST)) {
        throwMockApiError('upload_storage_unavailable', {
          message: 'URL tải lên không hợp lệ hoặc đã hết hạn.',
        });
      }
      const fileId = part.url.split('/')[3] ?? '';
      const session = [...uploadSessions.values()].find((item) => item.fileId === fileId);
      if (!session) {
        throwMockApiError('upload_storage_unavailable', {
          message: 'URL tải lên không hợp lệ hoặc đã hết hạn.',
        });
      }
      const eTag = mockRowVersion(part.partNumber + 10);
      session.eTags.set(part.partNumber, eTag);
      session.status = 'UPLOADING';
      return { partNumber: part.partNumber, eTag };
    },

    async completeUpload(
      uploadId: string,
      request: UploadCompleteRequestDto,
      sessionVersion: string,
      idempotencyKey: string,
    ): Promise<UploadSessionResponseDto> {
      await delay(400);
      const key = requireUploadKey(idempotencyKey);
      const fingerprint = completeFingerprint(request);
      const cached = completeIdempotency.get(key);
      if (cached) {
        if (cached.uploadId !== uploadId || cached.fingerprint !== fingerprint) {
          throwMockApiError('duplicate_request', {
            message: 'Khoá idempotency đã dùng cho một lệnh hoàn tất khác.',
          });
        }
        return { ...cached.response };
      }
      const session = requireSession(uploadId);
      if (sessionVersion !== session.version) {
        throwMockApiError('auth_concurrency_conflict', {
          message: 'Phiên tải ảnh vừa được cập nhật ở nơi khác.',
        });
      }
      const parts: CompletedUploadPartDto[] = Array.isArray(request.parts) ? request.parts : [];
      if (parts.length === 0) {
        throwMockApiError('validation_error', { message: 'Chưa có part nào được tải lên.' });
      }
      if (request.checksumSha256 !== session.checksumSha256) {
        throwMockApiError('upload_validation_failed', {
          message: 'Mã SHA-256 không khớp với nội dung đã tải lên.',
        });
      }
      const uploadedParts = new Set(parts.map((part) => part.partNumber));
      for (let partNumber = 1; partNumber <= session.partsTotal; partNumber += 1) {
        if (!uploadedParts.has(partNumber)) {
          throwMockApiError('upload_validation_failed', {
            message: `Thiếu part ${partNumber} trên ${session.partsTotal}.`,
          });
        }
      }

      session.version = mockRowVersion(2);
      session.status = 'VERIFYING';
      const file = requireFile(session.fileId);
      file.status = 'VERIFYING';
      file.version = mockRowVersion(2);
      file.polls = 0;
      const response = sessionView(session);
      completeIdempotency.set(key, { uploadId, fingerprint, response });
      return response;
    },

    async getFileMetadata(fileId: string): Promise<FileMetadataResponseDto> {
      await delay(250);
      const file = requireFile(fileId);
      if (file.status !== 'VERIFIED' && file.status !== 'FAILED') {
        file.polls += 1;
        if (file.polls >= VERIFY_POLLS_REQUIRED) {
          file.status = 'VERIFIED';
        }
      }
      return {
        id: file.id,
        status: file.status,
        checksumSha256: file.checksumSha256,
        mediaType: file.mediaType,
        sizeBytes: file.sizeBytes,
        version: file.version,
      };
    },
  };
}

// =============================================================================
// PHẢN ÁNH BỔ SUNG (API-217 đọc / API-219 gửi kèm If-Match)
// =============================================================================

export interface ReportSupplementInput {
  description: string;
  photo_uris: string[];
}

const reportVersions = new Map<string, number>();

export function getReportWireVersion(trackingCode: string): string {
  const normalized = normalizeTrackingCode(trackingCode);
  return mockRowVersion(reportVersions.get(normalized) ?? 1);
}

export async function submitReportSupplement(
  trackingCode: string,
  input: ReportSupplementInput,
  expectedVersion: string,
  idempotencyKey?: string,
): Promise<{ report: ReporterReport; version: string }> {
  await delay(500);
  const normalized = normalizeTrackingCode(trackingCode);
  const report = reports.get(normalized);
  if (!report) {
    throwMockApiError('not_found', { message: 'Không tìm thấy phản ánh cần bổ sung.' });
  }
  if (!input.description.trim()) {
    throwMockApiError('validation_error', { message: 'Vui lòng nhập nội dung bổ sung.' });
  }
  if (expectedVersion !== getReportWireVersion(normalized)) {
    throwMockApiError('concurrency_conflict', {
      message: 'Phản ánh đã được cập nhật ở nơi khác. Vui lòng tải lại bản mới nhất.',
    });
  }

  return withIdempotency(idempotencyKey, () => {
    const nextVersion = (reportVersions.get(normalized) ?? 1) + 1;
    reportVersions.set(normalized, nextVersion);
    const updated: ReporterReport = {
      ...report,
      description: `${report.description}\n\n[Bổ sung] ${input.description.trim()}`,
      photo_uris: [...report.photo_uris, ...input.photo_uris],
    };
    reports.set(normalized, updated);
    return { report: updated, version: mockRowVersion(nextVersion) };
  });
}
