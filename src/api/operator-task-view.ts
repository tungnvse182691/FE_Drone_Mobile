import type { OperatorSurveyTaskV2Dto } from './mock/surveys';
import { operatorTaskSeedCode } from './mock/surveys';

/**
 * Lớp hiển thị cho nhiệm vụ khảo sát (O-03/O-04).
 *
 * DTO `SurveyTaskV2ResponseDto` không có mã nhiệm vụ, tên tuyến, vị trí, thiết bị bay,
 * thông số bay hay chỉ đạo của PM. Các nhãn dưới đây chỉ để HIỂN THỊ, không phải
 * định danh nghiệp vụ và không được dùng làm khoá lưu trữ/gửi máy chủ.
 */

const STATUS_LABEL: Record<string, string> = {
  NewAssigned: 'Mới giao',
  Accepted: 'Đã nhận',
  InProgress: 'Đang thực hiện',
  Submitted: 'Đã nộp',
  SupplementRequired: 'Cần bổ sung',
  Completed: 'Hoàn tất',
  Rejected: 'Đã từ chối',
  Cancelled: 'Đã huỷ',
  Postponed: 'Tạm hoãn',
};

export function operatorTaskStatusLabel(status: string): string {
  return STATUS_LABEL[status] ?? 'Đang cập nhật';
}

/**
 * Nhãn ngắn để hiển thị: ưu tiên mã đã gắn với nhiệm vụ ở seed/danh sách,
 * sau đó tra theo taskId trong dữ liệu mock; chỉ khi không có mới suy từ taskId.
 * KHÔNG phải mã định danh nghiệp vụ, không gửi máy chủ.
 */
export function operatorTaskDisplayCode(taskId: string, seedCode?: string | null): string {
  const known = seedCode?.trim() || operatorTaskSeedCode(taskId);
  if (known) {
    return known;
  }
  const compact = taskId.replace(/-/g, '').toUpperCase();
  return `#HH-${compact.slice(0, 8)}`;
}

export function operatorTaskTargetBand(task: OperatorSurveyTaskV2Dto): string {
  return task.scope[0]?.targetBand ?? '—';
}

export function operatorTaskSegmentCount(task: OperatorSurveyTaskV2Dto): number {
  return task.scope.reduce((total, scope) => total + scope.segmentIds.length, 0);
}
