import { messageFor } from '../errorCatalog';
import { uuidv4 } from '../../utils/uuid';

/**
 * Lỗi nghiệp vụ trong mock được ném theo hình dạng giống `axios` thật, đúng envelope
 * `application/problem+json` của 17_10. `code` dùng mã snake_case THẬT của backend
 * (nhánh `huy-review`) — không còn bảng mã HOA cũ.
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
  correlationId: string;
  errors?: Record<string, string[]>;
  retryable: boolean;
}

/** HTTP status cho từng mã lỗi snake_case (theo code thật của BE). */
const MOCK_ERROR_STATUS: Record<string, number> = {
  validation_error: 400,
  not_found: 404,
  file_not_found: 404,
  evidence_not_found: 404,
  upload_session_not_found: 404,
  project_not_found: 404,
  survey_request_not_found: 404,
  road_section_version_not_found: 404,
  segment_set_not_found: 404,
  auth_unauthorized: 401,
  unauthorized: 401,
  auth_invalid_credentials: 401,
  auth_session_revoked: 401,
  refresh_token_invalid: 401,
  refresh_token_expired: 401,
  access_forbidden: 403,
  auth_password_change_required: 403,
  current_assignee_required: 403,
  csrf_failed: 403,
  evidence_access_forbidden: 403,
  repair_assignment_not_current: 403,
  repair_binding_not_current: 403,
  stored_receipt_access_forbidden: 403,
  duplicate_request: 409,
  idempotency_key_reused: 409,
  concurrency_conflict: 409,
  invalid_state_transition: 409,
  source_not_ready: 409,
  identity_email_conflict: 409,
  survey_scope_incompatible: 409,
  survey_invalid_state_transition: 409,
  request_source_stale: 409,
  project_not_active: 409,
  formal_intake_source_conflict: 409,
  physical_claim_source_conflict: 409,
  submission_lineage_conflict: 409,
  legacy_task_read_only: 409,
  first_start_required: 409,
  origin_content_conflict: 409,
  evidence_version_mismatch: 409,
  repair_anchor_not_ready: 409,
  auth_concurrency_conflict: 412,
  unsupported_media_type: 415,
  upload_validation_failed: 422,
  survey_validation_failed: 422,
  precondition_required: 428,
  idempotency_key_required: 428,
  internal_error: 500,
  dependency_unavailable: 503,
  storage_unavailable: 503,
  upload_storage_unavailable: 503,
};

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

export function businessErrorStatus(code: string): number {
  return MOCK_ERROR_STATUS[code] ?? 422;
}

export interface MockApiErrorOptions {
  message?: string;
  details?: MockApiErrorDetail[];
  correlationId?: string;
  errors?: Record<string, string[]>;
  retryable?: boolean;
  /** Ghi đè HTTP status cho các operation dùng chung mã lỗi nhưng khác status (vd: thiếu key upload = 428). */
  status?: number;
}

/** Gom `details` có `field` thành `errors` đúng shape ProblemDetails của BE. */
function fieldErrorsFromDetails(
  details: MockApiErrorDetail[],
): Record<string, string[]> | undefined {
  const grouped: Record<string, string[]> = {};
  for (const detail of details) {
    if (!detail.field) {
      continue;
    }
    const message = detail.message?.trim() || 'Giá trị không hợp lệ.';
    grouped[detail.field] = [...(grouped[detail.field] ?? []), message];
  }
  return Object.keys(grouped).length > 0 ? grouped : undefined;
}

/**
 * Dựng envelope lỗi đủ trường. `message` mặc định lấy từ `messageFor` của
 * `errorCatalog` để mock và UI không lệch câu chữ.
 */
export function buildMockApiError(code: string, options: MockApiErrorOptions = {}): MockApiErrorEnvelope {
  const status = options.status ?? businessErrorStatus(code);
  const details = options.details ?? [];
  const errors = options.errors ?? fieldErrorsFromDetails(details);
  return {
    code,
    message: options.message ?? messageFor(code),
    details,
    correlationId: options.correlationId ?? uuidv4(),
    ...(errors ? { errors } : {}),
    retryable: options.retryable ?? RETRYABLE_STATUSES.has(status),
  };
}

/** Ném lỗi giống `axios`: `{ response: { status, data } }`. */
export function throwMockApiError(code: string, options: MockApiErrorOptions = {}): never {
  const envelope = buildMockApiError(code, options);
  throw {
    response: {
      status: options.status ?? businessErrorStatus(code),
      data: envelope,
    },
  };
}
