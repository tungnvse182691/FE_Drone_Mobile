import { openDatabase, initDatabase } from '../offline/database';
import { currentQueueIdentity, sameQueueIdentity, type QueueIdentity } from '../offline/upload-queue';
import { isCrewResourceId, validateCrewTaskDetail, type CrewTask } from './crewApi';
import { readOfflineCrewTask } from './crewOfflineField';

const KIND = 'CREW_FIELD_EDITOR_SOURCE_V1';
const key = (identity: QueueIdentity, projectId: string, taskId: string) =>
  `crew-editor:${JSON.stringify([identity.environment, identity.actor, identity.scope, projectId, taskId])}`;

/** API-080 is retained for editing after a transport failure. It never grants
 * server mutation authority; the signed producer still reads its own snapshot. */
export async function retainCrewEditorSource(identity: QueueIdentity, task: CrewTask): Promise<void> {
  if (!sameQueueIdentity(identity) || identity.role !== 'REPAIR_CREW' || !task.detail || !task.etag ||
      !isCrewResourceId(task.projectId) || !isCrewResourceId(task.id)) throw Error('crew_editor_source_invalid');
  validateCrewTaskDetail(task.detail, task.etag, task.projectId, task.id, identity.actor);
  const source = await readOfflineCrewTask(identity, task.projectId, task.id);
  if (task.detail.version !== source.snapshot.taskVersion ||
      task.detail.assignmentId !== source.snapshot.assignmentId ||
      task.detail.assignedToUserId !== source.snapshot.originalActorId) throw Error('crew_editor_snapshot_changed');
  const db = openDatabase(); await initDatabase(db);
  if (!sameQueueIdentity(identity)) throw Error('crew_editor_session_changed');
  const id = key(identity, task.projectId, task.id);
  await db.withExclusiveTransactionAsync(async tx => {
    if (!sameQueueIdentity(identity)) throw Error('crew_editor_session_changed');
    const now = new Date().toISOString();
    await tx.runAsync('INSERT OR REPLACE INTO local_draft (id,kind,payload,created_at,updated_at) VALUES (?,?,?,?,?)',
      id, KIND, JSON.stringify({identity, task}), now, now);
    if (!sameQueueIdentity(identity)) throw Error('crew_editor_session_changed');
  });
}

/** Only the exact authenticated actor/session/environment and current reconciled
 * snapshot may reopen the saved editor. A stale task version cannot be used. */
export async function readCrewEditorSource(identity: QueueIdentity, projectId: string, taskId: string): Promise<CrewTask> {
  if (!sameQueueIdentity(identity) || identity.role !== 'REPAIR_CREW' ||
      !isCrewResourceId(projectId) || !isCrewResourceId(taskId)) throw Error('crew_editor_session_changed');
  const db = openDatabase(); await initDatabase(db);
  const row = await db.getFirstAsync<{payload:string}>('SELECT payload FROM local_draft WHERE id=? AND kind=?',
    key(identity, projectId, taskId), KIND);
  if (!sameQueueIdentity(identity) || !row) throw Error('crew_editor_source_missing');
  const saved = JSON.parse(row.payload) as {identity:QueueIdentity;task:CrewTask};
  if (!sameQueueIdentity(saved.identity, identity) || saved.task.projectId !== projectId ||
      saved.task.id !== taskId || !saved.task.detail || !saved.task.etag ||
      saved.task.isHistory || saved.task.assignmentStatus === 'REJECTED') throw Error('crew_editor_source_invalid');
  validateCrewTaskDetail(saved.task.detail, saved.task.etag, projectId, taskId, identity.actor);
  const source = await readOfflineCrewTask(identity, projectId, taskId);
  if (!sameQueueIdentity(identity) || saved.task.detail.version !== source.snapshot.taskVersion ||
      saved.task.detail.assignmentId !== source.snapshot.assignmentId ||
      saved.task.detail.assignedToUserId !== source.snapshot.originalActorId) throw Error('crew_editor_snapshot_changed');
  return saved.task;
}
