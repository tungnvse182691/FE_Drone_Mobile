import { reporterContext, assertReporterContext, openReporterRecoveryPartition } from './uploads';
import { fetchMe } from '../api/authApi';
import { getOwnReportReal } from '../api/reporterApi';
import { openDatabase, initDatabase, getDraftsByKind } from '../offline/database';
import type { ReporterDraft } from './reporter';

export interface HistoricalReporterCommand { id: string; kind: 'create' | 'supplement' }
let database: ReturnType<typeof openDatabase> | undefined;
let initialized: Promise<void> | undefined;
async function candidates() {
  const context = reporterContext();
  if (!context.ownerId || !context.session) throw new Error('auth_required');
  const me = await fetchMe();
  assertReporterContext(context);
  if (me.id !== context.ownerId || me.role !== 'REPORTER') throw new Error('access_forbidden');
  const db = database ?? (database = openDatabase());
  await (initialized ?? (initialized = initDatabase(db).catch(error => { initialized = undefined; throw error; })));
  assertReporterContext(context);
  const rows = await getDraftsByKind<ReporterDraft>(db, 'reporter_pending_v1');
  assertReporterContext(context);
  return { context, rows: rows.filter(({ payload: p }) => p && !p.retired && p.ownerId === context.ownerId &&
    p.provenance?.environment === context.environment && p.provenance.session && p.provenance.session !== context.session &&
    (p.submitRequested || p.request || p.resultReportId || p.commandOutcome || p.photos?.some(photo => photo.itemId))) };
}

/** No payload, media URI, key or signed URL leaves this read-only module. */
export async function listHistoricalReporterCommands(): Promise<HistoricalReporterCommand[]> {
  const { rows } = await candidates();
  return rows.map(row => ({ id: row.payload.id, kind: row.payload.targetReportId ? 'supplement' : 'create' }));
}

/** Explicit user choice; read and authenticate only. Sending requires a second
 * action in the existing form, with the original body, key and upload ledger. */
export async function openHistoricalReporterCommand(id: string, isCurrent: () => boolean = () => true): Promise<{ kind: 'create' | 'supplement'; reportId?: string; isCurrent: () => boolean }> {
  const { context, rows } = await candidates();
  const row = rows.find(row => row.payload.id === id);
  if (!row) throw { code: 'access_forbidden', status: 403 };
  const draft = row.payload;
  const partition = `reporter-v2:${JSON.stringify([context.environment, context.ownerId, draft.provenance.session])}`;
  if (row.id !== `reporter-pending-v3:${partition}` && row.id !== `reporter-pending-v2:${partition}`)
    throw { code: 'source_not_ready' };
  if (draft.targetReportId) {
    const found = await getOwnReportReal(draft.targetReportId);
    assertReporterContext(context);
    if (found.report.id !== draft.targetReportId) throw { code: 'access_forbidden', status: 403 };
  }
  assertReporterContext(context);
  if (!isCurrent()) throw { code: 'submission_paused' };
  openReporterRecoveryPartition(context, draft.provenance.session!);
  const openedContext = reporterContext();
  const stillCurrent = () => { try { assertReporterContext(openedContext); return true; } catch { return false; } };
  return draft.targetReportId ? { kind: 'supplement', reportId: draft.targetReportId, isCurrent: stillCurrent }
    : { kind: 'create', isCurrent: stillCurrent };
}

export async function checkHistoricalReporterCommand(id: string): Promise<{ status: 'BE_RECEIPT_REQUIRED'; resourceReadable: boolean }> {
  const { context, rows } = await candidates();
  const row = rows.find(row => row.payload.id === id);
  if (!row) throw new Error('access_forbidden');
  const reportId = row.payload.resultReportId ?? row.payload.targetReportId;
  let resourceReadable = false;
  if (reportId) {
    const found = await getOwnReportReal(reportId);
    assertReporterContext(context);
    resourceReadable = found.report.id === reportId;
  }
  // Reading the resource does not prove that this particular command committed.
  // Keep UNKNOWN untouched until an authoritative command receipt is available.
  return { status: 'BE_RECEIPT_REQUIRED', resourceReadable };
}
