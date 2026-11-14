import { initDatabase, openDatabase } from '../offline/database';
import { operatorReadScope } from '../hooks/useOperatorReadScope';
import { useAuthStore } from '../store/auth';
import { apiClient } from './client';

export type OperatorUploadDraft = { recordedAt: string; timeOffset: string; videoKey: string | null; telemetryKey: string | null };
const KIND = 'OPERATOR_UPLOAD_DRAFT_V1';
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
function validate(v: OperatorUploadDraft) {
  if (!v || typeof v.recordedAt !== 'string' || v.recordedAt.length > 32 ||
      typeof v.timeOffset !== 'string' || v.timeOffset.length > 32 ||
      !(v.videoKey === null || uuid(v.videoKey)) || !(v.telemetryKey === null || uuid(v.telemetryKey))) throw Error('operator_draft_invalid');
}
/** Local editing aid only: no server receipt, authority or command payload. */
export async function openOperatorUploadDraft(taskId: string) {
  const scope = operatorReadScope(), actor = useAuthStore.getState().user?.id, environment = apiClient.defaults.baseURL;
  if (!scope || !actor || !environment || !uuid(taskId)) throw Error('operator_draft_scope_invalid');
  let invalid = false, closed = false;
  const unsubscribe = useAuthStore.subscribe(() => { if (operatorReadScope() !== scope) invalid = true; });
  const guard = () => { if (closed || invalid || operatorReadScope() !== scope) throw Error('operator_draft_session_changed'); };
  const close = () => { closed = true; unsubscribe(); };
  const id = JSON.stringify([KIND, environment, actor, taskId]);
  let db: ReturnType<typeof openDatabase>;
  try { db = openDatabase(); await initDatabase(db); guard(); } catch (error) { close(); throw error; }
  return { close,
    read: async (): Promise<(OperatorUploadDraft & {savedAt: string}) | null> => {
      guard();
      const row = await db.getFirstAsync<{payload: string}>('SELECT payload FROM local_draft WHERE id = ? AND kind = ?', id, KIND);
      guard(); if (!row) return null;
      const saved = JSON.parse(row.payload);
      if (saved.schema !== 1 || saved.actor !== actor || saved.environment !== environment || saved.taskId !== taskId ||
          typeof saved.savedAt !== 'string' || !Number.isFinite(Date.parse(saved.savedAt))) throw Error('operator_draft_invalid');
      validate(saved);
      return {recordedAt:saved.recordedAt, timeOffset:saved.timeOffset, videoKey:saved.videoKey, telemetryKey:saved.telemetryKey, savedAt:saved.savedAt};
    },
    save: async (draft: OperatorUploadDraft) => {
      guard(); validate(draft);
      const savedAt = new Date().toISOString();
      const value = {schema:1, actor, environment, taskId, recordedAt:draft.recordedAt, timeOffset:draft.timeOffset,
        videoKey:draft.videoKey, telemetryKey:draft.telemetryKey, savedAt};
      await db.runAsync('INSERT INTO local_draft (id, kind, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at', id, KIND, JSON.stringify(value), savedAt, savedAt);
      guard(); return { ...draft, savedAt };
    },
  };
}
