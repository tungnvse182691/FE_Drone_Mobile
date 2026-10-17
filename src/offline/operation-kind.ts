/**
 * Từ vựng CHUẨN cho `kind` của thao tác offline (row durable trong outbox).
 *
 * Nguồn sự thật: `docs/specs/03_Backend-and-Data/02_Domain-and-Data-Model.md` (CHECK canonical `FIELD_*`).
 * Đây là bộ 6 giá trị DUY NHẤT được ghi vào cột `kind` của
 * `local_draft` / `outbox` / `offline_pending` / `offline_outbox`.
 *
 * Cố ý KHÔNG chứa alias/khoá cũ. Khoá cũ (báo lỗi phát sinh, nộp kết quả sửa chữa, …)
 * được chuẩn hoá qua `normalizeOfflineOperationKind()` ở `src/types/domain.ts`
 * (module này không import gì để tránh vòng lặp phụ thuộc).
 *
 * `kind` wire gửi lên `POST /sync/batches` KHÁC bộ này — xem `toSyncWireKind()`
 * trong `src/types/domain.ts`.
 */
export const OFFLINE_OPERATION_KINDS = [
  /** FIELD_ACCEPT — tiếp nhận nhiệm vụ hiện trường. */
  'FIELD_ACCEPT',
  /** FIELD_START — bắt đầu phiên đo kiểm hiện trường. */
  'FIELD_START',
  /** FIELD_SUBMISSION — nộp kết quả đo kiểm / báo lỗi phát sinh tại hiện trường. */
  'FIELD_SUBMISSION',
  /** REPAIR_ASSESSMENT — đánh giá hạng mục sửa chữa. */
  'REPAIR_ASSESSMENT',
  /** REPAIR_EXECUTION_START — bắt đầu lượt sửa chữa. */
  'REPAIR_EXECUTION_START',
  /** REPAIR_EXECUTION_FINISH — kết thúc lượt sửa chữa (nộp kết quả). */
  'REPAIR_EXECUTION_FINISH',
] as const;

export type OfflineOperationKind = (typeof OFFLINE_OPERATION_KINDS)[number];

const OFFLINE_OPERATION_KIND_SET: ReadonlySet<string> = new Set(OFFLINE_OPERATION_KINDS);

/** `true` nếu `value` là một trong 6 `kind` canonical. */
export function isOfflineOperationKind(value: unknown): value is OfflineOperationKind {
  return typeof value === 'string' && OFFLINE_OPERATION_KIND_SET.has(value);
}
