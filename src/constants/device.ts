import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { uuidv4 } from '../utils/uuid';

/**
 * `deviceId` bắt buộc trong `SyncBatch` (openapi.baseline.yaml#/components/schemas/SyncBatch).
 * Ứng dụng không đăng nhập được nên không suy ra được deviceId từ token;
 * dùng một UUID ổn định theo từng lần cài đặt, lưu trong `kv_store`.
 *
 * LƯU Ý: KHÔNG dùng `expo-constants` `deviceId` — bản 57 không export trường này
 * (vendor ID của iOS cũng không ổn định giữa các lần cài lại app).
 */

const STORAGE_KEY = 'roadguard.device-id';

let cachedDeviceId: string | null = null;
let db: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase | null {
  if (!db && Platform.OS !== 'web') {
    try {
      db = SQLite.openDatabaseSync('roadguard.db');
      db.execSync('CREATE TABLE IF NOT EXISTS kv_store (key TEXT PRIMARY KEY, value TEXT);');
    } catch {
      db = null;
    }
  }
  return db;
}

function readStored(): string | null {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem(STORAGE_KEY);
  }
  const database = getDb();
  if (!database) {
    return null;
  }
  try {
    const row = database.getFirstSync<{ value: string }>(
      'SELECT value FROM kv_store WHERE key = ?',
      [STORAGE_KEY],
    );
    return row ? row.value : null;
  } catch {
    return null;
  }
}

function persist(value: string): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY, value);
    return;
  }
  const database = getDb();
  if (!database) {
    return;
  }
  try {
    database.runSync('INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)', [
      STORAGE_KEY,
      value,
    ]);
  } catch {
    // Mất cache không được phép làm sập luồng đồng bộ: giá trị vẫn dùng được trong phiên này.
  }
}

/** Trả về `deviceId` ổn định của lần cài đặt này. */
export function getDeviceId(): string {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  const stored = readStored();
  if (stored) {
    cachedDeviceId = stored;
    return stored;
  }

  const generated = uuidv4();
  persist(generated);
  cachedDeviceId = generated;
  return generated;
}