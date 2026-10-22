import { uuidv4 } from '../utils/uuid';

/**
 * Kho `Idempotency-Key` dùng chung cho mọi lệnh ghi (API-004/216/219, OTP...).
 *
 * Quy tắc (07_Offline-Sync-and-Crypto-Wire.md + 05_Idempotency-Concurrency-and-Errors.md):
 * - Key phải ỔN ĐỊNH trong suốt một "phiên lệnh": retry/timeout/back vẫn dùng lại đúng key đó.
 * - Key mới CHỈ được cấp khi bắt đầu một lệnh mới (không phải mỗi lần bấm nút).
 * - Dùng `getOrCreateCommandKey(scopeId)` ở thời điểm bấm: nếu scope đã có key thì trả lại key cũ.
 * - Sau khi server ACK (hoặc khi bỏ hẳn lệnh) → `clearCommandKey(scopeId)` để lần sau là lệnh mới.
 * - Lệnh cố ý chạy lại (vd. gửi lại OTP) → `newCommandKey(scopeId)`.
 */
const commandKeys = new Map<string, string>();

/** Lấy key ổn định của scope, cấp mới nếu chưa có. */
export function getOrCreateCommandKey(scopeId: string): string {
  const existing = commandKeys.get(scopeId);
  if (existing) {
    return existing;
  }
  const key = uuidv4();
  commandKeys.set(scopeId, key);
  return key;
}

/** Xem key hiện có (không cấp mới) — dùng cho log/diagnostics. */
export function peekCommandKey(scopeId: string): string | null {
  return commandKeys.get(scopeId) ?? null;
}

/** Kết thúc phiên lệnh: lần bấm sau sẽ là một command mới. */
export function clearCommandKey(scopeId: string): void {
  commandKeys.delete(scopeId);
}

/** Buộc cấp key mới cho scope (dùng cho thao tác cố ý lặp lại, vd. resend OTP). */
export function newCommandKey(scopeId: string): string {
  commandKeys.delete(scopeId);
  return getOrCreateCommandKey(scopeId);
}

/** Xoá toàn bộ (đăng xuất / reset phiên). */
export function clearAllCommandKeys(): void {
  commandKeys.clear();
}
