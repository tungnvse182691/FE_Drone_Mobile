import { randomUUID } from 'expo-crypto';
import { openDatabase, initDatabase } from '../offline/database';
import { useAuthStore } from '../store/auth';
import { passwordSessionIdentity } from './authApi';
import { apiClient } from './client';
import { getOperatorSurveyTaskDetailReal, type SurveyTaskV2ResponseDto } from './droneApi';

type Operation = 'accept' | 'decline';
type Command = { schema: 1; environment: string; actor: string; session: string; taskId: string; projectId: string;
  key: string; operation: Operation; version: string; payload: Record<string, string>; source: SurveyTaskV2ResponseDto };
type Outcome = { phase: 'PREPARED' | 'UNKNOWN_OUTCOME' | 'RECEIPT'; receipt?: { data: SurveyTaskV2ResponseDto; etag: string } };
const KIND = 'DRONE_TASK_COMMAND', STATE = 'DRONE_TASK_OUTCOME';
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) && v !== '00000000-0000-0000-0000-000000000000';
const version = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9+/]{10}[AEIMQUYcgkosw048]=$/.test(v);
function identity() {
  const s = useAuthStore.getState(), session = passwordSessionIdentity(s.token);
  const environment = apiClient.defaults.baseURL ?? '';
  if (!session || !uuid(s.user?.id) || JSON.parse(session)[0] !== s.user.id || s.user.role_code !== 'DRONE_OPERATOR' ||
    s.user.must_change_password || !['AUTHENTICATED','REFRESHING'].includes(s.status) || !/^https?:\/\/[^@?#\s]+$/.test(environment)) return null;
  return { actor: s.user.id, session, environment };
}
function validateTask(task: SurveyTaskV2ResponseDto, actor: string, taskId: string) {
  if (!task || task.id !== taskId || task.operatorId !== actor || !uuid(task.projectId) || !version(task.version) ||
    !Array.isArray(task.scope) || !task.scope.length || task.scope.some(s => !uuid(s.routeVersionId) || !uuid(s.segmentSetId) ||
      !['SURFACE','LEFT_EDGE','RIGHT_EDGE'].includes(s.targetBand) || !Array.isArray(s.segmentIds) || !s.segmentIds.length || !s.segmentIds.every(uuid))) throw Error('drone_task_source_invalid');
}
/** Separate immutable command and outcome rows. No background dispatch or deletion. */
export async function openDroneTaskJournal(taskId: string) {
  const owner = identity();
  if (!owner || !uuid(taskId)) throw Error('drone_session_invalid');
  let closed = false, invalidated = false, busy = false;
  const unsubscribe = useAuthStore.subscribe(() => { if (JSON.stringify(identity()) !== JSON.stringify(owner)) invalidated = true; });
  const guard = () => { if (closed || invalidated || JSON.stringify(identity()) !== JSON.stringify(owner)) throw Error('drone_session_changed'); };
  const close = () => { closed = true; unsubscribe(); };
  let db: ReturnType<typeof openDatabase>;
  try { db = openDatabase(); await initDatabase(db); guard(); } catch (error) { close(); throw error; }
  const prefix = 'drone-task-v1:' + JSON.stringify([owner.environment,owner.actor,taskId]) + ':';
  const decode = (payload: string): Command => {
    const c = JSON.parse(payload) as Command;
    if (c.schema !== 1 || c.actor !== owner.actor || c.environment !== owner.environment || c.taskId !== taskId || !uuid(c.key) ||
      !['accept','decline'].includes(c.operation) || !version(c.version) || c.source?.projectId !== c.projectId || c.source?.version !== c.version ||
      !['NEW_ASSIGNED','REASSIGNED'].includes(c.source?.status) ||
      typeof c.session !== 'string' || JSON.parse(c.session)[0] !== c.actor || !JSON.parse(c.session)[1] ||
      (c.operation === 'accept' ? JSON.stringify(c.payload) !== '{}' : typeof c.payload?.reason !== 'string' || !c.payload.reason.trim() || Object.keys(c.payload).length !== 1)) throw Error('drone_journal_invalid');
    validateTask(c.source,owner.actor,taskId);
    return c;
  };
  const receiptValid = (c: Command, result: NonNullable<Outcome['receipt']>) => {
    validateTask(result.data,c.actor,c.taskId);
    if (result.data.projectId !== c.projectId || result.etag !== `"${result.data.version}"` || result.data.version === c.version ||
      result.data.status !== (c.operation === 'accept' ? 'ACCEPTED' : 'REJECTED') || JSON.stringify(result.data.scope) !== JSON.stringify(c.source.scope)) throw Error('drone_receipt_invalid');
  };
  const read = async () => {
    guard();
    const rows = await db.getAllAsync<{id: string; payload: string}>('SELECT id, payload FROM local_draft WHERE kind = ? AND substr(id, 1, ?) = ?',KIND,prefix.length,prefix);
    guard();
    // One unresolved command per task. History is retained; no automatic supersession.
    if (!rows.length) return null;
    if (rows.length !== 1) throw Error('drone_journal_multiple_commands');
    const command = decode(rows[0].payload);
    if (rows[0].id !== prefix + command.key) throw Error('drone_journal_identity_invalid');
    const states = await db.getAllAsync<{payload: string}>('SELECT payload FROM local_draft WHERE id = ? AND kind = ?',prefix+command.key+':outcome',STATE);
    guard();
    if (states.length !== 1) throw Error('drone_journal_outcome_missing');
    const outcome = JSON.parse(states[0].payload) as Outcome;
    if (!['PREPARED','UNKNOWN_OUTCOME','RECEIPT'].includes(outcome.phase)) throw Error('drone_journal_outcome_invalid');
    if (outcome.phase === 'RECEIPT') { if (!outcome.receipt) throw Error('drone_receipt_missing'); receiptValid(command,outcome.receipt); }
    else if (outcome.receipt) throw Error('drone_journal_outcome_invalid');
    return { command, ...outcome };
  };
  const exclusive = async <T,>(fn: () => Promise<T>): Promise<T> => {
    guard(); if (busy) throw Error('drone_command_busy'); busy = true;
    try { return await fn(); } finally { busy = false; }
  };
  return { close, read,
    readCurrent: async () => {
      guard(); const response = await getOperatorSurveyTaskDetailReal(taskId); guard();
      validateTask(response.data,owner.actor,taskId);
      if (response.etag !== `"${response.data.version}"`) throw Error('drone_task_source_invalid');
      return response.data;
    },
    prepare: (operation: Operation, reason = '') => exclusive(async () => {
      if (!['accept','decline'].includes(operation) || (operation === 'decline' && !reason.trim())) throw Error('drone_intent_invalid');
      if (await read()) throw Error('drone_previous_command_requires_review');
      const source = await getOperatorSurveyTaskDetailReal(taskId); guard();
      validateTask(source.data,owner.actor,taskId);
      if (source.etag !== `"${source.data.version}"` || !['NEW_ASSIGNED','REASSIGNED'].includes(source.data.status)) throw Error('drone_task_not_actionable');
      const command: Command = JSON.parse(JSON.stringify({schema:1,...owner,taskId,projectId:source.data.projectId,key:randomUUID(),operation,
        version:source.data.version,payload:operation === 'accept' ? {} : {reason:reason.trim()},source:source.data}));
      await db.withExclusiveTransactionAsync(async tx => {
        guard();
        const existing = await tx.getAllAsync('SELECT id FROM local_draft WHERE kind = ? AND substr(id, 1, ?) = ?',KIND,prefix.length,prefix); guard();
        if (existing.length) throw Error('drone_previous_command_requires_review');
        const now = new Date().toISOString();
        await tx.runAsync('INSERT INTO local_draft (id, kind, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',prefix+command.key,KIND,JSON.stringify(command),now,now);
        await tx.runAsync('INSERT INTO local_draft (id, kind, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',prefix+command.key+':outcome',STATE,JSON.stringify({phase:'PREPARED'}),now,now); guard();
      }); guard();
      return command;
    }),
    dispatch: (key: string, confirmed: boolean) => exclusive(async () => {
      if (!confirmed) throw Error('drone_confirmation_required');
      const saved = await read(); guard();
      if (!saved || saved.command.key !== key || saved.phase === 'RECEIPT') throw Error('drone_command_not_dispatchable');
      const c = saved.command;
      await db.withExclusiveTransactionAsync(async tx => {
        guard();
        const states = await tx.getAllAsync<{payload: string}>('SELECT payload FROM local_draft WHERE id = ? AND kind = ?',prefix+c.key+':outcome',STATE);
        guard();
        if (states.length !== 1 || !['PREPARED','UNKNOWN_OUTCOME'].includes(JSON.parse(states[0].payload).phase)) throw Error('drone_command_not_dispatchable');
        await tx.runAsync('UPDATE local_draft SET payload = ?, updated_at = ? WHERE id = ? AND kind = ?',JSON.stringify({phase:'UNKNOWN_OUTCOME'}),new Date().toISOString(),prefix+c.key+':outcome',STATE); guard();
      }); guard();
      // Exact original body/version/key, including across a new sid for the same actor/environment.
      // Server independently reauthorizes current membership and assignment before receipt lookup.
      const response = await apiClient.post<SurveyTaskV2ResponseDto>(`/survey-tasks/${encodeURIComponent(c.taskId)}/${c.operation}`,c.payload,
        {headers:{'Idempotency-Key':c.key,'If-Match':`"${c.version}"`}}); guard();
      const receipt = {data:response.data,etag:response.headers?.etag ?? response.headers?.ETag};
      receiptValid(c,receipt);
      await db.withExclusiveTransactionAsync(async tx => { guard();
        await tx.runAsync('UPDATE local_draft SET payload = ?, updated_at = ? WHERE id = ? AND kind = ?',JSON.stringify({phase:'RECEIPT',receipt}),new Date().toISOString(),prefix+c.key+':outcome',STATE); guard();
      }); guard();
      return read();
    }),
  };
}

/** Discover retained commands without asking the Operator to type a UUID. Read only. */
export async function listDroneTaskCommands() {
  const owner = identity();
  if (!owner) throw Error('drone_session_invalid');
  let invalidated = false;
  const unsubscribe = useAuthStore.subscribe(() => { if (JSON.stringify(identity()) !== JSON.stringify(owner)) invalidated = true; });
  const guard = () => { if (invalidated || JSON.stringify(identity()) !== JSON.stringify(owner)) throw Error('drone_session_changed'); };
  try {
    const db = openDatabase(); await initDatabase(db); guard();
    const prefix = 'drone-task-v1:' + JSON.stringify([owner.environment,owner.actor]).slice(0,-1) + ',';
    const rows = await db.getAllAsync<{payload:string}>('SELECT payload FROM local_draft WHERE kind = ? AND substr(id, 1, ?) = ?',KIND,prefix.length,prefix); guard();
    const taskIds = [...new Set(rows.map(row => {
      const c = JSON.parse(row.payload) as Command;
      if (c.actor !== owner.actor || c.environment !== owner.environment || !uuid(c.taskId)) throw Error('drone_journal_invalid');
      return c.taskId;
    }))];
    const result = [];
    for (const taskId of taskIds) {
      guard(); const runtime = await openDroneTaskJournal(taskId);
      try {
        const saved = await runtime.read(); guard();
        if (!saved) throw Error('drone_journal_missing');
        result.push({taskId,operation:saved.command.operation,phase:saved.phase});
      } finally { runtime.close(); }
    }
    guard(); return result;
  } finally { unsubscribe(); }
}
