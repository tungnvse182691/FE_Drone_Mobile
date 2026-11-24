import { openDatabase } from './database';

/** Borrow the same owned connection as journals. Storage failure is not an empty database. */
function access<T>(operation: (db: ReturnType<typeof openDatabase>) => T): T {
  try {
    const db = openDatabase();
    db.execSync('CREATE TABLE IF NOT EXISTS kv_store (key TEXT PRIMARY KEY, value TEXT);');
    return operation(db);
  } catch {
    // Do not expose SQL, keys or persisted values in diagnostics.
    throw new Error('LOCAL_STORAGE_UNAVAILABLE');
  }
}

export function readLocalValue(key: string): string | null {
  return access(db => db.getFirstSync<{ value: string }>(
    'SELECT value FROM kv_store WHERE key = ?', [key],
  )?.value ?? null);
}

export function writeLocalValue(key: string, value: string): void {
  access(db => db.runSync('INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)', [key, value]));
}

export function removeLocalValue(key: string): void {
  access(db => db.runSync('DELETE FROM kv_store WHERE key = ?', [key]));
}
