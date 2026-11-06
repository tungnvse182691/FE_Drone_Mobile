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
export const DRONE_UPLOAD_INTENT_KIND = 'DRONE_UPLOAD_INTENT';
export const DRONE_DATASET_INTENT_KIND = 'DRONE_DATASET_INTENT';
export type DroneUploadIntentStatus = 'PREPARED' | 'SESSION_CREATED' | 'PARTS_IN_PROGRESS' | 'COMPLETE_UNKNOWN' | 'VERIFY_PENDING' | 'VERIFIED' | 'DATASET_UNKNOWN' | 'DATASET_CONFIRMED' | 'CONFLICT' | 'FAILED';
export type DroneUploadPart = { partNumber: number; sizeBytes: number; etag: string };
export type DroneUploadIntent = {
  schema: 1; key: string; kind: typeof DRONE_UPLOAD_INTENT_KIND | typeof DRONE_DATASET_INTENT_KIND;
  actor: string; environment: string; session: string; projectId: string; taskId: string;
  localFileId?: string; localUri?: string; sizeBytes?: number; checksumSha256?: string;
  purpose?: 'SURVEY_VIDEO' | 'TELEMETRY'; mimeType?: 'video/mp4' | 'application/x-subrip';
  body: Record<string, unknown>; uploadId: string | null; fileId: string | null; version: string | null;
  ifMatch: string | null; parts: DroneUploadPart[]; status: DroneUploadIntentStatus;
  updatedAt: string; receipt: Record<string, unknown> | null; error: { status?: number; code: string } | null;
};
type UploadInput = Omit<DroneUploadIntent, 'schema'|'key'|'kind'|'actor'|'environment'|'session'|'updatedAt'|'uploadId'|'fileId'|'version'|'ifMatch'|'parts'|'status'|'receipt'|'error'> & { kind: 'upload'|'dataset'; uploadId?: string|null; fileId?: string|null; version?: string|null; ifMatch?: string|null };
// A task may be open in detail, decline and recovery screens at once. Keep the
// lock until transport settles, even if its originating screen/session closes.
const activeCommands = new Set<string>();
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
  let closed = false, invalidated = false;
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
    guard(); if (activeCommands.has(prefix)) throw Error('drone_command_busy'); activeCommands.add(prefix);
    try { return await fn(); } finally { activeCommands.delete(prefix); }
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

const uploadKinds = new Set([DRONE_UPLOAD_INTENT_KIND, DRONE_DATASET_INTENT_KIND]);
const uploadStates = new Set<DroneUploadIntentStatus>(['PREPARED','SESSION_CREATED','PARTS_IN_PROGRESS','COMPLETE_UNKNOWN','VERIFY_PENDING','VERIFIED','DATASET_UNKNOWN','DATASET_CONFIRMED','CONFLICT','FAILED']);
const forbiddenJournalKey = /token|password|otp|authorization|presigned|signedurl|signed_url/i;
function assertJournalSafe(value: unknown, key = ''): void {
  if (forbiddenJournalKey.test(key)) throw Error('drone_upload_journal_sensitive_field');
  if (typeof value === 'string' && /bearer\s|https?:\/\//i.test(value)) throw Error('drone_upload_journal_sensitive_value');
  if (Array.isArray(value)) value.forEach((item) => assertJournalSafe(item, key));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([child, item]) => assertJournalSafe(item, child));
}
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function validateUploadIntent(intent: DroneUploadIntent, owner: { actor: string; environment: string }, taskId: string): void {
  if (intent.schema !== 1 || !uploadKinds.has(intent.kind) || intent.actor !== owner.actor || intent.environment !== owner.environment || intent.taskId !== taskId || !uuid(intent.key) || !uuid(intent.projectId) || typeof intent.session !== 'string' || JSON.parse(intent.session)[0] !== owner.actor || !JSON.parse(intent.session)[1] || !uploadStates.has(intent.status) || !/^[a-f0-9]{64}$/.test(intent.checksumSha256 ?? '') && intent.kind === DRONE_UPLOAD_INTENT_KIND || !Array.isArray(intent.parts)) throw Error('drone_upload_journal_invalid');
  assertJournalSafe(intent.body);
  for (const part of intent.parts) if (!Number.isSafeInteger(part.partNumber) || part.partNumber < 1 || !Number.isSafeInteger(part.sizeBytes) || part.sizeBytes <= 0 || !part.etag.trim() || /https?:\/\//i.test(part.etag)) throw Error('drone_upload_journal_invalid_part');
}

/** Durable upload/dataset intent journal. It has no dispatcher and never calls the network. */
export async function openDroneUploadJournal(taskId: string) {
  const owner = identity();
  if (!owner || !uuid(taskId)) throw Error('drone_session_invalid');
  let closed = false, invalidated = false;
  const unsubscribe = useAuthStore.subscribe(() => { if (JSON.stringify(identity()) !== JSON.stringify(owner)) invalidated = true; });
  const guard = () => { if (closed || invalidated || JSON.stringify(identity()) !== JSON.stringify(owner)) throw Error('drone_session_changed'); };
  const close = () => { closed = true; unsubscribe(); };
  let db: ReturnType<typeof openDatabase>;
  try { db = openDatabase(); await initDatabase(db); guard(); } catch (error) { close(); throw error; }
  const prefix = 'drone-upload-v1:' + JSON.stringify([owner.environment, owner.actor, taskId]) + ':';
  const readRows = async () => {
    guard();
    const rows = await db.getAllAsync<{id: string; kind: string; payload: string}>('SELECT id, kind, payload FROM local_draft WHERE substr(id, 1, ?) = ? AND kind IN (?, ?)', prefix.length, prefix, DRONE_UPLOAD_INTENT_KIND, DRONE_DATASET_INTENT_KIND);
    guard();
    return rows.map(row => { const item = JSON.parse(row.payload) as DroneUploadIntent; if (row.id !== prefix + item.key || row.kind !== item.kind) throw Error('drone_upload_journal_identity_invalid'); validateUploadIntent(item, owner, taskId); return item; });
  };
  const exclusive = async <T,>(fn: () => Promise<T>): Promise<T> => {
    guard(); if (activeCommands.has(prefix + ':upload')) throw Error('drone_upload_journal_busy'); activeCommands.add(prefix + ':upload');
    try { return await fn(); } finally { activeCommands.delete(prefix + ':upload'); }
  };
  return {
    close,
    read: async (kind?: 'upload' | 'dataset') => { const items = await readRows(); return kind ? items.filter(item => item.kind === (kind === 'upload' ? DRONE_UPLOAD_INTENT_KIND : DRONE_DATASET_INTENT_KIND)) : items; },
    prepare: (input: UploadInput) => exclusive(async () => {
      guard();
      const kind = input.kind === 'upload' ? DRONE_UPLOAD_INTENT_KIND : DRONE_DATASET_INTENT_KIND;
      if (!uuid(input.projectId) || !input.body || typeof input.body !== 'object' || !Number.isSafeInteger(input.sizeBytes) && input.sizeBytes !== undefined || (input.kind === 'upload' && (!input.localFileId || !input.localUri || !input.checksumSha256 || !input.purpose || !input.mimeType))) throw Error('drone_upload_intent_invalid');
      if (input.checksumSha256 !== undefined && !/^[a-f0-9]{64}$/.test(input.checksumSha256)) throw Error('drone_upload_intent_invalid');
      assertJournalSafe(input.body); assertJournalSafe({ localFileId: input.localFileId, localUri: input.localUri, sizeBytes: input.sizeBytes, checksumSha256: input.checksumSha256, purpose: input.purpose, mimeType: input.mimeType });
      const body = clone(input.body); const existing = (await readRows()).filter(item => item.kind === kind);
      const same = existing.find(item => JSON.stringify(item.body) === JSON.stringify(body) && item.localFileId === input.localFileId);
      if (same) return clone(same);
      if (existing.some(item => item.status !== 'FAILED' && item.status !== 'CONFLICT')) throw Error('drone_upload_intent_pending');
      const now = new Date().toISOString();
      const intent: DroneUploadIntent = { schema: 1, key: randomUUID(), kind, ...owner, taskId, projectId: input.projectId, localFileId: input.localFileId, localUri: input.localUri, sizeBytes: input.sizeBytes, checksumSha256: input.checksumSha256, purpose: input.purpose, mimeType: input.mimeType, body, uploadId: input.uploadId ?? null, fileId: input.fileId ?? null, version: input.version ?? null, ifMatch: input.ifMatch ?? null, parts: [], status: 'PREPARED', updatedAt: now, receipt: null, error: null };
      validateUploadIntent(intent, owner, taskId);
      await db.withExclusiveTransactionAsync(async tx => { guard(); await tx.runAsync('INSERT INTO local_draft (id, kind, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', prefix + intent.key, intent.kind, JSON.stringify(intent), now, now); guard(); });
      return clone(intent);
    }),
    update: (key: string, patch: Partial<Pick<DroneUploadIntent, 'uploadId'|'fileId'|'version'|'ifMatch'|'parts'|'status'|'receipt'|'error'>>) => exclusive(async () => {
      if (!uuid(key)) throw Error('drone_upload_intent_invalid'); const items = await readRows(); const current = items.find(item => item.key === key); if (!current) throw Error('drone_upload_intent_missing');
      if ('status' in patch && (!patch.status || !uploadStates.has(patch.status))) throw Error('drone_upload_intent_invalid_state');
      assertJournalSafe(patch); const next = { ...current, ...clone(patch), updatedAt: new Date().toISOString() } as DroneUploadIntent; validateUploadIntent(next, owner, taskId);
      await db.runAsync('UPDATE local_draft SET payload = ?, updated_at = ? WHERE id = ? AND kind = ?', JSON.stringify(next), next.updatedAt, prefix + key, current.kind); guard(); return clone(next);
    }),
  };
}
