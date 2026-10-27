/**
 * authApi.ts — Gọi các endpoint Auth thật của RoadGuard Backend.
 *
 * Bootstrap/anonymous dùng bareClient; thao tác có phiên dùng apiClient.
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
import { bareClient, apiClient, type TokenPair, type ForcedPasswordChangeRequest } from './client';
import { parseProblemDetails } from './problemDetails';
import { uuidv4 } from '../utils/uuid';

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

/** API-004: caller owns the in-memory command key. No automatic mutation replay. */
export async function changePasswordReal(
  token: string, currentPassword: string, newPassword: string, key: string,
): Promise<void> {
  const response = await apiClient.post('/auth/change-password', { currentPassword, newPassword }, {
    headers: { Authorization: `Bearer ${token}`, 'Idempotency-Key': key },
  });
  if (response.status !== 204) throw new Error('unexpected_password_status');
}

/** API-005: credentials, never Bearer. operationId must survive manual retry. */
export async function forcedChangePasswordReal(body: ForcedPasswordChangeRequest): Promise<void> {
  const response = await bareClient.post('/auth/forced-password-change', body);
  if (response.status !== 204) throw new Error('unexpected_password_status');
}

/** API-008 acknowledges receipt only; it does not reset a password or promise email. */
export async function requestPasswordRecoveryReal(email: string): Promise<void> {
  const response = await bareClient.post('/auth/password-recovery-requests', { email: email.trim().toLowerCase() });
  if (response.status !== 202) throw new Error('unexpected_recovery_status');
}

export interface PasswordAttemptInput {
  identity: string;
  mode: 'session' | 'forced';
  username: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
export type PasswordAttempt = PasswordAttemptInput & { key: string };

/** Continuity only (sub/sid from Candidate3), never authorization. Hermes-safe. */
export function passwordSessionIdentity(token: string | null): string | null {
  try {
    const parts = token?.split('.');
    if (parts?.length !== 3) return null;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
    if (!encoded || /[^A-Za-z0-9+/]/.test(encoded) || encoded.length % 4 === 1) return null;
    let bits = 0, value = 0, json = '';
    for (const character of encoded) {
      value = (value << 6) | alphabet.indexOf(character); bits += 6;
      if (bits >= 8) { bits -= 8; json += String.fromCharCode((value >>> bits) & 255); }
    }
    const claims = JSON.parse(json) as { sub?: unknown; sid?: unknown };
    return typeof claims.sub === 'string' && claims.sub && typeof claims.sid === 'string' && claims.sid
      ? JSON.stringify([claims.sub, claims.sid]) : null;
  } catch { return null; }
}

/** Memory only: never send to storage, routes or logs. Changed input gets a new key. */
export function preparePasswordAttempt(previous: PasswordAttempt | null, input: PasswordAttemptInput): PasswordAttempt {
  if (previous && (Object.keys(input) as Array<keyof PasswordAttemptInput>).every(key => previous[key] === input[key])) return previous;
  return { ...input, key: uuidv4() };
}

export function passwordValidationMessage(current: string, next: string, confirm: string): string | null {
  if (!current.trim() || !next.trim()) return 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.';
  if (current.length > 1024 || next.length > 1024) return 'Mật khẩu không được vượt quá 1024 ký tự.';
  if (next.length < 6) return 'Mật khẩu mới phải có ít nhất 6 ký tự; máy chủ kiểm tra chính sách mật khẩu.';
  if (next !== confirm) return 'Mật khẩu mới không khớp.';
  if (next === current) return 'Mật khẩu mới không được trùng mật khẩu cũ.';
  return null;
}

export function passwordFailureMessage(error: unknown): string {
  const status = (error as AxiosError)?.response?.status;
  const code = (error as AxiosError)?.code === 'auth_session_changed' ? 'auth_session_changed' : extractProblemCode(error);
  if (code === 'auth_session_changed') return 'Phiên đăng nhập đã thay đổi. Vui lòng đăng nhập lại.';
  if (!status || status >= 500 || status === 408) return 'Chưa xác nhận được kết quả. Giữ nguyên thông tin khi thử lại hoặc đăng nhập bằng mật khẩu mới để kiểm tra.';
  if (status === 401) return 'Mật khẩu hiện tại không đúng hoặc phiên đã hết hạn. Vui lòng kiểm tra hoặc đăng nhập lại.';
  if (status === 409) return 'Yêu cầu có xung đột. Vui lòng đăng nhập lại để kiểm tra trước khi đổi tiếp.';
  if (status === 400) return 'Thông tin chưa hợp lệ hoặc mật khẩu không đạt chính sách máy chủ.';
  if (status === 403) return 'Phiên không được phép đổi mật khẩu. Vui lòng đăng nhập lại.';
  return 'Không thực hiện được yêu cầu. Vui lòng thử lại.';
}
