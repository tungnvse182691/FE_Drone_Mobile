import { initDatabase, openDatabase } from '../offline/database';
import { operatorReadScope } from '../hooks/useOperatorReadScope';
import { useAuthStore } from '../store/auth';

const KIND = 'operator_read_v1';
/** Read snapshots only. Never use these results in command preparation or dispatch. */
export async function readOperatorSnapshot<T extends object>(resource: string, read: () => Promise<T>): Promise<T & {cachedAt: string | null}> {
  const scope = operatorReadScope();
  if (!scope) throw Error('operator_cache_session_invalid');
  const key = JSON.stringify([KIND, scope, resource]);
  const guard = () => { if (operatorReadScope() !== scope) throw Error('operator_cache_session_changed'); };
  // Observe account bounce even when the original account is restored during a read.
  let invalid = false;
  const unsubscribe = useAuthStore.subscribe(() => { if (operatorReadScope() !== scope) invalid = true; });
  const check = () => { guard(); if (invalid) throw Error('operator_cache_session_changed'); };
  const database = async () => { const db = openDatabase(); await initDatabase(db); check(); return db; };
  try {
    let result: T;
    try { result = await read(); check(); }
    catch (error) {
      check();
      const e = error as {response?: {status?: number}; request?: unknown; code?: string};
      if (e.response) {
        if ([401,403,404].includes(e.response.status ?? 0)) {
          try { const db = await database(); await db.runAsync('DELETE FROM task_cache WHERE id = ? AND kind = ?', key, KIND); } catch { /* No fallback after denial, even if storage fails. */ }
        }
        throw error;
      }
      // Only a transport failure can fall back; programming/validation errors cannot.
      if (!e.request && !['ERR_NETWORK','ECONNABORTED','ETIMEDOUT'].includes(e.code ?? '')) throw error;
      try {
        const db = await database();
        const row = await db.getFirstAsync<{data: string; cached_at: string}>('SELECT data, cached_at FROM task_cache WHERE id = ? AND kind = ?', key, KIND);
        check();
        if (!row || !Number.isFinite(Date.parse(row.cached_at))) throw error;
        const saved = JSON.parse(row.data);
        if (saved.schema !== 1 || saved.scope !== scope || saved.resource !== resource || !saved.value || typeof saved.value !== 'object') throw error;
        // Cached ETags cannot authorize a mutation.
        return {...saved.value, etag: null, cachedAt: row.cached_at};
      } catch { check(); throw error; }
    }
    try {
      const db = await database();
      await db.runAsync('INSERT OR REPLACE INTO task_cache (id, kind, data, cached_at) VALUES (?, ?, ?, ?)',
        key, KIND, JSON.stringify({schema:1, scope, resource, value:result}), new Date().toISOString());
    } catch { /* Cache failure must not conceal a successful authorized GET. */ }
    check();
    return {...result, cachedAt: null};
  } finally { unsubscribe(); }
}

export function operatorCachedNotice(cachedAt: string | null): string | null {
  return cachedAt ? `Bản lưu trên máy · Đã tải lúc ${new Date(cachedAt).toLocaleString('vi-VN')}. Kết nối lại để cập nhật phân công.` : null;
}
