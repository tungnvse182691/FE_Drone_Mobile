/**
 * reporterApi.ts — Gọi các endpoint Reporter thật của RoadGuard Backend.
 *
 * Tổ chức theo đúng mẫu authApi.ts (Phase 1b).
 * - Calls KHÔNG cần auth (register/resend/verify): dùng `bareClient`.
 * - Calls cần auth (reports, supplements, evidence): dùng `apiClient` (Bearer auto-inject).
 *
 * Paths đã xác minh từ BE source:
 *   API-010 POST /auth/reporter-registrations          (bareClient)
 *   API-011 POST /auth/reporter-registrations/resend   (bareClient)
 *   API-012 POST /auth/reporter-registrations/verify   (bareClient)
 *   API-215 GET  /reports                              (apiClient)
 *   API-216 POST /reports                              (apiClient, Idempotency-Key required)
 *   API-217 GET  /reports/{reportId}                   (apiClient)
 *   API-218 GET  /reports/{reportId}/evidence/{evidenceId}/download (private bytes)
 *   API-210 GET  /reporter-evidence/publications/{publicationId}/reports/{reportId}/evidence/{evidenceId}/content (authenticated recipient bytes)
 *   API-219 POST /reports/{reportId}/supplements       (apiClient, Idempotency-Key + If-Match required)
 *
 * Upload evidence: httpUploadTransport trong src/api/uploads.ts đã đúng paths
 * (/reporter-evidence/uploads), KHÔNG sửa ở đây.
 */

import { bareClient, apiClient } from './client';
import type {
  OwnReportDto,
  OwnReportPageDto,
  ReporterReportResponseDto,
  CreateReporterReportRequestDto,
  OwnReportResult,
} from './mock/reporter';
import type { TokenPair } from './client';
import { parseProblemDetails } from './problemDetails';
import type { AxiosError } from 'axios';

// ---------------------------------------------------------------------------
// Re-export shapes từ mock để màn hình không cần thay đổi import type
// ---------------------------------------------------------------------------
export type {
  OwnReportDto,
  OwnReportPageDto,
  ReporterReportResponseDto,
  CreateReporterReportRequestDto,
  OwnReportResult,
  ReportEvidenceInputDto,
} from './mock/reporter';

// ---------------------------------------------------------------------------
// Registration DTOs (wire)
// ---------------------------------------------------------------------------

/** `RegistrationIntentResponseDto` — 202 của API-010/011. */
export interface RegistrationIntentResponseDto {
  intentId: string;
  status: string;
  resendAfterSeconds: number;
}

/** Shape dùng trong otp-verify.tsx khi verify trả token. */
export interface VerifyOtpResult {
  tokens: TokenPair;
  email: string;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

export function extractProblemCode(err: unknown): string {
  const axErr = err as AxiosError | undefined;
  return parseProblemDetails(axErr?.response?.data).code ?? 'unknown_error';
}

// ---------------------------------------------------------------------------
// API-010: POST /auth/reporter-registrations
// ---------------------------------------------------------------------------

/**
 * Đăng ký tài khoản Reporter mới.
 * Anonymous — dùng bareClient.
 * Bắt buộc `Idempotency-Key` header (thiếu → 400, KHÔNG phải 428).
 */
export async function registerReporterReal(
  input: {
    email: string;
    password: string;
    displayName: string;
    reporterType: 'CITIZEN' | 'INVESTOR_REPRESENTATIVE';
  },
  idempotencyKey: string,
): Promise<RegistrationIntentResponseDto> {
  const response = await bareClient.post<RegistrationIntentResponseDto>(
    '/auth/reporter-registrations',
    {
      email: input.email.trim().toLowerCase(),
      password: input.password,
      displayName: input.displayName.trim(),
      reporterType: input.reporterType,
    },
    { headers: { 'Idempotency-Key': idempotencyKey } },
  );
  return response.data;
}

// ---------------------------------------------------------------------------
// API-011: POST /auth/reporter-registrations/resend
// ---------------------------------------------------------------------------

/**
 * Gửi lại OTP cho intentId đã tạo.
 * Anonymous — dùng bareClient.
 */
export async function resendReporterOtpReal(
  intentId: string,
  idempotencyKey: string,
): Promise<RegistrationIntentResponseDto> {
  const response = await bareClient.post<RegistrationIntentResponseDto>(
    '/auth/reporter-registrations/resend',
    { intentId },
    { headers: { 'Idempotency-Key': idempotencyKey } },
  );
  return response.data;
}

// ---------------------------------------------------------------------------
// API-012: POST /auth/reporter-registrations/verify
// ---------------------------------------------------------------------------

/**
 * Xác thực OTP → trả `AuthTokenResponseDto` (shape = TokenPair).
 * Anonymous — dùng bareClient.
 */
export async function verifyReporterOtpReal(
  intentId: string,
  otp: string,
  idempotencyKey: string,
): Promise<VerifyOtpResult> {
  const response = await bareClient.post<TokenPair>(
    '/auth/reporter-registrations/verify',
    { intentId, otp: otp.trim() },
    { headers: { 'Idempotency-Key': idempotencyKey } },
  );
  // email không có trong response — caller truyền lại từ params
  return { tokens: response.data, email: '' };
}

// ---------------------------------------------------------------------------
// API-215: GET /reports
// ---------------------------------------------------------------------------

/**
 * Danh sách phản ánh của chính reporter đang đăng nhập.
 * Bearer auto-inject qua apiClient.
 */
export async function listMyReportsReal(options?: {
  cursor?: string | null;
  pageSize?: number;
  signal?: AbortSignal;
}): Promise<OwnReportPageDto> {
  const params: Record<string, string | number> = {};
  if (options?.cursor) {
    params.cursor = options.cursor;
  }
  if (options?.pageSize) {
    params.pageSize = options.pageSize;
  }
  const response = await apiClient.get<OwnReportPageDto>('/reports', { params, signal: options?.signal });
  return response.data;
}

/** scope is a real actor/session identity, never an access token or email. */
export function reporterReportsOptions(scope: string) {
  return {
    queryKey: ['reporter-reports', scope],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }: { pageParam: string | null; signal: AbortSignal }) =>
      listMyReportsReal({ cursor: pageParam, pageSize: 20, signal }),
    getNextPageParam: (page: OwnReportPageDto, _pages: OwnReportPageDto[], _last: string | null, cursors: (string | null)[]) => {
      if (page.nextCursor && cursors.includes(page.nextCursor)) return undefined;
      return page.nextCursor || undefined;
    },
    retry: false as const,
    gcTime: 0,
  };
}

/** Cursor pages may overlap while new reports arrive; never count one ID twice. */
export function reportItemsFromPages(pages: OwnReportPageDto[] = []): OwnReportDto[] {
  const items = new Map<string, OwnReportDto>();
  for (const page of pages) for (const item of page.items) if (!items.has(item.id)) items.set(item.id, item);
  return Array.from(items.values());
}

/** A transient next-page failure does not invalidate already loaded own reports. */
export function canShowReportPages(query: { isError: boolean; isFetchNextPageError: boolean; error: unknown }): boolean {
  if (!query.isError) return true;
  const error = query.error as AxiosError | null;
  const status = error?.response?.status;
  return query.isFetchNextPageError && error?.code !== 'auth_session_changed' &&
    (!status || status === 408 || status === 429 || status >= 500);
}

// ---------------------------------------------------------------------------
// API-217: GET /reports/{reportId}
// ---------------------------------------------------------------------------

/**
 * Chi tiết một phản ánh. Response header `ETag` = `report.version`.
 * Trả cả `etag` để màn supplement dùng cho If-Match.
 */
export async function getOwnReportReal(reportId: string, signal?: AbortSignal): Promise<OwnReportResult> {
  const response = await apiClient.get<OwnReportDto>(`/reports/${encodeURIComponent(reportId)}`, { signal });
  const etag =
    (response.headers as Record<string, string | undefined>)['etag'] ??
    response.data.version ??
    '';
  return { report: response.data, etag };
}

/** API-218 streams private bytes with the same auth/refresh/actor guard as other reads.
 * No external navigation, public URL, filesystem copy or persisted image cache.
 */
export async function downloadReportEvidenceReal(reportId: string, evidenceId: string, signal?: AbortSignal): Promise<string> {
  const response = await apiClient.get<ArrayBuffer>(
    `/reports/${encodeURIComponent(reportId)}/evidence/${encodeURIComponent(evidenceId)}/download`,
    { responseType: 'arraybuffer', signal },
  );
  return evidenceImageDataUri(response);
}

/** API-210 is authenticated, recipient-scoped publication content in current BE.
 * OwnReport.publicUpdates.id is CasePublication.Id, not a private file ID.
 * Only a publication/evidence pair returned by the current own-report read may
 * originate this request; the server rechecks recipient and VERIFIED lineage.
 */
export async function downloadPublicationEvidenceReal(
  report: OwnReportDto,
  publicationId: string,
  evidenceId: string,
  signal?: AbortSignal,
): Promise<string> {
  const validId = (value: unknown): value is string => typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) &&
    value !== '00000000-0000-0000-0000-000000000000';
  if (!validId(report?.id) || !validId(publicationId) || !validId(evidenceId) ||
    !report.publicUpdates?.some(update => update.id === publicationId && update.evidenceIds?.includes(evidenceId))) {
    throw new Error('publication_source_unavailable');
  }
  const response = await apiClient.get<ArrayBuffer>(
    `/reporter-evidence/publications/${encodeURIComponent(publicationId)}/reports/${encodeURIComponent(report.id)}/evidence/${encodeURIComponent(evidenceId)}/content`,
    { responseType: 'arraybuffer', signal, headers: { 'Cache-Control': 'no-store', Pragma: 'no-cache' } },
  );
  return evidenceImageDataUri(response);
}

/** Memory-only preview. Never persist a private/publication URL or image file. */
function evidenceImageDataUri(response: { status: number; data: ArrayBuffer; headers: Record<string, unknown> }): string {
  const mediaType = String(response.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
  const bytes = new Uint8Array(response.data);
  if (response.status !== 200 || !['image/jpeg', 'image/png'].includes(mediaType) || !bytes.length || bytes.length > 20 * 1024 * 1024) {
    throw new Error('unsupported_private_media');
  }
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const chunks: string[] = [];
  for (let start = 0; start < bytes.length; start += 12288) {
    let chunk = '';
    for (let i = start; i < Math.min(start + 12288, bytes.length); i += 3) {
      const value = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
      chunk += alphabet[(value >>> 18) & 63] + alphabet[(value >>> 12) & 63] +
        (i + 1 < bytes.length ? alphabet[(value >>> 6) & 63] : '=') +
        (i + 2 < bytes.length ? alphabet[value & 63] : '=');
    }
    chunks.push(chunk);
  }
  return `data:${mediaType};base64,${chunks.join('')}`;
}

// ---------------------------------------------------------------------------
// API-216: POST /reports
// ---------------------------------------------------------------------------

/**
 * Tạo phản ánh mới. Bắt buộc Bearer + Idempotency-Key.
 * BE trả 201 với `ReporterReportResponseDto` + ETag.
 */
export async function submitReportReal(
  request: CreateReporterReportRequestDto,
  idempotencyKey: string,
): Promise<{ report: ReporterReportResponseDto; etag: string }> {
  const response = await apiClient.post<ReporterReportResponseDto>(
    '/reports',
    request,
    { headers: { 'Idempotency-Key': idempotencyKey } },
  );
  const etag =
    (response.headers as Record<string, string | undefined>)['etag'] ??
    response.data.version ??
    '';
  return { report: response.data, etag };
}

// ---------------------------------------------------------------------------
// API-219: POST /reports/{reportId}/supplements
// ---------------------------------------------------------------------------

/**
 * Bổ sung thông tin cho phản ánh.
 * Bắt buộc: Bearer + Idempotency-Key + If-Match (rowversion từ GET /reports/{id}).
 *
 * Mã lỗi quan trọng:
 *   400 `validation_error`  — body hoặc If-Match format không hợp lệ
 *   409 `concurrency_conflict` / `idempotency_key_reused`
 *   428 `precondition_required` — thiếu Idempotency-Key hoặc If-Match
 */
export async function submitReportSupplementReal(
  reportId: string,
  request: CreateReporterReportRequestDto,
  idempotencyKey: string,
  ifMatch: string,
): Promise<OwnReportResult> {
  const response = await apiClient.post<OwnReportDto>(
    `/reports/${reportId}/supplements`,
    request,
    {
      headers: {
        'Idempotency-Key': idempotencyKey,
        'If-Match': ifMatch,
      },
    },
  );
  const etag =
    (response.headers as Record<string, string | undefined>)['etag'] ??
    response.data.version ??
    '';
  return { report: response.data, etag };
}
