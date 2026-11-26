import { openDatabase, initDatabase } from '../offline/database';
import { sameQueueIdentity, type QueueIdentity } from '../offline/upload-queue';
import { isCrewResourceId, validateCrewTaskDetail, type CrewTask } from './crewApi';
import { readOfflineCrewTask } from './crewOfflineField';
import { CREW_EDITOR_SOURCE_KIND, crewEditorSourceKey, readValidatedCrewEditorTask } from './crewOfflineEditorStorage';

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
  const id = crewEditorSourceKey(identity, task.projectId, task.id);
  await db.withExclusiveTransactionAsync(async tx => {
    if (!sameQueueIdentity(identity)) throw Error('crew_editor_session_changed');
    const now = new Date().toISOString();
    await tx.runAsync('INSERT OR REPLACE INTO local_draft (id,kind,payload,created_at,updated_at) VALUES (?,?,?,?,?)',
      id, CREW_EDITOR_SOURCE_KIND, JSON.stringify({identity, task}), now, now);
    if (!sameQueueIdentity(identity)) throw Error('crew_editor_session_changed');
  });
}

/** Only the exact authenticated actor/session/environment and current reconciled
 * snapshot may reopen the saved editor. A stale task version cannot be used. */
export async function readCrewEditorSource(identity: QueueIdentity, projectId: string, taskId: string): Promise<CrewTask> {
  if (!sameQueueIdentity(identity) || identity.role !== 'REPAIR_CREW' ||
      !isCrewResourceId(projectId) || !isCrewResourceId(taskId)) throw Error('crew_editor_session_changed');
  const source = await readOfflineCrewTask(identity, projectId, taskId);
  return readValidatedCrewEditorTask(identity, projectId, taskId, source.snapshot);
}
