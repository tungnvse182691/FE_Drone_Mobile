/**
 * authApi.ts — Gọi các endpoint Auth thật của RoadGuard Backend.
 *
 * Tất cả hàm ở đây dùng `bareClient` (không có interceptor auth/retry) để tránh
 * vòng lặp vô tận khi login / refresh / logout.
 *
 * Wire response shape (AuthTokenResponseDto):
 *   { accessToken, refreshToken, tokenType, expiresIn, mustChangePassword,
 *     user: { id, displayName, role, version } }
 *
 * Role dialect: /auth/android/login → V2 wire (OPERATOR/CREW/PM/SUPERVISOR/REPORTER)
 *               /me → V2 wire (cùng dialect)
 *               /profile → DB-code (DRONE_OPERATOR/REPAIR_CREW/PM/SUPERVISOR/REPORTER)
 * → Cả hai đều xử lý được bởi mapProfileRole() trong roleAdapter.ts.
 */

import type { AxiosError } from 'axios';
import { bareClient, apiClient, type TokenPair } from './client';
import { parseProblemDetails } from './problemDetails';

// ---------------------------------------------------------------------------
// Request / Response shapes (wire types)
// ---------------------------------------------------------------------------

/** Wire: `AuthTokenResponseDto` (camelCase, không bọc envelope). */
export type AuthTokenWire = TokenPair;

/** Wire: `ActorResponseDto` từ GET /me. */
export interface MeWire {
  id: string;
  displayName: string;
  role: string;  // V2 dialect: OPERATOR / CREW / PM / SUPERVISOR / REPORTER
  version: string;
}

/** Wire: `ProfileResponseDto` từ GET /profile. */
export interface ProfileWire {
  userId: string;
  username: string;
  displayName: string;
  email: string;
  roleCode: string; // DB-code: DRONE_OPERATOR / REPAIR_CREW / PM / SUPERVISOR / REPORTER
  status: string;
  rowVersion: string;
}

// ---------------------------------------------------------------------------
// Utility: tạo Idempotency-Key mà không phụ thuộc thư viện uuid
// ---------------------------------------------------------------------------

function newIdempotencyKey(): string {
  // Thử dùng crypto.randomUUID nếu có (React Native Hermes / web)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback đơn giản: timestamp + random hex
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
}

// ---------------------------------------------------------------------------
// Hàm trích xuất ProblemDetails khi lỗi (dùng chung cho mọi catch)
// ---------------------------------------------------------------------------

function extractProblemCode(err: unknown): string {
  const axErr = err as AxiosError | undefined;
  return parseProblemDetails(axErr?.response?.data).code ?? 'unknown_error';
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

/**
 * POST /api/v1/auth/android/login
 * Dùng `bareClient` (không interceptor) để tránh vòng lặp.
 * Ném lỗi nguyên gốc (AxiosError) để caller có thể đọc ProblemDetails.
 */
export async function loginReal(
  email: string,
  password: string,
): Promise<AuthTokenWire> {
  const response = await bareClient.post<AuthTokenWire>(
    '/auth/android/login',
    { email: email.trim().toLowerCase(), password },
  );
  return response.data;
}

/**
 * POST /api/v1/auth/android/refresh
 * Gọi qua `bareClient` để tránh interceptor re-gọi khi đang refresh.
 * Idempotency-Key là optional theo BE — gửi UUID để nhất quán.
 */
export async function refreshReal(refreshToken: string): Promise<AuthTokenWire> {
  const response = await bareClient.post<AuthTokenWire>(
    '/auth/android/refresh',
    { refreshToken },
    { headers: { 'Idempotency-Key': newIdempotencyKey() } },
  );
  return response.data;
}

/**
 * POST /api/v1/auth/logout
 * Bearer token phải được inject trước khi gọi — dùng `apiClient` (có interceptor auth).
 * Yêu cầu `Idempotency-Key` header (BE validate, thiếu → 400).
 * BE trả 204 No Content khi thành công. Best-effort: lỗi mạng bị nuốt bởi caller.
 */
export async function logoutReal(accessToken: string): Promise<void> {
  await apiClient.post(
    '/auth/logout',
    null, // no body
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Idempotency-Key': newIdempotencyKey(),
      },
    },
  );
}

/**
 * GET /api/v1/me
 * Trả `MeWire` với role V2 dialect (OPERATOR/CREW/...).
 * Dùng `apiClient` để được inject Bearer tự động.
 */
export async function fetchMe(): Promise<MeWire> {
  const response = await apiClient.get<MeWire>('/me');
  return response.data;
}

/**
 * GET /api/v1/profile
 * Trả `ProfileWire` với `roleCode` là DB-code dialect.
 * Dùng `apiClient` để được inject Bearer tự động.
 */
export async function fetchProfile(): Promise<ProfileWire> {
  const response = await apiClient.get<ProfileWire>('/profile');
  return response.data;
}

// Re-export để caller có thể kiểm tra code lỗi mà không import thêm
export { extractProblemCode };
