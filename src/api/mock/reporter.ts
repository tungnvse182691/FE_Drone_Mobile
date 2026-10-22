import { DEFECT_TYPE_CODES, DefectTypeCode } from '../../constants/defect-types';
import { uuidv4 } from '../../utils/uuid';
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

/** `## Schema ReportEvidenceInputDto` — phần tử `evidence` của API-216/219. */
export interface ReportEvidenceInputDto {
  fileId: string;
  fileVersion?: string | null;
  locationSource?: ReportLocationSource | null;
  capturedAt?: string | null;
  location?: ReportEvidenceLocationDto | null;
}

/**
 * `## Schema CreateReporterReportRequestDto` — body API-216/219. BE đặt
 * `JsonUnmappedMemberHandling.Disallow` nên KHÔNG được gửi field ngoài `description`/`evidence`.
 */
export interface CreateReporterReportRequestDto {
  description?: string | null;
  evidence?: ReportEvidenceInputDto[] | null;
}

/** `## Schema ReporterReportResponseDto` — 201 của API-216. */
export interface ReporterReportResponseDto {
  id: string;
  description: string | null;
  createdAt: string;
  version: string | null;
  evidenceIds: string[];
}

/** `## Schema OwnReportEvidenceDto`. */
export interface OwnReportEvidenceDto {
  id: string;
  fileId: string;
  fileVersion: string | null;
  supplementId: string | null;
  capturedAt: string | null;
  locationSource: string | null;
  location: ReportEvidenceLocationDto | null;
}

/** `## Schema OwnReportSupplementDto`. */
export interface OwnReportSupplementDto {
  id: string;
  description: string | null;
  createdAt: string;
}

/** `## Schema OwnReportUpdateDto`. */
export interface OwnReportUpdateDto {
  id: string;
  summary: string | null;
  publishedAt: string;
  evidenceIds: string[];
}

/** `## Schema OwnReportDto` — 200 của API-217/219 (KHÔNG có mã tra cứu/status nội bộ). */
export interface OwnReportDto {
  id: string;
  description: string | null;
  createdAt: string;
  version: string | null;
  evidence: OwnReportEvidenceDto[];
  routingStatus: string | null;
  publicUpdates: OwnReportUpdateDto[];
  supplements: OwnReportSupplementDto[];
}

/** `## Schema OwnReportPageDto` — 200 của API-215. */
export interface OwnReportPageDto {
  items: OwnReportDto[];
  nextCursor: string | null;
}

export interface ReportWriteOptions {
  /** Mock-only: danh tính người phản ánh (BE lấy từ bearer, mock lấy từ phiên app). */
  reporterEmail?: string;
  idempotencyKey?: string;
}

export interface OwnReportResult {
  report: OwnReportDto;
  etag: string;
}

const MOCK_OTP = '111111';
const OTP_TTL_SECONDS = 300;
const MAX_PHOTOS = 3;

const DEFECT_CODE_VALUES = Object.values(DEFECT_TYPE_CODES);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const intents = new Map<string, ReporterRegistrationIntent>();
/** reportId (uuid) → chủ sở hữu + projection `OwnReportDto`. */
const ownReports = new Map<string, { ownerEmail: string; view: OwnReportDto }>();
const idempotencyCache = new Map<string, unknown>();
let reportVersionSeed = 1;

/** Dữ liệu demo mock (KHÔNG phải wire DTO): giữ defect/location để màn Crew tái sử dụng bằng chứng. */
export interface ReporterEvidenceSeed {
  reportId: string;
  ownerEmail: string;
  description: string;
  submittedAt: string;
  defectTypeCode: DefectTypeCode;
  coordinates: { latitude: number; longitude: number };
  localUris: string[];
}

const reporterEvidenceSeeds: ReporterEvidenceSeed[] = [
  {
    reportId: '5c1d0f7e-8a11-4b52-9c1e-6f0d2b7a4c31',
    ownerEmail: 'dan.nguyen@gmail.com',
    description: 'Ổ gà sâu bong vỡ mặt tấm bê tông, nước đọng sau mưa.',
    submittedAt: '2026-09-27T09:40:00.000Z',
    defectTypeCode: DEFECT_TYPE_CODES.POTH_DEEP,
    coordinates: { latitude: 10.7842, longitude: 106.7018 },
    localUris: [],
  },
  {
    reportId: 'b8e4a2c6-3d95-4f18-a7b0-92c5e1d6f803',
    ownerEmail: 'dan.nguyen@gmail.com',
    description: 'Lún sụt khe co giãn giữa hai tấm đan, xe cộ qua lại bị dằn xóc mạnh.',
    submittedAt: '2026-09-26T08:15:00.000Z',
    defectTypeCode: DEFECT_TYPE_CODES.SLAB_CRK,
    coordinates: { latitude: 10.786, longitude: 106.7035 },
    localUris: [],
  },
];

export function getReporterEvidenceSeeds(): ReporterEvidenceSeed[] {
  return reporterEvidenceSeeds.map((seed) => ({ ...seed }));
}

function seedReports(): void {
  for (const seed of reporterEvidenceSeeds) {
    ownReports.set(seed.reportId, {
      ownerEmail: seed.ownerEmail,
      view: {
        id: seed.reportId,
        description: seed.description,
        createdAt: seed.submittedAt,
        version: mockRowVersion(reportVersionSeed++),
        evidence: seed.localUris.map((uri, index) => ({
          id: `${seed.reportId}-EV-${index + 1}`,
          fileId: `${seed.reportId}-FILE-${index + 1}`,
          fileVersion: null,
          supplementId: null,
          capturedAt: seed.submittedAt,
          locationSource: 'MANUAL',
          location: {
            latitude: seed.coordinates.latitude,
            longitude: seed.coordinates.longitude,
            accuracyMeters: null,
          },
        })),
        routingStatus: null,
        publicUpdates: [],
        supplements: [],
      },
    });
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
      displayName: normalized.split('@')[0] || 'Ng╞░ß╗¥i d├ón',
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

/** API-011 ΓÇö gß╗¡i lß║íi m├ú cho intent ─æ├ú tß║ío (KH├öNG tß║ío intent mß╗¢i). */
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
 * API-012 ΓÇö x├íc thß╗▒c OTP; BE trß║ú `AuthTokenResponseDto`. UI hiß╗çn tß║íi chß╗ë cß║ºn email ─æ├ú x├íc thß╗▒c
 * n├¬n vß║½n giß╗» shape c┼⌐, nh╞░ng danh t├¡nh lß║Ñy tß╗½ token trß║ú vß╗ü (kh├┤ng phß║úi chuß╗ùi ng╞░ß╗¥i d├╣ng g├╡).
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

function requireReporterEmail(email: string | undefined): string {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) {
    throwMockApiError('auth_unauthorized', {
      message: 'Cần đăng nhập để thao tác với phản ánh.',
    });
  }
  return normalized;
}

/** API-216/219 khai báo `Idempotency-Key` bắt buộc — thiếu ⇒ 428. */
function requireCommandKey(idempotencyKey: string | undefined): string {
  const key = idempotencyKey?.trim();
  if (!key) {
    throwMockApiError('precondition_required', {
      message: 'Thiếu Idempotency-Key cho lệnh gửi phản ánh.',
    });
  }
  return key;
}

function reportFingerprint(request: CreateReporterReportRequestDto): string {
  return JSON.stringify({
    description: (request.description ?? '').trim(),
    evidence: (request.evidence ?? []).map(
      (item) => `${item.fileId}:${item.fileVersion ?? ''}`,
    ),
  });
}

function normalizeReportEvidence(
  input: ReportEvidenceInputDto[] | null | undefined,
): OwnReportEvidenceDto[] {
  const list = Array.isArray(input) ? input : [];
  if (list.length > MAX_PHOTOS) {
    throwMockApiError('validation_error', {
      message: `Chỉ nhận tối đa ${MAX_PHOTOS} ảnh cho mỗi phản ánh.`,
      details: [{ field: 'evidence', code: 'validation_error', message: 'Quá số ảnh cho phép.' }],
    });
  }
  return list.map((item, index) => {
    const fileId = typeof item.fileId === 'string' ? item.fileId.trim() : '';
    if (!fileId) {
      throwMockApiError('validation_error', {
        message: 'Thiếu mã ảnh đã tải lên.',
        details: [
          {
            field: `evidence[${index}].fileId`,
            code: 'validation_error',
            message: 'Thiếu mã ảnh đã tải lên.',
          },
        ],
      });
    }
    const file = evidenceFiles.get(fileId);
    if (!file) {
      throwMockApiError('not_found', { message: 'Không tìm thấy ảnh đã tải lên.' });
    }
    if (file.status !== 'VERIFIED') {
      throwMockApiError('source_not_ready', {
        message: 'Ảnh chưa xác minh xong. Vui lòng chờ trong giây lát rồi gửi lại.',
      });
    }
    return {
      id: uuidv4(),
      fileId,
      fileVersion: item.fileVersion ?? file.version ?? null,
      supplementId: null,
      capturedAt: item.capturedAt ?? null,
      locationSource: item.locationSource ?? null,
      location: item.location ?? null,
    };
  });
}

function ownedReport(reportId: string, ownerEmail: string): OwnReportDto {
  const row = ownReports.get(reportId);
  if (!row || row.ownerEmail !== ownerEmail) {
    throwMockApiError('not_found', { message: 'Không tìm thấy phản ánh của bạn.' });
  }
  return row.view;
}

/** API-216 — `POST /api/v1/reports`. Trả `ReporterReportResponseDto` + `ETag`. */
export async function submitReport(
  request: CreateReporterReportRequestDto,
  options: ReportWriteOptions = {},
): Promise<{ report: ReporterReportResponseDto; etag: string }> {
  await delay(600);
  const ownerEmail = requireReporterEmail(options.reporterEmail);
  const key = requireCommandKey(options.idempotencyKey);
  const description = (request.description ?? '').trim();
  if (!description) {
    throwMockApiError('validation_error', {
      message: 'Vui lòng nhập mô tả hiện trạng hư hại.',
      details: [{ field: 'description', code: 'validation_error', message: 'Thiếu mô tả.' }],
    });
  }
  const evidence = normalizeReportEvidence(request.evidence);
  if (evidence.length === 0) {
    throwMockApiError('validation_error', {
      message: 'Phản ánh cần ít nhất một ảnh hiện trường đã xác minh.',
      details: [{ field: 'evidence', code: 'validation_error', message: 'Thiếu ảnh hiện trường.' }],
    });
  }
  const fingerprint = reportFingerprint(request);

  const cached = idempotencyCache.get(key) as
    | { fingerprint: string; response: { report: ReporterReportResponseDto; etag: string } }
    | undefined;
  if (cached) {
    if (cached.fingerprint !== fingerprint) {
      throwMockApiError('idempotency_key_reused', {
        message: 'Khoá idempotency đã dùng cho một phản ánh khác.',
      });
    }
    return cached.response;
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  const version = mockRowVersion(reportVersionSeed++);
  const view: OwnReportDto = {
    id,
    description,
    createdAt: now,
    version,
    evidence,
    routingStatus: null,
    publicUpdates: [],
    supplements: [],
  };
  ownReports.set(id, { ownerEmail, view });

  const response = {
    report: {
      id,
      description,
      createdAt: now,
      version,
      evidenceIds: evidence.map((item) => item.id),
    },
    etag: version,
  };
  idempotencyCache.set(key, { fingerprint, response });
  return response;
}

/** API-215 — `GET /api/v1/reports` (chỉ phản ánh của chính người đang đăng nhập). */
export async function listMyReports(
  email: string | undefined,
  options: { cursor?: string | null; pageSize?: number } = {},
): Promise<OwnReportPageDto> {
  await delay(300);
  const ownerEmail = requireReporterEmail(email);
  const pageSize = Math.min(Math.max(options.pageSize ?? 20, 1), 50);
  const all = [...ownReports.values()]
    .filter((row) => row.ownerEmail === ownerEmail)
    .map((row) => row.view)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const parsed = Number.parseInt(options.cursor ?? '0', 10);
  const start = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  const items = all.slice(start, start + pageSize);
  const nextIndex = start + pageSize;
  return { items, nextCursor: nextIndex < all.length ? String(nextIndex) : null };
}

/** API-217 — `GET /api/v1/reports/{reportId}`. */
export async function getOwnReport(
  reportId: string,
  email: string | undefined,
): Promise<OwnReportResult> {
  await delay(250);
  const ownerEmail = requireReporterEmail(email);
  const view = ownedReport(reportId, ownerEmail);
  return { report: view, etag: view.version ?? mockRowVersion(1) };
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
    throwMockApiError('validation_error', {
      message: 'Thiếu Idempotency-Key cho lệnh tải ảnh.',
      status: 428,
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
// PHẢN ÁNH BỔ SUNG (API-219 — body CreateReporterReportRequestDto, If-Match + Idempotency-Key)
// =============================================================================

export type ReportSupplementInput = CreateReporterReportRequestDto;

/** API-219 — `POST /api/v1/reports/{reportId}/supplements`. Trả `OwnReportDto` + `ETag` mới. */
export async function submitReportSupplement(
  reportId: string,
  input: ReportSupplementInput,
  options: ReportWriteOptions & { ifMatch?: string } = {},
): Promise<OwnReportResult> {
  await delay(500);
  const ownerEmail = requireReporterEmail(options.reporterEmail);
  const key = requireCommandKey(options.idempotencyKey);
  const ifMatch = options.ifMatch?.trim();
  if (!ifMatch) {
    throwMockApiError('precondition_required', {
      message: 'Thiếu If-Match cho lệnh bổ sung phản ánh.',
    });
  }
  const view = ownedReport(reportId, ownerEmail);
  const description = (input.description ?? '').trim();
  if (!description) {
    throwMockApiError('validation_error', {
      message: 'Vui lòng nhập nội dung bổ sung.',
      details: [{ field: 'description', code: 'validation_error', message: 'Thiếu nội dung.' }],
    });
  }
  const evidence = normalizeReportEvidence(input.evidence);
  const fingerprint = `${ifMatch}|${description}|${evidence
    .map((item) => item.fileId)
    .join(',')}`;

  const cached = idempotencyCache.get(key) as
    | { fingerprint: string; result: OwnReportResult }
    | undefined;
  if (cached) {
    if (cached.fingerprint !== fingerprint) {
      throwMockApiError('idempotency_key_reused', {
        message: 'Khoá idempotency đã dùng cho một nội dung bổ sung khác.',
      });
    }
    return cached.result;
  }

  if (ifMatch !== view.version) {
    throwMockApiError('concurrency_conflict', {
      message: 'Phản ánh đã được cập nhật ở nơi khác. Vui lòng tải lại bản mới nhất.',
    });
  }

  const supplement: OwnReportSupplementDto = {
    id: uuidv4(),
    description,
    createdAt: new Date().toISOString(),
  };
  const version = mockRowVersion(reportVersionSeed++);
  const next: OwnReportDto = {
    ...view,
    version,
    supplements: [...view.supplements, supplement],
    evidence: [
      ...view.evidence,
      ...evidence.map((item) => ({ ...item, supplementId: supplement.id })),
    ],
  };
  ownReports.set(reportId, { ownerEmail, view: next });
  const result: OwnReportResult = { report: next, etag: version };
  idempotencyCache.set(key, { fingerprint, result });
  return result;
}
