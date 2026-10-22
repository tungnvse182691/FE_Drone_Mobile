import { parseProblemDetails } from './problemDetails';

/**
 * Hợp đồng lỗi theo TỪNG operation (17_10) — KHÔNG có bảng mã dùng chung.
 *
 * Nguồn ưu tiên khi lệch: (1) code thật trong BE nhánh `huy-review`
 * (`Constants/ApiErrorCodes.cs` + literal `Error(status, "code")` trong controller);
 * (2) mục "Error contract (declared, not execution)" trong
 * `docs/specs/04_API-Contracts/02_Full-API-Catalog.md`.
 *
 * `status` = mã HTTP lỗi chính (đại diện) của operation; `codes` = toàn bộ mã đã khai báo.
 */
export type ApiId =
  | 'API-002'
  | 'API-003'
  | 'API-007'
  | 'API-010'
  | 'API-011'
  | 'API-012'
  | 'API-104'
  | 'API-080'
  | 'API-135'
  | 'API-136'
  | 'API-137'
  | 'API-159'
  | 'API-208'
  | 'API-211'
  | 'API-212'
  | 'API-213'
  | 'API-214'
  | 'API-219'
  | 'API-225'
  | 'API-230';

export interface ApiErrorContract {
  status: number;
  codes: readonly string[];
}

export const API_ERROR_CODES: Record<ApiId, ApiErrorContract> = {
  'API-002': {
    status: 401,
    codes: [
      'validation_error',
      'auth_invalid_credentials',
      'auth_concurrency_conflict',
      'auth_unauthorized',
      'auth_session_revoked',
      'refresh_token_invalid',
      'refresh_token_expired',
      'auth_password_change_required',
      'internal_error',
      'unsupported_media_type',
    ],
  },
  'API-003': {
    status: 401,
    codes: [
      'validation_error',
      'auth_session_revoked',
      'auth_unauthorized',
      'refresh_token_expired',
      'refresh_token_invalid',
      'internal_error',
      'unsupported_media_type',
    ],
  },
  'API-007': {
    status: 401,
    codes: [
      'validation_error',
      'auth_invalid_credentials',
      'auth_session_revoked',
      'auth_unauthorized',
      'refresh_token_expired',
      'refresh_token_invalid',
      'auth_password_change_required',
      'auth_concurrency_conflict',
      'idempotency_key_reused',
      'internal_error',
    ],
  },
  'API-010': {
    status: 400,
    codes: [
      'validation_error',
      'duplicate_request',
      'identity_email_conflict',
      'internal_error',
      'unsupported_media_type',
    ],
  },
  'API-011': {
    status: 404,
    codes: [
      'validation_error',
      'duplicate_request',
      'identity_email_conflict',
      'not_found',
      'internal_error',
      'unsupported_media_type',
    ],
  },
  'API-012': {
    status: 404,
    codes: [
      'validation_error',
      'duplicate_request',
      'identity_email_conflict',
      'not_found',
      'internal_error',
      'unsupported_media_type',
    ],
  },
  'API-104': {
    status: 404,
    codes: [
      'validation_error',
      'unauthorized',
      'access_forbidden',
      'project_not_found',
      'road_section_version_not_found',
      'segment_set_not_found',
      'concurrency_conflict',
      'internal_error',
    ],
  },
  'API-080': {
    status: 401,
    codes: [
      'validation_error',
      'unauthorized',
      'auth_unauthorized',
      'auth_session_revoked',
      'auth_password_change_required',
      'access_forbidden',
      'not_found',
      'source_not_ready',
      'storage_unavailable',
      'internal_error',
    ],
  },
  'API-135': {
    status: 401,
    codes: ['validation_error', 'unauthorized', 'access_forbidden', 'internal_error'],
  },
  'API-136': {
    status: 404,
    codes: ['unauthorized', 'access_forbidden', 'not_found', 'internal_error'],
  },
  'API-137': {
    status: 400,
    codes: [
      'validation_error',
      'unauthorized',
      'access_forbidden',
      'current_assignee_required',
      'not_found',
      'concurrency_conflict',
      'idempotency_key_reused',
      'idempotency_key_required',
      'request_source_stale',
      'internal_error',
      'unsupported_media_type',
    ],
  },
  'API-159': {
    status: 403,
    codes: [
      'validation_error',
      'unauthorized',
      'access_forbidden',
      'csrf_failed',
      'repair_assignment_not_current',
      'repair_binding_not_current',
      'stored_receipt_access_forbidden',
      'not_found',
      'concurrency_conflict',
      'formal_intake_source_conflict',
      'idempotency_key_reused',
      'idempotency_key_required',
      'invalid_state_transition',
      'physical_claim_source_conflict',
      'project_not_active',
      'repair_anchor_not_ready',
      'submission_lineage_conflict',
      'precondition_required',
      'internal_error',
      'unsupported_media_type',
    ],
  },
  'API-208': {
    status: 404,
    codes: ['auth_unauthorized', 'access_forbidden', 'file_not_found', 'internal_error'],
  },
  'API-211': {
    status: 401,
    codes: [
      'auth_unauthorized',
      'access_forbidden',
      'upload_session_not_found',
      'duplicate_request',
      'upload_validation_failed',
      'validation_error',
      'internal_error',
      'unsupported_media_type',
    ],
  },
  'API-212': {
    status: 404,
    codes: [
      'auth_unauthorized',
      'access_forbidden',
      'upload_session_not_found',
      'internal_error',
    ],
  },
  'API-213': {
    status: 412,
    codes: [
      'auth_unauthorized',
      'access_forbidden',
      'upload_session_not_found',
      'duplicate_request',
      'auth_concurrency_conflict',
      'upload_validation_failed',
      'validation_error',
      'internal_error',
      'unsupported_media_type',
    ],
  },
  'API-214': {
    status: 401,
    codes: [
      'auth_unauthorized',
      'access_forbidden',
      'upload_session_not_found',
      'duplicate_request',
      'upload_validation_failed',
      'validation_error',
      'upload_storage_unavailable',
      'internal_error',
      'unsupported_media_type',
    ],
  },
  'API-219': {
    status: 428,
    codes: [
      'auth_unauthorized',
      'access_forbidden',
      'csrf_failed',
      'not_found',
      'dependency_unavailable',
      'validation_error',
      'idempotency_key_reused',
      'idempotency_key_required',
      'source_not_ready',
      'concurrency_conflict',
      'precondition_required',
      'internal_error',
      'unsupported_media_type',
    ],
  },
  'API-225': {
    status: 404,
    codes: ['auth_unauthorized', 'access_forbidden', 'not_found', 'internal_error'],
  },
  'API-230': {
    status: 401,
    codes: [
      'auth_unauthorized',
      'access_forbidden',
      'survey_request_not_found',
      'duplicate_request',
      'survey_invalid_state_transition',
      'survey_scope_incompatible',
      'auth_concurrency_conflict',
      'concurrency_conflict',
      'survey_validation_failed',
      'validation_error',
      'internal_error',
      'unsupported_media_type',
    ],
  },
};

/**
 * Câu tiếng Việt cho các mã mà BE/docs cho nghĩa rõ ràng (title/message tiếng Anh
 * tương ứng trong controller). Mã không có ở đây → dùng câu chung.
 */
const CODE_MESSAGES: Record<string, string> = {
  validation_error: 'Dữ liệu gửi lên không hợp lệ.',
  auth_invalid_credentials: 'Sai tài khoản hoặc mật khẩu.',
  auth_unauthorized: 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.',
  unauthorized: 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.',
  auth_session_revoked: 'Phiên đăng nhập đã bị thu hồi. Vui lòng đăng nhập lại.',
  auth_password_change_required: 'Bạn cần đổi mật khẩu trước khi tiếp tục.',
  refresh_token_invalid: 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.',
  refresh_token_expired: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  access_forbidden: 'Bạn không có quyền thực hiện thao tác này.',
  not_found: 'Không tìm thấy dữ liệu yêu cầu.',
  file_not_found: 'Không tìm thấy tệp yêu cầu.',
  upload_session_not_found: 'Không tìm thấy phiên tải lên.',
  project_not_found: 'Không tìm thấy dự án.',
  survey_request_not_found: 'Không tìm thấy yêu cầu khảo sát.',
  identity_email_conflict: 'Email này đã được sử dụng.',
  duplicate_request: 'Yêu cầu này đã được gửi trước đó.',
  idempotency_key_reused: 'Thao tác này đã được gửi trước đó.',
  concurrency_conflict: 'Dữ liệu đã thay đổi. Vui lòng tải lại rồi thử lại.',
  auth_concurrency_conflict: 'Dữ liệu đã thay đổi. Vui lòng tải lại rồi thử lại.',
  precondition_required: 'Thiếu thông tin bắt buộc cho thao tác này.',
  idempotency_key_required: 'Lệnh chưa sẵn sàng, vui lòng thử lại.',
  upload_validation_failed: 'Tệp tải lên không hợp lệ.',
  upload_storage_unavailable: 'Hệ thống lưu trữ tạm thời không khả dụng. Vui lòng thử lại.',
  storage_unavailable: 'Hệ thống lưu trữ tạm thời không khả dụng. Vui lòng thử lại.',
  dependency_unavailable: 'Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau.',
  source_not_ready: 'Dữ liệu nguồn chưa sẵn sàng. Vui lòng thử lại sau.',
  survey_validation_failed: 'Dữ liệu khảo sát không hợp lệ.',
  survey_scope_incompatible: 'Phạm vi khảo sát không phù hợp.',
  survey_invalid_state_transition: 'Trạng thái khảo sát không cho phép thao tác này.',
  invalid_state_transition: 'Trạng thái hiện tại không cho phép thao tác này.',
  request_source_stale: 'Dữ liệu nguồn đã cũ. Vui lòng tải lại rồi thử lại.',
  current_assignee_required: 'Bạn không phải người được giao xử lý yêu cầu này.',
  project_not_active: 'Dự án không còn ở trạng thái hoạt động.',
  repair_assignment_not_current: 'Phân công sửa chữa đã thay đổi. Vui lòng tải lại.',
  repair_binding_not_current: 'Liên kết sửa chữa đã thay đổi. Vui lòng tải lại.',
  stored_receipt_access_forbidden: 'Bạn không có quyền truy cập biên nhận đã lưu.',
  internal_error: 'Hệ thống đang bận. Vui lòng thử lại sau.',
  unsupported_media_type: 'Định dạng nội dung không được hỗ trợ.',
};

export const GENERIC_ERROR_MESSAGE = 'Có lỗi xảy ra. Vui lòng thử lại.';

const DECLARED_CODES = new Set<string>(
  Object.values(API_ERROR_CODES).flatMap((contract) => contract.codes),
);

export function isDeclaredCode(code: string, apiId?: ApiId): boolean {
  if (apiId) {
    return API_ERROR_CODES[apiId].codes.includes(code);
  }
  return DECLARED_CODES.has(code);
}

/** Câu tiếng Việt cho mã lỗi; mã lạ/thiếu → câu chung, KHÔNG bịa chi tiết. */
export function messageFor(code: string | null | undefined, apiId?: ApiId): string {
  if (!code) {
    return GENERIC_ERROR_MESSAGE;
  }
  return CODE_MESSAGES[code] ?? GENERIC_ERROR_MESSAGE;
}

/** Tiện ích: bóc code rồi lấy câu tiếng Việt trong một bước. */
export function messageForProblem(data: unknown, apiId?: ApiId): string {
  return messageFor(parseProblemDetails(data).code, apiId);
}
