import * as SQLite from 'expo-sqlite';
import { generateChecksum } from './checksum';
import { LocalState } from '../types/enums';
import { uuidv4 } from '../utils/uuid';
import { decodeBase64Utf8, encodeBase64Utf8 } from '../utils/base64';
import type { OutboxItem } from '../types/domain';

export type { OutboxItem };

const MAX_ATTEMPTS = 5;
const BASE_RETRY_MS = 2000;
const MAX_RETRY_MS = 300000;

let activePartitionId = 'local';

export function setActivePartition(partitionId: string): void {
  activePartitionId = partitionId;
}

export function getActivePartition(): string {
  return activePartitionId;
}

export interface OutboxEnqueueOptions {
  partitionId?: string;
  initialStatus?: string;
  taskId?: string | null;
  expectedVersion?: string | null;
  idempotencyKey?: string;
}

export interface OperationReceipt {
  operationId: string;
  localState: string;
  resourceId?: string | null;
  resourceVersion?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  traceId?: string | null;
}

export type OperationUploader = (item: OutboxItem) => Promise<OperationReceipt[] | void>;

const ACKED_STATES: string[] = [LocalState.ACKED];

export function decodeOutboxPayload(item: OutboxItem): string {
  return decodeBase64Utf8(item.data_b64);
}

function computeBackoffMs(attempt: number): number {
  return Math.min(BASE_RETRY_MS * 2 ** Math.max(0, attempt - 1), MAX_RETRY_MS);
}

export async function enqueue(
  db: SQLite.SQLiteDatabase,
  kind: string,
  payload: string,
  options: OutboxEnqueueOptions = {},
): Promise<string> {
  const id = uuidv4();
  const checksum = await generateChecksum(payload);
  const now = new Date().toISOString();
  const partitionId = options.partitionId ?? activePartitionId;
  const idempotencyKey = options.idempotencyKey ?? uuidv4();

  await db.runAsync(
    `INSERT INTO offline_outbox (
       id, partition_id, kind, payload_b64, checksum_sha256, idempotency_key,
       task_id, expected_version,
       local_state, attempt, next_attempt_at, last_error, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, ?, ?)`,
    id,
    partitionId,
    kind,
    encodeBase64Utf8(payload),
    checksum,
    idempotencyKey,
    options.taskId ?? null,
    options.expectedVersion ?? null,
    options.initialStatus ?? LocalState.READY,
    now,
    now,
  );

  await db.runAsync(
    `INSERT OR REPLACE INTO idempotency_keys (key, operation_id, request_hash, response_status, created_at, updated_at)
     VALUES (?, ?, ?, NULL, ?, ?)`,
    idempotencyKey,
    id,
    checksum,
    now,
    now,
  );

  return id;
}

export async function enqueuePayload(
  db: SQLite.SQLiteDatabase,
  kind: string,
  payload: Record<string, unknown>,
  options: OutboxEnqueueOptions = {},
): Promise<string> {
  return enqueue(db, kind, JSON.stringify(payload), options);
}

export async function dequeue(db: SQLite.SQLiteDatabase): Promise<OutboxItem | null> {
  const now = new Date().toISOString();
  // Chỉ lấy mục của partition đang hoạt động — không đụng partition của tài khoản khác.
  const partitionId = getActivePartition();
  const rows = await db.getAllAsync<OutboxItem>(
    `SELECT id, kind, payload_b64 AS data_b64, checksum_sha256, local_state AS status,
            attempt, 'local' AS max_attempts, last_error, created_at, updated_at,
            partition_id, task_id, expected_version
       FROM offline_outbox
      WHERE local_state IN (?, ?)
        AND partition_id = ?
        AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
      ORDER BY created_at ASC
      LIMIT 1`,
    LocalState.READY,
    LocalState.PAUSED_RETRY,
    partitionId,
    now,
  );
  if (rows.length === 0) {
    return null;
  }

  const item = rows[0];
  await db.runAsync(
    `UPDATE offline_outbox SET local_state = ?, updated_at = ? WHERE id = ? AND partition_id = ?`,
    LocalState.IN_FLIGHT,
    now,
    item.id,
    partitionId,
  );
  return { ...item, status: LocalState.IN_FLIGHT, max_attempts: MAX_ATTEMPTS };
}

export async function updateOutboxState(
  db: SQLite.SQLiteDatabase,
  id: string,
  newStatus: string,
  lastError: string | null = null,
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE offline_outbox SET local_state = ?, last_error = ?, updated_at = ? WHERE id = ?`,
    newStatus,
    lastError,
    now,
    id,
  );
}

async function recordReceipt(
  db: SQLite.SQLiteDatabase,
  item: OutboxItem,
  receipt: OperationReceipt,
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO wire_command (
       operation_id, partition_id, envelope_key, kind, task_id, expected_version,
       request_json, local_state, resource_id, resource_version,
       error_code, error_message, trace_id, acked_at, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    receipt.operationId,
    // Phải lấy partition của chính item, không dùng partition active toàn cục.
    item.partition_id ?? activePartitionId,
    item.id,
    item.kind,
    item.task_id ?? null,
    item.expected_version ?? null,
    decodeOutboxPayload(item),
    receipt.localState,
    receipt.resourceId ?? null,
    receipt.resourceVersion ?? null,
    receipt.errorCode ?? null,
    receipt.errorMessage ?? null,
    receipt.traceId ?? null,
    ACKED_STATES.includes(receipt.localState) ? now : null,
    now,
    now,
  );
}

export async function getReceipts(
  db: SQLite.SQLiteDatabase,
  envelopeKey: string,
): Promise<OperationReceipt[]> {
  const rows = await db.getAllAsync<{
    operation_id: string;
    local_state: string;
    resource_id: string | null;
    resource_version: string | null;
    error_code: string | null;
    error_message: string | null;
    trace_id: string | null;
  }>(
    `SELECT operation_id, local_state, resource_id, resource_version, error_code, error_message, trace_id
       FROM wire_command WHERE envelope_key = ?`,
    envelopeKey,
  );
  return rows.map((row) => ({
    operationId: row.operation_id,
    localState: row.local_state,
    resourceId: row.resource_id,
    resourceVersion: row.resource_version,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    traceId: row.trace_id,
  }));
}

export async function processQueue(
  db: SQLite.SQLiteDatabase,
  uploader: OperationUploader,
): Promise<void> {
  let item = await dequeue(db);
  while (item) {
    try {
      const receipts = await uploader(item);

      if (!receipts || receipts.length === 0) {
        // Contract `SyncResult` bắt buộc trả `results` cho từng operation.
        // Không có receipt = chưa biết kết quả bền vững, TUYỆT ĐỐI không ACK.
        // Giữ UNKNOWN_OUTCOME để operator đối soát thủ công thay vì mất dữ liệu âm thầm.
        await db.runAsync(
          `UPDATE offline_outbox
              SET local_state = ?, last_error = ?, updated_at = ?
            WHERE id = ?`,
          LocalState.UNKNOWN_OUTCOME,
          'Server không trả receipt cho operation; chưa ACK để an toàn dữ liệu.',
          new Date().toISOString(),
          item.id,
        );
      } else {
        for (const receipt of receipts) {
          await recordReceipt(db, item, receipt);
        }

        const acked = receipts.every((r) => ACKED_STATES.includes(r.localState));
        const conflicted = receipts.some((r) => r.localState === LocalState.CONFLICT);
        const rejected = receipts.some((r) => r.localState === LocalState.REJECTED);

        if (acked) {
          await updateOutboxState(db, item.id, LocalState.ACKED, null);
        } else if (conflicted) {
          await updateOutboxState(
            db,
            item.id,
            LocalState.CONFLICT,
            'Có operation xung đột: cần PM ra quyết định.',
          );
        } else if (rejected) {
          await updateOutboxState(db, item.id, LocalState.REJECTED, 'Server từ chối operation.');
        } else {
          await markRetry(db, item);
        }
      }
    } catch (error) {
      await markRetry(db, item, error);
    }
    item = await dequeue(db);
  }
}

async function markRetry(db: SQLite.SQLiteDatabase, item: OutboxItem, cause?: unknown): Promise<void> {
  const message = cause instanceof Error ? cause.message : cause ? String(cause) : 'Retry theo backoff.';
  const nextAttempt = item.attempt + 1;
  const exhausted = nextAttempt >= MAX_ATTEMPTS;
  const now = new Date().toISOString();
  const nextAttemptAt = exhausted
    ? null
    : new Date(Date.now() + computeBackoffMs(nextAttempt)).toISOString();

  await db.runAsync(
    `UPDATE offline_outbox
        SET local_state = ?, attempt = ?, next_attempt_at = ?, last_error = ?, updated_at = ?
      WHERE id = ?`,
    exhausted ? LocalState.REJECTED : LocalState.PAUSED_RETRY,
    nextAttempt,
    nextAttemptAt,
    message,
    now,
    item.id,
  );
}

export async function retry(db: SQLite.SQLiteDatabase, itemId: string): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE offline_outbox
        SET local_state = ?, attempt = 0, next_attempt_at = NULL, last_error = NULL, updated_at = ?
      WHERE id = ?`,
    LocalState.READY,
    now,
    itemId,
  );
}

export async function recoverInFlight(
  db: SQLite.SQLiteDatabase,
  partitionId: string = activePartitionId,
): Promise<number> {
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `UPDATE offline_outbox SET local_state = ?, updated_at = ?
      WHERE partition_id = ? AND local_state = ?`,
    LocalState.UNKNOWN_OUTCOME,
    now,
    partitionId,
    LocalState.IN_FLIGHT,
  );
  return result.changes ?? 0;
}

export async function countByState(
  db: SQLite.SQLiteDatabase,
  partitionId: string = activePartitionId,
): Promise<Record<string, number>> {
  const rows = await db.getAllAsync<{ local_state: string; total: number }>(
    `SELECT local_state, COUNT(*) AS total FROM offline_outbox WHERE partition_id = ? GROUP BY local_state`,
    partitionId,
  );
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.local_state] = row.total;
    return acc;
  }, {});
}