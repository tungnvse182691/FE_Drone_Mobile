import * as SQLite from 'expo-sqlite';
import type { SQLiteBindValue } from 'expo-sqlite';

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
  status          TEXT NOT NULL DEFAULT 'QUEUED',
  attempt         INTEGER DEFAULT 0,
  max_attempts    INTEGER DEFAULT 5,
  last_error      TEXT,
  created_at      TEXT NOT NULL
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
);`;

export async function initDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(DDL);
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