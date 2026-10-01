import { businessErrorMessage } from '../../constants/error-codes';
import { uuidv4 } from '../../utils/uuid';

/**
 * Lỗi nghiệp vụ trong mock được ném theo hình dạng giống `axios` thật, đúng envelope
 * của spec `docs/specs/09_Frontend/03_Error_Response_UI_Convention.md` §1.
 * Cấu trúc này tương thích với `ApiErrorEnvelope` ở `src/api/client.ts` nên UI
 * đọc `error.response.data.code` không phải sửa.
 */
export interface MockApiErrorDetail {
  field?: string;
  code?: string;
  message?: string;
}

export interface MockApiErrorEnvelope {
  code: string;
  message: string;
  details: MockApiErrorDetail[];
  traceId: string;
  retryable: boolean;
}

/** HTTP status cho từng mã lỗi nghiệp vụ, theo spec 03. */
const BUSINESS_ERROR_STATUS: Record<string, number> = {
  TASK_MODE_NOT_REPAIRABLE: 422,
  FAST_TRACK_NOT_ELIGIBLE: 422,
  POLICY_NOT_CONFIGURED: 422,
  PM_REPAIR_BLOCKED: 422,
  BEFORE_MISSING: 422,
  EVIDENCE_PENDING: 422,
  FILE_INTEGRITY_FAILED: 422,
  POLICY_DECISION_PENDING: 422,
  CASE_HAS_OPEN_REQUIRED_ITEMS: 422,
  TELEMETRY_INSUFFICIENT: 422,
  OUTSIDE_ASSIGNED_SCOPE: 422,
  OFFLINE_SNAPSHOT_CONFLICT: 409,
  IDEMPOTENCY_KEY_REUSED: 409,
  OPERATION_IN_PROGRESS: 409,
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  INVALID_CREDENTIALS: 401,
  INVALID_REQUEST: 400,
};

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

export function businessErrorStatus(code: string): number {
  return BUSINESS_ERROR_STATUS[code] ?? 422;
}

export interface MockApiErrorOptions {
  message?: string;
  details?: MockApiErrorDetail[];
  traceId?: string;
  retryable?: boolean;
}

/**
 * Dựng envelope lỗi đủ 5 trường. `message` mặc định lấy từ catalog
 * `BUSINESS_ERROR_MESSAGES` để mock không tự chế lại câu chữ khác UI.
 */
export function buildMockApiError(code: string, options: MockApiErrorOptions = {}): MockApiErrorEnvelope {
  const status = businessErrorStatus(code);
  return {
    code,
    message: options.message ?? businessErrorMessage(code) ?? 'Có lỗi xảy ra. Vui lòng thử lại.',
    details: options.details ?? [],
    traceId: options.traceId ?? uuidv4(),
    retryable: options.retryable ?? RETRYABLE_STATUSES.has(status),
  };
}

/** Ném lỗi giống `axios`: `{ response: { status, data } }`. */
export function throwMockApiError(code: string, options: MockApiErrorOptions = {}): never {
  const envelope = buildMockApiError(code, options);
  throw {
    response: {
      status: businessErrorStatus(code),
      data: envelope,
    },
  };
}
