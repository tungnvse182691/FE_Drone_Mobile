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
  schema: 1; phase: 'PREPARED' | 'PENDING' | 'ACKNOWLEDGED' | 'CONFIRMED' | 'REJECTED'; ifMatch: string;
  receipt?: { data: Record<string, unknown>; itemVersion: string };
  rejection?: { status: number; code: string | null };
  /** Effective view only; never serialized into the original command. */
  rejectionResolved?: boolean;
}
const KIND = 'T06A_REPAIR_COMMAND';
const RECOVERY_KIND = 'HARDEN02_REPAIR_RECOVERY';
const REJECTION_PROOF = 'CREW_REPAIR_REJECTION_PROOF';
const REJECTION_RESOLUTION = 'CREW_REPAIR_REJECTION_RESOLUTION';
function sameBinding(a: RepairCommandIdentity,b: RepairCommandIdentity): boolean {
  return sameTask(a,b) && (['packageId','itemId','bindingId','assignmentId'] as const).every(k=>a[k]===b[k]);
}

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
    const base = snapshot(row);
    if (row.schema !== 1 || !['PREPARED','PENDING','ACKNOWLEDGED','CONFIRMED','REJECTED'].includes(row.phase)) throw new Error();
    if (row.receipt && (!isRepairItemVersion(row.receipt.itemVersion) || row.receipt.data.itemId !== row.identity.itemId ||
        (row.operation === 'attempt' ? ![row.receipt.data.attemptId,row.receipt.data.linkId,row.receipt.data.submissionId,row.receipt.data.reviewClockId].every(isCrewResourceId) :
          !isCrewResourceId(row.receipt.data.id) || row.receipt.data.taskId !== row.identity.taskId))) throw new Error();
    if (['ACKNOWLEDGED','CONFIRMED'].includes(row.phase) && !row.receipt) throw new Error();
    if (row.phase === 'REJECTED' && (!row.rejection || ![400,401,403,404,409,412,422,428].includes(row.rejection.status))) throw new Error();
    if (canonical({ ...base, phase: row.phase, ...(row.receipt ? {receipt:row.receipt} : {}),
      ...(row.rejection ? {rejection:row.rejection} : {}) }) !== canonical(row)) throw new Error();
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
/** Durable storage only. Dispatch is explicit and online in crewRepairWorkflow. */
export async function openRepairJournal(identity: RepairIdentity,
  current: () => RepairIdentity | null = () => currentRepairIdentity(identity.projectId, identity.taskId)) {
  const context = { ...identity };
  validateIdentity(context);
  const guard = () => { if (!sameRepairIdentity(context, current())) throw new Error('repair_session_changed'); };
  guard();
  const db = openDatabase(); await initDatabase(db); guard();
  const originals = async (connection: SQLiteDatabase): Promise<RepairJournalRecord[]> => {
    // Scope before decoding: corruption in another account/task/environment stays isolated.
    // Sessions share this partition so relogin cannot overwrite unresolved work.
    const prefix = taskPartition(context);
    const result = await connection.getAllAsync<{id:string;payload:string}>(
      'SELECT id, payload FROM local_draft WHERE kind = ? AND substr(id, 1, ?) = ? ORDER BY rowid', KIND, prefix.length, prefix);
    return result.map(row => {
      const record = decode(row.payload);
      if (!sameTask(context, record.identity) || row.id!==journalKey(record)) throw new Error('repair_journal_invalid');
      return record;
    });
  };
  // Recovery evidence is separate from the command row. Its source fingerprint includes
  // the original phase/receipt, so a replaced/corrupt source never acquires an overlay.
  const rows = async (connection: SQLiteDatabase): Promise<RepairJournalRecord[]> => {
    const source = await originals(connection); guard();
    const prefix=taskPartition(context);
    const overlays=await connection.getAllAsync<{id:string;payload:string}>(
      'SELECT id, payload FROM local_draft WHERE kind = ? AND substr(id, 1, ?) = ?', RECOVERY_KIND,prefix.length,prefix);
    guard();
    const seen=new Set<string>();
    const result=source.map(original=>{
      if(seen.has(original.key))throw Error('repair_journal_invalid');seen.add(original.key);
      const overlay=overlays.find(o=>o.id===journalKey(original)+':recovery');
      if(overlay){
        try {
          const evidence=JSON.parse(overlay.payload), recovered=decode(canonical(evidence.record));
          if(evidence.source!==canonical(original)||canonical(snapshot(original))!==canonical(snapshot(recovered))||
            !['PENDING','ACKNOWLEDGED','CONFIRMED','REJECTED'].includes(recovered.phase))throw Error();
          return recovered;
        }catch{throw Error('repair_journal_invalid');}
      }
      // Historical authentication/concurrency errors do not prove that the intent was never committed.
      if(original.phase==='REJECTED'&&[401,409,412].includes(original.rejection?.status??0)){
        const {rejection: _rejection,...rest}=original;return {...rest,phase:'PENDING' as const};
      }
      return original;
    });
    if(overlays.some(o=>!source.some(row=>journalKey(row)+':recovery'===o.id)))throw Error('repair_journal_invalid');
    const resolutions=await connection.getAllAsync<{id:string;payload:string}>(
      'SELECT id, payload FROM local_draft WHERE kind = ? AND substr(id, 1, ?) = ?', REJECTION_RESOLUTION,prefix.length,prefix);
    guard();
    return result.map(row=>{
      const candidates=resolutions.filter(o=>o.id.startsWith(journalKey(row)+':resolved:'));
      const resolution=candidates.map(o=>JSON.parse(o.payload)).find(value=>sameRepairIdentity(value.current,context)||
        value.successor&&source.some(next=>canonical(snapshot(next))===canonical(value.successor)));
      if(!resolution)return row;
      if(row.phase!=='REJECTED'||resolution.source!==canonical(row)||!sameTask(resolution.current,context))throw Error('repair_journal_invalid');
      if(resolution.successor&&(!sameBinding(row.identity,resolution.successor.identity)||row.itemVersion!==resolution.successor.itemVersion||row.operation!==resolution.successor.operation))throw Error('repair_journal_invalid');
      return {...row,rejectionResolved:true};
    });
  };
  return {
    /** Workflow must validate current assignment/binding before exposing these rows. Never dispatches. */
    async history(): Promise<RepairJournalRecord[]> {guard();const result=await rows(db);guard();return result;},
    async historicalRead(key:string): Promise<RepairJournalRecord|null> {guard();const result=await rows(db);guard();return result.find(r=>r.key===key)??null;},
    async list(): Promise<RepairJournalRecord[]> {
      guard(); const result = await rows(db); guard();
      if (result.some(r => !sameRepairIdentity(context,r.identity) && !['CONFIRMED','REJECTED'].includes(r.phase))) throw new Error('repair_previous_session_unresolved');
      return result.filter(r => sameRepairIdentity(context,r.identity));
    },
    async read(key: string): Promise<RepairJournalRecord | null> {
      guard(); const result = await rows(db); guard();
      const row = result.find(r => sameRepairIdentity(context,r.identity) && r.key === key);
      return row ?? null;
    },
    async prepare(intent: RepairIntent): Promise<RepairJournalRecord> {
      guard(); const record = snapshot(intent);
      if (!sameRepairIdentity(context, record.identity)) throw new Error('repair_session_changed');
      await db.withExclusiveTransactionAsync(async transaction => {
        guard(); const all = await rows(transaction); guard();
        const stored=all.filter(r=>!r.rejectionResolved);
        // A resolution authorizes only this binding and the freshly checked item version.
        const resolved=all.at(-1)?.rejectionResolved?all.at(-1):undefined;
        if(resolved&&(!sameBinding(resolved.identity,record.identity)||resolved.itemVersion!==record.itemVersion||resolved.operation!==record.operation))throw Error('repair_history_requires_reconciliation');
        const identical = all.find(r => r.key === record.key);
        if (identical) {
          if (canonical(snapshot(identical)) !== canonical(record)) throw new Error('repair_unresolved_command');
          return;
        }
        const existing = stored.find(r => !['CONFIRMED','REJECTED'].includes(r.phase));
        // Includes old sessions and replaced items: unknown work cannot be overwritten by relogin/reassignment.
        if (existing) {
          throw new Error('repair_unresolved_command');
        }
        if (record.operation === 'finish' || record.operation === 'attempt') {
          const previous = stored.at(-1);
          const required = record.operation === 'finish' ? 'start' : 'finish';
          const receiptId = record.operation === 'finish' ? record.payload.executionStartId : record.payload.executionFinishId;
          if (!previous || previous.operation !== required || previous.phase !== 'CONFIRMED' ||
              !sameBinding(previous.identity,record.identity) || previous.receipt?.data.id !== receiptId ||
              previous.receipt?.itemVersion !== record.itemVersion || stored.some(r => r.operation === record.operation || r.phase === 'REJECTED'))
            throw new Error('repair_history_requires_reconciliation');
        } else if (record.operation === 'start') {
          const assessment = stored.find(r => sameBinding(record.identity,r.identity) && r.operation === 'assessment' &&
            r.phase === 'CONFIRMED' && r.receipt?.data.id === record.payload.assessmentId);
          if (!assessment || assessment.receipt?.data.readiness !== 'READY' ||
            assessment.receipt.data.stage !== 'PRE_EXECUTION' ||
            !sameBinding(assessment.identity,record.identity) ||
            assessment.payload.fieldFirstStartId !== record.payload.fieldFirstStartId ||
            assessment.receipt.itemVersion !== record.itemVersion || stored.some(r => r.operation === 'start')) throw new Error('repair_assessment_required');
        } else if (stored.length) {
          const previous=stored[stored.length-1];
          if (record.operation!=='assessment' || stored.some(r=>r.operation!=='assessment'||r.phase!=='CONFIRMED') ||
              !sameBinding(previous.identity,record.identity) ||
              previous.receipt?.data.readiness!=='INCOMPLETE' || previous.receipt.itemVersion!==record.itemVersion ||
              canonical(previous.payload)===canonical(record.payload)) throw new Error('repair_history_requires_reconciliation');
        }
        const now = new Date().toISOString();
        await transaction.runAsync('INSERT INTO local_draft (id, kind, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
          journalKey(record), KIND, canonical(record), now, now);
        if(resolved){
          const id=journalKey(resolved)+':resolved:'+context.scope;
          const value=(await transaction.getAllAsync<{payload:string}>('SELECT payload FROM local_draft WHERE id = ? AND kind = ?',id,REJECTION_RESOLUTION))[0];
          if(!value)throw Error('repair_rejection_resolution_blocked');
          await transaction.runAsync('UPDATE local_draft SET payload = ?, updated_at = ? WHERE id = ? AND kind = ?',
            canonical({...JSON.parse(value.payload),successor:record}),now,id,REJECTION_RESOLUTION);
        }
        guard(); // Throw rolls back if the account changes while SQLite is writing.
      });
      guard();
      return record;
    },
    /** Separate explicit resolution; original rejected command, receipt and media remain untouched. */
    async resolveRejection(key: string, expected: RepairCommandIdentity, itemVersion: string) {
      guard();
      await db.withExclusiveTransactionAsync(async transaction=>{
        const all=await rows(transaction);guard();const row=all.find(c=>c.key===key);
        if(!row||row.phase!=='REJECTED'||!sameBinding(row.identity,expected)||row.itemVersion!==itemVersion||
          all.some(c=>!['CONFIRMED','REJECTED'].includes(c.phase))||all.at(-1)?.key!==key)throw Error('repair_rejection_resolution_blocked');
        const {rejectionResolved:_resolved,...original}=row;
        const proof=(await transaction.getAllAsync<{payload:string}>('SELECT payload FROM local_draft WHERE id = ? AND kind = ?',journalKey(row)+':proof',REJECTION_PROOF))[0];guard();
        if(!proof||JSON.parse(proof.payload).source!==canonical(original)||JSON.parse(proof.payload).basis!=='FIRST_DISPATCH_DEFINITIVE_RESPONSE')throw Error('repair_rejection_proof_missing');
        const now=new Date().toISOString();
        await transaction.runAsync('INSERT INTO local_draft (id, kind, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at',
          journalKey(row)+':resolved:'+context.scope,REJECTION_RESOLUTION,canonical({source:canonical(original),current:context}),now,now);
        guard();
      });guard();
    },
    async transition(key: string, phase: RepairJournalRecord['phase'],
      evidence?: Pick<RepairJournalRecord,'receipt'|'rejection'>, firstDispatchRejection = false): Promise<RepairJournalRecord> {
      guard(); let updated: RepairJournalRecord | undefined;
      await db.withExclusiveTransactionAsync(async transaction => {
        guard(); const stored = await rows(transaction); guard();
        const row = stored.find(r => r.key === key);
        if (!row) throw new Error('repair_command_missing');
        const allowed: Record<RepairJournalRecord['phase'],string[]> = {PREPARED:['PENDING'],PENDING:['PENDING','ACKNOWLEDGED','REJECTED'],ACKNOWLEDGED:['CONFIRMED'],CONFIRMED:[],REJECTED:[]};
        if (!allowed[row.phase].includes(phase)) throw new Error('repair_phase_invalid');
        if (row.receipt && evidence?.receipt && canonical(row.receipt) !== canonical(evidence.receipt)) throw new Error('repair_receipt_immutable');
        updated = decode(canonical({...row,...evidence,phase}));
        const source=(await originals(transaction)).find(r=>r.key===key);guard();
        if(!source)throw Error('repair_command_missing');
        if(!sameRepairIdentity(context,source.identity) || source.phase==='REJECTED'&&[401,409,412].includes(source.rejection?.status??0)){
          // Exclusive transaction serializes overlay transitions; historical command bytes stay intact.
          const now=new Date().toISOString();
          await transaction.runAsync('INSERT INTO local_draft (id, kind, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at',
            journalKey(source)+':recovery',RECOVERY_KIND,canonical({source:canonical(source),record:updated}),now,now);
        }else{
          await transaction.runAsync('UPDATE local_draft SET payload = ?, updated_at = ? WHERE id = ? AND kind = ?',
            canonical(updated),new Date().toISOString(),journalKey(row),KIND);
        }
        if(firstDispatchRejection){
          if(phase!=='REJECTED'||row.phase!=='PENDING'||!updated.rejection||![400,403,404,422,428].includes(updated.rejection.status))throw Error('repair_rejection_proof_invalid');
          const now=new Date().toISOString();
          await transaction.runAsync('INSERT INTO local_draft (id, kind, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
            journalKey(updated)+':proof',REJECTION_PROOF,canonical({source:canonical(updated),basis:'FIRST_DISPATCH_DEFINITIVE_RESPONSE'}),now,now);
        }
        guard();
      });
      guard(); return updated!;
    },
  };
}
