import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { DroneDatasetReadbackPanel } from '../../src/components/drone/DroneDatasetReadbackPanel';
import { useAuthStore } from '../../src/store/auth';
import { apiClient } from '../../src/api/client';
import { operatorTaskDisplayCode, operatorTaskStatusLabel } from '../../src/api/operator-task-view';
import { passwordSessionIdentity } from '../../src/api/authApi';
import { listOperatorSurveyTasksReal, type SurveyTaskV2ResponseDto, getOperatorUploadSessionReal, getOperatorSurveyTaskDetailReal } from '../../src/api/droneApi';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

const uuid = (s: unknown): s is string => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) && s !== '00000000-0000-0000-0000-000000000000';
const STATUS_LABELS: Record<string, string> = {
  pending: 'Đang chờ', uploading: 'Đang tải lên', verifying: 'Đang xác minh',
  complete_requested: 'Đang chờ xác minh', verified: 'Đã xác minh tệp', failed: 'Tệp bị lỗi',
};
/** Session identity is memory-only; no operational history is inferred from local samples. */
export function operatorLogScope(): string | null {
  const s = useAuthStore.getState(), identity = passwordSessionIdentity(s.token);
  if (!identity || !uuid(s.user?.id) || JSON.parse(identity)[0] !== s.user.id ||
      s.user.role_code !== 'DRONE_OPERATOR' || s.user.must_change_password ||
      !['AUTHENTICATED', 'REFRESHING'].includes(s.status)) return null;
  return JSON.stringify([apiClient?.defaults?.baseURL ?? null, identity]);
}
function requireScope(scope: string) {
  if (operatorLogScope() !== scope) throw Error('operator_session_changed');
}
/** O-08/API-226/API-234: explicit authorized GET only. UUID input is never authorization proof. */
export async function readOperatorLogResource(scope: string, kind: 'task' | 'upload', id: string) {
  requireScope(scope);
  if (!uuid(id)) throw Error('invalid_id');
  const result = kind === 'upload' ? await getOperatorUploadSessionReal(id)
    : (await getOperatorSurveyTaskDetailReal(id)).data;
  requireScope(scope);
  if (!result || result.id !== id || typeof result.status !== 'string' || !result.status.trim())
    throw Error('readback_identity_or_status_missing');
  if (kind === 'task') {
    if (!('operatorId' in result) || result.operatorId !== useAuthStore.getState().user?.id || !uuid(result.projectId) || typeof result.version !== 'string' || !result.version)
      throw Error('task_owner_or_identity_mismatch');
  } else if (!('fileId' in result) || !uuid(result.fileId)) throw Error('readback_identity_missing');
  return result;
}
export default function DroneLogScreen() {
  useAuthStore(s => s.token); useAuthStore(s => s.user); useAuthStore(s => s.status);
  const scope = operatorLogScope();
  if (!scope) return <SafeAreaScreen header={<AppHeader subtitle="Nhật ký" />}><Text>Cần phiên Operator hợp lệ.</Text></SafeAreaScreen>;
  return <DroneLogContent key={scope} scope={scope} />;
}
function DroneLogContent({ scope }: { scope: string }) {
  const [tasks, setTasks] = useState<SurveyTaskV2ResponseDto[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [listRevision, setListRevision] = useState(0);
  const [taskId, setTaskId] = useState(''), [uploadId, setUploadId] = useState('');
  const [taskText, setTaskText] = useState<string | null>(null), [uploadText, setUploadText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const mounted = useRef(true), lock = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const active = () => mounted.current && operatorLogScope() === scope;
  useEffect(() => {
    let cancelled = false;
    setListError(null);
    void listOperatorSurveyTasksReal(null, 50).then(page => {
      if (!cancelled && active()) setTasks(page.items);
    }).catch(() => { if (!cancelled && active()) setListError('Chưa đọc được danh sách nhiệm vụ.'); });
    return () => { cancelled = true; };
  }, [scope, listRevision]);
  const check = async (kind: 'task' | 'upload') => {
    if (lock.current || !active()) return;
    lock.current = true; setBusy(true); setError(null);
    const id = (kind === 'task' ? taskId : uploadId).trim();
    if (kind === 'task') setTaskText(null); else setUploadText(null);
    try {
      const result = await readOperatorLogResource(scope, kind, id);
      if (!active()) return;
      if (kind === 'upload') {
        // A server upload status is not a flight receipt, dataset acceptance or repair completion.
        setUploadText(`Phiên ${result.id}: ${STATUS_LABELS[result.status.toLowerCase()] ?? 'Trạng thái chưa được hỗ trợ'}`);
      } else setTaskText(`Nhiệm vụ ${result.id}: ${result.status}`);
    } catch (e) {
      if (!active()) return;
      const status = (e as { response?: { status?: number } }).response?.status;
      setError(status === 401 ? 'Phiên hết hạn. Vui lòng đăng nhập lại.' : status === 403 ? 'Bạn không có quyền đọc dữ liệu này.' : status === 404 ? 'Không tìm thấy dữ liệu.' : 'Chưa đọc được dữ liệu. Kiểm tra mã định danh, kết nối và thử lại.');
    } finally {
      lock.current = false;
      if (active()) setBusy(false);
    }
  };
  return <SafeAreaScreen scroll header={<AppHeader subtitle="Nhật ký" />}>
    <View style={styles.tabs}>
      <Pressable onPress={() => router.push('/(drone)/requests')} accessibilityRole="button"><Text style={typography.labelSm}>Yêu cầu mới</Text></Pressable>
      <Text style={[typography.labelSm, styles.active]}>Nhật ký chuyến bay</Text>
    </View>
    <Card style={styles.card}>
      <Text style={typography.titleMd}>Lịch sử chuyến bay</Text>
      <Text style={typography.bodyMd}>Chưa có nguồn lịch sử chuyến bay từ máy chủ. Không có dữ liệu để hiển thị.</Text>
      <Text style={typography.caption}>Trạng thái nhiệm vụ và phiên tải lên được đọc riêng bên dưới; không thay thế lịch sử bay hoặc biên nhận nộp bộ dữ liệu.</Text>
    </Card>
    <Card style={styles.card}>
      <Text style={typography.titleMd}>Nhiệm vụ được giao</Text>
      <Text style={typography.caption}>Danh sách đã tải, tối đa 50 nhiệm vụ. Chọn để xem trạng thái và phạm vi hiện hành.</Text>
      {tasks.map(task => <Pressable key={task.id} accessibilityRole="button" onPress={() => { if (active()) router.push(`/(drone)/request-detail?taskId=${encodeURIComponent(task.id)}`); }}>
        <Text style={typography.labelLg}>{operatorTaskDisplayCode(task.id)}</Text>
        <Text style={typography.bodyMd}>{operatorTaskStatusLabel(task.status)}</Text>
      </Pressable>)}
      {!tasks.length ? <Text>Chưa có nhiệm vụ trong danh sách đã tải.</Text> : null}
      {listError ? <Text accessibilityRole="alert">{listError}</Text> : null}
      <Button title="Đọc lại danh sách" variant="secondary" onPress={() => setListRevision(v => v + 1)} />
    </Card>
    <Button title={advanced ? 'Ẩn tra cứu nâng cao' : 'Tra cứu nâng cao bằng mã máy chủ'} variant="secondary" onPress={() => setAdvanced(v => !v)} />
    {advanced ? <>
    <Card style={styles.card}>
      <Text style={typography.titleMd}>Đọc lại nhiệm vụ</Text>
      <TextInput style={styles.input} accessibilityLabel="Mã nhiệm vụ máy chủ" placeholder="UUID nhiệm vụ" value={taskId} editable={!busy} autoCapitalize="none" onChangeText={value => { setTaskId(value); setTaskText(null); setError(null); }} />
      <Button title="Đọc trạng thái nhiệm vụ" variant="secondary" disabled={busy || !uuid(taskId.trim())} onPress={() => void check('task')} />
      {taskText ? <Text style={typography.bodyMd}>{taskText}</Text> : null}
    </Card>
    <Card style={styles.card}>
      <Text style={typography.titleMd}>Kiểm tra tải lên</Text>
      <TextInput style={styles.input} accessibilityLabel="Mã phiên tải lên máy chủ" placeholder="UUID phiên tải lên" value={uploadId} editable={!busy} autoCapitalize="none" onChangeText={value => { setUploadId(value); setUploadText(null); setError(null); }} />
      <Button title="Kiểm tra trạng thái tệp" variant="secondary" disabled={busy || !uuid(uploadId.trim())} onPress={() => void check('upload')} />
      {uploadText ? <Text style={typography.bodyMd}>{uploadText}</Text> : null}
    </Card>
    <DroneDatasetReadbackPanel />
    </> : null}
    {busy ? <Text>Đang đọc dữ liệu máy chủ…</Text> : null}
    {error ? <Text accessibilityRole="alert">{error}</Text> : null}
  </SafeAreaScreen>;
}
const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md },
  active: { color: colors.primaryDark },
  card: { marginBottom: spacing.md, gap: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, color: colors.neutral },
});
