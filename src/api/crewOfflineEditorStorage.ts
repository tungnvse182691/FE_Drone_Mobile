import { openDatabase, initDatabase } from '../offline/database';
import { sameQueueIdentity, type QueueIdentity } from '../offline/upload-queue';
import { isCrewResourceId, validateCrewTaskDetail, type CrewTask } from './crewApi';

export const CREW_EDITOR_SOURCE_KIND = 'CREW_FIELD_EDITOR_SOURCE_V1';

export const crewEditorSourceKey = (identity: QueueIdentity, projectId: string, taskId: string) =>
  `crew-editor:${JSON.stringify([identity.environment, identity.actor, identity.scope, projectId, taskId])}`;

export interface CrewSnapshotBinding {
  taskVersion: string;
  assignmentId: string;
  originalActorId: string;
}

/** Shared validated reader for retained API-080 editor source.
 * Enforces actor/session/environment, project/task, ETag, and snapshot binding parity. */
export async function readValidatedCrewEditorTask(
  identity: QueueIdentity,
  projectId: string,
  taskId: string,
  snapshot: CrewSnapshotBinding,
): Promise<CrewTask> {
  if (!sameQueueIdentity(identity) || identity.role !== 'REPAIR_CREW' ||
      !isCrewResourceId(projectId) || !isCrewResourceId(taskId)) {
    throw Error('crew_editor_session_changed');
  }
  const db = openDatabase();
  await initDatabase(db);
  const row = await db.getFirstAsync<{ payload: string }>(
    'SELECT payload FROM local_draft WHERE id=? AND kind=?',
    crewEditorSourceKey(identity, projectId, taskId),
    CREW_EDITOR_SOURCE_KIND,
  );
  if (!sameQueueIdentity(identity) || !row) throw Error('crew_editor_source_missing');
  const saved = JSON.parse(row.payload) as { identity: QueueIdentity; task: CrewTask };
  if (!sameQueueIdentity(saved.identity, identity) || saved.task.projectId !== projectId ||
      saved.task.id !== taskId || !saved.task.detail || !saved.task.etag ||
      saved.task.isHistory || saved.task.assignmentStatus === 'REJECTED') {
    throw Error('crew_editor_source_invalid');
  }
  validateCrewTaskDetail(saved.task.detail, saved.task.etag, projectId, taskId, identity.actor);
  if (!sameQueueIdentity(identity) ||
      saved.task.detail.version !== snapshot.taskVersion ||
      saved.task.detail.assignmentId !== snapshot.assignmentId ||
      saved.task.detail.assignedToUserId !== snapshot.originalActorId) {
    throw Error('crew_editor_snapshot_changed');
  }
  return saved.task;
}
