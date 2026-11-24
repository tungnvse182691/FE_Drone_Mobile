import { initDatabase, openDatabase } from './database';

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
  const rows = await db.getAllAsync<{id: string; payload: string; updated_at: string}>(
    'SELECT id, payload, updated_at FROM local_draft WHERE kind = ? ORDER BY updated_at DESC, id',
    identity.role === 'REPAIR_CREW' ? 'T05B_FIELD' : 'reporter_pending_v1');
  check();
  const result: LocalDraftSummary[] = [];
  for (const row of rows) {
    try {
      const d = JSON.parse(row.payload);
      if (!d || !Number.isFinite(Date.parse(row.updated_at))) continue;
      if (identity.role === 'REPAIR_CREW') {
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
