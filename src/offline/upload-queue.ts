import * as SQLite from 'expo-sqlite';
import { generateChecksum } from './checksum';
import { LocalState } from '../types/enums';

export interface OutboxItem {
  id: string;
  kind: string; // 'reporter_report' | 'fast_track_completion' | 'survey_upload' | 'measurement' | 'repair_evidence'
  data_b64: string;
  checksum_sha256: string;
  status: string; // DRAFT | WAITING_DEPENDENCIES | READY | IN_FLIGHT | ACKED | QUEUED | UPLOADING | SERVER_CONFIRMED | INVALID | REJECTED
  attempt: number;
  max_attempts: number;
  last_error: string | null;
  created_at: string;
  updated_at?: string;
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Đẩy payload dạng chuỗi vào outbox queue (tương thích backward)
 */
export async function enqueue(
  db: SQLite.SQLiteDatabase,
  kind: string,
  payload: string,
  initialStatus: string = LocalState.READY,
): Promise<string> {
  const id = generateId();
  const checksum = await generateChecksum(payload);
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO outbox (id, kind, data_b64, checksum_sha256, status, attempt, max_attempts, last_error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 0, 5, NULL, ?, ?)`,
    id,
    kind,
    btoa(unescape(encodeURIComponent(payload))),
    checksum,
    initialStatus,
    now,
    now,
  );
  return id;
}

/**
 * Đẩy payload JSON (cho 'reporter_report', 'fast_track_completion', 'survey_upload')
 */
export async function enqueuePayload(
  db: SQLite.SQLiteDatabase,
  kind: 'reporter_report' | 'fast_track_completion' | 'survey_upload' | string,
  payload: Record<string, unknown>,
  initialStatus: string = LocalState.READY,
): Promise<string> {
  const jsonStr = JSON.stringify(payload);
  return enqueue(db, kind, jsonStr, initialStatus);
}

/**
 * Lấy phần tử tiếp theo sẵn sàng gửi (READY hoặc QUEUED)
 * Chuyển trạng thái sang IN_FLIGHT
 */
export async function dequeue(
  db: SQLite.SQLiteDatabase,
): Promise<OutboxItem | null> {
  const rows = await db.getAllAsync<OutboxItem>(
    `SELECT * FROM outbox WHERE status IN ('READY', 'QUEUED') ORDER BY created_at ASC LIMIT 1`,
  );
  if (rows.length === 0) {
    return null;
  }
  const item = rows[0];
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE outbox SET status = ?, updated_at = ? WHERE id = ?`,
    LocalState.IN_FLIGHT,
    now,
    item.id,
  );
  return { ...item, status: LocalState.IN_FLIGHT };
}

/**
 * Cập nhật trạng thái item trong Outbox
 */
export async function updateOutboxState(
  db: SQLite.SQLiteDatabase,
  id: string,
  newStatus: string,
  lastError: string | null = null,
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE outbox SET status = ?, last_error = ?, updated_at = ? WHERE id = ?`,
    newStatus,
    lastError,
    now,
    id,
  );
}

/**
 * Tiến trình đồng bộ hàng đợi Outbox với backoff & retry
 */
export async function processQueue(
  db: SQLite.SQLiteDatabase,
  uploader: (item: OutboxItem) => Promise<void>,
): Promise<void> {
  let item = await dequeue(db);
  while (item) {
    try {
      await uploader(item);
      // Chuyển sang ACKED (hoặc SERVER_CONFIRMED)
      await updateOutboxState(db, item.id, LocalState.ACKED, null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const nextAttempt = item.attempt + 1;
      const newStatus = nextAttempt >= item.max_attempts ? LocalState.REJECTED : LocalState.PAUSED_RETRY;
      const now = new Date().toISOString();
      await db.runAsync(
        `UPDATE outbox SET status = ?, attempt = ?, last_error = ?, updated_at = ? WHERE id = ?`,
        newStatus,
        nextAttempt,
        message,
        now,
        item.id,
      );
    }
    item = await dequeue(db);
  }
}

/**
 * Đặt lại trạng thái để thử lại gửi (Reset retry)
 */
export async function retry(
  db: SQLite.SQLiteDatabase,
  itemId: string,
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE outbox SET status = ?, attempt = 0, last_error = NULL, updated_at = ? WHERE id = ?`,
    LocalState.READY,
    now,
    itemId,
  );
}