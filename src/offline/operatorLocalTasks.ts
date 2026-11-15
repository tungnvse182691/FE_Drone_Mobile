import { initDatabase, openDatabase } from './database';

export interface LocalOperatorTask {
  id: string;
  status: string;
  cachedAt: string;
  segmentCount: number;
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
