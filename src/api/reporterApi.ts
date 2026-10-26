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
}): Promise<OwnReportPageDto> {
  const params: Record<string, string | number> = {};
  if (options?.cursor) {
    params.cursor = options.cursor;
  }
  if (options?.pageSize) {
    params.pageSize = options.pageSize;
  }
  const response = await apiClient.get<OwnReportPageDto>('/reports', { params });
  return response.data;
}

// ---------------------------------------------------------------------------
// API-217: GET /reports/{reportId}
// ---------------------------------------------------------------------------

/**
 * Chi tiết một phản ánh. Response header `ETag` = `report.version`.
 * Trả cả `etag` để màn supplement dùng cho If-Match.
 */
export async function getOwnReportReal(reportId: string): Promise<OwnReportResult> {
  const response = await apiClient.get<OwnReportDto>(`/reports/${reportId}`);
  const etag =
    (response.headers as Record<string, string | undefined>)['etag'] ??
    response.data.version ??
    '';
  return { report: response.data, etag };
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
