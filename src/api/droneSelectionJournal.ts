import { openDatabase, initDatabase } from '../offline/database';
import { useAuthStore } from '../store/auth';
import { passwordSessionIdentity } from './authApi';
import { apiClient } from './client';

export interface DroneSelection {
  droneId: string;
  serialNo: string;
}

interface SelectionRecord extends DroneSelection {
  schema: 1;
  actor: string;
  environment: string;
  session: string;
  projectId: string;
  taskId: string;
}

const KIND = 'DRONE_SELECTION';
const uuid = (value: unknown): value is string => typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) &&
  value !== '00000000-0000-0000-0000-000000000000';

function currentOwner() {
  const state = useAuthStore.getState();
  const session = passwordSessionIdentity(state.token);
  const environment = apiClient.defaults.baseURL ?? '';
  if (!session || !uuid(state.user?.id) || JSON.parse(session)[0] !== state.user.id ||
      state.user.role_code !== 'DRONE_OPERATOR' || state.user.must_change_password ||
      !['AUTHENTICATED', 'REFRESHING'].includes(state.status) || !/^https?:\/\/[^@?#\s]+$/.test(environment)) return null;
  return { actor: state.user.id, environment, session };
}

function assertSelection(value: unknown): asserts value is DroneSelection {
  if (!value || typeof value !== 'object') throw Error('drone_selection_invalid');
  const selection = value as Partial<DroneSelection>;
  if (!uuid(selection.droneId) || typeof selection.serialNo !== 'string' ||
      !selection.serialNo.trim() || selection.serialNo.length > 128) throw Error('drone_selection_invalid');
}

export async function openDroneSelectionJournal(taskId: string, projectId: string) {
  const owner = currentOwner();
  if (!owner) throw Error('drone_selection_session_invalid');
  if (!uuid(taskId) || !uuid(projectId)) throw Error('drone_selection_scope_mismatch');
  let closed = false;
  let invalidated = false;
  const unsubscribe = useAuthStore.subscribe(() => {
    const next = currentOwner();
    if (!next || JSON.stringify(next) !== JSON.stringify(owner)) invalidated = true;
  });
  const guard = () => {
    if (closed) throw Error('drone_selection_closed');
    const next = currentOwner();
    if (invalidated || !next || JSON.stringify(next) !== JSON.stringify(owner)) throw Error('drone_selection_session_changed');
  };
  const close = () => { closed = true; unsubscribe(); };
  let db: ReturnType<typeof openDatabase>;
  try {
    db = openDatabase();
    await initDatabase(db);
    guard();
  } catch (error) {
    close();
    throw error;
  }
  const prefix = 'drone-selection-v1:' + JSON.stringify([owner.environment, owner.actor, projectId, taskId]) + ':';
  const id = prefix + 'current';
  const decode = (payload: string): DroneSelection => {
    const record = JSON.parse(payload) as Partial<SelectionRecord>;
    if (record.schema !== 1 || record.actor !== owner.actor || record.environment !== owner.environment ||
        record.session !== owner.session || record.projectId !== projectId || record.taskId !== taskId) {
      throw Error('drone_selection_session_changed');
    }
    assertSelection(record);
    return { droneId: record.droneId, serialNo: record.serialNo };
  };
  return {
    close,
    read: async (): Promise<DroneSelection | null> => {
      guard();
      const rows = await db.getAllAsync<{ id: string; payload: string }>('SELECT id, payload FROM local_draft WHERE id = ? AND kind = ?', id, KIND);
      guard();
      if (!rows.length) return null;
      if (rows.length !== 1 || rows[0].id !== id) throw Error('drone_selection_identity_invalid');
      return decode(rows[0].payload);
    },
    save: async (selection: DroneSelection): Promise<DroneSelection> => {
      guard();
      assertSelection(selection);
      const record: SelectionRecord = { schema: 1, ...owner, projectId, taskId, ...selection };
      const now = new Date().toISOString();
      await db.withExclusiveTransactionAsync(async tx => {
        guard();
        await tx.runAsync('INSERT INTO local_draft (id, kind, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at', id, KIND, JSON.stringify(record), now, now);
        guard();
      });
      return { droneId: selection.droneId, serialNo: selection.serialNo };
    },
    clear: async (): Promise<void> => {
      guard();
      await db.runAsync('DELETE FROM local_draft WHERE id = ? AND kind = ?', id, KIND);
      guard();
    },
  };
}
