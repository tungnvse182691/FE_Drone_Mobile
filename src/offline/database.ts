import * as SQLite from 'expo-sqlite';
import type { SQLiteBindValue } from 'expo-sqlite';
import type { FastTrackPolicyVersion, RepairWorkOrder } from '../types/domain';

const DB_NAME = 'roadguard.db';

export function openDatabase(): SQLite.SQLiteDatabase {
  return SQLite.openDatabaseSync(DB_NAME);
}

const DDL = `
CREATE TABLE IF NOT EXISTS local_draft (
  id            TEXT PRIMARY KEY,
  kind          TEXT NOT NULL,
  payload       TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS outbox (
  id              TEXT PRIMARY KEY,
  kind            TEXT NOT NULL,
  data_b64        TEXT NOT NULL,
  checksum_sha256 TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'READY',
  attempt         INTEGER DEFAULT 0,
  max_attempts    INTEGER DEFAULT 5,
  last_error      TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS media_file (
  id                    TEXT PRIMARY KEY,
  uri_local             TEXT NOT NULL,
  kind                  TEXT NOT NULL,
  size_bytes            INTEGER NOT NULL,
  checksum_sha256       TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'LOCAL',
  survey_data_version_id TEXT,
  defect_id             TEXT,
  repair_item_id        TEXT,
  work_order_id         TEXT,
  captured_at           TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS survey_cache (
  id              TEXT PRIMARY KEY,
  data            TEXT NOT NULL,
  cached_at       TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS defect_cache (
  id              TEXT PRIMARY KEY,
  data            TEXT NOT NULL,
  cached_at       TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS task_cache (
  id              TEXT PRIMARY KEY,
  kind            TEXT NOT NULL,
  data            TEXT NOT NULL,
  cached_at       TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sync_partitions (
  partition_id     TEXT PRIMARY KEY,
  account_id       TEXT NOT NULL,
  role_code        TEXT NOT NULL,
  lease_owner      TEXT,
  lease_expires_at TEXT,
  last_sync_at     TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS offline_pending (
  id           TEXT PRIMARY KEY,
  partition_id TEXT NOT NULL,
  kind         TEXT NOT NULL,
  payload      TEXT NOT NULL,
  local_state  TEXT NOT NULL DEFAULT 'DRAFT',
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_offline_pending_partition
  ON offline_pending (partition_id, local_state, created_at ASC);
CREATE TABLE IF NOT EXISTS offline_outbox (
  id              TEXT PRIMARY KEY,
  partition_id    TEXT NOT NULL,
  kind            TEXT NOT NULL,
  payload_b64     TEXT NOT NULL,
  checksum_sha256 TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  task_id         TEXT,
  expected_version TEXT,
  local_state     TEXT NOT NULL DEFAULT 'READY',
  attempt         INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT,
  last_error      TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_offline_outbox_dispatch
  ON offline_outbox (partition_id, local_state, next_attempt_at ASC, created_at ASC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_offline_outbox_idempotency
  ON offline_outbox (idempotency_key);
CREATE TABLE IF NOT EXISTS media_assets (
  id              TEXT PRIMARY KEY,
  partition_id    TEXT NOT NULL,
  uri_local       TEXT NOT NULL,
  kind            TEXT NOT NULL,
  size_bytes      INTEGER NOT NULL,
  bytes_uploaded  INTEGER NOT NULL DEFAULT 0,
  checksum_sha256 TEXT NOT NULL,
  media_state     TEXT NOT NULL DEFAULT 'LOCAL_SAVING',
  session_id      TEXT,
  captured_at     TEXT NOT NULL,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_media_assets_state
  ON media_assets (partition_id, media_state);
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key             TEXT PRIMARY KEY,
  operation_id    TEXT NOT NULL,
  request_hash    TEXT NOT NULL,
  response_status INTEGER,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS wire_command (
  operation_id     TEXT PRIMARY KEY,
  partition_id     TEXT NOT NULL,
  envelope_key     TEXT NOT NULL,
  kind             TEXT NOT NULL,
  task_id          TEXT,
  expected_version TEXT,
  request_json     TEXT NOT NULL,
  local_state      TEXT NOT NULL DEFAULT 'READY',
  resource_id      TEXT,
  resource_version TEXT,
  error_code       TEXT,
  error_message    TEXT,
  trace_id         TEXT,
  acked_at         TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_wire_command_partition
  ON wire_command (partition_id, local_state, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_wire_command_envelope
  ON wire_command (envelope_key);`;

/**
 * Migrations idempotent cho các cột bổ sung sau.
 * `CREATE TABLE IF NOT EXISTS` KHÔNG thêm cột vào bảng đã tồn tại trên thiết bị,
 * nên phải ALTER riêng. Dùng PRAGMA table_info để bỏ qua nếu cột đã có.
 */
const COLUMN_MIGRATIONS: Array<{ table: string; column: string; definition: string }> = [
  { table: 'offline_outbox', column: 'task_id', definition: 'TEXT' },
  { table: 'offline_outbox', column: 'expected_version', definition: 'TEXT' },
];

export async function initDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(DDL);
  for (const migration of COLUMN_MIGRATIONS) {
    const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${migration.table})`);
    const exists = columns.some((column) => column.name === migration.column);
    if (!exists) {
      await db.execAsync(
        `ALTER TABLE ${migration.table} ADD COLUMN ${migration.column} ${migration.definition}`,
      );
    }
  }
}

export async function insertBatch(
  db: SQLite.SQLiteDatabase,
  tableName: string,
  items: Array<Record<string, unknown>>,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const item of items) {
      const keys = Object.keys(item);
      const columns = keys.join(', ');
      const placeholders = keys.map(() => '?').join(', ');
      const values = keys.map((k) => item[k] as unknown as SQLiteBindValue);
      await db.runAsync(`INSERT OR REPLACE INTO ${tableName} (${columns}) VALUES (${placeholders})`, ...values);
    }
  });
}

export async function upsertOffline(
  db: SQLite.SQLiteDatabase,
  tableName: string,
  id: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const keys = Object.keys(payload);
  const columns = ['id', ...keys].join(', ');
  const placeholders = ['?', ...keys.map(() => '?')].join(', ');
  const values = [id, ...keys.map((k) => payload[k] as unknown as SQLiteBindValue)];
  await db.runAsync(`INSERT OR REPLACE INTO ${tableName} (${columns}) VALUES (${placeholders})`, ...values);
}

export async function markSynced(
  db: SQLite.SQLiteDatabase,
  tableName: string,
  id: string,
): Promise<void> {
  await db.runAsync(`UPDATE ${tableName} SET status = 'SERVER_CONFIRMED' WHERE id = ?`, id);
}

// =========================================================================
// FAST TRACK POLICY CACHE HELPERS (US-33, BR-05, BR-08)
// =========================================================================

export async function cachePolicy(
  db: SQLite.SQLiteDatabase,
  policy: FastTrackPolicyVersion,
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO task_cache (id, kind, data, cached_at) VALUES (?, 'policy', ?, ?)`,
    policy.id,
    JSON.stringify(policy),
    now,
  );
}

export async function getCachedPolicy(
  db: SQLite.SQLiteDatabase,
): Promise<FastTrackPolicyVersion | null> {
  const row = await db.getFirstAsync<{ data: string }>(
    `SELECT data FROM task_cache WHERE kind = 'policy' ORDER BY cached_at DESC LIMIT 1`,
  );
  if (!row) return null;
  try {
    return JSON.parse(row.data) as FastTrackPolicyVersion;
  } catch {
    return null;
  }
}

// =========================================================================
// WORK ORDER CACHE HELPERS (CREW OFFLINE TASKS)
// =========================================================================

export async function cacheWorkOrders(
  db: SQLite.SQLiteDatabase,
  orders: RepairWorkOrder[],
): Promise<void> {
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (const order of orders) {
      await db.runAsync(
        `INSERT OR REPLACE INTO task_cache (id, kind, data, cached_at) VALUES (?, 'work_order', ?, ?)`,
        order.id,
        JSON.stringify(order),
        now,
      );
    }
  });
}

export async function getCachedWorkOrders(
  db: SQLite.SQLiteDatabase,
): Promise<RepairWorkOrder[]> {
  const rows = await db.getAllAsync<{ data: string }>(
    `SELECT data FROM task_cache WHERE kind = 'work_order' ORDER BY cached_at DESC`,
  );
  return rows.map((r) => {
    try {
      return JSON.parse(r.data) as RepairWorkOrder;
    } catch {
      return null;
    }
  }).filter((item): item is RepairWorkOrder => item !== null);
}

// =========================================================================
// LOCAL DRAFT HELPERS (BẢN NHÁP CỤC BỘ)
// =========================================================================

export async function saveDraft(
  db: SQLite.SQLiteDatabase,
  id: string,
  kind: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO local_draft (id, kind, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
    id,
    kind,
    JSON.stringify(payload),
    now,
    now,
  );
}

export async function getDraft<T = Record<string, unknown>>(
  db: SQLite.SQLiteDatabase,
  id: string,
): Promise<T | null> {
  const row = await db.getFirstAsync<{ payload: string }>(
    `SELECT payload FROM local_draft WHERE id = ?`,
    id,
  );
  if (!row) return null;
  try {
    return JSON.parse(row.payload) as T;
  } catch {
    return null;
  }
}

export async function getDraftsByKind<T = Record<string, unknown>>(
  db: SQLite.SQLiteDatabase,
  kind: string,
): Promise<Array<{ id: string; payload: T; created_at: string; updated_at: string }>> {
  const rows = await db.getAllAsync<{ id: string; payload: string; created_at: string; updated_at: string }>(
    `SELECT id, payload, created_at, updated_at FROM local_draft WHERE kind = ? ORDER BY updated_at DESC`,
    kind,
  );
  return rows.map((r) => ({
    id: r.id,
    payload: JSON.parse(r.payload) as T,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export async function deleteDraft(
  db: SQLite.SQLiteDatabase,
  id: string,
): Promise<void> {
  await db.runAsync(`DELETE FROM local_draft WHERE id = ?`, id);
}

// =========================================================================
// MEDIA FILE HELPERS (ẢNH PHẢN ÁNH & ẢNH AFTER FAST TRACK)
// =========================================================================

export async function saveMediaFile(
  db: SQLite.SQLiteDatabase,
  media: {
    id: string;
    uri_local: string;
    kind: string; // 'reporter_photo' | 'after_photo' | 'before_photo' | 'video' | 'srt'
    size_bytes: number;
    checksum_sha256: string;
    status?: string;
    survey_data_version_id?: string;
    defect_id?: string;
    repair_item_id?: string;
    work_order_id?: string;
    captured_at?: string;
  },
): Promise<void> {
  const now = media.captured_at ?? new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO media_file (
      id, uri_local, kind, size_bytes, checksum_sha256, status,
      survey_data_version_id, defect_id, repair_item_id, work_order_id, captured_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    media.id,
    media.uri_local,
    media.kind,
    media.size_bytes,
    media.checksum_sha256,
    media.status ?? 'LOCAL',
    media.survey_data_version_id ?? null,
    media.defect_id ?? null,
    media.repair_item_id ?? null,
    media.work_order_id ?? null,
    now,
  );
}