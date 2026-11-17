import { apiClient } from './client';
import { useAuthStore } from '../store/auth';
import { isDroneResourceId, operatorDatasetScope } from './droneDatasetWorkflow';
import { getOperatorSurveyTaskDetailReal, type DatasetDetailViewDto } from './droneApi';

export type OperatorDatasetRow = { id: string; surveyTaskId: string; versionNo: number; submittedAt: string | null; integrityStatus: string; version: string };
export type OperatorDatasetPage = { items: OperatorDatasetRow[]; nextCursor: string | null };
export type OperatorVideoSource = DatasetDetailViewDto['sourceFiles'][number];

/** In-memory continuity guard only. Every operation still requires current server authorization. */
export function operatorVideoGuard(scope: string) {
  let invalid = false;
  const check = () => { if (invalid || !scope || operatorDatasetScope() !== scope) throw Error('operator_video_session_changed'); };
  check();
  const close = useAuthStore.subscribe(() => { if (operatorDatasetScope() !== scope) invalid = true; });
  return { check, close };
}
async function readTask(taskId: string, projectId: string, check: () => void) {
  check();
  if (!isDroneResourceId(taskId) || !isDroneResourceId(projectId)) throw Error('operator_video_task_invalid');
  const task = await getOperatorSurveyTaskDetailReal(taskId); check();
  if (task.data.id !== taskId || task.data.projectId !== projectId || task.data.operatorId !== useAuthStore.getState().user?.id ||
      !task.data.version || task.etag !== `"${task.data.version}"`) throw Error('operator_video_assignment_changed');
  return task.data;
}
export async function listOperatorVideos(scope: string, taskId: string, projectId: string, cursor?: string | null): Promise<OperatorDatasetPage> {
  const guard = operatorVideoGuard(scope);
  try {
    await readTask(taskId, projectId, guard.check);
    if (cursor !== undefined && cursor !== null && (!cursor || cursor.length > 4096)) throw Error('operator_video_cursor_invalid');
    const result = await apiClient.get<OperatorDatasetPage>(`/survey-tasks/${encodeURIComponent(taskId)}/datasets?limit=25${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    guard.check();
    const page = result.data;
    if (!page || !Array.isArray(page.items) || page.items.length > 25 || page.items.some(row => !row || !isDroneResourceId(row.id) || row.surveyTaskId !== taskId || !row.version) ||
        !(page.nextCursor === null || typeof page.nextCursor === 'string' && page.nextCursor.length > 0 && page.nextCursor.length <= 4096)) throw Error('operator_video_page_invalid');
    await readTask(taskId, projectId, guard.check);
    return page;
  } finally { guard.close(); }
}
export async function readOperatorVideos(scope: string, taskId: string, projectId: string, datasetId: string) {
  const guard = operatorVideoGuard(scope);
  try {
    await readTask(taskId, projectId, guard.check);
    if (!isDroneResourceId(datasetId)) throw Error('operator_video_dataset_invalid');
    const response = await apiClient.get<DatasetDetailViewDto>(`/datasets/${encodeURIComponent(datasetId)}`); guard.check();
    const dataset = response.data;
    if (!dataset || dataset.id !== datasetId || dataset.surveyTaskId !== taskId || dataset.projectId !== projectId || !Array.isArray(dataset.sourceFiles)) throw Error('operator_video_source_mismatch');
    const videos = dataset.sourceFiles.filter(source => source.purpose === 'SURVEY_VIDEO');
    if (videos.some(source => !isDroneResourceId(source.fileId) || !Number.isSafeInteger(source.sizeBytes) || source.sizeBytes <= 0 || source.mediaType !== 'video/mp4') ||
        new Set(videos.map(source => source.fileId)).size !== videos.length) throw Error('operator_video_source_invalid');
    await readTask(taskId, projectId, guard.check);
    return { dataset, videos };
  } finally { guard.close(); }
}
export function operatorVideoError(error: unknown): string {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 401) return 'Phiên hết hạn. Vui lòng đăng nhập lại.';
  if (status === 403) return 'Bạn không còn quyền xem dữ liệu của nhiệm vụ này.';
  if (status === 404) return 'Không tìm thấy nhiệm vụ, bộ dữ liệu hoặc video.';
  if ((error as Error)?.message === 'operator_video_too_large') return 'Video vượt giới hạn xem tạm 256 MB trên điện thoại.';
  return 'Chưa mở được video đã gửi. Kiểm tra kết nối và quyền nhiệm vụ rồi thử lại.';
}
