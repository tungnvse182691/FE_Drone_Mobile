import { apiClient } from './client';
import { passwordSessionIdentity } from './authApi';
import { useAuthStore } from '../store/auth';

const isResourceId = (v: unknown): v is string => typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) && v !== '00000000-0000-0000-0000-000000000000';

export interface MobileNotification {
  id: string; message: string; resourceId: string | null; read: boolean; occurredAt: string; version: string;
  priority?: string | null; priorityPolicy?: string | null; priorityReasonCode?: string | null; priorityEvaluatedAt?: string | null;
}
export interface MobileNotificationPage { items: MobileNotification[]; nextCursor: string | null; asOf: string }
export interface MobileNotificationScope {
  notificationId: string; projectId: string | null; occurrenceId: string | null;
  classification: string; sourceKind: string; sourceId: string; eventType: string; resolverVersion: string;
  title?: string | null; priorityPolicy?: string; senderKind?: string;
  deadlines?: Array<{ clockId: string; dueAt: string; completedAt: string | null }> | null;
  eventCode?: string | null; taskId?: string | null; taskProjectId?: string | null;
  datasetId?: string | null; assessmentId?: string | null;
  priority?: string; priorityReasonCode?: string | null; priorityEvaluatedAt?: string | null;
}
export type MobileNotificationTarget =
  | { kind: 'crew-task' | 'operator-task'; taskId: string; projectId: string }
  | { kind: 'operator-assessment'; taskId: string; projectId: string; datasetId: string; assessmentId: string };

/** No write caller until a dedicated fixture and durable immutable replay are approved. */
export const notificationMarkReadCapability = Object.freeze({ enabled: false, reason: 'FIXTURE_AND_DURABLE_JOURNAL_REQUIRED' });

function identity() {
  const s = useAuthStore.getState(), session = passwordSessionIdentity(s.token);
  if (!session || !s.user || JSON.parse(session)[0] !== s.user.id || s.user.must_change_password ||
      !['REPAIR_CREW','DRONE_OPERATOR'].includes(s.user.role_code) || !['AUTHENTICATED','REFRESHING'].includes(s.status)) return null;
  return JSON.stringify([apiClient.defaults.baseURL, session, s.user.role_code]);
}
function guard() {
  const key = identity();
  if (!key) throw Error('notification_session_invalid');
  let invalid = false;
  const close = useAuthStore.subscribe(() => { if (identity() !== key) invalid = true; });
  const check = () => { if (invalid || identity() !== key) throw Error('notification_session_changed'); };
  return { check, close, role: useAuthStore.getState().user!.role_code };
}
function validateNotification(n: MobileNotification) {
  if (!n || !isResourceId(n.id) || !n.version || typeof n.message !== 'string' || typeof n.read !== 'boolean' ||
      !Number.isFinite(Date.parse(n.occurredAt)) || n.resourceId != null && !isResourceId(n.resourceId)) throw Error('notification_invalid');
}
function resource(id: string) {
  if (!isResourceId(id)) throw Error('notification_id_invalid');
  return `/notifications/${encodeURIComponent(id)}`;
}
/** No persisted cache: every page is subject to current server visibility. */
export async function listNotifications(cursor?: string | null, limit = 25): Promise<MobileNotificationPage> {
  const g = guard();
  try {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 || cursor != null && (!cursor || cursor.length > 4096)) throw Error('notification_query_invalid');
    const response = await apiClient.get<MobileNotificationPage>(`/notifications?limit=${limit}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`); g.check();
    const p = response.data;
    if (!p || !Array.isArray(p.items) || p.items.length > limit || !Number.isFinite(Date.parse(p.asOf)) ||
        !(p.nextCursor === null || typeof p.nextCursor === 'string' && !!p.nextCursor && p.nextCursor.length <= 4096)) throw Error('notification_page_invalid');
    p.items.forEach(validateNotification);
    return p;
  } finally { g.close(); }
}
export async function readNotification(id: string): Promise<{ data: MobileNotification; etag: string }> {
  const g = guard();
  try {
    const response = await apiClient.get<MobileNotification>(resource(id)); g.check();
    validateNotification(response.data);
    const etag = response.headers?.etag;
    if (response.data.id !== id || etag !== `"${response.data.version}"`) throw Error('notification_etag_invalid');
    return { data: response.data, etag };
  } finally { g.close(); }
}
export async function readNotificationScope(id: string): Promise<MobileNotificationScope> {
  const g = guard();
  try {
    const response = await apiClient.get<MobileNotificationScope>(`${resource(id)}/scope`); g.check();
    const s = response.data;
    if (!s || s.notificationId !== id || !isResourceId(s.sourceId) ||
        ![s.classification,s.sourceKind,s.eventType,s.resolverVersion].every(v => typeof v === 'string' && !!v) ||
        [s.projectId,s.occurrenceId,s.taskId,s.taskProjectId,s.datasetId,s.assessmentId].some(v => v != null && !isResourceId(v))) throw Error('notification_scope_invalid');
    return s;
  } finally { g.close(); }
}
/** Resolve immediately before a future UI opens a target; never reuse a previous scope after denial.
 * Message, resourceId and eventType are display/trace data, never business routing inputs.
 */
export async function readNotificationTarget(id: string): Promise<MobileNotificationTarget | null> {
  const g = guard();
  try {
    await readNotification(id); g.check();
    const s = await readNotificationScope(id); g.check();
    if (!s.taskId || !s.taskProjectId || s.projectId !== s.taskProjectId || !s.eventCode) return null;
    const base = { taskId: s.taskId, projectId: s.taskProjectId };
    if (g.role === 'REPAIR_CREW') {
      const field = ['field.task.assigned.v1','field.task.submitted.v1','field.task.supplement_requested.v1'].includes(s.eventCode) &&
        ['FieldTask','FieldInspectionTask'].includes(s.sourceKind) && s.sourceId === s.taskId;
      const repair = ['repair.work.assigned.v1','repair.work.submitted.v1','repair.work.rework_requested.v1','repair.work.fast_track_confirmed.v1'].includes(s.eventCode) && s.sourceKind === 'RepairWork';
      return field || repair ? { kind: 'crew-task', ...base } : null;
    }
    if (s.sourceKind !== 'SurveyTask' || s.sourceId !== s.taskId) return null;
    if (s.eventCode === 'survey.dataset.assessed.v1') return s.datasetId && s.assessmentId ? { kind: 'operator-assessment', ...base, datasetId: s.datasetId, assessmentId: s.assessmentId } : null;
    return ['survey.task.assigned.v1','survey.task.submitted.v1','survey.task.supplement_requested.v1'].includes(s.eventCode) ? { kind: 'operator-task', ...base } : null;
  } finally { g.close(); }
}
