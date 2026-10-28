import { useAuthStore } from '../store/auth';
import { API_BASE_URL } from './client';
import { passwordSessionIdentity } from './authApi';
import { getOperatorDatasetReal, getOperatorDatasetCoverageReal, getOperatorSurveyTaskDetailReal, type BandScopeDto } from './droneApi';

// Neither a seed ID nor a user-entered UUID proves an active aircraft assignment.
// Also requires immutable durable upload/dataset commands before reopening writes.
export const DRONE_TASK_COMMAND_BLOCK_REASON = 'Tạm khóa nhận/từ chối nhiệm vụ vì chưa có cơ chế lưu bền vững yêu cầu và đối soát kết quả sau gián đoạn. Bạn vẫn có thể đọc nhiệm vụ và gói công việc.';

export const DRONE_DATASET_BLOCK_REASON = 'Chưa có nguồn thiết bị bay đang hoạt động và cơ chế khôi phục yêu cầu nộp dữ liệu. Chức năng tải lên/nộp dữ liệu đang tạm khóa; tệp đã chọn vẫn ở thiết bị.';

export const isDroneResourceId = (value: unknown): value is string => typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) && value !== '00000000-0000-0000-0000-000000000000';

/** Continuity check only; server independently grants reads. No persisted tokens/PII. */
export function operatorDatasetScope(): string | null {
  const state = useAuthStore.getState();
  const identity = passwordSessionIdentity(state.token);
  if (!identity || !isDroneResourceId(state.user?.id) || JSON.parse(identity)[0] !== state.user.id ||
      state.user.role_code !== 'DRONE_OPERATOR' || state.user.must_change_password ||
      !['AUTHENTICATED', 'REFRESHING'].includes(state.status)) return null;
  return JSON.stringify([API_BASE_URL, identity]);
}

function requireScope(scope: string) {
  if (!scope || operatorDatasetScope() !== scope) throw Error('operator_session_changed');
}
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
function scopeKeys(scopes: BandScopeDto[]): string[] {
  if (!Array.isArray(scopes) || scopes.length === 0) throw Error('dataset_scope_missing');
  const keys = scopes.flatMap(s => {
    if (!s || !isDroneResourceId(s.routeVersionId) || !isDroneResourceId(s.segmentSetId) ||
        !['SURFACE', 'LEFT_EDGE', 'RIGHT_EDGE'].includes(s.targetBand) ||
        !Array.isArray(s.segmentIds) || s.segmentIds.length === 0 || !s.segmentIds.every(isDroneResourceId)) throw Error('dataset_scope_invalid');
    return s.segmentIds.map(segment => JSON.stringify([s.routeVersionId, s.segmentSetId, segment, s.targetBand]));
  });
  if (new Set(keys).size !== keys.length) throw Error('dataset_scope_duplicate');
  return keys.sort();
}

/** O-07/O-08 explicit GET readback. Never treats receipt/integrity as coverage PASS. */
export async function readOperatorDatasetReadback(scope: string, datasetId: string) {
  requireScope(scope);
  if (!isDroneResourceId(datasetId)) throw Error('invalid_dataset_id');
  const first = await getOperatorDatasetReal(datasetId);
  requireScope(scope);
  const dataset = first.data;
  const actorId = useAuthStore.getState().user?.id;
  if (!dataset || dataset.id !== datasetId || !isDroneResourceId(dataset.surveyTaskId) ||
      !isDroneResourceId(dataset.projectId) || !isDroneResourceId(dataset.dataVersionId) ||
      dataset.submittedBy !== actorId || !text(dataset.version) || first.etag !== `"${dataset.version}"` ||
      !text(dataset.integrityStatus) || !text(dataset.telemetryStatus)) throw Error('dataset_source_mismatch');
  const pins = scopeKeys(dataset.scope);
  const task = await getOperatorSurveyTaskDetailReal(dataset.surveyTaskId);
  requireScope(scope);
  if (task.data?.id !== dataset.surveyTaskId || task.data.operatorId !== actorId ||
      task.data.projectId !== dataset.projectId || !text(task.data.version) || task.etag !== `"${task.data.version}"` ||
      JSON.stringify(scopeKeys(task.data.scope)) !== JSON.stringify(pins)) throw Error('dataset_task_mismatch');
  const coverage = await getOperatorDatasetCoverageReal(datasetId);
  requireScope(scope);
  if (!coverage || coverage.datasetId !== datasetId || !text(coverage.methodVersion) ||
      !Array.isArray(coverage.items) || !coverage.items.length ||
      coverage.items.some(item => !item || !text(item.positionCoverage) || !text(item.qualityCoverage) ||
        !text(item.overallCoverage) || !Array.isArray(item.reasons) || !item.reasons.every(text)) ||
      JSON.stringify(scopeKeys(coverage.items.map(item => item.scope))) !== JSON.stringify(pins)) throw Error('coverage_source_mismatch');
  const final = await getOperatorDatasetReal(datasetId);
  requireScope(scope);
  if (final.data?.id !== datasetId || final.data.version !== dataset.version || final.etag !== first.etag ||
      final.data.projectId !== dataset.projectId || final.data.surveyTaskId !== dataset.surveyTaskId ||
      final.data.submittedBy !== actorId || JSON.stringify(scopeKeys(final.data.scope)) !== JSON.stringify(pins)) throw Error('dataset_source_changed');
  return { dataset, coverage };
}
