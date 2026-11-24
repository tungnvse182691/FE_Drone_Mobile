import { initDatabase, openDatabase } from './database';
import { decodeOfflineJournalRecord } from '../api/crewOfflineJournal';

/** SecureStore continuity permits inspection only, never a network request. */
export interface LocalDraftReadIdentity {
  environment: string;
  actor: string;
  scope: string;
  role: 'REPAIR_CREW' | 'REPORTER';
}
export interface LocalDraftSummary {
  key: string;
  reference: string;
  referenceLabel?: string;
  updatedAt: string;
  photoCount: number;
  measurementCount: number;
  description: string | null;
  hasCommand: boolean;
}

/** No task authority, URI, command body/key, version, token or write API escapes. */
export async function loadLocalDraftSummaries(identity: LocalDraftReadIdentity, current: () => boolean): Promise<LocalDraftSummary[]> {
  let claims: unknown;
  try { claims = JSON.parse(identity.scope); } catch { throw Error('local_identity_invalid'); }
  if (!identity.environment || !identity.actor || !Array.isArray(claims) || claims.length !== 2 ||
      claims[0] !== identity.actor || typeof claims[1] !== 'string' || !claims[1] ||
      !['REPAIR_CREW', 'REPORTER'].includes(identity.role)) throw Error('local_identity_invalid');
  const check = () => { if (!current()) throw Error('local_session_changed'); };
  check();
  const db = openDatabase(); await initDatabase(db); check();
  const kinds = identity.role === 'REPAIR_CREW'
    ? ['T05B_FIELD', 'T06A_REPAIR_COMMAND', 'H01_RECEIVING_ACK', 'C10BC_IMMUTABLE_COMMAND_V1'] : ['reporter_pending_v1'];
  const rows = await db.getAllAsync<{id: string; kind: string; payload: string; updated_at: string}>(
    `SELECT id, kind, payload, updated_at FROM local_draft WHERE kind IN (${kinds.map(() => '?').join(',')}) ORDER BY updated_at DESC, id`,
    ...kinds);
  check();
  const result: LocalDraftSummary[] = [];
  for (const row of rows) {
    try {
      const d = JSON.parse(row.payload);
      if (!d || !Number.isFinite(Date.parse(row.updated_at))) continue;
      if (identity.role === 'REPAIR_CREW') {
        if (row.kind === 'C10BC_IMMUTABLE_COMMAND_V1') {
          const command = decodeOfflineJournalRecord(row.payload);
          const i = command.identity;
          if (i.actor !== identity.actor || i.environment !== identity.environment || i.scope !== identity.scope ||
              i.role !== identity.role || i.partition !== 'h01:' + JSON.stringify([i.environment,i.actor,i.role]) ||
              row.id !== 'c10bc:' + JSON.stringify([i.environment,i.actor,i.role]) + ':' + command.id) continue;
          result.push({key:row.id, reference:command.id, referenceLabel:'Lệnh đồng bộ', updatedAt:row.updated_at,
            photoCount:0, measurementCount:0, description:'Nhật ký đồng bộ đã lưu', hasCommand:true});
          continue;
        }
        if (row.kind !== 'T05B_FIELD') {
          // Inventory only. Never treat a local phase/overlay as a durable server receipt.
          const i = d.identity;
          if (!i || i.actor !== identity.actor || i.environment !== identity.environment || i.scope !== identity.scope ||
              typeof i.projectId !== 'string' || !i.projectId) continue;
          if (row.kind === 'T06A_REPAIR_COMMAND') {
            if (d.schema !== 1 || typeof i.taskId !== 'string' || !i.taskId || typeof i.itemId !== 'string' || !i.itemId ||
                typeof d.key !== 'string' || !d.key || !['PREPARED','PENDING','ACKNOWLEDGED','CONFIRMED','REJECTED'].includes(d.phase) ||
                !['assessment','start','finish','attempt','supplement'].includes(d.operation) ||
                !d.payload || typeof d.payload !== 'object' || Array.isArray(d.payload)) continue;
            const key = 't06a:' + JSON.stringify([i.environment,i.actor,i.projectId,i.taskId]) + ':' + JSON.stringify([i.scope,i.itemId,d.key]);
            if (row.id !== key) continue;
            result.push({key:row.id, reference:i.taskId, updatedAt:row.updated_at,
              photoCount:Array.isArray(d.payload.evidence) ? d.payload.evidence.length : 0,
              measurementCount:Array.isArray(d.payload.measurements) ? d.payload.measurements.length : 0,
              description:'Hồ sơ sửa chữa đã lưu', hasCommand:true});
          } else if (row.kind === 'H01_RECEIVING_ACK') {
            if (typeof d.requestId !== 'string' || !d.requestId || !['PENDING','CONFIRMED'].includes(d.phase) ||
                !d.body || d.body.claimedDeviceAt !== null || Object.keys(d.body).length !== 1) continue;
            if (row.id !== 'h01ack:' + JSON.stringify([i.environment,i.actor,i.projectId,d.requestId])) continue;
            result.push({key:row.id, reference:d.requestId, referenceLabel:'Yêu cầu tiếp nhận', updatedAt:row.updated_at,
              photoCount:0, measurementCount:0, description:'Lệnh tiếp nhận đã lưu', hasCommand:true});
          }
          continue;
        }
        if (d.actor !== identity.actor || d.environment !== identity.environment || d.scope !== identity.scope ||
            typeof d.projectId !== 'string' || !d.projectId || typeof d.taskId !== 'string' || !d.taskId ||
            !Array.isArray(d.captures) || !Array.isArray(d.measurements)) continue;
        const base = 't05b:' + JSON.stringify([d.environment, d.actor, d.projectId, d.taskId]);
        const scoped = base + ':' + JSON.stringify(d.scope);
        if (row.id !== base && row.id !== scoped && !row.id.startsWith(scoped + ':')) continue;
        result.push({key: row.id, reference: d.taskId, updatedAt: row.updated_at,
          photoCount: d.captures.length, measurementCount: d.measurements.length, description: null,
          hasCommand: !!d.command});
      } else {
        if (d.ownerId !== identity.actor || d.provenance?.environment !== identity.environment ||
            d.provenance?.session !== identity.scope || d.retired || typeof d.id !== 'string' || !d.id ||
            typeof d.description !== 'string' || !Array.isArray(d.photos)) continue;
        const partition = 'reporter-v2:' + JSON.stringify([identity.environment, identity.actor, identity.scope]);
        if (row.id !== 'reporter-pending-v3:' + partition && row.id !== 'reporter-pending-v2:' + partition &&
            !row.id.startsWith('reporter-command-v1:' + partition + ':')) continue;
        result.push({key: row.id, reference: d.id, updatedAt: row.updated_at, photoCount: d.photos.length,
          measurementCount: 0, description: d.description.slice(0, 2000),
          hasCommand: !!(d.submitRequested || d.request || d.resultReportId || d.commandOutcome || d.photos.some((p: {itemId?: string} | null) => p?.itemId))});
      }
    } catch { /* Unrecognized/corrupt rows stay intact, with no ownership adoption. */ }
  }
  check();
  return result;
}
