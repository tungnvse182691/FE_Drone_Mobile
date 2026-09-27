export const BUSINESS_ERROR_MESSAGES: Record<string, string> = {
  TASK_MODE_NOT_REPAIRABLE: 'Nhiệm vụ này chỉ cho phép kiểm tra/đo; lưu kết quả đo và báo PM.',
  POLICY_NOT_CONFIGURED: 'Chưa cấu hình chính sách Fast Track; giữ nháp, liên hệ PM.',
  POLICY_DECISION_PENDING: 'Chưa đủ chính sách để thực hiện; giữ nháp, liên hệ PM.',
  FAST_TRACK_NOT_ELIGIBLE: 'Không đủ điều kiện sửa nhanh; kích thước vượt ngưỡng policy.',
  PM_REPAIR_BLOCKED: 'PM đã khóa quyền tự sửa cho công việc này.',
  BEFORE_MISSING: 'Bổ sung bằng chứng ảnh hiện trạng TRƯỚC khi sửa.',
  EVIDENCE_PENDING: 'Ảnh chưa được máy chủ xác minh toàn vẹn.',
  FILE_INTEGRITY_FAILED: 'Tệp kiểm tra SHA-256 không khớp.',
  OFFLINE_SNAPSHOT_CONFLICT: 'Nhiệm vụ hoặc chính sách đã thay đổi trên server; giữ bằng chứng, chờ PM xử lý.',
  IDEMPOTENCY_KEY_REUSED: 'Mã thao tác đã được sử dụng trước đó.',
  OPERATION_IN_PROGRESS: 'Đang đối chiếu thao tác trước đó, vui lòng chờ.',
  CASE_HAS_OPEN_REQUIRED_ITEMS: 'Hồ sơ còn hạng mục chưa hoàn tất; chưa thể đóng tổng.',
  TELEMETRY_INSUFFICIENT: 'Thiếu dữ liệu xác định; không kết luận là không có lỗi.',
  OUTSIDE_ASSIGNED_SCOPE: 'Vị trí không thuộc phạm vi đã giao; ghi nhận riêng theo quyền.',
};

export function businessErrorMessage(code: string): string | undefined {
  return BUSINESS_ERROR_MESSAGES[code];
}
