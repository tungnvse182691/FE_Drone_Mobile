import type { SQLiteDatabase } from 'expo-sqlite';
import { openDatabase, initDatabase } from '../offline/database';
import { useAuthStore } from '../store/auth';
import { passwordSessionIdentity } from './authApi';
import { apiClient } from './client';
import { isCrewResourceId, isRepairItemVersion } from './crewApi';

export interface RepairIdentity {
  actor: string; scope: string; environment: string; projectId: string; taskId: string;
}
export interface RepairCommandIdentity extends RepairIdentity {
  packageId: string; itemId: string; bindingId: string; assignmentId: string;
}
export type RepairOperation = 'assessment' | 'start' | 'finish' | 'attempt' | 'supplement';
export interface RepairIntent {
  identity: RepairCommandIdentity; operation: RepairOperation; key: string;
  itemVersion: string; payload: Record<string, unknown>;
}
export interface RepairJournalRecord extends RepairIntent {
  schema: 1; phase: 'PREPARED'; ifMatch: string;
}
const KIND = 'T06A_REPAIR_COMMAND';

export function currentRepairIdentity(projectId: string, taskId: string): RepairIdentity | null {
  const state = useAuthStore.getState(), scope = passwordSessionIdentity(state.token);
  if (!scope || !state.user || state.user.role_code !== 'REPAIR_CREW' || state.user.must_change_password ||
      !['AUTHENTICATED','REFRESHING'].includes(state.status) || JSON.parse(scope)[0] !== state.user.id ||
      !isCrewResourceId(projectId) || !isCrewResourceId(taskId)) return null;
  return { actor: state.user.id, scope, environment: apiClient.defaults.baseURL ?? '', projectId, taskId };
}
export function sameRepairIdentity(a: RepairIdentity, b: RepairIdentity | null): boolean {
  return !!b && (['actor','scope','environment','projectId','taskId'] as const).every(k => a[k] === b[k]);
}
function validateIdentity(identity: RepairIdentity): void {
  let claims: unknown;
  try { claims = JSON.parse(identity.scope); } catch { throw new Error('repair_identity_invalid'); }
  if (![identity.actor,identity.projectId,identity.taskId].every(isCrewResourceId) ||
      !Array.isArray(claims) || claims.length !== 2 || claims[0] !== identity.actor || typeof claims[1] !== 'string' || !claims[1] ||
      !/^https?:\/\/[^@?#\s]+$/.test(identity.environment)) throw new Error('repair_identity_invalid');
}
/** Canonical JSON snapshot; rejects lossy/non-JSON data and credentials before storage. */
function canonical(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && Object.prototype.toString.call(value) === '[object Object]') {
    return '{' + Object.keys(value).sort().map(key => {
      if (/password|token|authorization|presigned|signedurl/i.test(key)) throw new Error('repair_secret_not_allowed');
      return JSON.stringify(key) + ':' + canonical((value as Record<string, unknown>)[key]);
    }).join(',') + '}';
  }
  throw new Error('repair_payload_invalid');
}
function snapshot(intent: RepairIntent): RepairJournalRecord {
  validateIdentity(intent.identity);
  if (![intent.identity.packageId,intent.identity.itemId,intent.identity.bindingId,intent.identity.assignmentId].every(isCrewResourceId) ||
      !isRepairItemVersion(intent.itemVersion) || !/^[A-Za-z0-9._:-]{1,128}$/.test(intent.key) ||
      !['assessment','start','finish','attempt','supplement'].includes(intent.operation) ||
      !intent.payload || Array.isArray(intent.payload) || typeof intent.payload !== 'object') throw new Error('repair_intent_invalid');
  // Select fields explicitly; callers cannot persist arbitrary auth state alongside an intent.
  const { actor,scope,environment,projectId,taskId,packageId,itemId,bindingId,assignmentId } = intent.identity;
  return JSON.parse(canonical({ schema: 1, phase: 'PREPARED', identity: { actor,scope,environment,projectId,taskId,packageId,itemId,bindingId,assignmentId },
    operation: intent.operation, key: intent.key, itemVersion: intent.itemVersion, ifMatch: `"${intent.itemVersion}"`, payload: intent.payload }));
}
function decode(payload: string): RepairJournalRecord {
  try {
    const row = JSON.parse(payload) as RepairJournalRecord;
    if (row.schema !== 1 || row.phase !== 'PREPARED' || canonical(snapshot(row)) !== canonical(row)) throw new Error();
    return row;
  } catch { throw new Error('repair_journal_invalid'); }
}
function journalKey(record: RepairIntent): string {
  const i = record.identity;
  return taskPartition(i) + JSON.stringify([i.scope,i.itemId,record.key]);
}
function taskPartition(i: RepairIdentity): string {
  return `t06a:${JSON.stringify([i.environment,i.actor,i.projectId,i.taskId])}:`;
}
function sameTask(a: RepairIdentity, b: RepairIdentity): boolean {
  return (['actor','environment','projectId','taskId'] as const).every(k => a[k] === b[k]);
}
/** Storage only. No POST, dispatcher, optimistic receipt or offline replay is enabled in T06-A. */
export async function openRepairJournal(identity: RepairIdentity,
  current: () => RepairIdentity | null = () => currentRepairIdentity(identity.projectId, identity.taskId)) {
  const context = { ...identity };
  validateIdentity(context);
  const guard = () => { if (!sameRepairIdentity(context, current())) throw new Error('repair_session_changed'); };
  guard();
  const db = openDatabase(); await initDatabase(db); guard();
  const rows = async (connection: SQLiteDatabase): Promise<RepairJournalRecord[]> => {
    // Scope before decoding: corruption in another account/task/environment stays isolated.
    // Sessions share this partition so relogin cannot overwrite unresolved work.
    const prefix = taskPartition(context);
    const result = await connection.getAllAsync<{payload:string}>(
      'SELECT payload FROM local_draft WHERE kind = ? AND substr(id, 1, ?) = ?', KIND, prefix.length, prefix);
    return result.map(row => {
      const record = decode(row.payload);
      if (!sameTask(context, record.identity)) throw new Error('repair_journal_invalid');
      return record;
    });
  };
  return {
    async read(key: string): Promise<RepairJournalRecord | null> {
      guard(); const result = await rows(db); guard();
      const row = result.find(r => sameRepairIdentity(context,r.identity) && r.key === key);
      return row ?? null;
    },
    async prepare(intent: RepairIntent): Promise<RepairJournalRecord> {
      guard(); const record = snapshot(intent);
      if (!sameRepairIdentity(context, record.identity)) throw new Error('repair_session_changed');
      await db.withExclusiveTransactionAsync(async transaction => {
        guard(); const stored = await rows(transaction); guard();
        const existing = stored.find(r => sameTask(context,r.identity));
        // Includes old sessions and replaced items: unknown work cannot be overwritten by relogin/reassignment.
        if (existing) {
          if (canonical(existing) !== canonical(record)) throw new Error('repair_unresolved_command');
          return;
        }
        const now = new Date().toISOString();
        await transaction.runAsync('INSERT INTO local_draft (id, kind, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
          journalKey(record), KIND, canonical(record), now, now);
        guard(); // Throw rolls back if the account changes while SQLite is writing.
      });
      guard();
      return record;
    },
  };
}
