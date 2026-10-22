import { RoleCode } from '../../types/enums';
import { throwMockApiError } from './errors';
import {
  delay,
  MOCK_USERS,
  MockAuthTokenResponse,
  MockUserEntry,
  toTokenResponse,
} from './auth';

/* ------------------------------------------------------------------------------------------------
 * Reporter onboarding — API-010 / API-011 / API-012
 * Nguồn: docs/specs/04_API-Contracts/02_Full-API-Catalog.md (Authorization header bắt buộc
 * `Idempotency-Key` cho cả 3 operation) và 03_DTO-and-Schema-Reference.md.
 * ---------------------------------------------------------------------------------------------- */

/** `RegistrationIntentResponseDto` — camelCase trần, KHÔNG bọc `{ data }`. */
export interface RegistrationIntentResponseDto {
  intentId: string;
  status: string;
  resendAfterSeconds: number;
}

const MOCK_REPORTER_OTP = '111111';
const OTP_TTL_SECONDS = 300;
const RESEND_AFTER_SECONDS = 60;

interface ReporterRegistration {
  intentId: string;
  email: string;
  displayName: string;
  reporterType: string;
  password: string;
  otp: string;
  expiresAt: number;
  consumed: boolean;
}

const reporterRegistrations = new Map<string, ReporterRegistration>();
const reporterWriteReplays = new Map<string, { payload: string; response: unknown }>();

function requireReporterWriteKey(key: string | undefined, header: string): string {
  // API-010/011/012 KHÔNG khai báo 428 — thiếu header rơi vào 400 `validation_error`.
  const trimmed = key?.trim();
  if (!trimmed) {
    throwMockApiError('validation_error', {
      message: `Thiếu ${header} cho lệnh đăng ký/xác thực.`,
      details: [{ field: 'Idempotency-Key', message: 'Header bắt buộc.' }],
    });
  }
  return trimmed;
}

function replayReporterWrite<T>(key: string, payload: string, build: () => T): T {
  const cached = reporterWriteReplays.get(key);
  if (cached) {
    if (cached.payload === payload) {
      return cached.response as T;
    }
    throwMockApiError('duplicate_request', {
      message: 'Khoá idempotency đã dùng cho một lệnh khác.',
    });
  }
  const response = build();
  reporterWriteReplays.set(key, { payload, response });
  return response;
}

function intentView(intent: ReporterRegistration): RegistrationIntentResponseDto {
  return {
    intentId: intent.intentId,
    status: 'PendingVerification',
    resendAfterSeconds: RESEND_AFTER_SECONDS,
  };
}

/** API-010 — `POST /api/v1/auth/reporter-registrations` (202, KHÔNG trả OTP). */
export async function registerReporter(
  input: { email: string; password: string; displayName: string; reporterType: string },
  headers: { idempotencyKey?: string },
): Promise<RegistrationIntentResponseDto> {
  await delay(400);
  const key = requireReporterWriteKey(headers.idempotencyKey, 'Idempotency-Key');
  const email = input.email.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throwMockApiError('validation_error', {
      message: 'Địa chỉ email không hợp lệ.',
      details: [{ field: 'email', message: 'Cần địa chỉ email hợp lệ.' }],
    });
  }
  if (!input.password) {
    throwMockApiError('validation_error', {
      message: 'Mật khẩu không được để trống.',
      details: [{ field: 'password', message: 'Bắt buộc.' }],
    });
  }
  if (!input.displayName.trim()) {
    throwMockApiError('validation_error', {
      message: 'Thiếu tên hiển thị.',
      details: [{ field: 'displayName', message: 'Bắt buộc.' }],
    });
  }
  const reporterType = input.reporterType.trim().toUpperCase();
  if (!reporterType) {
    throwMockApiError('validation_error', {
      message: 'Thiếu loại người phản ánh.',
      details: [{ field: 'reporterType', message: 'Bắt buộc.' }],
    });
  }
  if (reporterType !== 'CITIZEN' && reporterType !== 'INVESTOR_REPRESENTATIVE') {
    throwMockApiError('validation_error', {
      message: 'Loại người phản ánh không hợp lệ.',
      details: [{ field: 'reporterType', message: 'Chỉ nhận CITIZEN hoặc INVESTOR_REPRESENTATIVE.' }],
    });
  }

  const payload = JSON.stringify({ email, reporterType });
  return replayReporterWrite(key, payload, () => {
    if (MOCK_USERS[email]) {
      throwMockApiError('identity_email_conflict', {
        message: 'Email đã có tài khoản. Vui lòng đăng nhập thay vì đăng ký lại.',
      });
    }
    const intentId = `intent-${fakeUuidFrom(`reporter-intent:${email}:${key}`)}`;
    const intent: ReporterRegistration = {
      intentId,
      email,
      displayName: input.displayName.trim(),
      reporterType,
      password: input.password,
      otp: MOCK_REPORTER_OTP,
      expiresAt: Date.now() + OTP_TTL_SECONDS * 1000,
      consumed: false,
    };
    reporterRegistrations.set(intentId, intent);
    return intentView(intent);
  });
}

/** API-011 — `POST /api/v1/auth/reporter-registrations/resend` (202). */
export async function resendReporterOtp(
  intentId: string,
  headers: { idempotencyKey?: string },
): Promise<RegistrationIntentResponseDto> {
  await delay(300);
  const key = requireReporterWriteKey(headers.idempotencyKey, 'Idempotency-Key');
  const intent = reporterRegistrations.get(intentId);
  if (!intent) {
    throwMockApiError('not_found', { message: 'Không tìm thấy yêu cầu xác thực.' });
  }
  if (intent.consumed) {
    throwMockApiError('not_found', { message: 'Yêu cầu xác thực đã được sử dụng.' });
  }
  return replayReporterWrite(key, JSON.stringify({ intentId }), () => {
    intent.otp = MOCK_REPORTER_OTP;
    intent.expiresAt = Date.now() + OTP_TTL_SECONDS * 1000;
    return intentView(intent);
  });
}

/** API-012 — `POST /api/v1/auth/reporter-registrations/verify` (200 → `AuthTokenResponseDto`). */
export async function verifyReporterOtp(
  input: { intentId: string; otp: string },
  headers: { idempotencyKey?: string },
): Promise<MockAuthTokenResponse> {
  await delay(350);
  const key = requireReporterWriteKey(headers.idempotencyKey, 'Idempotency-Key');
  const intent = reporterRegistrations.get(input.intentId);
  if (!intent) {
    throwMockApiError('not_found', { message: 'Không tìm thấy yêu cầu xác thực.' });
  }
  if (intent.consumed) {
    throwMockApiError('not_found', { message: 'Yêu cầu xác thực đã được sử dụng.' });
  }
  if (!input.otp.trim()) {
    throwMockApiError('validation_error', {
      message: 'Thiếu mã xác thực.',
      details: [{ field: 'otp', message: 'Bắt buộc.' }],
    });
  }
  if (Date.now() > intent.expiresAt) {
    throwMockApiError('validation_error', { message: 'Mã xác thực đã hết hiệu lực.' });
  }
  if (input.otp.trim() !== intent.otp) {
    throwMockApiError('validation_error', { message: 'Mã xác thực không đúng.' });
  }

  return replayReporterWrite(key, JSON.stringify({ intentId: intent.intentId, otp: intent.otp }), () => {
    intent.consumed = true;
    const entry: MockUserEntry = {
      user: {
        id: `U-REP-${fakeUuidFrom(`reporter-user:${intent.email}`).slice(0, 8)}`,
        role_code: RoleCode.REPORTER,
        full_name: intent.displayName,
        phone_or_email: intent.email,
        is_reporter: true,
        employee_code: `REP-${fakeUuidFrom(`reporter-code:${intent.email}`).slice(0, 4).toUpperCase()}`,
        must_change_password: false,
        token: `mock-token-reporter-${fakeUuidFrom(`reporter-token:${intent.email}`).slice(0, 12)}`,
        refresh_token: `mock-refresh-reporter-${fakeUuidFrom(`reporter-refresh:${intent.email}`).slice(0, 12)}`,
      },
      password: intent.password,
    };
    MOCK_USERS[intent.email] = entry;
    return toTokenResponse(entry);
  });
}

/** Sinh UUID ổn định từ chuỗi (không dùng cho production). */
function fakeUuidFrom(seed: string): string {
  const hex = Array.from(seed).reduce((acc, char) => {
    const next = (acc * 31 + char.charCodeAt(0)) >>> 0;
    return next;
  }, 7);
  const base = `${hex.toString(16).padStart(8, '0')}-${hex.toString(16).padStart(8, '0')}`;
  return `${base}-4000-8000-${hex.toString(16).padStart(12, '0').slice(0, 12)}`;
}
