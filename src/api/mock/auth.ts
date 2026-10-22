import { User } from '../../types/domain';
import { RoleCode } from '../../types/enums';
import { ROLE_CODE_TO_WIRE_ROLE } from '../../types/roleAdapter';
import { throwMockApiError } from './errors';

export const MOCK_USERS: Record<string, { user: User; password: string }> = {
  'pilot@hoanghai.vn': {
    user: {
      id: 'U001',
      role_code: RoleCode.DRONE_OPERATOR,
      full_name: 'Nguyễn Văn An (Phi công Drone)',
      phone_or_email: 'pilot@hoanghai.vn',
      employee_code: 'HH-2089',
      must_change_password: false,
      token: 'mock-token-drone-001',
      refresh_token: 'mock-refresh-drone-001',
    },
    password: '1',
  },
  'drone@hoanghai.vn': {
    user: {
      id: 'U001',
      role_code: RoleCode.DRONE_OPERATOR,
      full_name: 'Nguyễn Văn An (Phi công Drone)',
      phone_or_email: 'drone@hoanghai.vn',
      employee_code: 'HH-2089',
      must_change_password: false,
      token: 'mock-token-drone-001',
      refresh_token: 'mock-refresh-drone-001',
    },
    password: '1',
  },
  'crew@hoanghai.vn': {
    user: {
      id: 'U003',
      role_code: RoleCode.REPAIR_CREW,
      full_name: 'Nguyễn Văn Tuấn (Kỹ thuật viên)',
      phone_or_email: 'crew@hoanghai.vn',
      employee_code: 'HH-RC-084',
      must_change_password: false,
      token: 'mock-token-crew-001',
      refresh_token: 'mock-refresh-crew-001',
    },
    password: '1',
  },
  'dan.nguyen@gmail.com': {
    user: {
      id: 'U-REP-001',
      role_code: RoleCode.REPORTER,
      full_name: 'Nguyễn Văn Dân (Người dân)',
      phone_or_email: 'dan.nguyen@gmail.com',
      is_reporter: true,
      employee_code: 'REP-001',
      must_change_password: false,
      token: 'mock-token-reporter-001',
      refresh_token: 'mock-refresh-reporter-001',
    },
    password: '1',
  },
  'nguoidan.binhchanh@gmail.com': {
    user: {
      id: 'U-REP-002',
      role_code: RoleCode.REPORTER,
      full_name: 'Nguyễn Văn Dân (Bình Chánh)',
      phone_or_email: 'nguoidan.binhchanh@gmail.com',
      is_reporter: true,
      employee_code: 'REP-002',
      must_change_password: false,
      token: 'mock-token-reporter-002',
      refresh_token: 'mock-refresh-reporter-002',
    },
    password: '1',
  },
  // WEB-ONLY: PROJECT_MANAGER thuộc Web Dashboard, KHÔNG phải vai trò mobile.
  'pm@hoanghai.vn': {
    user: {
      id: 'U002',
      role_code: RoleCode.PROJECT_MANAGER,
      full_name: 'Trần Hoàng Quân (PM)',
      phone_or_email: 'pm@hoanghai.vn',
      employee_code: 'HH-PM-01',
      must_change_password: false,
      token: 'mock-token-pm-001',
      refresh_token: 'mock-refresh-pm-001',
    },
    password: '1',
  },
  // WEB-ONLY: SUPERVISOR thuộc Web Dashboard, KHÔNG phải vai trò mobile.
  'sup@hoanghai.vn': {
    user: {
      id: 'U004',
      role_code: RoleCode.SUPERVISOR,
      full_name: 'Trần Thế Hùng (Giám sát viên)',
      phone_or_email: 'sup@hoanghai.vn',
      employee_code: 'HH-8842',
      must_change_password: false,
      token: 'mock-token-sup-001',
      refresh_token: 'mock-refresh-sup-001',
    },
    password: '1',
  },
};

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type MockUserEntry = { user: User; password: string };

/**
 * `AuthActorResponseDto` (17_10): `{ id, displayName, role, version }` — KHÔNG có email,
 * KHÔNG snake_case. Đây là shape wire duy nhất mà mock trả ra.
 */
export interface MockAuthActorWire {
  id: string;
  displayName: string;
  role: string;
  version: string;
}

/** `AuthTokenResponseDto` — camelCase TRẦN, KHÔNG bọc envelope `{ data }`. */
export interface MockAuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  mustChangePassword: boolean;
  user: MockAuthActorWire;
}

/** Map seed nội bộ (snake_case) → DTO wire của BE. */
export function toTokenResponse(
  entry: MockUserEntry,
  accessToken: string = entry.user.token,
  refreshToken: string = entry.user.refresh_token,
): MockAuthTokenResponse {
  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: 3600,
    mustChangePassword: entry.user.must_change_password,
    user: {
      id: entry.user.id,
      displayName: entry.user.full_name,
      role: ROLE_CODE_TO_WIRE_ROLE[entry.user.role_code],
      version: '1',
    },
  };
}

/** API-002 — `POST /api/v1/auth/login`. */
export async function login(email: string, password: string): Promise<MockAuthTokenResponse> {
  await delay(200);
  const normalized = email.toLowerCase().trim();
  const entry = MOCK_USERS[normalized];
  if (!entry || (entry.password !== password && password !== '1' && password !== 'HoangHai@2026')) {
    throwMockApiError('auth_invalid_credentials', { message: 'Sai tài khoản hoặc mật khẩu' });
  }
  return toTokenResponse(entry);
}

/** API-003 — `POST /api/v1/auth/refresh` (trả lại đủ cặp token như BE, không chỉ access token). */
export async function refresh(refreshToken: string): Promise<MockAuthTokenResponse> {
  await delay(200);
  const entry = Object.values(MOCK_USERS).find((item) => item.user.refresh_token === refreshToken);
  if (!entry) {
    throwMockApiError('refresh_token_invalid');
  }
  return toTokenResponse(entry, `mock-token-refreshed-${Date.now()}`);
}

/** Key của các lệnh đổi mật khẩu đã xử lý — mô phỏng replay idempotent của BE. */
const appliedPasswordChanges = new Set<string>();

/**
 * API-004 — `POST /api/v1/auth/change-password`.
 * BE BẮT BUỘC header `Idempotency-Key`; thiếu key → 428 `idempotency_key_required`.
 */
export async function changePassword(
  token: string,
  old_password: string,
  new_password: string,
  idempotencyKey?: string,
) {
  await delay(300);
  const key = idempotencyKey?.trim();
  if (!key) {
    throwMockApiError('idempotency_key_required');
  }
  if (appliedPasswordChanges.has(key)) {
    return { ok: true };
  }
  const entry = Object.values(MOCK_USERS).find((item) => item.user.token === token);
  if (!entry || entry.password !== old_password) {
    throwMockApiError('validation_error', { message: 'Mật khẩu cũ không đúng' });
  }
  entry.password = new_password;
  entry.user.must_change_password = false;
  appliedPasswordChanges.add(key);
  return { ok: true };
}

/**
 * API-005 `POST /api/v1/auth/forced-password-change` — anonymous (KHÔNG bearer), dùng
 * `username` + `confirmPassword` + `operationId`. Khác API-004 (đổi mật khẩu có phiên).
 */
export async function forcedChangePassword(input: {
  username: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  operationId: string;
}) {
  await delay(300);
  if (input.newPassword.length < 6) {
    throwMockApiError('validation_error', { message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
  }
  if (input.newPassword !== input.confirmPassword) {
    throwMockApiError('validation_error', { message: 'Xác nhận mật khẩu mới không khớp' });
  }
  const username = input.username.trim().toLowerCase();
  const entry = Object.values(MOCK_USERS).find(
    (item) => item.user.phone_or_email.toLowerCase() === username,
  );
  if (!entry || entry.password !== input.currentPassword) {
    throwMockApiError('auth_invalid_credentials', { message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
  }
  if (entry.password === input.newPassword) {
    throwMockApiError('validation_error', { message: 'Mật khẩu mới không được trùng mật khẩu cũ' });
  }
  entry.password = input.newPassword;
  entry.user.must_change_password = false;
  return { data: { ok: true } };
}

/** API-008 — chỉ GHI NHẬN yêu cầu khôi phục; app KHÔNG tự đặt lại mật khẩu. */
export async function requestPasswordRecovery(email: string) {
  await delay(300);
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes('@')) {
    throwMockApiError('validation_error', { message: 'Địa chỉ email không hợp lệ' });
  }
  return { data: { accepted: true, email: normalized } };
}

