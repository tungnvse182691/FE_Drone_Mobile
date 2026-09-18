import * as SQLite from 'expo-sqlite';
import { generateChecksum } from './checksum';

interface OutboxItem {
  id: string;
  kind: string;
  data_b64: string;
  checksum_sha256: string;
  status: string;
  attempt: number;
  max_attempts: number;
  last_error: string | null;
  created_at: string;
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function enqueue(
  db: SQLite.SQLiteDatabase,
  kind: string,
  payload: string,
): Promise<string> {
  const id = generateId();
  const checksum = await generateChecksum(payload);
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO outbox (id, kind, data_b64, checksum_sha256, status, attempt, max_attempts, last_error, created_at)
     VALUES (?, ?, ?, ?, 'QUEUED', 0, 5, NULL, ?)`,
    id,
    kind,
    btoa(payload),
    checksum,
    now,
  );
  return id;
}

export async function dequeue(
  db: SQLite.SQLiteDatabase,
): Promise<OutboxItem | null> {
  const rows = await db.getAllAsync<OutboxItem>(
    `SELECT * FROM outbox WHERE status = 'QUEUED' ORDER BY created_at ASC LIMIT 1`,
  );
  if (rows.length === 0) {
    return null;
  }
  const item = rows[0];
  await db.runAsync(
    `UPDATE outbox SET status = 'UPLOADING' WHERE id = ?`,
    item.id,
  );
  return { ...item, status: 'UPLOADING' };
}

export async function processQueue(
  db: SQLite.SQLiteDatabase,
  uploader: (item: OutboxItem) => Promise<void>,
): Promise<void> {
  let item = await dequeue(db);
  while (item) {
    try {
      await uploader(item);
      await db.runAsync(
        `UPDATE outbox SET status = 'SERVER_CONFIRMED' WHERE id = ?`,
        item.id,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const nextAttempt = item.attempt + 1;
      const newStatus = nextAttempt >= item.max_attempts ? 'INVALID' : 'QUEUED';
      await db.runAsync(
        `UPDATE outbox SET status = ?, attempt = ?, last_error = ? WHERE id = ?`,
        newStatus,
        nextAttempt,
        message,
        item.id,
      );
    }
    item = await dequeue(db);
  }
}

export async function retry(
  db: SQLite.SQLiteDatabase,
  itemId: string,
): Promise<void> {
  await db.runAsync(
    `UPDATE outbox SET status = 'QUEUED', attempt = 0, last_error = NULL WHERE id = ?`,
    itemId,
  );
}