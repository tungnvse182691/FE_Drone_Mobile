import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CrewContentTransition } from '../../src/components/crew/CrewMotion';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { AnimatedPressable } from '../../src/components/AnimatedPressable';
import { DroneDatasetReadbackPanel } from '../../src/components/drone/DroneDatasetReadbackPanel';
import { DroneTaskRecoveryList } from '../../src/components/drone/DroneTaskCommandPanel';
import { useOperatorReadScope } from '../../src/hooks/useOperatorReadScope';
import { useAuthStore } from '../../src/store/auth';
import { apiClient } from '../../src/api/client';
import { operatorTaskDisplayCode, operatorTaskStatusLabel } from '../../src/api/operator-task-view';
import { operatorAppearance } from '../../src/components/drone/appearance';
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
  if (!scope) return <SafeAreaScreen header={<AppHeader subtitle="Nhật ký" variant="operatorCompact" showBack fallbackRoute="/(drone)/requests" />}><Text>Cần phiên Operator hợp lệ.</Text></SafeAreaScreen>;
  return <DroneLogContent key={scope} scope={scope} />;
}
function DroneLogContent({ scope }: { scope: string }) {
  const readScope = useOperatorReadScope('log');
  const [activeTab, setActiveTab] = useState<'commands' | 'lookup'>('commands');
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
  return <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
    <AppHeader subtitle="Nhật ký" variant="operatorCompact" showBack fallbackRoute="/(drone)/requests" />
    <View style={styles.tabBar} accessibilityRole="tablist">
      {([
        ['commands', 'Lệnh đã lưu'], ['lookup', 'Tra cứu'],
      ] as const).map(([id, label]) => <AnimatedPressable key={id} testID={`log-tab-${id}`}
        accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: activeTab === id }}
        onPress={() => setActiveTab(id)} pressedScale={0.985}
        android_ripple={{ color: operatorAppearance.pressed }}
        style={[styles.tab, activeTab === id && styles.selectedTab]}>
        <Text style={[styles.tabLabel, activeTab === id && styles.selectedTabLabel]}>{label}</Text>
      </AnimatedPressable>)}
    </View>
    <ScrollView testID="log-panel-commands" style={[styles.panel, activeTab !== 'commands' && styles.hidden]}
      accessibilityElementsHidden={activeTab !== 'commands'} importantForAccessibility={activeTab === 'commands' ? 'auto' : 'no-hide-descendants'}
      contentContainerStyle={styles.panelContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
    <CrewContentTransition ready={activeTab === 'commands'}>
    <View style={styles.tabs}>
      <Text style={[typography.bodyMd, styles.sectionLabel]}>Lệnh trên thiết bị</Text>
      <AnimatedPressable style={styles.taskLink} android_ripple={{ color: operatorAppearance.pressed }} onPress={() => router.push('/(drone)/requests')} accessibilityRole="button"><Text style={[typography.labelSm, styles.tabLabel]}>Tất cả nhiệm vụ</Text></AnimatedPressable>
    </View>
    <DroneTaskRecoveryList />
    </CrewContentTransition>
    </ScrollView>
    <ScrollView testID="log-panel-lookup" style={[styles.panel, activeTab !== 'lookup' && styles.hidden]}
      accessibilityElementsHidden={activeTab !== 'lookup'} importantForAccessibility={activeTab === 'lookup' ? 'auto' : 'no-hide-descendants'}
      contentContainerStyle={styles.panelContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
    <CrewContentTransition ready={activeTab === 'lookup'}>
    <View style={styles.lookupSection}>
    <View style={styles.sectionHeading}><Text style={styles.lookupHeading}>Kết quả từ máy chủ</Text></View>
    <Button style={styles.lookupButton} title={advanced ? 'Ẩn tra cứu nâng cao' : 'Tra cứu nâng cao bằng mã máy chủ'} variant="secondary" onPress={() => setAdvanced(v => !v)} />
    {advanced ? <>
    <Card style={styles.lookupCard}>
      <Text style={styles.lookupTitle}>Đọc lại nhiệm vụ</Text>
      <Text style={styles.inputLabel}>Mã nhiệm vụ máy chủ</Text>
      <TextInput style={styles.input} accessibilityLabel="Mã nhiệm vụ máy chủ" placeholder="UUID nhiệm vụ" value={taskId} editable={!busy} autoCapitalize="none" onChangeText={value => { setTaskId(value); setTaskText(null); setError(null); }} />
      <Button style={styles.lookupAction} title="Đọc trạng thái nhiệm vụ" variant="secondary" disabled={busy || !uuid(taskId.trim())} onPress={() => void check('task')} />
      {taskText ? <CrewContentTransition ready>
        <View style={styles.readback} accessibilityLiveRegion="polite">
          <View style={styles.readbackHeading}><MaterialIcons name="fact-check" size={18} color={colors.secondary} /><Text style={styles.readbackLabel}>Trạng thái từ máy chủ</Text></View>
          <Text style={styles.readbackValue}>{taskText}</Text>
        </View>
      </CrewContentTransition> : null}
    </Card>
    <Card style={styles.lookupCard}>
      <Text style={styles.lookupTitle}>Kiểm tra tải lên</Text>
      <Text style={styles.inputLabel}>Mã phiên tải lên máy chủ</Text>
      <TextInput style={styles.input} accessibilityLabel="Mã phiên tải lên máy chủ" placeholder="UUID phiên tải lên" value={uploadId} editable={!busy} autoCapitalize="none" onChangeText={value => { setUploadId(value); setUploadText(null); setError(null); }} />
      <Button style={styles.lookupAction} title="Kiểm tra trạng thái tệp" variant="secondary" disabled={busy || !uuid(uploadId.trim())} onPress={() => void check('upload')} />
      {uploadText ? <CrewContentTransition ready>
      <View style={styles.readback} accessibilityLiveRegion="polite">
        <View style={styles.readbackHeading}><MaterialIcons name="insert-drive-file" size={18} color={colors.secondary} /><Text style={styles.readbackLabel}>Trạng thái từ máy chủ</Text></View>
        <Text style={styles.readbackValue}>{showFullUploadId ? `Mã phiên đầy đủ: ${uploadId.trim()}` : uploadText}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={showFullUploadId ? 'Ẩn mã phiên đầy đủ' : 'Hiện mã phiên đầy đủ'} onPress={() => setShowFullUploadId(value => !value)} style={styles.revealIdButton}>
          <MaterialIcons name={showFullUploadId ? 'visibility-off' : 'visibility'} size={16} color={colors.secondary} />
          <Text style={[typography.caption, styles.revealIdText]}>{showFullUploadId ? 'Ẩn mã phiên' : 'Hiện mã phiên đầy đủ để đối soát'}</Text>
        </Pressable>
      </View>
      </CrewContentTransition> : null}
    </Card>
    <DroneDatasetReadbackPanel compact />
    </> : null}
    {busy ? <Text>Đang đọc dữ liệu máy chủ…</Text> : null}
    {error ? <Text accessibilityRole="alert">{error}</Text> : null}
    </View>
    </CrewContentTransition>
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surfaceAlt },
  tabBar: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.screenMargin, paddingVertical: spacing.sm, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, minHeight: 48, paddingHorizontal: spacing.xs, paddingVertical: spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  selectedTab: { backgroundColor: '#192D40', borderColor: '#192D40' },
  selectedTabLabel: { color: colors.surface, fontFamily: 'Roboto-Medium' },
  panel: { flex: 1 },
  hidden: { display: 'none' },
  panelContent: { padding: spacing.screenMargin, paddingBottom: 96 },
  lookupSection: { gap: spacing.sm },
  lookupHeading: { ...typography.titleMd, color: '#192D40', flexShrink: 1 },
  inputLabel: { ...typography.caption, color: '#526170' },
  lookupTitle: { ...typography.titleMd, color: '#192D40' },
  lookupCard: { borderWidth: 0, borderTopWidth: 1, borderColor: '#DCE2E7', borderRadius: 0, backgroundColor: 'transparent', paddingHorizontal: 0, paddingVertical: spacing.md, gap: spacing.sm, elevation: 0 },
  lookupAction: { alignSelf: 'flex-start', maxWidth: '100%', borderRadius: 12, borderColor: '#DCE2E7', backgroundColor: colors.surface },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.sm, minHeight: 48 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.sm },
  sectionLabel: { ...typography.titleMd, color: '#192D40', flexShrink: 1 },
  tabLabel: { color: colors.secondary, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  taskLink: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  lookupButton: { alignSelf: 'flex-start', maxWidth: '100%', borderColor: colors.border, backgroundColor: '#F7F0DA', borderRadius: 12 },
  input: { ...typography.bodyMd, minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, backgroundColor: colors.surface, color: '#192D40' },
  readback: { backgroundColor: '#F1F3F5', borderRadius: radius.md, padding: spacing.sm, gap: spacing.xs },
  readbackHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  readbackLabel: { ...typography.caption, color: colors.secondary, flexShrink: 1 },
  readbackValue: { ...typography.bodyMd, fontFamily: 'Roboto-Medium', color: '#192D40', fontVariant: ['tabular-nums'] },
  revealIdButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  revealIdText: { color: colors.secondary },
});
