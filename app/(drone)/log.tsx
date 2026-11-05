import { useOperatorTaskPages } from '../../src/hooks/useOperatorTaskPages';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { DroneDatasetReadbackPanel } from '../../src/components/drone/DroneDatasetReadbackPanel';
import { DroneTaskRecoveryList } from '../../src/components/drone/DroneTaskCommandPanel';
import { useOperatorReadScope } from '../../src/hooks/useOperatorReadScope';
import { useAuthStore } from '../../src/store/auth';
import { apiClient } from '../../src/api/client';
import { operatorTaskDisplayCode, operatorTaskStatusLabel } from '../../src/api/operator-task-view';
import { OperatorTaskRow } from '../../src/components/drone/OperatorTaskRow';
import { passwordSessionIdentity } from '../../src/api/authApi';
import { getOperatorUploadSessionReal, getOperatorSurveyTaskDetailReal } from '../../src/api/droneApi';
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
  let invalidated = false;
  const unsubscribe = useAuthStore.subscribe(() => { if (operatorLogScope() !== scope) invalidated = true; });
  try {
  const result = kind === 'upload' ? await getOperatorUploadSessionReal(id)
    : (await getOperatorSurveyTaskDetailReal(id)).data;
  if (invalidated) throw Error('operator_session_changed');
  requireScope(scope);
  if (!result || result.id !== id || typeof result.status !== 'string' || !result.status.trim())
    throw Error('readback_identity_or_status_missing');
  if (kind === 'task') {
    if (!('operatorId' in result) || result.operatorId !== useAuthStore.getState().user?.id || !uuid(result.projectId) || typeof result.version !== 'string' || !result.version)
      throw Error('task_owner_or_identity_mismatch');
  } else if (!('fileId' in result) || !uuid(result.fileId)) throw Error('readback_identity_missing');
  return result;
  } finally { unsubscribe(); }
}
export default function DroneLogScreen() {
  useAuthStore(s => s.token); useAuthStore(s => s.user); useAuthStore(s => s.status);
  const scope = operatorLogScope();
  if (!scope) return <SafeAreaScreen header={<AppHeader subtitle="Nhật ký" variant="operatorCompact" />}><Text>Cần phiên Operator hợp lệ.</Text></SafeAreaScreen>;
  return <DroneLogContent key={scope} scope={scope} />;
}
function DroneLogContent({ scope }: { scope: string }) {
  const readScope = useOperatorReadScope('log');
  const pages = useOperatorTaskPages();
  const { tasks, error: listError } = pages;
  const [advanced, setAdvanced] = useState(false);
  const [taskId, setTaskId] = useState(''), [uploadId, setUploadId] = useState('');
  const [taskText, setTaskText] = useState<string | null>(null), [uploadText, setUploadText] = useState<string | null>(null);
  const [showFullUploadId, setShowFullUploadId] = useState(false);
  const [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const mounted = useRef(true), lock = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const active = () => mounted.current && operatorLogScope() === scope;
  const check = async (kind: 'task' | 'upload') => {
    const isCurrent = readScope.capture();
    if (lock.current || !active() || !isCurrent()) return;
    lock.current = true; setBusy(true); setError(null);
    const id = (kind === 'task' ? taskId : uploadId).trim();
    if (kind === 'task') setTaskText(null); else setUploadText(null);
    try {
      const result = await readOperatorLogResource(scope, kind, id);
      if (!active() || !isCurrent()) return;
      if (kind === 'upload') {
        // A server upload status is not a flight receipt, dataset acceptance or repair completion.
        setUploadText(`Phiên ${result.id.slice(0, 8)}: ${STATUS_LABELS[result.status.toLowerCase()] ?? 'Trạng thái chưa được hỗ trợ'}`);
      } else setTaskText(`Nhiệm vụ ${operatorTaskDisplayCode(result.id)}: ${operatorTaskStatusLabel(result.status)}`);
    } catch (e) {
      if (!active() || !isCurrent()) return;
      const status = (e as { response?: { status?: number } }).response?.status;
      setError(status === 401 ? 'Phiên hết hạn. Vui lòng đăng nhập lại.' : status === 403 ? 'Bạn không có quyền đọc dữ liệu này.' : status === 404 ? 'Không tìm thấy dữ liệu.' : 'Chưa đọc được dữ liệu. Kiểm tra mã định danh, kết nối và thử lại.');
    } finally {
      lock.current = false;
      if (active() && isCurrent()) setBusy(false);
    }
  };
  return <SafeAreaScreen scroll header={<AppHeader subtitle="Nhật ký" variant="operatorCompact" />}>
    <View style={styles.tabs}>
      <Pressable style={styles.taskLink} onPress={() => router.push('/(drone)/requests')} accessibilityRole="button"><Text style={typography.labelSm}>Nhiệm vụ</Text></Pressable>
      <Text style={[typography.labelSm, styles.active]}>Nhật ký lệnh</Text>
    </View>
    <View style={styles.sectionHeading}><MaterialIcons name="pending-actions" size={20} color={colors.primary} /><Text style={typography.titleMd}>Lệnh trên thiết bị</Text></View>
    <DroneTaskRecoveryList />
    <Card style={styles.card}>
      <Text style={typography.titleMd}>Nhiệm vụ được giao</Text>
      <Text style={typography.caption}>Danh sách nhiệm vụ đã tải. Chọn để xem trạng thái và phạm vi hiện hành.</Text>
      {tasks.map(task => <OperatorTaskRow key={task.id} task={task} onPress={() => { if (active()) router.push(`/(drone)/request-detail?taskId=${encodeURIComponent(task.id)}`); }} />)}
      {!tasks.length ? <Text>Chưa có nhiệm vụ trong danh sách đã tải.</Text> : null}
      {listError ? <Text accessibilityRole="alert">{listError}</Text> : null}
      {pages.nextCursor ? <Button title={listError ? 'Thử lại tải thêm' : 'Tải thêm nhiệm vụ'} variant="secondary" disabled={pages.loading} loading={pages.loading} onPress={() => void pages.loadMore()} /> : !pages.loading && !listError ? <Text>Đã tải hết danh sách nhiệm vụ.</Text> : null}
      <Button title="Đọc lại danh sách" variant="secondary" disabled={pages.loading} loading={pages.loading} onPress={() => void pages.refresh()} />
    </Card>
    <View style={styles.sectionHeading}><MaterialIcons name="cloud-done" size={20} color={colors.secondary} /><Text style={typography.titleMd}>Kết quả từ máy chủ</Text></View>
    <Text style={[typography.caption, styles.note]}>Tra cứu trạng thái nhiệm vụ, tệp và bộ dữ liệu. Chưa có nguồn lịch sử chuyến bay.</Text>
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
      {uploadText ? <>
        <Text style={typography.bodyMd}>{showFullUploadId ? `Mã phiên đầy đủ: ${uploadId.trim()}` : uploadText}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={showFullUploadId ? 'Ẩn mã phiên đầy đủ' : 'Hiện mã phiên đầy đủ'} onPress={() => setShowFullUploadId(value => !value)} style={styles.revealIdButton}>
          <MaterialIcons name={showFullUploadId ? 'visibility-off' : 'visibility'} size={16} color={colors.secondary} />
          <Text style={[typography.caption, styles.revealIdText]}>{showFullUploadId ? 'Ẩn mã phiên' : 'Hiện mã phiên đầy đủ để đối soát'}</Text>
        </Pressable>
      </> : null}
    </Card>
    <DroneDatasetReadbackPanel />
    </> : null}
    {busy ? <Text>Đang đọc dữ liệu máy chủ…</Text> : null}
    {error ? <Text accessibilityRole="alert">{error}</Text> : null}
  </SafeAreaScreen>;
}
const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.sm, minHeight: 48 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.sm },
  taskRow: { minHeight: 56, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, gap: 4 },
  note: { color: colors.secondary, marginBottom: spacing.sm },
  active: { color: colors.primaryDark },
  taskLink: { minHeight: 48, justifyContent: 'center', paddingRight: spacing.md },
  card: { marginBottom: spacing.md, gap: spacing.sm, borderRadius: radius.xl },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, color: colors.neutral },
  revealIdButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  revealIdText: { color: colors.secondary },
});
