import { Platform } from 'react-native';
import { StateStorage, createJSONStorage } from 'zustand/middleware';
import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;
const memoryStore = new Map<string, string>();

function getDb(): SQLite.SQLiteDatabase | null {
  if (!db && Platform.OS !== 'web') {
    try {
      db = SQLite.openDatabaseSync('roadguard.db');
      db.execSync('CREATE TABLE IF NOT EXISTS kv_store (key TEXT PRIMARY KEY, value TEXT);');
    } catch (e) {
      console.warn('Could not open SQLite for Zustand storage, using memory fallback', e);
    }
  }
  return db;
}

export const appStateStorage: StateStorage = {
  getItem: (key: string): string | null => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    const database = getDb();
    if (database) {
      try {
        const row = database.getFirstSync<{ value: string }>('SELECT value FROM kv_store WHERE key = ?', [key]);
        return row ? row.value : null;
      } catch {
        return memoryStore.get(key) ?? null;
      }
    }
    return memoryStore.get(key) ?? null;
  },
  setItem: (key: string, value: string): void => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
    memoryStore.set(key, value);
    const database = getDb();
    if (database) {
      try {
        database.runSync('INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)', [key, value]);
      } catch {
        // ignore
      }
    }
  },
  removeItem: (key: string): void => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
    memoryStore.delete(key);
    const database = getDb();
    if (database) {
      try {
        database.runSync('DELETE FROM kv_store WHERE key = ?', [key]);
      } catch {
        // ignore
      }
    }
  },
};

export const appStorage = createJSONStorage(() => appStateStorage);
