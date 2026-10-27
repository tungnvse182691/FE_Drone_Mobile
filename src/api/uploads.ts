import axios from 'axios';
import * as Crypto from 'expo-crypto';
import { apiClient } from './client';
import { parseProblemDetails } from './problemDetails';
import type { ReportLocationSource } from '../types/position';

export interface MobileSession {
  status: string;
  token: string | null;
  user: { id?: string; role_code: string; must_change_password?: boolean } | null;
}

export function hasAuthenticatedSession(session: MobileSession): boolean {
  return Boolean(session.user && session.token &&
    (session.status === 'AUTHENTICATED' || session.status === 'REFRESHING'));
}

export function isReporterSession(session: MobileSession): boolean {
  return hasAuthenticatedSession(session) && session.user?.role_code === 'REPORTER' &&
    !session.user.must_change_password;
}

export function isValidReporterOtp(code: string): boolean {
  return /^\d{6}$/.test(code);
}

export function strongUploadETag(version: string): string {
  if (!version || version.startsWith('W/') || /[\r\n]/.test(version)) {
    throw { code: 'precondition_required', status: 428 };
  }
  return version.startsWith('"') && version.endsWith('"') ? version : `"${version}"`;
}

/**
 * Hợp đồng upload ảnh private của Reporter (API-208 / API-211 / API-212 / API-213 / API-214).
 *
 * Nguồn sự thật:
 *  - docs/specs/06_Mobile-Expo/Reporter/03_Private-Photo-Upload.md
 *  - docs/specs/04_API-Contracts/06_File-Upload-and-Evidence-Contracts.md (§Limits)
 *  - docs/specs/04_API-Contracts/02_Full-API-Catalog.md (mục API-208/211/212/213/214)
 *  - docs/specs/04_API-Contracts/03_DTO-and-Schema-Reference.md (## Schema Upload*Dto)
 *
 * Bất biến (KHÔNG được vi phạm):
 *  1. PUT bytes lên presigned URL KHÔNG gắn bearer RoadGuard (URL tự mang quyền).
 *  2. API-213 trả 202 "accepted" KHÔNG có nghĩa file đã VERIFIED → phải poll API-212/API-208.
 *  3. Chỉ được gọi API-216 khi MỌI file đều VERIFIED.
 *  4. KHÔNG log bearer token, presigned URL, bytes ảnh, EXIF hoặc GPS.
 *  5. Presigned URL hết hạn → xin URL mới (API-214), KHÔNG replay bytes với identity mới.
 */

// =============================================================================
// LIMITS — 06_File-Upload-and-Evidence-Contracts.md
// =============================================================================

/** Kích thước mỗi part khi multipart upload. */
export const PART_SIZE_BYTES = 8 * 1024 * 1024;
/** Ảnh hiện trường của người dân: JPEG/PNG tối đa 20 MiB. */
export const MAX_PHOTO_BYTES = 20 * 1024 * 1024;
/** Phiên upload sống tối đa 24 giờ. */
export const SESSION_TTL_HOURS = 24;
/** Presigned URL sống tối đa 15 phút. */
export const PRESIGNED_URL_TTL_MINUTES = 15;
/** Một lần xin part-urls không vượt quá số part này. */
export const MAX_PART_URLS_PER_REQUEST = 100;

export const ALLOWED_PHOTO_MEDIA_TYPES = ['image/jpeg', 'image/png'] as const;
export type PhotoMediaType = (typeof ALLOWED_PHOTO_MEDIA_TYPES)[number];

const CHECKSUM_REGEX = /^[a-f0-9]{64}$/;

// =============================================================================
// WIRE DTO — khớp ## Schema trong 03_DTO-and-Schema-Reference.md
// =============================================================================

/** `## Schema ReporterEvidenceCreateRequestDto` — body API-211. */
export interface ReporterEvidenceCreateRequestDto {
  fileName: string;
  mediaType: string;
  sizeBytes: number;
  checksumSha256: string;
}

/** `## Schema UploadSessionResponseDto` — response API-211/213. */
export interface UploadSessionResponseDto {
  id: string;
  fileId: string;
  status: string | null;
  partSizeBytes: number;
  expiresAt: string;
  version: string | null;
}

/** `## Schema UploadPartUrlsRequestDto` — body API-214. */
export interface UploadPartUrlsRequestDto {
  partNumbers: number[];
}

/** `## Schema UploadPartUrlResponseDto`. */
export interface UploadPartUrlResponseDto {
  partNumber?: number;
  url?: string | null;
  expiresAt?: string;
}

/** `## Schema UploadPartUrlsResponseDto`. */
export interface UploadPartUrlsResponseDto {
  parts?: UploadPartUrlResponseDto[] | null;
}

/** `## Schema CompletedUploadPartDto` — required `eTag`. */
export interface CompletedUploadPartDto {
  partNumber?: number;
  eTag: string;
}

/** `## Schema UploadCompleteRequestDto` — required `checksumSha256`, `parts`. */
export interface UploadCompleteRequestDto {
  parts: CompletedUploadPartDto[];
  checksumSha256: string;
}

/** `## Schema FileMetadataResponseDto` (API-208). */
export interface FileMetadataResponseDto {
  id: string;
  status: string | null;
  checksumSha256: string | null;
  mediaType: string | null;
  sizeBytes: number;
  version: string | null;
}

// =============================================================================
// TRẠNG THÁI VERIFY PHÍA SERVER
// =============================================================================

const FILE_STATUS_WIRE: Record<string, EvidenceFileStatus> = {
  pending: 'PENDING',
  uploading: 'UPLOADING',
  verifying: 'VERIFYING',
  verified: 'VERIFIED',
  failed: 'FAILED',
};

export type EvidenceFileStatus = 'PENDING' | 'UPLOADING' | 'VERIFYING' | 'VERIFIED' | 'FAILED';
/** Server trả `status` dạng chuỗi tự do → giá trị lạ quy về `UNKNOWN` (fail closed). */
export type EvidenceFileStatusView = EvidenceFileStatus | 'UNKNOWN';

/**
 * Server coi `status` là chuỗi opaque; chỉ so khớp không phân biệt hoa/thường.
 * Chưa có BE thật để xác nhận casing → KHÔNG bịa hằng số, chỉ chuẩn hóa.
 */
export function parseFileStatus(raw: string | null | undefined): EvidenceFileStatusView {
  if (typeof raw !== 'string') {
    return 'UNKNOWN';
  }
  const normalized = raw.trim().toLowerCase();
  return FILE_STATUS_WIRE[normalized] ?? 'UNKNOWN';
}

export function isTerminalFileStatus(status: EvidenceFileStatusView): boolean {
  return status === 'VERIFIED' || status === 'FAILED';
}

/**
 * Nguồn tọa độ của ảnh — enum trong 03_Private-Photo-Upload.md.
 * Canonical sống tại `src/types/position.ts` (`ReportLocationSource`); giữ tên cũ cho tương thích.
 */
export type LocationSource = ReportLocationSource;

export {
  buildReportEvidenceLocation,
  locationSourceFor,
} from '../types/position';

// =============================================================================
// HELPERS THUẦN
// =============================================================================

export interface UploadPartRange {
  partNumber: number;
  /** offset bắt đầu (tính theo byte, 0-based, bao gồm) */
  start: number;
  /** offset kết thúc (không bao gồm) */
  end: number;
}

export function planUploadParts(totalBytes: number, partSize: number = PART_SIZE_BYTES): UploadPartRange[] {
  const size = partSize > 0 ? partSize : PART_SIZE_BYTES;
  const parts: UploadPartRange[] = [];
  let offset = 0;
  let partNumber = 1;
  while (offset < totalBytes) {
    const end = Math.min(offset + size, totalBytes);
    parts.push({ partNumber, start: offset, end });
    offset = end;
    partNumber += 1;
  }
  return parts;
}

export function isSupportedPhotoMediaType(mediaType: string): boolean {
  return (ALLOWED_PHOTO_MEDIA_TYPES as readonly string[]).includes(mediaType.trim().toLowerCase());
}

export function normalizePhotoMediaType(
  fileName: string,
  declared?: string | null,
): PhotoMediaType | null {
  const declaredNormalized = (declared ?? '').trim().toLowerCase();
  if (isSupportedPhotoMediaType(declaredNormalized)) {
    return declaredNormalized as PhotoMediaType;
  }
  const lowerName = fileName.trim().toLowerCase();
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  if (lowerName.endsWith('.png')) {
    return 'image/png';
  }
  return null;
}

/** Backoff luỹ tiến có trần cho vòng poll foreground (API-212/API-208). */
export function computePollBackoffMs(attempt: number): number {
  const baseMs = 1500;
  const ceilingMs = 20000;
  return Math.min(baseMs * 2 ** Math.max(0, attempt), ceilingMs);
}

export function isValidChecksumSha256(value: string): boolean {
  return CHECKSUM_REGEX.test(value);
}

function toHex(buffer: ArrayBuffer): string {
  const view = new Uint8Array(buffer);
  let out = '';
  for (let index = 0; index < view.length; index += 1) {
    out += view[index].toString(16).padStart(2, '0');
  }
  return out;
}

/** SHA-256 của bytes nhị phân (ảnh), trả hex thường — khớp regex BE `^[a-f0-9]{64}$`. */
export async function sha256HexOfBytes(bytes: Uint8Array): Promise<string> {
  // `Uint8Array` runtime luôn là BufferSource hợp lệ; chỉ khác biệt ở generic lib TS
  // (`ArrayBufferLike` vs `ArrayBuffer`) nên cần ép kiểu tường minh.
  const source = bytes as unknown as BufferSource;
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, source);
  return toHex(digest);
}

// =============================================================================
// TRANSPORT
// =============================================================================

export interface StoredPartResult {
  partNumber: number;
  eTag: string;
}

export interface UploadTransport {
  createSession(
    request: ReporterEvidenceCreateRequestDto,
    idempotencyKey: string,
  ): Promise<UploadSessionResponseDto>;
  getSession(uploadId: string): Promise<UploadSessionResponseDto>;
  requestPartUrls(
    uploadId: string,
    request: UploadPartUrlsRequestDto,
    idempotencyKey: string,
  ): Promise<UploadPartUrlsResponseDto>;
  putPart(
    part: UploadPartUrlResponseDto,
    bytes: Uint8Array,
    contentType: string,
  ): Promise<StoredPartResult>;
  completeUpload(
    uploadId: string,
    request: UploadCompleteRequestDto,
    sessionVersion: string,
    idempotencyKey: string,
  ): Promise<UploadSessionResponseDto>;
  getFileMetadata(fileId: string): Promise<FileMetadataResponseDto>;
}

/** Lỗi transport đọc được mã nghiệp vụ để cập nhật ledger. */
export function uploadErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }
  const carrier = error as { code?: unknown; response?: { data?: unknown } };
  if (typeof carrier.code === 'string') {
    return carrier.code;
  }
  const parsed = parseProblemDetails(carrier.response?.data);
  return parsed ? parsed.code : null;
}

export function uploadErrorMessage(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }
  const carrier = error as { message?: unknown; response?: { data?: unknown } };
  const parsed = parseProblemDetails(carrier.response?.data);
  if (parsed?.detail) {
    return parsed.detail;
  }
  return typeof carrier.message === 'string' ? carrier.message : null;
}

/**
 * Client riêng cho storage: KHÔNG dùng `apiClient` để tránh interceptor gắn bearer
 * RoadGuard + Idempotency-Key lên presigned URL của nhà cung cấp lưu trữ.
 */
const storageClient = axios.create({ timeout: 120000 });

async function putRawBytesToStorageUrl(
  url: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<{ eTag: string }> {
  const response = await storageClient.put(url, bytes, {
    headers: { 'Content-Type': contentType },
  });
  const headers = response.headers as Record<string, unknown>;
  const rawETag = headers.etag ?? headers.ETag ?? headers['x-etag'];
  return { eTag: typeof rawETag === 'string' ? rawETag : '' };
}

export const httpUploadTransport: UploadTransport = {
  async createSession(request, idempotencyKey) {
    const response = await apiClient.post<UploadSessionResponseDto>(
      '/reporter-evidence/uploads',
      request,
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
    return response.data;
  },

  async getSession(uploadId) {
    const response = await apiClient.get<UploadSessionResponseDto>(
      `/reporter-evidence/uploads/${uploadId}`,
    );
    return response.data;
  },

  async requestPartUrls(uploadId, request, idempotencyKey) {
    const response = await apiClient.post<UploadPartUrlsResponseDto>(
      `/reporter-evidence/uploads/${uploadId}/part-urls`,
      request,
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
    return response.data;
  },

  async putPart(part, bytes, contentType) {
    if (!part.url || typeof part.partNumber !== 'number') {
      throw { code: 'upload_storage_unavailable', status: 503 };
    }
    const { eTag } = await putRawBytesToStorageUrl(part.url, bytes, contentType);
    return { partNumber: part.partNumber, eTag };
  },

  async completeUpload(uploadId, request, sessionVersion, idempotencyKey) {
    const response = await apiClient.post<UploadSessionResponseDto>(
      `/reporter-evidence/uploads/${uploadId}/complete`,
      request,
      { headers: { 'Idempotency-Key': idempotencyKey, 'If-Match': strongUploadETag(sessionVersion) } },
    );
    return response.data;
  },

  async getFileMetadata(fileId) {
    const response = await apiClient.get<FileMetadataResponseDto>(
      `/reporter-evidence/files/${fileId}`,
    );
    return response.data;
  },
};
