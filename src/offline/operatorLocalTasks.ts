import { initDatabase, openDatabase } from './database';
import type { SurveyTaskWorkPackageDto } from '../api/droneApi';

export interface LocalOperatorTask {
  id: string;
  status: string;
  cachedAt: string;
  segmentCount: number;
}

export interface LocalOperatorWork {
  taskId: string;
  cachedAt: string;
  dueAt: string | null;
  access: [number, number] | null;
  segmentCount: number;
  bands: string[];
}

/** Local projection of API-225 only; no ETag, server version or write capability. */
export async function loadLocalOperatorWork(scope: string, taskId: string, current: () => boolean): Promise<LocalOperatorWork | null> {
  const [, identity] = JSON.parse(scope), [actor] = JSON.parse(identity);
  const resource = `work:${taskId}`, id = JSON.stringify(['operator_read_v1', scope, resource]);
  const check = () => { if (!actor || !current()) throw Error('local_session_changed'); };
  check();
  const db = openDatabase(); await initDatabase(db); check();
  const row = await db.getFirstAsync<{data: string; cached_at: string}>('SELECT data, cached_at FROM task_cache WHERE id = ? AND kind = ?', id, 'operator_read_v1');
  check();
  if (!row) return null;
  try {
    const saved = JSON.parse(row.data), work = saved.value?.data as SurveyTaskWorkPackageDto;
    if (saved.schema !== 1 || saved.scope !== scope || saved.resource !== resource || !Number.isFinite(Date.parse(row.cached_at)) ||
        work?.task?.id !== taskId || work.task.operatorId !== actor || !Array.isArray(work.geometryRefs) || !Array.isArray(work.task.scope)) return null;
    const point = work.accessPoint?.point;
    const access: [number, number] | null = point && Number.isFinite(point.longitude) && Math.abs(point.longitude)<=180 && Number.isFinite(point.latitude) && Math.abs(point.latitude)<=90 ? [point.longitude,point.latitude] : null;
    return {taskId,cachedAt:row.cached_at,dueAt:work.dueAt && Number.isFinite(Date.parse(work.dueAt)) ? work.dueAt : null,access,
      segmentCount:work.geometryRefs.reduce((sum,ref)=>sum+(Array.isArray(ref.segmentIds)?ref.segmentIds.length:0),0),
      bands:[...new Set(work.task.scope.map(b=>b.targetBand).filter(b=>typeof b==='string'))]};
  } catch { return null; }
}

/** Projection of already authorized GETs. No tokens, versions, ETags or mutation payloads. */
export async function loadLocalOperatorTasks(scope: string, current: () => boolean): Promise<LocalOperatorTask[]> {
  const [environment, identity] = JSON.parse(scope);
  const [actor] = JSON.parse(identity);
  if (!environment || !actor || !current()) throw Error('local_session_changed');
  const db = openDatabase();
  await initDatabase(db);
  if (!current()) throw Error('local_session_changed');
  const rows = await db.getAllAsync<{id: string; data: string; cached_at: string}>(
    'SELECT id, data, cached_at FROM task_cache WHERE kind = ?', 'operator_read_v1');
  if (!current()) throw Error('local_session_changed');
  const tasks = new Map<string, LocalOperatorTask>();
  for (const row of rows) {
    try {
      const saved = JSON.parse(row.data);
      if (saved.schema !== 1 || saved.scope !== scope ||
          row.id !== JSON.stringify(['operator_read_v1', scope, saved.resource]) ||
          !Number.isFinite(Date.parse(row.cached_at))) continue;
      const resource: string = saved.resource;
      const items = resource.startsWith('tasks:') ? saved.value.items :
        resource.startsWith('task:') ? [saved.value.data] : [];
      if (!Array.isArray(items)) continue;
      for (const task of items) {
        if (task?.operatorId !== actor || typeof task.id !== 'string' || !task.id ||
            typeof task.status !== 'string' || !Array.isArray(task.scope) ||
            resource.startsWith('task:') && resource !== `task:${task.id}`) continue;
        const previous = tasks.get(task.id);
        if (previous && Date.parse(previous.cachedAt) >= Date.parse(row.cached_at)) continue;
        tasks.set(task.id, {id: task.id, status: task.status, cachedAt: row.cached_at,
          segmentCount: task.scope.reduce((sum: number, band: {segmentIds?: unknown[]}) =>
            sum + (Array.isArray(band.segmentIds) ? band.segmentIds.length : 0), 0)});
      }
    } catch { /* Corrupt snapshots do not expose unvalidated content. */ }
  }
  return [...tasks.values()].sort((a, b) => b.cachedAt.localeCompare(a.cachedAt));
}
