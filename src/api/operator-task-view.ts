import type { SurveyTaskV2ResponseDto } from './droneApi';

/**
 * Lớp hiển thị cho nhiệm vụ khảo sát (O-03/O-04).
 *
 * DTO `SurveyTaskV2ResponseDto` không có mã nhiệm vụ, tên tuyến, vị trí, thiết bị bay,
 * thông số bay hay chỉ đạo của PM. Các nhãn dưới đây chỉ để HIỂN THỊ, không phải
 * định danh nghiệp vụ và không được dùng làm khoá lưu trữ/gửi máy chủ.
 */

const STATUS_LABEL: Record<string, string> = {
  NewAssigned: 'Mới giao',
  NEW_ASSIGNED: 'Mới giao',
  Reassigned: 'Được giao lại',
  REASSIGNED: 'Được giao lại',
  Accepted: 'Đã nhận',
  ACCEPTED: 'Đã nhận',
  InProgress: 'Đang thực hiện',
  IN_PROGRESS: 'Đang thực hiện',
  Submitted: 'Đã nộp',
  SUBMITTED: 'Đã nộp',
  SupplementRequired: 'Cần bổ sung',
  SUPPLEMENT_REQUIRED: 'Cần bổ sung',
  Completed: 'Hoàn tất',
  COMPLETED: 'Hoàn tất',
  Rejected: 'Đã từ chối',
  REJECTED: 'Đã từ chối',
  Cancelled: 'Đã huỷ',
  CANCELLED: 'Đã huỷ',
  Postponed: 'Tạm hoãn',
  POSTPONED: 'Tạm hoãn',
};

export function operatorTaskStatusLabel(status: string): string {
  return STATUS_LABEL[status] ?? STATUS_LABEL[status?.toUpperCase()] ?? 'Đang cập nhật';
}

/** Display only; current DTO has no server task code. Never trust a route label as authority. */
export function operatorTaskDisplayCode(taskId: string, _routeLabel?: string | null): string {
  return taskId?.slice(0, 8) || 'Chưa có mã';
}

export interface TaskWithScopeLike {
  scope: { targetBand: string; segmentIds: string[] }[];
}

export function operatorTaskTargetBand(task: TaskWithScopeLike): string {
  // Display only. Wire values remain unchanged in scope, commands and guards.
  const labels: Record<string, string> = {
    SURFACE: 'Mặt đường',
    LEFT_EDGE: 'Mép trái',
    RIGHT_EDGE: 'Mép phải',
  };
  const band = task.scope[0]?.targetBand;
  return Object.prototype.hasOwnProperty.call(labels, band) ? labels[band] : 'Chưa xác định';
}

/** Presentation prerequisite only; the journal independently revalidates before preparation. */
export function operatorTaskCanRespond(status: string): boolean {
  return status === 'NEW_ASSIGNED' || status === 'REASSIGNED';
}

export function operatorTaskSegmentCount(task: TaskWithScopeLike): number {
  return task.scope.reduce((total, scope) => total + scope.segmentIds.length, 0);
}
